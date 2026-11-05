"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardCard, CardHeader, SectionLabel } from "@/components/dashboard/ui/DashboardCard";
import { Icon } from "@/components/dashboard/icons";
import { Toast } from "@/components/dashboard/ui/Toast";
import { cn } from "@/lib/utils";
import { ApiError, ordersApi, usersApi, shopsApi } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import {
  PLAN_LABEL,
  PLAN_PRICE_LINE,
} from "@/services/dashboardService";

/** Slug de plan (boutique.plan, source backend) → carte du comparatif */
const PLAN_TO_CARD: Record<string, string> = {
  starter: "starter",
  pro: "business",
  business: "business",
  enterprise: "enterprise",
};

type PlanOption = {
  id: "starter" | "business" | "enterprise";
  name: string;
  price: number;
  period: string;
  tagline: string;
  maxShops: number;
  highlight?: boolean;
  features: string[];
};

/** Offres de la plateforme — la carte « Actuelle » suit le vrai plan du marchand */
const PLANS: PlanOption[] = [
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
    price: 45000,
    period: "/ mois",
    tagline: "Pour grands réseaux & franchises",
    maxShops: 999,
    features: [
      "Produits illimités",
      "Boutiques illimitées",
      "Commission préférentielle négociée (1,5 %)",
      "Accompagnement dédié VIP",
    ],
  },
];

type SubscriptionPaymentMethod = "PAYDUNYA" | "MOBILE_MONEY" | "CARD";

const SUBSCRIPTION_PAYMENT_METHODS: Array<{
  id: SubscriptionPaymentMethod;
  label: string;
  hint: string;
}> = [
  {
    id: "PAYDUNYA",
    label: "PayDunya Checkout (Bénin)",
    hint: "Guichet officiel PayDunya : Portefeuille PayDunya, MTN Bénin, Moov Money Bénin, Celtiis Cash Bénin, Visa/Mastercard",
  },
  {
    id: "MOBILE_MONEY",
    label: "Mobile Money Bénin (via PayDunya)",
    hint: "MTN Bénin (MoMo), Moov Money Bénin, Celtiis Cash Bénin — débit réel sur PayDunya Sandbox / Live",
  },
  {
    id: "CARD",
    label: "Carte bancaire (via PayDunya)",
    hint: "Paiement sécurisé Visa ou Mastercard via PayDunya",
  },
];

const MOBILE_OPERATORS = [
  "MTN Bénin (MoMo)",
  "Moov Money Bénin",
  "Celtiis Cash Bénin",
] as const;

