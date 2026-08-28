import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/** Rétention par défaut des notifications (jours) avant purge automatique */
export const DEFAULT_RETENTION_DAYS = 30;

/** Entrée de création d'une notification vendeur */
export interface CreateNotificationInput {
  type: string;
  title: string;
  message?: string;
  orderReference?: string;
}

/**
 * Notifications affichées au VENDEUR (cloche du dashboard). Créées côté
 * serveur sur des événements métier (ex. annulation de commande par un client).
 * Toutes les requêtes sont scopées à la boutique (isolation multi-vendeur).
 *
 * Chaque type respecte la PRÉFÉRENCE du vendeur (champ JSON `notifications`
 * de la boutique, éditée dans Paramètres) : un type explicitement désactivé
 * n'est pas créé. Une préférence absente = activée (rétrocompatibilité).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  /** Durée de rétention (jours) — configurable via NOTIFICATION_RETENTION_DAYS */
  private readonly retentionDays: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const raw = config.get<string>('NOTIFICATION_RETENTION_DAYS');
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    this.retentionDays =
      Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS;
  }

  /**
   * Purge automatique des notifications plus vieilles que la rétention.
   * Appelée paresseusement à chaque accès (create/findAll/unreadCount) :
   * aucune tâche planifiée nécessaire — la première lecture après 30 jours
   * nettoie. Ne jette jamais (la purge ne doit pas casser le flux appelant).
   */
  private async purgeExpired(boutiqueId: string) {
    try {
      const cutoff = new Date(Date.now() - this.retentionDays * 86_400_000);
      const { count } = await this.prisma.notification.deleteMany({
        where: { boutiqueId, createdAt: { lt: cutoff } },
      });
      if (count > 0) {
        this.logger.log(
          `[notifications] purge automatique : ${count} notification(s) de plus de ${this.retentionDays} jours supprimée(s)`,
        );
      }
    } catch (err) {
      this.logger.error(
        `[notifications] échec purge automatique : ${(err as Error).message}`,
      );
    }
  }

  /**
   * Crée une notification pour la boutique (jamais bloquante pour
   * l'appelant). Retourne la notification créée, ou null si le vendeur a
   * désactivé ce type d'événement dans ses préférences.
   *
   * `knownPrefs` (optionnel) : préférences déjà chargées par l'appelant
   * (ex. la boutique incluse dans la requête d'annulation) — évite un
   * `findUnique` supplémentaire. Sinon, elles sont lues en base.
   */
  async create(
    boutiqueId: string,
    input: CreateNotificationInput,
    knownPrefs?: unknown,
  ) {
    await this.purgeExpired(boutiqueId);
    if (!(await this.isTypeEnabled(boutiqueId, input.type, knownPrefs))) {
      return null;
    }
    return this.prisma.notification.create({
      data: {
        boutiqueId,
        type: input.type,
        title: input.title,
        message: input.message,
        orderReference: input.orderReference,
      },
    });
  }

  /**
   * La préférence du vendeur active-t-elle ce type d'événement ?
   * - préférence `enabled: false` → désactivé
   * - préférence absente / pas de préférences → activé (défaut)
   * Si `prefs` est fourni (déjà chargé par l'appelant), il est utilisé tel
   * quel ; sinon le champ JSON `notifications` de la boutique est lu en base.
   */
  private async isTypeEnabled(
    boutiqueId: string,
    type: string,
    prefs?: unknown,
  ): Promise<boolean> {
    let raw = prefs;
    if (raw === undefined) {
      const boutique = await this.prisma.boutique.findUnique({
        where: { id: boutiqueId },
        select: { notifications: true },
      });
      raw = boutique?.notifications;
    }
    if (!Array.isArray(raw) || raw.length === 0) return true;
    // Le JSON de la boutique est `[{ id, label, description, enabled }]`
    const typed = raw as {
      id?: string;
      enabled?: boolean;
    }[];
    const match = typed.find((p) => p?.id === type);
    if (!match) return true; // type non listé → activé par défaut
    return match.enabled !== false;
  }

  /** Liste des notifications de la boutique (plus récentes d'abord) */
  async findAll(boutiqueId: string) {
    await this.purgeExpired(boutiqueId);
    return this.prisma.notification.findMany({
      where: { boutiqueId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Nombre de notifications NON LUES (badge de la cloche). PAS de purge ici :
   * le dashboard poll `unreadCount` et `findAll` ensemble (`Promise.all` toutes
   * les 30 s) — `findAll` purge déjà. La purge dans `create` couvre le cas
   * « le panneau n'est jamais ouvert ». Évite un `deleteMany` no-op par cycle.
   */
  async unreadCount(boutiqueId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { boutiqueId, readAt: null },
    });
  }

  /** Marque une notification comme lue (scopée à la boutique) */
  async markAsRead(boutiqueId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, boutiqueId, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      // Soit inexistante, soit déjà lue — aucune fuite d'existence
      throw new NotFoundException('Notification introuvable');
    }
    return { success: true };
  }

  /** Marque TOUTES les notifications de la boutique comme lues */
  async markAllAsRead(boutiqueId: string) {
    await this.prisma.notification.updateMany({
      where: { boutiqueId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  /**
   * Supprime TOUTES les notifications de la boutique (bouton « tout
   * supprimer » du panneau). Retourne le nombre de lignes supprimées.
   */
  async deleteAll(boutiqueId: string) {
    const { count } = await this.prisma.notification.deleteMany({
      where: { boutiqueId },
    });
    return { success: true, deleted: count };
  }
}
