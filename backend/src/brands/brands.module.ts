import { Module } from '@nestjs/common';
import { BoutiqueOwnerGuard } from '../boutiques/guards/boutique-owner.guard';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';

@Module({
  controllers: [BrandsController],
  providers: [BrandsService, BoutiqueOwnerGuard],
  exports: [BrandsService],
})
export class BrandsModule {}
