import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

/** Mise à jour d'un abonnement par l'admin (plan et/ou statut) */
export class SubscriptionUpdateDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  /** Motif — consigné dans le journal administratif (doc 20) */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
