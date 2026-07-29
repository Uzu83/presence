import Link from "next/link";
import { BILLING_TAGLINE, BILLING_VOICE_WARNING } from "@/lib/billing-copy";
import { PRO_PRICE_LABEL } from "@/lib/entitlements";

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-10 text-paper">
      <p className="font-display text-3xl">Terms</p>
      <p className="mt-4 text-sm leading-relaxed text-mist">
        {BILLING_TAGLINE}
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-sm leading-relaxed text-mist">
        <li>
          無料枠では Live エンジン・資料・検索に制限があります。Presence Pro（
          {PRO_PRICE_LABEL}
          ）で三本柱などを利用できます。
        </li>
        <li>{BILLING_VOICE_WARNING}</li>
        <li>
          「話し放題」「Plus と同じ枠で無料」といった表現は行いません。API
          従量は各社の請求です。
        </li>
        <li>実験的サービスです。予告なく機能変更・停止することがあります。</li>
        <li>違法・加害目的の利用を禁止します。</li>
      </ul>
      <Link href="/" className="mt-10 inline-block text-sm text-amber">
        ← Presence
      </Link>
    </main>
  );
}
