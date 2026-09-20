/**
 * Couche API — Dashboard vendeur
 */

import { apiFetch } from "./http";
import type { ApiCustomer, ApiOverview, ApiStats } from "./types";

export type StatsPeriod = "7_days" | "30_days" | "this_year";

export interface ApiMultiStoreAnalytics {
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    avgBasket: number;
    revenueGrowth: number;
    ordersGrowth: number;
    avgBasketGrowth: number;
  };
  storeRevenues: Array<{
    storeId: string;
    storeName: string;
    revenue: number;
    orders: number;
    growth: number;
    color: string;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    storeName: string;
    revenue: number;
    units: number;
    growth: number;
    image?: string;
  }>;
  funnel: {
    initiatedOrders: number;
    confirmedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    conversionRate: number;
  };
}

export const dashboardApi = {
  /** Analytics multi-boutiques consolidés du propriétaire (100% réel BD) */
  multiStoreAnalytics(period: StatsPeriod = "30_days") {
    return apiFetch<ApiMultiStoreAnalytics>(
      `/dashboard/analytics/multi?period=${period}`,
    );
  },

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
