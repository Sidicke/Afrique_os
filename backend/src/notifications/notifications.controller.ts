import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BoutiqueOwnerGuard } from '../boutiques/guards/boutique-owner.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Liste des notifications du vendeur (plus récentes d'abord) */
  @Get('boutique/:boutiqueId')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Notifications de la boutique (vendeur)' })
  findAll(@Param('boutiqueId') boutiqueId: string) {
    return this.notificationsService.findAll(boutiqueId);
  }

  /** Compteur de non-lues (badge de la cloche) */
  @Get('boutique/:boutiqueId/unread-count')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Nombre de notifications non lues' })
  async unreadCount(@Param('boutiqueId') boutiqueId: string) {
    const count = await this.notificationsService.unreadCount(boutiqueId);
    return { count };
  }

  /** Marque UNE notification comme lue */
  @Post('boutique/:boutiqueId/:id/read')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  markAsRead(
    @Param('boutiqueId') boutiqueId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(boutiqueId, id);
  }

  /** Marque TOUTES les notifications comme lues */
  @Post('boutique/:boutiqueId/read-all')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Tout marquer comme lu' })
  markAllAsRead(@Param('boutiqueId') boutiqueId: string) {
    return this.notificationsService.markAllAsRead(boutiqueId);
  }

  /** Supprime TOUTES les notifications de la boutique (panneau « tout supprimer ») */
  @Delete('boutique/:boutiqueId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Supprimer toutes les notifications de la boutique' })
  deleteAll(@Param('boutiqueId') boutiqueId: string) {
    return this.notificationsService.deleteAll(boutiqueId);
  }
}
