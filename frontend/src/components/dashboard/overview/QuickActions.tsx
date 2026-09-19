"use client";

import Link from "next/link";
import { Icon, IconName } from "@/components/dashboard/icons";
import { useSession } from "@/lib/useSession";
import { publicShopHref } from "@/lib/utils";

interface QuickAction {
  label: string;
  hint?: string;
  href: string;
  icon: IconName;
}

const ACTIONS: QuickAction[] = [
  { label: "Ajouter un produit", hint: "Enrichir le catalogue", href: "/espace-vendeur/produits", icon: "package" },
  { label: "Créer une promotion", hint: "Booster une vente", href: "/espace-vendeur/parametres/boutique/promotions", icon: "sparkle" },
  { label: "Voir la boutique", hint: "Vitrine publique", href: "/boutique", icon: "external" },
];

/** Actions rapides — les 4 gestes les plus fréquents, accessibles en un clic */
export function QuickActions() {
  // « Voir la boutique » → vitrine publique RÉELLE du vendeur connecté
  const session = useSession();
  const shopHref = publicShopHref(session?.user.boutiqueSlug);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {ACTIONS.map((action) => (
        <Link
          key={action.label}
          href={action.icon === "external" ? shopHref : action.href}
          target={action.icon === "external" ? "_blank" : undefined}
          rel={action.icon === "external" ? "noopener noreferrer" : undefined}
          className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-sm shadow-ink-950/[0.03] transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-soft hover:shadow-lg hover:shadow-ink-950/[0.06]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold-soft bg-gold-wash text-gold-strong transition-colors group-hover:bg-gold-mid group-hover:text-white">
            <Icon name={action.icon} size={16} strokeWidth={2} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink-950 transition-colors group-hover:text-gold-strong">
              {action.label}
            </span>
            <span className="block truncate text-[11px] text-ink-400">{action.hint}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
