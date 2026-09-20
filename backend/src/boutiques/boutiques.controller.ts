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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BoutiqueStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BoutiqueOwnerGuard } from './guards/boutique-owner.guard';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { BoutiquesService } from './boutiques.service';
import { CreateBoutiqueDto } from './dto/create-boutique.dto';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { UpdateBoutiqueDto } from './dto/update-boutique.dto';
import { InviteTeamMemberDto, UpdateTeamMemberDto } from './dto/team-member.dto';
import { ParseEnumPipe } from '@nestjs/common';

@ApiTags('boutiques')
@ApiBearerAuth()
@Controller('boutiques')
export class BoutiquesController {

  @Post(':id/withdraw')
  @UseGuards(BoutiqueOwnerGuard)
  @ApiOperation({ summary: 'Demander un retrait des fonds' })
  async requestWithdrawal(
    @Param('id') id: string,
    @Body() dto: RequestWithdrawalDto,
  ) {
    return this.boutiquesService.requestWithdrawal(id, dto.amount, dto.paymentInfo);
  }

  @Get(':id/wallet')
  @UseGuards(BoutiqueOwnerGuard)
  @ApiOperation({ summary: 'Voir le portefeuille vendeur' })
  async getWallet(@Param('id') id: string) {
    return this.boutiquesService.getWallet(id);
  }
  constructor(private readonly boutiquesService: BoutiquesService) {}

  /** POST /boutiques — création de la boutique (statut PENDING) */
  @Post()
  @Roles('VENDEUR', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une boutique (PENDING)' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBoutiqueDto) {
    return this.boutiquesService.create(user.id, dto);
  }

  /** GET /boutiques/my — boutiques de l'utilisateur connecté */
  @Get('my')
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Boutiques de l’utilisateur connecté' })
  findMy(@CurrentUser() user: AuthenticatedUser) {
    return this.boutiquesService.findMy(user.id);
  }

  /** PATCH /boutiques/:id — mise à jour (protégé par BoutiqueOwnerGuard) */
  @Patch(':id')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Mettre à jour une boutique (propriétaire)' })
  update(@Param('id') id: string, @Body() dto: UpdateBoutiqueDto) {
    return this.boutiquesService.update(id, dto);
  }

  /**
   * GET /boutiques/check-name/:name — Vérifie la disponibilité d'un nom de boutique
   */
  @Public()
  @Get('check-name/:name')
  @ApiOperation({ summary: 'Vérifie la disponibilité d\'un nom de boutique' })
  async checkName(@Param('name') name: string) {
    const available = await this.boutiquesService.isNameAvailable(name);
    return { available };
  }

  /**
   * GET /boutiques/public — liste publique des boutiques ACTIVE (annuaire).
   * Déclaré avant @Get('public/:slug') pour que le segment « public » ne
   * matche pas :slug.
   */
  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Liste des boutiques ACTIVE (annuaire client)' })
  findPublicAll() {
    return this.boutiquesService.findPublicAll();
  }

  /**
   * GET /boutiques/public/:slug — profil public complet (vitrine).
   * Public : identité + config + catégories + produits actifs.
   * Déclaré avant @Get(':id') pour que le segment « public » ne matche pas :id.
   */
  @Public()
  @Get('public/:slug')
  @ApiOperation({ summary: 'Profil public d’une boutique (vitrine)' })
  findPublic(@Param('slug') slug: string) {
    return this.boutiquesService.findPublicBySlug(slug);
  }

  /**
   * POST /boutiques/:id/request-verification — le vendeur demande la
   * vérification de son compte depuis « Mon profil » (statut → PENDING).
   */
  @Post(':id/request-verification')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Demander la vérification du compte (vendeur)' })
  requestVerification(@Param('id') id: string) {
    return this.boutiquesService.requestVerification(id);
  }

  /**
   * POST /boutiques/:id/verification — décision de la plateforme
   * (réservé ADMIN) : VERIFIED → badge affiché, REJECTED → nouvelle demande.
   */
  @Post(':id/verification')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Valider ou refuser la vérification d’une boutique (admin)' })
  reviewVerification(@Param('id') id: string, @Body() dto: ReviewVerificationDto) {
    return this.boutiquesService.reviewVerification(id, dto.status);
  }

  /** PATCH /boutiques/:id/status — cycle de vie (réservé admin plateforme) */
  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Changer le statut d’une boutique (admin)' })
  updateStatus(
    @Param('id') id: string,
    @Body('status', new ParseEnumPipe(BoutiqueStatus)) status: BoutiqueStatus,
  ) {
    return this.boutiquesService.updateStatus(id, status);
  }

  /** GET /boutiques/:id — détail pour le propriétaire */
  @Get(':id')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Détail d’une boutique (propriétaire)' })
  findOne(@Param('id') id: string) {
    return this.boutiquesService.findOneForOwner(id);
  }

  /** GET /boutiques/:id/team — liste des collaborateurs */
  @Get(':id/team')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Liste des collaborateurs d’une boutique' })
  getTeam(@Param('id') id: string) {
    return this.boutiquesService.getTeamMembers(id);
  }

  /** POST /boutiques/:id/team — inviter un collaborateur */
  @Post(':id/team')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Inviter un collaborateur sur la boutique' })
  inviteTeam(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteTeamMemberDto,
  ) {
    return this.boutiquesService.inviteTeamMember(id, user.id, dto);
  }

  /** PATCH /boutiques/:id/team/:memberId — modifier rôle ou statut */
  @Patch(':id/team/:memberId')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Mettre à jour le rôle ou statut d’un membre' })
  updateTeam(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    return this.boutiquesService.updateTeamMember(id, memberId, dto);
  }

  /** DELETE /boutiques/:id/team/:memberId — supprimer un collaborateur */
  @Delete(':id/team/:memberId')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Supprimer un collaborateur de la boutique' })
  removeTeam(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.boutiquesService.removeTeamMember(id, memberId);
  }
}
