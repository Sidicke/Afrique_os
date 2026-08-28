import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BoutiqueOwnerGuard } from '../boutiques/guards/boutique-owner.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * POST /orders/boutique/:boutiqueId — création d'une commande depuis la
   * vitrine. Public (le client n'a pas besoin de compte pour commander) ;
   * si un access token valide est fourni, la commande est associée au compte
   * (userId déduit du token, jamais du body).
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('boutique/:boutiqueId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une commande (vitrine publique)' })
  create(
    @Param('boutiqueId') boutiqueId: string,
    @Body() dto: CreateOrderDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.ordersService.create(boutiqueId, dto, user?.id);
  }

  // ===== Routes client connecté =====

  /**
   * GET /orders/me — commandes du CLIENT connecté (userId du token).
   * Isolation stricte : un client ne voit QUE ses propres commandes.
   */
  @Get('me')
  @Roles('CLIENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Commandes du client connecté (Mes commandes)' })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findForUser(user.id);
  }

  // ===== Routes vendeur (scopées à sa boutique) =====

  @Get('boutique/:boutiqueId')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Commandes d’une boutique (admin)' })
  findAll(@Param('boutiqueId') boutiqueId: string) {
    return this.ordersService.findAllForAdmin(boutiqueId);
  }

  @Patch('boutique/:boutiqueId/:id/status')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Changer le statut d’une commande' })
  updateStatus(
    @Param('boutiqueId') boutiqueId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(boutiqueId, id, dto);
  }

  /** Historique d'un client (par numéro de téléphone) — vitrine */
  @Public()
  @Get('boutique/:boutiqueId/customer/:phone')
  @ApiOperation({ summary: 'Historique des commandes d’un client (téléphone)' })
  findForCustomer(
    @Param('boutiqueId') boutiqueId: string,
    @Param('phone') phone: string,
  ) {
    return this.ordersService.findForCustomer(phone, boutiqueId);
  }

  /** Suivi d'une commande par numéro (référence, ex. #AC-8901) — vitrine */
  @Public()
  @Get('boutique/:boutiqueId/reference/:reference')
  @ApiOperation({ summary: 'Suivi d’une commande par numéro (référence)' })
  findByReference(
    @Param('boutiqueId') boutiqueId: string,
    @Param('reference') reference: string,
    @Query('phone') phone?: string,
  ) {
    return this.ordersService.findByReference(reference, boutiqueId, phone);
  }

  /** Annulation par le CLIENT (vitrine) — téléphone obligatoire, remise en stock */
  @Public()
  @Patch('boutique/:boutiqueId/:id/cancel')
  @ApiOperation({ summary: 'Annuler une commande (client, vitrine)' })
  cancel(
    @Param('boutiqueId') boutiqueId: string,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelByCustomer(boutiqueId, id, dto);
  }

  /**
   * Confirmation de paiement par le CLIENT (vitrine) : PENDING → PAID.
   * Public + token optionnel : un client connecté est identifié par son
   * userId ; un visiteur doit fournir le téléphone de la commande.
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('boutique/:boutiqueId/:id/pay')
  @ApiOperation({ summary: 'Confirmer le paiement d’une commande (client)' })
  confirmPayment(
    @Param('boutiqueId') boutiqueId: string,
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.ordersService.confirmPayment(boutiqueId, id, dto, user?.id);
  }
}
