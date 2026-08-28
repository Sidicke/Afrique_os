"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * État vide partagé de l'espace client — le même langage partout :
 * icône dans un médaillon, titre, description et action facultative.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-3xl border border-dashed border-midnight-950/15 bg-white/60 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-400/12 text-gold-600">
        {icon}
      </span>
      <div>
        <p className="font-display text-lg font-bold text-midnight-950">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-midnight-950/55">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
