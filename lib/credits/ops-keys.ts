import type { LiveEngineId } from "@/lib/voice/engines";

/**
 * 運営が持つ API キー（Vercel env）。クライアントに出さない。
 */
export function opsKeyForEngine(engine: LiveEngineId): string | null {
  if (engine === "gpt-live") {
    return process.env.OPENAI_API_KEY?.trim() || null;
  }
  if (engine === "gemini-live") {
    return (
      process.env.GOOGLE_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      null
    );
  }
  return process.env.XAI_API_KEY?.trim() || null;
}

export function hostedOpsConfigured(): boolean {
  // 最低 Grok があれば Hosted 起動可。他エンジンはキーがあるときだけ。
  return Boolean(process.env.XAI_API_KEY?.trim());
}

export function hostedEnginesAvailable(): LiveEngineId[] {
  const out: LiveEngineId[] = [];
  if (process.env.OPENAI_API_KEY?.trim()) out.push("gpt-live");
  if (
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim()
  ) {
    out.push("gemini-live");
  }
  if (process.env.XAI_API_KEY?.trim()) out.push("grok-voice");
  return out;
}
