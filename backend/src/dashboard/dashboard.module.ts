import { Module } from '@nestjs/common';
import { BoutiqueOwnerGuard } from '../boutiques/guards/boutique-owner.guard';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, BoutiqueOwnerGuard],
  exports: [DashboardService],
})
export class DashboardModule {}
