import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Stripe webhook。Cookie はブラウザ専用のため失効の強制は /api/billing/me
 * ＋ Portal 再訪で行う。ここは監査ログ。
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!secret || !sig) {
    return new Response("webhook not configured", { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(body, sig, secret);
    if (
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.updated" ||
      event.type === "checkout.session.completed"
    ) {
      console.info("[presence stripe]", event.type, event.id);
    }
  } catch {
    return new Response("invalid signature", { status: 400 });
  }

  return new Response("ok");
}
