import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * OptionalJwtAuthGuard — auth « si possible » pour les routes publiques.
 * --------------------------------------------------------------------------
 * Sur une route @Public(), le JwtAuthGuard global ne parse jamais le token :
 * l'utilisateur connecté serait traité comme un visiteur. Ce guard tente
 * d'authentifier quand un header `Authorization: Bearer …` valide est fourni
 * (req.user rempli), mais ne bloque JAMAIS la requête sinon — le visiteur
 * reste anonyme (ex. : associer une commande à un compte, sans obliger la
 * connexion pour acheter).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      // Token absent, expiré ou invalide → on continue en anonyme
      return true;
    }
  }
}
