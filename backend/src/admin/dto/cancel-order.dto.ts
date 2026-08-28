import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Annulation administrative d'une commande — motif obligatoire (traçabilité) */
export class CancelOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
