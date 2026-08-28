"use client";

import Link from "next/link";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { Icon } from "@/components/dashboard/icons";
import { cn, formatFcfa } from "@/lib/utils";
import type { AdminSearchTerm, AdminTopProduct, AdminTopStore } from "@/types/admin";

/**
 * Classements analytiques (doc 09 — §16/§17/§19) : boutiques les plus
 * performantes, produits les plus commandés et recherche de la plateforme
 * (dont les recherches sans résultat — opportunités de catalogue).
 */
export function TopTables({
  stores,
  products,
  searchTerms,
}: {
  stores: AdminTopStore[] | undefined;
  products: AdminTopProduct[] | undefined;
  searchTerms: AdminSearchTerm[] | undefined;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {/* Top boutiques (doc 09 §16) */}
      <DashboardCard className="p-6">
        <CardHeader title="Boutiques les plus performantes" subtitle="Classement par volume" />
        <ul className="mt-3 divide-y divide-line/70">
          {(stores ?? []).map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-bold",
                  i === 0 ? "bg-gold-strong text-white" : i === 1 ? "bg-ink-200 text-ink-800" : i === 2 ? "bg-amber-200 text-amber-800" : "bg-ink-100 text-ink-500"
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/stores/${s.id}`}
                  className="block truncate text-xs font-semibold text-ink-950 transition-colors hover:text-gold-strong"
                >
                  {s.name}
                </Link>
                <p className="font-mono text-[10px] text-ink-400">
                  {s.ordersCount.toLocaleString("fr-FR")} commandes
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[11px] font-semibold text-ink-800">{formatFcfa(s.gmvFcfa)}</p>
                <p className={cn("font-mono text-[9px]", s.growthPercent >= 0 ? "text-green-600" : "text-red-600")}>
                  {s.growthPercent >= 0 ? "↑" : "↓"} {Math.abs(s.growthPercent)} %
                </p>
              </div>
            </li>
          ))}
        </ul>
      </DashboardCard>

      {/* Top produits (doc 09 §17) */}
      <DashboardCard className="p-6">
        <CardHeader title="Produits les plus commandés" subtitle="Au niveau plateforme" />
        <ul className="mt-3 divide-y divide-line/70">
          {(products ?? []).map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ink-100 font-mono text-[10px] font-bold text-ink-500">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-ink-950">{p.name}</p>
                <p className="truncate font-mono text-[10px] text-ink-400">{p.storeName}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[11px] font-semibold text-ink-800">
                  {p.ordersCount.toLocaleString("fr-FR")} cmd
                </p>
                <p className="font-mono text-[9px] text-ink-400">{formatFcfa(p.gmvFcfa)}</p>
              </div>
            </li>
          ))}
        </ul>
      </DashboardCard>

      {/* Recherche (doc 09 §19) */}
      <DashboardCard className="p-6">
        <CardHeader title="Recherches fréquentes" subtitle="Requêtes des utilisateurs" />
        <ul className="mt-3 divide-y divide-line/70">
          {(searchTerms ?? []).map((t) => (
            <li key={t.term} className="py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-ink-950">« {t.term} »</p>
                {t.noResultPercent >= 100 ? (
                  <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 font-mono text-[9px] font-semibold text-red-600">
                    Opportunité catalogue
                  </span>
                ) : (
                  <span className="shrink-0 font-mono text-[10px] text-ink-500">
                    {t.searches.toLocaleString("fr-FR")} req
                  </span>
                )}
              </div>
              {t.noResultPercent < 100 ? (
                <div className="mt-1.5 flex items-center gap-2 font-mono text-[9px] text-ink-400">
                  <span className="flex items-center gap-1">
                    <Icon name="eye" size={10} /> {t.clicks.toLocaleString("fr-FR")} clics
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="orders" size={10} /> {t.orders.toLocaleString("fr-FR")} commandes
                  </span>
                  {t.noResultPercent > 0 && <span className="text-amber-600">{t.noResultPercent} % sans résultat</span>}
                </div>
              ) : (
                <p className="mt-1 font-mono text-[9px] text-amber-700">
                  Aucune offre aujourd&apos;hui : créez l&apos;offre pour capter {t.searches.toLocaleString("fr-FR")} requêtes.
                </p>
              )}
            </li>
          ))}
        </ul>
      </DashboardCard>
    </div>
  );
}
