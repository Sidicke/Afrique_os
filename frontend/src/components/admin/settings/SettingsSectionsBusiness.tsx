"use client";

import {
  NumberInput,
  SectionShell,
  SettingRow,
  Toggle,
  useDraft,
  type SettingsSectionProps,
} from "./SettingsBits";

/** Abonnements — essais gratuits et cycle de facturation (doc 11 §8) */
export function SubscriptionsSection({ settings, onSave }: SettingsSectionProps) {
  const { draft, patch } = useDraft(settings.subscriptions);
  return (
    <SectionShell
      title="Essais gratuits & facturation"
      description="Les plans eux-mêmes sont gérés depuis Abonnements & Revenus."
      onSave={async () => {
        await onSave("subscriptions", draft);
      }}
    >
      <SettingRow
        label="Période d'essai gratuite"
        description="Offrir un essai gratuit aux nouvelles boutiques."
        checked={draft.freeTrialEnabled}
        onChange={(v) => patch({ freeTrialEnabled: v })}
      />
      <div className="flex flex-wrap items-end gap-6 rounded-xl border border-line bg-ink-50/40 px-4 py-3">
        <div className="flex items-end gap-3">
          <NumberInput value={draft.trialDays} onChange={(v) => patch({ trialDays: v })} min={1} max={60} />
          <span className="pb-2.5 text-xs text-ink-500">jours d&apos;essai</span>
        </div>
      </div>
      <SettingRow
        label="Facturation annuelle"
        description="Proposer le cycle annuel en plus du cycle mensuel."
        checked={draft.allowYearlyBilling}
        onChange={(v) => patch({ allowYearlyBilling: v })}
      />
      <SettingRow
        label="Alerte avant changement de plan"
        description="Prévenir les boutiques avant tout changement de plan de la plateforme."
        checked={draft.warnOnPlanChange}
        onChange={(v) => patch({ warnOnPlanChange: v })}
      />
    </SectionShell>
  );
}

/** Catalogue — catégories globales et visibilité des produits (doc 11 §9) */
export function CatalogSection({ settings, onSave }: SettingsSectionProps) {
  const { draft, patch } = useDraft(settings.catalog);
  return (
    <SectionShell
      title="Catalogue & catégories"
      description="Organisation globale du catalogue de la plateforme."
      onSave={async () => {
        await onSave("catalog", draft);
      }}
    >
      <SettingRow
        label="Masquer les produits des boutiques suspendues"
        description="Les produits d'une boutique suspendue disparaissent du catalogue public."
        checked={draft.hideSuspendedStoreProducts}
        onChange={(v) => patch({ hideSuspendedStoreProducts: v })}
      />
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-500">
          Catégories plateforme
        </p>
        <p className="mt-0.5 text-xs text-ink-400">
          Une catégorie désactivée reste visible sur les boutiques existantes mais n&apos;est plus proposée aux nouveaux produits.
        </p>
        <div className="mt-2 space-y-2">
          {draft.categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-line bg-ink-50/40 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink-950">{cat.name}</p>
                <p className="truncate text-xs text-ink-500">
                  {cat.description ?? "-"} · {cat.productsCount.toLocaleString("fr-FR")} produits
                </p>
              </div>
              <Toggle
                checked={cat.active}
                onChange={(v) =>
                  patch({ categories: draft.categories.map((c) => (c.id === cat.id ? { ...c, active: v } : c)) })
                }
                ariaLabel={`${cat.name} active`}
              />
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

/** Notifications — communications système et alertes admin (doc 11 §11) */
export function NotificationsSection({ settings, onSave }: SettingsSectionProps) {
  const { draft, patch } = useDraft(settings.notifications);
  return (
    <SectionShell
      title="Notifications"
      description="Communications envoyées aux utilisateurs et alertes visibles par les administrateurs."
      onSave={async () => {
        await onSave("notifications", draft);
      }}
    >
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-500">
          Notifications système
        </p>
        <div className="mt-2 space-y-2">
          {draft.system.map((n) => (
            <SettingRow
              key={n.id}
              label={n.label}
              description={n.description}
              checked={n.enabled}
              onChange={(v) =>
                patch({ system: draft.system.map((x) => (x.id === n.id ? { ...x, enabled: v } : x)) })
              }
            />
          ))}
        </div>
      </div>
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-500">
          Alertes administrateurs
        </p>
        <p className="mt-0.5 text-xs text-ink-400">
          Ces alertes restent ciblées pour éviter toute avalanche de notifications.
        </p>
        <div className="mt-2 space-y-2">
          {draft.adminAlerts.map((n) => (
            <SettingRow
              key={n.id}
              label={n.label}
              description={n.description}
              checked={n.enabled}
              onChange={(v) =>
                patch({ adminAlerts: draft.adminAlerts.map((x) => (x.id === n.id ? { ...x, enabled: v } : x)) })
              }
            />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
