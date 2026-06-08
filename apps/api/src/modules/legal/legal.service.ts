import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class LegalService {
  constructor(private prisma: PrismaService) {}

  // Compliance
  async listCompliance(query: any) {
    const { search, countryCode, category } = query;
    const where: any = {};
    if (search) where.OR = [{ requirement: { contains: search } }, { country: { contains: search } }];
    if (countryCode) where.countryCode = countryCode;
    if (category) where.category = category;
    return this.prisma.legalCompliance.findMany({ where, orderBy: { countryCode: 'asc' } });
  }

  async createCompliance(data: any) {
    return this.prisma.legalCompliance.create({ data });
  }

  async updateCompliance(id: number, data: any) {
    return this.prisma.legalCompliance.update({ where: { id }, data });
  }

  async deleteCompliance(id: number) {
    return this.prisma.legalCompliance.delete({ where: { id } });
  }

  // Contracts
  async listContracts(query: any) {
    const { page = 1, pageSize = 20, status, type, search } = query;
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) where.OR = [{ name: { contains: search } }];
    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({ where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize), orderBy: { createdAt: 'desc' }, include: { user: true } }),
      this.prisma.contract.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async createContract(data: any) {
    if (data.parties && typeof data.parties !== 'string') data.parties = JSON.stringify(data.parties);
    return this.prisma.contract.create({ data });
  }

  async updateContract(id: number, data: any) {
    return this.prisma.contract.update({ where: { id }, data });
  }

  async deleteContract(id: number) {
    return this.prisma.contract.delete({ where: { id } });
  }
}
