"use client";

import { useState } from "react";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { Modal } from "@/components/dashboard/ui/Modal";
import { Toast } from "@/components/dashboard/ui/Toast";
import { Icon } from "@/components/dashboard/icons";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { AdminPlan } from "@/types/admin";
import { adminService } from "@/services/adminService";

/**
 * Gestion des plans (doc 08 — §9/§9.1) : consulter les formules et les
 * activer / désactiver. Règle importante : désactiver un plan ne supprime
 * JAMAIS les abonnements existants — un abonnement actif peut continuer
 * sur un plan désactivé (l'admin est averti avant toute action critique).
 */
export function PlansManager({
  plans,
  onPlanUpdated,
}: {
  plans: AdminPlan[];
  onPlanUpdated: (updated: AdminPlan) => void;
}) {
  const { formatPrice } = useTranslation();
  const [target, setTarget] = useState<AdminPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleToggle = async () => {
    if (!target) return;
    setBusy(true);
    const updated = await adminService.setPlanStatus(
      target.id,
      target.status === "ACTIVE" ? "DISABLED" : "ACTIVE"
    );
    setBusy(false);
    if (updated) {
      onPlanUpdated(updated);
      setToast(
        updated.status === "ACTIVE"
          ? `Plan ${updated.name} réactivé.`
          : `Plan ${updated.name} désactivé : les abonnements existants restent conservés.`
      );
      setTarget(null);
    }
  };

  return (
    <DashboardCard className="p-6">
      <CardHeader
        title="Plans"
        subtitle="Consulter et activer / désactiver les formules"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink-50 px-2.5 py-1 font-mono text-[9px] text-ink-500">
            <Icon name="sparkle" size={11} className="text-gold-strong" />
            Désactiver ≠ supprimer les abonnements
          </span>
        }
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <div
            key={p.id}
            className={cn(
              "flex flex-col rounded-2xl border p-4 transition-all",
              p.status === "ACTIVE" ? "border-line bg-ink-50/40" : "border-dashed border-ink-200 bg-ink-50/20 opacity-80"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-sm font-semibold text-ink-950">{p.name}</p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold",
                  p.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-500"
                )}
              >
                {p.status === "ACTIVE" ? "Actif" : "Désactivé"}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-ink-500">{p.description}</p>
            <dl className="mt-3 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <dt className="text-ink-400">Mensuel</dt>
                <dd className="font-mono text-ink-700">{formatPrice(p.monthlyPriceFcfa)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-400">Annuel</dt>
                <dd className="font-mono text-ink-700">{formatPrice(p.yearlyPriceFcfa)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-400">Boutiques</dt>
                <dd className="font-mono text-ink-700">{p.subscribersCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-400">MRR</dt>
                <dd className="font-mono text-ink-700">{formatPrice(p.mrrFcfa)}</dd>
              </div>
            </dl>
            <button
              onClick={() => setTarget(p)}
              className={cn(
                "mt-3 cursor-pointer rounded-xl px-3 py-2 font-mono text-[10px] font-semibold transition-all active:scale-95",
                p.status === "ACTIVE"
                  ? "border border-ink-300 bg-surface text-ink-700 hover:border-red-400 hover:text-red-600"
                  : "bg-green-700 text-white shadow-sm shadow-green-700/20 hover:bg-green-800"
              )}
            >
              {p.status === "ACTIVE" ? "Désactiver" : "Réactiver"}
            </button>
          </div>
        ))}
      </div>

      {/* Modal de confirmation */}
      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title={
          target?.status === "ACTIVE"
            ? `Désactiver le plan ${target?.name} ?`
            : `Réactiver le plan ${target?.name} ?`
        }
        subtitle={
          target?.status === "ACTIVE"
            ? "Les nouveaux vendeurs ne pourront plus choisir ce plan."
            : "Le plan redevient disponible pour les nouveaux vendeurs."
        }
      >
        <div className="flex flex-col gap-4">
          {target?.status === "ACTIVE" && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-700">
              Les <strong>{target.subscribersCount} boutiques</strong> déjà abonnées au plan{" "}
              {target.name} <strong>ne seront pas affectées</strong> : elles conservent leur
              abonnement actif jusqu&apos;à son terme (doc 08 §9.1).
            </p>
          )}
          <div className="mt-1 flex justify-end gap-2.5">
            <button
              onClick={() => setTarget(null)}
              className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-950"
            >
              Annuler
            </button>
            <button
              onClick={handleToggle}
              disabled={busy}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50",
                target?.status === "ACTIVE" ? "bg-red-600 hover:bg-red-700" : "bg-green-700 hover:bg-green-800"
              )}
            >
              {busy
                ? "Traitement…"
                : target?.status === "ACTIVE"
                  ? "Désactiver le plan"
                  : "Réactiver le plan"}
            </button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </DashboardCard>
  );
}
