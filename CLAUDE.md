<!-- notion-page: TODO-notion-create -->
<!-- dev-secure-profile: standard -->
<!-- vercel: https://presence-mauve.vercel.app -->

# Presence

## これは何か（3行以内）

- **何を**: 自分の API クレジット（BYOK）で GPT Live / Gemini Live / Grok Voice と話し、資料プロジェクトまで持つスマホ Web
- **誰に**: 複数モデルを使い分けたい個人・小さなチーム
- **なぜ**: ベンダー単体 UI でも IDE でもない「会話クライアント」が必要。通話同席はその延長

## スタック / コマンド

| 項目 | 値 |
|---|---|
| スタック | Next.js 16 (App Router) + TypeScript + Tailwind + Zustand + Vitest + Biome |
| 開発 | `pnpm dev` |
| 検証 | `pnpm check`（lint → tsc → test → build） |
| デプロイ | `vercel`（preview）→ `vercel --prod` |
| Pro 課金 | Stripe: `STRIPE_*` + `PRESENCE_SESSION_SECRET`（`.env.example`）。BYOK 維持 |

## アーキテクチャの要点

- BYOK: キーは localStorage。`/api/chat` と `/api/voice/ephemeral` は都度ヘッダ転送のみ（永続化禁止）
- プロジェクト/会話: IndexedDB（端末ローカル）。クラウド同期はまだやらない
- Voice 三本柱: GPT Live (OpenAI Realtime) / Gemini Live / Grok Voice
- **UX 北極星（004）**: 運営キー＋ユーザはクレジット/サブスクだけ（BYOK は上級者用）。課金実装は人間承認後
- Voice 認証（現状）: OpenAI・xAI は ephemeral、Gemini は query `key=` → Hosted 化時に鍵をクライアントから消す
- 「調べて」系: Voice は各社 tools、テキストは `hasSearchIntent` → Responses API + web_search
- Discord / Meet / Zoom 同席はロードマップ。同じ音声パイプの延長として設計する

## 地雷マップ

| 場所 | 触る前に知るべきこと |
|---|---|
| ブラウザ WebSocket | `Authorization` ヘッダ不可。xAI は `sec-websocket-protocol: xai-client-secret.<token>` |
| ChatGPT Plus / SuperGrok | サブスク ≠ API クレジット。UI で混同させない |
| `ScriptProcessorNode` | Voice MVP の妥協。AudioWorklet へ置換予定 |

## セキュリティ敏感領域

| 領域 | パス | 変更時ゲート |
|---|---|---|
| キー取扱 | `lib/keys.ts` `app/api/**` | review-post + 人間確認 |
| 秘密情報 | `.env*` | AI は読まない・書かない |

## テスト方針

- コンテキスト組立・モデル定義・PCM 変換を厚く
- 既存 assertion 変更禁止、失敗系を最低1本
