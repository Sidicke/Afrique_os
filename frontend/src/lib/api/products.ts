/**
 * Couche API — Produits (dashboard vendeur)
 */

import { apiFetch } from "./http";
import type { ApiProduct } from "./types";

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  oldPrice?: number;
  stock?: number;
  sku?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  categoryId?: string;
  /** Id de la marque du produit (facultatif) */
  brandId?: string;
  images?: string[];
  variants?: Array<{
    name: string;
    value: string;
    priceDelta?: number;
    stock?: number;
  }>;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export const productsApi = {
  /** Produits d'une boutique (admin) */
  list(boutiqueId: string) {
    return apiFetch<ApiProduct[]>(
      `/products/boutique/${encodeURIComponent(boutiqueId)}`,
    );
  },

  create(boutiqueId: string, input: CreateProductInput) {
    return apiFetch<ApiProduct>(`/products/boutique/${encodeURIComponent(boutiqueId)}`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  update(boutiqueId: string, id: string, input: UpdateProductInput) {
    return apiFetch<ApiProduct>(
      `/products/boutique/${encodeURIComponent(boutiqueId)}/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
  },

  remove(boutiqueId: string, id: string) {
    return apiFetch<{ success: boolean }>(
      `/products/boutique/${encodeURIComponent(boutiqueId)}/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  },
};
