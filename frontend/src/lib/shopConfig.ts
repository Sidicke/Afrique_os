/**
 * Configuration boutique — couche partagée entre le dashboard (admin) et la
 * vitrine (/boutique).
 * --------------------------------------------------------------------------
 * ⚠️ MODULE PUR (aucun import React) : il est importé à la fois par des
 * composants serveur (constants/store.ts → page boutique) et des composants
 * client. Les hooks `useShopConfig` / `useCustomerStore` vivent dans
 * `lib/useShopConfig.ts` / `lib/useCustomerStore.ts` ("use client").
 *
 * Une seule source de vérité, persistée en localStorage. Quand l'admin modifie
 * son espace « Ma boutique » (identité, visuels, contacts, livraison,
 * promotions), la boutique affiche instantanément les changements.
 *
 * Le jour où un backend arrive, il suffira de remplacer `updateShopConfig` /
 * `getShopConfig` par des appels API — les composants ne changent pas.
 */

/* ————————————————————————————————————————————————
 * Types
 * ———————————————————————————————————————————————— */

/** Pack de livraison proposé au moment de la commande (obligatoire) */
export interface DeliveryPack {
  id: string;
  name: string;
  /** Prix en FCFA — 0 = gratuite */
  price: number;
  /** Petite description affichée au client */
  description: string;
  /** Badge optionnel (ex. « Recommandé », « Express ») */
  badge?: string;
}

/** Promotion : un pourcentage appliqué sur un produit existant */
export interface Promotion {
  productId: string;
  /** 1 à 90 (borné dans l'admin) */
  discountPercent: number;
}

/** Réglage de notification (interrupteur dans Paramètres) */
export interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

/** Liens de réseaux sociaux — chaîne vide = masqué */
export interface SocialLinks {
  instagram: string;
  facebook: string;
  twitter: string;
  linkedin: string;
  tiktok: string;
}

/** Configuration complète d'une boutique (identité + vitrine + commerce) */
export interface ShopConfig {
  /* Identité */
  name: string;
  tagline: string;
  description: string;
  city: string;
  country: string;
  /* Compte vérifié (badge de confiance affiché sur la vitrine et les produits) */
  isVerified: boolean;
  /* Contacts */
  email: string;
  /** Numéro WhatsApp de la boutique (contact, pas de commande directe) */
  whatsappNumber: string;
  social: SocialLinks;
  /* Visuels */
  coverImage: string;
  logoImage: string;
  /* Notes de confiance affichées sur les fiches produit */
  deliveryShortLabel: string;
  deliveryNote: string;
  warrantyNote: string;
  paymentNote: string;
  /* Livraison — packs obligatoires à la commande */
  deliveryPacks: DeliveryPack[];
  /* Promotions appliquées sur la boutique */
  promotions: Promotion[];
  /* Préférences de notification (dashboard) */
  notifications: NotificationSetting[];
}

/* ————————————————————————————————————————————————
 * Valeurs par défaut (identité « Aziz Tech »)
 * ———————————————————————————————————————————————— */

export const DEFAULT_CONFIG: ShopConfig = {
  name: "Aziz Tech",
  isVerified: false,
  tagline: "Tout ce qu'il vous faut",
  description:
    "Aziz Tech, c'est l'essentiel de l'électronique et des accessoires, soigneusement sélectionnés pour votre quotidien. Nous écoutons vos besoins et vous proposons le meilleur de la tech.",
  city: "Côte d'Ivoire",
  country: "Côte d'Ivoire",
  email: "contact.aziztech@gmail.com", // Gmail pro — à remplacer
  // Démo hors-ligne : pas de numéro → le checkout standard reste actif.
  // (La vraie boutique aziz-tech a un numéro renvoyé par le backend.)
  whatsappNumber: "",
  social: { instagram: "", facebook: "", twitter: "", linkedin: "", tiktok: "" },
  coverImage: "/assets/portraits/vitrine.jpg",
  logoImage: "",
  deliveryShortLabel: "Livraison 24-48h",
  deliveryNote: "Livraison 24-48h à Abidjan et partout en Côte d'Ivoire",
  warrantyNote: "Garantie 6 mois sur tous les appareils",
  paymentNote: "Paiement en ligne : Mobile Money ou carte bancaire",
  deliveryPacks: [
    {
      id: "standard",
      name: "Standard",
      price: 2000,
      description: "Livraison en 24-48h à Abidjan et partout en Côte d'Ivoire.",
    },
    {
      id: "gratuite",
      name: "Gratuite",
      price: 0,
      description: "Offerte dès 50 000 FCFA d'achat, livrée sous 3 à 5 jours.",
      badge: "Économisez",
    },
    {
      id: "premium",
      name: "Premium",
      price: 5000,
      description: "Express : livrée le jour même à Abidjan.",
      badge: "Recommandé",
    },
  ],
  // Un exemple de promotion active pour montrer la fonctionnalité
  // (retirable à tout moment depuis l'admin).
  promotions: [{ productId: "ecouteurs-sans-fil", discountPercent: 20 }],
  notifications: [
    {
      id: "new_order",
      label: "Nouvelle commande",
      description: "Notification à chaque commande reçue.",
      enabled: true,
    },
    {
      id: "order_paid",
      label: "Paiement reçu",
      description: "Quand un client confirme le paiement d'une commande.",
      enabled: true,
    },
    {
      id: "order_cancelled",
      label: "Commande annulée",
      description: "Quand un client annule sa commande.",
      enabled: true,
    },
    {
      id: "new_message",
      label: "Nouveau message client",
      description: "Alerte à chaque nouveau message d'un client.",
      enabled: true,
    },
    {
      id: "low_stock",
      label: "Alerte stock",
      description: "Quand un produit ou une variante tombe à 0.",
      enabled: true,
    },
  ],
};

