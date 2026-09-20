"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AdminPriorityAction, AdminPriorityLevel } from "@/types/admin";

/** Hiérarchie visuelle des niveaux de priorité (doc 03 — §10) : icône + label + couleur */
const LEVEL_META: Record<
  AdminPriorityLevel,
  { label: string; badge: string; dot: string; icon: string }
> = {
  critical: {
    label: "Critique",
    badge: "bg-red-100 text-red-600",
    dot: "bg-red-600",
    icon: "M12 9v4 M12 17h.01 M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  },
  high: {
    label: "Élevée",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    icon: "M12 9v4 M12 17h.01 M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  },
  medium: {
    label: "Moyenne",
    badge: "bg-blue-100 text-blue-700",
    dot: "bg-blue-600",
    icon: "M12 8v4 M12 16h.01",
  },
  info: {
    label: "Information",
    badge: "bg-ink-100 text-ink-600",
    dot: "bg-ink-400",
    icon: "M13 16h-1v-4h-1 M12 8h.01",
  },
};

const ACTION_ICON: Record<AdminPriorityAction["icon"], string> = {
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  alert: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  store: "M3 9l1.5-5h15L21 9 M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0 M5 12v9h14v-9",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  orders: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  clock: "M12 6v6l4 2 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
  wallet: "M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5 M18 12a2 2 0 0 0 0 4h4v-4z",
};

interface PriorityActionsProps {
  actions: AdminPriorityAction[];
}

/**
 * « Needs your attention » — doc 03 §9 : les éléments nécessitant une
 * intervention AVANT les gros graphiques. État vide : « Everything looks good. »
 */
export function PriorityActions({ actions }: PriorityActionsProps) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6 shadow-sm shadow-ink-950/[0.03]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-ink-950">À votre attention</h3>
          <p className="mt-0.5 text-xs text-ink-500">Actions nécessitant votre intervention</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-100/70 text-red-600">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </span>
      </div>

      {actions.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-green-200 bg-green-100/40 px-4 py-5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-700" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p className="text-sm font-medium text-green-700">Tout est en ordre. Aucune action requise.</p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line/70">
          {actions.map((a) => {
            const meta = LEVEL_META[a.level];
            return (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className="group flex items-center gap-4 py-3.5 transition-colors first:pt-0 last:pb-0"
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", meta.badge)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={ACTION_ICON[a.icon]} />
                    </svg>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink-950 transition-colors group-hover:text-gold-strong">
                        {a.title}
                      </span>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide", meta.badge)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                        {meta.label}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-500">{a.description}</span>
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-ink-100 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink-700">
                      {a.count}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-300 transition-all group-hover:translate-x-0.5 group-hover:text-gold-strong" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
