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

const DEMO_BOUTIQUES: ApiBoutiqueCard[] = [
  {
    id: "shop-aziz-tech",
    name: "Aziz Tech",
    slug: "aziz-tech",
    tagline: "L'essentiel de l'électronique & des smartphones",
    description: "Spécialiste de la tech à Abidjan : smartphones, accessoires, audio et gadgets garantis.",
    city: "Abidjan",
    country: "Côte d'Ivoire",
    coverImage: "/assets/scenes/ambiance-tech.jpg",
    logoImage: "/assets/boutique/logo.png",
    verificationStatus: "VERIFIED",
    category: "Électronique & High-Tech",
    productsCount: 8,
  },
  {
    id: "shop-sahel-mode",
    name: "Sahel Élégance & Mode",
    slug: "sahel-mode",
    tagline: "Prêt-à-porter & haute couture africaine",
    description: "Créations raffinées en wax, soie et bazin riche.",
    city: "Dakar",
    country: "Sénégal",
    coverImage: "/assets/scenes/ambiance-tissus.jpg",
    logoImage: "",
    verificationStatus: "VERIFIED",
    category: "Mode & Vêtements",
    productsCount: 14,
  },
  {
    id: "shop-dakar-bio",
    name: "Dakar Bio Cosmétiques",
    slug: "dakar-bio",
    tagline: "Soins 100% naturels et certifiés bio",
    description: "Beurres de karité purs, huiles de baobab et cosmétiques capillaires naturels.",
    city: "Dakar",
    country: "Sénégal",
    coverImage: "/assets/scenes/ambiance-beaute.jpg",
    logoImage: "",
    verificationStatus: "VERIFIED",
    category: "Beauté & Soins",
    productsCount: 6,
  },
];

export const shopsApi = {
  /** Créer la boutique (statut PENDING — vérification plateforme) */
  wallet(id: string) {
    return apiFetch<unknown>(`/boutiques/${id}/wallet`);
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
  async publicList(): Promise<ApiBoutiqueCard[]> {
    try {
      const list = await apiFetch<ApiBoutiqueCard[]>("/boutiques/public");
      if (Array.isArray(list) && list.length > 0) return list;
    } catch {
      // Repli fluide
    }
    return DEMO_BOUTIQUES;
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

  /** Alias explicite pour la page "Mes Boutiques" du dashboard */
  myShops() {
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
