/**
 * Couche API — session (access token + utilisateur connecté)
 * --------------------------------------------------------------------------
 * ⚠️ MODULE PUR (aucun import React) :
 * Gestion sécurisée en mémoire et sessionStorage (isolation par onglet).
 *
 * Seul l'ACCESS token court (15 min) transite ici. Le REFRESH token (7 j) est
 * un cookie httpOnly sécurisé géré par le backend : il est automatiquement
 * utilisé par `http.ts` pour renouveler la session silencieusement.
 */

import type { ApiUser } from "./types";

export interface Session {
  accessToken: string;
  user: ApiUser;
}

const SESSION_KEY = "zennshop:api-session";

function readFromStorage(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    // Lecture depuis localStorage pour partager la session entre les onglets
    let raw = window.localStorage.getItem(SESSION_KEY);
    // Rétrocompatibilité si c'était dans sessionStorage
    if (!raw) {
      raw = window.sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        window.localStorage.setItem(SESSION_KEY, raw);
        window.sessionStorage.removeItem(SESSION_KEY);
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (typeof parsed.accessToken !== "string" || !parsed.user) return null;

    return { accessToken: parsed.accessToken, user: parsed.user };
  } catch {
    return null;
  }
}

let current: Session | null = readFromStorage();
const listeners = new Set<() => void>();

function persist() {
  try {
    if (typeof window !== "undefined") {
      if (current) {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(current));
      } else {
        window.localStorage.removeItem(SESSION_KEY);
      }
    }
  } catch {
    // Stockage indisponible : la session reste en mémoire vive
  }
  for (const listener of listeners) listener();
}

/** Session courante (null si déconnecté) */
export function getSession(): Session | null {
  return current;
}

/** Access token pour l'en-tête Authorization */
export function getAccessToken(): string | null {
  return current?.accessToken ?? null;
}

/** Utilisateur connecté (null si déconnecté) */
export function getSessionUser(): ApiUser | null {
  return current?.user ?? null;
}

/** Id de la boutique du vendeur connecté, ou null */
export function getBoutiqueId(): string | null {
  return current?.user.boutiqueId ?? null;
}

/** Slug public de la boutique du vendeur connecté, ou null */
export function getBoutiqueName(): string | null {
  return (current?.user as any)?.boutiqueName ?? null;
}

export function getBoutiqueSlug(): string | null {
  return current?.user.boutiqueSlug ?? null;
}

export function setSession(session: Session): void {
  current = session;
  persist();
}

/**
 * Met à jour les informations de l'utilisateur dans la session locale
 * (après une modification de profil persistée côté serveur).
 */
export function updateSessionUser(
  patch: Partial<Pick<ApiUser, "name" | "phone" | "email" | "avatarUrl">>,
): void {
  if (!current) return;
  current = { ...current, user: { ...current.user, ...patch } };
  persist();
}

export function clearSession(): void {
  current = null;
  persist();
}

/** Abonnement aux changements de session — utilisé par les hooks client */
export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}


/**
 * Change la boutique active du vendeur dans la session locale.
 * Permet la navigation multi-boutiques sans reconnexion.
 * Recharge la config boutique isolée pour la nouvelle boutique.
 */
export function switchActiveBoutique(boutiqueId: string, boutiqueSlug: string, boutiqueName?: string): void {
  if (!current) return;
  current = { ...current, user: { ...current.user, boutiqueId, boutiqueSlug, boutiqueName: boutiqueName || (current.user as any).boutiqueName } as any };
  persist();
  // Recharge la config boutique isolée après le changement de session
  // (import dynamique pour éviter les dépendances circulaires)
  import("@/lib/shopConfig").then(({ reloadShopConfig }) => reloadShopConfig()).catch(() => {});
}
