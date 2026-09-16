import { MessageCrypto } from '../src/common/crypto/message-crypto';

describe('🔐 Tests Unitaires & Sécurité du Chiffrement AES-256-GCM de la Messagerie', () => {
  const samplePlainTexts = [
    'Bonjour, je souhaite commander 5 unités de ce produit.',
    'Prix négocié : 35 000 FCFA avec livraison incluse à Abidjan Cocody 🚚✨',
    'Numéro MoMo / Wave pour le paiement : +225 07 00 00 00 00 🔒',
    'Test avec caractères spéciaux : é, è, ê, à, ç, ñ, , 日本語, 🌍📦💼',
    'Un texte long avec plusieurs lignes\nLigne 2\nLigne 3 avec tabulations\tFin.',
  ];

  describe('1. 🛡️ Chiffrement & Non-Stockage en Clair (Confidentialité)', () => {
    it('Chiffre les messages avec le format sécurisé enc:v1:<iv>:<authTag>:<ciphertext>', () => {
      for (const plain of samplePlainTexts) {
        const cipher = MessageCrypto.encrypt(plain);

        // 1. Ne doit JAMAIS contenir le texte en clair
        expect(cipher).not.toContain(plain);

        // 2. Doit porter le préfixe de version
        expect(cipher.startsWith('enc:v1:')).toBe(true);

        // 3. Doit comporter exactement 5 segments délimités par des deux-points
        const parts = cipher.split(':');
        expect(parts.length).toBe(5);

        // 4. L'IV doit faire 12 octets (24 caractères hexadécimaux)
        expect(parts[2].length).toBe(24);

        // 5. L'Auth Tag GCM doit faire 16 octets (32 caractères hexadécimaux)
        expect(parts[3].length).toBe(32);
      }
    });

    it('Génère des IV uniques (Nonces) pour deux chiffrements identiques (Anti-Replay & Indistinguabilité)', () => {
      const message = 'Message identique chiffré deux fois';
      const cipher1 = MessageCrypto.encrypt(message);
      const cipher2 = MessageCrypto.encrypt(message);

      // Les deux chiffrés doivent être distincts même pour un texte source identique
      expect(cipher1).not.toBe(cipher2);

      // Mais tous les deux doivent se déchiffrer vers le message original
      expect(MessageCrypto.decrypt(cipher1)).toBe(message);
      expect(MessageCrypto.decrypt(cipher2)).toBe(message);
    });
  });

  describe('2. 🔓 Déchiffrement & Intégrité des Données', () => {
    it('Restaure parfaitement tous les textes d’origine après déchiffrement', () => {
      for (const plain of samplePlainTexts) {
        const cipher = MessageCrypto.encrypt(plain);
        const decrypted = MessageCrypto.decrypt(cipher);
        expect(decrypted).toBe(plain);
      }
    });

    it('Rejette et gère en toute sécurité les chiffrés altérés ou corrompus (Anti-Tampering)', () => {
      const plain = 'Message confidentiel anti-altération';
      const cipher = MessageCrypto.encrypt(plain);

      // Altération du ciphertext
      const parts = cipher.split(':');
      parts[4] = parts[4].slice(0, -2) + 'ff'; // Modification d'un octet
      const corruptedCipher = parts.join(':');

      const decrypted = MessageCrypto.decrypt(corruptedCipher);
      // Ne doit pas planter avec une exception non gérée et doit retourner un message de sécurité
      expect(decrypted).not.toBe(plain);
      expect(decrypted).toContain('Message sécurisé');
    });

    it('Maintient une rétrocompatibilité complète avec les messages non chiffrés', () => {
      const legacyMessage = 'Ancien message stocké en clair avant la mise en place du chiffrement';
      expect(MessageCrypto.decrypt(legacyMessage)).toBe(legacyMessage);
      expect(MessageCrypto.decrypt('')).toBe('');
      expect(MessageCrypto.decrypt(null)).toBe('');
    });
  });
});
