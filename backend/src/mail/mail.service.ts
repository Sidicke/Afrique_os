import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  buildCancellationEmail,
  buildMilestoneReachedEmail,
  buildNewMessageEmail,
  buildOrderConfirmationEmail,
  buildOtpEmail,
  buildPasswordChangedEmail,
  buildPasswordResetOtpEmail,
  buildSellerCancellationEmail,
  buildSellerSaleValidatedEmail,
  buildSubscriptionExpiringEmail,
  buildWelcomeAccountEmail,
} from './email-templates';
import type {
  MailChannel,
  MilestoneMailData,
  NewMessageMailData,
  OrderMailData,
  PasswordChangedMailData,
  SubscriptionExpiringMailData,
  WelcomeAccountMailData,
} from './email-templates';

/** Données nécessaires à l'e-mail de confirmation d'annulation (Client) */
export interface CancellationMailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  boutiqueName: string;
  boutiqueEmail?: string | null;
  cancellationReason?: string;
  items: { name: string; variantLabel?: string; quantity: number; unitPrice: number }[];
  deliveryPrice: number;
  total: number;
  formatPrice: (value: number) => string;
}

/** Données de l'alerte d'annulation envoyée au VENDEUR */
export interface SellerCancellationMailData {
  orderNumber: string;
  boutiqueName: string;
  sellerEmail: string;
  customerName: string;
  customerPhone: string;
  cancellationReason?: string;
  items: { name: string; variantLabel?: string; quantity: number; unitPrice: number }[];
  deliveryPrice: number;
  total: number;
  formatPrice: (value: number) => string;
}

/** Données de la confirmation de commande envoyée au CLIENT */
export interface OrderConfirmationMailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  boutiqueName: string;
  boutiqueEmail?: string | null;
  items: { name: string; variantLabel?: string; quantity: number; unitPrice: number }[];
  deliveryPrice: number;
  total: number;
  formatPrice: (value: number) => string;
}

/** Données de la notification de vente validée envoyée au VENDEUR */
export interface SellerSaleValidatedMailData {
  orderNumber: string;
  boutiqueName: string;
  sellerEmail: string;
  customerName: string;
  customerPhone?: string | null;
  netAmount?: number;
  commissionRate?: number;
  items: { name: string; variantLabel?: string; quantity: number; unitPrice: number }[];
  deliveryPrice: number;
  total: number;
  formatPrice: (value: number) => string;
}

