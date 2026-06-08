import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET') || 'wopc-super-secret-key-2026',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('账号已停用或不存在');
    }
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      roleCode: user.role.code,
      roleName: user.role.name,
      permissions: user.role.permissions,
    };
  }
}
