import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
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
}
