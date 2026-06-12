import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class RegistrationService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // 国内注册 - 方案 (DomesticRegistrationPlan)
  // ============================================================

  async getDomesticPlans() {
    return this.prisma.domesticRegistrationPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getDomesticPlan(id: number) {
    const plan = await this.prisma.domesticRegistrationPlan.findUnique({ where: { id } });
    if (!plan) throw new HttpException('方案不存在', HttpStatus.NOT_FOUND);
    return plan;
  }

  async createDomesticPlan(data: any) {
    return this.prisma.domesticRegistrationPlan.create({ data });
  }

  async updateDomesticPlan(id: number, data: any) {
    await this.getDomesticPlan(id);
    return this.prisma.domesticRegistrationPlan.update({ where: { id }, data });
  }

  async deleteDomesticPlan(id: number) {
    await this.getDomesticPlan(id);
    const count = await this.prisma.domesticRegistration.count({ where: { planId: id } });
    if (count > 0)
      throw new HttpException(`该方案下还有 ${count} 条注册记录，无法删除`, HttpStatus.BAD_REQUEST);
    return this.prisma.domesticRegistrationPlan.delete({ where: { id } });
  }

  // ============================================================
  // 国内注册 - 记录 (DomesticRegistration)
  // ============================================================

  async getDomesticRegistrations(query: any) {
    const { page = 1, pageSize = 20, status, userId, search } = query;
    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = Number(userId);
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { legalPersonName: { contains: search } },
        { registrationNumber: { contains: search } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.domesticRegistration.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { plan: { select: { id: true, code: true, name: true, category: true } } },
      }),
      this.prisma.domesticRegistration.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getDomesticRegistration(id: number) {
    const record = await this.prisma.domesticRegistration.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!record) throw new HttpException('记录不存在', HttpStatus.NOT_FOUND);
    return record;
  }

  async createDomesticRegistration(data: any) {
    return this.prisma.domesticRegistration.create({
      data: { ...data, status: 'pending', progress: 0 },
    });
  }

  async updateDomesticRegistration(id: number, data: any) {
    await this.getDomesticRegistration(id);
    return this.prisma.domesticRegistration.update({ where: { id }, data });
  }

  async getDomesticStats() {
    const [total, byStatus, byCategory, recentCount] = await Promise.all([
      this.prisma.domesticRegistration.count(),
      this.prisma.domesticRegistration.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.domesticRegistration.groupBy({
        by: ['planId'],
        _count: { id: true },
      }),
      this.prisma.domesticRegistration.count({
        where: { createdAt: { gte: new Date(new Date().setDate(1)) } },
      }),
    ]);
    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.id])),
      byCategory: Object.fromEntries(byCategory.map((c) => [String(c.planId), c._count.id])),
      thisMonth: recentCount,
    };
  }

  // ============================================================
  // 海外注册 - 法域 (OverseasJurisdiction)
  // ============================================================

  async getJurisdictions() {
    return this.prisma.overseasJurisdiction.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getJurisdiction(id: number) {
    const j = await this.prisma.overseasJurisdiction.findUnique({ where: { id } });
    if (!j) throw new HttpException('法域不存在', HttpStatus.NOT_FOUND);
    return j;
  }

  async createJurisdiction(data: any) {
    return this.prisma.overseasJurisdiction.create({ data });
  }

  async updateJurisdiction(id: number, data: any) {
    await this.getJurisdiction(id);
    return this.prisma.overseasJurisdiction.update({ where: { id }, data });
  }

  async deleteJurisdiction(id: number) {
    await this.getJurisdiction(id);
    const count = await this.prisma.overseasRegistration.count({ where: { jurisdictionId: id } });
    if (count > 0)
      throw new HttpException(`该法域下还有 ${count} 条注册记录，无法删除`, HttpStatus.BAD_REQUEST);
    return this.prisma.overseasJurisdiction.delete({ where: { id } });
  }

  // ============================================================
  // 海外注册 - 记录 (OverseasRegistration)
  // ============================================================

  async getOverseasRegistrations(query: any) {
    const { page = 1, pageSize = 20, status, jurisdictionId, userId, search } = query;
    const where: any = {};
    if (status) where.status = status;
    if (jurisdictionId) where.jurisdictionId = Number(jurisdictionId);
    if (userId) where.userId = Number(userId);
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { registrationNumber: { contains: search } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.overseasRegistration.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          jurisdiction: {
            select: { id: true, code: true, name: true, country: true, flagIcon: true },
          },
        },
      }),
      this.prisma.overseasRegistration.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getOverseasRegistration(id: number) {
    const record = await this.prisma.overseasRegistration.findUnique({
      where: { id },
      include: { jurisdiction: true },
    });
    if (!record) throw new HttpException('记录不存在', HttpStatus.NOT_FOUND);
    return record;
  }

  async createOverseasRegistration(data: any) {
    if (data.shareholders && typeof data.shareholders !== 'string') {
      data.shareholders = JSON.stringify(data.shareholders);
    }
    if (data.directors && typeof data.directors !== 'string') {
      data.directors = JSON.stringify(data.directors);
    }
    return this.prisma.overseasRegistration.create({
      data: { ...data, status: 'pending', progress: 0 },
    });
  }

  async updateOverseasRegistration(id: number, data: any) {
    await this.getOverseasRegistration(id);
    if (data.shareholders && typeof data.shareholders !== 'string') {
      data.shareholders = JSON.stringify(data.shareholders);
    }
    if (data.directors && typeof data.directors !== 'string') {
      data.directors = JSON.stringify(data.directors);
    }
    return this.prisma.overseasRegistration.update({ where: { id }, data });
  }

  async getOverseasStats() {
    const [total, byStatus, byJurisdiction, feeAgg] = await Promise.all([
      this.prisma.overseasRegistration.count(),
      this.prisma.overseasRegistration.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.overseasRegistration.groupBy({ by: ['jurisdictionId'], _count: { id: true } }),
      this.prisma.overseasRegistration.aggregate({ _sum: { totalFeeUsd: true } }),
    ]);
    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.id])),
      byJurisdiction: Object.fromEntries(
        byJurisdiction.map((j) => [String(j.jurisdictionId), j._count.id])
      ),
      totalFeesUsd: feeAgg._sum.totalFeeUsd || 0,
    };
  }

  // ============================================================
  // 隐私保护 (PrivacyComplianceItem)
  // ============================================================

  async getPrivacyItems(query: any) {
    const { page = 1, pageSize = 20, region, status, category } = query;
    const where: any = {};
    if (region) where.region = region;
    if (status) where.status = status;
    if (category) where.category = category;
    const [data, total] = await Promise.all([
      this.prisma.privacyComplianceItem.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.privacyComplianceItem.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getPrivacyItem(id: number) {
    const item = await this.prisma.privacyComplianceItem.findUnique({ where: { id } });
    if (!item) throw new HttpException('合规项不存在', HttpStatus.NOT_FOUND);
    return item;
  }

  async createPrivacyItem(data: any) {
    return this.prisma.privacyComplianceItem.create({ data });
  }

  async updatePrivacyItem(id: number, data: any) {
    await this.getPrivacyItem(id);
    return this.prisma.privacyComplianceItem.update({ where: { id }, data });
  }

  async deletePrivacyItem(id: number) {
    await this.getPrivacyItem(id);
    return this.prisma.privacyComplianceItem.delete({ where: { id } });
  }

  async getPrivacyStats() {
    const [total, byRegion, byStatus, byCategory, overdueCount] = await Promise.all([
      this.prisma.privacyComplianceItem.count(),
      this.prisma.privacyComplianceItem.groupBy({ by: ['region'], _count: { id: true } }),
      this.prisma.privacyComplianceItem.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.privacyComplianceItem.groupBy({ by: ['category'], _count: { id: true } }),
      this.prisma.privacyComplianceItem.count({ where: { status: 'overdue' } }),
    ]);
    return {
      total,
      byRegion: Object.fromEntries(byRegion.map((r) => [r.region, r._count.id])),
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.id])),
      byCategory: Object.fromEntries(byCategory.map((c) => [c.category, c._count.id])),
      overdueCount,
    };
  }

  // ============================================================
  // 合同模板 (RegistrationContractTemplate)
  // ============================================================

  async getTemplates(query: any) {
    const { type, status } = query || {};
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    return this.prisma.registrationContractTemplate.findMany({
      where,
      orderBy: { usageCount: 'desc' },
    });
  }

  async getTemplate(id: number) {
    const t = await this.prisma.registrationContractTemplate.findUnique({ where: { id } });
    if (!t) throw new HttpException('模板不存在', HttpStatus.NOT_FOUND);
    return t;
  }

  async createTemplate(data: any) {
    if (data.variables && typeof data.variables !== 'string') {
      data.variables = JSON.stringify(data.variables);
    }
    if (data.tags && typeof data.tags !== 'string') {
      data.tags = JSON.stringify(data.tags);
    }
    return this.prisma.registrationContractTemplate.create({ data });
  }

  async updateTemplate(id: number, data: any) {
    await this.getTemplate(id);
    if (data.variables && typeof data.variables !== 'string') {
      data.variables = JSON.stringify(data.variables);
    }
    if (data.tags && typeof data.tags !== 'string') {
      data.tags = JSON.stringify(data.tags);
    }
    return this.prisma.registrationContractTemplate.update({ where: { id }, data });
  }

  async deleteTemplate(id: number) {
    await this.getTemplate(id);
    const count = await this.prisma.registrationContract.count({ where: { templateId: id } });
    if (count > 0)
      throw new HttpException(`该模板下还有 ${count} 份合同，无法删除`, HttpStatus.BAD_REQUEST);
    return this.prisma.registrationContractTemplate.delete({ where: { id } });
  }

  // ============================================================
  // 合同实例 (RegistrationContract)
  // ============================================================

  async getContracts(query: any) {
    const { page = 1, pageSize = 20, registrationType, status, templateId } = query;
    const where: any = {};
    if (registrationType) where.registrationType = registrationType;
    if (status) where.status = status;
    if (templateId) where.templateId = Number(templateId);
    const [data, total] = await Promise.all([
      this.prisma.registrationContract.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { template: { select: { id: true, type: true, name: true, version: true } } },
      }),
      this.prisma.registrationContract.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getContract(id: number) {
    const contract = await this.prisma.registrationContract.findUnique({
      where: { id },
      include: { template: true },
    });
    if (!contract) throw new HttpException('合同不存在', HttpStatus.NOT_FOUND);
    return contract;
  }

  async createContract(data: any) {
    if (data.parties && typeof data.parties !== 'string') {
      data.parties = JSON.stringify(data.parties);
    }
    if (data.filledVariables && typeof data.filledVariables !== 'string') {
      data.filledVariables = JSON.stringify(data.filledVariables);
    }
    const contract = await this.prisma.registrationContract.create({
      data: { ...data, status: 'draft' },
    });
    // 更新模板使用次数
    if (data.templateId) {
      await this.prisma.registrationContractTemplate.update({
        where: { id: data.templateId },
        data: { usageCount: { increment: 1 } },
      });
    }
    return contract;
  }

  async updateContract(id: number, data: any) {
    await this.getContract(id);
    if (data.parties && typeof data.parties !== 'string') {
      data.parties = JSON.stringify(data.parties);
    }
    if (data.filledVariables && typeof data.filledVariables !== 'string') {
      data.filledVariables = JSON.stringify(data.filledVariables);
    }
    return this.prisma.registrationContract.update({ where: { id }, data });
  }

  async getContractStats() {
    const [total, byStatus, byType, signedCount] = await Promise.all([
      this.prisma.registrationContract.count(),
      this.prisma.registrationContract.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.registrationContract.groupBy({ by: ['registrationType'], _count: { id: true } }),
      this.prisma.registrationContract.count({ where: { status: 'signed' } }),
    ]);
    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.id])),
      byType: Object.fromEntries(byType.map((t) => [t.registrationType || 'unknown', t._count.id])),
      signedCount,
    };
  }
}
