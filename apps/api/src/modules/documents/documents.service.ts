import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async list(query: any) {
    const { page = 1, pageSize = 20, type, category, status, search, userId } = query;
    const where: any = {};
    if (type) where.type = type;
    if (category) where.category = category;
    if (status) where.status = status;
    if (userId) where.userId = Number(userId);
    if (search) where.OR = [{ name: { contains: search } }];
    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      }),
      this.prisma.document.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async detail(id: number) {
    return this.prisma.document.findUnique({ where: { id }, include: { user: true } });
  }

  async create(data: any) {
    return this.prisma.document.create({ data });
  }

  async update(id: number, data: any) {
    return this.prisma.document.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.document.delete({ where: { id } });
  }

  async stats() {
    const [total, expired, expiringSoon, byCategory] = await Promise.all([
      this.prisma.document.count(),
      this.prisma.document.count({ where: { status: 'expired' } }),
      this.prisma.document.count({
        where: {
          expiryDate: { lte: new Date(Date.now() + 30 * 24 * 3600 * 1000) },
          status: { not: 'expired' },
        },
      }),
      this.prisma.document.groupBy({ by: ['category'], _count: { _all: true } }),
    ]);
    return {
      total,
      expired,
      expiringSoon,
      byCategory: byCategory.reduce(
        (a: any, x: any) => ({ ...a, [x.category]: x._count._all }),
        {}
      ),
    };
  }
}
