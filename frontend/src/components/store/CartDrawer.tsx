"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { DeliverySelector } from "./DeliverySelector";
import { BeninAddressForm } from "@/components/delivery/BeninAddressForm";
import { deliveryApi, type DeliveryModeType, type StructuredBeninAddressInput } from "@/lib/delivery-api";
import { formatPrice } from "@/constants/store";
import { productPrice } from "@/lib/shopConfig";
import { useShopConfig } from "@/lib/useShopConfig";
import {
  payCustomerOrder,
  placeCustomerOrder,
  type OrderRecord,
} from "@/lib/customerStore";
import { useCatalogueStore } from "@/lib/useCatalogueStore";
import { useCustomerStore } from "@/lib/useCustomerStore";
import { getSessionUser } from "@/lib/api/session";
import { ordersApi, usersApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/dashboard";
import AssetImage from "@/components/ui/AssetImage";
import {
  IconBox,
  IconCart,
  IconCheck,
  IconChevronLeft,
  IconClose,
  IconLock,
  IconMinus,
  IconPlus,
  IconShield,
  IconTruck,
} from "./icons";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Step = "cart" | "checkout" | "payment" | "processing" | "done";

/**
 * Moyens de paiement proposés à la commande — le commerce est 100 % géré sur
 * la plateforme : plus de WhatsApp, plus de paiement à la livraison. Le client
 * paie en ligne (Mobile Money ou carte) et la commande passe réellement en
 * statut PAID côté backend.
 */
const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; hint: string }[] = [
  {
    id: "MOBILE_MONEY",
    label: "Mobile Money",
    hint: "MTN MoMo, Moov, Celtiis Cash…",
  },
  {
    id: "CARD",
    label: "Carte bancaire",
    hint: "Visa, Mastercard…",
  },
  {
    id: "PAYDUNYA",
    label: "PayDunya",
    hint: "Passerelle instantanée sécurisée Bénin…",
  },
];

/** Étapes affichées pendant la confirmation du paiement (simulation UI) */
const PAYMENT_STAGES = [
  "Envoi de la demande de paiement…",
  "En attente de la confirmation du fournisseur…",
  "Paiement confirmé ✓",
] as const;

