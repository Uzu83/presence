"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BillingNotice } from "@/components/BillingNotice";
import { BILLING_KEYS_HINT } from "@/lib/billing-copy";
import { emptyKeys, type KeyBag, loadKeys, maskKey, saveKey } from "@/lib/keys";
import type { ProviderId } from "@/lib/models";

export function SettingsPanel() {
  const [keys, setKeys] = useState<KeyBag>(emptyKeys);
  const [draft, setDraft] = useState<KeyBag>(emptyKeys);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadKeys();
    setKeys(loaded);
    setDraft(loaded);
  }, []);

  function persist(provider: ProviderId) {
    saveKey(provider, draft[provider]);
    const next = loadKeys();
    setKeys(next);
    setDraft(next);
    setSaved(provider);
    window.setTimeout(() => setSaved(null), 1600);
  }

  return (
    <div className="px-4 py-5">
      <h1 className="font-display text-2xl tracking-wide">設定</h1>
      <p className="mt-1 text-sm text-mist">{BILLING_KEYS_HINT}</p>

      <div className="mt-4">
        <BillingNotice />
      </div>

      {(
        [
          {
            id: "openai" as const,
            label: "OpenAI",
            placeholder: "sk-...",
            help: "platform.openai.com · GPT Live / テキスト",
          },
          {
            id: "google" as const,
            label: "Google AI",
            placeholder: "AIza...",
            help: "aistudio.google.com · Gemini Live",
          },
          {
            id: "xai" as const,
            label: "xAI (Grok)",
            placeholder: "xai-...",
            help: "console.x.ai · Grok Voice / テキスト",
          },
        ] as const
      ).map((p) => (
        <section key={p.id} className="mt-6">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-paper">{p.label}</h2>
            <span className="text-xs text-mist">
              {keys[p.id] ? `保存済 ${maskKey(keys[p.id])}` : "未設定"}
            </span>
          </div>
          <p className="mt-1 text-xs text-mist">{p.help}</p>
          <input
            type="password"
            autoComplete="off"
            value={draft[p.id]}
            onChange={(e) =>
              setDraft((d) => ({ ...d, [p.id]: e.target.value }))
            }
            placeholder={p.placeholder}
            className="mt-2 min-h-12 w-full rounded-xl border border-line bg-panel px-3 text-base text-paper placeholder:text-mist/60"
          />
          <button
            type="button"
            onClick={() => persist(p.id)}
            className="mt-2 min-h-11 w-full rounded-xl bg-panel text-sm font-medium text-paper hover:bg-line/60"
          >
            {saved === p.id ? "保存しました" : "このキーを保存"}
          </button>
        </section>
      ))}

      <section className="mt-10 border-t border-line/70 pt-6">
        <h2 className="font-display text-xl">同席ウェイトリスト</h2>
        <p className="mt-2 text-sm leading-relaxed text-mist">
          Discord VC 同席（Phase 3）の興味だけ先に受け付ける。実装は Pro
          黒字後（docs/decisions/005）。
        </p>
        <a
          className="mt-3 flex min-h-12 items-center justify-center rounded-xl border border-line bg-panel/60 text-sm text-paper"
          href="mailto:2201100431bg@cyber-u.ac.jp?subject=Presence%20Discord%20waitlist"
        >
          Discord 同席に興味あり（メール）
        </a>
        <ul className="mt-4 space-y-2 text-sm text-paper">
          <li className="rounded-xl border border-line bg-panel/50 px-3 py-3">
            <span className="text-signal">今</span> · BYOK · Pro ゲート · 三本柱
          </li>
          <li className="rounded-xl border border-line bg-panel/30 px-3 py-3 text-mist">
            次 · Discord VC 同席
          </li>
          <li className="rounded-xl border border-line bg-panel/30 px-3 py-3 text-mist">
            その先 · 同期 / Hosted Credits
          </li>
        </ul>
        <p className="mt-4 text-xs text-mist">
          <Link href="/legal/terms" className="text-amber">
            利用規約
          </Link>
          {" · "}
          <Link href="/legal/privacy" className="text-amber">
            プライバシー
          </Link>
          {" · "}
          <Link href="/app/billing" className="text-amber">
            プラン
          </Link>
        </p>
      </section>
    </div>
  );
}
