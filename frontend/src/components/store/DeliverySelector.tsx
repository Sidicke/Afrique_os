"use client";

import { useCart } from "./CartProvider";
import { formatPrice } from "@/constants/store";
import { cn } from "@/lib/utils";
import { IconCheck } from "./icons";

interface DeliverySelectorProps {
  /** Passe à true après une tentative de commande sans choix → message d'erreur */
  error?: boolean;
}

/**
 * Sélecteur de mode de livraison — obligatoire avant de passer commande.
 * Les packs (Standard, Gratuite, Premium…) sont configurés par l'admin
 * dans Paramètres → Ma boutique → Livraison.
 */
export function DeliverySelector({ error = false }: DeliverySelectorProps) {
  const { deliveryPacks, deliveryPack, setDeliveryPackId } = useCart();

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-midnight-950/50">
          Mode de livraison
        </p>
        <span className="rounded-full bg-midnight-950/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-midnight-950/45">
          Obligatoire
        </span>
      </div>

      {deliveryPacks.length === 0 ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
          Aucun mode de livraison configuré pour le moment. Contactez la boutique.
        </p>
      ) : (
        <div className="space-y-2.5">
          {deliveryPacks.map((pack) => {
            const selected = deliveryPack?.id === pack.id;
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => setDeliveryPackId(pack.id)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 cursor-pointer",
                  selected
                    ? "border-gold-400 bg-gold-400/10 shadow-sm ring-1 ring-gold-400/50"
                    : "border-midnight-950/10 bg-white hover:border-gold-400/60 hover:bg-gold-400/5"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    selected ? "border-gold-500 bg-gold-400" : "border-midnight-950/20 bg-white"
                  )}
                >
                  {selected && <IconCheck className="h-3 w-3 text-midnight-950" />}
                </span>
                <span className="flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-midnight-950">{pack.name}</span>
                    {pack.badge && (
                      <span className="rounded-full bg-gold-400/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-600">
                        {pack.badge}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-midnight-950/55">
                    {pack.description}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold text-gold-600">
                  {pack.price === 0 ? "Gratuite" : formatPrice(pack.price)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {error && deliveryPacks.length > 0 && (
        <p className="text-xs font-medium text-red-600">
          Veuillez choisir un mode de livraison avant de continuer.
        </p>
      )}
    </div>
  );
}

export default DeliverySelector;
