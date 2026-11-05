/**
 * Couche API — Commandes
 * --------------------------------------------------------------------------
 * La création de commande est PUBLIQUE (le client n'a pas de compte) : le
 * backend recalcule le total et décrémente le stock dans la même transaction.
 */

import { apiFetch } from "./http";
import type { ApiCreateOrderInput, ApiOrder } from "./types";

/** Statuts côté API (EN MAJUSCULES — enum Prisma) */
export type ApiOrderStatus =
  | "PENDING"
  | "PAID"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCELLED";

export const ordersApi = {
  /** Création depuis la vitrine (total recalculé serveur, idempotent via clé UUID) */
  create(boutiqueId: string, input: ApiCreateOrderInput, idempotencyKey?: string) {
    return apiFetch<ApiOrder>(`/orders/boutique/${encodeURIComponent(boutiqueId)}`, {
      method: "POST",
      body: JSON.stringify(input),
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    });
  },

  /**
   * Commandes du CLIENT connecté (toutes boutiques) — GET /orders/me.
   * Isolation stricte : le backend ne renvoie que les commandes du token.
   */
  me() {
    return apiFetch<ApiOrder[]>("/orders/me");
  },

  /** Liste des commandes d'une boutique (vendeur) */
  seller(boutiqueId: string) {
    return apiFetch<ApiOrder[]>(`/orders/boutique/${encodeURIComponent(boutiqueId)}`);
  },

  /** Toutes les commandes de toutes les boutiques du vendeur */
  allOwner() {
    return apiFetch<ApiOrder[]>("/orders/owner");
  },

  /** Changement de statut par le vendeur */
  updateStatus(boutiqueId: string, orderId: string, status: ApiOrderStatus, deliveryContact?: string) {
    return apiFetch<ApiOrder>(
      `/orders/boutique/${encodeURIComponent(boutiqueId)}/${encodeURIComponent(orderId)}/status`,
      { method: "PATCH", body: JSON.stringify({ status, deliveryContact }) },
    );
  },

  /** Rappel de paiement (PENDING) */
  remindPayment(boutiqueId: string, orderId: string) {
    return apiFetch<{ success: boolean; message: string }>(
      `/orders/boutique/${encodeURIComponent(boutiqueId)}/${encodeURIComponent(orderId)}/remind`,
      { method: "POST" },
    );
  },

  /** Historique d'un client par téléphone */
  customer(boutiqueId: string, phone: string) {
    return apiFetch<ApiOrder[]>(
      `/orders/boutique/${encodeURIComponent(boutiqueId)}/customer/${encodeURIComponent(phone)}`,
    );
  },

  /**
   * Suivi d'une commande par numéro (référence, ex. « #AC-8901 »).
   * `phone` optionnel : fourni, le backend vérifie que la commande appartient
   * bien à ce téléphone (404 sinon).
   */
  byReference(boutiqueId: string, reference: string, phone?: string) {
    const qs = phone ? `?phone=${encodeURIComponent(phone)}` : "";
    return apiFetch<ApiOrder>(
      `/orders/boutique/${encodeURIComponent(boutiqueId)}/reference/${encodeURIComponent(reference)}${qs}`,
    );
  },

  /**
   * Confirmation de paiement par le CLIENT (vitrine) : PENDING → PAID.
   * Un client connecté est identifié par son token ; un visiteur doit
   * fournir le téléphone de la commande (404 sinon). Le statut PAID est
   * la source de vérité du backend.
   */
  pay(boutiqueId: string, orderId: string, input?: { phone?: string; transactionRef?: string }) {
    return apiFetch<ApiOrder>(
      `/orders/boutique/${encodeURIComponent(boutiqueId)}/${encodeURIComponent(orderId)}/pay`,
      { method: "POST", body: JSON.stringify(input ?? {}) },
    );
  },

  /**
   * Annulation d'une commande par le CLIENT (vitrine). Le téléphone est
   * obligatoire et doit correspondre à celui de la commande (404 sinon).
   * L'annulation n'est possible qu'avant expédition (PENDING/PAID).
   * `reason` optionnel : motif saisi par le client, visible par le vendeur.
   */
  cancel(boutiqueId: string, orderId: string, phone: string, reason?: string) {
    const trimmedReason = reason?.trim();
    return apiFetch<ApiOrder>(
      `/orders/boutique/${encodeURIComponent(boutiqueId)}/${encodeURIComponent(orderId)}/cancel`,
      {
        method: "PATCH",
        body: JSON.stringify(trimmedReason ? { phone, reason: trimmedReason } : { phone }),
      },
    );
  },

  /**
   * Création d'une facture Checkout PayDunya côté serveur (Zero-Trust & Idempotent).
   */
  createPayDunyaTransaction(
    input: {
      orderId: string;
      callbackUrl?: string;
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
    },
    idempotencyKey?: string,
  ) {
    return apiFetch<{
      success: boolean;
      mode: "live" | "sandbox" | "sandbox_mock";
      transactionId: string;
      reference: string;
      amount: number;
      currency: string;
      checkoutUrl: string;
      token: string;
    }>("/payments/paydunya/create-transaction", {
      method: "POST",
      body: JSON.stringify(input),
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    });
  },

  /**
   * Confirmation directe d'une facture PayDunya par son token au retour du client sur `return_url`
   * (fonctionne même en `localhost` sans tunnel IPN).
   */
  confirmPayDunyaTransaction(token: string, orderId?: string) {
    const qs = orderId ? `?orderId=${encodeURIComponent(orderId)}` : "";
    return apiFetch<{
      success: boolean;
      token: string;
      paydunyaStatus: string;
      orderId: string | null;
      orderReference: string | null;
      settlementStatus: string;
      receiptUrl: string | null;
    }>(`/payments/paydunya/confirm/${encodeURIComponent(token)}${qs}`);
  },
};
