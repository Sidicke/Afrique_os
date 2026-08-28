import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagingController } from './messaging.controller';
import { MessagingGateway } from './messaging.gateway';
import { MessagingService } from './messaging.service';

@Module({
  imports: [NotificationsModule],
  controllers: [MessagingController],
  providers: [MessagingGateway, MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
