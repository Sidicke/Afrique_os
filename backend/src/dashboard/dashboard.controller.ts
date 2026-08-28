import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BoutiqueOwnerGuard } from '../boutiques/guards/boutique-owner.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DashboardService, StatsPeriod } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('boutique/:boutiqueId/overview')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Vue d’ensemble du dashboard (KPIs du mois)' })
  getOverview(@Param('boutiqueId') boutiqueId: string) {
    return this.dashboardService.getOverview(boutiqueId);
  }

  @Get('boutique/:boutiqueId/stats')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Statistiques par période (7j / 30j / année)' })
  getStats(
    @Param('boutiqueId') boutiqueId: string,
    @Query('period') period: StatsPeriod = '30_days',
  ) {
    return this.dashboardService.getStats(boutiqueId, period);
  }

  @Get('boutique/:boutiqueId/customers')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Liste des clients (dérivés des commandes)' })
  getCustomers(@Param('boutiqueId') boutiqueId: string) {
    return this.dashboardService.getCustomers(boutiqueId);
  }
}
