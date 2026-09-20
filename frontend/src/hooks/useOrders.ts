"use client";

import { useCallback } from "react";
import { useSession } from "@/lib/useSession";

import { Order, OrderStatus } from "@/types/dashboard";
import { dashboardService } from "@/services/dashboardService";
import { useAsyncResource } from "@/hooks/useAsyncResource";

/** Données commandes — supporte la vue unifiée multi-boutiques ('all' ou boutiqueId) */
export function useOrders(targetBoutiqueId?: string) {
  const sessionBoutiqueId = useSession()?.user?.boutiqueId;
  const effectiveBoutiqueId = targetBoutiqueId ?? sessionBoutiqueId;

  const { setData, ...resource } = useAsyncResource<Order[]>(
    useCallback(() => dashboardService.getOrders(targetBoutiqueId), [effectiveBoutiqueId, targetBoutiqueId]),
    "Impossible de charger les commandes."
  );

  const updateStatus = useCallback(
    async (orderId: string, status: OrderStatus, deliveryContact?: string) => {
      const ok = await dashboardService.updateOrderStatus(orderId, status, deliveryContact);
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

  const remindPayment = useCallback(
    async (orderId: string) => {
      const ok = await dashboardService.remindPayment(orderId);
      return ok;
    },
    []
  );

  return { ...resource, setData, updateStatus, addOrder, remindPayment };
}
