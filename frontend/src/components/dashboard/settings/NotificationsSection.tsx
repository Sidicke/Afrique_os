"use client";

import { cn } from "@/lib/utils";
import { EditableCard } from "./EditableCard";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type { ShopConfig } from "@/lib/shopConfig";

export function NotificationsSection({
  form,
  update,
  saving,
  savePatch,
  reset,
}: {
  form: ShopConfig;
  update: (patch: Partial<ShopConfig>) => void;
  saving: boolean;
  savePatch: (patch: Partial<ShopConfig>) => Promise<boolean>;
  reset: () => void;
}) {
  const updateNotifications = (id: string, enabled: boolean) => {
    update({
      notifications: form.notifications.map((n) =>
        n.id === id ? { ...n, enabled } : n
      ),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <EditableCard
        title="Préférences de notification"
        subtitle="Choisissez les alertes que vous souhaitez recevoir"
        view={
          <div className="divide-y divide-line/70">
            {form.notifications.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-950">{n.label}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{n.description}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider",
                    n.enabled ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-400"
                  )}
                >
                  {n.enabled ? "Activée" : "Désactivée"}
                </span>
              </div>
            ))}
          </div>
        }
        onSave={() => savePatch({ notifications: form.notifications })}
        onCancel={reset}
        saving={saving}
      >
        <div className="divide-y divide-line/70">
          {form.notifications.map((n) => (
            <div key={n.id} className="py-4 first:pt-0 last:pb-0">
              <Toggle
                checked={n.enabled}
                onChange={(checked) => updateNotifications(n.id, checked)}
                label={n.label}
                description={n.description}
              />
            </div>
          ))}
        </div>
      </EditableCard>
    </div>
  );
}
