import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class KycService {
  constructor(private prisma: PrismaService) {}

  async submit(
    userId: number,
    data: {
      didId: number;
      fullName: string;
      documentType: string;
      documentNo: string;
      country: string;
    }
  ) {
    const hash = crypto
      .createHash('sha256')
      .update(`${data.documentNo}:${Date.now()}`)
      .digest('hex');
    const record = await this.prisma.kycRecord.create({
      data: {
        userId,
        didId: data.didId,
        kycStatus: 'pending',
        fullNameEncrypted: data.fullName,
        documentType: data.documentType,
        documentNoEncrypted: data.documentNo,
        country: data.country,
        resultHash: hash,
      },
    });
    // 更新 DID kyc_status
    await this.prisma.didIdentity.update({
      where: { id: data.didId },
      data: { kycStatus: 'pending' },
    });
    return record;
  }

  async approve(recordId: number, reviewerId: number) {
    const record = await this.prisma.kycRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new NotFoundException('KYC_RECORD_NOT_FOUND');
    await this.prisma.kycRecord.update({
      where: { id: recordId },
      data: { kycStatus: 'approved', reviewedBy: reviewerId, reviewedAt: new Date() },
    });
    // 激活 DID + 标记 kyc 通过
    if (record.didId) {
      await this.prisma.didIdentity.update({
        where: { id: record.didId },
        data: { kycStatus: 'verified', status: 'active', activatedAt: new Date() },
      });
    }
    return { success: true, status: 'approved' };
  }

  async reject(recordId: number, reviewerId: number, reason: string) {
    const record = await this.prisma.kycRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new NotFoundException('KYC_RECORD_NOT_FOUND');
    await this.prisma.kycRecord.update({
      where: { id: recordId },
      data: {
        kycStatus: 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });
    if (record.didId) {
      await this.prisma.didIdentity.update({
        where: { id: record.didId },
        data: { kycStatus: 'rejected' },
      });
    }
    return { success: true, status: 'rejected' };
  }

  async status(userId: number) {
    const record = await this.prisma.kycRecord.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return { kycStatus: 'unverified' };
    return {
      kycStatus: record.kycStatus,
      provider: record.provider,
      submittedAt: record.createdAt,
    };
  }

  async queue(query: any) {
    const { page = 1, pageSize = 20, status } = query;
    const where: any = {};
    if (status) where.kycStatus = status;
    const [data, total] = await Promise.all([
      this.prisma.kycRecord.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.kycRecord.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }
}
