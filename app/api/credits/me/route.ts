import { ensureWallet } from "@/lib/credits/ensure-wallet";
import { getBalance, getDailyDebit, ledgerBackend } from "@/lib/credits/ledger";
import {
  hostedEnginesAvailable,
  hostedOpsConfigured,
} from "@/lib/credits/ops-keys";
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
    hostedAvailable: ops,
    hostedEngines: engines,
    ratesPerMinute: HOSTED_CREDITS_PER_MINUTE,
    maxSessionMinutes: HOSTED_MAX_SESSION_MINUTES,
    packs,
    stripeConfigured:
      stripeConfigured() || packs.some((p) => p.priceConfigured),
    ledgerBackend: ledgerBackend(),
    disclosures: {
      scope: "クレジットは Presence の音声・テキスト役務にのみ使用できます。",
      expiry: "購入クレジットの有効期限は購入日から 180 日です（規約参照）。",
      refund: "原則として返金できません（法令に基づく場合を除く）。",
      notCash: "現金の預かり・送金ではありません。",
    },
  });
}
