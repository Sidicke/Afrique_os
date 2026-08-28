/**
 * Hook client `useCustomerStore` — profil, commandes et conversations réactifs.
 * Le module est marqué "use client" : il ne peut être importé que par des
 * composants client (les données pures restent dans `lib/customerStore.ts`).
 */
"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  EMPTY_CUSTOMER_DATA,
  getCustomerData,
  handleCustomerStorageEvent,
  subscribeCustomerStore,
  type CustomerData,
} from "./customerStore";

/** Hook client — profil + commandes + conversations, réactif */
export function useCustomerStore(): CustomerData {
  const subscribe = useCallback(
    (listener: () => void) => subscribeCustomerStore(listener),
    []
  );

  useEffect(() => {
    window.addEventListener("storage", handleCustomerStorageEvent);
    return () =>
      window.removeEventListener("storage", handleCustomerStorageEvent);
  }, []);

  return useSyncExternalStore(
    subscribe,
    getCustomerData,
    () => EMPTY_CUSTOMER_DATA
  );
}
