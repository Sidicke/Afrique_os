import { Module } from '@nestjs/common';
import { BoutiqueOwnerGuard } from '../boutiques/guards/boutique-owner.guard';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, BoutiqueOwnerGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
