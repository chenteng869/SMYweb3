import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class WalletsService {
  constructor(private prisma: PrismaService) {}

  /** 生成登录/绑定 Nonce */
  async createNonce(walletAddress: string, purpose: string = 'login') {
    const nonce = `WOPC-${purpose}:${randomBytes(16).toString('hex')}`;
    const expiredAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟
    await this.prisma.walletNonce.create({
      data: { walletAddress: walletAddress.toLowerCase(), nonce, purpose, expiredAt },
    });
    return { nonce, expiredAt, walletAddress };
  }

  /** 验证并消费 Nonce */
  async consumeNonce(walletAddress: string, nonce: string, purpose: string = 'login') {
    const record = await this.prisma.walletNonce.findFirst({
      where: { walletAddress: walletAddress.toLowerCase(), nonce, purpose, used: false },
    });
    if (!record) return false;
    if (new Date() > record.expiredAt) {
      await this.prisma.walletNonce.delete({ where: { id: record.id } });
      return false;
    }
    await this.prisma.walletNonce.update({ where: { id: record.id }, data: { used: true } });
    return true;
  }

  /** 绑定钱包 */
  async bindWallet(
    userId: number,
    didId: number,
    data: { walletAddress: string; chainId: string; walletType: string; role: string }
  ) {
    const existing = await this.prisma.walletAccount.findUnique({
      where: {
        walletAddress_chainId: {
          walletAddress: data.walletAddress.toLowerCase(),
          chainId: data.chainId,
        },
      },
    });
    if (existing) throw new BadRequestException('WALLET_ALREADY_BOUND');

    const isPrimary = data.role === 'primary';
    if (isPrimary) {
      await this.prisma.walletAccount.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.walletAccount.create({
      data: {
        userId,
        didId,
        walletAddress: data.walletAddress.toLowerCase(),
        chainId: data.chainId,
        walletType: data.walletType,
        role: data.role,
        isPrimary,
      },
    });
  }

  /** 解绑钱包 */
  async unbindWallet(userId: number, walletAddress: string) {
    const wallet = await this.prisma.walletAccount.findFirst({
      where: { userId, walletAddress: walletAddress.toLowerCase() },
    });
    if (!wallet) throw new NotFoundException('WALLET_NOT_FOUND');
    if (wallet.isPrimary) throw new BadRequestException('CANNOT_UNBIND_PRIMARY_WALLET');
    return this.prisma.walletAccount.update({
      where: { id: wallet.id },
      data: { unlinkedAt: new Date(), riskStatus: 'normal' },
    });
  }

  /** 查询用户钱包列表 */
  async listWallets(userId: number) {
    return this.prisma.walletAccount.findMany({ where: { userId, unlinkedAt: null } });
  }
}
