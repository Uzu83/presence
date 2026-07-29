import { describe, expect, it } from "vitest";
import { chatCostCredits, sessionCostCredits } from "@/lib/credits/rates";

describe("credit rates", () => {
  it("bills at least 1 credit per session slice", () => {
    expect(sessionCostCredits("grok-voice", 1_000)).toBeGreaterThanOrEqual(1);
  });

  it("scales with duration and engine", () => {
    const grok = sessionCostCredits("grok-voice", 60_000);
    const gpt = sessionCostCredits("gpt-live", 60_000);
    expect(gpt).toBeGreaterThan(grok);
  });

  it("chat has a minimum debit", () => {
    expect(chatCostCredits(10)).toBeGreaterThanOrEqual(1);
  });
});
