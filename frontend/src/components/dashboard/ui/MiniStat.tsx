"use client";

import { IconName, Icon } from "@/components/dashboard/icons";
import { cn } from "@/lib/utils";

interface MiniStatProps {
  icon: IconName;
  label: string;
  value: string;
  hint?: string;
  tone?: "gold" | "green" | "terracotta" | "blue" | "ivory";
}

const tones: Record<NonNullable<MiniStatProps["tone"]>, string> = {
  gold: "border-gold-soft bg-gold-wash text-gold-strong",
  green: "border-green-100 bg-green-100/70 text-green-700",
  terracotta: "border-red-100 bg-red-100/70 text-red-600",
  blue: "border-blue-100 bg-blue-100/70 text-blue-700",
  ivory: "border-line bg-ink-50 text-ink-700",
};

/** Statistique compacte (bandeau de chiffres sous l'en-tête de page) */
export function MiniStat({ icon, label, value, hint, tone = "ivory" }: MiniStatProps) {
  return (
    <div className="card-lux flex items-center gap-3.5 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-sm shadow-ink-950/[0.03]">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", tones[tone])}>
        <Icon name={icon} size={16} strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="truncate font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-500">
          {label}
        </p>
        <p className="truncate font-display text-base font-semibold text-ink-950">{value}</p>
        {hint && <p className="text-[10px] text-ink-400">{hint}</p>}
      </div>
    </div>
  );
}
