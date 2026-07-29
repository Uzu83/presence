import { proCookieHeader, signProPayload } from "@/lib/pro-session";
import { appUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/** Checkout 成功 → Pro cookie 発行 → 課金ページへ */
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) {
    return Response.redirect(`${appUrl()}/app/billing?error=missing_session`);
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return Response.redirect(`${appUrl()}/app/billing?error=unpaid`);
    }
    const email =
      session.customer_details?.email ?? session.customer_email ?? "unknown";
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : (session.customer?.id ?? "unknown");

    const token = signProPayload({ email, customerId });
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${appUrl()}/app/billing?upgraded=1`,
        "Set-Cookie": proCookieHeader(token),
      },
    });
  } catch {
    return Response.redirect(`${appUrl()}/app/billing?error=stripe`);
  }
}
