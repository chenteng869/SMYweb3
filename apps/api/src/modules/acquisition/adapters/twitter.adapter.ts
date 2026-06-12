import { Injectable, Logger } from '@nestjs/common';
import { PlatformAdapter } from './platform-adapter.interface';
import {
  PlatformCollectOptions,
  RawLead,
  NormalizedLead,
  TwitterRawData,
} from '../types/acquisition.types';

/**
 * Twitter/X 平台适配器
 *
 * 负责从 Twitter/X 平台采集用户数据和标准化处理
 * 当前为 Mock 实现，Phase 3 将接入 Twitter API v2
 */
@Injectable()
export class TwitterAdapter implements PlatformAdapter {
  readonly platformName = 'twitter';
  private readonly logger = new Logger(TwitterAdapter.name);

  /**
   * 从 Twitter 获取用户线索数据
   *
   * TODO (Phase 3): 接入 Twitter API v2
   * - 使用 OAuth 2.0 Bearer Token 认证
   * - 调用 /2/users/search 或 /2/tweets/search/recent 接口
   * - 处理分页（next_token）和速率限制
   * - 实现错误重试和退避策略
   *
   * @param query 搜索关键词或查询条件
   * @param options 可选参数（如语言、地区等）
   * @returns 原始 Twitter 用户数据数组
   */
  async fetchLeads(query: string, options?: PlatformCollectOptions): Promise<RawLead[]> {
    this.logger.log(`[Twitter] 开始采集，查询: ${query}，选项: ${JSON.stringify(options)}`);

    // TODO (Phase 3): 替换为真实 API 调用
    // const response = await fetch(
    //   `https://api.twitter.com/2/users/search?query=${encodeURIComponent(query)}`,
    //   { headers: { Authorization: `Bearer ${this.bearerToken}` } }
    // );

    // Mock 数据 - 模拟返回的 Twitter 用户数据结构
    const mockUsers = this.generateMockTwitterData(query, options?.limit || 20);

    this.logger.log(`[Twitter] 采集完成，共 ${mockUsers.length} 条数据`);
    return mockUsers;
  }

