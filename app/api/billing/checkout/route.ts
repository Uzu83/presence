import { appUrl, getStripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Stripe Checkout（Presence Pro ¥980/月想定。Price は STRIPE_PRICE_ID）。
 * キーはサーバ env。ユーザ API キーは扱わない（BYOK）。
 */
export async function POST() {
  if (!stripeConfigured()) {
    return Response.json(
      {
        error:
          "Stripe 未設定です。STRIPE_SECRET_KEY と STRIPE_PRICE_ID を入れてください。",
      },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const price = process.env.STRIPE_PRICE_ID;
  if (!price) {
    return Response.json({ error: "STRIPE_PRICE_ID missing" }, { status: 503 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl()}/api/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/app/billing?canceled=1`,
    allow_promotion_codes: true,
  });

  return Response.json({ url: session.url });
}
