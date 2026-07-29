"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BillingNotice } from "@/components/BillingNotice";
import { PRO_PRICE_LABEL } from "@/lib/entitlements";
import { usePlanStore } from "@/store/plan-store";

export function BillingPanel() {
  const plan = usePlanStore((s) => s.plan);
  const email = usePlanStore((s) => s.email);
  const stripeConfigured = usePlanStore((s) => s.stripeConfigured);
  const refresh = usePlanStore((s) => s.refresh);
  const hydrated = usePlanStore((s) => s.hydrated);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function checkout() {
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

  if (!hydrated) {
    return <p className="p-6 text-mist">読み込み中…</p>;
  }

  return (
    <div className="px-4 py-5">
      <h1 className="font-display text-2xl tracking-wide">プラン</h1>
      <p className="mt-1 text-sm text-mist">
        Presence Pro で三本柱・資料・検索をフル解禁。API
        キーはこれまでどおり端末のみ（BYOK）。
      </p>

      <div className="mt-5">
        <BillingNotice />
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-panel/60 px-4 py-4">
        <p className="text-xs text-mist">現在</p>
        <p className="mt-1 text-xl font-semibold text-paper">
          {plan === "pro" ? "Presence Pro" : "Free"}
        </p>
        {email && <p className="mt-1 text-xs text-mist">{email}</p>}
        <ul className="mt-3 space-y-1 text-sm text-mist">
          {plan === "pro" ? (
            <>
              <li>GPT Live · Gemini Live · Grok Voice</li>
              <li>資料プロジェクト複数 · 「調べて」検索</li>
            </>
          ) : (
            <>
              <li>Live は Grok Voice のみ</li>
              <li>資料 1 件 · 検索は Pro</li>
            </>
          )}
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-amber/40 bg-amber/10 px-4 py-4">
        <p className="text-lg font-semibold text-paper">
          Pro {PRO_PRICE_LABEL}
        </p>
        <p className="mt-1 text-xs text-mist">
          音声の従量は各社請求のまま。Presence はアプリ機能の対価のみ。
        </p>
        {plan === "pro" ? (
          <button
            type="button"
            disabled={busy || !stripeConfigured}
            onClick={() => void portal()}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-panel text-sm font-medium text-paper disabled:opacity-40"
          >
            解約・領収（Customer Portal）
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || !stripeConfigured}
            onClick={() => void checkout()}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-amber text-sm font-semibold text-ink disabled:opacity-40"
          >
            {stripeConfigured ? "Pro にする" : "Stripe 未設定（環境変数）"}
          </button>
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
