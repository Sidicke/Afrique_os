/**
 * Couche API — Dashboard vendeur
 */

import { apiFetch } from "./http";
import type { ApiCustomer, ApiOverview, ApiStats } from "./types";

export type StatsPeriod = "7_days" | "30_days" | "this_year";

export const dashboardApi = {
  /** Vue d'ensemble (KPIs du mois) */
  overview(boutiqueId: string) {
    return apiFetch<ApiOverview>(
      `/dashboard/boutique/${encodeURIComponent(boutiqueId)}/overview`,
    );
  },

  /** Statistiques par période */
  stats(boutiqueId: string, period: StatsPeriod = "30_days") {
    return apiFetch<ApiStats>(
      `/dashboard/boutique/${encodeURIComponent(boutiqueId)}/stats?period=${period}`,
    );
  },

  /** Clients dérivés des commandes */
  customers(boutiqueId: string) {
    return apiFetch<ApiCustomer[]>(
      `/dashboard/boutique/${encodeURIComponent(boutiqueId)}/customers`,
    );
  },
};
