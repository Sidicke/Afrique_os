"use client";

import { useCallback } from "react";
import { useAsyncResource } from "./useAsyncResource";
import { adminService } from "@/services/adminService";
import type { AdminAnalyticsData } from "@/types/admin";

/**
 * Hook client du module Analytics (doc 09) — la période globale du topbar
 * pilote la granularité des séries (7 j → jours, année → mois).
 */
export function useAdminAnalytics(period: AdminAnalyticsData["period"] = "30_days") {
  const fetcher = useCallback(
    () => adminService.getAnalytics(period),
    [period]
  );
  return useAsyncResource(fetcher, "Impossible de charger les analyses de la plateforme.");
}
