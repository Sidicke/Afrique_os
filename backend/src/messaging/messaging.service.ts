import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MessageSender, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StartConversationDto } from './dto/start-conversation.dto';
import { MessageCrypto } from '../common/crypto/message-crypto';

/** Contexte d'un utilisateur authentifié (HTTP ou WebSocket) */
export interface Actor {
  id: string;
  role: 'ADMIN' | 'VENDEUR' | 'CLIENT';
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async applyDiscountSeller(conversationId: string, sellerId: string, agreedPrice: number) {
    if (!agreedPrice || agreedPrice <= 0 || !Number.isFinite(agreedPrice)) {
      throw new BadRequestException('Le prix convenu doit être un montant strictement positif');
    }

    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { boutique: { select: { id: true, ownerId: true } } },
    });
    if (!conv) {
      throw new NotFoundException('Conversation introuvable');
    }
    if (conv.boutique.ownerId !== sellerId) {
      throw new ForbiddenException('Vous n’êtes pas autorisé à modifier cette discussion');
    }
    
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { agreedPrice },
    });
    
    // Ajouter un message système visible dans la discussion (chiffré en base)
    const formatted = new Intl.NumberFormat('fr-FR').format(agreedPrice);
    const plainContent = `Le vendeur a appliqué un prix négocié : ${formatted} FCFA.`;
    await this.prisma.message.create({
      data: {
        conversationId,
        senderRole: 'VENDEUR',
        content: MessageCrypto.encrypt(plainContent),
      },
    });
    
    return { success: true, agreedPrice };
  }

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
        lastMessage: MessageCrypto.decrypt(last?.content ?? null),
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
    const messages = await this.prisma.message.findMany({
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

    return messages.map((m) => ({
      ...m,
      content: MessageCrypto.decrypt(m.content),
    }));
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
    let existing = null;
    if (dto.orderId) {
      existing = await this.prisma.conversation.findFirst({
        where: { boutiqueId, orderId: dto.orderId },
      });
    } 
    
    if (!existing && actor.role === 'CLIENT') {
      existing = await this.prisma.conversation.findFirst({
        where: {
          boutiqueId,
          userId: actor.id,
          ...(dto.productId ? { productId: dto.productId } : {}),
        },
      });
    }

    // FALLBACK: If no conversation by order/product context, find the latest conversation for this client
    if (!existing && (dto.clientPhone || actor.role === 'CLIENT')) {
      const orConditions: any[] = [];
      if (actor.role === 'CLIENT') orConditions.push({ userId: actor.id });
      if (dto.clientPhone) orConditions.push({ clientPhone: dto.clientPhone });
      
      if (orConditions.length > 0) {
        existing = await this.prisma.conversation.findFirst({
          where: { boutiqueId, OR: orConditions },
          orderBy: { lastMessageAt: 'desc' }
        });
      }
    }

    // Sécurisation du contexte commercial : extraction exclusive depuis les données réelles en base
    let productName = null;
    let productPrice = null;
    let productNumericPrice = 0;
    let productDescription = null;
    let productImage = null;

    if (dto.productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: dto.productId, boutiqueId, isActive: true },
      });
      if (product) {
        productName = product.name;
        productNumericPrice = Number(product.price) || 0;
        productPrice = `${product.price} ${product.currency}`;
        productDescription = product.description ?? null;
        productImage =
          Array.isArray(product.images) && product.images.length > 0
            ? String(product.images[0])
            : null;
      }
    }

    if (existing) {
      // If we found an existing thread but we have a new order context, link it
      if (dto.orderId && !existing.orderId) {
        await this.prisma.conversation.update({
          where: { id: existing.id },
          data: { orderId: dto.orderId }
        });
      } else if (!existing.orderId && dto.productId && productName && productPrice !== null) {
        // Auto-create a pending order if they discuss a product and don't have an order yet
        const time = Date.now().toString(36).toUpperCase();
        const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
        const newRef = `AC-${time}-${rand}`;
        
        const newOrder = await this.prisma.order.create({
          data: {
            reference: newRef,
            boutiqueId,
            userId: actor.role === 'CLIENT' ? actor.id : null,
            customerName: dto.clientName || 'Client (Discussion)',
            customerPhone: dto.clientPhone || 'N/A',
            status: 'PENDING',
            paymentMethod: 'WHATSAPP_DIRECT',
            total: productNumericPrice,
            items: {
              create: {
                productId: dto.productId,
                productName: productName,
                quantity: 1,
                unitPrice: productNumericPrice,
              }
            }
          }
        });
        
        await this.prisma.conversation.update({
          where: { id: existing.id },
          data: { 
            orderId: newOrder.id,
            orderReference: `#${newRef}`,
            productId: dto.productId,
            productName,
            productPrice,
            productDescription,
            productImage
          }
        });
      }
      
      if (dto.firstMessage) {
        await this.addMessage(actor, existing.id, dto.firstMessage);
      }
      return existing;
    }

    let orderReference = null;
    let actualOrderId = dto.orderId ?? null;

    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: {
          id: dto.orderId,
          boutiqueId,
          ...(actor.role === 'CLIENT' ? { userId: actor.id } : {}),
        },
        select: { id: true, reference: true },
      });
      if (order) {
        orderReference = `#${order.reference}`;
      }
    } else if (dto.productId && productName && productPrice !== null) {
      // Auto-create a pending order when a discussion is started for a product
      const time = Date.now().toString(36).toUpperCase();
      const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
      const newRef = `AC-${time}-${rand}`;
      
      const newOrder = await this.prisma.order.create({
        data: {
          reference: newRef,
          boutiqueId,
          userId: actor.role === 'CLIENT' ? actor.id : null,
          customerName: dto.clientName || 'Client (Discussion)',
          customerPhone: dto.clientPhone || 'N/A',
          status: 'PENDING',
          paymentMethod: 'WHATSAPP_DIRECT',
          total: productNumericPrice,
          items: {
            create: {
              productId: dto.productId,
              productName: productName,
              quantity: 1,
              unitPrice: productNumericPrice,
            }
          }
        }
      });
      actualOrderId = newOrder.id;
      orderReference = `#${newRef}`;
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        boutiqueId,
        userId: actor.role === 'CLIENT' ? actor.id : null,
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        lastMessageAt: new Date(),
        // Contexte commercial certifié serveur
        productId: dto.productId ?? null,
        productName,
        productPrice,
        productDescription,
        productImage,
        orderId: actualOrderId,
        orderReference,
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

    const encryptedContent = MessageCrypto.encrypt(content);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderRole:
          actor.role === 'CLIENT' ? MessageSender.CLIENT : MessageSender.VENDEUR,
        senderId: actor.id,
        content: encryptedContent,
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
      message: {
        ...message,
        content, // Renvoyé en clair aux membres autorisés de la conversation
      },
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
    if (actor.role === 'ADMIN') return;
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
