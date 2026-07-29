/**
 * BYOK → xAI ephemeral token。
 * 不変条件: ユーザーキーも token も永続化・ログしない。300秒で失効。
 * ブラウザは Authorization ヘッダを付けられないので、client_secret を
 * sec-websocket-protocol (`xai-client-secret.<token>`) で使う。
 */

export const runtime = "edge";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ") || auth.length < 20) {
    return new Response("xAI API キーが必要です", { status: 401 });
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
