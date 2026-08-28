import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  buildCancellationEmail,
  buildOrderConfirmationEmail,
  buildOtpEmail,
  buildSellerCancellationEmail,
} from '../src/mail/email-templates';
import {
  CancellationMailData,
  MailService,
  OrderConfirmationMailData,
  SellerCancellationMailData,
} from '../src/mail/mail.service';

/** Mocke le SDK Resend : `emails.send` contrôle le comportement du client */
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({ data: {}, error: null }) },
  })),
}));

const MockResend = Resend as unknown as jest.Mock;

/** ConfigService minimal pour les tests */
function configWith(values: Record<string, string | undefined> = {}) {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

const formatPrice = (value: number) =>
  `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;

function sampleData(overrides: Partial<CancellationMailData> = {}): CancellationMailData {
  return {
    orderNumber: '#AC-8901',
    customerName: 'Awa Diallo',
    customerEmail: 'awa@example.com',
    boutiqueName: 'Aziz Tech',
    boutiqueEmail: 'vendeur@aziztech.com',
    items: [
      { name: 'Chargeur Rapide 65W', quantity: 1, unitPrice: 18000 },
      { name: 'Écouteurs <Sans Fil>', variantLabel: 'Couleur: Blanc', quantity: 2, unitPrice: 45000 },
    ],
    deliveryPrice: 2000,
    total: 110000,
    formatPrice,
    ...overrides,
  };
}

function confirmationSampleData(
  overrides: Partial<OrderConfirmationMailData> = {},
): OrderConfirmationMailData {
  return {
    orderNumber: '#AC-8901',
    customerName: 'Awa Diallo',
    customerEmail: 'awa@example.com',
    boutiqueName: 'Aziz Tech',
    boutiqueEmail: 'vendeur@aziztech.com',
    items: [
      { name: 'Chargeur Rapide 65W', quantity: 1, unitPrice: 18000 },
      { name: 'Écouteurs <Sans Fil>', variantLabel: 'Couleur: Blanc', quantity: 2, unitPrice: 45000 },
    ],
    deliveryPrice: 2000,
    total: 110000,
    formatPrice,
    ...overrides,
  };
}

function sellerSampleData(
  overrides: Partial<SellerCancellationMailData> = {},
): SellerCancellationMailData {
  return {
    orderNumber: '#AC-8901',
    boutiqueName: 'Aziz Tech',
    sellerEmail: 'vendeur@aziztech.com',
    customerName: 'Awa Diallo',
    customerPhone: '+225 07 00 00 00 00',
    items: [
      { name: 'Chargeur Rapide 65W', quantity: 1, unitPrice: 18000 },
      { name: 'Écouteurs <Sans Fil>', variantLabel: 'Couleur: Blanc', quantity: 2, unitPrice: 45000 },
    ],
    deliveryPrice: 2000,
    total: 110000,
    formatPrice,
    ...overrides,
  };
}

describe('MailService', () => {
  describe('sans RESEND_API_KEY (dry-run)', () => {
    const service = new MailService(configWith({}));

    it('n’est pas configuré', () => {
      expect(service.isConfigured).toBe(false);
    });

    it('sendOrderCancellation ne jette pas et ne bloque pas', async () => {
      await expect(
        service.sendOrderCancellation(sampleData()),
      ).resolves.toBeUndefined();
    });
  });

  describe('buildOtpEmail (code de vérification inscription)', () => {
    const CODE = '482913';

    it('sujet masquant partiellement le code', () => {
      const { subject } = buildOtpEmail(CODE);
      expect(subject).toBe('Votre code de vérification : 482 •••');
    });

    it('affiche les 6 chiffres dans des cases dédiées + la durée de validité', () => {
      const { html } = buildOtpEmail(CODE);
      for (const digit of CODE.split('')) {
        expect(html).toContain(`>${digit}</div>`);
      }
      expect(html).toContain('10 minutes');
      expect(html).toContain('aucun compte ne sera créé');
    });

    it('échappe le code (anti-injection)', () => {
      const { html } = buildOtpEmail('12<3>&');
      expect(html).toContain('&lt;');
      expect(html).not.toContain('<3>');
    });
  });

  describe('buildCancellationEmail', () => {

    it('sujet clair avec le numéro de commande', () => {
      const { subject } = buildCancellationEmail(sampleData());
      expect(subject).toBe('Commande #AC-8901 annulée');
    });

    it('contient le récapitulatif (articles, quantités, livraison, total)', () => {
      const { html } = buildCancellationEmail(sampleData());
      expect(html).toContain('Chargeur Rapide 65W');
      expect(html).toContain('× 2');
      // Même formateur fr-FR que le service (espace insécable compris)
      expect(html).toContain(formatPrice(45000 * 2)); // sous-total écouteurs
      expect(html).toContain(formatPrice(2000)); // livraison
      expect(html).toContain(formatPrice(110000)); // total
      expect(html).toContain('Awa Diallo');
    });

    it('échappe le HTML des noms de produits (anti-injection)', () => {
      const { html } = buildCancellationEmail(sampleData());
      expect(html).toContain('&lt;Sans Fil&gt;');
      expect(html).not.toContain('<Sans Fil>');
    });

    it('affiche « Gratuite » quand la livraison est à 0', () => {
      const { html } = buildCancellationEmail(
        sampleData({ deliveryPrice: 0, total: 108000 }),
      );
      expect(html).toContain('Gratuite');
    });

    it('rappelle le motif d’annulation dans le corps (échappé)', () => {
      const { html } = buildCancellationEmail(
        sampleData({ cancellationReason: 'Changement <projet> & délai' }),
      );
      expect(html).toContain('Motif indiqué');
      expect(html).toContain('Changement &lt;projet&gt; &amp; délai');
      expect(html).not.toContain('<projet>');
    });

    it('omet la ligne « Motif indiqué » quand aucun motif n’est fourni', () => {
      const { html } = buildCancellationEmail(sampleData());
      expect(html).not.toContain('Motif indiqué');
    });
  });

  describe('buildOrderConfirmationEmail (confirmation au client)', () => {

    it('sujet « Votre commande … est confirmée »', () => {
      const { subject } = buildOrderConfirmationEmail(confirmationSampleData());
      expect(subject).toBe('Commande #AC-8901 confirmée ✓');
    });

    it('contient le récapitulatif (articles, quantités, livraison, total)', () => {
      const { html } = buildOrderConfirmationEmail(confirmationSampleData());
      expect(html).toContain('Chargeur Rapide 65W');
      expect(html).toContain('× 2');
      expect(html).toContain(formatPrice(45000 * 2)); // sous-total écouteurs
      expect(html).toContain(formatPrice(2000)); // livraison
      expect(html).toContain(formatPrice(110000)); // total
      expect(html).toContain('Awa Diallo');
      expect(html).toContain('confirmée');
      expect(html).toContain('WhatsApp'); // la boutique contacte via WhatsApp
    });

    it('échappe le HTML des noms de produits (anti-injection)', () => {
      const { html } = buildOrderConfirmationEmail(confirmationSampleData());
      expect(html).toContain('&lt;Sans Fil&gt;');
      expect(html).not.toContain('<Sans Fil>');
    });

    it('affiche « Gratuite » quand la livraison est à 0', () => {
      const { html } = buildOrderConfirmationEmail(
        confirmationSampleData({ deliveryPrice: 0, total: 108000 }),
      );
      expect(html).toContain('Gratuite');
    });
  });

  describe('sendOrderConfirmation', () => {
    it('dry-run sans clé : ne jette pas', async () => {
      const service = new MailService(configWith({}));
      await expect(
        service.sendOrderConfirmation(confirmationSampleData()),
      ).resolves.toBeUndefined();
    });
  });

  describe('buildSellerCancellationEmail (alerte vendeur)', () => {

    it('sujet « Commande … annulée par <client> »', () => {
      const { subject } = buildSellerCancellationEmail(sellerSampleData());
      expect(subject).toBe('Commande #AC-8901 annulée par Awa Diallo');
    });

    it('contient le client, son téléphone, les articles et le total', () => {
      const { html } = buildSellerCancellationEmail(sellerSampleData());
      expect(html).toContain('Awa Diallo');
      expect(html).toContain('+225 07 00 00 00 00');
      expect(html).toContain('Chargeur Rapide 65W');
      expect(html).toContain('× 2');
      expect(html).toContain(formatPrice(110000)); // total
      expect(html).toContain('remis en stock');
    });

    it('rappelle le motif d’annulation (échappé)', () => {
      const { html } = buildSellerCancellationEmail(
        sellerSampleData({ cancellationReason: 'Prix trop <élevé> & délai' }),
      );
      expect(html).toContain('Motif indiqué');
      expect(html).toContain('Prix trop &lt;élevé&gt; &amp; délai');
      expect(html).not.toContain('<élevé>');
    });

    it('omet la ligne « Motif indiqué » quand aucun motif n’est fourni', () => {
      const { html } = buildSellerCancellationEmail(sellerSampleData());
      expect(html).not.toContain('Motif indiqué');
    });

    it('échappe le HTML des noms de produits (anti-injection)', () => {
      const { html } = buildSellerCancellationEmail(sellerSampleData());
      expect(html).toContain('&lt;Sans Fil&gt;');
      expect(html).not.toContain('<Sans Fil>');
    });
  });

  describe('sendSellerCancellationNotice', () => {
    it('dry-run sans clé : ne jette pas', async () => {
      const service = new MailService(configWith({}));
      await expect(
        service.sendSellerCancellationNotice(sellerSampleData()),
      ).resolves.toBeUndefined();
    });
  });

  describe('avec RESEND_API_KEY', () => {
    beforeEach(() => {
      MockResend.mockClear();
      // Comportement par défaut : envoi réussi
      MockResend.mockImplementation(() => ({
        emails: { send: jest.fn().mockResolvedValue({ data: {}, error: null }) },
      }));
    });

    it('est configuré', () => {
      const service = new MailService(
        configWith({ RESEND_API_KEY: 're_test_fake' }),
      );
      expect(service.isConfigured).toBe(true);
    });

    it('envoie l’e-mail avec from/to/replyTo/sujet (payload correct)', async () => {
      const send = jest.fn().mockResolvedValue({ data: {}, error: null });
      MockResend.mockImplementation(() => ({ emails: { send } }));
      const service = new MailService(
        configWith({ RESEND_API_KEY: 're_x', MAIL_FROM: 'noreply@aziz.com', MAIL_FROM_NAME: 'Aziz Tech' }),
      );
      await service.sendOrderCancellation(sampleData());

      expect(send).toHaveBeenCalledTimes(1);
      const payload = send.mock.calls[0][0];
      expect(payload.from).toBe('Aziz Tech <noreply@aziz.com>');
      expect(payload.to).toBe('awa@example.com');
      expect(payload.replyTo).toBe('vendeur@aziztech.com');
      expect(payload.subject).toBe('Commande #AC-8901 annulée');
      expect(payload.html).toContain('Aziz Tech');
    });

    it('ne jette pas quand le SDK lève une exception (smtp down)', async () => {
      const send = jest.fn().mockRejectedValue(new Error('smtp down'));
      MockResend.mockImplementation(() => ({ emails: { send } }));
      const service = new MailService(
        configWith({ RESEND_API_KEY: 're_x' }),
      );
      await expect(
        service.sendOrderCancellation(sampleData()),
      ).resolves.toBeUndefined();
    });

    it('ne jette pas quand Resend retourne une erreur métier (domaine non vérifié)', async () => {
      const send = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'domain not verified' } });
      MockResend.mockImplementation(() => ({ emails: { send } }));
      const service = new MailService(
        configWith({ RESEND_API_KEY: 're_x' }),
      );
      await expect(
        service.sendOrderCancellation(sampleData()),
      ).resolves.toBeUndefined();
    });

    it('envoie la confirmation au client avec from/to/replyTo/sujet corrects', async () => {
      const send = jest.fn().mockResolvedValue({ data: {}, error: null });
      MockResend.mockImplementation(() => ({ emails: { send } }));
      const service = new MailService(
        configWith({ RESEND_API_KEY: 're_x', MAIL_FROM: 'noreply@aziz.com', MAIL_FROM_NAME: 'Aziz Tech' }),
      );
      await service.sendOrderConfirmation(confirmationSampleData());

      expect(send).toHaveBeenCalledTimes(1);
      const payload = send.mock.calls[0][0];
      expect(payload.from).toBe('Aziz Tech <noreply@aziz.com>');
      expect(payload.to).toBe('awa@example.com');
      expect(payload.replyTo).toBe('vendeur@aziztech.com');
      expect(payload.subject).toBe('Commande #AC-8901 confirmée ✓');
      expect(payload.html).toContain('Aziz Tech');
    });

    it('ne jette pas quand le SDK lève une exception (confirmation)', async () => {
      const send = jest.fn().mockRejectedValue(new Error('smtp down'));
      MockResend.mockImplementation(() => ({ emails: { send } }));
      const service = new MailService(
        configWith({ RESEND_API_KEY: 're_x' }),
      );
      await expect(
        service.sendOrderConfirmation(confirmationSampleData()),
      ).resolves.toBeUndefined();
    });

    it('envoie l’alerte vendeur avec to/sujet corrects', async () => {
      const send = jest.fn().mockResolvedValue({ data: {}, error: null });
      MockResend.mockImplementation(() => ({ emails: { send } }));
      const service = new MailService(
        configWith({ RESEND_API_KEY: 're_x', MAIL_FROM: 'noreply@aziz.com', MAIL_FROM_NAME: 'Aziz Tech' }),
      );
      await service.sendSellerCancellationNotice(sellerSampleData());

      expect(send).toHaveBeenCalledTimes(1);
      const payload = send.mock.calls[0][0];
      expect(payload.from).toBe('Aziz Tech <noreply@aziz.com>');
      expect(payload.to).toBe('vendeur@aziztech.com');
      expect(payload.subject).toBe('Commande #AC-8901 annulée par Awa Diallo');
      expect(payload.html).toContain('Awa Diallo');
    });

    it('ne jette pas si le SDK lève une exception (alerte vendeur)', async () => {
      const send = jest.fn().mockRejectedValue(new Error('smtp down'));
      MockResend.mockImplementation(() => ({ emails: { send } }));
      const service = new MailService(
        configWith({ RESEND_API_KEY: 're_x' }),
      );
      await expect(
        service.sendSellerCancellationNotice(sellerSampleData()),
      ).resolves.toBeUndefined();
    });
  });
});
