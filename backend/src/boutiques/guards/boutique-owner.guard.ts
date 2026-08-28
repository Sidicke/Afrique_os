import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

/**
 * BoutiqueOwnerGuard — isolation des données multi-vendeur.
 * Vérifie que la boutique identifiée par le paramètre `:id` (ou `:boutiqueId`)
 * appartient bien à l'utilisateur connecté. Un vendeur ne peut jamais accéder
 * aux ressources d'une boutique qui n'est pas la sienne.
 */
@Injectable()
export class BoutiqueOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params: Record<string, string>;
    }>();
    const user = request.user;
    if (!user) throw new ForbiddenException('Non autorisé');

    // Priorité à :boutiqueId (routes imbriquées comme /orders/boutique/:boutiqueId/:id)
    // puis à :id (routes directes comme /boutiques/:id)
    const boutiqueId = request.params.boutiqueId ?? request.params.id;
    if (!boutiqueId) throw new NotFoundException('Boutique introuvable');

    const boutique = await this.prisma.boutique.findUnique({
      where: { id: boutiqueId },
      select: { id: true, ownerId: true },
    });
    if (!boutique) throw new NotFoundException('Boutique introuvable');
    if (boutique.ownerId !== user.id) {
      throw new ForbiddenException('Vous ne pouvez pas accéder à cette boutique');
    }
    return true;
  }
}
