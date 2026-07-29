import type { ModelId, ProviderId } from "@/lib/models";
import { getModel } from "@/lib/models";

export type ChatTurn = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type StreamChatArgs = {
  modelId: ModelId;
  apiKey: string;
  messages: ChatTurn[];
  signal?: AbortSignal;
  onDelta: (text: string) => void;
};

/**
 * ブラウザ → /api/chat → プロバイダ。
 * キーは Authorization で都度渡し、サーバは保存しない。
 */
export async function streamChat(args: StreamChatArgs): Promise<void> {
  const model = getModel(args.modelId);
  if (model.mode !== "chat") {
    throw new Error(
      "このモデルはテキストチャット非対応です。Voice タブを使ってください。",
    );
  }

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
      "X-Presence-Provider": model.provider,
    },
    body: JSON.stringify({
      model: args.modelId,
      messages: args.messages,
      stream: true,
    }),
    signal: args.signal,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `chat failed (${res.status})`);
  }
  if (!res.body) throw new Error("empty response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) args.onDelta(delta);
      } catch {
        // 部分 JSON は無視（次チャンクで揃う）
      }
    }
  }
}

export function providerForModel(modelId: ModelId): ProviderId {
  return getModel(modelId).provider;
}
