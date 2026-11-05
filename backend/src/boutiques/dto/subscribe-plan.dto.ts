import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubscribePlanDto {
  @IsString()
  @IsIn(['starter', 'pro', 'business', 'enterprise'])
  plan!: 'starter' | 'pro' | 'business' | 'enterprise';

  @IsOptional()
  @IsString()
  @IsIn(['PAYDUNYA', 'MOBILE_MONEY', 'CARD', 'DIRECT'])
  paymentMethod?: 'PAYDUNYA' | 'MOBILE_MONEY' | 'CARD' | 'DIRECT';

  @IsOptional()
  @IsString()
  @MaxLength(40)
  operator?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
