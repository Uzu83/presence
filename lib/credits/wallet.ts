import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "presence_wallet";
const MAX_AGE_SEC = 60 * 60 * 24 * 400; // ~13 months（前払式未使用残高の実務レンジ意識）

export type WalletCookie = {
  /** 安定したウォレット ID（匿名端末ごと） */
  wid: string;
  /** Stripe Customer ID（購入後に紐付け） */
  customerId?: string;
};

function secret(): string | null {
  return (
    process.env.PRESENCE_SESSION_SECRET?.trim() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
    null
  );
}

function sign(payloadB64: string): string {
  const s = secret();
  if (!s) throw new Error("PRESENCE_SESSION_SECRET is not set");
  return createHmac("sha256", s).update(payloadB64).digest("base64url");
}

export function mintWalletId(): string {
  return `w_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function encodeWalletCookie(data: WalletCookie): string {
  const payloadB64 = Buffer.from(JSON.stringify(data), "utf8").toString(
    "base64url",
  );
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function decodeWalletCookie(
  raw: string | undefined,
): WalletCookie | null {
  if (!raw || !secret()) return null;
  const [payloadB64, sig] = raw.split(".");
  if (!payloadB64 || !sig) return null;
  try {
    const expected = sign(payloadB64);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const data = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as WalletCookie;
    if (!data.wid || typeof data.wid !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

/** リクエストからウォレットを読む。無ければ null（発行は呼び出し側） */
export async function readWallet(): Promise<WalletCookie | null> {
  const jar = await cookies();
  return decodeWalletCookie(jar.get(COOKIE)?.value);
}

export async function writeWalletCookie(data: WalletCookie): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, encodeWalletCookie(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export { COOKIE as WALLET_COOKIE_NAME, MAX_AGE_SEC as WALLET_COOKIE_MAX_AGE };
