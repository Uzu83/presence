/**
 * API キーは端末の localStorage のみ。サーバにはリクエスト都度ヘッダで渡す。
 * WHY-not sessionStorage: タブを閉じると消えて再入力が煩わしい（スマホ想定）。
 * 平文保存の妥協: MVP。将来は Web Crypto + パスフレーズで包む。
 */

import type { ProviderId } from "@/lib/models";

const PREFIX = "presence.keys.v1.";

export type KeyBag = Record<ProviderId, string>;

export function emptyKeys(): KeyBag {
  return { openai: "", xai: "" };
}

export function loadKeys(): KeyBag {
  if (typeof window === "undefined") return emptyKeys();
  return {
    openai: localStorage.getItem(`${PREFIX}openai`) ?? "",
    xai: localStorage.getItem(`${PREFIX}xai`) ?? "",
  };
}

export function saveKey(provider: ProviderId, value: string): void {
  if (typeof window === "undefined") return;
  const trimmed = value.trim();
  if (trimmed) localStorage.setItem(`${PREFIX}${provider}`, trimmed);
  else localStorage.removeItem(`${PREFIX}${provider}`);
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 3)}…${key.slice(-4)}`;
}
