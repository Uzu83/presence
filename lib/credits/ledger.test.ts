import { afterEach, describe, expect, it } from "vitest";
import {
  creditWallet,
  debitWallet,
  getBalance,
  getOutstandingCredits,
  resetMemoryLedgerForTests,
} from "@/lib/credits/ledger";

afterEach(() => {
  resetMemoryLedgerForTests();
});

describe("memory ledger", () => {
  it("credits and debits with idempotent purchase", async () => {
    const wid = "w_test1";
    const a = await creditWallet({
      wid,
      amount: 100,
      type: "purchase",
      idempotencyKey: "idem_1",
    });
    expect(a.applied).toBe(true);
    expect(a.balance).toBe(100);

    const again = await creditWallet({
      wid,
      amount: 100,
      type: "purchase",
      idempotencyKey: "idem_1",
    });
    expect(again.applied).toBe(false);
    expect(await getBalance(wid)).toBe(100);

    const d = await debitWallet({
      wid,
      amount: 40,
      type: "debit_session",
    });
    expect(d.ok).toBe(true);
    if (d.ok) expect(d.balance).toBe(60);
    expect(await getOutstandingCredits()).toBe(60);
  });

  it("rejects insufficient balance", async () => {
    const wid = "w_test2";
    await creditWallet({ wid, amount: 5, type: "grant" });
    const d = await debitWallet({
      wid,
      amount: 10,
      type: "debit_session",
    });
    expect(d.ok).toBe(false);
    expect(await getBalance(wid)).toBe(5);
  });
});
