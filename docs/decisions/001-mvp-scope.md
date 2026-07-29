# 001 — Presence MVP スコープ（スマホ＋Web）

日付: 2026-07-29

## 判定

案は採用。差別化は「自分の API クレジット（BYOK）× プロジェクト文脈 × 音声フルデュプレックス → 通話席への拡張」。  
プラットフォームは **スマホ優先の Web（PWA）** を MVP とし、ストア配布は後続。

## なぜスマホ＋Webか

- 会話・音声・ファイル参照はスマホが主戦場。Cursor の「会話版」は PC 専用に閉じない。
- Discord / Meet / Zoom 同席は別プロセス（bot / 拡張）。本体 UX は「手元の会話クライアント」が先。
- 既定スタック（Next.js + Vercel）でモバイル Web を最速公開できる。ネイティブ二重実装は着陸後。

## やること（MVP）

1. BYOK: OpenAI / xAI キーを端末ローカルに保存。サーバはキーを永続化しない薄いプロキシのみ。
2. テキスト会話: モデル切替 + SSE ストリーミング。
3. プロジェクト: ファイルを端末（IndexedDB）に保存し、会話コンテキストに載せる（NotebookLM 風）。
4. 音声三本柱: GPT Live / Gemini Live / Grok Voice（エンジン切替 UI）。
4b. 「調べて」検索: Voice は各社 tools、テキストは意図検知 → Responses API。
5. モバイル UX: ボトムナビ、大きなタップ領域、PWA マニフェスト、safe-area。
6. ロードマップ面: Discord / Meet / Zoom「同席」は説明と待ちリストのみ（実装は別フェーズ）。

## やらないこと（今は）

- 自前の課金・クレジット販売（課金は手動承認領域。MVP は BYOK のみ）
- ChatGPT / SuperGrok「サブスク本体」からの直接引き落とし（API キーとサブスクは別物。誤解を UI で明示）
- Flutter / ネイティブストア申請
- Discord bot / Meet・Zoom ボット本体
- サーバ側ユーザー DB・クラウド同期

## プラットフォーム段階

| 段階 | 中身 |
|---|---|
| MVP | モバイル優先 Web + PWA（ホーム画面追加） |
| v1.1 | Capacitor 等で iOS/Android ラッパー（必要なら） |
| v2 | Presence Bridge: Discord VC / Meet / Zoom への同席エージェント |

## 名称

**Presence** — ファイルの横に座り、やがて通話にも同席する AI。
