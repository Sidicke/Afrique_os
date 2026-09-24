import { Matches,  IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength  } from 'class-validator';

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
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&_\-]).{8,}$/, { message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&_-)' })
  @MaxLength(72)
  password: string;
}
