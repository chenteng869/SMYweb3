import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService) {}

  // ===== System Config =====
  async listConfigs(group?: string) {
    const where: any = {};
    if (group) where.group = group;
    return this.prisma.systemConfig.findMany({
      where,
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });
  }

  async updateConfig(id: number, value: string) {
    return this.prisma.systemConfig.update({ where: { id }, data: { value } });
  }

  async createConfig(data: any) {
    return this.prisma.systemConfig.create({ data });
  }

  async deleteConfig(id: number) {
    return this.prisma.systemConfig.delete({ where: { id } });
  }

  // ===== Audit Logs =====
  async listAuditLogs(query: any) {
    const { page = 1, pageSize = 20, userId, action, module, status, startDate, endDate } = query;
    const where: any = {};
    if (userId) where.userId = Number(userId);
    if (action) where.action = action;
    if (module) where.module = module;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, name: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  // ===== Admin Users =====
  async listAdmins(query: any) {
    const { page = 1, pageSize = 20, search, roleId, isActive } = query;
    const where: any = {};
    if (search)
      where.OR = [
        { username: { contains: search } },
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    if (roleId) where.roleId = Number(roleId);
    if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
    const [data, total] = await Promise.all([
      this.prisma.adminUser.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { role: true },
      }),
      this.prisma.adminUser.count({ where }),
    ]);
    // 移除密码
    return {
      data: data.map((d) => ({ ...d, password: undefined })),
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    };
  }

  async createAdmin(data: any) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.adminUser.create({ data: { ...data, password: passwordHash } });
  }

  async updateAdmin(id: number, data: any) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.adminUser.update({ where: { id }, data });
  }

  async deleteAdmin(id: number) {
    return this.prisma.adminUser.delete({ where: { id } });
  }

  // ===== Roles =====
  async listRoles() {
    return this.prisma.adminRole.findMany({ orderBy: { id: 'asc' } });
  }

  async createRole(data: any) {
    if (data.permissions && typeof data.permissions !== 'string')
      data.permissions = JSON.stringify(data.permissions);
    return this.prisma.adminRole.create({ data });
  }

  async updateRole(id: number, data: any) {
    if (data.permissions && typeof data.permissions !== 'string')
      data.permissions = JSON.stringify(data.permissions);
    return this.prisma.adminRole.update({ where: { id }, data });
  }

  async deleteRole(id: number) {
    return this.prisma.adminRole.delete({ where: { id } });
  }
}
