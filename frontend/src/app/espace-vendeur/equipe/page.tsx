"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { shopsApi } from "@/lib/api";
import type { ApiShop, ApiTeamMember } from "@/lib/api";
import { getBoutiqueId } from "@/lib/api/session";

type TeamRole = "ADMIN" | "EDITOR" | "VIEWER";
type TeamStatus = "PENDING" | "ACTIVE" | "REVOKED";

const ROLE_LABEL: Record<TeamRole, string> = {
  ADMIN: "Administrateur",
  EDITOR: "Éditeur",
  VIEWER: "Lecteur",
};

const ROLE_DESC: Record<TeamRole, string> = {
  ADMIN: "Gère produits, commandes, paramètres et finances",
  EDITOR: "Gère les produits, commandes et stocks",
  VIEWER: "Consultation en lecture seule",
};

const ROLE_COLOR: Record<TeamRole, string> = {
  ADMIN: "bg-blue-50 text-blue-700 border-blue-200",
  EDITOR: "bg-gold-wash text-gold-strong border-gold-soft",
  VIEWER: "bg-ink-100 text-ink-600 border-ink-200",
};

const STATUS_COLOR: Record<TeamStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  REVOKED: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_LABEL: Record<TeamStatus, string> = {
  PENDING: "Invitation en attente",
  ACTIVE: "Actif",
  REVOKED: "Accès révoqué",
};

