import { ensureWallet } from "@/lib/credits/ensure-wallet";
import { assertCanStartHosted, openMeteredSession } from "@/lib/credits/meter";
import { mintHostedEphemeral } from "@/lib/credits/mint-hosted";
import { getLiveEngine, type LiveEngineId } from "@/lib/voice/engines";

export const runtime = "nodejs";

/**
 * Hosted Live 開始: 残高チェック → セッション台帳 → 運営キーで ephemeral。
 */
export async function POST(req: Request) {
  let engineId: LiveEngineId = "grok-voice";
  try {
    const body = (await req.json()) as { engine?: string };
    if (body.engine) engineId = body.engine as LiveEngineId;
  } catch {
    // default
  }

  try {
    getLiveEngine(engineId);
  } catch {
    return Response.json({ error: "unknown engine" }, { status: 400 });
  }

  const wallet = await ensureWallet();
  const gate = await assertCanStartHosted(wallet.wid, engineId);
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const { sid } = await openMeteredSession(wallet.wid, engineId);
    const mint = await mintHostedEphemeral(engineId);
    return Response.json({
      sid,
      mode: "hosted",
      ...mint,
    });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message || "hosted start failed" },
      { status: 502 },
    );
  }
}
