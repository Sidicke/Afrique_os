"use client";

import { useCallback, useState } from "react";
import { ShopSettings } from "@/types/dashboard";
import { dashboardService } from "@/services/dashboardService";
import { useAsyncResource } from "@/hooks/useAsyncResource";

/** Paramètres boutique — prêts à être branchés sur l'API réelle sans toucher aux composants */
export function useSettings() {
  const { setData, ...resource } = useAsyncResource<ShopSettings>(
    useCallback(() => dashboardService.getSettings(), []),
    "Impossible de charger les paramètres."
  );

  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (partial: Partial<ShopSettings>) => {
      setSaving(true);
      try {
        const updated = await dashboardService.updateSettings(partial);
        setData(updated);
        return true;
      } catch (err) {
        console.error("Save settings error:", err);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [setData]
  );

  return { ...resource, setData, saving, save };
}
