import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { extractWsToken } from '../utils/ws-token.util';

/**
 * WsAuthGuard — authentifie la connexion WebSocket au handshake.
 * Le token est attendu dans handshake.auth.token (Socket.IO client) ou
 * handshake.headers.authorization.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<{
      handshake: Parameters<typeof extractWsToken>[0];
      data?: unknown;
    }>();
    const token = extractWsToken(client.handshake);

    if (!token) throw new WsException('Token manquant');

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        role: string;
      }>(token, {
        secret:
          this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
      });
      const user: AuthenticatedUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role as AuthenticatedUser['role'],
      };
      // Attache l'utilisateur au socket pour le gateway
      (client as unknown as { data: AuthenticatedUser }).data = user;
      return true;
    } catch {
      throw new WsException('Token invalide ou expiré');
    }
  }
}
