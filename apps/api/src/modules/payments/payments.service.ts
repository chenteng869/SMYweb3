import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // ===== Channels =====
  async channels() {
    return this.prisma.paymentChannel.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async channelDetail(id: number) {
    return this.prisma.paymentChannel.findUnique({ where: { id } });
  }

  async createChannel(data: any) {
    return this.prisma.paymentChannel.create({ data });
  }

  async updateChannel(id: number, data: any) {
    return this.prisma.paymentChannel.update({ where: { id }, data });
  }

  async deleteChannel(id: number) {
    return this.prisma.paymentChannel.delete({ where: { id } });
  }

  // ===== Transactions =====
  async listTransactions(query: any) {
    const { page = 1, pageSize = 20, status, type, channelId, search } = query;
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (channelId) where.channelId = Number(channelId);
    if (search) {
      where.OR = [
        { reference: { contains: search } },
        { counterparty: { contains: search } },
        { description: { contains: search } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { channel: true, user: true },
      }),
      this.prisma.paymentTransaction.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async createTransaction(data: any) {
    const ref =
      data.reference || `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    return this.prisma.paymentTransaction.create({
      data: { ...data, reference: ref, netAmount: data.amount - (data.fee || 0) },
    });
  }

  async updateTransaction(id: number, data: any) {
    return this.prisma.paymentTransaction.update({ where: { id }, data });
  }

  // ===== Exchange Rates =====
  async rates() {
    return this.prisma.exchangeRate.findMany({ orderBy: [{ from: 'asc' }, { to: 'asc' }] });
  }

  async updateRate(id: number, rate: number) {
    return this.prisma.exchangeRate.update({
      where: { id },
      data: { rate, timestamp: new Date() },
    });
  }

  async createRate(data: any) {
    return this.prisma.exchangeRate.upsert({
      where: { from_to: { from: data.from, to: data.to } },
      update: { rate: data.rate, timestamp: new Date() },
      create: { ...data, change24h: 0, source: 'manual' },
    });
  }

  // ===== Stats =====
  async stats() {
    const [channelCount, txCount, totalIncoming, totalOutgoing, totalRevenue] = await Promise.all([
      this.prisma.paymentChannel.count({ where: { isActive: true } }),
      this.prisma.paymentTransaction.count(),
      this.prisma.paymentTransaction.aggregate({
        where: { type: 'incoming', status: 'completed' },
        _sum: { amount: true },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: { type: 'outgoing', status: 'completed' },
        _sum: { amount: true },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: { type: 'incoming', status: 'completed' },
        _sum: { fee: true },
      }),
    ]);
    return {
      channelCount,
      txCount,
      totalIncoming: totalIncoming._sum.amount || 0,
      totalOutgoing: totalOutgoing._sum.amount || 0,
      totalRevenue: totalRevenue._sum.fee || 0,
    };
  }
}
