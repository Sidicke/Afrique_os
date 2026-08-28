/**
 * Hook client `useShopConfig` — réactif sur la config boutique.
 * Le module est marqué "use client" : il ne peut être importé que par des
 * composants client (les données pures restent dans `lib/shopConfig.ts`).
 */
"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_CONFIG,
  getShopConfig,
  handleShopConfigStorageEvent,
  subscribeShopConfig,
  type ShopConfig,
} from "./shopConfig";

/**
 * Expose la config dynamique de la boutique.
 * useSyncExternalStore : snapshot serveur = défauts → pas de mismatch
 * d'hydratation ; synchronisation multi-onglets via l'événement `storage`.
 */
export function useShopConfig(): ShopConfig {
  const subscribe = useCallback(
    (listener: () => void) => subscribeShopConfig(listener),
    []
  );

  useEffect(() => {
    window.addEventListener("storage", handleShopConfigStorageEvent);
    return () =>
      window.removeEventListener("storage", handleShopConfigStorageEvent);
  }, []);

  return useSyncExternalStore(subscribe, getShopConfig, () => DEFAULT_CONFIG);
}
