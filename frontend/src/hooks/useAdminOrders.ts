"use client";

import { useCallback } from "react";
import { useAsyncResource } from "./useAsyncResource";
import { adminService } from "@/services/adminService";

/** Hook client de la liste des commandes plateforme (doc 07) */
export function useAdminOrders() {
  const fetcher = useCallback(() => adminService.getOrders(), []);
  return useAsyncResource(fetcher, "Impossible de charger les commandes.");
}
