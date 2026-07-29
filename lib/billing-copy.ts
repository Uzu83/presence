/**
 * 料金まわりの文言の唯一の正（LP / 設定 / 音声で同文）。
 * WHY: 「Plus で無料」「話し放題」系の誤解が信頼とサポートを殺す。
 */

export const BILLING_TAGLINE =
  "従量は各社 API の請求です。ChatGPT Plus / Gemini Advanced / SuperGrok のサブスク本体とは別です。";

export const BILLING_VOICE_WARNING =
  "Live 音声は分単位で各社に課金されやすいです。利用状況は各社のダッシュボードで確認してください。";

export const BILLING_KEYS_HINT =
  "API キーはこの端末にだけ保存します。サーバには保存しません（リクエスト時のみ転送）。";

export const BILLING_FORBIDDEN_HINTS = [
  "Plus があれば無料",
  "話し放題",
  "定額で全モデル使い放題",
] as const;
