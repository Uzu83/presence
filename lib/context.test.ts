import { describe, expect, it } from "vitest";
import {
  buildProjectContext,
  composeSystemPrompt,
  MAX_CONTEXT_CHARS,
} from "@/lib/context";

describe("buildProjectContext", () => {
  it("returns empty when no files", () => {
    expect(buildProjectContext([])).toBe("");
  });

  it("includes file names and bodies", () => {
    const out = buildProjectContext([
      { name: "notes.md", text: "会議は金曜" },
      { name: "todo.txt", text: "牛乳を買う" },
    ]);
    expect(out).toContain("notes.md");
    expect(out).toContain("会議は金曜");
    expect(out).toContain("todo.txt");
  });

  it("truncates when over budget (failure path)", () => {
    const huge = "あ".repeat(2000);
    const out = buildProjectContext([{ name: "big.txt", text: huge }], 400);
    expect(out.length).toBeLessThanOrEqual(400 + 80);
    expect(out).toContain("省略");
  });

  it("respects default budget constant", () => {
    const huge = "x".repeat(MAX_CONTEXT_CHARS + 10_000);
    const out = buildProjectContext([{ name: "a.txt", text: huge }]);
    expect(out.length).toBeLessThanOrEqual(MAX_CONTEXT_CHARS + 120);
  });
});

describe("composeSystemPrompt", () => {
  it("returns base when no files", () => {
    expect(composeSystemPrompt("hello", [])).toBe("hello");
  });

  it("appends context", () => {
    const out = composeSystemPrompt("base", [{ name: "a.md", text: "body" }]);
    expect(out.startsWith("base")).toBe(true);
    expect(out).toContain("a.md");
    expect(out).toContain("body");
  });
});
