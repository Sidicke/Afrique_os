import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Annulation d'une commande depuis la vitrine : le téléphone est OBLIGATOIRE
 * — seul le propriétaire de la commande (téléphone saisi à la commande) peut
 * l'annuler. Un numéro erroné reçoit un 404 (aucune fuite d'existence).
 * `reason` est OPTIONNEL : le motif choisi par le client est stocké sur la
 * commande et visible par le vendeur (et rappelé dans l'e-mail de confirmation).
 */
export class CancelOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Le téléphone est requis pour annuler la commande' })
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Le motif est trop long (300 caractères max)' })
  reason?: string;
}
