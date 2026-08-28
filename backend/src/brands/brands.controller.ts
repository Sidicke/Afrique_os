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
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BoutiqueOwnerGuard } from '../boutiques/guards/boutique-owner.guard';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';

@ApiTags('brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  // ===== Routes vendeur (scopées à sa boutique) =====

  @Get('boutique/:boutiqueId')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marques d’une boutique (admin)' })
  findAll(@Param('boutiqueId') boutiqueId: string) {
    return this.brandsService.findAllForAdmin(boutiqueId);
  }

  @Post('boutique/:boutiqueId')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une marque dans une boutique' })
  create(@Param('boutiqueId') boutiqueId: string, @Body() dto: CreateBrandDto) {
    return this.brandsService.create(boutiqueId, dto);
  }

  @Patch('boutique/:boutiqueId/:id')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renommer une marque' })
  update(
    @Param('boutiqueId') boutiqueId: string,
    @Param('id') id: string,
    @Body() dto: CreateBrandDto,
  ) {
    return this.brandsService.update(boutiqueId, id, dto);
  }

  @Delete('boutique/:boutiqueId/:id')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une marque' })
  remove(@Param('boutiqueId') boutiqueId: string, @Param('id') id: string) {
    return this.brandsService.remove(boutiqueId, id);
  }

  // ===== Route publique (vitrine) =====

  @Public()
  @Get('public/:slug')
  @ApiOperation({ summary: 'Marques publiques d’une boutique (vitrine)' })
  findAllPublic(@Param('slug') slug: string) {
    return this.brandsService.findAllPublic(slug);
  }
}
