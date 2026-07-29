/**
 * BYOK → 各社 ephemeral / client_secret。
 * 不変条件: ユーザーキーも token も永続化・ログしない。
 *
 * - xAI: sec-websocket-protocol `xai-client-secret.<token>`
 * - OpenAI: sec-websocket-protocol `openai-insecure-api-key.<token>` + `realtime`
 * - Google: ephemeral 未使用（ブラウザが key= で直結）。このルートは 400。
 */

import { type LiveEngineId, OPENAI_REALTIME_MODEL } from "@/lib/voice/engines";

export const runtime = "edge";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const engine = (req.headers.get("x-presence-engine") ??
    "grok-voice") as LiveEngineId;

  if (!auth.toLowerCase().startsWith("bearer ") || auth.length < 20) {
    return new Response("API キーが必要です", { status: 401 });
  }

  if (engine === "gemini-live") {
    return new Response(
      "Gemini Live は ephemeral 不要です。セッションメタの endpoint に key を付けて接続してください。",
      { status: 400 },
    );
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
