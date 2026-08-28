"use client";

import { Icon, type IconName } from "@/components/dashboard/icons";
import { cn } from "@/lib/utils";
import type { AdminSettingsSection } from "@/types/admin";

/** Sections des Paramètres (doc 11 — §3) — ordre = hiérarchie d'importance */
export const SETTINGS_SECTIONS: Array<{
  value: AdminSettingsSection;
  label: string;
  icon: IconName;
}> = [
  { value: "general", label: "Général", icon: "settings" },
  { value: "stores", label: "Boutiques", icon: "store" },
  { value: "verification", label: "Vérification", icon: "checkCircle" },
  { value: "orders", label: "Commandes", icon: "orders" },
  { value: "subscriptions", label: "Abonnements", icon: "wallet" },
  { value: "catalog", label: "Catalogue & catégories", icon: "basket" },
  { value: "roles", label: "Utilisateurs & rôles", icon: "users" },
  { value: "notifications", label: "Notifications", icon: "bell" },
  { value: "security", label: "Sécurité", icon: "lock" },
  { value: "admins", label: "Administrateurs", icon: "key" },
];

/**
 * Sous-navigation des paramètres (doc 11 §3) — liste verticale sur desktop,
 * chips défilables sur mobile.
 */
export function SettingsNav({
  active,
  onChange,
}: {
  active: AdminSettingsSection;
  onChange: (s: AdminSettingsSection) => void;
}) {
  return (
    <>
      {/* Desktop : liste verticale */}
      <nav
        aria-label="Sections des paramètres"
        className="sticky top-20 hidden w-64 shrink-0 self-start rounded-2xl border border-line bg-surface p-2 shadow-sm shadow-ink-950/[0.03] lg:block"
      >
        {SETTINGS_SECTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
            aria-current={active === s.value ? "page" : undefined}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs font-medium transition-all",
              active === s.value
                ? "bg-blue-700 text-white shadow-md shadow-blue-700/25"
                : "text-ink-600 hover:bg-ink-50 hover:text-ink-950"
            )}
          >
            <Icon
              name={s.icon}
              size={16}
              className={active === s.value ? "text-gold-soft" : "text-ink-400"}
            />
            {s.label}
          </button>
        ))}
      </nav>

      {/* Mobile : chips défilables */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
        {SETTINGS_SECTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
            aria-pressed={active === s.value}
            className={cn(
              "shrink-0 cursor-pointer rounded-xl border px-3 py-1.5 font-mono text-xs transition-colors",
              active === s.value
                ? "border-blue-700 bg-blue-700 font-semibold text-white"
                : "border-line bg-surface text-ink-600"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </>
  );
}
