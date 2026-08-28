import { Module } from '@nestjs/common';
import { BoutiqueOwnerGuard } from '../boutiques/guards/boutique-owner.guard';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, BoutiqueOwnerGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
