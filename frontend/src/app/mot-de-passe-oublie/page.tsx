"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Check, Lock, KeyRound } from "lucide-react";
import { authApi } from "@/lib/api";
import AuthShell, {
  AuthInput,
  AuthLabel,
  AuthSubmit,
} from "@/components/auth/AuthShell";

type Step = "request" | "reset" | "success";

export default function MotDePasseOubliePage() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  
  // Champs pour l'étape de réinitialisation
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setBusy(true);
    setError(null);
    try {
      await authApi.forgotPassword({ email });
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Le code doit contenir 6 chiffres.");
      return;
    }
    if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&_\-]).{8,}$/.test(newPassword)) {
      setError("8 car. min, 1 maj, 1 min, 1 chiffre, 1 spécial.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await authApi.resetPassword({ email, code, newPassword });
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code incorrect ou invalide.");
    } finally {
      setBusy(false);
    }
  };

  if (step === "success") {
    return (
      <AuthShell
        intent="general"
        eyebrow="Mot de passe modifié"
        title="Succès !"
        subtitle="Votre mot de passe a bien été réinitialisé. Vous pouvez désormais vous connecter."
      >
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700">
            <Check className="h-10 w-10" aria-hidden="true" />
          </div>
          <Link
            href="/connexion"
            className="inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-xl bg-midnight-950 px-6 py-3.5 text-base font-semibold text-ivory-50 shadow-lg shadow-ink-950/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-midnight-900 active:scale-[0.98]"
          >
            Retour à la connexion
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (step === "reset") {
    return (
      <AuthShell
        intent="general"
        eyebrow="Vérification"
        title="Saisissez le code"
        subtitle={`Un code à 6 chiffres a été envoyé à ${email}.`}
        footer={
          <div className="text-center">
            <button
              type="button"
              onClick={() => setStep("request")}
              className="font-medium text-ink-500 hover:text-ink-800 underline underline-offset-4"
            >
              Changer d&apos;adresse e-mail ?
            </button>
          </div>
        }
      >
        <form onSubmit={handleResetPassword} className="space-y-5" noValidate>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <AuthLabel htmlFor="code">Code de sécurité</AuthLabel>
            <AuthInput
              id="code"
              icon={<KeyRound />}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              required
              disabled={busy}
              className="font-mono tracking-widest"
            />
          </div>

          <div>
            <AuthLabel htmlFor="newPassword">Nouveau mot de passe</AuthLabel>
            <AuthInput
              id="newPassword"
              icon={<Lock />}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8 car. min, 1 maj, 1 min, 1 chiffre, 1 spécial"
              required
              disabled={busy}
            />
          </div>

          <AuthSubmit busy={busy}>Modifier le mot de passe</AuthSubmit>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      intent="general"
      eyebrow="Récupération"
      title="Mot de passe oublié ?"
      subtitle="Saisissez l&apos;adresse e-mail associée à votre compte, nous vous enverrons un code pour le réinitialiser."
      footer={
        <div className="text-center">
          <span className="text-ink-600">Vous vous en souvenez ?</span>{" "}
          <Link href="/connexion" className="font-medium text-gold-strong hover:underline underline-offset-4">
            Se connecter
          </Link>
        </div>
      }
    >
      <form onSubmit={handleRequestOtp} className="space-y-5" noValidate>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        
        <div>
          <AuthLabel htmlFor="email">Adresse e-mail</AuthLabel>
          <AuthInput
            id="email"
            icon={<Mail />}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            required
            disabled={busy}
          />
        </div>

        <AuthSubmit busy={busy}>Envoyer le code</AuthSubmit>
      </form>
    </AuthShell>
  );
}
