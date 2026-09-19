"use client";

import { useCallback, useState } from "react";
import { useAsyncResource } from "./useAsyncResource";
import { shopsApi, dashboardApi } from "@/lib/api";
import { toOverview } from "@/lib/api/mappers";

export function useMultiAnalytics() {
  const fetcher = useCallback(async () => {
    const shops = await shopsApi.myShops();
    
    // Fetch stats for all shops in parallel
    const results = await Promise.all(
      shops.map(async (shop) => {
        try {
          const apiOverview = await dashboardApi.overview(shop.id);
          // We don't strictly need products/orders for the high level KPIs, we can mock them here for the mapper
          const overview = toOverview(apiOverview, [], []);
          return { shop, overview };
        } catch {
          return null;
        }
      })
    );

    const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null);

    let totalRevenue = 0;
    let totalOrders = 0;
    
    const storeRevenues = validResults.map((r, i) => {
      const revenue = r.overview.kpis.revenue.rawNumber;
      const orders = r.overview.kpis.orders.rawNumber;
      totalRevenue += revenue;
      totalOrders += orders;
      
      const colors = ["bg-blue-700", "bg-gold-strong", "bg-green-600", "bg-purple-600", "bg-terracotta"];
      
      return {
        storeId: r.shop.id,
        storeName: r.shop.name,
        revenue,
        orders,
        growth: r.overview.kpis.revenue.changePercent,
        color: colors[i % colors.length]
      };
    });

    const avgBasket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      kpis: {
        totalRevenue,
        totalOrders,
        avgBasket,
        // Mock a positive trend based on aggregated data (could be calculated precisely if we had historic data)
        revenueGrowth: storeRevenues.reduce((acc, s) => acc + s.growth, 0) / (storeRevenues.length || 1),
      },
      storeRevenues,
    };
  }, []);

  return useAsyncResource(fetcher, "Impossible de charger l'analytique multi-boutique.");
}
