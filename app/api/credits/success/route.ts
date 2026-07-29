import { creditWallet } from "@/lib/credits/ledger";
import { packById } from "@/lib/credits/types";
import {
  decodeWalletCookie,
  encodeWalletCookie,
  WALLET_COOKIE_MAX_AGE,
  WALLET_COOKIE_NAME,
} from "@/lib/credits/wallet";
import { appUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function walletSetCookie(raw: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${WALLET_COOKIE_NAME}=${raw}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${WALLET_COOKIE_MAX_AGE}${secure}`;
}

/** クレジット購入成功 → 残高加算 → 課金ページへ */
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) {
    return Response.redirect(`${appUrl()}/app/billing?error=missing_session`);
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.presence_kind !== "credits") {
      return Response.redirect(`${appUrl()}/app/billing?error=not_credits`);
    }
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return Response.redirect(`${appUrl()}/app/billing?error=unpaid`);
    }

    const packId = session.metadata.pack_id ?? "starter";
    const pack = packById(packId);
    const credits = Number(session.metadata.credits) || pack?.credits || 0;
    const wid = session.metadata.wid;
    if (!wid || credits <= 0) {
      return Response.redirect(`${appUrl()}/app/billing?error=bad_meta`);
    }

    await creditWallet({
      wid,
      amount: credits,
      type: "purchase",
      note: `pack:${packId}`,
      ref: sessionId,
      idempotencyKey: `stripe_cs_${sessionId}`,
    });

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;

    const cookieHeader = req.headers.get("cookie") ?? "";
    const match = cookieHeader.match(
      new RegExp(`${WALLET_COOKIE_NAME}=([^;]+)`),
    );
    const existing = decodeWalletCookie(match?.[1]);
    const next = encodeWalletCookie({
      wid: existing?.wid ?? wid,
      customerId: customerId ?? existing?.customerId,
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${appUrl()}/app/billing?credits=1`,
        "Set-Cookie": walletSetCookie(next),
      },
    });
  } catch {
    return Response.redirect(`${appUrl()}/app/billing?error=stripe`);
  }
}
