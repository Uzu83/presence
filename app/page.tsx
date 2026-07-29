import Image from "next/image";
import Link from "next/link";
import { BILLING_TAGLINE } from "@/lib/billing-copy";

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/presence-hero.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/35" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-10 pt-[max(3rem,env(safe-area-inset-top))]">
        <p className="animate-rise font-display text-5xl tracking-[0.04em] text-paper sm:text-6xl">
          Presence
        </p>
        <h1 className="animate-rise-delay mt-5 max-w-[16ch] text-2xl font-medium leading-snug text-paper sm:text-3xl">
          クレジットを買って、すぐ話す。
        </h1>
        <p className="animate-rise-delay mt-4 max-w-[34ch] text-base leading-relaxed text-mist">
          GPT Live · Gemini Live · Grok
          Voice。資料付き会話と「調べて」検索を、スマホから。
        </p>
        <p className="animate-rise-delay mt-3 max-w-[36ch] text-xs leading-relaxed text-mist/90">
          {BILLING_TAGLINE}
        </p>

        <div className="mt-auto flex flex-col gap-3 pt-16">
          <Link
            href="/app"
            className="flex min-h-14 items-center justify-center rounded-2xl bg-amber text-base font-semibold text-ink transition-transform active:scale-[0.98]"
          >
            会話をはじめる
          </Link>
          <Link
            href="/app/billing"
            className="flex min-h-12 items-center justify-center rounded-2xl border border-line/80 bg-fog/50 text-sm text-paper backdrop-blur-sm"
          >
            クレジットを買う
          </Link>
          <p className="text-center text-xs text-mist/80">
            ホーム画面に追加してアプリのように使えます
          </p>
          <p className="text-center text-xs text-mist/70">
            <Link
              href="/legal/terms"
              className="underline-offset-2 hover:underline"
            >
              利用規約
            </Link>
            {" · "}
            <Link
              href="/legal/privacy"
              className="underline-offset-2 hover:underline"
            >
              プライバシー
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
