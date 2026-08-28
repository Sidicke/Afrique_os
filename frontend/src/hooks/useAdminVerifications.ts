"use client";

import { useCallback } from "react";
import { useAsyncResource } from "./useAsyncResource";
import { adminService } from "@/services/adminService";

/** Hook client de la liste des dossiers de vérification (doc 04) */
export function useAdminVerifications() {
  const fetcher = useCallback(() => adminService.getVerifications(), []);
  return useAsyncResource(fetcher, "Impossible de charger les dossiers de vérification.");
}
