import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import {
  AddressLocationSource,
  AddressPrecisionLevel,
  AgencyMembershipStatus,
  AgencyStatus,
  ConversationAccessStatus,
  CourierStatus,
  CourierType,
  DeliveryDisputeStatus,
  DeliveryLegStatus,
  DeliveryLegType,
  DeliveryMissionStatus,
  DeliveryMode,
  DispatchMode,
  DisputeScope,
  EvidenceStatus,
  HandoverStep,
  MessageSender,
  OrderStatus,
  PackageSize,
  PaymentMethod,
  Prisma,
  SettlementBeneficiaryType,
  SettlementStatus,
  ShipmentStatus,
  VerificationMethod,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MessageCrypto } from '../common/crypto/message-crypto';
import {
  BENIN_COMMUNES_DATA,
  BENIN_DEPARTMENTS,
  BENIN_STATIONS_DATA,
} from './benin-geography.constants';
import {
  AdminVerifyPartnerDto,
  AssignAgencyMissionDto,
  AttachCourierToAgencyDto,
  CalculateDeliveryQuoteDto,
  CreateAddressSnapshotDto,
  CreateShipmentFromOrderDto,
  DispatchShipmentDto,
  OpenDeliveryDisputeDto,
  RecordHandoverEvidenceDto,
  RegisterAgencyDto,
  RegisterCourierProfileDto,
  ResolveDeliveryDisputeDto,
  SendCourierClientMessageDto,
  UpdateDeliveryPlatformConfigDto,
  VerifyDeliveryCodeDto,
  VerifyGuestDeliveryDto,
} from './dto/delivery.dto';

export interface DeliveryPlatformConfig {
  agencyCommissionRatePct: number;
  independentCourierCommissionRatePct: number;
  sellerPersonalCourierCommissionRatePct: number;
  conformityWindowHours: number;
  manualAdminPayoutApprovalRequired: boolean;
  autoPspPayoutEnabled: boolean;
  codAllowedForPublicMissions: boolean;
  codAllowedForInterurban: boolean;
  allowOccasionalInterurbanCarrierWithoutAccount: boolean;
}

export const DEFAULT_DELIVERY_PLATFORM_CONFIG: DeliveryPlatformConfig = {
  agencyCommissionRatePct: 10.0,
  independentCourierCommissionRatePct: 10.0,
  sellerPersonalCourierCommissionRatePct: 0.0,
  conformityWindowHours: 24,
  manualAdminPayoutApprovalRequired: true,
  autoPspPayoutEnabled: false,
  codAllowedForPublicMissions: false,
  codAllowedForInterurban: false,
  allowOccasionalInterurbanCarrierWithoutAccount: true,
};

const MAX_DELIVERY_CODE_ATTEMPTS = 5;
const CODE_LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const CONFORMITY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 heures

