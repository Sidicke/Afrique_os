"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBoutiqueId } from "@/lib/api/session";
import {
  notificationsApi,
  type ApiNotification,
} from "@/lib/api/notifications";

/** Intervalle de rafraîchissement du badge/panneau (ms) */
const POLL_INTERVAL = 30_000;

export interface NotificationsState {
  /** Compteur de non-lues (badge de la cloche) */
  unreadCount: number;
  /** Liste des notifications (plus récentes d'abord) */
  items: ApiNotification[];
  /** Chargement initial */
  loading: boolean;
  /**
   * Incrémenté à chaque NOUVELLE notification détectée (le compteur de
   * non-lues augmente entre deux rafraîchissements). Ignoré au premier
   * chargement : on ne sonne pas pour d'anciennes notifications. Le
   * consommateur (cloche) écoute ce signal pour déclencher son alerte.
   */
  newAlertKey: number;
}

/**
 * Notifications vendeur — pilote la cloche du dashboard.
 * Rafraîchissement silencieux toutes les 30 s + au retour de visibilité de
 * l'onglet (le client peut annuler une commande pendant que le vendeur est
 * ailleurs). Toute erreur réseau échoue silencieusement (prochain cycle).
 */
export function useNotifications() {
  const boutiqueId = getBoutiqueId();
  const [state, setState] = useState<NotificationsState>({
    unreadCount: 0,
    items: [],
    loading: false,
    newAlertKey: 0,
  });

  /** Dernier compteur connu — permet de détecter une NOUVELLE notification */
  const lastUnreadRef = useRef<number | null>(null);

  /** Recharge compteur + liste (silencieux) */
  const refresh = useCallback(async () => {
    if (!boutiqueId) return;
    try {
      const [count, items] = await Promise.all([
        notificationsApi.unreadCount(boutiqueId),
        notificationsApi.list(boutiqueId),
      ]);
      // Comparaison HORS de l'updater (updater pur — pas d'effet de bord,
      // sûr sous le double-invocation de StrictMode)
      const prev = lastUnreadRef.current;
      lastUnreadRef.current = count.count;
      setState((s) => ({
        unreadCount: count.count,
        items,
        loading: false,
        // Première lecture (prev null) : on mémorise sans alerter
        newAlertKey:
          prev !== null && count.count > prev ? s.newAlertKey + 1 : s.newAlertKey,
      }));
    } catch {
      // Silencieux : le prochain cycle réessayera
    }
  }, [boutiqueId]);

  /** Chargement initial + polling + retour d'onglet */
  useEffect(() => {
    if (!boutiqueId) return;
    // Différé (setTimeout) : aucun setState synchrone dans l'effet
    const initial = setTimeout(() => void refresh(), 0);
    const interval = setInterval(() => void refresh(), POLL_INTERVAL);
    const onVisibility = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [boutiqueId, refresh]);

  /** Marque une notification comme lue puis rafraîchit */
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!boutiqueId) return;
      try {
        await notificationsApi.markAsRead(boutiqueId, notificationId);
        await refresh();
      } catch {
        // silencieux
      }
    },
    [boutiqueId, refresh],
  );

  /** Marque tout comme lu puis rafraîchit */
  const markAllAsRead = useCallback(async () => {
    if (!boutiqueId) return;
    try {
      await notificationsApi.markAllAsRead(boutiqueId);
      await refresh();
    } catch {
      // silencieux
    }
  }, [boutiqueId, refresh]);

  /** Supprime toutes les notifications puis rafraîchit */
  const deleteAll = useCallback(async () => {
    if (!boutiqueId) return;
    try {
      await notificationsApi.deleteAll(boutiqueId);
      await refresh();
    } catch {
      // silencieux
    }
  }, [boutiqueId, refresh]);

  return { ...state, refresh, markAsRead, markAllAsRead, deleteAll };
}
