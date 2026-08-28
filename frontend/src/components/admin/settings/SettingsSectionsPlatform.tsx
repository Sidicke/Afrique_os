"use client";

import {
  Field,
  NumberInput,
  SectionShell,
  SelectInput,
  SettingRow,
  TextArea,
  TextInput,
  Toggle,
  useDraft,
  type SettingsSectionProps,
} from "./SettingsBits";

/** Général — identité et contacts de la plateforme (doc 11 §4) */
export function GeneralSection({ settings, onSave }: SettingsSectionProps) {
  const { draft, patch } = useDraft(settings.general);
  return (
    <SectionShell
      title="Informations de la plateforme"
      description="Identité et coordonnées officielles utilisées dans les communications."
      onSave={async () => {
        await onSave("general", draft);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom de la plateforme">
          <TextInput value={draft.platformName} onChange={(v) => patch({ platformName: v })} />
        </Field>
        <Field label="Email officiel">
          <TextInput value={draft.supportEmail} onChange={(v) => patch({ supportEmail: v })} />
        </Field>
        <Field label="Téléphone de contact">
          <TextInput value={draft.contactPhone} onChange={(v) => patch({ contactPhone: v })} />
        </Field>
      </div>
      <Field label="Description courte" hint="Affichée dans les communications officielles et les documents de la plateforme.">
        <TextArea value={draft.description} onChange={(v) => patch({ description: v })} rows={2} />
      </Field>
    </SectionShell>
  );
}

/** Boutiques — règles générales applicables aux vendeurs (doc 11 §5) */
export function StoresSection({ settings, onSave }: SettingsSectionProps) {
  const { draft, patch } = useDraft(settings.stores);
  return (
    <SectionShell
      title="Règles des boutiques"
      description="Création, visibilité et cycle de vie des boutiques de la plateforme."
      onSave={async () => {
        await onSave("stores", draft);
      }}
    >
      <SettingRow
        label="Création de boutique par les vendeurs"
        description="Autoriser un vendeur à créer une boutique depuis son espace."
        checked={draft.allowVendorCreation}
        onChange={(v) => patch({ allowVendorCreation: v })}
      />
      <div className="flex flex-wrap items-end gap-6 rounded-xl border border-line bg-ink-50/40 px-4 py-3">
        <Field label="Boutiques max. par vendeur">
          <NumberInput value={draft.maxStoresPerVendor} onChange={(v) => patch({ maxStoresPerVendor: v })} min={1} max={20} />
        </Field>
        <Field label="Statut initial d'une nouvelle boutique">
          <SelectInput
            value={draft.newStoreStatus}
            onChange={(v) => patch({ newStoreStatus: v })}
            options={[
              { value: "PENDING", label: "En attente (PENDING)" },
              { value: "ACTIVE", label: "Active (ACTIVE)" },
            ]}
          />
        </Field>
        <Field label="Visibilité publique">
          <SelectInput
            value={draft.publicVisibility}
            onChange={(v) => patch({ publicVisibility: v as "active" | "active_verified" })}
            options={[
              { value: "active", label: "Toute boutique active" },
              { value: "active_verified", label: "Boutiques actives et vérifiées" },
            ]}
          />
        </Field>
      </div>
      <SettingRow
        label="Suspension automatique en cas de violation"
        description="Appliquer automatiquement une suspension temporaire sur violation avérée des règles."
        checked={draft.autoSuspendOnViolation}
        onChange={(v) => patch({ autoSuspendOnViolation: v })}
      />
    </SectionShell>
  );
}

/** Vérification — règles du processus KYC (doc 11 §6) */
export function VerificationSection({ settings, onSave }: SettingsSectionProps) {
  const { draft, patch } = useDraft(settings.verification);
  return (
    <SectionShell
      title="Processus de vérification"
      description="Règles générales du contrôle des vendeurs. La décision finale reste manuelle."
      onSave={async () => {
        await onSave("verification", draft);
      }}
    >
      <SettingRow
        label="Vérification obligatoire"
        description="Tout vendeur doit être vérifié pour fonctionner sur la plateforme."
        checked={draft.verificationRequired}
        onChange={(v) => patch({ verificationRequired: v })}
      />
      <SettingRow
        label="Publication avant validation"
        description="Permettre à une boutique d'être publiée avant la fin de sa vérification."
        checked={draft.allowPublishBeforeVerified}
        onChange={(v) => patch({ allowPublishBeforeVerified: v })}
      />
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-500">
          Documents exigés
        </p>
        <div className="mt-2 space-y-2">
          {draft.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-ink-50/40 px-4 py-3">
              <p className="text-xs font-medium text-ink-800">{doc.label}</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-ink-400">Obligatoire</span>
                <Toggle
                  checked={doc.required}
                  onChange={(v) =>
                    patch({ documents: draft.documents.map((d) => (d.id === doc.id ? { ...d, required: v } : d)) })
                  }
                  ariaLabel={`${doc.label} obligatoire`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

/** Commandes — règles globales du cycle de commande (doc 11 §7) */
export function OrdersSection({ settings, onSave }: SettingsSectionProps) {
  const { draft, patch } = useDraft(settings.orders);
  return (
    <SectionShell
      title="Règles des commandes"
      description="Le client peut toujours commander sans compte. Ces règles encadrent les autres cas."
      onSave={async () => {
        await onSave("orders", draft);
      }}
    >
      <SettingRow
        label="Commande sans compte (visiteur)"
        description="Un visiteur peut commander sans créer de compte, conformément au principe central de la plateforme."
        checked={draft.guestCheckoutEnabled}
        onChange={(v) => patch({ guestCheckoutEnabled: v })}
      />
      <div className="flex flex-wrap items-end gap-6 rounded-xl border border-line bg-ink-50/40 px-4 py-3">
        <Field label="Annulation automatique après (jours)" hint="Sans paiement confirmé dans ce délai, la commande est annulée.">
          <NumberInput value={draft.autoCancelAfterDays} onChange={(v) => patch({ autoCancelAfterDays: v })} min={1} max={90} />
        </Field>
      </div>
      <SettingRow
        label="Motif d'annulation obligatoire"
        description="Exiger une raison avant d'autoriser l'annulation d'une commande."
        checked={draft.cancellationReasonRequired}
        onChange={(v) => patch({ cancellationReasonRequired: v })}
      />
      <SettingRow
        label="Confirmation admin pour changement de statut"
        description="Un administrateur doit confirmer les changements de statut sensibles."
        checked={draft.requireAdminConfirmStatus}
        onChange={(v) => patch({ requireAdminConfirmStatus: v })}
      />
    </SectionShell>
  );
}
