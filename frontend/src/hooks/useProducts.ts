"use client";

import { useCallback } from "react";
import { useSession } from "@/lib/useSession";

import { NewProductDraft, ProductItem } from "@/types/dashboard";
import { dashboardService } from "@/services/dashboardService";
import { useAsyncResource } from "@/hooks/useAsyncResource";

/** Catalogue produits — prêt à être branché sur l'API réelle sans toucher aux composants */
export function useProducts(targetBoutiqueId?: string) {
  const sessionBoutiqueId = useSession()?.user?.boutiqueId;
  const effectiveBoutiqueId = targetBoutiqueId ?? "all";

  const { setData, ...resource } = useAsyncResource<ProductItem[]>(
    useCallback(() => dashboardService.getProducts(effectiveBoutiqueId), [effectiveBoutiqueId, sessionBoutiqueId]),
    "Impossible de charger le catalogue."
  );

  const addProduct = useCallback(
    async (draft: NewProductDraft & { boutiqueId?: string }) => {
      const created = await dashboardService.addProduct(draft);
      setData((prev) => (prev ? [created, ...prev] : [created]));
      return created;
    },
    [setData]
  );

  const updateProduct = useCallback(
    async (id: string, patch: Partial<ProductItem> & { isActive?: boolean; stock?: number; boutiqueId?: string }) => {
      const updated = await dashboardService.updateProduct(id, patch);
      setData((prev) => (prev ? prev.map((p) => (p.id === id ? { ...p, ...updated } : p)) : prev));
      return updated;
    },
    [setData]
  );

  const deleteProduct = useCallback(
    async (id: string, productBoutiqueId?: string) => {
      await dashboardService.deleteProduct(id, productBoutiqueId);
      setData((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
      return true;
    },
    [setData]
  );

  return { ...resource, setData, addProduct, updateProduct, deleteProduct };
}
