/**
 * Compte vendeur — couche partagée (inscription, connexion, session, fermeture).
 * --------------------------------------------------------------------------
 * ⚠️ MODULE PUR (aucun import React) : il est importé par les pages d'auth
 * (client) et par le dashboard. La logique réseau vit dans `lib/api/` :
 * ce module est le point d'entrée métier que les composants consomment.
 *
 * BRANCHÉ SUR L'API : l'inscription et la connexion créent de vrais comptes
 * backend (JWT access + refresh cookie httpOnly). La session (access token +
 * utilisateur) est persistée par `lib/api/session.ts`.
 *
 * Règle métier « boutique fermée » (locale) : quand un vendeur ferme sa
 * boutique, son identité (nom de boutique + email) est mémorisée et toute
 * tentative de recréer un compte avec les mêmes informations est bloquée.
 */

import { ApiError } from "@/lib/api";
import { authApi } from "@/lib/api/auth";
import {
  clearSession,
  getSessionUser,
  setSession,
} from "@/lib/api/session";
import { loadPublicShop } from "./catalogueStore";
import { resetShopConfig, updateShopConfig } from "./shopConfig";

/* ————————————————————————————————————————————————
 * Types
 * ———————————————————————————————————————————————— */

/** Identité d'une boutique fermée définitivement (blocage à la recréation) */
export interface DeletedShop {
  shopName: string;
  email: string;
  deletedAt: string;
}

/* ————————————————————————————————————————————————
 * Clés localStorage (boutiques fermées uniquement)
 * ———————————————————————————————————————————————— */

const DELETED_KEY = "afrique-commerce-os:deleted-shops";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Stockage indisponible : on continue en mémoire
  }
}

const normalize = (value: string) => value.trim().toLowerCase();

/* ————————————————————————————————————————————————
 * Session (déléguée à lib/api/session)
 * ———————————————————————————————————————————————— */

/** Session valide = un access token existe */
export function isLoggedIn(): boolean {
  return getSessionUser() !== null;
}

/** L'utilisateur connecté est un CLIENT (acheteur) — accès messagerie vitrine */
export function isClientLoggedIn(): boolean {
  return getSessionUser()?.role === "CLIENT";
}

/* ————————————————————————————————————————————————
 * Boutiques fermées (blocage de recréation)
 * ———————————————————————————————————————————————— */

export function getDeletedShops(): DeletedShop[] {
  return readJson<DeletedShop[]>(DELETED_KEY) ?? [];
}

/** Un nom de boutique ou un email déjà fermé ne peut pas être recréé */
export function isShopBlocked(shopName: string, email: string): boolean {
  const nShop = normalize(shopName);
  const nEmail = normalize(email);
  if (!nShop && !nEmail) return false;
  return getDeletedShops().some(
    (d) => normalize(d.shopName) === nShop || normalize(d.email) === nEmail
  );
}

export function blockShop(shopName: string, email: string): void {
  // Pas de doublon : une même identité fermée ne compte qu'une fois
  const already = getDeletedShops().some(
    (d) =>
      normalize(d.shopName) === normalize(shopName) &&
      normalize(d.email) === normalize(email)
  );
  if (already) return;
  const entry: DeletedShop = {
    shopName: shopName.trim(),
    email: email.trim().toLowerCase(),
    deletedAt: new Date().toISOString(),
  };
  writeJson(DELETED_KEY, [entry, ...getDeletedShops()]);
}

/* ————————————————————————————————————————————————
 * Inscription / connexion / déconnexion / fermeture
 * ———————————————————————————————————————————————— */

export interface AuthResult {
  ok: boolean;
  error?: string;
}

/** Message humain d'une erreur API (message backend si disponible) */
function toAuthError(err: unknown, fallback: string): string {
  return err instanceof ApiError && err.message ? err.message : fallback;
}

/**
 * Inscription vendeur : vérifie la règle locale des boutiques fermées, crée
 * le compte + la boutique (PENDING) côté backend, puis ouvre la session
 * (login automatique pour obtenir les tokens).
 */
export async function registerAccount(input: {
  name: string;
  shopName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthResult> {
  if (isShopBlocked(input.shopName, input.email)) {
    return {
      ok: false,
      error:
        "Cette boutique a été fermée définitivement. Il est impossible de recréer un compte avec les mêmes informations.",
    };
  }
  try {
    const { boutique } = await authApi.register({
      name: input.name.trim(),
      shopName: input.shopName.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      password: input.password,
      role: "VENDEUR",
    });
    // Login automatique → access token + refresh cookie httpOnly
    const session = await authApi.login({
      identifier: input.email.trim(),
      password: input.password,
    });
    setSession(session);

    // La vitrine prend l'identité du nouveau vendeur (config locale)
    updateShopConfig({
      name: boutique?.name ?? input.shopName.trim(),
      email: input.email.trim(),
    });
    // Si la boutique est déjà ACTIVE (rare à l'inscription), pré-charge la vitrine
    if (boutique?.status === "ACTIVE" && session.user.boutiqueSlug) {
      void loadPublicShop(session.user.boutiqueSlug);
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: toAuthError(err, "Impossible de créer le compte."),
    };
  }
}

/**
 * Inscription CLIENT (acheteur) : crée un vrai compte backend (rôle CLIENT,
 * aucune boutique) puis ouvre la session. C'est le prérequis de la
 * messagerie vitrine — l'historique des conversations est lié au compte.
 */
export async function registerClientAccount(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthResult> {
  try {
    await authApi.register({
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      password: input.password,
      role: "CLIENT",
    });
    // Login automatique → access token + refresh cookie httpOnly
    const session = await authApi.login({
      identifier: input.email.trim(),
      password: input.password,
    });
    setSession(session);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: toAuthError(err, "Impossible de créer le compte."),
    };
  }
}

/**
 * Connexion sociale (Google, Apple, Microsoft…) — simulée en attendant la
 * vraie API OAuth côté backend. Aucun compte n'étant plus stocké en local,
 * elle guide vers la création de compte (chemin de récupération).
 */
export function socialSignIn(): AuthResult {
  return {
    ok: false,
    error:
      "La connexion via un service social n'est pas encore disponible. Connectez-vous avec votre email ou créez votre boutique.",
  };
}

/** Connexion : crée une vraie session backend (access + refresh cookie) */
export async function login(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const session = await authApi.login({
      identifier: email.trim(),
      password,
    });
    setSession(session);
    // Pré-charge la vitrine du vendeur (config + catalogue) si boutique active
    if (session.user.boutiqueSlug) {
      void loadPublicShop(session.user.boutiqueSlug);
    }
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, error: "Email ou mot de passe incorrect." };
    }
    return {
      ok: false,
      error: "Connexion impossible : vérifiez votre connexion internet.",
    };
  }
}

/** Déconnexion : révoque le refresh côté serveur puis coupe la session locale */
export async function logout(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // Best effort : on coupe la session locale quoi qu'il arrive
  }
  clearSession();
}

/**
 * Fermeture définitive de la boutique : révoque la session, bloque l'identité
 * (nom + email) contre toute recréation, et remet la vitrine à ses défauts.
 */
export async function closeShop(): Promise<void> {
  const user = getSessionUser();
  if (user?.name || user?.email) {
    blockShop(user?.name ?? "", user?.email ?? "");
  }
  await logout();
  resetShopConfig();
}
