"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBoutiqueId, getSessionUser, switchActiveBoutique } from "@/lib/api/session";
import { useRouter } from "next/navigation";
import { shopsApi } from "@/lib/api";
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
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  PENDING: "En attente",
  SUSPENDED: "Suspendue",
  CLOSED: "Fermée",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  SUSPENDED: "bg-orange-100 text-orange-700",
  CLOSED: "bg-red-100 text-red-600",
};

const PLAN_COLOR: Record<string, string> = {
  starter: "bg-ink-100 text-ink-600",
  business: "bg-gold-wash text-gold-strong border border-gold-soft",
  enterprise: "bg-blue-50 text-blue-700 border border-blue-200",
};

export default function MesBoutiquesPage() {
  const router = useRouter();
  const [boutiques, setBoutiques] = useState<StoreSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = getSessionUser();
  const currentBoutiqueId = getBoutiqueId();

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
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Mes Boutiques</h1>
          <p className="mt-1 text-sm text-ink-500">
            Gérez et switchez entre vos boutiques depuis cet espace centralisé.
          </p>
        </div>
        <Link
          href="/espace-vendeur/mes-boutiques/nouvelle"
          className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-700/25 transition hover:bg-blue-800"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouvelle boutique
        </Link>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-line bg-ink-50" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">{error}</div>
      ) : boutiques.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-300">
            <path d="M3 9l1.5-5h15L21 9" />
            <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
            <path d="M5 12v9h14v-9" />
          </svg>
          <p className="font-display text-sm font-semibold text-ink-600">Aucune boutique créée</p>
          <p className="text-xs text-ink-400">Créez votre première boutique pour commencer à vendre.</p>
          <Link href="/espace-vendeur/mes-boutiques/nouvelle" className="mt-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800">
            Créer ma boutique
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boutiques.map((b) => {
            const isActive = b.id === currentBoutiqueId;
            return (
              <div
                key={b.id}
                className={cn(
                  "group relative flex flex-col rounded-2xl border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink-950/[0.06] overflow-hidden",
                  isActive
                    ? "border-blue-700 ring-2 ring-blue-700/20"
                    : "border-line"
                )}
              >
                {/* Cover */}
                <div className="h-24 w-full overflow-hidden bg-gradient-to-br from-ink-100 to-ink-200">
                  {b.coverImage && (
                    <img src={b.coverImage} alt="" className="h-full w-full object-cover" />
                  )}
                </div>

                {/* Contenu */}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display font-bold text-ink-950 leading-tight">{b.name}</p>
                      {b.tagline && <p className="mt-0.5 text-xs text-ink-400 line-clamp-1">{b.tagline}</p>}
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold", STATUS_COLOR[b.status] ?? "bg-ink-100 text-ink-500")}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold", PLAN_COLOR[b.plan] ?? "bg-ink-100 text-ink-500")}>
                      {b.plan.charAt(0).toUpperCase() + b.plan.slice(1)}
                    </span>
                    {b.city && (
                      <span className="flex items-center gap-1 text-[11px] text-ink-400">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                        {b.city}
                      </span>
                    )}
                    {isActive && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-blue-700">
                        ✓ Active
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex items-center gap-2">
                    <Link
                      href={`/b/${b.slug}`}
                      target="_blank"
                      className="flex-1 rounded-xl border border-line py-2 text-center text-xs font-medium text-ink-600 transition hover:bg-ink-50"
                    >
                      Voir la vitrine
                    </Link>
                    <button
                      onClick={() => {
                        switchActiveBoutique(b.id, b.slug, b.name);
                        router.push("/espace-vendeur");
                      }}
                      className="flex-1 rounded-xl bg-blue-700 py-2 text-center text-xs font-semibold text-white transition hover:bg-blue-800"
                    >
                      Gérer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Infos plan */}
      <div className="rounded-2xl border border-gold-soft bg-gold-wash p-4">
        <p className="text-sm font-medium text-ink-700">
          💡 <strong>Plan actuel ({currentBoutiqueId ? boutiques.find(b => b.id === currentBoutiqueId)?.plan.toUpperCase() : "..."})</strong> : 
          Le plan <strong>Starter</strong> autorise 1 boutique. Passez au plan <strong>Business</strong> pour aller jusqu'à 3, ou <strong>Enterprise</strong> pour l'illimité.
        </p>
      </div>
    </div>
  );
}
