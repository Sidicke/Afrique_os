import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CreateFedaPayTransactionDto } from './dto/create-fedapay-transaction.dto';
import { FedaPayService } from './fedapay.service';

@ApiTags('payments-fedapay')
@Controller('payments/fedapay')
export class FedaPayController {
  constructor(private readonly fedapayService: FedaPayService) {}

  /**
   * ÉTAPE 1 DU FLUX : DEMANDE DE PAIEMENT
   * Protections : Rate Limiting (3e pilier) + Idempotence (1er pilier) + Zero-Trust Server Amount (4e pilier)
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('create-transaction')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une session de paiement FedaPay (Zero-Trust & Idempotent)',
  })
  createTransaction(
    @Body() dto: CreateFedaPayTransactionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-idempotency-key') xIdempotencyKey?: string,
  ) {
    const key = idempotencyKey ?? xIdempotencyKey;
    return this.fedapayService.createCheckoutTransaction(dto, key);
  }

  /**
   * ÉTAPE 6 DU FLUX : WEBHOOK FEDAPAY
   * Protections : Rate Limiting (3e pilier) + Authenticité Webhook Signature (2e pilier) + Idempotence (1er pilier)
   */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook de notification des événements de paiement FedaPay',
  })
  handleWebhook(
    @Req() req: Request,
    @Body() body: any,
    @Headers('x-fedapay-signature') signature?: string,
  ) {
    const rawBody =
      (req as any).rawBody ??
      (Buffer.isBuffer(body) ? body : JSON.stringify(body));
    return this.fedapayService.handleWebhook(rawBody, signature, body);
  }
}
