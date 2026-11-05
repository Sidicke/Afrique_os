import { apiFetch } from './api';

export type DeliveryModeType =
  | 'HOME'
  | 'STATION_PICKUP'
  | 'INTERURBAN_STATION'
  | 'INTERURBAN_HOME'
  | 'SELLER_SELF';

export type DispatchModeType =
  | 'SELLER_PERSONAL_COURIER'
  | 'PARTNER_AGENCY'
  | 'PUBLIC_POOL';

export type AddressLocationSourceType =
  | 'GPS_CONFIRMED'
  | 'OSM_PIN'
  | 'MANUAL_APPROXIMATE';

export type AddressPrecisionLevelType =
  | 'EXACT_GPS'
  | 'PIN_CONFIRMED'
  | 'LANDMARK_TEXT';

export interface StructuredBeninAddressInput {
  department: string;
  commune: string;
  arrondissement?: string;
  quartier: string;
  streetOrLandmark: string;
  deliveryInstructions?: string;
  recipientName?: string;
  contactPhone: string;
  secondaryPhone?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  locationSource?: AddressLocationSourceType;
  confirmedByCustomer?: boolean;
}

export interface BeninStationItem {
  id: string;
  code: string;
  name: string;
  carrierCompany: string;
  department: string;
  commune: string;
  quartier?: string;
  address?: string;
  landmark?: string;
  contactPhone?: string;
  openingHours?: string;
}

export interface DeliveryQuoteResult {
  originCommune: string;
  destinationDepartment: string;
  destinationCommune: string;
  deliveryMode: DeliveryModeType;
  packageSize: string;
  isInterurban: boolean;
  quotedFeeFcfa: number;
  chargedToBuyerFcfa: number;
  sellerSubsidyFcfa: number;
  isFeeIncludedInPack: boolean;
  estimatedMinHours: number;
  estimatedMaxHours: number;
  recommendedStations: BeninStationItem[];
}

export const LOCAL_BENIN_GEOGRAPHY: Record<
  string,
  {
    communes: Record<
      string,
      { arrondissements: string[]; quartiers: string[]; isInterurban?: boolean }
    >;
  }
