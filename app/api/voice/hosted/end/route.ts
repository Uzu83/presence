import { ensureWallet } from "@/lib/credits/ensure-wallet";
import { getHostedSession } from "@/lib/credits/ledger";
import { endSession } from "@/lib/credits/meter";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let sid = "";
  try {
    const body = (await req.json()) as { sid?: string };
    sid = body.sid ?? "";
  } catch {
    return Response.json({ error: "sid required" }, { status: 400 });
  }
  if (!sid) {
    return Response.json({ error: "sid required" }, { status: 400 });
  }

  const wallet = await ensureWallet();
  const sess = await getHostedSession(sid);
  if (!sess || sess.wid !== wallet.wid) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }

  const result = await endSession(sid);
  return Response.json(result);
}
