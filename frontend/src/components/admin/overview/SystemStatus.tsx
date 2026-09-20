"use client";

import { cn } from "@/lib/utils";
import type { AdminSystemComponent, AdminSystemStatus } from "@/types/admin";

const STATUS_META: Record<
  AdminSystemStatus,
  { label: string; dot: string; text: string; badge: string }
> = {
  operational: {
    label: "Opérationnel",
    dot: "bg-green-600",
    text: "text-green-700",
    badge: "bg-green-100 text-green-700",
  },
  degraded: {
    label: "Dégradé",
    dot: "bg-amber-500",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
  },
  down: {
    label: "Hors service",
    dot: "bg-red-600",
    text: "text-red-600",
    badge: "bg-red-100 text-red-600",
  },
  maintenance: {
    label: "Maintenance",
    dot: "bg-ink-400",
    text: "text-ink-600",
    badge: "bg-ink-100 text-ink-600",
  },
};

interface SystemStatusProps {
  components: AdminSystemComponent[];
}

/**
 * System status — doc 03 §21. État de l'infrastructure servi par l'API
 * réelle (`/admin/overview.systemStatus`).
 */
export function SystemStatus({ components }: SystemStatusProps) {
  const operationalCount = components.filter((c) => c.status === "operational").length;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6 shadow-sm shadow-ink-950/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h3 className="font-display text-base font-semibold text-ink-950">État du système</h3>
          <p className="mt-0.5 text-xs text-ink-500">État de l&apos;infrastructure plateforme</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 font-mono text-[10px] font-semibold text-green-700">
          <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
          {operationalCount}/{components.length} opérationnels
        </span>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {components.map((c) => {
          const meta = STATUS_META[c.status];
          return (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink-50/40 px-3.5 py-2.5 transition-colors hover:bg-ink-50/75"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
                <span className="truncate text-xs font-semibold text-ink-900" title={c.label}>
                  {c.label}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {c.detail && (
                  <span className="font-mono text-[10px] text-ink-500">
                    {c.detail}
                  </span>
                )}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide",
                    meta.badge
                  )}
                >
                  {meta.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
