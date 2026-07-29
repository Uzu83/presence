/**
 * クレジット台帳（ロット + append-only 取引）。
 * WHY: Stripe Credit Grant / JP 前払式表示に合わせ、有償・無償・失効を分離する。
 * Redis 未設定時はプロセス内 Map（開発・テスト専用）。
 */

import { Redis } from "@upstash/redis";
import {
  expiresAtForTxnType,
  MAX_WALLET_BALANCE,
  priorityForTxnType,
} from "@/lib/credits/policy";
import {
  HOSTED_DAILY_DEBIT_CAP,
  HOSTED_MAX_SESSION_MINUTES,
} from "@/lib/credits/rates";
import type { CreditLot, CreditTxnType } from "@/lib/credits/types";
import type { LiveEngineId } from "@/lib/voice/engines";

const LOTS_PREFIX = "credits:lots:";
const TXN_PREFIX = "credits:txn:";
const DAILY_PREFIX = "credits:day:";
const SESSION_PREFIX = "credits:sess:";
const IDEMPOTENCY_PREFIX = "credits:idem:";
const OUTSTANDING_KEY = "credits:outstanding";

export type CreditTxn = {
  id: string;
  wid: string;
  type: CreditTxnType;
  amount: number;
  balanceAfter: number;
  at: string;
  note?: string;
  ref?: string;
};

export type HostedSession = {
  sid: string;
  wid: string;
  engine: LiveEngineId;
  startedAt: number;
  lastDebitAt: number;
  billedMs: number;
  closed?: boolean;
};

type MemoryStore = {
  lots: Map<string, CreditLot[]>;
  txns: Map<string, CreditTxn[]>;
  daily: Map<string, number>;
  sessions: Map<string, HostedSession>;
  idem: Set<string>;
  /** 有償ロットの未使用合計のみ */
  outstanding: number;
};

const g = globalThis as unknown as { __presenceCreditsMem?: MemoryStore };

function mem(): MemoryStore {
  if (!g.__presenceCreditsMem) {
    g.__presenceCreditsMem = {
      lots: new Map(),
      txns: new Map(),
      daily: new Map(),
      sessions: new Map(),
      idem: new Set(),
      outstanding: 0,
    };
  }
  return g.__presenceCreditsMem;
}

function redis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function ledgerBackend(): "redis" | "memory" {
  return redis() ? "redis" : "memory";
}

function dayKey(wid: string, d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${DAILY_PREFIX}${wid}:${y}${m}${day}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function lotKind(type: CreditTxnType): "purchase" | "grant" {
  return type === "grant" ? "grant" : "purchase";
}

function sumAvailable(lots: CreditLot[], at: Date): number {
  const t = at.getTime();
  return lots.reduce(
    (acc, lot) =>
      acc + (Date.parse(lot.expiresAt) > t ? Math.max(0, lot.remaining) : 0),
    0,
  );
}

function sumPurchaseOutstanding(lots: CreditLot[], at: Date): number {
  const t = at.getTime();
  return lots.reduce((acc, lot) => {
    if (lot.kind !== "purchase") return acc;
    if (Date.parse(lot.expiresAt) <= t) return acc;
    return acc + Math.max(0, lot.remaining);
  }, 0);
}

/** Stripe 風: priority → FEFO → created */
export function sortLotsForDrawdown(lots: CreditLot[]): CreditLot[] {
  return [...lots].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const ae = Date.parse(a.expiresAt);
    const be = Date.parse(b.expiresAt);
    if (ae !== be) return ae - be;
    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });
}

async function loadLots(wid: string): Promise<CreditLot[]> {
  const r = redis();
  if (!r) return structuredClone(mem().lots.get(wid) ?? []);
  const raw = await r.get<CreditLot[]>(`${LOTS_PREFIX}${wid}`);
  return Array.isArray(raw) ? raw : [];
}

async function saveLots(wid: string, lots: CreditLot[]): Promise<void> {
  const r = redis();
  if (!r) {
    mem().lots.set(wid, lots);
    return;
  }
  await r.set(`${LOTS_PREFIX}${wid}`, lots);
}

async function appendTxn(txn: CreditTxn): Promise<void> {
  const r = redis();
  if (!r) {
    const list = mem().txns.get(txn.wid) ?? [];
    list.unshift(txn);
    mem().txns.set(txn.wid, list.slice(0, 100));
    return;
  }
  await r.lpush(`${TXN_PREFIX}${txn.wid}`, JSON.stringify(txn));
  await r.ltrim(`${TXN_PREFIX}${txn.wid}`, 0, 99);
}

async function syncOutstandingFromLots(wid: string): Promise<void> {
  // 全体 outstanding は全ウォレット合計が理想だが、Redis スキャンは重い。
  // メモリ: 全 wid を合算。Redis: 差分更新は credit/debit/expire で行うためここでは no-op。
  const r = redis();
  if (r) return;
  let total = 0;
  for (const lots of mem().lots.values()) {
    total += sumPurchaseOutstanding(lots, new Date());
  }
  // wid 未使用でも再計算
  void wid;
  mem().outstanding = total;
}

