import { IsEnum } from 'class-validator';
import { VerificationStatus } from '@prisma/client';

/** Décision de la plateforme sur une demande de vérification (réservé ADMIN) */
export class ReviewVerificationDto {
  @IsEnum(VerificationStatus)
  status: VerificationStatus;
}
