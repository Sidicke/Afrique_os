import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  buildCancellationEmail,
  buildOrderConfirmationEmail,
  buildOtpEmail,
  buildSellerCancellationEmail,
} from './email-templates';
import type { OrderMailData } from './email-templates';

/** Données nécessaires à l'e-mail de confirmation d'annulation */
export interface CancellationMailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  boutiqueName: string;
  boutiqueEmail?: string | null;
  /** Motif d'annulation saisi par le client (optionnel) */
  cancellationReason?: string;
  items: { name: string; variantLabel?: string; quantity: number; unitPrice: number }[];
  deliveryPrice: number;
  total: number;
  /** Formaté FCFA, ex. "20 000 FCFA" */
  formatPrice: (value: number) => string;
}

/** Données de l'alerte d'annulation envoyée au VENDEUR */
export interface SellerCancellationMailData {
  orderNumber: string;
  /** Nom de la boutique (en-tête) */
  boutiqueName: string;
  /** Adresse du vendeur (destinataire) */
  sellerEmail: string;
  customerName: string;
  customerPhone: string;
  /** Motif d'annulation saisi par le client (optionnel) */
  cancellationReason?: string;
  items: { name: string; variantLabel?: string; quantity: number; unitPrice: number }[];
  deliveryPrice: number;
  total: number;
  /** Formaté FCFA, ex. "20 000 FCFA" */
  formatPrice: (value: number) => string;
}

/** Données de la confirmation de commande envoyée au CLIENT quand le vendeur confirme */
export interface OrderConfirmationMailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  boutiqueName: string;
  /** E-mail de la boutique (répondre-à, optionnel) */
  boutiqueEmail?: string | null;
  items: { name: string; variantLabel?: string; quantity: number; unitPrice: number }[];
  deliveryPrice: number;
  total: number;
  /** Formaté FCFA, ex. "20 000 FCFA" */
  formatPrice: (value: number) => string;
}