  /**
   * 将 Twitter 原始数据标准化为 NormalizedLead 格式
   *
   * Twitter 特有字段映射：
   * - id -> user_id
   * - name -> display_name
   * - username -> handle (@xxx)
   * - description -> bio
   * - public_metrics.followers_count -> follower_count
   * - public_metrics.following_count -> following_count
   * - public_metrics.tweet_count -> post_count
   * - profile_image_url -> avatar_url
   * - url / profile_url -> profile_url
   *
   * @param rawLeads Twitter 原始数据数组
   * @returns 标准化后的线索数据数组
   */
  async normalizeData(rawLeads: RawLead[]): Promise<NormalizedLead[]> {
    return rawLeads.map((raw) => {
      const now = new Date();
      const rawAny = raw as Record<string, unknown>;
      const originalId =
        rawAny.id ||
        rawAny.user_id ||
        `tw_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      return {
        id: `twitter:${originalId}`,
        platform: 'twitter',
        displayName: String(rawAny.name || rawAny.display_name || 'Twitter 用户'),
        username:
          (rawAny.username as string | undefined) ||
          (rawAny.handle as string | undefined) ||
          (rawAny.screen_name as string | undefined),
        bio: (rawAny.description as string | undefined) || (rawAny.bio as string | undefined),
        followerCount: this.parseNumber(
          (raw as TwitterRawData).public_metrics?.followers_count ?? rawAny.followers_count
        ),
        followingCount: this.parseNumber(
          (raw as TwitterRawData).public_metrics?.following_count ?? rawAny.following_count
        ),
        postCount: this.parseNumber(
          (raw as TwitterRawData).public_metrics?.tweet_count ??
            rawAny.tweets_count ??
            rawAny.statuses_count
        ),
        engagementRate: this.calculateTwitterEngagement(raw),
        avatarUrl:
          (rawAny.profile_image_url as string)?.replace('_normal', '_400x400') ||
          (rawAny.avatar_url as string | undefined),
        profileUrl:
          (rawAny.url as string | undefined) ||
          (rawAny.profile_url as string | undefined) ||
          (rawAny.username ? `https://twitter.com/${rawAny.username}` : undefined),
        lastPostAt:
          rawAny.last_tweet_at || rawAny.latest_status_time
            ? new Date(String(rawAny.last_tweet_at || rawAny.latest_status_time))
            : undefined,
        tags: this.extractTwitterTags(raw),
        contactInfo: {
          email:
            (rawAny.email as string | undefined) ||
            (raw as TwitterRawData).entities?.description?.urls?.[0]?.display_url,
          website: (rawAny.website as string | undefined) || (rawAny.url as string | undefined),
          phone: undefined, // Twitter 通常不公开电话
        },
        rawJson: JSON.stringify(raw),
        collectedAt: now,
      };
    });
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 生成模拟的 Twitter 用户数据
   * 用于开发和测试阶段，Phase 3 将替换为真实 API
   */
  private generateMockTwitterData(query: string, limit: number): RawLead[] {
    const names = [
      'Alex Chen',
      'Sarah Wang',
      'Mike Johnson',
      'Emily Liu',
      'David Zhang',
      'Jessica Li',
      'Kevin Brown',
      'Amanda Wu',
      'Chris Taylor',
      'Michelle Huang',
      'Ryan Kim',
      'Laura Anderson',
      'Brian Lee',
      'Nicole Park',
      'Steven Wang',
    ];
    const handles = [
      'alexchen_tech',
      'sarahw_dev',
      'mikej_crypto',
      'emilyl_ai',
      'davidz_web3',
      'jessical_design',
      'kevinb_saas',
      'amandaw_product',
      'christ_startup',
      'michelleh_growth',
      'ryank_invest',
      'lauraa_marketing',
      'brianl_engineer',
      'nicolep_data',
      'stevew_blockchain',
    ];
    const bios = [
      'AI researcher | Building the future of intelligent systems | Open to collaborations',
      'Web3 enthusiast | DeFi builder | Sharing insights on blockchain technology',
      'Startup founder | SaaS product lead | Passionate about user experience',
      'Tech investor | Angel investing in AI & crypto | DM for pitches',
      'Full-stack developer | Open source contributor | Writing about tech trends',
      'Product manager at a fintech startup | Fintech & payments enthusiast',
      'Growth hacker | Marketing automation expert | Helping startups scale',
      'Data scientist | ML engineer | Exploring LLM applications',
      'Entrepreneur | Built 3 companies | Mentoring first-time founders',
      'Content creator | Tech blogger | 50K+ followers across platforms',
    ];

    const count = Math.min(limit, names.length);
    const results: RawLead[] = [];

    for (let i = 0; i < count; i++) {
      const followerBase = Math.floor(Math.random() * 500000) + 1000;
      results.push({
        id: `tw_mock_${Date.now()}_${i}`,
        name: names[i],
        username: handles[i],
        description: bios[i % bios.length],
        public_metrics: {
          followers_count: followerBase,
          following_count: Math.floor(followerBase * (Math.random() * 0.1 + 0.02)),
          tweet_count: Math.floor(followerBase * (Math.random() * 0.5 + 0.1)),
          listed_count: Math.floor(Math.random() * 100),
        },
        profile_image_url: `https://pbs.twimg.com/profile_images/mock_${i}_400x400.jpg`,
        url: `https://twitter.com/${handles[i]}`,
        created_at: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 5
        ).toISOString(),
        verified: Math.random() > 0.7,
        location: ['San Francisco', 'New York', 'London', 'Singapore', 'Beijing', 'Shanghai'][
          Math.floor(Math.random() * 6)
        ],
        last_tweet_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
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
   * 计算 Twitter 用户的互动率
   * 基于粉丝数与推文数的比例估算
   */
  private calculateTwitterEngagement(raw: TwitterRawData): number {
    const followers = raw.public_metrics?.followers_count || raw.followers_count || 0;
    const tweets = raw.public_metrics?.tweet_count || raw.tweets_count || 0;

    if (followers === 0 || tweets === 0) return undefined;

    // 粗略估算平均互动率（基于典型 Twitter 数据分布）
    const avgEngagementPerTweet = Math.min(0.08, (1000 / followers) * (1 + Math.random() * 0.03));
    return parseFloat(avgEngagementPerTweet.toFixed(4));
  }

  /**
   * 从 Twitter 数据中提取标签
   * 基于简介文本进行关键词提取
   */
  private extractTwitterTags(raw: TwitterRawData): string[] {
    const text = `${raw.description || ''} ${raw.name || ''}`.toLowerCase();
    const keywords = [
      'AI',
      'ML',
      'crypto',
      'blockchain',
      'web3',
      'defi',
      'nft',
      'startup',
      'saas',
      'fintech',
      'developer',
      'investor',
      'entrepreneur',
      'product',
      'design',
      'marketing',
      'growth',
      'data',
      'open source',
    ];

    return keywords.filter((kw) => text.includes(kw.toLowerCase()));
  }
}
