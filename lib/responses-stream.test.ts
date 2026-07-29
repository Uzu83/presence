import { describe, expect, it } from "vitest";
import {
  encodeChatDelta,
  encodeSearching,
  interpretResponsesEvent,
} from "@/lib/responses-stream";

describe("interpretResponsesEvent", () => {
  it("marks searching on web_search progress", () => {
    const out = interpretResponsesEvent({
      type: "response.web_search_call.in_progress",
    });
    expect(out).toContainEqual({ kind: "searching", active: true });
  });

  it("extracts text deltas", () => {
    const out = interpretResponsesEvent({
      type: "response.output_text.delta",
      delta: "hello",
    });
    expect(out).toContainEqual({ kind: "delta", text: "hello" });
  });

  it("completes search and stream on response.completed", () => {
    const out = interpretResponsesEvent({ type: "response.completed" });
    expect(out).toContainEqual({ kind: "searching", active: false });
    expect(out).toContainEqual({ kind: "done" });
  });
});

describe("sse encoders", () => {
  it("wraps delta for chat client", () => {
    expect(encodeChatDelta("あ")).toContain('"content":"あ"');
  });

  it("emits presence searching flag", () => {
    expect(encodeSearching(true)).toContain('"searching":true');
  });
});
