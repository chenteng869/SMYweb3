import { Injectable, Logger } from '@nestjs/common';
import { PlatformAdapter } from './platform-adapter.interface';
import {
  PlatformCollectOptions,
  RawLead,
  NormalizedLead,
  DouyinRawData,
} from '../types/acquisition.types';

/**
 * 抖音（Douyin/TikTok China）平台适配器
 *
 * 负责从抖音平台采集创作者/达人数据和标准化处理
 * 当前为 Mock 实现，Phase 3 将接入抖音开放平台 API
 */
@Injectable()
export class DouyinAdapter implements PlatformAdapter {
  readonly platformName = 'douyin';
  private readonly logger = new Logger(DouyinAdapter.name);

  /**
   * 从抖音获取创作者/达人线索数据
   *
   * TODO (Phase 3): 接入抖音开放平台 API
   * - 申请抖音开放平台开发者账号并创建应用
   * - 使用 OAuth 2.0 获取用户授权 access_token
   * - 调用用户搜索接口搜索创作者
   * - 调用用户详情接口获取完整用户信息
   * - 注意接口调用频率限制和配额管理
   * - 需要处理反爬虫机制和数据签名验证
   *
   * @param query 搜索关键词（支持话题、用户名、标签）
   * @param options 可选参数（如分类、地域、粉丝数范围等）
   * @returns 原始抖音用户数据数组
   */
  async fetchLeads(query: string, options?: PlatformCollectOptions): Promise<RawLead[]> {
    this.logger.log(`[抖音] 开始采集，查询: ${query}，选项: ${JSON.stringify(options)}`);

    // TODO (Phase 3): 替换为真实 API 调用
    // const accessToken = await this.getAccessToken();
    // const response = await fetch(
    //   `https://open.douyin.com/oauth/userinfo/search?keyword=${encodeURIComponent(query)}&count=${options?.limit || 20}&access_token=${accessToken}`,
    //   { headers: { 'Content-Type': 'application/json' } }
    // );

    const mockData = this.generateMockDouyinData(query, options?.limit || 20);

    this.logger.log(`[抖音] 采集完成，共 ${mockData.length} 条数据`);
    return mockData;
  }

