"use client";

import { useCallback } from "react";
import { useAsyncResource } from "./useAsyncResource";
import { dashboardApi } from "@/lib/api";

const STORE_COLORS = [
  "bg-blue-700",
  "bg-gold-strong",
  "bg-green-600",
  "bg-purple-600",
  "bg-rose-600",
  "bg-amber-600",
];

export function useMultiAnalytics(period: string = "30_days") {
  const fetcher = useCallback(async () => {
    const raw = await dashboardApi.multiStoreAnalytics(period as any);
    
    // Assign UI theme colors to store revenues
    const storeRevenues = (raw.storeRevenues || []).map((store, index) => ({
      ...store,
      color: STORE_COLORS[index % STORE_COLORS.length],
    }));

    return {
      kpis: raw.kpis,
      storeRevenues,
      topProducts: raw.topProducts || [],
      funnel: raw.funnel,
    };
  }, [period]);

  return useAsyncResource(fetcher, "Impossible de charger l'analytique multi-boutique.");
}

