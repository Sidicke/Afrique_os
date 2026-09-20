"use client";

import { useState } from "react";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { adminService } from "@/services/adminService";
import { useSession } from "@/lib/useSession";
import { updateSessionUser } from "@/lib/api/session";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { Avatar } from "@/components/dashboard/ui/Avatar";
import { timeAgo } from "@/lib/utils";
import {
  Field,
  SectionShell,
  SettingRow,
  TextInput,
} from "@/components/admin/settings/SettingsBits";
import type { AdminProfileData } from "@/types/admin";

/**
 * Profil de l'administrateur (doc 02 §15) — distinct des paramètres globaux
 * de la plateforme : identité, sécurité du compte (mot de passe),
 * activité récente et préférences de notification personnelles.
 */
export default function AdminProfilePage() {
  const { data, loading, error, refresh, apply } = useAdminProfile();
  const session = useSession();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Compte"
        title="Mon profil"
        description="Votre compte administrateur, distinct de la configuration globale de la plateforme."
        actions={
          <button
            onClick={refresh}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-700 shadow-sm transition-all hover:border-gold-mid hover:text-gold-strong active:scale-95"
          >
            <Icon name="refresh" size={14} /> Actualiser
          </button>
        }
      />


      {loading || !data ? (
        <ProfileSkeleton />
      ) : error ? (
        <DashboardCard className="flex flex-col items-center gap-3 p-10 text-center">
          <Icon name="alert" size={28} className="text-red-600" />
          <p className="text-sm text-ink-700">{error}</p>
          <button
            onClick={refresh}
            className="rounded-xl border border-gold-soft px-4 py-2 font-mono text-xs text-gold-strong hover:bg-gold-wash"
          >
            Réessayer
          </button>
        </DashboardCard>
      ) : (
        <>
          {/* En-tête du compte */}
          <DashboardCard className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={session?.user?.name ?? data.user.name} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl font-semibold text-ink-950">
                    {session?.user?.name ?? data.user.name}
                  </h2>
                  <span className="rounded-full bg-gold-wash px-2.5 py-0.5 font-mono text-[10px] font-semibold text-gold-strong">
                    {data.user.role}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-ink-500">{session?.user?.email ?? data.user.email}</p>
              </div>
              <div className="text-right font-mono text-[10px] text-ink-400">
                <p>Compte créé le {new Date(data.user.joinedAt).toLocaleDateString("fr-FR")}</p>
                <p className="mt-1 text-ink-500">
                  Mot de passe modifié il y a{" "}
                  {data.security.passwordLastChangedAt ? timeAgo(data.security.passwordLastChangedAt) : "-"}
                </p>
              </div>
            </div>
          </DashboardCard>

          <div className="grid gap-6 xl:grid-cols-3">
            {/* Identité */}
            <div className="xl:col-span-2">
              <IdentityCard profile={data} apply={apply} />
            </div>

            {/* Sécurité du compte */}
            <SecurityCard profile={data} apply={apply} />
          </div>

          {/* Activité récente */}
          <ActivityCard profile={data} />

          {/* Préférences de notification (compte admin) */}
          <NotificationPrefsCard profile={data} apply={apply} />
        </>
      )}
    </div>
  );
}

/* ———————————————— Identité ———————————————— */

