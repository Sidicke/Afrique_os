import { IsNumber, IsPositive, Min } from 'class-validator';

export class ApplyDiscountDto {
  @IsNumber({}, { message: 'Le prix convenu doit être un nombre valide' })
  @IsPositive({ message: 'Le prix convenu doit être strictement positif' })
  @Min(1, { message: 'Le prix convenu doit être au moins de 1 FCFA' })
  agreedPrice: number;
}
