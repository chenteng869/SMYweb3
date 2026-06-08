import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class BanksService {
  constructor(private prisma: PrismaService) {}

  async list(query: any) {
    const { page = 1, pageSize = 20, search, status, userId, currency } = query;
    const where: any = {};
    if (search) where.OR = [{ bankName: { contains: search } }, { accountName: { contains: search } }];
    if (status) where.status = status;
    if (currency) where.currency = currency;
    if (userId) where.userId = Number(userId);
    const [data, total] = await Promise.all([
      this.prisma.bankAccount.findMany({ where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize), orderBy: { createdAt: 'desc' }, include: { user: true, company: true } }),
      this.prisma.bankAccount.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async detail(id: number) {
    const bank = await this.prisma.bankAccount.findUnique({ where: { id }, include: { user: true, company: true } });
    if (!bank) throw new Error('银行账户不存在');
    return bank;
  }

  async create(data: any) {
    return this.prisma.bankAccount.create({ data });
  }

  async update(id: number, data: any) {
    return this.prisma.bankAccount.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.bankAccount.delete({ where: { id } });
  }

  async stats() {
    const [total, active, pending, byCurrency] = await Promise.all([
      this.prisma.bankAccount.count(),
      this.prisma.bankAccount.count({ where: { status: 'active' } }),
      this.prisma.bankAccount.count({ where: { status: 'pending' } }),
      this.prisma.bankAccount.groupBy({ by: ['currency'], _count: { _all: true } }),
    ]);
    return { total, active, pending, byCurrency: byCurrency.reduce((a: any, x: any) => ({ ...a, [x.currency]: x._count._all }), {}) };
  }
}
