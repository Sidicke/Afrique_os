import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSubscriptionPaymentDto {
  @IsNotEmpty({ message: "L'identifiant de la boutique est requis." })
  @IsString()
  boutiqueId: string;

  @IsNotEmpty({ message: 'Le slug du forfait/plan est requis.' })
  @IsString()
  planSlug: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
