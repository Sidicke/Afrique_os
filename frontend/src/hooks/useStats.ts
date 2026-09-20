"use client";

import { useCallback } from "react";
import { useSession } from "@/lib/useSession";

import { StatsData } from "@/types/dashboard";
import { dashboardService } from "@/services/dashboardService";
import { useAsyncResource } from "@/hooks/useAsyncResource";

export type StatsPeriod = "7_days" | "30_days" | "this_year";

/** Statistiques paramétrables par période — prêt à être branché sur l'API réelle */
export function useStats(period: StatsPeriod) {
  return useAsyncResource<StatsData>(
    useCallback(() => dashboardService.getStats(period), [period]),
    "Impossible de charger les statistiques."
  );
}
