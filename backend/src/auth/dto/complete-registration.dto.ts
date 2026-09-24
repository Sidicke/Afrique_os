import { Matches, 
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
 } from 'class-validator';

/**
 * Étape finale de l'inscription : mot de passe + code reçu par e-mail.
 * Le compte n'est créé que si le code est valide — l'e-mail est donc
 * prouvé vérifié dès la création.
 */
export class CompleteRegistrationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @MaxLength(160)
  email: string;
  @IsOptional() @IsString()
  referralCode?: string;

  @IsString()
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&_\-]).{8,}$/, { message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&_-)' })
  @MaxLength(72)
  password: string;

  /** Code à 6 chiffres reçu par e-mail */
  @IsString()
  @Length(6, 6, { message: 'Le code de vérification contient 6 chiffres' })
  code: string;

  /** Rôle initial : CLIENT (acheter) ou VENDEUR (vendre) */
  @IsOptional()
  @IsIn(['CLIENT', 'VENDEUR'])
  role?: 'CLIENT' | 'VENDEUR';

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  phone?: string;
}
