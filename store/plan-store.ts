"use client";

import { create } from "zustand";
import {
  type Entitlements,
  entitlementsFor,
  type PlanId,
} from "@/lib/entitlements";

type PlanState = {
  plan: PlanId;
  entitlements: Entitlements;
  email: string | null;
  stripeConfigured: boolean;
  hydrated: boolean;
  refresh: () => Promise<void>;
};

export const usePlanStore = create<PlanState>((set) => ({
  plan: "free",
  entitlements: entitlementsFor("free"),
  email: null,
  stripeConfigured: false,
  hydrated: false,
  refresh: async () => {
    try {
      const res = await fetch("/api/billing/me");
      if (!res.ok) throw new Error("me failed");
      const data = (await res.json()) as {
        plan: PlanId;
        entitlements: Entitlements;
        email: string | null;
        stripeConfigured: boolean;
      };
      set({
        plan: data.plan,
        entitlements: data.entitlements,
        email: data.email,
        stripeConfigured: data.stripeConfigured,
        hydrated: true,
      });
    } catch {
      set({
        plan: "free",
        entitlements: entitlementsFor("free"),
        hydrated: true,
      });
    }
  },
}));
