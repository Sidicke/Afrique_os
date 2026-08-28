"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { Icon } from "@/components/dashboard/icons";
import { cn } from "@/lib/utils";
import type { AdminPlatformSettings, AdminSettingsSection } from "@/types/admin";

/** Props communes à toutes les sections de paramètres */
export interface SettingsSectionProps {
  settings: AdminPlatformSettings;
  onSave: (section: AdminSettingsSection, patch: unknown) => Promise<unknown>;
}

/* ———————————————————————————————— Interrupteur ———————————————————————————————— */

export function Toggle({
  checked,
  onChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-blue-700" : "bg-ink-200"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200",
          checked ? "left-[22px]" : "left-0.5"
        )}
      />
    </button>
  );
}

/* ———————————————————————————————— Champs ———————————————————————————————— */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-600">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-xs leading-relaxed text-ink-400">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 placeholder-ink-400 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100";

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** "text" | "password" | "email"… — le mot de passe reste masqué */
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={cn(inputClass, "resize-y")}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        // Champ vidé → on conserve la valeur (évite le saut à 0)
        if (e.target.value === "") return;
        onChange(Number(e.target.value));
      }}
      className={cn(inputClass, "w-28")}
    />
  );
}

export function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, "cursor-pointer")}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ———————————————————————————————— Ligne réglable (toggle + texte) ———————————————————————————————— */

export function SettingRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-ink-50/40 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-950">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} ariaLabel={label} />
    </div>
  );
}

/* ———————————————————————————————— Coquille de section + barre de sauvegarde ———————————————————————————————— */

interface SectionShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSave: () => Promise<void>;
  /** Message affiché avant de confirmer (actions sensibles, doc 11 §15) */
  confirm?: string;
  /** Style du bouton : danger (rouge) pour les réglages critiques */
  danger?: boolean;
}

export function SectionShell({ title, description, children, onSave, confirm, danger }: SectionShellProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nettoyage du feedback « enregistré » si la section est démontée
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const doSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave();
      setSaved(true);
      timerRef.current = setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer ces modifications.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardCard className="p-6">
      <CardHeader title={title} subtitle={description} />

      <div className="mt-5 space-y-4">{children}</div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        {confirmOpen ? (
          <>
            <p className="flex items-center gap-2 text-xs font-medium text-amber-700">
              <Icon name="alert" size={14} className="shrink-0" />
              {confirm}
            </p>
            <button
              onClick={() => void doSave()}
              disabled={saving}
              className={cn(
                "cursor-pointer rounded-xl px-4 py-2 font-mono text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50",
                danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-700 hover:bg-blue-800"
              )}
            >
              {saving ? "Enregistrement…" : "Confirmer"}
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              className="cursor-pointer rounded-xl border border-line bg-surface px-4 py-2 font-mono text-xs font-semibold text-ink-600 transition-colors hover:text-ink-950"
            >
              Annuler
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => (confirm ? setConfirmOpen(true) : void doSave())}
              disabled={saving}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50",
                danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-700 hover:bg-blue-800"
              )}
            >
              <Icon name="check" size={13} strokeWidth={2.2} />
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                <Icon name="checkCircle" size={14} /> Modifications enregistrées
              </span>
            )}
            {error && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                <Icon name="alert" size={14} className="shrink-0" /> {error}
              </span>
            )}
            {confirm && !saved && !error && (
              <span className="text-xs text-ink-400">Cette modification sera confirmée avant application.</span>
            )}
          </>
        )}
      </div>
    </DashboardCard>
  );
}

/**
 * Petit hook local de brouillon — fusionne les modifications avant sauvegarde.
 * `patch` remplace intégralement un tableau (ex. liste des administrateurs)
 * et fusionne un objet partiel (ex. section de paramètres).
 */
export function useDraft<T>(initial: T) {
  const [draft, setDraft] = useState<T>(initial);
  const patch = (p: Partial<T>) =>
    setDraft((d) =>
      Array.isArray(p) ? (p as T) : ({ ...d, ...p } as T)
    );
  const replace = (v: T) => setDraft(v);
  return { draft, patch, replace };
}
