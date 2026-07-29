/**
 * Live エンジンごとの接続メタ。
 * キーは返さない（Gemini だけクライアントが endpoint に key を付ける）。
 */

import { SEARCH_POLICY_JA } from "@/lib/search-intent";
import {
  GEMINI_LIVE_MODEL,
  getLiveEngine,
  LIVE_SYSTEM,
  type LiveEngineId,
  OPENAI_REALTIME_MODEL,
} from "@/lib/voice/engines";

export const runtime = "edge";

export async function GET(req: Request) {
  const engineParam =
    new URL(req.url).searchParams.get("engine") ?? "grok-voice";
  let engineId: LiveEngineId;
  try {
    engineId = getLiveEngine(engineParam as LiveEngineId).id;
  } catch {
    return new Response("unknown engine", { status: 400 });
  }

  if (engineId === "gpt-live") {
    return Response.json({
      engine: engineId,
      endpoint: `wss://api.openai.com/v1/realtime?model=${OPENAI_REALTIME_MODEL}`,
      authMode: "openai-protocol",
      sessionUpdate: {
        type: "session.update",
        session: {
          // 新旧フィールドを併記。サーバが無視する方は落ちない想定。
          type: "realtime",
          modalities: ["audio", "text"],
          instructions: LIVE_SYSTEM,
          voice: "alloy",
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          turn_detection: { type: "server_vad" },
          tools: [{ type: "web_search" }],
        },
      },
    });
  }

  if (engineId === "gemini-live") {
    const setup = {
      setup: {
        model: GEMINI_LIVE_MODEL,
        generationConfig: {
          responseModalities: ["AUDIO"],
        },
        systemInstruction: {
          parts: [{ text: LIVE_SYSTEM }],
        },
        tools: [{ googleSearch: {} }],
      },
    };
    return Response.json({
      engine: engineId,
      // ephemeral 成功時は Constrained + access_token（キーを WS に載せない）
      endpointEphemeral:
        "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained",
      // フォールバック: BYOK で key=（発行失敗時のみ）
      endpoint:
        "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent",
      authMode: "google-ephemeral-or-key",
      setup,
      note: SEARCH_POLICY_JA,
    });
  }

  return Response.json({
    engine: "grok-voice",
    endpoint: "wss://api.x.ai/v1/realtime?model=grok-voice-latest",
    authMode: "xai-protocol",
    sessionUpdate: {
      type: "session.update",
      session: {
        voice: "eve",
        instructions: LIVE_SYSTEM,
        turn_detection: { type: "server_vad" },
        tools: [{ type: "web_search" }],
      },
    },
  });
}
