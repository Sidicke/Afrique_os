"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type TeamRole = "ADMIN" | "EDITOR" | "VIEWER";
type TeamStatus = "PENDING" | "ACTIVE" | "REVOKED";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: TeamStatus;
  invitedAt: string;
  acceptedAt?: string;
}

const ROLE_LABEL: Record<TeamRole, string> = {
  ADMIN: "Administrateur",
  EDITOR: "Éditeur",
  VIEWER: "Lecteur",
};

const ROLE_DESC: Record<TeamRole, string> = {
  ADMIN: "Gère produits, commandes, paramètres",
  EDITOR: "Gère produits et commandes",
  VIEWER: "Lecture seule",
};

const ROLE_COLOR: Record<TeamRole, string> = {
  ADMIN: "bg-blue-50 text-blue-700 border-blue-200",
  EDITOR: "bg-gold-wash text-gold-strong border-gold-soft",
  VIEWER: "bg-ink-100 text-ink-600 border-ink-200",
};

const STATUS_COLOR: Record<TeamStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  REVOKED: "bg-red-100 text-red-600",
};

const STATUS_LABEL: Record<TeamStatus, string> = {
  PENDING: "Invitation envoyée",
  ACTIVE: "Actif",
  REVOKED: "Révoqué",
};

// Données de démonstration (à remplacer par l'API)
const DEMO_MEMBERS: TeamMember[] = [
  { id: "1", name: "Marie Dupont", email: "marie@exemple.com", role: "EDITOR", status: "ACTIVE", invitedAt: "2026-08-01", acceptedAt: "2026-08-02" },
  { id: "2", name: "", email: "assistant@exemple.com", role: "VIEWER", status: "PENDING", invitedAt: "2026-09-10" },
];

export default function EquipePage() {
  const [members, setMembers] = useState<TeamMember[]>(DEMO_MEMBERS);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("EDITOR");
  const [inviteLoading, setInviteLoading] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    // TODO: appel API POST /boutiques/:id/team
    setTimeout(() => {
      setMembers((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          name: "",
          email: inviteEmail.trim(),
          role: inviteRole,
          status: "PENDING",
          invitedAt: new Date().toISOString().slice(0, 10),
        },
      ]);
      setInviteEmail("");
      setInviteLoading(false);
      setShowInvite(false);
    }, 800);
  };

  const handleRevoke = (id: string) => {
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, status: "REVOKED" as TeamStatus } : m));
  };

  const handleRemove = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const activeMembers = members.filter((m) => m.status !== "REVOKED");
  const revokedMembers = members.filter((m) => m.status === "REVOKED");

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Mon Équipe</h1>
          <p className="mt-1 text-sm text-ink-500">
            Invitez des collaborateurs pour vous aider à gérer vos boutiques.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-700/25 transition hover:bg-blue-800"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="16" y1="11" x2="22" y2="11" />
          </svg>
          Inviter un collaborateur
        </button>
      </div>

      {/* Limite plan */}
      <div className="flex items-center justify-between rounded-2xl border border-gold-soft bg-gold-wash px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-mid/20 text-gold-strong">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-ink-800">Plan Business — 2 collaborateurs max</p>
            <p className="text-xs text-ink-500">{activeMembers.length} / 2 utilisés · Passez en Enterprise pour illimité</p>
          </div>
        </div>
        <div className="h-2 w-24 overflow-hidden rounded-full bg-gold-mid/30">
          <div className="h-full rounded-full bg-gold-strong transition-all" style={{ width: `${Math.min((activeMembers.length / 2) * 100, 100)}%` }} />
        </div>
      </div>

      {/* Formulaire d'invitation */}
      {showInvite && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="font-display font-semibold text-ink-950 mb-4">Inviter un collaborateur</h3>
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-700">Email du collaborateur *</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collaborateur@exemple.com"
                  required
                  className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-700">Rôle</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                  className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  {(Object.keys(ROLE_LABEL) as TeamRole[]).map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]} — {ROLE_DESC[r]}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Explication du rôle */}
            <div className="rounded-xl border border-line bg-white p-3">
              <p className="text-xs text-ink-500">
                <strong className="text-ink-700">{ROLE_LABEL[inviteRole]} :</strong> {ROLE_DESC[inviteRole]}.
                Un email d&apos;invitation sera envoyé à l&apos;adresse indiquée.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={inviteLoading} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60">
                {inviteLoading ? "Envoi..." : "Envoyer l'invitation"}
              </button>
              <button type="button" onClick={() => setShowInvite(false)} className="rounded-xl border border-line px-5 py-2.5 text-sm text-ink-600 transition hover:bg-ink-50">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des membres */}
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-base font-semibold text-ink-950">Membres actifs ({activeMembers.length})</h2>
        {activeMembers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-400">
            Aucun collaborateur invité pour l&apos;instant.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 font-display text-sm font-bold text-ink-600">
                    {member.name ? member.name[0].toUpperCase() : member.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-ink-950">{member.name || <span className="text-ink-400 italic">Invitation en attente</span>}</p>
                    <p className="text-xs text-ink-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold", ROLE_COLOR[member.role])}>
                    {ROLE_LABEL[member.role]}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold", STATUS_COLOR[member.status])}>
                    {STATUS_LABEL[member.status]}
                  </span>
                  <button
                    onClick={() => handleRevoke(member.id)}
                    className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 transition hover:bg-red-50"
                  >
                    Révoquer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Membres révoqués */}
      {revokedMembers.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-base font-semibold text-ink-400">Accès révoqués ({revokedMembers.length})</h2>
          <div className="flex flex-col gap-2">
            {revokedMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface/50 p-3 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 font-display text-xs font-bold text-ink-400">
                    {member.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-ink-500">{member.email}</p>
                  </div>
                </div>
                <button onClick={() => handleRemove(member.id)} className="text-xs text-ink-400 hover:text-red-500">
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explication des rôles */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="mb-4 font-display text-sm font-semibold text-ink-950">Explication des rôles</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(ROLE_LABEL) as TeamRole[]).map((role) => (
            <div key={role} className={cn("rounded-xl border p-3", ROLE_COLOR[role])}>
              <p className="font-mono text-[11px] font-bold uppercase tracking-wide">{ROLE_LABEL[role]}</p>
              <p className="mt-1 text-xs opacity-80">{ROLE_DESC[role]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
