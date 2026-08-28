import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80)
  name?: string;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @IsOptional() @IsEmail() @MaxLength(160)
  email?: string;

  @IsOptional() @IsString() @MaxLength(255)
  defaultAddress?: string;

  @IsOptional() @IsString() @MaxLength(100)
  defaultCity?: string;

  @IsOptional() @IsString()
  defaultPaymentMethod?: any; // Utilise type as PaymentMethod dans le service

  @IsOptional() @IsString()
  avatarUrl?: string;
}