/**
 * 失効ロットを 0 にし expire 取引を残す。
 * @returns 失効で消えた有償クレジット量
 */
export async function expireStaleLots(wid: string): Promise<{
  expiredPurchase: number;
  balance: number;
}> {
  const at = new Date();
  const lots = await loadLots(wid);
  let expiredPurchase = 0;
  let changed = false;

  for (const lot of lots) {
    if (lot.remaining <= 0) continue;
    if (Date.parse(lot.expiresAt) > at.getTime()) continue;
    if (lot.kind === "purchase") expiredPurchase += lot.remaining;
    lot.remaining = 0;
    changed = true;
  }

  if (changed) {
    await saveLots(wid, lots);
    const balance = sumAvailable(lots, at);
    if (expiredPurchase > 0 || changed) {
      const r = redis();
      if (!r) {
        await syncOutstandingFromLots(wid);
      } else if (expiredPurchase > 0) {
        await r.decrby(OUTSTANDING_KEY, expiredPurchase);
      }
      if (expiredPurchase > 0) {
        await appendTxn({
          id: `t_${crypto.randomUUID().replace(/-/g, "")}`,
          wid,
          type: "expire",
          amount: -expiredPurchase,
          balanceAfter: balance,
          at: nowIso(),
          note: "lot_expiry",
        });
      }
    }
    return { expiredPurchase, balance };
  }

  return { expiredPurchase: 0, balance: sumAvailable(lots, at) };
}

export async function getBalance(wid: string): Promise<number> {
  const { balance } = await expireStaleLots(wid);
  return balance;
}

export async function listActiveLots(wid: string): Promise<CreditLot[]> {
  await expireStaleLots(wid);
  const at = new Date();
  const lots = await loadLots(wid);
  return lots.filter(
    (l) => l.remaining > 0 && Date.parse(l.expiresAt) > at.getTime(),
  );
}

export async function nextExpiryIso(wid: string): Promise<string | null> {
  const active = await listActiveLots(wid);
  if (active.length === 0) return null;
  return sortLotsForDrawdown(active)[0]?.expiresAt ?? null;
}

export async function getDailyDebit(wid: string): Promise<number> {
  const r = redis();
  if (!r) return mem().daily.get(dayKey(wid)) ?? 0;
  const v = await r.get<number>(dayKey(wid));
  return typeof v === "number" ? v : 0;
}

export async function getOutstandingCredits(): Promise<number> {
  await Promise.resolve();
  const r = redis();
  if (!r) {
    await syncOutstandingFromLots("");
    return mem().outstanding;
  }
  const v = await r.get<number>(OUTSTANDING_KEY);
  return typeof v === "number" ? Math.max(0, v) : 0;
}

export async function creditWallet(input: {
  wid: string;
  amount: number;
  type: CreditTxnType;
  note?: string;
  ref?: string;
  idempotencyKey?: string;
}): Promise<{ balance: number; applied: boolean; lotId?: string }> {
  if (input.amount <= 0) throw new Error("credit amount must be positive");
  if (
    input.type !== "purchase" &&
    input.type !== "grant" &&
    input.type !== "adjust"
  ) {
    throw new Error("credit type must be purchase, grant, or adjust");
  }

  const r = redis();
  if (input.idempotencyKey) {
    if (!r) {
      if (mem().idem.has(input.idempotencyKey)) {
        return { balance: await getBalance(input.wid), applied: false };
      }
      mem().idem.add(input.idempotencyKey);
    } else {
      const ok = await r.set(
        `${IDEMPOTENCY_PREFIX}${input.idempotencyKey}`,
        "1",
        { nx: true, ex: 60 * 60 * 24 * 30 },
      );
      if (ok !== "OK") {
        return { balance: await getBalance(input.wid), applied: false };
      }
    }
  }

  await expireStaleLots(input.wid);
  const lots = await loadLots(input.wid);
  const at = new Date();
  const current = sumAvailable(lots, at);
  if (current + input.amount > MAX_WALLET_BALANCE) {
    throw new Error(
      `wallet balance cap (${MAX_WALLET_BALANCE}) would be exceeded`,
    );
  }

  const kind = lotKind(input.type);
  const lot: CreditLot = {
    id: `lot_${crypto.randomUUID().replace(/-/g, "")}`,
    wid: input.wid,
    kind,
    original: input.amount,
    remaining: input.amount,
    createdAt: nowIso(),
    expiresAt: expiresAtForTxnType(
      input.type === "adjust" ? "purchase" : input.type,
      at,
    ).toISOString(),
    priority: priorityForTxnType(
      input.type === "adjust" ? "purchase" : input.type,
    ),
    ref: input.ref,
    note: input.note,
  };
  lots.push(lot);
  await saveLots(input.wid, lots);

  const balance = sumAvailable(lots, at);
  if (kind === "purchase") {
    if (!r) {
      mem().outstanding += input.amount;
    } else {
      await r.incrby(OUTSTANDING_KEY, input.amount);
    }
  }

  await appendTxn({
    id: `t_${crypto.randomUUID().replace(/-/g, "")}`,
    wid: input.wid,
    type: input.type,
    amount: input.amount,
    balanceAfter: balance,
    at: nowIso(),
    note: input.note,
    ref: input.ref,
  });

  return { balance, applied: true, lotId: lot.id };
}

