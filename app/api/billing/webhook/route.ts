import { creditWallet } from "@/lib/credits/ledger";
import { packById } from "@/lib/credits/types";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Stripe webhook。
 * - Pro サブスク: 監査ログ（Cookie は success / me 側）
 * - クレジット購入: success ルートと二重でも idempotent に加算
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

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.metadata?.presence_kind === "credits") {
        const packId = session.metadata.pack_id ?? "starter";
        const pack = packById(packId);
        const credits = Number(session.metadata.credits) || pack?.credits || 0;
        const wid = session.metadata.wid;
        if (wid && credits > 0) {
          await creditWallet({
            wid,
            amount: credits,
            type: "purchase",
            note: `pack:${packId}`,
            ref: session.id,
            idempotencyKey: `stripe_cs_${session.id}`,
          });
        }
      }
      console.info("[presence stripe]", event.type, event.id);
    } else if (
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.updated"
    ) {
      console.info("[presence stripe]", event.type, event.id);
    }
  } catch {
    return new Response("invalid signature", { status: 400 });
  }

  return new Response("ok");
}
