import Link from "next/link";
import { BILLING_KEYS_HINT, BILLING_TAGLINE } from "@/lib/billing-copy";

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-10 text-paper">
      <p className="font-display text-3xl">Privacy</p>
      <p className="mt-4 text-sm leading-relaxed text-mist">
        {BILLING_TAGLINE}
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-sm leading-relaxed text-mist">
        <li>{BILLING_KEYS_HINT}</li>
        <li>
          プロジェクト・会話・ファイルは端末内（IndexedDB）に保存します。クラウド同期はまだありません。
        </li>
        <li>
          会話内容は選んだ AI プロバイダ（OpenAI / Google /
          xAI）に送信されます。各社のポリシーも確認してください。
        </li>
        <li>
          Presence Pro を契約する場合、支払い情報は Stripe
          が処理します。カード番号は Presence サーバに保存しません。
        </li>
      </ul>
      <Link href="/" className="mt-10 inline-block text-sm text-amber">
        ← Presence
      </Link>
    </main>
  );
}
