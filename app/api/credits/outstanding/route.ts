import { getOutstandingCredits, ledgerBackend } from "@/lib/credits/ledger";
import { OUTSTANDING_WARN_YEN } from "@/lib/credits/policy";

export const runtime = "nodejs";

/**
 * 有償ロットの未使用残高合計（自家型 1,000 万円警戒用）。
 * 簡易保護: PRESENCE_ADMIN_SECRET or CRON_SECRET。
 */
export async function GET(req: Request) {
  const secret =
    process.env.PRESENCE_ADMIN_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const outstanding = await getOutstandingCredits();
  const yenApprox = outstanding;

  return Response.json({
    outstandingCredits: outstanding,
    yenApprox,
    warn: yenApprox >= OUTSTANDING_WARN_YEN,
    ledgerBackend: ledgerBackend(),
    note: "有償ロットのみ。プロモ grant は含まない。法律意見ではない。",
  });
}
