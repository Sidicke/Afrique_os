"use client";

import { useCallback } from "react";
import { useAsyncResource } from "./useAsyncResource";
import { adminService } from "@/services/adminService";

/** Hook client de la vue générale des abonnements (doc 08) */
export function useAdminSubscriptions() {
  const fetcher = useCallback(() => adminService.getSubscriptions(), []);
  return useAsyncResource(fetcher, "Impossible de charger les abonnements.");
}
