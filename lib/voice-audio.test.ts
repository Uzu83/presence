import { describe, expect, it } from "vitest";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  floatTo16BitPCM,
} from "@/lib/voice-audio";

describe("voice-audio", () => {
  it("roundtrips base64", () => {
    const original = new Uint8Array([1, 2, 3, 250]).buffer;
    const b64 = arrayBufferToBase64(original);
    const back = new Uint8Array(base64ToArrayBuffer(b64));
    expect([...back]).toEqual([1, 2, 3, 250]);
  });

  it("encodes float samples to pcm16", () => {
    const pcm = floatTo16BitPCM(new Float32Array([0, 1, -1, 0.5]));
    const view = new DataView(pcm);
    expect(view.getInt16(0, true)).toBe(0);
    expect(view.getInt16(2, true)).toBe(0x7fff);
    expect(view.getInt16(4, true)).toBe(-0x8000);
    expect(view.getInt16(6, true)).toBeGreaterThan(0);
  });

  it("clamps out-of-range floats (failure path)", () => {
    const pcm = floatTo16BitPCM(new Float32Array([2, -3]));
    const view = new DataView(pcm);
    expect(view.getInt16(0, true)).toBe(0x7fff);
    expect(view.getInt16(2, true)).toBe(-0x8000);
  });
});
