"use client";

import { cn } from "@/lib/utils";
import { EditableCard } from "./EditableCard";
import {
  AssetPicker,
  BOUTIQUE_IMAGE_OPTIONS,
  COVER_IMAGE_OPTIONS,
} from "@/components/dashboard/settings/AssetPicker";
import type { ShopConfig } from "@/lib/shopConfig";

/** Aperçu lecture seule d'une image (couverture ou logo) */
function VisualPreview({
  label,
  src,
  kind,
  initials,
}: {
  label: string;
  src: string;
  kind: "cover" | "logo";
  initials: string;
}) {
  return (
    <div>
      <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
        {label}
      </span>
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-line bg-ink-50/60",
          kind === "cover" ? "h-32 w-full" : "h-24 w-24"
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`Aperçu ${label}`}
            className={cn("h-full w-full", kind === "cover" ? "object-cover" : "object-contain p-1")}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-center text-ink-300">
            {kind === "logo" ? (
              <span className="font-display text-xl font-bold text-ink-300">{initials}</span>
            ) : (
              <span className="px-2 font-mono text-[9px] uppercase tracking-wider">
                Image par défaut
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Initiales de la boutique (ex. AT pour Aziz Tech) — utilisées si pas de logo */
export function shopInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function VisualsSection({
  form,
  update,
  saving,
  saveAll,
  reset,
}: {
  form: ShopConfig;
  update: (patch: Partial<ShopConfig>) => void;
  saving: boolean;
  saveAll: () => void;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <EditableCard
        title="Couverture & logo"
        subtitle="La grande image de couverture et le logo affichés en haut de votre boutique"
        view={
          <div className="grid gap-6 sm:grid-cols-2">
            <VisualPreview
              label="Image de couverture"
              src={form.coverImage}
              kind="cover"
              initials={shopInitials(form.name)}
            />
            <VisualPreview
              label="Logo de la boutique"
              src={form.logoImage}
              kind="logo"
              initials={shopInitials(form.name)}
            />
          </div>
        }
        onSave={saveAll}
        onCancel={reset}
        saving={saving}
      >
        <div className="space-y-8">
          <AssetPicker
            label="Image de couverture"
            hint="La grande image en haut de votre boutique"
            value={form.coverImage}
            onChange={(src) => update({ coverImage: src })}
            options={COVER_IMAGE_OPTIONS}
            kind="cover"
          />
          <AssetPicker
            label="Logo de la boutique"
            hint="Sans logo, les initiales de votre boutique s'affichent (ex. AT pour Aziz Tech)"
            value={form.logoImage}
            onChange={(src) => update({ logoImage: src })}
            options={BOUTIQUE_IMAGE_OPTIONS}
            kind="logo"
          />
        </div>
      </EditableCard>
    </div>
  );
}
