"use client";

import { IconName, Icon } from "@/components/dashboard/icons";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** État vide élégant — aucune liste ne doit se retrouver sans explication */
export function EmptyState({ icon = "inbox", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-gold-soft bg-gold-wash/60 text-gold-mid">
        <Icon name={icon} size={24} strokeWidth={1.5} />
      </span>
      <div>
        <p className="font-display text-base font-semibold text-ink-950">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
