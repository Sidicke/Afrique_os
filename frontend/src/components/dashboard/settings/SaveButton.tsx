"use client";

import { Icon } from "@/components/dashboard/icons";

/** Bouton d'enregistrement partagé par toutes les sections Paramètres */
export function SaveButton({
  saving,
  label = "Enregistrer les modifications",
  onClick,
}: {
  saving: boolean;
  label?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 rounded-xl bg-ink-950 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-ink-950/15 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-700/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
    >
      <Icon name="check" size={14} strokeWidth={2.2} />
      {saving ? "Enregistrement…" : label}
    </button>
  );
}

/** Squelette de chargement affiché pendant le fetch de la config */
export function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-ink-100/80" />
      <div className="h-96 animate-pulse rounded-2xl border border-line bg-surface shadow-sm" />
    </div>
  );
}
