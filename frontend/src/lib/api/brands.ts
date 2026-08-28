/**
 * Couche API — Marques (dashboard vendeur + vitrine)
 */

import { apiFetch } from "./http";
import type { ApiBrand } from "./types";

export const brandsApi = {
  /** Marques d'une boutique (admin) */
  list(boutiqueId: string) {
    return apiFetch<ApiBrand[]>(
      `/brands/boutique/${encodeURIComponent(boutiqueId)}`,
    );
  },

  /** Créer une marque dans une boutique */
  create(boutiqueId: string, name: string) {
    return apiFetch<ApiBrand>(`/brands/boutique/${encodeURIComponent(boutiqueId)}`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  /** Marques publiques d'une boutique (vitrine, avec comptage produits actifs) */
  publicBySlug(slug: string) {
    return apiFetch<
      Array<ApiBrand & { _count: { products: number } }>
    >(`/brands/public/${encodeURIComponent(slug)}`);
  },
};
