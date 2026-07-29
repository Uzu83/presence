/**
 * 料金まわりの文言の唯一の正（LP / 設定 / 音声で同文）。
 * WHY: 「Plus で無料」「話し放題」系の誤解が信頼とサポートを殺す。
 */

export const BILLING_TAGLINE =
  "本線は Hosted クレジット（運営キー）。残高の分だけ話せます。BYOK は上級者向けです。";

export const BILLING_VOICE_WARNING =
  "Hosted Live はクレジットを分単位で消費します。残高ゼロで切断します。話し放題ではありません。";

export const BILLING_KEYS_HINT =
  "通常は API キー不要です。自分のキーで使う場合だけ、下の上級者設定を開いてください。キーはこの端末のみに保存します。";

export const BILLING_CREDITS_HINT =
  "クレジットは Presence 役務専用です。購入分は発行から6か月以内のみ有効。現金預かり・送金ではありません。";

export const BILLING_FORBIDDEN_HINTS = [
  "Plus があれば無料",
  "話し放題",
  "定額で全モデル使い放題",
] as const;
