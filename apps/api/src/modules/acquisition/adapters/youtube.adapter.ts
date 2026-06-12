import { Injectable, Logger } from '@nestjs/common';
import { PlatformAdapter } from './platform-adapter.interface';
import {
  PlatformCollectOptions,
  RawLead,
  NormalizedLead,
  YoutubeRawData,
} from '../types/acquisition.types';

/**
 * YouTube 平台适配器
 *
 * 负责从 YouTube 平台采集频道/创作者数据和标准化处理
 * 当前为 Mock 实现，Phase 3 将接入 YouTube Data API v3
 */
@Injectable()
export class YoutubeAdapter implements PlatformAdapter {
  readonly platformName = 'youtube';
  private readonly logger = new Logger(YoutubeAdapter.name);

  /**
   * 从 YouTube 获取频道/创作者线索数据
   *
   * TODO (Phase 3): 接入 YouTube Data API v3
   * - 使用 API Key 认证
   * - 调用 search.list 接口搜索频道
   * - 调用 channels.list 获取频道详细信息
   * - 处理分页（pageToken）和 quota 限制（每日 10,000 units）
   * - 支持按视频内容类型筛选
   *
   * @param query 搜索关键词
   * @param options 可选参数（如地区、语言、视频类别等）
   * @returns 原始 YouTube 频道数据数组
   */
  async fetchLeads(query: string, options?: PlatformCollectOptions): Promise<RawLead[]> {
    this.logger.log(`[YouTube] 开始采集，查询: ${query}，选项: ${JSON.stringify(options)}`);

    // TODO (Phase 3): 替换为真实 API 调用
    // const searchResponse = await fetch(
    //   `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=${options?.limit || 20}&key=${this.apiKey}`
    // );
    // const channelIds = searchResponse.items.map(item => item.id.channelId);
    // const channelsResponse = await fetch(
    //   `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet,brandingSettings&id=${channelIds.join(',')}&key=${this.apiKey}`
    // );

    const mockChannels = this.generateMockYoutubeData(query, options?.limit || 20);

    this.logger.log(`[YouTube] 采集完成，共 ${mockChannels.length} 条数据`);
    return mockChannels;
  }

