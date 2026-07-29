"use client";

import { useEffect, useRef, useState } from "react";
import { loadKeys } from "@/lib/keys";
import {
  arrayBufferToBase64,
  floatTo16BitPCM,
  PcmPlayer,
  VOICE_SAMPLE_RATE,
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
    type.includes("server_side_tool")
  );
}

export function VoicePanel() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState(
    "ボタンを押して話す。「調べて」でウェブ検索します。",
  );
  const [searching, setSearching] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playerRef = useRef<PcmPlayer | null>(null);

  useEffect(() => {
    setHasKey(Boolean(loadKeys().xai));
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

  async function start() {
    const key = loadKeys().xai;
    if (!key) {
      setPhase("error");
      setLog("設定タブで xAI API キーを保存してください。");
      return;
    }

    setPhase("connecting");
    setLog("ephemeral token を発行中…");

    try {
      const tokenRes = await fetch("/api/voice/ephemeral", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!tokenRes.ok) {
        throw new Error((await tokenRes.text()) || "token 発行に失敗");
      }
      const tokenJson = (await tokenRes.json()) as EphemeralResponse;
      const secret = extractSecret(tokenJson);
      if (!secret) throw new Error("ephemeral token が応答にありません");

      const meta = await fetch("/api/voice/session").then((r) => r.json());
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
      mediaRef.current = stream;

      // ブラウザは Authorization 不可 → sec-websocket-protocol で渡す（xAI 公式）
      const ws = new WebSocket(meta.endpoint as string, [
        `xai-client-secret.${secret}`,
      ]);
      wsRef.current = ws;

      const player = new PcmPlayer(VOICE_SAMPLE_RATE);
      playerRef.current = player;
      await player.resume();

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error("WebSocket 接続エラー"));
        window.setTimeout(() => reject(new Error("接続タイムアウト")), 12_000);
      });

      ws.send(JSON.stringify(meta.sessionUpdate));

      ws.onmessage = (ev) => {
        try {
          const event = JSON.parse(String(ev.data)) as {
            type?: string;
            delta?: string;
            name?: string;
          };
          const type = event.type ?? "";
          if (isSearchEvent(type)) {
            const done =
              type.endsWith(".completed") ||
              type.endsWith(".done") ||
              type.includes("finished");
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
            setLog("聞いています。「調べて」で検索できます。");
          }
        } catch {
          // ignore non-json
        }
      };

      ws.onclose = () => {
        setPhase("idle");
        setSearching(false);
        setLog("接続が閉じました。");
        void teardown();
      };

      const audioCtx = new AudioContext({ sampleRate: VOICE_SAMPLE_RATE });
      ctxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      // ScriptProcessor は非推奨だが MVP では依存ゼロで動く。AudioWorklet は後続。
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm = floatTo16BitPCM(input);
        ws.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: arrayBufferToBase64(pcm),
          }),
        );
      };
      // ScriptProcessor はグラフに繋がっていないと発火しないブラウザがある。
      // マイクをスピーカーに戻すとハウるので gain=0 で捨てる。
      const mute = audioCtx.createGain();
      mute.gain.value = 0;
      source.connect(processor);
      processor.connect(mute);
      mute.connect(audioCtx.destination);

      setPhase("live");
      setSearching(false);
      setLog("聞いています。「調べて」と言うと検索します（割り込み可）。");
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

  return (
    <div className="flex min-h-[calc(100dvh-5.5rem)] flex-col px-4 py-5">
      <h1 className="font-display text-2xl tracking-wide">音声</h1>
      <p className="mt-1 text-sm text-mist">
        Grok Voice フルデュプレックス。「調べて」「検索して」でウェブ検索。
      </p>

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
        {!hasKey && (
          <p className="mt-3 text-xs text-amber">xAI キー未設定 · 設定タブへ</p>
        )}
      </div>

      <div className="mt-auto rounded-2xl border border-line bg-panel/40 px-4 py-3 text-xs leading-relaxed text-mist">
        検索は xAI の
        web_search（サーバ側）。聞きながら「それ調べて」と言うだけで動きます。
      </div>
    </div>
  );
}
