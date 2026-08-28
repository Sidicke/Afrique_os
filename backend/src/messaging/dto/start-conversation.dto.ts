import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class StartConversationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  clientName: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  clientPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  firstMessage?: string;

  // Contexte commercial (optionnel) — la messagerie comprend le commerce :
  // une conversation peut être liée à un produit et/ou une commande.
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  productName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  productPrice?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  productDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  productImage?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  orderReference?: string;
}
