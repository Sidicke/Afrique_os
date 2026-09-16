import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SavedIdempotencyRecord {
  statusCode: number;
  responseBody: any;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vérifie si une clé d'idempotence a déjà été enregistrée pour ce chemin.
   * Retourne l'enregistrement existant si présent et non expiré, sinon null.
   */
  async getRecord(key: string, path: string): Promise<SavedIdempotencyRecord | null> {
    if (!key) return null;

    const record = await this.prisma.idempotencyKey.findUnique({
      where: { key },
    });

    if (!record) return null;

    // Si la clé est expirée, on la considère caduque
    if (record.expiresAt < new Date()) {
      await this.prisma.idempotencyKey.delete({ where: { id: record.id } }).catch(() => {});
      return null;
    }

    this.logger.log(`[Idempotency] Clé existante détectée "${key}" pour ${path}. Réponse réutilisée.`);
    return {
      statusCode: record.statusCode,
      responseBody: record.responseBody,
    };
  }

  /**
   * Enregistre le résultat d'une opération sous la clé d'idempotence spécifiée.
   * TTL par défaut : 24 heures (86400 secondes).
   */
  async saveRecord(
    key: string,
    path: string,
    statusCode: number,
    responseBody: any,
    ttlSeconds = 86400,
  ): Promise<void> {
    if (!key) return;

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    try {
      await this.prisma.idempotencyKey.upsert({
        where: { key },
        create: {
          key,
          path,
          statusCode,
          responseBody: responseBody ?? {},
          expiresAt,
        },
        update: {
          statusCode,
          responseBody: responseBody ?? {},
          expiresAt,
        },
      });
      this.logger.log(`[Idempotency] Clé enregistrée avec succès : "${key}" (expire à ${expiresAt.toISOString()})`);
    } catch (error: any) {
      this.logger.warn(`[Idempotency] Échec de sauvegarde de la clé "${key}": ${error.message}`);
    }
  }
}
