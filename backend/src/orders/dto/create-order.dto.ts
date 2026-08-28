import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsString() productId: string;
  @IsOptional() @IsString() variantId?: string;
  @IsInt() @Min(1) quantity: number;
}

const PAYMENT_METHODS = ['MOBILE_MONEY', 'CASH_ON_DELIVERY', 'CARD', 'WHATSAPP_DIRECT'] as const;

export class CreateOrderDto {
  @IsString() @MinLength(2) @MaxLength(120)
  customerName: string;

  @IsString() @MinLength(5) @MaxLength(30)
  customerPhone: string;

  @IsOptional() @IsString() @MaxLength(255)
  address?: string;

  @IsOptional() @IsString()
  conversationId?: string;
  @IsOptional()
  pointsToUse?: number;

  @IsOptional() @IsEmail() @MaxLength(160)
  customerEmail?: string;

  @IsOptional() @IsString() @MaxLength(120)
  city?: string;

  @IsOptional() @IsString() @MaxLength(120)
  country?: string;

  @IsIn(PAYMENT_METHODS)
  paymentMethod: (typeof PAYMENT_METHODS)[number];

  @IsOptional() @IsString() @MaxLength(80)
  deliveryName?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  deliveryPrice?: number;

  @IsOptional() @IsString() @MaxLength(1000)
  notes?: string;

  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
