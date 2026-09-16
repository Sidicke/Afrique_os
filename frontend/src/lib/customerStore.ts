/**
 * Store client (acheteur) — profil et commandes.
 * --------------------------------------------------------------------------
 * ⚠️ MODULE PUR (aucun import React) : les données et actions sont utilisées
 * par des composants client ET par les tests. Le hook `useCustomerStore` vit
 * dans `lib/useCustomerStore.ts` ("use client").
 *
 * Le jour où l'authentification + le backend arrivent, on remplace les
 * fonctions de ce module par les vrais appels API sans toucher aux composants.
 */

import { ApiError } from "@/lib/api/http";
import {
  orderStatusLabel,
  paymentMethodLabel,
  toApiPaymentMethod,
  toCustomerOrder,
  toOrderRecord,
} from "@/lib/api/mappers";
import { ordersApi } from "@/lib/api/orders";
import type { OrderStatus, PaymentMethod } from "@/types/dashboard";

/* ————————————————————————————————————————————————
 * Types
 * ———————————————————————————————————————————————— */

export interface CustomerProfile {
  defaultAddress?: string;
  defaultCity?: string;
  defaultPaymentMethod?: string;
  pointsBalance?: number;
  name: string;
  phone: string;
}

export interface OrderItem {
  name: string;
  variantLabel?: string;
  qty: number;
  /** Prix unitaire effectivement payé (déjà remisé) */
  unitPrice: number;
}

export interface OrderRecord {
  id: string;
  ref: string;
  createdAt: string;
  items: OrderItem[];
  deliveryName: string;
  deliveryPrice: number;
  total: number;
  /** Statut réel du backend (absent sur le repli local hors-ligne) */
  status?: OrderStatus;
  statusLabel?: string;
  paymentLabel?: string;
  /** Référence de transaction fournisseur (paiement) */
  paymentRef?: string;
}

/**
 * Vue « Mon compte » — commande RÉELLE du backend, prête à afficher
 * (statut et moyen de paiement en français).
 */
export interface CustomerOrderView {
  id: string;
  ref: string;
  createdAt: string;
  dateLabel: string;
  status: OrderStatus;
  statusLabel: string;
  paymentLabel: string;
  /** Motif d'annulation saisi par le client (présent si annulée avec motif) */
  cancellationReason?: string;
  items: OrderItem[];
  deliveryName: string;
  deliveryPrice: number;
  total: number;
}

export interface CustomerData {
  profile: CustomerProfile | null;
  orders: OrderRecord[];
}

/* ————————————————————————————————————————————————
 * Store localStorage + abonnés
 * ———————————————————————————————————————————————— */

const CUSTOMER_KEY = "zennshop:customer";

/** Snapshot vide partagé — référence stable exigée par useSyncExternalStore */
export const EMPTY_CUSTOMER_DATA: CustomerData = {
  profile: null,
  orders: [],
};

function loadFromStorage(): CustomerData {
  if (typeof window === "undefined") return EMPTY_CUSTOMER_DATA;
  try {
    const raw = window.localStorage.getItem(CUSTOMER_KEY);
    if (!raw) return EMPTY_CUSTOMER_DATA;
    const parsed = JSON.parse(raw) as Partial<CustomerData>;
    return {
      profile: parsed.profile ?? null,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    };
  } catch {
    return EMPTY_CUSTOMER_DATA;
  }
}

let current: CustomerData = loadFromStorage();
const listeners = new Set<() => void>();

function persistAndNotify() {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CUSTOMER_KEY, JSON.stringify(current));
    }
  } catch {
    // Stockage indisponible : reste en mémoire
  }
  for (const listener of listeners) listener();
}

/** Lecture synchrone du store client */
export function getCustomerData(): CustomerData {
  return current;
}

/** Abonnement aux changements — utilisé par le hook client */
export function subscribeCustomerStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Synchronisation multi-onglets (événement `storage`) — appelé par le hook */
export function handleCustomerStorageEvent(e: StorageEvent): void {
  if (e.key !== CUSTOMER_KEY) return;
  current = e.newValue
    ? (JSON.parse(e.newValue) as CustomerData)
    : EMPTY_CUSTOMER_DATA;
  for (const listener of listeners) listener();
}

