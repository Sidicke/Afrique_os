"use client";

import { useState } from "react";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { SettingsNav } from "@/components/admin/settings/SettingsNav";
import { GeneralSection, OrdersSection, StoresSection, VerificationSection } from "@/components/admin/settings/SettingsSectionsPlatform";
import { CatalogSection, NotificationsSection, SubscriptionsSection } from "@/components/admin/settings/SettingsSectionsBusiness";
import { AdminsSection, RolesSection, SecuritySection } from "@/components/admin/settings/SettingsSectionsAccess";
import type { AdminSettingsSection } from "@/types/admin";

/**
 * Platform Settings (doc 11) — le centre de configuration de l'écosystème.
 * Chaque section modifie des règles globales ; les réglages sensibles
 * (sécurité, administrateurs) demandent une confirmation explicite.
 */
export default function SettingsPage() {
  const { data, loading, error, refresh, updateSection } = useAdminSettings();
  const [active, setActive] = useState<AdminSettingsSection>("general");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Configuration"
        title="Paramètres"
        description="Règles globales de la plateforme : boutiques, vérification, commandes, sécurité."
        actions={
          <button
            onClick={refresh}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-700 shadow-sm transition-all hover:border-gold-mid hover:text-gold-strong active:scale-95"
          >
            <Icon name="refresh" size={14} /> Actualiser
          </button>
        }
      />


      {loading || !data ? (
        <SettingsSkeleton />
      ) : error ? (
        <DashboardCard className="flex flex-col items-center gap-3 p-10 text-center">
          <Icon name="alert" size={28} className="text-red-600" />
          <p className="text-sm text-ink-700">{error}</p>
          <button
            onClick={refresh}
            className="rounded-xl border border-gold-soft px-4 py-2 font-mono text-xs text-gold-strong hover:bg-gold-wash"
          >
            Réessayer
          </button>
        </DashboardCard>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Sous-navigation (doc 11 §3) */}
          <SettingsNav active={active} onChange={setActive} />

          {/* Contenu de la section active */}
          <div className="min-w-0 flex-1 space-y-6">
            <p className="font-mono text-[10px] text-ink-400">
              Dernière modification :{" "}
              {new Date(data.updatedAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              par {data.updatedBy}
            </p>

            {active === "general" && <GeneralSection settings={data.settings} onSave={updateSection} />}
            {active === "stores" && <StoresSection settings={data.settings} onSave={updateSection} />}
            {active === "verification" && <VerificationSection settings={data.settings} onSave={updateSection} />}
            {active === "orders" && <OrdersSection settings={data.settings} onSave={updateSection} />}
            {active === "subscriptions" && <SubscriptionsSection settings={data.settings} onSave={updateSection} />}
            {active === "catalog" && <CatalogSection settings={data.settings} onSave={updateSection} />}
            {active === "roles" && <RolesSection settings={data.settings} onSave={updateSection} />}
            {active === "notifications" && <NotificationsSection settings={data.settings} onSave={updateSection} />}
            {active === "security" && <SecuritySection settings={data.settings} onSave={updateSection} />}
            {active === "admins" && <AdminsSection settings={data.settings} onSave={updateSection} />}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="hidden w-64 shrink-0 space-y-1.5 lg:block">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
      </div>
      <div className="min-w-0 flex-1 space-y-4">
        <Skeleton className="h-6 w-48" />
        <DashboardCard className="p-6">
          <Skeleton className="h-4 w-40" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </DashboardCard>
        <DashboardCard className="p-6">
          <Skeleton className="h-4 w-32" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
