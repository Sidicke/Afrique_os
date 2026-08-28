import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { VerificationStatus } from '@prisma/client';

/** Décision de vérification d'une boutique (réservé ADMIN) */
export class VerificationDecisionDto {
  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
