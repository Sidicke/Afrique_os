/**
 * Couche API — Catégories (dashboard vendeur)
 */

import { apiFetch } from "./http";
import type { ApiCategory } from "./types";

export const categoriesApi = {
  list(boutiqueId: string) {
    return apiFetch<ApiCategory[]>(
      `/categories/boutique/${encodeURIComponent(boutiqueId)}`,
    );
  },

  create(boutiqueId: string, name: string) {
    return apiFetch<ApiCategory>(`/categories/boutique/${encodeURIComponent(boutiqueId)}`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  update(boutiqueId: string, id: string, name: string) {
    return apiFetch<ApiCategory>(
      `/categories/boutique/${encodeURIComponent(boutiqueId)}/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify({ name }) },
    );
  },

  remove(boutiqueId: string, id: string) {
    return apiFetch<{ success: boolean }>(
      `/categories/boutique/${encodeURIComponent(boutiqueId)}/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  },
};
