import { Injectable, Logger } from '@nestjs/common';
import { BaseAgentStrategy } from './base-agent.strategy';
import { ITaskPayload, ITaskResult, TaskType } from '../types/task.types';
import { IAgentSession } from '../types/agent.types';

/**
 * 支持的平台类型枚举
 */
type PlatformType = 'twitter' | 'youtube' | 'telegram' | 'douyin' | 'xiaohongshu';

/**
 * 模拟采集到的线索条目
 */
interface LeadItem {
  id: string;
  platform: PlatformType;
  username: string;
  displayName: string;
  followers: number;
  engagementRate: number;
  contentScore: number;
  relevanceScore: number;
  leadScore: number; // 综合线索评分 (0-100)
  avatarUrl?: string;
  bio?: string;
  lastActiveAt: string;
}

/** 平台中文名称映射 */
const PLATFORM_LABELS: Record<PlatformType, string> = {
  twitter: 'Twitter/X',
  youtube: 'YouTube',
  telegram: 'Telegram',
  douyin: '抖音',
  xiaohongshu: '小红书',
};

/**
 * 获客采集 Agent 策略
 *
 * 负责从各社交/内容平台自动采集潜在客户线索数据。
 * 工作流程：平台识别 → 关键词搜索/数据抓取 → 数据标准化 → 线索评分排序
 *
 * 当前版本为模拟实现（Mock），Phase 3 将接入真实平台适配器。
 */
@Injectable()
export class AcquisitionAgentStrategy extends BaseAgentStrategy {
  override readonly strategyName = 'acquisition-agent';

  override readonly supportedTaskTypes: TaskType[] = [TaskType.ACQUISITION];

  constructor() {
    super();
  }

  /**
   * 执行获客采集任务
   *
   * @param session - Agent 会话
   * @param payload - 任务负载（包含 platform 和 query）
   * @returns 采集结果（含线索列表、统计指标）
   */
  async execute(session: IAgentSession, payload: ITaskPayload): Promise<ITaskResult> {
    const startTime = Date.now();

    this.logger.log(
      `开始执行获客采集任务 | 会话ID=${session.id} | 平台=${payload.platform} | 关键词="${payload.query}"`
    );

    try {
      // Step 1: 解析并校验目标平台
      const platform = this.parsePlatform(payload.platform);
      if (!platform) {
        throw new Error(
          `不支持的平台类型: ${payload.platform}，可选值: ${Object.keys(PLATFORM_LABELS).join(', ')}`
        );
      }

      // Step 2: 校验搜索关键词
      if (!payload.query || payload.query.trim().length === 0) {
        throw new Error('搜索关键词 (query) 不能为空');
      }

      // Step 3: 模拟平台数据获取（Phase 3 接入真实适配器）
      this.logger.log(`正在从 ${PLATFORM_LABELS[platform]} 采集数据，关键词: "${payload.query}"`);
      const rawItems = await this.mockFetchFromPlatform(platform, payload.query);

      // Step 4: 数据标准化与线索评分
      const processedLeads = await this.processAndScoreLeads(rawItems, platform);

      // Step 5: 构建返回结果
      const durationMs = Date.now() - startTime;
      const highQualityLeads = processedLeads.filter((item) => item.leadScore >= 70);
      const avgLeadScore =
        processedLeads.length > 0
          ? Math.round(
              processedLeads.reduce((sum, item) => sum + item.leadScore, 0) / processedLeads.length
            )
          : 0;

      this.logger.log(
        `获客采集完成 | 平台=${PLATFORM_LABELS[platform]} | 采集数=${rawItems.length} | 有效线索=${processedLeads.length} | 高质量线索=${highQualityLeads.length} | 耗时=${durationMs}ms`
      );

      return {
        success: true,
        data: {
          platform,
          platformLabel: PLATFORM_LABELS[platform],
          query: payload.query,
          collectedCount: rawItems.length,
          processedCount: processedLeads.length,
          highQualityCount: highQualityLeads.length,
          avgLeadScore,
          leads: processedLeads.sort((a, b) => b.leadScore - a.leadScore),
          summary: {
            topLeads: highQualityLeads.slice(0, 5).map((l) => ({
              username: l.username,
              displayName: l.displayName,
              leadScore: l.leadScore,
              platform: l.platform,
            })),
            distribution: this.buildScoreDistribution(processedLeads),
          },
        },
        metrics: {
          durationMs,
          itemsProcessed: processedLeads.length,
        },
      };
    } catch (error) {
      return this.onError(error as Error, payload);
    }
  }

