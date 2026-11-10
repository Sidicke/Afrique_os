import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SavedIdempotencyRecord {
  statusCode: number;
  responseBody: any;
}

/**
 * Service d'idempotence — 1er pilier de sécurité des transactions financières.
 *
 * ⚠️ SCOPING PAR ENDPOINT (correctif C1 de l'audit de sécurité)
 * ------------------------------------------------------------------
 * L'enregistrement est identifié par le couple (key, path), et NON par la
 * seule `key`.
 *
 * Pourquoi : le client navigateur utilise une clé UUID par session de
 * checkout et la transmet sur PLUSIEURS endpoints (création de commande puis
 * création de facture de paiement). Avec une unicité globale sur `key`, la
 * 2e requête récupérait en cache la réponse de la 1re — une charge utile
 * d'un AUTRE type — et ne créerait jamais la transaction de paiement. Le
 * client affichait alors « Paiement confirmé » sans qu'aucun paiement n'ait
 * eu lieu.
 *
 * Conséquence du scoping : les caches de deux endpoints distincts sont
 * indépendants, tandis que l'idempotence reste garantie À L'INTÉRIEUR d'un
 * même endpoint (une clé rejouée sur le même path renvoie toujours la même
 * réponse).
 */
@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vérifie si une clé d'idempotence a déjà été enregistrée pour ce chemin.
   * Retourne l'enregistrement existant si présent et non expiré, sinon null.
   *
   * Le couple (key, path) est la clé primaire de recherche : une clé utilisée
   * sur un autre endpoint ne doit JAMAIS être considérée comme un hit.
   */
  async getRecord(key: string, path: string): Promise<SavedIdempotencyRecord | null> {
    if (!key || !path) return null;

    const record = await this.prisma.idempotencyKey.findUnique({
      // where: { key_path: { key, path } } — unicité composite déclarée dans
      // schema.prisma (@@unique([key, path])).
      where: { key_path: { key, path } },
    });

    if (!record) return null;

    // Si la clé est expirée, on la considère caduque
    if (record.expiresAt < new Date()) {
      await this.prisma.idempotencyKey
        .delete({ where: { key_path: { key, path } } })
        .catch(() => {});
      return null;
    }

    this.logger.log(
      `[Idempotency] Clé existante détectée "${key}" pour ${path}. Réponse réutilisée.`,
    );
    return {
      statusCode: record.statusCode,
      responseBody: record.responseBody,
    };
  }

  /**
   * Enregistre le résultat d'une opération sous la clé d'idempotence spécifiée.
   * TTL par défaut : 24 heures (86400 secondes).
   *
   * Le couple (key, path) constitue l'identifiant : deux endpoints peuvent
   * partager la même `key` sans s'écraser mutuellement.
   */
  async saveRecord(
    key: string,
    path: string,
    statusCode: number,
    responseBody: any,
    ttlSeconds = 86400,
  ): Promise<void> {
    if (!key || !path) return;

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    try {
      await this.prisma.idempotencyKey.upsert({
        where: { key_path: { key, path } },
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
      this.logger.log(
        `[Idempotency] Clé enregistrée avec succès : "${key}" (${path}, expire à ${expiresAt.toISOString()})`,
      );
    } catch (error: any) {
      this.logger.warn(
        `[Idempotency] Échec de sauvegarde de la clé "${key}" (${path}): ${error.message}`,
      );
    }
  }
}