export default function EquipePage() {
  const [shops, setShops] = useState<ApiShop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [members, setMembers] = useState<ApiTeamMember[]>([]);
  
  const [loadingShops, setLoadingShops] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Invite modal state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("EDITOR");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // 1. Charger les boutiques du vendeur
  useEffect(() => {
    async function loadShops() {
      try {
        setLoadingShops(true);
        const myShops = await shopsApi.myShops();
        setShops(myShops);
        if (myShops.length > 0) {
          const activeId = getBoutiqueId();
          const match = myShops.find((s) => s.id === activeId);
          setSelectedShopId(match ? match.id : myShops[0].id);
        }
      } catch (err: any) {
        setError(err?.message || "Impossible de charger vos boutiques.");
      } finally {
        setLoadingShops(false);
      }
    }
    loadShops();
  }, []);

  // 2. Charger les collaborateurs pour la boutique sélectionnée
  const fetchMembers = useCallback(async (shopId: string) => {
    if (!shopId) return;
    try {
      setLoadingMembers(true);
      setError(null);
      const data = await shopsApi.getTeam(shopId);
      setMembers(data || []);
    } catch (err: any) {
      setError(err?.message || "Impossible de charger les membres de l'équipe.");
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (selectedShopId) {
      fetchMembers(selectedShopId);
    }
  }, [selectedShopId, fetchMembers]);

  const selectedShop = shops.find((s) => s.id === selectedShopId);

  // Gérer l'invitation d'un nouveau collaborateur
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedShopId) return;

    setInviteLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const created = await shopsApi.inviteTeamMember(selectedShopId, {
        email: inviteEmail.trim(),
        role: inviteRole,
        name: inviteName.trim() || undefined,
      });

      // Mettre à jour l'état local avec la vraie réponse BD
      setMembers((prev) => [
        created,
        ...prev.filter((m) => m.id !== created.id),
      ]);

      setSuccessMsg(`Invitation envoyée avec succès à ${inviteEmail.trim()}`);
      setInviteEmail("");
      setInviteName("");
      setShowInvite(false);
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'invitation du collaborateur.");
    } finally {
      setInviteLoading(false);
    }
  };

  // Révoquer un accès
  const handleRevoke = async (memberId: string) => {
    if (!selectedShopId) return;
    setActionLoadingId(memberId);
    try {
      const updated = await shopsApi.updateTeamMember(selectedShopId, memberId, { status: "REVOKED" });
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
      setSuccessMsg("L'accès du collaborateur a été révoqué.");
    } catch (err: any) {
      setError(err?.message || "Impossible de révoquer cet accès.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Réactiver un accès
  const handleReactivate = async (memberId: string) => {
    if (!selectedShopId) return;
    setActionLoadingId(memberId);
    try {
      const updated = await shopsApi.updateTeamMember(selectedShopId, memberId, { status: "ACTIVE" });
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
      setSuccessMsg("L'accès du collaborateur a été réactivé.");
    } catch (err: any) {
      setError(err?.message || "Impossible de réactiver cet accès.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Supprimer définitivement un membre
  const handleRemove = async (memberId: string) => {
    if (!selectedShopId) return;
    if (!confirm("Voulez-vous supprimer définitivement ce collaborateur ?")) return;

    setActionLoadingId(memberId);
    try {
      await shopsApi.removeTeamMember(selectedShopId, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setSuccessMsg("Collaborateur retiré de l'équipe.");
    } catch (err: any) {
      setError(err?.message || "Impossible de retirer ce collaborateur.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Changer le rôle d'un membre
  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    if (!selectedShopId) return;
    setActionLoadingId(memberId);
    try {
      const updated = await shopsApi.updateTeamMember(selectedShopId, memberId, { role: newRole });
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
      setSuccessMsg("Rôle mis à jour.");
    } catch (err: any) {
      setError(err?.message || "Impossible de modifier le rôle.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeMembers = members.filter((m) => m.status !== "REVOKED");
  const revokedMembers = members.filter((m) => m.status === "REVOKED");

  if (loadingShops) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-ink-100" />
        <div className="h-48 w-full animate-pulse rounded-2xl bg-ink-100" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête avec sélecteur de boutique si plusieurs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Mon Équipe</h1>
          <p className="mt-1 text-sm text-ink-500">
            Invitez et gérez les collaborateurs pour vos boutiques ZennShop.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {shops.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="shop-select" className="text-xs font-medium text-ink-600">Boutique :</label>
              <select
                id="shop-select"
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink-950 shadow-xs outline-none focus:border-blue-600"
              >
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-700/25 transition hover:bg-blue-800 active:scale-95"
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
      </div>

      {/* Messages d'alerte / succès */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold text-red-500 hover:text-red-800">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="font-bold text-green-500 hover:text-green-800">✕</button>
        </div>
      )}

      {/* Limite du plan */}
      <div className="flex items-center justify-between rounded-2xl border border-gold-soft bg-gold-wash px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-mid/20 text-gold-strong">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-ink-950">Gestion de l&apos;équipe · {selectedShop?.name}</p>
              <span className="rounded-full bg-gold-200 px-2 py-0.5 font-mono text-[10px] font-bold text-gold-strong uppercase">
                {selectedShop?.plan || "Standard"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-600">
              {activeMembers.length} {activeMembers.length > 1 ? "collaborateurs actifs" : "collaborateur actif"} sur cette boutique.
            </p>
          </div>
        </div>
      </div>

      {/* Formulaire modal d'invitation */}
      {showInvite && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-ink-950">
                Inviter un collaborateur sur {selectedShop?.name}
              </h3>
              <p className="text-xs text-ink-500 mt-0.5">
                Il aura un accès dédié pour vous assister sans partager votre mot de passe principal.
              </p>
            </div>
            <button
              onClick={() => setShowInvite(false)}
              className="text-ink-400 hover:text-ink-700"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-700">Nom ou Prénom (optionnel)</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ex: Aminata Diop"
                  className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-700">Email du collaborateur *</label>
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
                <label className="text-xs font-semibold text-ink-700">Rôle attribué</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                  className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  {(Object.keys(ROLE_LABEL) as TeamRole[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Explication du rôle */}
            <div className="rounded-xl border border-blue-200/60 bg-white p-3 text-xs text-ink-600">
              <strong className="text-blue-700">{ROLE_LABEL[inviteRole]} :</strong> {ROLE_DESC[inviteRole]}.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={inviteLoading}
                className="rounded-xl bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60"
              >
                {inviteLoading ? "Envoi de l'invitation..." : "Envoyer l'invitation"}
              </button>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-ink-50"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des membres */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink-950">
            Membres de l&apos;équipe ({activeMembers.length})
          </h2>
          {loadingMembers && (
            <span className="text-xs text-ink-400 animate-pulse">Chargement en cours...</span>
          )}
        </div>

        {loadingMembers ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-ink-100" />
            ))}
          </div>
        ) : activeMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
            <span className="mb-3 text-4xl">👥</span>
            <h3 className="font-display text-base font-bold text-ink-900">Aucun collaborateur pour cette boutique</h3>
            <p className="mt-1 max-w-md text-sm text-ink-500">
              Vous êtes actuellement le seul gestionnaire de cette boutique. Vous pouvez inviter un assistant pour s&apos;occuper de la préparation des commandes et de la mise à jour de vos stocks.
            </p>
            <button
              onClick={() => setShowInvite(true)}
              className="mt-5 rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-800"
            >
              Inviter un premier collaborateur
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 transition-all sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-display text-base font-bold text-blue-800">
                    {member.name ? member.name[0].toUpperCase() : member.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-950 truncate">
                      {member.name || <span className="text-ink-400 italic">Invitation en attente</span>}
                    </p>
                    <p className="text-xs text-ink-500 truncate">{member.email}</p>
                    <p className="text-[10px] text-ink-400 mt-0.5">
                      Invité le {new Date(member.invitedAt || member.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                  {/* Sélecteur de rôle */}
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as TeamRole)}
                    disabled={actionLoadingId === member.id}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold outline-none cursor-pointer",
                      ROLE_COLOR[member.role as TeamRole] || ROLE_COLOR.VIEWER
                    )}
                  >
                    {(Object.keys(ROLE_LABEL) as TeamRole[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>

                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold",
                      STATUS_COLOR[member.status as TeamStatus] || STATUS_COLOR.PENDING
                    )}
                  >
                    {STATUS_LABEL[member.status as TeamStatus] || member.status}
                  </span>

                  <button
                    onClick={() => handleRevoke(member.id)}
                    disabled={actionLoadingId === member.id}
                    className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {actionLoadingId === member.id ? "..." : "Révoquer"}
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
          <h2 className="font-display text-base font-semibold text-ink-400">
            Accès révoqués ({revokedMembers.length})
          </h2>
          <div className="flex flex-col gap-2">
            {revokedMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface/50 p-3 opacity-70"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 font-display text-xs font-bold text-ink-500">
                    {member.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-700 truncate">{member.email}</p>
                    <p className="text-[10px] text-ink-400">Accès suspendu</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReactivate(member.id)}
                    disabled={actionLoadingId === member.id}
                    className="rounded-lg border border-green-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    Réactiver
                  </button>
                  <button
                    onClick={() => handleRemove(member.id)}
                    disabled={actionLoadingId === member.id}
                    className="rounded-lg border border-line px-2 py-1 text-xs text-ink-400 hover:text-red-600 disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explication des rôles */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="mb-4 font-display text-sm font-semibold text-ink-950">Explication des niveaux d&apos;accès</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(ROLE_LABEL) as TeamRole[]).map((role) => (
            <div key={role} className={cn("rounded-xl border p-3.5", ROLE_COLOR[role])}>
              <p className="font-mono text-[11px] font-bold uppercase tracking-wide">{ROLE_LABEL[role]}</p>
              <p className="mt-1 text-xs opacity-90 leading-relaxed">{ROLE_DESC[role]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
