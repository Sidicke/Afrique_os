/**
 * Période globale du dashboard Super Admin — store pur + hook client.
 * Même pattern que `lib/api/session.ts` / `useSession.ts` : le module pur
 * vit ici avec ses abonnés, le hook `useSyncExternalStore` est
 * hydratation-safe (snapshot serveur = défaut).
 */
"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { AdminOverviewData } from "@/types/admin";

export type AdminPeriod = AdminOverviewData["period"];

const DEFAULT_PERIOD: AdminPeriod = "30_days";

let current: AdminPeriod = DEFAULT_PERIOD;
const listeners = new Set<() => void>();

/** Période courante (lecture synchrone pour getSnapshot) */
export function getAdminPeriod(): AdminPeriod {
  return current;
}

/** Change la période et notifie les abonnés (topbar + pages) */
export function setAdminPeriod(period: AdminPeriod): void {
  current = period;
  for (const listener of listeners) listener();
}

/** Abonnement aux changements de période */
export function subscribeAdminPeriod(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Hook client — période réactive, sans mismatch d'hydratation */
export function useAdminPeriod(): AdminPeriod {
  const subscribe = useCallback(
    (listener: () => void) => subscribeAdminPeriod(listener),
    []
  );
  return useSyncExternalStore(subscribe, getAdminPeriod, () => DEFAULT_PERIOD);
}
