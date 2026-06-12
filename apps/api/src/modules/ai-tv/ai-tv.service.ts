import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AiTvService {
  constructor(private prisma: PrismaService) {}

  // ========== 数字人管理 ==========

  async findAllHumans(query: any) {
    const { page = 1, pageSize = 10, status, gender } = query;
    const where: any = {};
    if (status) where.status = status;
    if (gender) where.gender = gender;
    const [data, total] = await Promise.all([
      this.prisma.aiTvDigitalHuman.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { articles: true, broadcasts: true } } },
      }),
      this.prisma.aiTvDigitalHuman.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getHuman(id: number) {
    return this.prisma.aiTvDigitalHuman.findUnique({
      where: { id },
      include: {
        _count: { select: { articles: true, broadcasts: true } },
        articles: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async createHuman(data: any) {
    if (data.modelConfig && typeof data.modelConfig !== 'string')
      data.modelConfig = JSON.stringify(data.modelConfig);
    if (data.ttsSettings && typeof data.ttsSettings !== 'string')
      data.ttsSettings = JSON.stringify(data.ttsSettings);
    if (data.expressions && typeof data.expressions !== 'string')
      data.expressions = JSON.stringify(data.expressions);
    return this.prisma.aiTvDigitalHuman.create({ data });
  }

  async updateHuman(id: number, data: any) {
    if (data.modelConfig && typeof data.modelConfig !== 'string')
      data.modelConfig = JSON.stringify(data.modelConfig);
    if (data.ttsSettings && typeof data.ttsSettings !== 'string')
      data.ttsSettings = JSON.stringify(data.ttsSettings);
    return this.prisma.aiTvDigitalHuman.update({ where: { id }, data });
  }

  async deleteHuman(id: number) {
    return this.prisma.aiTvDigitalHuman.delete({ where: { id } });
  }

  async getHumanStats() {
    const [total, active, byModelType] = await Promise.all([
      this.prisma.aiTvDigitalHuman.count(),
      this.prisma.aiTvDigitalHuman.count({ where: { status: 'active' } }),
      this.prisma.aiTvDigitalHuman.groupBy({ by: ['modelType'], _count: true }),
    ]);
    return {
      total,
      active,
      byModelType: byModelType.reduce(
        (acc, item) => ({ ...acc, [item.modelType]: item._count }),
        {}
      ),
    };
  }

  // ========== 资讯源管理 ==========

  async findAllSources(query: any) {
    const { page = 1, pageSize = 10, category, isActive, sourceType } = query;
    const where: any = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
    if (sourceType) where.sourceType = sourceType;
    const [data, total] = await Promise.all([
      this.prisma.aiTvNewsSource.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { articles: true } } },
      }),
      this.prisma.aiTvNewsSource.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getSource(id: number) {
    return this.prisma.aiTvNewsSource.findUnique({
      where: { id },
      include: {
        _count: { select: { articles: true } },
        articles: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async createSource(data: any) {
    if (data.crawlRule && typeof data.crawlRule !== 'string')
      data.crawlRule = JSON.stringify(data.crawlRule);
    return this.prisma.aiTvNewsSource.create({ data });
  }

  async updateSource(id: number, data: any) {
    if (data.crawlRule && typeof data.crawlRule !== 'string')
      data.crawlRule = JSON.stringify(data.crawlRule);
    return this.prisma.aiTvNewsSource.update({ where: { id }, data });
  }

  async deleteSource(id: number) {
    return this.prisma.aiTvNewsSource.delete({ where: { id } });
  }

  async triggerFetch(id: number) {
    const source = await this.prisma.aiTvNewsSource.findUnique({ where: { id } });
    if (!source) throw new Error('资讯源不存在');
    // 模拟抓取
    await this.prisma.aiTvNewsSource.update({
      where: { id },
      data: { lastFetchedAt: new Date(), fetchCount: { increment: 1 } },
    });
    return {
      success: true,
      message: `已触发抓取: ${source.name}`,
      fetchedAt: new Date(),
      newArticles: Math.floor(Math.random() * 20) + 5,
    };
  }

  async getSourceStats() {
    const [total, active, totalFetches] = await Promise.all([
      this.prisma.aiTvNewsSource.count(),
      this.prisma.aiTvNewsSource.count({ where: { isActive: true } }),
      this.prisma.aiTvNewsSource.aggregate({ _sum: { fetchCount: true } }),
    ]);
    return { total, active, totalFetches: totalFetches._sum.fetchCount || 0 };
  }

  // ========== 稿件管理 ==========

  async findAllArticles(query: any) {
    const { page = 1, pageSize = 10, status, category, priority, sourceId } = query;
    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (sourceId) where.sourceId = Number(sourceId);
    const [data, total] = await Promise.all([
      this.prisma.aiTvArticle.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { source: true, human: true },
      }),
      this.prisma.aiTvArticle.count({ where }),
    ]);
    // 序列化 BigInt 字段
    const serializedData = data.map((item) => ({
      ...item,
    }));
    return { data: serializedData, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getArticle(id: number) {
    return this.prisma.aiTvArticle.findUnique({
      where: { id },
      include: {
        source: true,
        human: true,
        scheduleItems: true,
        broadcasts: { take: 5, orderBy: { startedAt: 'desc' } },
      },
    });
  }

  async createArticle(data: any) {
    if (data.tags && typeof data.tags !== 'string') data.tags = JSON.stringify(data.tags);
    if (data.attachments && typeof data.attachments !== 'string')
      data.attachments = JSON.stringify(data.attachments);
    return this.prisma.aiTvArticle.create({ data });
  }

  async updateArticle(id: number, data: any) {
    if (data.tags && typeof data.tags !== 'string') data.tags = JSON.stringify(data.tags);
    if (data.attachments && typeof data.attachments !== 'string')
      data.attachments = JSON.stringify(data.attachments);
    return this.prisma.aiTvArticle.update({ where: { id }, data });
  }

  async deleteArticle(id: number) {
    return this.prisma.aiTvArticle.delete({ where: { id } });
  }

  async approveArticle(id: number) {
    return this.prisma.aiTvArticle.update({
      where: { id },
      data: { status: 'approved', reviewedAt: new Date() },
    });
  }

  async rejectArticle(id: number) {
    return this.prisma.aiTvArticle.update({
      where: { id },
      data: { status: 'rejected', reviewedAt: new Date() },
    });
  }

  async aiRewrite(id: number) {
    const article = await this.prisma.aiTvArticle.findUnique({ where: { id } });
    if (!article) throw new Error('稿件不存在');
    // 模拟 AI 改写
    const draftContent = `【AI改写稿】${article.originalContent?.substring(0, 100) || ''}...(AI已根据口播风格改写)`;
    const updated = await this.prisma.aiTvArticle.update({
      where: { id },
      data: {
        draftContent,
        aiModel: 'qwen-plus',
        wordCount: Math.floor(Math.random() * 300) + 200,
      },
    });
    return updated;
  }

  async getArticleStats() {
    const [total, byStatus] = await Promise.all([
      this.prisma.aiTvArticle.count(),
      this.prisma.aiTvArticle.groupBy({ by: ['status'], _count: true }),
    ]);
    return {
      total,
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item.status]: item._count }), {}),
    };
  }

  // ========== 排班管理 ==========

  async findAllSchedules(query: any) {
    const { page = 1, pageSize = 10, programSlot, status } = query;
    const where: any = {};
    if (programSlot) where.programSlot = programSlot;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.aiTvSchedule.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: [{ scheduledFor: 'asc' }, { orderIndex: 'asc' }],
        include: { article: { include: { source: true, human: true } } },
      }),
      this.prisma.aiTvSchedule.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getSchedule(id: number) {
    return this.prisma.aiTvSchedule.findUnique({
      where: { id },
      include: { article: { include: { source: true, human: true } } },
    });
  }

  async createSchedule(data: any) {
    return this.prisma.aiTvSchedule.create({ data });
  }

  async updateSchedule(id: number, data: any) {
    return this.prisma.aiTvSchedule.update({ where: { id }, data });
  }

  async deleteSchedule(id: number) {
    return this.prisma.aiTvSchedule.delete({ where: { id } });
  }

  async getTodaySchedule() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.prisma.aiTvSchedule.findMany({
      where: { scheduledFor: { gte: today, lt: tomorrow } },
      include: { article: { include: { source: true, human: true } } },
      orderBy: [{ scheduledFor: 'asc' }, { orderIndex: 'asc' }],
    });
  }

  async getScheduleBySlot(slot: string) {
    return this.prisma.aiTvSchedule.findMany({
      where: { programSlot: slot },
      include: { article: true },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async reorderSchedules(scheduledFor: string, orderIds: number[]) {
    // 批量更新排序
    const updates = orderIds.map((id, index) =>
      this.prisma.aiTvSchedule.update({ where: { id }, data: { orderIndex: index } })
    );
    await Promise.all(updates);
    return { success: true, message: '排序已更新' };
  }

  async getScheduleStats() {
    const [total, byStatus, bySlot] = await Promise.all([
      this.prisma.aiTvSchedule.count(),
      this.prisma.aiTvSchedule.groupBy({ by: ['status'], _count: true }),
      this.prisma.aiTvSchedule.groupBy({ by: ['programSlot'], _count: true }),
    ]);
    return {
      total,
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item.status]: item._count }), {}),
      bySlot: bySlot.reduce((acc, item) => ({ ...acc, [item.programSlot]: item._count }), {}),
    };
  }

  // ========== TTS语音 ==========

  async findAllTtsConfigs(query: any) {
    const { page = 1, pageSize = 10, engine, status } = query;
    const where: any = {};
    if (engine) where.engine = engine;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.aiTvTtsConfig.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.aiTvTtsConfig.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getTtsConfig(id: number) {
    return this.prisma.aiTvTtsConfig.findUnique({ where: { id }, include: { humans: true } });
  }

  async createTtsConfig(data: any) {
    return this.prisma.aiTvTtsConfig.create({ data });
  }

  async updateTtsConfig(id: number, data: any) {
    return this.prisma.aiTvTtsConfig.update({ where: { id }, data });
  }

  async deleteTtsConfig(id: number) {
    return this.prisma.aiTvTtsConfig.delete({ where: { id } });
  }

  async testTts(id: number, text: string) {
    const config = await this.prisma.aiTvTtsConfig.findUnique({ where: { id } });
    if (!config) throw new Error('TTS配置不存在');
    // 模拟试听
    return {
      success: true,
      audioUrl: `https://example.com/tts/test-${config.engine}-${Date.now()}.mp3`,
      duration: Math.ceil(text.length / 4),
      configId: id,
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
    };
  }

  async getTtsStats() {
    const [total, byEngine] = await Promise.all([
      this.prisma.aiTvTtsConfig.count(),
      this.prisma.aiTvTtsConfig.groupBy({ by: ['engine'], _count: true }),
    ]);
    return {
      total,
      byEngine: byEngine.reduce((acc, item) => ({ ...acc, [item.engine]: item._count }), {}),
    };
  }

  // ========== 推流管理 ==========

  async findAllPushes(query: any) {
    const { page = 1, pageSize = 10, status } = query;
    const where: any = {};
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.aiTvStreamPush.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiTvStreamPush.count({ where }),
    ]);
    // 序列化 BigInt
    const serializedData = data.map((item) => ({
      ...item,
      totalPushBytes: Number(item.totalPushBytes),
    }));
    return { data: serializedData, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getPush(id: number) {
    const push = await this.prisma.aiTvStreamPush.findUnique({
      where: { id },
      include: { logs: { take: 10, orderBy: { startedAt: 'desc' } } },
    });
    if (push) {
      return { ...push, totalPushBytes: Number(push.totalPushBytes) };
    }
    return push;
  }

  async createPush(data: any) {
    if (data.targetPlatforms && typeof data.targetPlatforms !== 'string')
      data.targetPlatforms = JSON.stringify(data.targetPlatforms);
    return this.prisma.aiTvStreamPush.create({ data });
  }

  async updatePush(id: number, data: any) {
    if (data.targetPlatforms && typeof data.targetPlatforms !== 'string')
      data.targetPlatforms = JSON.stringify(data.targetPlatforms);
    return this.prisma.aiTvStreamPush.update({ where: { id }, data });
  }

  async deletePush(id: number) {
    return this.prisma.aiTvStreamPush.delete({ where: { id } });
  }

  async startPush(id: number) {
    return this.prisma.aiTvStreamPush.update({
      where: { id },
      data: { status: 'pushing', startedAt: new Date(), uptimeSec: 0 },
    });
  }

  async stopPush(id: number) {
    const push = await this.prisma.aiTvStreamPush.findUnique({
      where: { id },
      select: { startedAt: true },
    });
    const uptime = push?.startedAt
      ? Math.floor((Date.now() - new Date(push.startedAt).getTime()) / 1000)
      : 0;
    return this.prisma.aiTvStreamPush.update({
      where: { id },
      data: { status: 'stopped', uptimeSec: uptime },
    });
  }

  async restartPush(id: number) {
    await this.stopPush(id);
    return this.startPush(id);
  }

  async getPushStatus(id: number) {
    const push = await this.prisma.aiTvStreamPush.findUnique({ where: { id } });
    if (!push) return null;
    const logs = await this.prisma.aiTvBroadcastLog.findMany({
      where: { pushId: id },
      orderBy: { startedAt: 'desc' },
      take: 5,
    });
    return { ...push, totalPushBytes: Number(push.totalPushBytes), recentLogs: logs };
  }

  async getPushStats() {
    const [total, pushing, idle, error] = await Promise.all([
      this.prisma.aiTvStreamPush.count(),
      this.prisma.aiTvStreamPush.count({ where: { status: 'pushing' } }),
      this.prisma.aiTvStreamPush.count({ where: { status: 'idle' } }),
      this.prisma.aiTvStreamPush.count({ where: { status: 'error' } }),
    ]);
    return { total, pushing, idle, error };
  }

  // ========== 媒资库 ==========

  async findAllAssets(query: any) {
    const { page = 1, pageSize = 10, assetType, category, status } = query;
    const where: any = {};
    if (assetType) where.assetType = assetType;
    if (category) where.category = category;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.aiTvMediaAsset.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiTvMediaAsset.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getAsset(id: number) {
    return this.prisma.aiTvMediaAsset.findUnique({ where: { id } });
  }

  async createAsset(data: any) {
    if (data.tags && typeof data.tags !== 'string') data.tags = JSON.stringify(data.tags);
    return this.prisma.aiTvMediaAsset.create({ data });
  }

  async updateAsset(id: number, data: any) {
    if (data.tags && typeof data.tags !== 'string') data.tags = JSON.stringify(data.tags);
    return this.prisma.aiTvMediaAsset.update({ where: { id }, data });
  }

  async deleteAsset(id: number) {
    return this.prisma.aiTvMediaAsset.delete({ where: { id } });
  }

  async getAssetStats() {
    const [total, byType, videos, images] = await Promise.all([
      this.prisma.aiTvMediaAsset.count(),
      this.prisma.aiTvMediaAsset.groupBy({ by: ['assetType'], _count: true }),
      this.prisma.aiTvMediaAsset.count({ where: { assetType: 'video' } }),
      this.prisma.aiTvMediaAsset.count({ where: { assetType: 'image' } }),
    ]);
    return {
      total,
      byType: byType.reduce((acc, item) => ({ ...acc, [item.assetType]: item._count }), {}),
      videos,
      images,
    };
  }

  // ========== 播出日志与数据 ==========

  async findAllLogs(query: any) {
    const { page = 1, pageSize = 10, status, dateFrom, dateTo } = query;
    const where: any = {};
    if (status) where.status = status;
    if (dateFrom || dateTo) where.startedAt = {};
    if (dateFrom) where.startedAt.gte = new Date(dateFrom);
    if (dateTo) where.startedAt.lte = new Date(dateTo);
    const [data, total] = await Promise.all([
      this.prisma.aiTvBroadcastLog.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { startedAt: 'desc' },
        include: { article: { include: { source: true } }, human: true, push: true },
      }),
      this.prisma.aiTvBroadcastLog.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getLog(id: number) {
    return this.prisma.aiTvBroadcastLog.findUnique({
      where: { id },
      include: { article: { include: { source: true, human: true } }, human: true, push: true },
    });
  }

  async getDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [
      todayBroadcasts,
      avgDuration,
      successRate,
      totalViewers,
      activeHumans,
      activePushes,
      pendingArticles,
    ] = await Promise.all([
      this.prisma.aiTvBroadcastLog.count({ where: { startedAt: { gte: today } } }),
      this.prisma.aiTvBroadcastLog.aggregate({
        _avg: { durationSec: true },
        where: { startedAt: { gte: today }, durationSec: { gt: 0 } },
      }),
      this.prisma.aiTvBroadcastLog.aggregate({
        where: { startedAt: { gte: today } },
        _count: true,
      }),
      this.prisma.aiTvBroadcastLog.aggregate({
        _sum: { viewerPeak: true },
        where: { startedAt: { gte: today } },
      }),
      this.prisma.aiTvDigitalHuman.count({ where: { status: 'active' } }),
      this.prisma.aiTvStreamPush.count({ where: { status: 'pushing' } }),
      this.prisma.aiTvArticle.count({ where: { status: { in: ['approved', 'scheduled'] } } }),
    ]);
    const successLogs = await this.prisma.aiTvBroadcastLog.count({
      where: { startedAt: { gte: today }, status: 'success' },
    });
    const totalLogs = await this.prisma.aiTvBroadcastLog.count({
      where: { startedAt: { gte: today } },
    });
    return {
      todayBroadcasts: todayBroadcasts,
      avgDuration: Math.round(avgDuration._avg.durationSec || 0),
      totalViewers: totalViewers._sum.viewerPeak || 0,
      successRate: totalLogs > 0 ? Math.round((successLogs / totalLogs) * 10000) / 100 : 0,
      activeHumans,
      activePushes,
      pendingArticles,
    };
  }

  async getBroadcastTrend(days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const logs = await this.prisma.aiTvBroadcastLog.groupBy({
      by: ['startedAt'],
      where: { startedAt: { gte: since } },
      _count: true,
      _sum: { durationSec: true, viewerPeak: true },
    });
    // 按日期聚合
    const trend = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayLogs = logs.filter(
        (l) => l.startedAt instanceof Date && l.startedAt.toISOString().startsWith(dayStr)
      );
      trend.push({
        date: dayStr,
        count: dayLogs.reduce((s, l) => s + l._count, 0),
        duration: dayLogs.reduce((s, l) => s + (l._sum.durationSec || 0), 0),
        viewers: dayLogs.reduce((s, l) => s + (l._sum.viewerPeak || 0), 0),
      });
    }
    return trend;
  }

  async getHumanPerformance(humanId: number) {
    const [human, broadcastCount, totalDuration, avgViewers, recentLogs] = await Promise.all([
      this.prisma.aiTvDigitalHuman.findUnique({ where: { id: humanId } }),
      this.prisma.aiTvBroadcastLog.count({ where: { humanId } }),
      this.prisma.aiTvBroadcastLog.aggregate({ where: { humanId }, _sum: { durationSec: true } }),
      this.prisma.aiTvBroadcastLog.aggregate({
        where: { humanId, durationSec: { gt: 0 } },
        _avg: { viewerAvg: true },
      }),
      this.prisma.aiTvBroadcastLog.findMany({
        where: { humanId },
        take: 10,
        orderBy: { startedAt: 'desc' },
      }),
    ]);
    return {
      human,
      broadcastCount,
      totalDuration: totalDuration._sum.durationSec || 0,
      avgViewers: Math.round(avgViewers._avg.viewerAvg || 0),
      recentLogs,
    };
  }

  async getContentStats() {
    const [byCategory, byStatus, byPriority, totalWordCount] = await Promise.all([
      this.prisma.aiTvArticle.groupBy({ by: ['category'], _count: true }),
      this.prisma.aiTvArticle.groupBy({ by: ['status'], _count: true }),
      this.prisma.aiTvArticle.groupBy({ by: ['priority'], _count: true }),
      this.prisma.aiTvArticle.aggregate({ _sum: { wordCount: true } }),
    ]);
    return {
      byCategory: byCategory.reduce((acc, item) => ({ ...acc, [item.category]: item._count }), {}),
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item.status]: item._count }), {}),
      byPriority: byPriority.reduce((acc, item) => ({ ...acc, [item.priority]: item._count }), {}),
      totalWordCount: totalWordCount._sum.wordCount || 0,
    };
  }
}
