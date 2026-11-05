"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { deliveryApi, LOCAL_BENIN_GEOGRAPHY } from "@/lib/delivery-api";
import { formatPrice } from "@/constants/store";
import { ZennShopLogo } from "@/components/brand/ZennShopLogo";

type PortalTab =
  | "INDEPENDENT"
  | "AGENCY_COURIER"
  | "AGENCY_MANAGER"
  | "INTERURBAN"
  | "ADMIN_CONFIG";

export default function DeliveryPartnerPortalPage() {
  const [activeTab, setActiveTab] = useState<PortalTab>("INDEPENDENT");
  const [publicMissions, setPublicMissions] = useState<any[]>([]);
  const [myMissions, setMyMissions] = useState<any[]>([]);
  const [verifiedAgencies, setVerifiedAgencies] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Formulaire KYC Livreur
  const [courierName, setCourierName] = useState("");
  const [courierPhone, setCourierPhone] = useState("");
  const [courierDept, setCourierDept] = useState("Littoral");
  const [courierCommune, setCourierCommune] = useState("Cotonou");
  const [vehicleType, setVehicleType] = useState<
    "MOTO" | "TRICYCLE" | "VAN" | "CAR" | "BICYCLE"
  >("MOTO");
  const [idDocNumber, setIdDocNumber] = useState("");

  // Formulaire KYC Agence
  const [agencyName, setAgencyName] = useState("");
  const [agencyPhone, setAgencyPhone] = useState("");
  const [agencyCommune, setAgencyCommune] = useState("Cotonou");
  const [agencyRccm, setAgencyRccm] = useState("");
  const [supportsInterurban, setSupportsInterurban] = useState(true);

  // Vérification de code client par le livreur
  const [selectedShipmentId, setSelectedShipmentId] = useState("");
  const [buyerCodeInput, setBuyerCodeInput] = useState("");

  // Remise interurbaine (chauffeur occasionnel sans compte requis)
  const [interurbanShipmentId, setInterurbanShipmentId] = useState("");
  const [carrierCompany, setCarrierCompany] = useState("Baobab Express");
  const [receiptRef, setReceiptRef] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");

  // Paramètres Admin D1-D5
  const [agencyRatePct, setAgencyRatePct] = useState<number>(10);
  const [indepRatePct, setIndepRatePct] = useState<number>(10);
  const [sellerRatePct, setSellerRatePct] = useState<number>(0);
  const [conformityHours, setConformityHours] = useState<number>(24);

  const refreshData = async () => {
    try {
      const agencies = await deliveryApi.listVerifiedAgencies();
      setVerifiedAgencies(agencies || []);
    } catch {
      // Ignore public fetch error
    }

    try {
      const mine = await deliveryApi.listMyMissions();
      setMyMissions(mine || []);
    } catch {
      // Non connecté ou pas encore de profil livreur
    }

    if (activeTab === "INDEPENDENT") {
      try {
        const pub = await deliveryApi.listPublicMissions();
        setPublicMissions(pub?.missions || []);
      } catch (err: any) {
        setPublicMissions([]);
        if (err?.message?.includes("agence")) {
          setFeedback(err.message);
        }
      }
    }
  };

  useEffect(() => {
    void refreshData();
  }, [activeTab]);

  const handleRegisterCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFeedback(null);
      await deliveryApi.registerCourier({
        displayName: courierName,
        phone: courierPhone,
        department: courierDept,
        commune: courierCommune,
        vehicleType,
        idDocumentType: "CIP / CNI Bénin",
        idDocumentNumber: idDocNumber,
        coveredCommunes: [courierCommune],
      });
      setFeedback(
        "Profil livreur enregistré avec succès ! Dès validation de votre KYC par l’administration, vous pourrez recevoir des missions."
      );
      await refreshData();
    } catch (err: any) {
      setFeedback(err?.message || "Connectez-vous pour enregistrer votre profil livreur.");
    }
  };

  const handleRegisterAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFeedback(null);
      await deliveryApi.registerAgency({
        name: agencyName,
        phone: agencyPhone,
        department: "Littoral",
        commune: agencyCommune,
        rccmNumber: agencyRccm,
        supportsInterurban,
        coveredCommunes: [agencyCommune, "Cotonou", "Abomey-Calavi", "Parakou"],
      });
      setFeedback(
        "Compte Agence de livraison créé ! Il sera activé après validation KYC par un administrateur ZennShop."
      );
      await refreshData();
    } catch (err: any) {
      setFeedback(err?.message || "Connectez-vous pour créer une agence de livraison.");
    }
  };

  const handleAcceptMission = async (missionId: string) => {
    try {
      setFeedback(null);
      await deliveryApi.acceptPublicMission(missionId);
      setFeedback(
        "Mission acceptée de manière atomique ! Le canal de messagerie temporaire avec le client est maintenant ouvert."
      );
      await refreshData();
    } catch (err: any) {
      setFeedback(err?.message || "Impossible d’accepter cette mission.");
    }
  };

  const handleVerifyBuyerCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipmentId || !buyerCodeInput) return;
    try {
      setFeedback(null);
      await deliveryApi.verifyDeliveryCode(selectedShipmentId, buyerCodeInput);
      setFeedback(
        "Code client vérifié ✓ ! La remise est validée (DELIVERED_VERIFIED), votre rémunération est éligible au reversement et la messagerie avec le client est automatiquement clôturée."
      );
      setBuyerCodeInput("");
      await refreshData();
    } catch (err: any) {
      setFeedback(err?.message || "Code de remise invalide.");
    }
  };

  const handleRecordInterurbanHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interurbanShipmentId) return;
    try {
      setFeedback(null);
      await deliveryApi.recordHandover(interurbanShipmentId, {
        step: "HANDOVER_TO_CARRIER",
        carrierCompany,
        receiptReference: receiptRef,
        driverName,
        driverPhone,
        notes: `Remis à ${carrierCompany} (Bordereau #${receiptRef})`,
      });
      setFeedback(
        "Remise interurbaine enregistrée avec succès (aucun compte requis pour le chauffeur occasionnel)."
      );
    } catch (err: any) {
      setFeedback(err?.message || "Impossible d’enregistrer le bordereau interurbain.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <ZennShopLogo variant="horizontal" className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <Link
              href="/espace-vendeur/commandes"
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-slate-700 hover:bg-slate-50"
            >
              Expéditions Vendeur
            </Link>
            <Link
              href="/espace-client/commandes"
              className="rounded-xl bg-slate-900 px-3.5 py-2 text-white hover:bg-slate-800"
            >
              Suivi Colis Client
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm">
          <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Réseau Logistique Bénin • Cotonou • Calavi • Porto-Novo • Parakou • Bohicon
          </span>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
            Système de Livraison ZennShop (Agences, Livreurs & Interurbain)
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-3xl">
            Architecture unifiée avec KYC obligatoire, séparation stricte entre livreurs
            d’agence et livreurs indépendants, code de remise à usage unique, messagerie
            temporaire révoquée dès livraison et protection financière des reversements.
          </p>

          {/* Navigation des rôles logistiques */}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("INDEPENDENT")}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                activeTab === "INDEPENDENT"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              1. Livreur Indépendant (Pool Public)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("AGENCY_COURIER")}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                activeTab === "AGENCY_COURIER"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              2. Livreur d’Agence (Missions Exclusives)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("AGENCY_MANAGER")}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                activeTab === "AGENCY_MANAGER"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              3. Agence de Livraison (Flotte & Dispatch)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("INTERURBAN")}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                activeTab === "INTERURBAN"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              4. Transit Interurbain & Gares
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ADMIN_CONFIG")}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                activeTab === "ADMIN_CONFIG"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              5. Administration & Arbitrages (D1–D5)
            </button>
          </div>
        </div>

        {feedback && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
            {feedback}
          </div>
        )}

        {/* ONGLET 1 : LIVREUR INDÉPENDANT */}
        {activeTab === "INDEPENDENT" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl bg-white p-5 border border-slate-200">
                <h2 className="text-base font-bold text-slate-900">
                  Missions publiques ouvertes aux livreurs indépendants vérifiés
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Acceptation atomique sécurisée : une mission ne peut jamais être attribuée
                  simultanément à deux livreurs.
                </p>

                <div className="mt-4 space-y-3">
                  {publicMissions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                      Aucune mission publique en attente ou profil KYC requis pour consulter le
                      pool public.
                    </div>
                  ) : (
                    publicMissions.map((m) => (
                      <div
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                      >
                        <div>
                          <span className="font-mono text-[10px] uppercase text-slate-400">
                            Mission #{m.reference} • Boutique {m.boutique?.name}
                          </span>
                          <p className="text-sm font-bold text-slate-900">
                            {m.originSummary} → {m.destinationSummary}
                          </p>
                          <p className="text-xs text-slate-600">
                            Rémunération nette livreur :{" "}
                            <strong className="text-emerald-700">
                              {formatPrice(Number(m.netCourierPayoutFcfa || m.agreedFeeFcfa))}
                            </strong>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAcceptMission(m.id)}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          Accepter la mission
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Validation de remise par code client */}
              <form
                onSubmit={handleVerifyBuyerCode}
                className="rounded-2xl bg-white p-5 border border-slate-200 space-y-3"
              >
                <h3 className="text-sm font-bold text-slate-900">
                  Valider une remise de colis (Code à usage unique du client)
                </h3>
                <p className="text-xs text-slate-500">
                  Règle métier n°10 : La simple déclaration du livreur ne suffit jamais à
                  valider la livraison. Saisissez le code à 6 chiffres communiqué par le
                  client lors de la remise physique.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    required
                    placeholder="ID de l’expédition (Shipment ID)"
                    value={selectedShipmentId}
                    onChange={(e) => setSelectedShipmentId(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Code client à 6 chiffres"
                    value={buyerCodeInput}
                    onChange={(e) => setBuyerCodeInput(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono tracking-widest"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    Vérifier le code & clôturer
                  </button>
                </div>
              </form>
            </div>

            {/* Inscription KYC Livreur */}
            <form
              onSubmit={handleRegisterCourier}
              className="rounded-2xl bg-white p-5 border border-slate-200 space-y-3 h-fit"
            >
              <h3 className="text-sm font-bold text-slate-900">
                Inscription & KYC Livreur (Obligatoire)
              </h3>
              <input
                type="text"
                required
                placeholder="Nom complet du livreur *"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                placeholder="Téléphone Mobile Money (+229...) *"
                value={courierPhone}
                onChange={(e) => setCourierPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={courierDept}
                  onChange={(e) => setCourierDept(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                >
                  {Object.keys(LOCAL_BENIN_GEOGRAPHY).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={courierCommune}
                  onChange={(e) => setCourierCommune(e.target.value)}
                  placeholder="Commune (ex: Cotonou)"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              >
                <option value="MOTO">Moto (Zémidjan / Express)</option>
                <option value="TRICYCLE">Tricycle</option>
                <option value="VAN">Fourgonnette</option>
                <option value="CAR">Voiture</option>
              </select>
              <input
                type="text"
                required
                placeholder="N° CIP / Pièce d’identité Bénin *"
                value={idDocNumber}
                onChange={(e) => setIdDocNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Soumettre mon dossier KYC Livreur
              </button>
            </form>
          </div>
        )}

        {/* ONGLET 2 : LIVREUR D'AGENCE */}
        {activeTab === "AGENCY_COURIER" && (
          <div className="rounded-2xl bg-white p-6 border border-slate-200 space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
              <strong>Règle métier n°4 (Cloisonnement strict) :</strong> En tant que livreur
              rattaché à une agence, vous accédez <strong>exclusivement</strong> aux missions
              attribuées par votre agence. La consultation et l’acceptation des missions
              publiques indépendantes sont désactivées côté serveur et interface.
            </div>

            <h2 className="text-base font-bold text-slate-900">
              Mes missions attribuées par mon agence ({myMissions.length})
            </h2>

            {myMissions.length === 0 ? (
              <p className="text-xs text-slate-500">
                Aucune mission d’agence active ne vous est attribuée pour le moment.
              </p>
            ) : (
              <div className="space-y-3">
                {myMissions.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-mono text-[10px] uppercase text-slate-400">
                        Mission #{m.reference} • Agence {m.agency?.name || "Partenaire"}
                      </span>
                      <p className="text-sm font-bold text-slate-900">
                        {m.originSummary} → {m.destinationSummary}
                      </p>
                      <p className="text-xs text-slate-500">
                        Statut : <strong>{m.status}</strong> • Shipment ID : {m.shipmentId}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET 3 : AGENCE DE LIVRAISON */}
        {activeTab === "AGENCY_MANAGER" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl bg-white p-5 border border-slate-200 space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                Agences partenaires vérifiées sur ZennShop ({verifiedAgencies.length})
              </h2>
              <p className="text-xs text-slate-500">
                Règle métier n°8 : Lorsqu’un vendeur souhaite un livreur précis appartenant à
                votre agence, l’affectation vous est soumise pour validation avant tout départ.
              </p>
              <div className="space-y-3">
                {verifiedAgencies.map((ag) => (
                  <div
                    key={ag.id}
                    className="rounded-xl border border-slate-200 p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">{ag.name}</p>
                      <p className="text-xs text-slate-500">
                        Commune : {ag.commune} • Tél : {ag.phone} • Livreurs actifs :{" "}
                        {ag.memberships?.length || 0}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                      Agence Vérifiée ✓
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleRegisterAgency}
              className="rounded-2xl bg-white p-5 border border-slate-200 space-y-3 h-fit"
            >
              <h3 className="text-sm font-bold text-slate-900">
                Créer un compte Agence de Livraison
              </h3>
              <input
                type="text"
                required
                placeholder="Nom commercial de l’agence *"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                placeholder="Téléphone professionnel (+229...) *"
                value={agencyPhone}
                onChange={(e) => setAgencyPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                placeholder="Ville principale (ex: Cotonou, Parakou)"
                value={agencyCommune}
                onChange={(e) => setAgencyCommune(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="N° RCCM / IFU Bénin"
                value={agencyRccm}
                onChange={(e) => setAgencyRccm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={supportsInterurban}
                  onChange={(e) => setSupportsInterurban(e.target.checked)}
                />
                Propose également la collecte vers les gares interurbaines
              </label>
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Enregistrer mon Agence (Validation KYC)
              </button>
            </form>
          </div>
        )}

        {/* ONGLET 4 : TRANSIT INTERURBAIN & GARES */}
        {activeTab === "INTERURBAN" && (
          <div className="rounded-2xl bg-white p-6 border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Remise à un transporteur interurbain (Baobab Express, Confort Lines, Pax…)
            </h2>
            <p className="text-xs text-slate-600">
              Section 8 : Les chauffeurs ou compagnies de transport interurbain occasionnels
              n’ont <strong>aucune obligation de créer un compte ZennShop</strong>. La
              traçabilité est assurée par le numéro de bordereau/reçu, l’identité de la
              compagnie et les coordonnées du conducteur.
            </p>

            <form
              onSubmit={handleRecordInterurbanHandover}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2"
            >
              <input
                type="text"
                required
                placeholder="ID Expédition (Shipment ID) *"
                value={interurbanShipmentId}
                onChange={(e) => setInterurbanShipmentId(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                placeholder="Compagnie (ex: Baobab Express) *"
                value={carrierCompany}
                onChange={(e) => setCarrierCompany(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                placeholder="N° Bordereau / Ticket gare *"
                value={receiptRef}
                onChange={(e) => setReceiptRef(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="Nom & Tél chauffeur (sans compte)"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Enregistrer la remise gare
              </button>
            </form>
          </div>
        )}

        {/* ONGLET 5 : ADMINISTRATION & ARBITRAGES D1–D5 */}
        {activeTab === "ADMIN_CONFIG" && (
          <div className="rounded-2xl bg-white p-6 border border-slate-200 space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Configuration Administrative Logistique (Décisions D1 à D5)
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                D1 : Décaissement sur validation manuelle Admin (aucun payout PSP automatique). •
                D2 : COD désactivé sur pool public et interurbain. • D3 : Taux configurables
                non-rétroactifs sur les missions déjà contractualisées. • D4 : Délai
                configurable d’éligibilité au reversement sans extinction des droits légaux.
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setFeedback(null);
                  await deliveryApi.updateAdminConfig({
                    agencyCommissionRatePct: agencyRatePct,
                    independentCourierCommissionRatePct: indepRatePct,
                    sellerPersonalCourierCommissionRatePct: sellerRatePct,
                    conformityWindowHours: conformityHours,
                  });
                  setFeedback(
                    "Paramètres administratifs D1–D5 enregistrés (applicables aux futures missions uniquement, sans rétroactivité)."
                  );
                } catch (err: any) {
                  setFeedback(
                    err?.message || "Droits Administrateur requis pour modifier ces paramètres."
                  );
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Commission Agences (%) — D3
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step="0.5"
                  value={agencyRatePct}
                  onChange={(e) => setAgencyRatePct(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Commission Indépendants (%) — D3
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step="0.5"
                  value={indepRatePct}
                  onChange={(e) => setIndepRatePct(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Commission Livreur Vendeur (%) — D3
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step="0.5"
                  value={sellerRatePct}
                  onChange={(e) => setSellerRatePct(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Délai conformité (heures) — D4
                </label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={conformityHours}
                  onChange={(e) => setConformityHours(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-3 pt-1">
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Enregistrer les taux & délais (Non-rétroactif)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await deliveryApi.processEligibleSettlements();
                      setFeedback(
                        `Vérification d’échéance D4 exécutée : ${res.releasedCount} allocation(s) libérée(s), ${res.skippedCount} bloquée(s) par litige/remboursement.`
                      );
                    } catch (err: any) {
                      setFeedback(err?.message || "Action réservée aux administrateurs.");
                    }
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                >
                  Exécuter la libération des échéances 24h sans litige (D4)
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
