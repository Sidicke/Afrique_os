"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Store, Tag } from "lucide-react";
import {
  AuthInput,
  AuthLabel,
  AuthError,
  AuthSubmit,
  AuthBackButton,
} from "@/components/auth/AuthShell";
import { shopsApi } from "@/lib/api/shops";
import { useSession } from "@/lib/useSession";
import { ApiError } from "@/lib/api/http";

const TOTAL_STEPS = 3;

const STEP_TITLES = ["Nom", "Activité", "Localisation"] as const;

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "ma-boutique"
  );
}

export default function OnboardingBoutiquePage() {
  const router = useRouter();
  const session = useSession();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [city, setCity] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    if (session.user.role !== "VENDEUR") {
      router.replace("/espace-client");
      return;
    }
    if (session.user.boutiqueId && !createdSlug) {
      router.replace("/dashboard");
    }
  }, [session, router, createdSlug]);

  const slugPreview = useMemo(() => slugify(name), [name]);

  if (!session) {
    return (
      <div className="relative min-h-screen bg-paper overflow-hidden">
        {/* Fake Dashboard Background */}
        <div className="absolute inset-0 z-0 flex pointer-events-none opacity-50 blur-[3px]">
           <div className="w-64 bg-midnight-950 h-full border-r border-line hidden md:block" />
           <div className="flex-1 flex flex-col">
              <div className="h-16 border-b border-line bg-surface" />
              <div className="p-8 space-y-6 w-full max-w-5xl mx-auto">
                 <div className="h-24 bg-surface rounded-2xl border border-line w-3/4" />
                 <div className="grid grid-cols-4 gap-4">
                    <div className="h-32 bg-surface rounded-xl border border-line" />
                    <div className="h-32 bg-surface rounded-xl border border-line" />
                    <div className="h-32 bg-surface rounded-xl border border-line" />
                    <div className="h-32 bg-surface rounded-xl border border-line" />
                 </div>
                 <div className="h-64 bg-surface rounded-2xl border border-line" />
              </div>
           </div>
        </div>

        {/* Modal Overlay */}
        <div className="relative z-10 flex min-h-screen items-center justify-center bg-midnight-950/40 backdrop-blur-md p-4">
           <div className="w-full max-w-lg bg-surface rounded-3xl shadow-2xl overflow-hidden border border-line">
              <div className="p-8">
                 <h2 className="text-2xl font-display font-bold text-ink-950 mb-2">Connexion requise.</h2>
                 <p className="text-sm text-ink-600 mb-6">Connectez-vous ou créez un compte pour commencer votre boutique.</p>
                 <div className="flex items-center gap-2">
                   <Link href="/connexion?next=/onboarding/boutique" className="font-medium text-gold-strong hover:underline underline-offset-4">
                     Se connecter
                   </Link>
                   <span className="text-ink-300">·</span>
                   <Link href="/inscription" className="font-medium text-ink-500 hover:text-ink-800 underline underline-offset-4">
                     Créer un compte
                   </Link>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  const validateStep = (): string | null => {
    switch (step) {
      case 1:
        if (name.trim().length < 2) return "Le nom de la boutique est requis (2 caractères minimum).";
        return null;
      case 2:
        if (!tagline.trim()) return "Veuillez renseigner votre activité ou catégorie.";
        return null;
      case 3:
        if (!city.trim()) return "Veuillez renseigner votre localisation.";
        return null;
      default:
        return null;
    }
  };

  const nextStep = () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const prevStep = () => {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  };

  const handleCreate = async () => {
    setError("");
    setBusy(true);
    try {
      const boutique = await shopsApi.create({
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        city: city.trim() || undefined,
      });
      setCreatedSlug(boutique.slug);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Une erreur est survenue. Veuillez réessayer.",
      );
    } finally {
      setBusy(false);
    }
  };

  const renderStepFields = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-2">
            <AuthLabel htmlFor="shopName">Nom de la boutique *</AuthLabel>
            <AuthInput
              id="shopName"
              icon={<Store />}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. : Wax & Style"
              required
              disabled={busy}
              autoFocus
            />
            {name.trim().length >= 2 && (
              <p className="text-xs text-ink-500">
                Votre adresse :{" "}
                <span className="font-mono text-gold-strong">/boutique/{slugPreview}</span>
              </p>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-2">
            <AuthLabel htmlFor="tagline">Votre activité ou catégorie *</AuthLabel>
            <AuthInput
              id="tagline"
              icon={<Tag />}
              type="text"
              maxLength={140}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Mode africaine artisanale..."
              disabled={busy}
              autoFocus
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-2">
            <AuthLabel htmlFor="city">Localisation (Ville / Quartier) *</AuthLabel>
            <AuthInput
              id="city"
              icon={<MapPin />}
              type="text"
              maxLength={80}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex: Abidjan, Cocody"
              disabled={busy}
              autoFocus
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderSuccessScreen = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <div className="rounded-2xl border border-line bg-paper p-5 text-left">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
          Votre vitrine
        </p>
        <p className="mt-2 font-display text-lg font-bold text-ink-950">{name}</p>
        <p className="mt-1 font-mono text-xs text-gold-strong">/boutique/{createdSlug}</p>
        <ul className="mt-4 space-y-2 text-xs leading-relaxed text-ink-600">
          <li>✓ Ajoutez vos premiers produits depuis le tableau de bord</li>
          <li>✓ Complétez vos visuels et informations dans les paramètres</li>
          <li>✓ La vérification débloque le badge « Boutique Vérifiée ✓ »</li>
        </ul>
      </div>

      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-xl bg-midnight-950 px-6 py-3.5 text-sm font-semibold text-ivory-50 shadow-lg shadow-ink-950/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-midnight-900 active:scale-[0.98]"
      >
        Aller à mon tableau de bord
      </button>
      <button
        type="button"
        onClick={() => router.push(`/boutique/${createdSlug}`)}
        className="text-sm font-medium text-gold-strong underline underline-offset-4 hover:text-ink-950"
      >
        Voir ma vitrine publique
      </button>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-paper overflow-hidden">
      {/* Fake Dashboard Background */}
      <div className="absolute inset-0 z-0 flex pointer-events-none opacity-50 blur-[3px]">
         <div className="w-64 bg-midnight-950 h-full border-r border-line hidden md:block" />
         <div className="flex-1 flex flex-col">
            <div className="h-16 border-b border-line bg-surface" />
            <div className="p-8 space-y-6 w-full max-w-5xl mx-auto">
               <div className="h-24 bg-surface rounded-2xl border border-line w-3/4" />
               <div className="grid grid-cols-4 gap-4">
                  <div className="h-32 bg-surface rounded-xl border border-line" />
                  <div className="h-32 bg-surface rounded-xl border border-line" />
                  <div className="h-32 bg-surface rounded-xl border border-line" />
                  <div className="h-32 bg-surface rounded-xl border border-line" />
               </div>
               <div className="h-64 bg-surface rounded-2xl border border-line" />
            </div>
         </div>
      </div>

      {/* Modal Overlay */}
      <div className="relative z-10 flex min-h-screen items-center justify-center bg-midnight-950/40 backdrop-blur-md p-4">
         <div className="w-full max-w-lg bg-surface rounded-3xl shadow-2xl overflow-hidden border border-line">
            <div className="p-8">
               
               {createdSlug ? (
                 <>
                   <h2 className="text-2xl font-display font-bold text-ink-950 mb-2">Félicitations, votre boutique existe ! 🎉</h2>
                   <p className="text-sm text-ink-600 mb-6">Elle est en cours de vérification par notre équipe. Vous pouvez déjà préparer votre catalogue.</p>
                   {renderSuccessScreen()}
                 </>
               ) : (
                 <>
                   <h2 className="text-2xl font-display font-bold text-ink-950 mb-2">Configuration de votre boutique</h2>
                   <p className="text-sm text-ink-600 mb-6">Plus que quelques informations avant d&apos;accéder à votre tableau de bord.</p>

                   <form
                     onSubmit={(e) => {
                       e.preventDefault();
                       if (step === TOTAL_STEPS) void handleCreate();
                       else nextStep();
                     }}
                     className="space-y-6"
                     noValidate
                   >
                     {/* Indicateur de progression */}
                     <ol className="flex items-center gap-1.5" aria-label={`Étape ${step} sur ${TOTAL_STEPS}`}>
                       {STEP_TITLES.map((title, i) => {
                         const n = i + 1;
                         const done = step > n;
                         const current = step === n;
                         return (
                           <li key={title} className="flex flex-1 flex-col items-center gap-1.5">
                             <span
                               aria-current={current ? "step" : undefined}
                               className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-bold transition-colors ${
                                 done
                                   ? "bg-green-100 text-green-700"
                                   : current
                                     ? "bg-midnight-950 text-ivory-50"
                                     : "border border-line bg-surface text-ink-300"
                               }`}
                             >
                               {done ? (
                                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                   <path d="M20 6L9 17l-5-5" />
                                 </svg>
                               ) : (
                                 n
                               )}
                             </span>
                             <span
                               className={`hidden font-mono text-[10px] uppercase tracking-[0.12em] sm:block ${
                                 current ? "text-ink-950" : "text-ink-400"
                               }`}
                             >
                               {title}
                             </span>
                           </li>
                         );
                       })}
                     </ol>

                     {error && <AuthError message={error} />}

                     {renderStepFields()}

                     <div className="flex items-center justify-between gap-3 pt-2">
                       {step > 1 ? (
                         <AuthBackButton onClick={prevStep} busy={busy} />
                       ) : (
                         <div /> // Placeholder to keep spacing for justify-between
                       )}
                       {step === TOTAL_STEPS ? (
                         <AuthSubmit busy={busy}>Terminer</AuthSubmit>
                       ) : (
                         <button
                           type="submit"
                           disabled={busy}
                           className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl bg-midnight-950 px-6 py-3.5 text-sm font-semibold text-ivory-50 shadow-lg shadow-ink-950/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-midnight-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                         >
                           Continuer
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                             <path d="M5 12h14M12 5l7 7-7 7" />
                           </svg>
                         </button>
                       )}
                     </div>

                     <div className="text-center mt-6">
                        <button
                          type="button"
                          onClick={() => router.push("/dashboard")}
                          className="font-medium text-sm text-ink-500 underline underline-offset-4 hover:text-ink-800"
                        >
                          Terminer plus tard
                        </button>
                     </div>
                   </form>
                 </>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
