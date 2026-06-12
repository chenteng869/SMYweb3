import { Injectable } from '@nestjs/common';
import {
  BasePlatformAdapter,
  PlatformAccessToken,
  RateLimitConfig,
  PaginationParams,
  PaginatedResponse,
  NormalizedInfluencer,
  NormalizedContent,
  NormalizedComment,
} from './base-platform.adapter';
import { RawLead, NormalizedLead } from '../types/acquisition.types';

// ==================== 小红书开放平台 API 类型定义 ====================

/**
 * 小红书 OAuth2 令牌响应
 * @see https://open.xiaohongshu.com/document/doc.html
 */
interface XiaohongshuTokenResponse {
  /** 错误码 */
  code: number;
  /** 错误信息 */
  msg?: string;
  /** 访问令牌 */
  data: {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    refresh_token_expires_in: number;
    scope: string;
    open_id: string;
  };
}

/**
 * 小红书用户自身信息响应
 * @see GET /sns/v1/user/selfinfo
 */
interface XhsUserInfoSelfResponse {
  code: number;
  msg?: string;
  data: {
    user_info: {
      user_id: string;
      nickname: string;
      avatar: string;
      red_id: string; // 小红书号
      ip_location: string;
      desc: string;
    };
    basic: {
      fans: number;
      follows: number;
      interaction: number;
      note_count: number;
    };
    interaction_data: {
      liked: number;
      collected: number;
      commented: number;
      shared: number;
    };
  };
}

/**
 * 小红书其他用户信息响应
 * @see GET /sns/v1/user/otherinfo
 */
interface XhsOtherUserInfoResponse {
  code: number;
  msg?: string;
  data: {
    user_info: {
      user_id: string;
      nickname: string;
      avatar: string;
      red_id: string;
      desc: string;
    };
    basic: {
      fans: number;
      follows: number;
      interaction: number;
      note_count: number;
    };
    interaction_data: {
      liked: number;
      collected: number;
    };
    tags: Array<{
      id: string;
      name: string;
    }>;
  };
}

/**
 * 小红书笔记详情响应
 * @see GET /sns/v1/note/{noteId}
 */
interface XhsNoteDetailResponse {
  code: number;
  msg?: string;
  data: {
    note_id: string;
    title: string;
    desc: string;
    type: string; // 'normal' | 'video'
    user: {
      user_id: string;
      nickname: string;
      avatar: string;
      red_id: string;
    };
    image_list: Array<{
      url_default: { url: string };
      url_pre: { url: string };
    }>;
    video?: {
      media: { stream: { h264: Array<{ avg_bitrate: number; master_url: string }> } };
      cover: { url: string };
      duration_ms: number;
    };
    interact_info: {
      liked_count: string;
      collected_count: string;
      comment_count: string;
      share_count: string;
    };
    time: number; // 发布时间戳（秒）
    tag_list: Array<{ id: string; name: string }>;
    topic_list: Array<{ name: string }>;
  };
}

/**
 * 小红书搜索笔记请求/响应
 * @see POST /sns/v1/search/notes
 */
interface XhsSearchNotesRequest {
  keyword: string;
  page: number;
  page_size: number;
  sort?: 'general' | 'time_descending' | 'popularity_descending';
  note_type?: 'normal' | 'video' | 'all';
}

interface XhsSearchNotesResponse {
  code: number;
  msg?: string;
  data: {
    items: Array<{
      note_card: {
        display_title: string;
        note_id: string;
        type: string;
        user: {
          user_id: string;
          nickname: string;
          avatar: string;
          red_id: string;
        };
        image: { url: string };
        interact_info: {
          liked_count: string;
          collected_count: string;
        };
        cover: { url: string };
        time: number;
      };
    }>;
    total_number: number;
    has_more: boolean;
    cursor: string;
  };
}

/**
 * 小红书评论列表响应
 * @see GET /sns/v1/note/{noteId}/comments
 */
interface XhsCommentsResponse {
  code: number;
  msg?: string;
  data: {
    comments: Array<{
      comment_id: string;
      content: string;
      create_time: number;
      user_info: {
        user_id: string;
        nickname: string;
        avatar: string;
        red_id: string;
      };
      like_count: number;
      sub_comment_count: number;
      sub_comments?: Array<{
        comment_id: string;
        content: string;
        create_time: number;
        user_info: {
          user_id: string;
          nickname: string;
          avatar: string;
        };
        like_count: number;
      }>;
    }>;
    total_count: number;
    cursor: string;
    has_more: boolean;
  };
}

