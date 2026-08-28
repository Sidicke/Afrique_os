import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ModerationStatus } from '@prisma/client';

/** Décision sur un signalement (réservé ADMIN) */
export class ReportDecisionDto {
  @IsEnum(ModerationStatus)
  status: ModerationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
