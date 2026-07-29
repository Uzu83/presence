import { ensureWallet } from "@/lib/credits/ensure-wallet";
import {
  getBalance,
  getDailyDebit,
  ledgerBackend,
  listActiveLots,
  nextExpiryIso,
} from "@/lib/credits/ledger";
import {
  hostedEnginesAvailable,
  hostedOpsConfigured,
} from "@/lib/credits/ops-keys";
import { CREDIT_DISCLOSURES } from "@/lib/credits/policy";
import {
  HOSTED_CREDITS_PER_MINUTE,
  HOSTED_MAX_SESSION_MINUTES,
} from "@/lib/credits/rates";
import { CREDIT_PACKS } from "@/lib/credits/types";
import { stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  const wallet = await ensureWallet();
  const balance = await getBalance(wallet.wid);
  const dailyDebit = await getDailyDebit(wallet.wid);
  const nextExpiry = await nextExpiryIso(wallet.wid);
  const lots = await listActiveLots(wallet.wid);
  const ops = hostedOpsConfigured();
  const engines = hostedEnginesAvailable();

  const packs = CREDIT_PACKS.map((p) => ({
    id: p.id,
    label: p.label,
    yen: p.yen,
    credits: p.credits,
    priceConfigured: Boolean(process.env[p.priceEnv]?.trim()),
  }));

  return Response.json({
    wid: wallet.wid,
    balance,
    dailyDebit,
    nextExpiry,
    lots: lots.map((l) => ({
      id: l.id,
      kind: l.kind,
      remaining: l.remaining,
      expiresAt: l.expiresAt,
      priority: l.priority,
    })),
    hostedAvailable: ops,
    hostedEngines: engines,
    ratesPerMinute: HOSTED_CREDITS_PER_MINUTE,
    maxSessionMinutes: HOSTED_MAX_SESSION_MINUTES,
    packs,
    stripeConfigured:
      stripeConfigured() || packs.some((p) => p.priceConfigured),
    ledgerBackend: ledgerBackend(),
    disclosures: {
      issuerName: CREDIT_DISCLOSURES.issuerName,
      scope: CREDIT_DISCLOSURES.scope,
      expiry: CREDIT_DISCLOSURES.expiry,
      refund: CREDIT_DISCLOSURES.refund,
      notCash: CREDIT_DISCLOSURES.notCash,
      contact: CREDIT_DISCLOSURES.contactPlaceholder,
      meterNote: CREDIT_DISCLOSURES.meterNote,
    },
  });
}
