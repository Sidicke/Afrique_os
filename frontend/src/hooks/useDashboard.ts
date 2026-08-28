"use client";

import { useCallback } from "react";
import { DashboardOverviewData, NewProductDraft, OrderStatus } from "@/types/dashboard";
import { dashboardService } from "@/services/dashboardService";
import { useAsyncResource } from "@/hooks/useAsyncResource";

export function useDashboard() {
  const { data, setData, loading, error, refresh } = useAsyncResource<DashboardOverviewData>(
    useCallback(() => dashboardService.getOverview(), []),
    "Impossible de charger les données du tableau de bord."
  );

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const success = await dashboardService.updateOrderStatus(orderId, newStatus);
    if (success && data) {
      setData({
        ...data,
        recentOrders: data.recentOrders.map((ord) =>
          ord.id === orderId ? { ...ord, status: newStatus } : ord
        ),
      });
    }
    return success;
  };

  const addProduct = async (draft: NewProductDraft) => {
    const created = await dashboardService.addProduct(draft);
    if (data) {
      setData({
        ...data,
        bestSellers: [created, ...data.bestSellers],
      });
    }
    return created;
  };

  return {
    data,
    loading,
    error,
    refreshData: refresh,
    updateOrderStatus,
    addProduct,
  };
}
