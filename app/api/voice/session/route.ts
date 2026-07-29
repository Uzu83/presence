/**
 * Grok Voice はブラウザから wss://api.x.ai/v1/realtime へ直結するのが本線。
 * このルートは接続手順メタを返すだけ（キーはクライアント保有）。
 *
 * WHY-not サーバで WS 中継: Edge の長寿命 WS と課金リスク。MVP は直結。
 * 将来 ephemeral token が安定したらここで発行してキーを隠す。
 */

export const runtime = "edge";

export async function GET() {
  return Response.json({
    endpoint: "wss://api.x.ai/v1/realtime?model=grok-voice-latest",
    auth: "Bearer <XAI_API_KEY>",
    note: "キーは端末に保存した xAI キーを Authorization に載せて接続してください。サーバは中継しません。",
    sessionUpdate: {
      type: "session.update",
      session: {
        voice: "eve",
        instructions:
          "You are Presence, a concise bilingual assistant. Prefer Japanese when the user speaks Japanese.",
        turn_detection: { type: "server_vad" },
      },
    },
  });
}
