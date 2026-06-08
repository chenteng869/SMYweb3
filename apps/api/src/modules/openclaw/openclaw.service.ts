import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class OpenClawService {
  constructor(private prisma: PrismaService) {}

  // ========== 智能体编排 CRUD ==========

  async findAllAgents(query: any) {
    const { page = 1, pageSize = 10, type, status } = query;
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.openClawAgent.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.openClawAgent.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getAgent(id: number) {
    const agent = await this.prisma.openClawAgent.findUnique({ where: { id } });
    if (!agent) return null;
    const [fineTuneCount, monitorLogCount] = await Promise.all([
      this.prisma.openClawFineTune.count({ where: { agentId: id } }),
      this.prisma.openClawMonitorLog.count({ where: { agentId: id } }),
    ]);
    return { ...agent, fineTuneCount, monitorLogCount };
  }

  async createAgent(data: any) {
    if (data.config && typeof data.config !== 'string') data.config = JSON.stringify(data.config);
    return this.prisma.openClawAgent.create({ data });
  }

  async updateAgent(id: number, data: any) {
    if (data.config && typeof data.config !== 'string') data.config = JSON.stringify(data.config);
    return this.prisma.openClawAgent.update({ where: { id }, data });
  }

  async deleteAgent(id: number) {
    return this.prisma.openClawAgent.delete({ where: { id } });
  }

  async getAgentStats() {
    const [agents, typeStats, statusStats, runCountAgg] = await Promise.all([
      this.prisma.openClawAgent.findMany({ select: { id: true, type: true, status: true, runCount: true, successRate: true } }),
      this.prisma.openClawAgent.groupBy({ by: ['type'], _count: true }),
      this.prisma.openClawAgent.groupBy({ by: ['status'], _count: true }),
      this.prisma.openClawAgent.aggregate({ _sum: { runCount: true }, _count: true }),
    ]);
    const validRates = agents.filter(a => a.successRate != null && a.successRate > 0);
    const avgSuccessRate = validRates.length > 0
      ? validRates.reduce((sum, a) => sum + Number(a.successRate), 0) / validRates.length
      : 0;
    return {
      totalAgents: agents.length,
      byType: typeStats.reduce((acc, item) => ({ ...acc, [item.type]: item._count }), {}),
      byStatus: statusStats.reduce((acc, item) => ({ ...acc, [item.status]: item._count }), {}),
      totalRunCount: Number(runCountAgg._sum?.runCount || 0),
      avgSuccessRate: Math.round(avgSuccessRate * 100) / 100,
    };
  }

  // ========== 市场 CRUD ==========

  async findAllMarketItems(query: any) {
    const { page = 1, pageSize = 10, category, status } = query;
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.openClawMarketplaceItem.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.openClawMarketplaceItem.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getMarketItem(id: number) {
    return this.prisma.openClawMarketplaceItem.findUnique({ where: { id } });
  }

  async createMarketItem(data: any) {
    if (data.tags && typeof data.tags !== 'string') data.tags = JSON.stringify(data.tags);
    return this.prisma.openClawMarketplaceItem.create({ data });
  }

  async updateMarketItem(id: number, data: any) {
    if (data.tags && typeof data.tags !== 'string') data.tags = JSON.stringify(data.tags);
    return this.prisma.openClawMarketplaceItem.update({ where: { id }, data });
  }

  async deleteMarketItem(id: number) {
    return this.prisma.openClawMarketplaceItem.delete({ where: { id } });
  }

  async getMarketStats() {
    const [categoryStats, totalDownloads, items] = await Promise.all([
      this.prisma.openClawMarketplaceItem.groupBy({ by: ['category'], _count: true }),
      this.prisma.openClawMarketplaceItem.aggregate({ _sum: { downloadCount: true } }),
      this.prisma.openClawMarketplaceItem.findMany({ select: { price: true } }),
    ]);
    const freeCount = items.filter(i => i.price === 0).length;
    const paidCount = items.length - freeCount;
    return {
      categoryDistribution: categoryStats.reduce((acc, item) => ({ ...acc, [item.category]: item._count }), {}),
      totalDownloads: totalDownloads._sum.downloadCount || 0,
      freeRatio: items.length > 0 ? Math.round(freeCount / items.length * 100) / 100 : 0,
      paidRatio: items.length > 0 ? Math.round(paidCount / items.length * 100) / 100 : 0,
    };
  }

  // ========== 训练微调 CRUD ==========

  async findAllFineTunes(query: any) {
    const { page = 1, pageSize = 10, agentId, status } = query;
    const where: any = {};
    if (agentId) where.agentId = Number(agentId);
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.openClawFineTune.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.openClawFineTune.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getFineTune(id: number) {
    return this.prisma.openClawFineTune.findUnique({ where: { id } });
  }

  async createFineTune(data: any) {
    return this.prisma.openClawFineTune.create({ data });
  }

  async updateFineTune(id: number, data: any) {
    // 可模拟进度更新
    if (data.progress !== undefined) {
      data.updatedAt = new Date();
    }
    return this.prisma.openClawFineTune.update({ where: { id }, data });
  }

  async deleteFineTune(id: number) {
    return this.prisma.openClawFineTune.delete({ where: { id } });
  }

  // ========== 监控大屏 ==========

  async findMonitorLogs(query: any) {
    const { page = 1, pageSize = 10, agentId, status, dateFrom, dateTo } = query;
    const where: any = {};
    if (agentId) where.agentId = Number(agentId);
    if (status) where.status = status;
    if (dateFrom || dateTo) where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
    const [data, total] = await Promise.all([
      this.prisma.openClawMonitorLog.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.openClawMonitorLog.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getMonitorStats(agentId?: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const where: any = { createdAt: { gte: today } };
    if (agentId) where.agentId = agentId;

    const [todayCalls, successLogs, allLogs] = await Promise.all([
      this.prisma.openClawMonitorLog.count({ where }),
      this.prisma.openClawMonitorLog.count({ where: { ...where, status: 'success' } }),
      this.prisma.openClawMonitorLog.findMany({
        where,
        select: { latencyMs: true, tokensUsed: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const successRate = todayCalls > 0 ? Math.round(successLogs / todayCalls * 10000) / 100 : 0;
    const avgLatency = allLogs.length > 0
      ? Math.round(allLogs.reduce((sum, l) => sum + (l.latencyMs || 0), 0) / allLogs.length)
      : 0;
    const totalTokens = allLogs.reduce((sum, l) => sum + (l.tokensUsed || 0), 0);

    // Token 用量趋势（按小时）
    const tokenTrend = Array.from({ length: 24 }, (_, hour) => {
      const hourStart = new Date(today);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hour + 1, 0, 0, 0);
      const count = allLogs.filter(l => l.createdAt >= hourStart && l.createdAt < hourEnd).reduce((s, l) => s + (l.tokensUsed || 0), 0);
      return { hour, tokens: count };
    });

    return {
      todayCalls,
      successRate,
      avgLatency,
      totalTokens,
      tokenTrend,
    };
  }

  async getMonitorDashboard() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Top5 活跃智能体
    const topAgents = await this.prisma.openClawMonitorLog.groupBy({
      by: ['agentId'],
      _count: true,
      orderBy: { _count: { agentId: 'desc' } },
      take: 5,
    });

    // 错误率排行 - 用 Prisma 查询替代 raw SQL
    const recentLogs = await this.prisma.openClawMonitorLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { agentId: true, status: true },
    });
    const errorMap = new Map<number, { total: number; errors: number }>();
    recentLogs.forEach(log => {
      const entry = errorMap.get(log.agentId) || { total: 0, errors: 0 };
      entry.total++;
      if (log.status === 'error') entry.errors++;
      errorMap.set(log.agentId, entry);
    });
    const errorRanking = Array.from(errorMap.entries())
      .map(([agentId, v]) => ({ agentId, total: v.total, errors: v.errors, errorRate: v.total > 0 ? Math.round(v.errors / v.total * 10000) / 100 : 0 }))
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 10);

    // 延迟分布
    const allRecentLogs = await this.prisma.openClawMonitorLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { latencyMs: true },
    });
    const latencyBuckets = { '0-100ms': 0, '100-500ms': 0, '500ms-1s': 0, '1-3s': 0, '>3s': 0 };
    allRecentLogs.forEach(log => {
      const ms = log.latencyMs || 0;
      if (ms < 100) latencyBuckets['0-100ms']++;
      else if (ms < 500) latencyBuckets['100-500ms']++;
      else if (ms < 1000) latencyBuckets['500ms-1s']++;
      else if (ms < 3000) latencyBuckets['1-3s']++;
      else latencyBuckets['>3s']++;
    });
    const latencyDistribution = Object.entries(latencyBuckets).map(([range, count]) => ({ range, count }));

    // 7日趋势
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const [calls, successes] = await Promise.all([
        this.prisma.openClawMonitorLog.count({ where: { createdAt: { gte: day, lt: nextDay } } }),
        this.prisma.openClawMonitorLog.count({ where: { createdAt: { gte: day, lt: nextDay }, status: 'success' } }),
      ]);
      dailyTrend.push({
        date: day.toISOString().split('T')[0],
        calls,
        successRate: calls > 0 ? Math.round(successes / calls * 10000) / 100 : 0,
      });
    }

    return {
      topActiveAgents: topAgents.map(t => ({ agentId: t.agentId, callCount: t._count })),
      errorRanking,
      latencyDistribution,
      dailyTrend,
    };
  }
}