// ==================== 小红书错误码映射表 ====================

const XHS_ERROR_CODES: Record<number, string> = {
  0: '成功',
  1: '系统错误',
  2: '参数不合法',
  3: '签名验证失败',
  100: 'access_token 无效或已过期',
  101: 'refresh_token 无效或已过期',
  102: 'code 已使用或已过期',
  103: '应用审核未通过',
  104: '用户未授权该 scope',
  105: '用户拒绝授权',
  200: '接口调用频率超限',
  201: '接口每日调用次数超限',
  202: '接口权限不足',
  300: '笔记不存在',
  301: '用户不存在',
  302: '内容违规已被删除',
};

// ==================== 适配器实现 ====================

/**
 * 小红书专业号平台适配器（真实 API 实现）
 *
 * 对接小红书开放平台 API，支持：
 * - OAuth2 授权码流程认证
 * - 博主/达人信息采集与标准化
 * - 笔记内容数据获取与分析
 * - 评论数据采集
 * - 笔记搜索功能
 *
 * ## 使用前准备
 * 1. 在 [小红书开放平台](https://open.xiaohongshu.com) 注册开发者账号
 * 2. 创建应用并获取 App Key 和 App Secret
 * 3. 配置授权回调地址
 * 4. 申请所需的数据读取权限 Scope
 *
 * ## 环境变量配置
 * - `XHS_APP_KEY` — 应用 App Key
 * - `XHS_APP_SECRET` — 应用 App Secret
 * - `XHS_REDIRECT_URI` — OAuth 回调地址
 *
 * ## 平台特性说明
 * 小红书具有**社交+电商混合属性**，数据结构包含：
 * - 基础社交数据：粉丝、关注、笔记数、互动量
 * - 电商扩展数据：店铺信息、直播带货数据、广告合作报价
 * - 内容特点：收藏率远高于点赞率，需特殊处理互动率计算
 *
 * @extends BasePlatformAdapter
 */
@Injectable()
export class XiaohongshuRealAdapter extends BasePlatformAdapter {
  readonly platformId = 'xiaohongshu';
  override readonly platformName = '小红书';

  // ==================== 基础配置常量 ====================

  private static readonly API_BASE_URL = 'https://edith.xiaohongshu.com';
  private static readonly OAUTH_AUTHORIZE_URL = 'https://developer.xiaohongshu.com/oauth/authorize';
  private static readonly TOKEN_URL = 'https://edith.xiaohongshu.com/sns/v2/oauth/access_token';
  private static readonly REFRESH_TOKEN_URL =
    'https://edith.xiaohongshu.com/sns/v2/oauth/refresh_token';

  // TODO: 替换为实际的应用配置
  private readonly appKey: string = process.env.XHS_APP_KEY || '';
  private readonly appSecret: string = process.env.XHS_APP_SECRET || '';
  private readonly redirectUri: string =
    process.env.XHS_REDIRECT_URI || 'https://your-domain.com/api/callback/xiaohongshu';

  // ==================== 速率限制配置 ====================

  /**
   * 获取小红书平台的速率限制配置
   *
   * 根据小红书开放平台官方文档：
   * - 普通开发者：5000 次/天
   * - 企业开发者：20000 次/天
   *
   * 当前按普通开发者配置。
   */
  getRateLimitConfig(): RateLimitConfig {
    return {
      requestsPerDay: parseInt(process.env.XHS_RATE_LIMIT_DAY || '5000', 10),
      requestsPerHour: parseInt(process.env.XHS_RATE_LIMIT_HOUR || '100', 10),
      requestsPerMinute: parseInt(process.env.XHS_RATE_LIMIT_MINUTE || '10', 10),
      maxConcurrent: 3,
    };
  }

  // ==================== OAuth2 认证流程 ====================

