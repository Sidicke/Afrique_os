"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { adminService } from "@/services/adminService";
import { useSession } from "@/lib/useSession";
import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { StoreDetail } from "@/components/admin/stores/StoreDetail";
import type { AdminStoreDetail } from "@/types/admin";

/**
 * Détail d'une boutique (doc 05) — charge le détail par id puis conserve
 * l'état local après chaque action administrative / note (mise à jour
 * confirmée par le service, jamais inventée).
 */
export default function StoreDetailPage() {
  const params = useParams<{ id: string }>();
  const storeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const session = useSession();
  const adminName = session?.user?.name ?? "Admin";

  const [store, setStore] = useState<AdminStoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const found = await adminService.getStore(storeId);
      setStore(found);
      setError(null);
    } catch {
      setError("Impossible de charger cette boutique.");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  // Chargement différé : aucun setState synchrone dans l'effet
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      {loading ? (
        <StoreDetailSkeleton />
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
      ) : !store ? (
        <DashboardCard className="flex flex-col items-center gap-3 p-10 text-center">
          <Icon name="store" size={28} className="text-ink-300" />
          <p className="font-display text-base font-semibold text-ink-950">Boutique introuvable</p>
          <p className="max-w-sm text-sm text-ink-500">
            Cette boutique n&apos;existe pas ou a été retirée de la plateforme.
          </p>
          <Link
            href="/admin/stores"
            className="rounded-xl border border-line px-4 py-2 font-mono text-xs font-semibold text-ink-600 transition-colors hover:border-gold-mid hover:text-gold-strong"
          >
            ← Retour aux boutiques
          </Link>
        </DashboardCard>
      ) : (
        <StoreDetail
            key={store.id}
            store={store}
            adminName={adminName}
            onUpdated={setStore}
          />
      )}
    </div>
  );
}

function StoreDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard className="p-6">
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 flex items-center gap-3">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
        </DashboardCard>
        <DashboardCard className="p-6">
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 flex items-center gap-3">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-52" />
            </div>
          </div>
        </DashboardCard>
      </div>
      <DashboardCard className="p-6">
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </DashboardCard>
      <DashboardCard className="p-6">
        <Skeleton className="h-4 w-44" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
