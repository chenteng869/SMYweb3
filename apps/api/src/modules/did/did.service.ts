import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class DidService {
  constructor(private prisma: PrismaService) {}

  /** 生成 DID */
  private async generateDid(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await this.prisma.didIdentity.findFirst({
      orderBy: { id: 'desc' },
      select: { did: true },
    });
    let seq = 1;
    if (last) {
      const match = last.did.match(/U(\d{10})$/);
      if (match) seq = parseInt(match[1].slice(4)) + 1; // 年份后6位
    }
    return `did:zsdt:U${year}${String(seq).padStart(6, '0')}`;
  }

  /** 注册 DID */
  async register(userId: number, primaryWallet?: string) {
    const existing = await this.prisma.didIdentity.findUnique({ where: { userId } });
    if (existing) throw new BadRequestException('DID_ALREADY_EXISTS');

    const did = await this.generateDid();
    return this.prisma.didIdentity.create({
      data: { userId, did, status: 'created', primaryWallet },
    });
  }

  /** DID 列表（管理后台） */
  async list(query: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
    kycStatus?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.kycStatus) where.kycStatus = query.kycStatus;
    if (query.search) {
      where.OR = [
        { did: { contains: query.search } },
        { user: { name: { contains: query.search } } },
        { primaryWallet: { contains: query.search } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.didIdentity.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, avatar: true, email: true } },
          wallets: { where: { isPrimary: true }, take: 1 },
          _count: { select: { credentials: true, kycRecords: true } },
        },
      }),
      this.prisma.didIdentity.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  /** DID 详情 */
  async detail(id: number) {
    const record = await this.prisma.didIdentity.findUnique({
      where: { id },
      include: {
        user: true,
        wallets: true,
        kycRecords: { orderBy: { createdAt: 'desc' }, take: 5 },
        credentials: { orderBy: { issuedAt: 'desc' }, take: 10 },
        permissions: true,
      },
    });
    if (!record) throw new NotFoundException('DID_NOT_FOUND');
    return record;
  }

  /** DID 统计 */
  async stats() {
    const [total, byStatus, byKyc] = await Promise.all([
      this.prisma.didIdentity.count(),
      this.prisma.didIdentity.groupBy({ by: ['status'], _count: true }),
      this.prisma.didIdentity.groupBy({ by: ['kycStatus'], _count: true }),
    ]);
    const statusMap: Record<string, number> = {};
    const kycMap: Record<string, number> = {};
    byStatus.forEach((s) => {
      statusMap[s.status] = s._count;
    });
    byKyc.forEach((s) => {
      kycMap[s.kycStatus] = s._count;
    });
    return { total, byStatus: statusMap, byKyc: kycMap };
  }

  /** 冻结 DID */
  async freeze(id: number, reason?: string) {
    const record = await this.prisma.didIdentity.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('DID_NOT_FOUND');
    if (['frozen', 'revoked', 'deactivated'].includes(record.status)) {
      throw new BadRequestException(`DID_ALREADY_${record.status.toUpperCase()}`);
    }
    return this.prisma.didIdentity.update({
      where: { id },
      data: { status: 'frozen', frozenAt: new Date() },
    });
  }

  /** 解冻 DID */
  async unfreeze(id: number) {
    const record = await this.prisma.didIdentity.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('DID_NOT_FOUND');
    if (record.status !== 'frozen') throw new BadRequestException('DID_NOT_FROZEN');
    return this.prisma.didIdentity.update({
      where: { id },
      data: { status: 'verified', frozenAt: null },
    });
  }

  /** 吊销 DID */
  async revoke(id: number, reason?: string) {
    const record = await this.prisma.didIdentity.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('DID_NOT_FOUND');
    if (['revoked', 'deactivated'].includes(record.status)) {
      throw new BadRequestException(`DID_ALREADY_${record.status.toUpperCase()}`);
    }
    return this.prisma.didIdentity.update({
      where: { id },
      data: { status: 'revoked', revokedAt: new Date() },
    });
  }

  /** 按 DID 字符串查询 */
  async findByDid(did: string) {
    return this.prisma.didIdentity.findUnique({
      where: { did },
      include: { user: true, wallets: true, permissions: true },
    });
  }
}
