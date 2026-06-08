import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class DlcService {
  constructor(private prisma: PrismaService) {}

  // Levels
  async listLevels() {
    return this.prisma.dlcLevel.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async updateLevel(id: number, data: any) {
    if (data.benefits && typeof data.benefits !== 'string') data.benefits = JSON.stringify(data.benefits);
    return this.prisma.dlcLevel.update({ where: { id }, data });
  }

  async createLevel(data: any) {
    if (data.benefits && typeof data.benefits !== 'string') data.benefits = JSON.stringify(data.benefits);
    return this.prisma.dlcLevel.create({ data });
  }

  // DVC Transactions
  async listTransactions(query: any) {
    const { page = 1, pageSize = 20, type, userId, status } = query;
    const where: any = {};
    if (type) where.type = type;
    if (userId) where.userId = Number(userId);
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.dvcTransaction.findMany({ where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize), orderBy: { createdAt: 'desc' }, include: { user: true } }),
      this.prisma.dvcTransaction.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async createTransaction(data: any) {
    return this.prisma.dvcTransaction.create({ data });
  }

  async stats() {
    const [totalCirculation, byLevel, byType] = await Promise.all([
      this.prisma.user.aggregate({ _sum: { dvcBalance: true } }),
      this.prisma.user.groupBy({ by: ['dlcLevel'], _count: { _all: true } }),
      this.prisma.dvcTransaction.groupBy({ by: ['type'], _sum: { amount: true } }),
    ]);
    return {
      totalCirculation: totalCirculation._sum.dvcBalance || 0,
      byLevel: byLevel.reduce((a: any, x: any) => ({ ...a, [x.dlcLevel]: x._count._all }), {}),
      byType: byType.reduce((a: any, x: any) => ({ ...a, [x.type]: x._sum.amount || 0 }), {}),
    };
  }
}
