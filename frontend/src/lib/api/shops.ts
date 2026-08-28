/**
 * Couche API — Boutiques
 */

import { apiFetch } from "./http";
import type { ApiBoutiqueCard, ApiPublicShop, ApiShop } from "./types";

/** Données de création acceptées par POST /boutiques (CreateBoutiqueDto) */
export interface CreateShopInput {
  name: string;
  tagline?: string;
  description?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
  logoImage?: string;
}

/** Champs de mise à jour acceptés par PATCH /boutiques/:id (CreateBoutiqueDto) */
export interface UpdateShopInput {
  name?: string;
  tagline?: string;
  description?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  coverImage?: string;
  logoImage?: string;
  deliveryShortLabel?: string;
  deliveryNote?: string;
  warrantyNote?: string;
  paymentNote?: string;
  socialLinks?: ApiShop["socialLinks"];
  deliveryPacks?: ApiShop["deliveryPacks"];
  promotions?: ApiShop["promotions"];
  notifications?: ApiShop["notifications"];
}

export const shopsApi = {
  /** Créer la boutique (statut PENDING — vérification plateforme) */
  wallet(id: string) {
    return apiFetch<any>(`/boutiques/${id}/wallet`);
  },
  requestWithdrawal(id: string, amount: number, paymentInfo: string) {
    return apiFetch(`/boutiques/${id}/withdraw`, {
      method: "POST",
      body: JSON.stringify({ amount, paymentInfo }),
    });
  },
  create(input: CreateShopInput) {
    return apiFetch<ApiShop>("/boutiques", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** Annuaire — liste des boutiques ACTIVE (cartes de l'accueil client) */
  publicList() {
    return apiFetch<ApiBoutiqueCard[]>("/boutiques/public");
  },

  /** Profil public complet (vitrine) : config + catégories + produits actifs */
  publicBySlug(slug: string) {
    return apiFetch<ApiPublicShop>(
      `/boutiques/public/${encodeURIComponent(slug)}`,
    );
  },

  /** Boutiques de l'utilisateur connecté */
  mine() {
    return apiFetch<ApiShop[]>("/boutiques/my");
  },

  /** Détail d'une boutique pour son propriétaire (paramètres) */
  owner(id: string) {
    return apiFetch<ApiShop>(`/boutiques/${encodeURIComponent(id)}`);
  },

  /** Mise à jour par le propriétaire */
  update(id: string, input: UpdateShopInput) {
    return apiFetch<ApiShop>(`/boutiques/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  /**
   * Demande de vérification du compte (vendeur, depuis « Mon profil ») :
   * NONE / REJECTED → PENDING. Le badge « vérifié » apparaît après
   * validation par la plateforme (VERIFIED).
   */
  requestVerification(id: string) {
    return apiFetch<ApiShop>(
      `/boutiques/${encodeURIComponent(id)}/request-verification`,
      { method: "POST" },
    );
  },
};
