import { afterEach, describe, expect, it } from "vitest";
import {
  creditWallet,
  debitWallet,
  expireStaleLots,
  getBalance,
  getOutstandingCredits,
  listActiveLots,
  replaceLotsForTests,
  resetMemoryLedgerForTests,
  sortLotsForDrawdown,
} from "@/lib/credits/ledger";
import type { CreditLot } from "@/lib/credits/types";

afterEach(() => {
  resetMemoryLedgerForTests();
});

describe("memory ledger lots", () => {
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

  it("draws promo before purchase (priority) and FEFO", () => {
    const lots: CreditLot[] = [
      {
        id: "p",
        wid: "w",
        kind: "purchase",
        original: 10,
        remaining: 10,
        createdAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-06-01T00:00:00.000Z",
        priority: 50,
      },
      {
        id: "g",
        wid: "w",
        kind: "grant",
        original: 10,
        remaining: 10,
        createdAt: "2026-02-01T00:00:00.000Z",
        expiresAt: "2026-03-01T00:00:00.000Z",
        priority: 10,
      },
    ];
    expect(sortLotsForDrawdown(lots).map((l) => l.id)).toEqual(["g", "p"]);
  });

  it("consumes grant first then purchase; outstanding tracks purchase only", async () => {
    const wid = "w_fefo";
    await creditWallet({ wid, amount: 30, type: "purchase" });
    await creditWallet({ wid, amount: 20, type: "grant" });
    expect(await getOutstandingCredits()).toBe(30);

    const d = await debitWallet({
      wid,
      amount: 25,
      type: "debit_session",
    });
    expect(d.ok).toBe(true);
    expect(await getOutstandingCredits()).toBe(25);
    const lots = await listActiveLots(wid);
    const grant = lots.find((l) => l.kind === "grant");
    const purchase = lots.find((l) => l.kind === "purchase");
    expect(grant).toBeUndefined();
    expect(purchase?.remaining).toBe(25);
  });

  it("expires stale purchase lots and drops outstanding", async () => {
    const wid = "w_exp";
    await creditWallet({ wid, amount: 50, type: "purchase" });
    expect(await getOutstandingCredits()).toBe(50);

    const [lot] = await listActiveLots(wid);
    await replaceLotsForTests(wid, [
      {
        ...lot,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      },
    ]);
    // replaceLotsForTests syncs outstanding from remaining purchase (still 50 until expire)
    const result = await expireStaleLots(wid);
    expect(result.expiredPurchase).toBe(50);
    expect(await getBalance(wid)).toBe(0);
    expect(await getOutstandingCredits()).toBe(0);
  });
});
