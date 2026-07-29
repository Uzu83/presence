import { entitlementsFor, type PlanId } from "@/lib/entitlements";
import { readProCookie, verifyProToken } from "@/lib/pro-session";
import { stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

/** 現在のプラン（cookie）。未ログイン/未契約は free。 */
export async function GET(req: Request) {
  const devPro = process.env.PRESENCE_DEV_PRO === "1";
  const token = readProCookie(req.headers.get("cookie"));
  const payload = verifyProToken(token);
  const plan: PlanId = devPro || payload ? "pro" : "free";

  return Response.json({
    plan,
    email: payload?.email ?? null,
    stripeConfigured: stripeConfigured(),
    entitlements: entitlementsFor(plan),
    devPro,
  });
}
