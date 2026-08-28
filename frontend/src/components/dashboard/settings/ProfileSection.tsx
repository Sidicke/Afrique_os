"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { Field, TextInput } from "@/components/dashboard/ui/Field";
import { Avatar } from "@/components/dashboard/ui/Avatar";
import { Toast } from "@/components/dashboard/ui/Toast";
import { Icon } from "@/components/dashboard/icons";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { EditableCard, ReadField } from "./EditableCard";
import { closeShop } from "@/lib/accountStore";
import { authApi, shopsApi, usersApi } from "@/lib/api";
import { getBoutiqueId } from "@/lib/api/session";
import { merchantProfile } from "@/services/dashboardService";

/** Statuts de vérification du compte vendeur (miroir de l'enum backend) */
type VerificationStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

const PROFILE_FIELDS = {
  name: merchantProfile.name,
  email: merchantProfile.email,
  phone: merchantProfile.phone,
  city: merchantProfile.city,
};

export function ProfileSection() {
  const router = useRouter();
  // Profil (formulaire contrôlé — mock, à brancher sur le vrai endpoint plus tard)
  const [profileForm, setProfileForm] = useState(PROFILE_FIELDS);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  // ===== Vérification du compte (badge ✓ sur la vitrine et les produits) =====
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [verifSending, setVerifSending] = useState(false);

  useEffect(() => {
    const boutiqueId = getBoutiqueId();
    if (!boutiqueId) return;
    shopsApi
      .owner(boutiqueId)
      .then((shop) =>
        setVerificationStatus((shop.verificationStatus ?? "NONE") as VerificationStatus)
      )
      .catch(() => setVerificationStatus("NONE"));
  }, []);

  /** Demande de vérification : NONE / REJECTED → PENDING (validée par la plateforme) */
  const handleRequestVerification = () => {
    const boutiqueId = getBoutiqueId();
    if (!boutiqueId || verifSending) return;
    setVerifSending(true);
    shopsApi
      .requestVerification(boutiqueId)
      .then((shop) => {
        setVerificationStatus((shop.verificationStatus ?? "PENDING") as VerificationStatus);
        setToast("Demande envoyée. Notre équipe vérifie votre boutique.");
      })
      .catch(() => setToast("Impossible d'envoyer la demande. Réessayez plus tard."))
      .finally(() => setVerifSending(false));
  };

  // ===== Sécurité & Changement de mot de passe par OTP =====
  const [otpSent, setOtpSent] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdNotice, setPwdNotice] = useState<string | null>(null);

  const requestPasswordOtp = async () => {
    const email = profileForm.email || merchantProfile.email;
    if (!email) {
      setPwdError("Adresse e-mail introuvable.");
      return;
    }
    setChangingPwd(true);
    setPwdError(null);
    setPwdNotice(null);
    try {
      await authApi.forgotPassword({ email });
      setOtpSent(true);
      setPwdNotice("Un code de vérification à 6 chiffres a été envoyé à votre adresse e-mail.");
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Erreur lors de l'envoi du code.");
    } finally {
      setChangingPwd(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = profileForm.email || merchantProfile.email;
    if (!email) return;
    if (pwd.current.length !== 6) {
      setPwdError("Le code de vérification doit comporter 6 chiffres.");
      return;
    }
    if (pwd.next.length < 6) {
      setPwdError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (pwd.next !== pwd.confirm) {
      setPwdError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }

    setChangingPwd(true);
    setPwdError(null);
    setPwdNotice(null);
    try {
      await authApi.resetPassword({
        email,
        code: pwd.current,
        newPassword: pwd.next,
      });
      setPwd({ current: "", next: "", confirm: "" });
      setOtpSent(false);
      setPwdNotice("Mot de passe modifié avec succès ! Vos autres sessions ont été sécurisées.");
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Code incorrect ou expiré.");
    } finally {
      setChangingPwd(false);
    }
  };

  /** Fermeture définitive : révoque la session + bloque la recréation */
  const handleCloseShop = () => {
    void closeShop().then(() => router.push("/connexion?closed=1"));
  };

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={profileForm.name || merchantProfile.name} size="lg" />
          <div>
            <p className="font-display text-lg font-semibold text-ink-950">{merchantProfile.name}</p>
            <p className="text-sm text-ink-500">{merchantProfile.shopName}</p>
          </div>
        </div>
      </DashboardCard>

      <EditableCard
        title="Informations personnelles"
        subtitle="Vos coordonnées de contact"
        view={
          <div className="grid gap-5 sm:grid-cols-2">
            <ReadField label="Nom complet" value={profileForm.name} />
            <ReadField label="Adresse e-mail" value={profileForm.email} />
            <ReadField label="Téléphone" value={profileForm.phone} />
            <ReadField label="Ville" value={profileForm.city} />
          </div>
        }
        onSave={() => setToast("Profil mis à jour avec succès.")}
        onCancel={() => setProfileForm(PROFILE_FIELDS)}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nom complet">
            <TextInput
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            />
          </Field>
          <Field label="Adresse e-mail">
            <TextInput
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            />
          </Field>
          <Field label="Téléphone">
            <TextInput
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            />
          </Field>
          <Field label="Ville">
            <TextInput
              value={profileForm.city}
              onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
            />
          </Field>
        </div>
      </EditableCard>

      {/* Vérification du compte — badge ✓ de confiance sur la vitrine et les produits */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">
            Vérification du compte
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <DashboardCard className="p-6">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Icon name="shield" size={18} className="text-gold-strong" />
                Statut de vérification
              </span>
            }
            subtitle="Une fois vérifiée, votre boutique affiche le badge ✓ sur sa vitrine et sur chacun de ses produits pour rassurer vos clients."
          />
          <div className="mt-5">
            {verificationStatus === null ? (
              <div className="h-12 animate-pulse rounded-xl bg-ink-100/80" />
            ) : verificationStatus === "VERIFIED" ? (
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-green-200 bg-green-50/80 p-4">
                <VerifiedBadge className="h-8 w-8 drop-shadow" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-green-800">
                    Votre boutique est vérifiée
                  </p>
                  <p className="text-xs text-green-700/80">
                    Le badge de confiance est visible sur votre vitrine et vos produits.
                  </p>
                </div>
              </div>
            ) : verificationStatus === "PENDING" ? (
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-white">
                  <Icon name="clock" size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-amber-800">
                    Demande en cours de validation
                  </p>
                  <p className="text-xs text-amber-700/80">
                    Notre équipe examine votre boutique. Vous serez informé dès la validation.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <p className="flex-1 text-sm leading-relaxed text-ink-600">
                  Votre boutique n&apos;est pas encore vérifiée. Envoyez une demande : une fois
                  validée par la plateforme, le badge ✓ inspirera confiance à vos clients.
                </p>
                <button
                  onClick={handleRequestVerification}
                  disabled={verifSending}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-midnight-950 px-5 py-2.5 text-xs font-semibold text-gold-300 transition-all hover:bg-midnight-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {verifSending ? "Envoi…" : "Demander la vérification"}
                </button>
              </div>
            )}
          </div>
        </DashboardCard>
      </div>

      {/* Sécurité & Mot de passe */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">
            Sécurité du compte
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <DashboardCard className="p-6">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Icon name="lock" size={18} className="text-gold-strong" />
                Mot de passe & Authentification
              </span>
            }
            subtitle="Modifiez votre mot de passe en toute sécurité grâce à une vérification par code OTP."
          />

          <div className="mt-5">
            {!otpSent ? (
              <div className="flex flex-col items-start gap-4">
                <p className="text-sm text-ink-600">
                  Pour votre sécurité, un code de validation à 6 chiffres sera envoyé à votre adresse e-mail (<strong>{profileForm.email || merchantProfile.email}</strong>) avant de pouvoir définir votre nouveau mot de passe.
                </p>
                <button
                  type="button"
                  onClick={requestPasswordOtp}
                  disabled={changingPwd}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-midnight-950 px-5 py-2.5 text-xs font-semibold text-gold-300 transition-all hover:bg-midnight-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="mail" size={14} />
                  {changingPwd ? "Envoi du code…" : "Recevoir un code par e-mail"}
                </button>

                {pwdError && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600">
                    {pwdError}
                  </p>
                )}
                {pwdNotice && (
                  <p role="status" className="flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-xs font-medium text-green-700">
                    <Icon name="check" size={14} />
                    {pwdNotice}
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
                <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                  Un code à 6 chiffres a été envoyé à <strong>{profileForm.email || merchantProfile.email}</strong>. Saisissez-le ci-dessous pour modifier votre mot de passe.
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Code OTP (6 chiffres)">
                    <TextInput
                      required
                      maxLength={6}
                      value={pwd.current}
                      onChange={(e) => setPwd({ ...pwd, current: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      placeholder="000000"
                    />
                  </Field>
                  <Field label="Nouveau mot de passe">
                    <TextInput
                      required
                      type="password"
                      value={pwd.next}
                      onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                      placeholder="Min. 6 caractères"
                    />
                  </Field>
                  <Field label="Confirmer le mot de passe">
                    <TextInput
                      required
                      type="password"
                      value={pwd.confirm}
                      onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
                      placeholder="Répétez le mot de passe"
                    />
                  </Field>
                </div>

                {pwdError && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600">
                    {pwdError}
                  </p>
                )}
                {pwdNotice && (
                  <p role="status" className="flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-xs font-medium text-green-700">
                    <Icon name="check" size={14} />
                    {pwdNotice}
                  </p>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={changingPwd}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-midnight-950 px-5 py-2.5 text-xs font-semibold text-gold-300 transition-all hover:bg-midnight-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon name="check" size={14} strokeWidth={2.2} />
                    {changingPwd ? "Enregistrement…" : "Valider le nouveau mot de passe"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setPwdError(null);
                      setPwdNotice(null);
                    }}
                    className="cursor-pointer rounded-xl border border-line px-4 py-2.5 text-xs text-ink-600 hover:text-ink-950"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        </DashboardCard>
      </div>

      {/* Gestion de l'espace */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">
            Gestion de l&apos;espace
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <DashboardCard className="border-red-100 p-6">
          <CardHeader
            title="Réinitialiser les données de démonstration"
            subtitle="Restaure les données simulées du dashboard à leur état d'origine"
          />
          <div className="mt-5">
            {confirmReset ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-100 bg-red-100/70 p-4">
                <p className="flex-1 text-sm text-ink-800">
                  Cette action remettra commandes, produits et clients à zéro.
                </p>
                <button
                  onClick={() => {
                    setConfirmReset(false);
                    setToast("Données de démonstration réinitialisées.");
                  }}
                  className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                >
                  Confirmer la réinitialisation
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="cursor-pointer rounded-xl border border-line px-4 py-2 text-xs text-ink-600 hover:text-ink-950"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-red-100 bg-red-100/70 px-4 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-100 active:scale-95"
              >
                <Icon name="refresh" size={14} /> Réinitialiser les données
              </button>
            )}
          </div>
        </DashboardCard>

        <DashboardCard className="border-red-100 p-6">
          <CardHeader
            title="Fermer la boutique"
            subtitle="Supprime définitivement votre boutique, votre compte et votre configuration"
          />
          <div className="mt-5">
            {confirmClose ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-100 bg-red-100/70 p-4">
                <p className="flex-1 text-sm text-ink-800">
                  Cette action est <strong>définitive</strong> : produits, commandes, clients et
                  configuration seront supprimés. Aucune boutique portant le même nom ou le même
                  email ne pourra être recréée.
                </p>
                <button
                  onClick={handleCloseShop}
                  className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                >
                  Fermer définitivement
                </button>
                <button
                  onClick={() => setConfirmClose(false)}
                  className="cursor-pointer rounded-xl border border-line px-4 py-2 text-xs text-ink-600 hover:text-ink-950"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClose(true)}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-red-100 bg-red-100/70 px-4 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-100 active:scale-95"
              >
                <Icon name="logout" size={14} /> Fermer ma boutique
              </button>
            )}
          </div>
        </DashboardCard>
      </div>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
