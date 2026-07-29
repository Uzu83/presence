/**
 * Free / Pro 機能ゲート（計画 Phase 2）。
 * BYOK 維持: キーは端末。Pro は「三本柱・資料・検索フル」の解禁対価。
 */

import type { LiveEngineId } from "@/lib/voice/engines";

export type PlanId = "free" | "pro";

export const PRO_PRICE_LABEL = "¥980/月";

/** Free で使える Live エンジン（1つに制限） */
export const FREE_LIVE_ENGINE: LiveEngineId = "grok-voice";

export type Entitlements = {
  plan: PlanId;
  liveEngines: LiveEngineId[];
  maxProjects: number;
  searchEnabled: boolean;
};

export function entitlementsFor(plan: PlanId): Entitlements {
  if (plan === "pro") {
    return {
      plan: "pro",
      liveEngines: ["gpt-live", "gemini-live", "grok-voice"],
      maxProjects: 50,
      searchEnabled: true,
    };
  }
  return {
    plan: "free",
    liveEngines: [FREE_LIVE_ENGINE],
    maxProjects: 1,
    searchEnabled: false,
  };
}

export function canUseLiveEngine(plan: PlanId, engine: LiveEngineId): boolean {
  return entitlementsFor(plan).liveEngines.includes(engine);
}
