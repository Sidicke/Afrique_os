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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ===== Routes vendeur (scopées à sa boutique) =====

  @Get('boutique/:boutiqueId')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Catégories d’une boutique (admin)' })
  findAll(@Param('boutiqueId') boutiqueId: string) {
    return this.categoriesService.findAllForAdmin(boutiqueId);
  }

  @Post('boutique/:boutiqueId')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une catégorie dans une boutique' })
  create(@Param('boutiqueId') boutiqueId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(boutiqueId, dto);
  }

  @Patch('boutique/:boutiqueId/:id')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renommer une catégorie' })
  update(
    @Param('boutiqueId') boutiqueId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(boutiqueId, id, dto);
  }

  @Delete('boutique/:boutiqueId/:id')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une catégorie' })
  remove(@Param('boutiqueId') boutiqueId: string, @Param('id') id: string) {
    return this.categoriesService.remove(boutiqueId, id);
  }

  // ===== Route publique (vitrine) =====

  @Public()
  @Get('public/:slug')
  @ApiOperation({ summary: 'Catégories publiques d’une boutique (vitrine)' })
  findAllPublic(@Param('slug') slug: string) {
    return this.categoriesService.findAllPublic(slug);
  }
}
