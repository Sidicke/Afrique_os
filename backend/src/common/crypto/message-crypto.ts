import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV standard pour GCM
const PREFIX = 'enc:v1:';

export class MessageCrypto {
  /**
   * Retourne la clé de chiffrement 256 bits (32 octets) dérivée via SHA-256.
   *
   * Ordre de priorité :
   *   1. `secret` passé explicitement (usage test / multi-clé future)
   *   2. Variable d'environnement MESSAGING_ENCRYPTION_KEY (obligatoire en production)
   *
   * Lève une erreur si aucune clé n'est disponible — jamais de fallback hardcodé,
   * car cela permettrait à quiconque connaissant le code source de déchiffrer
   * toute la messagerie (CWE-321).
   */
  private static getKey(secret?: string): Buffer {
    const rawSecret = secret || process.env.MESSAGING_ENCRYPTION_KEY;

    if (!rawSecret) {
      throw new Error(
        '[MessageCrypto] MESSAGING_ENCRYPTION_KEY est obligatoire. ' +
          'Définissez cette variable dans votre fichier .env avant de démarrer.',
      );
    }

    return createHash('sha256').update(rawSecret).digest();
  }

  /**
   * Chiffre un message en AES-256-GCM (Chiffrement Authentifié avec Tag de Contrôle).
   * Format de sortie : `enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>`
   *
   * Lève une exception si le chiffrement échoue — ne stocke JAMAIS en clair
   * silencieusement (évite la régression CWE-312).
   */
  static encrypt(plainText: string, secret?: string): string {
    if (!plainText) return '';

    const key = this.getKey(secret);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Déchiffre un message chiffré en AES-256-GCM.
   * Rétrocompatible avec les anciens messages stockés en clair (sans préfixe enc:v1:).
   *
   * Lève une exception si le déchiffrement échoue (clé incorrecte ou message altéré) —
   * retourne un placeholder uniquement pour les erreurs de format.
   */
  static decrypt(cipherText: string | null | undefined, secret?: string): string {
    if (!cipherText) return '';
    if (!cipherText.startsWith(PREFIX)) {
      // Message historique non chiffré (rétrocompatibilité)
      return cipherText;
    }

    const parts = cipherText.split(':');
    // Format attendu: ['enc', 'v1', '<iv>', '<authTag>', '<encrypted>']
    if (parts.length !== 5) {
      return '[Format de message invalide]';
    }

    const key = this.getKey(secret);
    const iv = Buffer.from(parts[2], 'hex');
    const authTag = Buffer.from(parts[3], 'hex');
    const encrypted = parts[4];

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
