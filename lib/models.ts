/**
 * WHY: モデル一覧は UI とプロキシの唯一の正。
 * サブスク（ChatGPT Plus / SuperGrok / Google AI）と API クレジットは別物なので、
 * UI コピーでも「自分の API キー」と明示する。
 */

export type ProviderId = "openai" | "xai" | "google";

export type ModelId =
  | "gpt-4.1-mini"
  | "gpt-4.1"
  | "grok-3-mini"
  | "grok-3"
  | "gpt-live"
  | "gemini-live"
  | "grok-voice";

export type ModelDef = {
  id: ModelId;
  label: string;
  provider: ProviderId;
  /** chat = OpenAI互換 chat completions / voice = realtime live */
  mode: "chat" | "voice";
  hint: string;
};

export const MODELS: ModelDef[] = [
  {
    id: "gpt-4.1-mini",
    label: "GPT-4.1 mini",
    provider: "openai",
    mode: "chat",
    hint: "速い日常会話",
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    provider: "openai",
    mode: "chat",
    hint: "しっかり考える",
  },
  {
    id: "grok-3-mini",
    label: "Grok 3 mini",
    provider: "xai",
    mode: "chat",
    hint: "軽く・安く",
  },
  {
    id: "grok-3",
    label: "Grok 3",
    provider: "xai",
    mode: "chat",
    hint: "本格テキスト",
  },
  {
    id: "gpt-live",
    label: "GPT Live",
    provider: "openai",
    mode: "voice",
    hint: "OpenAI Realtime",
  },
  {
    id: "gemini-live",
    label: "Gemini Live",
    provider: "google",
    mode: "voice",
    hint: "Google 双方向音声",
  },
  {
    id: "grok-voice",
    label: "Grok Voice",
    provider: "xai",
    mode: "voice",
    hint: "xAI フルデュプレックス",
  },
];

export const PROVIDER_CHAT_URL: Record<"openai" | "xai", string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  xai: "https://api.x.ai/v1/chat/completions",
};

export function getModel(id: ModelId): ModelDef {
  const found = MODELS.find((m) => m.id === id);
  if (!found) throw new Error(`unknown model: ${id}`);
  return found;
}

export function chatModels(): ModelDef[] {
  return MODELS.filter((m) => m.mode === "chat");
}

export function voiceModels(): ModelDef[] {
  return MODELS.filter((m) => m.mode === "voice");
}
