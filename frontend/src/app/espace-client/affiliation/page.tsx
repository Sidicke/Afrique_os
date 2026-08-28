"use client";

import { useEffect, useState } from "react";
import { usersApi, type ApiAffiliationDetails } from "@/lib/api";
import { formatFcfa } from "@/lib/utils";
import {
  IconGift,
  IconCheck,
  IconSparkle,
  IconClock,
  IconUser,
} from "@/components/client/icons";

export default function AffiliationPage() {
  const [data, setData] = useState<ApiAffiliationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    usersApi
      .affiliation()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erreur chargement affiliation:", err);
        setLoading(false);
      });
  }, []);

  const referralCode = data?.referralCode || "";
  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/inscription?ref=${referralCode}`
      : "";

  const handleCopyCode = () => {
    if (!referralCode) return;
    void navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    if (!referralLink) return;
    void navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6">
        {/* Header Hero */}
        <section
          aria-label="En-tête Affiliation"
          className="relative overflow-hidden rounded-3xl bg-midnight-950 px-6 py-8 text-white sm:px-8 sm:py-10"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            aria-hidden="true"
          >
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold-400 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-gold-600/30 blur-3xl" />
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-3.5 py-1 text-xs font-semibold text-gold-300">
              <IconGift className="h-4 w-4" />
              <span>Programme de Récompenses</span>
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Affiliation & Points Fidélité
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-base">
              Invitez vos proches et gagnez <span className="font-semibold text-gold-300">0.75%</span> de commission en points sur <span className="font-semibold text-white">tous leurs achats</span>. Gagnez aussi <span className="font-semibold text-gold-300">0.75%</span> de cashback sur vos propres commandes !
            </p>
          </div>
        </section>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-midnight-950/10 bg-midnight-950/5"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Solde Points */}
            <div className="rounded-2xl border border-gold-400/30 bg-gradient-to-br from-gold-400/10 to-transparent p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-800">
                Solde disponible
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-3xl font-extrabold text-midnight-950">
                  {data?.pointsBalance.toLocaleString() || 0}
                </span>
                <span className="text-sm font-semibold text-gold-700">pts</span>
              </div>
              <p className="mt-1 text-xs text-midnight-950/60">
                Valeur : {formatFcfa(data?.pointsBalance || 0)} (1 pt = 1 FCFA)
              </p>
            </div>

            {/* Filleuls inscrits */}
            <div className="rounded-2xl border border-midnight-950/10 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-midnight-950/60">
                Personnes invitées
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-3xl font-extrabold text-midnight-950">
                  {data?.refereesCount || 0}
                </span>
                <span className="text-sm font-semibold text-midnight-950/50">
                  {data?.refereesCount && data.refereesCount > 1 ? "filleuls" : "filleul"}
                </span>
              </div>
              <p className="mt-1 text-xs text-midnight-950/60">
                Inscrits avec votre code
              </p>
            </div>

            {/* Total gains parrainage */}
            <div className="rounded-2xl border border-midnight-950/10 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-midnight-950/60">
                Gains parrainage
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-3xl font-extrabold text-green-700">
                  +{data?.totalEarnedReferral.toLocaleString() || 0}
                </span>
                <span className="text-sm font-semibold text-green-600">pts</span>
              </div>
              <p className="mt-1 text-xs text-midnight-950/60">
                Générés par vos filleuls
              </p>
            </div>

            {/* Total cashback personnel */}
            <div className="rounded-2xl border border-midnight-950/10 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-midnight-950/60">
                Cashback personnel
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-3xl font-extrabold text-midnight-950">
                  +{data?.totalEarnedCashback.toLocaleString() || 0}
                </span>
                <span className="text-sm font-semibold text-midnight-950/50">pts</span>
              </div>
              <p className="mt-1 text-xs text-midnight-950/60">
                Sur vos commandes
              </p>
            </div>
          </div>
        )}

        {/* Section Partage du Code & Lien */}
        <section className="rounded-3xl border border-midnight-950/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-2">
              <h2 className="font-display text-xl font-bold text-midnight-950 sm:text-2xl">
                Partagez et commencez à gagner
              </h2>
              <p className="text-sm text-midnight-950/70">
                Transmettez votre code de parrainage ou votre lien direct d&apos;inscription. Vos amis l&apos;utilisent lors de leur inscription, et vous touchez automatiquement 0.75% sur toutes leurs commandes finalisées.
              </p>
            </div>

            {/* Boîtes de copie */}
            <div className="flex w-full flex-col gap-3.5 lg:w-auto lg:min-w-[420px]">
              {/* Code */}
              <div>
                <label className="mb-1 block text-xs font-medium text-midnight-950/70">
                  Votre code de parrainage
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-xl border border-midnight-950/15 bg-midnight-950/5 px-4 py-2.5 font-mono text-base font-bold tracking-wider text-midnight-950">
                    {referralCode || "..."}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    disabled={!referralCode}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-midnight-950 px-4 py-2.5 text-sm font-semibold text-gold-300 transition-transform active:scale-95"
                  >
                    {copiedCode ? (
                      <>
                        <IconCheck className="h-4 w-4 text-green-400" />
                        <span>Copié !</span>
                      </>
                    ) : (
                      <span>Copier le code</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Lien */}
              <div>
                <label className="mb-1 block text-xs font-medium text-midnight-950/70">
                  Lien d&apos;inscription direct
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={referralLink}
                    className="w-full flex-1 truncate rounded-xl border border-midnight-950/15 bg-midnight-950/5 px-3.5 py-2.5 text-xs text-midnight-950/80 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    disabled={!referralLink}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-midnight-950/15 bg-white px-4 py-2.5 text-sm font-medium text-midnight-950 transition-colors hover:border-gold-400 active:scale-95"
                  >
                    {copiedLink ? (
                      <>
                        <IconCheck className="h-4 w-4 text-green-600" />
                        <span>Lien copié !</span>
                      </>
                    ) : (
                      <span>Copier le lien</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Étapes claires */}
          <div className="mt-8 grid grid-cols-1 gap-4 border-t border-midnight-950/8 pt-8 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-midnight-950 font-display text-sm font-extrabold text-gold-300 shadow-sm ring-2 ring-gold-400/40">
                1
              </div>
              <div>
                <h3 className="text-sm font-bold text-midnight-950">Invitez</h3>
                <p className="mt-0.5 text-xs text-midnight-950/60">
                  Partagez votre code à vos amis par WhatsApp, réseaux ou SMS.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-midnight-950 font-display text-sm font-extrabold text-gold-300 shadow-sm ring-2 ring-gold-400/40">
                2
              </div>
              <div>
                <h3 className="text-sm font-bold text-midnight-950">Ils commandent</h3>
                <p className="mt-0.5 text-xs text-midnight-950/60">
                  Dès qu&apos;ils effectuent un achat sur le marketplace.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-midnight-950 font-display text-sm font-extrabold text-gold-300 shadow-sm ring-2 ring-gold-400/40">
                3
              </div>
              <div>
                <h3 className="text-sm font-bold text-midnight-950">Vous gagnez</h3>
                <p className="mt-0.5 text-xs text-midnight-950/60">
                  Recevez 0.75% en points utilisables comme argent réel à la caisse.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section Deux Colonnes : Filleuls & Historique */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Tableau des Filleuls */}
          <section className="flex flex-col rounded-3xl border border-midnight-950/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-midnight-950">
                  Mes Filleuls
                </h2>
                <p className="text-xs text-midnight-950/60">
                  Liste des personnes inscrites avec votre code
                </p>
              </div>
              <span className="rounded-full bg-midnight-950/5 px-2.5 py-1 text-xs font-semibold text-midnight-950">
                {data?.referees.length || 0}
              </span>
            </div>

            <div className="mt-4 flex-1">
              {!data?.referees || data.referees.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-midnight-950/15 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-midnight-950/5 text-midnight-950/40">
                    <IconUser className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-midnight-950">
                    Aucun filleul pour le moment
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-midnight-950/60">
                    Partagez votre code dès aujourd&apos;hui pour voir vos premiers filleuls apparaître ici.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-midnight-950/8">
                  {data.referees.map((referee) => (
                    <div
                      key={referee.id}
                      className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-400/15 font-display text-xs font-bold text-gold-900">
                          {referee.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-midnight-950">
                            {referee.name}
                          </p>
                          <p className="text-xs text-midnight-950/50">
                            {referee.email} · Inscrit le{" "}
                            {new Date(referee.createdAt).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-sm font-bold text-green-700">
                          +{referee.pointsGenerated} pts
                        </span>
                        <p className="text-[10px] text-midnight-950/40">rapportés</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Historique des Transactions de Points */}
          <section className="flex flex-col rounded-3xl border border-midnight-950/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-midnight-950">
                  Historique des Points
                </h2>
                <p className="text-xs text-midnight-950/60">
                  Détail de vos gains et utilisations
                </p>
              </div>
              <IconSparkle className="h-5 w-5 text-gold-600" />
            </div>

            <div className="mt-4 flex-1">
              {!data?.transactions || data.transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-midnight-950/15 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-midnight-950/5 text-midnight-950/40">
                    <IconClock className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-midnight-950">
                    Aucune transaction de points
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-midnight-950/60">
                    Vos points apparaîtront dès que vous ou vos filleuls passerez une commande.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-midnight-950/8">
                  {data.transactions.map((tx) => {
                    const isPositive = tx.amount > 0;
                    let label = "Gain de points";
                    if (tx.reason === "CASHBACK_PURCHASE") label = "Cashback sur achat (0.75%)";
                    if (tx.reason === "CASHBACK_REFERRAL") label = "Commission parrainage (0.75%)";
                    if (tx.reason === "SPENT_ON_ORDER") label = "Utilisation lors d'une commande";

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-midnight-950">{label}</p>
                          <p className="text-xs text-midnight-950/50">
                            {new Date(tx.createdAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="text-right font-display text-sm font-bold">
                          <span className={isPositive ? "text-green-700" : "text-red-600"}>
                            {isPositive ? `+${tx.amount}` : tx.amount} pts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
  );
}
