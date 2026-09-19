"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Mail,
  MailCheck,
  Phone,
  ShoppingBag,
  Store,
  User,
  Users,
} from "lucide-react";
import AuthShell, {
  AuthInput,
  AuthLabel,
  AuthError,
  AuthSubmit,
  AuthCheckbox,
  AuthBackButton,
  AuthPasswordInput,
  AuthStepper,
} from "@/components/auth/AuthShell";
import { authApi } from "@/lib/api/auth";
import { setSession } from "@/lib/api/session";
import { friendlyAuthError } from "@/lib/api/errorMessages";
import type { FriendlyError } from "@/lib/api/errorMessages";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";

/**
 * Inscription unifiée en 3 étapes — friction minimale :
 *  1. Intention (Acheter / Vendre) — définit le parcours initial.
 *  2. Identité minimale : prénom, nom, e-mail (+ téléphone optionnel).
 *  3. Sécurité : mot de passe + code de vérification reçu par e-mail (OTP).
 * Le compte n'est créé qu'après validation du code → e-mail prouvé vérifié.
 * La création de boutique est une étape SÉPARÉE (onboarding vendeur).
 */

type Intent = "acheter" | "vendre";
type Step = "intent" | "identity" | "security" | "welcome";

const STEPS = ["Intention", "Identité", "Sécurité"];
/** Durée avant autorisation du renvoi du code (secondes) */
const RESEND_DELAY = 60;

/* ============================== Icônes =============================== */

const INTENTIONS: Array<{
  id: Intent;
  title: string;
  desc: string;
  cta: string;
  icon: React.ReactNode;
}> = [
  {
    id: "acheter",
    title: "Acheter",
    desc: "Découvrez des boutiques, explorez les produits et commandez simplement.",
    cta: "Continuer en tant que client",
    icon: <ShoppingBag className="h-6 w-6" aria-hidden="true" />,
  },
  {
    id: "vendre",
    title: "Vendre",
    desc: "Créez votre boutique, présentez vos produits et développez votre activité.",
    cta: "Commencer à vendre",
    icon: <Store className="h-6 w-6" aria-hidden="true" />,
  },
];

/* ======================= Saisie du code OTP (6 cases) ================= */

