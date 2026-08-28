import { IsString, MaxLength, MinLength } from 'class-validator';

/** Changement de mot de passe (compte client — sécurité) */
export class ChangePasswordDto {
  @IsString({ message: 'Le mot de passe actuel est requis' })
  currentPassword: string;

  @IsString({ message: 'Le nouveau mot de passe est requis' })
  @MinLength(8, { message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(72, { message: 'Le nouveau mot de passe est trop long' })
  newPassword: string;
}
