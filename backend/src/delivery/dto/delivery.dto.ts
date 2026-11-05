import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  AddressLocationSource,
  DeliveryMode,
  DispatchMode,
  DisputeScope,
  HandoverStep,
  PackageSize,
  VehicleType,
  VerificationMethod,
  VerificationStatus,
} from '@prisma/client';

export class CalculateDeliveryQuoteDto {
  @IsOptional()
  @IsString()
  boutiqueId?: string;

  @IsOptional()
  @IsString()
  originCommune?: string;

  @IsString()
  destinationDepartment: string;

  @IsString()
  destinationCommune: string;

  @IsOptional()
  @IsString()
  destinationQuartier?: string;

  @IsEnum(DeliveryMode)
  deliveryMode: DeliveryMode;

  @IsOptional()
  @IsEnum(PackageSize)
  packageSize?: PackageSize;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  selectedPackPrice?: number;
}

export class CreateAddressSnapshotDto {
  @IsString()
  @MinLength(2)
  department: string;

  @IsString()
  @MinLength(2)
  commune: string;

  @IsOptional()
  @IsString()
  arrondissement?: string;

  @IsString()
  @MinLength(2)
  quartier: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  streetOrLandmark: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryInstructions?: string;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsString()
  @MinLength(6)
  @MaxLength(35)
  contactPhone: string;

  @IsOptional()
  @IsString()
  secondaryPhone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  accuracyMeters?: number;

  @IsOptional()
  @IsEnum(AddressLocationSource)
  locationSource?: AddressLocationSource;

  @IsOptional()
  @IsBoolean()
  confirmedByCustomer?: boolean;
}

export class CreateShipmentFromOrderDto {
  @IsString()
  orderId: string;

  @IsOptional()
  @IsEnum(DeliveryMode)
  deliveryMode?: DeliveryMode;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressSnapshotDto)
  destinationAddress?: CreateAddressSnapshotDto;

  @IsOptional()
  @IsString()
  destinationStationId?: string;

  @IsOptional()
  @IsEnum(PackageSize)
  packageCategory?: PackageSize;

  @IsOptional()
  @IsString()
  packageDescription?: string;

  @IsOptional()
  @IsBoolean()
  isFragile?: boolean;
}

export class DispatchShipmentDto {
  @IsEnum(DispatchMode)
  dispatchMode: DispatchMode;

  @IsOptional()
  @IsString()
  agencyId?: string;

  @IsOptional()
  @IsString()
  requestedCourierProfileId?: string;

  @IsOptional()
  @IsString()
  personalCourierName?: string;

  @IsOptional()
  @IsString()
  personalCourierPhone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  agreedFeeFcfa?: number;

  @IsOptional()
  @IsBoolean()
  isExternalSellerPayment?: boolean;

  @IsOptional()
  @IsBoolean()
  isInterurban?: boolean;

  @IsOptional()
  @IsString()
  originStationId?: string;

  @IsOptional()
  @IsString()
  destinationStationId?: string;
}

export class RegisterAgencyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @MinLength(6)
  phone: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  department: string;

  @IsString()
  commune: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  rccmNumber?: string;

  @IsOptional()
  @IsString()
  ifuNumber?: string;

  @IsOptional()
  @IsString()
  idDocumentUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coveredCommunes?: string[];

  @IsOptional()
  @IsBoolean()
  supportsInterurban?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseRateFcfa?: number;
}

export class RegisterCourierProfileDto {
  @IsString()
  @MinLength(2)
  displayName: string;

  @IsString()
  @MinLength(6)
  phone: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsString()
  department: string;

  @IsString()
  commune: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  plateNumber?: string;

  @IsOptional()
  @IsString()
  idDocumentType?: string;

  @IsOptional()
  @IsString()
  idDocumentNumber?: string;

  @IsOptional()
  @IsString()
  idDocumentUrl?: string;

  @IsOptional()
  @IsString()
  selfieUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coveredCommunes?: string[];
}

export class AttachCourierToAgencyDto {
  @IsString()
  courierProfileId: string;

  @IsOptional()
  @IsBoolean()
  canBeRequestedBySeller?: boolean;
}

export class AssignAgencyMissionDto {
  @IsString()
  courierProfileId: string;

  @IsOptional()
  @IsBoolean()
  approveSellerPreferred?: boolean;
}

export class RecordHandoverEvidenceDto {
  @IsEnum(HandoverStep)
  step: HandoverStep;

  @IsOptional()
  @IsString()
  legId?: string;

  @IsOptional()
  @IsString()
  missionId?: string;

  @IsOptional()
  @IsEnum(VerificationMethod)
  verificationMethod?: VerificationMethod;

  @IsOptional()
  @IsString()
  receiptReference?: string;

  @IsOptional()
  @IsString()
  carrierCompany?: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @IsString()
  driverPhone?: string;

  @IsOptional()
  @IsString()
  vehicleIdentifier?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gpsLatitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gpsLongitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gpsAccuracyMeters?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class VerifyDeliveryCodeDto {
  @IsString()
  @MinLength(4)
  @MaxLength(12)
  code: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gpsLatitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gpsLongitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gpsAccuracyMeters?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class VerifyGuestDeliveryDto {
  @IsString()
  guestToken: string;

  @IsOptional()
  @IsBoolean()
  acceptProductConformity?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class OpenDeliveryDisputeDto {
  @IsEnum(DisputeScope)
  disputeScope: DisputeScope;

  @IsString()
  @MinLength(3)
  reason: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];

  @IsOptional()
  @IsString()
  guestToken?: string;
}

export class ResolveDeliveryDisputeDto {
  @IsIn([
    'RESOLVED_REFUND_BUYER',
    'RESOLVED_RELEASE_SELLER',
    'RESOLVED_RELEASE_COURIER',
    'RESOLVED_SPLIT',
    'REJECTED',
  ])
  resolutionStatus:
    | 'RESOLVED_REFUND_BUYER'
    | 'RESOLVED_RELEASE_SELLER'
    | 'RESOLVED_RELEASE_COURIER'
    | 'RESOLVED_SPLIT'
    | 'REJECTED';

  @IsString()
  @MinLength(5)
  resolutionSummary: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class SendCourierClientMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

export class AdminVerifyPartnerDto {
  @IsEnum(VerificationStatus)
  verificationStatus: VerificationStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDeliveryPlatformConfigDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(50)
  agencyCommissionRatePct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(50)
  independentCourierCommissionRatePct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(50)
  sellerPersonalCourierCommissionRatePct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(168)
  conformityWindowHours?: number;

  @IsOptional()
  @IsBoolean()
  manualAdminPayoutApprovalRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  codAllowedForPublicMissions?: boolean;

  @IsOptional()
  @IsBoolean()
  codAllowedForInterurban?: boolean;

  @IsOptional()
  @IsBoolean()
  allowOccasionalInterurbanCarrierWithoutAccount?: boolean;
}

