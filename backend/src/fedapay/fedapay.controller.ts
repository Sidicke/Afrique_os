import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateFedaPayTransactionDto } from './dto/create-fedapay-transaction.dto';
import {
  InviteSubAccountDto,
  LinkSubAccountDto,
  UpdateCommissionRateDto,
} from './dto/subaccount.dto';
import {
  RequestRefundDto,
  ApproveRefundDto,
  RejectRefundDto,
} from './dto/refund.dto';
import { CreateSubscriptionPaymentDto } from './dto/subscription-payment.dto';
import { ProcessWithdrawalPayoutDto } from './dto/withdrawal-payout.dto';
import { FedaPayService } from './fedapay.service';

@ApiTags('payments-fedapay')
@Controller('payments/fedapay')
export class FedaPayController {
  constructor(private readonly fedapayService: FedaPayService) {}

  /**
   * ÉTAPE 1 DU FLUX : INITIALISATION DU PAIEMENT MARKETPLACE
   * Protections : Rate Limiting + Idempotence + Zero-Trust Server Amount + Sub-accounts Commission Split
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('create-transaction')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une session de paiement FedaPay Marketplace (Zero-Trust, Idempotent, Split Commissions)',
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
   * SOUS-COMPTES : Inviter un vendeur à rejoindre FedaPay Marketplace
   * Endpoint : POST /api/v1/payments/fedapay/sub-accounts/invite
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('sub-accounts/invite')
  @ApiOperation({
    summary: 'Inviter une boutique à créer son sous-compte FedaPay Marketplace',
  })
  inviteSubAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteSubAccountDto,
  ) {
    return this.fedapayService.inviteSubAccount(dto, user);
  }

  /**
   * SOUS-COMPTES : Lier la référence d'un sous-compte validé à la boutique
   * Endpoint : POST /api/v1/payments/fedapay/sub-accounts/link
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('sub-accounts/link')
  @ApiOperation({
    summary: 'Associer une référence de sous-compte FedaPay existante à une boutique',
  })
  linkSubAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LinkSubAccountDto,
  ) {
    return this.fedapayService.linkSubAccount(dto, user);
  }

  /**
   * SOUS-COMPTES : Consulter le statut du sous-compte FedaPay d'une boutique
   * Endpoint : GET /api/v1/payments/fedapay/sub-accounts/:boutiqueId/status
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('sub-accounts/:boutiqueId/status')
  @ApiOperation({
    summary: 'Obtenir le statut FedaPay Marketplace d\'une boutique',
  })
  getSubAccountStatus(@Param('boutiqueId') boutiqueId: string) {
    return this.fedapayService.getSubAccountStatus(boutiqueId);
  }

  /**
   * COMMISSION : Mettre à jour le taux de commission d'une boutique (Admin uniquement)
   * Endpoint : PATCH /api/v1/payments/fedapay/sub-accounts/:boutiqueId/commission-rate
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('sub-accounts/:boutiqueId/commission-rate')
  @ApiOperation({
    summary: 'Configurer le taux de commission de la marketplace pour une boutique (Admin)',
  })
  updateCommissionRate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('boutiqueId') boutiqueId: string,
    @Body() dto: UpdateCommissionRateDto,
  ) {
    return this.fedapayService.updateCommissionRate(
      boutiqueId,
      dto.commissionRate,
      dto.vendorFixedFee,
      user,
    );
  }

  /**
   * ÉTAPE 6 DU FLUX : WEBHOOK FEDAPAY
   * Protections : Rate Limiting + HMAC Signature SHA-256 + Idempotence Anti-Rejeu
   */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook de notification des événements de paiement et de sous-comptes FedaPay',
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

  // ==========================================
  // REMBOURSEMENTS AVEC MOTIF (REFUNDS)
  // ==========================================

  /**
   * SOUMISSION D'UNE DEMANDE DE REMBOURSEMENT (Client ou Vendeur)
   * Endpoint : POST /api/v1/payments/fedapay/refund/request
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refund/request')
  @ApiOperation({
    summary: 'Soumettre une demande de remboursement avec motif explicite',
  })
  requestRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestRefundDto,
  ) {
    return this.fedapayService.requestOrderRefund(dto, user);
  }

  /**
   * APPROBATION DU REMBOURSEMENT ET DÉCLENCHEMENT DU VIREMENT MOBILE MONEY
   * Endpoint : POST /api/v1/payments/fedapay/refund/:id/approve
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('refund/:id/approve')
  @ApiOperation({
    summary: 'Approuver une demande de remboursement et déclencher le virement Mobile Money FedaPay',
  })
  approveRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveRefundDto,
  ) {
    return this.fedapayService.approveRefund(id, user, dto);
  }

  /**
   * REJET D'UNE DEMANDE DE REMBOURSEMENT
   * Endpoint : POST /api/v1/payments/fedapay/refund/:id/reject
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('refund/:id/reject')
  @ApiOperation({
    summary: 'Rejeter une demande de remboursement avec un motif justificatif',
  })
  rejectRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectRefundDto,
  ) {
    return this.fedapayService.rejectRefund(id, user, dto);
  }

  /**
   * LISTE DES DEMANDES DE REMBOURSEMENT D'UNE BOUTIQUE
   * Endpoint : GET /api/v1/payments/fedapay/refund/boutique/:boutiqueId
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('refund/boutique/:boutiqueId')
  @ApiOperation({
    summary: 'Consulter la liste des remboursements d\'une boutique',
  })
  getRefundsForBoutique(
    @CurrentUser() user: AuthenticatedUser,
    @Param('boutiqueId') boutiqueId: string,
  ) {
    return this.fedapayService.getRefundsForBoutique(boutiqueId, user);
  }

  /**
   * DÉTAILS D'UNE DEMANDE DE REMBOURSEMENT
   * Endpoint : GET /api/v1/payments/fedapay/refund/:id
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('refund/:id')
  @ApiOperation({
    summary: 'Obtenir les détails d\'une demande de remboursement',
  })
  getRefundDetails(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.fedapayService.getRefundDetails(id, user);
  }

  // ==========================================
  // PAIEMENT ABONNEMENT BOUTIQUE VIA FEDAPAY
  // ==========================================

  /**
   * INITIALISER LE PAIEMENT D'UN ABONNEMENT BOUTIQUE
   * Endpoint : POST /api/v1/payments/fedapay/subscription/create-transaction
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('subscription/create-transaction')
  @ApiOperation({
    summary: 'Créer une session de paiement FedaPay pour l\'abonnement d\'une boutique',
  })
  createSubscriptionTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubscriptionPaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-idempotency-key') xIdempotencyKey?: string,
  ) {
    const key = idempotencyKey ?? xIdempotencyKey;
    return this.fedapayService.createSubscriptionCheckout(dto, user, key);
  }

  // ==========================================
  // VIREMENT DES RETRAITS VENDEURS (ADMIN)
  // ==========================================

  /**
   * EXÉCUTER LE PAIEMENT D'UN RETRAIT VENDEUR VIA FEDAPAY PAYOUTS
   * Endpoint : POST /api/v1/payments/fedapay/withdrawals/:id/payout
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('withdrawals/:id/payout')
  @ApiOperation({
    summary: 'Exécuter le virement Mobile Money pour une demande de retrait validée (Admin)',
  })
  processWithdrawalPayout(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: { payoutMode?: string },
  ) {
    return this.fedapayService.processWithdrawalPayout(
      { withdrawalId: id, payoutMode: dto?.payoutMode },
      user,
    );
  }
}
