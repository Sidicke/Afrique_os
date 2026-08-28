import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  /**
   * Rôle du compte créé :
   *  - VENDEUR (défaut) : crée aussi une boutique en PENDING
   *  - CLIENT : acheteur (nécessaire pour la messagerie)
   * ADMIN reste réservé (jamais créable via l'inscription).
   */
  @IsOptional()
  @IsIn(['CLIENT', 'VENDEUR'])
  role?: 'CLIENT' | 'VENDEUR';

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  shopName?: string;

  @IsEmail()
  @MaxLength(160)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;
}
