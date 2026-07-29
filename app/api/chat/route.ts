import { getModel, type ModelId, PROVIDER_CHAT_URL } from "@/lib/models";
import { createResponsesNormalizer } from "@/lib/responses-stream";

export const runtime = "edge";

type ChatBody = {
  model: ModelId;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  /** 「調べて」検知時 true → Responses API + web_search */
  search?: boolean;
};

/**
 * BYOK プロキシ。
 * 不変条件: API キーをログにもストレージにも残さない。Authorization をそのまま転送。
 *
 * search=true のとき:
 * - xAI → /v1/responses + web_search（サーバ側ツール）
 * - OpenAI → /v1/responses + web_search_preview
 * ストリームは chat.completions 互換 + presence.searching に正規化。
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const providerHeader = req.headers.get("x-presence-provider") ?? "";

  if (!auth.toLowerCase().startsWith("bearer ") || auth.length < 20) {
    return new Response(
      "API キーがありません。設定タブでキーを保存してください。",
      {
        status: 401,
      },
    );
  }

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  let model: ReturnType<typeof getModel>;
  try {
    model = getModel(body.model);
  } catch {
    return new Response("unknown model", { status: 400 });
  }

  if (model.mode !== "chat") {
    return new Response("voice models use /api/voice", { status: 400 });
  }

  if (providerHeader && providerHeader !== model.provider) {
    return new Response("provider mismatch", { status: 400 });
  }

  if (body.search) {
    return proxySearchResponses({
      auth,
      provider: model.provider,
      modelId: body.model,
      messages: body.messages,
    });
  }

  const upstream = await fetch(PROVIDER_CHAT_URL[model.provider], {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      stream: body.stream !== false,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return new Response(text.slice(0, 500) || `upstream ${upstream.status}`, {
      status: upstream.status,
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

async function proxySearchResponses(args: {
  auth: string;
  provider: "openai" | "xai";
  modelId: string;
  messages: Array<{ role: string; content: string }>;
}): Promise<Response> {
  const url =
    args.provider === "xai"
      ? "https://api.x.ai/v1/responses"
      : "https://api.openai.com/v1/responses";

  // Responses API は input に system を載せる形がプロバイダで揺れる。
  // 先頭 system は instructions に逃がし、残りを input にする。
  const systemParts = args.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content);
  const input = args.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  const tools =
    args.provider === "xai"
      ? [{ type: "web_search" }]
      : [{ type: "web_search_preview" }];

  const payload: Record<string, unknown> = {
    model: args.modelId,
    input,
    tools,
    stream: true,
  };
  if (systemParts.length > 0) {
    payload.instructions = systemParts.join("\n\n");
  }

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: args.auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return new Response(text.slice(0, 500) || `upstream ${upstream.status}`, {
      status: upstream.status,
    });
  }

  const normalized = upstream.body.pipeThrough(createResponsesNormalizer());
  return new Response(normalized, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
