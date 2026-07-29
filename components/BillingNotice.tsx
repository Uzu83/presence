import { BILLING_TAGLINE, BILLING_VOICE_WARNING } from "@/lib/billing-copy";

type Props = {
  variant?: "default" | "voice";
};

export function BillingNotice({ variant = "default" }: Props) {
  return (
    <div className="rounded-2xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm leading-relaxed text-paper">
      <p>{BILLING_TAGLINE}</p>
      {variant === "voice" && (
        <p className="mt-2 text-xs text-mist">{BILLING_VOICE_WARNING}</p>
      )}
    </div>
  );
}
