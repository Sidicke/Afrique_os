/**
 * Couche API — Recherche globale (annuaire + catalogue)
 * --------------------------------------------------------------------------
 * GET /search?q= — moteur de recherche backend (boutiques + produits, toutes
 * les boutiques ACTIVE). C'est la fondation du futur Marketplace.
 */

import { apiFetch } from "./http";
import type { ApiBoutiqueCard, ApiPublicProduct } from "./types";

export interface ApiSearchResults {
  boutiques: ApiBoutiqueCard[];
  produits: ApiPublicProduct[];
}

export const searchApi = {
  /** Recherche globale : boutiques + produits (insensible à la casse) */
  global(q: string) {
    const query = q.trim();
    if (!query) return Promise.resolve({ boutiques: [], produits: [] });
    return apiFetch<ApiSearchResults>(`/search?q=${encodeURIComponent(query)}`);
  },
};
