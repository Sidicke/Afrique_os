"use client";

import { useCallback } from "react";
import { useAsyncResource } from "./useAsyncResource";
import { adminService } from "@/services/adminService";

/** Hook client de la liste des utilisateurs (doc 06) */
export function useAdminUsers() {
  const fetcher = useCallback(() => adminService.getUsers(), []);
  return useAsyncResource(fetcher, "Impossible de charger les utilisateurs.");
}
