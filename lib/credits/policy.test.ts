import { describe, expect, it } from "vitest";
import {
  grantExpiresAt,
  LOT_PRIORITY,
  purchaseExpiresAt,
} from "@/lib/credits/policy";

describe("credit policy expiry", () => {
  it("purchase expiry is within 6 calendar months", () => {
    const from = new Date("2026-01-15T12:00:00.000Z");
    const exp = purchaseExpiresAt(from);
    const sixMonths = new Date(from.getTime());
    sixMonths.setUTCMonth(sixMonths.getUTCMonth() + 6);
    expect(exp.getTime()).toBeLessThan(sixMonths.getTime());
    expect(exp.getTime()).toBeGreaterThan(from.getTime());
  });

  it("grant expires sooner than purchase", () => {
    const from = new Date("2026-01-15T12:00:00.000Z");
    expect(grantExpiresAt(from).getTime()).toBeLessThan(
      purchaseExpiresAt(from).getTime(),
    );
  });

  it("promo priority beats purchase", () => {
    expect(LOT_PRIORITY.grant).toBeLessThan(LOT_PRIORITY.purchase);
  });
});
