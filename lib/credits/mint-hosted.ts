/**
 * 運営キーで ephemeral を発行（クライアントに長期キーを渡さない）。
 */

import { opsKeyForEngine } from "@/lib/credits/ops-keys";
import {
  GEMINI_LIVE_MODEL,
  LIVE_SYSTEM,
  type LiveEngineId,
  OPENAI_REALTIME_MODEL,
} from "@/lib/voice/engines";

export type HostedMintResult =
  | {
      engine: "gpt-live" | "grok-voice";
      secret: string;
    }
  | {
      engine: "gemini-live";
      accessToken: string;
    };

export async function mintHostedEphemeral(
  engine: LiveEngineId,
): Promise<HostedMintResult> {
  const apiKey = opsKeyForEngine(engine);
  if (!apiKey) throw new Error("ops key missing");

  if (engine === "gemini-live") {
    const expire = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpire = new Date(Date.now() + 2 * 60 * 1000).toISOString();
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
      throw new Error(text.slice(0, 400) || `gemini ${upstream.status}`);
    }
    const json = JSON.parse(text) as {
      name?: string;
      token?: string;
      value?: string;
    };
    const access = json.name ?? json.token ?? json.value;
    if (!access) throw new Error("gemini token missing");
    return { engine: "gemini-live", accessToken: access };
  }

  if (engine === "gpt-live") {
    const upstream = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
      throw new Error(text.slice(0, 400) || `openai ${upstream.status}`);
    }
    const json = JSON.parse(text) as {
      value?: string;
      client_secret?: { value?: string };
    };
    const secret = json.value ?? json.client_secret?.value;
    if (!secret) throw new Error("openai secret missing");
    return { engine: "gpt-live", secret };
  }

  const upstream = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expires_after: { seconds: 300 },
    }),
  });
  const text = await upstream.text();
  if (!upstream.ok) {
    throw new Error(text.slice(0, 400) || `xai ${upstream.status}`);
  }
  const json = JSON.parse(text) as {
    value?: string;
    client_secret?: { value?: string };
  };
  const secret = json.value ?? json.client_secret?.value;
  if (!secret) throw new Error("xai secret missing");
  return { engine: "grok-voice", secret };
}
