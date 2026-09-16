import { Module } from '@nestjs/common';
import { FedaPayController } from './fedapay.controller';
import { FedaPayService } from './fedapay.service';

@Module({
  controllers: [FedaPayController],
  providers: [FedaPayService],
  exports: [FedaPayService],
})
export class FedaPayModule {}
