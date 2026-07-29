import { describe, expect, it } from "vitest";
import {
  BILLING_FORBIDDEN_HINTS,
  BILLING_TAGLINE,
  BILLING_VOICE_WARNING,
} from "@/lib/billing-copy";

describe("billing copy", () => {
  it("states Hosted credits as main line", () => {
    expect(BILLING_TAGLINE).toMatch(/Hosted|クレジット/);
    expect(BILLING_TAGLINE).toMatch(/BYOK/);
  });

  it("warns about live credit consumption", () => {
    expect(BILLING_VOICE_WARNING).toMatch(/クレジット|分/);
    expect(BILLING_VOICE_WARNING).toMatch(/話し放題ではありません/);
  });

  it("lists forbidden marketing phrases", () => {
    expect(BILLING_FORBIDDEN_HINTS.length).toBeGreaterThan(0);
    expect(BILLING_FORBIDDEN_HINTS.join(" ")).not.toMatch(/推奨/);
  });
});
