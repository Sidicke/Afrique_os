import { Module } from '@nestjs/common';
import { BoutiqueOwnerGuard } from '../boutiques/guards/boutique-owner.guard';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, BoutiqueOwnerGuard],
  exports: [CategoriesService],
})
export class CategoriesModule {}
