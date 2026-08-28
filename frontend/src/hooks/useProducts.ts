"use client";

import { useCallback } from "react";
import { NewProductDraft, ProductItem } from "@/types/dashboard";
import { dashboardService } from "@/services/dashboardService";
import { useAsyncResource } from "@/hooks/useAsyncResource";

/** Catalogue produits — prêt à être branché sur l'API réelle sans toucher aux composants */
export function useProducts() {
  const { setData, ...resource } = useAsyncResource<ProductItem[]>(
    useCallback(() => dashboardService.getProducts(), []),
    "Impossible de charger le catalogue."
  );

  const addProduct = useCallback(
    async (draft: NewProductDraft) => {
      const created = await dashboardService.addProduct(draft);
      setData((prev) => (prev ? [created, ...prev] : [created]));
      return created;
    },
    [setData]
  );

  return { ...resource, setData, addProduct };
}
