"use client";

import React, { useEffect, useState } from "react";
import { deliveryApi, DispatchModeType } from "@/lib/delivery-api";
import { formatPrice } from "@/constants/store";

interface ShipmentTrackerCardProps {
  orderId: string;
  viewerRole: "CLIENT" | "VENDEUR" | "LIVREUR" | "ADMIN";
  guestToken?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  AWAITING_PREPARATION: {
    label: "En préparation chez le vendeur",
    color: "bg-slate-100 text-slate-700",
  },
  READY_FOR_DISPATCH: {
    label: "Prêt à expédier",
    color: "bg-amber-100 text-amber-800",
  },
  AWAITING_ASSIGNMENT: {
    label: "Recherche / attribution d’un livreur",
    color: "bg-amber-100 text-amber-800",
  },
  ASSIGNED: {
    label: "Livreur attribué",
    color: "bg-blue-100 text-blue-800",
  },
  PICKED_UP: {
    label: "Colis récupéré chez le vendeur",
    color: "bg-indigo-100 text-indigo-800",
  },
  IN_TRANSIT: {
    label: "En transit (acheminement en cours)",
    color: "bg-indigo-100 text-indigo-800",
  },
  ARRIVED_AT_STATION: {
    label: "Arrivé à la gare de destination",
    color: "bg-purple-100 text-purple-800",
  },
  DELIVERY_PENDING_VERIFICATION: {
    label: "Remise déclarée — En attente du code client",
    color: "bg-amber-100 text-amber-900",
  },
  DELIVERED_VERIFIED: {
    label: "Remise vérifiée (Fenêtre conformité 24h)",
    color: "bg-emerald-100 text-emerald-800",
  },
  BUYER_ACCEPTED: {
    label: "Livraison & conformité validées ✓",
    color: "bg-emerald-100 text-emerald-900",
  },
  UNDER_REVIEW: {
    label: "Litige en cours d’examen",
    color: "bg-red-100 text-red-800",
  },
};

