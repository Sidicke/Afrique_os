import { ApiProperty } from '@nestjs/swagger';
import { Matches, IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'client@demo.com' })
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @IsNotEmpty({ message: 'L\'e-mail est requis' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString({ message: 'Code invalide' })
  @IsNotEmpty({ message: 'Le code est requis' })
  code: string;

  @ApiProperty({ example: 'NouveauPass123' })
  @IsString({ message: 'Le mot de passe doit être une chaîne' })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&_\-]).{8,}$/, { message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&_-)' })
  newPassword: string;
}