  /**
   * 将 YouTube 原始数据标准化为 NormalizedLead 格式
   *
   * YouTube 特有字段映射：
   * - id -> channel_id
   * - snippet.title -> display_name
   * - snippet.customUrl / snippet.customUrl -> username
   * - snippet.description -> bio
   * - statistics.subscriberCount -> follower_count
   * - statistics.videoCount -> post_count
   * - statistics.viewCount -> view_count (额外字段)
   * - snippet.thumbnails.high.url -> avatar_url
   *
   * @param rawLeads YouTube 原始数据数组
   * @returns 标准化后的线索数据数组
   */
  async normalizeData(rawLeads: RawLead[]): Promise<NormalizedLead[]> {
    return rawLeads.map((raw) => {
      const now = new Date();
      const rawAny = raw as Record<string, unknown>;
      const ytRaw = raw as YoutubeRawData;
      const originalId =
        rawAny.id ||
        rawAny.channel_id ||
        `yt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      return {
        id: `youtube:${originalId}`,
        platform: 'youtube',
        displayName: ytRaw.snippet?.title || String(rawAny.title || 'YouTube 频道'),
        username:
          ytRaw.snippet?.customUrl?.replace('@', '') || (rawAny.custom_url as string | undefined),
        bio: ytRaw.snippet?.description || (rawAny.description as string | undefined),
        followerCount: this.parseNumber(
          ytRaw.statistics?.subscriberCount ?? rawAny.subscriber_count
        ),
        followingCount: undefined, // YouTube 无关注数概念
        postCount: this.parseNumber(ytRaw.statistics?.videoCount ?? rawAny.video_count),
        engagementRate: this.calculateYoutubeEngagement(raw),
        avatarUrl:
          ytRaw.snippet?.thumbnails?.high?.url ||
          ytRaw.snippet?.thumbnails?.medium?.url ||
          (rawAny.avatar_url as string | undefined),
        profileUrl: ytRaw.snippet?.customUrl
          ? `https://www.youtube.com/${ytRaw.snippet.customUrl}`
          : `https://www.youtube.com/channel/${originalId}`,
        lastPostAt:
          ytRaw.statistics &&
          typeof ytRaw.statistics.videoCount === 'number' &&
          ytRaw.statistics.videoCount > 0
            ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
            : undefined,
        tags: this.extractYoutubeTags(raw),
        contactInfo: {
          email:
            (rawAny.brandingSettings as any)?.channel?.email ||
            (rawAny.contact_email as string | undefined),
          website:
            (rawAny.brandingSettings as any)?.channel?.keyword ||
            (rawAny.website as string | undefined),
          phone: undefined,
        },
        rawJson: JSON.stringify(raw),
        collectedAt: now,
      };
    });
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 生成模拟的 YouTube 频道数据
   */
  private generateMockYoutubeData(query: string, limit: number): RawLead[] {
    const channelNames = [
      'TechVision AI',
      'Crypto Insights Daily',
      'Startup Stories',
      'Code with Mike',
      'Data Science Hub',
      'Web3 Explained',
      'SaaS Masterclass',
      'Fintech Fridays',
      'The AI Revolution',
      'Blockchain Basics',
      'Growth Hacking Pro',
      'DevOps Diaries',
      'Machine Learning Lab',
      'Digital Marketing Tips',
      'Product Management 101',
    ];
    const customUrls = [
      '@techvisionai',
      '@cryptoinsights',
      '@startupstories',
      '@codewithmike',
      '@datasciencehub',
      '@web3explained',
      '@saasmasterclass',
      '@fintechfridays',
      '@tairevolution',
      '@blockchainbasics',
      '@growthhackingpro',
      '@devopsdiaries',
      '@mlab_online',
      '@digtips',
      '@pm101',
    ];
    const descriptions = [
      '探索人工智能前沿技术，每周更新深度教程和行业分析。订阅获取最新 AI 资讯！',
      '每日加密货币市场分析，DeFi 教程，区块链项目评测。带你了解 Web3 世界。',
      '分享创业故事和商业洞察，访谈成功创业者，提供实用创业建议。',
      '编程教学频道，覆盖前端、后端、全栈开发。让编程变得简单有趣。',
      '数据科学和机器学习教程，Python/R 实战项目，数据分析案例分享。',
      '深入浅出讲解 Web3 和区块链技术，从零开始学习去中心化应用开发。',
      'SaaS 产品运营实战经验分享，增长策略，用户获取，变现模式解析。',
      '金融科技行业动态，支付系统分析，数字银行趋势，每周五更新。',
    ];

    const count = Math.min(limit, channelNames.length);
    const results: RawLead[] = [];

    for (let i = 0; i < count; i++) {
      const subscriberBase = Math.floor(Math.random() * 2000000) + 5000;
      const videoCount = Math.floor(Math.random() * 500) + 20;
      const totalViews = Math.floor(subscriberBase * videoCount * (Math.random() * 5 + 2));

      results.push({
        id: `yt_mock_${Date.now()}_${i}`,
        channel_id: `UC${Math.random().toString(36).substr(2, 22)}`,
        snippet: {
          title: channelNames[i],
          customUrl: customUrls[i],
          description: descriptions[i % descriptions.length],
          publishedAt: new Date(
            Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 6
          ).toISOString(),
          thumbnails: {
            default: { url: `https://yt3.ggpht.com/mock_channel_${i}_default.jpg` },
            medium: { url: `https://yt3.ggpht.com/mock_channel_${i}_medium.jpg` },
            high: { url: `https://yt3.ggpht.com/mock_channel_${i}_high.jpg` },
          },
          localized: { title: channelNames[i], description: descriptions[i % descriptions.length] },
          country: ['US', 'CN', 'JP', 'KR', 'GB', 'DE'][Math.floor(Math.random() * 6)],
        },
        statistics: {
          subscriberCount: subscriberBase,
          viewCount: totalViews,
          videoCount: videoCount,
          commentCount: Math.floor(totalViews * 0.001),
          hiddenSubscriberCount: false,
        },
        brandingSettings: {
          channel: {
            title: channelNames[i],
            keyword: `tech, ${query}, tutorial`,
            email: `contact@${customUrls[i].replace('@', '')}.com`,
          },
        },
        _meta: { source: 'mock', query },
      });
    }

    return results;
  }

  private parseNumber(value: unknown): number | undefined {
    if (value === undefined || value === null) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  /**
   * 计算 YouTube 频道的互动率
   * 基于观看数/订阅数比值估算
   */
  private calculateYoutubeEngagement(raw: YoutubeRawData): number {
    const subscribers = raw.statistics?.subscriberCount
      ? parseInt(String(raw.statistics.subscriberCount), 10)
      : raw.subscriber_count || 0;
    const views = raw.statistics?.viewCount
      ? parseInt(String(raw.statistics.viewCount), 10)
      : raw.view_count || 0;
    const videos = raw.statistics?.videoCount
      ? parseInt(String(raw.statistics.videoCount), 10)
      : raw.video_count || 0;

    if (subscribers === 0 || videos === 0) return undefined;

    // 平均每视频观看数 / 订阅数 ≈ 互动率指标
    const avgViewsPerVideo = views / videos;
    const engagementRatio = avgViewsPerVideo / subscribers;

    // 归一化到 0-1 范围
    return parseFloat(Math.min(engagementRatio * 10, 1).toFixed(4));
  }

  /**
   * 从 YouTube 数据中提取标签
   */
  private extractYoutubeTags(raw: YoutubeRawData): string[] {
    const rawRecord = raw as Record<string, unknown>;
    const branding = (rawRecord.brandingSettings as Record<string, unknown>) || {};
    const channelInfo = (branding.channel as Record<string, unknown>) || {};
    const keyword = (channelInfo.keyword as string) || '';

    const text =
      `${raw.snippet?.description || ''} ${raw.snippet?.title || ''} ${keyword}`.toLowerCase();
    const keywords = [
      'AI',
      'tutorial',
      'programming',
      'crypto',
      'blockchain',
      'web3',
      'startup',
      'business',
      'technology',
      'data science',
      'machine learning',
      'fintech',
      'saas',
      'marketing',
      'education',
      'development',
    ];

    return keywords.filter((kw) => text.includes(kw.toLowerCase()));
  }
}
