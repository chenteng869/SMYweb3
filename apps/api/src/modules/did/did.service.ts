import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class DidService {
  constructor(private prisma: PrismaService) {}

  async list(query: any) {
    const { page = 1, pageSize = 20, status, search } = query;
    const where: any = {};
    if (status) where.status = status;
    if (search) where.OR = [{ did: { contains: search } }];
    const [data, total] = await Promise.all([
      this.prisma.didIdentity.findMany({ where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize), orderBy: { createdAt: 'desc' }, include: { user: true } }),
      this.prisma.didIdentity.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async detail(id: number) {
    return this.prisma.didIdentity.findUnique({ where: { id }, include: { user: true } });
  }

  async issue(userId: number, blockchain: string = 'wopc-chain') {
    const existing = await this.prisma.didIdentity.findUnique({ where: { userId } });
    if (existing) return existing;
    const didId = `did:wopc:${crypto.randomBytes(16).toString('hex')}`;
    const publicKey = crypto.randomBytes(32).toString('hex');
    return this.prisma.didIdentity.create({
      data: { userId, did: didId, publicKey, blockchain, status: 'active', expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000) },
    });
  }

  async revoke(id: number) {
    return this.prisma.didIdentity.update({ where: { id }, data: { status: 'revoked' } });
  }

  async stats() {
    const [total, active, revoked] = await Promise.all([
      this.prisma.didIdentity.count(),
      this.prisma.didIdentity.count({ where: { status: 'active' } }),
      this.prisma.didIdentity.count({ where: { status: 'revoked' } }),
    ]);
    return { total, active, revoked };
  }
}
