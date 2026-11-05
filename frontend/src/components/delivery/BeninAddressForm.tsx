"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BeninStationItem,
  DeliveryModeType,
  DeliveryQuoteResult,
  LOCAL_BENIN_GEOGRAPHY,
  StructuredBeninAddressInput,
  deliveryApi,
} from "@/lib/delivery-api";
import { formatPrice } from "@/constants/store";

interface BeninAddressFormProps {
  boutiqueId?: string | null;
  contactPhone: string;
  recipientName?: string;
  selectedPackPrice?: number;
  onChange: (data: {
    structuredAddress: StructuredBeninAddressInput;
    deliveryMode: DeliveryModeType;
    destinationStationId?: string;
    formattedAddressSummary: string;
    quote: DeliveryQuoteResult | null;
  }) => void;
}

export function BeninAddressForm({
  boutiqueId,
  contactPhone,
  recipientName,
  selectedPackPrice,
  onChange,
}: BeninAddressFormProps) {
  const departments = useMemo(() => Object.keys(LOCAL_BENIN_GEOGRAPHY), []);
  const [department, setDepartment] = useState<string>("Littoral");
  const [commune, setCommune] = useState<string>("Cotonou");
  const [arrondissement, setArrondissement] = useState<string>("");
  const [quartier, setQuartier] = useState<string>("Haie Vive");
  const [streetOrLandmark, setStreetOrLandmark] = useState<string>("");
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryModeType>("HOME");
  const [destinationStationId, setDestinationStationId] = useState<string>("");

  const [gpsConsent, setGpsConsent] = useState<boolean>(false);
  const [gpsCoords, setGpsCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracyMeters: number;
  } | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [quote, setQuote] = useState<DeliveryQuoteResult | null>(null);
  const [stations, setStations] = useState<BeninStationItem[]>([]);

  const communesForDept = useMemo(() => {
    const deptObj = LOCAL_BENIN_GEOGRAPHY[department];
    return deptObj ? Object.keys(deptObj.communes) : ["Cotonou"];
  }, [department]);

  const currentCommuneMeta = useMemo(() => {
    return (
      LOCAL_BENIN_GEOGRAPHY[department]?.communes[commune] ?? {
        arrondissements: [],
        quartiers: [],
        isInterurban: false,
      }
    );
  }, [department, commune]);

  // Ajuster commune et quartier lors d'un changement de département
  const handleDepartmentChange = (nextDept: string) => {
    setDepartment(nextDept);
    const nextCommunes = Object.keys(LOCAL_BENIN_GEOGRAPHY[nextDept]?.communes || {});
    const firstCommune = nextCommunes[0] || "Cotonou";
    setCommune(firstCommune);
    const meta = LOCAL_BENIN_GEOGRAPHY[nextDept]?.communes[firstCommune];
    setArrondissement(meta?.arrondissements?.[0] || "");
    setQuartier(meta?.quartiers?.[0] || "");
    if (meta?.isInterurban && deliveryMode === "HOME") {
      setDeliveryMode("INTERURBAN_STATION");
    } else if (!meta?.isInterurban && deliveryMode.startsWith("INTERURBAN")) {
      setDeliveryMode("HOME");
    }
  };

  const handleCommuneChange = (nextCommune: string) => {
    setCommune(nextCommune);
    const meta = LOCAL_BENIN_GEOGRAPHY[department]?.communes[nextCommune];
    setArrondissement(meta?.arrondissements?.[0] || "");
    setQuartier(meta?.quartiers?.[0] || "");
    if (meta?.isInterurban) {
      setDeliveryMode("INTERURBAN_STATION");
    } else {
      setDeliveryMode("HOME");
    }
  };

  // Géolocalisation native du navigateur avec consentement explicite (sans Google Maps)
  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Votre navigateur ne supporte pas la géolocalisation native.");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracyMeters: Math.round(pos.coords.accuracy || 25),
        });
        setGpsConsent(true);
        setGpsLoading(false);
      },
      () => {
        setGpsError(
          "Impossible d’obtenir la position GPS. Vos repères géographiques textuels suffisent."
        );
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Calcul du devis et chargement des gares recommandées
  useEffect(() => {
    let cancelled = false;
    deliveryApi
      .calculateQuote({
        boutiqueId: boutiqueId ?? undefined,
        destinationDepartment: department,
        destinationCommune: commune,
        destinationQuartier: quartier,
        deliveryMode,
        selectedPackPrice,
      })
      .then((res) => {
        if (cancelled) return;
        setQuote(res);
        if (res.recommendedStations?.length) {
          setStations(res.recommendedStations);
          if (!destinationStationId) {
            setDestinationStationId(res.recommendedStations[0].id);
          }
        } else {
          setStations([]);
        }
      })
      .catch(() => {
        // Fallback local immédiat si hors-ligne
      });
    return () => {
      cancelled = true;
    };
  }, [boutiqueId, department, commune, quartier, deliveryMode, selectedPackPrice]);

  // Propagation au parent (CartDrawer / Checkout)
  useEffect(() => {
    const locationSource = gpsCoords ? "GPS_CONFIRMED" : "MANUAL_APPROXIMATE";
    const structuredAddress: StructuredBeninAddressInput = {
      department,
      commune,
      arrondissement: arrondissement || undefined,
      quartier: quartier || commune,
      streetOrLandmark: streetOrLandmark || `Quartier ${quartier}, ${commune}`,
      deliveryInstructions: deliveryInstructions || undefined,
      recipientName,
      contactPhone,
      latitude: gpsCoords?.latitude,
      longitude: gpsCoords?.longitude,
      accuracyMeters: gpsCoords?.accuracyMeters,
      locationSource,
      confirmedByCustomer: true,
    };

    const stationObj = stations.find((s) => s.id === destinationStationId);
    const formattedAddressSummary = [
      `${department} / ${commune}`,
      arrondissement ? `(${arrondissement})` : "",
      `Qtier ${quartier}`,
      streetOrLandmark ? `— Repère : ${streetOrLandmark}` : "",
      stationObj &&
      (deliveryMode === "INTERURBAN_STATION" || deliveryMode === "STATION_PICKUP")
        ? `— Retrait Gare : ${stationObj.name}`
        : "",
      gpsCoords
        ? `[GPS vérifié ±${gpsCoords.accuracyMeters}m : ${gpsCoords.latitude}, ${gpsCoords.longitude}]`
        : "[Précision : Repères textuels]",
    ]
      .filter(Boolean)
      .join(" ");

    onChange({
      structuredAddress,
      deliveryMode,
      destinationStationId:
        deliveryMode === "INTERURBAN_STATION" || deliveryMode === "STATION_PICKUP"
          ? destinationStationId
          : undefined,
      formattedAddressSummary,
      quote,
    });
  }, [
    department,
    commune,
    arrondissement,
    quartier,
    streetOrLandmark,
    deliveryInstructions,
    deliveryMode,
    destinationStationId,
    gpsCoords,
    quote,
    contactPhone,
    recipientName,
  ]);

  const precisionBadge = gpsCoords
    ? gpsCoords.accuracyMeters <= 150
      ? {
          label: `GPS Exact (±${gpsCoords.accuracyMeters}m)`,
          tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
        }
      : {
          label: `Point GPS (±${gpsCoords.accuracyMeters}m)`,
          tone: "bg-amber-50 text-amber-700 border-amber-200",
        }
    : {
        label: "Repères géographiques locaux",
        tone: "bg-slate-100 text-slate-700 border-slate-200",
      };

  return (
    <div className="rounded-2xl border border-midnight-950/10 bg-cream-50/60 p-4 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-midnight-950/55">
            Adresse structurée Bénin & Mode de remise
          </p>
          <p className="text-xs text-midnight-950/65">
            Adapté aux réalités béninoises (quartiers, repères précis et gares interurbaines)
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${precisionBadge.tone}`}
        >
          {precisionBadge.label}
        </span>
      </div>

      {/* Département & Commune */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-semibold text-midnight-950/70 mb-1">
            Département *
          </label>
          <select
            value={department}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            className="w-full rounded-xl border border-midnight-950/15 bg-white px-3 py-2 text-xs font-medium text-midnight-950 focus:border-gold-500 focus:outline-none"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-midnight-950/70 mb-1">
            Commune / Ville *
          </label>
          <select
            value={commune}
            onChange={(e) => handleCommuneChange(e.target.value)}
            className="w-full rounded-xl border border-midnight-950/15 bg-white px-3 py-2 text-xs font-medium text-midnight-950 focus:border-gold-500 focus:outline-none"
          >
            {communesForDept.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Arrondissement & Quartier */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-semibold text-midnight-950/70 mb-1">
            Arrondissement (si applicable)
          </label>
          <select
            value={arrondissement}
            onChange={(e) => setArrondissement(e.target.value)}
            className="w-full rounded-xl border border-midnight-950/15 bg-white px-3 py-2 text-xs text-midnight-950 focus:border-gold-500 focus:outline-none"
          >
            <option value="">— Sélectionner —</option>
            {currentCommuneMeta.arrondissements.map((arr) => (
              <option key={arr} value={arr}>
                {arr}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-midnight-950/70 mb-1">
            Quartier *
          </label>
          <input
            type="text"
            list="benin-quartiers-list"
            value={quartier}
            onChange={(e) => setQuartier(e.target.value)}
            placeholder="Ex: Haie Vive, Zogbadjè, Albarika..."
            className="w-full rounded-xl border border-midnight-950/15 bg-white px-3 py-2 text-xs text-midnight-950 focus:border-gold-500 focus:outline-none"
          />
          <datalist id="benin-quartiers-list">
            {currentCommuneMeta.quartiers.map((q) => (
              <option key={q} value={q} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Repères géographiques & Instructions */}
      <div>
        <label className="block text-[11px] font-semibold text-midnight-950/70 mb-1">
          Repère géographique précis (Pharmacie, Carrefour, Église, Portail…) *
        </label>
        <input
          type="text"
          value={streetOrLandmark}
          onChange={(e) => setStreetOrLandmark(e.target.value)}
          placeholder="Ex: 2e von à droite après la Pharmacie Camp Guezo, maison à portail noir"
          className="w-full rounded-xl border border-midnight-950/15 bg-white px-3 py-2 text-xs text-midnight-950 focus:border-gold-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-midnight-950/70 mb-1">
          Instructions complémentaires pour le livreur (facultatif)
        </label>
        <input
          type="text"
          value={deliveryInstructions}
          onChange={(e) => setDeliveryInstructions(e.target.value)}
          placeholder="Ex: Appeler 10 min avant d’arriver, disponible entre 12h et 18h"
          className="w-full rounded-xl border border-midnight-950/15 bg-white px-3 py-2 text-xs text-midnight-950 focus:border-gold-500 focus:outline-none"
        />
      </div>

      {/* Mode de livraison (Domicile / Retrait Gare Interurbaine) */}
      <div>
        <label className="block text-[11px] font-semibold text-midnight-950/70 mb-1.5">
          Mode d’acheminement souhaité
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() =>
              setDeliveryMode(currentCommuneMeta.isInterurban ? "INTERURBAN_HOME" : "HOME")
            }
            className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
              deliveryMode === "HOME" || deliveryMode === "INTERURBAN_HOME"
                ? "border-gold-500 bg-gold-400/15 font-semibold text-midnight-950"
                : "border-midnight-950/10 bg-white text-midnight-950/70"
            }`}
          >
            Livraison à domicile
            <span className="block text-[10px] text-midnight-950/50">
              Remise directe avec code à 6 chiffres
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setDeliveryMode(
                currentCommuneMeta.isInterurban ? "INTERURBAN_STATION" : "STATION_PICKUP"
              )
            }
            className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
              deliveryMode === "INTERURBAN_STATION" || deliveryMode === "STATION_PICKUP"
                ? "border-gold-500 bg-gold-400/15 font-semibold text-midnight-950"
                : "border-midnight-950/10 bg-white text-midnight-950/70"
            }`}
          >
            Retrait en gare routière
            <span className="block text-[10px] text-midnight-950/50">
              Baobab Express, Confort Lines, Pax…
            </span>
          </button>

          <button
            type="button"
            onClick={handleCaptureGps}
            disabled={gpsLoading}
            className="rounded-xl border border-midnight-950/15 bg-white px-3 py-2 text-left text-xs text-midnight-950 hover:border-gold-400 transition"
          >
            {gpsLoading
              ? "Localisation en cours…"
              : gpsCoords
                ? "✓ Position GPS jointe"
                : "📍 Joindre ma position GPS"}
            <span className="block text-[10px] text-midnight-950/50">
              Facultatif (avec votre accord)
            </span>
          </button>
        </div>
        {gpsError && <p className="mt-1 text-[11px] text-amber-700">{gpsError}</p>}
      </div>

      {/* Sélecteur de gare pour les retraits en gare / interurbains */}
      {(deliveryMode === "INTERURBAN_STATION" || deliveryMode === "STATION_PICKUP") &&
        stations.length > 0 && (
          <div className="rounded-xl border border-gold-400/40 bg-white p-3">
            <label className="block text-[11px] font-semibold text-midnight-950 mb-1">
              Choisissez la gare de retrait ({commune}) *
            </label>
            <select
              value={destinationStationId}
              onChange={(e) => setDestinationStationId(e.target.value)}
              className="w-full rounded-lg border border-midnight-950/15 bg-cream-50 px-3 py-2 text-xs font-medium text-midnight-950"
            >
              {stations.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.carrierCompany}) — {st.landmark}
                </option>
              ))}
            </select>
          </div>
        )}

      {/* Résumé tarifaire transparent (anti-double-facturation) */}
      {quote && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/90 px-3.5 py-2.5 border border-midnight-950/10 text-xs">
          <div>
            <span className="font-semibold text-midnight-950">
              Estimation ZennShop ({quote.originCommune} → {quote.destinationCommune}) :{" "}
              {formatPrice(quote.quotedFeeFcfa)}
            </span>
            <span className="block text-[11px] text-midnight-950/55">
              Délai estimé : {quote.estimatedMinHours}h à {quote.estimatedMaxHours}h •{" "}
              {quote.isFeeIncludedInPack
                ? "Inclus dans le pack gratuit de la boutique (aucune double facturation)"
                : `Facturé sur la commande : ${formatPrice(quote.chargedToBuyerFcfa)}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default BeninAddressForm;
