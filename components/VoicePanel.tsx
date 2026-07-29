"use client";

import { useEffect, useRef, useState } from "react";
import { loadKeys } from "@/lib/keys";
import {
  getLiveEngine,
  LIVE_ENGINES,
  type LiveEngineId,
} from "@/lib/voice/engines";
import {
  arrayBufferToBase64,
  floatTo16BitPCM,
  PcmPlayer,
} from "@/lib/voice-audio";

type Phase = "idle" | "connecting" | "live" | "error";

type EphemeralResponse = {
  value?: string;
  client_secret?: { value?: string };
};

function extractSecret(data: EphemeralResponse): string | null {
  return data.value ?? data.client_secret?.value ?? null;
}

function stopTracks(stream: MediaStream | null) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

function isSearchEvent(type: string): boolean {
  return (
    type.includes("web_search") ||
    type.includes("web_search_call") ||
    type.includes("server_side_tool") ||
    type.includes("googleSearch") ||
    type.includes("grounding")
  );
}

export function VoicePanel() {
  const [engineId, setEngineId] = useState<LiveEngineId>("grok-voice");
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState(
    "GPT Live / Gemini Live / Grok Voice。選んで話す。",
  );
  const [searching, setSearching] = useState(false);
  const [ready, setReady] = useState({
    openai: false,
    xai: false,
    google: false,
  });
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playerRef = useRef<PcmPlayer | null>(null);

  const engine = getLiveEngine(engineId);

  useEffect(() => {
    const keys = loadKeys();
    setReady({
      openai: Boolean(keys.openai),
      xai: Boolean(keys.xai),
      google: Boolean(keys.google),
    });
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      processorRef.current?.disconnect();
      processorRef.current = null;
      stopTracks(mediaRef.current);
      mediaRef.current = null;
      void ctxRef.current?.close().catch(() => undefined);
      ctxRef.current = null;
      void playerRef.current?.close().catch(() => undefined);
      playerRef.current = null;
    };
  }, []);

  async function teardown() {
    wsRef.current?.close();
    wsRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    stopTracks(mediaRef.current);
    mediaRef.current = null;
    if (ctxRef.current) {
      await ctxRef.current.close().catch(() => undefined);
      ctxRef.current = null;
    }
    if (playerRef.current) {
      await playerRef.current.close().catch(() => undefined);
      playerRef.current = null;
    }
  }

  function wireMic(
    stream: MediaStream,
    inputRate: number,
    onPcm: (b64: string) => void,
  ) {
    const audioCtx = new AudioContext({ sampleRate: inputRate });
    ctxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    processor.onaudioprocess = (e) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      onPcm(arrayBufferToBase64(floatTo16BitPCM(input)));
    };
    const mute = audioCtx.createGain();
    mute.gain.value = 0;
    source.connect(processor);
    processor.connect(mute);
    mute.connect(audioCtx.destination);
  }

  async function startOpenai() {
    const key = loadKeys().openai;
    if (!key) throw new Error("設定タブで OpenAI API キーを保存してください。");

    setLog("OpenAI ephemeral token を発行中…");
    const tokenRes = await fetch("/api/voice/ephemeral", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Presence-Engine": "gpt-live",
      },
    });
    if (!tokenRes.ok) {
      throw new Error((await tokenRes.text()) || "token 発行に失敗");
    }
    const secret = extractSecret((await tokenRes.json()) as EphemeralResponse);
    if (!secret) throw new Error("ephemeral token が応答にありません");

    const meta = await fetch("/api/voice/session?engine=gpt-live").then((r) =>
      r.json(),
    );
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    });
    mediaRef.current = stream;

    const ws = new WebSocket(meta.endpoint as string, [
      "realtime",
      `openai-insecure-api-key.${secret}`,
    ]);
    wsRef.current = ws;

    const player = new PcmPlayer(engine.outputRate);
    playerRef.current = player;
    await player.resume();

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("GPT Live 接続エラー"));
      window.setTimeout(() => reject(new Error("接続タイムアウト")), 12_000);
    });

    ws.send(JSON.stringify(meta.sessionUpdate));

    ws.onmessage = (ev) => {
      try {
        const event = JSON.parse(String(ev.data)) as {
          type?: string;
          delta?: string;
        };
        const type = event.type ?? "";
        if (isSearchEvent(type)) {
          const done = type.endsWith(".completed") || type.endsWith(".done");
          setSearching(!done);
          setLog(done ? "検索結果をまとめています…" : "ウェブを検索中…");
        }
        if (
          type === "response.output_audio.delta" ||
          type === "response.audio.delta"
        ) {
          if (event.delta) player.playPcm16(event.delta);
          setSearching(false);
        }
        if (type === "response.done" || type === "response.completed") {
          setSearching(false);
          setLog("聞いています（GPT Live）。");
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setPhase("idle");
      setSearching(false);
      setLog("接続が閉じました。");
      void teardown();
    };

    wireMic(stream, engine.inputRate, (audio) => {
      ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio }));
    });
  }

  async function startGemini() {
    const key = loadKeys().google;
    if (!key) throw new Error("設定タブで Google API キーを保存してください。");

    setLog("Gemini Live に接続中…");
    const meta = await fetch("/api/voice/session?engine=gemini-live").then(
      (r) => r.json(),
    );
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    });
    mediaRef.current = stream;

    // WHY query key: ブラウザ WS は Authorization 不可。BYOK の妥協。将来 ephemeral。
    const endpoint = `${meta.endpoint as string}?key=${encodeURIComponent(key)}`;
    const ws = new WebSocket(endpoint);
    wsRef.current = ws;

    const player = new PcmPlayer(engine.outputRate);
    playerRef.current = player;
    await player.resume();

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Gemini Live 接続エラー"));
      window.setTimeout(() => reject(new Error("接続タイムアウト")), 12_000);
    });

    ws.send(JSON.stringify(meta.setup));

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as {
          setupComplete?: unknown;
          toolCall?: unknown;
          serverContent?: {
            modelTurn?: {
              parts?: Array<{
                inlineData?: { mimeType?: string; data?: string };
                text?: string;
              }>;
            };
            groundingMetadata?: unknown;
          };
        };
        if (msg.toolCall || msg.serverContent?.groundingMetadata) {
          setSearching(true);
          setLog("ウェブを検索中…");
        }
        const parts = msg.serverContent?.modelTurn?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            player.playPcm16(part.inlineData.data);
            setSearching(false);
            setLog("聞いています（Gemini Live）。");
          }
        }
        if (msg.setupComplete) {
          setLog("聞いています。「調べて」で検索できます。");
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setPhase("idle");
      setSearching(false);
      setLog("接続が閉じました。");
      void teardown();
    };

    wireMic(stream, engine.inputRate, (data) => {
      ws.send(
        JSON.stringify({
          realtimeInput: {
            audio: {
              mimeType: `audio/pcm;rate=${engine.inputRate}`,
              data,
            },
          },
        }),
      );
    });
  }

  async function startGrok() {
    const key = loadKeys().xai;
    if (!key) throw new Error("設定タブで xAI API キーを保存してください。");

    setLog("xAI ephemeral token を発行中…");
    const tokenRes = await fetch("/api/voice/ephemeral", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Presence-Engine": "grok-voice",
      },
    });
    if (!tokenRes.ok) {
      throw new Error((await tokenRes.text()) || "token 発行に失敗");
    }
    const secret = extractSecret((await tokenRes.json()) as EphemeralResponse);
    if (!secret) throw new Error("ephemeral token が応答にありません");

    const meta = await fetch("/api/voice/session?engine=grok-voice").then((r) =>
      r.json(),
    );
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    });
    mediaRef.current = stream;

    const ws = new WebSocket(meta.endpoint as string, [
      `xai-client-secret.${secret}`,
    ]);
    wsRef.current = ws;

    const player = new PcmPlayer(engine.outputRate);
    playerRef.current = player;
    await player.resume();

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Grok Voice 接続エラー"));
      window.setTimeout(() => reject(new Error("接続タイムアウト")), 12_000);
    });

    ws.send(JSON.stringify(meta.sessionUpdate));

    ws.onmessage = (ev) => {
      try {
        const event = JSON.parse(String(ev.data)) as {
          type?: string;
          delta?: string;
        };
        const type = event.type ?? "";
        if (isSearchEvent(type)) {
          const done = type.endsWith(".completed") || type.endsWith(".done");
          setSearching(!done);
          setLog(done ? "検索結果をまとめています…" : "ウェブを検索中…");
        }
        if (
          type === "response.output_audio.delta" ||
          type === "response.audio.delta"
        ) {
          if (event.delta) player.playPcm16(event.delta);
          setSearching(false);
        }
        if (type === "response.done" || type === "response.completed") {
          setSearching(false);
          setLog("聞いています（Grok Voice）。");
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setPhase("idle");
      setSearching(false);
      setLog("接続が閉じました。");
      void teardown();
    };

    wireMic(stream, engine.inputRate, (audio) => {
      ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio }));
    });
  }

  async function start() {
    setPhase("connecting");
    setSearching(false);
    try {
      if (engineId === "gpt-live") await startOpenai();
      else if (engineId === "gemini-live") await startGemini();
      else await startGrok();
      setPhase("live");
      setLog(`聞いています（${engine.label}）。「調べて」で検索。`);
    } catch (e) {
      setPhase("error");
      setSearching(false);
      setLog((e as Error).message);
      await teardown();
    }
  }

  async function stop() {
    await teardown();
    setPhase("idle");
    setSearching(false);
    setLog("停止しました。");
  }

  const keyOk =
    engine.provider === "openai"
      ? ready.openai
      : engine.provider === "google"
        ? ready.google
        : ready.xai;

  return (
    <div className="flex min-h-[calc(100dvh-5.5rem)] flex-col px-4 py-5">
      <h1 className="font-display text-2xl tracking-wide">音声</h1>
      <p className="mt-1 text-sm text-mist">
        GPT Live · Gemini Live · Grok Voice。自分のキーでフルデュプレックス。
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {LIVE_ENGINES.map((e) => {
          const selected = e.id === engineId;
          const has =
            e.provider === "openai"
              ? ready.openai
              : e.provider === "google"
                ? ready.google
                : ready.xai;
          return (
            <button
              key={e.id}
              type="button"
              disabled={phase === "live" || phase === "connecting"}
              onClick={() => setEngineId(e.id)}
              className={`min-h-16 rounded-xl border px-2 py-2 text-left transition-colors disabled:opacity-50 ${
                selected
                  ? "border-amber/60 bg-amber/15 text-paper"
                  : "border-line bg-panel/50 text-mist"
              }`}
            >
              <span className="block text-xs font-semibold text-paper">
                {e.label}
              </span>
              <span className="mt-0.5 block text-[10px] leading-tight opacity-80">
                {has ? e.hint : "キー未設定"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-10 flex flex-1 flex-col items-center justify-center">
        <button
          type="button"
          onClick={() =>
            void (phase === "live" || phase === "connecting" ? stop() : start())
          }
          className={`flex h-36 w-36 items-center justify-center rounded-full border-2 text-lg font-semibold transition-transform active:scale-95 ${
            searching
              ? "animate-mic border-signal bg-signal/20 text-signal"
              : phase === "live"
                ? "animate-mic border-amber bg-amber text-ink"
                : phase === "connecting"
                  ? "border-signal/60 bg-panel text-signal"
                  : "border-line bg-panel text-paper"
          }`}
        >
          {searching
            ? "検索中"
            : phase === "live"
              ? "終了"
              : phase === "connecting"
                ? "接続中"
                : "話す"}
        </button>
        <p className="mt-6 max-w-sm text-center text-sm leading-relaxed text-mist">
          {log}
        </p>
        {!keyOk && (
          <p className="mt-3 text-xs text-amber">
            {engine.label} のキー未設定 · 設定タブへ
          </p>
        )}
      </div>

      <div className="mt-auto rounded-2xl border border-line bg-panel/40 px-4 py-3 text-xs leading-relaxed text-mist">
        三本柱 GO。検索は各社のツール（OpenAI / Google Search / xAI
        web_search）。このパイプの先が Discord / Meet / Zoom 同席。
      </div>
    </div>
  );
}
