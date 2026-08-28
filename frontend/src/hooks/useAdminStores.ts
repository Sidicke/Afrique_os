"use client";

import { useCallback } from "react";
import { useAsyncResource } from "./useAsyncResource";
import { adminService } from "@/services/adminService";

/** Hook client de la liste des boutiques (doc 05) */
export function useAdminStores() {
  const fetcher = useCallback(() => adminService.getStores(), []);
  return useAsyncResource(fetcher, "Impossible de charger les boutiques.");
}
