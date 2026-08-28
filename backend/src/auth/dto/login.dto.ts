import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Connexion unique : l'utilisateur se connecte avec son e-mail OU son
 * numéro de téléphone (les deux sont uniques) + mot de passe.
 * `identifier` accepte l'un ou l'autre ; les champs dédiés restent
 * acceptés pour compatibilité.
 */
export class LoginDto {
  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  phone?: string;

  /** Champ générique : e-mail ou téléphone (recommandé côté frontend) */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  identifier?: string;

  @IsString()
  @MaxLength(72)
  password: string;
}
