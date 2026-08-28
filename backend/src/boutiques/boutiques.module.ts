import { Module } from '@nestjs/common';
import { BoutiquesController } from './boutiques.controller';
import { BoutiquesService } from './boutiques.service';
import { BoutiqueOwnerGuard } from './guards/boutique-owner.guard';

@Module({
  controllers: [BoutiquesController],
  providers: [BoutiquesService, BoutiqueOwnerGuard],
  exports: [BoutiquesService],
})
export class BoutiquesModule {}
