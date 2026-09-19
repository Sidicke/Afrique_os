"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, usersApi } from "@/lib/api";
import { logout } from "@/lib/accountStore";
import { getSessionUser, updateSessionUser } from "@/lib/api/session";
import { initials } from "@/lib/utils";
import {
  IconCheck,
  IconLock,
  IconLogout,
  IconMail,
  IconShield,
  IconSparkle,
  IconStore,
  IconUser,
} from "@/components/client/icons";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-xl border border-midnight-950/15 bg-white px-3.5 py-2.5 text-sm text-midnight-950 placeholder:text-midnight-950/30 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30";

const labelCls = "mb-1 block text-xs font-medium text-midnight-950/70";

const SECTIONS = [
  { id: "profil", label: "Mon profil", icon: IconUser },
  { id: "securite", label: "Sécurité", icon: IconShield },
  { id: "session", label: "Session", icon: IconSparkle },
] as const;

/**
 * 👤 Mon compte — Profil (persisté CÔTÉ SERVEUR), Sécurité (mot de passe) et
 * Session (déconnexion). Aucune statistique inutile : c'est la gestion pure
 * du compte, dans le même langage visuel que la vitrine.
 */
export default function ComptePage() {
  const router = useRouter();
  const [active, setActive] = useState<(typeof SECTIONS)[number]["id"]>("profil");

  // Profil (serveur)
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ 
    name: "", 
    phone: "", 
    email: "", 
    avatarUrl: "",
    defaultAddress: "", 
    defaultCity: "", 
    defaultPaymentMethod: "" 
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sécurité (mot de passe)
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdNotice, setPwdNotice] = useState<string | null>(null);

  const [logginOut, setLogginOut] = useState(false);

  // Lecture du profil serveur (différée — pas de lecture synchrone au rendu)
  useEffect(() => {
    const t = window.setTimeout(() => {
      const user = getSessionUser();
      if (user) {
        setProfile({ name: user.name ?? "", phone: user.phone ?? "", email: user.email, avatarUrl: user.avatarUrl ?? "", defaultAddress: "", defaultCity: "", defaultPaymentMethod: "" });
        setForm({ name: user.name ?? "", phone: user.phone ?? "", email: user.email, avatarUrl: user.avatarUrl ?? "", defaultAddress: "", defaultCity: "", defaultPaymentMethod: "" });
      }
      usersApi
        .me()
        .then((p) => {
          setProfile({ name: p.name, phone: p.phone, email: p.email, avatarUrl: p.avatarUrl ?? "", defaultAddress: p.defaultAddress, defaultCity: p.defaultCity, defaultPaymentMethod: p.defaultPaymentMethod, referralCode: p.referralCode });
          setForm({ name: p.name, phone: p.phone, email: p.email, avatarUrl: p.avatarUrl ?? "", defaultAddress: p.defaultAddress || "", defaultCity: p.defaultCity || "", defaultPaymentMethod: p.defaultPaymentMethod || "" });
        })
        .catch(() => {
          // Session locale suffisante — l'utilisateur pourra recharger
        })
        .finally(() => setLoadingProfile(false));
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setProfileError("L'image est trop volumineuse (maximum 8 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxSize = 360;
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas non supporté");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setForm((f) => ({ ...f, avatarUrl: dataUrl }));
          setProfileNotice("Nouvelle photo sélectionnée. Pensez à enregistrer.");
        } catch {
          setProfileError("Impossible de traiter l'image.");
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setForm((f) => ({ ...f, avatarUrl: "" }));
    setProfileNotice("Photo retirée. Pensez à enregistrer.");
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setProfileError("Votre nom est obligatoire.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      setProfileError("Adresse email invalide.");
      return;
    }
    setSavingProfile(true);
    setProfileError(null);
    setProfileNotice(null);
    try {
      const updated = await usersApi.update({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim(),
        avatarUrl: form.avatarUrl ?? undefined,
        defaultAddress: form.defaultAddress?.trim() || undefined,
        defaultCity: form.defaultCity?.trim() || undefined,
        defaultPaymentMethod: form.defaultPaymentMethod?.trim() || undefined,
      });
      updateSessionUser({ 
        name: updated.name, 
        phone: updated.phone, 
        email: updated.email,
        avatarUrl: updated.avatarUrl ?? null,
      });
      setProfile({ 
        name: updated.name, 
        phone: updated.phone, 
        email: updated.email,
        avatarUrl: updated.avatarUrl ?? "",
        defaultAddress: updated.defaultAddress,
        defaultCity: updated.defaultCity,
        defaultPaymentMethod: updated.defaultPaymentMethod
      });
      setProfileNotice("Votre profil et votre photo ont bien été enregistrés.");
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Impossible d'enregistrer le profil.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const [otpSent, setOtpSent] = useState(false);

  const requestOtp = async () => {
    if (!profile?.email) return;
    setChangingPwd(true);
    setPwdError(null);
    setPwdNotice(null);
    try {
      await authApi.forgotPassword({ email: profile.email });
      setOtpSent(true);
      setPwdNotice("Un code de vérification a été envoyé à votre adresse e-mail.");
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Erreur lors de l'envoi du code.");
    } finally {
      setChangingPwd(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.email) return;
    if (pwd.current.length !== 6) { // On utilise 'current' pour stocker le code OTP
      setPwdError("Le code doit contenir 6 chiffres.");
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
        email: profile.email,
        code: pwd.current, // OTP
        newPassword: pwd.next,
      });
      setPwd({ current: "", next: "", confirm: "" });
      setOtpSent(false);
      setPwdNotice("Mot de passe modifié avec succès ! Les autres sessions ont été déconnectées.");
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Code incorrect ou expiré.");
    } finally {
      setChangingPwd(false);
    }
  };

  const handleLogout = async () => {
    setLogginOut(true);
    await logout();
    router.push("/connexion");
  };

  return (
    <div className="flex flex-col gap-8">
      {/* En-tête */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-600">
          Qui suis-je · Comment gérer mon compte
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-midnight-950">
          Mon compte
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-midnight-950/55">
          Vos informations, la sécurité et la gestion de votre session : le
          tout enregistré sur la plateforme.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Mini-sommaire latéral (desktop) */}
        <aside className="lg:w-56 lg:shrink-0">
          <nav
            aria-label="Sections du compte"
            className="flex gap-1 overflow-x-auto rounded-2xl border border-midnight-950/8 bg-white p-1 lg:sticky lg:top-20 lg:flex-col lg:overflow-visible"
          >
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = active === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActive(section.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all",
                    isActive
                      ? "bg-midnight-950 text-gold-300 shadow-sm"
                      : "text-midnight-950/55 hover:text-midnight-950",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Contenu */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* ——— Profil ——— */}
          {active === "profil" && (
            <section className="rounded-3xl border border-midnight-950/8 bg-white p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-midnight-950 text-gold-300">
                  <IconUser className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-midnight-950">Mon profil</h2>
                  <p className="text-xs text-midnight-950/50">
                    Nom, téléphone et email partagés avec les vendeurs.
                  </p>
                </div>
              </div>

              {loadingProfile ? (
                <div className="mt-6 space-y-3">
                  <div className="h-11 animate-pulse rounded-xl bg-gray-100" />
                  <div className="h-11 animate-pulse rounded-xl bg-gray-100" />
                  <div className="h-11 animate-pulse rounded-xl bg-gray-100" />
                </div>
              ) : (
                <form onSubmit={saveProfile} className="mt-6 grid gap-4 sm:grid-cols-2">
                  {/* Gestion de la Photo de profil */}
                  <div className="sm:col-span-2 rounded-2xl border border-midnight-950/8 bg-gray-50/70 p-4 sm:p-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gold-600">
                      Photo de profil
                    </p>
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Aperçu avatar */}
                      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-gold-400/40 bg-midnight-950 shadow-sm">
                        {form.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={form.avatarUrl}
                            alt="Photo de profil"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-display text-2xl font-bold text-gold-300">
                            {initials(form.name || profile?.name || "C")}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <p className="text-xs text-midnight-950/65 leading-relaxed">
                          Cette photo est affichée lors de vos discussions avec les boutiques partenaires et sur votre espace client.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-midnight-950 px-4 py-1.5 text-xs font-bold text-gold-300 transition-colors hover:bg-midnight-800 shadow-xs"
                          >
                            <IconStore className="h-3.5 w-3.5" />
                            {form.avatarUrl ? "Changer la photo" : "Ajouter une photo"}
                          </button>
                          {form.avatarUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              className="cursor-pointer rounded-full border border-midnight-950/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-midnight-950/70 transition-colors hover:border-red-300 hover:text-red-600"
                            >
                              Retirer la photo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="profile-name" className={labelCls}>
                      Nom complet
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-phone" className={labelCls}>
                      Téléphone
                    </label>
                    <input
                      id="profile-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+225 07 00 00 00 00"
                      className={inputCls}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="profile-email" className={labelCls}>
                      Adresse email
                    </label>
                    <input
                      id="profile-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className={inputCls}
                    />
                  </div>

                  {profileError && (
                    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600 sm:col-span-2">
                      {profileError}
                    </p>
                  )}
                  {profileNotice && (
                    <p role="status" className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 sm:col-span-2">
                      <IconCheck className="h-3.5 w-3.5" />
                      {profileNotice}
                    </p>
                  )}

                  
                  <div className="sm:col-span-2 mt-4 pt-4 border-t border-midnight-950/10">
                    <h3 className="font-display text-md font-semibold text-midnight-950 mb-4">Préférences de commande (Défaut)</h3>
                  </div>
                  <div>
                    <label htmlFor="profile-address" className={labelCls}>Adresse de livraison par défaut</label>
                    <input id="profile-address" type="text" value={form.defaultAddress || ""} onChange={(e) => setForm((f) => ({ ...f, defaultAddress: e.target.value }))} placeholder="Ex: Cocody Riviera 2" className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="profile-city" className={labelCls}>Ville par défaut</label>
                    <input id="profile-city" type="text" value={form.defaultCity || ""} onChange={(e) => setForm((f) => ({ ...f, defaultCity: e.target.value }))} placeholder="Ex: Abidjan" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="profile-payment" className={labelCls}>Moyen de paiement préféré</label>
                    <select id="profile-payment" value={form.defaultPaymentMethod || ""} onChange={(e) => setForm((f) => ({ ...f, defaultPaymentMethod: e.target.value }))} className={inputCls + " h-[42px]"}>
                      <option value="">-- Choisir --</option>
                      <option value="MOBILE_MONEY">Mobile Money (Wave, Orange, MTN...)</option>
                      <option value="CASH_ON_DELIVERY">Paiement à la livraison</option>
                      <option value="CARD">Carte Bancaire</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="rounded-full bg-midnight-950 px-6 py-2.5 text-sm font-bold text-gold-300 transition-all hover:-translate-y-0.5 hover:bg-midnight-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingProfile ? "Enregistrement…" : "Enregistrer mes informations"}
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}

          {/* ——— Sécurité ——— */}
          {active === "securite" && (
            <section className="rounded-3xl border border-midnight-950/8 bg-white p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-midnight-950 text-gold-300">
                  <IconShield className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-midnight-950">Sécurité</h2>
                  <p className="text-xs text-midnight-950/50">
                    Changez votre mot de passe. Les autres sessions actives seront déconnectées.
                  </p>
                </div>
              </div>

              {!otpSent ? (
                <div className="mt-6 flex flex-col items-start gap-4">
                  <p className="text-sm text-midnight-950/70">
                    Pour changer votre mot de passe, nous devons d&apos;abord vérifier votre identité en vous envoyant un code de sécurité par e-mail.
                  </p>
                  <button
                    type="button"
                    onClick={requestOtp}
                    disabled={changingPwd}
                    className="inline-flex items-center gap-2 rounded-full border border-midnight-950/15 px-6 py-2.5 text-sm font-semibold text-midnight-950/80 transition-colors hover:border-gold-400/60 hover:text-midnight-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <IconMail className="h-4 w-4" />
                    {changingPwd ? "Envoi en cours…" : "Recevoir un code par e-mail"}
                  </button>
                  
                  {pwdError && (
                    <p role="alert" className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600">
                      {pwdError}
                    </p>
                  )}
                  {pwdNotice && (
                    <p role="status" className="mt-2 flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700">
                      <IconCheck className="h-3.5 w-3.5" />
                      {pwdNotice}
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={changePassword} className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="pwd-otp" className={labelCls}>
                      Code reçu par e-mail
                    </label>
                    <input
                      id="pwd-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={pwd.current} // On réutilise current pour l'OTP
                      onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                      className={inputCls + " font-mono tracking-widest"}
                    />
                  </div>
                  <div>
                    <label htmlFor="pwd-next" className={labelCls}>
                      Nouveau mot de passe
                    </label>
                    <input
                      id="pwd-next"
                      type="password"
                      autoComplete="new-password"
                      value={pwd.next}
                      onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="pwd-confirm" className={labelCls}>
                      Confirmer
                    </label>
                    <input
                      id="pwd-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={pwd.confirm}
                      onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                      className={inputCls}
                    />
                  </div>

                {pwdError && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600 sm:col-span-3">
                    {pwdError}
                  </p>
                )}
                {pwdNotice && (
                  <p role="status" className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 sm:col-span-3">
                    <IconCheck className="h-3.5 w-3.5" />
                    {pwdNotice}
                  </p>
                )}

                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    disabled={changingPwd}
                    className="inline-flex items-center gap-2 rounded-full border border-midnight-950/15 px-6 py-2.5 text-sm font-semibold text-midnight-950/80 transition-colors hover:border-gold-400/60 hover:text-midnight-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <IconLock className="h-4 w-4" />
                    {changingPwd ? "Modification…" : "Changer le mot de passe"}
                  </button>
                </div>
              </form>
              )}
            </section>
          )}

          {/* ——— Session ——— */}
          {active === "session" && (
            <section className="rounded-3xl border border-midnight-950/8 bg-white p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-midnight-950 text-gold-300">
                  <IconSparkle className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-midnight-950">Session</h2>
                  <p className="text-xs text-midnight-950/50">
                    Fermez votre session sur cet appareil.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-midnight-950/15 px-4 py-3.5">
                <div className="flex items-center gap-2.5 text-xs text-midnight-950/55">
                  <IconMail className="h-4 w-4 text-gold-600" />
                  <span className="font-medium text-midnight-950/70">
                    {profile?.email ?? "-"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={logginOut}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-2 text-xs font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <IconLogout className="h-3.5 w-3.5" />
                  {logginOut ? "Déconnexion…" : "Se déconnecter"}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
