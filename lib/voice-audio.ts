/**
 * Grok realtime 向け PCM16 mono @ 24kHz ヘルパ。
 * WHY 24kHz: OpenAI Realtime 互換系の事実上の標準サンプルレート（xAI Voice も同系）。
 */

export const VOICE_SAMPLE_RATE = 24_000;

export function floatTo16BitPCM(float32: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i] ?? 0));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** 簡易再生キュー。ジッタバッファは後続。 */
export class PcmPlayer {
  private ctx: AudioContext;
  private nextTime = 0;

  constructor(sampleRate = VOICE_SAMPLE_RATE) {
    this.ctx = new AudioContext({ sampleRate });
  }

  async resume() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  playPcm16(base64: string) {
    const pcm = base64ToArrayBuffer(base64);
    const view = new DataView(pcm);
    const samples = pcm.byteLength / 2;
    const audio = this.ctx.createBuffer(1, samples, this.ctx.sampleRate);
    const channel = audio.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      channel[i] = view.getInt16(i * 2, true) / 0x8000;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = audio;
    src.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    const start = Math.max(now + 0.02, this.nextTime);
    src.start(start);
    this.nextTime = start + audio.duration;
  }

  async close() {
    this.nextTime = 0;
    await this.ctx.close();
  }
}
