import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { LlmProviderFactory } from '../../modules/ai-models/llm/providers/index';
import { PlatformAdapter } from './adapters/platform-adapter.interface';
import { PlatformCollectOptions, RawLead, NormalizedLead } from './types/acquisition.types';

// ==================== 类型定义 ====================

/** 评分后的线索 */
export interface ScoredLead extends NormalizedLead {
  /** 综合评分（0-100） */
  score: number;
  /** 粉丝数得分（0-25） */
  followerScore: number;
  /** 互动率得分（0-25） */
  engagementScore: number;
  /** 内容质量得分（0-20） */
  contentQualityScore: number;
  /** 相关性得分（0-30） */
  relevanceScore: number;
  /** 评分时间 */
  scoredAt: Date;
}

/** 单平台采集结果 */
export interface CollectResult {
  /** 平台名称 */
  platform: string;
  /** 查询条件 */
  query: string;
  /** 采集到的原始数量 */
  collected: number;
  /** 标准化后数量 */
  normalized: number;
  /** 错误信息列表 */
  errors: string[];
  /** 耗时（毫秒） */
  durationMs: number;
}

/** 去重结果 */
export interface DeduplicationResult {
  /** 唯一线索列表 */
  unique: NormalizedLead[];
  /** 重复数量 */
  duplicates: number;
  /** 总输入数量 */
  total: number;
  /** 去重详情（被移除的 ID 及原因） */
  removedDetails: Array<{ id: string; reason: string; duplicateOf: string }>;
}

/** 保存结果 */
export interface SaveResult {
  /** 新增数量 */
  saved: number;
  /** 更新数量 */
  updated: number;
  /** 跳过数量（无变化） */
  skipped: number;
}

/** 定时任务状态 */
export interface CollectionJobStatus {
  /** 任务 ID */
  jobId: string;
  /** 任务状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  /** 创建时间 */
  createdAt: Date;
  /** 开始时间 */
  startedAt?: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 最近执行结果 */
  lastResult?: CollectResult[];
  /** 下次执行时间 */
  nextRunAt?: Date;
  /** 错误信息 */
  error?: string;
}

// ==================== 核心服务 ====================

/**
 * 客户获取数据同步服务
 *
 * 负责多平台数据采集、标准化、去重、评分和持久化存储
 * 支持平台：Twitter/X、YouTube、Telegram、抖音、小红书
 */
@Injectable()
export class AcquisitionService {
  private readonly logger = new Logger(AcquisitionService.name);

  /** 平台适配器注册表 */
  private readonly adapters: Map<string, PlatformAdapter> = new Map();

