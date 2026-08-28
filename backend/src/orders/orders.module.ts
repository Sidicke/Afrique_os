import { Module } from '@nestjs/common';
import { BoutiqueOwnerGuard } from '../boutiques/guards/boutique-owner.guard';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [MailModule, NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService, BoutiqueOwnerGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