/* ————————————————————————————————————————————————
 * Helpers prix & promotions
 * ———————————————————————————————————————————————— */

/** Prix remisé (entier, arrondi) — ex. 45 000 −20% → 36 000 */
export function discountPrice(base: number, percent: number): number {
  const clamped = Math.min(90, Math.max(1, percent));
  return Math.round((base * (100 - clamped)) / 100);
}

/** Promotion active d'un produit, ou null */
export function getPromotion(
  config: ShopConfig,
  productId: string
): Promotion | null {
  return (
    config.promotions.find((p) => p.productId === productId) ?? null
  );
}

/** Prix affiché d'un produit : { base, current, percent } avec percent = null hors promo */
export function productPrice(
  config: ShopConfig,
  product: { id: string; price: number }
): { base: number; current: number; percent: number | null } {
  const promo = getPromotion(config, product.id);
  if (!promo) return { base: product.price, current: product.price, percent: null };
  return {
    base: product.price,
    current: discountPrice(product.price, promo.discountPercent),
    percent: promo.discountPercent,
  };
}

/** Lien mailto vers la boutique (Gmail pro) avec sujet + corps pré-remplis */
export function mailtoLink(email: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${email}?${params.toString()}`;
}

/* ————————————————————————————————————————————————
 * Store localStorage (lecture/écriture + abonnés)
 * ———————————————————————————————————————————————— */

const CONFIG_KEY = "zennshop:shop-config";

/** Fusionne un objet parsé avec les défauts (tolérant aux champs manquants) */
function normalize(raw: unknown): ShopConfig {
  if (typeof raw !== "object" || raw === null) return DEFAULT_CONFIG;
  const r = raw as Partial<ShopConfig>;
  return {
    ...DEFAULT_CONFIG,
    ...r,
    social: { ...DEFAULT_CONFIG.social, ...(r.social ?? {}) },
    deliveryPacks: Array.isArray(r.deliveryPacks) ? r.deliveryPacks : DEFAULT_CONFIG.deliveryPacks,
    promotions: Array.isArray(r.promotions) ? r.promotions : DEFAULT_CONFIG.promotions,
    notifications: Array.isArray(r.notifications) ? r.notifications : DEFAULT_CONFIG.notifications,
  };
}

function loadFromStorage(): ShopConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return normalize(JSON.parse(raw));
  } catch {
    return DEFAULT_CONFIG;
  }
}

let current: ShopConfig = loadFromStorage();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** Lecture synchrone de la config (tests, services…) */
export function getShopConfig(): ShopConfig {
  return current;
}

/** Abonnement aux changements de config — utilisé par le hook client */
export function subscribeShopConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Synchronisation multi-onglets (événement `storage`) — appelé par le hook */
export function handleShopConfigStorageEvent(e: StorageEvent): void {
  if (e.key !== CONFIG_KEY) return;
  if (e.newValue) {
    current = normalize(JSON.parse(e.newValue));
  } else {
    current = DEFAULT_CONFIG;
  }
  notify();
}

/** Applique un patch et persiste (utilisé par l'admin « Ma boutique ») */
export function updateShopConfig(patch: Partial<ShopConfig>): ShopConfig {
  current = { ...current, ...patch };
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(current));
    }
  } catch {
    // Stockage indisponible : la config reste en mémoire
  }
  notify();
  return current;
}

/** Remet la config aux valeurs par défaut (tests, zone de risque…) */
export function resetShopConfig(): ShopConfig {
  current = DEFAULT_CONFIG;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CONFIG_KEY);
    }
  } catch {
    // ignore
  }
  notify();
  return current;
}
