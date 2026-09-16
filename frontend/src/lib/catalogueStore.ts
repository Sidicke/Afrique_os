/**
 * Store vitrine — catalogue produits (acheteur)
 * --------------------------------------------------------------------------
 * ⚠️ MODULE PUR (aucun import React) — même pattern que `lib/shopConfig.ts` :
 * données + abonnés, consommés par le hook `useCatalogueStore` ("use client").
 *
 * Au chargement de la page boutique, `loadPublicShop(slug)` récupère LE
 * profil public complet du backend (config + catégories + produits actifs)
 * en un seul appel. Tant que rien n'est chargé (ou si l'API est injoignable),
 * le store expose les produits de démonstration `constants/store.ts` :
 * la vitrine fonctionne toujours, hors-ligne comme en ligne.
 */

import {
  categories as FALLBACK_CATEGORIES,
  products as FALLBACK_PRODUCTS,
  type Product,
} from "@/constants/store";
import { toPublicProduct, toShopConfig } from "@/lib/api/mappers";
import { shopsApi } from "@/lib/api/shops";
import { updateShopConfig } from "@/lib/shopConfig";

export interface CatalogueData {
  /** Produits affichés (API si chargée, sinon démo) */
  products: Product[];
  /** Noms de catégories pour les filtres */
  categories: string[];
  /** Noms des marques disponibles (section « Marques » + filtres) */
  brands: string[];
  /** Marque sélectionnée par le visiteur (null = toutes) */
  activeBrand: string | null;
  boutiqueId: string | null;
  boutiqueSlug: string | null;
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

/** Marques uniques présentes dans un jeu de produits */
function uniqueBrands(products: Product[]): string[] {
  return Array.from(
    new Set(products.map((p) => p.brand).filter((b): b is string => Boolean(b))),
  );
}

/** Snapshot par défaut (référence stable exigée par useSyncExternalStore) */
export const DEFAULT_CATALOGUE: CatalogueData = {
  products: FALLBACK_PRODUCTS,
  // « Tous » (filtre global) en tête, puis les catégories réelles
  categories: [...FALLBACK_CATEGORIES],
  brands: uniqueBrands(FALLBACK_PRODUCTS),
  activeBrand: null,
  boutiqueId: null,
  boutiqueSlug: null,
  loaded: false,
  loading: false,
  error: null,
};

let current: CatalogueData = DEFAULT_CATALOGUE;
const listeners = new Set<() => void>();

function setCatalogue(patch: Partial<CatalogueData>) {
  current = { ...current, ...patch };
  for (const listener of listeners) listener();
}

/** Lecture synchrone du store (tests, composants…) */
export function getCatalogue(): CatalogueData {
  return current;
}

export function subscribeCatalogue(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Charge le profil public complet d'une boutique (config + catalogue).
 * Multi-boutiques : chaque changement de slug (navigation /boutique/[slug])
 * recharge les données. Un même slug déjà chargé est ignoré.
 */
export async function loadPublicShop(slug: string): Promise<void> {
  // Déjà chargé pour CETTE boutique → rien à faire (évite le re-fetch)
  if (current.loaded && current.boutiqueSlug === slug) return;
  // Changement de boutique → on repart d'un état vide (loading)
  if (current.loading) return;
  setCatalogue({ loading: true, loaded: false });
  try {
    const shop = await shopsApi.publicBySlug(slug);
    // 1. Config boutique (identité, livraison, promotions) → store partagé
    updateShopConfig(toShopConfig(shop));
    // 2. Catalogue produits + catégories (ids backend → panier/commande réels)
    const products = shop.products.map(toPublicProduct);
    const categoryNames = [
      "Tous",
      ...shop.categories.map((c) => c.name).filter(Boolean),
    ];
    setCatalogue({
      products,
      categories: categoryNames.length > 1 ? categoryNames : current.categories,
      brands: uniqueBrands(products),
      boutiqueId: shop.id,
      boutiqueSlug: shop.slug,
      loaded: true,
      loading: false,
      error: null,
    });
  } catch (err) {
    // Repli sur la démo : la vitrine reste 100% fonctionnelle sans backend
    setCatalogue({
      products: DEFAULT_CATALOGUE.products,
      categories: DEFAULT_CATALOGUE.categories,
      brands: DEFAULT_CATALOGUE.brands,
      boutiqueSlug: slug,
      loaded: true,
      loading: false,
      error: null,
    });
  }
}

/**
 * Sélectionne la marque filtrée de la vitrine (section « Marques » + grille).
 * null = toutes les marques. Consommé par `useCatalogueStore`.
 */
export function setActiveBrand(brand: string | null): void {
  setCatalogue({ activeBrand: brand });
}

/** Recharge depuis l'API même si déjà chargé (rarement utile) */
export async function reloadPublicShop(slug: string): Promise<void> {
  current = { ...current, loaded: false };
  await loadPublicShop(slug);
}