export function ShipmentTrackerCard({
  orderId,
  viewerRole,
  guestToken,
}: ShipmentTrackerCardProps) {
  const [shipment, setShipment] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Dispatch state (Seller)
  const [dispatchMode, setDispatchMode] = useState<DispatchModeType>("PUBLIC_POOL");
  const [personalName, setPersonalName] = useState("");
  const [personalPhone, setPersonalPhone] = useState("");
  const [agencies, setAgencies] = useState<any[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState("");
  const [selectedCourierId, setSelectedCourierId] = useState("");

  // Chat state (Client <-> Courier)
  const [chatState, setChatState] = useState<{
    canWrite: boolean;
    status: string;
    messages: any[];
  }>({ canWrite: false, status: "NOT_INITIALIZED", messages: [] });
  const [messageInput, setMessageInput] = useState("");

  // Dispute modal state
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeScope, setDisputeScope] = useState<
    "PRODUCT_ONLY" | "DELIVERY_ONLY" | "BOTH"
  >("PRODUCT_ONLY");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadShipment = async () => {
    try {
      setLoading(true);
      let data = await deliveryApi.getShipmentByOrder(orderId, guestToken);
      if (!data) {
        data = await deliveryApi.createShipmentFromOrder({ orderId });
      }
      setShipment(data);

      if (data?.id && (viewerRole === "CLIENT" || viewerRole === "LIVREUR")) {
        deliveryApi
          .getShipmentMessages(data.id)
          .then((res) => setChatState(res))
          .catch(() => {});
      }

      if (viewerRole === "VENDEUR") {
        deliveryApi
          .listVerifiedAgencies()
          .then((list) => {
            setAgencies(list || []);
            if (list?.length && !selectedAgencyId) {
              setSelectedAgencyId(list[0].id);
            }
          })
          .catch(() => {});
      }
    } catch {
      // Silencieux si la commande n'a pas encore d'expédition
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadShipment();
  }, [orderId]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDispatch = async () => {
    if (!shipment) return;
    try {
      setActionMessage(null);
      await deliveryApi.dispatchShipment(shipment.id, {
        dispatchMode,
        agencyId: dispatchMode === "PARTNER_AGENCY" ? selectedAgencyId : undefined,
        requestedCourierProfileId:
          dispatchMode === "PARTNER_AGENCY" && selectedCourierId
            ? selectedCourierId
            : undefined,
        personalCourierName:
          dispatchMode === "SELLER_PERSONAL_COURIER" ? personalName : undefined,
        personalCourierPhone:
          dispatchMode === "SELLER_PERSONAL_COURIER" ? personalPhone : undefined,
      });
      setActionMessage("Mission d’expédition publiée / attribuée avec succès.");
      await loadShipment();
    } catch (err: any) {
      setActionMessage(err?.message || "Erreur lors de l’attribution.");
    }
  };

  const handleAcceptConformity = async () => {
    if (!shipment) return;
    try {
      await deliveryApi.acceptConformity(shipment.id, guestToken);
      setActionMessage(
        "Conformité du produit confirmée ! Les fonds du vendeur sont désormais libérés."
      );
      await loadShipment();
    } catch (err: any) {
      setActionMessage(err?.message || "Impossible de confirmer la conformité.");
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment || !messageInput.trim()) return;
    try {
      await deliveryApi.sendShipmentMessage(shipment.id, messageInput.trim());
      setMessageInput("");
      const updatedChat = await deliveryApi.getShipmentMessages(shipment.id);
      setChatState(updatedChat);
    } catch (err: any) {
      setActionMessage(err?.message || "Envoi impossible.");
    }
  };

  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment) return;
    try {
      await deliveryApi.openDispute(shipment.id, {
        disputeScope,
        reason: disputeReason,
        description: disputeDescription,
        guestToken,
      });
      setShowDisputeForm(false);
      setActionMessage(
        disputeScope === "PRODUCT_ONLY"
          ? "Litige produit enregistré : seuls les fonds du vendeur sont gelés (le livreur n’est pas pénalisé)."
          : "Litige enregistré et transmis à l’équipe ZennShop."
      );
      await loadShipment();
    } catch (err: any) {
      setActionMessage(err?.message || "Impossible d’ouvrir le litige.");
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-midnight-950/10 bg-cream-50/40 p-3 text-xs text-midnight-950/55">
        Chargement du suivi d’expédition ZennShop…
      </div>
    );
  }

  if (!shipment) return null;

  const badge = STATUS_LABELS[shipment.status] ?? {
    label: shipment.status,
    color: "bg-slate-100 text-slate-700",
  };

  const selectedAgency = agencies.find((a) => a.id === selectedAgencyId);

  return (
    <div className="mt-3 rounded-2xl border border-midnight-950/10 bg-white p-4 shadow-sm space-y-4">
      {/* En-tête du Shipment */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-midnight-950/10 pb-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-midnight-950/45">
            Expédition #{shipment.reference}
          </span>
          <h4 className="text-sm font-bold text-midnight-950">
            Mode : {shipment.deliveryMode} • Tarif :{" "}
            {formatPrice(Number(shipment.quotedFeeFcfa || 0))}
          </h4>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.color}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Code de remise à usage unique (VISIBLE UNIQUEMENT PAR LE CLIENT ACHETEUR) */}
      {viewerRole === "CLIENT" && shipment.buyerDeliveryCode && (
        <div className="rounded-xl border border-gold-400/50 bg-gold-400/10 p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-midnight-950">
              Code secret de remise à usage unique (à donner uniquement à la réception du colis)
            </p>
            <p className="text-[11px] text-midnight-950/65">
              Ne communiquez jamais ce code par téléphone avant d’avoir le colis entre les mains.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="select-all rounded-lg bg-white px-3.5 py-1.5 font-mono text-base font-extrabold tracking-[0.22em] text-midnight-950 border border-gold-400">
              {shipment.buyerDeliveryCode}
            </span>
            <button
              type="button"
              onClick={() => handleCopyCode(shipment.buyerDeliveryCode)}
              className="rounded-lg bg-midnight-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-midnight-900 transition"
            >
              {copiedCode ? "Copié ✓" : "Copier"}
            </button>
          </div>
        </div>
      )}

      {/* Segments d'acheminement (Local ou Interurbain multi-segments) */}
      {shipment.legs && shipment.legs.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-midnight-950/50">
            Segments d’acheminement ({shipment.legs.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {shipment.legs.map((leg: any) => (
              <div
                key={leg.id}
                className="rounded-xl border border-midnight-950/10 bg-cream-50/50 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between font-semibold text-midnight-950">
                  <span>
                    Segment {leg.sequence} : {leg.legType}
                  </span>
                  <span className="text-[10px] font-mono uppercase text-gold-600">
                    {leg.status}
                  </span>
                </div>
                {leg.carrierCompany && (
                  <p className="mt-1 text-[11px] text-midnight-950/65">
                    Compagnie : {leg.carrierCompany}{" "}
                    {leg.carrierTicketRef ? `(Bordereau #${leg.carrierTicketRef})` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panneau d'attribution pour le VENDEUR */}
      {viewerRole === "VENDEUR" &&
        (shipment.status === "AWAITING_PREPARATION" ||
          shipment.status === "READY_FOR_DISPATCH") && (
          <div className="rounded-xl border border-midnight-950/15 bg-cream-50/70 p-3.5 space-y-3">
            <p className="text-xs font-bold text-midnight-950">
              Organiser l’expédition du colis
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDispatchMode("PUBLIC_POOL")}
                className={`rounded-lg border p-2.5 text-left text-xs ${
                  dispatchMode === "PUBLIC_POOL"
                    ? "border-gold-500 bg-gold-400/15 font-semibold"
                    : "border-midnight-950/10 bg-white"
                }`}
              >
                Mission publique ouverte
                <span className="block text-[10px] text-midnight-950/55">
                  Livreurs indépendants vérifiés KYC
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDispatchMode("PARTNER_AGENCY")}
                className={`rounded-lg border p-2.5 text-left text-xs ${
                  dispatchMode === "PARTNER_AGENCY"
                    ? "border-gold-500 bg-gold-400/15 font-semibold"
                    : "border-midnight-950/10 bg-white"
                }`}
              >
                Agence de livraison
                <span className="block text-[10px] text-midnight-950/55">
                  Agence partenaire validée (+ livreur souhaité)
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDispatchMode("SELLER_PERSONAL_COURIER")}
                className={`rounded-lg border p-2.5 text-left text-xs ${
                  dispatchMode === "SELLER_PERSONAL_COURIER"
                    ? "border-gold-500 bg-gold-400/15 font-semibold"
                    : "border-midnight-950/10 bg-white"
                }`}
              >
                Mon livreur personnel
                <span className="block text-[10px] text-midnight-950/55">
                  Désignation directe par vos soins
                </span>
              </button>
            </div>

            {dispatchMode === "SELLER_PERSONAL_COURIER" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nom du livreur"
                  value={personalName}
                  onChange={(e) => setPersonalName(e.target.value)}
                  className="rounded-lg border border-midnight-950/15 bg-white px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="Téléphone du livreur (+229...)"
                  value={personalPhone}
                  onChange={(e) => setPersonalPhone(e.target.value)}
                  className="rounded-lg border border-midnight-950/15 bg-white px-3 py-2 text-xs"
                />
              </div>
            )}

            {dispatchMode === "PARTNER_AGENCY" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={selectedAgencyId}
                  onChange={(e) => {
                    setSelectedAgencyId(e.target.value);
                    setSelectedCourierId("");
                  }}
                  className="rounded-lg border border-midnight-950/15 bg-white px-3 py-2 text-xs"
                >
                  <option value="">— Choisir une agence vérifiée —</option>
                  {agencies.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.commune})
                    </option>
                  ))}
                </select>
                <select
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="rounded-lg border border-midnight-950/15 bg-white px-3 py-2 text-xs"
                >
                  <option value="">
                    — Livreur souhaité (optionnel, soumis à validation de l’agence) —
                  </option>
                  {selectedAgency?.memberships?.map((m: any) => (
                    <option key={m.courierProfile.id} value={m.courierProfile.id}>
                      {m.courierProfile.displayName} ({m.courierProfile.vehicleType})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleDispatch}
              className="rounded-xl bg-midnight-950 px-4 py-2 text-xs font-semibold text-white hover:bg-midnight-900 transition"
            >
              Valider et lancer la mission de livraison
            </button>
          </div>
        )}

      {/* Messagerie temporaire Client <-> Livreur (avec révocation automatique dès DELIVERED_VERIFIED) */}
      {(viewerRole === "CLIENT" || viewerRole === "LIVREUR") &&
        chatState.status !== "NOT_INITIALIZED" && (
          <div className="rounded-xl border border-midnight-950/10 bg-cream-50/40 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-midnight-950">
                Messagerie directe Client ↔ Livreur
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  chatState.canWrite
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {chatState.canWrite
                  ? "Canal actif pendant la mission"
                  : "Canal verrouillé (Livraison terminée)"}
              </span>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-lg bg-white p-2.5 border border-midnight-950/5">
              {chatState.messages.length === 0 ? (
                <p className="text-[11px] text-midnight-950/45">
                  Aucun message échangé pour le moment.
                </p>
              ) : (
                chatState.messages.map((m: any) => (
                  <div key={m.id} className="text-xs">
                    <span className="font-bold text-midnight-950">
                      [{m.senderRole}] :{" "}
                    </span>
                    <span className="text-midnight-950/80">{m.content}</span>
                  </div>
                ))
              )}
            </div>

            {chatState.canWrite ? (
              <form onSubmit={handleSendChatMessage} className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Écrire au livreur / client…"
                  className="flex-1 rounded-lg border border-midnight-950/15 bg-white px-3 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-bold text-midnight-950"
                >
                  Envoyer
                </button>
              </form>
            ) : (
              <p className="text-[11px] text-midnight-950/55 italic">
                Conformément aux règles de confidentialité ZennShop, le livreur ne peut plus
                contacter le client une fois la remise confirmée.
              </p>
            )}
          </div>
        )}

      {/* Actions Client : Confirmer la conformité ou signaler un problème ciblé */}
      {viewerRole === "CLIENT" &&
        (shipment.status === "DELIVERED_VERIFIED" ||
          shipment.status === "DELIVERY_PENDING_VERIFICATION") && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {shipment.status === "DELIVERED_VERIFIED" && (
              <button
                type="button"
                onClick={handleAcceptConformity}
                className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
              >
                ✓ Confirmer la conformité de l’article reçu
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowDisputeForm((v) => !v)}
              className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
            >
              Signaler un problème (Produit ou Livraison)
            </button>
          </div>
        )}

      {showDisputeForm && (
        <form
          onSubmit={handleOpenDispute}
          className="rounded-xl border border-red-200 bg-red-50/50 p-3.5 space-y-2.5"
        >
          <p className="text-xs font-bold text-red-900">
            Ouverture d’un litige ciblé (Règle de séparation des responsabilités)
          </p>
          <select
            value={disputeScope}
            onChange={(e) => setDisputeScope(e.target.value as any)}
            className="w-full rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs"
          >
            <option value="PRODUCT_ONLY">
              Problème sur le produit uniquement (bloque le vendeur, ne pénalise pas le livreur)
            </option>
            <option value="DELIVERY_ONLY">
              Problème lié à la livraison uniquement (bloque la rémunération livraison)
            </option>
            <option value="BOTH">
              Problème portant à la fois sur le produit et la livraison
            </option>
          </select>
          <input
            type="text"
            required
            placeholder="Motif court (ex: Article non conforme, Colis endommagé...)"
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            className="w-full rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs"
          />
          <textarea
            required
            rows={2}
            placeholder="Décrivez précisément le problème constaté..."
            value={disputeDescription}
            onChange={(e) => setDisputeDescription(e.target.value)}
            className="w-full rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs"
          />
          <button
            type="submit"
            className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white"
          >
            Envoyer le signalement
          </button>
        </form>
      )}

      {actionMessage && (
        <p className="rounded-lg bg-midnight-950/5 px-3 py-2 text-xs font-medium text-midnight-950">
          {actionMessage}
        </p>
      )}
    </div>
  );
}

export default ShipmentTrackerCard;
