import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class DvsfService {
  constructor(private prisma: PrismaService) {}

  async listPools() {
    return this.prisma.dvsfPool.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createPool(data: any) {
    return this.prisma.dvsfPool.create({ data });
  }

  async updatePool(id: number, data: any) {
    return this.prisma.dvsfPool.update({ where: { id }, data });
  }

  async poolDetail(id: number) {
    return this.prisma.dvsfPool.findUnique({
      where: { id },
      include: { records: { take: 50, orderBy: { createdAt: 'desc' } } },
    });
  }

  async listRecords(query: any) {
    const { page = 1, pageSize = 20, poolId, status, userId } = query;
    const where: any = {};
    if (poolId) where.poolId = Number(poolId);
    if (status) where.status = status;
    if (userId) where.userId = Number(userId);
    const [data, total] = await Promise.all([
      this.prisma.dvsfRecord.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { pool: true },
      }),
      this.prisma.dvsfRecord.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async createRecord(data: any) {
    return this.prisma.dvsfRecord.create({ data });
  }

  async stats() {
    const [pools, totalPool, totalDistributed, pendingRecords] = await Promise.all([
      this.prisma.dvsfPool.findMany(),
      this.prisma.dvsfPool.aggregate({ _sum: { totalAmount: true } }),
      this.prisma.dvsfPool.aggregate({ _sum: { distributed: true } }),
      this.prisma.dvsfRecord.count({ where: { status: 'pending' } }),
    ]);
    return {
      poolCount: pools.length,
      totalPool: totalPool._sum.totalAmount || 0,
      totalDistributed: totalDistributed._sum.distributed || 0,
      pendingRecords,
    };
  }
}
