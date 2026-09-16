import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(boutiqueId: string, dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, boutiqueId },
      });
      if (!parent) {
        throw new BadRequestException('Catégorie parente introuvable pour cette boutique');
      }
    }

    const slug = this.slugify(dto.name);
    const existing = await this.prisma.category.findUnique({
      where: { boutiqueId_slug: { boutiqueId, slug } },
    });
    if (existing) {
      throw new ConflictException('Une catégorie avec ce nom existe déjà');
    }
    return this.prisma.category.create({
      data: { boutiqueId, name: dto.name, slug, parentId: dto.parentId },
    });
  }

  /** Liste pour l'admin (avec comptage de produits) */
  async findAllForAdmin(boutiqueId: string) {
    return this.prisma.category.findMany({
      where: { boutiqueId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  /** Liste publique de la vitrine (avec comptage de produits actifs) */
  async findAllPublic(slug: string) {
    const boutique = await this.prisma.boutique.findFirst({
      where: { slug, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!boutique) throw new NotFoundException('Boutique introuvable');
    return this.prisma.category.findMany({
      where: { boutiqueId: boutique.id },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(boutiqueId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOneScoped(boutiqueId, id);
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Une catégorie ne peut pas être sa propre parente');
      }
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, boutiqueId },
      });
      if (!parent) {
        throw new BadRequestException('Catégorie parente introuvable pour cette boutique');
      }
    }

    const data: Record<string, unknown> = { ...dto };
    if (dto.name) data.slug = this.slugify(dto.name);
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(boutiqueId: string, id: string) {
    await this.findOneScoped(boutiqueId, id);
    return this.prisma.category.delete({ where: { id } });
  }

  private async findOneScoped(boutiqueId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, boutiqueId },
    });
    if (!category) throw new NotFoundException('Catégorie introuvable');
    return category;
  }

  private slugify(value: string): string {
    return (
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'categorie'
    );
  }
}
