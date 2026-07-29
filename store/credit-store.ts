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

type Disclosures = {
  issuerName: string;
  scope: string;
  expiry: string;
  refund: string;
  notCash: string;
  contact: string;
  meterNote: string;
};

type CreditState = {
  balance: number;
  nextExpiry: string | null;
  hostedAvailable: boolean;
  hostedEngines: LiveEngineId[];
  ratesPerMinute: Partial<Record<LiveEngineId, number>>;
  packs: CreditPackView[];
  stripeConfigured: boolean;
  disclosures: Disclosures | null;
  hydrated: boolean;
  refresh: () => Promise<void>;
};

export const useCreditStore = create<CreditState>((set) => ({
  balance: 0,
  nextExpiry: null,
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
        nextExpiry: string | null;
        hostedAvailable: boolean;
        hostedEngines: LiveEngineId[];
        ratesPerMinute: Partial<Record<LiveEngineId, number>>;
        packs: CreditPackView[];
        stripeConfigured: boolean;
        disclosures: Disclosures;
      };
      set({
        balance: data.balance,
        nextExpiry: data.nextExpiry,
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
