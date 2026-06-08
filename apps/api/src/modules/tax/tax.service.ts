import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TaxService {
  constructor(private prisma: PrismaService) {}

  async list(query: any) {
    const { search, countryCode, structureType } = query;
    const where: any = {};
    if (search) where.OR = [{ country: { contains: search } }];
    if (countryCode) where.countryCode = countryCode;
    if (structureType) where.structureType = structureType;
    return this.prisma.taxRate.findMany({ where, orderBy: { countryCode: 'asc' } });
  }

  async detail(id: number) {
    return this.prisma.taxRate.findUnique({ where: { id } });
  }

  async create(data: any) {
    return this.prisma.taxRate.create({ data: { ...data, doubleTaxationTreaties: JSON.stringify(data.doubleTaxationTreaties || []), effectiveDate: data.effectiveDate || new Date() } });
  }

  async update(id: number, data: any) {
    if (data.doubleTaxationTreaties && typeof data.doubleTaxationTreaties !== 'string') {
      data.doubleTaxationTreaties = JSON.stringify(data.doubleTaxationTreaties);
    }
    return this.prisma.taxRate.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.taxRate.delete({ where: { id } });
  }

  // 税务计算:简单公式
  calculate(body: { revenue: number; margin: number; structureType: string; countryCode: string; targetMarket?: string }) {
    const { revenue, margin, structureType, countryCode } = body;
    const rate = this.prisma.taxRate;
    // 实际查询可能异步,这里用静态映射
    const rateMap: any = {
      WS: { corporate: 0, vat: 15 },
      HK: { corporate: 8.25, vat: 0 },
      SG: { corporate: 17, vat: 9 },
      VG: { corporate: 0, vat: 0 },
      KY: { corporate: 0, vat: 0 },
      US: { corporate: 21, vat: 0 },
    };
    const r = rateMap[countryCode] || { corporate: 15, vat: 10 };
    const profit = revenue * (margin / 100);
    const corporateTax = profit * (r.corporate / 100);
    const vat = revenue * (r.vat / 100);
    const totalTax = corporateTax + vat;
    const effectiveRate = revenue > 0 ? (totalTax / revenue) * 100 : 0;
    const baseline = revenue * 0.25; // 假设无优化时税负 25%
    const savings = Math.max(0, baseline - totalTax);
    return { revenue, margin, structureType, countryCode, corporateTax, vat, totalTax, effectiveRate, savings };
  }
}