export async function debitWallet(input: {
  wid: string;
  amount: number;
  type: CreditTxnType;
  note?: string;
  ref?: string;
}): Promise<
  { ok: true; balance: number } | { ok: false; balance: number; reason: string }
> {
  if (input.amount <= 0) {
    return {
      ok: false,
      balance: await getBalance(input.wid),
      reason: "bad_amount",
    };
  }

  const daily = await getDailyDebit(input.wid);
  if (daily + input.amount > HOSTED_DAILY_DEBIT_CAP) {
    return {
      ok: false,
      balance: await getBalance(input.wid),
      reason: "daily_cap",
    };
  }

  await expireStaleLots(input.wid);
  const at = new Date();
  const lots = await loadLots(input.wid);
  const available = sumAvailable(lots, at);
  if (available < input.amount) {
    return { ok: false, balance: available, reason: "insufficient" };
  }

  let left = input.amount;
  let purchaseConsumed = 0;
  const ordered = sortLotsForDrawdown(
    lots.filter(
      (l) => l.remaining > 0 && Date.parse(l.expiresAt) > at.getTime(),
    ),
  );

  for (const lot of ordered) {
    if (left <= 0) break;
    const take = Math.min(lot.remaining, left);
    lot.remaining -= take;
    left -= take;
    if (lot.kind === "purchase") purchaseConsumed += take;
  }

  // 元配列へ remaining を反映
  const byId = new Map(ordered.map((l) => [l.id, l]));
  for (let i = 0; i < lots.length; i++) {
    const updated = byId.get(lots[i].id);
    if (updated) lots[i] = updated;
  }

  await saveLots(input.wid, lots);
  const balance = sumAvailable(lots, at);

  const r = redis();
  if (purchaseConsumed > 0) {
    if (!r) {
      mem().outstanding = Math.max(0, mem().outstanding - purchaseConsumed);
    } else {
      await r.decrby(OUTSTANDING_KEY, purchaseConsumed);
    }
  }

  if (!r) {
    const dk = dayKey(input.wid);
    mem().daily.set(dk, (mem().daily.get(dk) ?? 0) + input.amount);
  } else {
    await r.incrby(dayKey(input.wid), input.amount);
    await r.expire(dayKey(input.wid), 60 * 60 * 48);
  }

  await appendTxn({
    id: `t_${crypto.randomUUID().replace(/-/g, "")}`,
    wid: input.wid,
    type: input.type,
    amount: -input.amount,
    balanceAfter: balance,
    at: nowIso(),
    note: input.note,
    ref: input.ref,
  });

  return { ok: true, balance };
}

export async function createHostedSession(input: {
  wid: string;
  engine: LiveEngineId;
}): Promise<HostedSession> {
  const now = Date.now();
  const sess: HostedSession = {
    sid: `s_${crypto.randomUUID().replace(/-/g, "")}`,
    wid: input.wid,
    engine: input.engine,
    startedAt: now,
    lastDebitAt: now,
    billedMs: 0,
  };

  const r = redis();
  if (!r) {
    mem().sessions.set(sess.sid, sess);
  } else {
    await r.set(`${SESSION_PREFIX}${sess.sid}`, sess, {
      ex: HOSTED_MAX_SESSION_MINUTES * 60 + 600,
    });
  }
  return sess;
}

export async function getHostedSession(
  sid: string,
): Promise<HostedSession | null> {
  const r = redis();
  if (!r) return mem().sessions.get(sid) ?? null;
  return (await r.get<HostedSession>(`${SESSION_PREFIX}${sid}`)) ?? null;
}

export async function saveHostedSession(sess: HostedSession): Promise<void> {
  const r = redis();
  if (!r) {
    mem().sessions.set(sess.sid, sess);
    return;
  }
  await r.set(`${SESSION_PREFIX}${sess.sid}`, sess, {
    ex: HOSTED_MAX_SESSION_MINUTES * 60 + 600,
  });
}

export function resetMemoryLedgerForTests(): void {
  g.__presenceCreditsMem = undefined;
}

/** テスト専用: ロット差し替え（失効検証用。outstanding は触らない） */
export async function replaceLotsForTests(
  wid: string,
  lots: CreditLot[],
): Promise<void> {
  await saveLots(wid, lots);
}
