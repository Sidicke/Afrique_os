import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Module e-mail transactionnel (Resend). Importé par OrdersModule pour la
 * confirmation d'annulation ; pensé pour être réutilisé (confirmations de
 * commande, réinitialisation de mot de passe…).
 */
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
