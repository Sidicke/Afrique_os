"use client";

import { EditableCard, ReadField } from "./EditableCard";
import { Field, TextInput, TextArea } from "@/components/dashboard/ui/Field";
import type { ShopConfig } from "@/lib/shopConfig";

export function IdentitySection({
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
        title="Identité de la boutique"
        subtitle="Ces informations sont visibles par vos clients sur votre vitrine"
        view={
          <div className="grid gap-5 sm:grid-cols-2">
            <ReadField label="Nom de la boutique" value={form.name} />
            <ReadField label="Slogan" value={form.tagline} />
            <ReadField label="Description" value={form.description} className="sm:col-span-2" />
            <ReadField label="Ville" value={form.city} />
            <ReadField label="Pays" value={form.country} />
          </div>
        }
        onSave={saveAll}
        onCancel={reset}
        saving={saving}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nom de la boutique">
            <TextInput value={form.name} onChange={(e) => update({ name: e.target.value })} />
          </Field>
          <Field label="Slogan">
            <TextInput value={form.tagline} onChange={(e) => update({ tagline: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <TextArea value={form.description} onChange={(e) => update({ description: e.target.value })} />
            </Field>
          </div>
          <Field label="Ville">
            <TextInput value={form.city} onChange={(e) => update({ city: e.target.value })} />
          </Field>
          <Field label="Pays">
            <TextInput value={form.country} onChange={(e) => update({ country: e.target.value })} />
          </Field>
        </div>
      </EditableCard>
    </div>
  );
}
