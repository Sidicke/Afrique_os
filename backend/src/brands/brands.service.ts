import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(boutiqueId: string, dto: CreateBrandDto) {
    const slug = this.slugify(dto.name);
    const existing = await this.prisma.brand.findUnique({
      where: { boutiqueId_slug: { boutiqueId, slug } },
    });
    if (existing) {
      throw new ConflictException('Une marque avec ce nom existe déjà');
    }
    return this.prisma.brand.create({
      data: { boutiqueId, name: dto.name, slug },
    });
  }

  /** Liste pour l'admin (avec comptage de produits) */
  async findAllForAdmin(boutiqueId: string) {
    return this.prisma.brand.findMany({
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
    return this.prisma.brand.findMany({
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

  async update(boutiqueId: string, id: string, dto: CreateBrandDto) {
    await this.findOneScoped(boutiqueId, id);
    const data: Record<string, unknown> = { ...dto };
    data.slug = this.slugify(dto.name);
    return this.prisma.brand.update({ where: { id }, data });
  }

  async remove(boutiqueId: string, id: string) {
    await this.findOneScoped(boutiqueId, id);
    return this.prisma.brand.delete({ where: { id } });
  }

  private async findOneScoped(boutiqueId: string, id: string) {
    const brand = await this.prisma.brand.findFirst({ where: { id, boutiqueId } });
    if (!brand) throw new NotFoundException('Marque introuvable');
    return brand;
  }

  private slugify(value: string): string {
    return (
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'marque'
    );
  }
}
