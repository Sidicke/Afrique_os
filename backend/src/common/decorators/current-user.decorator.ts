import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * @CurrentUser() — extrait l'utilisateur authentifié de la requête.
 * Usage : @CurrentUser() user: AuthenticatedUser
 *         @CurrentUser('id') userId: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
