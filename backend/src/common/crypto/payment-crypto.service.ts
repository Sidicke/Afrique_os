import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV standard pour AES-GCM
const PREFIX = 'pay_enc:v1:';

@Injectable()
export class PaymentCryptoService {
  private readonly logger = new Logger(PaymentCryptoService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Clé 256 bits dérivée via SHA-256 à partir du secret JWT ou d'une variable dédiée PAYMENT_ENCRYPTION_KEY
   */
  private getKey(): Buffer {
    const rawSecret =
      this.configService.get<string>('PAYMENT_ENCRYPTION_KEY') ??
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
      'afrique-os-payment-master-secret-fallback-key-2026';

    return createHash('sha256').update(rawSecret).digest();
  }

  /**
   * Chiffre les données sensibles de paiement en AES-256-GCM
   * Format: `pay_enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>`
   */
  encrypt(plainText: string): string {
    if (!plainText) return '';

    try {
      const key = this.getKey();
      const iv = randomBytes(IV_LENGTH);
      const cipher = createCipheriv(ALGORITHM, key, iv);

      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');

      return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error: any) {
      this.logger.error(`[PaymentCrypto] Échec chiffrement: ${error.message}`);
      throw new Error(`Erreur lors du chiffrement des données de paiement.`);
    }
  }

  /**
   * Déchiffre les données sensibles avec vérification d'intégrité (Auth Tag)
   */
  decrypt(cipherText: string | null | undefined): string {
    if (!cipherText) return '';
    if (!cipherText.startsWith(PREFIX)) {
      return cipherText; // Rétrocompatibilité données historiques en clair
    }

    const parts = cipherText.split(':');
    if (parts.length !== 5) {
      return '[Données de paiement invalides]';
    }

    try {
      const key = this.getKey();
      const iv = Buffer.from(parts[2], 'hex');
      const authTag = Buffer.from(parts[3], 'hex');
      const encrypted = parts[4];

      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return '[Données sensibles altérées ou clé invalide]';
    }
  }
}
