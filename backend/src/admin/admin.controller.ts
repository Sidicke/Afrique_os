import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AdminService } from './admin.service';
import { AdminPeriodEnum, ListQueryDto } from './dto/list-query.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { OrderStatusDto } from './dto/order-status.dto';
import { PlanUpdateDto } from './dto/plan-update.dto';
import { ReportDecisionDto } from './dto/report-decision.dto';
import { SettingsUpdateDto } from './dto/settings-update.dto';
import { StoreStatusDto } from './dto/store-status.dto';
import { SubscriptionUpdateDto } from './dto/subscription-update.dto';
import { UserStatusDto } from './dto/user-status.dto';
import { VerificationDecisionDto } from './dto/verification-decision.dto';

/**
 * Dashboard Super Admin — vue globale de la plateforme (réservé ADMIN).
 * Chaque endpoint renvoie le contrat exact consommé par le frontend
 * (`frontend/src/types/admin.ts`).
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** GET /admin/overview — Command Center (doc 03) */
  @Get('overview')
  @ApiOperation({ summary: 'Vue d’ensemble de la plateforme (admin)' })
  getOverview(@Query('period') period?: AdminPeriodEnum) {
    return this.adminService.getOverview(period ?? '30_days');
  }

  /* ===== Vérification (doc 04) ===== */

  @Get('verification')
  @ApiOperation({ summary: 'Liste des dossiers de vérification (admin)' })
  getVerifications(@Query() query: ListQueryDto) {
    return this.adminService.getVerifications(query.q);
  }

  @Get('verification/:id')
  @ApiOperation({ summary: 'Détail d’un dossier de vérification (admin)' })
  getVerificationCase(@Param('id') id: string) {
    return this.adminService.getVerificationCase(id);
  }

  @Post('verification/:id/decision')
  @ApiOperation({ summary: 'Décision de vérification : approuver / rejeter (admin)' })
  reviewVerification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: VerificationDecisionDto,
  ) {
    return this.adminService.reviewVerification(user, id, dto);
  }

  /* ===== Boutiques (doc 05) ===== */

  @Get('stores')
  @ApiOperation({ summary: 'Liste des boutiques (admin)' })
  getStores(@Query() query: ListQueryDto) {
    return this.adminService.getStores(query.q, query.status);
  }

  @Get('stores/:id')
  @ApiOperation({ summary: 'Détail d’une boutique (admin)' })
  getStoreDetail(@Param('id') id: string) {
    return this.adminService.getStoreDetail(id);
  }

  @Patch('stores/:id/status')
  @ApiOperation({ summary: 'Suspendre / réactiver / bloquer une boutique (admin)' })
  setStoreStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: StoreStatusDto,
  ) {
    return this.adminService.setStoreStatus(user, id, dto);
  }

  /* ===== Utilisateurs (doc 06) ===== */

  @Get('users')
  @ApiOperation({ summary: 'Liste des utilisateurs (admin)' })
  getUsers(@Query() query: ListQueryDto) {
    return this.adminService.getUsers(query.q, query.role);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Détail d’un utilisateur (admin)' })
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Bloquer / réactiver un compte (admin)' })
  setUserStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UserStatusDto,
  ) {
    return this.adminService.setUserStatus(user, id, dto);
  }

  /* ===== Commandes (doc 07) ===== */

  @Get('orders')
  @ApiOperation({ summary: 'Vue globale des commandes (admin)' })
  getOrders(@Query() query: ListQueryDto) {
    return this.adminService.getOrders(query.q, query.status);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Détail d’une commande (admin)' })
  getOrderDetail(@Param('id') id: string) {
    return this.adminService.getOrderDetail(id);
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Changer le statut d’une commande (admin)' })
  setOrderStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: OrderStatusDto,
  ) {
    return this.adminService.setOrderStatus(user, id, dto);
  }

  @Post('orders/:id/cancel')
  @ApiOperation({ summary: 'Annuler une commande (admin, remise en stock)' })
  cancelOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.adminService.cancelOrder(user, id, dto);
  }

  /* ===== Abonnements & revenus (doc 08) ===== */

  @Get('subscriptions')
  @ApiOperation({ summary: 'Supervision des abonnements et revenus (admin)' })
  getSubscriptions() {
    return this.adminService.getSubscriptions();
  }

  @Get('subscriptions/:id')
  @ApiOperation({ summary: 'Détail d’un abonnement (admin)' })
  getSubscriptionDetail(@Param('id') id: string) {
    return this.adminService.getSubscriptionDetail(id);
  }

  @Patch('subscriptions/:id')
  @ApiOperation({ summary: 'Changer le plan / statut d’un abonnement (admin)' })
  updateSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubscriptionUpdateDto,
  ) {
    return this.adminService.updateSubscription(user, id, dto);
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Activer / désactiver un plan (PlansManager)' })
  updatePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PlanUpdateDto,
  ) {
    return this.adminService.updatePlan(user, id, dto);
  }

  /* ===== Analytics (doc 09) ===== */

  @Get('analytics')
  @ApiOperation({ summary: 'Analyses de la plateforme (admin)' })
  getAnalytics(@Query('period') period?: AdminPeriodEnum) {
    return this.adminService.getAnalytics(period ?? '30_days');
  }

  /* ===== Modération & sécurité (doc 10) ===== */

  @Get('moderation')
  @ApiOperation({ summary: 'Signalements, incidents, journal d’audit (admin)' })
  getModeration() {
    return this.adminService.getModeration();
  }

  @Get('moderation/:id')
  @ApiOperation({ summary: 'Détail d’un signalement (admin)' })
  getModerationCase(@Param('id') id: string) {
    return this.adminService.getModerationCase(id);
  }

  @Post('moderation/:id/decision')
  @ApiOperation({ summary: 'Décision sur un signalement (admin)' })
  decideReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReportDecisionDto,
  ) {
    return this.adminService.decideReport(user, id, dto);
  }

  /* ===== Paramètres globaux (doc 11) ===== */

  @Get('settings')
  @ApiOperation({ summary: 'Paramètres globaux de la plateforme (admin)' })
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Modifier les paramètres globaux (admin)' })
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SettingsUpdateDto,
  ) {
    return this.adminService.updateSettings(user, dto);
  }

  /* ===== Profil admin + notes internes ===== */

  @Get('profile')
  @ApiOperation({ summary: 'Profil de l’administrateur connecté' })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.getProfile(user.id);
  }

  @Post('notes')
  @ApiOperation({ summary: 'Créer une note interne (jamais visible par le vendeur)' })
  createNote(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateNoteDto) {
    return this.adminService.createNote(user, dto);
  }
}
