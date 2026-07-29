"use client";

import { create } from "zustand";
import type { LiveEngineId } from "@/lib/voice/engines";

type CreditPackView = {
  id: string;
  label: string;
  yen: number;
  credits: number;
  priceConfigured: boolean;
};

type CreditState = {
  balance: number;
  hostedAvailable: boolean;
  hostedEngines: LiveEngineId[];
  ratesPerMinute: Partial<Record<LiveEngineId, number>>;
  packs: CreditPackView[];
  stripeConfigured: boolean;
  disclosures: {
    scope: string;
    expiry: string;
    refund: string;
    notCash: string;
  } | null;
  hydrated: boolean;
  refresh: () => Promise<void>;
};

export const useCreditStore = create<CreditState>((set) => ({
  balance: 0,
  hostedAvailable: false,
  hostedEngines: [],
  ratesPerMinute: {},
  packs: [],
  stripeConfigured: false,
  disclosures: null,
  hydrated: false,
  refresh: async () => {
    try {
      const res = await fetch("/api/credits/me");
      if (!res.ok) throw new Error("credits me failed");
      const data = (await res.json()) as {
        balance: number;
        hostedAvailable: boolean;
        hostedEngines: LiveEngineId[];
        ratesPerMinute: Partial<Record<LiveEngineId, number>>;
        packs: CreditPackView[];
        stripeConfigured: boolean;
        disclosures: CreditState["disclosures"];
      };
      set({
        balance: data.balance,
        hostedAvailable: data.hostedAvailable,
        hostedEngines: data.hostedEngines,
        ratesPerMinute: data.ratesPerMinute,
        packs: data.packs,
        stripeConfigured: data.stripeConfigured,
        disclosures: data.disclosures,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true, hostedAvailable: false });
    }
  },
}));
