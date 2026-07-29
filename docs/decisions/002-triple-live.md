# 002 — Live 三本柱（GPT / Gemini / Grok）

日付: 2026-07-29

## 判定

音声の北は **GPT Live × Gemini Live × Grok Voice**。単一ベンダーのデモではなく、切替可能な会話クライアント。

## 接続方式

| エンジン | 認証 | 備考 |
|---|---|---|
| GPT Live | `/v1/realtime/client_secrets` → `openai-insecure-api-key.` protocol | モデル `gpt-realtime-mini` |
| Gemini Live | WS `?key=`（BYOK 妥協） | 入力 16kHz / 出力 24kHz、`googleSearch` tool |
| Grok Voice | `/v1/realtime/client_secrets` → `xai-client-secret.` protocol | 既存 |

## やらない（今）

- Gemini テキストチャット
- WebRTC 経路（OpenAI 推奨だが実装コスト大。WS で揃える）
- Google ephemeral token（次で鍵を URL から消す）
