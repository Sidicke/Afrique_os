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
import { BoutiqueOwnerGuard } from '../boutiques/guards/boutique-owner.guard';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ===== Routes vendeur (scopées à sa boutique) =====

  @Get('boutique/:boutiqueId')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Produits d’une boutique (admin)' })
  findAll(@Param('boutiqueId') boutiqueId: string) {
    return this.productsService.findAllForAdmin(boutiqueId);
  }

  @Post('boutique/:boutiqueId')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un produit dans une boutique' })
  create(@Param('boutiqueId') boutiqueId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(boutiqueId, dto);
  }

  @Get('boutique/:boutiqueId/:id')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détail d’un produit (admin)' })
  findOne(@Param('boutiqueId') boutiqueId: string, @Param('id') id: string) {
    return this.productsService.findOneForAdmin(boutiqueId, id);
  }

  @Patch('boutique/:boutiqueId/:id')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un produit' })
  update(
    @Param('boutiqueId') boutiqueId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(boutiqueId, id, dto);
  }

  @Delete('boutique/:boutiqueId/:id')
  @UseGuards(BoutiqueOwnerGuard)
  @Roles('VENDEUR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un produit' })
  remove(@Param('boutiqueId') boutiqueId: string, @Param('id') id: string) {
    return this.productsService.remove(boutiqueId, id);
  }

  // ===== Routes publiques (vitrine) =====

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Catalogue GLOBAL — produits actifs de toutes les boutiques ACTIVE (base du futur Marketplace)' })
  findAllPublic(@Query() query: QueryProductsDto) {
    return this.productsService.findAllPublic(query);
  }

  @Public()
  @Get('public/categories')
  @ApiOperation({ summary: 'Catégories du catalogue GLOBAL avec nombre de produits actifs (menu et filtres du Marketplace)' })
  findPublicCategories() {
    return this.productsService.findPublicCategories();
  }

  @Public()
  @Get('public/boutique/:slug')
  @ApiOperation({ summary: 'Catalogue public d’une boutique (filtres, tri, pagination)' })
  findPublic(@Param('slug') slug: string, @Query() query: QueryProductsDto) {
    return this.productsService.findPublicBySlug(slug, query);
  }

  @Public()
  @Get('public/boutique/:slug/:id')
  @ApiOperation({ summary: 'Détail public d’un produit (variantes + avis)' })
  findOnePublic(@Param('slug') slug: string, @Param('id') id: string) {
    return this.productsService.findOnePublic(slug, id);
  }

  @Public()
  @Get('public/whatsapp-link')
  @ApiOperation({ summary: 'Lien WhatsApp pour commander un produit' })
  whatsappLink(
    @Query('boutiqueSlug') boutiqueSlug: string,
    @Query('productId') productId: string,
  ) {
    return this.productsService.getWhatsappLink(boutiqueSlug, productId);
  }

  @Public()
  @Get('public/by-slug/:slug')
  @ApiOperation({
    summary: 'Détail public d\u2019un produit par son slug (lien direct /produit/:slug du Marketplace)',
  })
  findOnePublicBySlug(@Param('slug') slug: string) {
    return this.productsService.findOnePublicBySlug(slug);
  }
}
