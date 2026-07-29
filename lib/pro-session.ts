/**
 * Pro セッションは HMAC 署名付き cookie。
 * WHY-not DB: Phase 2 最小。Stripe Customer Portal / Checkout 成功で発行。
 * 失効は webhook で cookie 無効化できないので、maxAge + 定期 checkout 再確認。
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "presence_pro";
const MAX_AGE_SEC = 60 * 60 * 24 * 31; // 31日

export type ProPayload = {
  email: string;
  customerId: string;
  plan: "pro";
  exp: number;
};

function secret(): string {
  const s =
    process.env.PRESENCE_SESSION_SECRET ?? process.env.STRIPE_SECRET_KEY;
  if (!s)
    throw new Error("PRESENCE_SESSION_SECRET or STRIPE_SECRET_KEY required");
  return s;
}

function b64url(data: Buffer | string): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return buf.toString("base64url");
}

export function signProPayload(
  payload: Omit<ProPayload, "plan" | "exp">,
): string {
  const body: ProPayload = {
    ...payload,
    plan: "pro",
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  };
  const json = b64url(JSON.stringify(body));
  const sig = createHmac("sha256", secret()).update(json).digest("base64url");
  return `${json}.${sig}`;
}

export function verifyProToken(token: string | undefined): ProPayload | null {
  if (!token) return null;
  const [json, sig] = token.split(".");
  if (!json || !sig) return null;
  try {
    const expected = createHmac("sha256", secret())
      .update(json)
      .digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(
      Buffer.from(json, "base64url").toString("utf8"),
    ) as ProPayload;
    if (payload.plan !== "pro") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function proCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${secure}`;
}

export function clearProCookieHeader(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readProCookie(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (p.startsWith(`${COOKIE}=`)) return p.slice(COOKIE.length + 1);
  }
  return undefined;
}

export { COOKIE as PRO_COOKIE_NAME, MAX_AGE_SEC as PRO_COOKIE_MAX_AGE };
