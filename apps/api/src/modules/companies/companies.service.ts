import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async list(query: any) {
    const { page = 1, pageSize = 20, search, type, status, userId } = query;
    const where: any = {};
    if (search)
      where.OR = [{ name: { contains: search } }, { registrationNumber: { contains: search } }];
    if (type) where.type = type;
    if (status) where.status = status;
    if (userId) where.userId = Number(userId);
    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          _count: {
            select: { directors: true, shareholders: true, documents: true, bankAccounts: true },
          },
        },
      }),
      this.prisma.company.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async detail(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        user: true,
        directors: true,
        shareholders: true,
        documents: true,
        bankAccounts: true,
        orders: true,
      },
    });
    if (!company) throw new Error('公司不存在');
    return company;
  }

  async create(data: any) {
    const { directors, shareholders, documents, ...rest } = data;
    return this.prisma.company.create({
      data: {
        ...rest,
        directors: directors ? { create: directors } : undefined,
        shareholders: shareholders ? { create: shareholders } : undefined,
        documents: documents ? { create: documents } : undefined,
      } as any,
      include: { directors: true, shareholders: true, documents: true },
    });
  }

  async update(id: number, data: any) {
    return this.prisma.company.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.company.delete({ where: { id } });
  }

  async stats() {
    const [total, active, pending, byType] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.count({ where: { status: 'active' } }),
      this.prisma.company.count({ where: { status: 'pending' } }),
      this.prisma.company.groupBy({ by: ['type'], _count: { _all: true } }),
    ]);
    return {
      total,
      active,
      pending,
      byType: byType.reduce((acc: any, x: any) => ({ ...acc, [x.type]: x._count._all }), {}),
    };
  }
}
