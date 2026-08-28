"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createMessagingSocket, messagingApi } from "@/lib/api";
import { getSessionUser } from "@/lib/api/session";
import type { ApiConversation, ApiMessage } from "@/lib/api";

export type SocketStatus = "connecting" | "connected" | "offline";

/**
 * Messagerie — hook central (dashboard vendeur).
 * --------------------------------------------------------------------------
 *  - Liste des conversations : `GET /conversations`
 *  - Historique : `GET /conversations/:id/messages` (pagination par curseur)
 *  - Temps réel : socket Socket.IO `/messaging` (auth au handshake) — join de
 *    la conversation active, réception de `newMessage`, indicateur de frappe.
 *  - Envoi : WebSocket avec affichage OPTIMISTE (le serveur persiste puis
 *    diffuse `newMessage`, y compris à l'émetteur → réconciliation par
 *    contenu). Repli REST si la connexion est indisponible.
 */
export function useMessaging() {
  const [conversations, setConversations] = useState<ApiConversation[] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("connecting");
  const [typingUserId, setTypingUserId] = useState<string | null>(null);

  const socketRef = useRef<ReturnType<typeof createMessagingSocket> | null>(
    null
  );
  const activeIdRef = useRef<string | null>(null);
  const socketStatusRef = useRef<SocketStatus>("connecting");
  /** Messages optimistes en attente de confirmation serveur (tempId → contexte) */
  const pendingRef = useRef<
    Map<string, { conversationId: string; content: string }>
  >(new Map());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronisation refs ↔ état (jamais d'écriture de ref pendant le rendu)
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);
  useEffect(() => {
    socketStatusRef.current = socketStatus;
  }, [socketStatus]);

  /** Ajoute un message sans doublon (tri chronologique) */
  const appendMessage = useCallback((message: ApiMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === message.id) ? prev : [...prev, message]
    );
  }, []);

  /** Ouvre une conversation : join WebSocket + historique + marquage lu */
  const selectConversation = useCallback(async (id: string) => {
    setActiveId(id);
    setTypingUserId(null);
    setMessagesLoading(true);
    socketRef.current?.join(id);
    try {
      const history = await messagingApi.messages(id);
      // L'API renvoie du plus récent au plus ancien → chronologique, puis FUSION
      // avec les messages vivants (un message temps réel arrivé pendant le fetch
      // ne doit pas être écrasé par le remplacement d'historique).
      setMessages((prev) => {
        const merged = new Map<string, ApiMessage>();
        for (const m of [...history].reverse()) merged.set(m.id, m);
        for (const m of prev) if (!merged.has(m.id)) merged.set(m.id, m);
        return [...merged.values()].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
      void messagingApi.markRead(id).catch(() => {});
    } catch (err) {
      console.error("[messaging] historique indisponible :", err);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  /** Retour à la liste (mobile) : on ne reçoit plus les messages entrants */
  const clearSelection = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setTypingUserId(null);
  }, []);

  /** Charge la liste des conversations (rafraîchissement manuel) */
  const refresh = useCallback(async () => {
    try {
      const list = await messagingApi.conversations();
      setConversations(list);
      setError(null);
    } catch (err) {
      setError("Impossible de charger les conversations.");
      console.error("[messaging] conversations :", err);
    }
  }, []);

  /** Refresh différé : une nouvelle conversation créée par un client pendant
   *  la session apparaît dans la liste sans action manuelle. */
  const scheduleListRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      void refresh();
    }, 800);
  }, [refresh]);

  // Montage : connexion WebSocket + première liste de conversations
  useEffect(() => {
    let cancelled = false;
    // Référence locale du map des messages optimistes (utilisée aussi au
    // nettoyage — la ref d'origine peut évoluer d'ici là)
    const pending = pendingRef.current;

    const socket = createMessagingSocket();
    socketRef.current = socket;
    const rawSocket = socket.connect();

    // Statut bidirectionnel : connect_error → offline, reconnexion → connected
    rawSocket.on("connect", () => {
      if (!cancelled) setSocketStatus("connected");
    });
    rawSocket.on("disconnect", () => {
      if (!cancelled) setSocketStatus("offline");
    });
    rawSocket.on("connect_error", () => {
      if (!cancelled) setSocketStatus("offline");
    });

    // Message reçu (envoyé par nous OU par le client) → mise à jour en direct
    socket.onNewMessage(({ conversationId, message }) => {
      // Réconciliation : remplace le message optimiste (même conversation,
      // même contenu) par la version serveur persistée
      let tempId: string | null = null;
      for (const [id, item] of pending) {
        if (
          item.conversationId === conversationId &&
          item.content === message.content
        ) {
          tempId = id;
          pending.delete(id);
          break;
        }
      }

      if (conversationId === activeIdRef.current) {
        if (tempId) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? message : m))
          );
        } else {
          appendMessage(message);
        }
      }

      // La conversation remonte en tête de liste (dernier message) ; si elle
      // n'existe pas encore (nouvelle conversation), refresh différé
      setConversations((prev) => {
        if (!prev) return prev;
        const conv = prev.find((c) => c.id === conversationId);
        if (!conv) {
          scheduleListRefresh();
          return prev;
        }
        return [
          { ...conv, lastMessageAt: message.createdAt },
          ...prev.filter((c) => c.id !== conversationId),
        ];
      });
    });

    socket.onTyping(({ conversationId, userId, isTyping }) => {
      if (conversationId === activeIdRef.current) {
        setTypingUserId(isTyping ? userId : null);
      }
    });

    void messagingApi
      .conversations()
      .then((list) => {
        if (cancelled) return;
        setConversations(list);
        setLoading(false);
        if (list.length > 0) {
          // Ouvre la conversation la plus récente par défaut
          void selectConversation(list[0].id);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError("Impossible de charger les conversations.");
        setLoading(false);
        console.error("[messaging] conversations :", err);
      });

    return () => {
      cancelled = true;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      socket.disconnect();
      socketRef.current = null;
      pending.clear();
    };
  }, [selectConversation, appendMessage, scheduleListRefresh]);

  /** Envoie un message (WebSocket optimiste si dispo, sinon REST) */
  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      const id = activeIdRef.current;
      const trimmed = content.trim();
      if (!id || !trimmed) return;

      if (socketStatusRef.current === "connected") {
        // Optimiste : affiché immédiatement, puis remplacé par la version
        // serveur quand `newMessage` revient (persistance + diffusion).
        const me = getSessionUser();
        const tempId = `temp-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        pendingRef.current.set(tempId, {
          conversationId: id,
          content: trimmed,
        });
        appendMessage({
          id: tempId,
          senderRole: "VENDEUR",
          sender: { id: me?.id ?? "me", name: me?.name ?? "Vous" },
          content: trimmed,
          readAt: null,
          createdAt: new Date().toISOString(),
        });
        socketRef.current?.send(id, trimmed);
        return;
      }
      // Repli REST (WebSocket indisponible)
      try {
        const { message } = await messagingApi.send(id, trimmed);
        appendMessage(message);
      } catch (err) {
        console.error("[messaging] envoi REST échoué :", err);
        throw err instanceof Error ? err : new Error("Envoi impossible.");
      }
    },
    [appendMessage]
  );

  /** Indicateur de frappe (diffusé aux autres membres de la conversation) */
  const setTyping = useCallback((isTyping: boolean) => {
    const id = activeIdRef.current;
    if (!id) return;
    socketRef.current?.typing(id, isTyping);
  }, []);

  const activeConversation =
    conversations?.find((c) => c.id === activeId) ?? null;

  return {
    conversations,
    loading,
    error,
    refresh,
    activeId,
    activeConversation,
    selectConversation,
    clearSelection,
    messages,
    messagesLoading,
    socketStatus,
    typingUserId,
    sendMessage,
    setTyping,
  };
}
