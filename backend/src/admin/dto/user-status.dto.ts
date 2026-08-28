import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserStatus } from '@prisma/client';

/** Blocage / réactivation d'un compte utilisateur (réservé ADMIN) */
export class UserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;

  /** Motif — consigné dans le journal administratif (doc 20) */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
