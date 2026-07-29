/**
 * Free / Pro / Hosted 機能ゲート。
 * Hosted（残高あり）が本線。Pro BYOK は上級者向けの追加解禁。
 */

import type { LiveEngineId } from "@/lib/voice/engines";

export type PlanId = "free" | "pro";

export const PRO_PRICE_LABEL = "¥980/月";

/** Free BYOK で使える Live エンジン（1つに制限） */
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

/**
 * Hosted: 運営が公開しているエンジンは残高があれば使える。
 * BYOK: 従来どおり Pro ゲート。
 */
export function canUseLiveEngineMode(input: {
  mode: "hosted" | "byok";
  plan: PlanId;
  engine: LiveEngineId;
  hostedEngines: LiveEngineId[];
  balance: number;
}): boolean {
  if (input.mode === "hosted") {
    return input.hostedEngines.includes(input.engine) && input.balance > 0;
  }
  return canUseLiveEngine(input.plan, input.engine);
}
