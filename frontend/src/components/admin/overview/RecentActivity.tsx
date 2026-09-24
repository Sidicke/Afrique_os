"use client";

import Link from "next/link";
import { cn, timeAgo } from "@/lib/utils";
import type { AdminActivityEvent } from "@/types/admin";

/** Icône + teinte par type d'événement (doc 03 — §14) */
const TYPE_META: Record<
  AdminActivityEvent["type"],
  { badge: string; icon: string }
> = {
  new_store: {
    badge: "bg-blue-100 text-blue-700",
    icon: "M3 9l1.5-5h15L21 9 M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0 M5 12v9h14v-9",
  },
  store_verified: {
    badge: "bg-green-100 text-green-700",
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4",
  },
  store_suspended: {
    badge: "bg-red-100 text-red-600",
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12h6",
  },
  new_order: {
    badge: "bg-ink-100 text-ink-700",
    icon: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  },
  subscription_upgraded: {
    badge: "bg-gold-wash text-gold-strong",
    icon: "M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z",
  },
  report_submitted: {
    badge: "bg-amber-100 text-amber-700",
    icon: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7",
  },
  new_user: {
    badge: "bg-blue-100 text-blue-700",
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
  new_merchant: {
    badge: "bg-green-100 text-green-700",
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
};

interface RecentActivityProps {
  events: AdminActivityEvent[];
}

/** Recent activity — doc 03 §14/§15 : uniquement les événements administrativement pertinents */
export function RecentActivity({ events }: RecentActivityProps) {
  return (
    <section className="p-2 sm:p-4">
      <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
        <div>
          <h3 className="font-display text-base font-semibold text-ink-950">Activité récente</h3>
          <p className="mt-0.5 text-xs text-ink-500">Événements importants de la plateforme</p>
        </div>
        <Link
          href="/admin/activite"
          className="font-mono text-[11px] font-semibold text-blue-700 transition-colors hover:text-blue-600"
        >
          Journal complet →
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-line bg-ink-50/60 px-4 py-8 text-center text-xs text-ink-400">
          Aucune activité récente.
        </p>
      ) : (
        <ol className="mt-4 space-y-1">
          {events.map((e) => {
            const meta = TYPE_META[e.type];
            const content = (
              <>
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", meta.badge)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={meta.icon} />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs leading-snug text-ink-700">
                    <span className="font-semibold text-ink-950">{e.actor}</span> {e.description}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] text-ink-400">
                    {timeAgo(e.timestamp)}
                  </span>
                </span>
                {e.resourceHref && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-300" aria-hidden="true">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                )}
              </>
            );

            return (
              <li key={e.id}>
                {e.resourceHref ? (
                  <Link
                    href={e.resourceHref}
                    className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-ink-50"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-2 py-2.5">{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