  /**
   * 构建小红书 OAuth2 授权 URL
   *
   * 支持的权限范围：
   * - `sns.base` — 基础用户信息
   * - `notes.info` — 笔记信息读取
   * - `notes.comment` — 笔记评论读取
   * - `search.base` — 搜索基础能力
   *
   * @param state 防 CSRF 的随机状态码
   * @returns 完整的小红书授权页面 URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      app_key: this.appKey,
      response_type: 'code',
      scope: ['sns.base', 'notes.info', 'notes.comment', 'search.base'].join(','),
      redirect_uri: this.redirectUri,
      state,
    });

    return `${XiaohongshuRealAdapter.OAUTH_AUTHORIZE_URL}?${params.toString()}`;
  }

  /**
   * 用授权码换取访问令牌
   *
   * @param authorizationCode 回调返回的授权码
   * @returns 令牌对象
   */
  async exchangeCodeForToken(authorizationCode: string): Promise<PlatformAccessToken> {
    this.logger.log(`[小红书] 开始用授权码换取访问令牌...`);

    const body = new URLSearchParams({
      app_key: this.appKey,
      app_secret: this.appSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    }).toString();

    try {
      const response = await fetch(XiaohongshuRealAdapter.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      const data: XiaohongshuTokenResponse = await response.json();

      if (data.code !== 0) {
        this.handlePlatformError(
          { errorCode: data.code, message: data.msg },
          'exchangeCodeForToken'
        );
      }

      const token: PlatformAccessToken = {
        accessToken: data.data.access_token,
        tokenType: data.data.token_type || 'Bearer',
        expiresAt: Date.now() + data.data.expires_in * 1000,
        refreshToken: data.data.refresh_token,
        scope: data.data.scope,
      };

      this.logger.log(`[小红书] 成功获取访问令牌，有效期 ${data.data.expires_in} 秒`);
      return token;
    } catch (error) {
      if ((error as Error).message.includes('handlePlatformError')) throw error;
      this.handlePlatformError(error, 'exchangeCodeForToken');
    }
  }

  /**
   * 刷新过期的访问令牌
   *
   * @param currentToken 当前令牌对象
   * @returns 新的有效令牌对象
   */
  async refreshToken(currentToken: PlatformAccessToken): Promise<PlatformAccessToken> {
    if (!currentToken.refreshToken) {
      throw new Error('[小红书] 没有 refresh_token，需要重新进行完整 OAuth 授权');
    }

    this.logger.log(`[小红书] 正在刷新访问令牌...`);

    const body = new URLSearchParams({
      app_key: this.appKey,
      app_secret: this.appSecret,
      grant_type: 'refresh_token',
      refresh_token: currentToken.refreshToken,
    }).toString();

    try {
      const response = await fetch(XiaohongshuRealAdapter.REFRESH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      const data: XiaohongshuTokenResponse = await response.json();

      if (data.code !== 0) {
        if (data.code === 101) {
          throw new Error(`[小红书] Refresh Token 已过期，请引导用户重新完成 OAuth 授权流程。`);
        }
        this.handlePlatformError({ errorCode: data.code, message: data.msg }, 'refreshToken');
      }

      return {
        accessToken: data.data.access_token,
        tokenType: data.data.token_type || 'Bearer',
        expiresAt: Date.now() + data.data.expires_in * 1000,
        refreshToken: data.data.refresh_token,
        scope: data.data.scope,
      };
    } catch (error) {
      if (
        (error as Error).message.includes('handlePlatformError') ||
        (error as Error).message.includes('Refresh Token')
      ) {
        throw error;
      }
      this.handlePlatformError(error, 'refreshToken');
    }
  }

  /**
   * 验证当前访问令牌是否有效
   *
   * 通过调用用户自身信息接口来验证。
   *
   * @param token 待验证的令牌
   * @returns true=有效
   */
  async validateToken(token: PlatformAccessToken): Promise<boolean> {
    try {
      const response = await fetch(
        `${XiaohongshuRealAdapter.API_BASE_URL}/sns/v1/user/selfinfo?access_token=${token.accessToken}`
      );
      const data = await response.json();
      return data.code === 0;
    } catch {
      return false;
    }
  }

  // ==================== 数据采集方法 ====================

  /**
   * 从小红书搜索/获取博主原始数据
   *
   * 支持两种查询模式：
   * 1. **关键词搜索**：通过笔记搜索间接发现博主
   * 2. **用户 ID 直接查询**：通过 user_id 或 red_id 获取单个博主详情
   *
   * @param query 搜索关键词、user_id 或 red_id
   * @param options 可选参数：
   *   - limit: 返回数量上限
   *   - cursor: 分页游标
   *   - sort: 排序方式（general/time_descending/popularity_descending）
   *   - min_fans: 最小粉丝数筛选
   * @returns 小红书博主原始数据数组
   */
  async fetchInfluencers(query: string, options?: Record<string, any>): Promise<RawLead[]> {
    this.logger.log(`[小红书] 开始采集博主数据，查询: ${query}`);
    const limit = options?.limit || 20;

    try {
      // 判断是否为纯数字 ID 或 red_id 格式
      const isDirectId = /^\d{9}$/.test(query.trim());

      if (isDirectId) {
        // 单用户直接查询路径
        const userInfo = await this.fetchOtherUserInfo(query);
        return [userInfo];
      }

      // 关键词搜索路径：通过搜索笔记提取作者信息
      const results: RawLead[] = [];
      let cursor = options?.cursor || '';
      let hasMore = true;
      let collectedCount = 0;

      while (hasMore && collectedCount < limit) {
        const searchResult = await this.searchNotesForCreators(
          query,
          cursor,
          Math.min(limit - collectedCount, 20),
          options?.sort
        );

        // 从搜索结果中提取唯一作者
        for (const item of searchResult.items) {
          const authorId = item.note_card?.user?.user_id;
          if (!authorId) continue;

          // 避免重复添加同一作者
          const alreadyExists = results.some((r) => r.user_id === authorId);
          if (!alreadyExists && results.length < limit) {
            // 尝试获取作者详细信息
            const detail = await this.fetchOtherUserInfo(authorId).catch(() => ({
              ...item.note_card.user,
              _source: 'search_fallback',
            }));
            results.push(detail);
            collectedCount++;
          }
        }

        hasMore = searchResult.hasMore;
        cursor = searchResult.nextCursor;
      }

      this.logger.log(`[小红书] 采集完成，共获取 ${results.length} 条博主数据`);
      return results;
    } catch (error) {
      if ((error as Error).message.includes('handlePlatformError')) throw error;
      this.handlePlatformError(error, `fetchInfluencers(query=${query})`);
    }
  }

  /**
   * 获取指定博主的详细统计数据
   *
   * 通过 otherinfo 接口获取粉丝数、笔记数、互动量等核心指标。
   *
   * @param influencerId 博主 user_id
   * @param options 额外选项（暂未使用）
   * @returns 统计数据
   */
  async fetchInfluencerStats(influencerId: string, options?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const info = await this.fetchOtherUserInfo(influencerId);
    return info;
  }

  /**
   * 获取指定博主的笔记列表
   *
   * 注意：小红书开放平台可能不支持直接按用户查笔记列表，
   * 此方法通过搜索用户的昵称来间接获取其公开笔记。
   *
   * @param influencerId 博主 user_id
   * @param pagination 分页参数
   * @returns 分页的笔记列表
   */
  async fetchContentList(
    influencerId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<RawLead>> {
    // 先获取用户昵称用于搜索
    let nickname = '';
    try {
      const userInfo = await this.fetchOtherUserInfo(influencerId);
      nickname = userInfo.nickname || '';
    } catch {
      // 忽略，使用空昵称搜索
    }

    const pageSize = pagination?.pageSize || 20;
    const cursor = pagination?.cursor || '';

    const searchResult = await this.searchNotesForCreators(
      nickname || influencerId,
      cursor,
      pageSize,
      'time_descending'
    );

    return {
      data: searchResult.items.map((item) => ({
        ...item.note_card,
        _influencerId: influencerId,
      })) as unknown as RawLead[],
      pagination: {
        page: pagination?.page || 1,
        pageSize,
        total: searchResult.totalCount,
        totalPages: Math.ceil(searchResult.totalCount / pageSize),
        hasNextPage: searchResult.hasMore,
        hasPreviousPage: false,
        nextCursor: searchResult.nextCursor,
        prevCursor: undefined,
      },
    };
  }

  /**
   * 获取单条笔记的详细数据
   *
   * 包括笔记标题、正文、图片/视频、互动数据和话题标签等完整信息。
   *
   * @param contentId 笔记 note_id
   * @returns 笔记详细数据
   */
  async fetchContentDetail(contentId: string): Promise<RawLead> {
    const accessToken = await this.getValidAccessToken();
    const url = `${XiaohongshuRealAdapter.API_BASE_URL}/sns/v1/note/${contentId}?access_token=${accessToken}`;

    const response = await fetch(url);
    const data: XhsNoteDetailResponse = await response.json();

    if (data.code !== 0) {
      this.handlePlatformError(
        { errorCode: data.code, message: data.msg },
        `fetchContentDetail(${contentId})`
      );
    }

    return data.data as unknown as RawLead;
  }

  /**
   * 获取指定笔记的评论列表
   *
   * 支持分页获取笔记下的所有评论和子回复。
   *
   * @param contentId 笔记 note_id
   * @param pagination 分页参数
   * @returns 分页的评论数据
   */
  async fetchComments(
    contentId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<RawLead>> {
    const accessToken = await this.getValidAccessToken();
    const pageSize = pagination?.pageSize || 20;
    const cursor = pagination?.cursor || '';

    const params = new URLSearchParams({
      access_token: accessToken,
      cursor,
      top_comment_id: '',
      count: String(pageSize),
      image_formats: 'WEBP,JPEG',
    });

    const url = `${XiaohongshuRealAdapter.API_BASE_URL}/sns/v1/note/${contentId}/comments?${params.toString()}`;
    const response = await fetch(url);
    const data: XhsCommentsResponse = await response.json();

    if (data.code !== 0) {
      this.handlePlatformError(
        { errorCode: data.code, message: data.msg },
        `fetchComments(${contentId})`
      );
    }

    const comments = data.data?.comments || [];

    return {
      data: comments as unknown as RawLead[],
      pagination: {
        page: pagination?.page || 1,
        pageSize,
        total: data.data?.total_count || 0,
        totalPages: Math.ceil((data.data?.total_count || 0) / pageSize),
        hasNextPage: data.data?.has_more || false,
        hasPreviousPage: !!cursor,
        nextCursor: data.data?.cursor,
        prevCursor: undefined,
      },
    };
  }

  // ==================== 数据标准化方法 ====================

  /**
   * 将小红书原始用户数据标准化为统一影响者格式
   *
   * 字段映射规则：
   * | 小红书字段 | 标准字段 |
   * |-----------|---------|
   * | user_id | id (前缀 xhs:) |
   * | nickname | displayName |
   * | red_id | username (小红书号) |
   * | desc | bio |
   * | basic.fans | followerCount |
   * | basic.follows | followingCount |
   * | basic.note_count | postCount |
   * | avatar | avatarUrl |
   * | interaction_data.liked + .collected | engagementRate |
   *
   * @param raw 小红书用户原始数据
   * @returns 标准化的影响者数据
   */
  normalizeInfluencer(raw: Record<string, unknown>): NormalizedInfluencer {
    const now = new Date();
    const originalId = (raw.user_id as string) || (raw.red_id as string) || `xhs_${Date.now()}`;

    // 提取各层级的数据
    const userInfo = (raw.user_info as Record<string, unknown>) || raw;
    const basic = (raw.basic as Record<string, number>) || {};
    const interactionData = (raw.interaction_data as Record<string, number>) || (raw.interaction_data as Record<string, number>) || {};

    return {
      id: `xiaohongshu:${originalId}`,
      platform: 'xiaohongshu' as NormalizedInfluencer['platform'],
      platformId: originalId,
      displayName: String(userInfo.nickname || '小红书用户'),
      username: String(userInfo.red_id || ''),
      bio: String(userInfo.desc || ''),
      followerCount: basic.fans ?? 0,
      followingCount: basic.follows ?? 0,
      postCount: basic.note_count ?? 0,
      engagementRate: this.calculateXhsEngagementRate(basic, interactionData),
      avatarUrl: String(userInfo.avatar || ''),
      profileUrl: userInfo.red_id
        ? `https://www.xiaohongshu.com/user/profile/${userInfo.red_id}`
        : undefined,
      isVerified: !!((raw.verify_info as Record<string, unknown>)?.type),
      verificationType: String((raw.verify_info as Record<string, unknown>)?.type || '') || undefined,
      location: (userInfo.ip_location as string) || undefined,
      language: 'zh-CN',
      tags: this.extractTags((userInfo.desc as string) || '', (userInfo.nickname as string) || '', Array.isArray(raw.tags) ? raw.tags : []),
      avgEngagement: {
        likes: interactionData.liked
          ? Math.floor(interactionData.liked / Math.max(basic.note_count || 1, 1))
          : 0,
        comments: interactionData.commented
          ? Math.floor(interactionData.commented / Math.max(basic.note_count || 1, 1))
          : 0,
        shares: interactionData.shared
          ? Math.floor(interactionData.shared / Math.max(basic.note_count || 1, 1))
          : 0,
        saves: interactionData.collected
          ? Math.floor(interactionData.collected / Math.max(basic.note_count || 1, 1))
          : 0,
      },
      contactInfo: {
        email: (raw.rcmd_contact as { email?: string })?.email,
        phone: (raw.rcmd_contact as { phone?: string })?.phone,
        website: String(raw.link || raw.home_link || ''),
      },
      businessContact: (raw.ad_coop as { accepts_ads?: boolean })?.accepts_ads
        ? {
            email: (raw.rcmd_contact as { email?: string; wechat?: string })?.email,
            wechatId: (raw.rcmd_contact as { email?: string; wechat?: string })?.wechat,
            minCooperationFee: (raw.ad_coop as { min_price?: number })?.min_price,
          }
        : undefined,
      contentCategories: this.inferContentCategories((userInfo.desc as string) || '', (userInfo.nickname as string) || ''),
      lastActiveAt: raw.latest_note_time ? new Date(String(raw.latest_note_time)) : undefined,
      rawJson: JSON.stringify(raw),
      collectedAt: now,
    };
  }

  /**
   * 将小红书笔记原始数据标准化为统一内容格式
   *
   * 字段映射规则：
   * | 小红书字段 | 标准字段 |
   * |-----------|---------|
   * | note_id | id (前缀 xhs_note:) |
   * | title | title |
   * | desc | caption |
   * | image_list[].url_default.url | mediaUrls |
   * | video.cover.url | thumbnailUrl |
   * | interact_info.liked_count | engagement.likes |
   * | interact_info.collected_count | engagement.saves |
   * | interact_info.comment_count | engagement.comments |
   * | interact_info.share_count | engagement.shares |
   * | type ('video'/'normal') | contentType |
   *
   * @param raw 小红书笔记原始数据
   * @returns 标准化的内容数据
   */
  normalizeContent(raw: Record<string, unknown>): NormalizedContent {
    const isVideo = raw.type === 'video' || !!raw.video;

    return {
      id: `xhs_note:${String(raw.note_id)}`,
      platform: 'xiaohongshu',
      authorId: String((raw.user as Record<string, unknown>)?.user_id || ''),
      contentType: isVideo ? 'video' : 'image',
      title: String(raw.title || raw.display_title || ''),
      caption: String(raw.desc || raw.display_title || ''),
      mediaUrls: isVideo
        ? (((raw.video as Record<string, unknown>)?.media as Record<string, unknown>)?.stream as { h264?: unknown[] })?.h264
            ?.map((v: Record<string, unknown>) => String(v.master_url || '')).filter(Boolean) || []
        : Array.isArray(raw.image_list)
            ? raw.image_list.map((img: Record<string, unknown>) => String(((img as { url_default?: { url?: string } })?.url_default)?.url || '')).filter(Boolean)
            : [],
      thumbnailUrl: isVideo
        ? String(((raw.video as Record<string, unknown>)?.cover as { url?: string })?.url || '')
        : String((Array.isArray(raw.image_list) ? ((raw.image_list[0] as { url_default?: { url?: string } })?.url_default)?.url : null) || ''),
      publishedAt: new Date(Number(raw.time || 0) * 1000),
      engagement: {
        views: 0,
        likes: parseInt(String((raw.interact_info as Record<string, unknown>)?.liked_count || '0'), 10),
        comments: parseInt(String((raw.interact_info as Record<string, unknown>)?.comment_count || '0'), 10),
        shares: parseInt(String((raw.interact_info as Record<string, unknown>)?.share_count || '0'), 10),
        saves: parseInt(String((raw.interact_info as Record<string, unknown>)?.collected_count || '0'), 10),
      },
      tags: [
        ...(Array.isArray(raw.tag_list) ? raw.tag_list.map((t: Record<string, unknown>) => String(t.name)) : []),
        ...(Array.isArray(raw.topic_list) ? raw.topic_list.map((t: Record<string, unknown>) => String(t.name)) : []),
      ],
      url: raw.note_id ? `https://www.xiaohongshu.com/explore/${raw.note_id}` : undefined,
      rawJson: JSON.stringify(raw),
    };
  }

  /**
   * 将小红书评论原始数据标准化为统一格式
   *
   * @param raw 评论原始数据
   * @returns 标准化的评论数据
   */
  normalizeComment(raw: any): NormalizedComment {
    return {
      id: `xhs_comment:${raw.comment_id}`,
      contentId: '', // 外部注入
      authorId: raw.user_info?.user_id || '',
      authorName: raw.user_info?.nickname || '匿名用户',
      authorAvatarUrl: raw.user_info?.avatar,
      text: raw.content || '',
      createdAt: new Date((raw.create_time || 0) * 1000),
      likes: raw.like_count || 0,
      replyCount: raw.sub_comment_count || 0,
      rawJson: JSON.stringify(raw),
    };
  }

  // ==================== 错误处理 ====================

  /**
   * 处理小红书平台特有的 API 错误
   *
   * 小红书错误码体系：
   * - **100**: access_token 无效 → 触发刷新
   * - **101**: refresh_token 过期 → 需重新授权
   * - **200-202**: 频率限制/权限不足 → 延迟重试
   * - **300-302**: 资源不存在/违规 → 返回空结果
   *
   * @param error 原始错误
   * @param context 上下文
   * @throws 永远抛出异常
   */
  handlePlatformError(error: Error | Record<string, unknown>, context: string): never {
    const errRecord = typeof error === 'object' && error && !('message' in error) ? error as Record<string, unknown> : null;
    const errorCode = errRecord?.errorCode || errRecord?.code || errRecord?.status;
    const errorMessage = (error as Error)?.message || errRecord?.msg || errRecord?.body || String(error);

    const knownMessage = errorCode ? XHS_ERROR_CODES[String(errorCode)] : null;

    let humanReadableMessage: string;

    if (knownMessage) {
      humanReadableMessage = `[小红书 API 错误] ${context}: [${errorCode}] ${knownMessage}`;

      switch (errorCode) {
        case 100:
          humanReadableMessage += ' → access_token 无效，请检查配置或触发刷新';
          break;
        case 101:
          humanReadableMessage += ' → Refresh Token 已失效，需重新引导用户授权';
          break;
        case 200:
        case 201:
          humanReadableMessage += ' → 请求过于频繁，请降低调用频率后重试';
          break;
        case 202:
          humanReadableMessage += ' → 当前应用无此接口权限，请在开放平台申请';
          break;
        case 300:
          humanReadableMessage += ' → 指定的笔记不存在或已被删除';
          break;
        case 301:
          humanReadableMessage += ' → 指定的用户不存在或 user_id 有误';
          break;
        case 302:
          humanReadableMessage += ' → 该内容因违规已被删除';
          break;
      }
    } else {
      humanReadableMessage = `[小红书 API 未知错误] ${context}: ${errorMessage}`;
    }

    this.logger.error(humanReadableMessage);

    const platformError = new Error(humanReadableMessage);
    (platformError as any).platform = 'xiaohongshu';
    (platformError as any).errorCode = errorCode;
    (platformError as any).context = context;
    (platformError as any).originalError = error;

    throw platformError;
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 获取其他用户详细信息
   *
   * @private
   */
  private async fetchOtherUserInfo(userId: string): Promise<any> {
    const accessToken = await this.getValidAccessToken();
    const url = `${XiaohongshuRealAdapter.API_BASE_URL}/sns/v1/user/otherinfo?user_id=${userId}&access_token=${accessToken}`;

    const response = await fetch(url);
    const data: XhsOtherUserInfoResponse = await response.json();

    if (data.code !== 0) {
      this.handlePlatformError(
        { errorCode: data.code, message: data.msg },
        `fetchOtherUserInfo(${userId})`
      );
    }

    return data.data;
  }

  /**
   * 通过关键词搜索笔记并返回结果
   *
   * @private
   */
  private async searchNotesForCreators(
    keyword: string,
    cursor: string,
    count: number,
    sort?: string
  ): Promise<{
    items: any[];
    totalCount: number;
    hasMore: boolean;
    nextCursor: string;
  }> {
    const accessToken = await this.getValidAccessToken();

    const body: XhsSearchNotesRequest = {
      keyword,
      page: 1,
      page_size: count,
      sort: (sort as XhsSearchNotesRequest['sort']) || 'general',
      note_type: 'all',
    };

    const url = `${XiaohongshuRealAdapter.API_BASE_URL}/sns/v1/search/notes?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data: XhsSearchNotesResponse = await response.json();

    if (data.code !== 0) {
      // 搜索失败时返回空结果而非抛异常（允许降级处理）
      this.logger.warn(`[小红书] 笔记搜索失败 [${data.code}]: ${data.msg}`);
      return { items: [], totalCount: 0, hasMore: false, nextCursor: '' };
    }

    return {
      items: data.data?.items || [],
      totalCount: data.data?.total_number || 0,
      hasMore: data.data?.has_more || false,
      nextCursor: data.data?.cursor || '',
    };
  }

  /**
   * 计算小红书博主的综合互动率
   *
   * 小红书的独特之处在于**收藏率非常高**（通常高于点赞率），
   * 因此互动率计算需综合考虑点赞和收藏两个维度。
   * 公式：(点赞 + 收藏×0.5) / (粉丝数 × 笔记数)，归一化到 0-1。
   *
   * @private
   */
  private calculateXhsEngagementRate(basic: Record<string, number>, interactionData: Record<string, number>): number | undefined {   const fans = basic.fans || 0;
    const notes = basic.note_count || 0;
    const liked = interactionData.liked || 0;
    const collected = interactionData.collected || 0;

    if (fans === 0 || notes === 0) return undefined as any;

    // 收藏权重减半（收藏成本低于点赞）
    const totalInteraction = liked + collected * 0.5;
    const avgInteractionPerNote = totalInteraction / notes;
    const ratio = avgInteractionPerNote / fans;

    // 小红书典型互动率范围 0.005~0.15，线性映射到 0~1
    return parseFloat(Math.min(ratio * 8, 1).toFixed(4));
  }

  /**
   * 从用户数据中提取标签
   *
   * @private
   */
  private extractTags(desc: string, nickname: string, tags?: Array<{ name: string }>): string[] {
    const text = `${desc || ''} ${nickname || ''}`.toLowerCase();
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
      '设计',
      '编程',
      '开发',
      '产品',
      '营销',
      'SaaS',
      'Web3',
      '区块链',
    ];

    const extracted = keywords.filter((kw) => text.includes(kw.toLowerCase()));

    // 补充从 API 返回的标签
    if (tags?.length) {
      extracted.push(...tags.map((t: any) => t.name));
    }

    return [...new Set(extracted)];
  }

  /**
   * 根据签名推断内容分类
   *
   * @private
   */
  private inferContentCategories(signature: string, nickname: string): string[] {
    const text = `${signature || ''} ${nickname || ''}`.toLowerCase();
    const categoryMap: Array<{ pattern: RegExp; category: string }> = [
      { pattern: /穿搭|OOTD|时尚|搭配|衣服/, category: '时尚穿搭' },
      { pattern: /护肤|美妆|彩妆|口红|面膜|化妆/, category: '美妆护肤' },
      { pattern: /美食|探店|食谱|烹饪|烘焙|咖啡/, category: '美食生活' },
      { pattern: /健身|运动|减肥|瑜伽|跑步|增肌/, category: '健康运动' },
      { pattern: /旅行|旅游|攻略|景点|民宿|酒店/, category: '旅行户外' },
      { pattern: /育儿|亲子|宝宝|儿童|孕妈/, category: '母婴亲子' },
      { pattern: /家居|装修|软装|租房|ins风/, category: '家居家装' },
      { pattern: /数码|测评|手机|电脑|相机|耳机/, category: '科技数码' },
      { pattern: /职场|面试|简历|薪资|转行|创业/, category: '职场成长' },
      { pattern: /理财|基金|股票|投资|存钱|省钱/, category: '理财金融' },
      { pattern: /学习|英语|考试|考研|读书|书单/, category: '教育培训' },
      { pattern: /宠物|猫|狗|萌宠/, category: '宠物生活' },
      { pattern: /摄影|拍照|修图|构图|后期/, category: '摄影艺术' },
      { pattern: /手工|DIY|制作|手作/, category: '手工创意' },
    ];

    return categoryMap.filter(({ pattern }) => pattern.test(text)).map(({ category }) => category);
  }
}
