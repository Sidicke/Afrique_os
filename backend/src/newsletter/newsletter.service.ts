import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(slug: string, email: string) {
    const boutique = await this.prisma.boutique.findFirst({
      where: { slug, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!boutique) throw new NotFoundException('Boutique introuvable');

    const normalized = email.toLowerCase().trim();
    await this.prisma.subscriber.upsert({
      where: { boutiqueId_email: { boutiqueId: boutique.id, email: normalized } },
      create: { boutiqueId: boutique.id, email: normalized },
      update: {},
    });
    return { subscribed: true };
  }

  async unsubscribe(slug: string, email: string) {
    const boutique = await this.prisma.boutique.findFirst({
      where: { slug, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!boutique) throw new NotFoundException('Boutique introuvable');
    await this.prisma.subscriber.deleteMany({
      where: { boutiqueId: boutique.id, email: email.toLowerCase().trim() },
    });
    return { unsubscribed: true };
  }
}
