import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MessageSender, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StartConversationDto } from './dto/start-conversation.dto';

/** Contexte d'un utilisateur authentifié (HTTP ou WebSocket) */
export interface Actor {
  id: string;
  role: 'ADMIN' | 'VENDEUR' | 'CLIENT';
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  
  async applyDiscountSeller(conversationId: string, sellerId: string, agreedPrice: number) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new Error("Conversation invalide");
    const boutique = await this.prisma.boutique.findUnique({ where: { id: conv.boutiqueId } });
    if (!boutique || boutique.ownerId !== sellerId) throw new Error("Conversation invalide");
    
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { agreedPrice }
    });
    
    // Ajouter un message système
    await this.prisma.message.create({
      data: {
        conversationId,
        senderRole: 'VENDEUR',
        content: `Le vendeur a appliqué une réduction. Nouveau prix convenu : ${agreedPrice} FCFA.`,
      }
    });
    
    return { success: true };
  }
  
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Conversations accessibles à l'acteur :
   * - Vendeur : toutes celles de ses boutiques
   * - Client : celles qu'il a initiées (userId)
   */
  async findConversations(actor: Actor) {
    const where: Prisma.ConversationWhereInput =
      actor.role === 'CLIENT'
        ? { userId: actor.id }
        : { boutique: { ownerId: actor.id } };

    const conversations = await this.prisma.conversation.findMany({
      where,
      include: {
        boutique: { select: { id: true, name: true, slug: true, logoImage: true } },
        user: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Messages NON LUS adressés à l'acteur : les messages de l'AUTRE partie
    // (le client ne compte que les messages du vendeur, et inversement).
    const ids = conversations.map((c) => c.id);
    const senderOfOtherParty =
      actor.role === 'CLIENT' ? MessageSender.VENDEUR : MessageSender.CLIENT;
    const unreadGroups = ids.length
      ? await this.prisma.message.groupBy({
          by: ['conversationId'],
          where: {
            conversationId: { in: ids },
            senderRole: senderOfOtherParty,
            readAt: null,
          },
          _count: { _all: true },
        })
      : [];
    const unreadByConversation = new Map(
      unreadGroups.map((g) => [g.conversationId, g._count._all]),
    );

    // Dernier message de chaque conversation (aperçu de la liste) — un seul
    // message par conversation, le plus récent.
    const lastMessages = ids.length
      ? await this.prisma.message.findMany({
          where: { conversationId: { in: ids } },
          orderBy: { createdAt: 'desc' },
          distinct: ['conversationId'],
          select: {
            conversationId: true,
            content: true,
            senderRole: true,
            createdAt: true,
          },
        })
      : [];
    const lastMessageByConversation = new Map(
      lastMessages.map((m) => [m.conversationId, m]),
    );

    return conversations.map((c) => {
      const last = lastMessageByConversation.get(c.id);
      return {
        id: c.id,
        userId: c.userId,
        clientName: c.clientName,
        clientPhone: c.clientPhone,
        lastMessageAt: c.lastMessageAt,
        /** Aperçu du dernier message (liste « Mes discussions ») */
        lastMessage: last?.content ?? null,
        lastMessageFrom: last ? (last.senderRole === 'CLIENT' ? 'client' : 'vendeur') : null,
        /** Contexte commercial (produit / commande) — la messagerie comprend le commerce */
        productId: c.productId ?? null,
        productName: c.productName ?? null,
        productPrice: c.productPrice ?? null,
        productDescription: c.productDescription ?? null,
        productImage: c.productImage ?? null,
        orderId: c.orderId ?? null,
        orderReference: c.orderReference ?? null,
        boutique: c.boutique,
        user: c.user ? { id: c.user.id, name: c.user.name, avatarUrl: c.user.avatarUrl } : null,
        _count: { messages: c._count.messages },
        /** Nombre de messages de l'autre partie non lus (badge) */
        unreadCount: unreadByConversation.get(c.id) ?? 0,
      };
    });
  }

  /** Historique paginé (pagination par curseur : avant la date donnée) */
  async getMessages(
    actor: Actor,
    conversationId: string,
    cursor?: string,
    limit = 30,
  ) {
    await this.assertAccess(actor, conversationId);
    const where: Prisma.MessageWhereInput = {
      conversationId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    };
    return this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      select: {
        id: true,
        senderRole: true,
        sender: { select: { id: true, name: true, avatarUrl: true } },
        content: true,
        readAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Un client ouvre une conversation avec une boutique.
   * Contexte commercial optionnel : la conversation peut être liée à un
   * produit (productId) et/ou une commande (orderId) — la messagerie
   * comprend le commerce. On réutilise le fil existant si le contexte
   * correspond (même produit ou même commande).
   */
  async startConversation(
    actor: Actor,
    boutiqueId: string,
    dto: StartConversationDto,
  ) {
    const boutique = await this.prisma.boutique.findFirst({
      where: { id: boutiqueId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!boutique) throw new NotFoundException('Boutique introuvable');

    // Le contexte COMMANDE est sensible : un client ne peut lier une
    // conversation qu'à SES PROPRES commandes — jamais celles d'autrui
    // (isolation stricte, un seul findFirst : commande inexistante, autre
    // boutique ou autre propriétaire → même erreur générique, aucune fuite
    // d'information).
    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: {
          id: dto.orderId,
          boutiqueId,
          ...(actor.role === 'CLIENT' ? { userId: actor.id } : {}),
        },
        select: { id: true },
      });
      if (!order) {
        throw new ForbiddenException(
          'Cette commande ne peut pas être associée à la conversation',
        );
      }
    }

    // Réutilise une conversation existante du même client avec la boutique
    // ET le même contexte (produit ou commande) — jamais de doublon de fil.
    const existing = actor.role === 'CLIENT'
      ? await this.prisma.conversation.findFirst({
          where: {
            boutiqueId,
            userId: actor.id,
            ...(dto.orderId
              ? { orderId: dto.orderId }
              : dto.productId
                ? { productId: dto.productId }
                : {}),
          },
        })
      : null;
    if (existing) return existing;

    const conversation = await this.prisma.conversation.create({
      data: {
        boutiqueId,
        userId: actor.role === 'CLIENT' ? actor.id : null,
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        lastMessageAt: new Date(),
        // Contexte commercial (snapshots pour l'affichage sans jointure)
        productId: dto.productId ?? null,
        productName: dto.productName ?? null,
        productPrice: dto.productPrice ?? null,
        productDescription: dto.productDescription ?? null,
        productImage: dto.productImage ?? null,
        orderId: dto.orderId ?? null,
        orderReference: dto.orderReference ?? null,
      },
      include: {
        boutique: { select: { id: true, name: true, slug: true, logoImage: true } },
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (dto.firstMessage) {
      await this.addMessage(actor, conversation.id, dto.firstMessage);
    }
    return conversation;
  }

  /**
   * Persiste un message (historique garanti même si le destinataire est hors
   * ligne) puis le renvoie prêt à diffuser sur le WebSocket.
   *
   * Quand c'est un CLIENT qui écrit, le VENDEUR reçoit une notification
   * (cloche du dashboard) — jamais pour ses propres messages.
   */
  async addMessage(actor: Actor, conversationId: string, content: string) {
    await this.assertAccess(actor, conversationId);
    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
      include: {
        boutique: { select: { ownerId: true, id: true, logoImage: true } },
      },
    });

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderRole:
          actor.role === 'CLIENT' ? MessageSender.CLIENT : MessageSender.VENDEUR,
        senderId: actor.id,
        content,
      },
      select: {
        id: true,
        senderRole: true,
        sender: { select: { id: true, name: true, avatarUrl: true } },
        content: true,
        readAt: true,
        createdAt: true,
      },
    });

    // Notification vendeur (fire-and-forget, jamais bloquant) : uniquement
    // quand le client écrit — le vendeur ne se notifie pas lui-même.
    if (actor.role === 'CLIENT') {
      void this.notifySellerNewMessage(conversation, content);
    }


    return {
      message,
      conversation: { id: conversation.id, boutiqueId: conversation.boutiqueId },
    };
  }

  /** Notification vendeur : nouveau message client (cloche du dashboard) */
  private async notifySellerNewMessage(
    conversation: {
      boutiqueId: string;
      boutique: { ownerId: string };
      clientName: string | null;
    },
    content: string,
  ) {
    try {
      await this.notificationsService.create(conversation.boutiqueId, {
        type: 'new_message',
        title: `Nouveau message de ${conversation.clientName ?? 'un client'}`,
        message: this.truncateMessage(content),
      });
    } catch (err) {
      this.logger.error(
        `[notifications] échec création nouveau message : ${(err as Error).message}`,
      );
    }
  }

  /** Tronque un message à 80 caractères SANS couper un emoji (code points) */
  private truncateMessage(content: string): string {
    const chars = Array.from(content);
    return chars.length > 80 ? `${chars.slice(0, 80).join('')}…` : content;
  }

  /** Marque les messages d'une conversation comme lus */
  async markRead(actor: Actor, conversationId: string) {
    await this.assertAccess(actor, conversationId);
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderRole:
          actor.role === 'CLIENT' ? MessageSender.VENDEUR : MessageSender.CLIENT,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  // ===== Helpers =====

  private async assertAccess(actor: Actor, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { boutique: { select: { ownerId: true } } },
    });
    if (!conversation) throw new NotFoundException('Conversation introuvable');
    const isVendeur = conversation.boutique.ownerId === actor.id;
    const isClient = conversation.userId === actor.id;
    if (!isVendeur && !isClient) {
      throw new ForbiddenException('Accès refusé à cette conversation');
    }
  }

}
