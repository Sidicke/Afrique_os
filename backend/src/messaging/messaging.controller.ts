import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { StartConversationDto } from './dto/start-conversation.dto';
import { MessagingService } from './messaging.service';

@ApiTags('messaging')
@ApiBearerAuth()
@Controller('conversations')
export class MessagingController {
  
  @Post(':id/discount')
  @Roles('VENDEUR', 'ADMIN')
  @ApiOperation({ summary: 'Appliquer un prix négocié sur une discussion (vendeur)' })
  applyDiscount(
    @Param('id') conversationId: string,
    @Body() dto: ApplyDiscountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagingService.applyDiscountSeller(conversationId, user.id, dto.agreedPrice);
  }
  
  constructor(private readonly messagingService: MessagingService) {}

  /** GET /conversations — liste des conversations de l'utilisateur/boutique */
  @Get()
  @ApiOperation({ summary: 'Conversations de l’utilisateur connecté' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.findConversations({
      id: user.id,
      role: user.role,
    });
  }

  /** POST /conversations — un client ouvre une conversation avec une boutique */
  @Post('start/:boutiqueId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ouvrir une conversation avec une boutique (client)' })
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('boutiqueId') boutiqueId: string,
    @Body() dto: StartConversationDto,
  ) {
    return this.messagingService.startConversation(
      { id: user.id, role: user.role },
      boutiqueId,
      dto,
    );
  }

  /** GET /conversations/:id/messages — historique (pagination par curseur) */
  @Get(':id/messages')
  @ApiOperation({ summary: 'Historique des messages (pagination)' })
  getMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagingService.getMessages(
      { id: user.id, role: user.role },
      id,
      cursor,
      limit ? Number(limit) : undefined,
    );
  }

  /** POST /conversations/:id/messages — envoi REST (fallback WS) */
  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Envoyer un message (REST)' })
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.addMessage(
      { id: user.id, role: user.role },
      id,
      dto.content,
    );
  }

  /** POST /conversations/:id/read — marque les messages comme lus */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marquer les messages comme lus' })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messagingService.markRead(
      { id: user.id, role: user.role },
      id,
    );
  }
}
