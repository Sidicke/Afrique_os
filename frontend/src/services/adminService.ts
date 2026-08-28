/**
 * Service Layer — Super Admin (BRANCHÉ SUR L'API)
 * --------------------------------------------------------------------------
 * Chaque méthode délègue au module backend `/api/v1/admin/*` via
 * `lib/api/admin.ts`. La surface d'export est strictement identique à
 * l'ancienne couche de démonstration : les composants et hooks ne changent
 * pas — seule la source de vérité change (le backend, doc 12 §25).
 *
 * Les actions qui renvoient une entité complète (dossier, boutique, commande…)
 * re-fetchent le détail après la mutation afin que `onUpdated` reçoive l'état
 * réel. En cas d'erreur API, la plupart des mutations renvoient `null`
 * (l'interface reste cohérente) ; `updateModerationStatus` propage l'erreur
 * car son composant l'affiche.
 */

import { adminApi } from "@/lib/api/admin";
import { ApiError, authApi, usersApi } from "@/lib/api";
import type {
  AdminAnalyticsPeriod,
  AdminModerationCase,
  AdminOrderDetail,
  AdminOrderStatus,
  AdminOverviewData,
  AdminProfileData,
  AdminSettingsData,
  AdminSettingsSection,
  AdminStoreDetail,
  AdminSubscriptionDetail,
  AdminUserDetail,
  AdminVerificationCase,
} from "@/types/admin";

/* ————————————————————————————————
 * Helpers
 * ———————————————————————————————— */

