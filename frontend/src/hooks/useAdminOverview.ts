"use client";

import { useCallback } from "react";
import { useAsyncResource } from "./useAsyncResource";
import { adminService } from "@/services/adminService";
import type { AdminOverviewData } from "@/types/admin";

/**
 * Hook client de l'Overview admin — charge le Command Center depuis le
 * service (données de démo structurées, backend-ready). La période est
 * passée en paramètre : l'identité du fetcher change → rechargement.
 */
export function useAdminOverview(period: AdminOverviewData["period"] = "30_days") {
  const fetcher = useCallback(
    () => adminService.getOverview(period),
    [period]
  );
  return useAsyncResource(fetcher, "Impossible de charger le tableau de bord de la plateforme.");
}
