# Presence

自分の API クレジットで話す、スマホ優先の Web / PWA。

- **GPT Live · Gemini Live · Grok Voice**（三本柱）
- テキストも OpenAI / xAI 切替
- プロジェクトにファイルを置いて会話（NotebookLM 風）
- 「調べて」でウェブ検索
- 将来: Discord / Meet / Zoom 同席

## 開発

```bash
pnpm install
pnpm dev
```

検証:

```bash
pnpm check
```

## 使い方

1. 設定で OpenAI / Google / xAI の API キーを保存（端末のみ・BYOK）
2. 資料タブでプロジェクトとテキストファイルを追加
3. 会話 / 音声タブ。Free は Live=Grok のみ・検索は Pro
4. プランタブで Presence Pro（Stripe）— API 従量は各社請求のまま

## Stripe（Pro）

`.env.example` を参照。`STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` / `PRESENCE_SESSION_SECRET`。  
ローカル検証は `PRESENCE_DEV_PRO=1` で Pro 相当にできる。

## ドキュメント

- 実機 QA: `docs/progress/device-qa.md`
- 課金・公開: `docs/decisions/003-*.md` / `004-*.md`
- 成長レバー: `docs/decisions/005-growth-levers.md`

## ライセンス

Private / TBD
