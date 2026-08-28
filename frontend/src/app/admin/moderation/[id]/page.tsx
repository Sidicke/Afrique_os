"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { adminService } from "@/services/adminService";
import { useSession } from "@/lib/useSession";
import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { ModerationDetail } from "@/components/admin/moderation/ModerationDetail";
import type { AdminModerationCase } from "@/types/admin";

/**
 * Détail d'un signalement (doc 10) — charge le dossier par id puis conserve
 * l'état local après chaque décision / note (mise à jour confirmée par le
 * service, jamais inventée).
 */
export default function ModerationCasePage() {
  const params = useParams<{ id: string }>();
  const caseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const session = useSession();
  const adminName = session?.user?.name ?? "Admin";

  const [caseData, setCaseData] = useState<AdminModerationCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const found = await adminService.getModerationCase(caseId);
      setCaseData(found);
      setError(null);
    } catch {
      setError("Impossible de charger ce signalement.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  // Chargement différé : aucun setState synchrone dans l'effet
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      {loading ? (
        <ModerationDetailSkeleton />
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
      ) : !caseData ? (
        <DashboardCard className="flex flex-col items-center gap-3 p-10 text-center">
          <Icon name="shield" size={28} className="text-ink-300" />
          <p className="font-display text-base font-semibold text-ink-950">Signalement introuvable</p>
          <p className="max-w-sm text-sm text-ink-500">
            Ce signalement n&apos;existe pas ou a été archivé.
          </p>
          <Link
            href="/admin/moderation"
            className="rounded-xl border border-line px-4 py-2 font-mono text-xs font-semibold text-ink-600 transition-colors hover:border-gold-mid hover:text-gold-strong"
          >
            ← Retour à la modération
          </Link>
        </DashboardCard>
      ) : (
        <ModerationDetail
          key={caseData.id}
          caseData={caseData}
          adminName={adminName}
          onUpdated={setCaseData}
        />
      )}
    </div>
  );
}

function ModerationDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <DashboardCard key={i} className="p-6">
            <Skeleton className="h-4 w-40" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </DashboardCard>
        ))}
      </div>
      <DashboardCard className="p-6">
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32 rounded-xl" />
          ))}
        </div>
      </DashboardCard>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <DashboardCard key={i} className="p-6">
            <Skeleton className="h-4 w-36" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-14 w-full" />
              ))}
            </div>
          </DashboardCard>
        ))}
      </div>
    </div>
  );
}