  /** 定时任务注册表 */
  private readonly scheduledJobs: Map<
    string,
    {
      config: PlatformCollectOptions & { cronExpression?: string; timezone?: string };
      status: CollectionJobStatus;
      timer?: NodeJS.Timeout;
    }
  > = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmProviderFactory: LlmProviderFactory
  ) {
    this.logger.log('AcquisitionService 初始化完成');
  }

  // ==================== 平台适配器管理 ====================

  /**
   * 注册平台适配器
   * @param adapter 平台适配器实例
   */
  registerAdapter(adapter: PlatformAdapter): void {
    const name = adapter.platformName.toLowerCase();
    if (this.adapters.has(name)) {
      this.logger.warn(`适配器 "${name}" 已存在，将被覆盖`);
    }
    this.adapters.set(name, adapter);
    this.logger.log(`已注册平台适配器: ${name}`);
  }

  /**
   * 获取指定平台的适配器
   * @param platform 平台名称
   * @returns 平台适配器实例
   * @throws 若平台未注册则抛出异常
   */
  getAdapter(platform: string): PlatformAdapter {
    const adapter = this.adapters.get(platform.toLowerCase());
    if (!adapter) {
      throw new Error(
        `未注册的平台适配器: ${platform}，可用平台: ${[...this.adapters.keys()].join(', ')}`
      );
    }
    return adapter;
  }

  /**
   * 获取所有已注册的平台名称
   * @returns 平台名称数组
   */
  getAvailablePlatforms(): string[] {
    return [...this.adapters.keys()];
  }

  // ==================== 数据采集 ====================

  /**
   * 从单个平台采集数据
   * @param platform 目标平台
   * @param query 搜索查询条件
   * @param options 可选参数
   * @returns 采集结果（含统计信息和错误）
   */
  async collectFromPlatform(
    platform: string,
    query: string,
    options?: PlatformCollectOptions
  ): Promise<CollectResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let collected = 0;
    let normalized = 0;

    try {
      const adapter = this.getAdapter(platform);
      this.logger.log(`开始从 ${platform} 采集数据，查询: ${query}`);

      // 步骤1：调用适配器获取原始数据
      const rawLeads = await adapter.fetchLeads(query, options);
      collected = rawLeads.length;
      this.logger.log(`${platform} 采集到 ${collected} 条原始数据`);

      // 步骤2：调用适配器进行数据标准化
      const normalizedLeads = await adapter.normalizeData(rawLeads);
      normalized = normalizedLeads.length;
      this.logger.log(`${platform} 标准化后剩余 ${normalized} 条数据`);
    } catch (error) {
      const errorMsg = `${platform} 采集失败: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMsg);
      errors.push(errorMsg);
    }

    return {
      platform,
      query,
      collected,
      normalized,
      errors,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * 批量多平台并行采集
   * @param tasks 采集任务数组
   * @returns 各平台采集结果数组
   */
  async collectBatch(
    tasks: Array<{ platform: string; query: string; options?: PlatformCollectOptions }>
  ): Promise<CollectResult[]> {
    this.logger.log(`开始批量采集，共 ${tasks.length} 个任务`);

    // 并行执行所有采集任务
    const results = await Promise.all(
      tasks.map((task) => this.collectFromPlatform(task.platform, task.query, task.options))
    );

    const totalCollected = results.reduce((sum, r) => sum + r.collected, 0);
    const totalNormalized = results.reduce((sum, r) => sum + r.normalized, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    this.logger.log(
      `批量采集完成: 总计采集 ${totalCollected} 条，标准化 ${totalNormalized} 条，${totalErrors} 个错误`
    );

    return results;
  }

  // ==================== 数据标准化 ====================

  /**
   * 将原始数据标准化为统一格式
   * @param raw 原始数据对象
   * @returns 标准化的线索数据
   */
  normalizeRawLead(raw: RawLead): NormalizedLead {
    const now = new Date();
    const rawAny = raw as Record<string, unknown>;
    const platform = String(rawAny.platform || 'unknown').toLowerCase();
    const originalId = String(
      rawAny.id || rawAny.user_id || rawAny.channel_id || rawAny.uid || `unknown_${Date.now()}`
    );

    return {
      id: `${platform}:${originalId}`,
      platform: platform as NormalizedLead['platform'],
      displayName: String(
        rawAny.display_name || rawAny.name || rawAny.title || rawAny.nickname || '未知用户'
      ),
      username:
        (rawAny.username as string | undefined) ||
        (rawAny.handle as string | undefined) ||
        (rawAny.screen_name as string | undefined),
      bio:
        (rawAny.bio as string | undefined) ||
        (rawAny.description as string | undefined) ||
        (rawAny.introduction as string | undefined) ||
        (rawAny.signature as string | undefined),
      followerCount: this.parseNumber(
        rawAny.follower_count ||
          rawAny.followers_count ||
          rawAny.subscriber_count ||
          rawAny.fans_count
      ),
      followingCount: this.parseNumber(rawAny.following_count || rawAny.friends_count),
      postCount: this.parseNumber(
        rawAny.post_count || rawAny.tweets_count || rawAny.video_count || rawAny.note_count
      ),
      engagementRate: this.parseEngagementRate(rawAny.engagement_rate),
      avatarUrl:
        (rawAny.avatar_url as string | undefined) ||
        (rawAny.profile_image_url as string | undefined),
      profileUrl: (rawAny.profile_url as string | undefined) || (rawAny.url as string | undefined),
      lastPostAt: this.parseDate(
        rawAny.last_post_at || rawAny.latest_post_time || rawAny.updated_at
      ),
      tags: this.parseTags(rawAny.tags || rawAny.topics || rawAny.categories),
      contactInfo: {
        email: (rawAny.email as string | undefined) || (rawAny.contact_email as string | undefined),
        phone: (rawAny.phone as string | undefined) || (rawAny.contact_phone as string | undefined),
        website: (rawAny.website as string | undefined) || (rawAny.homepage as string | undefined),
      },
      rawJson: JSON.stringify(raw),
      collectedAt: now,
    };
  }

  // ==================== 数据去重 ====================

  /**
   * 对线索列表进行去重处理
   *
   * 去重策略：
   * 1. 用户名+平台精确匹配
   * 2. 显示名称相似度 > 0.85（模糊匹配）
   * 3. 个人主页 URL 精确匹配
   *
   * @param leads 待去重的线索列表
   * @returns 去重结果（含唯一线索、重复统计、去重详情）
   */
  async deduplicate(leads: NormalizedLead[]): Promise<DeduplicationResult> {
    if (leads.length === 0) {
      return { unique: [], duplicates: 0, total: 0, removedDetails: [] };
    }

    this.logger.log(`开始去重处理，输入 ${leads.length} 条数据`);

    const unique: NormalizedLead[] = [];
    const removedDetails: Array<{ id: string; reason: string; duplicateOf: string }> = [];
    const seenUsernames = new Map<string, string>(); // username -> id
    const seenProfileUrls = new Map<string, string>(); // profileUrl -> id

    for (const lead of leads) {
      let isDuplicate = false;
      let duplicateReason = '';
      let duplicateOf = '';

      // 策略1：用户名+平台精确匹配
      if (lead.username) {
        const key = `${lead.platform}:${lead.username}`.toLowerCase();
        const existingId = seenUsernames.get(key);
        if (existingId) {
          isDuplicate = true;
          duplicateReason = 'username_exact_match';
          duplicateOf = existingId;
        }
      }

      // 策略2：个人主页 URL 精确匹配
      if (!isDuplicate && lead.profileUrl) {
        const existingId = seenProfileUrls.get(lead.profileUrl.toLowerCase());
        if (existingId) {
          isDuplicate = true;
          duplicateReason = 'profile_url_exact_match';
          duplicateOf = existingId;
        }
      }

      // 策略3：显示名称模糊匹配（相似度 > 0.85）
      if (!isDuplicate) {
        for (const existing of unique) {
          if (
            existing.platform === lead.platform &&
            this.calculateSimilarity(existing.displayName, lead.displayName) > 0.85
          ) {
            isDuplicate = true;
            duplicateReason = 'display_name_fuzzy_match';
            duplicateOf = existing.id;
            break;
          }
        }
      }

      if (isDuplicate) {
        removedDetails.push({
          id: lead.id,
          reason: duplicateReason,
          duplicateOf,
        });
      } else {
        unique.push(lead);
        // 记录已见数据用于后续比对
        if (lead.username) {
          seenUsernames.set(`${lead.platform}:${lead.username}`.toLowerCase(), lead.id);
        }
        if (lead.profileUrl) {
          seenProfileUrls.set(lead.profileUrl.toLowerCase(), lead.id);
        }
      }
    }

    const result: DeduplicationResult = {
      unique,
      duplicates: removedDetails.length,
      total: leads.length,
      removedDetails,
    };

    this.logger.log(
      `去重完成: 输入 ${result.total} 条，保留 ${result.unique.length} 条，去除 ${result.duplicates} 条重复`
    );

    return result;
  }

  // ==================== 线索评分 ====================

  /**
   * 对线索进行多维度综合评分
   *
   * 评分维度（总分 0-100）：
   * - 粉丝数得分（0-25）：对数刻度
   * - 互动率得分（0-25）：越高越好
   * - 内容质量得分（0-20）：LLM 分析最近帖子/简介
   * - 相关性得分（0-30）：关键词匹配目标受众标准
   *
   * @param leads 待评分的标准化线索列表
   * @returns 按分数降序排列的评分线索列表
   */
  async scoreLeads(leads: NormalizedLead[]): Promise<ScoredLead[]> {
    if (leads.length === 0) {
      return [];
    }

    this.logger.log(`开始对 ${leads.length} 条线索进行评分`);

    const scoredLeads: ScoredLead[] = [];

    for (const lead of leads) {
      // 维度1：粉丝数得分（对数刻度，0-25分）
      const followerScore = this.calculateFollowerScore(lead.followerCount || 0);

      // 维度2：互动率得分（0-25分）
      const engagementScore = this.calculateEngagementScore(lead.engagementRate);

      // 维度3：内容质量得分（通过 LLM 分析，0-20分）
      const contentQualityScore = await this.analyzeContentQuality(lead);

      // 维度4：相关性得分（关键词匹配，0-30分）
      const relevanceScore = this.calculateRelevanceScore(lead);

      const totalScore = Math.min(
        100,
        Math.round(followerScore + engagementScore + contentQualityScore + relevanceScore)
      );

      scoredLeads.push({
        ...lead,
        score: totalScore,
        followerScore,
        engagementScore,
        contentQualityScore,
        relevanceScore,
        scoredAt: new Date(),
      });
    }

    // 按综合评分降序排序
    scoredLeads.sort((a, b) => b.score - a.score);

    const avgScore = scoredLeads.reduce((sum, l) => sum + l.score, 0) / scoredLeads.length;
    this.logger.log(
      `评分完成: 平均分 ${avgScore.toFixed(1)}，最高分 ${scoredLeads[0]?.score || 0}，最低分 ${scoredLeads[scoredLeads.length - 1]?.score || 0}`
    );

    return scoredLeads;
  }

  // ==================== 数据库存储 ====================

  /**
   * 将评分后的线索保存到数据库
   *
   * 存储策略：
   * - 根据 ID 进行 upsert 操作
   * - 若数据更新则更新现有记录
   * - 若无变化则跳过
   *
   * @param leads 待保存的评分线索列表
   * @param campaignId 可选的关联营销活动 ID
   * @returns 保存操作统计（新增/更新/跳过数量）
   */
  async saveLeads(leads: ScoredLead[], campaignId?: string): Promise<SaveResult> {
    let saved = 0;
    let updated = 0;
    let skipped = 0;

    this.logger.log(
      `开始保存 ${leads.length} 条线索到数据库${campaignId ? `（活动: ${campaignId}）` : ''}`
    );

    for (const lead of leads) {
      try {
        // 检查是否已存在
        const existing = await this.prisma.acquisitionLead.findFirst({
          where: { externalId: lead.id } as any,
        });

        if (!existing) {
          // 新增记录
          await this.prisma.acquisitionLead.create({
            data: {
              externalId: lead.id,
              platformId: (lead as any).platformId || 1,
              name: (lead as any).displayName || (lead as any).name || '',
              score: lead.score,
              tags: JSON.stringify((lead as any).tags || {}),
              notes: (lead as any).bio || '',
              rawJson: lead.rawJson,
              campaignId: Number(campaignId) || 1,
            } as any,
          });
          saved++;
        } else {
          // 检查是否有实质性更新（数据是否更新或分数变化超过阈值）
          const hasChanges =
            existing.score !== lead.score ||
            ((existing as any).followerCount ?? 0) !== ((lead as any).followerCount ?? 0) ||
            (existing as any).collectedAt < (lead as any).collectedAt;

          if (hasChanges) {
            await this.prisma.acquisitionLead.update({
              where: { id: existing.id } as any,
              data: {
                name: (lead as any).displayName || (lead as any).name || (existing as any).name,
                notes: (lead as any).bio || (existing as any).notes,
                rawJson: lead.rawJson,
                score: lead.score,
                updatedAt: new Date(),
              } as any,
            });
            updated++;
          } else {
            skipped++;
          }
        }
      } catch (error) {
        this.logger.error(
          `保存线索失败 (${lead.id}): ${error instanceof Error ? error.message : String(error)}`
        );
        skipped++;
      }
    }

    this.logger.log(`保存完成: 新增 ${saved} 条，更新 ${updated} 条，跳过 ${skipped} 条`);

    return { saved, updated, skipped };
  }

  // ==================== 调度与编排 ====================

  /**
   * 注册定时采集任务
   * @param cronExpression Cron 表达式
   * @param config 采集配置
   * @returns 任务 ID
   */
  async scheduleCollection(
    cronExpression: string,
    config: PlatformCollectOptions & { platforms?: string[]; query?: string },
    timezone = 'Asia/Shanghai'
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const jobStatus: CollectionJobStatus = {
      jobId,
      status: 'pending',
      createdAt: new Date(),
    };

    // 解析 Cron 表达式并设置定时器（简化实现，生产环境建议使用 @nestjs/schedule）
    // TODO: 集成 @nestjs/schedule 或 Bull 队列进行专业的定时任务管理
    this.scheduledJobs.set(jobId, {
      config: { ...config, cronExpression, timezone },
      status: jobStatus,
    });

    this.logger.log(`已注册定时采集任务: ${jobId}，Cron: ${cronExpression}`);

    return jobId;
  }

  /**
   * 获取定时任务状态
   * @param jobId 任务 ID
   * @returns 任务状态信息
   */
  async getCollectionStatus(jobId: string): Promise<CollectionJobStatus> {
    const job = this.scheduledJobs.get(jobId);
    if (!job) {
      throw new Error(`未找到定时任务: ${jobId}`);
    }
    return job.status;
  }

  /**
   * 取消定时采集任务
   * @param jobId 任务 ID
   */
  async cancelCollection(jobId: string): Promise<void> {
    const job = this.scheduledJobs.get(jobId);
    if (!job) {
      throw new Error(`未找到定时任务: ${jobId}`);
    }

    // 清除定时器
    if (job.timer) {
      clearInterval(job.timer);
      job.timer = undefined;
    }

    job.status.status = 'cancelled';
    job.status.completedAt = new Date();

    this.logger.log(`已取消定时采集任务: ${jobId}`);
  }

  // ==================== 报表与导出 ====================

  /**
   * 获取客户获取统计数据
   * @param dateRange 可选日期范围
   * @returns 统计数据对象
   */
  async getAcquisitionStats(dateRange?: { start: string; end: string }): Promise<object> {
    const where: any = {};
    if (dateRange?.start || dateRange?.end) {
      where.collectedAt = {};
      if (dateRange.start) where.collectedAt.gte = new Date(dateRange.start);
      if (dateRange.end) where.collectedAt.lte = new Date(dateRange.end);
    }

    // 并行查询各项统计数据
    const [totalCount, platformBreakdown, topLeads, scoreDistribution, recentTrend] =
      await Promise.all([
        // 总采集量
        this.prisma.acquisitionLead.count({ where }),

        // 各平台分布 - 使用 raw query 避免 Prisma groupBy 类型循环引用
        this.prisma
          .$queryRaw`SELECT platformId, COUNT(*) as _count, AVG(score) as _avg FROM acquisition_lead GROUP BY platformId` as any,

        // Top 10 高分线索
        this.prisma.acquisitionLead.findMany({
          where,
          orderBy: { score: 'desc' },
          take: 10,
          select: {
            id: true,
            externalId: true,
            platformId: true,
            // displayName: true, // removed - not in schema
            name: true,
            score: true,
            // followerCount: true, // removed - not in schema
            // collectedAt: true,  // removed - not in schema
            updatedAt: true,
          } as any,
        }),

        // 分数段分布
        this.prisma.$queryRaw`
        SELECT
          CASE
            WHEN score >= 80 THEN 'excellent'
            WHEN score >= 60 THEN 'good'
            WHEN score >= 40 THEN 'average'
            ELSE 'low'
          END as range,
          COUNT(*) as count
        FROM acquisition_leads
        GROUP BY range
      `,

        // 最近7天趋势
        this.getRecentTrend(7),
      ]);

    return {
      summary: {
        totalCollected: totalCount,
        platforms: platformBreakdown.length,
        avgScore:
          platformBreakdown.reduce((sum, p) => sum + (p._avg.score || 0), 0) /
          (platformBreakdown.length || 1),
      },
      byPlatform: platformBreakdown.map((p) => ({
        platform: p.platform,
        count: p._count.id,
        avgScore: Math.round(p._avg.score || 0),
      })),
      topLeads,
      scoreDistribution,
      trend: recentTrend,
    };
  }

  /**
   * 导出线索数据
   * @param filters 过滤条件
   * @param format 导出格式（csv/json）
   * @returns 文件 Buffer
   */
  async exportLeads(
    filters: {
      platform?: string;
      minScore?: number;
      maxScore?: number;
      dateFrom?: string;
      dateTo?: string;
      tags?: string[];
      hasContact?: boolean;
    },
    format: 'csv' | 'json'
  ): Promise<Buffer> {
    const where: any = {};

    // 构建过滤条件
    if (filters.platform) where.platform = filters.platform;
    if (filters.minScore !== undefined || filters.maxScore !== undefined) {
      where.score = {};
      if (filters.minScore !== undefined) where.score.gte = filters.minScore;
      if (filters.maxScore !== undefined) where.score.lte = filters.maxScore;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.collectedAt = {};
      if (filters.dateFrom) where.collectedAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.collectedAt.lte = new Date(filters.dateTo);
    }
    if (filters.hasContact) {
      where.OR = [
        { contactEmail: { not: null } },
        { contactPhone: { not: null } },
        { contactWebsite: { not: null } },
      ];
    }

    const leads = await this.prisma.acquisitionLead.findMany({
      where,
      orderBy: { score: 'desc' },
      take: 10000, // 导出上限
    });

    this.logger.log(`导出 ${leads.length} 条线索数据，格式: ${format}`);

    if (format === 'json') {
      return Buffer.from(JSON.stringify(leads, null, 2), 'utf-8');
    }

    // CSV 格式
    const headers = [
      'ID',
      '外部ID',
      '平台',
      '显示名称',
      '用户名',
      '粉丝数',
      '互动率',
      '评分',
      '联系方式(邮箱)',
      '联系方式(电话)',
      '联系方式(网站)',
      '采集时间',
    ];
    const rows = leads.map((l) =>
      [
        l.id,
        l.externalId,
        l.platformId || '',
        l.name || '',
        (l as any).username || '',
        ((l as any).followerCount || '').toString(),
        ((l as any).engagementRate || '').toString(),
        l.score,
        (l as any).contactEmail || '',
        (l as any).contactPhone || '',
        (l as any).contactWebsite || '',
        ((l as any).collectedAt || l.updatedAt).toISOString(),
      ].join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    // BOM for Excel compatibility with Chinese characters
    return Buffer.from('\uFEFF' + csvContent, 'utf-8');
  }

  /**
   * 分页查询线索列表
   * @param page 页码
   * @param pageSize 每页大小
   * @param filters 过滤条件
   * @returns 分页结果
   */
  async getLeadsPaginated(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      platform?: string;
      minScore?: number;
      search?: string;
    }
  ) {
    const where: any = {};

    if (filters?.platform) where.platform = filters.platform;
    if (filters?.minScore !== undefined) where.score = { gte: filters.minScore };
    if (filters?.search) {
      where.OR = [
        { displayName: { contains: filters.search } },
        { username: { contains: filters.search } },
        { bio: { contains: filters.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.acquisitionLead.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { score: 'desc' },
      }),
      this.prisma.acquisitionLead.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 解析数字值
   */
  private parseNumber(value: any): number | undefined {
    if (value === undefined || value === null) return undefined;
    const num = typeof value === 'number' ? value : parseInt(String(value), 10);
    return isNaN(num) ? undefined : num;
  }

  /**
   * 解析互动率
   */
  private parseEngagementRate(value: any): number | undefined {
    if (value === undefined || value === null) return undefined;
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) return undefined;
    // 确保在 0-1 范围内
    return num > 1 ? num / 100 : num;
  }

  /**
   * 解析日期
   */
  private parseDate(value: any): Date | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  /**
   * 解析标签
   */
  private parseTags(value: any): string[] | undefined {
    if (!value) return undefined;
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string')
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    return undefined;
  }

  /**
   * 计算字符串相似度（简单的编辑距离算法）
   * 返回 0-1 之间的相似度值
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLength = Math.max(len1, len2);
    return 1 - distance / maxLength;
  }

  /**
   * 计算粉丝数得分（对数刻度，0-25分）
   * 使用 log10 刻度：1000粉丝≈10分，10万粉丝≈18分，100万粉丝≈22分
   */
  private calculateFollowerScore(followerCount: number): number {
    if (followerCount <= 0) return 0;
    // 对数映射：log10(count) -> 0-25
    const logValue = Math.log10(followerCount);
    // log10(10)=1 -> ~3分, log10(1000)=3 -> ~10分, log10(1000000)=6 -> ~22分
    const score = Math.round((logValue / 7) * 25); // 7 ≈ log10(10M)
    return Math.min(25, Math.max(0, score));
  }

  /**
   * 计算互动率得分（0-25分）
   * 互动率越高得分越高
   */
  private calculateEngagementScore(engagementRate?: number): number {
    if (engagementRate === undefined || engagementRate === null) return 5; // 无数据给基础分
    // 0% -> 0分, 5% -> 15分, 10%+ -> 25分
    const score = Math.round(Math.min(engagementRate * 2.5, 25));
    return Math.min(25, Math.max(0, score));
  }

  /**
   * 通过 LLM 分析内容质量（0-20分）
   * 分析用户的简介和最近帖子内容的质量
   */
  private async analyzeContentQuality(lead: NormalizedLead): Promise<number> {
    try {
      const provider = this.llmProviderFactory.getDefaultProvider();

      // 构建分析提示词
      const prompt = `请评估以下社交媒体用户的内容质量，给出0-20分的整数评分。

用户信息：
- 平台: ${lead.platform}
- 名称: ${lead.displayName}
- 简介: ${lead.bio || '无'}
- 粉丝数: ${lead.followerCount || '未知'}

评分标准（满分20分）：
- 内容专业性和价值性（0-7分）
- 个人品牌一致性（0-5分）
- 内容活跃度和持续性（0-4分）
- 影响力潜力（0-4分）

请只返回一个数字分数，不要其他文字。`;

      const response = await provider.chatCompletion({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        maxTokens: 10,
      });

      const content = (response as any).content?.trim() || '';
      const score = parseInt(content, 10);

      if (isNaN(score) || score < 0 || score > 20) {
        return 10; // 默认中等分数
      }

      return score;
    } catch (error) {
      this.logger.warn(
        `LLM 内容质量分析失败 (${lead.id}): ${error instanceof Error ? error.message : String(error)}`
      );
      return 10; // LLM 不可用时返回默认分数
    }
  }

  /**
   * 计算相关性得分（关键词匹配，0-30分）
   * 根据预设的目标受众关键词匹配用户标签和简介
   */
  private calculateRelevanceScore(lead: NormalizedLead): number {
    // TODO: 从配置或数据库加载目标受众关键词，当前使用默认关键词集
    const targetKeywords = [
      'AI',
      '人工智能',
      '区块链',
      'crypto',
      'Web3',
      '创业',
      '投资',
      '技术',
      '产品',
      '营销',
      'SaaS',
      '开发者',
      'entrepreneur',
      'startup',
      'technology',
      'business',
      'innovation',
    ];

    const searchText = [lead.displayName, lead.bio, ...(lead.tags || []), lead.username]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    let matchCount = 0;
    for (const keyword of targetKeywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    // 匹配数量转换为分数：每个关键词约1.5分，最多30分
    const score = Math.min(30, Math.round(matchCount * 1.8));
    return score;
  }

  /**
   * 获取最近 N 天的采集趋势数据
   */
  private async getRecentTrend(days: number): Promise<Array<{ date: string; count: number }>> {
    const trend: Array<{ date: string; count: number }> = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);

      const count = await this.prisma.acquisitionLead.count({
        where: {
          collectedAt: { gte: d, lt: nextDay },
        } as any,
      });

      trend.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        count,
      });
    }

    return trend;
  }
}
