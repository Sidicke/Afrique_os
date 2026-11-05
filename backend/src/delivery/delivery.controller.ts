import {
  Body,
  Controller,
  Delete,
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
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DeliveryService } from './delivery.service';
import {
  AdminVerifyPartnerDto,
  AssignAgencyMissionDto,
  AttachCourierToAgencyDto,
  CalculateDeliveryQuoteDto,
  CreateAddressSnapshotDto,
  CreateShipmentFromOrderDto,
  DispatchShipmentDto,
  OpenDeliveryDisputeDto,
  RecordHandoverEvidenceDto,
  RegisterAgencyDto,
  RegisterCourierProfileDto,
  ResolveDeliveryDisputeDto,
  SendCourierClientMessageDto,
  UpdateDeliveryPlatformConfigDto,
  VerifyDeliveryCodeDto,
  VerifyGuestDeliveryDto,
} from './dto/delivery.dto';

@ApiTags('delivery')
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  // ==========================================================================
  // 1. GÉOGRAPHIE BÉNIN, GARES INTERURBAINES & DEVIS DE LIVRAISON (PUBLIC)
  // ==========================================================================

  @Public()
  @Get('geography')
  @ApiOperation({
    summary: 'Référentiel géographique Bénin (départements, communes, quartiers, gares actives)',
  })
  getGeography() {
    return this.deliveryService.getGeographyCatalog();
  }

  @Public()
  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Calculer un devis de livraison (domicile, gare, interurbain) articulé avec les packs vendeur',
  })
  calculateQuote(@Body() dto: CalculateDeliveryQuoteDto) {
    return this.deliveryService.calculateQuote(dto);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('addresses')
  @ApiOperation({
    summary: 'Créer un snapshot d’adresse structurée béninoise avec qualification de précision',
  })
  createAddress(
    @Body() dto: CreateAddressSnapshotDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.deliveryService.createAddressSnapshot(dto, user?.id);
  }

  @Public()
  @Get('agencies/verified')
  @ApiOperation({ summary: 'Lister les agences de livraison partenaires vérifiées' })
  listVerifiedAgencies(@Query('commune') commune?: string) {
    return this.deliveryService.listVerifiedAgencies(commune);
  }

  // ==========================================================================
  // 2. EXPÉDITIONS (SHIPMENTS) & DISPATCH PAR LE VENDEUR
  // ==========================================================================

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('shipments/from-order')
  @ApiOperation({ summary: 'Créer ou récupérer l’expédition (Shipment) liée à une commande' })
  createShipmentFromOrder(
    @Body() dto: CreateShipmentFromOrderDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.deliveryService.createOrGetShipmentForOrder(
      dto,
      user?.id,
      user?.role ?? 'CLIENT',
    );
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('shipments/by-order/:orderId')
  @ApiOperation({ summary: 'Récupérer l’expédition d’une commande (client, vendeur ou invité)' })
  getShipmentByOrder(
    @Param('orderId') orderId: string,
    @Query('guestToken') guestToken?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.deliveryService.getShipmentByOrderId(
      orderId,
      user?.id,
      user?.role,
      guestToken,
    );
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('shipments/:id')
  @ApiOperation({ summary: 'Détails complets d’une expédition et de ses segments' })
  getShipmentDetails(
    @Param('id') id: string,
    @Query('guestToken') guestToken?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.deliveryService.getShipmentDetails(id, user?.id, user?.role, guestToken);
  }

  @Post('shipments/:id/dispatch')
  @Roles('VENDEUR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Attribuer l’expédition (livreur personnel vendeur, agence partenaire ou pool public indépendant)',
  })
  dispatchShipment(
    @Param('id') id: string,
    @Body() dto: DispatchShipmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.dispatchShipment(
      id,
      user.id,
      dto,
      user.role === 'ADMIN',
    );
  }

  // ==========================================================================
  // 3. ACTEURS DE LIVRAISON : AGENCES & LIVREURS (KYC & RATTACHEMENT EXCLUSIF)
  // ==========================================================================

  @Post('agencies/register')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enregistrer une agence de livraison professionnelle (soumise au KYC)' })
  registerAgency(
    @Body() dto: RegisterAgencyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.registerAgency(user.id, dto);
  }

  @Post('agencies/:agencyId/couriers')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Rattacher un livreur à une agence (exclusif : bloque immédiatement l’accès aux missions publiques)',
  })
  attachCourierToAgency(
    @Param('agencyId') agencyId: string,
    @Body() dto: AttachCourierToAgencyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.attachCourierToAgency(
      agencyId,
      user.id,
      dto,
      user.role === 'ADMIN',
    );
  }

  @Delete('agencies/:agencyId/couriers/:courierProfileId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détacher un livreur d’une agence (interdit si mission active en cours)' })
  detachCourierFromAgency(
    @Param('agencyId') agencyId: string,
    @Param('courierProfileId') courierProfileId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.detachCourierFromAgency(
      agencyId,
      courierProfileId,
      user.id,
      user.role === 'ADMIN',
    );
  }

  @Post('couriers/register')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer ou mettre à jour son profil livreur (KYC obligatoire)' })
  registerCourier(
    @Body() dto: RegisterCourierProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.registerCourierProfile(user.id, dto);
  }

  // ==========================================================================
  // 4. MISSIONS : POOL PUBLIC (INDÉPENDANTS UNIQUEMENT) & AFFECTATION AGENCE
  // ==========================================================================

  @Get('missions/public')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Consulter les missions publiques éligibles (strictement interdit aux livreurs d’agence)',
  })
  listPublicMissions(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveryService.listPublicMissionsForIndependentCourier(user.id);
  }

  @Post('missions/:missionId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Accepter atomiquement une mission publique (1 seul gagnant sous concurrence, interdit aux livreurs d’agence)',
  })
  acceptPublicMission(
    @Param('missionId') missionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.acceptPublicMission(missionId, user.id);
  }

  @Post('missions/:missionId/agency-assign')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Attribuer une mission d’agence à un livreur membre actif (ou valider le livreur demandé par le vendeur)',
  })
  assignMissionByAgency(
    @Param('missionId') missionId: string,
    @Body() dto: AssignAgencyMissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.assignMissionByAgency(
      missionId,
      user.id,
      dto,
      user.role === 'ADMIN',
    );
  }

  @Get('missions/mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Missions attribuées au livreur connecté' })
  listMyMissions(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveryService.listMyAssignedMissions(user.id);
  }

  // ==========================================================================
  // 5. PREUVES DE REMISE, TRANSIT INTERURBAIN, CODE UNIQUE & CONFORMITÉ
  // ==========================================================================

  @Post('shipments/:id/handover')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Enregistrer une preuve de transfert (collecte vendeur, remise transporteur interurbain, arrivée gare, tentative)',
  })
  recordHandover(
    @Param('id') id: string,
    @Body() dto: RecordHandoverEvidenceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.recordHandoverEvidence(id, user.id, user.role, dto);
  }

  @Post('shipments/:id/verify-code')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Vérifier le code de remise à usage unique du client (passe à DELIVERED_VERIFIED et révoque le chat livreur)',
  })
  verifyDeliveryCode(
    @Param('id') id: string,
    @Body() dto: VerifyDeliveryCodeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.verifyDeliveryByBuyerCode(id, user.id, dto);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('shipments/:id/confirm-receipt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirmer la réception par le client connecté ou via le lien invité signé',
  })
  confirmReceiptByBuyerOrGuest(
    @Param('id') id: string,
    @Body() dto: VerifyGuestDeliveryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.deliveryService.verifyDeliveryByGuestOrBuyer(id, dto, user?.id);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('shipments/:id/accept-conformity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Confirmer la conformité du produit reçu (libère l’allocation financière du vendeur)',
  })
  acceptConformity(
    @Param('id') id: string,
    @Body('guestToken') guestToken?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.deliveryService.acceptProductConformity(id, user?.id, guestToken);
  }

  // ==========================================================================
  // 6. MESSAGERIE TEMPORAIRE CLIENT ↔ LIVREUR (AVEC RÉVOCATION AUTOMATIQUE)
  // ==========================================================================

  @Get('shipments/:id/messages')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lire les messages de la mission entre le client et le livreur' })
  getShipmentMessages(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.getShipmentChatMessages(id, user.id);
  }

  @Post('shipments/:id/messages')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Envoyer un message Client ↔ Livreur (bloqué automatiquement dès que la livraison est confirmée)',
  })
  sendShipmentMessage(
    @Param('id') id: string,
    @Body() dto: SendCourierClientMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.sendShipmentChatMessage(id, user.id, dto);
  }

  // ==========================================================================
  // 7. LITIGES CIBLÉS (PRODUIT / LIVRAISON) & SUPERVISION ADMIN
  // ==========================================================================

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('shipments/:id/disputes')
  @ApiOperation({
    summary:
      'Ouvrir un litige ciblé (PRODUCT_ONLY, DELIVERY_ONLY, BOTH) bloquant uniquement le reversement concerné',
  })
  openDispute(
    @Param('id') id: string,
    @Body() dto: OpenDeliveryDisputeDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.deliveryService.openDispute(id, dto, user?.id);
  }

  @Patch('admin/agencies/:agencyId/verify')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Valider ou rejeter le KYC d’une agence de livraison (Admin)' })
  adminVerifyAgency(
    @Param('agencyId') agencyId: string,
    @Body() dto: AdminVerifyPartnerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.adminVerifyAgency(agencyId, user.id, dto);
  }

  @Patch('admin/couriers/:courierProfileId/verify')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Valider ou rejeter le KYC d’un livreur (Admin)' })
  adminVerifyCourier(
    @Param('courierProfileId') courierProfileId: string,
    @Body() dto: AdminVerifyPartnerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.adminVerifyCourier(courierProfileId, user.id, dto);
  }

  @Patch('admin/disputes/:disputeId/resolve')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Arbitrer et résoudre un litige de livraison/produit (Admin)' })
  adminResolveDispute(
    @Param('disputeId') disputeId: string,
    @Body() dto: ResolveDeliveryDisputeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.resolveDisputeByAdmin(disputeId, user.id, dto);
  }

  @Get('admin/overview')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vue globale de supervision des livraisons, acteurs et litiges (Admin)' })
  getAdminOverview() {
    return this.deliveryService.getDeliveryDashboardOverviewForAdmin();
  }

  @Get('admin/config')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Consulter la configuration logistique (taux de commission Agence/Indépendant/Vendeur, délai 24h, règles COD et décaissement manuel)',
  })
  getAdminConfig() {
    return this.deliveryService.getDeliveryPlatformConfig();
  }

  @Patch('admin/config')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Modifier la configuration logistique (Décisions D1-D5 : taux de commission non-rétroactifs, délai d’éligibilité au reversement)',
  })
  updateAdminConfig(
    @Body() dto: UpdateDeliveryPlatformConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.updateDeliveryPlatformConfig(user.id, dto);
  }

  @Post('admin/settlements/process-eligible')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Libérer les allocations vendeur dont le délai de conformité (24h par défaut) est expiré sans litige ni remboursement en cours (Décision D4)',
  })
  processEligibleSettlements() {
    return this.deliveryService.processEligibleSellerSettlementsAfterConformityWindow();
  }

  @Patch('admin/settlements/:settlementId/approve-payout')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Valider manuellement un décaissement éligible (Décision D1 : aucun payout automatique PSP sans validation Admin)',
  })
  adminApprovePayout(
    @Param('settlementId') settlementId: string,
    @Body('notes') notes: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.adminApproveSettlementPayout(
      settlementId,
      user.id,
      notes,
    );
  }
}
