import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class VideosService {
  constructor(private prisma: PrismaService) {}

  async list(query: any) {
    const { page = 1, pageSize = 20, search, category, status } = query;
    const where: any = {};
    if (search) where.OR = [{ title: { contains: search } }, { description: { contains: search } }];
    if (category) where.category = category;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.video.findMany({ where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize), orderBy: { publishedAt: 'desc' } }),
      this.prisma.video.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async detail(id: number) {
    const video = await this.prisma.video.findUnique({ where: { id }, include: { comments: { take: 20, orderBy: { createdAt: 'desc' } } } });
    if (!video) throw new Error('视频不存在');
    return video;
  }

  async create(data: any) {
    if (data.tags && typeof data.tags !== 'string') data.tags = JSON.stringify(data.tags);
    return this.prisma.video.create({ data });
  }

  async update(id: number, data: any) {
    return this.prisma.video.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.video.delete({ where: { id } });
  }

  async listComments(videoId: number) {
    return this.prisma.videoComment.findMany({ where: { videoId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async stats() {
    const [total, totalViews, totalLikes, featured] = await Promise.all([
      this.prisma.video.count(),
      this.prisma.video.aggregate({ _sum: { views: true } }),
      this.prisma.video.aggregate({ _sum: { likes: true } }),
      this.prisma.video.count({ where: { isFeatured: true } }),
    ]);
    return { total, totalViews: totalViews._sum.views || 0, totalLikes: totalLikes._sum.likes || 0, featured };
  }
}
