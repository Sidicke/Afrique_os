/**
 * Couche API — Dashboard Super Admin
 * --------------------------------------------------------------------------
 * Appels réels vers le module backend `/api/v1/admin/*` (réservé ADMIN).
 *
 * Le backend renvoie directement le contrat d'affichage `types/admin.ts`
 * (voir `Ecommerce/administration/ADMIN_BACKEND_CONTRACT.md`) : pas de mapper
 * nécessaire — `adminService` ne fait que relayer + adapter les noms d'actions.
 *
 * Tous les appels passent par `apiFetch` : token Bearer injecté, refresh
 * silencieux sur 401, erreurs normalisées en `ApiError`.
 */

import { apiFetch } from "./http";
import type {
  AdminAnalyticsData,
  AdminAnalyticsPeriod,
  AdminModerationCase,
  AdminModerationData,
  AdminOrderDetail,
  AdminOrdersData,
  AdminOverviewData,
  AdminProfileData,
  AdminSettingsData,
  AdminStoreDetail,
  AdminStoresData,
  AdminSubscriptionDetail,
  AdminSubscriptionsData,
  AdminUserDetail,
  AdminUsersData,
  AdminVerificationCase,
  AdminVerificationsData,
} from "@/types/admin";

/** Requête simple : ajoute une chaîne de query si non vide */
function withQuery(base: string, params: Record<string, string | undefined>) {
  const qs = Object.entries(params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
    .join("&");
  return qs ? `${base}?${qs}` : base;
}

export const adminApi = {
  /* ===== Overview (doc 03) ===== */
  overview(period: AdminAnalyticsPeriod) {
    return apiFetch<AdminOverviewData>(
      withQuery("/admin/overview", { period })
    );
  },

  /* ===== Verification (doc 04) ===== */
  verifications() {
    return apiFetch<AdminVerificationsData>("/admin/verification");
  },
  verification(id: string) {
    return apiFetch<AdminVerificationCase>(
      `/admin/verification/${encodeURIComponent(id)}`
    );
  },
  reviewVerification(
    id: string,
    body: { status: "VERIFIED" | "REJECTED"; note?: string }
  ) {
    return apiFetch(`/admin/verification/${encodeURIComponent(id)}/decision`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /* ===== Boutiques (doc 05) ===== */
  stores() {
    return apiFetch<AdminStoresData>("/admin/stores");
  },
  store(id: string) {
    return apiFetch<AdminStoreDetail>(
      `/admin/stores/${encodeURIComponent(id)}`
    );
  },
  setStoreStatus(id: string, body: { status: string; reason?: string }) {
    return apiFetch(`/admin/stores/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  /* ===== Utilisateurs (doc 06) ===== */
  users() {
    return apiFetch<AdminUsersData>("/admin/users");
  },
  user(id: string) {
    return apiFetch<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`);
  },
  setUserStatus(id: string, body: { status: string; reason?: string }) {
    return apiFetch(`/admin/users/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  /* ===== Commandes (doc 07) ===== */
  orders() {
    return apiFetch<AdminOrdersData>("/admin/orders");
  },
  order(id: string) {
    return apiFetch<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(id)}`);
  },
  setOrderStatus(id: string, body: { status: string; reason?: string }) {
    return apiFetch(`/admin/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  cancelOrder(id: string, body: { reason: string }) {
    return apiFetch(`/admin/orders/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /* ===== Abonnements & revenus (doc 08) ===== */
  subscriptions() {
    return apiFetch<AdminSubscriptionsData>("/admin/subscriptions");
  },
  subscription(id: string) {
    return apiFetch<AdminSubscriptionDetail>(
      `/admin/subscriptions/${encodeURIComponent(id)}`
    );
  },
  updateSubscription(
    id: string,
    body: { planId?: string; status?: string; reason?: string }
  ) {
    return apiFetch(`/admin/subscriptions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  updatePlan(id: string, body: { isActive: boolean }) {
    return apiFetch(`/admin/plans/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  /* ===== Analytics (doc 09) ===== */
  analytics(period: AdminAnalyticsPeriod) {
    return apiFetch<AdminAnalyticsData>(
      withQuery("/admin/analytics", { period })
    );
  },

  /* ===== Modération (doc 10) ===== */
  moderation() {
    return apiFetch<AdminModerationData>("/admin/moderation");
  },
  moderationCase(id: string) {
    return apiFetch<AdminModerationCase>(
      `/admin/moderation/${encodeURIComponent(id)}`
    );
  },
  decideReport(
    id: string,
    body: { status: string; note?: string }
  ) {
    return apiFetch(`/admin/moderation/${encodeURIComponent(id)}/decision`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /* ===== Paramètres globaux (doc 11) ===== */
  settings() {
    return apiFetch<AdminSettingsData>("/admin/settings");
  },
  updateSettings(data: Record<string, unknown>) {
    return apiFetch<AdminSettingsData>("/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({ data }),
    });
  },

  /* ===== Profil + notes internes ===== */
  profile() {
    return apiFetch<AdminProfileData>("/admin/profile");
  },
  createNote(body: { targetType: string; targetId: string; content: string }) {
    return apiFetch("/admin/notes", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
