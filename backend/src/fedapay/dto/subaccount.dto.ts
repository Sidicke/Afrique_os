import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InviteSubAccountDto {
  @ApiProperty({ description: 'ID de la boutique associée au sous-compte' })
  @IsString()
  @IsNotEmpty()
  boutiqueId: string;

  @ApiProperty({ description: 'Email du vendeur/responsable pour recevoir l\'invitation FedaPay' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Nom complet du vendeur ou représentant de la boutique' })
  @IsString()
  @IsNotEmpty()
  fullName: string;
}

export class LinkSubAccountDto {
  @ApiProperty({ description: 'ID de la boutique' })
  @IsString()
  @IsNotEmpty()
  boutiqueId: string;

  @ApiProperty({ description: 'Référence du sous-compte FedaPay (ex: acc_123456789)' })
  @IsString()
  @IsNotEmpty()
  subAccountRef: string;
}

export class UpdateCommissionRateDto {
  @ApiProperty({ description: 'Taux de commission plateforme en pourcentage (ex: 5.0 pour 5%)' })
  @IsNotEmpty()
  commissionRate: number;
}
