-- CreateEnum
CREATE TYPE "DeliveryZoneType" AS ENUM ('URBAN', 'PERIURBAN', 'INTERURBAN');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('HOME', 'STATION_PICKUP', 'INTERURBAN_STATION', 'INTERURBAN_HOME', 'SELLER_SELF');

-- CreateEnum
CREATE TYPE "PackageSize" AS ENUM ('SMALL', 'STANDARD', 'LARGE', 'FRAGILE');

-- CreateEnum
CREATE TYPE "AddressLocationSource" AS ENUM ('GPS_CONFIRMED', 'OSM_PIN', 'MANUAL_APPROXIMATE');

-- CreateEnum
CREATE TYPE "AddressPrecisionLevel" AS ENUM ('EXACT_GPS', 'PIN_CONFIRMED', 'LANDMARK_TEXT');

-- CreateEnum
CREATE TYPE "AgencyStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CourierType" AS ENUM ('INDEPENDENT', 'AGENCY_MEMBER');

-- CreateEnum
CREATE TYPE "CourierStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('MOTO', 'TRICYCLE', 'VAN', 'CAR', 'BICYCLE');

-- CreateEnum
CREATE TYPE "AgencyMembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DETACHED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'AWAITING_PREPARATION', 'READY_FOR_DISPATCH', 'AWAITING_ASSIGNMENT', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'HANDOVER_PENDING', 'ARRIVED_AT_STATION', 'PICKUP_CONFIRMATION_PENDING', 'DELIVERY_PENDING_VERIFICATION', 'DELIVERED_VERIFIED', 'BUYER_ACCEPTED', 'FAILED_ATTEMPT', 'RETURNING', 'RETURNED', 'LOST', 'CANCELLED', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "DispatchMode" AS ENUM ('SELLER_PERSONAL_COURIER', 'PARTNER_AGENCY', 'PUBLIC_POOL');

-- CreateEnum
CREATE TYPE "DeliveryLegType" AS ENUM ('COLLECTION', 'INTERURBAN_TRANSIT', 'LAST_MILE', 'STATION_PICKUP', 'DIRECT_LOCAL');

