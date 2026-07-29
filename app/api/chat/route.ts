import { getModel, type ModelId, PROVIDER_CHAT_URL } from "@/lib/models";

export const runtime = "edge";

type ChatBody = {
  model: ModelId;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
};

/**
 * BYOK プロキシ。
 * 不変条件: API キーをログにもストレージにも残さない。Authorization をそのまま転送。
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
    // キー本文はエコーしない
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