/** Remet le store client à zéro (tests, « supprimer mon compte »…) */
export function resetCustomerStore(): void {
  current = { profile: null, orders: [] };
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CUSTOMER_KEY);
    }
  } catch {
    // ignore
  }
  for (const listener of listeners) listener();
}

/* ————————————————————————————————————————————————
 * Actions
 * ———————————————————————————————————————————————— */

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayFr(): string {
  return new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Crée (ou met à jour) le profil client local — « créer mon compte » */
export function saveCustomerProfile(profile: CustomerProfile): CustomerData {
  current = { ...current, profile };
  persistAndNotify();
  return current;
}

/** Ligne de commande : ids backend (création serveur) + infos d'affichage */
export interface PlaceOrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  name: string;
  variantLabel?: string;
  unitPrice: number;
}

export interface PlaceOrderInput {
  conversationId?: string;
  pointsToUse?: number;
  /** Id de la boutique (null → repli local, pas de création serveur) */
  boutiqueId: string | null;
  items: PlaceOrderItem[];
  deliveryName: string;
  deliveryPrice: number;
  customerName: string;
  customerPhone: string;
  address?: string;
  city?: string;
  paymentMethod: PaymentMethod;
}

/**
 * Historique RÉEL du client : GET /orders/boutique/:id/customer/:phone
 * (endpoint public). Les commandes du backend sont mappées en vue client.
 */
export async function fetchCustomerOrders(
  boutiqueId: string,
  phone: string,
): Promise<CustomerOrderView[]> {
  const api = await ordersApi.customer(boutiqueId, phone);
  return api
    .map(toCustomerOrder)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

/**
 * Annulation RÉELLE par le CLIENT : PATCH /orders/boutique/:id/:orderId/cancel.
 * Le téléphone est OBLIGATOIRE — seuls PENDING et PAID sont
 * annulables. `reason` OPTIONNEL : motif saisi par le client, visible par le
 * vendeur (et rappelé dans l'e-mail de confirmation).
 * Propage les erreurs métier (ApiError) : le composant affiche le message du backend.
 */
export async function cancelCustomerOrder(
  boutiqueId: string,
  orderId: string,
  phone: string,
  reason?: string,
): Promise<CustomerOrderView> {
  const api = await ordersApi.cancel(boutiqueId, orderId, phone, reason);
  return toCustomerOrder(api);
}

/**
 * Confirme le paiement d'une commande RÉELLE : POST /orders/boutique/:id/:orderId/pay.
 * Le statut PAID est la source de vérité du backend — le frontend n'affiche
 * que les états de la simulation, seule cette confirmation fait basculer la
 * commande en « Payée ». Un client connecté est identifié par son token ; un
 * visiteur fournit le téléphone de la commande (404 sinon).
 *
 * En repli local (backend injoignable / démo hors-ligne), la commande est
 * marquée payée localement — même libellé que le backend (orderStatusLabel).
 */
export async function payCustomerOrder(
  boutiqueId: string | null,
  orderId: string,
  input?: { phone?: string; transactionRef?: string },
): Promise<OrderRecord> {
  if (boutiqueId) {
    try {
      const api = await ordersApi.pay(boutiqueId, orderId, input);
      const record = toOrderRecord(api);
      current = {
        ...current,
        orders: current.orders.map((o) => (o.id === orderId ? record : o)),
      };
      persistAndNotify();
      return record;
    } catch (err) {
      // Erreur métier (ex. déjà payée, téléphone erroné) → on la PROPAGE :
      // le client doit la voir, pas recevoir une fausse confirmation.
      if (err instanceof ApiError) throw err;
      // Erreur réseau uniquement → repli local (démo hors-ligne)
      console.warn(
        "[customerStore] réseau indisponible, paiement en repli local :",
        err,
      );
    }
  }

  // Repli local (hors-ligne / boutique de démonstration) : la commande est
  // marquée PAID — le MÊME libellé que le backend, jamais un statut inventé.
  current = {
    ...current,
    orders: current.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: "paid" as const,
            statusLabel: orderStatusLabel("paid"),
            paymentRef: input?.transactionRef,
          }
        : o,
    ),
  };
  persistAndNotify();
  return current.orders.find((o) => o.id === orderId) ?? current.orders[0];
}

