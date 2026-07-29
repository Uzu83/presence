/**
 * Live 音声エンジンの唯一の正。
 * 北極星: GPT Live × Gemini Live × Grok Voice の三本柱。
 */

import type { ProviderId } from "@/lib/models";
import { SEARCH_POLICY_JA } from "@/lib/search-intent";

export type LiveEngineId = "gpt-live" | "gemini-live" | "grok-voice";

export type LiveEngine = {
  id: LiveEngineId;
  label: string;
  provider: ProviderId;
  hint: string;
  /** マイク取り込みサンプルレート */
  inputRate: number;
  /** 再生サンプルレート */
  outputRate: number;
};

export const LIVE_ENGINES: LiveEngine[] = [
  {
    id: "gpt-live",
    label: "GPT Live",
    provider: "openai",
    hint: "OpenAI Realtime",
    inputRate: 24_000,
    outputRate: 24_000,
  },
  {
    id: "gemini-live",
    label: "Gemini Live",
    provider: "google",
    hint: "Google 双方向音声",
    // Gemini Live 入力は 16kHz PCM、出力は 24kHz
    inputRate: 16_000,
    outputRate: 24_000,
  },
  {
    id: "grok-voice",
    label: "Grok Voice",
    provider: "xai",
    hint: "xAI フルデュプレックス",
    inputRate: 24_000,
    outputRate: 24_000,
  },
];

export function getLiveEngine(id: LiveEngineId): LiveEngine {
  const found = LIVE_ENGINES.find((e) => e.id === id);
  if (!found) throw new Error(`unknown live engine: ${id}`);
  return found;
}

export const LIVE_SYSTEM = [
  "You are Presence, a concise bilingual voice assistant.",
  "Prefer Japanese when the user speaks Japanese.",
  SEARCH_POLICY_JA,
  "When you start searching, briefly say you are looking it up, then answer from the results.",
].join(" ");

/** OpenAI Realtime モデル。短く安い mini を既定に。 */
export const OPENAI_REALTIME_MODEL = "gpt-realtime-mini";

/**
 * Gemini Live モデル。
 * WHY この ID: Google AI（generativelanguage）側の native-audio Live 系。
 * 変わったらここだけ直す。
 */
export const GEMINI_LIVE_MODEL =
  "models/gemini-2.5-flash-native-audio-preview-12-2025";
