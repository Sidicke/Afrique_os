"use client";

import { useCallback } from "react";
import { Order, OrderStatus } from "@/types/dashboard";
import { dashboardService } from "@/services/dashboardService";
import { useAsyncResource } from "@/hooks/useAsyncResource";

/** Données commandes — prêt à être branché sur l'API réelle sans toucher aux composants */
export function useOrders() {
  const { setData, ...resource } = useAsyncResource<Order[]>(
    useCallback(() => dashboardService.getOrders(), []),
    "Impossible de charger les commandes."
  );

  const updateStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      const ok = await dashboardService.updateOrderStatus(orderId, status);
      if (ok) {
        setData((prev) =>
          prev ? prev.map((o) => (o.id === orderId ? { ...o, status } : o)) : prev
        );
      }
      return ok;
    },
    [setData]
  );

  const addOrder = useCallback(
    async (input: {
      customerName: string;
      customerPhone: string;
      city: string;
      country: string;
      productName: string;
      quantity: number;
      totalPriceFcfa: number;
      paymentMethod: Order["paymentMethod"];
    }) => {
      const created = await dashboardService.createOrder(input);
      setData((prev) => (prev ? [created, ...prev] : [created]));
      return created;
    },
    [setData]
  );

  return { ...resource, setData, updateStatus, addOrder };
}