-- CreateEnum
CREATE TYPE "DeliveryLegStatus" AS ENUM ('PLANNED', 'AWAITING_ASSIGNMENT', 'ASSIGNED', 'IN_PROGRESS', 'HANDOVER_DECLARED', 'ARRIVED_AT_STATION', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryMissionStatus" AS ENUM ('OFFERED', 'RESERVED', 'ASSIGNED', 'ACCEPTED', 'COLLECTING', 'CARRYING', 'HANDOVER_PENDING', 'COMPLETED', 'DECLINED', 'EXPIRED', 'FAILED', 'CANCELLED', 'REASSIGNED');

-- CreateEnum
CREATE TYPE "HandoverStep" AS ENUM ('PICKUP_FROM_SELLER', 'HANDOVER_TO_CARRIER', 'ARRIVAL_AT_STATION', 'PICKUP_FROM_STATION', 'DELIVERY_TO_BUYER', 'BUYER_CONFORMITY_CONFIRMATION');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('BUYER_CODE', 'SIGNED_GUEST_LINK', 'CARRIER_RECEIPT', 'STATION_AGENT_CONFIRMATION', 'PHOTO_DECLARATION');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('DECLARED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ConversationAccessStatus" AS ENUM ('ACTIVE', 'REVOKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SettlementBeneficiaryType" AS ENUM ('SELLER_BOUTIQUE', 'DELIVERY_AGENCY', 'INDEPENDENT_COURIER', 'PLATFORM_COMMISSION');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING_PAYMENT', 'HELD_BY_PSP_OR_LEDGER', 'AWAITING_DELIVERY_VERIFICATION', 'AWAITING_BUYER_CONFORMITY', 'ELIGIBLE_FOR_RELEASE', 'ON_HOLD_DISPUTE', 'RELEASED_TO_WALLET', 'EXTERNALLY_SETTLED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisputeScope" AS ENUM ('PRODUCT_ONLY', 'DELIVERY_ONLY', 'BOTH');

-- CreateEnum
CREATE TYPE "DeliveryDisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_REFUND_BUYER', 'RESOLVED_RELEASE_SELLER', 'RESOLVED_RELEASE_COURIER', 'RESOLVED_SPLIT', 'REJECTED');

-- AlterEnum
ALTER TYPE "MessageSender" ADD VALUE 'LIVREUR';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "channelType" TEXT NOT NULL DEFAULT 'SELLER_CLIENT',
ADD COLUMN     "courierUserId" TEXT;

-- CreateTable
CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "arrondissement" TEXT,
    "quartier" TEXT,
    "zoneType" "DeliveryZoneType" NOT NULL DEFAULT 'URBAN',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "carrierCompany" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "quartier" TEXT,
    "address" TEXT,
    "landmark" TEXT,
    "contactPhone" TEXT,
    "openingHours" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "zoneId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryRateRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originZoneId" TEXT,
    "destinationZoneId" TEXT,
    "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'HOME',
    "packageSize" "PackageSize" NOT NULL DEFAULT 'STANDARD',
    "basePriceFcfa" DECIMAL(12,2) NOT NULL,
    "agencyFeeSharePct" DECIMAL(5,2) NOT NULL DEFAULT 90,
    "estimatedMinHours" INTEGER NOT NULL DEFAULT 2,
    "estimatedMaxHours" INTEGER NOT NULL DEFAULT 24,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryRateRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddressSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Bénin',
    "department" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "arrondissement" TEXT,
    "quartier" TEXT NOT NULL,
    "streetOrLandmark" TEXT NOT NULL,
    "deliveryInstructions" TEXT,
    "recipientName" TEXT,
    "contactPhone" TEXT NOT NULL,
    "secondaryPhone" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracyMeters" DOUBLE PRECISION,
    "locationSource" "AddressLocationSource" NOT NULL DEFAULT 'MANUAL_APPROXIMATE',
    "precisionLevel" "AddressPrecisionLevel" NOT NULL DEFAULT 'LANDMARK_TEXT',
    "confirmedByCustomer" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AddressSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAgency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsappNumber" TEXT,
    "email" TEXT,
    "department" TEXT NOT NULL DEFAULT 'Littoral',
    "commune" TEXT NOT NULL DEFAULT 'Cotonou',
    "address" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "rccmNumber" TEXT,
    "ifuNumber" TEXT,
    "idDocumentUrl" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "status" "AgencyStatus" NOT NULL DEFAULT 'PENDING',
    "coveredCommunes" TEXT[],
    "supportsInterurban" BOOLEAN NOT NULL DEFAULT false,
    "baseRateFcfa" DECIMAL(12,2) NOT NULL DEFAULT 1000,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pendingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "completedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryAgency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courierType" "CourierType" NOT NULL DEFAULT 'INDEPENDENT',
    "displayName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsappNumber" TEXT,
    "department" TEXT NOT NULL DEFAULT 'Littoral',
    "commune" TEXT NOT NULL DEFAULT 'Cotonou',
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'MOTO',
    "plateNumber" TEXT,
    "idDocumentType" TEXT,
    "idDocumentNumber" TEXT,
    "idDocumentUrl" TEXT,
    "selfieUrl" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "status" "CourierStatus" NOT NULL DEFAULT 'PENDING',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "coveredCommunes" TEXT[],
    "activeAgencyId" TEXT,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pendingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "completedMissions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyMembership" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "courierProfileId" TEXT NOT NULL,
    "status" "AgencyMembershipStatus" NOT NULL DEFAULT 'PENDING',
    "role" TEXT NOT NULL DEFAULT 'COURIER',
    "canBeRequestedBySeller" BOOLEAN NOT NULL DEFAULT true,
    "invitedByUserId" TEXT,
    "joinedAt" TIMESTAMP(3),
    "detachedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "boutiqueId" TEXT NOT NULL,
    "customerUserId" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'AWAITING_PREPARATION',
    "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'HOME',
    "dispatchMode" "DispatchMode",
    "originAddressId" TEXT,
    "destinationAddressId" TEXT,
    "destinationStationId" TEXT,
    "packageCategory" "PackageSize" NOT NULL DEFAULT 'STANDARD',
    "packageDescription" TEXT,
    "declaredValueFcfa" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isFragile" BOOLEAN NOT NULL DEFAULT false,
    "quotedFeeFcfa" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "chargedToBuyerFcfa" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sellerSubsidyFcfa" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isFeeIncludedInPack" BOOLEAN NOT NULL DEFAULT false,
    "deliveryCodeHash" TEXT,
    "deliveryCodeCipher" TEXT,
    "deliveryCodeExpiresAt" TIMESTAMP(3),
    "deliveryCodeAttempts" INTEGER NOT NULL DEFAULT 0,
    "deliveryCodeLockedUntil" TIMESTAMP(3),
    "guestTrackingTokenHash" TEXT,
    "assignedAgencyId" TEXT,
    "assignedCourierId" TEXT,
    "personalCourierName" TEXT,
    "personalCourierPhone" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "arrivedAtStationAt" TIMESTAMP(3),
    "deliveredVerifiedAt" TIMESTAMP(3),
    "conformityDeadlineAt" TIMESTAMP(3),
    "buyerAcceptedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryLeg" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "legType" "DeliveryLegType" NOT NULL DEFAULT 'DIRECT_LOCAL',
    "status" "DeliveryLegStatus" NOT NULL DEFAULT 'PLANNED',
    "originAddressId" TEXT,
    "destinationAddressId" TEXT,
    "originStationId" TEXT,
    "destinationStationId" TEXT,
    "carrierCompany" TEXT,
    "carrierTicketRef" TEXT,
    "carrierContactPhone" TEXT,
    "driverName" TEXT,
    "vehicleIdentifier" TEXT,
    "departureTime" TIMESTAMP(3),
    "estimatedArrivalAt" TIMESTAMP(3),
    "actualArrivalAt" TIMESTAMP(3),
    "agreedFeeFcfa" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryMission" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "legId" TEXT,
    "boutiqueId" TEXT NOT NULL,
    "missionMode" "DispatchMode" NOT NULL DEFAULT 'PUBLIC_POOL',
    "status" "DeliveryMissionStatus" NOT NULL DEFAULT 'OFFERED',
    "agencyId" TEXT,
    "courierProfileId" TEXT,
    "requestedCourierProfileId" TEXT,
    "agencyApprovedPreferred" BOOLEAN,
    "agreedFeeFcfa" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "appliedCommissionRatePct" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "platformCommissionFcfa" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netCourierPayoutFcfa" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isExternalSellerPayment" BOOLEAN NOT NULL DEFAULT false,
    "originSummary" TEXT,
    "destinationSummary" TEXT,
    "reservedUntil" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoverEvidence" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "legId" TEXT,
    "missionId" TEXT,
    "step" "HandoverStep" NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT NOT NULL,
    "verificationMethod" "VerificationMethod" NOT NULL DEFAULT 'PHOTO_DECLARATION',
    "codeVerified" BOOLEAN NOT NULL DEFAULT false,
    "receiptReference" TEXT,
    "carrierCompany" TEXT,
    "driverPhone" TEXT,
    "photoUrl" TEXT,
    "signatureData" TEXT,
    "gpsLatitude" DOUBLE PRECISION,
    "gpsLongitude" DOUBLE PRECISION,
    "gpsAccuracyMeters" DOUBLE PRECISION,
    "notes" TEXT,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'DECLARED',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HandoverEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "legId" TEXT,
    "missionId" TEXT,
    "actorId" TEXT,
    "actorRole" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "description" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentConversationAccess" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "customerUserId" TEXT,
    "courierUserId" TEXT NOT NULL,
    "status" "ConversationAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "ShipmentConversationAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementAllocation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "missionId" TEXT,
    "beneficiaryType" "SettlementBeneficiaryType" NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "grossAmountFcfa" DECIMAL(14,2) NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "commissionAmountFcfa" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netAmountFcfa" DECIMAL(14,2) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "holdReason" TEXT,
    "eligibleForReleaseAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryDispute" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "boutiqueId" TEXT NOT NULL,
    "openedByUserId" TEXT,
    "disputeScope" "DisputeScope" NOT NULL DEFAULT 'BOTH',
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceUrls" TEXT[],
    "status" "DeliveryDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "sellerAllocationFrozen" BOOLEAN NOT NULL DEFAULT false,
    "deliveryAllocationFrozen" BOOLEAN NOT NULL DEFAULT false,
    "adminNotes" TEXT,
    "resolutionSummary" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryDispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryZone_code_key" ON "DeliveryZone"("code");

-- CreateIndex
CREATE INDEX "DeliveryZone_department_commune_idx" ON "DeliveryZone"("department", "commune");

-- CreateIndex
CREATE INDEX "DeliveryZone_isActive_idx" ON "DeliveryZone"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Station_code_key" ON "Station"("code");

-- CreateIndex
CREATE INDEX "Station_department_commune_idx" ON "Station"("department", "commune");

-- CreateIndex
CREATE INDEX "Station_isActive_idx" ON "Station"("isActive");

-- CreateIndex
CREATE INDEX "DeliveryRateRule_originZoneId_destinationZoneId_deliveryMod_idx" ON "DeliveryRateRule"("originZoneId", "destinationZoneId", "deliveryMode");

-- CreateIndex
CREATE INDEX "DeliveryRateRule_isActive_idx" ON "DeliveryRateRule"("isActive");

-- CreateIndex
CREATE INDEX "AddressSnapshot_userId_idx" ON "AddressSnapshot"("userId");

-- CreateIndex
CREATE INDEX "AddressSnapshot_department_commune_idx" ON "AddressSnapshot"("department", "commune");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAgency_name_key" ON "DeliveryAgency"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAgency_slug_key" ON "DeliveryAgency"("slug");

-- CreateIndex
CREATE INDEX "DeliveryAgency_ownerId_idx" ON "DeliveryAgency"("ownerId");

-- CreateIndex
CREATE INDEX "DeliveryAgency_status_verificationStatus_idx" ON "DeliveryAgency"("status", "verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "CourierProfile_userId_key" ON "CourierProfile"("userId");

-- CreateIndex
CREATE INDEX "CourierProfile_courierType_verificationStatus_status_idx" ON "CourierProfile"("courierType", "verificationStatus", "status");

-- CreateIndex
CREATE INDEX "CourierProfile_activeAgencyId_idx" ON "CourierProfile"("activeAgencyId");

-- CreateIndex
CREATE INDEX "AgencyMembership_courierProfileId_status_idx" ON "AgencyMembership"("courierProfileId", "status");

-- CreateIndex
CREATE INDEX "AgencyMembership_agencyId_status_idx" ON "AgencyMembership"("agencyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyMembership_agencyId_courierProfileId_key" ON "AgencyMembership"("agencyId", "courierProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_reference_key" ON "Shipment"("reference");

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");

-- CreateIndex
CREATE INDEX "Shipment_boutiqueId_status_idx" ON "Shipment"("boutiqueId", "status");

-- CreateIndex
CREATE INDEX "Shipment_customerUserId_idx" ON "Shipment"("customerUserId");

-- CreateIndex
CREATE INDEX "Shipment_assignedCourierId_idx" ON "Shipment"("assignedCourierId");

-- CreateIndex
CREATE INDEX "Shipment_assignedAgencyId_idx" ON "Shipment"("assignedAgencyId");

-- CreateIndex
CREATE INDEX "DeliveryLeg_shipmentId_status_idx" ON "DeliveryLeg"("shipmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryLeg_shipmentId_sequence_key" ON "DeliveryLeg"("shipmentId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryMission_reference_key" ON "DeliveryMission"("reference");

-- CreateIndex
CREATE INDEX "DeliveryMission_status_missionMode_idx" ON "DeliveryMission"("status", "missionMode");

-- CreateIndex
CREATE INDEX "DeliveryMission_shipmentId_idx" ON "DeliveryMission"("shipmentId");

-- CreateIndex
CREATE INDEX "DeliveryMission_courierProfileId_status_idx" ON "DeliveryMission"("courierProfileId", "status");

-- CreateIndex
CREATE INDEX "DeliveryMission_agencyId_status_idx" ON "DeliveryMission"("agencyId", "status");

-- CreateIndex
CREATE INDEX "HandoverEvidence_shipmentId_step_idx" ON "HandoverEvidence"("shipmentId", "step");

-- CreateIndex
CREATE INDEX "HandoverEvidence_missionId_idx" ON "HandoverEvidence"("missionId");

-- CreateIndex
CREATE INDEX "DeliveryEvent_shipmentId_createdAt_idx" ON "DeliveryEvent"("shipmentId", "createdAt");

-- CreateIndex
CREATE INDEX "ShipmentConversationAccess_conversationId_status_idx" ON "ShipmentConversationAccess"("conversationId", "status");

-- CreateIndex
CREATE INDEX "ShipmentConversationAccess_shipmentId_status_idx" ON "ShipmentConversationAccess"("shipmentId", "status");

-- CreateIndex
CREATE INDEX "ShipmentConversationAccess_courierUserId_status_idx" ON "ShipmentConversationAccess"("courierUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentConversationAccess_missionId_conversationId_key" ON "ShipmentConversationAccess"("missionId", "conversationId");

-- CreateIndex
CREATE INDEX "SettlementAllocation_orderId_beneficiaryType_idx" ON "SettlementAllocation"("orderId", "beneficiaryType");

-- CreateIndex
CREATE INDEX "SettlementAllocation_shipmentId_idx" ON "SettlementAllocation"("shipmentId");

-- CreateIndex
CREATE INDEX "SettlementAllocation_beneficiaryId_status_idx" ON "SettlementAllocation"("beneficiaryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryDispute_reference_key" ON "DeliveryDispute"("reference");

-- CreateIndex
CREATE INDEX "DeliveryDispute_shipmentId_idx" ON "DeliveryDispute"("shipmentId");

-- CreateIndex
CREATE INDEX "DeliveryDispute_orderId_idx" ON "DeliveryDispute"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryDispute_status_idx" ON "DeliveryDispute"("status");

-- CreateIndex
CREATE INDEX "Conversation_courierUserId_idx" ON "Conversation"("courierUserId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_courierUserId_fkey" FOREIGN KEY ("courierUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "DeliveryZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRateRule" ADD CONSTRAINT "DeliveryRateRule_originZoneId_fkey" FOREIGN KEY ("originZoneId") REFERENCES "DeliveryZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRateRule" ADD CONSTRAINT "DeliveryRateRule_destinationZoneId_fkey" FOREIGN KEY ("destinationZoneId") REFERENCES "DeliveryZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddressSnapshot" ADD CONSTRAINT "AddressSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAgency" ADD CONSTRAINT "DeliveryAgency_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierProfile" ADD CONSTRAINT "CourierProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierProfile" ADD CONSTRAINT "CourierProfile_activeAgencyId_fkey" FOREIGN KEY ("activeAgencyId") REFERENCES "DeliveryAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyMembership" ADD CONSTRAINT "AgencyMembership_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "DeliveryAgency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyMembership" ADD CONSTRAINT "AgencyMembership_courierProfileId_fkey" FOREIGN KEY ("courierProfileId") REFERENCES "CourierProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_originAddressId_fkey" FOREIGN KEY ("originAddressId") REFERENCES "AddressSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_destinationAddressId_fkey" FOREIGN KEY ("destinationAddressId") REFERENCES "AddressSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_destinationStationId_fkey" FOREIGN KEY ("destinationStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_assignedAgencyId_fkey" FOREIGN KEY ("assignedAgencyId") REFERENCES "DeliveryAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_assignedCourierId_fkey" FOREIGN KEY ("assignedCourierId") REFERENCES "CourierProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLeg" ADD CONSTRAINT "DeliveryLeg_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLeg" ADD CONSTRAINT "DeliveryLeg_originAddressId_fkey" FOREIGN KEY ("originAddressId") REFERENCES "AddressSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLeg" ADD CONSTRAINT "DeliveryLeg_destinationAddressId_fkey" FOREIGN KEY ("destinationAddressId") REFERENCES "AddressSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLeg" ADD CONSTRAINT "DeliveryLeg_originStationId_fkey" FOREIGN KEY ("originStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLeg" ADD CONSTRAINT "DeliveryLeg_destinationStationId_fkey" FOREIGN KEY ("destinationStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryMission" ADD CONSTRAINT "DeliveryMission_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryMission" ADD CONSTRAINT "DeliveryMission_legId_fkey" FOREIGN KEY ("legId") REFERENCES "DeliveryLeg"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryMission" ADD CONSTRAINT "DeliveryMission_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryMission" ADD CONSTRAINT "DeliveryMission_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "DeliveryAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryMission" ADD CONSTRAINT "DeliveryMission_courierProfileId_fkey" FOREIGN KEY ("courierProfileId") REFERENCES "CourierProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryMission" ADD CONSTRAINT "DeliveryMission_requestedCourierProfileId_fkey" FOREIGN KEY ("requestedCourierProfileId") REFERENCES "CourierProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverEvidence" ADD CONSTRAINT "HandoverEvidence_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverEvidence" ADD CONSTRAINT "HandoverEvidence_legId_fkey" FOREIGN KEY ("legId") REFERENCES "DeliveryLeg"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverEvidence" ADD CONSTRAINT "HandoverEvidence_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "DeliveryMission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryEvent" ADD CONSTRAINT "DeliveryEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryEvent" ADD CONSTRAINT "DeliveryEvent_legId_fkey" FOREIGN KEY ("legId") REFERENCES "DeliveryLeg"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryEvent" ADD CONSTRAINT "DeliveryEvent_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "DeliveryMission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentConversationAccess" ADD CONSTRAINT "ShipmentConversationAccess_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentConversationAccess" ADD CONSTRAINT "ShipmentConversationAccess_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentConversationAccess" ADD CONSTRAINT "ShipmentConversationAccess_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "DeliveryMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementAllocation" ADD CONSTRAINT "SettlementAllocation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementAllocation" ADD CONSTRAINT "SettlementAllocation_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementAllocation" ADD CONSTRAINT "SettlementAllocation_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "DeliveryMission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryDispute" ADD CONSTRAINT "DeliveryDispute_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryDispute" ADD CONSTRAINT "DeliveryDispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryDispute" ADD CONSTRAINT "DeliveryDispute_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryDispute" ADD CONSTRAINT "DeliveryDispute_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

