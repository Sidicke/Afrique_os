/**
 * Couche API — Catalogue public (vitrine)
 */

import { apiFetch } from "./http";
import type {
  ApiCategory,
  ApiCategoryCount,
  ApiCataloguePage,
  ApiProductDetail,
} from "./types";

export interface CatalogueQuery {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "popular";
  page?: number;
  limit?: number;
}

function toQueryString(query: CatalogueQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const catalogueApi = {
  /**
   * Catalogue GLOBAL — produits de TOUTES les boutiques ACTIVE (accueil
   * client, base du futur Marketplace). Chaque produit porte sa boutique.
   */
  allProducts(query: CatalogueQuery = {}) {
    return apiFetch<ApiCataloguePage>(`/products/public${toQueryString(query)}`);
  },

  /**
   * Catégories du catalogue GLOBAL (Marketplace) : nom, slug et nombre de
   * produits actifs réels — alimente le menu du hero et la section
   * « Explorer par catégorie » (aucun compte codé en dur).
   */
  categoriesGlobal() {
    return apiFetch<ApiCategoryCount[]>("/products/public/categories");
  },

  /** Catalogue public paginé d'une boutique (filtres, tri) */
  products(slug: string, query: CatalogueQuery = {}) {
    return apiFetch<ApiCataloguePage>(
      `/products/public/boutique/${encodeURIComponent(slug)}${toQueryString(query)}`,
    );
  },

  /** Détail public d'un produit (variantes + avis complets) */
  product(slug: string, productId: string) {
    return apiFetch<ApiProductDetail>(
      `/products/public/boutique/${encodeURIComponent(slug)}/${encodeURIComponent(productId)}`,
    );
  },

  /**
   * Détail public d'un produit par SLUG (lien direct /produit/:slug du
   * Marketplace) — résolu dans toutes les boutiques ACTIVE par le backend.
   */
  productBySlug(slug: string) {
    return apiFetch<ApiProductDetail>(
      `/products/public/by-slug/${encodeURIComponent(slug)}`,
    );
  },

  /** Catégories publiques d'une boutique */
  categories(slug: string) {
    return apiFetch<ApiCategory[]>(`/categories/public/${encodeURIComponent(slug)}`);
  },

  /** Inscription newsletter */
  newsletterSubscribe(slug: string, email: string) {
    return apiFetch<{ success: boolean }>(
      `/newsletter/subscribe/${encodeURIComponent(slug)}`,
      { method: "POST", body: JSON.stringify({ email }) },
    );
  },
};
