"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { shopsApi } from "@/lib/api";
import { switchActiveBoutique } from "@/lib/api/session";
import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { Icon } from "@/components/dashboard/icons";
import { cn } from "@/lib/utils";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

const STEPS = [
  { step: 1, title: "Identité", desc: "Nom & présentation" },
  { step: 2, title: "Coordonnées", desc: "Ville & contact" },
  { step: 3, title: "Confirmation", desc: "Aperçu & lancement" },
];

export default function NouvelleBoutiquePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [planLimitBlocked, setPlanLimitBlocked] = useState<{
    plan: string;
    currentCount: number;
    maxCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    tagline: "",
    description: "",
    city: "",
    country: "Côte d'Ivoire",
    phone: "",
    email: "",
  });

  useEffect(() => {
    async function checkPlanLimits() {
      try {
        const myShops = await shopsApi.myShops();
        const userPlan = myShops.some((b: any) => b.plan === "enterprise")
          ? "enterprise"
          : myShops.some((b: any) => b.plan === "business")
          ? "business"
          : "starter";

        const maxBoutiques = userPlan === "enterprise" ? Infinity : userPlan === "business" ? 3 : 1;
        if (myShops.length >= maxBoutiques) {
          setPlanLimitBlocked({
            plan: userPlan,
            currentCount: myShops.length,
            maxCount: maxBoutiques,
          });
        }
      } catch (err) {
        console.error("Erreur vérification quotas boutique:", err);
      } finally {
        setCheckingPlan(false);
      }
    }
    checkPlanLimits();
  }, []);

  const slug = slugify(form.name) || "ma-boutique";

  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      if (!form.name.trim() || form.name.trim().length < 2) {
        setError("Le nom de la boutique doit comporter au moins 2 caractères.");
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrev = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Le nom de la boutique est requis.");
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const created = await shopsApi.create({
        name: form.name.trim(),
        tagline: form.tagline.trim() || undefined,
        description: form.description.trim() || undefined,
        city: form.city.trim() || undefined,
        country: form.country.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });

      // Switch direct sur la nouvelle boutique créée
      if (created?.id && created?.slug) {
        switchActiveBoutique(created.id, created.slug, created.name);
      }

      router.push("/espace-vendeur/parametres");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue lors de la création de la boutique.");
      setLoading(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink-950 transition-all focus:border-gold-strong focus:outline-none focus:ring-2 focus:ring-gold-soft/40";
  const labelCls = "mb-1.5 block text-xs font-bold text-ink-700 uppercase tracking-wider";

  if (checkingPlan) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full pb-12 animate-pulse">
        <div className="h-16 w-1/2 rounded-2xl bg-ink-100" />
        <div className="h-48 rounded-3xl bg-ink-100" />
      </div>
    );
  }

  if (planLimitBlocked) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="rounded-3xl border border-line bg-surface p-8 text-center shadow-lg shadow-ink-950/[0.04]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-wash border border-gold-soft text-gold-strong">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="inline-block rounded-full bg-gold-wash px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-gold-strong border border-gold-soft">
            Formule {planLimitBlocked.plan.toUpperCase()}
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink-950">
            {planLimitBlocked.plan === "starter"
              ? "Boutique Unique (Starter)"
              : "Quota de boutiques atteint"}
          </h1>
          <p className="mt-2 text-sm text-ink-500 leading-relaxed">
            {planLimitBlocked.plan === "starter"
              ? "Votre formule Starter comprend 1 seule boutique (déjà active). Pour créer et gérer plusieurs boutiques simultanément, passez à la formule Business."
              : `Vous avez atteint la limite de ${planLimitBlocked.maxCount} boutiques de votre formule ${planLimitBlocked.plan}. Contactez le support pour une extension.`}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/espace-vendeur/parametres/formule"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-700/25 transition hover:bg-blue-800"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Découvrir les offres Business
            </Link>
            <Link
              href="/espace-vendeur/mes-boutiques"
              className="flex w-full sm:w-auto items-center justify-center rounded-xl border border-line bg-surface px-5 py-3 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
            >
              Retour à mes boutiques
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full pb-12">
      <PageHeader
        eyebrow="Multi-Boutiques"
        title="Créer une nouvelle enseigne"
        description="Configurez une nouvelle boutique indépendante pour segmenter votre offre commerciale."
      />

      {/* Stepper horizontal visuel */}
      <div className="grid grid-cols-3 gap-3">
        {STEPS.map((s) => {
          const isActive = currentStep === s.step;
          const isDone = currentStep > s.step;

          return (
            <div
              key={s.step}
              className={cn(
                "flex flex-col gap-1 rounded-2xl border p-3.5 sm:p-4 transition-all duration-300 shadow-2xs",
                isActive
                  ? "border-gold-strong/80 bg-gold-wash/50 ring-2 ring-gold-mid/30"
                  : isDone
                  ? "border-emerald-200 bg-emerald-50/50"
                  : "border-line bg-surface opacity-70"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    isActive
                      ? "bg-gold-strong text-white"
                      : isDone
                      ? "bg-emerald-600 text-white"
                      : "bg-ink-100 text-ink-500"
                  )}
                >
                  {isDone ? "✓" : s.step}
                </span>
                <span className={cn("text-xs font-bold", isActive ? "text-ink-950" : "text-ink-700")}>
                  {s.title}
                </span>
              </div>
              <span className="text-[11px] text-ink-400 hidden sm:block">{s.desc}</span>
            </div>
          );
        })}
      </div>

      <DashboardCard className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 shadow-xs">
              <Icon name="alert" size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* ÉTAPE 1 : IDENTITÉ */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="border-b border-line/60 pb-3">
                <h3 className="font-display text-base font-bold text-ink-950">
                  Étape 1 · Identité de votre boutique
                </h3>
                <p className="mt-0.5 text-xs text-ink-500">
                  Définissez le nom public et l&apos;esprit de votre nouvelle vitrine.
                </p>
              </div>

              <div>
                <label className={labelCls}>Nom de la boutique *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex : Aziz Meubles, Dakar Mode, Tech Zone..."
                  className={inputCls}
                />
                <p className="mt-1.5 font-mono text-[11px] text-ink-400">
                  Lien de votre vitrine :{" "}
                  <span className="font-bold text-gold-strong">/b/{slug}</span>
                </p>
              </div>

              <div>
                <label className={labelCls}>Slogan / Phrase d&apos;accroche (Optionnel)</label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  placeholder="Ex : L'excellence du mobilier au meilleur prix"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Description courte de l&apos;activité (Optionnel)</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Présentez en quelques phrases la spécialité de cette enseigne..."
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : COORDONNÉES */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="border-b border-line/60 pb-3">
                <h3 className="font-display text-base font-bold text-ink-950">
                  Étape 2 · Localisation & Contacts de l&apos;enseigne
                </h3>
                <p className="mt-0.5 text-xs text-ink-500">
                  Ces coordonnées apparaîtront sur la vitrine pour rassurer vos acheteurs locaux.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Pays</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="Ex : Côte d'Ivoire, Mali, Sénégal..."
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Ville ou Quartier</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Ex : Abidjan, Plateau, Bamako..."
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Téléphone ou WhatsApp commercial</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Ex : +225 07 00 00 00 00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Email de contact boutique</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Ex : contact@monenseigne.com"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : CONFIRMATION & APERÇU */}
          {currentStep === 3 && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="border-b border-line/60 pb-3">
                <h3 className="font-display text-base font-bold text-ink-950">
                  Étape 3 · Récapitulatif & Lancement
                </h3>
                <p className="mt-0.5 text-xs text-ink-500">
                  Vérifiez les paramètres de votre nouvelle boutique avant sa création.
                </p>
              </div>

              {/* Aperçu sous forme de carte vitrine */}
              <div className="overflow-hidden rounded-2xl border border-gold-soft bg-gradient-to-br from-gold-wash/50 via-white to-surface p-5 shadow-xs">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-strong text-white font-display text-lg font-bold shadow-md shadow-gold-strong/20">
                      {form.name.slice(0, 2).toUpperCase() || "NB"}
                    </div>
                    <div>
                      <h4 className="font-display text-lg font-bold text-ink-950">
                        {form.name}
                      </h4>
                      <p className="font-mono text-xs text-gold-strong font-semibold">
                        /b/{slug}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
                    Prête à être activée ✓
                  </span>
                </div>

                {form.tagline && (
                  <p className="mt-3 text-xs italic text-ink-600">
                    « {form.tagline} »
                  </p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line/60 pt-3 text-xs text-ink-600">
                  <div>
                    <span className="block font-mono text-[10px] font-bold uppercase text-ink-400">
                      Localisation
                    </span>
                    <p className="font-semibold text-ink-800">
                      {form.city ? `${form.city}, ` : ""}{form.country || "Non précisé"}
                    </p>
                  </div>
                  <div>
                    <span className="block font-mono text-[10px] font-bold uppercase text-ink-400">
                      Contact
                    </span>
                    <p className="font-semibold text-ink-800">
                      {form.phone || form.email || "Non renseigné"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-800">
                💡 <strong>Multi-boutique indépendant :</strong> Cette nouvelle boutique aura son propre catalogue, ses visuels et ses conditions de livraison, tout en étant gérée directement depuis votre espace vendeur.
              </div>
            </div>
          )}

          {/* Boutons de navigation du formulaire par étapes */}
          <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-5">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-bold text-ink-700 transition hover:bg-ink-50 active:scale-95 cursor-pointer"
              >
                ← Étape précédente
              </button>
            ) : (
              <Link
                href="/espace-vendeur/parametres"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-bold text-ink-600 transition hover:bg-ink-50"
              >
                Annuler
              </Link>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-xl bg-ink-950 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 cursor-pointer"
              >
                Suivant : {STEPS[currentStep].title} →
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gold-strong px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-gold-strong/20 transition hover:bg-gold-strong/90 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Icon name="store" size={14} />
                {loading ? "Création en cours…" : "Créer et activer la boutique"}
              </button>
            )}
          </div>
        </form>
      </DashboardCard>
    </div>
  );
}
