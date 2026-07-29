/**
 * Hosted クレジット方針（007 ベストプラクティスのコード側の正）。
 * WHY: 資金決済法4条「発行日から6か月以内」適用除外ルートを狙う。
 * 弁護士確認前の実装仮説。期限は規約・UI と同文にすること。
 */

import type { CreditTxnType } from "@/lib/credits/types";

/** Stripe 同様: 小さい数字ほど先に消費 */
export const LOT_PRIORITY = {
  /** 無償プロモを先に使い、購入分の失効リスクを減らす */
  grant: 10,
  purchase: 50,
} as const;

/** ウォレットあたりの残高上限（異常チャージ・集中リスク） */
export const MAX_WALLET_BALANCE = 50_000;

/** 運営全体の未使用残高ソフト警戒（円換算 ≒ クレジット合計） */
export const OUTSTANDING_WARN_YEN = 8_000_000;

/**
 * 購入ロットの失効時刻。
 * 発行時刻 + 6 か月 − 1 秒 → 「6か月を超える」と協会チャートで YES になるのを避ける。
 */
export function purchaseExpiresAt(from: Date = new Date()): Date {
  const d = new Date(from.getTime());
  d.setUTCMonth(d.getUTCMonth() + 6);
  d.setUTCSeconds(d.getUTCSeconds() - 1);
  return d;
}

/** 無償プロモは短命（対価性と混同させず、残高を薄く保つ） */
export function grantExpiresAt(from: Date = new Date()): Date {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + 14);
  return d;
}

export function expiresAtForTxnType(
  type: CreditTxnType,
  from: Date = new Date(),
): Date {
  if (type === "grant") return grantExpiresAt(from);
  return purchaseExpiresAt(from);
}

export function priorityForTxnType(type: CreditTxnType): number {
  if (type === "grant") return LOT_PRIORITY.grant;
  return LOT_PRIORITY.purchase;
}

/** 法13条寄り表示（適用除外でも UX / 将来届出に備え同セット） */
export const CREDIT_DISCLOSURES = {
  issuerName: "Presence（実験サービス）",
  scope:
    "クレジットは Presence の音声・テキスト役務の対価にのみ使用できます。第三者への支払いや換金はできません。",
  expiry:
    "購入クレジットは発行から6か月以内に限り有効です。無償付与分はより短い期限です。",
  refund:
    "原則として返金できません（法令に基づく場合を除く）。残高ゼロで役務は停止します。",
  notCash: "現金の預かり・送金・電子マネーではありません。利息は付きません。",
  contactPlaceholder: "問い合わせ: 設定タブのメールリンク（商号確定後に更新）",
  meterNote:
    "消費はサーバ側メータが正です。切断処理の遅延でわずかに超過計上されることがあります。",
} as const;
