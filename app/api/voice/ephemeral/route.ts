/**
 * BYOK → 各社 ephemeral / client_secret。
 * 不変条件: ユーザーキーも token も永続化・ログしない。
 *
 * - xAI: `xai-client-secret.<token>`
 * - OpenAI: `openai-insecure-api-key.<token>` + `realtime`
 * - Google: authTokens → Constrained WS の access_token（キーを WS URL に載せない）
 */

import {
  GEMINI_LIVE_MODEL,
  LIVE_SYSTEM,
  type LiveEngineId,
  OPENAI_REALTIME_MODEL,
} from "@/lib/voice/engines";

export const runtime = "edge";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const engine = (req.headers.get("x-presence-engine") ??
    "grok-voice") as LiveEngineId;

  if (!auth.toLowerCase().startsWith("bearer ") || auth.length < 20) {
    return new Response("API キーが必要です", { status: 401 });
  }

  const apiKey = auth.slice("Bearer ".length).trim();

  if (engine === "gemini-live") {
    return mintGeminiEphemeral(apiKey);
  }

  if (engine === "gpt-live") {
    const upstream = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expires_after: { seconds: 300 },
          session: {
            type: "realtime",
            model: OPENAI_REALTIME_MODEL,
          },
        }),
      },
    );
    const text = await upstream.text();
    if (!upstream.ok) {
      return new Response(text.slice(0, 400) || `upstream ${upstream.status}`, {
        status: upstream.status,
      });
    }
    return new Response(text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstream = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expires_after: { seconds: 300 },
    }),
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    return new Response(text.slice(0, 400) || `upstream ${upstream.status}`, {
      status: upstream.status,
    });
  }

  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function mintGeminiEphemeral(apiKey: string): Promise<Response> {
  const expire = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const newSessionExpire = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  // v1alpha AuthTokenService。失敗時はクライアントが key= フォールバック可能。
  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1alpha/authTokens?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expireTime: expire,
        newSessionExpireTime: newSessionExpire,
        uses: 1,
        liveConnectConstraints: {
          model: GEMINI_LIVE_MODEL,
          config: {
            responseModalities: ["AUDIO"],
            systemInstruction: {
              parts: [{ text: LIVE_SYSTEM }],
            },
            tools: [{ googleSearch: {} }],
          },
        },
      }),
    },
  );

  const text = await upstream.text();
  if (!upstream.ok) {
    return new Response(
      text.slice(0, 500) ||
        "Gemini ephemeral の発行に失敗しました。AI Studio で Live API が有効か、モデル名が現行かを確認してください。",
      { status: upstream.status },
    );
  }

  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