  /**
   * 预处理：校验获客任务必需参数
   */
  override async preprocess(payload: ITaskPayload): Promise<ITaskPayload> {
    this.logger.debug('获客策略预处理：参数校验');

    if (!payload.platform) {
      throw new Error('获客任务缺少必需参数: platform');
    }
    if (!payload.query) {
      throw new Error('获客任务缺少必需参数: query');
    }

    return payload;
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 解析平台标识字符串为合法的 PlatformType
   */
  private parsePlatform(platform?: string): PlatformType | null {
    if (!platform) return null;
    const normalized = platform.toLowerCase().trim();
    if (normalized in PLATFORM_LABELS) {
      return normalized as PlatformType;
    }
    return null;
  }

  /**
   * 模拟从平台获取原始数据（Mock 实现）
   *
   * Phase 3: 此处将替换为真实平台 API 调用 / 爬虫适配器
   */
  private async mockFetchFromPlatform(platform: PlatformType, query: string): Promise<unknown[]> {
    // 模拟网络延迟
    await this.simulateDelay(200, 600);

    const baseId = `${platform}_${Date.now()}`;
    const count = this.getRandomInt(8, 25); // 模拟每次采集 8-25 条

    const mockNames: Record<PlatformType, string[]> = {
      twitter: ['CryptoAlpha', 'Web3Builder', 'DeFiWhale', 'NFTCollector', 'ChainAnalyst'],
      youtube: ['TechReviewPro', 'CodeMaster', 'AIExplained', 'DevDaily', 'StartupInsights'],
      telegram: ['CryptoSignals', 'DeFiAlpha', 'Web3Community', 'TokenResearch', 'BlockchainNews'],
      douyin: ['科技前沿', '数字生活', 'AI实验室', '创业日记', '财经观察'],
      xiaohongshu: ['数码测评', '生活方式', '职场成长', '投资笔记', '美学分享'],
    };

    const names = mockNames[platform] || mockNames.twitter;

    return Array.from({ length: count }, (_, i) => ({
      id: `${baseId}_${i}`,
      platform,
      username: `${names[i % names.length]}_${this.getRandomInt(100, 9999)}`,
      displayName: names[i % names.length],
      followers: this.getRandomInt(500, 500000),
      engagementRate: parseFloat((Math.random() * 15 + 0.5).toFixed(2)),
      bio: `关于 "${query}" 的相关内容创作者 #${i + 1}`,
      lastActiveAt: new Date(Date.now() - this.getRandomInt(0, 86400000 * 7)).toISOString(),
    }));
  }

  /**
   * 数据标准化与线索评分
   *
   * 综合考虑粉丝数、互动率、内容相关性等维度计算综合线索分
   */
  private async processAndScoreLeads(
    rawItems: unknown[],
    platform: PlatformType
  ): Promise<LeadItem[]> {
    const leads: LeadItem[] = [];

    for (const item of rawItems as Record<string, unknown>[]) {
      const followers = Number(item.followers) || 0;
      const engagementRate = Number(item.engagementRate) || 0;

      // 粉丝数评分 (0-40分)：对数缩放避免头部账号垄断
      const followerScore = Math.min(40, Math.round(20 * Math.log10(followers + 1)));

      // 互动率评分 (0-30分)
      const engagementScore = Math.min(30, Math.round(engagementRate * 2));

      // 内容质量模拟评分 (0-30分)
      const contentScore = this.getRandomInt(5, 28);

      // 相关性模拟评分 (0-20分，基于关键词匹配度模拟)
      const relevanceScore = this.getRandomInt(8, 19);

      // 综合线索评分 (0-100)
      const leadScore = Math.min(
        100,
        followerScore + engagementScore + contentScore + relevanceScore
      );

      leads.push({
        id: String(item.id),
        platform,
        username: String(item.username || ''),
        displayName: String(item.displayName || ''),
        followers,
        engagementRate,
        contentScore,
        relevanceScore,
        leadScore,
        avatarUrl: item.avatarUrl ? String(item.avatarUrl) : undefined,
        bio: item.bio ? String(item.bio) : undefined,
        lastActiveAt: String(item.lastActiveAt || new Date().toISOString()),
      });
    }

    return leads;
  }

  /**
   * 构建线索评分分布统计
   */
  private buildScoreDistribution(leads: LeadItem[]): Record<string, number> {
    const buckets = {
      '90-100': 0,
      '70-89': 0,
      '50-69': 0,
      '30-49': 0,
      '0-29': 0,
    };

    for (const lead of leads) {
      if (lead.leadScore >= 90) buckets['90-100']++;
      else if (lead.leadScore >= 70) buckets['70-89']++;
      else if (lead.leadScore >= 50) buckets['50-69']++;
      else if (lead.leadScore >= 30) buckets['30-49']++;
      else buckets['0-29']++;
    }

    return buckets;
  }

  /** 模拟随机延迟（毫秒） */
  private simulateDelay(min: number, max: number): Promise<void> {
    const ms = this.getRandomInt(min, max);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** 生成指定范围的随机整数 [min, max] */
  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
