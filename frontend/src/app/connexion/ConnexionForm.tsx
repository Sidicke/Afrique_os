"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { User } from "lucide-react";
import AuthShell, {
  AuthInput,
  AuthLabel,
  AuthError,
  AuthSubmit,
  AuthPasswordInput,
} from "@/components/auth/AuthShell";
import { authApi } from "@/lib/api/auth";
import { setSession, getSessionUser } from "@/lib/api/session";
import { friendlyAuthError } from "@/lib/api/errorMessages";
import type { FriendlyError } from "@/lib/api/errorMessages";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";

/**
 * Connexion UNIQUE — pas de « connexion client » ni « connexion vendeur ».
 * Le système connaît les rôles du compte et redirige automatiquement :
 *   ADMIN → dashboard admin · VENDEUR → dashboard vendeur · CLIENT → espace client.
 * L'utilisateur se connecte avec son e-mail OU son numéro de téléphone.
 */

/** Destination par défaut selon les capacités du compte */
function destinationFor(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "VENDEUR":
      return "/espace-vendeur";
    default:
      return "/espace-client";
  }
}

function safeDest(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;
  if (next.startsWith("//") || next.includes("://") || next.includes("\\")) {
    return fallback;
  }
  if (next.startsWith("/")) return next;
  return fallback;
}

export default function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);

  // Déjà connecté ? Redirection immédiate selon le rôle du compte.
  const existingUser = getSessionUser();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError({
        title: "Champs incomplets",
        message:
          "Saisissez votre e-mail (ou téléphone) ainsi que votre mot de passe pour vous connecter.",
      });
      return;
    }

    setBusy(true);
    try {
      const auth = await authApi.login({
        identifier: identifier.trim(),
        password,
      });
      setSession({ accessToken: auth.accessToken, user: auth.user });
      router.push(safeDest(next, destinationFor(auth.user.role)));
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Connexion"
      title="Content de vous revoir."
      subtitle="Vos boutiques, vos commandes et vos discussions au même endroit."
      footer={
        <>
          <span className="text-ink-600">Pas encore de compte ?</span>{" "}
          <Link
            href={next ? `/inscription?next=${encodeURIComponent(next)}` : "/inscription"}
            className="font-medium text-gold-strong hover:underline underline-offset-4"
          >
            Créer un compte
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <AuthError
            title={error.title}
            message={error.message}
            variant="error"
          />
        )}

        {existingUser && !busy && (
          <div className="rounded-xl border border-line bg-gold-wash px-4 py-3 text-sm text-ink-700">
            Une session est déjà active pour{" "}
            <strong className="text-ink-950">{existingUser.email}</strong>.{" "}
            <Link href={destinationFor(existingUser.role)} className="font-semibold text-gold-strong underline underline-offset-2">
              Reprendre où j&apos;en étais
            </Link>
          </div>
        )}

        <div>
          <AuthLabel htmlFor="identifier">E-mail ou téléphone</AuthLabel>
          <AuthInput
            id="identifier"
            icon={<User />}
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="vous@exemple.com ou +225 01 02 03 04"
            required
            disabled={busy}
            aria-describedby={error ? "login-error" : undefined}
          />
          {error && <span id="login-error" className="sr-only">{error.message}</span>}
          <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
            Connectez-vous avec votre e-mail ou votre numéro de téléphone.
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <AuthLabel htmlFor="password">Mot de passe</AuthLabel>
            <Link
              href="/mot-de-passe-oublie"
              className="font-mono text-[10px] uppercase tracking-[0.15em] text-gold-strong transition-colors hover:text-ink-950"
            >
              Oublié ?
            </Link>
          </div>
          <AuthPasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Votre mot de passe"
            required
            disabled={busy}
          />
        </div>

        <AuthSubmit busy={busy}>Se connecter</AuthSubmit>

        <SocialAuthButtons
          mode="login"
          next={next}
          onError={(err) => setError(err)}
        />

        <p className="text-center text-xs leading-relaxed text-ink-400">
          Connexion sécurisée · Vos accès sont déterminés automatiquement selon
          votre compte.
        </p>
      </form>
    </AuthShell>
  );
}
