import { describe, expect, it } from "vitest";
import { getLiveEngine, LIVE_ENGINES } from "@/lib/voice/engines";

describe("live engines", () => {
  it("has the triple stack", () => {
    const ids = LIVE_ENGINES.map((e) => e.id);
    expect(ids).toEqual(["gpt-live", "gemini-live", "grok-voice"]);
  });

  it("gemini uses 16k input", () => {
    expect(getLiveEngine("gemini-live").inputRate).toBe(16_000);
  });

  it("throws on unknown", () => {
    expect(() => getLiveEngine("nope" as never)).toThrow(/unknown live engine/);
  });
});
