import { Role } from '@prisma/client';

/** Utilisateur attaché à req.user par JwtAuthGuard (payload du token access) */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}
