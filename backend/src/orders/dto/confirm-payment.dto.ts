import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Confirmation de paiement par le CLIENT (vitrine). Le téléphone est
 * OBLIGATOIRE pour un visiteur sans compte — c'est lui qui prouve la
 * propriété de la commande (même règle que l'annulation). Un client connecté
 * est identifié par son token (userId) : le téléphone devient optionnel.
 * Un numéro erroné reçoit un 404 (aucune fuite d'existence).
 */
export class ConfirmPaymentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Le téléphone est requis pour confirmer le paiement' })
  @MaxLength(30, { message: 'Numéro de téléphone invalide' })
  phone?: string;

  /**
   * Référence de la transaction côté fournisseur de paiement (Mobile Money /
   * carte). Stockée sur la commande pour traçabilité. Optionnelle : le
   * paiement simulé peut ne pas en produire.
   */
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Référence de transaction invalide' })
  transactionRef?: string;
}
