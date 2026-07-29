import type { LiveEngineId } from "@/lib/voice/engines";

/**
 * Hosted 消費レート（クレジット / 分）。
 * WHY: 運営が API 実費を肩代わりするため、エンジン別マージン込みの粗い単価。
 * 実測で見直す前提。残高は整数クレジット（1 ≒ ¥1 目安）。
 */
export const HOSTED_CREDITS_PER_MINUTE: Record<LiveEngineId, number> = {
  "gpt-live": 12,
  "gemini-live": 8,
  "grok-voice": 6,
};

/** Hosted テキストチャット: 概算トークン課金（入力+出力をざっくり） */
export const HOSTED_CHAT_CREDITS = {
  per1kTokens: 2,
  minimum: 1,
} as const;

/** 1 セッションのハード上限（分）— 暴走防止 */
export const HOSTED_MAX_SESSION_MINUTES = 60;

/** 日次デビット上限（クレジット）— 異常検知 */
export const HOSTED_DAILY_DEBIT_CAP = 5000;

export function sessionCostCredits(
  engine: LiveEngineId,
  elapsedMs: number,
): number {
  const perMin = HOSTED_CREDITS_PER_MINUTE[engine];
  const minutes = Math.max(0, elapsedMs) / 60_000;
  return Math.max(1, Math.ceil(minutes * perMin));
}

export function chatCostCredits(approxTokens: number): number {
  const raw = Math.ceil(
    (approxTokens / 1000) * HOSTED_CHAT_CREDITS.per1kTokens,
  );
  return Math.max(HOSTED_CHAT_CREDITS.minimum, raw);
}
