import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

/** Mise à jour d'un plan d'abonnement (PlansManager) */
export class PlanUpdateDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
