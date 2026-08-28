"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { adminService } from "@/services/adminService";
import { useSession } from "@/lib/useSession";
import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { SubscriptionDetail } from "@/components/admin/subscriptions/SubscriptionDetail";
import { useAdminSubscriptions } from "@/hooks/useAdminSubscriptions";
import type { AdminSubscriptionDetail } from "@/types/admin";

/**
 * Détail d'un abonnement (doc 08) — charge le détail par id puis conserve
 * l'état local après chaque action administrative (mise à jour confirmée
 * par le service, jamais inventée).
 */
export default function SubscriptionDetailPage() {
  const params = useParams<{ id: string }>();
  const subId = Array.isArray(params.id) ? params.id[0] : params.id;
  const session = useSession();
  const adminName = session?.user?.name ?? "Admin";
  // Plans disponibles (noms) pour le changement de plan — source backend (doc 08 §8)
  const { data: subsData } = useAdminSubscriptions();

  const [sub, setSub] = useState<AdminSubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!subId) return;
    setLoading(true);
    try {
      const found = await adminService.getSubscription(subId);
      setSub(found);
      setError(null);
    } catch {
      setError("Impossible de charger cet abonnement.");
    } finally {
      setLoading(false);
    }
  }, [subId]);

  // Chargement différé : aucun setState synchrone dans l'effet
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      {loading ? (
        <SubscriptionDetailSkeleton />
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
      ) : !sub ? (
        <DashboardCard className="flex flex-col items-center gap-3 p-10 text-center">
          <Icon name="wallet" size={28} className="text-ink-300" />
          <p className="font-display text-base font-semibold text-ink-950">Abonnement introuvable</p>
          <p className="max-w-sm text-sm text-ink-500">
            Cet abonnement n&apos;existe pas ou a été retiré de la plateforme.
          </p>
          <Link
            href="/admin/subscriptions"
            className="rounded-xl border border-line px-4 py-2 font-mono text-xs font-semibold text-ink-600 transition-colors hover:border-gold-mid hover:text-gold-strong"
          >
            ← Retour aux abonnements
          </Link>
        </DashboardCard>
      ) : (
        <SubscriptionDetail
          key={sub.id}
          sub={sub}
          adminName={adminName}
          planNames={subsData?.plans.map((p) => p.name) ?? [sub.plan]}
          onUpdated={setSub}
        />
      )}
    </div>
  );
}

function SubscriptionDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard className="p-6">
          <Skeleton className="h-4 w-28" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        </DashboardCard>
        <DashboardCard className="p-6">
          <Skeleton className="h-4 w-32" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        </DashboardCard>
      </div>
      <DashboardCard className="p-6">
        <Skeleton className="h-4 w-36" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </DashboardCard>
      <DashboardCard className="p-6">
        <Skeleton className="h-4 w-28" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 rounded-xl" />
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
