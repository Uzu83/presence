import { readProCookie, verifyProToken } from "@/lib/pro-session";
import { appUrl, getStripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

/** Stripe Customer Portal（解約・領収） */
export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return Response.json({ error: "Stripe 未設定" }, { status: 503 });
  }
  const token = readProCookie(req.headers.get("cookie"));
  const payload = verifyProToken(token);
  if (!payload?.customerId || payload.customerId === "unknown") {
    return Response.json(
      { error: "Pro セッションがありません" },
      { status: 401 },
    );
  }

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: payload.customerId,
    return_url: `${appUrl()}/app/billing`,
  });
  return Response.json({ url: portal.url });
}
