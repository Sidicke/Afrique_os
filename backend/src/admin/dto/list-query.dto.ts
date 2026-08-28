import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/** Période d'analyse (alignée sur le sélecteur du topbar admin) */
export enum AdminPeriodEnum {
  SEVEN_DAYS = '7_days',
  THIRTY_DAYS = '30_days',
  NINETY_DAYS = '90_days',
  THIS_YEAR = 'this_year',
}

/** Filtres de liste communs (recherche + statut + période) */
export class ListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  role?: string;

  @IsOptional()
  @IsEnum(AdminPeriodEnum)
  period?: AdminPeriodEnum;
}
