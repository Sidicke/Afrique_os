import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Étape 2 → 3 de l'inscription : l'utilisateur a saisi son identité
 * (prénom, nom, e-mail) ; on lui envoie un code à 6 chiffres par e-mail.
 * Le téléphone est vérifié en unicité dès maintenant s'il est renseigné.
 */
export class SendRegistrationCodeDto {
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @MaxLength(160)
  email: string;

  /** Optionnel à cette étape — doit être unique s'il est fourni */
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  phone?: string;
}
