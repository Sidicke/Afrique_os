"use client";

import { useCallback } from "react";
import { useAsyncResource } from "./useAsyncResource";
import { adminService } from "@/services/adminService";
import type { AdminSettingsSection } from "@/types/admin";

/**
 * Hook client des Paramètres plateforme (doc 11) — charge les règles globales
 * puis expose `updateSection` pour persister une section (la source de vérité
 * reste le service, le hook ne fait que refléter le retour).
 */
export function useAdminSettings() {
  const { data, loading, error, refresh, setData } = useAsyncResource(
    useCallback(() => adminService.getSettings(), []),
    "Impossible de charger les paramètres de la plateforme."
  );

  const updateSection = useCallback(
    async (section: AdminSettingsSection, patch: unknown) => {
      const updated = await adminService.updateSettings(section, patch);
      setData(updated);
      return updated;
    },
    [setData]
  );

  return { data, loading, error, refresh, updateSection };
}
