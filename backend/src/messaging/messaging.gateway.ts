import { Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from '../common/guards/ws-auth.guard';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { extractWsToken } from '../common/utils/ws-token.util';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagingService } from './messaging.service';

interface AuthenticatedSocket extends Socket {
  data: AuthenticatedUser;
}

/** Payload JWT attendu dans handshake.auth.token / header Authorization */
interface JwtPayload {
  sub: string;
  email: string;
  role: AuthenticatedUser['role'];
}

/**
 * MessagingGateway — messagerie acheteur ↔ vendeur en temps réel.
 *
 * Conforme aux décisions d'architecture : WebSocket natif NestJS (Socket.IO),
 * SANS Redis tant que l'application est mono-instance. Les clients connectés
 * sont gérés en mémoire (rooms Socket.IO). Les messages sont persistés en base
 * par MessagingService AVANT diffusion → historique garanti hors connexion.
 *
 * Authentification : middleware de handshake (server.use) → un socket sans
 * JWT valide est REFUSÉ avant l'établissement (connect_error côté client),
 * aucune fenêtre possible. WsAuthGuard sur chaque handler en seconde ligne.
 *
 * Événements :
 *  - joinConversation  { conversationId } → rejoint la room
 *  - sendMessage       { conversationId, content } → persiste + diffuse
 *  - typing            { conversationId, isTyping } → indique la frappe
 *  - server → newMessage { conversationId, message }
 */
@WebSocketGateway({
  namespace: '/messaging',
  cors: {
    origin: (origin, callback) => {
      // Même politique CORS stricte que le HTTP (origines du frontend Next.js)
      const allowed = (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
      if (!origin || allowed.includes(origin)) callback(null, true);
      else callback(new Error('Origine non autorisée'));
    },
    credentials: true,
  },
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private readonly online = new Map<string, number>(); // userId → nb sockets

  constructor(
    private readonly messagingService: MessagingService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Authentification au handshake (conforme aux docs) : le JWT est vérifié
   * dans un middleware Socket.IO (server.use) → la connexion est REFUSÉE
   * avant l'établissement si le token est absent/invalide. La payload est
   * attachée à socket.data pour tous les handlers.
   */
  afterInit(server: Server) {
    server.use((socket, next) => {
      const token = extractWsToken(socket.handshake);
      if (!token) return next(new Error('Token manquant'));

      try {
        const payload = this.jwtService.verify<JwtPayload>(token, {
          secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
        });
        socket.data = {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
        };
        next();
      } catch {
        next(new Error('Token invalide ou expiré'));
      }
    });
  }

  handleConnection(client: AuthenticatedSocket) {
    // Le middleware a déjà authentifié : on compte juste les sockets en ligne
    this.online.set(client.data.id, (this.online.get(client.data.id) ?? 0) + 1);
    this.logger.debug(`Client connecté : ${client.data.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.data?.id) {
      const count = (this.online.get(client.data.id) ?? 1) - 1;
      if (count <= 0) this.online.delete(client.data.id);
      else this.online.set(client.data.id, count);
    }
  }

  /** Rejoint une conversation pour recevoir les événements temps réel */
  @UseGuards(WsAuthGuard)
  @SubscribeMessage('joinConversation')
  async joinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    if (!payload?.conversationId) throw new WsException('conversationId requis');
    // Vérifie l'accès avant de rejoindre la room
    await this.messagingService.getMessages(this.actor(client), payload.conversationId, undefined, 1);
    await client.join(`conversation:${payload.conversationId}`);
    return { ok: true, joined: payload.conversationId };
  }

  /** Envoie un message : persistance en base PUIS diffusion */
  @UseGuards(WsAuthGuard)
  @SubscribeMessage('sendMessage')
  async sendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string } & SendMessageDto,
  ) {
    if (!payload?.conversationId || !payload?.content) {
      throw new WsException('conversationId et content requis');
    }
    const { message, conversation } = await this.messagingService.addMessage(
      this.actor(client),
      payload.conversationId,
      payload.content,
    );
    this.server
      .to(`conversation:${conversation.id}`)
      .emit('newMessage', { conversationId: conversation.id, message });
    return { ok: true, message };
  }

  /** Indicateur de frappe (diffusé aux autres membres de la conversation) */
  @UseGuards(WsAuthGuard)
  @SubscribeMessage('typing')
  typing(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string; isTyping: boolean },
  ) {
    if (!payload?.conversationId) throw new WsException('conversationId requis');
    client.to(`conversation:${payload.conversationId}`).emit('typing', {
      conversationId: payload.conversationId,
      userId: client.data.id,
      isTyping: Boolean(payload.isTyping),
    });
    return { ok: true };
  }

  private actor(client: AuthenticatedSocket) {
    return { id: client.data.id, role: client.data.role };
  }
}
