import { Matches,  IsString, MaxLength, MinLength  } from 'class-validator';

/** Changement de mot de passe (compte client — sécurité) */
export class ChangePasswordDto {
  @IsString({ message: 'Le mot de passe actuel est requis' })
  currentPassword: string;

  @IsString({ message: 'Le nouveau mot de passe est requis' })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&_\-]).{8,}$/, { message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&_-)' })
  @MaxLength(72, { message: 'Le nouveau mot de passe est trop long' })
  newPassword: string;
}