export function FormuleSection() {
  const session = useSession();
  const [toast, setToast] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<string>("starter");
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null);

  // Modale de paiement d'abonnement
  const [checkoutPlan, setCheckoutPlan] = useState<PlanOption | null>(null);
  const [selectedPayMethod, setSelectedPayMethod] =
    useState<SubscriptionPaymentMethod>("PAYDUNYA");
  const [selectedOperator, setSelectedOperator] = useState<string>(MOBILE_OPERATORS[0]);
  const [mobilePhone, setMobilePhone] = useState<string>("");
  const [cardHolder, setCardHolder] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardExpiry, setCardExpiry] = useState<string>("");
  const [cardCvc, setCardCvc] = useState<string>("");
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [profile, myShops] = await Promise.all([
      usersApi.me().catch(() => null),
      shopsApi.myShops().catch(() => []),
    ]);
    if (profile?.plan) {
      setActivePlan(profile.plan.toLowerCase());
    } else if (Array.isArray(myShops) && myShops.length > 0 && (myShops[0] as any).plan) {
      setActivePlan(String((myShops[0] as any).plan).toLowerCase());
    } else if (session?.user && (session.user as any).plan) {
      setActivePlan(String((session.user as any).plan).toLowerCase());
    }
    if (profile?.phone) {
      setMobilePhone((prev) => prev || profile.phone);
    } else if (session?.user?.phone) {
      setMobilePhone((prev) => prev || session.user.phone || "");
    }
    if (profile?.name) {
      setCardHolder((prev) => prev || profile.name);
    }
    if (Array.isArray(myShops)) {
      setShops(myShops);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Confirmation automatique au retour de PayDunya Checkout (?token=...&subscribed_plan=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const subscribedPlan = params.get("subscribed_plan");
    const cancelled = params.get("cancelled");

    if (cancelled) {
      setToast("Paiement PayDunya annulé. Votre formule actuelle reste inchangée.");
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("cancelled");
      window.history.replaceState({}, "", cleanUrl.toString());
      return;
    }

    if (!token) return;

    void ordersApi
      .confirmPayDunyaTransaction(token)
      .then(async (res) => {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("token");
        cleanUrl.searchParams.delete("subscribed_plan");
        window.history.replaceState({}, "", cleanUrl.toString());

        if (res.paydunyaStatus === "completed" || res.settlementStatus === "subscription_activated") {
          await loadData();
          setToast(
            `Paiement PayDunya confirmé ! Votre abonnement ${
              (subscribedPlan ?? "Business").toUpperCase()
            } est maintenant actif sur toutes vos boutiques.`,
          );
        } else {
          setToast("Votre paiement PayDunya est en cours de traitement.");
        }
      })
      .catch(() => {});
  }, [loadData]);

  const openCheckoutModal = (plan: PlanOption) => {
    setModalError(null);
    setSelectedPayMethod("PAYDUNYA");
    setCheckoutPlan(plan);
  };

  const handleSubscribe = async (
    planId: "starter" | "business" | "enterprise",
    paymentMethod: "PAYDUNYA" | "MOBILE_MONEY" | "CARD" | "DIRECT",
  ) => {
    if (subscribingPlan) return;

    if (paymentMethod === "MOBILE_MONEY" && !mobilePhone.trim()) {
      setModalError("Merci de renseigner votre numéro Mobile Money pour valider l'abonnement.");
      return;
    }
    if (paymentMethod === "CARD" && (!cardNumber.trim() || !cardExpiry.trim() || !cardCvc.trim())) {
      setModalError("Merci de renseigner les informations de votre carte bancaire.");
      return;
    }

    setModalError(null);
    setSubscribingPlan(`${planId}:${paymentMethod}`);
    try {
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/espace-vendeur/parametres/formule?subscribed_plan=${encodeURIComponent(planId)}`
          : undefined;
      const res = await shopsApi.subscribe({
        plan: planId,
        paymentMethod,
        operator: paymentMethod === "MOBILE_MONEY" ? selectedOperator : undefined,
        phone: paymentMethod === "MOBILE_MONEY" ? mobilePhone.trim() : undefined,
        callbackUrl,
      });

      if (res.mode === "paydunya_redirect" && res.checkoutUrl && typeof window !== "undefined") {
        window.location.href = res.checkoutUrl;
        return;
      }

      await loadData();
      setActivePlan(planId);
      setCheckoutPlan(null);
      setToast(
        planId === "starter"
          ? "Vous êtes repassé sur la formule Starter (Gratuit)."
          : `Félicitations ! Votre abonnement ${res.planName} est maintenant actif sur toutes vos boutiques.`,
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Impossible de modifier votre abonnement pour le moment.";
      if (checkoutPlan) {
        setModalError(msg);
      } else {
        setToast(msg);
      }
    } finally {
      setSubscribingPlan(null);
    }
  };

  const currentPlanId = PLAN_TO_CARD[activePlan] ?? "starter";
  const currentPlanConfig = PLANS.find((p) => p.id === currentPlanId) || PLANS[0];

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
          {currentPlanId === "starter" ? (
            <button
              type="button"
              onClick={() => openCheckoutModal(PLANS[1])}
              className="flex items-center gap-1.5 rounded-xl bg-ink-950 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-blue-700 active:scale-95 cursor-pointer"
            >
              <Icon name="sparkle" size={14} />
              Souscrire à Business
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openCheckoutModal(currentPlanConfig)}
              className="flex items-center gap-1.5 rounded-xl border border-gold-soft bg-gold-wash px-3.5 py-2 text-xs font-semibold text-gold-strong transition-all hover:bg-gold-soft/60 active:scale-95 cursor-pointer"
            >
              <Icon name="wallet" size={14} />
              Renouveler / Moyens de paiement
            </button>
          )}
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
                  <div className="mt-6 flex flex-col gap-2">
                    {plan.price > 0 ? (
                      <button
                        type="button"
                        disabled={Boolean(subscribingPlan) || loading}
                        onClick={() => openCheckoutModal(plan)}
                        className={cn(
                          "rounded-xl px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-60",
                          plan.highlight
                            ? "bg-ink-950 text-white hover:bg-blue-700"
                            : "border border-gold-soft bg-gold-wash text-gold-strong hover:bg-gold-soft/60",
                        )}
                      >
                        Passer à {plan.name} ({plan.price.toLocaleString("fr-FR")} FCFA)
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={Boolean(subscribingPlan) || loading}
                        onClick={() => void handleSubscribe(plan.id, "DIRECT")}
                        className="rounded-xl border border-gold-soft bg-gold-wash px-4 py-2.5 text-xs font-semibold text-gold-strong transition-all hover:bg-gold-soft/60 active:scale-95 cursor-pointer disabled:opacity-60"
                      >
                        {subscribingPlan === `${plan.id}:DIRECT`
                          ? "Changement en cours…"
                          : `Passer à ${plan.name}`}
                      </button>
                    )}
                  </div>
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

      {/* Modale de souscription & choix du moyen de paiement */}
      {checkoutPlan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Souscrire à la formule ${checkoutPlan.name}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-3xl border border-line bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-strong">
                  Souscription d&apos;abonnement
                </p>
                <h3 className="mt-1 font-display text-xl font-bold text-ink-950">
                  Formule {checkoutPlan.name} · {checkoutPlan.price.toLocaleString("fr-FR")} FCFA / mois
                </h3>
                <p className="mt-0.5 text-xs text-ink-500">
                  Choisissez votre moyen de paiement pour activer votre abonnement sur toutes vos boutiques.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutPlan(null)}
                className="rounded-full p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900 cursor-pointer"
                aria-label="Fermer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            {/* Sélection du moyen de paiement */}
            <div className="mt-5 space-y-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
                Moyen de paiement
              </p>
              {SUBSCRIPTION_PAYMENT_METHODS.map((method) => {
                const selected = selectedPayMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setSelectedPayMethod(method.id);
                      setModalError(null);
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer",
                      selected
                        ? "border-gold-strong bg-gold-wash/50 ring-1 ring-gold-strong/40"
                        : "border-line bg-white hover:border-gold-soft",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        selected
                          ? "border-gold-strong bg-gold-strong text-white"
                          : "border-ink-300 bg-white",
                      )}
                    >
                      {selected && <Icon name="check" size={10} />}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-ink-950">
                        {method.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {method.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Détails selon le moyen de paiement sélectionné */}
            <div className="mt-4 rounded-2xl border border-line bg-ink-50/50 p-4">
              {selectedPayMethod === "PAYDUNYA" && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-ink-900">
                    Canaux disponibles sur le guichet PayDunya :
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Portefeuille PayDunya",
                      "MTN Bénin (MoMo)",
                      "Moov Money Bénin",
                      "Celtiis Cash Bénin",
                      "Visa / Mastercard",
                    ].map((ch) => (
                      <span
                        key={ch}
                        className="rounded-full border border-gold-soft bg-white px-2.5 py-1 text-[11px] font-medium text-ink-800"
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedPayMethod === "MOBILE_MONEY" && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink-800">
                      Opérateur Mobile Money
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {MOBILE_OPERATORS.map((op) => (
                        <button
                          key={op}
                          type="button"
                          onClick={() => setSelectedOperator(op)}
                          className={cn(
                            "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                            selectedOperator === op
                              ? "border-ink-950 bg-ink-950 text-white"
                              : "border-line bg-white text-ink-700 hover:border-gold-soft",
                          )}
                        >
                          {op}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="sub-mm-phone"
                      className="mb-1 block text-xs font-semibold text-ink-800"
                    >
                      Numéro de téléphone Mobile Money
                    </label>
                    <input
                      id="sub-mm-phone"
                      type="tel"
                      value={mobilePhone}
                      onChange={(e) => setMobilePhone(e.target.value)}
                      placeholder="Ex. : 01 67 10 70 41"
                      className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 focus:border-gold-strong focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {selectedPayMethod === "CARD" && (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="sub-card-holder"
                      className="mb-1 block text-xs font-semibold text-ink-800"
                    >
                      Titulaire de la carte
                    </label>
                    <input
                      id="sub-card-holder"
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="Nom complet"
                      className="w-full rounded-xl border border-line bg-white px-3.5 py-2 text-sm text-ink-950 focus:border-gold-strong focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sub-card-number"
                      className="mb-1 block text-xs font-semibold text-ink-800"
                    >
                      Numéro de carte (Visa / Mastercard)
                    </label>
                    <input
                      id="sub-card-number"
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4000 0000 0000 0000"
                      className="w-full rounded-xl border border-line bg-white px-3.5 py-2 text-sm text-ink-950 focus:border-gold-strong focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="sub-card-exp"
                        className="mb-1 block text-xs font-semibold text-ink-800"
                      >
                        Expiration (MM/AA)
                      </label>
                      <input
                        id="sub-card-exp"
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="12/28"
                        className="w-full rounded-xl border border-line bg-white px-3.5 py-2 text-sm text-ink-950 focus:border-gold-strong focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="sub-card-cvc"
                        className="mb-1 block text-xs font-semibold text-ink-800"
                      >
                        CVC
                      </label>
                      <input
                        id="sub-card-cvc"
                        type="text"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        placeholder="123"
                        className="w-full rounded-xl border border-line bg-white px-3.5 py-2 text-sm text-ink-950 focus:border-gold-strong focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {modalError && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600"
              >
                {modalError}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCheckoutPlan(null)}
                disabled={Boolean(subscribingPlan)}
                className="rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-ink-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleSubscribe(checkoutPlan.id, selectedPayMethod)}
                disabled={Boolean(subscribingPlan)}
                className="rounded-xl bg-ink-950 px-5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                {subscribingPlan
                  ? "Traitement en cours…"
                  : selectedPayMethod === "PAYDUNYA"
                    ? `Payer sur PayDunya (${checkoutPlan.price.toLocaleString("fr-FR")} FCFA)`
                    : `Confirmer et activer (${checkoutPlan.price.toLocaleString("fr-FR")} FCFA)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accès facturation */}
      <DashboardCard className="p-6">
        <CardHeader
          title="Facturation & paiement"
          subtitle="Vos factures, reçus et moyens de paiement"
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: "wallet" as const,
              label: "Moyens de paiement (PayDunya, Mobile Money, Carte)",
              onClick: () => openCheckoutModal(currentPlanConfig.price > 0 ? currentPlanConfig : PLANS[1]),
            },
            {
              icon: "download" as const,
              label: "Factures & reçus",
              onClick: () =>
                setToast(
                  `Abonnement actif : ${PLAN_LABEL[activePlan] ?? activePlan.toUpperCase()} (${currentPlanConfig.price.toLocaleString("fr-FR")} FCFA / mois).`,
                ),
            },
            {
              icon: "calendar" as const,
              label: "Historique des paiements",
              onClick: () =>
                setToast(
                  currentPlanId === "starter"
                    ? "Aucun prélèvement sur la formule Starter (0 FCFA)."
                    : `Dernier règlement validé : ${currentPlanConfig.price.toLocaleString("fr-FR")} FCFA.`,
                ),
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
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
