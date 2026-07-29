import { describe, expect, it } from "vitest";
import { hasSearchIntent } from "@/lib/search-intent";

describe("hasSearchIntent", () => {
  it("detects Japanese search prompts", () => {
    expect(hasSearchIntent("それ調べて")).toBe(true);
    expect(hasSearchIntent("最新情報を検索して")).toBe(true);
    expect(hasSearchIntent("ちょっとググって")).toBe(true);
  });

  it("detects English search prompts", () => {
    expect(hasSearchIntent("Can you look up the score?")).toBe(true);
    expect(hasSearchIntent("search for that restaurant")).toBe(true);
  });

  it("rejects ordinary chat (failure path)", () => {
    expect(hasSearchIntent("今日の天気はどう？")).toBe(false);
    expect(hasSearchIntent("ありがとう")).toBe(false);
    expect(hasSearchIntent("")).toBe(false);
  });
});
