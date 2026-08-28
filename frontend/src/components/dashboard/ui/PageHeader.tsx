"use client";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** En-tête de page du dashboard — hiérarchie claire, étiquette mono or, actions alignées */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="relative">
        <div className="title-halo pointer-events-none absolute -left-16 -top-16 h-48 w-48 opacity-40" />
        {eyebrow && (
          <span className="relative mb-2 inline-block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-strong">
            {eyebrow}
          </span>
        )}
        <h1 className="relative font-display text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="relative mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-500">{description}</p>
        )}
      </div>
      {actions && <div className="relative flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}
