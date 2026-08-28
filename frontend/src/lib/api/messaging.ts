/**
 * Couche API — Messagerie (acheteur ↔ vendeur)
 * --------------------------------------------------------------------------
 * Deux canaux complémentaires :
 *  - REST  : conversations, historique paginé, envoi (fallback), lecture
 *  - WS    : Socket.IO namespace `/messaging`, authentifié au handshake par
 *    le JWT access (`auth: { token }`) — temps réel + indicateur de frappe
 *
 * Le namespace de la gateway backend est `/messaging`, monté sur `WS_BASE_URL`.
 */

import { io, type Socket } from "socket.io-client";
import { WS_BASE_URL } from "./config";
import { apiFetch } from "./http";
import { getAccessToken } from "./session";
import type { ApiConversation, ApiMessage } from "./types";

export const messagingApi = {
  /** Conversations accessibles à l'utilisateur connecté */
  conversations() {
    return apiFetch<ApiConversation[]>("/conversations");
  },

  /**
   * Un client ouvre (ou réutilise) une conversation avec une boutique.
   * Contexte commercial optionnel (produit / commande) : la messagerie
   * comprend le commerce — le fil est lié à ce contexte côté backend.
   */
  startConversation(
    boutiqueId: string,
    input: {
      clientName: string;
      clientPhone?: string;
      firstMessage?: string;
      productId?: string;
      productName?: string;
      productPrice?: string;
      productDescription?: string;
      productImage?: string;
      orderId?: string;
      orderReference?: string;
    },
  ) {
    return apiFetch<ApiConversation>(
      `/conversations/start/${encodeURIComponent(boutiqueId)}`,
      { method: "POST", body: JSON.stringify(input) },
    );
  },

  /** Historique paginé (curseur = createdAt ISO) */
  messages(conversationId: string, cursor?: string, limit = 30) {
    const qs = new URLSearchParams();
    if (cursor) qs.set("cursor", cursor);
    qs.set("limit", String(limit));
    return apiFetch<ApiMessage[]>(
      `/conversations/${encodeURIComponent(conversationId)}/messages?${qs.toString()}`,
    );
  },

  /** Envoi REST (fallback WebSocket) */
  send(conversationId: string, content: string) {
    return apiFetch<{ message: ApiMessage }>(
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
      { method: "POST", body: JSON.stringify({ content }) },
    );
  },

  /** Marque les messages comme lus */
  applyDiscount(conversationId: string, agreedPrice: number) {
    return apiFetch(`/messaging/conversations/${conversationId}/discount`, {
      method: "POST",
      body: JSON.stringify({ agreedPrice }),
    });
  },

  markRead(conversationId: string) {
    return apiFetch<{ success: boolean }>(
      `/conversations/${encodeURIComponent(conversationId)}/read`,
      { method: "POST" },
    );
  },
};

/* ———————————————————————————————— WebSocket ———————————————————————————————— */

export interface MessagingSocketEvents {
  /** Reçu quand un message est diffusé dans une conversation rejointes */
  newMessage: (payload: { conversationId: string; message: ApiMessage }) => void;
  /** Indicateur de frappe d'un autre membre */
  typing: (payload: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  }) => void;
}

/**
 * Client WebSocket typé pour la messagerie.
 *
 * ```ts
 * const ws = createMessagingSocket();
 * ws.connect();
 * ws.join("conv-1");
 * ws.onNewMessage(({ conversationId, message }) => …);
 * ws.send("conv-1", "Bonjour");
 * ws.typing("conv-1", true);
 * ws.disconnect();
 * ```
 */
export function createMessagingSocket() {
  let socket: Socket | null = null;

  return {
    connect() {
      const token = getAccessToken();
      if (!token) throw new ApiMessagingError("Aucune session active");
      socket = io(`${WS_BASE_URL}/messaging`, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
      });
      return socket;
    },

    /** Connexion prête (résolution à la réception de `connect`) */
    waitConnected(timeoutMs = 8000) {
      if (!socket) return Promise.reject(new ApiMessagingError("Non connecté"));
      return new Promise<Socket>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new ApiMessagingError("Timeout de connexion")),
          timeoutMs,
        );
        socket?.on("connect", () => {
          clearTimeout(timer);
          resolve(socket as Socket);
        });
        socket?.on("connect_error", (err) => {
          clearTimeout(timer);
          reject(err);
        });
      });
    },

    join(conversationId: string) {
      socket?.emit("joinConversation", { conversationId });
    },

    /** Persiste côté serveur PUIS diffuse aux membres de la conversation */
    send(conversationId: string, content: string) {
      socket?.emit("sendMessage", { conversationId, content });
    },

    typing(conversationId: string, isTyping: boolean) {
      socket?.emit("typing", { conversationId, isTyping });
    },

    onNewMessage(handler: MessagingSocketEvents["newMessage"]) {
      socket?.on("newMessage", handler);
      return () => socket?.off("newMessage", handler);
    },

    onTyping(handler: MessagingSocketEvents["typing"]) {
      socket?.on("typing", handler);
      return () => socket?.off("typing", handler);
    },

    disconnect() {
      socket?.disconnect();
      socket = null;
    },
  };
}

export class ApiMessagingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiMessagingError";
  }
}
