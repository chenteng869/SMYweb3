import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('未登录');

    const perms: string[] = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || []);
    if (perms.includes('*')) return true;
    for (const p of required) {
      if (perms.includes(p)) return true;
      if (perms.includes(`${p.split(':')[0]}:*`)) return true;
      if (perms.includes('*:read') && p.endsWith(':read')) return true;
      if (perms.includes('*:write') && p.endsWith(':write')) return true;
    }
    throw new ForbiddenException(`权限不足: ${required.join(', ')}`);
  }
}
