/**
 * Grok Voice はブラウザから wss://api.x.ai/v1/realtime へ直結するのが本線。
 * このルートは接続手順メタを返すだけ（キーはクライアント保有）。
 *
 * web_search を常時載せ、「調べて」でモデルがサーバ側検索する。
 */

import { SEARCH_POLICY_JA } from "@/lib/search-intent";

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
        instructions: [
          "You are Presence, a concise bilingual assistant. Prefer Japanese when the user speaks Japanese.",
          SEARCH_POLICY_JA,
          "When you start searching, briefly say you are looking it up, then answer from the results.",
        ].join(" "),
        turn_detection: { type: "server_vad" },
        // xAI サーバ側ツール。ユーザーが検索を促したらモデルがこれを呼ぶ。
        tools: [{ type: "web_search" }],
      },
    },
  });
}