function OtpInput({
  value,
  onChange,
  disabled,
}: {
  /** Code complet (6 caractères) */
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const focusAt = (i: number) => {
    refs.current[Math.max(0, Math.min(5, i))]?.focus();
  };

  const handleChange = (i: number, raw: string) => {
    // Colle un code complet dans n'importe quelle case
    if (raw.length > 1) {
      const pasted = raw.replace(/\D/g, "").slice(0, 6);
      if (pasted) {
        onChange(pasted);
        if (pasted.length < 6) focusAt(pasted.length);
        else refs.current[5]?.blur();
      }
      return;
    }
    if (raw && !/\d/.test(raw)) return;
    const next = digits.slice();
    next[i] = raw;
    onChange(next.join(""));
    if (raw) focusAt(i + 1);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = digits.slice();
      if (next[i]) {
        next[i] = "";
        onChange(next.join(""));
      } else {
        // Retour à la case précédente en effaçant
        if (i > 0) {
          next[i - 1] = "";
          onChange(next.join(""));
          focusAt(i - 1);
        }
      }
    }
    if (e.key === "ArrowLeft") focusAt(i - 1);
    if (e.key === "ArrowRight") focusAt(i + 1);
  };

  return (
    <div className="flex justify-between gap-1.5 sm:gap-3" role="group" aria-label="Code de vérification à 6 chiffres">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          value={digit}
          disabled={disabled}
          aria-label={`Chiffre ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="h-11 sm:h-14 w-full min-w-0 rounded-lg sm:rounded-xl border border-line bg-surface text-center font-display text-lg sm:text-2xl font-bold text-ink-950 shadow-sm transition-all focus:border-gold-mid focus:outline-none focus:ring-2 focus:ring-gold-soft/60 focus:bg-white disabled:opacity-50"
        />
      ))}
    </div>
  );
}

/* ============================ Composant principal ==================== */

export default function InscriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const roleParam = (searchParams.get("role") || searchParams.get("intent") || "").toLowerCase();
  const planParam = searchParams.get("plan");

  const isSellerIntent = Boolean(
    roleParam === "seller" ||
    roleParam === "vendeur" ||
    roleParam === "vendre" ||
    planParam
  );

  const isClientIntent = Boolean(
    roleParam === "client" ||
    roleParam === "buyer" ||
    roleParam === "acheteur" ||
    roleParam === "acheter"
  );

  const [step, setStep] = useState<Step>(() => (isSellerIntent || isClientIntent ? "identity" : "intent"));
  const [intent, setIntent] = useState<Intent>(() => (isSellerIntent ? "vendre" : "acheter"));

  // Identité (étape 2)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Sécurité (étape 3)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  /** Secondes restantes avant nouveau renvoi possible */
  const [resendIn, setResendIn] = useState(0);

  // Compte à rebours du renvoi du code
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const chooseIntent = (value: Intent) => {
    setIntent(value);
    setError(null);
    setStep("identity");
  };

  const handleIdentityBack = () => {
    if (isSellerIntent || isClientIntent) {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        router.push("/");
      }
    } else {
      setStep("intent");
    }
  };

  const stepperSteps = (isSellerIntent || isClientIntent) && step !== "intent"
    ? ["Identité", "Sécurité"]
    : STEPS;

  const currentStepIndex = stepperSteps.length === 2
    ? (step === "identity" ? 0 : 1)
    : (step === "identity" ? 1 : 2);

  /* ---------- Étape 2 → 3 : envoi du code ---------- */

  const validateIdentity = (): FriendlyError | null => {
    if (!firstName.trim() || !lastName.trim()) {
      return {
        title: "Il manque votre nom",
        message:
          "Indiquez votre prénom et votre nom pour personnaliser votre compte.",
      };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return {
        title: "Adresse e-mail invalide",
        message:
          "Vérifiez la saisie : il manque peut-être un « @ » ou le domaine (ex. awa@exemple.com).",
      };
    }
    return null;
  };

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validationError = validateIdentity();
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    try {
      await authApi.sendRegisterCode({
        email: email.trim(),
        phone: phone.trim() || undefined,
      });
      setResendIn(RESEND_DELAY);
      setStep("security");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Étape 3 : validation finale ---------- */

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      return setError({
        title: "Il manque votre nom",
        message:
          "Retournez à l'étape précédente pour indiquer votre prénom et votre nom.",
      });
    }
    if (password.length < 6) {
      return setError({
        title: "Mot de passe trop court",
        message:
          "Choisissez un mot de passe d'au moins 6 caractères pour protéger votre compte.",
      });
    }
    if (password !== confirmPassword) {
      return setError({
        title: "Mots de passe différents",
        message:
          "La confirmation ne correspond pas au mot de passe saisi. Vérifiez les deux champs.",
      });
    }
    if (otp.length !== 6) {
      return setError({
        title: "Code incomplet",
        message:
          "Saisissez le code à 6 chiffres reçu par e-mail. Pensez à vérifier vos courriers indésirables.",
      });
    }
    if (!termsAccepted) {
      return setError({
        title: "Conditions non acceptées",
        message:
          "Cochez la case « J'accepte les conditions » pour créer votre compte.",
      });
    }

    setBusy(true);
    try {
      const auth = await authApi.completeRegistration({
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email: email.trim(),
        password,
        code: otp,
        role: intent === "vendre" ? "VENDEUR" : "CLIENT",
        phone: phone.trim() || undefined,
      });
      setSession({ accessToken: auth.accessToken, user: auth.user });

      if (intent === "vendre") {
        router.push(planParam ? `/onboarding/boutique?plan=${encodeURIComponent(planParam)}` : "/onboarding/boutique");
        return;
      }
      setStep("welcome");
    } catch (err) {
      setError(friendlyAuthError(err));
      // En cas de problème on garde tout ; le code reste saisissable
    } finally {
      setBusy(false);
    }
  };

  const focusFirstOtp = () => {
    document.querySelector<HTMLInputElement>('input[aria-label="Chiffre 1"]')?.focus();
  };

  /** Renvoi du code (même adresse) */
  const resendCode = useCallback(async () => {
    if (resendIn > 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await authApi.sendRegisterCode({
        email: email.trim(),
        phone: phone.trim() || undefined,
      });
      setOtp("");
      setResendIn(RESEND_DELAY);
      focusFirstOtp();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }, [resendIn, busy, email, phone]);

  const maskedEmail = (() => {
    const [local, domain] = email.trim().split("@");
    if (!domain) return email;
    const shown = local.slice(0, Math.min(2, local.length));
    return `${shown}${"•".repeat(Math.max(local.length - 2, 1))}@${domain}`;
  })();

  /* ================= Écran de bienvenue (client) ================= */

  if (step === "welcome") {
    return (
      <AuthShell
        eyebrow="Bienvenue"
        title={
          <>
            Votre compte est prêt,{" "}
            <span className="text-gold-strong">{firstName}</span> 🎉
          </>
        }
        subtitle="Découvrez les boutiques et produits disponibles près de vous."
        intent={intent}
      >
        <div className="space-y-6 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700"
          >
            <Check className="h-10 w-10" aria-hidden="true" />
          </motion.div>
          <p className="text-base leading-relaxed text-ink-600">
            Votre adresse est vérifiée ✓ Vous pourrez compléter votre profil
            plus tard depuis votre espace personnel.
          </p>
          <button
            type="button"
            onClick={() => router.push(next ?? "/marketplace")}
            className="inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-xl bg-midnight-950 px-6 py-3.5 text-base font-semibold text-ivory-50 shadow-lg shadow-ink-950/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-midnight-900 active:scale-[0.98]"
          >
            Explorer le marketplace
          </button>
        </div>
      </AuthShell>
    );
  }

  /* ================= Étape 1 — Intention ================= */

  if (step === "intent") {
    return (
      <AuthShell
        eyebrow="Créer un compte"
        title="Comment souhaitez-vous utiliser la plateforme ?"
        subtitle="Vous pourrez faire évoluer votre usage plus tard : un seul compte suffit."
        footer={
          <>
            <span className="text-ink-600">Déjà un compte ?</span>{" "}
            <Link href="/connexion" className="font-medium text-gold-strong hover:underline underline-offset-4">
              Se connecter
            </Link>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {INTENTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => chooseIntent(item.id)}
              className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-line bg-surface p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold-mid hover:shadow-lg hover:shadow-gold-mid/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-mid"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-wash text-gold-strong ring-1 ring-gold-soft transition-colors group-hover:bg-midnight-950 group-hover:text-gold-300">
                {item.icon}
              </span>
              <span className="font-display text-xl font-bold text-ink-950">{item.title}</span>
              <span className="text-sm leading-relaxed text-ink-600">{item.desc}</span>
              <span className="mt-auto pt-3 font-mono text-xs uppercase tracking-[0.14em] text-gold-strong">
                {item.cta} →
              </span>
            </button>
          ))}
        </div>
      </AuthShell>
    );
  }

  /* ================= Étapes 2 & 3 (transition animée) ================= */

  return (
    <AuthShell
      intent={intent}
      eyebrow={intent === "vendre" ? "Créer un compte Vendeur" : "Créer un compte Client"}
      title={
        step === "identity"
          ? intent === "vendre"
            ? "Créez votre compte vendeur"
            : "Faisons connaissance."
          : intent === "vendre"
            ? "Sécurisez votre compte vendeur"
            : "Sécurisez votre compte."
      }
      subtitle={
        step === "identity"
          ? intent === "vendre"
            ? "Renseignez vos coordonnées pour accéder directement à la création de votre boutique."
            : "L'inscription est rapide : seuls les éléments essentiels vous sont demandés."
          : `Nous venons d'envoyer un code à 6 chiffres à ${maskedEmail}.`
      }
      footer={
        <div className="flex flex-col items-center gap-3">
          {step === "security" && (
            <button
              type="button"
              onClick={() => setStep("identity")}
              className="text-sm font-medium text-ink-500 hover:text-ink-800 hover:underline underline-offset-4 transition-all"
            >
              Changer d&apos;adresse e-mail ?
            </button>
          )}
          {step === "identity" && (
            <button
              type="button"
              onClick={() => {
                if (intent === "vendre") {
                  setIntent("acheter");
                } else {
                  setIntent("vendre");
                }
              }}
              className="text-sm font-medium text-ink-500 hover:text-ink-800 hover:underline underline-offset-4 transition-all"
            >
              {intent === "vendre"
                ? "Vous souhaitez plutôt acheter ? Créer un compte client"
                : "Vous souhaitez plutôt vendre ? Créer un compte vendeur"}
            </button>
          )}
          <div>
            <span className="text-ink-600">Déjà un compte ?</span>{" "}
            <Link href="/connexion" className="font-medium text-gold-strong hover:underline underline-offset-4">
              Se connecter
            </Link>
          </div>
        </div>
      }
    >
      <AnimatePresence mode="wait">
        {/* ---------- Étape 2 : identité ---------- */}
        {step === "identity" && (
          <motion.form
            key="identity"
            onSubmit={handleIdentitySubmit}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-5"
            noValidate
          >
            <AuthStepper steps={stepperSteps} current={currentStepIndex} />
            {error && <AuthError title={error.title} message={error.message} />}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <AuthLabel htmlFor="firstName">Prénom *</AuthLabel>
                <AuthInput
                  id="firstName"
                  icon={<User />}
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Awa"
                  required
                  disabled={busy}
                />
              </div>
              <div>
                <AuthLabel htmlFor="lastName">Nom *</AuthLabel>
                <AuthInput
                  id="lastName"
                  icon={<Users />}
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Koné"
                  required
                  disabled={busy}
                />
              </div>
            </div>

            <div>
              <AuthLabel htmlFor="email">Adresse e-mail *</AuthLabel>
              <AuthInput
                id="email"
                icon={<Mail />}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="awa@exemple.com"
                required
                disabled={busy}
              />
            </div>

            <div>
              <AuthLabel htmlFor="phone">Téléphone (optionnel)</AuthLabel>
              <AuthInput
                id="phone"
                icon={<Phone />}
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+225 01 02 03 04 05"
                disabled={busy}
              />
              <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
                Il deviendra un moyen de connexion alternatif à votre e-mail.
              </p>
            </div>

            <AuthSubmit busy={busy}>Continuer</AuthSubmit>

            <SocialAuthButtons
              mode="register"
              role={intent === "vendre" ? "VENDEUR" : "CLIENT"}
              phone={phone}
              onError={(err) => setError(err)}
            />

            <div className="flex justify-start pt-2">
              <AuthBackButton onClick={handleIdentityBack} busy={busy} />
            </div>
          </motion.form>
        )}

        {/* ---------- Étape 3 : sécurité (mot de passe + code) ---------- */}
        {step === "security" && (
          <motion.form
            key="security"
            onSubmit={handleSecuritySubmit}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-6"
            noValidate
          >
            <AuthStepper steps={stepperSteps} current={currentStepIndex} />
            {error && (
              <AuthError
                title={error.title}
                message={error.message}
                variant={error.title === "Code incorrect" || error.title === "Code expiré" || error.title === "Trop d'essais" ? "info" : "error"}
              />
            )}

            {/* Bandeau confirmation d'envoi */}
            <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3.5">
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-green-700">
                Un code vient d&apos;être envoyé à{" "}
                <strong className="text-ink-950">{maskedEmail}</strong>. Il est
                valable 10 minutes.
              </p>
            </div>

            <div>
              <AuthLabel htmlFor="otp-root">Code de vérification</AuthLabel>
              <div id="otp-root">
                <OtpInput value={otp} onChange={setOtp} disabled={busy} />
              </div>
              <div className="mt-2.5 flex items-center justify-between text-sm">
                <span className="text-ink-400">Vous ne recevez rien ?</span>
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={resendIn > 0 || busy}
                  className="cursor-pointer font-semibold text-gold-strong transition-colors hover:text-ink-950 disabled:cursor-not-allowed disabled:text-ink-400"
                >
                  {resendIn > 0 ? `Renvoyer dans ${resendIn}s` : "Renvoyer le code"}
                </button>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <AuthLabel htmlFor="password">Mot de passe *</AuthLabel>
                <AuthPasswordInput
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 caractères minimum"
                  required
                  disabled={busy}
                />
              </div>
              <div>
                <AuthLabel htmlFor="confirmPassword">Confirmation *</AuthLabel>
                <AuthPasswordInput
                  id="confirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  required
                  disabled={busy}
                />
              </div>
            </div>

            <AuthCheckbox checked={termsAccepted} onChange={setTermsAccepted} />

            <AuthSubmit busy={busy}>Créer mon compte</AuthSubmit>

            <div className="flex justify-start">
              <AuthBackButton onClick={() => setStep("identity")} busy={busy} />
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
