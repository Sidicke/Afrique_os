import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateFedaPayTransactionDto {
  @ApiProperty({ description: 'ID de la commande à payer' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({
    description: "Canal de paiement : 'MOBILE_MONEY' (frais acheteur 2%) ou 'CARD' (frais acheteur 4%)",
    enum: ['MOBILE_MONEY', 'CARD'],
    default: 'MOBILE_MONEY',
  })
  @IsIn(['MOBILE_MONEY', 'CARD'])
  @IsOptional()
  paymentChannel?: 'MOBILE_MONEY' | 'CARD';

  @ApiPropertyOptional({ description: 'URL de redirection après succès du paiement' })
  @IsUrl()
  @IsOptional()
  callbackUrl?: string;

  @ApiPropertyOptional({ description: 'Nom complet du client' })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Email du client' })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Numéro de téléphone du client' })
  @IsString()
  @IsOptional()
  customerPhone?: string;
}
