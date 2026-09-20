import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SocialLinksDto {
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() twitter?: string;
  @IsOptional() @IsString() linkedin?: string;
  @IsOptional() @IsString() tiktok?: string;
}

export class DeliveryPackDto {
  @IsString() id: string;
  @IsString() name: string;
  @IsOptional() price?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() badge?: string;
}

export class PromotionDto {
  @IsString() productId: string;
  @IsOptional() discountPercent?: number;
}

export class NotificationSettingDto {
  @IsString() id: string;
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() enabled?: boolean;
}

export class CreateBoutiqueDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional() @IsString() @MaxLength(140) tagline?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
  @IsOptional() monthlyGoalFcfa?: number;
  @IsOptional() @IsEmail() @MaxLength(160) email?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(30) whatsappNumber?: string;

  @IsOptional() @IsString() coverImage?: string;
  @IsOptional() @IsString() logoImage?: string;

  @IsOptional() @IsString() deliveryShortLabel?: string;
  @IsOptional() @IsString() deliveryNote?: string;
  @IsOptional() @IsString() warrantyNote?: string;
  @IsOptional() @IsString() paymentNote?: string;

  @IsOptional() @ValidateNested() @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => DeliveryPackDto)
  deliveryPacks?: DeliveryPackDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PromotionDto)
  promotions?: PromotionDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => NotificationSettingDto)
  notifications?: NotificationSettingDto[];
}
