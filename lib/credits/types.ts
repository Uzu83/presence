export type CreditTxnType =
  | "purchase"
  | "debit_session"
  | "debit_chat"
  | "grant"
  | "adjust"
  | "expire";

export type CreditPackId = "starter" | "standard" | "plus";

export type CreditPack = {
  id: CreditPackId;
  label: string;
  yen: number;
  credits: number;
  /** Stripe Price ID env key */
  priceEnv: string;
};

/** 購入パック（税込表示は Stripe 側設定に合わせる） */
export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "starter",
    label: "Starter",
    yen: 500,
    credits: 500,
    priceEnv: "STRIPE_PRICE_CREDITS_STARTER",
  },
  {
    id: "standard",
    label: "Standard",
    yen: 2000,
    credits: 2200,
    priceEnv: "STRIPE_PRICE_CREDITS_STANDARD",
  },
  {
    id: "plus",
    label: "Plus",
    yen: 5000,
    credits: 6000,
    priceEnv: "STRIPE_PRICE_CREDITS_PLUS",
  },
];

export function packById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

/** Stripe Credit Grant 相当のロット */
export type CreditLot = {
  id: string;
  wid: string;
  /** purchase = 有償（未使用残高モニタ対象） / grant = 無償 */
  kind: "purchase" | "grant";
  original: number;
  remaining: number;
  createdAt: string;
  expiresAt: string;
  /** 小さいほど先に消費 */
  priority: number;
  ref?: string;
  note?: string;
};
