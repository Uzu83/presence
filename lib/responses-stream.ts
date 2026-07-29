/**
 * xAI / OpenAI Responses API の SSE を、Presence クライアントが読む
 * chat.completions 互換 + presence 拡張イベントへ正規化する。
 *
 * WHY 正規化: Voice と Chat で同じ UI フック（検索中バッジ）を使えるようにする。
 */

export type NormalizedSse =
  | { kind: "delta"; text: string }
  | { kind: "searching"; active: boolean }
  | { kind: "done" };

function sseData(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export function encodeChatDelta(text: string): string {
  return sseData({ choices: [{ delta: { content: text } }] });
}

export function encodeSearching(active: boolean): string {
  return sseData({ presence: { searching: active } });
}

export function encodeDone(): string {
  return "data: [DONE]\n\n";
}

/**
 * Responses API の 1 イベント JSON を解釈。
 * プロバイダ差（type 名の揺れ）をここで吸収する。
 */
export function interpretResponsesEvent(
  event: Record<string, unknown>,
): NormalizedSse[] {
  const type = String(event.type ?? "");
  const out: NormalizedSse[] = [];

  if (
    type.includes("web_search") ||
    type.includes("web_search_call") ||
    type === "response.web_search_call.in_progress" ||
    type === "response.web_search_call.searching"
  ) {
    if (type.endsWith(".completed") || type.endsWith(".done")) {
      out.push({ kind: "searching", active: false });
    } else {
      out.push({ kind: "searching", active: true });
    }
  }

  if (
    type === "response.output_text.delta" ||
    type === "response.text.delta" ||
    type === "content_block_delta"
  ) {
    const delta = event.delta;
    if (typeof delta === "string" && delta)
      out.push({ kind: "delta", text: delta });
    else if (delta && typeof delta === "object" && "text" in delta) {
      const t = (delta as { text?: unknown }).text;
      if (typeof t === "string" && t) out.push({ kind: "delta", text: t });
    }
  }

  // 一部実装は output 配列に text を載せる
  if (
    type === "response.output_item.added" ||
    type === "response.output_item.done"
  ) {
    const item = event.item as
      | { type?: string; content?: Array<{ type?: string; text?: string }> }
      | undefined;
    if (item?.type === "message") {
      for (const part of item.content ?? []) {
        if (part.type === "output_text" && part.text) {
          // done で全文が来る場合は二重送信しやすいので added のみ拾わない方針
        }
      }
    }
  }

  if (type === "response.completed" || type === "response.done") {
    out.push({ kind: "searching", active: false });
    out.push({ kind: "done" });
  }

  return out;
}

/** upstream SSE 本文を Presence 正規化 SSE に変換する TransformStream */
export function createResponsesNormalizer(): TransformStream<
  Uint8Array,
  Uint8Array
> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let searching = false;

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          if (searching) {
            controller.enqueue(encoder.encode(encodeSearching(false)));
            searching = false;
          }
          controller.enqueue(encoder.encode(encodeDone()));
          continue;
        }
        try {
          const json = JSON.parse(data) as Record<string, unknown>;
          for (const ev of interpretResponsesEvent(json)) {
            if (ev.kind === "delta") {
              controller.enqueue(encoder.encode(encodeChatDelta(ev.text)));
            } else if (ev.kind === "searching") {
              if (ev.active !== searching) {
                searching = ev.active;
                controller.enqueue(encoder.encode(encodeSearching(ev.active)));
              }
            } else if (ev.kind === "done") {
              if (searching) {
                controller.enqueue(encoder.encode(encodeSearching(false)));
                searching = false;
              }
              controller.enqueue(encoder.encode(encodeDone()));
            }
          }
        } catch {
          // ignore partial
        }
      }
    },
    flush(controller) {
      if (searching) controller.enqueue(encoder.encode(encodeSearching(false)));
    },
  });
}
