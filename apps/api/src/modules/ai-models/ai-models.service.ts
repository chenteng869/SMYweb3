import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AiModelsService {
  constructor(private prisma: PrismaService) {}

  // ==================== Provider 管理 ====================

  async findAllProviders(page: number = 1, pageSize: number = 20, status?: string) {
    const where: any = {};
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.aiModelProvider.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.aiModelProvider.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getProvider(id: number) {
    return this.prisma.aiModelProvider.findUnique({ where: { id }, include: { models: true } });
  }

  async createProvider(data: any) {
    return this.prisma.aiModelProvider.create({ data });
  }

  async updateProvider(id: number, data: any) {
    return this.prisma.aiModelProvider.update({ where: { id }, data });
  }

  async deleteProvider(id: number) {
    return this.prisma.aiModelProvider.delete({ where: { id } });
  }

  // ==================== Model Instance 管理 ====================

  async findAllInstances(page: number = 1, pageSize: number = 20, providerId?: number, status?: string) {
    const where: any = {};
    if (providerId) where.providerId = providerId;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.aiModelInstance.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, include: { provider: true } }),
      this.prisma.aiModelInstance.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getInstance(id: number) {
    return this.prisma.aiModelInstance.findUnique({ where: { id }, include: { provider: true } });
  }

  async createInstance(providerId: number, data: any) {
    return this.prisma.aiModelInstance.create({ data: { ...data, providerId } });
  }

  async updateInstance(id: number, data: any) {
    return this.prisma.aiModelInstance.update({ where: { id }, data });
  }

  async deleteInstance(id: number) {
    return this.prisma.aiModelInstance.delete({ where: { id } });
  }

  async toggleRecommended(id: number) {
    const instance = await this.prisma.aiModelInstance.findUnique({ where: { id } });
    if (!instance) throw new Error('实例不存在');
    return this.prisma.aiModelInstance.update({ where: { id }, data: { isRecommended: !instance.isRecommended } });
  }

  async getModelStats() {
    const [providerCount, instanceTotal, recommendedCount, activeCount, deprecatedCount] = await Promise.all([
      this.prisma.aiModelProvider.count(),
      this.prisma.aiModelInstance.count(),
      this.prisma.aiModelInstance.count({ where: { isRecommended: true } }),
      this.prisma.aiModelInstance.count({ where: { status: 'active' } }),
      this.prisma.aiModelInstance.count({ where: { status: 'deprecated' } }),
    ]);
    return { providerCount, instanceTotal, recommendedCount, activeCount, deprecatedCount };
  }

  // ==================== 智能识别 ====================

  async findAllRecognitions(page: number = 1, pageSize: number = 20, instanceId?: number, taskType?: string, status?: string) {
    const where: any = {};
    if (instanceId) where.instanceId = instanceId;
    if (taskType) where.taskType = taskType;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.aiSmartRecognition.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.aiSmartRecognition.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getRecognition(id: number) {
    return this.prisma.aiSmartRecognition.findUnique({ where: { id } });
  }

  async createRecognition(data: any) {
    return this.prisma.aiSmartRecognition.create({ data });
  }

  async updateRecognition(id: number, data: any) {
    return this.prisma.aiSmartRecognition.update({ where: { id }, data });
  }

  async deleteRecognition(id: number) {
    return this.prisma.aiSmartRecognition.delete({ where: { id } });
  }

  async testRecognition(id: number, input: any) {
    const recognition = await this.prisma.aiSmartRecognition.findUnique({ where: { id } });
    if (!recognition) throw new Error('识别配置不存在');
    // Mock 测试结果
    return {
      recognitionId: id,
      input,
      output: { result: '模拟识别结果', confidence: 0.95, processingTime: '120ms' },
      timestamp: new Date(),
    };
  }

  async getRecognitionByTask(taskType: string) {
    return this.prisma.aiSmartRecognition.findMany({ where: { taskType, status: 'active' }, orderBy: { createdAt: 'desc' } });
  }

  // ==================== 智能推荐 ====================

  async findAllRecommendations(page: number = 1, pageSize: number = 20, instanceId?: number, scenario?: string) {
    const where: any = {};
    if (instanceId) where.instanceId = instanceId;
    if (scenario) where.scenario = scenario;
    const [data, total] = await Promise.all([
      this.prisma.aiRecommendation.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.aiRecommendation.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getRecommendation(id: number) {
    return this.prisma.aiRecommendation.findUnique({ where: { id } });
  }

  async createRecommendation(data: any) {
    return this.prisma.aiRecommendation.create({ data });
  }

  async updateRecommendation(id: number, data: any) {
    return this.prisma.aiRecommendation.update({ where: { id }, data });
  }

  async deleteRecommendation(id: number) {
    return this.prisma.aiRecommendation.delete({ where: { id } });
  }

  async getBestForScenario(scenario: string) {
    return this.prisma.aiRecommendation.findFirst({ where: { scenario }, orderBy: { score: 'desc' } });
  }

  async getRecommendationMatrix() {
    const recommendations = await this.prisma.aiRecommendation.findMany({ include: { instance: { include: { provider: true } } } });
    const matrix: Record<string, any[]> = {};
    recommendations.forEach(r => {
      if (!matrix[r.scenario]) matrix[r.scenario] = [];
      matrix[r.scenario].push({ ...r, modelName: r.instance?.name, providerName: r.instance?.provider?.name });
    });
    return matrix;
  }

  // ==================== Prompt 工程 ====================

  async findAllPrompts(page: number = 1, pageSize: number = 20, category?: string, isPublic?: boolean) {
    const where: any = {};
    if (category) where.category = category;
    if (isPublic !== undefined) where.isPublic = isPublic;
    const [data, total] = await Promise.all([
      this.prisma.aiPromptTemplate.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.aiPromptTemplate.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getPrompt(id: number) {
    return this.prisma.aiPromptTemplate.findUnique({ where: { id } });
  }

  async createPrompt(data: any) {
    return this.prisma.aiPromptTemplate.create({ data });
  }

  async updatePrompt(id: number, data: any) {
    return this.prisma.aiPromptTemplate.update({ where: { id }, data });
  }

  async deletePrompt(id: number) {
    return this.prisma.aiPromptTemplate.delete({ where: { id } });
  }

  async forkPrompt(id: number) {
    const original = await this.prisma.aiPromptTemplate.findUnique({ where: { id } });
    if (!original) throw new Error('Prompt 不存在');
    return this.prisma.aiPromptTemplate.create({
      data: {
        name: `${original.name} (Fork)`,
        template: original.template,
        category: original.category,
        variables: original.variables,
        version: original.version + 1,
        createdBy: original.createdBy,
      },
    });
  }

  async renderPrompt(id: number, variables: Record<string, string>) {
    const prompt = await this.prisma.aiPromptTemplate.findUnique({ where: { id } });
    if (!prompt) throw new Error('Prompt 不存在');
    let rendered = prompt.template;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return { original: prompt.template, rendered, variablesUsed: Object.keys(variables) };
  }

  async getPromptStats() {
    const [prompts, categories] = await Promise.all([
      this.prisma.aiPromptTemplate.findMany({ select: { category: true, useCount: true } }),
      this.prisma.aiPromptTemplate.groupBy({ by: ['category'], _count: { id: true }, _sum: { useCount: true } }),
    ]);
    const topUsed = prompts.sort((a, b) => b.useCount - a.useCount).slice(0, 10);
    return { categoryDistribution: categories, topUsed };
  }

  // ==================== 成本分析 ====================

  async findAllCostRecords(page: number = 1, pageSize: number = 20, providerId?: number, dateFrom?: Date, dateTo?: Date) {
    const where: any = {};
    if (providerId) where.providerId = providerId;
    if (dateFrom || dateTo) where.date = {};
    if (dateFrom) where.date.gte = dateFrom;
    if (dateTo) where.date.lte = dateTo;
    const [data, total] = await Promise.all([
      this.prisma.aiModelCostRecord.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { date: 'desc' } }).then(records => records.map(r => ({ ...r, inputTokens: Number(r.inputTokens || 0), outputTokens: Number(r.outputTokens || 0) }))),
      this.prisma.aiModelCostRecord.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getCostSummary(dateFrom?: Date, dateTo?: Date) {
    const where: any = {};
    if (dateFrom || dateTo) where.date = {};
    if (dateFrom) where.date.gte = dateFrom;
    if (dateTo) where.date.lte = dateTo;

    const [byProvider, byModel, byDate, costAgg] = await Promise.all([
      this.prisma.aiModelCostRecord.groupBy({ by: ['providerId'], where, _sum: { totalCost: true }, _count: { id: true } }),
      this.prisma.aiModelCostRecord.groupBy({ by: ['modelId'], where, _sum: { totalCost: true }, _count: { id: true } }),
      this.prisma.aiModelCostRecord.groupBy({ by: ['date'], where, _sum: { totalCost: true }, _count: { id: true } }),
      this.prisma.aiModelCostRecord.aggregate({ where, _sum: { totalCost: true }, _count: true }),
    ]);

    return {
      byProvider: byProvider.map(p => ({ ...p, _sum: { ...p._sum, inputTokens: 0, outputTokens: 0 } })),
      byModel: byModel.map(m => ({ ...m, _sum: { ...m._sum, inputTokens: 0, outputTokens: 0 } })),
      byDate,
      totalCost: Number(costAgg._sum?.totalCost || 0),
      totalCount: costAgg._count || 0,
    };
  }

  async getCostTrend(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const records = await this.prisma.aiModelCostRecord.findMany({
      where: { date: { gte: since } },
      select: { date: true, totalCost: true },
      orderBy: { date: 'asc' },
    });

    const dailyMap: Record<string, number> = {};
    records.forEach(r => {
      const day = r.date.toISOString().split('T')[0];
      dailyMap[day] = (dailyMap[day] || 0) + Number(r.totalCost);
    });

    return Object.entries(dailyMap).map(([date, cost]) => ({ date, cost })).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getCostForecast(months: number = 3) {
    const days = months * 30;
    const trend = await this.getCostTrend(days);
    if (trend.length < 2) return { forecast: [], method: 'insufficient_data' };

    // 简单线性外推
    const costs = trend.map(t => t.cost);
    const n = costs.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = costs.reduce((a, b) => a + b, 0);
    const sumXY = costs.reduce((acc, c, i) => acc + i * c, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const lastDate = new Date(trend[trend.length - 1].date);
    const forecast = [];
    for (let i = 1; i <= 30; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + i);
      const predictedCost = Math.max(0, intercept + slope * (n + i - 1));
      forecast.push({ date: futureDate.toISOString().split('T')[0], predictedCost: Math.round(predictedCost * 100) / 100 });
    }

    return { forecast, method: 'linear_regression', slope, intercept };
  }

  async getTopCostModels(limit: number = 10) {
    return this.prisma.aiModelCostRecord.groupBy({
      by: ['modelId', 'providerId'],
      _sum: { totalCost: true, inputTokens: true, outputTokens: true },
      _count: { id: true },
      orderBy: { _sum: { totalCost: 'desc' } },
      take: limit,
    });
  }

  async getTokenUsageStats() {
    const [totalInput, totalOutput, byModel] = await Promise.all([
      this.prisma.aiModelCostRecord.aggregate({ _sum: { inputTokens: true } }),
      this.prisma.aiModelCostRecord.aggregate({ _sum: { outputTokens: true } }),
      this.prisma.aiModelCostRecord.groupBy({ by: ['modelId'], _sum: { inputTokens: true, outputTokens: true } }),
    ]);

    return {
      totalInputTokens: totalInput._sum.inputTokens || 0,
      totalOutputTokens: totalOutput._sum.outputTokens || 0,
      byModel,
    };
  }
}
