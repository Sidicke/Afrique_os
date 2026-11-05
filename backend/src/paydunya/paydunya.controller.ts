import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CreatePayDunyaTransactionDto } from './dto/create-paydunya-transaction.dto';
import { PayDunyaService } from './paydunya.service';

@ApiTags('payments-paydunya')
@Controller('payments/paydunya')
export class PayDunyaController {
  constructor(private readonly paydunyaService: PayDunyaService) {}

  /**
   * ÉTAPE 1 DU FLUX : DEMANDE DE PAIEMENT PAYDUNYA
   * Protections : Rate Limiting (3e pilier) + Idempotence (1er pilier) + Zero-Trust Server Amount (4e pilier)
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('create-transaction')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une session de paiement PayDunya (Zero-Trust & Idempotent)',
  })
  createTransaction(
    @Body() dto: CreatePayDunyaTransactionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-idempotency-key') xIdempotencyKey?: string,
  ) {
    const key = idempotencyKey ?? xIdempotencyKey;
    return this.paydunyaService.createCheckoutTransaction(dto, key);
  }

  /**
   * ÉTAPE 6 DU FLUX : WEBHOOK IPN PAYDUNYA
   * Protections : Rate Limiting (3e pilier) + Authenticité Hash SHA-512 / Signature (2e pilier) + Idempotence (1er pilier)
   */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook IPN de notification des événements de paiement PayDunya',
  })
  handleWebhook(
    @Req() req: Request,
    @Body() body: any,
    @Headers('x-paydunya-signature') paydunyaSignature?: string,
  ) {
    const rawBody =
      (req as any).rawBody ??
      (Buffer.isBuffer(body) ? body : JSON.stringify(body));
    return this.paydunyaService.handleWebhook(rawBody, paydunyaSignature, body);
  }

  /**
   * ÉTAPE 5bis DU FLUX : CONFIRMATION DIRECTE PAR TOKEN PAYDUNYA
   * Permet de vérifier l'état réel de la facture auprès de l'API PayDunya dès le retour du client
   * sur `return_url` (fonctionne même en `localhost` sans tunnel IPN).
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Get('confirm/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vérifier et confirmer le paiement PayDunya par son token de facture',
  })
  confirmTransaction(
    @Param('token') token: string,
    @Query('orderId') orderId?: string,
  ) {
    return this.paydunyaService.confirmTransactionByToken(token, orderId);
  }
}
