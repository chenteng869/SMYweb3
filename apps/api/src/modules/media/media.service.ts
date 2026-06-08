import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  async list(query: any) {
    const { page = 1, pageSize = 20, platform, status, search } = query;
    const where: any = {};
    if (platform) where.platform = platform;
    if (status) where.status = status;
    if (search) where.OR = [{ title: { contains: search } }, { content: { contains: search } }];
    const [data, total] = await Promise.all([
      this.prisma.mediaPost.findMany({ where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize), orderBy: { createdAt: 'desc' }, include: { user: true } }),
      this.prisma.mediaPost.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async detail(id: number) {
    return this.prisma.mediaPost.findUnique({ where: { id }, include: { user: true } });
  }

  async create(data: any) {
    if (data.imageUrls && typeof data.imageUrls !== 'string') data.imageUrls = JSON.stringify(data.imageUrls);
    return this.prisma.mediaPost.create({ data });
  }

  async update(id: number, data: any) {
    return this.prisma.mediaPost.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.mediaPost.delete({ where: { id } });
  }

  async stats() {
    const [total, published, draft, scheduled, platformStats] = await Promise.all([
      this.prisma.mediaPost.count(),
      this.prisma.mediaPost.count({ where: { status: 'published' } }),
      this.prisma.mediaPost.count({ where: { status: 'draft' } }),
      this.prisma.mediaPost.count({ where: { status: 'scheduled' } }),
      this.prisma.mediaPost.groupBy({ by: ['platform'], _count: { _all: true }, _sum: { impressions: true, likes: true } }),
    ]);
    return { total, published, draft, scheduled, byPlatform: platformStats };
  }
}
