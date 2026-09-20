"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { shopsApi } from "@/lib/api";
import { getBoutiqueId, switchActiveBoutique } from "@/lib/api/session";
import { useSession } from "@/lib/useSession";
import { Icon } from "@/components/dashboard/icons";
import { cn } from "@/lib/utils";

interface StoreSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  city?: string | null;
  country?: string | null;
  logoImage?: string | null;
  coverImage?: string | null;
  tagline?: string | null;
  description?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  PENDING: "En attente",
  SUSPENDED: "Suspendue",
  CLOSED: "Fermée",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200/80 shadow-xs",
  SUSPENDED: "bg-orange-50 text-orange-700 border border-orange-200/80 shadow-xs",
  CLOSED: "bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs",
};

const PLAN_COLOR: Record<string, string> = {
  starter: "bg-ink-100 text-ink-600 border border-ink-200",
  business: "bg-gradient-to-r from-gold-100/90 to-gold-200/60 text-gold-strong border border-gold-soft font-bold",
  enterprise: "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 font-bold",
};

export default function ParametresIndexPage() {
  const router = useRouter();
  const session = useSession();
  const [boutiques, setBoutiques] = useState<StoreSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentBoutiqueId = session?.user?.boutiqueId || getBoutiqueId();

  useEffect(() => {
    async function load() {
      try {
        const data = await shopsApi.myShops();
        setBoutiques(data as StoreSummary[]);
      } catch (e: any) {
        setError(e?.message ?? "Impossible de charger vos boutiques.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentBoutiqueId]);

  const handleSelectBoutique = (b: StoreSummary, destination = "/espace-vendeur/parametres/boutique") => {
    switchActiveBoutique(b.id, b.slug, b.name);
    router.push(destination);
  };

  const userPlan = boutiques.some((b) => b.plan === "enterprise")
    ? "enterprise"
    : boutiques.some((b) => b.plan === "business")
    ? "business"
    : "starter";

  const maxBoutiques = userPlan === "enterprise" ? Infinity : userPlan === "business" ? 3 : 1;
  const isLimitReached = boutiques.length >= maxBoutiques;

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-28 w-full animate-pulse rounded-3xl bg-ink-100/70" />
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="h-64 animate-pulse rounded-3xl bg-ink-100/70" />
          <div className="h-64 animate-pulse rounded-3xl bg-ink-100/70" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 shadow-xs">
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Bandeau d'en-tête premium */}
      <div className="relative overflow-hidden rounded-[2rem] border border-gold-soft/80 bg-gradient-to-br from-gold-wash/90 via-white to-gold-wash/30 p-6 sm:p-7 shadow-sm">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold-soft bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold-strong shadow-xs backdrop-blur-xs">
              <Icon name="store" size={12} />
              {userPlan === "starter" ? "Boutique Unique · Starter" : "Gestion Multi-Boutiques"}
            </div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">
              Paramètres de vos enseignes
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-ink-600">
              {userPlan === "starter"
                ? "Configurez l'identité, les visuels, le catalogue et la livraison de votre boutique."
                : "Chaque boutique possède son univers, ses visuels, ses stocks et ses conditions de livraison propres. Choisissez l'enseigne à piloter."}
            </p>
          </div>
          {isLimitReached ? (
            <Link
              href="/espace-vendeur/parametres/formule"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-gold-soft bg-gold-wash px-5 py-3 text-xs font-bold text-gold-strong shadow-xs transition-all hover:bg-gold-soft/40 active:scale-98"
            >
              <Icon name="sparkles" size={14} className="text-gold-strong" />
              Passer à Business ({boutiques.length}/{maxBoutiques === Infinity ? "∞" : maxBoutiques})
            </Link>
          ) : (
            <Link
              href="/espace-vendeur/mes-boutiques/nouvelle"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-ink-950 px-5 py-3 text-xs font-bold text-white shadow-md shadow-ink-950/10 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-700/20 active:scale-98"
            >
              <Icon name="plus" size={14} strokeWidth={2.5} />
              Créer une nouvelle boutique
            </Link>
          )}
        </div>
      </div>

      {/* Grille des boutiques haute fidélité */}
      <div className="grid gap-6 sm:grid-cols-2">
        {boutiques.map((b) => {
          const isSelected = b.id === currentBoutiqueId;

          return (
            <div
              key={b.id}
              className={cn(
                "group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] border bg-surface transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-ink-950/[0.05]",
                isSelected
                  ? "border-gold-strong/70 bg-gradient-to-b from-gold-wash/30 via-white to-surface ring-2 ring-gold-mid/30 shadow-gold-mid/10"
                  : "border-line hover:border-gold-soft"
              )}
            >
              <div>
                {/* Couverture d'en-tête de la carte avec dégradé chic */}
                <div className="relative h-28 w-full overflow-hidden bg-gradient-to-r from-ink-900 via-slate-800 to-ink-950">
                  {b.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.coverImage} alt={b.name} className="h-full w-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(#c4b697_1px,transparent_1px)] [background-size:12px_12px] opacity-25" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Badges de statut & formule superposés sur la couverture */}
                  <div className="absolute right-3.5 top-3.5 flex items-center gap-1.5 z-10">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md", STATUS_COLOR[b.status] ?? "bg-white/90 text-ink-700")}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                    <span className={cn("rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase backdrop-blur-md", PLAN_COLOR[b.plan] ?? "bg-white/90 text-ink-700")}>
                      {b.plan}
                    </span>
                  </div>
                </div>

                {/* Bloc d'identité boutique */}
                <div className="px-5 pt-0 pb-4">
                  {/* Logo flottant au-dessus de la couverture */}
                  <div className="-mt-10 mb-3.5 flex items-end justify-between">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-white font-display text-lg font-bold text-ink-800 shadow-md shadow-ink-950/10">
                      {b.logoImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.logoImage} alt={b.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="bg-gradient-to-br from-gold-wash to-gold-soft/40 h-full w-full flex items-center justify-center text-gold-strong">
                          {b.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-soft bg-gold-wash px-3 py-1 font-mono text-[11px] font-bold text-gold-strong shadow-xs">
                        <span className="h-2 w-2 rounded-full bg-gold-strong animate-pulse" />
                        Boutique Active
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-display text-lg font-extrabold text-ink-950 group-hover:text-gold-strong transition-colors">
                      {b.name}
                    </h3>
                    <p className="font-mono text-xs font-medium text-ink-400">
                      /{b.slug} {b.city ? `· ${b.city}` : ""}
                    </p>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-ink-500">
                    {b.tagline || b.description || (b.city ? `Boutique installée à ${b.city}${b.country ? `, ${b.country}` : ""}` : "Aucune description renseignée pour cette enseigne.")}
                  </p>
                </div>
              </div>

              {/* Boutons d'action principaux en pied de carte */}
              <div className="mt-2 flex items-center gap-2.5 border-t border-line bg-ink-50/40 p-4">
                <Link
                  href={`/b/${b.slug}`}
                  target="_blank"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white py-2.5 text-center text-xs font-bold text-ink-700 transition hover:border-gold-soft hover:bg-gold-wash/40 hover:text-gold-strong shadow-xs"
                >
                  <Icon name="eye" size={13} />
                  Vitrine publique ↗
                </Link>
                <button
                  type="button"
                  onClick={() => handleSelectBoutique(b, "/espace-vendeur/parametres/boutique")}
                  className={cn(
                    "flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-center text-xs font-bold transition-all cursor-pointer shadow-sm",
                    isSelected
                      ? "bg-gold-strong text-white shadow-gold-strong/20 hover:bg-gold-strong/95 active:scale-98"
                      : "bg-ink-950 text-white shadow-ink-950/15 hover:bg-blue-700 hover:shadow-blue-700/20 active:scale-98"
                  )}
                >
                  <Icon name="settings" size={13} />
                  {isSelected ? "Boutique Active (Gérer) →" : "Ouvrir les réglages →"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
