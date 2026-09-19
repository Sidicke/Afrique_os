"use client";

import { useState } from "react";
import { EditableCard, ReadField } from "./EditableCard";
import { Field, TextInput, TextArea } from "@/components/dashboard/ui/Field";
import { Modal } from "@/components/dashboard/ui/Modal";
import { Icon } from "@/components/dashboard/icons";
import type { DeliveryPack, ShopConfig } from "@/lib/shopConfig";
import { useTranslation } from "@/lib/i18n";

/** Helper pour générer un id unique */
function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function DeliverySection({
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
  // Admin livraison : ajout / édition de pack
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [editPack, setEditPack] = useState<DeliveryPack | null>(null);
  const [packName, setPackName] = useState("");
  const [packPrice, setPackPrice] = useState(0);
  const [packDescription, setPackDescription] = useState("");
  const [packBadge, setPackBadge] = useState("");

  const openAddPack = () => {
    setEditPack(null);
    setPackName("");
    setPackPrice(0);
    setPackDescription("");
    setPackBadge("");
    setShowDeliveryModal(true);
  };
  const openEditPack = (pack: DeliveryPack) => {
    setEditPack(pack);
    setPackName(pack.name);
    setPackPrice(pack.price);
    setPackDescription(pack.description);
    setPackBadge(pack.badge ?? "");
    setShowDeliveryModal(true);
  };
  const savePack = () => {
    if (!packName.trim()) return;
    const pack: DeliveryPack = {
      id: editPack?.id ?? uid("del"),
      name: packName.trim(),
      price: packPrice,
      description: packDescription.trim(),
      badge: packBadge.trim() || undefined,
    };
    if (editPack) {
      update({ deliveryPacks: form.deliveryPacks.map((p) => (p.id === editPack.id ? pack : p)) });
    } else {
      update({ deliveryPacks: [...form.deliveryPacks, pack] });
    }
    setShowDeliveryModal(false);
  };
  const deletePack = (id: string) => {
    update({ deliveryPacks: form.deliveryPacks.filter((p) => p.id !== id) });
  };

  /** Lignes des packs — actions d'édition uniquement en mode modification */
  const renderPackRows = (manageable: boolean) =>
    form.deliveryPacks.length === 0 ? (
      <p className="text-sm italic text-ink-400">Aucun pack de livraison configuré.</p>
    ) : (
      form.deliveryPacks.map((pack) => (
        <div
          key={pack.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-ink-50/50 p-3.5"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink-950">{pack.name}</span>
              {pack.badge && (
                <span className="rounded-full bg-gold-wash px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-strong">
                  {pack.badge}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-ink-500">{pack.description}</p>
          </div>
          <span className="text-sm font-bold text-gold-strong">
            {pack.price === 0 ? "Gratuite" : `${pack.price.toLocaleString("fr-FR")} FCFA`}
          </span>
          {manageable && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openEditPack(pack)}
                className="cursor-pointer rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-950"
                aria-label={`Modifier ${pack.name}`}
              >
                <Icon name="edit" size={16} />
              </button>
              <button
                type="button"
                onClick={() => deletePack(pack.id)}
                className="cursor-pointer rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-100 hover:text-red-600"
                aria-label={`Supprimer ${pack.name}`}
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          )}
        </div>
      ))
    );

  return (
    <div className="flex flex-col gap-6">
      <EditableCard
        title="Notes de confiance"
        subtitle="Les engagements affichés sur vos fiches produit"
        view={
          <div className="grid gap-5 sm:grid-cols-2">
            <ReadField label="Libellé livraison" value={form.deliveryShortLabel} />
            <ReadField label="Détail livraison" value={form.deliveryNote} />
            <ReadField label="Garantie" value={form.warrantyNote} />
            <ReadField label="Moyens de paiement" value={form.paymentNote} />
          </div>
        }
        onSave={saveAll}
        onCancel={reset}
        saving={saving}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Libellé livraison">
            <TextInput
              value={form.deliveryShortLabel}
              onChange={(e) => update({ deliveryShortLabel: e.target.value })}
            />
          </Field>
          <Field label="Détail livraison">
            <TextInput
              value={form.deliveryNote}
              onChange={(e) => update({ deliveryNote: e.target.value })}
            />
          </Field>
          <Field label="Garantie">
            <TextInput
              value={form.warrantyNote}
              onChange={(e) => update({ warrantyNote: e.target.value })}
            />
          </Field>
          <Field label="Moyens de paiement">
            <TextInput
              value={form.paymentNote}
              onChange={(e) => update({ paymentNote: e.target.value })}
            />
          </Field>
        </div>
      </EditableCard>

      <EditableCard
        title="Packs de livraison"
        subtitle="Chaque mode de livraison proposé à la commande. Le client doit obligatoirement en choisir un."
        view={<div className="space-y-3">{renderPackRows(false)}</div>}
        onSave={saveAll}
        onCancel={reset}
        saving={saving}
      >
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={openAddPack}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-gold-soft bg-gold-wash px-3 py-1.5 text-xs font-semibold text-gold-strong transition-all hover:bg-gold-soft/60 active:scale-95"
          >
            <Icon name="plus" size={14} />
            Ajouter un pack
          </button>
        </div>
        <div className="space-y-3">{renderPackRows(true)}</div>
      </EditableCard>

      {/* Modale d'ajout/édition d'un pack de livraison */}
      <Modal open={showDeliveryModal} onClose={() => setShowDeliveryModal(false)} title={editPack ? "Modifier" : "Ajouter"} subtitle="Pack de livraison">
        <div className="space-y-4">
          <Field label="Nom du pack">
            <TextInput value={packName} onChange={(e) => setPackName(e.target.value)} placeholder="Ex. Express, Standard…" />
          </Field>
          <Field label="Prix (FCFA)" hint="0 = gratuit">
            <TextInput
              type="number"
              min={0}
              value={String(packPrice)}
              onChange={(e) => setPackPrice(Number(e.target.value))}
            />
          </Field>
          <Field label="Description courte">
            <TextArea
              value={packDescription}
              onChange={(e) => setPackDescription(e.target.value)}
              placeholder="Ex. Livraison en 24-48h à Abidjan…"
            />
          </Field>
          <Field label="Badge (optionnel)" hint="Ex. Recommandé, Économisez…">
            <TextInput value={packBadge} onChange={(e) => setPackBadge(e.target.value)} placeholder="" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowDeliveryModal(false)}
              className="cursor-pointer rounded-xl border border-line px-4 py-2 text-xs font-medium text-ink-600 hover:text-ink-950"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={savePack}
              disabled={!packName.trim()}
              className="cursor-pointer rounded-xl bg-ink-950 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editPack ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
