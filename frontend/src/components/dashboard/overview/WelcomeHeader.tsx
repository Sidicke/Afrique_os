"use client";

import Link from "next/link";
import { DashboardOverviewData, OrderStatus } from "@/types/dashboard";
import { Icon } from "@/components/dashboard/icons";
import { formatCurrency, cn } from "@/lib/utils";

interface WelcomeHeaderProps {
  data: DashboardOverviewData;
  greet: string;
  firstName: string;
  today: string;
}

/** Statuts qui demandent une action du vendeur (préparer, expédier) */
const ACTION_STATUSES: OrderStatus[] = ["pending", "paid", "shipping"];

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

  // Phrase de contexte — chaleureuse et captivante
  let context: string;
  if (toDoOrders > 0 && attentionProducts > 0) {
    context = `De belles opportunités s'offrent à vous : vous avez ${toDoOrders} commande${toDoOrders > 1 ? "s" : ""} impatiente${toDoOrders > 1 ? "s" : ""} d'être expédiée${toDoOrders > 1 ? "s" : ""} et ${attentionProducts} produit${attentionProducts > 1 ? "s" : ""} victime${attentionProducts > 1 ? "s" : ""} de son succès à surveiller.`;
  } else if (toDoOrders > 0) {
    context = `Excellente journée en perspective ! Vous avez ${toDoOrders} nouvelle${toDoOrders > 1 ? "s" : ""} commande${toDoOrders > 1 ? "s" : ""} qui n'attend${toDoOrders > 1 ? "ent" : ""} que vous.`;
  } else if (attentionProducts > 0) {
    context = `Vos articles s'arrachent ! Pensez à réapprovisionner ${attentionProducts} produit${attentionProducts > 1 ? "s" : ""} qui approche${attentionProducts > 1 ? "nt" : ""} de la rupture de stock.`;
  } else if (isGrowing && growth > 0) {
    context = `Félicitations pour cette belle dynamique ! Votre chiffre d'affaires est en croissance de ${growth.toLocaleString("fr-FR")}%. Continuez sur cette lancée.`;
  } else {
    context = `C'est le moment idéal pour chouchouter votre vitrine et séduire de nouveaux clients ! Prenez le temps de revoir vos offres du moment.`;
  }

  return (
    <section aria-label="Bienvenue" className="relative mb-8 overflow-hidden rounded-[2rem] border border-gold-soft bg-gradient-to-r from-[#fef5e7] via-[#fffdf9] to-[#f9ede1] p-6 shadow-sm sm:p-10">
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(#c4b697_1px,transparent_1px)] [background-size:16px_16px] opacity-20" aria-hidden="true"></div>
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-400/20 blur-[80px]" aria-hidden="true"></div>
      
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-200/50 text-gold-strong ring-1 ring-gold-300/50">
              <Icon name="sparkle" size={14} className="text-gold-strong" />
            </span>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-ink-500">
              Espace Vendeur
            </p>
          </div>
          
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-midnight-950 sm:text-4xl">
            <span suppressHydrationWarning>{greet}</span>, <span suppressHydrationWarning className="text-terracotta">{firstName}</span>
          </h1>
          
          <p className="mt-3 text-base leading-relaxed text-ink-600 sm:text-lg">
            {today ? today.charAt(0).toUpperCase() + today.slice(1) : "Bienvenue"} · {context}
          </p>

          {/* Actions : priorités du jour */}
          {(toDoOrders > 0 || attentionProducts > 0) && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {toDoOrders > 0 && (
                <Link
                  href="/espace-vendeur/commandes"
                  className="group flex items-center gap-2.5 rounded-xl bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
                >
                  <Icon name="orders" size={16} />
                  {toDoOrders} commande{toDoOrders > 1 ? "s" : ""} à traiter
                </Link>
              )}
              {attentionProducts > 0 && (
                <Link
                  href="/espace-vendeur/produits"
                  className="group flex items-center gap-2.5 rounded-xl border border-line bg-white/60 px-4 py-2.5 text-sm font-semibold text-ink-700 shadow-sm transition-all hover:border-gold-mid hover:text-gold-strong active:scale-95 backdrop-blur-md"
                >
                  <Icon name="alert" size={16} className="text-gold-strong" />
                  {attentionProducts} stock{attentionProducts > 1 ? "s" : ""} critique{attentionProducts > 1 ? "s" : ""}
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Objectif mensuel widget */}
        {!Number.isNaN(goalPercent) && goal > 0 && (
          <div className="relative w-full max-w-xs shrink-0 lg:ml-6 mt-6 lg:mt-0">
            <div className="rounded-2xl border border-white/60 bg-white/40 px-5 py-4 shadow-sm backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-600">
                  Objectif mensuel
                </span>
                <span className="font-mono text-sm font-black text-gold-strong">{goalPercent}%</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/60 ring-1 ring-inset ring-ink-950/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600 shadow-sm transition-all duration-700"
                  style={{ width: `${Math.min(100, goalPercent)}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-ink-500">
                {formatCurrency(data.kpis.revenue.rawNumber)} / {formatCurrency(goal)}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
