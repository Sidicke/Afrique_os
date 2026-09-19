"use client";

import { useState } from "react";
import { DashboardCard, CardHeader, SectionLabel } from "@/components/dashboard/ui/DashboardCard";
import { Icon } from "@/components/dashboard/icons";
import { Toast } from "@/components/dashboard/ui/Toast";
import { cn } from "@/lib/utils";
import {
  merchantProfile,
  PLAN_LABEL,
  PLAN_PRICE_LINE,
} from "@/services/dashboardService";

/** Slug de plan (boutique.plan, source backend) → carte du comparatif */
const PLAN_TO_CARD: Record<string, string> = {
  starter: "starter",
  business: "business",
  enterprise: "enterprise",
};

/** Offres de la plateforme — la carte « Actuelle » suit le vrai plan du marchand */
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    period: "gratuit",
    tagline: "Commencez à vendre gratuitement",
    features: [
      "Jusqu'à 20 produits",
      "1 boutique",
      "Commission : 5 %",
      "Support standard",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: 12500,
    period: "/ mois",
    tagline: "Pour les vendeurs réguliers",
    highlight: true,
    features: [
      "Jusqu'à 150 produits",
      "Jusqu'à 3 boutiques",
      "Commission : 2 %",
      "Analytics & Segmentation",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Sur mesure",
    period: "",
    tagline: "Besoins spécifiques",
    features: [
      "Produits illimités",
      "Multi-boutiques avancé",
      "Commission négociée",
      "Accompagnement dédié",
    ],
  },
];

export function FormuleSection() {
  const [toast, setToast] = useState<string | null>(null);
  // Carte « Actuelle » : le vrai plan du vendeur (boutique.plan), pas un choix codé en dur
  const currentPlanId = PLAN_TO_CARD[merchantProfile.plan] ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Formule actuelle */}
      <DashboardCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold-soft bg-gold-wash text-gold-strong">
              <Icon name="sparkle" size={22} />
            </span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                Votre formule actuelle
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h3 className="font-display text-xl font-semibold text-ink-950">
                  {PLAN_LABEL[merchantProfile.plan] ?? merchantProfile.plan}
                </h3>
                <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-green-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                  Active
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink-500">
                {PLAN_PRICE_LINE[merchantProfile.plan] ?? ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToast("La gestion de la facturation arrive bientôt.")}
            className="flex items-center gap-1.5 rounded-xl border border-gold-soft bg-gold-wash px-3.5 py-2 text-xs font-semibold text-gold-strong transition-all hover:bg-gold-soft/60 active:scale-95 cursor-pointer"
          >
            <Icon name="wallet" size={14} />
            Gérer la facturation
          </button>
        </div>
      </DashboardCard>

      {/* Comparatif des formules */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <SectionLabel>Comparez les formules</SectionLabel>
          <span className="h-px flex-1 bg-line" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const current = plan.id === currentPlanId;
            return (
              <DashboardCard
                key={plan.id}
                className={cn(
                  "flex flex-col p-6",
                  current && "border-gold-soft bg-gold-wash/40 shadow-md shadow-gold-mid/10"
                )}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-lg font-semibold text-ink-950">{plan.name}</h4>
                  {current && (
                    <span className="rounded-full bg-gold-strong px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white">
                      Actuelle
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink-500">{plan.tagline}</p>
                <p className="mt-4">
                  <span className="font-display text-3xl font-bold text-ink-950">
                    {plan.price === 0 ? "Gratuit" : plan.price.toLocaleString("fr-FR")}
                  </span>
                  {Number(plan.price) > 0 && (
                    <span className="ml-1 text-xs text-ink-400">FCFA {plan.period}</span>
                  )}
                </p>
                <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-ink-700">
                      <Icon
                        name="check"
                        size={15}
                        strokeWidth={2.4}
                        className="mt-0.5 text-gold-strong"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                {!current && (
                  <button
                    type="button"
                    onClick={() => setToast(`La mise à niveau vers la formule ${plan.name} arrive bientôt.`)}
                    className={cn(
                      "mt-6 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer",
                      plan.id === "pro"
                        ? "bg-ink-950 text-white hover:bg-blue-700"
                        : "border border-gold-soft bg-gold-wash text-gold-strong hover:bg-gold-soft/60"
                    )}
                  >
                    Passer à {plan.name}
                  </button>
                )}
                {current && (
                  <p className="mt-6 rounded-xl border border-line bg-white/60 px-4 py-2.5 text-center text-xs font-medium text-ink-500">
                    Vous êtes sur cette formule
                  </p>
                )}
              </DashboardCard>
            );
          })}
        </div>
      </div>

      {/* Accès facturation */}
      <DashboardCard className="p-6">
        <CardHeader
          title="Facturation & paiement"
          subtitle="Vos factures, reçus et moyens de paiement"
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { icon: "wallet" as const, label: "Moyens de paiement" },
            { icon: "download" as const, label: "Factures & reçus" },
            { icon: "calendar" as const, label: "Historique des paiements" },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setToast(`${item.label} : bientôt disponible.`)}
              className="flex items-center gap-3 rounded-xl border border-line bg-ink-50/50 px-4 py-3.5 text-left transition-all hover:border-gold-soft hover:bg-gold-wash active:scale-[0.98] cursor-pointer"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-wash text-gold-strong">
                <Icon name={item.icon} size={16} />
              </span>
              <span className="text-xs font-semibold text-ink-700">{item.label}</span>
            </button>
          ))}
        </div>
      </DashboardCard>

      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ink-300">
        <SectionLabel className="text-ink-300">Formule</SectionLabel> · ZennShop
      </p>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
