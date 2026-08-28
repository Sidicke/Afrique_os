import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'client@demo.com' })
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @IsNotEmpty({ message: 'L\'e-mail est requis' })
  email: string;
}
