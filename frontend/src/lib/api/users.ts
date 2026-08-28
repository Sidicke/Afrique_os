/**
 * Couche API — Utilisateurs (profil)
 * --------------------------------------------------------------------------
 * Profil de l'utilisateur connecté (CLIENT ou VENDEUR) : lecture et mise à
 * jour PERSISTÉES CÔTÉ SERVEUR (le backend est la source de vérité, jamais
 * localStorage). Utilisé par l'espace client (paramètres) et le dashboard.
 */

import { apiFetch } from "./http";

/** Profil renvoyé par GET/PATCH /users/me (MerchantProfile backend) */
export interface ApiProfile {
  name: string;
  shopName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  avatarInitials: string;
  avatarUrl?: string;
  plan: string;
  defaultAddress?: string;
  defaultCity?: string;
  defaultPaymentMethod?: string;
  pointsBalance?: number;
  referralCode?: string;
}

export interface ApiReferee {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  pointsGenerated: number;
}

export interface ApiPointTransaction {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface ApiAffiliationDetails {
  pointsBalance: number;
  referralCode: string;
  totalEarnedReferral: number;
  totalEarnedCashback: number;
  totalSpentPoints: number;
  refereesCount: number;
  referees: ApiReferee[];
  transactions: ApiPointTransaction[];
}

export const usersApi = {
  /** Profil de l'utilisateur connecté */
  me() {
    return apiFetch<ApiProfile>("/users/me");
  },

  /** Détails du programme d'affiliation et des points */
  affiliation() {
    return apiFetch<ApiAffiliationDetails>("/users/affiliation");
  },

  /** Mise à jour du profil (nom, téléphone, email, avatar) — persistée côté serveur */
  update(input: {
    name?: string;
    phone?: string;
    email?: string;
    avatarUrl?: string;
    defaultAddress?: string;
    defaultCity?: string;
    defaultPaymentMethod?: string;
  }) {
    return apiFetch<ApiProfile>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
};
