"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BillingNotice } from "@/components/BillingNotice";
import { BILLING_CREDITS_HINT } from "@/lib/billing-copy";
import { PRO_PRICE_LABEL } from "@/lib/entitlements";
import { useCreditStore } from "@/store/credit-store";
import { usePlanStore } from "@/store/plan-store";

export function BillingPanel() {
  const plan = usePlanStore((s) => s.plan);
  const email = usePlanStore((s) => s.email);
  const proStripe = usePlanStore((s) => s.stripeConfigured);
  const refreshPlan = usePlanStore((s) => s.refresh);
  const planHydrated = usePlanStore((s) => s.hydrated);

  const balance = useCreditStore((s) => s.balance);
  const packs = useCreditStore((s) => s.packs);
  const creditsStripe = useCreditStore((s) => s.stripeConfigured);
  const hostedAvailable = useCreditStore((s) => s.hostedAvailable);
  const rates = useCreditStore((s) => s.ratesPerMinute);
  const disclosures = useCreditStore((s) => s.disclosures);
  const refreshCredits = useCreditStore((s) => s.refresh);
  const creditsHydrated = useCreditStore((s) => s.hydrated);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showByokPro, setShowByokPro] = useState(false);

  useEffect(() => {
    void refreshPlan();
    void refreshCredits();
  }, [refreshPlan, refreshCredits]);

  async function buyCredits(packId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout 失敗");
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function checkoutPro() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout 失敗");
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function portal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Portal 失敗");
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (!planHydrated || !creditsHydrated) {
    return <p className="p-6 text-mist">読み込み中…</p>;
  }

  return (
    <div className="px-4 py-5">
      <h1 className="font-display text-2xl tracking-wide">プラン</h1>
      <p className="mt-1 text-sm text-mist">
        クレジットを買ってすぐ話す。API キーは不要（Hosted）。
      </p>

      <div className="mt-5">
        <BillingNotice />
      </div>

      <section className="mt-6 rounded-2xl border border-amber/40 bg-amber/10 px-4 py-4">
        <p className="text-xs text-mist">クレジット残高</p>
        <p className="mt-1 font-display text-4xl tracking-wide text-paper">
          {balance}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-mist">
          {BILLING_CREDITS_HINT}
        </p>
        {!hostedAvailable && (
          <p className="mt-2 text-xs text-amber">
            運営キー未設定のため Hosted はオフです。Vercel に XAI_API_KEY
            等を入れてください。
          </p>
        )}
        <ul className="mt-3 space-y-1 text-[11px] text-mist">
          <li>Grok ≈ {rates["grok-voice"] ?? 6} cr/分</li>
          <li>Gemini ≈ {rates["gemini-live"] ?? 8} cr/分</li>
          <li>GPT Live ≈ {rates["gpt-live"] ?? 12} cr/分</li>
        </ul>
      </section>

      <section className="mt-4 space-y-3">
        <h2 className="text-sm font-semibold text-paper">クレジットを買う</h2>
        {packs.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={busy || !p.priceConfigured}
            onClick={() => void buyCredits(p.id)}
            className="flex min-h-14 w-full items-center justify-between rounded-xl border border-line bg-panel/60 px-4 text-left disabled:opacity-40"
          >
            <span>
              <span className="block text-sm font-semibold text-paper">
                {p.label}
              </span>
              <span className="text-xs text-mist">{p.credits} クレジット</span>
            </span>
            <span className="text-sm font-semibold text-amber">
              {p.priceConfigured
                ? `¥${p.yen.toLocaleString()}`
                : "Price 未設定"}
            </span>
          </button>
        ))}
        {!creditsStripe && (
          <p className="text-xs text-mist">
            STRIPE_PRICE_CREDITS_* を env に入れると購入できます。
          </p>
        )}
      </section>

      {disclosures && (
        <section className="mt-5 space-y-1 text-[11px] leading-relaxed text-mist">
          <p>{disclosures.scope}</p>
          <p>{disclosures.expiry}</p>
          <p>{disclosures.refund}</p>
          <p>{disclosures.notCash}</p>
        </section>
      )}

      <section className="mt-8 border-t border-line/70 pt-6">
        <button
          type="button"
          onClick={() => setShowByokPro((v) => !v)}
          className="text-sm text-mist underline-offset-2 hover:text-paper hover:underline"
        >
          {showByokPro ? "閉じる" : "上級者: BYOK + Presence Pro"}
        </button>
        {showByokPro && (
          <div className="mt-4 rounded-2xl border border-line bg-panel/60 px-4 py-4">
            <p className="text-xs text-mist">現在</p>
            <p className="mt-1 text-xl font-semibold text-paper">
              {plan === "pro" ? "Presence Pro" : "Free（BYOK）"}
            </p>
            {email && <p className="mt-1 text-xs text-mist">{email}</p>}
            <p className="mt-2 text-xs text-mist">
              自分の API キーで三本柱を使う場合の月額。音声従量は各社請求。
            </p>
            <p className="mt-1 text-sm font-semibold text-paper">
              Pro {PRO_PRICE_LABEL}
            </p>
            {plan === "pro" ? (
              <button
                type="button"
                disabled={busy || !proStripe}
                onClick={() => void portal()}
                className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-panel text-sm font-medium text-paper disabled:opacity-40"
              >
                解約・領収（Customer Portal）
              </button>
            ) : (
              <button
                type="button"
                disabled={busy || !proStripe}
                onClick={() => void checkoutPro()}
                className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl border border-line text-sm font-medium text-paper disabled:opacity-40"
              >
                {proStripe ? "Pro にする（BYOK）" : "Stripe Pro 未設定"}
              </button>
            )}
          </div>
        )}
      </section>

      {error && (
        <p className="mt-3 rounded-xl bg-danger/15 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <p className="mt-8 text-xs text-mist">
        <Link href="/legal/terms" className="text-amber">
          利用規約
        </Link>
        {" · "}
        <Link href="/legal/privacy" className="text-amber">
          プライバシー
        </Link>
      </p>
    </div>
  );
}
