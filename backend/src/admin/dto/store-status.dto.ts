import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { BoutiqueStatus } from '@prisma/client';

/** Changement de statut d'une boutique par l'admin (suspendre, réactiver…) */
export class StoreStatusDto {
  @IsEnum(BoutiqueStatus)
  status: BoutiqueStatus;

  /** Motif — consigné dans le journal administratif (doc 20) */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
