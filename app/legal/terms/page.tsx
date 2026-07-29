import Link from "next/link";
import {
  BILLING_CREDITS_HINT,
  BILLING_TAGLINE,
  BILLING_VOICE_WARNING,
} from "@/lib/billing-copy";
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
          Hosted クレジットは Presence
          の音声・テキスト役務の対価です。現金の預かり・送金ではありません。
        </li>
        <li>{BILLING_CREDITS_HINT}</li>
        <li>
          購入クレジットの有効期限は購入日から 180
          日です。原則として返金できません（法令に基づく場合を除く）。
        </li>
        <li>{BILLING_VOICE_WARNING}</li>
        <li>
          上級者向けに自分の API キー（BYOK）も利用できます。Presence Pro（
          {PRO_PRICE_LABEL}
          ）は BYOK での三本柱解禁の対価です。BYOK 時の API
          従量は各社の請求です。
        </li>
        <li>「話し放題」「Plus と同じ枠で無料」といった表現は行いません。</li>
        <li>実験的サービスです。予告なく機能変更・停止することがあります。</li>
        <li>違法・加害目的の利用を禁止します。</li>
        <li>
          資金決済法その他の法令への適合は、公開拡大前に専門家の確認を経ます。本規約は法律意見ではありません。
        </li>
      </ul>
      <Link href="/" className="mt-10 inline-block text-sm text-amber">
        ← Presence
      </Link>
    </main>
  );
}
