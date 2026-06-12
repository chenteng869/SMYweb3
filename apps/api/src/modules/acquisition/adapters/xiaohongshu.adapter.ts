import { Injectable, Logger } from '@nestjs/common';
import { PlatformAdapter } from './platform-adapter.interface';
import {
  PlatformCollectOptions,
  RawLead,
  NormalizedLead,
  XiaohongshuRawData,
} from '../types/acquisition.types';

/**
 * 小红书（Xiaohongshu / Little Red Book / RED）平台适配器
 *
 * 负责从小红书平台采集博主/达人和笔记数据并标准化处理
 * 小红书具有社交+电商混合属性，数据结构较为特殊
 * 当前为 Mock 实现，Phase 3 将接入小红书开放平台 API
 */
@Injectable()
class XiaohongshuAdapter implements PlatformAdapter {
  readonly platformName = 'xiaohongshu';
  private readonly logger = new Logger(XiaohongshuAdapter.name);

  /**
   * 从小红书获取博主/达人线索数据
   *
   * TODO (Phase 3): 接入小红书开放平台 API / 商业平台 API
   * - 申请小红书开放平台或广告平台开发者权限
   * - 获取 App Key 和 App Secret 进行 OAuth 认证
   * - 调用搜索接口搜索用户/笔记
   * - 调用用户详情接口获取博主信息（粉丝数、笔记数、获赞数等）
   * - 获取博主的电商数据（商品橱窗、直播带货等）
   * - 注意：小红书对爬虫有严格的反爬措施，建议优先使用官方 API
   *
   * @param query 搜索关键词（支持话题、用户名、品类）
   * @param options 可选参数（如品类、粉丝数范围、是否含电商数据等）
   * @returns 原始小红书用户数据数组
   */
  async fetchLeads(query: string, options?: PlatformCollectOptions): Promise<RawLead[]> {
    this.logger.log(`[小红书] 开始采集，查询: ${query}，选项: ${JSON.stringify(options)}`);

    // TODO (Phase 3): 替换为真实 API 调用
    // const accessToken = await this.getXhsAccessToken();
    // const response = await fetch(
    //   `https://edith.xiaohongshu.com/api/sns/web/v1/search/notes?keyword=${encodeURIComponent(query)}&page=1&page_size=${options?.limit || 20}&access_token=${accessToken}`,
    //   { headers: { ...this.buildHeaders() } }
    // );

    const mockData = this.generateMockXiaohongshuData(query, options?.limit || 20);

    this.logger.log(`[小红书] 采集完成，共 ${mockData.length} 条数据`);
    return mockData;
  }

