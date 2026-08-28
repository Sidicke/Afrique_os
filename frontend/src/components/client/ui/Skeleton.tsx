"use client";

import { cn } from "@/lib/utils";

/** Bloc squelette de base — pulse doux sur fond blanc. */
export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl border border-midnight-950/8 bg-white", className)}
    />
  );
}

/** Squelette d'une liste de lignes (commandes, discussions…). */
export function ListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl border border-midnight-950/8 bg-white" />
      ))}
    </div>
  );
}

/** Squelette d'une grille de cartes (boutiques, produits…). */
export function GridSkeleton({
  count = 6,
  tall = false,
  className,
}: {
  count?: number;
  tall?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "animate-pulse rounded-3xl border border-midnight-950/8 bg-white",
            tall ? "h-72" : "h-56",
          )}
        />
      ))}
    </div>
  );
}
