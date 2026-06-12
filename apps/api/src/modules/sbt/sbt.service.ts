import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class SbtService {
  constructor(private prisma: PrismaService) {}

  async issue(data: {
    userId: number;
    didId: number;
    walletAddress: string;
    credentialType: string;
    credentialLevel?: string;
    issuedBy?: number;
  }) {
    const existing = await this.prisma.sbtCredential.findFirst({
      where: { userId: data.userId, credentialType: data.credentialType, status: 'active' },
    });
    if (existing) throw new BadRequestException('SBT_ALREADY_ISSUED');

    return this.prisma.sbtCredential.create({
      data: {
        userId: data.userId,
        didId: data.didId,
        walletAddress: data.walletAddress.toLowerCase(),
        credentialType: data.credentialType,
        credentialLevel: data.credentialLevel || 'standard',
        status: 'active',
        issuedBy: data.issuedBy,
      },
    });
  }

  async revoke(id: number, reason?: string, revokedBy?: number) {
    const record = await this.prisma.sbtCredential.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('SBT_NOT_FOUND');
    if (record.status !== 'active') throw new BadRequestException('SBT_NOT_ACTIVE');

    return this.prisma.sbtCredential.update({
      where: { id },
      data: { status: 'revoked', revokedBy, revokedAt: new Date(), revokeReason: reason },
    });
  }

  async list(query: { userId?: number; didId?: number; credentialType?: string; status?: string }) {
    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.didId) where.didId = query.didId;
    if (query.credentialType) where.credentialType = query.credentialType;
    if (query.status) where.status = query.status;

    return this.prisma.sbtCredential.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async types() {
    return [
      { type: 'KYC_VERIFIED', name: 'KYC验证凭证', level: 'standard' },
      { type: 'MEMBER', name: '会员凭证', level: 'standard' },
      { type: 'VIP', name: 'VIP凭证', level: 'gold' },
      { type: 'MERCHANT', name: '商户凭证', level: 'standard' },
      { type: 'AML_CLEARED', name: 'AML清算凭证', level: 'standard' },
      { type: 'RESPONSIBLE_GAMING_OK', name: '负责任博彩凭证', level: 'standard' },
      { type: 'EXCHANGE_ALLOWED', name: '交易所许可凭证', level: 'standard' },
      { type: 'ECOSYSTEM_USER', name: '生态系统用户凭证', level: 'standard' },
    ];
  }
}