  /**
   * 将小红书原始数据标准化为 NormalizedLead 格式
   *
   * 小红书特有字段映射：
   * - user_id / userId -> user_id
   * - nickname -> display_name
   * - red_id / xhs_id -> username (小红书号)
   * - desc / desc_text -> bio
   * - fans / follower_count -> follower_count
   * - interaction / follows -> following_count
   - - note_count / notes_count -> post_count
   * - liked / interactions.liked -> total_likes (额外字段)
   * - image / avatar -> avatar_url
   * - 小红书特有的电商数据：shop_info, live_info, ad_coop
   *
   * @param rawLeads 小红书原始数据数组
   * @returns 标准化后的线索数据数组
   */
  async normalizeData(rawLeads: RawLead[]): Promise<NormalizedLead[]> {
    return rawLeads.map((raw) => {
      const now = new Date();
      const rawAny = raw as Record<string, unknown>;
      const xhsRaw = raw as XiaohongshuRawData;
      const originalId =
        rawAny.user_id ||
        rawAny.userId ||
        rawAny.red_id ||
        `xhs_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      return {
        id: `xiaohongshu:${originalId}`,
        platform: 'xiaohongshu',
        displayName: String(rawAny.nickname || rawAny.nick_name || '小红书用户'),
        username:
          (rawAny.red_id as string | undefined) ||
          (rawAny.xhs_id as string | undefined) ||
          (rawAny.user_name as string | undefined),
        bio:
          (rawAny.desc as string | undefined) ||
          (rawAny.desc_text as string | undefined) ||
          (rawAny.introduction as string | undefined),
        followerCount: this.parseNumber(
          (rawAny.fans as number | undefined) ?? xhsRaw.follower_count ?? ((rawAny.basic as Record<string, unknown>)?.fans as number | undefined)
        ),
        followingCount: this.parseNumber(
          ((rawAny.interaction as Record<string, unknown>)?.follows as number | undefined) ?? rawAny.follows ?? rawAny.following_count
        ),
        postCount: this.parseNumber(
          rawAny.note_count ?? xhsRaw.notes_count ?? rawAny.impression_note_count
        ),
        engagementRate: this.calculateXhsEngagement(raw),
        avatarUrl:
          (rawAny.image as string | undefined) ??
          (rawAny.images as string | undefined) ??
          (rawAny.avatar as string | undefined) ??
          (rawAny.avatar_url as string | undefined),
        profileUrl:
          (rawAny.web_url as string | undefined) ||
          (rawAny.red_id ? `https://www.xiaohongshu.com/user/profile/${rawAny.red_id}` : undefined),
        lastPostAt: rawAny.latest_note_time ? new Date(String(rawAny.latest_note_time)) : undefined,
        tags: this.extractXhsTags(raw),
        contactInfo: {
          email: ((rawAny.rcmd_contact as Record<string, unknown>)?.email as string | undefined),
          phone: ((rawAny.rcmd_contact as Record<string, unknown>)?.phone as string | undefined),
          website: (rawAny.link as string | undefined) || (rawAny.home_link as string | undefined),
        },
        rawJson: JSON.stringify(raw),
        collectedAt: now,
      };
    });
  }

  private parseNumber(value: unknown): number | undefined {
    if (value === undefined || value === null) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 生成模拟的小红书博主数据
   * 小红书具有独特的社交+电商混合数据结构
   */
  private generateMockXiaohongshuData(query: string, limit: number): RawLead[] {
    const nicknames = [
      '小美穿搭日记',
      '科技测评酱',
      '健身教练阿强',
      '美食探店君',
      '职场成长录',
      '家居改造师',
      '护肤研究所',
      '摄影入门课',
      '理财小白通',
      '亲子育儿经',
      '留学申请帮',
      '宠物萌宠园',
      '读书分享会',
      '手工DIY工坊',
      '旅行攻略集',
    ];
    const redIds = [
      '123456789',
      '234567890',
      '345678901',
      '456789012',
      '567890123',
      '678901234',
      '789012345',
      '890123456',
      '901234567',
      '012345678',
      '112233445',
      '223344556',
      '334455667',
      '445566778',
      '556677889',
    ];
    const descs = [
      '✨ 日常穿搭分享 | OOTD | 小个子穿搭技巧 | 👗 合作私信',
      '📱 科技数码测评 | 新品开箱 | 性价比好物推荐 | 🔥 每周更新',
      '💪 健身教学 | 减脂增肌 | 营养饮食 | 在线指导',
      '🍜 美食探店 | 城市美食地图 | 人均XX吃撑 | 📍 定位中',
      '💼 职场干货 | 面试技巧 | 薪资谈判 | 转行经验分享',
      '🏠 家居软装 | 租房改造 | 平价好物 | ins风装修灵感',
      '🧴 护肤成分党 | 敏感肌护理 | 平价替代 | 科学种草',
      '📷 手机摄影 | 后期修图 | 构图技巧 | 0基础学摄影',
      '💰 理财入门 | 基金定投 | 存钱方法 | 月光族自救指南',
      '👶 育儿经验 | 辅食食谱 | 亲子游戏 | 宝妈日常',
    ];
    const locations = ['上海', '北京', '杭州', '成都', '广州', '深圳', '南京', '武汉'];
    const categories = [
      '穿搭',
      '数码',
      '运动健身',
      '美食',
      '职场',
      '家居家装',
      '美妆护肤',
      '摄影',
      '科学科普',
      '母婴亲子',
    ];
    // 小红书特有的认证类型
    const verifyTypes = ['个人认证', '机构认证', '品牌认证', '企业认证', null];

    const count = Math.min(limit, nicknames.length);
    const results: RawLead[] = [];

    for (let i = 0; i < count; i++) {
      const fanBase = Math.floor(Math.random() * 2000000) + 5000;
      const noteCount = Math.floor(Math.random() * 300) + 20;
      const totalLiked = Math.floor(fanBase * noteCount * (Math.random() * 0.05 + 0.01));
      const totalCollected = Math.floor(totalLiked * (Math.random() * 0.3 + 0.1));

      results.push({
        user_id: Math.floor(Math.random() * 90000000000000) + 10000000000000,
        userId: Math.floor(Math.random() * 90000000000000) + 10000000000000,
        red_id: redIds[i],
        nickname: nicknames[i],
        desc: descs[i % descs.length],
        image: `https://sns-webpic-qc.xhscdn.com/mock_avatar_${i}_1080x1080.jpg`,
        images: [
          `https://sns-webpic-qc.xhscdn.com/mock_avatar_${i}_1080x1080.jpg`,
          `https://sns-webpic-qc.xhscdn.com/mock_avatar_${i}_180x180.jpg`,
        ],
        basic: {
          fans: fanBase,
          follows: Math.floor(fanBase * (Math.random() * 0.03 + 0.002)),
          interaction: Math.floor(totalLiked + totalCollected),
        },
        fans: fanBase,
        interaction: {
          follows: Math.floor(fanBase * (Math.random() * 0.03 + 0.002)),
          liked: totalLiked,
        },
        note_count: noteCount,
        notes_count: noteCount,
        impression_note_count: noteCount + Math.floor(Math.random() * 50),
        liked: totalLiked,
        collected: totalCollected,
        ip_location: locations[Math.floor(Math.random() * locations.length)],
        category: categories[i],
        verify_info: verifyTypes[Math.floor(Math.random() * verifyTypes.length)]
          ? { type: verifyTypes[Math.floor(Math.random() * verifyTypes.length)], desc: '认证博主' }
          : null,
        latest_note_time: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        web_url: `https://www.xiaohongshu.com/user/profile/${redIds[i]}`,
        // 小红书特有：电商相关数据
        shop_info:
          Math.random() > 0.7
            ? {
                has_shop: true,
                shop_name: `${nicknames[i]}的店铺`,
                product_count: Math.floor(Math.random() * 50) + 5,
                monthly_sales: Math.floor(Math.random() * 10000) + 100,
              }
            : { has_shop: false },
        live_info:
          Math.random() > 0.6
            ? {
                is_live_streamer: true,
                monthly_live_count: Math.floor(Math.random() * 8) + 1,
                avg_viewers: Math.floor(Math.random() * 10000) + 100,
                gmv_monthly: Math.floor(Math.random() * 500000) + 10000,
              }
            : { is_live_streamer: false },
        ad_coop:
          Math.random() > 0.5
            ? {
                accepts_ads: true,
                min_price: Math.floor(Math.random() * 50000) + 1000,
                categories: [categories[i], '其他'],
              }
            : { accepts_ads: false },
        rcmd_contact:
          Math.random() > 0.8
            ? {
                email: `contact_xhs${redIds[i]}@example.com`,
                wechat: `xhs_${redIds[i]}`,
              }
            : undefined,
        link: Math.random() > 0.85 ? `https://link.xiaohongshu.com/p/${redIds[i]}` : undefined,
        _meta: { source: 'mock', query },
      });
    }

    return results;
  }

  /**
   * 计算小红书博主的互动率
   * 小红书的特点是收藏数很高，需要综合考虑点赞和收藏
   */
  private calculateXhsEngagement(raw: XiaohongshuRawData): number {
    const rawAny = raw as Record<string, unknown>;
    const fans = Number(
      (rawAny.fans as number | undefined) ?? (raw as Record<string, unknown>).follower_count ?? ((rawAny.basic as Record<string, unknown>)?.fans as number | undefined) ?? 0
    );
    const notes = Number(rawAny.note_count ?? (raw as Record<string, unknown>).notes_count ?? 0);
    const liked = Number((rawAny.liked as number | undefined) ?? ((rawAny.interaction as Record<string, unknown>)?.liked as number | undefined) ?? 0);
    const collected = Number((rawAny.collected as number | undefined) ?? 0);

    if (fans === 0 || notes === 0) return undefined;

    // 小红书综合互动 = (点赞 + 收藏) / (粉丝数 * 笔记数)
    // 小红书的收藏率通常较高，权重调低一些
    const totalInteraction = liked + collected * 0.5; // 收藏权重减半
    const avgInteractionPerNote = totalInteraction / notes;
    const engagementRatio = avgInteractionPerNote / fans;

    return parseFloat(Math.min(engagementRatio * 15, 1).toFixed(4));
  }

  /**
   * 从小红书数据中提取标签
   * 支持中文关键词和品类匹配
   */
  private extractXhsTags(raw: XiaohongshuRawData): string[] {
    const rawAny = raw as Record<string, unknown>;
    const text = `${(rawAny.desc as string) || ''} ${(rawAny.nickname as string) || ''} ${(rawAny.category as string) || ''}`.toLowerCase();
    const keywords = [
      '穿搭',
      'OOTD',
      '数码',
      '测评',
      '健身',
      '减肥',
      '美食',
      '探店',
      '职场',
      '面试',
      '家居',
      '装修',
      '护肤',
      '彩妆',
      '摄影',
      '理财',
      '投资',
      '育儿',
      '亲子',
      '留学',
      '宠物',
      '读书',
      '手工',
      '旅行',
      'AI',
      '科技',
      '创业',
      '电商',
      '带货',
      '直播',
      '种草',
      '好物',
    ];

    return keywords.filter((kw) => text.includes(kw.toLowerCase()));
  }
}

export { XiaohongshuAdapter };
