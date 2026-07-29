import { describe, expect, it } from "vitest";
import { canUseLiveEngine, entitlementsFor } from "@/lib/entitlements";

describe("entitlements", () => {
  it("free locks to one live engine", () => {
    const e = entitlementsFor("free");
    expect(e.liveEngines).toHaveLength(1);
    expect(e.searchEnabled).toBe(false);
    expect(e.maxProjects).toBe(1);
  });

  it("pro unlocks triple live and search", () => {
    const e = entitlementsFor("pro");
    expect(e.liveEngines).toContain("gpt-live");
    expect(e.liveEngines).toContain("gemini-live");
    expect(e.liveEngines).toContain("grok-voice");
    expect(e.searchEnabled).toBe(true);
  });

  it("rejects locked engine on free", () => {
    expect(canUseLiveEngine("free", "gpt-live")).toBe(false);
    expect(canUseLiveEngine("free", "grok-voice")).toBe(true);
  });
});