/**
 * Service d'e-mails ZennShop à double canal professionnel :
 *
 * - **Canal 1 (`system`)** : Création de compte, OTP, réinitialisation et
 *   modification de mot de passe, alertes sécurité (`MAIL_FROM_SYSTEM`,
 *   ou `EMAIL_SYSTEM_USER` / `EMAIL_SYSTEM_PASSWORD` dédié).
 * - **Canal 2 (`activity`)** : Vie de la plateforme — vente validée, commande
 *   confirmée, nouveau message reçu, objectif/palier atteint, rappel de
 *   formule proche de l'expiration (`MAIL_FROM_ACTIVITY`, ou
 *   `EMAIL_ACTIVITY_USER` / `EMAIL_ACTIVITY_PASSWORD` dédié).
 *
 * Si seules les variables globales (`EMAIL_HOST_USER` / `MAIL_FROM`) sont
 * renseignées, les deux canaux les utilisent automatiquement en repli.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly smtpDefault: Transporter | null;
  private readonly smtpSystem: Transporter | null;
  private readonly smtpActivity: Transporter | null;
  private readonly resend: Resend | null;
  private readonly fromDefault: string;
  private readonly fromSystem: string;
  private readonly fromActivity: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('EMAIL_HOST')?.trim();
    const port = Number(config.get<string>('EMAIL_PORT')?.trim() || 587);
    const user = config.get<string>('EMAIL_HOST_USER')?.trim();
    const pass = config.get<string>('EMAIL_HOST_PASSWORD')?.trim();

    // 1. Transport SMTP principal
    if (host && user && pass && !pass.includes('YOUR_')) {
      this.smtpDefault = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`[mail] transport SMTP principal actif → ${host}:${port}`);
    } else {
      this.smtpDefault = null;
    }

    // 2. Transport SMTP dédié au Canal 1 (Système & Compte) si configuré séparément
    const sysHost = config.get<string>('EMAIL_SYSTEM_HOST')?.trim() || host;
    const sysPort = Number(config.get<string>('EMAIL_SYSTEM_PORT')?.trim() || port);
    const sysUser = config.get<string>('EMAIL_SYSTEM_USER')?.trim();
    const sysPass = config.get<string>('EMAIL_SYSTEM_PASSWORD')?.trim();
    if (sysHost && sysUser && sysPass && !sysPass.includes('YOUR_')) {
      this.smtpSystem = nodemailer.createTransport({
        host: sysHost,
        port: sysPort,
        secure: sysPort === 465,
        auth: { user: sysUser, pass: sysPass },
      });
      this.logger.log(`[mail] transport SMTP Canal Système actif → ${sysUser}`);
    } else {
      this.smtpSystem = this.smtpDefault;
    }

    // 3. Transport SMTP dédié au Canal 2 (Activités Plateforme) si configuré séparément
    const actHost = config.get<string>('EMAIL_ACTIVITY_HOST')?.trim() || host;
    const actPort = Number(config.get<string>('EMAIL_ACTIVITY_PORT')?.trim() || port);
    const actUser = config.get<string>('EMAIL_ACTIVITY_USER')?.trim();
    const actPass = config.get<string>('EMAIL_ACTIVITY_PASSWORD')?.trim();
    if (actHost && actUser && actPass && !actPass.includes('YOUR_')) {
      this.smtpActivity = nodemailer.createTransport({
        host: actHost,
        port: actPort,
        secure: actPort === 465,
        auth: { user: actUser, pass: actPass },
      });
      this.logger.log(`[mail] transport SMTP Canal Activité actif → ${actUser}`);
    } else {
      this.smtpActivity = this.smtpDefault;
    }

    // 4. Transport Resend (repli si aucun SMTP n'est actif)
    if (!this.smtpDefault && !this.smtpSystem && !this.smtpActivity) {
      const apiKey = config.get<string>('RESEND_API_KEY')?.trim();
      this.resend = apiKey ? new Resend(apiKey) : null;
    } else {
      this.resend = null;
    }

    // Construction des identités d'expéditeur (From)
    const baseEmail = config.get<string>('MAIL_FROM')?.trim() || user || '';
    const baseName = config.get<string>('MAIL_FROM_NAME')?.trim() || 'ZennShop';
    this.fromDefault = baseEmail ? `${baseName} <${baseEmail}>` : baseName;

    // Identité Canal 1 : Système & Sécurité
    const sysEmail =
      config.get<string>('MAIL_FROM_SYSTEM')?.trim() || sysUser || baseEmail;
    const sysName =
      config.get<string>('MAIL_FROM_SYSTEM_NAME')?.trim() || baseName;
    this.fromSystem = sysEmail ? `${sysName} <${sysEmail}>` : sysName;

    // Identité Canal 2 : Activités Plateforme
    const actEmail =
      config.get<string>('MAIL_FROM_ACTIVITY')?.trim() || actUser || baseEmail;
    const actName =
      config.get<string>('MAIL_FROM_ACTIVITY_NAME')?.trim() || baseName;
    this.fromActivity = actEmail ? `${actName} <${actEmail}>` : actName;

    if (!this.isConfigured) {
      this.logger.warn(
        '[mail] AUCUN transport configuré (ni SMTP ni RESEND_API_KEY) — e-mails en DRY-RUN.',
      );
    }
  }

  /** Vrai si au moins un transport réel est configuré (SMTP ou Resend) */
  get isConfigured(): boolean {
    return (
      this.smtpDefault !== null ||
      this.smtpSystem !== null ||
      this.smtpActivity !== null ||
      this.resend !== null
    );
  }

  /**
   * Envoi via le canal demandé ('system' ou 'activity').
   * Ne jette JAMAIS : un échec d'envoi ne doit jamais faire échouer une action métier.
   */
  private async deliver(
    to: string,
    subject: string,
    html: string,
    replyTo?: string | null,
    channel: MailChannel = 'activity',
  ): Promise<void> {
    const from = channel === 'system' ? this.fromSystem : this.fromActivity;
    const smtp =
      channel === 'system'
        ? this.smtpSystem ?? this.smtpDefault
        : this.smtpActivity ?? this.smtpDefault;

    if (smtp) {
      try {
        const logoHorizPath = path.resolve(
          __dirname,
          '../../../frontend/public/logo/zennshop-email-logo.png',
        );
        const hasLogoPng = fs.existsSync(logoHorizPath);
        const finalHtml = hasLogoPng
          ? html
              .replace(
                /<!--ZS_LOGO_HEADER_START-->[\s\S]*?<!--ZS_LOGO_HEADER_END-->/g,
                '<img src="cid:zennshop-logo@zennshop.com" width="114" height="32" alt="ZennShop" style="display:block;width:114px;height:32px;border:0;outline:none;" />',
              )
              .replace(
                /<!--ZS_LOGO_SIGNATURE_START-->[\s\S]*?<!--ZS_LOGO_SIGNATURE_END-->/g,
                '<img src="cid:zennshop-logo@zennshop.com" width="78" height="22" alt="ZennShop" style="display:block;width:78px;height:22px;border:0;outline:none;" />',
              )
          : html;

        await smtp.sendMail({
          from,
          to,
          subject,
          html: finalHtml,
          replyTo: replyTo || undefined,
          attachments: hasLogoPng
            ? [
                {
                  filename: 'zennshop-logo.png',
                  path: logoHorizPath,
                  cid: 'zennshop-logo@zennshop.com',
                  contentDisposition: 'inline',
                },
              ]
            : undefined,
        });
        this.logger.log(
          `[mail:${channel}] envoyé via SMTP → ${to} (« ${subject} »)`,
        );
      } catch (err) {
        this.logger.error(
          `[mail:${channel}] échec SMTP vers ${to} : ${(err as Error).message}`,
        );
      }
      return;
    }

    if (this.resend) {
      try {
        const { error } = await this.resend.emails.send({
          from,
          to,
          replyTo: replyTo || undefined,
          subject,
          html,
        });
        if (error) {
          this.logger.error(
            `[mail:${channel}] échec Resend vers ${to} : ${error.message}`,
          );
        } else {
          this.logger.log(`[mail:${channel}] envoyé via Resend → ${to}`);
        }
      } catch (err) {
        this.logger.error(
          `[mail:${channel}] exception Resend vers ${to} : ${(err as Error).message}`,
        );
      }
      return;
    }

    this.logger.warn(
      `[mail:${channel}] DRY-RUN (aucun transport configuré) — e-mail non envoyé.\n` +
        `  De : ${from}\n  À : ${to}\n  Sujet : ${subject}`,
    );
  }

  /* ======================================================================== */
  /* CANAL 1 : SYSTÈME, COMPTE & SÉCURITÉ                                     */
  /* ======================================================================== */

  /** Code de vérification (OTP) pour la création de compte */
  async sendOtpEmail(to: string, code: string): Promise<void> {
    const { subject, html } = buildOtpEmail(code);
    await this.deliver(to, subject, html, undefined, 'system');
  }

  /** Code de sécurité (OTP) pour la réinitialisation de mot de passe */
  async sendPasswordResetOtpEmail(
    to: string,
    code: string,
    userName?: string | null,
  ): Promise<void> {
    const { subject, html } = buildPasswordResetOtpEmail(code, userName);
    await this.deliver(to, subject, html, undefined, 'system');
  }

  /** Confirmation que le mot de passe vient d'être modifié */
  async sendPasswordChangedEmail(data: PasswordChangedMailData): Promise<void> {
    const { subject, html } = buildPasswordChangedEmail(data);
    await this.deliver(data.userEmail, subject, html, undefined, 'system');
  }

  /** E-mail de bienvenue à la création du compte (Client ou Vendeur) */
  async sendWelcomeAccountEmail(data: WelcomeAccountMailData): Promise<void> {
    const { subject, html } = buildWelcomeAccountEmail(data);
    await this.deliver(data.userEmail, subject, html, undefined, 'system');
  }

  /* ======================================================================== */
  /* CANAL 2 : ACTIVITÉS & VIE DE LA PLATEFORME                               */
  /* ======================================================================== */

  /** Confirmation de commande — envoyée au CLIENT */
  async sendOrderConfirmation(data: OrderConfirmationMailData): Promise<void> {
    const { subject, html } = buildOrderConfirmationEmail(
      this.toOrderMailData(data),
    );
    await this.deliver(
      data.customerEmail,
      subject,
      html,
      data.boutiqueEmail,
      'activity',
    );
  }

  /** Notification de vente validée — envoyée au VENDEUR */
  async sendSellerSaleValidated(
    data: SellerSaleValidatedMailData,
  ): Promise<void> {
    const { subject, html } = buildSellerSaleValidatedEmail({
      orderNumber: data.orderNumber,
      boutiqueName: data.boutiqueName,
      customerName: data.customerName,
      customerPhone: data.customerPhone ?? null,
      netAmount: data.netAmount,
      commissionRate: data.commissionRate,
      items: data.items,
      deliveryPrice: data.deliveryPrice,
      total: data.total,
      formatPrice: data.formatPrice,
    });
    await this.deliver(data.sellerEmail, subject, html, undefined, 'activity');
  }

  /** Confirmation d'annulation de commande — envoyée au CLIENT */
  async sendOrderCancellation(data: CancellationMailData): Promise<void> {
    const { subject, html } = buildCancellationEmail(this.toOrderMailData(data));
    await this.deliver(
      data.customerEmail,
      subject,
      html,
      data.boutiqueEmail,
      'activity',
    );
  }

  /** Alerte d'annulation — envoyée au VENDEUR */
  async sendSellerCancellationNotice(
    data: SellerCancellationMailData,
  ): Promise<void> {
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
    await this.deliver(data.sellerEmail, subject, html, undefined, 'activity');
  }

  /** Notification d'un nouveau message reçu dans la messagerie */
  async sendNewMessageNotice(
    to: string,
    data: NewMessageMailData,
    replyTo?: string | null,
  ): Promise<void> {
    const { subject, html } = buildNewMessageEmail(data);
    await this.deliver(to, subject, html, replyTo, 'activity');
  }

  /** Félicitations lorsqu'un objectif / palier de ventes est atteint */
  async sendMilestoneReached(
    to: string,
    data: MilestoneMailData,
  ): Promise<void> {
    const { subject, html } = buildMilestoneReachedEmail(data);
    await this.deliver(to, subject, html, undefined, 'activity');
  }

  /** Rappel chaleureux lorsqu'une formule (Business / Enterprise) arrive à expiration */
  async sendSubscriptionExpiringReminder(
    to: string,
    data: SubscriptionExpiringMailData,
  ): Promise<void> {
    const { subject, html } = buildSubscriptionExpiringEmail(data);
    await this.deliver(to, subject, html, undefined, 'activity');
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
