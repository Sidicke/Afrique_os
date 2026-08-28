"use client";

import { useCallback } from "react";
import { useAsyncResource } from "./useAsyncResource";
import { adminService } from "@/services/adminService";
import type { AdminProfileData } from "@/types/admin";

/**
 * Hook client du profil administrateur (doc 02 §15) — l'état local est
 * conservé après chaque action (profil, sessions, 2FA, préférences) via la
 * mise à jour confirmée par le service.
 */
export function useAdminProfile() {
  const { data, loading, error, refresh, setData } = useAsyncResource(
    useCallback(() => adminService.getProfile(), []),
    "Impossible de charger votre profil."
  );

  const apply = useCallback(
    (next: AdminProfileData) => setData(next),
    [setData]
  );

  return {
    data,
    loading,
    error,
    refresh,
    apply,
  };
}
