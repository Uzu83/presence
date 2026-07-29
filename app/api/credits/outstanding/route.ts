import { getOutstandingCredits, ledgerBackend } from "@/lib/credits/ledger";

export const runtime = "nodejs";

/**
 * 未使用残高合計（自家型前払式の 1,000 万円警戒用モニタ）。
 * 簡易保護: CRON_SECRET or PRESENCE_ADMIN_SECRET。
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
  const yenApprox = outstanding; // 1 credit ≒ ¥1 の仮置き
  const warnThresholdYen = 8_000_000; // 届出目安の手前で警告

  return Response.json({
    outstandingCredits: outstanding,
    yenApprox,
    warn: yenApprox >= warnThresholdYen,
    ledgerBackend: ledgerBackend(),
    note: "法律意見ではない。基準日未使用残高のモニタ用。",
  });
}
