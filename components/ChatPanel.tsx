"use client";

import { useEffect, useRef, useState } from "react";
import { providerForModel, streamChat } from "@/lib/chat-client";
import { composeSystemPrompt } from "@/lib/context";
import {
  addMessage,
  type ChatMessage,
  clearMessages,
  listMessages,
  newId,
} from "@/lib/idb";
import { loadKeys } from "@/lib/keys";
import { chatModels } from "@/lib/models";
import { hasSearchIntent, SEARCH_POLICY_JA } from "@/lib/search-intent";
import { useAppStore } from "@/store/app-store";
import { usePlanStore } from "@/store/plan-store";

const BASE_SYSTEM = [
  "あなたは Presence。簡潔で実務的なアシスタントです。ユーザーが日本語なら日本語で答える。",
  SEARCH_POLICY_JA,
].join(" ");

export function ChatPanel() {
  const hydrated = useAppStore((s) => s.hydrated);
  const projects = useAppStore((s) => s.projects);
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const setActiveProjectId = useAppStore((s) => s.setActiveProjectId);
  const files = useAppStore((s) => s.files);
  const messages = useAppStore((s) => s.messages);
  const setMessages = useAppStore((s) => s.setMessages);
  const modelId = useAppStore((s) => s.modelId);
  const setModelId = useAppStore((s) => s.setModelId);
  const streaming = useAppStore((s) => s.streaming);
  const setStreaming = useAppStore((s) => s.setStreaming);
  const searchEnabled = usePlanStore((s) => s.entitlements.searchEnabled);

  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const messageCount = messages.length;
  const lastContent = messages.at(-1)?.content ?? "";
  // WHY deps: ストリーム中の本文更新でも末尾へ追従したい。biome は ref-only と誤判定する。
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message stream
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageCount, lastContent, streaming]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    const keys = loadKeys();
    const provider = providerForModel(modelId);
    const apiKey = keys[provider];
    if (!apiKey) {
      setError(
        `${provider === "openai" ? "OpenAI" : "xAI"} の API キーを設定タブで保存してください。`,
      );
      return;
    }

    const intentSearch = hasSearchIntent(text);
    if (intentSearch && !searchEnabled) {
      setError("「調べて」検索は Presence Pro で利用できます。プランタブへ。");
      return;
    }
    setError(null);
    setInput("");
    const wantSearch = intentSearch && searchEnabled;
    setSearching(wantSearch);

    const userMsg: ChatMessage = {
      id: newId("msg"),
      projectId: activeProjectId,
      role: "user",
      content: text,
      modelId,
      createdAt: Date.now(),
    };
    await addMessage(userMsg);
    const next = [...messages, userMsg];
    setMessages(next);

    const assistantId = newId("msg");
    const assistantMsg: ChatMessage = {
      id: assistantId,
      projectId: activeProjectId,
      role: "assistant",
      content: "",
      modelId,
      createdAt: Date.now(),
    };
    setMessages([...next, assistantMsg]);
    setStreaming(true);

    const system = composeSystemPrompt(
      BASE_SYSTEM,
      files.map((f) => ({ name: f.name, text: f.text })),
    );

    const controller = new AbortController();
    abortRef.current = controller;
    let assembled = "";

    try {
      await streamChat({
        modelId,
        apiKey,
        search: wantSearch,
        signal: controller.signal,
        messages: [
          { role: "system", content: system },
          ...next.map((m) => ({ role: m.role, content: m.content })),
        ],
        onSearching: setSearching,
        onDelta: (delta) => {
          assembled += delta;
          const cur = useAppStore.getState().messages;
          setMessages(
            cur.map((m) =>
              m.id === assistantId ? { ...m, content: assembled } : m,
            ),
          );
        },
      });
      await addMessage({
        ...assistantMsg,
        content: assembled || "（応答なし）",
      });
      const refreshed = await listMessages(activeProjectId);
      setMessages(refreshed);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
      setMessages(next);
    } finally {
      setStreaming(false);
      setSearching(false);
      abortRef.current = null;
    }
  }

  async function onClear() {
    await clearMessages(activeProjectId);
    setMessages([]);
  }

  if (!hydrated) {
    return <p className="p-6 text-mist">読み込み中…</p>;
  }

  const activeName =
    activeProjectId === null
      ? "雑談"
      : (projects.find((p) => p.id === activeProjectId)?.name ??
        "プロジェクト");

  return (
    <div className="flex h-full min-h-[calc(100dvh-5.5rem)] flex-col">
      <header className="sticky top-0 z-10 border-b border-line/60 bg-ink/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-display text-lg tracking-wide text-paper">
              {activeName}
            </p>
            <p className="text-xs text-mist">
              {searching
                ? "ウェブを検索中…"
                : files.length > 0
                  ? `資料 ${files.length} 件を参照中`
                  : "資料なし · 「調べて」でウェブ検索"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="min-h-10 rounded-lg px-3 text-xs text-mist hover:bg-panel hover:text-paper"
          >
            クリア
          </button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <select
            value={activeProjectId ?? ""}
            onChange={(e) => setActiveProjectId(e.target.value || null)}
            className="min-h-11 min-w-[8rem] flex-1 rounded-xl border border-line bg-panel px-3 text-sm text-paper"
            aria-label="プロジェクト"
          >
            <option value="">雑談（資料なし）</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value as typeof modelId)}
            className="min-h-11 min-w-[9rem] flex-1 rounded-xl border border-line bg-panel px-3 text-sm text-paper"
            aria-label="モデル"
          >
            {chatModels().map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line/80 bg-panel/40 p-5 text-sm text-mist">
            スマホから、自分の API
            クレジットで話せる会話室。「調べて」と言うとウェブ検索します。資料タブのファイルも根拠にできます。
          </div>
        )}
        {searching && (
          <div className="mr-6 rounded-2xl border border-signal/40 bg-signal/10 px-3.5 py-2 text-xs text-signal">
            検索しています…
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-8 rounded-2xl rounded-br-md bg-amber/15 px-3.5 py-2.5 text-sm leading-relaxed text-paper"
                : "mr-6 rounded-2xl rounded-bl-md bg-panel px-3.5 py-2.5 text-sm leading-relaxed text-paper"
            }
          >
            <p className="whitespace-pre-wrap">
              {m.content || (streaming ? "…" : "")}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mx-4 mb-2 rounded-xl bg-danger/15 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="border-t border-line/60 bg-fog/70 px-3 py-3 backdrop-blur-md">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            placeholder="メッセージを入力"
            className="max-h-36 min-h-12 flex-1 resize-none rounded-2xl border border-line bg-panel px-3.5 py-3 text-base text-paper placeholder:text-mist/70"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          {streaming ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="min-h-12 shrink-0 rounded-2xl bg-panel px-4 text-sm font-medium text-mist"
            >
              停止
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="min-h-12 shrink-0 rounded-2xl bg-amber px-4 text-sm font-semibold text-ink disabled:opacity-40"
            >
              送信
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
