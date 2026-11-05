import { Module } from '@nestjs/common';
import { BoutiqueOwnerGuard } from '../boutiques/guards/boutique-owner.guard';
import { CommonModule } from '../common/common.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagingModule } from '../messaging/messaging.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [CommonModule, MailModule, NotificationsModule, MessagingModule],
  controllers: [OrdersController],
  providers: [OrdersService, BoutiqueOwnerGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
