import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** @Roles('VENDEUR', 'ADMIN') — restreint une route à certains rôles */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
