import { ensureWallet } from "@/lib/credits/ensure-wallet";
import { packById } from "@/lib/credits/types";
import { writeWalletCookie } from "@/lib/credits/wallet";
import { appUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/** クレジットパック Checkout（mode=payment） */
export async function POST(req: Request) {
  let packId = "starter";
  try {
    const body = (await req.json()) as { packId?: string };
    if (body.packId) packId = body.packId;
  } catch {
    // default starter
  }

  const pack = packById(packId);
  if (!pack) {
    return Response.json({ error: "unknown pack" }, { status: 400 });
  }

  const price = process.env[pack.priceEnv]?.trim();
  if (!process.env.STRIPE_SECRET_KEY?.trim() || !price) {
    return Response.json(
      {
        error: `Stripe 未設定です。STRIPE_SECRET_KEY と ${pack.priceEnv} を入れてください。`,
      },
      { status: 503 },
    );
  }

  const wallet = await ensureWallet();
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl()}/api/credits/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/app/billing?credits_canceled=1`,
    allow_promotion_codes: true,
    metadata: {
      presence_kind: "credits",
      pack_id: pack.id,
      wid: wallet.wid,
      credits: String(pack.credits),
    },
    ...(wallet.customerId ? { customer: wallet.customerId } : {}),
  });

  // customer 未紐付けのときは Checkout 後に success で紐付ける
  await writeWalletCookie(wallet);

  return Response.json({ url: session.url });
}
