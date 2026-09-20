"use client";

import { useEffect, useState } from "react";
import { DashboardCard, CardHeader, SectionLabel } from "@/components/dashboard/ui/DashboardCard";
import { Icon } from "@/components/dashboard/icons";
import { Toast } from "@/components/dashboard/ui/Toast";
import { cn } from "@/lib/utils";
import { usersApi, shopsApi } from "@/lib/api";
import { useSession } from "@/lib/useSession";
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
    maxShops: 1,
    features: [
      "Jusqu'à 20 produits",
      "1 boutique unique",
      "Commission : 5 %",
      "Support standard",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: 12500,
    period: "/ mois",
    tagline: "Pour les vendeurs multi-enseignes",
    maxShops: 3,
    highlight: true,
    features: [
      "Jusqu'à 150 produits",
      "Jusqu'à 3 boutiques indépendantes",
      "Commission réduite : 2 %",
      "Analytics consolidés & multi-boutiques",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Sur mesure",
    period: "",
    tagline: "Pour grands réseaux & franchises",
    maxShops: 999,
    features: [
      "Produits illimités",
      "Boutiques illimitées",
      "Commission préférentielle négociée",
      "Accompagnement dédié VIP",
    ],
  },
];

export function FormuleSection() {
  const session = useSession();
  const [toast, setToast] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<string>("business");
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      usersApi.me().catch(() => null),
      shopsApi.myShops().catch(() => []),
    ]).then(([profile, myShops]) => {
      if (profile?.plan) {
        setActivePlan(profile.plan.toLowerCase());
      } else if (session?.user && (session.user as any).plan) {
        setActivePlan(String((session.user as any).plan).toLowerCase());
      }
      if (Array.isArray(myShops)) {
        setShops(myShops);
      }
      setLoading(false);
    });
  }, [session]);

  const currentPlanId = PLAN_TO_CARD[activePlan] ?? "business";
  const currentPlanConfig = PLANS.find((p) => p.id === currentPlanId) || PLANS[1];

  return (
    <div className="flex flex-col gap-6">
      {/* Formule actuelle du compte vendeur */}
      <DashboardCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold-soft bg-gold-wash text-gold-strong">
              <Icon name="sparkle" size={22} />
            </span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                Abonnement du compte commerçant
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h3 className="font-display text-xl font-semibold text-ink-950">
                  {PLAN_LABEL[activePlan] ?? activePlan.toUpperCase()}
                </h3>
                <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-green-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                  Actif sur tout le compte
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink-500">
                {PLAN_PRICE_LINE[activePlan] ?? "12 500 FCFA / mois · Multi-enseignes activé"}
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

        {/* Boutiques couvertes */}
        {shops.length > 0 && (
          <div className="mt-5 rounded-xl border border-line/80 bg-ink-50/50 p-3.5 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-ink-800">
                Enseignes couvertes par votre abonnement ({shops.length} / {currentPlanConfig.maxShops === 999 ? "Illimité" : currentPlanConfig.maxShops}) :
              </span>
              <span className="font-mono text-[11px] text-gold-strong font-semibold">
                Toutes vos boutiques bénéficient de vos avantages
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {shops.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-800 shadow-2xs"
                >
                  <Icon name="store" size={12} className="text-gold-strong" />
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}
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