/** Capture une erreur API : log + retour null (l'interface ne casse pas). */
async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[adminService] ${label} :`, err);
    return null;
  }
}

/** Mapping des actions d'interface → statuts backend */
const VERIFICATION_ACTION: Record<string, "VERIFIED" | "REJECTED"> = {
  APPROVE: "VERIFIED",
  CHANGES: "REJECTED",
  REJECT: "REJECTED",
};

const STORE_ACTION_TO_STATUS: Record<string, string> = {
  SUSPEND: "SUSPENDED",
  REACTIVATE: "ACTIVE",
  BLOCK: "CLOSED",
};

const USER_ACTION_TO_STATUS: Record<string, string> = {
  SUSPEND: "BLOCKED",
  REACTIVATE: "ACTIVE",
  BLOCK: "BLOCKED",
  DEACTIVATE: "BLOCKED",
};

const REPORT_INTENT_TO_STATUS: Record<string, string> = {
  NEW: "NEW",
  IN_REVIEW: "IN_PROGRESS",
  PENDING_INFO: "IN_PROGRESS",
  ACTION_REQUIRED: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED",
  ARCHIVED: "RESOLVED",
};

/** Résout un nom de plan ('Pro'…) → planId (les noms viennent du backend) */
async function resolvePlanId(name: string): Promise<string | null> {
  const { plans } = await adminApi.subscriptions();
  const plan = plans.find(
    (p) => p.name.toLowerCase() === name.trim().toLowerCase()
  );
  return plan?.id ?? null;
}

/* ————————————————————————————————
 * Service admin — même surface d'export que l'ancienne couche démo
 * ———————————————————————————————— */

export const adminService = {
  /* ===== Overview (doc 03) ===== */
  getOverview(period: AdminOverviewData["period"] = "30_days") {
    return adminApi.overview(period);
  },

  /* ===== Verification Center (doc 04) ===== */
  getVerifications() {
    return adminApi.verifications();
  },
  getVerification(id: string) {
    return adminApi.verification(id);
  },
  decideVerification(
    id: string,
    input: { action: "APPROVE" | "CHANGES" | "REJECT"; reason?: string; by: string }
  ): Promise<AdminVerificationCase | null> {
    return safe("décision de vérification", async () => {
      const status = VERIFICATION_ACTION[input.action];
      if (!status) return null;
      await adminApi.reviewVerification(id, { status, note: input.reason });
      return adminApi.verification(id);
    });
  },
  addInternalNote(
    id: string,
    content: string,
    adminName: string
  ): Promise<AdminVerificationCase | null> {
    return safe(`note interne (${adminName})`, async () => {
      await adminApi.createNote({ targetType: "boutique", targetId: id, content });
      return adminApi.verification(id);
    });
  },

  /* ===== Stores Management (doc 05) ===== */
  getStores() {
    return adminApi.stores();
  },
  getStore(id: string) {
    return adminApi.store(id);
  },
  setStoreStatus(
    id: string,
    action: "SUSPEND" | "REACTIVATE" | "BLOCK",
    input: { reason?: string; by: string }
  ): Promise<AdminStoreDetail | null> {
    return safe(`action boutique (${input.by})`, async () => {
      const status = STORE_ACTION_TO_STATUS[action];
      if (!status) return null;
      await adminApi.setStoreStatus(id, { status, reason: input.reason });
      return adminApi.store(id);
    });
  },
  addStoreNote(
    id: string,
    content: string,
    adminName: string
  ): Promise<AdminStoreDetail | null> {
    return safe(`note boutique (${adminName})`, async () => {
      await adminApi.createNote({ targetType: "boutique", targetId: id, content });
      return adminApi.store(id);
    });
  },

  /* ===== Users Management (doc 06) ===== */
  getUsers() {
    return adminApi.users();
  },
  getUser(id: string) {
    return adminApi.user(id);
  },
  setUserStatus(
    id: string,
    action: "SUSPEND" | "REACTIVATE" | "BLOCK" | "DEACTIVATE",
    input: { reason?: string; by: string }
  ): Promise<AdminUserDetail | null> {
    return safe(`action utilisateur (${input.by})`, async () => {
      const status = USER_ACTION_TO_STATUS[action];
      if (!status) return null;
      await adminApi.setUserStatus(id, { status, reason: input.reason });
      return adminApi.user(id);
    });
  },
  addUserNote(
    id: string,
    content: string,
    adminName: string
  ): Promise<AdminUserDetail | null> {
    return safe(`note utilisateur (${adminName})`, async () => {
      await adminApi.createNote({ targetType: "user", targetId: id, content });
      return adminApi.user(id);
    });
  },

  /* ===== Orders Platform Overview (doc 07) ===== */
  getOrders() {
    return adminApi.orders();
  },
  getOrder(id: string) {
    return adminApi.order(id);
  },
  changeOrderStatus(
    id: string,
    status: AdminOrderStatus,
    input: { reason: string; by: string }
  ): Promise<AdminOrderDetail | null> {
    return safe(`statut commande (${input.by})`, async () => {
      await adminApi.setOrderStatus(id, { status, reason: input.reason });
      return adminApi.order(id);
    });
  },
  cancelOrder(
    id: string,
    input: { reason: string; by: string }
  ): Promise<AdminOrderDetail | null> {
    return safe("annulation commande", async () => {
      await adminApi.cancelOrder(id, { reason: input.reason });
      return adminApi.order(id);
    });
  },
  addOrderNote(
    id: string,
    content: string,
    adminName: string
  ): Promise<AdminOrderDetail | null> {
    return safe(`note commande (${adminName})`, async () => {
      await adminApi.createNote({ targetType: "order", targetId: id, content });
      return adminApi.order(id);
    });
  },

  /* ===== Subscriptions & Revenue (doc 08) ===== */
  getSubscriptions() {
    return adminApi.subscriptions();
  },
  getSubscription(id: string) {
    return adminApi.subscription(id);
  },
  changeSubscriptionPlan(
    id: string,
    newPlan: string,
    input: { reason?: string; by: string }
  ): Promise<AdminSubscriptionDetail | null> {
    return safe(`changement de plan (${input.by})`, async () => {
      const planId = await resolvePlanId(newPlan);
      if (!planId) return null;
      await adminApi.updateSubscription(id, { planId, reason: input.reason });
      return adminApi.subscription(id);
    });
  },
  suspendSubscription(
    id: string,
    input: { reason: string; by: string }
  ): Promise<AdminSubscriptionDetail | null> {
    return safe(`suspension d'abonnement (${input.by})`, async () => {
      await adminApi.updateSubscription(id, {
        status: "CANCELLED",
        reason: input.reason,
      });
      return adminApi.subscription(id);
    });
  },
  setPlanStatus(id: string, status: "ACTIVE" | "DISABLED") {
    return safe("mise à jour du plan", async () => {
      await adminApi.updatePlan(id, { isActive: status === "ACTIVE" });
      const { plans } = await adminApi.subscriptions();
      return plans.find((p) => p.id === id) ?? null;
    });
  },

  /* ===== Analytics (doc 09) ===== */
  getAnalytics(period: AdminAnalyticsPeriod = "30_days") {
    return adminApi.analytics(period);
  },

  /* ===== Moderation & Security (doc 10) ===== */
  getModeration() {
    return adminApi.moderation();
  },
  getModerationCase(id: string) {
    return adminApi.moderationCase(id);
  },
  updateModerationStatus(
    id: string,
    input: { status: string; reason?: string; by: string }
  ): Promise<AdminModerationCase> {
    const backendStatus = REPORT_INTENT_TO_STATUS[input.status];
    if (!backendStatus) {
      throw new Error(`Statut de signalement inconnu : ${input.status}`);
    }
    return adminApi
      .decideReport(id, { status: backendStatus, note: input.reason })
      .then(() => adminApi.moderationCase(id));
  },
  addModerationNote(
    id: string,
    input: { author: string; content: string }
  ): Promise<AdminModerationCase | null> {
    return safe("note de modération", async () => {
      await adminApi.createNote({
        targetType: "report",
        targetId: id,
        content: input.content,
      });
      return adminApi.moderationCase(id);
    });
  },

  /* ===== Platform Settings (doc 11) ===== */
  getSettings() {
    return adminApi.settings();
  },
  updateSettings(
    section: AdminSettingsSection,
    patch: unknown
  ): Promise<AdminSettingsData | null> {
    return safe("mise à jour des paramètres", async () =>
      adminApi.updateSettings({ [section]: patch })
    );
  },

  /* ===== Admin Profile (doc 02 §15) ===== */
  getProfile() {
    return adminApi.profile();
  },
  updateProfile(input: { name: string; email: string; phone: string }) {
    return safe("mise à jour du profil", async () => {
      await usersApi.update(input);
      return adminApi.profile();
    });
  },
  /** 2FA non modélisé côté backend : simulation locale du toggle. */
  setTwoFactor(enabled: boolean): Promise<AdminProfileData | null> {
    return safe("activation 2FA", async () => {
      const profile = await adminApi.profile();
      return {
        ...profile,
        security: { ...profile.security, twoFactorEnabled: enabled },
      };
    });
  },
  /** Sessions non énumérables côté backend : simulation locale. */
  revokeSession(id: string): Promise<AdminProfileData | null> {
    return safe("révocation de session", async () => {
      const profile = await adminApi.profile();
      return {
        ...profile,
        sessions: profile.sessions.filter((s) => s.id !== id),
      };
    });
  },
  /** Persiste la préférence dans les paramètres globaux (notifications.system). */
  updateNotificationPrefs(
    id: string,
    enabled: boolean
  ): Promise<AdminProfileData | null> {
    return safe("préférences de notification", async () => {
      const profile = await adminApi.profile();
      const prefs = profile.notificationPrefs.map((p) =>
        p.id === id ? { ...p, enabled } : p
      );
      await adminApi.updateSettings({ notifications: { system: prefs } });
      return adminApi.profile();
    });
  },

  /* ===== Mot de passe (compte) ===== */
  async changePassword(input: {
    currentPassword: string;
    nextPassword: string;
  }): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await authApi.changePassword({
        currentPassword: input.currentPassword,
        newPassword: input.nextPassword,
      });
      return { ok: res.success, error: undefined };
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Changement de mot de passe impossible.",
      };
    }
  },
};
