import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async list(query: any) {
    const { page = 1, pageSize = 20, status, type, search, assignedTo, userId } = query;
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (assignedTo) where.assignedTo = assignedTo;
    if (userId) where.userId = Number(userId);
    if (search) where.OR = [{ orderNo: { contains: search } }, { title: { contains: search } }];
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { user: true, company: true },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async detail(id: number) {
    return this.prisma.order.findUnique({ where: { id }, include: { user: true, company: true } });
  }

  async create(data: any) {
    if (!data.orderNo)
      data.orderNo = `WO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    if (data.attachments && typeof data.attachments !== 'string')
      data.attachments = JSON.stringify(data.attachments);
    return this.prisma.order.create({ data });
  }

  async update(id: number, data: any) {
    return this.prisma.order.update({ where: { id }, data });
  }

  async updateStatus(id: number, status: string, progress?: number, notes?: string) {
    return this.prisma.order.update({
      where: { id },
      data: {
        status,
        progress: progress !== undefined ? progress : undefined,
        notes: notes !== undefined ? notes : undefined,
        completedAt: status === 'completed' ? new Date() : undefined,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.order.delete({ where: { id } });
  }

  async stats() {
    const [total, newCount, processing, completed, byType, totalRevenue] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'new' } }),
      this.prisma.order.count({ where: { status: 'processing' } }),
      this.prisma.order.count({ where: { status: 'completed' } }),
      this.prisma.order.groupBy({ by: ['type'], _count: { _all: true } }),
      this.prisma.order.aggregate({ where: { status: 'completed' }, _sum: { amount: true } }),
    ]);
    return {
      total,
      newCount,
      processing,
      completed,
      totalRevenue: totalRevenue._sum.amount || 0,
      byType: byType.reduce((a: any, x: any) => ({ ...a, [x.type]: x._count._all }), {}),
    };
  }
}
