import { IsNotEmpty, IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class RequestWithdrawalDto {
  @IsNumber({}, { message: 'Le montant doit être un nombre valide' })
  @Min(500, { message: 'Le montant minimum de retrait est de 500 FCFA' })
  amount: number;

  @IsString({ message: 'Les informations de paiement sont requises' })
  @IsNotEmpty({ message: 'Veuillez préciser le numéro ou compte de paiement' })
  @MaxLength(255, { message: 'Les informations de paiement sont trop longues' })
  paymentInfo: string;
}
