"use client";

import { useState } from "react";
import { EditableCard } from "./EditableCard";
import { Field } from "@/components/dashboard/ui/Field";
import { Modal } from "@/components/dashboard/ui/Modal";
import { Icon } from "@/components/dashboard/icons";
import { products } from "@/constants/store";
import type { ShopConfig } from "@/lib/shopConfig";
import { useTranslation } from "@/lib/i18n";

export function PromotionsSection({
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
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoProductId, setPromoProductId] = useState("");
  const [promoPercent, setPromoPercent] = useState(0);

  const openAddPromo = () => {
    setPromoProductId("");
    setPromoPercent(0);
    setShowPromoModal(true);
  };
  const savePromo = () => {
    if (!promoProductId || promoPercent < 1 || promoPercent > 90) return;
    const existing = form.promotions.findIndex((p) => p.productId === promoProductId);
    if (existing >= 0) {
      const updated = [...form.promotions];
      updated[existing] = { productId: promoProductId, discountPercent: promoPercent };
      update({ promotions: updated });
    } else {
      update({ promotions: [...form.promotions, { productId: promoProductId, discountPercent: promoPercent }] });
    }
    setShowPromoModal(false);
  };
  const deletePromo = (productId: string) => {
    update({ promotions: form.promotions.filter((p) => p.productId !== productId) });
  };

  /** Lignes des promotions — bouton de suppression uniquement en mode modification */
  const renderPromoRows = (manageable: boolean) =>
    form.promotions.length === 0 ? (
      <p className="text-sm italic text-ink-400">Aucune promotion active pour le moment.</p>
    ) : (
      form.promotions.map((promo) => {
        const prod = products.find((p) => p.id === promo.productId);
        return (
          <div
            key={promo.productId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-ink-50/50 p-3.5"
          >
            <div className="min-w-0 flex-1">
              <span className="text-sm font-semibold text-ink-950">
                {prod?.name ?? promo.productId}
              </span>
              <span className="ml-2 rounded-full bg-gold-400/20 px-2 py-0.5 text-[10px] font-bold text-gold-strong">
                -{promo.discountPercent}%
              </span>
              {prod && (
                <p className="mt-0.5 text-xs text-ink-500">
                  {prod.price.toLocaleString("fr-FR")} FCFA →{" "}
                  {Math.round((prod.price * (100 - promo.discountPercent)) / 100).toLocaleString("fr-FR")} FCFA
                </p>
              )}
            </div>
            {manageable && (
              <button
                type="button"
                onClick={() => deletePromo(promo.productId)}
                className="cursor-pointer rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-100 hover:text-red-600"
                aria-label={`Supprimer la promotion de ${prod?.name ?? promo.productId}`}
              >
                <Icon name="trash" size={16} />
              </button>
            )}
          </div>
        );
      })
    );

  return (
    <div className="flex flex-col gap-6">
      <EditableCard
        title="Promotions"
        subtitle="Appliquez un pourcentage de réduction sur un produit existant. Le prix barré + badge animé s'affichent en boutique."
        view={<div className="space-y-3">{renderPromoRows(false)}</div>}
        onSave={saveAll}
        onCancel={reset}
        saving={saving}
      >
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={openAddPromo}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-gold-soft bg-gold-wash px-3 py-1.5 text-xs font-semibold text-gold-strong transition-all hover:bg-gold-soft/60 active:scale-95"
          >
            <Icon name="plus" size={14} />
            Ajouter une promo
          </button>
        </div>
        <div className="space-y-3">{renderPromoRows(true)}</div>
      </EditableCard>

      {/* Modale d'ajout d'une promotion */}
      <Modal open={showPromoModal} onClose={() => setShowPromoModal(false)} title="Ajouter une promotion" subtitle="Sélectionnez un produit et son pourcentage de réduction">
        <div className="space-y-4">
          <Field label="Produit" hint="Choisissez un produit du catalogue">
            <select
              value={promoProductId}
              onChange={(e) => setPromoProductId(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
            >
              <option value="">Sélectionnez un produit…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.price.toLocaleString("fr-FR")} FCFA
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pourcentage de réduction" hint="Entre 1 et 90 %">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={90}
                value={promoPercent}
                onChange={(e) => setPromoPercent(Number(e.target.value))}
                className="flex-1 cursor-pointer accent-gold-mid"
              />
              <span className="w-12 text-right font-mono text-sm font-bold text-gold-strong">
                {promoPercent}%
              </span>
            </div>
          </Field>
          {promoProductId && promoPercent > 0 && (() => {
            const prod = products.find((p) => p.id === promoProductId);
            if (!prod) return null;
            const discounted = Math.round((prod.price * (100 - promoPercent)) / 100);
            return (
              <div className="rounded-xl bg-ivory-50/80 p-3 text-center text-sm">
                <span className="text-midnight-950/50 line-through">{prod.price.toLocaleString("fr-FR")} FCFA</span>
                <span className="mx-2 text-midnight-950/30">→</span>
                <span className="font-bold text-gold-600">{discounted.toLocaleString("fr-FR")} FCFA</span>
              </div>
            );
          })()}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowPromoModal(false)}
              className="cursor-pointer rounded-xl border border-line px-4 py-2 text-xs font-medium text-ink-600 hover:text-ink-950"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={savePromo}
              disabled={!promoProductId || promoPercent < 1 || promoPercent > 90}
              className="cursor-pointer rounded-xl bg-ink-950 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Appliquer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
