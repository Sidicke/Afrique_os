/**
 * Hook client `useCatalogueStore` — produits/catégories de la vitrine.
 * Le module est marqué "use client" : il ne peut être importé que par des
 * composants client (les données pures restent dans `lib/catalogueStore.ts`).
 */
"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_CATALOGUE,
  getCatalogue,
  subscribeCatalogue,
  type CatalogueData,
} from "./catalogueStore";

export function useCatalogueStore(): CatalogueData {
  const subscribe = useCallback(
    (listener: () => void) => subscribeCatalogue(listener),
    []
  );
  return useSyncExternalStore(subscribe, getCatalogue, () => DEFAULT_CATALOGUE);
}
