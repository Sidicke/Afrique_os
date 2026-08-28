"use client";

import { cn } from "@/lib/utils";

export type AdminTone = "gold" | "blue" | "green" | "terracotta" | "ivory";

const TONE_TEXT: Record<AdminTone, string> = {
  gold: "text-gold-strong",
  blue: "text-blue-700",
  green: "text-green-700",
  terracotta: "text-red-600",
  ivory: "text-ink-950",
};

/** KPI cliquable (filtre du tableau) — état actif doré, surligné selon le ton */
export function AdminKpiButton({
  active,
  onClick,
  label,
  value,
  tone = "ivory",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  value: string;
  tone?: AdminTone;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-2xl border p-4 text-left transition-all active:scale-[0.98]",
        active
          ? "border-gold-mid/70 bg-gold-wash/60 shadow-md shadow-gold-strong/5"
          : "border-line bg-surface shadow-sm shadow-ink-950/[0.02] hover:border-gold-soft"
      )}
      aria-pressed={active}
    >
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
        {label}
      </p>
      <p className={cn("mt-1.5 font-display text-xl font-semibold", TONE_TEXT[tone])}>{value}</p>
    </button>
  );
}

/** Ligne label / valeur compacte (détails des modules) */
export function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
        {label}
      </dt>
      <dd className={cn("mt-0.5 text-xs text-ink-800", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

/** Boîte statistique compacte */
export function StatBox({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className={cn("rounded-xl border px-4 py-3", gold ? "border-gold-soft bg-gold-wash/40" : "border-line bg-ink-50/40")}>
      <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
        {label}
      </p>
      <p className={cn("mt-1 font-display text-lg font-semibold", gold ? "text-gold-strong" : "text-ink-950")}>
        {value}
      </p>
    </div>
  );
}
