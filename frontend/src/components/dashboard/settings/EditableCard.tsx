"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { Icon } from "@/components/dashboard/icons";
import { SaveButton } from "./SaveButton";

/**
 * Carte « afficher → modifier → enregistrer ».
 *
 * Par défaut, la valeur actuelle est affichée en lecture seule. Le formulaire
 * (children) n'apparaît qu'au clic sur « Modifier », avec Annuler / Enregistrer.
 * `onCancel` restaure les valeurs (généralement reset() du hook de formulaire).
 */
export function EditableCard({
  title,
  subtitle,
  view,
  children,
  onSave,
  onCancel,
  saving = false,
  editLabel = "Modifier",
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Aperçu des valeurs actuelles (mode lecture) */
  view: React.ReactNode;
  /** Formulaire de modification — masqué tant que l'on n'édite pas */
  children: React.ReactNode;
  /** Appelé au clic sur « Enregistrer » — false = échec (on reste en édition) */
  onSave: () => void | Promise<boolean>;
  /** Restaure les valeurs avant édition (bouton « Annuler ») */
  onCancel?: () => void;
  saving?: boolean;
  editLabel?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);

  const handleSave = async () => {
    const ok = await onSave();
    if (ok === false) return; // échec : on reste en édition pour réessayer
    setEditing(false);
  };
  const handleCancel = () => {
    onCancel?.();
    setEditing(false);
  };

  return (
    <DashboardCard className={cn("p-6", className)}>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          editing ? (
            <span className="flex items-center gap-1.5 rounded-full border border-gold-soft bg-gold-wash px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-gold-strong">
              <Icon name="edit" size={12} />
              Mode édition
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm transition-all hover:border-gold-soft hover:bg-gold-wash hover:text-gold-strong active:scale-95"
            >
              <Icon name="edit" size={13} />
              {editLabel}
            </button>
          )
        }
      />
      {editing ? (
        <>
          <div className="mt-5">{children}</div>
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-5">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="cursor-pointer rounded-xl border border-line px-4 py-2 text-xs font-medium text-ink-600 transition-colors hover:text-ink-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Annuler
            </button>
            <SaveButton saving={saving} label="Enregistrer" onClick={handleSave} />
          </div>
        </>
      ) : (
        <div className="mt-5">{view}</div>
      )}
    </DashboardCard>
  );
}

/**
 * Affichage lecture seule d'une valeur de configuration — le pendant « affiché »
 * du champ de formulaire. Vide → mention « Non renseigné ».
 */
export function ReadField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
        {label}
      </span>
      <div className="rounded-xl border border-line bg-ink-50/50 px-3.5 py-2.5 text-sm text-ink-950">
        {value ? (
          value
        ) : (
          <span className="italic text-ink-300">Non renseigné</span>
        )}
      </div>
    </div>
  );
}