@Injectable()
export class DeliveryService implements OnModuleInit {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.seedBeninReferenceDataIfEmpty();
    } catch (err) {
      this.logger.warn(
        `Initialisation du référentiel géographique Bénin différée : ${(err as Error).message}`,
      );
    }
  }

  // ==========================================================================
  // 0. CONFIGURATION DYNAMIQUE ADMIN (DÉCISIONS D1, D2, D3, D4, D5)
  // ==========================================================================

  async getDeliveryPlatformConfig(): Promise<DeliveryPlatformConfig> {
    try {
      const row = await this.prisma.platformSettings?.findUnique?.({
        where: { id: 'global' },
      });
      const raw = (row?.data as Record<string, any> | null)?.deliveryConfig;
      if (!raw || typeof raw !== 'object') {
        return { ...DEFAULT_DELIVERY_PLATFORM_CONFIG };
      }
      return {
        agencyCommissionRatePct:
          typeof raw.agencyCommissionRatePct === 'number'
            ? raw.agencyCommissionRatePct
            : DEFAULT_DELIVERY_PLATFORM_CONFIG.agencyCommissionRatePct,
        independentCourierCommissionRatePct:
          typeof raw.independentCourierCommissionRatePct === 'number'
            ? raw.independentCourierCommissionRatePct
            : DEFAULT_DELIVERY_PLATFORM_CONFIG.independentCourierCommissionRatePct,
        sellerPersonalCourierCommissionRatePct:
          typeof raw.sellerPersonalCourierCommissionRatePct === 'number'
            ? raw.sellerPersonalCourierCommissionRatePct
            : DEFAULT_DELIVERY_PLATFORM_CONFIG.sellerPersonalCourierCommissionRatePct,
        conformityWindowHours:
          typeof raw.conformityWindowHours === 'number'
            ? raw.conformityWindowHours
            : DEFAULT_DELIVERY_PLATFORM_CONFIG.conformityWindowHours,
        // D1 : Toujours maintenir la validation manuelle Admin et interdire tout payout PSP auto non validé
        manualAdminPayoutApprovalRequired:
          raw.manualAdminPayoutApprovalRequired ??
          DEFAULT_DELIVERY_PLATFORM_CONFIG.manualAdminPayoutApprovalRequired,
        autoPspPayoutEnabled: false,
        codAllowedForPublicMissions:
          raw.codAllowedForPublicMissions ??
          DEFAULT_DELIVERY_PLATFORM_CONFIG.codAllowedForPublicMissions,
        codAllowedForInterurban:
          raw.codAllowedForInterurban ??
          DEFAULT_DELIVERY_PLATFORM_CONFIG.codAllowedForInterurban,
        allowOccasionalInterurbanCarrierWithoutAccount:
          raw.allowOccasionalInterurbanCarrierWithoutAccount ??
          DEFAULT_DELIVERY_PLATFORM_CONFIG.allowOccasionalInterurbanCarrierWithoutAccount,
      };
    } catch {
      return { ...DEFAULT_DELIVERY_PLATFORM_CONFIG };
    }
  }

  async updateDeliveryPlatformConfig(
    adminUserId: string,
    dto: UpdateDeliveryPlatformConfigDto,
  ): Promise<DeliveryPlatformConfig> {
    const current = await this.getDeliveryPlatformConfig();
    const nextConfig: DeliveryPlatformConfig = {
      ...current,
      ...(typeof dto.agencyCommissionRatePct === 'number'
        ? { agencyCommissionRatePct: dto.agencyCommissionRatePct }
        : {}),
      ...(typeof dto.independentCourierCommissionRatePct === 'number'
        ? { independentCourierCommissionRatePct: dto.independentCourierCommissionRatePct }
        : {}),
      ...(typeof dto.sellerPersonalCourierCommissionRatePct === 'number'
        ? { sellerPersonalCourierCommissionRatePct: dto.sellerPersonalCourierCommissionRatePct }
        : {}),
      ...(typeof dto.conformityWindowHours === 'number'
        ? { conformityWindowHours: dto.conformityWindowHours }
        : {}),
      ...(typeof dto.manualAdminPayoutApprovalRequired === 'boolean'
        ? { manualAdminPayoutApprovalRequired: dto.manualAdminPayoutApprovalRequired }
        : {}),
      // D1 : Aucun payout automatique réel ne peut être activé
      autoPspPayoutEnabled: false,
      ...(typeof dto.codAllowedForPublicMissions === 'boolean'
        ? { codAllowedForPublicMissions: dto.codAllowedForPublicMissions }
        : {}),
      ...(typeof dto.codAllowedForInterurban === 'boolean'
        ? { codAllowedForInterurban: dto.codAllowedForInterurban }
        : {}),
      ...(typeof dto.allowOccasionalInterurbanCarrierWithoutAccount === 'boolean'
        ? {
            allowOccasionalInterurbanCarrierWithoutAccount:
              dto.allowOccasionalInterurbanCarrierWithoutAccount,
          }
        : {}),
    };

    const existingRow = await this.prisma.platformSettings.findUnique({
      where: { id: 'global' },
    });
    const baseData =
      existingRow?.data && typeof existingRow.data === 'object'
        ? (existingRow.data as Record<string, any>)
        : {};

    await this.prisma.platformSettings.upsert({
      where: { id: 'global' },
      update: {
        data: { ...baseData, deliveryConfig: nextConfig } as unknown as Prisma.InputJsonValue,
        updatedById: adminUserId,
      },
      create: {
        id: 'global',
        data: { ...baseData, deliveryConfig: nextConfig } as unknown as Prisma.InputJsonValue,
        updatedById: adminUserId,
      },
    });

    return nextConfig;
  }

  // ==========================================================================
  // 1. RÉFÉRENTIEL GÉOGRAPHIQUE BÉNIN, ZONES, GARES & RÈGLES TARIFAIRES
  // ==========================================================================

  async seedBeninReferenceDataIfEmpty() {
    const existingZonesCount = await this.prisma.deliveryZone.count();
    if (existingZonesCount > 0) return;

    this.logger.log('Initialisation des zones, gares et règles tarifaires du Bénin...');

    const zoneMap = new Map<string, string>();
    for (const c of BENIN_COMMUNES_DATA) {
      const zone = await this.prisma.deliveryZone.upsert({
        where: { code: c.zoneCode },
        update: {},
        create: {
          code: c.zoneCode,
          name: `${c.commune} (${c.department})`,
          department: c.department,
          commune: c.commune,
          zoneType: c.zoneType,
          latitude: c.latitude,
          longitude: c.longitude,
          isActive: true,
        },
      });
      zoneMap.set(c.zoneCode, zone.id);
    }

    for (const st of BENIN_STATIONS_DATA) {
      const zoneId = zoneMap.get(st.zoneCode) ?? null;
      await this.prisma.station.upsert({
        where: { code: st.code },
        update: {},
        create: {
          code: st.code,
          name: st.name,
          carrierCompany: st.carrierCompany,
          department: st.department,
          commune: st.commune,
          quartier: st.quartier,
          address: st.address,
          landmark: st.landmark,
          contactPhone: st.contactPhone,
          openingHours: st.openingHours,
          latitude: st.latitude,
          longitude: st.longitude,
          zoneId,
          isActive: true,
        },
      });
    }

    const cotonouZoneId = zoneMap.get('BJ-LIT-COT');
    const calaviZoneId = zoneMap.get('BJ-ATL-CAL');
    const portoNovoZoneId = zoneMap.get('BJ-OUE-PNV');
    const parakouZoneId = zoneMap.get('BJ-BOR-PAR');

    if (cotonouZoneId) {
      await this.prisma.deliveryRateRule.createMany({
        data: [
          {
            name: 'Cotonou Intra-Urbain Domicile',
            originZoneId: cotonouZoneId,
            destinationZoneId: cotonouZoneId,
            deliveryMode: DeliveryMode.HOME,
            packageSize: PackageSize.STANDARD,
            basePriceFcfa: new Prisma.Decimal(1000),
            agencyFeeSharePct: new Prisma.Decimal(90),
            estimatedMinHours: 1,
            estimatedMaxHours: 4,
          },
          ...(calaviZoneId
            ? [
                {
                  name: 'Cotonou ↔ Abomey-Calavi Domicile',
                  originZoneId: cotonouZoneId,
                  destinationZoneId: calaviZoneId,
                  deliveryMode: DeliveryMode.HOME,
                  packageSize: PackageSize.STANDARD,
                  basePriceFcfa: new Prisma.Decimal(1500),
                  agencyFeeSharePct: new Prisma.Decimal(90),
                  estimatedMinHours: 2,
                  estimatedMaxHours: 6,
                },
              ]
            : []),
          ...(portoNovoZoneId
            ? [
                {
                  name: 'Cotonou ↔ Porto-Novo Domicile',
                  originZoneId: cotonouZoneId,
                  destinationZoneId: portoNovoZoneId,
                  deliveryMode: DeliveryMode.HOME,
                  packageSize: PackageSize.STANDARD,
                  basePriceFcfa: new Prisma.Decimal(2000),
                  agencyFeeSharePct: new Prisma.Decimal(90),
                  estimatedMinHours: 3,
                  estimatedMaxHours: 12,
                },
              ]
            : []),
          ...(parakouZoneId
            ? [
                {
                  name: 'Cotonou ↔ Parakou Retrait Gare Interurbain',
                  originZoneId: cotonouZoneId,
                  destinationZoneId: parakouZoneId,
                  deliveryMode: DeliveryMode.INTERURBAN_STATION,
                  packageSize: PackageSize.STANDARD,
                  basePriceFcfa: new Prisma.Decimal(2500),
                  agencyFeeSharePct: new Prisma.Decimal(90),
                  estimatedMinHours: 8,
                  estimatedMaxHours: 24,
                },
                {
                  name: 'Cotonou ↔ Parakou Interurbain + Domicile',
                  originZoneId: cotonouZoneId,
                  destinationZoneId: parakouZoneId,
                  deliveryMode: DeliveryMode.INTERURBAN_HOME,
                  packageSize: PackageSize.STANDARD,
                  basePriceFcfa: new Prisma.Decimal(3500),
                  agencyFeeSharePct: new Prisma.Decimal(90),
                  estimatedMinHours: 10,
                  estimatedMaxHours: 30,
                },
              ]
            : []),
        ],
      });
    }
  }

  async getGeographyCatalog() {
    const [zones, stations] = await Promise.all([
      this.prisma.deliveryZone.findMany({
        where: { isActive: true },
        orderBy: [{ department: 'asc' }, { commune: 'asc' }],
      }),
      this.prisma.station.findMany({
        where: { isActive: true },
        orderBy: [{ commune: 'asc' }, { name: 'asc' }],
      }),
    ]);

    return {
      country: 'Bénin',
      departments: BENIN_DEPARTMENTS,
      communes: BENIN_COMMUNES_DATA,
      zones,
      stations,
    };
  }

  // ==========================================================================
  // 2. DEVIS DE LIVRAISON & ARTICULATION AVEC LES DELIVERY PACKS VENDEUR
  // ==========================================================================

  async calculateQuote(dto: CalculateDeliveryQuoteDto) {
    let originCommune = dto.originCommune || 'Cotonou';

    if (dto.boutiqueId) {
      const boutique = await this.prisma.boutique.findUnique({
        where: { id: dto.boutiqueId },
        select: { city: true, deliveryPacks: true },
      });
      if (boutique?.city) {
        originCommune = boutique.city;
      }
    }

    const originZone = await this.prisma.deliveryZone.findFirst({
      where: {
        commune: { equals: originCommune, mode: 'insensitive' },
        isActive: true,
      },
    });

    const destinationZone = await this.prisma.deliveryZone.findFirst({
      where: {
        commune: { equals: dto.destinationCommune, mode: 'insensitive' },
        isActive: true,
      },
    });

    const packageSize = dto.packageSize ?? PackageSize.STANDARD;

    // Recherche d'une règle tarifaire exacte en base
    let matchedRule =
      originZone && destinationZone
        ? await this.prisma.deliveryRateRule.findFirst({
            where: {
              originZoneId: originZone.id,
              destinationZoneId: destinationZone.id,
              deliveryMode: dto.deliveryMode,
              isActive: true,
            },
          })
        : null;

    // Calcul du tarif de base en FCFA selon la zone et le mode
    let baseFeeFcfa = matchedRule ? Number(matchedRule.basePriceFcfa) : 0;

    if (!matchedRule) {
      const sameCommune =
        originCommune.trim().toLowerCase() === dto.destinationCommune.trim().toLowerCase();
      const destMeta = BENIN_COMMUNES_DATA.find(
        (c) => c.commune.toLowerCase() === dto.destinationCommune.trim().toLowerCase(),
      );

      if (dto.deliveryMode === DeliveryMode.SELLER_SELF) {
        baseFeeFcfa = dto.selectedPackPrice ?? 1000;
      } else if (sameCommune) {
        baseFeeFcfa = dto.deliveryMode === DeliveryMode.STATION_PICKUP ? 700 : 1000;
      } else if (destMeta?.zoneType === 'PERIURBAN') {
        baseFeeFcfa = dto.deliveryMode === DeliveryMode.STATION_PICKUP ? 1000 : 1500;
      } else {
        // Interurbain (ex: Parakou, Bohicon, Abomey, Natitingou...)
        baseFeeFcfa =
          dto.deliveryMode === DeliveryMode.INTERURBAN_STATION ||
          dto.deliveryMode === DeliveryMode.STATION_PICKUP
            ? 2500
            : 3500;
      }
    }

    // Ajustement selon le gabarit du colis
    const sizeMultiplier: Record<PackageSize, number> = {
      SMALL: 1.0,
      STANDARD: 1.0,
      LARGE: 1.5,
      FRAGILE: 1.3,
    };
    const quotedFeeFcfa = Math.round((baseFeeFcfa * sizeMultiplier[packageSize]) / 50) * 50;

    // Articulation avec les deliveryPacks vendeur (anti-double-facturation)
    const hasSellerPack = typeof dto.selectedPackPrice === 'number';
    const isFeeIncludedInPack = hasSellerPack && dto.selectedPackPrice === 0;
    const chargedToBuyerFcfa = hasSellerPack ? dto.selectedPackPrice! : quotedFeeFcfa;
    const sellerSubsidyFcfa = Math.max(0, quotedFeeFcfa - chargedToBuyerFcfa);

    const isInterurban =
      dto.deliveryMode === DeliveryMode.INTERURBAN_STATION ||
      dto.deliveryMode === DeliveryMode.INTERURBAN_HOME ||
      destinationZone?.zoneType === 'INTERURBAN';

    const recommendedStations = await this.prisma.station.findMany({
      where: {
        commune: { equals: dto.destinationCommune, mode: 'insensitive' },
        isActive: true,
      },
    });

    return {
      originCommune,
      destinationDepartment: dto.destinationDepartment,
      destinationCommune: dto.destinationCommune,
      deliveryMode: dto.deliveryMode,
      packageSize,
      isInterurban,
      quotedFeeFcfa,
      chargedToBuyerFcfa,
      sellerSubsidyFcfa,
      isFeeIncludedInPack,
      estimatedMinHours: matchedRule?.estimatedMinHours ?? (isInterurban ? 8 : 2),
      estimatedMaxHours: matchedRule?.estimatedMaxHours ?? (isInterurban ? 24 : 6),
      recommendedStations,
    };
  }

  // ==========================================================================
  // 3. SNAPSHOT D'ADRESSE BÉNINOISE & QUALIFICATION DE PRÉCISION
  // ==========================================================================

  qualifyAddressPrecision(
    locationSource?: AddressLocationSource,
    latitude?: number,
    longitude?: number,
    accuracyMeters?: number,
  ): {
    source: AddressLocationSource;
    precision: AddressPrecisionLevel;
  } {
    const hasCoords =
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      !Number.isNaN(latitude) &&
      !Number.isNaN(longitude);

    if (
      hasCoords &&
      locationSource === AddressLocationSource.GPS_CONFIRMED &&
      (accuracyMeters === undefined || accuracyMeters <= 150)
    ) {
      return {
        source: AddressLocationSource.GPS_CONFIRMED,
        precision: AddressPrecisionLevel.EXACT_GPS,
      };
    }

    if (hasCoords && locationSource === AddressLocationSource.OSM_PIN) {
      return {
        source: AddressLocationSource.OSM_PIN,
        precision: AddressPrecisionLevel.PIN_CONFIRMED,
      };
    }

    return {
      source: AddressLocationSource.MANUAL_APPROXIMATE,
      precision: AddressPrecisionLevel.LANDMARK_TEXT,
    };
  }

  async createAddressSnapshot(dto: CreateAddressSnapshotDto, userId?: string | null) {
    const { source, precision } = this.qualifyAddressPrecision(
      dto.locationSource,
      dto.latitude,
      dto.longitude,
      dto.accuracyMeters,
    );

    return this.prisma.addressSnapshot.create({
      data: {
        userId: userId ?? null,
        country: 'Bénin',
        department: dto.department.trim(),
        commune: dto.commune.trim(),
        arrondissement: dto.arrondissement?.trim() || null,
        quartier: dto.quartier.trim(),
        streetOrLandmark: dto.streetOrLandmark.trim(),
        deliveryInstructions: dto.deliveryInstructions?.trim() || null,
        recipientName: dto.recipientName?.trim() || null,
        contactPhone: dto.contactPhone.trim(),
        secondaryPhone: dto.secondaryPhone?.trim() || null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        accuracyMeters: dto.accuracyMeters ?? null,
        locationSource: source,
        precisionLevel: precision,
        confirmedByCustomer: dto.confirmedByCustomer ?? true,
      },
    });
  }

  // ==========================================================================
  // 4. CRÉATION D'EXPÉDITION (SHIPMENT), SEGMENTS (LEGS) & ALLOCATIONS FINANCIÈRES
  // ==========================================================================

  private generateShipmentReference(): string {
    const time = Date.now().toString(36).toUpperCase();
    const rand = randomBytes(2).toString('hex').toUpperCase();
    return `SHP-${time}-${rand}`;
  }

  private generateMissionReference(): string {
    const time = Date.now().toString(36).toUpperCase();
    const rand = randomBytes(2).toString('hex').toUpperCase();
    return `MSN-${time}-${rand}`;
  }

  private generateDisputeReference(): string {
    const time = Date.now().toString(36).toUpperCase();
    const rand = randomBytes(2).toString('hex').toUpperCase();
    return `DSP-${time}-${rand}`;
  }

  private hashTokenOrCode(plain: string): string {
    return createHash('sha256').update(plain.trim()).digest('hex');
  }

  private generateSixDigitDeliveryCode(): {
    plainCode: string;
    codeHash: string;
    codeCipher: string;
    expiresAt: Date;
  } {
    const plainCode = String(randomInt(100000, 999999));
    const codeHash = this.hashTokenOrCode(plainCode);
    const codeCipher = MessageCrypto.encrypt(plainCode);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 jours
    return { plainCode, codeHash, codeCipher, expiresAt };
  }

  async createOrGetShipmentForOrder(
    dto: CreateShipmentFromOrderDto,
    actorId?: string | null,
    actorRole = 'SYSTEM',
  ) {
    const existing = await this.prisma.shipment.findFirst({
      where: { orderId: dto.orderId },
      include: {
        originAddress: true,
        destinationAddress: true,
        destinationStation: true,
        legs: { orderBy: { sequence: 'asc' } },
        missions: true,
        settlements: true,
      },
    });

    if (existing) {
      return {
        ...existing,
        initialBuyerDeliveryCode: existing.deliveryCodeCipher
          ? MessageCrypto.decrypt(existing.deliveryCodeCipher)
          : '',
        initialGuestTrackingToken: null as string | null,
      };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        boutique: true,
        items: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Commande introuvable pour créer l’expédition.');
    }

    // Adresse d'origine (boutique)
    const originAddress = await this.prisma.addressSnapshot.create({
      data: {
        userId: order.boutique.ownerId,
        country: order.boutique.country || 'Bénin',
        department: 'Littoral',
        commune: order.boutique.city || 'Cotonou',
        quartier: 'Boutique ' + order.boutique.name,
        streetOrLandmark: order.boutique.deliveryNote || `Boutique ${order.boutique.name}`,
        recipientName: order.boutique.name,
        contactPhone: order.boutique.phone || order.boutique.whatsappNumber || '+22900000000',
        locationSource: AddressLocationSource.MANUAL_APPROXIMATE,
        precisionLevel: AddressPrecisionLevel.LANDMARK_TEXT,
        confirmedByCustomer: true,
      },
    });

    // Adresse de destination (client)
    let destinationAddressId: string | null = null;
    if (dto.destinationAddress) {
      const snap = await this.createAddressSnapshot(dto.destinationAddress, order.userId);
      destinationAddressId = snap.id;
    } else {
      const snap = await this.prisma.addressSnapshot.create({
        data: {
          userId: order.userId,
          country: order.country || 'Bénin',
          department:
            order.city?.toLowerCase() === 'parakou'
              ? 'Borgou'
              : order.city?.toLowerCase() === 'porto-novo'
                ? 'Ouémé'
                : order.city?.toLowerCase() === 'abomey-calavi'
                  ? 'Atlantique'
                  : 'Littoral',
          commune: order.city || 'Cotonou',
          quartier: order.city || 'Cotonou',
          streetOrLandmark: order.address || 'Adresse communiquée lors de la commande',
          deliveryInstructions: order.notes || null,
          recipientName: order.customerName,
          contactPhone: order.customerPhone,
          locationSource: AddressLocationSource.MANUAL_APPROXIMATE,
          precisionLevel: AddressPrecisionLevel.LANDMARK_TEXT,
          confirmedByCustomer: true,
        },
      });
      destinationAddressId = snap.id;
    }

    const destSnap = await this.prisma.addressSnapshot.findUniqueOrThrow({
      where: { id: destinationAddressId },
    });

    const deliveryMode =
      dto.deliveryMode ??
      (dto.destinationStationId
        ? DeliveryMode.INTERURBAN_STATION
        : destSnap.commune.toLowerCase() !== (order.boutique.city || 'Cotonou').toLowerCase() &&
            !['cotonou', 'abomey-calavi', 'sèmè-kpodji'].includes(destSnap.commune.toLowerCase())
          ? DeliveryMode.INTERURBAN_HOME
          : DeliveryMode.HOME);

    // Décision D2 : Interdiction du paiement à la livraison (COD) pour l'interurbain
    const platformConfig = await this.getDeliveryPlatformConfig();
    if (
      order.paymentMethod === PaymentMethod.CASH_ON_DELIVERY &&
      (deliveryMode === DeliveryMode.INTERURBAN_STATION ||
        deliveryMode === DeliveryMode.INTERURBAN_HOME) &&
      !platformConfig.codAllowedForInterurban
    ) {
      throw new BadRequestException(
        'Décision D2 : Le paiement à la livraison (COD) est désactivé pour les livraisons interurbaines. Le prépaiement est obligatoire.',
      );
    }

    const quote = await this.calculateQuote({
      boutiqueId: order.boutiqueId,
      originCommune: order.boutique.city || 'Cotonou',
      destinationDepartment: destSnap.department,
      destinationCommune: destSnap.commune,
      destinationQuartier: destSnap.quartier,
      deliveryMode,
      packageSize: dto.packageCategory ?? PackageSize.STANDARD,
      selectedPackPrice: Number(order.deliveryPrice),
    });

    const { plainCode, codeHash, codeCipher, expiresAt } = this.generateSixDigitDeliveryCode();
    const rawGuestToken = randomBytes(24).toString('hex');
    const guestTrackingTokenHash = this.hashTokenOrCode(rawGuestToken);

    const itemsSubtotal = Math.max(
      0,
      Number(order.total) + Number(order.pointsUsed || 0) - Number(order.deliveryPrice || 0),
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          reference: this.generateShipmentReference(),
          orderId: order.id,
          boutiqueId: order.boutiqueId,
          customerUserId: order.userId,
          status:
            order.status === OrderStatus.PAID || order.status === OrderStatus.WHATSAPP_CONFIRMED
              ? ShipmentStatus.READY_FOR_DISPATCH
              : ShipmentStatus.AWAITING_PREPARATION,
          deliveryMode,
          originAddressId: originAddress.id,
          destinationAddressId: destSnap.id,
          destinationStationId: dto.destinationStationId ?? null,
          packageCategory: dto.packageCategory ?? PackageSize.STANDARD,
          packageDescription:
            dto.packageDescription ||
            order.items.map((i) => `${i.quantity}x ${i.productName}`).join(', '),
          declaredValueFcfa: new Prisma.Decimal(itemsSubtotal),
          isFragile: dto.isFragile ?? false,
          quotedFeeFcfa: new Prisma.Decimal(quote.quotedFeeFcfa),
          chargedToBuyerFcfa: new Prisma.Decimal(quote.chargedToBuyerFcfa),
          sellerSubsidyFcfa: new Prisma.Decimal(quote.sellerSubsidyFcfa),
          isFeeIncludedInPack: quote.isFeeIncludedInPack,
          deliveryCodeHash: codeHash,
          deliveryCodeCipher: codeCipher,
          deliveryCodeExpiresAt: expiresAt,
          guestTrackingTokenHash,
        },
      });

      // Création des segments (DeliveryLeg) : direct local ou multi-segments interurbain
      if (
        deliveryMode === DeliveryMode.INTERURBAN_STATION ||
        deliveryMode === DeliveryMode.INTERURBAN_HOME
      ) {
        const originStation = await tx.station.findFirst({
          where: {
            commune: { equals: order.boutique.city || 'Cotonou', mode: 'insensitive' },
            isActive: true,
          },
        });
        const destStation = dto.destinationStationId
          ? await tx.station.findUnique({ where: { id: dto.destinationStationId } })
          : await tx.station.findFirst({
              where: {
                commune: { equals: destSnap.commune, mode: 'insensitive' },
                isActive: true,
              },
            });

        // Segment 1 : Collecte chez le vendeur -> Gare de départ
        await tx.deliveryLeg.create({
          data: {
            shipmentId: shipment.id,
            sequence: 1,
            legType: DeliveryLegType.COLLECTION,
            status: DeliveryLegStatus.PLANNED,
            originAddressId: originAddress.id,
            destinationStationId: originStation?.id ?? null,
            agreedFeeFcfa: new Prisma.Decimal(Math.round(quote.quotedFeeFcfa * 0.3)),
          },
        });

        // Segment 2 : Transit interurbain entre gares
        await tx.deliveryLeg.create({
          data: {
            shipmentId: shipment.id,
            sequence: 2,
            legType: DeliveryLegType.INTERURBAN_TRANSIT,
            status: DeliveryLegStatus.PLANNED,
            originStationId: originStation?.id ?? null,
            destinationStationId: destStation?.id ?? null,
            carrierCompany: destStation?.carrierCompany ?? originStation?.carrierCompany ?? null,
            agreedFeeFcfa: new Prisma.Decimal(Math.round(quote.quotedFeeFcfa * 0.4)),
          },
        });

        // Segment 3 : Retrait en gare ou Dernier kilomètre jusqu'au domicile
        await tx.deliveryLeg.create({
          data: {
            shipmentId: shipment.id,
            sequence: 3,
            legType:
              deliveryMode === DeliveryMode.INTERURBAN_STATION
                ? DeliveryLegType.STATION_PICKUP
                : DeliveryLegType.LAST_MILE,
            status: DeliveryLegStatus.PLANNED,
            originStationId: destStation?.id ?? null,
            destinationAddressId: destSnap.id,
            agreedFeeFcfa: new Prisma.Decimal(Math.round(quote.quotedFeeFcfa * 0.3)),
          },
        });
      } else {
        await tx.deliveryLeg.create({
          data: {
            shipmentId: shipment.id,
            sequence: 1,
            legType:
              deliveryMode === DeliveryMode.STATION_PICKUP
                ? DeliveryLegType.STATION_PICKUP
                : DeliveryLegType.DIRECT_LOCAL,
            status: DeliveryLegStatus.PLANNED,
            originAddressId: originAddress.id,
            destinationAddressId: destSnap.id,
            destinationStationId: dto.destinationStationId ?? null,
            agreedFeeFcfa: new Prisma.Decimal(quote.quotedFeeFcfa),
          },
        });
      }

      // Création de l'allocation financière vendeur (séparée des frais de livraison !)
      const existingSellerAlloc = await tx.settlementAllocation.findFirst({
        where: {
          orderId: order.id,
          beneficiaryType: SettlementBeneficiaryType.SELLER_BOUTIQUE,
        },
      });

      if (!existingSellerAlloc) {
        const commissionRate =
          order.boutique.plan === 'enterprise'
            ? 1.5
            : order.boutique.plan === 'business'
              ? 2.0
              : 5.0;
        const commissionAmount = Number(((itemsSubtotal * commissionRate) / 100).toFixed(2));
        const netSellerProductAmount = Math.max(0, itemsSubtotal - commissionAmount);

        await tx.settlementAllocation.create({
          data: {
            orderId: order.id,
            shipmentId: shipment.id,
            beneficiaryType: SettlementBeneficiaryType.SELLER_BOUTIQUE,
            beneficiaryId: order.boutiqueId,
            grossAmountFcfa: new Prisma.Decimal(itemsSubtotal),
            commissionRate: new Prisma.Decimal(commissionRate),
            commissionAmountFcfa: new Prisma.Decimal(commissionAmount),
            netAmountFcfa: new Prisma.Decimal(netSellerProductAmount),
            status:
              order.status === OrderStatus.PAID
                ? SettlementStatus.AWAITING_DELIVERY_VERIFICATION
                : SettlementStatus.PENDING_PAYMENT,
          },
        });
      } else if (!existingSellerAlloc.shipmentId) {
        await tx.settlementAllocation.update({
          where: { id: existingSellerAlloc.id },
          data: { shipmentId: shipment.id },
        });
      }

      await tx.deliveryEvent.create({
        data: {
          shipmentId: shipment.id,
          actorId: actorId ?? null,
          actorRole,
          eventType: 'SHIPMENT_CREATED',
          newStatus: shipment.status,
          description: `Expédition ${shipment.reference} créée (${deliveryMode}).`,
        },
      });

      return tx.shipment.findUniqueOrThrow({
        where: { id: shipment.id },
        include: {
          originAddress: true,
          destinationAddress: true,
          destinationStation: true,
          legs: { orderBy: { sequence: 'asc' } },
          missions: true,
          settlements: true,
        },
      });
    });

    return {
      ...created,
      // Renvoyé uniquement à la création initiale pour permettre au client ou invité de suivre
      initialBuyerDeliveryCode: plainCode,
      initialGuestTrackingToken: rawGuestToken,
    };
  }

  // ==========================================================================
  // 5. ENREGISTREMENT & VÉRIFICATION KYC DES AGENCES ET LIVREURS (RÈGLES 4, 5, 6, 7)
  // ==========================================================================

  private slugify(text: string): string {
    return (
      text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      randomBytes(2).toString('hex')
    );
  }

  async registerAgency(userId: string, dto: RegisterAgencyDto) {
    const existingByName = await this.prisma.deliveryAgency.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existingByName) {
      throw new ConflictException('Une agence de livraison porte déjà ce nom.');
    }

    return this.prisma.deliveryAgency.create({
      data: {
        name: dto.name.trim(),
        slug: this.slugify(dto.name),
        ownerId: userId,
        phone: dto.phone.trim(),
        whatsappNumber: dto.whatsappNumber?.trim() || null,
        email: dto.email?.trim() || null,
        department: dto.department.trim(),
        commune: dto.commune.trim(),
        address: dto.address?.trim() || null,
        description: dto.description?.trim() || null,
        rccmNumber: dto.rccmNumber?.trim() || null,
        ifuNumber: dto.ifuNumber?.trim() || null,
        idDocumentUrl: dto.idDocumentUrl || null,
        coveredCommunes: dto.coveredCommunes?.length ? dto.coveredCommunes : [dto.commune.trim()],
        supportsInterurban: dto.supportsInterurban ?? false,
        baseRateFcfa: new Prisma.Decimal(dto.baseRateFcfa ?? 1000),
        verificationStatus: VerificationStatus.PENDING,
        status: AgencyStatus.PENDING,
      },
    });
  }

  async adminVerifyAgency(agencyId: string, adminUserId: string, dto: AdminVerifyPartnerDto) {
    const agency = await this.prisma.deliveryAgency.findUnique({ where: { id: agencyId } });
    if (!agency) throw new NotFoundException('Agence introuvable.');

    const newStatus =
      dto.verificationStatus === VerificationStatus.VERIFIED
        ? AgencyStatus.ACTIVE
        : dto.verificationStatus === VerificationStatus.REJECTED
          ? AgencyStatus.SUSPENDED
          : agency.status;

    return this.prisma.deliveryAgency.update({
      where: { id: agencyId },
      data: {
        verificationStatus: dto.verificationStatus,
        status: newStatus,
      },
    });
  }

  async registerCourierProfile(userId: string, dto: RegisterCourierProfileDto) {
    const existing = await this.prisma.courierProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      return this.prisma.courierProfile.update({
        where: { userId },
        data: {
          displayName: dto.displayName.trim(),
          phone: dto.phone.trim(),
          whatsappNumber: dto.whatsappNumber?.trim() || null,
          department: dto.department.trim(),
          commune: dto.commune.trim(),
          vehicleType: dto.vehicleType ?? existing.vehicleType,
          plateNumber: dto.plateNumber?.trim() ?? existing.plateNumber,
          idDocumentType: dto.idDocumentType ?? existing.idDocumentType,
          idDocumentNumber: dto.idDocumentNumber ?? existing.idDocumentNumber,
          idDocumentUrl: dto.idDocumentUrl ?? existing.idDocumentUrl,
          selfieUrl: dto.selfieUrl ?? existing.selfieUrl,
          coveredCommunes: dto.coveredCommunes?.length
            ? dto.coveredCommunes
            : existing.coveredCommunes,
        },
      });
    }

    return this.prisma.courierProfile.create({
      data: {
        userId,
        courierType: CourierType.INDEPENDENT,
        displayName: dto.displayName.trim(),
        phone: dto.phone.trim(),
        whatsappNumber: dto.whatsappNumber?.trim() || null,
        department: dto.department.trim(),
        commune: dto.commune.trim(),
        vehicleType: dto.vehicleType,
        plateNumber: dto.plateNumber?.trim() || null,
        idDocumentType: dto.idDocumentType || null,
        idDocumentNumber: dto.idDocumentNumber || null,
        idDocumentUrl: dto.idDocumentUrl || null,
        selfieUrl: dto.selfieUrl || null,
        coveredCommunes: dto.coveredCommunes?.length ? dto.coveredCommunes : [dto.commune.trim()],
        verificationStatus: VerificationStatus.PENDING,
        status: CourierStatus.PENDING,
      },
    });
  }

  async adminVerifyCourier(
    courierProfileId: string,
    adminUserId: string,
    dto: AdminVerifyPartnerDto,
  ) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { id: courierProfileId },
    });
    if (!courier) throw new NotFoundException('Profil livreur introuvable.');

    const newStatus =
      dto.verificationStatus === VerificationStatus.VERIFIED
        ? CourierStatus.ACTIVE
        : dto.verificationStatus === VerificationStatus.REJECTED
          ? CourierStatus.SUSPENDED
          : courier.status;

    return this.prisma.courierProfile.update({
      where: { id: courierProfileId },
      data: {
        verificationStatus: dto.verificationStatus,
        status: newStatus,
      },
    });
  }

  /**
   * Rattachement exclusif d'un livreur à une agence :
   * - Un livreur ne peut avoir qu'un seul rattachement ACTIVE à la fois.
   * - Dès qu'il est rattaché à une agence, son courierType passe à AGENCY_MEMBER
   *   et il perd immédiatement tout accès aux missions publiques.
   */
  async attachCourierToAgency(
    agencyId: string,
    agencyOwnerUserId: string,
    dto: AttachCourierToAgencyDto,
    isAdmin = false,
  ) {
    const agency = await this.prisma.deliveryAgency.findUnique({
      where: { id: agencyId },
    });
    if (!agency) throw new NotFoundException('Agence introuvable.');
    if (!isAdmin && agency.ownerId !== agencyOwnerUserId) {
      throw new ForbiddenException('Vous n’êtes pas gestionnaire de cette agence.');
    }

    const courier = await this.prisma.courierProfile.findUnique({
      where: { id: dto.courierProfileId },
      include: {
        memberships: {
          where: { status: AgencyMembershipStatus.ACTIVE },
        },
      },
    });
    if (!courier) throw new NotFoundException('Profil livreur introuvable.');

    const otherActiveMembership = courier.memberships.find((m) => m.agencyId !== agencyId);
    if (otherActiveMembership) {
      throw new ConflictException(
        'Ce livreur est déjà rattaché activement à une autre agence. Un livreur ne peut appartenir qu’à une seule agence active.',
      );
    }

    // Vérifier qu'il n'a pas de mission publique indépendante en cours
    const activeIndependentMission = await this.prisma.deliveryMission.findFirst({
      where: {
        courierProfileId: courier.id,
        missionMode: DispatchMode.PUBLIC_POOL,
        status: {
          in: [
            DeliveryMissionStatus.ACCEPTED,
            DeliveryMissionStatus.COLLECTING,
            DeliveryMissionStatus.CARRYING,
            DeliveryMissionStatus.HANDOVER_PENDING,
          ],
        },
      },
    });
    if (activeIndependentMission) {
      throw new ConflictException(
        'Ce livreur a une mission publique indépendante en cours. Elle doit être terminée avant le rattachement à une agence.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.agencyMembership.upsert({
        where: {
          agencyId_courierProfileId: {
            agencyId,
            courierProfileId: courier.id,
          },
        },
        update: {
          status: AgencyMembershipStatus.ACTIVE,
          canBeRequestedBySeller: dto.canBeRequestedBySeller ?? true,
          joinedAt: new Date(),
          detachedAt: null,
        },
        create: {
          agencyId,
          courierProfileId: courier.id,
          status: AgencyMembershipStatus.ACTIVE,
          canBeRequestedBySeller: dto.canBeRequestedBySeller ?? true,
          invitedByUserId: agencyOwnerUserId,
          joinedAt: new Date(),
        },
      });

      await tx.courierProfile.update({
        where: { id: courier.id },
        data: {
          courierType: CourierType.AGENCY_MEMBER,
          activeAgencyId: agencyId,
        },
      });

      return membership;
    });
  }

  /**
   * Détachement d'un livreur d'agence :
   * Interdit tant qu'une mission active d'agence est en cours.
   */
  async detachCourierFromAgency(
    agencyId: string,
    courierProfileId: string,
    actorUserId: string,
    isAdmin = false,
  ) {
    const agency = await this.prisma.deliveryAgency.findUnique({ where: { id: agencyId } });
    if (!agency) throw new NotFoundException('Agence introuvable.');
    if (!isAdmin && agency.ownerId !== actorUserId) {
      throw new ForbiddenException('Non autorisé à détacher ce livreur.');
    }

    const activeAgencyMission = await this.prisma.deliveryMission.findFirst({
      where: {
        agencyId,
        courierProfileId,
        status: {
          in: [
            DeliveryMissionStatus.ASSIGNED,
            DeliveryMissionStatus.ACCEPTED,
            DeliveryMissionStatus.COLLECTING,
            DeliveryMissionStatus.CARRYING,
            DeliveryMissionStatus.HANDOVER_PENDING,
          ],
        },
      },
    });

    if (activeAgencyMission) {
      throw new ConflictException(
        'Impossible de détacher ce livreur tant qu’il possède une mission d’agence en cours.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.agencyMembership.updateMany({
        where: { agencyId, courierProfileId, status: AgencyMembershipStatus.ACTIVE },
        data: {
          status: AgencyMembershipStatus.DETACHED,
          detachedAt: new Date(),
        },
      });

      await tx.courierProfile.update({
        where: { id: courierProfileId },
        data: {
          courierType: CourierType.INDEPENDENT,
          activeAgencyId: null,
        },
      });

      return { detached: true };
    });
  }

  // ==========================================================================
  // 6. ATTRIBUTION DES MISSIONS : VENDEUR, AGENCE & POOL PUBLIC ATOMIQUE
  // ==========================================================================

  /**
   * Le vendeur choisit le mode d'expédition pour un Shipment :
   * 1. SELLER_PERSONAL_COURIER : livreur personnel désigné par le vendeur
   * 2. PARTNER_AGENCY : agence de livraison validée (+ optionnel : livreur préféré soumis à validation de l'agence — Règle 8)
   * 3. PUBLIC_POOL : publication dans le pool des livreurs indépendants vérifiés
   */
  async dispatchShipment(
    shipmentId: string,
    sellerUserId: string,
    dto: DispatchShipmentDto,
    isAdmin = false,
  ) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        boutique: true,
        order: true,
        originAddress: true,
        destinationAddress: true,
        legs: { orderBy: { sequence: 'asc' } },
      },
    });
    if (!shipment) throw new NotFoundException('Expédition introuvable.');
    if (!isAdmin && shipment.boutique.ownerId !== sellerUserId) {
      throw new ForbiddenException('Vous n’êtes pas propriétaire de la boutique de cette expédition.');
    }

    // Règle 3 : Vérifier qu'aucune mission active n'est déjà attribuée pour le même segment
    const existingActiveMission = await this.prisma.deliveryMission.findFirst({
      where: {
        shipmentId: shipment.id,
        status: {
          in: [
            DeliveryMissionStatus.OFFERED,
            DeliveryMissionStatus.RESERVED,
            DeliveryMissionStatus.ASSIGNED,
            DeliveryMissionStatus.ACCEPTED,
            DeliveryMissionStatus.COLLECTING,
            DeliveryMissionStatus.CARRYING,
            DeliveryMissionStatus.HANDOVER_PENDING,
          ],
        },
      },
    });
    if (existingActiveMission) {
      throw new ConflictException(
        'Une mission de livraison active existe déjà pour cette expédition. Annulez-la avant de réattribuer.',
      );
    }

    const platformConfig = await this.getDeliveryPlatformConfig();
    const isInterurbanShipment =
      shipment.deliveryMode === DeliveryMode.INTERURBAN_STATION ||
      shipment.deliveryMode === DeliveryMode.INTERURBAN_HOME;

    // Décision D2 : Maintenir le paiement à la livraison (COD) désactivé pour les missions publiques et interurbaines (prépaiement obligatoire)
    if (shipment.order.paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
      if (
        dto.dispatchMode === DispatchMode.PUBLIC_POOL &&
        !platformConfig.codAllowedForPublicMissions
      ) {
        throw new BadRequestException(
          'Décision D2 : Le paiement à la livraison (COD) est désactivé pour les missions publiques. Le prépaiement est obligatoire.',
        );
      }
      if (isInterurbanShipment && !platformConfig.codAllowedForInterurban) {
        throw new BadRequestException(
          'Décision D2 : Le paiement à la livraison (COD) est désactivé pour les livraisons interurbaines. Le prépaiement est obligatoire.',
        );
      }
    }

    if (
      (dto.dispatchMode !== DispatchMode.SELLER_PERSONAL_COURIER || isInterurbanShipment) &&
      shipment.order.status === OrderStatus.PENDING
    ) {
      throw new BadRequestException(
        'Décision D2 : Le prépaiement de la commande (statut PAID) est obligatoire avant d’attribuer une mission publique, d’agence ou interurbaine.',
      );
    }

    // Décision D3 : Taux de commission configurables distincts (Agence vs Livreur indépendant vs Livreur personnel vendeur)
    // figés sur la mission au moment de sa contractualisation (non-rétroactivité).
    const agreedFee = dto.agreedFeeFcfa ?? Number(shipment.quotedFeeFcfa);
    const appliedCommissionRatePct =
      dto.dispatchMode === DispatchMode.SELLER_PERSONAL_COURIER
        ? platformConfig.sellerPersonalCourierCommissionRatePct
        : dto.dispatchMode === DispatchMode.PARTNER_AGENCY
          ? platformConfig.agencyCommissionRatePct
          : platformConfig.independentCourierCommissionRatePct;

    const platformCommission = Math.round((agreedFee * appliedCommissionRatePct) / 100);
    const netCourierPayout = Math.max(0, agreedFee - platformCommission);

    const firstLeg = shipment.legs[0] ?? null;
    const originSummary = shipment.originAddress
      ? `${shipment.originAddress.commune} — ${shipment.originAddress.quartier}`
      : shipment.boutique.city || 'Cotonou';
    const destinationSummary = shipment.destinationAddress
      ? `${shipment.destinationAddress.commune} — ${shipment.destinationAddress.quartier} (${shipment.destinationAddress.streetOrLandmark})`
      : shipment.order.city || 'Cotonou';

    // Cas 1 : Livreur personnel du vendeur
    if (dto.dispatchMode === DispatchMode.SELLER_PERSONAL_COURIER) {
      if (!dto.personalCourierName || !dto.personalCourierPhone) {
        throw new BadRequestException(
          'Le nom et le téléphone du livreur personnel sont obligatoires.',
        );
      }
      const personalName = dto.personalCourierName.trim();
      const personalPhone = dto.personalCourierPhone.trim();

      return this.prisma.$transaction(async (tx) => {
        const mission = await tx.deliveryMission.create({
          data: {
            reference: this.generateMissionReference(),
            shipmentId: shipment.id,
            legId: firstLeg?.id ?? null,
            boutiqueId: shipment.boutiqueId,
            missionMode: DispatchMode.SELLER_PERSONAL_COURIER,
            status: DeliveryMissionStatus.ASSIGNED,
            agreedFeeFcfa: new Prisma.Decimal(agreedFee),
            appliedCommissionRatePct: new Prisma.Decimal(appliedCommissionRatePct),
            platformCommissionFcfa: new Prisma.Decimal(platformCommission),
            netCourierPayoutFcfa: new Prisma.Decimal(netCourierPayout),
            isExternalSellerPayment: dto.isExternalSellerPayment ?? true,
            originSummary,
            destinationSummary,
            acceptedAt: new Date(),
          },
        });

        const updatedShipment = await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            dispatchMode: DispatchMode.SELLER_PERSONAL_COURIER,
            status: ShipmentStatus.ASSIGNED,
            personalCourierName: personalName,
            personalCourierPhone: personalPhone,
            dispatchedAt: new Date(),
          },
        });

        await tx.order.update({
          where: { id: shipment.orderId },
          data: {
            deliveryContact: `${personalName} (${personalPhone})`,
          },
        });

        await tx.deliveryEvent.create({
          data: {
            shipmentId: shipment.id,
            missionId: mission.id,
            actorId: sellerUserId,
            actorRole: 'VENDEUR',
            eventType: 'DISPATCHED_PERSONAL_COURIER',
            oldStatus: shipment.status,
            newStatus: ShipmentStatus.ASSIGNED,
            description: `Livreur personnel désigné : ${dto.personalCourierName} (${dto.personalCourierPhone})`,
          },
        });

        return { shipment: updatedShipment, mission };
      });
    }

    // Cas 2 : Agence de livraison partenaire (Règles 7 & 8)
    if (dto.dispatchMode === DispatchMode.PARTNER_AGENCY) {
      if (!dto.agencyId) {
        throw new BadRequestException('Veuillez sélectionner une agence de livraison.');
      }

      const agency = await this.prisma.deliveryAgency.findUnique({
        where: { id: dto.agencyId },
      });
      if (!agency) {
        throw new NotFoundException('Agence de livraison introuvable.');
      }
      // Règle 7 : Les agences doivent être validées avant de proposer leurs services
      if (
        agency.verificationStatus !== VerificationStatus.VERIFIED ||
        agency.status !== AgencyStatus.ACTIVE
      ) {
        throw new BadRequestException(
          'Cette agence de livraison n’est pas encore vérifiée ou active.',
        );
      }

      // Règle 8 : Si le vendeur demande un livreur précis, vérifier qu'il est rattaché à l'agence
      // Mais l'agence doit autoriser l'affectation !
      if (dto.requestedCourierProfileId) {
        const membership = await this.prisma.agencyMembership.findUnique({
          where: {
            agencyId_courierProfileId: {
              agencyId: agency.id,
              courierProfileId: dto.requestedCourierProfileId,
            },
          },
        });
        if (!membership || membership.status !== AgencyMembershipStatus.ACTIVE) {
          throw new BadRequestException(
            'Le livreur demandé n’est pas un membre actif de cette agence.',
          );
        }
      }

      return this.prisma.$transaction(async (tx) => {
        const mission = await tx.deliveryMission.create({
          data: {
            reference: this.generateMissionReference(),
            shipmentId: shipment.id,
            legId: firstLeg?.id ?? null,
            boutiqueId: shipment.boutiqueId,
            missionMode: DispatchMode.PARTNER_AGENCY,
            status: DeliveryMissionStatus.OFFERED,
            agencyId: agency.id,
            // Règle 8 : courierProfileId reste null tant que l'agence n'a pas approuvé !
            courierProfileId: null,
            requestedCourierProfileId: dto.requestedCourierProfileId ?? null,
            agencyApprovedPreferred: null,
            agreedFeeFcfa: new Prisma.Decimal(agreedFee),
            appliedCommissionRatePct: new Prisma.Decimal(appliedCommissionRatePct),
            platformCommissionFcfa: new Prisma.Decimal(platformCommission),
            netCourierPayoutFcfa: new Prisma.Decimal(netCourierPayout),
            isExternalSellerPayment: false,
            originSummary,
            destinationSummary,
            expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
          },
        });

        const updatedShipment = await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            dispatchMode: DispatchMode.PARTNER_AGENCY,
            status: ShipmentStatus.AWAITING_ASSIGNMENT,
            assignedAgencyId: agency.id,
            dispatchedAt: new Date(),
          },
        });

        await tx.settlementAllocation.create({
          data: {
            orderId: shipment.orderId,
            shipmentId: shipment.id,
            missionId: mission.id,
            beneficiaryType: SettlementBeneficiaryType.DELIVERY_AGENCY,
            beneficiaryId: agency.id,
            grossAmountFcfa: new Prisma.Decimal(agreedFee),
            commissionRate: new Prisma.Decimal(appliedCommissionRatePct),
            commissionAmountFcfa: new Prisma.Decimal(platformCommission),
            netAmountFcfa: new Prisma.Decimal(netCourierPayout),
            status: SettlementStatus.AWAITING_DELIVERY_VERIFICATION,
          },
        });

        await tx.deliveryEvent.create({
          data: {
            shipmentId: shipment.id,
            missionId: mission.id,
            actorId: sellerUserId,
            actorRole: 'VENDEUR',
            eventType: 'MISSION_OFFERED_TO_AGENCY',
            oldStatus: shipment.status,
            newStatus: ShipmentStatus.AWAITING_ASSIGNMENT,
            description: dto.requestedCourierProfileId
              ? `Mission proposée à l'agence ${agency.name} avec souhait de livreur particulier (en attente d'approbation par l'agence).`
              : `Mission proposée à l'agence ${agency.name}.`,
          },
        });

        return { shipment: updatedShipment, mission };
      });
    }

    // Cas 3 : Publication d'une mission ouverte aux livreurs indépendants vérifiés
    return this.prisma.$transaction(async (tx) => {
      const mission = await tx.deliveryMission.create({
        data: {
          reference: this.generateMissionReference(),
          shipmentId: shipment.id,
          legId: firstLeg?.id ?? null,
          boutiqueId: shipment.boutiqueId,
          missionMode: DispatchMode.PUBLIC_POOL,
          status: DeliveryMissionStatus.OFFERED,
          agreedFeeFcfa: new Prisma.Decimal(agreedFee),
          appliedCommissionRatePct: new Prisma.Decimal(appliedCommissionRatePct),
          platformCommissionFcfa: new Prisma.Decimal(platformCommission),
          netCourierPayoutFcfa: new Prisma.Decimal(netCourierPayout),
          isExternalSellerPayment: false,
          originSummary,
          destinationSummary,
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        },
      });

      const updatedShipment = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          dispatchMode: DispatchMode.PUBLIC_POOL,
          status: ShipmentStatus.AWAITING_ASSIGNMENT,
          dispatchedAt: new Date(),
        },
      });

      await tx.deliveryEvent.create({
        data: {
          shipmentId: shipment.id,
          missionId: mission.id,
          actorId: sellerUserId,
          actorRole: 'VENDEUR',
          eventType: 'MISSION_PUBLISHED_PUBLIC_POOL',
          oldStatus: shipment.status,
          newStatus: ShipmentStatus.AWAITING_ASSIGNMENT,
          description: `Mission ouverte publiée aux livreurs indépendants vérifiés (${agreedFee} FCFA).`,
        },
      });

      return { shipment: updatedShipment, mission };
    });
  }

  /**
   * Validation stricte qu'un utilisateur est un livreur INDÉPENDANT vérifié (Règles 4, 5, 6).
   * Un livreur d'agence est strictement bloqué ici.
   */
  private async assertVerifiedIndependentCourier(userId: string) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId },
      include: {
        memberships: {
          where: { status: AgencyMembershipStatus.ACTIVE },
        },
      },
    });

    if (!courier) {
      throw new ForbiddenException('Vous ne disposez pas d’un profil livreur.');
    }

    // Règle 4 : Un livreur d'agence ne peut consulter ni accepter aucune mission publique
    if (
      courier.courierType === CourierType.AGENCY_MEMBER ||
      courier.activeAgencyId !== null ||
      courier.memberships.length > 0
    ) {
      throw new ForbiddenException(
        'Accès refusé : un livreur rattaché à une agence ne peut ni consulter ni accepter de missions publiques indépendantes.',
      );
    }

    // Règle 6 : Les livreurs doivent être vérifiés (KYC) avant toute mission
    if (
      courier.verificationStatus !== VerificationStatus.VERIFIED ||
      courier.status !== CourierStatus.ACTIVE
    ) {
      throw new ForbiddenException(
        'Votre profil livreur doit être vérifié (KYC validé) et actif avant de pouvoir accéder aux missions.',
      );
    }

    return courier;
  }

  /**
   * Consultation des missions publiques éligibles (exclusivement pour livreurs indépendants vérifiés).
   * Masque les informations sensibles tant que la mission n'est pas acceptée.
   */
  async listPublicMissionsForIndependentCourier(userId: string) {
    const courier = await this.assertVerifiedIndependentCourier(userId);

    const missions = await this.prisma.deliveryMission.findMany({
      where: {
        missionMode: DispatchMode.PUBLIC_POOL,
        status: DeliveryMissionStatus.OFFERED,
        courierProfileId: null,
      },
      include: {
        boutique: { select: { id: true, name: true, city: true } },
        shipment: {
          select: {
            id: true,
            reference: true,
            deliveryMode: true,
            packageCategory: true,
            isFragile: true,
            originAddress: { select: { department: true, commune: true, quartier: true } },
            destinationAddress: { select: { department: true, commune: true, quartier: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      courierProfileId: courier.id,
      missions,
    };
  }

  /**
   * Acceptation ATOMIQUE d'une mission publique par un livreur indépendant vérifié (Règles 3, 4, 5, 6).
   * En cas de concurrence (ex: 10 livreurs cliquent simultanément), un seul updateMany conditionnel gagne !
   */
  async acceptPublicMission(missionId: string, courierUserId: string) {
    const courier = await this.assertVerifiedIndependentCourier(courierUserId);

    return this.prisma.$transaction(async (tx) => {
      // Verrouillage atomique conditionnel : status === OFFERED et courierProfileId === null
      const claim = await tx.deliveryMission.updateMany({
        where: {
          id: missionId,
          missionMode: DispatchMode.PUBLIC_POOL,
          status: DeliveryMissionStatus.OFFERED,
          courierProfileId: null,
        },
        data: {
          status: DeliveryMissionStatus.ACCEPTED,
          courierProfileId: courier.id,
          acceptedAt: new Date(),
        },
      });

      if (claim.count === 0) {
        throw new ConflictException(
          'Cette mission n’est plus disponible ou vient d’être attribuée à un autre livreur.',
        );
      }

      const mission = await tx.deliveryMission.findUniqueOrThrow({
        where: { id: missionId },
        include: { shipment: true },
      });

      await tx.shipment.update({
        where: { id: mission.shipmentId },
        data: {
          status: ShipmentStatus.ASSIGNED,
          assignedCourierId: courier.id,
        },
      });

      if (mission.legId) {
        await tx.deliveryLeg.update({
          where: { id: mission.legId },
          data: { status: DeliveryLegStatus.ASSIGNED },
        });
      }

      await tx.order.update({
        where: { id: mission.shipment.orderId },
        data: {
          deliveryContact: `${courier.displayName} (${courier.phone})`,
        },
      });

      // Créer l'allocation financière pour le livreur indépendant en réutilisant le taux figé à la contractualisation (Décision D3 : non-rétroactivité)
      await tx.settlementAllocation.create({
        data: {
          orderId: mission.shipment.orderId,
          shipmentId: mission.shipmentId,
          missionId: mission.id,
          beneficiaryType: SettlementBeneficiaryType.INDEPENDENT_COURIER,
          beneficiaryId: courier.id,
          grossAmountFcfa: mission.agreedFeeFcfa,
          commissionRate: mission.appliedCommissionRatePct ?? new Prisma.Decimal(10),
          commissionAmountFcfa: mission.platformCommissionFcfa,
          netAmountFcfa: mission.netCourierPayoutFcfa,
          status: SettlementStatus.AWAITING_DELIVERY_VERIFICATION,
        },
      });

      // Activer l'accès temporaire à la messagerie Client ↔ Livreur (Section 5)
      await this.activateConversationAccessInTx(
        tx,
        mission.shipment,
        mission.id,
        courier.userId,
      );

      await tx.deliveryEvent.create({
        data: {
          shipmentId: mission.shipmentId,
          missionId: mission.id,
          actorId: courierUserId,
          actorRole: 'LIVREUR_INDEPENDANT',
          eventType: 'PUBLIC_MISSION_ACCEPTED',
          oldStatus: DeliveryMissionStatus.OFFERED,
          newStatus: DeliveryMissionStatus.ACCEPTED,
          description: `Mission acceptée par le livreur indépendant vérifié ${courier.displayName}.`,
        },
      });

      return tx.deliveryMission.findUniqueOrThrow({
        where: { id: mission.id },
        include: {
          shipment: {
            include: {
              originAddress: true,
              destinationAddress: true,
              destinationStation: true,
            },
          },
        },
      });
    });
  }

  /**
   * Attribution d'une mission par une agence à l'un de ses livreurs rattachés (Règles 4, 6, 7, 8).
   * Permet aussi à l'agence de valider ou remplacer le livreur demandé par le vendeur.
   */
  async assignMissionByAgency(
    missionId: string,
    agencyOwnerUserId: string,
    dto: AssignAgencyMissionDto,
    isAdmin = false,
  ) {
    const mission = await this.prisma.deliveryMission.findUnique({
      where: { id: missionId },
      include: {
        agency: true,
        shipment: true,
      },
    });
    if (!mission || !mission.agency) {
      throw new NotFoundException('Mission d’agence introuvable.');
    }
    if (!isAdmin && mission.agency.ownerId !== agencyOwnerUserId) {
      throw new ForbiddenException('Vous n’êtes pas gestionnaire de cette agence.');
    }

    // Vérifier que le livreur choisi est bien un membre ACTIF de cette agence et vérifié (KYC)
    const membership = await this.prisma.agencyMembership.findUnique({
      where: {
        agencyId_courierProfileId: {
          agencyId: mission.agency.id,
          courierProfileId: dto.courierProfileId,
        },
      },
      include: { courierProfile: true },
    });

    if (!membership || membership.status !== AgencyMembershipStatus.ACTIVE) {
      throw new BadRequestException(
        'Ce livreur n’est pas rattaché activement à votre agence.',
      );
    }

    const courier = membership.courierProfile;
    if (
      courier.verificationStatus !== VerificationStatus.VERIFIED ||
      courier.status !== CourierStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Ce livreur d’agence doit avoir un KYC vérifié et un statut actif avant toute mission.',
      );
    }

    const approvedPreferred =
      mission.requestedCourierProfileId !== null
        ? mission.requestedCourierProfileId === courier.id
        : null;

    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.deliveryMission.updateMany({
        where: {
          id: mission.id,
          agencyId: mission.agency!.id,
          status: { in: [DeliveryMissionStatus.OFFERED, DeliveryMissionStatus.ASSIGNED] },
        },
        data: {
          status: DeliveryMissionStatus.ACCEPTED,
          courierProfileId: courier.id,
          agencyApprovedPreferred: approvedPreferred,
          acceptedAt: new Date(),
        },
      });

      if (claim.count === 0) {
        throw new ConflictException('Cette mission ne peut plus être réattribuée dans son état actuel.');
      }

      await tx.shipment.update({
        where: { id: mission.shipmentId },
        data: {
          status: ShipmentStatus.ASSIGNED,
          assignedCourierId: courier.id,
        },
      });

      if (mission.legId) {
        await tx.deliveryLeg.update({
          where: { id: mission.legId },
          data: { status: DeliveryLegStatus.ASSIGNED },
        });
      }

      await tx.order.update({
        where: { id: mission.shipment.orderId },
        data: {
          deliveryContact: `${courier.displayName} - Agence ${mission.agency!.name} (${courier.phone})`,
        },
      });

      // Activer l'accès temporaire à la messagerie Client ↔ Livreur d'agence
      await this.activateConversationAccessInTx(
        tx,
        mission.shipment,
        mission.id,
        courier.userId,
      );

      await tx.deliveryEvent.create({
        data: {
          shipmentId: mission.shipmentId,
          missionId: mission.id,
          actorId: agencyOwnerUserId,
          actorRole: 'AGENCE',
          eventType: 'AGENCY_ASSIGNED_COURIER',
          oldStatus: mission.status,
          newStatus: DeliveryMissionStatus.ACCEPTED,
          description: `L'agence ${mission.agency!.name} a attribué la mission à son livreur ${courier.displayName}.`,
        },
      });

      return tx.deliveryMission.findUniqueOrThrow({
        where: { id: mission.id },
        include: {
          courierProfile: true,
          shipment: {
            include: {
              originAddress: true,
              destinationAddress: true,
            },
          },
        },
      });
    });
  }

  /**
   * Missions d'un livreur d'agence :
   * Accès EXCLUSIVEMENT aux missions attribuées par son agence (Règle 4).
   */
  async listMyAssignedMissions(courierUserId: string) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId: courierUserId },
      include: { activeAgency: true },
    });
    if (!courier) throw new NotFoundException('Profil livreur introuvable.');

    return this.prisma.deliveryMission.findMany({
      where: {
        courierProfileId: courier.id,
        ...(courier.courierType === CourierType.AGENCY_MEMBER && courier.activeAgencyId
          ? { agencyId: courier.activeAgencyId }
          : {}),
      },
      include: {
        agency: { select: { id: true, name: true, phone: true } },
        boutique: { select: { id: true, name: true, phone: true, city: true } },
        shipment: {
          include: {
            originAddress: true,
            destinationAddress: true,
            destinationStation: true,
            legs: { orderBy: { sequence: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================================================
  // 7. COLLECTE, SEGMENTS INTERURBAINS & PREUVES DE REMISE (RÈGLES 9, 10, 11)
  // ==========================================================================

  /**
   * Enregistre une étape de transfert de responsabilité (collecte vendeur,
   * remise au transporteur interurbain sans compte obligatoire, arrivée en gare,
   * ou déclaration de tentative de remise).
   * Règle 10 : La déclaration du livreur sur DELIVERY_TO_BUYER ne suffit JAMAIS
   * à passer le colis en DELIVERED_VERIFIED ! Elle le place uniquement en
   * DELIVERY_PENDING_VERIFICATION.
   */
  async recordHandoverEvidence(
    shipmentId: string,
    actorUserId: string,
    actorRole: string,
    dto: RecordHandoverEvidenceDto,
  ) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        missions: true,
        legs: { orderBy: { sequence: 'asc' } },
        assignedCourier: true,
      },
    });
    if (!shipment) throw new NotFoundException('Expédition introuvable.');

    return this.prisma.$transaction(async (tx) => {
      const evidence = await tx.handoverEvidence.create({
        data: {
          shipmentId: shipment.id,
          legId: dto.legId ?? null,
          missionId: dto.missionId ?? null,
          step: dto.step,
          actorUserId,
          actorRole,
          verificationMethod: dto.verificationMethod ?? VerificationMethod.PHOTO_DECLARATION,
          codeVerified: false,
          receiptReference: dto.receiptReference?.trim() || null,
          carrierCompany: dto.carrierCompany?.trim() || null,
          driverPhone: dto.driverPhone?.trim() || null,
          photoUrl: dto.photoUrl || null,
          gpsLatitude: dto.gpsLatitude ?? null,
          gpsLongitude: dto.gpsLongitude ?? null,
          gpsAccuracyMeters: dto.gpsAccuracyMeters ?? null,
          notes: dto.notes?.trim() || null,
          status: EvidenceStatus.DECLARED,
        },
      });

      let nextShipmentStatus = shipment.status;

      if (dto.step === HandoverStep.PICKUP_FROM_SELLER) {
        nextShipmentStatus = ShipmentStatus.PICKED_UP;
        await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            status: ShipmentStatus.PICKED_UP,
            pickedUpAt: new Date(),
          },
        });
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: OrderStatus.SHIPPING },
        });
        if (dto.missionId) {
          await tx.deliveryMission.update({
            where: { id: dto.missionId },
            data: {
              status: DeliveryMissionStatus.CARRYING,
              pickedUpAt: new Date(),
            },
          });
        }
      } else if (dto.step === HandoverStep.HANDOVER_TO_CARRIER) {
        // Section 8 : Remise à un transporteur interurbain (chauffeur occasionnel sans compte requis)
        nextShipmentStatus = ShipmentStatus.IN_TRANSIT;
        await tx.shipment.update({
          where: { id: shipment.id },
          data: { status: ShipmentStatus.IN_TRANSIT },
        });

        const transitLeg = shipment.legs.find(
          (l) => l.legType === DeliveryLegType.INTERURBAN_TRANSIT,
        );
        if (transitLeg) {
          await tx.deliveryLeg.update({
            where: { id: transitLeg.id },
            data: {
              status: DeliveryLegStatus.HANDOVER_DECLARED,
              carrierCompany: dto.carrierCompany?.trim() || transitLeg.carrierCompany,
              carrierTicketRef: dto.receiptReference?.trim() || null,
              carrierContactPhone: dto.driverPhone?.trim() || null,
              driverName: dto.driverName?.trim() || null,
              vehicleIdentifier: dto.vehicleIdentifier?.trim() || null,
              departureTime: new Date(),
            },
          });
        }
      } else if (dto.step === HandoverStep.ARRIVAL_AT_STATION) {
        nextShipmentStatus = ShipmentStatus.ARRIVED_AT_STATION;
        await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            status: ShipmentStatus.ARRIVED_AT_STATION,
            arrivedAtStationAt: new Date(),
          },
        });

        const transitLeg = shipment.legs.find(
          (l) => l.legType === DeliveryLegType.INTERURBAN_TRANSIT,
        );
        if (transitLeg) {
          await tx.deliveryLeg.update({
            where: { id: transitLeg.id },
            data: {
              status: DeliveryLegStatus.ARRIVED_AT_STATION,
              actualArrivalAt: new Date(),
            },
          });
        }
      } else if (dto.step === HandoverStep.DELIVERY_TO_BUYER) {
        // RÈGLE 10 : La déclaration du livreur ne suffit PAS à prouver la livraison !
        // Le statut passe uniquement à DELIVERY_PENDING_VERIFICATION.
        nextShipmentStatus = ShipmentStatus.DELIVERY_PENDING_VERIFICATION;
        await tx.shipment.update({
          where: { id: shipment.id },
          data: { status: ShipmentStatus.DELIVERY_PENDING_VERIFICATION },
        });
        if (dto.missionId) {
          await tx.deliveryMission.update({
            where: { id: dto.missionId },
            data: { status: DeliveryMissionStatus.HANDOVER_PENDING },
          });
        }
      }

      await tx.deliveryEvent.create({
        data: {
          shipmentId: shipment.id,
          legId: dto.legId ?? null,
          missionId: dto.missionId ?? null,
          actorId: actorUserId,
          actorRole,
          eventType: `HANDOVER_${dto.step}`,
          oldStatus: shipment.status,
          newStatus: nextShipmentStatus,
          description:
            dto.notes ||
            `Étape ${dto.step} déclarée${dto.receiptReference ? ` (Réf: ${dto.receiptReference})` : ''}.`,
        },
      });

      return {
        evidence,
        shipmentStatus: nextShipmentStatus,
      };
    });
  }

  /**
   * Vérification de remise par le CODE À USAGE UNIQUE du client (Règles 10, 11, 12 + Section 5).
   * - Vérifie le verrouillage anti-brute-force (max 5 tentatives).
   * - Compare le hash SHA-256 en temps constant.
   * - Passe le Shipment à DELIVERED_VERIFIED (et non BUYER_ACCEPTED : Règle 11).
   * - Ouvre la fenêtre de conformité produit de 24h pour le vendeur.
   * - Rend la rémunération du prestataire de livraison ELIGIBLE_FOR_RELEASE immédiatement (Règle 12).
   * - Révoque IMMÉDIATEMENT les droits d'écriture de la messagerie Client ↔ Livreur (Section 5).
   */
  async verifyDeliveryByBuyerCode(
    shipmentId: string,
    actorUserId: string,
    dto: VerifyDeliveryCodeDto,
  ) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        missions: true,
        settlements: true,
      },
    });
    if (!shipment) throw new NotFoundException('Expédition introuvable.');

    if (
      shipment.status === ShipmentStatus.DELIVERED_VERIFIED ||
      shipment.status === ShipmentStatus.BUYER_ACCEPTED
    ) {
      throw new ConflictException('La livraison de ce colis a déjà été vérifiée.');
    }

    if (
      shipment.deliveryCodeLockedUntil &&
      shipment.deliveryCodeLockedUntil.getTime() > Date.now()
    ) {
      throw new ForbiddenException(
        'Trop de tentatives erronées. La vérification par code est temporairement verrouillée pendant 15 minutes.',
      );
    }

    if (!shipment.deliveryCodeHash) {
      throw new BadRequestException('Aucun code de remise actif sur cette expédition.');
    }

    const candidateHash = this.hashTokenOrCode(dto.code);
    const expectedBuf = Buffer.from(shipment.deliveryCodeHash, 'hex');
    const candidateBuf = Buffer.from(candidateHash, 'hex');
    const isMatch =
      expectedBuf.length === candidateBuf.length && timingSafeEqual(expectedBuf, candidateBuf);

    if (!isMatch) {
      const attempts = shipment.deliveryCodeAttempts + 1;
      const lockUntil =
        attempts >= MAX_DELIVERY_CODE_ATTEMPTS
          ? new Date(Date.now() + CODE_LOCKOUT_DURATION_MS)
          : null;

      await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          deliveryCodeAttempts: attempts,
          deliveryCodeLockedUntil: lockUntil,
        },
      });

      throw new BadRequestException(
        lockUntil
          ? 'Code de remise invalide. Nombre maximal d’essais atteint : blocage temporaire de 15 minutes.'
          : `Code de remise invalide (${MAX_DELIVERY_CODE_ATTEMPTS - attempts} essai(s) restant(s)).`,
      );
    }

    return this.finalizeVerifiedDelivery(
      shipment.id,
      actorUserId,
      'LIVREUR',
      VerificationMethod.BUYER_CODE,
      dto.gpsLatitude,
      dto.gpsLongitude,
      dto.gpsAccuracyMeters,
      dto.notes,
    );
  }

  /**
   * Confirmation de réception par lien invité signé (guestTrackingToken) ou par le client connecté.
   */
  async verifyDeliveryByGuestOrBuyer(
    shipmentId: string,
    dto: VerifyGuestDeliveryDto,
    authenticatedUserId?: string | null,
  ) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!shipment) throw new NotFoundException('Expédition introuvable.');

    const isOwnerBuyer =
      Boolean(authenticatedUserId) && shipment.customerUserId === authenticatedUserId;

    if (!isOwnerBuyer) {
      if (!dto.guestToken || !shipment.guestTrackingTokenHash) {
        throw new ForbiddenException('Jeton de suivi invité requis pour confirmer la réception.');
      }
      const tokenHash = this.hashTokenOrCode(dto.guestToken);
      if (tokenHash !== shipment.guestTrackingTokenHash) {
        throw new ForbiddenException('Jeton de confirmation invité invalide.');
      }
    }

    const verified = await this.finalizeVerifiedDelivery(
      shipment.id,
      authenticatedUserId ?? null,
      'CLIENT',
      VerificationMethod.SIGNED_GUEST_LINK,
      undefined,
      undefined,
      undefined,
      dto.notes,
    );

    if (dto.acceptProductConformity) {
      return this.acceptProductConformity(shipment.id, authenticatedUserId ?? null, dto.guestToken);
    }

    return verified;
  }

  private async finalizeVerifiedDelivery(
    shipmentId: string,
    actorUserId: string | null,
    actorRole: string,
    method: VerificationMethod,
    gpsLatitude?: number,
    gpsLongitude?: number,
    gpsAccuracyMeters?: number,
    notes?: string,
  ) {
    const now = new Date();
    const platformConfig = await this.getDeliveryPlatformConfig();
    const conformityWindowMs =
      (platformConfig.conformityWindowHours || 24) * 60 * 60 * 1000;
    const conformityDeadline = new Date(now.getTime() + conformityWindowMs);

    return this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUniqueOrThrow({
        where: { id: shipmentId },
        include: { missions: true, settlements: true },
      });

      const activeStatuses: DeliveryMissionStatus[] = [
        DeliveryMissionStatus.ASSIGNED,
        DeliveryMissionStatus.ACCEPTED,
        DeliveryMissionStatus.COLLECTING,
        DeliveryMissionStatus.CARRYING,
        DeliveryMissionStatus.HANDOVER_PENDING,
      ];
      const activeMission = shipment.missions.find((m) =>
        activeStatuses.includes(m.status),
      );

      // 1. Créer la preuve VÉRIFIÉE
      await tx.handoverEvidence.create({
        data: {
          shipmentId: shipment.id,
          missionId: activeMission?.id ?? null,
          step: HandoverStep.DELIVERY_TO_BUYER,
          actorUserId,
          actorRole,
          verificationMethod: method,
          codeVerified: true,
          gpsLatitude: gpsLatitude ?? null,
          gpsLongitude: gpsLongitude ?? null,
          gpsAccuracyMeters: gpsAccuracyMeters ?? null,
          notes: notes ?? 'Remise vérifiée par preuve contradictoire.',
          status: EvidenceStatus.VERIFIED,
          verifiedAt: now,
        },
      });

      // 2. Consommer le code à usage unique (deliveryCodeHash = null) et passer en DELIVERED_VERIFIED
      const updatedShipment = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: ShipmentStatus.DELIVERED_VERIFIED,
          deliveredVerifiedAt: now,
          conformityDeadlineAt: conformityDeadline,
          deliveryCodeHash: null,
          deliveryCodeCipher: null,
        },
      });

      if (activeMission) {
        await tx.deliveryMission.update({
          where: { id: activeMission.id },
          data: {
            status: DeliveryMissionStatus.COMPLETED,
            completedAt: now,
          },
        });
      }

      await tx.deliveryLeg.updateMany({
        where: {
          shipmentId: shipment.id,
          status: { not: DeliveryLegStatus.CANCELLED },
        },
        data: {
          status: DeliveryLegStatus.COMPLETED,
          actualArrivalAt: now,
        },
      });

      await tx.order.update({
        where: { id: shipment.orderId },
        data: { status: OrderStatus.DELIVERED },
      });

      // 3. RÈGLE 11 & 12 : Séparation paiement livreur vs reversement vendeur
      //    - Le prestataire de livraison devient ELIGIBLE_FOR_RELEASE dès DELIVERED_VERIFIED
      //    - Le vendeur passe en AWAITING_BUYER_CONFORMITY jusqu'à acceptation ou expiration du délai de 24h sans litige
      for (const alloc of shipment.settlements) {
        if (
          alloc.beneficiaryType === SettlementBeneficiaryType.INDEPENDENT_COURIER ||
          alloc.beneficiaryType === SettlementBeneficiaryType.DELIVERY_AGENCY
        ) {
          if (alloc.status !== SettlementStatus.ON_HOLD_DISPUTE) {
            await tx.settlementAllocation.update({
              where: { id: alloc.id },
              data: {
                status: SettlementStatus.ELIGIBLE_FOR_RELEASE,
                eligibleForReleaseAt: now,
              },
            });

            if (alloc.beneficiaryType === SettlementBeneficiaryType.INDEPENDENT_COURIER) {
              await tx.courierProfile.update({
                where: { id: alloc.beneficiaryId },
                data: {
                  balance: { increment: alloc.netAmountFcfa },
                  completedMissions: { increment: 1 },
                },
              });
            } else if (alloc.beneficiaryType === SettlementBeneficiaryType.DELIVERY_AGENCY) {
              await tx.deliveryAgency.update({
                where: { id: alloc.beneficiaryId },
                data: {
                  balance: { increment: alloc.netAmountFcfa },
                  completedDeliveries: { increment: 1 },
                },
              });
            }
          }
        } else if (alloc.beneficiaryType === SettlementBeneficiaryType.SELLER_BOUTIQUE) {
          if (alloc.status !== SettlementStatus.ON_HOLD_DISPUTE) {
            await tx.settlementAllocation.update({
              where: { id: alloc.id },
              data: {
                status: SettlementStatus.AWAITING_BUYER_CONFORMITY,
                eligibleForReleaseAt: conformityDeadline,
              },
            });
          }
        }
      }

      // 4. SECTION 5 : Révocation IMMÉDIATE de l'accès en écriture Client ↔ Livreur
      await tx.shipmentConversationAccess.updateMany({
        where: {
          shipmentId: shipment.id,
          status: ConversationAccessStatus.ACTIVE,
        },
        data: {
          status: ConversationAccessStatus.REVOKED,
          revokedAt: now,
          revokedReason: 'DELIVERED_VERIFIED',
        },
      });

      await tx.deliveryEvent.create({
        data: {
          shipmentId: shipment.id,
          missionId: activeMission?.id ?? null,
          actorId: actorUserId,
          actorRole,
          eventType: 'DELIVERY_VERIFIED',
          oldStatus: shipment.status,
          newStatus: ShipmentStatus.DELIVERED_VERIFIED,
          description:
            'Remise vérifiée par code/lien unique. Messagerie livreur révoquée. Fenêtre de conformité produit (24h) ouverte.',
        },
      });

      return updatedShipment;
    });
  }

  /**
   * Règle 11 : Confirmation explicite de la conformité du produit par le client.
   * Libère l'allocation financière du vendeur (ELIGIBLE_FOR_RELEASE).
   */
  async acceptProductConformity(
    shipmentId: string,
    customerUserId?: string | null,
    guestToken?: string,
  ) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { settlements: true },
    });
    if (!shipment) throw new NotFoundException('Expédition introuvable.');

    const isOwner = Boolean(customerUserId) && shipment.customerUserId === customerUserId;
    if (!isOwner) {
      if (!guestToken || !shipment.guestTrackingTokenHash) {
        throw new ForbiddenException('Autorisation requise pour confirmer la conformité.');
      }
      if (this.hashTokenOrCode(guestToken) !== shipment.guestTrackingTokenHash) {
        throw new ForbiddenException('Jeton invité invalide.');
      }
    }

    if (
      shipment.status !== ShipmentStatus.DELIVERED_VERIFIED &&
      shipment.status !== ShipmentStatus.BUYER_ACCEPTED
    ) {
      throw new BadRequestException(
        'La remise physique du colis doit être vérifiée avant de confirmer la conformité du produit.',
      );
    }

    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: ShipmentStatus.BUYER_ACCEPTED,
          buyerAcceptedAt: now,
        },
      });

      await tx.settlementAllocation.updateMany({
        where: {
          shipmentId: shipment.id,
          beneficiaryType: SettlementBeneficiaryType.SELLER_BOUTIQUE,
          status: { not: SettlementStatus.ON_HOLD_DISPUTE },
        },
        data: {
          status: SettlementStatus.ELIGIBLE_FOR_RELEASE,
          eligibleForReleaseAt: now,
        },
      });

      await tx.deliveryEvent.create({
        data: {
          shipmentId: shipment.id,
          actorId: customerUserId ?? null,
          actorRole: 'CLIENT',
          eventType: 'BUYER_ACCEPTED_CONFORMITY',
          oldStatus: shipment.status,
          newStatus: ShipmentStatus.BUYER_ACCEPTED,
          description:
            'Conformité du produit confirmée par le client. Fonds vendeur éligibles au reversement.',
        },
      });

      return updated;
    });
  }

  /**
   * Décision D4 : Libération interne après expiration du délai configurable (24h par défaut après DELIVERED_VERIFIED),
   * UNIQUEMENT si aucun litige (DeliveryDispute) ni demande de remboursement (RefundRequest) ni blocage n'existe.
   * Ce mécanisme d'éligibilité interne ne supprime jamais les droits légaux de rétractation, de garantie ou de remboursement.
   */
  async processEligibleSellerSettlementsAfterConformityWindow() {
    const now = new Date();
    const pendingConformityAllocations = await this.prisma.settlementAllocation.findMany({
      where: {
        beneficiaryType: SettlementBeneficiaryType.SELLER_BOUTIQUE,
        status: SettlementStatus.AWAITING_BUYER_CONFORMITY,
        eligibleForReleaseAt: { lte: now },
      },
      include: {
        shipment: {
          include: {
            disputes: true,
          },
        },
        order: {
          include: {
            refundRequest: true,
          },
        },
      },
    });

    const releasedIds: string[] = [];
    const skippedIds: string[] = [];

    for (const alloc of pendingConformityAllocations) {
      const hasOpenDispute = alloc.shipment?.disputes?.some(
        (d) =>
          d.status === DeliveryDisputeStatus.OPEN ||
          d.status === DeliveryDisputeStatus.UNDER_REVIEW,
      );
      const hasActiveRefund =
        alloc.order?.refundRequest &&
        ['PENDING', 'VENDOR_REPLIED', 'REVIEWING', 'APPROVED'].includes(
          alloc.order.refundRequest.status,
        );
      const isShipmentBlocked =
        alloc.shipment?.status === ShipmentStatus.UNDER_REVIEW ||
        alloc.shipment?.status === ShipmentStatus.CANCELLED;

      if (hasOpenDispute || hasActiveRefund || isShipmentBlocked) {
        skippedIds.push(alloc.id);
        continue;
      }

      await this.prisma.settlementAllocation.update({
        where: { id: alloc.id },
        data: {
          status: SettlementStatus.ELIGIBLE_FOR_RELEASE,
        },
      });
      releasedIds.push(alloc.id);
    }

    return {
      processedAt: now.toISOString(),
      releasedCount: releasedIds.length,
      releasedIds,
      skippedCount: skippedIds.length,
      skippedIds,
    };
  }

  /**
   * Décision D1 : Validation manuelle par un administrateur pour les décaissements.
   * Aucun payout automatique PSP n'est déclenché : seul un administrateur peut marquer une allocation
   * ELIGIBLE_FOR_RELEASE comme RELEASED_TO_WALLET / EXTERNALLY_SETTLED après contrôle.
   */
  async adminApproveSettlementPayout(
    settlementId: string,
    adminUserId: string,
    notes?: string,
  ) {
    const settlement = await this.prisma.settlementAllocation.findUnique({
      where: { id: settlementId },
    });
    if (!settlement) {
      throw new NotFoundException('Allocation financière introuvable.');
    }
    if (settlement.status === SettlementStatus.ON_HOLD_DISPUTE) {
      throw new BadRequestException(
        'Impossible de valider le décaissement : cette allocation est gelée par un litige en cours.',
      );
    }
    if (settlement.status !== SettlementStatus.ELIGIBLE_FOR_RELEASE) {
      throw new BadRequestException(
        `Seule une allocation en statut ELIGIBLE_FOR_RELEASE peut être approuvée par l’administrateur (statut actuel : ${settlement.status}).`,
      );
    }

    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.settlementAllocation.update({
        where: { id: settlement.id },
        data: {
          status: SettlementStatus.RELEASED_TO_WALLET,
          releasedAt: now,
          holdReason: notes?.trim() || `Décaissement validé manuellement par Admin (${adminUserId})`,
        },
      });

      if (settlement.shipmentId) {
        await tx.deliveryEvent.create({
          data: {
            shipmentId: settlement.shipmentId,
            missionId: settlement.missionId ?? null,
            actorId: adminUserId,
            actorRole: 'ADMIN',
            eventType: 'ADMIN_MANUAL_PAYOUT_APPROVED',
            oldStatus: SettlementStatus.ELIGIBLE_FOR_RELEASE,
            newStatus: SettlementStatus.RELEASED_TO_WALLET,
            description: `Décaissement approuvé manuellement par l'administrateur (${settlement.netAmountFcfa} FCFA pour ${settlement.beneficiaryType}).`,
          },
        });
      }

      return updated;
    });
  }

  // ==========================================================================
  // 8. LITIGES CIBLÉS & BLOCAGE SÉLECTIF DES REVERSEMENTS (RÈGLES 12, 13, 14)
  // ==========================================================================

  /**
   * Ouverture d'un litige par le client :
   * - PRODUCT_ONLY : bloque uniquement le reversement vendeur (le livreur ayant livré avec code valide conserve sa rémunération !)
   * - DELIVERY_ONLY : bloque la rémunération du prestataire de livraison
   * - BOTH : bloque les deux allocations en attente d'arbitrage admin
   */
  async openDispute(
    shipmentId: string,
    dto: OpenDeliveryDisputeDto,
    actorUserId?: string | null,
  ) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { settlements: true },
    });
    if (!shipment) throw new NotFoundException('Expédition introuvable.');

    const isOwner = Boolean(actorUserId) && shipment.customerUserId === actorUserId;
    if (!isOwner) {
      if (!dto.guestToken || !shipment.guestTrackingTokenHash) {
        throw new ForbiddenException('Vous n’êtes pas autorisé à ouvrir un litige sur ce colis.');
      }
      if (this.hashTokenOrCode(dto.guestToken) !== shipment.guestTrackingTokenHash) {
        throw new ForbiddenException('Jeton invité invalide.');
      }
    }

    const freezeSeller =
      dto.disputeScope === DisputeScope.PRODUCT_ONLY || dto.disputeScope === DisputeScope.BOTH;
    const freezeDelivery =
      dto.disputeScope === DisputeScope.DELIVERY_ONLY || dto.disputeScope === DisputeScope.BOTH;

    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.deliveryDispute.create({
        data: {
          reference: this.generateDisputeReference(),
          shipmentId: shipment.id,
          orderId: shipment.orderId,
          boutiqueId: shipment.boutiqueId,
          openedByUserId: actorUserId ?? null,
          disputeScope: dto.disputeScope,
          reason: dto.reason.trim(),
          description: dto.description.trim(),
          evidenceUrls: dto.evidenceUrls ?? [],
          status: DeliveryDisputeStatus.OPEN,
          sellerAllocationFrozen: freezeSeller,
          deliveryAllocationFrozen: freezeDelivery,
        },
      });

      if (freezeSeller) {
        await tx.settlementAllocation.updateMany({
          where: {
            shipmentId: shipment.id,
            beneficiaryType: SettlementBeneficiaryType.SELLER_BOUTIQUE,
          },
          data: {
            status: SettlementStatus.ON_HOLD_DISPUTE,
            holdReason: `Litige ${dispute.reference} (${dto.disputeScope}): ${dto.reason}`,
          },
        });
      }

      if (freezeDelivery) {
        await tx.settlementAllocation.updateMany({
          where: {
            shipmentId: shipment.id,
            beneficiaryType: {
              in: [
                SettlementBeneficiaryType.INDEPENDENT_COURIER,
                SettlementBeneficiaryType.DELIVERY_AGENCY,
              ],
            },
          },
          data: {
            status: SettlementStatus.ON_HOLD_DISPUTE,
            holdReason: `Litige ${dispute.reference} (${dto.disputeScope}): ${dto.reason}`,
          },
        });
      }

      await tx.shipment.update({
        where: { id: shipment.id },
        data: { status: ShipmentStatus.UNDER_REVIEW },
      });

      await tx.deliveryEvent.create({
        data: {
          shipmentId: shipment.id,
          actorId: actorUserId ?? null,
          actorRole: 'CLIENT',
          eventType: 'DISPUTE_OPENED',
          oldStatus: shipment.status,
          newStatus: ShipmentStatus.UNDER_REVIEW,
          description: `Litige ${dispute.reference} ouvert (${dto.disputeScope}) — Blocage vendeur: ${freezeSeller}, Blocage livraison: ${freezeDelivery}.`,
        },
      });

      return dispute;
    });
  }

  async resolveDisputeByAdmin(
    disputeId: string,
    adminUserId: string,
    dto: ResolveDeliveryDisputeDto,
  ) {
    const dispute = await this.prisma.deliveryDispute.findUnique({
      where: { id: disputeId },
    });
    if (!dispute) throw new NotFoundException('Litige introuvable.');

    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.deliveryDispute.update({
        where: { id: dispute.id },
        data: {
          status: dto.resolutionStatus as DeliveryDisputeStatus,
          resolutionSummary: dto.resolutionSummary.trim(),
          adminNotes: dto.adminNotes?.trim() || null,
          resolvedByUserId: adminUserId,
          resolvedAt: now,
        },
      });

      if (dto.resolutionStatus === 'RESOLVED_REFUND_BUYER') {
        const heldSellerAllocs = await tx.settlementAllocation.findMany({
          where: {
            shipmentId: dispute.shipmentId,
            beneficiaryType: SettlementBeneficiaryType.SELLER_BOUTIQUE,
            status: { not: SettlementStatus.REFUNDED },
          },
        });

        await tx.settlementAllocation.updateMany({
          where: {
            shipmentId: dispute.shipmentId,
            status: SettlementStatus.ON_HOLD_DISPUTE,
          },
          data: { status: SettlementStatus.REFUNDED },
        });

        for (const alloc of heldSellerAllocs) {
          const refundDeduction = Number(alloc.netAmountFcfa || 0);
          if (refundDeduction > 0 && alloc.beneficiaryId) {
            await tx.boutique.update({
              where: { id: alloc.beneficiaryId },
              data: { balance: { decrement: refundDeduction } },
            });
          }
        }
      } else if (
        dto.resolutionStatus === 'RESOLVED_RELEASE_SELLER' ||
        dto.resolutionStatus === 'REJECTED'
      ) {
        await tx.settlementAllocation.updateMany({
          where: {
            shipmentId: dispute.shipmentId,
            status: SettlementStatus.ON_HOLD_DISPUTE,
          },
          data: {
            status: SettlementStatus.ELIGIBLE_FOR_RELEASE,
            eligibleForReleaseAt: now,
            holdReason: null,
          },
        });
      } else if (dto.resolutionStatus === 'RESOLVED_RELEASE_COURIER') {
        await tx.settlementAllocation.updateMany({
          where: {
            shipmentId: dispute.shipmentId,
            beneficiaryType: {
              in: [
                SettlementBeneficiaryType.INDEPENDENT_COURIER,
                SettlementBeneficiaryType.DELIVERY_AGENCY,
              ],
            },
          },
          data: {
            status: SettlementStatus.ELIGIBLE_FOR_RELEASE,
            eligibleForReleaseAt: now,
            holdReason: null,
          },
        });
      }

      return updated;
    });
  }

  // ==========================================================================
  // 9. MESSAGERIE TEMPORAIRE CLIENT ↔ LIVREUR (SECTION 5 : ACL + RÉVOCATION + RÉACTIVATION)
  // ==========================================================================

  /**
   * Active ou réactive le fil de discussion entre un client et un livreur pour une mission active.
   * Si le même livreur effectue ultérieurement une nouvelle mission pour le même client,
   * le fil Conversation existant est réutilisé mais rattaché au nouveau ShipmentConversationAccess
   * sans exposer les anciennes adresses.
   */
  private async activateConversationAccessInTx(
    tx: Prisma.TransactionClient,
    shipment: {
      id: string;
      reference: string;
      boutiqueId: string;
      orderId: string;
      customerUserId: string | null;
    },
    missionId: string,
    courierUserId: string,
  ) {
    let conversation = await tx.conversation.findFirst({
      where: {
        channelType: 'COURIER_CLIENT',
        courierUserId,
        ...(shipment.customerUserId
          ? { userId: shipment.customerUserId }
          : { orderId: shipment.orderId }),
      },
    });

    if (!conversation) {
      const order = await tx.order.findUnique({
        where: { id: shipment.orderId },
        select: { customerName: true, customerPhone: true, reference: true },
      });

      conversation = await tx.conversation.create({
        data: {
          boutiqueId: shipment.boutiqueId,
          userId: shipment.customerUserId,
          courierUserId,
          channelType: 'COURIER_CLIENT',
          clientName: order?.customerName || 'Client ZennShop',
          clientPhone: order?.customerPhone || null,
          orderId: shipment.orderId,
          orderReference: order?.reference || shipment.reference,
        },
      });
    } else {
      // Réactivation du fil existant pour la nouvelle mission
      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          orderId: shipment.orderId,
          orderReference: shipment.reference,
          lastMessageAt: new Date(),
        },
      });
    }

    return tx.shipmentConversationAccess.upsert({
      where: {
        missionId_conversationId: {
          missionId,
          conversationId: conversation.id,
        },
      },
      update: {
        status: ConversationAccessStatus.ACTIVE,
        activatedAt: new Date(),
        revokedAt: null,
        revokedReason: null,
      },
      create: {
        conversationId: conversation.id,
        shipmentId: shipment.id,
        missionId,
        customerUserId: shipment.customerUserId,
        courierUserId,
        status: ConversationAccessStatus.ACTIVE,
      },
    });
  }

  /**
   * Vérifie si un utilisateur (client ou livreur) a le droit d'écrire dans la conversation
   * liée à une expédition. Dès que la livraison est DELIVERED_VERIFIED (ou annulée/réattribuée),
   * l'écriture est strictement refusée (ForbiddenException).
   */
  async sendShipmentChatMessage(
    shipmentId: string,
    senderUserId: string,
    dto: SendCourierClientMessageDto,
  ) {
    const activeAccess = await this.prisma.shipmentConversationAccess.findFirst({
      where: {
        shipmentId,
        status: ConversationAccessStatus.ACTIVE,
      },
      include: {
        shipment: true,
        conversation: true,
      },
    });

    if (!activeAccess) {
      throw new ForbiddenException(
        'La messagerie pour cette livraison est fermée ou révoquée (la livraison est terminée ou non attribuée).',
      );
    }

    // Double vérification sur le statut du Shipment
    if (
      activeAccess.shipment.status === ShipmentStatus.DELIVERED_VERIFIED ||
      activeAccess.shipment.status === ShipmentStatus.BUYER_ACCEPTED ||
      activeAccess.shipment.status === ShipmentStatus.CANCELLED
    ) {
      await this.prisma.shipmentConversationAccess.update({
        where: { id: activeAccess.id },
        data: {
          status: ConversationAccessStatus.REVOKED,
          revokedAt: new Date(),
          revokedReason: 'SHIPMENT_COMPLETED_OR_CANCELLED',
        },
      });
      throw new ForbiddenException(
        'La livraison étant confirmée, le livreur et le client ne peuvent plus écrire dans cette mission.',
      );
    }

    const isCourier = activeAccess.courierUserId === senderUserId;
    const isClient = activeAccess.customerUserId === senderUserId;

    if (!isCourier && !isClient) {
      throw new ForbiddenException(
        'Seuls le client et le livreur actuellement affectés à cette mission peuvent communiquer ici.',
      );
    }

    const senderRole = isCourier ? MessageSender.LIVREUR : MessageSender.CLIENT;
    const encryptedContent = MessageCrypto.encrypt(dto.content.trim());

    const message = await this.prisma.message.create({
      data: {
        conversationId: activeAccess.conversationId,
        senderRole,
        senderId: senderUserId,
        content: encryptedContent,
      },
    });

    await this.prisma.conversation.update({
      where: { id: activeAccess.conversationId },
      data: { lastMessageAt: new Date() },
    });

    return {
      id: message.id,
      conversationId: message.conversationId,
      shipmentId,
      senderRole: message.senderRole,
      senderId: message.senderId,
      content: MessageCrypto.decrypt(message.content),
      createdAt: message.createdAt,
    };
  }

  async getShipmentChatMessages(shipmentId: string, requesterUserId: string) {
    const accessRecords = await this.prisma.shipmentConversationAccess.findMany({
      where: { shipmentId },
      include: {
        conversation: {
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
      orderBy: { activatedAt: 'desc' },
    });

    if (accessRecords.length === 0) {
      return {
        canWrite: false,
        status: 'NOT_INITIALIZED',
        messages: [],
      };
    }

    const latestAccess = accessRecords[0];
    const isParticipant =
      latestAccess.courierUserId === requesterUserId ||
      latestAccess.customerUserId === requesterUserId;

    if (!isParticipant) {
      throw new ForbiddenException('Vous n’êtes pas participant à cette conversation de livraison.');
    }

    const canWrite = latestAccess.status === ConversationAccessStatus.ACTIVE;

    return {
      conversationId: latestAccess.conversationId,
      canWrite,
      status: latestAccess.status,
      revokedAt: latestAccess.revokedAt,
      messages: latestAccess.conversation.messages.map((m) => ({
        id: m.id,
        senderRole: m.senderRole,
        senderId: m.senderId,
        content: MessageCrypto.decrypt(m.content),
        createdAt: m.createdAt,
      })),
    };
  }

  // ==========================================================================
  // 10. CONSULTATION SÉCURISÉE DES EXPÉDITIONS (CLIENT, VENDEUR, INVITÉ, ADMIN)
  // ==========================================================================

  /**
   * Récupère les détails d'une expédition avec filtrage strict des données sensibles :
   * - Le code de remise (déchiffré) n'est JAMAIS exposé au livreur ni au vendeur :
   *   seul le client propriétaire (ou invité muni du guestToken valide) le reçoit.
   */
  async getShipmentDetails(
    shipmentId: string,
    requesterUserId?: string | null,
    requesterRole?: string | null,
    guestToken?: string,
  ) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        order: {
          select: {
            id: true,
            reference: true,
            status: true,
            total: true,
            deliveryName: true,
            deliveryPrice: true,
            customerName: true,
            customerPhone: true,
          },
        },
        boutique: {
          select: { id: true, name: true, slug: true, ownerId: true, phone: true, city: true },
        },
        originAddress: true,
        destinationAddress: true,
        destinationStation: true,
        assignedAgency: { select: { id: true, name: true, phone: true, commune: true } },
        assignedCourier: {
          select: { id: true, userId: true, displayName: true, phone: true, vehicleType: true },
        },
        legs: {
          include: { originStation: true, destinationStation: true },
          orderBy: { sequence: 'asc' },
        },
        missions: {
          include: {
            agency: { select: { id: true, name: true } },
            courierProfile: { select: { id: true, displayName: true, phone: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        evidences: { orderBy: { createdAt: 'desc' } },
        events: { orderBy: { createdAt: 'desc' } },
        settlements: true,
        disputes: true,
      },
    });

    if (!shipment) throw new NotFoundException('Expédition introuvable.');

    const isOwnerBuyer =
      Boolean(requesterUserId) && shipment.customerUserId === requesterUserId;
    const isGuestBuyerWithValidToken =
      Boolean(guestToken) &&
      Boolean(shipment.guestTrackingTokenHash) &&
      this.hashTokenOrCode(guestToken!) === shipment.guestTrackingTokenHash;
    const isSellerOwner =
      Boolean(requesterUserId) && shipment.boutique.ownerId === requesterUserId;
    const isAssignedCourier =
      Boolean(requesterUserId) && shipment.assignedCourier?.userId === requesterUserId;
    const isAdmin = requesterRole === 'ADMIN';

    if (
      !isOwnerBuyer &&
      !isGuestBuyerWithValidToken &&
      !isSellerOwner &&
      !isAssignedCourier &&
      !isAdmin
    ) {
      throw new ForbiddenException('Accès non autorisé à cette expédition.');
    }

    // Déchiffrer le code de remise UNIQUEMENT pour le client acheteur légitime
    let buyerDeliveryCode: string | null = null;
    if ((isOwnerBuyer || isGuestBuyerWithValidToken) && shipment.deliveryCodeCipher) {
      buyerDeliveryCode = MessageCrypto.decrypt(shipment.deliveryCodeCipher);
    }

    const {
      deliveryCodeHash: _h,
      deliveryCodeCipher: _c,
      guestTrackingTokenHash: _g,
      ...safeShipment
    } = shipment;

    return {
      ...safeShipment,
      buyerDeliveryCode,
    };
  }

  async getShipmentByOrderId(
    orderId: string,
    requesterUserId?: string | null,
    requesterRole?: string | null,
    guestToken?: string,
  ) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { orderId },
      select: { id: true },
    });
    if (!shipment) {
      return null;
    }
    return this.getShipmentDetails(shipment.id, requesterUserId, requesterRole, guestToken);
  }

  async listVerifiedAgencies(commune?: string) {
    return this.prisma.deliveryAgency.findMany({
      where: {
        verificationStatus: VerificationStatus.VERIFIED,
        status: AgencyStatus.ACTIVE,
        ...(commune ? { coveredCommunes: { has: commune } } : {}),
      },
      include: {
        memberships: {
          where: {
            status: AgencyMembershipStatus.ACTIVE,
            canBeRequestedBySeller: true,
          },
          include: {
            courierProfile: {
              select: {
                id: true,
                displayName: true,
                vehicleType: true,
                rating: true,
                completedMissions: true,
                verificationStatus: true,
              },
            },
          },
        },
      },
      orderBy: { rating: 'desc' },
    });
  }

  async getDeliveryDashboardOverviewForAdmin() {
    const [
      totalShipments,
      activeShipments,
      deliveredVerified,
      openDisputes,
      agencies,
      couriers,
      pendingSettlements,
    ] = await Promise.all([
      this.prisma.shipment.count(),
      this.prisma.shipment.count({
        where: {
          status: {
            in: [
              ShipmentStatus.AWAITING_ASSIGNMENT,
              ShipmentStatus.ASSIGNED,
              ShipmentStatus.PICKED_UP,
              ShipmentStatus.IN_TRANSIT,
              ShipmentStatus.ARRIVED_AT_STATION,
              ShipmentStatus.DELIVERY_PENDING_VERIFICATION,
            ],
          },
        },
      }),
      this.prisma.shipment.count({
        where: {
          status: { in: [ShipmentStatus.DELIVERED_VERIFIED, ShipmentStatus.BUYER_ACCEPTED] },
        },
      }),
      this.prisma.deliveryDispute.findMany({
        where: { status: { in: [DeliveryDisputeStatus.OPEN, DeliveryDisputeStatus.UNDER_REVIEW] } },
        include: {
          shipment: { select: { id: true, reference: true, status: true } },
          boutique: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deliveryAgency.findMany({
        include: {
          _count: { select: { memberships: true, missions: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.courierProfile.findMany({
        include: {
          activeAgency: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.settlementAllocation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      metrics: {
        totalShipments,
        activeShipments,
        deliveredVerified,
        openDisputesCount: openDisputes.length,
      },
      openDisputes,
      agencies,
      couriers,
      recentSettlements: pendingSettlements,
    };
  }
}