function IdentityCard({
  profile,
  apply,
}: {
  profile: AdminProfileData;
  apply: (p: AdminProfileData) => void;
}) {
  const [name, setName] = useState(profile.user.name);
  const [email, setEmail] = useState(profile.user.email);
  const [phone, setPhone] = useState(profile.user.phone);

  return (
    <SectionShell
      title="Informations personnelles"
      description="Nom, email et téléphone affichés dans le dashboard administrateur."
      onSave={async () => {
        const updated = await adminService.updateProfile({ name: name.trim(), email: email.trim(), phone: phone.trim() });
        if (!updated) return;
        apply(updated);
        // Synchronise la session locale (sidebar + topbar)
        updateSessionUser({ name: name.trim(), email: email.trim(), phone: phone.trim() });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom complet">
          <TextInput value={name} onChange={setName} placeholder="Votre nom" />
        </Field>
        <Field label="Email">
          <TextInput value={email} onChange={setEmail} placeholder="vous@plateforme.com" />
        </Field>
        <Field label="Téléphone">
          <TextInput value={phone} onChange={setPhone} placeholder="+225 …" />
        </Field>
      </div>
    </SectionShell>
  );
}

/* ———————————————— Sécurité (mot de passe) ———————————————— */

function SecurityCard({
  apply: _apply,
}: {
  profile: AdminProfileData;
  apply: (p: AdminProfileData) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  return (
    <SectionShell
      title="Sécurité du compte"
      description="Changez votre mot de passe de connexion administrateur."
      onSave={async () => {
        if (nextPassword !== confirm) {
          throw new Error("Les deux mots de passe ne correspondent pas.");
        }
        const res = await adminService.changePassword({ currentPassword, nextPassword });
        if (!res.ok) throw new Error(res.error ?? "Changement impossible.");
        setCurrentPassword("");
        setNextPassword("");
        setConfirm("");
      }}
    >
      <div className="space-y-3">
        <Field label="Mot de passe actuel">
          <TextInput type="password" value={currentPassword} onChange={setCurrentPassword} placeholder="••••••••" />
        </Field>
        <Field label="Nouveau mot de passe">
          <TextInput type="password" value={nextPassword} onChange={setNextPassword} placeholder="••••••••" />
        </Field>
        <Field label="Confirmer le nouveau mot de passe">
          <TextInput type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />
        </Field>
      </div>
    </SectionShell>
  );
}


/* ———————————————— Activité récente ———————————————— */

function ActivityCard({ profile }: { profile: AdminProfileData }) {
  return (
    <DashboardCard className="p-6">
      <CardHeader title="Activité récente" subtitle="Vos dernières actions administratives" />
      <ol className="mt-4 space-y-0">
        {profile.activity.map((a, i) => (
          <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < profile.activity.length - 1 && (
              <span className="absolute left-[5px] top-4 h-full w-px bg-line" aria-hidden="true" />
            )}
            <span
              className={
                i === 0
                  ? "mt-1 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-gold-strong bg-gold-wash"
                  : "mt-1 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-ink-300 bg-surface"
              }
            />
            <div>
              <p className="text-xs font-medium text-ink-800">{a.action}</p>
              <p className="font-mono text-[9px] text-ink-400">{timeAgo(a.at)}</p>
            </div>
          </li>
        ))}
      </ol>
    </DashboardCard>
  );
}

/* ———————————————— Préférences de notification ———————————————— */

function NotificationPrefsCard({
  profile,
  apply,
}: {
  profile: AdminProfileData;
  apply: (p: AdminProfileData) => void;
}) {
  const toggle = async (id: string, enabled: boolean) => {
    const updated = await adminService.updateNotificationPrefs(id, enabled);
    if (updated) apply(updated);
  };

  return (
    <DashboardCard className="p-6">
      <CardHeader
        title="Préférences de notification"
        subtitle="Alertes reçues sur votre compte administrateur"
      />
      <div className="mt-4 space-y-2.5">
        {profile.notificationPrefs.map((n) => (
          <SettingRow
            key={n.id}
            label={n.label}
            description={n.description}
            checked={n.enabled}
            onChange={(v) => void toggle(n.id, v)}
          />
        ))}
      </div>
    </DashboardCard>
  );
}

/* ———————————————— Squelette ———————————————— */

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardCard className="p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      </DashboardCard>
      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardCard className="p-6 xl:col-span-2">
          <Skeleton className="h-4 w-40" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        </DashboardCard>
        <DashboardCard className="p-6">
          <Skeleton className="h-4 w-36" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        </DashboardCard>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <DashboardCard key={i} className="p-6">
            <Skeleton className="h-4 w-36" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </DashboardCard>
        ))}
      </div>
    </div>
  );
}
