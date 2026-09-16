import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class FacebookAuthDto {
  @ApiProperty({ description: 'User Access Token fourni par le SDK Facebook Login' })
  @IsString()
  @IsNotEmpty({ message: 'Le token Facebook (accessToken) est requis' })
  accessToken: string;

  @ApiPropertyOptional({ description: 'Rôle souhaité (CLIENT par défaut, ou VENDEUR)', enum: ['CLIENT', 'VENDEUR'] })
  @IsOptional()
  @IsIn(['CLIENT', 'VENDEUR'], { message: 'Le rôle doit être CLIENT ou VENDEUR' })
  role?: 'CLIENT' | 'VENDEUR';

  @ApiPropertyOptional({ description: 'Nom de la boutique (requis si rôle = VENDEUR)' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  shopName?: string;

  @ApiPropertyOptional({ description: 'Numéro de téléphone de contact' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Mode d\'authentification (login: connexion uniquement, register: création)', enum: ['login', 'register'] })
  @IsOptional()
  @IsIn(['login', 'register'], { message: 'Le mode doit être login ou register' })
  mode?: 'login' | 'register';

  @ApiPropertyOptional({ description: 'Code de parrainage éventuel' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  referralCode?: string;
}
