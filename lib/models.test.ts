import { describe, expect, it } from "vitest";
import { chatModels, getModel, MODELS } from "@/lib/models";

describe("models", () => {
  it("has both openai and xai chat models", () => {
    const providers = new Set(chatModels().map((m) => m.provider));
    expect(providers.has("openai")).toBe(true);
    expect(providers.has("xai")).toBe(true);
  });

  it("includes grok voice as voice mode", () => {
    expect(getModel("grok-voice").mode).toBe("voice");
  });

  it("throws on unknown model", () => {
    expect(() => getModel("nope" as never)).toThrow(/unknown model/);
  });

  it("every model has non-empty label", () => {
    for (const m of MODELS) {
      expect(m.label.length).toBeGreaterThan(0);
    }
  });
});
