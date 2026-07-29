import Stripe from "stripe";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

/** クレジットパック用 Price が1つでもあれば購入 UI を出す */
export function creditsStripeConfigured(): boolean {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) return false;
  return Boolean(
    process.env.STRIPE_PRICE_CREDITS_STARTER?.trim() ||
      process.env.STRIPE_PRICE_CREDITS_STANDARD?.trim() ||
      process.env.STRIPE_PRICE_CREDITS_PLUS?.trim(),
  );
}

export function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}