> = {
  Littoral: {
    communes: {
      Cotonou: {
        arrondissements: [
          '1er Arr. (Avotrou / Dandji)',
          '2e-4e Arr. (Akpakpa)',
          '5e Arr. (Ganhi / Jonquet / Zongo)',
          '6e Arr. (Dantokpa / Gbèdjromèdé)',
          '7e-8e Arr. (Gbégamey / Sainte-Rita)',
          '9e-10e Arr. (Kouhounou / Mènontin / Vèdoko)',
          '12e Arr. (Cadjèhoun / Haie Vive / Fidjrossè)',
          '13e Arr. (Agla)',
        ],
        quartiers: [
          'Haie Vive',
          'Cadjèhoun',
          'Fidjrossè Plage',
          'Fidjrossè Kpota',
          'Akpakpa Dodomè',
          'Ganhi',
          'Jonquet',
          'Zongo',
          'Gbégamey',
          'Kouhounou (Stade)',
          'Vèdoko',
          'Mènontin',
          'Zogbo',
          'Sainte-Rita',
          'Agontikon',
          'Agla',
          'Gbèdjromèdé',
          'Sikècodji',
          'Dantokpa',
        ],
      },
    },
  },
  Atlantique: {
    communes: {
      'Abomey-Calavi': {
        arrondissements: [
          'Abomey-Calavi Centre',
          'Godomey',
          'Akassato',
          'Togba',
          'Ouèdo',
          'Hêvié',
        ],
        quartiers: [
          'Godomey Salamey',
          'Godomey Togoudo',
          'Calavi Kpota',
          'Zogbadjè (Campus UAC)',
          'Bidossessi',
          'Arconville',
          'Tankpè',
          'IITA',
          'Akassato',
          'Togba',
          'Cococodji',
          'Ouèdo Cité',
        ],
      },
      Ouidah: {
        arrondissements: ['Ouidah Centre', 'Pahou', 'Avlékété'],
        quartiers: ['Pahou', 'Centre-Ville Ouidah', 'Route des Esclaves', 'Kpasse'],
      },
    },
  },
  Ouémé: {
    communes: {
      'Porto-Novo': {
        arrondissements: ['1er-4e Arr.', '5e Arr. (Ouando / Tokpota)'],
        quartiers: ['Ouando', 'Tokpota', 'Djègan-Kpèvi', 'Agbokou', 'Catchi', 'Dowa'],
      },
      'Sèmè-Kpodji': {
        arrondissements: ['Ekpè', 'Agblangandan', 'Sèmè-Kpodji'],
        quartiers: ['Ekpè PK10', 'Ekpè Marina', 'Agblangandan', 'Djrègbé'],
      },
    },
  },
  Borgou: {
    communes: {
      Parakou: {
        isInterurban: true,
        arrondissements: ['1er Arrondissement', '2e Arrondissement', '3e Arrondissement'],
        quartiers: ['Albarika', 'Banikanni', 'Zongo', 'Guèma', 'Titirou', 'Kpébié'],
      },
    },
  },
  Zou: {
    communes: {
      Bohicon: {
        isInterurban: true,
        arrondissements: ['Bohicon I', 'Bohicon II', 'Sodohomè'],
        quartiers: ['Bohicon Centre', 'Gare Routière', 'Zakpo', 'Sodohomè'],
      },
      Abomey: {
        isInterurban: true,
        arrondissements: ['Vidolé', 'Djègbè', 'Hounli'],
        quartiers: ['Goho', 'Djègbè', 'Vidolé', 'Hounli'],
      },
    },
  },
  Mono: {
    communes: {
      Lokossa: {
        isInterurban: true,
        arrondissements: ['Lokossa Centre', 'Agamè'],
        quartiers: ['Lokossa Centre', 'Agnivedji'],
      },
    },
  },
  Atacora: {
    communes: {
      Natitingou: {
        isInterurban: true,
        arrondissements: ['Natitingou I', 'Natitingou II', 'Natitingou III'],
        quartiers: ['Kantaborifa', 'Boriyouré', 'Winkè'],
      },
    },
  },
};

