"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { adminService } from "@/services/adminService";
import { useSession } from "@/lib/useSession";
import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { OrderDetail } from "@/components/admin/orders/OrderDetail";
import type { AdminOrderDetail } from "@/types/admin";

/**
 * Détail d'une commande (doc 07) — charge le détail par id puis conserve
 * l'état local après chaque action administrative / note (mise à jour
 * confirmée par le service, jamais inventée).
 */
export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;
  const session = useSession();
  const adminName = session?.user?.name ?? "Admin";

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const found = await adminService.getOrder(orderId);
      setOrder(found);
      setError(null);
    } catch {
      setError("Impossible de charger cette commande.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Chargement différé : aucun setState synchrone dans l'effet
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      {loading ? (
        <OrderDetailSkeleton />
      ) : error ? (
        <DashboardCard className="flex flex-col items-center gap-3 p-10 text-center">
          <Icon name="alert" size={28} className="text-red-600" />
          <p className="text-sm text-ink-700">{error}</p>
          <button
            onClick={() => void load()}
            className="rounded-xl border border-gold-soft px-4 py-2 font-mono text-xs text-gold-strong hover:bg-gold-wash"
          >
            Réessayer
          </button>
        </DashboardCard>
      ) : !order ? (
        <DashboardCard className="flex flex-col items-center gap-3 p-10 text-center">
          <Icon name="orders" size={28} className="text-ink-300" />
          <p className="font-display text-base font-semibold text-ink-950">Commande introuvable</p>
          <p className="max-w-sm text-sm text-ink-500">
            Cette commande n&apos;existe pas ou a été retirée de la plateforme.
          </p>
          <Link
            href="/admin/orders"
            className="rounded-xl border border-line px-4 py-2 font-mono text-xs font-semibold text-ink-600 transition-colors hover:border-gold-mid hover:text-gold-strong"
          >
            ← Retour aux commandes
          </Link>
        </DashboardCard>
      ) : (
        <OrderDetail
            key={order.id}
            order={order}
            adminName={adminName}
            onUpdated={setOrder}
          />
      )}
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <DashboardCard key={i} className="p-6">
            <Skeleton className="h-4 w-28" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
          </DashboardCard>
        ))}
      </div>
      <DashboardCard className="p-6">
        <Skeleton className="h-4 w-28" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </DashboardCard>
      <DashboardCard className="p-6">
        <Skeleton className="h-4 w-36" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
