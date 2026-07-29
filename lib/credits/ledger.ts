/**
 * クレジット台帳（Upstash Redis）。
 * WHY: 資金決済の自家型前払式に備え、増減・理由・時刻を残せる形にする。
 * Redis 未設定時はプロセス内 Map（開発・テスト専用。本番は UPSTASH 必須）。
 */

import { Redis } from "@upstash/redis";
import {
  HOSTED_DAILY_DEBIT_CAP,
  HOSTED_MAX_SESSION_MINUTES,
} from "@/lib/credits/rates";
import type { CreditTxnType } from "@/lib/credits/types";
import type { LiveEngineId } from "@/lib/voice/engines";

const BALANCE_PREFIX = "credits:bal:";
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
  bal: Map<string, number>;
  txns: Map<string, CreditTxn[]>;
  daily: Map<string, number>;
  sessions: Map<string, HostedSession>;
  idem: Set<string>;
  outstanding: number;
};

const g = globalThis as unknown as { __presenceCreditsMem?: MemoryStore };

function mem(): MemoryStore {
  if (!g.__presenceCreditsMem) {
    g.__presenceCreditsMem = {
      bal: new Map(),
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

export async function getBalance(wid: string): Promise<number> {
  const r = redis();
  if (!r) return mem().bal.get(wid) ?? 0;
  const v = await r.get<number>(`${BALANCE_PREFIX}${wid}`);
  return typeof v === "number" ? v : 0;
}

export async function getDailyDebit(wid: string): Promise<number> {
  const r = redis();
  if (!r) return mem().daily.get(dayKey(wid)) ?? 0;
  const v = await r.get<number>(dayKey(wid));
  return typeof v === "number" ? v : 0;
}

export async function getOutstandingCredits(): Promise<number> {
  const r = redis();
  if (!r) return mem().outstanding;
  const v = await r.get<number>(OUTSTANDING_KEY);
  return typeof v === "number" ? v : 0;
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

export async function creditWallet(input: {
  wid: string;
  amount: number;
  type: CreditTxnType;
  note?: string;
  ref?: string;
  idempotencyKey?: string;
}): Promise<{ balance: number; applied: boolean }> {
  if (input.amount <= 0) throw new Error("credit amount must be positive");

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

  let balance: number;
  if (!r) {
    balance = (mem().bal.get(input.wid) ?? 0) + input.amount;
    mem().bal.set(input.wid, balance);
    if (input.type === "purchase" || input.type === "grant") {
      mem().outstanding += input.amount;
    }
  } else {
    balance = await r.incrby(`${BALANCE_PREFIX}${input.wid}`, input.amount);
    if (input.type === "purchase" || input.type === "grant") {
      await r.incrby(OUTSTANDING_KEY, input.amount);
    }
  }

  await appendTxn({
    id: `t_${crypto.randomUUID().replace(/-/g, "")}`,
    wid: input.wid,
    type: input.type,
    amount: input.amount,
    balanceAfter: balance,
    at: new Date().toISOString(),
    note: input.note,
    ref: input.ref,
  });

  return { balance, applied: true };
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

  const r = redis();
  let balance: number;

  if (!r) {
    const cur = mem().bal.get(input.wid) ?? 0;
    if (cur < input.amount) {
      return { ok: false, balance: cur, reason: "insufficient" };
    }
    balance = cur - input.amount;
    mem().bal.set(input.wid, balance);
    mem().outstanding = Math.max(0, mem().outstanding - input.amount);
    const dk = dayKey(input.wid);
    mem().daily.set(dk, (mem().daily.get(dk) ?? 0) + input.amount);
  } else {
    // 残高不足なら戻す（簡易 CAS）
    balance = await r.decrby(`${BALANCE_PREFIX}${input.wid}`, input.amount);
    if (balance < 0) {
      await r.incrby(`${BALANCE_PREFIX}${input.wid}`, input.amount);
      return {
        ok: false,
        balance: await getBalance(input.wid),
        reason: "insufficient",
      };
    }
    await r.decrby(OUTSTANDING_KEY, input.amount);
    await r.incrby(dayKey(input.wid), input.amount);
    await r.expire(dayKey(input.wid), 60 * 60 * 48);
  }

  await appendTxn({
    id: `t_${crypto.randomUUID().replace(/-/g, "")}`,
    wid: input.wid,
    type: input.type,
    amount: -input.amount,
    balanceAfter: balance,
    at: new Date().toISOString(),
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

/** 開発用メモリ台帳リセット（テスト専用） */
export function resetMemoryLedgerForTests(): void {
  g.__presenceCreditsMem = undefined;
}
