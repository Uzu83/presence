import { describe, expect, it } from "vitest";
import {
  BILLING_FORBIDDEN_HINTS,
  BILLING_TAGLINE,
  BILLING_VOICE_WARNING,
} from "@/lib/billing-copy";

describe("billing copy", () => {
  it("states API vs subscription clearly", () => {
    expect(BILLING_TAGLINE).toMatch(/API/);
    expect(BILLING_TAGLINE).toMatch(/別/);
  });

  it("warns about live per-minute cost", () => {
    expect(BILLING_VOICE_WARNING).toMatch(/分/);
  });

  it("lists forbidden marketing phrases", () => {
    expect(BILLING_FORBIDDEN_HINTS.length).toBeGreaterThan(0);
    expect(BILLING_FORBIDDEN_HINTS.join(" ")).not.toMatch(/推奨/);
  });
});
