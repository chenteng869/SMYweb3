import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list(query: any) {
    const { page = 1, pageSize = 20, search, kycStatus, dlcLevel, isActive } = query;
    const { skip, take } = { skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize) };
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (kycStatus) where.kycStatus = kycStatus;
    if (dlcLevel) where.dlcLevel = Number(dlcLevel);
    if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async detail(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        companies: true,
        bankAccounts: true,
        _count: { select: { orders: true, dvcTransactions: true, mediaPosts: true, contracts: true } },
      },
    });
    if (!user) throw new Error('用户不存在');
    return user;
  }

  async update(id: number, data: any) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async updateStatus(id: number, isActive: boolean, reason?: string) {
    return this.prisma.user.update({ where: { id }, data: { isActive, bannedReason: isActive ? null : reason } });
  }

  async updateKyc(id: number, kycStatus: string) {
    return this.prisma.user.update({
      where: { id },
      data: { kycStatus, kycVerifiedAt: kycStatus === 'verified' ? new Date() : null },
    });
  }

  async updateLevel(id: number, dlcLevel: number) {
    return this.prisma.user.update({ where: { id }, data: { dlcLevel } });
  }

  async stats() {
    const [total, verified, pending, active] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { kycStatus: 'verified' } }),
      this.prisma.user.count({ where: { kycStatus: 'pending' } }),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);
    return { total, verified, pending, active };
  }

  // ====== 1. Dashboard Statistics ======
  async getDashboardStats() {
    const [total, verified, pending, active, todayNew, thisMonthNew, kycCompleted] = await Promise.all([
      this.prisma.adminUser.count(),
      this.prisma.adminUser.count({ where: { isActive: true } }),
      this.prisma.adminUser.count({ where: { isActive: false } }),
      this.prisma.adminUser.count({ where: { isActive: true } }),
      this.prisma.adminUser.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      this.prisma.adminUser.count({ where: { createdAt: { gte: new Date(new Date().setDate(1)) } } }),
      this.prisma.adminUser.count({ where: { isActive: true } }),
    ]);
    return { total, verified, pending, active, todayNew, thisMonthNew, kycCompletedRate: total > 0 ? Math.round((kycCompleted / total) * 100) : 0 };
  }

  // ====== 2. Role Management (CRUD) ======
  async getRoles(query?: { isActive?: string }) {
    const where: any = {};
    if (query?.isActive !== undefined && query.isActive !== '') where.isActive = query.isActive === 'true';
    const data = await this.prisma.role.findMany({ where, orderBy: { sortOrder: 'asc' } });
    return data.map(r => ({ ...r, permissions: JSON.parse(r.permissions || '[]') }));
  }
  async getRole(id: number) {
    const r = await this.prisma.role.findUniqueOrThrow({ where: { id } });
    const perms = r.permissions ? JSON.parse(r.permissions) : [];
    return { ...r, permissions: perms };
  }
  async createRole(dto: any) {
    return this.prisma.role.create({
      data: { ...dto, permissions: JSON.stringify(dto.permissions || []) }
    });
  }
  async updateRole(id: number, dto: any) {
    if (dto.permissions) dto.permissions = JSON.stringify(dto.permissions);
    return this.prisma.role.update({ where: { id }, data: dto });
  }
  async deleteRole(id: number) {
    const role = await this.prisma.role.findUniqueOrThrow({ where: { id } });
    if (role.isSystem) throw new Error('系统内置角色不可删除');
    await this.prisma.userRole.deleteMany({ where: { roleId: id } });
    return this.prisma.role.delete({ where: { id } });
  }
  async assignUserRole(userId: number, roleIds: number[]) {
    await this.prisma.userRole.deleteMany({ where: { userId } });
    if (roleIds.length > 0) {
      await this.prisma.userRole.createMany({
        data: roleIds.map(roleId => ({ userId, roleId }))
      });
    }
    return { success: true };
  }
  async getUserRoles(userId: number) {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
      orderBy: { assignedAt: 'desc' }
    });
    return roles.map(ur => ur.role);
  }

  // ====== 3. Risk Assessment (AML/CFT) ======
  async getRiskAssessments(query?: { riskLevel?: string; page?: number; pageSize?: number }) {
    const where: any = {};
    if (query?.riskLevel) where.riskLevel = query.riskLevel;
    const page = Number(query?.page || 1);
    const pageSize = Number(query?.pageSize || 20);
    const [data, total] = await Promise.all([
      this.prisma.userRiskAssessment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { overallScore: 'desc' }
      }),
      this.prisma.userRiskAssessment.count({ where })
    ]);
    return { data: data.map(d => ({
      ...d,
      boInfo: d.boInfo ? JSON.parse(d.boInfo) : null,
      sofDocuments: d.sofDocuments ? JSON.parse(d.sofDocuments) : null,
      pepDetails: d.pepDetails ? JSON.parse(d.pepDetails) : null,
    })), total, page, pageSize };
  }
  async getRiskAssessment(userId: number) {
    let ra = await this.prisma.userRiskAssessment.findUnique({ where: { userId } });
    if (!ra) {
      ra = await this.prisma.userRiskAssessment.create({ data: { userId } });
    }
    return { ...ra, boInfo: ra.boInfo ? JSON.parse(ra.boInfo || '[]') : [], sofDocuments: ra.sofDocuments ? JSON.parse(ra.sofDocuments || '[]') : [] };
  }
  async updateRiskAssessment(userId: number, dto: any) {
    const updateData: any = { ...dto };
    if (dto.boInfo) updateData.boInfo = JSON.stringify(dto.boInfo);
    if (dto.sofDocuments) updateData.sofDocuments = JSON.stringify(dto.sofDocuments);
    if (dto.pepDetails) updateData.pepDetails = JSON.stringify(dto.pepDetails);
    // Auto-calculate risk level from score
    if (updateData.overallScore !== undefined) {
      const score = updateData.overallScore;
      updateData.riskLevel = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
      updateData.lastAssessedAt = new Date();
    }
    return this.prisma.userRiskAssessment.upsert({
      where: { userId },
      create: { userId, ...updateData },
      update: updateData
    });
  }
  async getRiskStats() {
    const [total, low, medium, high, critical, sanctions, peps] = await Promise.all(
      ['low', 'medium', 'high', 'critical'].map(level =>
        this.prisma.userRiskAssessment.count({ where: { riskLevel: level } })
      )
    );
    const [sanctionsCount, pepCount] = await Promise.all([
      this.prisma.userRiskAssessment.count({ where: { sanctionsHit: true } }),
      this.prisma.userRiskAssessment.count({ where: { pepFlag: true } }),
    ]);
    return { total: total + low + medium + high + critical, low, medium, high, critical, sanctions: sanctionsCount, peps: pepCount };
  }

  // ====== 4. Audit Log (Read-only, auto-created) ======
  async getAuditLogs(query?: { userId?: string; action?: string; targetType?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) {
    const where: any = {};
    if (query?.userId) where.userId = Number(query.userId);
    if (query?.action) where.action = { contains: query.action };
    if (query?.targetType) where.targetType = query.targetType;
    if (query?.startDate) where.createdAt = { ...(where.createdAt || {}), gte: new Date(query.startDate) };
    if (query?.endDate) where.createdAt = { ...(where.createdAt || {}), lte: new Date(query.endDate + 'T23:59:59') };
    const page = Number(query?.page || 1);
    const pageSize = Number(query?.pageSize || 30);
    const [data, total] = await Promise.all([
      this.prisma.auditLogEnhanced.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.auditLogEnhanced.count({ where })
    ]);
    return { data, total, page, pageSize };
  }
  async getAuditLogStats() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const [todayCount, weekCount, totalCount, uniqueUsers, topActions] = await Promise.all([
      this.prisma.auditLogEnhanced.count({ where: { createdAt: { gte: today } } }),
      this.prisma.auditLogEnhanced.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.auditLogEnhanced.count(),
      // @ts-ignore Prisma groupBy circular type reference (known issue)
      this.prisma.auditLogEnhanced.groupBy({ by: ['userId'], _count: true, take: 10, orderBy: { _count: { sort: 'desc' } } }).then((r: any) => r.length),
      // @ts-ignore Prisma groupBy circular type reference (known issue)
      this.prisma.auditLogEnhanced.groupBy({ by: ['action'], _count: true, take: 10, orderBy: { _count: { sort: 'desc' } } }),
    ]);
    return { todayCount, weekCount, totalCount, uniqueUsers, topActions: topActions.slice(0, 10) };
  }
  // Helper: create audit log entry (called by other methods)
  async createAuditLog(entry: { userId?: number; action: string; targetId?: number; targetType?: string; description?: string; ipAddress?: string; userAgent?: string }) {
    return this.prisma.auditLogEnhanced.create({
      data: {
        userId: entry.userId || null,
        action: entry.action,
        targetId: entry.targetId || null,
        targetType: entry.targetType || null,
        description: entry.description || null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
      }
    });
  }

  // ====== 5. Session Management ======
  async getUserSessions(userId: number) {
    return this.prisma.userSession.findMany({
      where: { userId },
      orderBy: { lastActivityAt: 'desc' }
    });
  }
  async getAllActiveSessions(query?: { page?: number; pageSize?: number }) {
    const where = { isActive: true, expiresAt: { gt: new Date() } };
    const page = Number(query?.page || 1);
    const pageSize = Number(query?.pageSize || 20);
    const [data, total] = await Promise.all([
      this.prisma.userSession.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { lastActivityAt: 'desc' } }),
      this.prisma.userSession.count({ where })
    ]);
    return { data, total, page, pageSize };
  }
  async terminateSession(sessionId: string, reason: string = 'force_logout') {
    return this.prisma.userSession.update({
      where: { sessionId },
      data: { isActive: false, terminatedAt: new Date(), terminateReason: reason }
    });
  }
  async terminateAllUserSessions(userId: number, exceptSessionId?: string) {
    const where: any = { userId, isActive: true };
    if (exceptSessionId) where.sessionId = { not: exceptSessionId };
    return this.prisma.userSession.updateMany({
      where,
      data: { isActive: false, terminatedAt: new Date(), terminateReason: 'force_logout_all' }
    });
  }
  async getSessionStats() {
    const [active, todayCreated, totalTerminated] = await Promise.all([
      this.prisma.userSession.count({ where: { isActive: true, expiresAt: { gt: new Date() } } }),
      this.prisma.userSession.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      this.prisma.userSession.count({ where: { isActive: false, terminatedAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } }),
    ]);
    return { active, todayCreated, weekTerminated: totalTerminated };
  }

  // ====== 6. Login History ======
  async getLoginHistories(userId: number, query?: { page?: number; pageSize?: number }) {
    const page = Number(query?.page || 1);
    const pageSize = Number(query?.pageSize || 20);
    const [data, total] = await Promise.all([
      this.prisma.loginHistory.findMany({
        where: { userId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.loginHistory.count({ where: { userId } })
    ]);
    return { data, total, page, pageSize };
  }
}
