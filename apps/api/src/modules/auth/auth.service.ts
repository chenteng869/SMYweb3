import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma.service';
import { LoginDto } from './dto/login.dto';
import { WalletsService } from '../wallets/wallets.service';
import * as bcrypt from 'bcrypt';
import { ethers } from 'ethers';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private walletsService: WalletsService
  ) {}

  async login(dto: LoginDto, ip: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { username: dto.username },
      include: { role: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'login',
        module: 'auth',
        method: 'POST',
        path: '/api/auth/login',
        ip,
        status: 'success',
        detail: JSON.stringify({ username: user.username }),
      },
    });
    const token = this.jwt.sign({ sub: user.id, username: user.username });
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        roleId: user.roleId,
        roleCode: user.role.code,
        roleName: user.role.name,
        permissions: user.role.permissions,
        lastLoginAt: user.lastLoginAt,
      },
    };
  }

  async profile(userId: number) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      roleId: user.roleId,
      roleCode: user.role.code,
      roleName: user.role.name,
      permissions: user.role.permissions,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async logout(userId: number, ip: string) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'logout',
        module: 'auth',
        method: 'POST',
        path: '/api/auth/logout',
        ip,
        status: 'success',
      },
    });
    return { message: '已退出登录' };
  }

  // --- 新增：钱包签名登录 ---
  async walletLogin(walletAddress: string, nonce: string, signature: string) {
    // 1. 验证签名
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(nonce, signature);
    } catch {
      throw new UnauthorizedException('INVALID_SIGNATURE_FORMAT');
    }
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new UnauthorizedException('SIGNATURE_ADDRESS_MISMATCH');
    }

    // 2. 验证 nonce
    const valid = await this.walletsService.consumeNonce(walletAddress, nonce);
    if (!valid) throw new UnauthorizedException('NONCE_INVALID_OR_EXPIRED');

    // 3. 查找或创建用户（H5 User 模型）
    let user = await this.prisma.user.findFirst({
      where: {
        walletAccounts: {
          some: { walletAddress: walletAddress.toLowerCase(), unlinkedAt: null },
        },
      },
    });

    // 如果用户不存在，创建一个新用户（openId 使用钱包地址）
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          openId: `wallet_${walletAddress.toLowerCase().slice(2, 12)}`,
          name: walletAddress.slice(0, 8) + '...' + walletAddress.slice(-4),
          inviteCode: `INV${Date.now().toString(36).toUpperCase()}`,
        },
      });
      // 自动绑定钱包
      await this.prisma.walletAccount.create({
        data: {
          userId: user.id,
          walletAddress: walletAddress.toLowerCase(),
          chainId: '1',
          walletType: 'metamask',
          role: 'primary',
          isPrimary: true,
        },
      });
    }

    // 4. 签发 JWT
    const token = this.jwt.sign({ sub: user.id, type: 'wallet', wallet: walletAddress });

    return {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          didStatus: 'pending', // 前端跳转到 DID 注册页面
        },
      },
    };
  }
}
