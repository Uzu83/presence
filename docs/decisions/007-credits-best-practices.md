# 007 — Hosted クレジット: 世界のベストプラクティス整理と採用

日付: 2026-07-29  
地位: **実装指針**（法律意見ではない。公開前に専門家確認）  
関連: [004](./004-hosted-ux-north-star.md) Hosted UX · [006](./006-shikin-kessai-prepaid.md) 資金決済メモ

## 1. 調査範囲（信頼できる情報源）

| 領域 | 一次 / 準一次ソース |
|---|---|
| 日本・前払式 | [資金決済法（Japanese Law Translation）](https://www.japaneselawtranslation.go.jp/en/laws/view/3965) 第3・4・5・13条 / [施行令](https://www.japaneselawtranslation.go.jp/en/laws/view/4316/en)（6か月=政令） / [金融庁 FAQ（FinTech Support Desk）](https://www.fsa.go.jp/en/news/2018/20180717.html) / [事務ガイドライン英訳 PDF](https://www.fsa.go.jp/common/law/guide/kaisya/e05.pdf) / [日本資金決済業協会 概要・チャート](https://www.s-kessai.jp/businesses/prepaid/prepaid_means_overview/) · [FAQ](https://www.s-kessai.jp/businesses/prepaid/q_and_a/) / [関東財務局](https://lfb.mof.go.jp/kantou/kinyuu/pagekthp00400036.html) |
| EU・電子マネ一 | [Directive 2009/110/EC (E-Money)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32009L0110) · limited network / small issuer waiver の整理 |
| 課金プロダクト | [Stripe Billing credits](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits)（Credit Grant・immutable ledger・priority / expires_at）· [Stripe blog 2025-02](https://stripe.com/blog/introducing-credits-for-usage-based-billing) |
| AI 従量の運用 | [OpenAI prepaid billing Help](https://help.openai.com/en/articles/8264644-what-is-prepaid-billing) · [OpenAI spend limits](https://developers.openai.com/api/docs/guides/spend-limits)（hard stop・遅延超過の明示） |
| 台帳設計（業界慣行） | append-only / idempotency / integer minor units / PCI スコープ最小化（カードは PSP に閉じる）。二次解説は参考に留め、Presence では Stripe Checkout でカード非保持を維持 |

弁護士ブログ・行政書士解説は **補助**。規約文言の最終判断は専門家。

## 2. 横断ベストプラクティス（要約）

### A. 規制設計（JP 中心、Presence は日本向け）

1. **発行日から 6 か月以内のみ使用可能** → 資金決済法 **第4条の適用除外**になりうる（FSA FAQ・協会チャート質問2・施行令で「6か月」）。  
2. **自社役務のみ** → 自家型寄り。第三者でも使えると第三者型（事前登録）。Stripe もクレジットを第三者決済・ギフトカード化することを禁止。  
3. **対価あり購入分だけが前払式論点**。無償プロモは対価性なしで非該当になりやすいが、**区分表示・区分管理**がないと有償に合算されうる（協会 FAQ）。  
4. 除外を取らない場合でも、基準日（3/31・9/30）**未使用残高 ≤ 1,000 万円**なら自家型の届出トリガに達しない。  
5. 届出後は情報提供（名称・残高・期限・窓口等）と発行保証金（残高の 1/2 等）が論点。

### B. EU 対比（将来展開メモ）

- E-Money Directive: **limited network**（限られた加盟店・用途）は適用外になりうる。自社アプリ内のみは closed-loop に近い。  
- Small issuer waiver（加盟国オプション）は平均残高・取引額の上限つき。  
- Presence 現状は JP 第一。EU 居住者への勧誘は別ゲート。

### C. プロダクト / 台帳（Stripe・OpenAI・fintech 慣行）

| 慣行 | 内容 |
|---|---|
| Credit Grant / ロット | 購入・プロモを **ロット単位**で発行。`expires_at` 必須（JP 除外のため） |
| 消費順 | Stripe: priority → 早い失効 → promotional → 古い created。Presence 採用: **priority → FEFO（失効が早い順）→ created** |
| 台帳 | append-only 取引ログ + 導出残高。idempotency key で二重加算防止 |
| Hard stop | 残高ゼロで拒否（OpenAI `insufficient_quota` 型）。メータ遅延でわずかなオーバーランがありうることを開示 |
| Spend caps | セッション / 日次 /（任意）ウォレット上限・運営月次予算 |
| PCI | カードデータは Stripe Checkout のみ。自前保存しない |
| 表現 | 「現金預かり」「送金」「他社でも使える電子マネー」を避ける。役務対価のクレジットと明示 |
| 返金 | 原則不可を規約に（法令例外）。OpenAI も purchased credits non-refundable を明記 |

## 3. Presence への採用（この実装）

| 項目 | 採用 |
|---|---|
| 購入クレジット有効期限 | **発行から 6 か月未満**（UTC で +6 months − 1s）。規約・UI 同文 |
| プロモ grant | 別ロット・短い期限（既定 14 日）・priority 高め（先に消費）・outstanding 集計から除外 |
| 消費 | FEFO + priority。サーバメータが正。クライアント自己申告は信じない |
| 表示 | 残高・次の失効・利用範囲・返金・非現金・問い合わせプレースホルダ |
| ハード上限 | セッション分 / 日次デビット / ウォレット残高上限 / 未使用合計モニタ |
| Stripe | 引き続き one-time Checkout でパック販売（カード非保持）。将来 Meter+Credit Grant へ寄せる余地は残す |
| 弁護士ゲート | 006 と同じ。適用除外の最終確認は公開前 |

## 4. 意図的にやらないこと（今）

- Stripe Billing Meters + Credit Grant への全面移行（サブスク従量の前提が強く、現 Hosted Live メータと二重化するため Phase 後）  
- 利息・残高に応じたボーナス（電子マネ一規制・貯蓄性の示唆を避ける）  
- 譲渡・換金・他社ポイント交換  
- EU passport / EMI ライセンス取得

## 5. 採用

Presence Hosted クレジットは **「6 か月以内失効の自家型・役務限定ロット台帳」** を世界のベストプラクティス最小セットとして実装する。