/**
 * Normalise un numéro de commande saisi par l'utilisateur :
 * « #ac-8901 » / « AC-8901 » / « ac 8901 » → « AC-8901 » (format stocké).
 */
export function normalizeOrderRef(input: string): string {
  return input.trim().replace(/^#/, "").replace(/\s+/g, "").toUpperCase();
}

/**
 * Suivi d'une commande RÉELLE par numéro :
 * GET /orders/boutique/:id/reference/:ref (endpoint public).
 * `phone` optionnel — fourni, le backend vérifie que la commande appartient
 * à ce numéro (404 sinon). Retourne `null` quand la commande n'existe pas
 * (404) ; les autres erreurs (réseau…) remontent pour le repli local.
 */
export async function fetchOrderByReference(
  boutiqueId: string,
  reference: string,
  phone?: string,
): Promise<CustomerOrderView | null> {
  try {
    const api = await ordersApi.byReference(
      boutiqueId,
      normalizeOrderRef(reference),
      phone,
    );
    return toCustomerOrder(api);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/**
 * Passe la commande : création RÉELLE côté backend (POST /orders/boutique/:id)
 * — le total est recalculé par le serveur et le stock décrémenté dans la même
 * transaction. La commande retournée est ajoutée à l'historique local du client.
 *
 * Si le backend est injoignable (ou sans boutique résolue), repli sur un
 * enregistrement local : la démo reste utilisable hors-ligne.
 */
export async function placeCustomerOrder(
  input: PlaceOrderInput
): Promise<OrderRecord> {
  if (input.boutiqueId) {
    try {
      const api = await ordersApi.create(input.boutiqueId, {
        items: input.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        deliveryName: input.deliveryName,
        deliveryPrice: input.deliveryPrice,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        address: input.address,
        city: input.city || "",
        country: "",
        conversationId: input.conversationId,
        pointsToUse: input.pointsToUse,
        paymentMethod: toApiPaymentMethod(input.paymentMethod),
      });
      const record = toOrderRecord(api);
      current = { ...current, orders: [record, ...current.orders] };
      persistAndNotify();
      return record;
    } catch (err) {
      // Erreur métier (ex. stock insuffisant) → on la PROPAGE : le client doit
      // la voir, pas recevoir une fausse commande locale.
      if (err instanceof ApiError) throw err;
      // Erreur réseau uniquement → repli local (démo hors-ligne)
      console.warn(
        "[customerStore] réseau indisponible, repli local :",
        err
      );
    }
  }

  // Repli local (hors-ligne / boutique de démonstration). La commande est
  // considérée PENDING par le vendeur : on affiche le MÊME statut honnête que
  // le backend (`En attente de confirmation du vendeur`) — jamais un statut
  // inventé ni une fausse confirmation de paiement.
  const order: OrderRecord = {
    id: uid("ord"),
    ref: `#AC-${Date.now().toString().slice(-6)}`,
    createdAt: todayFr(),
    items: input.items.map((i) => ({
      name: i.name,
      variantLabel: i.variantLabel,
      qty: i.quantity,
      unitPrice: i.unitPrice,
    })),
    deliveryName: input.deliveryName,
    deliveryPrice: input.deliveryPrice,
    total:
      input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) +
      input.deliveryPrice,
    status: "pending",
    // Même libellé que le backend (ORDER_STATUS_LABEL.pending) — jamais de
    // divergence entre la commande réelle et le repli hors-ligne.
    statusLabel: orderStatusLabel("pending"),
    paymentLabel: paymentMethodLabel(input.paymentMethod),
  };

  current = { ...current, orders: [order, ...current.orders] };
  persistAndNotify();
  return order;
}
