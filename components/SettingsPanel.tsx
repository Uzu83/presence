"use client";

import { useEffect, useState } from "react";
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
      <p className="mt-1 text-sm text-mist">
        API
        キーはこの端末にだけ保存します。サーバには保存しません（リクエスト時のみ転送）。
      </p>

      <div className="mt-4 rounded-2xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm leading-relaxed text-paper">
        ChatGPT Plus や SuperGrok の
        <strong className="text-amber">サブスク料金そのもの</strong>は API
        と別です。Presence は各社の API クレジット（キー）を使います。
      </div>

      {(
        [
          {
            id: "openai" as const,
            label: "OpenAI",
            placeholder: "sk-...",
            help: "platform.openai.com で発行",
          },
          {
            id: "xai" as const,
            label: "xAI (Grok)",
            placeholder: "xai-...",
            help: "console.x.ai で発行 · Voice もこちら",
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
        <h2 className="font-display text-xl">同席ロードマップ</h2>
        <p className="mt-2 text-sm leading-relaxed text-mist">
          いつか Discord / Google Meet / Zoom に Presence
          が入ってくる仕組みを作ります。MVP は手元のスマホ
          Web。通話ブリッジは別フェーズです。
        </p>
        <ul className="mt-4 space-y-2 text-sm text-paper">
          <li className="rounded-xl border border-line bg-panel/50 px-3 py-3">
            <span className="text-signal">今</span> · スマホ Web / PWA · BYOK
            会話 · 資料 · Grok Voice
          </li>
          <li className="rounded-xl border border-line bg-panel/30 px-3 py-3 text-mist">
            次 · Discord VC 同席 bot
          </li>
          <li className="rounded-xl border border-line bg-panel/30 px-3 py-3 text-mist">
            その先 · Meet / Zoom ブリッジ
          </li>
        </ul>
      </section>
    </div>
  );
}
