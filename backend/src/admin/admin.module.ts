import { Module } from '@nestjs/common';
import { BoutiquesModule } from '../boutiques/boutiques.module';
import { OrdersModule } from '../orders/orders.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [BoutiquesModule, OrdersModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