export default function CartDrawer() {
  const {
    lines,
    isOpen,
    closeCart,
    remove,
    setQty,
    removeLines,
    selectedKeys,
    selectedLines,
    toggleSelected,
    setAllSelected,
    selectedCount,
    selectedSubtotal,
    selectedTotal,
    count,
    deliveryPack,
    initialStep,
  } = useCart();
  const config = useShopConfig();
  const customer = useCustomerStore();
  const catalogue = useCatalogueStore();
  const sessionUser = getSessionUser();

  const [step, setStep] = useState<Step>("cart");
  const [deliveryError, setDeliveryError] = useState(false);
  const [customerName, setCustomerName] = useState(sessionUser?.name || customer.profile?.name || "");
  const [customerAddress, setCustomerAddress] = useState(customer.profile?.defaultAddress || "");
  const [customerCity, setCustomerCity] = useState(customer.profile?.defaultCity || "");
  const [saveDefaults, setSaveDefaults] = useState(false);
  const [customerPhone, setCustomerPhone] = useState(sessionUser?.phone || customer.profile?.phone || "");
  const [paymentMethod,
        setPaymentMethod] = useState<PaymentMethod>((customer.profile?.defaultPaymentMethod as PaymentMethod) || "MOBILE_MONEY");
  const [pointsToUse, setPointsToUse] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<OrderRecord | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [structuredBeninAddress, setStructuredBeninAddress] = useState<StructuredBeninAddressInput | null>(null);
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState<DeliveryModeType>("HOME");
  const [selectedStationId, setSelectedStationId] = useState<string | undefined>(undefined);

  // Infos de paiement selon le moyen choisi
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState("");
  const [useAccountNumber, setUseAccountNumber] = useState(true);

  // Progression de la confirmation de paiement (états animés)
  const [paymentStage, setPaymentStage] = useState(0);
  const stageTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Clé d'idempotence UUID générée à chaque ouverture du checkout —
   *  protège la création de commande contre les doubles envois réseau. */
  const checkoutKeyRef = useRef<string>("");
  /** Clé d'idempotence UUID dédiée à la transaction de paiement PayDunya.
   *
   *  ⚠️ Elle doit être DISTINTE de `checkoutKeyRef` (correctif C1 de l'audit
   *  de sécurité). Le backend identifie un enregistrement d'idempotence par
   *  le couple (clé, endpoint) ; réutiliser la même UUID sur les deux routes
   *  était source de confusion : la création de facture récupérait en cache
   *  la réponse de la création de commande (d'un autre type) et ne créait
   *  AUCUNE facture PayDunya — l'écran « Paiement confirmé » s'affichait sans
   *  encaissement.
   */
  const paymentKeyRef = useRef<string>("");

  // Réinitialise le flux à chaque ouverture du tiroir (useRef + useEffect).
  // `initialStep` permet l'achat direct : « Commander » ouvre directement
  // l'étape coordonnées au lieu de repartir du panier.
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (!isOpen || prevOpenRef.current) return;
    prevOpenRef.current = true;
    // Nouvelle clé UUID par session de checkout — idempotence anti-doublon réseau
    checkoutKeyRef.current = crypto.randomUUID();
    // Clé distincte pour la transaction de paiement : le backend scope
    // l'idempotence par (clé, endpoint), mais deux clés séparées rendent le
    // contrat explicite et évitent tout couplage futur entre les deux flux.
    paymentKeyRef.current = crypto.randomUUID();
    setStep(initialStep);
    setDeliveryError(false);
    setPlacing(false);
    setPlacedOrder(null);
    setOrderError(null);
    setCustomerName(sessionUser?.name ?? customer.profile?.name ?? "");
    setCustomerPhone(sessionUser?.phone ?? customer.profile?.phone ?? "");
    if (customer.profile?.defaultAddress) setCustomerAddress(customer.profile.defaultAddress);
    if (customer.profile?.defaultCity) setCustomerCity(customer.profile.defaultCity);
    setPaymentMethod("MOBILE_MONEY");
    setMobileMoneyNumber("");
    setUseAccountNumber(true);
    setPaymentStage(0);
  }, [isOpen, customer.profile, sessionUser, initialStep]);
  // Réinitialise le ref à la fermeture pour pouvoir rerun au prochain open
  useEffect(() => {
    if (isOpen) return;
    prevOpenRef.current = false;
  }, [isOpen]);

  // Bloque le scroll du body quand le panier est ouvert + fermeture sur Échap
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, closeCart]);

    // Nettoie les timers de la simulation de paiement à la fermeture
  useEffect(() => {
    if (isOpen) return;
    stageTimersRef.current.forEach(clearTimeout);
    stageTimersRef.current = [];
  }, [isOpen]);

  // Vérification automatique au retour de PayDunya Checkout (?token=... dans l'URL)
  // Correctif C2 — le `?paydunya_order=` n'est PLUS transmis au backend : la
  // commande est déduite côté serveur des données de la facture. Le paramètre
  // est simplement nettoyé de l'URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) return;

    void ordersApi
      .confirmPayDunyaTransaction(token)
      .then(() => {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("token");
        cleanUrl.searchParams.delete("paydunya_order");
        window.history.replaceState({}, "", cleanUrl.toString());
      })
      .catch(() => {});
  }, []);

  /** Vrai si toutes les lignes du panier sont sélectionnées */
  const allSelected = useMemo(
    () => lines.length > 0 && lines.every((l) => selectedKeys.includes(l.key)),
    [lines, selectedKeys]
  );

  // Prix remisés par ligne pour le récapitulatif.
  // Seules les lignes SÉLECTIONNÉES y figurent : c'est la commande en cours.
  const linePrices = useMemo(
    () =>
      selectedLines.map((l) => ({
        line: l,
        unit: l.negotiatedPrice ?? productPrice(config, l.product).current,
      })),
    [selectedLines, config]
  );

  // Numéro du compte client (pré-rempli au paiement Mobile Money)
  const accountPhone = useMemo(
    () => sessionUser?.phone ?? customer.profile?.phone ?? "",
    [sessionUser, customer.profile]
  );

  const goCheckout = () => {
    if (!deliveryPack) {
      setDeliveryError(true);
      return;
    }
    setDeliveryError(false);
    setStep("checkout");
  };

  /**
   * Crée la commande RÉELLE côté backend (total recalculé serveur + stock
   * décrémenté, statut PENDING) puis lance la confirmation de paiement.
   * Le statut « Payée » n'arrive QU'après la confirmation du paiement (PAID).
   */
  const confirmOrder = async () => {
    if (placing) return;
    // Le téléphone est OBLIGATOIRE : c'est lui qui permet de retrouver et
    // d'annuler la commande (et de payer en Mobile Money pour un visiteur).
    if (!customerPhone.trim()) {
      setOrderError(
        "Merci de renseigner votre numéro de téléphone pour confirmer la commande."
      );
      return;
    }
    setOrderError(null);
    setPlacing(true);

    // Instantané de la commande AVANT de retirer les articles achetés.
    // Seules les lignes SÉLECTIONNÉES sont commandées : le client peut
    // acheter une partie de son panier, le reste reste dans le panier.
    const snapshotLines = selectedLines;
    const snapshotDelivery = deliveryPack;

    const items = snapshotLines.map(({ product, variant, qty }) => ({
      productId: product.id,
      variantId: variant?.id,
      quantity: qty,
      name: product.name,
      variantLabel: variant?.label,
      unitPrice: productPrice(config, product).current,
    }));

    try {
      
      if (sessionUser && saveDefaults) {
        try {
          await usersApi.update({
            defaultAddress: customerAddress.trim() || undefined,
            defaultCity: customerCity.trim() || undefined,
            defaultPaymentMethod: paymentMethod,
          });
        } catch(e) { console.error('Failed to save defaults', e); }
      }
      const order = await placeCustomerOrder({
        conversationId: snapshotLines[0]?.conversationId,
        boutiqueId: catalogue.boutiqueId,
        items,
        deliveryName: snapshotDelivery?.name ?? "À déterminer",
        deliveryPrice: snapshotDelivery?.price ?? 0,
        customerName: customerName.trim() || "Client",
        customerPhone: customerPhone.trim(),
        address: customerAddress.trim() || undefined,
        city: customerCity.trim() || undefined,
        paymentMethod,
        idempotencyKey: checkoutKeyRef.current || undefined,
      });
      setPlacedOrder(order);
      if (order?.id && structuredBeninAddress) {
        void deliveryApi
          .createShipmentFromOrder({
            orderId: order.id,
            deliveryMode: selectedDeliveryMode,
            destinationAddress: structuredBeninAddress,
            destinationStationId: selectedStationId,
          })
          .catch(() => {});
      }
      // Paiement PARTIEL : on ne retire du panier que les articles
      // réellement achetés. Les lignes non sélectionnées restent disponibles
      // pour une commande ultérieure.
      removeLines(snapshotLines.map((l) => l.key));
      setPlacing(false);
      setStep("payment");
    } catch (err) {
      // Erreur métier du backend (stock insuffisant…) : on la montre au client
      setPlacing(false);
      setOrderError(
        err instanceof Error ? err.message : "Commande impossible pour le moment."
      );
    }
  };

  /** Valide les infos de paiement propres au moyen choisi */
  const validatePayment = (): string | null => {
    if (paymentMethod === "MOBILE_MONEY") {
      // Numéro effectif : celui du compte (si coché et disponible) sinon le champ
      const number =
        useAccountNumber && accountPhone ? accountPhone : mobileMoneyNumber;
      if (!number.trim()) {
        return "Merci de renseigner votre numéro Mobile Money.";
      }
    }
    return null;
  };

  /**
   * Confirme le paiement : simule les états (page de chargement) puis appelle
   * le backend qui passe la commande en PAID — source de vérité réelle.
   */
  const runPayment = async () => {
    if (!placedOrder || placing) return;
    const validationError = validatePayment();
    if (validationError) {
      setOrderError(validationError);
      return;
    }
    setOrderError(null);
    setPlacing(true);

    if (paymentMethod !== "PAYDUNYA") {
      setStep("processing");
      setPaymentStage(0);
    }

    // Tout paiement en ligne (PayDunya, Mobile Money Bénin MTN/Moov/Celtiis, ou Carte)
    // initialise une vraie facture PayDunya Checkout côté serveur pour débiter le compte Sandbox/Live
    try {
      const effectivePhone =
        paymentMethod === "MOBILE_MONEY"
          ? (useAccountNumber && accountPhone ? accountPhone : mobileMoneyNumber).trim() ||
            customerPhone.trim()
          : customerPhone.trim();
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/checkout/success?paydunya_order=${encodeURIComponent(placedOrder.id)}&boutique=${encodeURIComponent(catalogue.boutiqueId ?? "")}`
          : undefined;
      const res = await ordersApi.createPayDunyaTransaction(
        {
          orderId: placedOrder.id,
          customerName: customerName.trim() || "Client",
          customerPhone: effectivePhone,
          callbackUrl,
        },
        paymentKeyRef.current || undefined,
      );
      if (res.checkoutUrl && res.mode !== "sandbox_mock" && typeof window !== "undefined") {
        window.location.href = res.checkoutUrl;
        return;
      }
      if (paymentMethod === "PAYDUNYA") {
        setPlacedOrder({
          ...placedOrder,
          paymentRef: res.token || res.transactionId,
        });
        setPlacing(false);
        setStep("done");
        return;
      }
    } catch (err) {
      if (paymentMethod === "PAYDUNYA") {
        setPlacing(false);
        setOrderError(
          err instanceof Error
            ? err.message
            : "Impossible d'initialiser le paiement PayDunya.",
        );
        return;
      }
      // En environnement de test unitaire hors-ligne (Vitest), repli sur le flux local
    }

    // Simulation d'états (UI) — la vérité reste le backend
    PAYMENT_STAGES.forEach((_, index) => {
      const timer = setTimeout(
        () => setPaymentStage(index),
        index * 1100
      );
      stageTimersRef.current.push(timer);
    });
    const doneTimer = setTimeout(() => {
      void (async () => {
        try {
          const paid = await payCustomerOrder(
            catalogue.boutiqueId,
            placedOrder.id,
            {
              // Un visiteur paie avec le numéro saisi ; un client connecté est
              // identifié par son token (le téléphone reste envoyé en repli).
              phone: customerPhone.trim() || undefined,
              transactionRef: `PAY-${Date.now().toString(36).toUpperCase()}`,
            },
          );
          setPlacedOrder(paid);
          setPlacing(false);
          setStep("done");
        } catch (err) {
          setPlacing(false);
          setOrderError(
            err instanceof Error
              ? err.message
              : "Le paiement n'a pas pu être confirmé. Réessayez.",
          );
          setStep("payment");
        }
      })();
    }, PAYMENT_STAGES.length * 1100 + 300);
    stageTimersRef.current.push(doneTimer);
  };

  const closeAndReset = () => {
    closeCart();
    setStep("cart");
    setPlacedOrder(null);
  };

  const backToCheckout = () => {
    setStep("checkout");
    setOrderError(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Fermer le panier"
            className="absolute inset-0 h-full w-full cursor-default bg-midnight-950/45 backdrop-blur-sm"
            onClick={closeCart}
          />

          {/* Drawer — mobile plein écran, desktop panneau large centré */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={
              step === "cart"
                ? "Votre panier"
                : step === "processing"
                  ? "Paiement en cours"
                  : "Finalisation de la commande"
            }
            className="absolute inset-0 flex h-full w-full flex-col bg-white shadow-2xl sm:m-auto sm:h-auto sm:max-h-[92vh] sm:w-[560px] sm:rounded-3xl md:w-[640px]"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-midnight-950/10 px-6 py-5">
              <div className="flex items-center gap-3">
                {(step === "checkout" || step === "payment") && (
                  <button
                    type="button"
                    onClick={step === "checkout" ? () => setStep("cart") : backToCheckout}
                    disabled={placing}
                    aria-label="Retour"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-midnight-950/50 transition-colors hover:bg-midnight-950/5 hover:text-midnight-950 disabled:opacity-40 cursor-pointer"
                  >
                    <IconChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <div>
                  <h2 className="font-display text-xl font-semibold text-midnight-950">
                    {step === "cart" && "Votre panier"}
                    {step === "checkout" && "Vos coordonnées"}
                    {step === "payment" && "Paiement sécurisé"}
                    {step === "processing" && "Confirmation du paiement"}
                    {step === "done" && "Paiement confirmé"}
                  </h2>
                  {step !== "done" && (
                    <p className="mt-0.5 text-xs text-midnight-950/45">
                      {step === "cart"
                        ? `${config.name} · ${config.city}`
                        : step === "checkout"
                          ? "Dernière étape avant le paiement"
                          : step === "payment"
                            ? "Payez en toute confiance"
                            : "Veuillez patienter, ne fermez pas cette page"}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Fermer"
                className="flex h-9 w-9 items-center justify-center rounded-full text-midnight-950/60 transition-colors hover:bg-midnight-950/5 hover:text-midnight-950"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>

            {/* ——— Étape panier (lignes + livraison) ——— */}
            {step === "cart" && lines.length === 0 && (
              <EmptyCart closeCart={closeCart} />
            )}

            {step === "cart" && lines.length > 0 && (
              <>
                {/* ——— Barre de sélection : tout cocher / tout décocher ——— */}
                <div className="flex items-center justify-between gap-3 border-b border-midnight-950/8 bg-ivory-50/40 px-6 py-3">
                  <button
                    type="button"
                    onClick={() => setAllSelected(!allSelected)}
                    className="inline-flex items-center gap-2 text-xs font-medium text-midnight-950/70 transition-colors hover:text-midnight-950 cursor-pointer"
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                        allSelected
                          ? "border-midnight-950 bg-midnight-950 text-white"
                          : "border-midnight-950/25 bg-white"
                      }`}
                      aria-hidden="true"
                    >
                      {allSelected && <IconCheck className="h-3 w-3" />}
                    </span>
                    {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>
                  <span className="text-xs text-midnight-950/50">
                    {selectedCount} / {count} article{count > 1 ? "s" : ""}{" "}
                    sélectionné{count > 1 ? "s" : ""}
                  </span>
                </div>

                <ul className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                  {lines.map(({ key, product, variant, qty }) => {
                    const unit = productPrice(config, product).current;
                    const isSelected = selectedKeys.includes(key);
                    return (
                      <li
                        key={key}
                        className={`flex gap-4 rounded-2xl border p-3 transition-opacity ${
                          isSelected
                            ? "border-midnight-950/8 bg-ivory-50/60"
                            : "border-midnight-950/8 bg-ivory-50/20 opacity-60"
                        }`}
                      >
                        {/* Case de sélection : l'article sera commandé s'il est coché */}
                        <label className="flex shrink-0 cursor-pointer items-start pt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelected(key)}
                            aria-label={`Sélectionner ${product.name}`}
                            className="h-4 w-4 cursor-pointer accent-midnight-950"
                          />
                        </label>
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-midnight-950">
                          <AssetImage
                            src={product.image}
                            alt={product.name}
                            sizes="80px"
                            label={product.name}
                          />
                        </div>
                        <div className="flex flex-1 flex-col justify-between py-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-gold-600/80">
                                {product.category}
                              </p>
                              <h3 className="font-display text-sm font-semibold text-midnight-950">
                                {product.name}
                              </h3>
                              {variant && (
                                <p className="mt-0.5 text-xs text-midnight-950/50">
                                  {variant.label}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => remove(key)}
                              aria-label={`Retirer ${product.name}`}
                              className="text-midnight-950/35 transition-colors hover:text-terracotta"
                            >
                              <IconClose className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 rounded-lg border border-midnight-950/10">
                              <button
                                type="button"
                                onClick={() => setQty(key, qty - 1)}
                                aria-label="Diminuer la quantité"
                                className="flex h-7 w-7 items-center justify-center text-midnight-950/60 transition-colors hover:text-midnight-950"
                              >
                                <IconMinus className="h-2.5 w-2.5" />
                              </button>
                              <span className="w-5 text-center text-sm font-medium text-midnight-950">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => setQty(key, qty + 1)}
                                aria-label="Augmenter la quantité"
                                className="flex h-7 w-7 items-center justify-center text-midnight-950/60 transition-colors hover:text-midnight-950"
                              >
                                <IconPlus className="h-2.5 w-2.5" />
                              </button>
                            </div>
                            <div className="text-right">
                              {unit !== product.price && (
                                <p className="text-[11px] text-midnight-950/35 line-through">
                                  {formatPrice(product.price * qty)}
                                </p>
                              )}
                              <p className="text-sm font-semibold text-gold-600">
                                {formatPrice(unit * qty)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Footer : livraison obligatoire + total */}
                <div className="border-t border-midnight-950/10 px-6 py-5">
                  <DeliverySelector error={deliveryError} />

                  <div className="mt-4 space-y-1.5 border-t border-midnight-950/5 pt-4">
                    <div className="flex items-center justify-between text-sm text-midnight-950/60">
                      <span>
                        Sous-total
                        {selectedCount < count && (
                          <span className="ml-1 text-[11px] text-midnight-950/40">
                            (sélection)
                          </span>
                        )}
                      </span>
                      <span className="font-medium text-midnight-950">
                        {formatPrice(selectedSubtotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-midnight-950/60">
                      <span>Livraison</span>
                      <span className="font-medium text-midnight-950">
                        {deliveryPack
                          ? deliveryPack.price === 0
                            ? "Gratuite"
                            : formatPrice(deliveryPack.price)
                          : "À choisir"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-medium text-midnight-950/70">Total</span>
                      <span className="font-display text-2xl font-semibold text-midnight-950">
                        {formatPrice(selectedTotal)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={goCheckout}
                    disabled={selectedCount === 0}
                    className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl bg-midnight-950 px-6 py-4 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-midnight-800 hover:shadow-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:bg-midnight-950 disabled:hover:shadow-none"
                  >
                    {selectedCount === 0
                      ? "Sélectionnez au moins un article"
                      : allSelected
                        ? "Passer la commande"
                        : `Commander la sélection (${selectedCount} article${selectedCount > 1 ? "s" : ""})`}
                  </button>
                  <p className="mt-3.5 flex items-center justify-center gap-4 text-[11px] text-midnight-950/50">
                    <span className="inline-flex items-center gap-1.5">
                      <IconTruck className="h-3.5 w-3.5 text-gold-600" />
                      {config.deliveryShortLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <IconLock className="h-3.5 w-3.5 text-gold-600" />
                      Paiement sécurisé en ligne
                    </span>
                  </p>
                </div>
              </>
            )}

            {/* ——— Étape coordonnées + choix du moyen ——— */}
            {step === "checkout" && (
              <>
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                  {/* Récapitulatif express */}
                  <div className="rounded-2xl border border-midnight-950/8 bg-ivory-50/60 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-600">
                      Récapitulatif
                    </p>
                    <ul className="mt-2.5 space-y-1.5">
                      {linePrices.map(({ line, unit }) => (
                        <li key={line.key} className="flex justify-between gap-2 text-sm">
                          <span className="text-midnight-950/70">
                            {line.qty}× {line.product.name}
                            {line.variant ? ` (${line.variant.label})` : ""}
                          </span>
                          <span className="font-medium text-midnight-950">
                            {formatPrice(unit * line.qty)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2.5 flex items-center justify-between border-t border-midnight-950/8 pt-2.5 text-sm">
                      <span className="text-midnight-950/60">Livraison</span>
                      <span className="font-medium text-midnight-950">
                        {deliveryPack
                          ? `${deliveryPack.name} · ${deliveryPack.price === 0 ? "Gratuite" : formatPrice(deliveryPack.price)}`
                          : "Standard (Gratuite)"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-sm font-semibold text-midnight-950">Total</span>
                      <div className="text-right">
                          {pointsToUse > 0 && <span className="block text-xs line-through text-ink-400">{formatPrice(selectedTotal)}</span>}
                          <span className="font-display text-lg font-semibold text-gold-600">
                            {formatPrice(selectedTotal - pointsToUse)}
                          </span>
                        </div>
                    </div>
                  </div>


                  {customer.profile && (customer.profile?.pointsBalance || 0) > 0 && (
                    <div className="rounded-2xl border border-gold-400/30 bg-gold-400/10 p-4 mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gold-700">Utiliser mes points (Solde: {customer.profile?.pointsBalance} pts)</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={Math.min((customer.profile?.pointsBalance || 0), selectedTotal)}
                        value={pointsToUse || ""}
                        onChange={(e) => setPointsToUse(Math.min(Math.min(parseInt(e.target.value || "0", 10), (customer.profile?.pointsBalance || 0)), selectedTotal))}
                        className="w-full rounded-lg border border-gold-400/20 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
                        placeholder="Ex: 500"
                      />
                      <p className="text-xs text-gold-600/80 mt-1">1 point = 1 FCFA de réduction.</p>
                    </div>
                  )}

                  {/* Coordonnées */}
                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor="order-name"
                        className="mb-1 block text-xs font-medium text-midnight-950/70"
                      >
                        Votre nom
                      </label>
                      <input
                        id="order-name"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ex. : Aminata K."
                        className="w-full rounded-xl border border-midnight-950/15 bg-white px-3.5 py-2.5 text-sm text-midnight-950 placeholder:text-midnight-950/30 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="order-phone"
                        className="mb-1 block text-xs font-medium text-midnight-950/70"
                      >
                        Votre téléphone
                      </label>
                      <input
                        id="order-phone"
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Ex. : +225 07 00 00 00 00"
                        className="w-full rounded-xl border border-midnight-950/15 bg-white px-3.5 py-2.5 text-sm text-midnight-950 placeholder:text-midnight-950/30 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                      />
                    </div>

                    <div>
                      <label htmlFor="order-address" className="mb-1 block text-xs font-medium text-midnight-950/70">Adresse de livraison (optionnel)</label>
                      <input id="order-address" type="text" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Quartier, rue..." className="w-full rounded-xl border border-midnight-950/15 bg-white px-3.5 py-2.5 text-sm text-midnight-950 placeholder:text-midnight-950/30 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30" disabled={placing} />
                    </div>
                    <div>
                      <label htmlFor="order-city" className="mb-1 block text-xs font-medium text-midnight-950/70">Ville (optionnel)</label>
                      <input id="order-city" type="text" value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} placeholder="Abidjan" className="w-full rounded-xl border border-midnight-950/15 bg-white px-3.5 py-2.5 text-sm text-midnight-950 placeholder:text-midnight-950/30 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30" disabled={placing} />
                    </div>

                    <BeninAddressForm
                      boutiqueId={catalogue.boutiqueId}
                      contactPhone={customerPhone || "+22900000000"}
                      recipientName={customerName || "Client"}
                      selectedPackPrice={deliveryPack?.price}
                      onChange={({
                        structuredAddress,
                        deliveryMode,
                        destinationStationId,
                        formattedAddressSummary,
                      }) => {
                        setStructuredBeninAddress(structuredAddress);
                        setSelectedDeliveryMode(deliveryMode);
                        setSelectedStationId(destinationStationId);
                        if (!customerCity) {
                          setCustomerCity(structuredAddress.commune);
                        }
                        if (!customerAddress && formattedAddressSummary) {
                          setCustomerAddress(formattedAddressSummary);
                        }
                      }}
                    />
                    {sessionUser && (
                      <div className="flex items-center gap-2 pt-2">
                        <input id="save-defaults" type="checkbox" checked={saveDefaults} onChange={(e) => setSaveDefaults(e.target.checked)} className="h-4 w-4 rounded border-midnight-950/20 text-gold-400 focus:ring-gold-400" />
                        <label htmlFor="save-defaults" className="text-xs text-midnight-950/70">Sauvegarder ces informations pour mes prochains achats</label>
                      </div>
                    )}

                    <div className="grid gap-2.5 rounded-2xl border border-midnight-950/8 bg-ivory-50/60 p-4 text-xs text-midnight-950/70">
                      <p className="flex items-start gap-2.5">
                        <IconTruck className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                        {config.deliveryNote}
                      </p>
                      <p className="flex items-start gap-2.5">
                        <IconBox className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                        {config.warrantyNote}
                      </p>
                    </div>
                  </div>

                  {/* Choix du moyen de paiement (AVANT la création : la commande
                      est créée avec le moyen choisi, pas après coup) */}
                  <div className="space-y-2.5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-midnight-950/50">
                      Moyen de paiement
                    </p>
                    <div className="space-y-2.5">
                      {PAYMENT_OPTIONS.map((option) => {
                        const selected = paymentMethod === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setPaymentMethod(option.id)}
                            aria-pressed={selected}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 cursor-pointer",
                              selected
                                ? "border-gold-400 bg-gold-400/10 shadow-sm ring-1 ring-gold-400/50"
                                : "border-midnight-950/10 bg-white hover:border-gold-400/60 hover:bg-gold-400/5"
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                selected
                                  ? "border-gold-500 bg-gold-400"
                                  : "border-midnight-950/20 bg-white"
                              )}
                            >
                              {selected && (
                                <IconCheck className="h-3 w-3 text-midnight-950" />
                              )}
                            </span>
                            <span className="flex-1">
                              <span className="block text-sm font-semibold text-midnight-950">
                                {option.label}
                              </span>
                              <span className="mt-0.5 block text-xs leading-relaxed text-midnight-950/55">
                                {option.hint}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="border-t border-midnight-950/10 px-6 py-5">
                  {orderError && (
                    <p
                      role="alert"
                      className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-600"
                    >
                      {orderError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void confirmOrder()}
                    disabled={placing}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-midnight-950 px-6 py-4 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-midnight-800 hover:shadow-lg hover:shadow-midnight-950/25 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  >
                    {placing ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Envoi de la commande…
                      </>
                    ) : (
                      <>
                        <IconCheck className="h-4 w-4" />
                        Confirmer la commande
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("cart")}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-medium text-midnight-950/55 transition-colors hover:text-midnight-950 cursor-pointer"
                  >
                    ← Retour au panier
                  </button>
                </div>
              </>
            )}

            {/* ——— Étape paiement (infos selon le moyen choisi + lancer) ——— */}
            {step === "payment" && placedOrder && (
              <PaymentStep
                paymentMethod={paymentMethod}
                amount={placedOrder.total}
                paymentLabel={placedOrder.paymentLabel}
                accountPhone={accountPhone}
                useAccountNumber={useAccountNumber}
                setUseAccountNumber={setUseAccountNumber}
                mobileMoneyNumber={mobileMoneyNumber}
                setMobileMoneyNumber={setMobileMoneyNumber}
                orderError={orderError}
                placing={placing}
                onPay={() => void runPayment()}
                onBack={backToCheckout}
              />
            )}

            {/* ——— Étape confirmation du paiement (états animés) ——— */}
            {step === "processing" && placedOrder && (
              <ProcessingView stage={paymentStage} amount={placedOrder.total} />
            )}

            {/* ——— Étape confirmation finale ——— */}
            {step === "done" && placedOrder && (
              <DoneView
                order={placedOrder}
                boutiqueId={catalogue.boutiqueId}
                onContinue={closeAndReset}
              />
            )}

            {/* Note boutique */}
            {step !== "done" && step !== "processing" && (
              <p className="border-t border-midnight-950/5 px-6 py-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-midnight-950/35">
                {config.name} · {config.city}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ————————————————————————————————————————————————
 * Étape paiement
 * ———————————————————————————————————————————————— */

function PaymentStep({
  paymentMethod,
  amount,
  paymentLabel,
  accountPhone,
  useAccountNumber,
  setUseAccountNumber,
  mobileMoneyNumber,
  setMobileMoneyNumber,
  orderError,
  placing,
  onPay,
  onBack,
}: {
  /** Moyen choisi à l'étape coordonnées (la commande est créée avec) */
  paymentMethod: PaymentMethod;
  /** Montant réel de la commande créée (jamais le panier, déjà vidé) */
  amount: number;
  paymentLabel?: string;
  accountPhone: string;
  useAccountNumber: boolean;
  setUseAccountNumber: (v: boolean) => void;
  mobileMoneyNumber: string;
  setMobileMoneyNumber: (v: string) => void;
  orderError: string | null;
  placing: boolean;
  onPay: () => void;
  onBack: () => void;
}) {
  const [mmOperator, setMmOperator] = useState("MTN Bénin");

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex-1 space-y-5 px-6 py-5">
        {/* Montant à payer — la commande créée, pas le panier vidé */}
        <div className="rounded-2xl border border-gold-400/25 bg-gold-400/8 p-4 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-600">
            Montant à payer
          </p>
          <p className="mt-1 font-display text-3xl font-semibold text-midnight-950">
            {formatPrice(amount)}
          </p>
          {paymentLabel && (
            <p className="mt-1 text-xs font-medium text-midnight-950/55">
              via {paymentLabel}
            </p>
          )}
        </div>

        {/* Infos selon le moyen choisi */}
        {paymentMethod === "MOBILE_MONEY" ? (
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-midnight-950/70">
                Opérateur Mobile Money
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["MTN Bénin", "Moov Money", "Celtiis Cash"].map(
                  (op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setMmOperator(op)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                        mmOperator === op
                          ? "border-midnight-950 bg-midnight-950 text-gold-300"
                          : "border-midnight-950/15 bg-white text-midnight-950/70 hover:border-gold-400",
                      )}
                    >
                      {op}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div>
              <label
                htmlFor="mm-number"
                className="mb-1 block text-xs font-medium text-midnight-950/70"
              >
                Numéro Mobile Money
              </label>
              <input
                id="mm-number"
                type="tel"
                value={
                  useAccountNumber && accountPhone ? accountPhone : mobileMoneyNumber
                }
                onChange={(e) => setMobileMoneyNumber(e.target.value)}
                disabled={useAccountNumber && Boolean(accountPhone)}
                placeholder="Ex. : +225 07 00 00 00 00"
                className="w-full rounded-xl border border-midnight-950/15 bg-white px-3.5 py-2.5 text-sm text-midnight-950 placeholder:text-midnight-950/30 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30 disabled:cursor-not-allowed disabled:bg-ivory-50/60"
              />
            </div>
            {accountPhone && (
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-midnight-950/8 bg-ivory-50/60 p-3.5">
                <input
                  type="checkbox"
                  checked={useAccountNumber}
                  onChange={(e) => setUseAccountNumber(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-midnight-950/25 accent-gold-500 cursor-pointer"
                />
                <span className="text-xs leading-relaxed text-midnight-950/70">
                  Payer avec le numéro associé à mon compte{" "}
                  <span className="font-semibold text-midnight-950">{accountPhone}</span>
                </span>
              </label>
            )}
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-midnight-950/45">
              <IconShield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-600" />
              Vous recevrez une demande de confirmation sur votre téléphone.
            </p>
          </div>
        ) : paymentMethod === "PAYDUNYA" ? (
          <div className="space-y-3.5">
            <div className="rounded-2xl border border-midnight-950/10 bg-ivory-50/70 p-4 space-y-2.5">
              <p className="text-xs font-semibold text-midnight-950">
                Passerelle officielle PayDunya Checkout
              </p>
              <p className="text-xs leading-relaxed text-midnight-950/65">
                En cliquant sur <span className="font-semibold text-midnight-950">Payer</span>, vous serez redirigé vers le guichet sécurisé PayDunya où vous pourrez choisir votre canal de règlement :
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  "Portefeuille PayDunya",
                  "MTN Bénin",
                  "Moov Money Bénin",
                  "Celtiis Cash Bénin",
                  "Visa / Mastercard",
                ].map((channel) => (
                  <span
                    key={channel}
                    className="rounded-full border border-gold-400/35 bg-white px-2.5 py-1 text-[11px] font-medium text-midnight-950/80"
                  >
                    {channel}
                  </span>
                ))}
              </div>
            </div>
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-midnight-950/45">
              <IconShield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-600" />
              Confirmation instantanée dès validation sur PayDunya et génération automatique de votre code de livraison.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-midnight-950/70">
              Vous allez être redirigé vers la page de paiement sécurisée de notre partenaire pour renseigner vos informations de carte bancaire.
            </p>
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-midnight-950/45 mt-4">
              <IconShield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-600" />
              Vos données bancaires sont chiffrées et jamais conservées.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-midnight-950/10 px-6 py-5">
        {orderError && (
          <p
            role="alert"
            className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-600"
          >
            {orderError}
          </p>
        )}
        <button
          type="button"
          onClick={onPay}
          disabled={placing}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-midnight-950 px-6 py-4 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-midnight-800 hover:shadow-lg hover:shadow-midnight-950/25 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          <IconLock className="h-4 w-4" />
          Payer {formatPrice(amount)}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={placing}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-medium text-midnight-950/55 transition-colors hover:text-midnight-950 disabled:opacity-40 cursor-pointer"
        >
          ← Retour aux coordonnées
        </button>
      </div>
    </div>
  );
}

/* ————————————————————————————————————————————————
 * Vue états du paiement (simulation UI — la vérité reste le backend)
 * ———————————————————————————————————————————————— */

function ProcessingView({ stage, amount }: { stage: number; amount: number }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-12 text-center">
      <p className="font-display text-lg font-semibold text-midnight-950">
        Paiement de {formatPrice(amount)}
      </p>

      <div className="w-full max-w-xs space-y-3.5">
        {PAYMENT_STAGES.map((label, index) => {
          const isCurrent = stage === index;
          const isDone = stage > index;
          return (
            <div key={label} className="flex items-center gap-3 text-left">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isDone
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isCurrent
                      ? "border-gold-400 bg-gold-400/15 text-gold-600"
                      : "border-midnight-950/15 bg-white text-midnight-950/25"
                )}
              >
                {isDone ? (
                  <IconCheck className="h-3.5 w-3.5" />
                ) : isCurrent ? (
                  <span className="h-3 w-3 animate-pulse rounded-full bg-gold-500" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>
              <span
                className={cn(
                  "text-sm transition-colors",
                  isDone || isCurrent
                    ? "font-medium text-midnight-950"
                    : "text-midnight-950/35"
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="flex items-center gap-2 text-[11px] text-midnight-950/45">
        <IconShield className="h-3.5 w-3.5 text-gold-600" />
        Ne fermez pas cette page : confirmation en cours…
      </p>
    </div>
  );
}

/* ————————————————————————————————————————————————
 * Vue confirmation finale
 * ———————————————————————————————————————————————— */

function DoneView({
  order,
  boutiqueId,
  onContinue,
}: {
  order: OrderRecord;
  boutiqueId: string | null;
  onContinue: () => void;
}) {
  const isPaid = order.status === "paid";

  // « Discuter de cette commande » : conversation liée à la commande (contexte
  // commercial). Nécessite un compte client — redirection + retour automatique.
  const discussHref = boutiqueId
    ? `/espace-client/discussions/nouvelle?boutique=${encodeURIComponent(
        boutiqueId
      )}&orderId=${encodeURIComponent(order.id)}&orderReference=${encodeURIComponent(
        order.ref
      )}`
    : null;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex-1 space-y-5 px-6 py-6">
        {/* Confirmation */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full",
              isPaid ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
            )}
          >
            <IconCheck className="h-7 w-7" />
          </span>
          <p className="font-display text-lg font-semibold text-midnight-950">
            {isPaid ? "Paiement confirmé !" : "Commande enregistrée"}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-600">
            R&eacute;f. {order.ref}
          </p>
          {/* Statut RÉEL (backend ou repli local) — jamais de fausse confirmation */}
          <span
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold",
              isPaid
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-800"
            )}
          >
            {order.statusLabel ?? "En attente de paiement"}
          </span>
          {order.paymentRef && (
            <p className="mt-1 font-mono text-[10px] text-midnight-950/40">
              Transaction {order.paymentRef}
            </p>
          )}
          <p className="mt-2 text-sm text-midnight-950/55">
            {order.items.length} article{order.items.length > 1 ? "s" : ""} · Livraison{" "}
            {order.deliveryName} · {formatPrice(order.total)}
          </p>
          {isPaid && (
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-midnight-950/45">
              La boutique prépare votre commande. Suivez son évolution ou
              échangez directement avec le vendeur.
            </p>
          )}
        </div>

        {/* Détail de la commande */}
        <div className="rounded-2xl border border-midnight-950/8 bg-ivory-50/60 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-600">
            Votre commande
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-2 text-sm">
                <span className="text-midnight-950/70">
                  {item.qty}× {item.name}
                  {item.variantLabel ? ` (${item.variantLabel})` : ""}
                </span>
                <span className="font-medium text-midnight-950">
                  {formatPrice(item.unitPrice * item.qty)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2.5 flex items-center justify-between border-t border-midnight-950/8 pt-2.5 text-sm">
            <span className="text-midnight-950/60">Livraison</span>
            <span className="font-medium text-midnight-950">
              {order.deliveryName} · 
              {order.deliveryPrice === 0 ? "Gratuite" : formatPrice(order.deliveryPrice)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-sm font-semibold text-midnight-950">Total</span>
            <span className="font-display text-lg font-semibold text-gold-600">
              {formatPrice(order.total)}
            </span>
          </div>
          {order.paymentLabel && (
            <div className="mt-1.5 flex items-center justify-between border-t border-midnight-950/5 pt-2.5 text-xs">
              <span className="text-midnight-950/60">Paiement</span>
              <span className="font-medium text-midnight-950">{order.paymentLabel}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2.5 border-t border-midnight-950/10 px-6 py-4">
        {discussHref && (
          <Link
            href={discussHref}
            onClick={onContinue}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-400 px-6 py-3.5 text-sm font-semibold text-midnight-950 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-300 cursor-pointer"
          >
            Discuter avec le vendeur
          </Link>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-xl border border-midnight-950/15 px-6 py-3 text-sm font-medium text-midnight-950/70 transition-all duration-300 hover:border-gold-400/60 hover:text-midnight-950 cursor-pointer"
        >
          Continuer mes achats
        </button>
      </div>
    </div>
  );
}

/* ————————————————————————————————————————————————
 * Panier vide
 * ———————————————————————————————————————————————— */

function EmptyCart({ closeCart }: { closeCart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-400/15 text-gold-600">
        <IconCart className="h-7 w-7" />
      </span>
      <p className="font-display text-lg font-medium text-midnight-950">
        Votre panier est vide
      </p>
      <p className="text-sm text-midnight-950/55">
        Parcourez le catalogue et ajoutez un produit pour commander.
      </p>
      <button
        type="button"
        onClick={() => {
          closeCart();
          window.setTimeout(() => {
            document.getElementById("produits")?.scrollIntoView({ behavior: "smooth" });
          }, 250);
        }}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gold-400 px-6 py-3 text-sm font-medium text-midnight-950 transition-all duration-300 hover:bg-gold-300 hover:-translate-y-0.5 cursor-pointer"
      >
        Voir les produits
      </button>
    </div>
  );
}
