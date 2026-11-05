import { Module } from '@nestjs/common';
import { PayDunyaController } from './paydunya.controller';
import { PayDunyaService } from './paydunya.service';

@Module({
  controllers: [PayDunyaController],
  providers: [PayDunyaService],
  exports: [PayDunyaService],
})
export class PayDunyaModule {}
