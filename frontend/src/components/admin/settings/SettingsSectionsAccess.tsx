"use client";

import { Icon } from "@/components/dashboard/icons";
import {
  Field,
  NumberInput,
  SectionShell,
  SelectInput,
  SettingRow,
  Toggle,
  useDraft,
  type SettingsSectionProps,
} from "./SettingsBits";

/** Utilisateurs & rôles — rôles de la plateforme et permissions (doc 11 §10) */
export function RolesSection({ settings, onSave }: SettingsSectionProps) {
  const { draft, patch } = useDraft(settings.roles);
  return (
    <SectionShell
      title="Utilisateurs & rôles"
      description="Client, vendeur et administrateur restent séparés pour éviter toute modification accidentelle des permissions critiques."
      onSave={async () => {
        await onSave("roles", draft);
      }}
    >
      <div className="flex flex-wrap items-end gap-6 rounded-xl border border-line bg-ink-50/40 px-4 py-3">
        <Field label="Rôle par défaut d'un nouveau compte">
          <SelectInput
            value={draft.defaultNewUserRole}
            onChange={(v) => patch({ defaultNewUserRole: v })}
            options={[
              { value: "CLIENT", label: "Client" },
              { value: "VENDEUR", label: "Vendeur" },
            ]}
          />
        </Field>
      </div>
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-500">
          Rôles administratifs
        </p>
        <div className="mt-2 space-y-2">
          {draft.roles.map((role) => (
            <div key={role.id} className="rounded-xl border border-line bg-ink-50/40 px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-ink-950">{role.name}</p>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-mono text-[9px] font-semibold text-blue-700">
                  {role.permissions.includes("*") ? "Tout accès" : `${role.permissions.length} permissions`}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{role.description}</p>
              {!role.permissions.includes("*") && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {role.permissions.map((p) => (
                    <span
                      key={p}
                      className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-[9px] text-ink-500"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
          <Icon name="lock" size={12} className="shrink-0" />
          La modification des permissions détaillées est réservée au backend RBAC.
        </p>
      </div>
    </SectionShell>
  );
}

/** Sécurité — règles globales de connexion et d'accès (doc 11 §12) — action sensible */
export function SecuritySection({ settings, onSave }: SettingsSectionProps) {
  const { draft, patch } = useDraft(settings.security);
  return (
    <SectionShell
      title="Sécurité"
      description="Règles de connexion, sessions et confirmation des actions sensibles."
      confirm="Appliquer ces règles de sécurité à toute la plateforme ? Les comptes actifs en seront affectés."
      danger
      onSave={async () => {
        await onSave("security", draft);
      }}
    >
      <div className="flex flex-wrap items-end gap-6 rounded-xl border border-red-100 bg-red-100/40 px-4 py-3">
        <Field label="Longueur minimale du mot de passe">
          <NumberInput value={draft.passwordMinLength} onChange={(v) => patch({ passwordMinLength: v })} min={6} max={32} />
        </Field>
        <Field label="Tentatives de connexion avant blocage">
          <NumberInput value={draft.maxLoginAttempts} onChange={(v) => patch({ maxLoginAttempts: v })} min={3} max={10} />
        </Field>
        <Field label="Expiration des sessions (heures)">
          <NumberInput value={draft.sessionTimeoutHours} onChange={(v) => patch({ sessionTimeoutHours: v })} min={1} max={720} />
        </Field>
      </div>
      <SettingRow
        label="Confirmation des actions sensibles"
        description="Exiger une confirmation explicite pour les actions critiques des administrateurs."
        checked={draft.requireConfirmationSensitive}
        onChange={(v) => patch({ requireConfirmationSensitive: v })}
      />
      <SettingRow
        label="Double authentification pour les administrateurs"
        description="Exiger la 2FA pour tout accès au dashboard administrateur."
        checked={draft.twoFactorForAdmins}
        onChange={(v) => patch({ twoFactorForAdmins: v })}
      />
    </SectionShell>
  );
}

/** Administrateurs — gestion des accès administratifs (doc 11 §13) — action sensible */
export function AdminsSection({ settings, onSave }: SettingsSectionProps) {
  const { draft, patch } = useDraft(settings.admins);
  return (
    <SectionShell
      title="Administrateurs"
      description="Gestion des accès au dashboard selon le principe du moindre privilège."
      confirm="La désactivation d'un accès administratif est une action sensible. Confirmer ?"
      onSave={async () => {
        await onSave("admins", draft);
      }}
    >
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-xs text-ink-700">
          <thead className="border-b border-line bg-ink-50/60 font-mono text-[10px] uppercase tracking-wider text-ink-500">
            <tr>
              <th className="px-4 py-3">ADMINISTRATEUR</th>
              <th className="px-4 py-3">RÔLE</th>
              <th className="hidden px-4 py-3 sm:table-cell">DERNIÈRE ACTIVITÉ</th>
              <th className="px-4 py-3 text-right">ACCÈS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {draft.map((a) => (
              <tr key={a.id} className="transition-colors hover:bg-ink-50/50">
                <td className="px-4 py-3.5">
                  <p className="font-medium text-ink-950">{a.name}</p>
                  <p className="font-mono text-[10px] text-ink-400">{a.email}</p>
                </td>
                <td className="px-4 py-3.5 text-ink-600">{a.role}</td>
                <td className="hidden px-4 py-3.5 font-mono text-xs text-ink-500 sm:table-cell">
                  {a.lastActiveAt ? new Date(a.lastActiveAt).toLocaleDateString("fr-FR") : "-"}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <Toggle
                    checked={a.active}
                    onChange={(v) =>
                      patch(draft.map((x) => (x.id === a.id ? { ...x, active: v } : x)))
                    }
                    ariaLabel={`Accès de ${a.name}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-ink-400">
        <Icon name="key" size={12} className="shrink-0" />
        L&apos;ajout d&apos;un administrateur se fait par invitation, selon le principe du moindre privilège.
      </p>
    </SectionShell>
  );
}