export const deliveryApi = {
  getGeography: () => apiFetch<any>('/delivery/geography'),

  calculateQuote: (payload: {
    boutiqueId?: string;
    originCommune?: string;
    destinationDepartment: string;
    destinationCommune: string;
    destinationQuartier?: string;
    deliveryMode: DeliveryModeType;
    selectedPackPrice?: number;
  }) =>
    apiFetch<DeliveryQuoteResult>('/delivery/quote', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createShipmentFromOrder: (payload: {
    orderId: string;
    deliveryMode?: DeliveryModeType;
    destinationAddress?: StructuredBeninAddressInput;
    destinationStationId?: string;
    packageDescription?: string;
    isFragile?: boolean;
  }) =>
    apiFetch<any>('/delivery/shipments/from-order', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getShipmentByOrder: (orderId: string, guestToken?: string) =>
    apiFetch<any>(
      `/delivery/shipments/by-order/${orderId}${guestToken ? `?guestToken=${encodeURIComponent(guestToken)}` : ''}`,
    ),

  getShipmentDetails: (shipmentId: string, guestToken?: string) =>
    apiFetch<any>(
      `/delivery/shipments/${shipmentId}${guestToken ? `?guestToken=${encodeURIComponent(guestToken)}` : ''}`,
    ),

  dispatchShipment: (
    shipmentId: string,
    payload: {
      dispatchMode: DispatchModeType;
      agencyId?: string;
      requestedCourierProfileId?: string;
      personalCourierName?: string;
      personalCourierPhone?: string;
      agreedFeeFcfa?: number;
      isExternalSellerPayment?: boolean;
    },
  ) =>
    apiFetch<any>(`/delivery/shipments/${shipmentId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listVerifiedAgencies: (commune?: string) =>
    apiFetch<any[]>(
      `/delivery/agencies/verified${commune ? `?commune=${encodeURIComponent(commune)}` : ''}`,
    ),

  registerAgency: (payload: {
    name: string;
    phone: string;
    whatsappNumber?: string;
    email?: string;
    department: string;
    commune: string;
    address?: string;
    description?: string;
    rccmNumber?: string;
    ifuNumber?: string;
    coveredCommunes?: string[];
    supportsInterurban?: boolean;
  }) =>
    apiFetch<any>('/delivery/agencies/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  registerCourier: (payload: {
    displayName: string;
    phone: string;
    whatsappNumber?: string;
    department: string;
    commune: string;
    vehicleType?: 'MOTO' | 'TRICYCLE' | 'VAN' | 'CAR' | 'BICYCLE';
    plateNumber?: string;
    idDocumentType?: string;
    idDocumentNumber?: string;
    coveredCommunes?: string[];
  }) =>
    apiFetch<any>('/delivery/couriers/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listPublicMissions: () => apiFetch<any>('/delivery/missions/public'),

  acceptPublicMission: (missionId: string) =>
    apiFetch<any>(`/delivery/missions/${missionId}/accept`, {
      method: 'POST',
    }),

  listMyMissions: () => apiFetch<any[]>('/delivery/missions/mine'),

  assignMissionByAgency: (missionId: string, courierProfileId: string) =>
    apiFetch<any>(`/delivery/missions/${missionId}/agency-assign`, {
      method: 'POST',
      body: JSON.stringify({ courierProfileId }),
    }),

  recordHandover: (
    shipmentId: string,
    payload: {
      step:
        | 'PICKUP_FROM_SELLER'
        | 'HANDOVER_TO_CARRIER'
        | 'ARRIVAL_AT_STATION'
        | 'PICKUP_FROM_STATION'
        | 'DELIVERY_TO_BUYER';
      missionId?: string;
      receiptReference?: string;
      carrierCompany?: string;
      driverName?: string;
      driverPhone?: string;
      vehicleIdentifier?: string;
      photoUrl?: string;
      notes?: string;
    },
  ) =>
    apiFetch<any>(`/delivery/shipments/${shipmentId}/handover`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyDeliveryCode: (shipmentId: string, code: string, notes?: string) =>
    apiFetch<any>(`/delivery/shipments/${shipmentId}/verify-code`, {
      method: 'POST',
      body: JSON.stringify({ code, notes }),
    }),

  confirmReceipt: (
    shipmentId: string,
    payload: { guestToken?: string; acceptProductConformity?: boolean; notes?: string },
  ) =>
    apiFetch<any>(`/delivery/shipments/${shipmentId}/confirm-receipt`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  acceptConformity: (shipmentId: string, guestToken?: string) =>
    apiFetch<any>(`/delivery/shipments/${shipmentId}/accept-conformity`, {
      method: 'POST',
      body: JSON.stringify({ guestToken }),
    }),

  getShipmentMessages: (shipmentId: string) =>
    apiFetch<any>(`/delivery/shipments/${shipmentId}/messages`),

  sendShipmentMessage: (shipmentId: string, content: string) =>
    apiFetch<any>(`/delivery/shipments/${shipmentId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  openDispute: (
    shipmentId: string,
    payload: {
      disputeScope: 'PRODUCT_ONLY' | 'DELIVERY_ONLY' | 'BOTH';
      reason: string;
      description: string;
      guestToken?: string;
    },
  ) =>
    apiFetch<any>(`/delivery/shipments/${shipmentId}/disputes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAdminConfig: () => apiFetch<any>('/delivery/admin/config'),

  updateAdminConfig: (payload: {
    agencyCommissionRatePct?: number;
    independentCourierCommissionRatePct?: number;
    sellerPersonalCourierCommissionRatePct?: number;
    conformityWindowHours?: number;
    manualAdminPayoutApprovalRequired?: boolean;
    codAllowedForPublicMissions?: boolean;
    codAllowedForInterurban?: boolean;
    allowOccasionalInterurbanCarrierWithoutAccount?: boolean;
  }) =>
    apiFetch<any>('/delivery/admin/config', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  processEligibleSettlements: () =>
    apiFetch<any>('/delivery/admin/settlements/process-eligible', {
      method: 'POST',
    }),

  adminApprovePayout: (settlementId: string, notes?: string) =>
    apiFetch<any>(`/delivery/admin/settlements/${settlementId}/approve-payout`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),
};
