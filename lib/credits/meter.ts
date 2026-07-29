import {
  createHostedSession,
  debitWallet,
  getBalance,
  getDailyDebit,
  getHostedSession,
  saveHostedSession,
} from "@/lib/credits/ledger";
import { opsKeyForEngine } from "@/lib/credits/ops-keys";
import {
  HOSTED_CREDITS_PER_MINUTE,
  HOSTED_DAILY_DEBIT_CAP,
  HOSTED_MAX_SESSION_MINUTES,
  sessionCostCredits,
} from "@/lib/credits/rates";
import type { LiveEngineId } from "@/lib/voice/engines";

/** 開始に必要な最低残高（約 30 秒分） */
export function minCreditsToStart(engine: LiveEngineId): number {
  return Math.max(1, Math.ceil(HOSTED_CREDITS_PER_MINUTE[engine] / 2));
}

export async function assertCanStartHosted(
  wid: string,
  engine: LiveEngineId,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!opsKeyForEngine(engine)) {
    return {
      ok: false,
      error: "このエンジンの運営キーが未設定です。",
      status: 503,
    };
  }
  const bal = await getBalance(wid);
  const need = minCreditsToStart(engine);
  if (bal < need) {
    return {
      ok: false,
      error: `クレジット不足です（残高 ${bal} / 開始に約 ${need} 必要）。プランで購入してください。`,
      status: 402,
    };
  }
  const daily = await getDailyDebit(wid);
  if (daily >= HOSTED_DAILY_DEBIT_CAP) {
    return {
      ok: false,
      error: "本日の利用上限に達しました。",
      status: 429,
    };
  }
  return { ok: true };
}

export async function openMeteredSession(
  wid: string,
  engine: LiveEngineId,
): Promise<{ sid: string }> {
  const gate = await assertCanStartHosted(wid, engine);
  if (!gate.ok) throw new Error(gate.error);
  const sess = await createHostedSession({ wid, engine });
  return { sid: sess.sid };
}

/**
 * 前回デビットからの経過を課金。残高不足なら closed 扱い。
 */
export async function heartbeatSession(sid: string): Promise<{
  ok: boolean;
  balance: number;
  billedMs: number;
  shouldStop: boolean;
  reason?: string;
}> {
  const sess = await getHostedSession(sid);
  if (!sess || sess.closed) {
    return {
      ok: false,
      balance: 0,
      billedMs: 0,
      shouldStop: true,
      reason: "session_gone",
    };
  }

  const now = Date.now();
  const elapsedTotal = now - sess.startedAt;
  const maxMs = HOSTED_MAX_SESSION_MINUTES * 60_000;
  if (elapsedTotal >= maxMs) {
    sess.closed = true;
    await saveHostedSession(sess);
    return {
      ok: false,
      balance: await getBalance(sess.wid),
      billedMs: sess.billedMs,
      shouldStop: true,
      reason: "session_cap",
    };
  }

  const deltaMs = now - sess.lastDebitAt;
  if (deltaMs < 5_000) {
    return {
      ok: true,
      balance: await getBalance(sess.wid),
      billedMs: sess.billedMs,
      shouldStop: false,
    };
  }

  const cost = sessionCostCredits(sess.engine, deltaMs);
  const result = await debitWallet({
    wid: sess.wid,
    amount: cost,
    type: "debit_session",
    note: `${sess.engine} ${Math.ceil(deltaMs / 1000)}s`,
    ref: sess.sid,
  });

  if (!result.ok) {
    sess.closed = true;
    await saveHostedSession(sess);
    return {
      ok: false,
      balance: result.balance,
      billedMs: sess.billedMs,
      shouldStop: true,
      reason: result.reason,
    };
  }

  sess.lastDebitAt = now;
  sess.billedMs += deltaMs;
  await saveHostedSession(sess);

  return {
    ok: true,
    balance: result.balance,
    billedMs: sess.billedMs,
    shouldStop: false,
  };
}

export async function endSession(sid: string): Promise<{
  balance: number;
  billedMs: number;
}> {
  const beat = await heartbeatSession(sid);
  const sess = await getHostedSession(sid);
  if (sess) {
    sess.closed = true;
    await saveHostedSession(sess);
  }
  return {
    balance: beat.balance,
    billedMs: beat.billedMs,
  };
}
