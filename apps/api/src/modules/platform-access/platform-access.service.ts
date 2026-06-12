import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class PlatformAccessService {
  constructor(private prisma: PrismaService) {}

  async checkAccess(did: string, platform: string) {
    const identity = await this.prisma.didIdentity.findUnique({
      where: { did },
      include: { permissions: true },
    });
    if (!identity) throw new NotFoundException('DID_NOT_FOUND');

    const perm = await this.prisma.platformPermission.findUnique({
      where: { didId_platform: { didId: identity.id, platform } },
    });

    return {
      allowed: identity.status === 'active' && perm?.allowed === true,
      didStatus: identity.status,
      kycStatus: identity.kycStatus,
      riskLevel: identity.riskLevel,
      memberLevel: identity.memberLevel,
      permissionStatus: perm?.permissionStatus || 'pending',
    };
  }

  async grant(didId: number, platform: string, allowed: boolean, updatedBy?: number) {
    const identity = await this.prisma.didIdentity.findUnique({ where: { id: didId } });
    if (!identity) throw new NotFoundException('DID_NOT_FOUND');

    return this.prisma.platformPermission.upsert({
      where: { didId_platform: { didId, platform } },
      update: { allowed, permissionStatus: allowed ? 'approved' : 'denied', updatedBy },
      create: {
        userId: identity.userId,
        didId,
        platform,
        allowed,
        permissionStatus: allowed ? 'approved' : 'pending',
        updatedBy,
      },
    });
  }

  async listByDid(didId: number) {
    return this.prisma.platformPermission.findMany({ where: { didId } });
  }
}
