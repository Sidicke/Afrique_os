import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Profil de l’utilisateur connecté' })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.id);
  }

  @Get('affiliation')
  @ApiOperation({ summary: 'Détails du programme d’affiliation et des points' })
  getAffiliation(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getAffiliationDetails(user.id);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mettre à jour son profil' })
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }
}
