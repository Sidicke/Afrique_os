/**
 * Hook client `useSession` — session réactive (access token + utilisateur).
 * Le module est marqué "use client" : il ne peut être importé que par des
 * composants client (les données pures restent dans `lib/api/session.ts`).
 */
"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getSession,
  subscribeSession,
  type Session,
} from "./api/session";

/**
 * Expose la session courante de façon réactive.
 * useSyncExternalStore : snapshot serveur = null → pas de mismatch
 * d'hydratation (la session n'existe que côté client).
 */
export function useSession(): Session | null {
  const subscribe = useCallback(
    (listener: () => void) => subscribeSession(listener),
    []
  );
  return useSyncExternalStore(subscribe, getSession, () => null);
}
