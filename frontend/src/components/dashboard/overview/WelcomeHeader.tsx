"use client";

import Link from "next/link";
import { DashboardOverviewData, OrderStatus } from "@/types/dashboard";
import { Icon } from "@/components/dashboard/icons";
import { formatFcfa, cn } from "@/lib/utils";

interface WelcomeHeaderProps {
  data: DashboardOverviewData;
  greet: string;
  firstName: string;
  today: string;
}

/** Statuts qui demandent une action du vendeur (préparer, expédier) */
const ACTION_STATUSES: OrderStatus[] = ["pending", "paid", "shipping"];

/**
 * En-tête vivant : répond en un coup d'œil à « comment se porte ma boutique
 * et que dois-je faire aujourd'hui ? ». La phrase change selon la situation
 * réelle (commandes à traiter, stock bas, objectif mensuel).
 */
export function WelcomeHeader({ data, greet, firstName, today }: WelcomeHeaderProps) {
  const toDoOrders = data.recentOrders.filter((o) =>
    ACTION_STATUSES.includes(o.status)
  ).length;
  const attentionProducts = data.bestSellers.filter(
    (p) => p.status === "low_stock" || p.status === "out_of_stock"
  ).length;
  const isGrowing = data.kpis.revenue.isPositive;
  const growth = Math.abs(data.kpis.revenue.changePercent);
  const goal = data.monthlyGoalFcfa;
  const goalPercent = Math.round((data.kpis.revenue.rawNumber / goal) * 100);

  // Phrase de contexte — hiérarchie : action > vigilance > dynamique positive.
  let context: string;
  if (toDoOrders > 0 && attentionProducts > 0) {
    context = `${toDoOrders} commande${toDoOrders > 1 ? "s" : ""} à préparer et ${attentionProducts} produit${attentionProducts > 1 ? "s" : ""} à surveiller.`;
  } else if (toDoOrders > 0) {
    context = `${toDoOrders} commande${toDoOrders > 1 ? "s" : ""} à préparer.`;
  } else if (attentionProducts > 0) {
    context = `${attentionProducts} produit${attentionProducts > 1 ? "s" : ""} nécessite${attentionProducts > 1 ? "nt" : ""} votre attention.`;
  } else if (isGrowing) {
    context = `Votre chiffre d'affaires progresse de ${growth.toLocaleString("fr-FR")}%, une belle dynamique.`;
  } else {
    context = `Votre boutique se porte bien, aucune action urgente aujourd'hui.`;
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="relative min-w-0">
        <div className="title-halo pointer-events-none absolute -left-16 -top-16 h-48 w-48 opacity-40" />
        <span className="relative mb-2 inline-block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-strong">
          Espace Vendeur
        </span>
        <h1 className="relative font-display text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
          {greet}, {firstName}{" "}
          <span className="inline-flex translate-y-[-2px] items-center gap-1.5 align-middle">
            <span className="relative flex h-2 w-2">
              <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", isGrowing ? "bg-green-600" : "bg-gold-500")} />
              <span className={cn("relative inline-flex h-2 w-2 rounded-full", isGrowing ? "bg-green-600" : "bg-gold-500")} />
            </span>
          </span>
        </h1>
        <p className="relative mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-500">
          {today ? today.charAt(0).toUpperCase() + today.slice(1) : "Bienvenue"} · {context}
        </p>
      </div>

      {/* Objectif mensuel — compact, à droite */}
      {goalPercent !== null && (
        <div className="relative w-full max-w-xs">
          <div className="rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm shadow-ink-950/[0.03]">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-500">
                Objectif mensuel
              </span>
              <span className="font-mono text-xs font-bold text-gold-strong">{goalPercent}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-mid to-gold-strong transition-all duration-700"
                style={{ width: `${Math.min(100, goalPercent)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-ink-400">
              {formatFcfa(data.kpis.revenue.rawNumber)} / {formatFcfa(goal)}
            </p>
          </div>
        </div>
      )}

      {/* Bandeau d'attention — seulement s'il y a quelque chose à faire */}
      {(toDoOrders > 0 || attentionProducts > 0) && (
        <div className="relative flex w-full flex-wrap items-center gap-2.5 rounded-2xl border border-gold-soft bg-gold-wash/60 px-4 py-2.5">
          {toDoOrders > 0 && (
            <Link
              href="/espace-admin/commandes"
              className="group flex items-center gap-2 rounded-xl bg-ink-950 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-blue-700 active:scale-95"
            >
              <Icon name="orders" size={13} />
              {toDoOrders} commande{toDoOrders > 1 ? "s" : ""} à traiter
            </Link>
          )}
          {attentionProducts > 0 && (
            <Link
              href="/espace-admin/produits"
              className="group flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-700 transition-all hover:border-gold-mid hover:text-gold-strong active:scale-95"
            >
              <Icon name="alert" size={13} className="text-gold-strong" />
              {attentionProducts} produit{attentionProducts > 1 ? "s" : ""} en stock bas
            </Link>
          )}
          <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-widest text-ink-400 sm:block">
            Priorité du jour
          </span>
        </div>
      )}
    </div>
  );
}
