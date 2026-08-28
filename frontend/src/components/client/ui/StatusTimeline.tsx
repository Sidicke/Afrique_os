"use client";

import { cn } from "@/lib/utils";
import { IconCheck, IconX } from "../icons";

/**
 * Les étapes possibles de la vie d'une commande. `cancelled` est un état
 * terminal affiché en rouge (pas une étape de progression).
 */
export const ORDER_STEPS = [
  { key: "pending", label: "Commandée" },
  { key: "paid", label: "Payée" },
  { key: "shipping", label: "Expédiée" },
  { key: "delivered", label: "Livrée" },
] as const;

/** Position d'un statut backend dans la progression (ou -1 si hors flux). */
export function stepIndex(status: string): number {
  const i = ORDER_STEPS.findIndex((s) => s.key === status);
  return i >= 0 ? i : status === "cancelled" ? -1 : 0;
}

/**
 * Timeline de statut — l'histoire complète d'une commande en un coup d'œil.
 * Les étapes franchies sont marquées ✓, l'étape courante est mise en avant,
 * les suivantes restent à venir. Une commande annulée affiche un état
 * terminal clair.
 */
export function StatusTimeline({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const current = stepIndex(status);

  if (status === "cancelled") {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
          <IconX className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-sm font-bold text-red-600">Commande annulée</p>
          <p className="text-xs text-midnight-950/50">
            Les articles sont de nouveau disponibles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ol className={cn("flex items-start gap-0", className)} aria-label="Avancement de la commande">
      {ORDER_STEPS.map((step, index) => {
        const done = index < current;
        const isCurrent = index === current;
        const isLast = index === ORDER_STEPS.length - 1;
        return (
          <li key={step.key} className={cn("flex items-start", !isLast && "flex-1")}>
            <div className="flex flex-col items-center">
              {/* Pastille */}
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isCurrent
                      ? "border-gold-400 bg-gold-400/15 text-gold-600"
                      : "border-midnight-950/15 bg-white text-midnight-950/25",
                )}
              >
                {done ? (
                  <IconCheck className="h-3.5 w-3.5" />
                ) : isCurrent ? (
                  <span className="h-2 w-2 rounded-full bg-gold-500" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>
              {/* Libellé */}
              <span
                className={cn(
                  "mt-1.5 whitespace-nowrap font-mono text-[9px] font-semibold uppercase tracking-[0.12em]",
                  done || isCurrent ? "text-midnight-950" : "text-midnight-950/35",
                )}
              >
                {step.label}
              </span>
            </div>
            {/* Trait de liaison */}
            {!isLast && (
              <span
                className={cn(
                  "mt-3.5 h-0.5 flex-1 rounded-full",
                  index < current ? "bg-emerald-400" : "bg-midnight-950/10",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