/**
 * E-mails transactionnels — deux transports possibles, détectés au démarrage :
 *
 * 1. **SMTP** (prioritaire) : si `EMAIL_HOST` + `EMAIL_HOST_USER` +
 *    `EMAIL_HOST_PASSWORD` sont définis (ex. Gmail avec mot de passe
 *    d'application). Port 587 = STARTTLS, port 465 = TLS direct.
 * 2. **Resend** : sinon, si `RESEND_API_KEY` est définie.
 * 3. Sinon : mode DRY-RUN — l'e-mail est loggé en console mais RIEN n'est
 *    envoyé et aucune erreur n'est levée (dev / CI / tests).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly smtp: Transporter | null;
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('EMAIL_HOST')?.trim();
    const user = config.get<string>('EMAIL_HOST_USER')?.trim();
    const pass = config.get<string>('EMAIL_HOST_PASSWORD')?.trim();

    if (host && user && pass) {
      const port = Number(config.get<string>('EMAIL_PORT')?.trim() || 587);
      this.smtp = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`[mail] transport SMTP actif → ${host}:${port}`);
    } else {
      this.smtp = null;
    }

    if (!this.smtp) {
      const apiKey = config.get<string>('RESEND_API_KEY')?.trim();
      this.resend = apiKey ? new Resend(apiKey) : null;
    } else {
      this.resend = null;
    }

    // Expéditeur : MAIL_FROM si défini, sinon l'utilisateur SMTP
    const fromEmail = config.get<string>('MAIL_FROM')?.trim() || user || '';
    const fromName =
      config.get<string>('MAIL_FROM_NAME')?.trim() || 'Afrique Commerce OS';
    this.from = fromEmail ? `${fromName} <${fromEmail}>` : fromName;

    if (!this.smtp && !this.resend) {
      this.logger.warn(
        '[mail] AUCUN transport configuré (ni EMAIL_HOST/USER/PASSWORD ni RESEND_API_KEY) — e-mails en DRY-RUN.',
      );
    }
  }

  /** Vrai si un transport réel est configuré (SMTP ou Resend) */
  get isConfigured(): boolean {
    return this.smtp !== null || this.resend !== null;
  }

  /**
   * Envoi via le transport actif. Ne jette JAMAIS : un échec d'envoi ne doit
   * pas faire échouer le parcours métier (inscription, commande…).
   */
  private async deliver(
    to: string,
    subject: string,
    html: string,
    replyTo?: string | null,
  ): Promise<void> {
    if (this.smtp) {
      try {
        await this.smtp.sendMail({
          from: this.from,
          to,
          subject,
          html,
          replyTo: replyTo || undefined,
        });
        this.logger.log(`[mail] e-mail envoyé via SMTP → ${to} (« ${subject} »)`);
      } catch (err) {
        this.logger.error(
          `[mail] échec SMTP vers ${to} : ${(err as Error).message}`,
        );
      }
      return;
    }

    if (this.resend) {
      try {
        const { error } = await this.resend.emails.send({
          from: this.from,
          to,
          replyTo: replyTo || undefined,
          subject,
          html,
        });
        if (error) {
          this.logger.error(`[mail] échec Resend vers ${to} : ${error.message}`);
        } else {
          this.logger.log(`[mail] e-mail envoyé via Resend → ${to}`);
        }
      } catch (err) {
        this.logger.error(
          `[mail] exception Resend vers ${to} : ${(err as Error).message}`,
        );
      }
      return;
    }

    this.logger.warn(
      `[mail] DRY-RUN (aucun transport configuré) — e-mail non envoyé.\n` +
        `  À : ${to}\n  Sujet : ${subject}`,
    );
  }

  /**
   * Code de vérification (OTP) — utilisé par l'inscription en 3 étapes.
   * Ne jette JAMAIS.
   */
  async sendOtpEmail(to: string, code: string): Promise<void> {
    const { subject, html } = buildOtpEmail(code);
    await this.deliver(to, subject, html);
  }

  /**
   * Confirmation d'annulation de commande — envoyée au client.
   * Ne jette JAMAIS : un échec d'envoi ne doit pas faire échouer l'annulation.
   */
  async sendOrderCancellation(data: CancellationMailData): Promise<void> {
    const { subject, html } = buildCancellationEmail(this.toOrderMailData(data));
    await this.deliver(data.customerEmail, subject, html, data.boutiqueEmail);
  }

  /**
   * Confirmation de commande — envoyée au CLIENT quand le vendeur confirme.
   * Ne jette JAMAIS : un échec d'envoi ne doit pas faire échouer la mise à jour de statut.
   */
  async sendOrderConfirmation(data: OrderConfirmationMailData): Promise<void> {
    const { subject, html } = buildOrderConfirmationEmail(
      this.toOrderMailData(data),
    );
    await this.deliver(data.customerEmail, subject, html, data.boutiqueEmail);
  }

  /**
   * Alerte d'annulation — envoyée au VENDEUR quand un client annule.
   * Ne jette JAMAIS : un échec d'envoi ne doit pas faire échouer l'annulation.
   */
  async sendSellerCancellationNotice(data: SellerCancellationMailData): Promise<void> {
    const { subject, html } = buildSellerCancellationEmail({
      orderNumber: data.orderNumber,
      boutiqueName: data.boutiqueName,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      cancellationReason: data.cancellationReason,
      items: data.items,
      deliveryPrice: data.deliveryPrice,
      total: data.total,
      formatPrice: data.formatPrice,
    });
    await this.deliver(data.sellerEmail, subject, html);
  }

  /** Normalise les différentes interfaces métier vers OrderMailData */
  private toOrderMailData(data: {
    orderNumber: string;
    customerName: string;
    customerEmail?: string | null;
    boutiqueName: string;
    boutiqueEmail?: string | null;
    customerPhone?: string | null;
    cancellationReason?: string;
    items: OrderMailData['items'];
    deliveryPrice: number;
    total: number;
    formatPrice: (value: number) => string;
  }): OrderMailData {
    return {
      orderNumber: data.orderNumber,
      customerName: data.customerName,
      customerEmail: data.customerEmail ?? null,
      boutiqueName: data.boutiqueName,
      boutiqueEmail: data.boutiqueEmail ?? null,
      customerPhone: data.customerPhone ?? null,
      cancellationReason: data.cancellationReason,
      items: data.items,
      deliveryPrice: data.deliveryPrice,
      total: data.total,
      formatPrice: data.formatPrice,
    };
  }
}