  /**
   * 将抖音原始数据标准化为 NormalizedLead 格式
   *
   * 抖音特有字段映射：
   * - uid / user_id -> uid
   * - nickname -> display_name
   * - unique_id / short_id -> username (抖音号)
   * - signature -> bio
   * - follower_count / fans_count -> follower_count
   * - following_count / follow_count -> following_count
   * - aweme_count / video_count -> post_count
   * - avatar_thumb.url_list[0] -> avatar_url
   * - share_info.share_url -> profile_url
   * - verification_type -> verification_level
   *
   * @param rawLeads 抖音原始数据数组
   * @returns 标准化后的线索数据数组
   */
  async normalizeData(rawLeads: RawLead[]): Promise<NormalizedLead[]> {
    return rawLeads.map((raw) => {
      const now = new Date();
      const dyRaw = raw as DouyinRawData;
      const rawAny = raw as Record<string, unknown>;
      const originalId =
        dyRaw.uid ||
        rawAny.user_id ||
        `dy_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      return {
        id: `douyin:${originalId}`,
        platform: 'douyin',
        displayName: dyRaw.nickname || String(rawAny.nickname || '抖音用户'),
        username: dyRaw.unique_id || dyRaw.short_id || dyRaw.douyin_id,
        bio: dyRaw.signature || dyRaw.desc || dyRaw.introduction,
        followerCount: this.parseNumber(
          dyRaw.follower_count ?? dyRaw.fans_count ?? dyRaw.follower_count_static
        ),
        followingCount: this.parseNumber(dyRaw.following_count ?? dyRaw.follow_count),
        postCount: this.parseNumber(dyRaw.aweme_count ?? dyRaw.video_count ?? dyRaw.works_count),
        engagementRate: this.calculateDouyinEngagement(raw),
        avatarUrl:
          dyRaw.avatar_thumb?.url_list?.[0] ||
          dyRaw.avatar_medium?.url_list?.[0] ||
          (rawAny.avatar_url as string | undefined),
        profileUrl:
          dyRaw.share_info?.share_url ||
          (rawAny.schema_url as string | undefined) ||
          (dyRaw.unique_id ? `https://www.douyin.com/user/${dyRaw.unique_id}` : undefined),
        lastPostAt: dyRaw.modify_time ? new Date(dyRaw.modify_time * 1000) : undefined,
        tags: this.extractDouyinTags(raw),
        contactInfo: {
          email: dyRaw.contact_info?.email,
          phone: dyRaw.contact_info?.phone,
          website: dyRaw.contact_info?.website || dyRaw.link_item?.[0]?.link,
        },
        rawJson: JSON.stringify(raw),
        collectedAt: now,
      };
    });
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 生成模拟的抖音用户数据
   * 包含中国社交媒体特有的字段和特征
   */
  private generateMockDouyinData(query: string, limit: number): RawLead[] {
    const nicknames = [
      '科技小王子',
      'AI实验室',
      '程序员日常',
      '创业笔记',
      '数码测评君',
      '财经观察室',
      '设计美学',
      '产品经理老王',
      '数据分析师小李',
      '营销干货',
      '区块链先锋',
      'Web3探索',
      'SaaS创业记',
      '跨境电商达人',
      'AI绘画师',
    ];
    const uniqueIds = [
      'techprince2024',
      'ailab_cn',
      'coder_daily',
      'startup_notes',
      'digitest',
      'finance_watch',
      'design_aesthetic',
      'pm_laowang',
      'data_analyst_li',
      'mkt_master',
      'blockchain_pioneer',
      'web3_explorer',
      'saas_founder',
      'crossborder_ec',
      'ai_artist',
    ];
    const signatures = [
      '🤖 AI技术分享 | 💻 编程教程 | 🔥 每日更新科技热点',
      '📱 数码产品深度测评 | 🎮 游戏硬件推荐 | 👇 点击关注不迷路',
      '💰 财经知识科普 | 📈 投资理财心得 | ⚠️ 不构成投资建议',
      '🎨 UI/UX 设计灵感 | ✨ 产品设计思维 | 分享好设计',
      '🚀 连续创业者 | 已融资 Pre-A | 分享创业路上的坑与经验',
      '📊 数据驱动决策 | Python / SQL / Tableau | 让数据说话',
      '🌐 Web3 入门指南 | 区块链应用案例 | MetaMask 使用教程',
      '🛒 跨境电商运营 | TikTok Shop | 独立站搭建实战',
      '🎨 AI 绘画 | Midjourney / Stable Diffusion | AIGC 工具分享',
      '💻 全栈开发 | 开源项目 | 技术博客: github.com/example',
    ];
    const locations = ['北京', '上海', '深圳', '杭州', '广州', '成都', '南京', '武汉'];
    const categories = ['科技', '教育', '生活', '娱乐', '游戏', '美食', '旅行', '时尚'];

    const count = Math.min(limit, nicknames.length);
    const results: RawLead[] = [];

    for (let i = 0; i < count; i++) {
      const fanBase = Math.floor(Math.random() * 5000000) + 10000;
      const likeTotal = Math.floor(fanBase * (Math.random() * 20 + 2));

      results.push({
        uid: `${Math.random().toString(36).substr(2, 12)}${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        user_id: Math.floor(Math.random() * 9000000000) + 1000000000,
        short_id: uniqueIds[i],
        nickname: nicknames[i],
        signature: signatures[i % signatures.length],
        avatar_thumb: {
          url_list: [`https://p3.douyincdn.com/img/mock_avatar_${i}_300x300~c5_300x300.jpeg`],
        },
        avatar_medium: {
          url_list: [`https://p3.douyincdn.com/img/mock_avatar_${i}_500x500~c5_500x500.jpeg`],
        },
        follower_count: fanBase,
        following_count: Math.floor(fanBase * (Math.random() * 0.05 + 0.001)),
        follow_count: Math.floor(fanBase * (Math.random() * 0.05 + 0.001)),
        aweme_count: Math.floor(Math.random() * 500) + 30,
        video_count: Math.floor(Math.random() * 300) + 10,
        works_count: Math.floor(Math.random() * 200) + 5,
        total_favorited: likeTotal,
        verification_type: Math.random() > 0.6 ? 1 : 0,
        location: locations[Math.floor(Math.random() * locations.length)],
        category: categories[Math.floor(Math.random() * categories.length)],
        modify_time: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 30),
        share_info: {
          share_url: `https://v.douyin.com/${uniqueIds[i]}/`,
        },
        schema_url: `https://www.douyin.com/user/MS4wLjABAAAA${Math.random().toString(36).substr(2, 24)}`,
        contact_info: {
          email: Math.random() > 0.7 ? `contact@${uniqueIds[i]}.com` : undefined,
          website: Math.random() > 0.8 ? `https://${uniqueIds[i]}.com` : undefined,
        },
        link_item:
          Math.random() > 0.8 ? [{ link: `https://${uniqueIds[i]}.com`, type: 'website' }] : [],
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
   * 计算抖音用户的互动率
   * 基于总点赞数/(粉丝数*作品数) 估算
   */
  private calculateDouyinEngagement(raw: DouyinRawData): number {
    const fans = raw.follower_count ?? raw.fans_count ?? 0;
    const videos = raw.aweme_count ?? raw.video_count ?? 0;
    const totalLikes = raw.total_favorited ?? 0;

    if (fans === 0 || videos === 0) return undefined;

    // 平均每视频点赞数 / 粉丝数
    const avgLikesPerVideo = totalLikes / videos;
    const engagementRatio = avgLikesPerVideo / fans;

    // 归一化到 0-1（抖音互动率通常较高）
    return parseFloat(Math.min(engagementRatio * 5, 1).toFixed(4));
  }

  /**
   * 从抖音数据中提取标签
   * 支持中文关键词匹配
   */
  private extractDouyinTags(raw: DouyinRawData): string[] {
    const text = `${raw.signature || ''} ${raw.nickname || ''} ${raw.category || ''}`.toLowerCase();
    const keywords = [
      'AI',
      '人工智能',
      '编程',
      '开发',
      '创业',
      '投资',
      '区块链',
      'Web3',
      '加密',
      '科技',
      '互联网',
      '电商',
      '营销',
      '数据',
      '设计',
      '产品',
      'SaaS',
      '金融',
      '教育',
      '自媒体',
    ];

    return keywords.filter((kw) => text.includes(kw.toLowerCase()));
  }
}
