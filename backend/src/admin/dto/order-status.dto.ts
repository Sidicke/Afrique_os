import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '@prisma/client';

/** Changement de statut d'une commande par l'admin (mêmes transitions que le vendeur) */
export class OrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  /** Motif — consigné dans le journal administratif (doc 20) */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
