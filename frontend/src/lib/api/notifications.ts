/**
 * Couche API — Notifications vendeur (cloche du dashboard)
 * --------------------------------------------------------------------------
 * Notifications créées côté serveur sur des événements métier (ex. annulation
 * de commande par un client). Routes protégées : le boutiquier connecté ne
 * voit que celles de SA boutique.
 */

import { apiFetch } from "./http";

/** Notification vendeur — contrat backend (notifications.service) */
export interface ApiNotification {
  id: string;
  boutiqueId: string;
  /** Ex. "order_cancelled" */
  type: string;
  title: string;
  message: string | null;
  /** Ex. "#AC-8901" — lien vers l'onglet Commandes */
  orderReference: string | null;
  /** null = non lue */
  readAt: string | null;
  createdAt: string;
}

export const notificationsApi = {
  /** Liste des notifications (plus récentes d'abord) */
  list(boutiqueId: string) {
    return apiFetch<ApiNotification[]>(
      `/notifications/boutique/${encodeURIComponent(boutiqueId)}`,
    );
  },

  /** Compteur de non-lues (badge de la cloche) */
  unreadCount(boutiqueId: string) {
    return apiFetch<{ count: number }>(
      `/notifications/boutique/${encodeURIComponent(boutiqueId)}/unread-count`,
    );
  },

  /** Marque une notification comme lue */
  markAsRead(boutiqueId: string, notificationId: string) {
    return apiFetch<{ success: boolean }>(
      `/notifications/boutique/${encodeURIComponent(boutiqueId)}/${encodeURIComponent(notificationId)}/read`,
      { method: "POST" },
    );
  },

  /** Marque toutes les notifications comme lues */
  markAllAsRead(boutiqueId: string) {
    return apiFetch<{ success: boolean }>(
      `/notifications/boutique/${encodeURIComponent(boutiqueId)}/read-all`,
      { method: "POST" },
    );
  },

  /** Supprime toutes les notifications de la boutique (panneau) */
  deleteAll(boutiqueId: string) {
    return apiFetch<{ success: boolean; deleted: number }>(
      `/notifications/boutique/${encodeURIComponent(boutiqueId)}`,
      { method: "DELETE" },
    );
  },
};
