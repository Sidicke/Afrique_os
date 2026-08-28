"use client";

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Interactivité discrète au survol (liseré doré + élévation douce) */
  interactive?: boolean;
}

/** Carte de base du dashboard — blanc, ombre douce, liseré doré au survol */
export function DashboardCard({ children, className, interactive = false }: CardProps) {
  return (
    <div
      className={cn(
        "card-lux rounded-2xl border border-line bg-surface shadow-sm shadow-ink-950/[0.03]",
        interactive &&
          "transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-soft hover:shadow-lg hover:shadow-ink-950/[0.06]",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4",
        className
      )}
    >
      <div>
        <h3 className="font-display text-base font-semibold text-ink-950">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

/** Étiquette mono de section (ex. « Performances ») */
export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-strong",
        className
      )}
    >
      {children}
    </span>
  );
}
