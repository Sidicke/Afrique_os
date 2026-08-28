"use client";

import { EditableCard, ReadField } from "./EditableCard";
import { Field, TextInput } from "@/components/dashboard/ui/Field";
import { Icon } from "@/components/dashboard/icons";
import type { ShopConfig, SocialLinks } from "@/lib/shopConfig";

const SOCIAL_ITEMS: Array<{ key: keyof SocialLinks; label: string }> = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "twitter", label: "Twitter / X" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "tiktok", label: "TikTok" },
];

/** Affiche un lien sans le protocole (ex. instagram.com/aziztech) */
function displayLink(href: string): string {
  return href.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function ContactsSection({
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
        title="Contacts & Réseaux sociaux"
        subtitle="Email Gmail pro et liens réseaux sociaux (laisser vide pour masquer)"
        view={
          <div className="space-y-5">
            <ReadField label="Email (Gmail pro)" value={form.email} />
            <div>
              <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                Réseaux sociaux
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {SOCIAL_ITEMS.map(({ key, label }) => {
                  const href = form.social[key];
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink-50/50 px-3.5 py-2.5"
                    >
                      <span className="text-xs font-medium text-ink-500">{label}</span>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-[65%] items-center gap-1 truncate text-xs font-semibold text-blue-700 transition-colors hover:text-blue-800 hover:underline"
                        >
                          <span className="truncate">{displayLink(href)}</span>
                          <Icon name="external" size={11} />
                        </a>
                      ) : (
                        <span className="text-xs italic text-ink-300">Non renseigné</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        }
        onSave={saveAll}
        onCancel={reset}
        saving={saving}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email (Gmail pro)">
            <TextInput
              value={form.email}
              onChange={(e) => update({ email: e.target.value })}
              placeholder="exemple@gmail.com"
            />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {SOCIAL_ITEMS.map(({ key, label }) => (
            <Field key={key} label={label}>
              <TextInput
                value={form.social[key]}
                onChange={(e) => update({ social: { ...form.social, [key]: e.target.value } })}
                placeholder={`https://${key === "twitter" ? "x" : key}.com/…`}
              />
            </Field>
          ))}
        </div>
      </EditableCard>
    </div>
  );
}
