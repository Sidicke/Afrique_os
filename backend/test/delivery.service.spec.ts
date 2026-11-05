import { ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import {
  AddressLocationSource,
  AddressPrecisionLevel,
  AgencyMembershipStatus,
  AgencyStatus,
  ConversationAccessStatus,
  CourierStatus,
  CourierType,
  DeliveryLegType,
  DeliveryMissionStatus,
  DeliveryMode,
  DispatchMode,
  DisputeScope,
  HandoverStep,
  OrderStatus,
  PackageSize,
  PaymentMethod,
  Prisma,
  SettlementBeneficiaryType,
  SettlementStatus,
  ShipmentStatus,
  VerificationStatus,
} from '@prisma/client';
import { DeliveryService } from '../src/delivery/delivery.service';
import { MessageCrypto } from '../src/common/crypto/message-crypto';

describe('DeliveryService — Intégration du système de livraison ZennShop (15 Règles Métier)', () => {
  beforeAll(() => {
    process.env.MESSAGE_ENCRYPTION_KEY =
      process.env.MESSAGE_ENCRYPTION_KEY ||
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  // Helper de base de données en mémoire simulant fidèlement les transactions et verrous atomiques Prisma
  function createInMemoryPrisma() {
    const state = {
      zones: [] as any[],
      stations: [] as any[],
      rateRules: [] as any[],
      addresses: [] as any[],
      boutiques: new Map<string, any>(),
      orders: new Map<string, any>(),
      agencies: new Map<string, any>(),
      couriers: new Map<string, any>(),
      memberships: [] as any[],
      shipments: new Map<string, any>(),
      legs: [] as any[],
      missions: new Map<string, any>(),
      evidences: [] as any[],
      events: [] as any[],
      conversations: new Map<string, any>(),
      messages: [] as any[],
      conversationAccesses: [] as any[],
      settlements: [] as any[],
      disputes: [] as any[],
      platformSettings: null as any,
    };

    let seq = 1;
    const nextId = (prefix: string) => `${prefix}_${seq++}`;

    const txClient: any = {
      platformSettings: {
        findUnique: jest.fn(async () => state.platformSettings),
        upsert: jest.fn(async ({ update, create }: any) => {
          state.platformSettings = state.platformSettings
            ? { ...state.platformSettings, ...update, updatedAt: new Date() }
            : { ...create, updatedAt: new Date() };
          return state.platformSettings;
        }),
      },
      deliveryZone: {
        count: jest.fn(async () => state.zones.length),
        findFirst: jest.fn(async ({ where }: any) => {
          return (
            state.zones.find(
              (z) =>
                (!where?.commune?.equals ||
                  z.commune.toLowerCase() === where.commune.equals.toLowerCase()) &&
                (where?.isActive === undefined || z.isActive === where.isActive),
            ) ?? null
          );
        }),
        findMany: jest.fn(async () => state.zones),
      },
      station: {
        findFirst: jest.fn(async ({ where }: any) => {
          return (
            state.stations.find(
              (s) =>
                !where?.commune?.equals ||
                s.commune.toLowerCase() === where.commune.equals.toLowerCase(),
            ) ?? null
          );
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          return state.stations.find((s) => s.id === where.id) ?? null;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          if (where?.commune?.equals) {
            return state.stations.filter(
              (s) => s.commune.toLowerCase() === where.commune.equals.toLowerCase(),
            );
          }
          return state.stations;
        }),
      },
      deliveryRateRule: {
        findFirst: jest.fn(async () => null),
      },
      boutique: {
        findUnique: jest.fn(async ({ where }: any) => state.boutiques.get(where.id) ?? null),
      },
      order: {
        findUnique: jest.fn(async ({ where }: any) => {
          const o = state.orders.get(where.id);
          if (!o) return null;
          return {
            ...o,
            boutique: state.boutiques.get(o.boutiqueId),
          };
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const existing = state.orders.get(where.id);
          const updated = { ...existing, ...data };
          state.orders.set(where.id, updated);
          return updated;
        }),
      },
      addressSnapshot: {
        create: jest.fn(async ({ data }: any) => {
          const item = { id: nextId('addr'), ...data, createdAt: new Date() };
          state.addresses.push(item);
          return item;
        }),
        findUniqueOrThrow: jest.fn(async ({ where }: any) => {
          const found = state.addresses.find((a) => a.id === where.id);
          if (!found) throw new Error('Address not found');
          return found;
        }),
      },
      deliveryAgency: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.id) return state.agencies.get(where.id) ?? null;
          for (const a of state.agencies.values()) {
            if (where.name && a.name === where.name) return a;
          }
          return null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const item = {
            id: nextId('agency'),
            balance: new Prisma.Decimal(0),
            completedDeliveries: 0,
            ...data,
          };
          state.agencies.set(item.id, item);
          return item;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const cur = state.agencies.get(where.id);
          const next = { ...cur, ...data };
          if (data.balance?.increment) {
            next.balance = new Prisma.Decimal(
              Number(cur.balance || 0) + Number(data.balance.increment),
            );
          }
          if (data.completedDeliveries?.increment) {
            next.completedDeliveries =
              Number(cur.completedDeliveries || 0) + data.completedDeliveries.increment;
          }
          state.agencies.set(where.id, next);
          return next;
        }),
      },
      courierProfile: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          let found: any = null;
          if (where.id) found = state.couriers.get(where.id) ?? null;
          if (where.userId) {
            for (const c of state.couriers.values()) {
              if (c.userId === where.userId) found = c;
            }
          }
          if (!found) return null;
          if (include?.memberships) {
            const memberships = state.memberships.filter(
              (m) =>
                m.courierProfileId === found.id &&
                (!include.memberships.where?.status ||
                  m.status === include.memberships.where.status),
            );
            return { ...found, memberships };
          }
          return found;
        }),
        create: jest.fn(async ({ data }: any) => {
          const item = {
            id: nextId('courier'),
            activeAgencyId: null,
            balance: new Prisma.Decimal(0),
            completedMissions: 0,
            ...data,
          };
          state.couriers.set(item.id, item);
          return item;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          let target = where.id ? state.couriers.get(where.id) : null;
          if (!target && where.userId) {
            for (const c of state.couriers.values()) {
              if (c.userId === where.userId) target = c;
            }
          }
          const next = { ...target, ...data };
          if (data.balance?.increment) {
            next.balance = new Prisma.Decimal(
              Number(target.balance || 0) + Number(data.balance.increment),
            );
          }
          if (data.completedMissions?.increment) {
            next.completedMissions =
              Number(target.completedMissions || 0) + data.completedMissions.increment;
          }
          state.couriers.set(next.id, next);
          return next;
        }),
      },
      agencyMembership: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          const key = where.agencyId_courierProfileId;
          const found = state.memberships.find(
            (m) =>
              m.agencyId === key.agencyId && m.courierProfileId === key.courierProfileId,
          );
          if (!found) return null;
          if (include?.courierProfile) {
            return {
              ...found,
              courierProfile: state.couriers.get(found.courierProfileId),
            };
          }
          return found;
        }),
        upsert: jest.fn(async ({ where, update, create }: any) => {
          const key = where.agencyId_courierProfileId;
          const idx = state.memberships.findIndex(
            (m) =>
              m.agencyId === key.agencyId && m.courierProfileId === key.courierProfileId,
          );
          if (idx >= 0) {
            state.memberships[idx] = { ...state.memberships[idx], ...update };
            return state.memberships[idx];
          }
          const created = { id: nextId('mbr'), ...create };
          state.memberships.push(created);
          return created;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          state.memberships = state.memberships.map((m) => {
            if (
              m.agencyId === where.agencyId &&
              m.courierProfileId === where.courierProfileId &&
              (!where.status || m.status === where.status)
            ) {
              count++;
              return { ...m, ...data };
            }
            return m;
          });
          return { count };
        }),
      },
      shipment: {
        findFirst: jest.fn(async ({ where }: any) => {
          for (const s of state.shipments.values()) {
            if (where.orderId && s.orderId === where.orderId) return txClient.shipment._hydrate(s);
          }
          return null;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          const s = state.shipments.get(where.id);
          return s ? txClient.shipment._hydrate(s) : null;
        }),
        findUniqueOrThrow: jest.fn(async ({ where }: any) => {
          const s = state.shipments.get(where.id);
          if (!s) throw new Error('Shipment not found');
          return txClient.shipment._hydrate(s);
        }),
        create: jest.fn(async ({ data }: any) => {
          const item = {
            id: nextId('shp'),
            deliveryCodeAttempts: 0,
            deliveryCodeLockedUntil: null,
            ...data,
            createdAt: new Date(),
          };
          state.shipments.set(item.id, item);
          return item;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const cur = state.shipments.get(where.id);
          const next = { ...cur, ...data };
          state.shipments.set(where.id, next);
          return next;
        }),
        _hydrate: (s: any) => ({
          ...s,
          boutique: state.boutiques.get(s.boutiqueId),
          order: state.orders.get(s.orderId),
          originAddress: state.addresses.find((a) => a.id === s.originAddressId) ?? null,
          destinationAddress:
            state.addresses.find((a) => a.id === s.destinationAddressId) ?? null,
          destinationStation:
            state.stations.find((st) => st.id === s.destinationStationId) ?? null,
          assignedCourier: s.assignedCourierId
            ? state.couriers.get(s.assignedCourierId)
            : null,
          legs: state.legs
            .filter((l) => l.shipmentId === s.id)
            .sort((a, b) => a.sequence - b.sequence),
          missions: Array.from(state.missions.values()).filter((m) => m.shipmentId === s.id),
          evidences: state.evidences.filter((e) => e.shipmentId === s.id),
          events: state.events.filter((ev) => ev.shipmentId === s.id),
          settlements: state.settlements.filter((st) => st.shipmentId === s.id),
          disputes: state.disputes.filter((d) => d.shipmentId === s.id),
        }),
      },
      deliveryLeg: {
        create: jest.fn(async ({ data }: any) => {
          const leg = { id: nextId('leg'), ...data };
          state.legs.push(leg);
          return leg;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const idx = state.legs.findIndex((l) => l.id === where.id);
          state.legs[idx] = { ...state.legs[idx], ...data };
          return state.legs[idx];
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          state.legs = state.legs.map((l) => {
            if (l.shipmentId === where.shipmentId) {
              count++;
              return { ...l, ...data };
            }
            return l;
          });
          return { count };
        }),
      },
      deliveryMission: {
        findFirst: jest.fn(async ({ where }: any) => {
          for (const m of state.missions.values()) {
            const matchShipment = !where.shipmentId || m.shipmentId === where.shipmentId;
            const matchCourier =
              !where.courierProfileId || m.courierProfileId === where.courierProfileId;
            const matchAgency = !where.agencyId || m.agencyId === where.agencyId;
            const matchMode = !where.missionMode || m.missionMode === where.missionMode;
            const matchStatus =
              !where.status?.in || where.status.in.includes(m.status);
            if (matchShipment && matchCourier && matchAgency && matchMode && matchStatus) {
              return m;
            }
          }
          return null;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          return Array.from(state.missions.values()).filter((m) => {
            if (where?.missionMode && m.missionMode !== where.missionMode) return false;
            if (where?.status && m.status !== where.status) return false;
            if (where?.courierProfileId === null && m.courierProfileId !== null) return false;
            if (
              typeof where?.courierProfileId === 'string' &&
              m.courierProfileId !== where.courierProfileId
            )
              return false;
            if (where?.agencyId && m.agencyId !== where.agencyId) return false;
            return true;
          });
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          const m = state.missions.get(where.id);
          if (!m) return null;
          return {
            ...m,
            agency: m.agencyId ? state.agencies.get(m.agencyId) : null,
            shipment: state.shipments.get(m.shipmentId),
          };
        }),
        findUniqueOrThrow: jest.fn(async ({ where }: any) => {
          const m = state.missions.get(where.id);
          if (!m) throw new Error('Mission not found');
          return {
            ...m,
            courierProfile: m.courierProfileId ? state.couriers.get(m.courierProfileId) : null,
            shipment: txClient.shipment._hydrate(state.shipments.get(m.shipmentId)),
          };
        }),
        create: jest.fn(async ({ data }: any) => {
          const item = {
            id: nextId('msn'),
            courierProfileId: null,
            requestedCourierProfileId: null,
            ...data,
            createdAt: new Date(),
          };
          state.missions.set(item.id, item);
          return item;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const cur = state.missions.get(where.id);
          const next = { ...cur, ...data };
          state.missions.set(where.id, next);
          return next;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          const m = state.missions.get(where.id);
          if (!m) return { count: 0 };
          if (where.missionMode && m.missionMode !== where.missionMode) return { count: 0 };
          if (typeof where.status === 'string' && m.status !== where.status) return { count: 0 };
          if (where.status?.in && !where.status.in.includes(m.status)) return { count: 0 };
          if (where.courierProfileId === null && m.courierProfileId !== null) {
            return { count: 0 };
          }
          if (where.agencyId && m.agencyId !== where.agencyId) return { count: 0 };

          const updated = { ...m, ...data };
          state.missions.set(where.id, updated);
          return { count: 1 };
        }),
      },
      handoverEvidence: {
        create: jest.fn(async ({ data }: any) => {
          const ev = { id: nextId('evd'), ...data, createdAt: new Date() };
          state.evidences.push(ev);
          return ev;
        }),
      },
      deliveryEvent: {
        create: jest.fn(async ({ data }: any) => {
          const ev = { id: nextId('evt'), ...data, createdAt: new Date() };
          state.events.push(ev);
          return ev;
        }),
      },
      settlementAllocation: {
        findUnique: jest.fn(async ({ where }: any) => {
          return state.settlements.find((s) => s.id === where.id) ?? null;
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          return (
            state.settlements.find(
              (s) =>
                s.orderId === where.orderId && s.beneficiaryType === where.beneficiaryType,
            ) ?? null
          );
        }),
        findMany: jest.fn(async ({ where }: any) => {
          return state.settlements
            .filter((s) => {
              if (where?.beneficiaryType && s.beneficiaryType !== where.beneficiaryType)
                return false;
              if (where?.status && s.status !== where.status) return false;
              if (
                where?.eligibleForReleaseAt?.lte &&
                (!s.eligibleForReleaseAt ||
                  new Date(s.eligibleForReleaseAt).getTime() >
                    where.eligibleForReleaseAt.lte.getTime())
              ) {
                return false;
              }
              return true;
            })
            .map((s) => {
              const shp = s.shipmentId ? state.shipments.get(s.shipmentId) : null;
              const ord = state.orders.get(s.orderId);
              return {
                ...s,
                shipment: shp
                  ? {
                      ...shp,
                      disputes: state.disputes.filter((d) => d.shipmentId === shp.id),
                    }
                  : null,
                order: ord
                  ? {
                      ...ord,
                      refundRequest: ord.refundRequest ?? null,
                    }
                  : null,
              };
            });
        }),
        create: jest.fn(async ({ data }: any) => {
          const s = { id: nextId('stl'), ...data, createdAt: new Date() };
          state.settlements.push(s);
          return s;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const idx = state.settlements.findIndex((s) => s.id === where.id);
          state.settlements[idx] = { ...state.settlements[idx], ...data };
          return state.settlements[idx];
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          state.settlements = state.settlements.map((s) => {
            if (where.shipmentId && s.shipmentId !== where.shipmentId) return s;
            if (
              typeof where.beneficiaryType === 'string' &&
              s.beneficiaryType !== where.beneficiaryType
            )
              return s;
            if (
              where.beneficiaryType?.in &&
              !where.beneficiaryType.in.includes(s.beneficiaryType)
            )
              return s;
            if (where.status?.not && s.status === where.status.not) return s;
            if (typeof where.status === 'string' && s.status !== where.status) return s;
            count++;
            return { ...s, ...data };
          });
          return { count };
        }),
      },
      conversation: {
        findFirst: jest.fn(async ({ where }: any) => {
          for (const c of state.conversations.values()) {
            if (
              c.channelType === where.channelType &&
              c.courierUserId === where.courierUserId &&
              (where.userId ? c.userId === where.userId : c.orderId === where.orderId)
            ) {
              return c;
            }
          }
          return null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const conv = { id: nextId('conv'), ...data, createdAt: new Date() };
          state.conversations.set(conv.id, conv);
          return conv;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const cur = state.conversations.get(where.id);
          const next = { ...cur, ...data };
          state.conversations.set(where.id, next);
          return next;
        }),
      },
      shipmentConversationAccess: {
        upsert: jest.fn(async ({ where, update, create }: any) => {
          const key = where.missionId_conversationId;
          const idx = state.conversationAccesses.findIndex(
            (a) =>
              a.missionId === key.missionId && a.conversationId === key.conversationId,
          );
          if (idx >= 0) {
            state.conversationAccesses[idx] = {
              ...state.conversationAccesses[idx],
              ...update,
            };
            return state.conversationAccesses[idx];
          }
          const item = { id: nextId('acc'), ...create };
          state.conversationAccesses.push(item);
          return item;
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          const found = state.conversationAccesses.find(
            (a) =>
              a.shipmentId === where.shipmentId &&
              (!where.status || a.status === where.status),
          );
          if (!found) return null;
          return {
            ...found,
            shipment: state.shipments.get(found.shipmentId),
            conversation: state.conversations.get(found.conversationId),
          };
        }),
        findMany: jest.fn(async ({ where }: any) => {
          return state.conversationAccesses
            .filter((a) => a.shipmentId === where.shipmentId)
            .map((a) => ({
              ...a,
              conversation: {
                ...state.conversations.get(a.conversationId),
                messages: state.messages.filter((m) => m.conversationId === a.conversationId),
              },
            }));
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const idx = state.conversationAccesses.findIndex((a) => a.id === where.id);
          state.conversationAccesses[idx] = { ...state.conversationAccesses[idx], ...data };
          return state.conversationAccesses[idx];
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          state.conversationAccesses = state.conversationAccesses.map((a) => {
            if (a.shipmentId === where.shipmentId && a.status === where.status) {
              count++;
              return { ...a, ...data };
            }
            return a;
          });
          return { count };
        }),
      },
      message: {
        create: jest.fn(async ({ data }: any) => {
          const msg = { id: nextId('msg'), ...data, createdAt: new Date() };
          state.messages.push(msg);
          return msg;
        }),
      },
      deliveryDispute: {
        create: jest.fn(async ({ data }: any) => {
          const d = { id: nextId('dsp'), ...data, createdAt: new Date() };
          state.disputes.push(d);
          return d;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          return state.disputes.find((d) => d.id === where.id) ?? null;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const idx = state.disputes.findIndex((d) => d.id === where.id);
          state.disputes[idx] = { ...state.disputes[idx], ...data };
          return state.disputes[idx];
        }),
      },
      $transaction: jest.fn(async (cb: any) => cb(txClient)),
      _state: state,
    };

    return txClient;
  }

  function setupDefaultOrderAndBoutique(prisma: any) {
    prisma._state.boutiques.set('boutique_1', {
      id: 'boutique_1',
      name: 'ZennMode Cotonou',
      slug: 'zennmode-cotonou',
      ownerId: 'seller_user_1',
      plan: 'starter',
      city: 'Cotonou',
      country: 'Bénin',
      phone: '+2290197000001',
    });

    prisma._state.orders.set('order_1', {
      id: 'order_1',
      reference: 'AC-TEST-0001',
      boutiqueId: 'boutique_1',
      userId: 'buyer_user_1',
      customerName: 'Afiavi Dossou',
      customerPhone: '+2290196000002',
      address: 'Près de la Pharmacie Camp Guezo',
      city: 'Cotonou',
      country: 'Bénin',
      status: OrderStatus.PAID,
      deliveryPrice: new Prisma.Decimal(1000),
      total: new Prisma.Decimal(16000), // 15 000 FCFA produit + 1 000 FCFA livraison
      pointsUsed: 0,
      items: [{ id: 'item_1', productName: 'Robe Bazin Riche', quantity: 1, unitPrice: 15000 }],
    });
  }

  it('1. Qualifie explicitement la précision des adresses béninoises (EXACT_GPS, PIN_CONFIRMED, LANDMARK_TEXT)', async () => {
    const prisma = createInMemoryPrisma();
    const service = new DeliveryService(prisma);

    const exact = await service.createAddressSnapshot({
      department: 'Littoral',
      commune: 'Cotonou',
      quartier: 'Haie Vive',
      streetOrLandmark: '2e rue après restaurant Livingstone',
      contactPhone: '+2290197112233',
      latitude: 6.3589,
      longitude: 2.3971,
      accuracyMeters: 18,
      locationSource: AddressLocationSource.GPS_CONFIRMED,
    });
    expect(exact.precisionLevel).toBe(AddressPrecisionLevel.EXACT_GPS);

    const pin = await service.createAddressSnapshot({
      department: 'Atlantique',
      commune: 'Abomey-Calavi',
      quartier: 'Zogbadjè',
      streetOrLandmark: 'Derrière la clôture du campus UAC',
      contactPhone: '+2290197112233',
      latitude: 6.419,
      longitude: 2.341,
      locationSource: AddressLocationSource.OSM_PIN,
    });
    expect(pin.precisionLevel).toBe(AddressPrecisionLevel.PIN_CONFIRMED);

    const landmark = await service.createAddressSnapshot({
      department: 'Borgou',
      commune: 'Parakou',
      quartier: 'Albarika',
      streetOrLandmark: 'En face du maquis Le Routier, portail bleu',
      contactPhone: '+2290197112233',
    });
    expect(landmark.precisionLevel).toBe(AddressPrecisionLevel.LANDMARK_TEXT);
  });

  it('2. Calcule les tarifs par zone Bénin et évite toute double facturation avec les deliveryPacks vendeur', async () => {
    const prisma = createInMemoryPrisma();
    setupDefaultOrderAndBoutique(prisma);
    const service = new DeliveryService(prisma);

    // Livraison intra-urbaine Cotonou -> Cotonou
    const quoteLocal = await service.calculateQuote({
      boutiqueId: 'boutique_1',
      destinationDepartment: 'Littoral',
      destinationCommune: 'Cotonou',
      deliveryMode: DeliveryMode.HOME,
    });
    expect(quoteLocal.quotedFeeFcfa).toBe(1000);
    expect(quoteLocal.isInterurban).toBe(false);

    // Livraison interurbaine Cotonou -> Parakou (Retrait Gare)
    const quoteInterurban = await service.calculateQuote({
      boutiqueId: 'boutique_1',
      destinationDepartment: 'Borgou',
      destinationCommune: 'Parakou',
      deliveryMode: DeliveryMode.INTERURBAN_STATION,
    });
    expect(quoteInterurban.quotedFeeFcfa).toBe(2500);
    expect(quoteInterurban.isInterurban).toBe(true);

    // Pack livraison gratuite offert par le vendeur (0 FCFA facturé au client, subvention vendeur tracée)
    const quoteFreePack = await service.calculateQuote({
      boutiqueId: 'boutique_1',
      destinationDepartment: 'Atlantique',
      destinationCommune: 'Abomey-Calavi',
      deliveryMode: DeliveryMode.HOME,
      selectedPackPrice: 0,
    });
    expect(quoteFreePack.quotedFeeFcfa).toBe(1500);
    expect(quoteFreePack.chargedToBuyerFcfa).toBe(0);
    expect(quoteFreePack.sellerSubsidyFcfa).toBe(1500);
    expect(quoteFreePack.isFeeIncludedInPack).toBe(true);
  });

  it('3. Règles 1 & 2 : Crée un Shipment distinct de Order avec 3 segments (DeliveryLeg) pour une livraison interurbaine et sépare le produit des frais de livraison', async () => {
    const prisma = createInMemoryPrisma();
    setupDefaultOrderAndBoutique(prisma);
    const service = new DeliveryService(prisma);

    const shipment = await service.createOrGetShipmentForOrder({
      orderId: 'order_1',
      deliveryMode: DeliveryMode.INTERURBAN_HOME,
      destinationAddress: {
        department: 'Borgou',
        commune: 'Parakou',
        quartier: 'Banikanni',
        streetOrLandmark: 'Près de la pharmacie Banikanni',
        contactPhone: '+2290196000002',
      },
    });

    expect(shipment.orderId).toBe('order_1');
    expect(shipment.legs).toHaveLength(3);
    expect(shipment.legs.map((l: any) => l.legType)).toEqual([
      DeliveryLegType.COLLECTION,
      DeliveryLegType.INTERURBAN_TRANSIT,
      DeliveryLegType.LAST_MILE,
    ]);

    // Vérifier que la commission vendeur (5% plan starter) est calculée uniquement sur les 15 000 FCFA du produit (et non 16 000 FCFA)
    expect(shipment.settlements).toHaveLength(1);
    const sellerAlloc = shipment.settlements[0];
    expect(Number(sellerAlloc.grossAmountFcfa)).toBe(15000);
    expect(Number(sellerAlloc.commissionAmountFcfa)).toBe(750);
    expect(Number(sellerAlloc.netAmountFcfa)).toBe(14250);
    expect(sellerAlloc.status).toBe(SettlementStatus.AWAITING_DELIVERY_VERIFICATION);
  });

  it('4. Règles 4, 5 & 6 : Bloque strictement tout livreur d’agence ou livreur non vérifié sur les missions publiques', async () => {
    const prisma = createInMemoryPrisma();
    setupDefaultOrderAndBoutique(prisma);
    const service = new DeliveryService(prisma);

    const shipment = await service.createOrGetShipmentForOrder({ orderId: 'order_1' });
    const dispatched = await service.dispatchShipment(shipment.id, 'seller_user_1', {
      dispatchMode: DispatchMode.PUBLIC_POOL,
    });

    // 1) Livreur indépendant NON vérifié (KYC PENDING) -> bloqué
    await service.registerCourierProfile('unverified_courier_user', {
      displayName: 'Koffi Non Vérifié',
      phone: '+2290191111111',
      department: 'Littoral',
      commune: 'Cotonou',
    });

    await expect(
      service.listPublicMissionsForIndependentCourier('unverified_courier_user'),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      service.acceptPublicMission(dispatched.mission.id, 'unverified_courier_user'),
    ).rejects.toThrow(ForbiddenException);

    // 2) Livreur vérifié MAIS rattaché à une agence -> strictement bloqué sur listPublicMissions et acceptPublicMission !
    const agency = await service.registerAgency('agency_owner_1', {
      name: 'Bénin Chrono Express',
      phone: '+2290192222222',
      department: 'Littoral',
      commune: 'Cotonou',
    });
    await service.adminVerifyAgency(agency.id, 'admin_1', {
      verificationStatus: VerificationStatus.VERIFIED,
    });

    const agencyCourier = await service.registerCourierProfile('agency_courier_user', {
      displayName: 'Sènakpon Livreur Agence',
      phone: '+2290193333333',
      department: 'Littoral',
      commune: 'Cotonou',
    });
    await service.adminVerifyCourier(agencyCourier.id, 'admin_1', {
      verificationStatus: VerificationStatus.VERIFIED,
    });
    await service.attachCourierToAgency(agency.id, 'agency_owner_1', {
      courierProfileId: agencyCourier.id,
    });

    await expect(
      service.listPublicMissionsForIndependentCourier('agency_courier_user'),
    ).rejects.toThrow(
      'Accès refusé : un livreur rattaché à une agence ne peut ni consulter ni accepter de missions publiques indépendantes.',
    );

    await expect(
      service.acceptPublicMission(dispatched.mission.id, 'agency_courier_user'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('5. Règle 3 : Garantit l’exclusivité atomique sous concurrence (10 livreurs indépendants acceptent la même mission -> 1 seul gagnant, 9 rejets)', async () => {
    const prisma = createInMemoryPrisma();
    setupDefaultOrderAndBoutique(prisma);
    const service = new DeliveryService(prisma);

    const shipment = await service.createOrGetShipmentForOrder({ orderId: 'order_1' });
    const { mission } = await service.dispatchShipment(shipment.id, 'seller_user_1', {
      dispatchMode: DispatchMode.PUBLIC_POOL,
    });

    // Créer et vérifier 10 livreurs indépendants
    const courierUserIds: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const uid = `indep_courier_${i}`;
      courierUserIds.push(uid);
      const profile = await service.registerCourierProfile(uid, {
        displayName: `Livreur Indépendant #${i}`,
        phone: `+22901970000${i}`,
        department: 'Littoral',
        commune: 'Cotonou',
      });
      await service.adminVerifyCourier(profile.id, 'admin_1', {
        verificationStatus: VerificationStatus.VERIFIED,
      });
    }

    // Lancement simultané de 10 acceptations concurrentes
    const results = await Promise.allSettled(
      courierUserIds.map((uid) => service.acceptPublicMission(mission.id, uid)),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(9);
  });

  it('6. Règle 8 & Détachement : Le souhait de livreur particulier par le vendeur requiert l’approbation de l’agence, et un livreur en mission active ne peut être détaché', async () => {
    const prisma = createInMemoryPrisma();
    setupDefaultOrderAndBoutique(prisma);
    const service = new DeliveryService(prisma);

    const agency = await service.registerAgency('agency_owner_1', {
      name: 'ZennExpress Agence Cotonou',
      phone: '+2290197555555',
      department: 'Littoral',
      commune: 'Cotonou',
    });
    await service.adminVerifyAgency(agency.id, 'admin_1', {
      verificationStatus: VerificationStatus.VERIFIED,
    });

    const courier = await service.registerCourierProfile('courier_emp_1', {
      displayName: 'Romaric Agence',
      phone: '+2290197666666',
      department: 'Littoral',
      commune: 'Cotonou',
    });
    await service.adminVerifyCourier(courier.id, 'admin_1', {
      verificationStatus: VerificationStatus.VERIFIED,
    });
    await service.attachCourierToAgency(agency.id, 'agency_owner_1', {
      courierProfileId: courier.id,
    });

    const shipment = await service.createOrGetShipmentForOrder({ orderId: 'order_1' });

    // Le vendeur sélectionne l'agence et demande Romaric : la mission reste en OFFERED sans courierProfileId tant que l'agence n'approuve pas
    const { mission } = await service.dispatchShipment(shipment.id, 'seller_user_1', {
      dispatchMode: DispatchMode.PARTNER_AGENCY,
      agencyId: agency.id,
      requestedCourierProfileId: courier.id,
    });
    expect(mission.status).toBe(DeliveryMissionStatus.OFFERED);
    expect(mission.courierProfileId).toBeNull();
    expect(mission.requestedCourierProfileId).toBe(courier.id);

    // L'agence valide l'affectation à Romaric
    const assigned = await service.assignMissionByAgency(mission.id, 'agency_owner_1', {
      courierProfileId: courier.id,
    });
    expect(assigned.status).toBe(DeliveryMissionStatus.ACCEPTED);
    expect(assigned.courierProfileId).toBe(courier.id);
    expect(assigned.agencyApprovedPreferred).toBe(true);

    // Tentative de détacher Romaric pendant sa mission active -> rejetée !
    await expect(
      service.detachCourierFromAgency(agency.id, courier.id, 'agency_owner_1'),
    ).rejects.toThrow(ConflictException);
  });

  it('7. Règles 9, 10, 11 & Section 5 : La déclaration seule du livreur ne valide pas la livraison ; le code client à usage unique valide la remise, révoque immédiatement le chat Client-Livreur, et ouvre la fenêtre de conformité produit', async () => {
    const prisma = createInMemoryPrisma();
    setupDefaultOrderAndBoutique(prisma);
    const service = new DeliveryService(prisma);

    const shipment = await service.createOrGetShipmentForOrder({ orderId: 'order_1' });
    const { mission } = await service.dispatchShipment(shipment.id, 'seller_user_1', {
      dispatchMode: DispatchMode.PUBLIC_POOL,
    });

    const courier = await service.registerCourierProfile('indep_1', {
      displayName: 'Ulrich Express',
      phone: '+2290197888888',
      department: 'Littoral',
      commune: 'Cotonou',
    });
    await service.adminVerifyCourier(courier.id, 'admin_1', {
      verificationStatus: VerificationStatus.VERIFIED,
    });

    await service.acceptPublicMission(mission.id, 'indep_1');

    // Le livreur et le client peuvent communiquer pendant la mission active
    const msg1 = await service.sendShipmentChatMessage(shipment.id, 'indep_1', {
      content: 'Bonjour Madame, je suis en route vers Camp Guezo.',
    });
    expect(msg1.content).toContain('Camp Guezo');

    const msg2 = await service.sendShipmentChatMessage(shipment.id, 'buyer_user_1', {
      content: 'Merci, je vous attends devant la pharmacie.',
    });
    expect(msg2.content).toContain('pharmacie');

    // Règle 10 : Le livreur déclare avoir remis le colis SANS code client -> le statut passe à DELIVERY_PENDING_VERIFICATION (et JAMAIS DELIVERED_VERIFIED)
    const decl = await service.recordHandoverEvidence(shipment.id, 'indep_1', 'LIVREUR', {
      step: HandoverStep.DELIVERY_TO_BUYER,
      missionId: mission.id,
      notes: 'Remis devant le portail',
    });
    expect(decl.shipmentStatus).toBe(ShipmentStatus.DELIVERY_PENDING_VERIFICATION);

    // Un code erroné est rejeté et incrémente le compteur d'essais
    await expect(
      service.verifyDeliveryByBuyerCode(shipment.id, 'indep_1', { code: '000000' }),
    ).rejects.toThrow(BadRequestException);

    // Le client (et lui seul) peut consulter son code de remise via getShipmentDetails
    const courierView = await service.getShipmentDetails(shipment.id, 'indep_1', 'CLIENT');
    expect(courierView.buyerDeliveryCode).toBeNull(); // Caché au livreur !

    const buyerView = await service.getShipmentDetails(shipment.id, 'buyer_user_1', 'CLIENT');
    expect(buyerView.buyerDeliveryCode).toBe(shipment.initialBuyerDeliveryCode);

    // Le livreur saisit le bon code à usage unique communiqué par le client
    const verified = await service.verifyDeliveryByBuyerCode(shipment.id, 'indep_1', {
      code: shipment.initialBuyerDeliveryCode,
    });
    expect(verified.status).toBe(ShipmentStatus.DELIVERED_VERIFIED);

    // Section 5 : Dès DELIVERED_VERIFIED, le livreur ne peut PLUS envoyer de message au client !
    await expect(
      service.sendShipmentChatMessage(shipment.id, 'indep_1', {
        content: 'Message après livraison interdit',
      }),
    ).rejects.toThrow(ForbiddenException);

    // Règle 11 & 12 : Le livreur est ELIGIBLE_FOR_RELEASE immédiatement, tandis que le vendeur est en AWAITING_BUYER_CONFORMITY
    const updatedDetails = await service.getShipmentDetails(
      shipment.id,
      'buyer_user_1',
      'CLIENT',
    );
    const courierSettlement = updatedDetails.settlements.find(
      (s: any) => s.beneficiaryType === SettlementBeneficiaryType.INDEPENDENT_COURIER,
    );
    const sellerSettlement = updatedDetails.settlements.find(
      (s: any) => s.beneficiaryType === SettlementBeneficiaryType.SELLER_BOUTIQUE,
    );
    expect(courierSettlement?.status).toBe(SettlementStatus.ELIGIBLE_FOR_RELEASE);
    expect(sellerSettlement?.status).toBe(SettlementStatus.AWAITING_BUYER_CONFORMITY);

    // Le client confirme la conformité du produit -> le vendeur passe en ELIGIBLE_FOR_RELEASE
    const accepted = await service.acceptProductConformity(shipment.id, 'buyer_user_1');
    expect(accepted.status).toBe(ShipmentStatus.BUYER_ACCEPTED);
  });

  it('8. Règles 12 & 13 : Un litige PRODUCT_ONLY bloque uniquement les fonds du vendeur sans pénaliser le livreur ayant livré avec code valide', async () => {
    const prisma = createInMemoryPrisma();
    setupDefaultOrderAndBoutique(prisma);
    const service = new DeliveryService(prisma);

    const shipment = await service.createOrGetShipmentForOrder({ orderId: 'order_1' });
    const { mission } = await service.dispatchShipment(shipment.id, 'seller_user_1', {
      dispatchMode: DispatchMode.PUBLIC_POOL,
    });

    const courier = await service.registerCourierProfile('indep_2', {
      displayName: 'Mariam Express',
      phone: '+2290197999999',
      department: 'Littoral',
      commune: 'Cotonou',
    });
    await service.adminVerifyCourier(courier.id, 'admin_1', {
      verificationStatus: VerificationStatus.VERIFIED,
    });

    await service.acceptPublicMission(mission.id, 'indep_2');
    await service.verifyDeliveryByBuyerCode(shipment.id, 'indep_2', {
      code: shipment.initialBuyerDeliveryCode,
    });

    // Le client ouvre un litige portant uniquement sur le produit (ex: mauvaise couleur envoyée par le vendeur)
    const dispute = await service.openDispute(
      shipment.id,
      {
        disputeScope: DisputeScope.PRODUCT_ONLY,
        reason: 'Couleur non conforme',
        description: 'J’ai commandé du bleu roi et j’ai reçu du vert.',
      },
      'buyer_user_1',
    );

    expect(dispute.sellerAllocationFrozen).toBe(true);
    expect(dispute.deliveryAllocationFrozen).toBe(false);

    const details = await service.getShipmentDetails(shipment.id, 'buyer_user_1', 'CLIENT');
    const sellerAlloc = details.settlements.find(
      (s: any) => s.beneficiaryType === SettlementBeneficiaryType.SELLER_BOUTIQUE,
    );
    const courierAlloc = details.settlements.find(
      (s: any) => s.beneficiaryType === SettlementBeneficiaryType.INDEPENDENT_COURIER,
    );

    expect(sellerAlloc?.status).toBe(SettlementStatus.ON_HOLD_DISPUTE);
    expect(courierAlloc?.status).toBe(SettlementStatus.ELIGIBLE_FOR_RELEASE);
  });

  it('9. Section 5 : Réactive le fil de discussion existant si le même livreur effectue ultérieurement une nouvelle livraison pour le même client', async () => {
    const prisma = createInMemoryPrisma();
    setupDefaultOrderAndBoutique(prisma);
    const service = new DeliveryService(prisma);

    const courier = await service.registerCourierProfile('indep_same', {
      displayName: 'Fidèle Livreur',
      phone: '+2290197123456',
      department: 'Littoral',
      commune: 'Cotonou',
    });
    await service.adminVerifyCourier(courier.id, 'admin_1', {
      verificationStatus: VerificationStatus.VERIFIED,
    });

    // Mission 1 sur order_1
    const shp1 = await service.createOrGetShipmentForOrder({ orderId: 'order_1' });
    const disp1 = await service.dispatchShipment(shp1.id, 'seller_user_1', {
      dispatchMode: DispatchMode.PUBLIC_POOL,
    });
    await service.acceptPublicMission(disp1.mission.id, 'indep_same');

    const sent1 = await service.sendShipmentChatMessage(shp1.id, 'indep_same', {
      content: 'Première mission : j’arrive.',
    });
    const firstConversationId = sent1.conversationId;

    // Clôture de la mission 1 par code client -> écriture révoquée
    await service.verifyDeliveryByBuyerCode(shp1.id, 'indep_same', {
      code: shp1.initialBuyerDeliveryCode,
    });
    await expect(
      service.sendShipmentChatMessage(shp1.id, 'indep_same', {
        content: 'Interdit après remise',
      }),
    ).rejects.toThrow(ForbiddenException);

    // Nouvelle commande order_2 du MÊME client buyer_user_1
    prisma._state.orders.set('order_2', {
      id: 'order_2',
      reference: 'AC-TEST-0002',
      boutiqueId: 'boutique_1',
      userId: 'buyer_user_1',
      customerName: 'Afiavi Dossou',
      customerPhone: '+2290196000002',
      address: 'Nouvelle adresse : Fidjrossè Plage',
      city: 'Cotonou',
      country: 'Bénin',
      status: OrderStatus.PAID,
      deliveryPrice: new Prisma.Decimal(1000),
      total: new Prisma.Decimal(11000),
      pointsUsed: 0,
      items: [{ id: 'item_2', productName: 'Sac artisanal', quantity: 1, unitPrice: 10000 }],
    });

    const shp2 = await service.createOrGetShipmentForOrder({ orderId: 'order_2' });
    const disp2 = await service.dispatchShipment(shp2.id, 'seller_user_1', {
      dispatchMode: DispatchMode.PUBLIC_POOL,
    });
    await service.acceptPublicMission(disp2.mission.id, 'indep_same');

    // Le fil existant est réactivé et utilisé pour la nouvelle mission !
    const sent2 = await service.sendShipmentChatMessage(shp2.id, 'indep_same', {
      content: 'Seconde mission vers Fidjrossè : en route !',
    });
    expect(sent2.conversationId).toBe(firstConversationId);
  });

  it('10. Section 8 : Gère le transit interurbain avec remise à un chauffeur occasionnel sans compte obligatoire et arrivée en gare', async () => {
    const prisma = createInMemoryPrisma();
    setupDefaultOrderAndBoutique(prisma);
    const service = new DeliveryService(prisma);

    const shp = await service.createOrGetShipmentForOrder({
      orderId: 'order_1',
      deliveryMode: DeliveryMode.INTERURBAN_STATION,
      destinationAddress: {
        department: 'Borgou',
        commune: 'Parakou',
        quartier: 'Albarika',
        streetOrLandmark: 'Gare Baobab Albarika',
        contactPhone: '+2290196000002',
      },
    });

    // Étape 1 : Collecte chez le vendeur
    const step1 = await service.recordHandoverEvidence(shp.id, 'seller_user_1', 'VENDEUR', {
      step: HandoverStep.PICKUP_FROM_SELLER,
      notes: 'Colis scellé remis au collecteur',
    });
    expect(step1.shipmentStatus).toBe(ShipmentStatus.PICKED_UP);

    // Étape 2 : Remise au transporteur interurbain (chauffeur/compagnie sans compte utilisateur requis)
    const step2 = await service.recordHandoverEvidence(shp.id, 'seller_user_1', 'VENDEUR', {
      step: HandoverStep.HANDOVER_TO_CARRIER,
      carrierCompany: 'Baobab Express',
      receiptReference: 'BORD-BAOBAB-8842',
      driverName: 'Chauffeur Moussa (Sans Compte)',
      driverPhone: '+2290195001122',
      vehicleIdentifier: 'Bus BJ-4421-RB',
      photoUrl: 'https://cdn.zennshop.com/bordereaux/8842.jpg',
    });
    expect(step2.shipmentStatus).toBe(ShipmentStatus.IN_TRANSIT);

    // Étape 3 : Arrivée à la gare de Parakou
    const step3 = await service.recordHandoverEvidence(shp.id, 'seller_user_1', 'VENDEUR', {
      step: HandoverStep.ARRIVAL_AT_STATION,
      notes: 'Colis disponible au guichet Baobab Parakou Albarika',
    });
    expect(step3.shipmentStatus).toBe(ShipmentStatus.ARRIVED_AT_STATION);

    // Étape 4 : Confirmation de retrait par le client via son jeton invité signé (guestTrackingToken)
    const verified = await service.verifyDeliveryByGuestOrBuyer(shp.id, {
      guestToken: shp.initialGuestTrackingToken!,
      acceptProductConformity: true,
    });
    expect(verified.status).toBe(ShipmentStatus.BUYER_ACCEPTED);
  });

  it('11. Sécurité : Verrouille temporairement la vérification par code après 5 tentatives erronées (anti-brute-force)', async () => {
    const prisma = createInMemoryPrisma();
    setupDefaultOrderAndBoutique(prisma);
    const service = new DeliveryService(prisma);

    const shp = await service.createOrGetShipmentForOrder({ orderId: 'order_1' });

    for (let i = 1; i <= 5; i++) {
      await expect(
        service.verifyDeliveryByBuyerCode(shp.id, 'courier_x', { code: '999999' }),
      ).rejects.toThrow(BadRequestException);
    }

    // 6e tentative (même avec le vrai code !) -> rejetée par ForbiddenException (verrouillage 15 min)
    await expect(
      service.verifyDeliveryByBuyerCode(shp.id, 'courier_x', {
        code: shp.initialBuyerDeliveryCode,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('12. Décision D2 : Bloque strictement le paiement à la livraison (COD) et les commandes non prépayées pour les missions publiques et interurbaines', async () => {
    const prisma = createInMemoryPrisma();
    setupDefaultOrderAndBoutique(prisma);
    const service = new DeliveryService(prisma);

    // Commande en CASH_ON_DELIVERY
    prisma._state.orders.set('order_cod', {
      id: 'order_cod',
      reference: 'AC-COD-001',
      boutiqueId: 'boutique_1',
      userId: 'buyer_user_1',
      customerName: 'Client COD',
      customerPhone: '+2290196000002',
      address: 'Cotonou',
      city: 'Cotonou',
      country: 'Bénin',
      status: OrderStatus.PAID,
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      deliveryPrice: new Prisma.Decimal(1000),
      total: new Prisma.Decimal(11000),
      pointsUsed: 0,
      items: [{ id: 'item_cod', productName: 'Article COD', quantity: 1, unitPrice: 10000 }],
    });

    // 1) Création d'une expédition interurbaine en COD -> rejetée (Décision D2)
    await expect(
      service.createOrGetShipmentForOrder({
        orderId: 'order_cod',
        deliveryMode: DeliveryMode.INTERURBAN_STATION,
      }),
    ).rejects.toThrow(/Décision D2/);

    // 2) Création d'une expédition locale mais tentative de publication dans le PUBLIC_POOL en COD -> rejetée (Décision D2)
    const localCodShp = await service.createOrGetShipmentForOrder({
      orderId: 'order_cod',
      deliveryMode: DeliveryMode.HOME,
    });
    await expect(
      service.dispatchShipment(localCodShp.id, 'seller_user_1', {
        dispatchMode: DispatchMode.PUBLIC_POOL,
      }),
    ).rejects.toThrow(/Décision D2/);

    // 3) Autorisé uniquement pour le livreur personnel du vendeur (SELLER_PERSONAL_COURIER)
    const personalDispatch = await service.dispatchShipment(localCodShp.id, 'seller_user_1', {
      dispatchMode: DispatchMode.SELLER_PERSONAL_COURIER,
      personalCourierName: 'Livreur Interne Boutique',
      personalCourierPhone: '+2290197009988',
    });
    expect(personalDispatch.mission.missionMode).toBe(DispatchMode.SELLER_PERSONAL_COURIER);
  });

  it('13. Décision D3 : Applique des taux de commission configurables distincts (Agence vs Indépendant vs Livreur Vendeur 0%) sans rétroactivité sur les missions déjà contractualisées', async () => {
    const prisma = createInMemoryPrisma();
    setupDefaultOrderAndBoutique(prisma);
    const service = new DeliveryService(prisma);

    // Configuration initiale par défaut : 10% indépendant, 10% agence, 0% livreur personnel vendeur
    const defaultCfg = await service.getDeliveryPlatformConfig();
    expect(defaultCfg.independentCourierCommissionRatePct).toBe(10);
    expect(defaultCfg.agencyCommissionRatePct).toBe(10);
    expect(defaultCfg.sellerPersonalCourierCommissionRatePct).toBe(0);

    // Publication d'une mission publique alors que le taux indépendant est à 10% (frais 1000 FCFA -> commission 100 FCFA, net 900 FCFA)
    const shp1 = await service.createOrGetShipmentForOrder({ orderId: 'order_1' });
    const { mission: m1 } = await service.dispatchShipment(shp1.id, 'seller_user_1', {
      dispatchMode: DispatchMode.PUBLIC_POOL,
      agreedFeeFcfa: 1000,
    });
    expect(Number(m1.appliedCommissionRatePct)).toBe(10);
    expect(Number(m1.platformCommissionFcfa)).toBe(100);
    expect(Number(m1.netCourierPayoutFcfa)).toBe(900);

    // L'administrateur modifie ensuite les taux : 15% pour les indépendants et 8% pour les agences
    const updatedCfg = await service.updateDeliveryPlatformConfig('admin_1', {
      independentCourierCommissionRatePct: 15,
      agencyCommissionRatePct: 8,
    });
    expect(updatedCfg.independentCourierCommissionRatePct).toBe(15);
    expect(updatedCfg.agencyCommissionRatePct).toBe(8);

    // Un livreur indépendant accepte la mission m1 (contractualisée AVANT le changement de taux) :
    // Non-rétroactivité D3 -> son allocation conserve le taux de 10% (net 900 FCFA) et non 15% !
    const courier = await service.registerCourierProfile('indep_d3', {
      displayName: 'Livreur D3',
      phone: '+2290197001122',
      department: 'Littoral',
      commune: 'Cotonou',
    });
    await service.adminVerifyCourier(courier.id, 'admin_1', {
      verificationStatus: VerificationStatus.VERIFIED,
    });
    await service.acceptPublicMission(m1.id, 'indep_d3');

    const m1Alloc = prisma._state.settlements.find(
      (s: any) =>
        s.missionId === m1.id &&
        s.beneficiaryType === SettlementBeneficiaryType.INDEPENDENT_COURIER,
    );
    expect(Number(m1Alloc.commissionRate)).toBe(10);
    expect(Number(m1Alloc.commissionAmountFcfa)).toBe(100);
    expect(Number(m1Alloc.netAmountFcfa)).toBe(900);
  });

  it('14. Décisions D1 & D4 : Libère les fonds vendeur après expiration du délai configurable uniquement sans litige/remboursement, préserve les droits légaux et exige la validation manuelle Admin pour le décaissement', async () => {
    const prisma = createInMemoryPrisma();
    setupDefaultOrderAndBoutique(prisma);
    const service = new DeliveryService(prisma);

    const shp = await service.createOrGetShipmentForOrder({ orderId: 'order_1' });
    await service.verifyDeliveryByBuyerCode(shp.id, 'courier_1', {
      code: shp.initialBuyerDeliveryCode,
    });

    // Forcer l'échéance de la fenêtre de conformité dans le passé pour simuler l'écoulement des 24h sans litige
    const sellerAlloc = prisma._state.settlements.find(
      (s: any) =>
        s.shipmentId === shp.id &&
        s.beneficiaryType === SettlementBeneficiaryType.SELLER_BOUTIQUE,
    );
    expect(sellerAlloc.status).toBe(SettlementStatus.AWAITING_BUYER_CONFORMITY);
    sellerAlloc.eligibleForReleaseAt = new Date(Date.now() - 60_000);

    // Exécution du traitement d'échéance D4 -> passe en ELIGIBLE_FOR_RELEASE
    const processed = await service.processEligibleSellerSettlementsAfterConformityWindow();
    expect(processed.releasedCount).toBe(1);
    const updatedSellerAlloc = prisma._state.settlements.find(
      (s: any) => s.id === sellerAlloc.id,
    );
    expect(updatedSellerAlloc.status).toBe(SettlementStatus.ELIGIBLE_FOR_RELEASE);

    // Décision D1 : Validation manuelle obligatoire par un administrateur pour passer en RELEASED_TO_WALLET
    const approved = await service.adminApproveSettlementPayout(
      sellerAlloc.id,
      'admin_1',
      'Vérification manuelle Admin OK',
    );
    expect(approved.status).toBe(SettlementStatus.RELEASED_TO_WALLET);
  });
});
