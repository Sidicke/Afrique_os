import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { TeamMemberRole, TeamMemberStatus } from '@prisma/client';

export class InviteTeamMemberDto {
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email: string;

  @IsOptional()
  @IsEnum(TeamMemberRole, { message: 'Rôle invalide (ADMIN, EDITOR, VIEWER)' })
  role?: TeamMemberRole;

  @IsOptional()
  @IsString()
  name?: string;
}

export class UpdateTeamMemberDto {
  @IsOptional()
  @IsEnum(TeamMemberRole, { message: 'Rôle invalide' })
  role?: TeamMemberRole;

  @IsOptional()
  @IsEnum(TeamMemberStatus, { message: 'Statut invalide' })
  status?: TeamMemberStatus;
}
