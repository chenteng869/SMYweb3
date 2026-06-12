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
import { RawLead, NormalizedLead, PlatformCollectOptions } from '../types/acquisition.types';

// ==================== 抖音开放平台 API 类型定义 ====================

/**
 * 抖音 OAuth2 授权响应
 * @see https://open.douyin.com/platform/doc/6848798517392898052
 */
interface DouyinOAuthTokenResponse {
  /** 错误码，0 表示成功 */
  error_code: number;
  /** 错误描述 */
  description?: string;
  /** 访问令牌 */
  access_token: string;
  /** 令牌过期时间（秒） */
  expires_in: number;
  /** 刷新令牌 */
  refresh_token: string;
  /** 刷新令牌过期时间（秒） */
  refresh_expires_in: number;
  /** 令牌范围 */
  scope: string;
}

/**
 * 抖音用户信息响应
 * @see https://open.douyin.com/platform/doc/6848798789177366536
 */
interface DouyinUserInfoResponse {
  error_code: number;
  description?: string;
  data: {
    user_info: {
      nickname: string;
      avatar_url: string;
      open_id: string;
      union_id: string;
    };
  };
}

/**
 * 抖音视频列表项
 * @see https://open.douyin.com/platform/doc/6848797514733853710
 */
interface DouyinVideoItem {
  item_id: string;
  title: string;
  video: {
    play_addr: {
      url_list: string[];
    };
    cover: {
      url_list: string[];
    };
    dynamic_cover?: {
      url_list: string[];
    };
  };
  statistics: {
    play_count: number;
    comment_count: number;
    digg_count: number;
    share_count: number;
    collect_count: number;
  };
  create_time: number;
  share_url: string;
}

/**
 * 抖音视频数据/分析响应
 * @see https://open.douyin.com/platform/doc/6848798624173742343
 */
interface DouyinVideoDataResponse {
  error_code: number;
  description?: string;
  data: {
    total_data: Array<{
      date: string;
      play_count: number;
      comment_count: number;
      digg_count: number;
      share_count: number;
      profile_view_count: number;
      follower_count: number;
      fans_add_count: number;
    }>;
  };
}

/**
 * 抖音用户统计数据响应
 */
interface DouyinUserStatsResponse {
  error_code: number;
  description?: string;
  data: {
    total_data: Array<{
      date: string;
      profile_view: number;
      follower_count: number;
      fans_add_cnt: number;
      fans_del_cnt: number;
      like_total_cnt: number;
      comment_total_cnt: number;
      share_total_cnt: number;
    }>;
  };
}

/**
 * 抖音评论数据
 */
interface DouyinCommentItem {
  cid: string;
  text: string;
  create_time: number;
  user: {
    uid: string;
    nickname: string;
    avatar_thumb: {
      url_list: string[];
    };
  };
  reply_comment_total: number;
  digg_count: number;
  reply_id?: string;
  replies?: DouyinCommentItem[];
}

/**
 * 抖音搜索创作者响应
 */
interface DouyinSearchResponse {
  error_code: number;
  description?: string;
  data: {
    list: Array<{
      user: {
        uid: string;
        short_id: string;
        nickname: string;
        avatar_thumb: {
          url_list: string[];
        };
        signature: string;
        unique_id: string;
        verification_type: number;
      };
      statistics: {
        follower_count: number;
        following_count: number;
        aweme_count: number;
        total_favorited: number;
      };
    }>;
    has_more: boolean;
    cursor: number;
    total_number: number;
  };
}

// ==================== 抖音错误码映射表 ====================

/**
 * 抖音开放平台常见错误码及说明
 *
 * 完整错误码文档：https://open.douyin.com/platform/doc/6848798665833121799
 */
const DOUYIN_ERROR_CODES: Record<number, string> = {
  0: '成功',
  21016: 'access_token 无效或已过期',
  21017: 'refresh_token 无效或已过期',
  21018: 'code 已使用或已过期',
  21019: '应用审核未通过',
  21020: '用户未授权该 scope',
  21021: '用户拒绝授权',
  21100: '请求参数不合法',
  21101: '接口调用频率超限',
  21102: '接口每日调用次数超限',
  21103: '接口权限不足',
  21200: '内部服务错误',
  21201: '数据库操作失败',
  21300: '视频不存在',
  21301: '用户不存在',
  21302: '评论不存在',
};

// ==================== 适配器实现 ====================

/**
 * 抖音创作者平台适配器（真实 API 实现）
 *
 * 对接抖音开放平台（Open Platform）API，支持：
 * - OAuth2 授权码流程认证
 * - 创作者信息采集与标准化
 * - 视频内容数据分析
 * - 评论数据获取
 * - 用户粉丝统计
 *
 * ## 使用前准备
 * 1. 在 [抖音开放平台](https://open.douyin.com) 注册开发者账号
 * 2. 创建应用并获取 Client Key 和 Client Secret
 * 3. 配置授权回调地址（redirect_uri）
 * 4. 申请所需的数据读取权限 Scope
 *
 * ## 环境变量配置
 * - `DOUYIN_CLIENT_KEY` — 应用 Client Key
 * - `DOUYIN_CLIENT_SECRET` — 应用 Client Secret
 * - `DOUYIN_REDIRECT_URI` — OAuth 回调地址
 *
 * ## API 文档参考
 * - 授权流程：https://open.douyin.com/platform/doc/6848798517392898052
 * - 用户信息：https://open.douyin.com/platform/doc/6848798789177366536
 * - 视频列表：https://open.douyin.com/platform/doc/6848797514733853710
 * - 视频数据：https://open.douyin.com/platform/doc/6848798624173742343
 *
 * @extends BasePlatformAdapter
 */
@Injectable()
export class DouyinRealAdapter extends BasePlatformAdapter {
  /** 平台唯一标识 */
  readonly platformId = 'douyin';

  /** 平台中文名称 */
  override readonly platformName = '抖音';

  // ==================== 基础配置常量 ====================

  /** 抖音开放平台 API 基础地址 */
  private static readonly API_BASE_URL = 'https://open.douyin.com';

  /** OAuth2 授权端点 */
  private static readonly OAUTH_AUTHORIZE_URL = 'https://open.douyin.com/platform/oauth/connect/';

  /** 令牌端点 */
  private static readonly TOKEN_URL = 'https://open.douyin.com/oauth/access_token/';

  /** 令牌刷新端点 */
  private static readonly REFRESH_TOKEN_URL = 'https://open.douyin.com/oauth/refresh_token/';

  /** TODO: 替换为实际的应用配置 */
  /** 应用 Client Key（从环境变量 DOUYIN_CLIENT_KEY 读取） */
  private readonly clientKey: string = process.env.DOUYIN_CLIENT_KEY || '';

  /** 应用 Client Secret（从环境变量 DOUYIN_CLIENT_SECRET 读取） */
  private readonly clientSecret: string = process.env.DOUYIN_CLIENT_SECRET || '';

  /** 授权回调地址（从环境变量 DOUYIN_REDIRECT_URI 读取） */
  private readonly redirectUri: string =
    process.env.DOUYIN_REDIRECT_URI || 'https://your-domain.com/api/callback/douyin';

  // ==================== 速率限制配置 ====================

  /**
   * 获取抖音平台的速率限制配置
   *
   * 根据抖音开放平台官方文档：
   * - 基础版：1000 次/天
   * - 高级版：5000 次/天
   * - 企业版：20000 次/天
   *
   * 当前按基础版配置，可通过环境变量调整。
   *
   * @returns 速率限制配置对象
   */
  getRateLimitConfig(): RateLimitConfig {
    return {
      requestsPerDay: parseInt(process.env.DOUYIN_RATE_LIMIT_DAY || '1000', 10),
      requestsPerHour: parseInt(process.env.DOUYIN_RATE_LIMIT_HOUR || '50', 10),
      requestsPerMinute: parseInt(process.env.DOUYIN_RATE_LIMIT_MINUTE || '5', 10),
      maxConcurrent: 3,
    };
  }

  // ==================== OAuth2 认证流程 ====================

  /**
   * 构建抖音 OAuth2 授权 URL
   *
   * 引导用户跳转到抖音授权页面完成身份确认和权限授予。
   * 支持的权限范围包括：
   * - `user.info.basic` — 基础用户信息（昵称、头像等）
   * - `video.list` — 视频列表
   * - `video.data` — 视频数据统计
   * - `comment.list` — 评论列表
   *
   * @param state 防 CSRF 的随机状态码（建议使用 UUID v4）
   * @returns 完整的抖音授权页面 URL
   *
   * @example
   * ```typescript
   * const state = crypto.randomUUID();
   * const authUrl = adapter.getAuthorizationUrl(state);
   * // 重定向用户到 authUrl 进行授权
   * ```
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      response_type: 'code',
      scope: ['user.info.basic', 'video.list', 'video.data', 'comment.list', 'user.data'].join(','),
      redirect_uri: this.redirectUri,
      state,
    });

    return `${DouyinRealAdapter.OAUTH_AUTHORIZE_URL}?${params.toString()}`;
  }

  /**
   * 用授权码换取访问令牌
   *
   * OAuth2 授权码模式的第二步。用户在抖音授权页同意后，
   * 抖音会重定向回 redirect_uri 并携带 authorization_code 参数。
   * 使用此 code 调用本方法获取 access_token。
   *
   * @param authorizationCode 抖音回调返回的授权码（有效期约 10 分钟）
   * @returns 包含 access_token、refresh_token 及过期时间的令牌对象
   * @throws 当 code 无效、过期或应用配置错误时抛出异常
   *
   * @example
   * ```typescript
   * // 在 OAuth 回调路由中处理
   * const token = await adapter.exchangeCodeForToken(req.query.code as string);
   * adapter.setCachedToken(token);
   * ```
   */
  async exchangeCodeForToken(authorizationCode: string): Promise<PlatformAccessToken> {
    this.logger.log(`[抖音] 开始用授权码换取访问令牌...`);

    const params = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
    });

    try {
      const response = await fetch(DouyinRealAdapter.TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data: DouyinOAuthTokenResponse = await response.json();

      if (data.error_code !== 0) {
        this.handlePlatformError(
          { errorCode: data.error_code, message: data.description || '未知错误' },
          'exchangeCodeForToken'
        );
      }

      const token: PlatformAccessToken = {
        accessToken: data.access_token,
        tokenType: 'Bearer',
        expiresAt: Date.now() + data.expires_in * 1000,
        refreshToken: data.refresh_token,
        scope: data.scope,
      };

      this.logger.log(`[抖音] 成功获取访问令牌，有效期 ${data.expires_in} 秒`);
      return token;
    } catch (error) {
      if ((error as Error).message.includes('handlePlatformError')) throw error;
      this.handlePlatformError(error, 'exchangeCodeForToken');
    }
  }

  /**
   * 刷新过期的访问令牌
   *
   * 当 access_token 即将过期时调用此方法。
   * 抖音的 refresh_token 有效期较长（通常 30 天），
   * 但 refresh_token 本身也会过期，过期后需重新走完整授权流程。
   *
   * @param currentToken 当前包含 refresh_token 的令牌对象
   * @returns 新的有效令牌对象
   * @throws 若 refresh_token 已过期则提示重新授权
   */
  async refreshToken(currentToken: PlatformAccessToken): Promise<PlatformAccessToken> {
    if (!currentToken.refreshToken) {
      throw new Error('[抖音] 没有 refresh_token，需要重新进行完整 OAuth 授权');
    }

    this.logger.log(`[抖音] 正在刷新访问令牌...`);

    const params = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: currentToken.refreshToken,
    });

    try {
      const response = await fetch(DouyinRealAdapter.REFRESH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data: DouyinOAuthTokenResponse = await response.json();

      if (data.error_code !== 0) {
        // refresh_token 过期，特殊处理
        if (data.error_code === 21017) {
          this.logger.error(`[抖音] refresh_token 已过期，需重新授权`);
          throw new Error(
            `[抖音] Refresh Token 已过期，请引导用户重新完成 OAuth 授权流程。` +
              `调用 getAuthorizationUrl() 获取新的授权链接。`
          );
        }
        this.handlePlatformError(
          { errorCode: data.error_code, message: data.description },
          'refreshToken'
        );
      }

      const token: PlatformAccessToken = {
        accessToken: data.access_token,
        tokenType: 'Bearer',
        expiresAt: Date.now() + data.expires_in * 1000,
        refreshToken: data.refresh_token,
        scope: data.scope,
      };

      this.logger.log(`[抖音] 令牌刷新成功，新有效期 ${data.expires_in} 秒`);
      return token;
    } catch (error) {
      if ((error as Error).message.includes('handlePlatformError')) throw error;
      this.handlePlatformError(error, 'refreshToken');
    }
  }

  /**
   * 验证当前访问令牌是否有效
   *
   * 通过调用抖音用户信息接口来验证 token 是否仍然可用。
   * 如果返回 error_code=0 则表示 token 有效。
   *
   * @param token 待验证的令牌对象
   * @returns true=有效，false=无效
   */
  async validateToken(token: PlatformAccessToken): Promise<boolean> {
    try {
      const response = await fetch(
        `${DouyinRealAdapter.API_BASE_URL}/oauth/userinfo/?access_token=${token.accessToken}&open_id=test`
      );
      const data = await response.json();
      return data.error_code === 0 || data.error_code === 21301; // test open_id 返回 21301 也算连接正常
    } catch {
      return false;
    }
  }

  // ==================== 数据采集方法 ====================

  /**
   * 从抖音搜索/获取创作者原始数据
   *
   * 这是核心的数据采集入口。根据查询关键词搜索抖音创作者，
   * 返回包含基础信息和统计数据的结果列表。
   *
   * 注意：抖音开放平台目前**不提供公开的用户搜索 API**，
   * 此方法通过以下方式实现：
   * 1. 如果传入的是 open_id 或 uid，直接查询单个用户信息
   * 2. 如果传入的是关键词，尝试通过视频搜索间接获取创作者信息
   *
   * @param query 搜索关键词、用户 open_id 或 uid
   * @param options 可选参数：
   *   - limit: 返回数量上限（默认 20）
   *   - cursor: 分页游标
   *   - sort_type: 排序方式（0=默认, 1=粉丝数降序）
   *   - min_fans: 最小粉丝数筛选
   *   - max_fans: 最大粉丝数筛选
   * @returns 抖音创作者原始数据数组
   *
   * @example
   * ```typescript
   * // 按关键词搜索
   * const creators = await adapter.fetchInfluencers('AI技术分享', { limit: 10 });
   *
   * // 按 open_id 查询
   * const creator = await adapter.fetchInfluencer('aaaabbbbccccddddeeeeffff', {});
   * ```
   */
  async fetchInfluencers(query: string, options?: Record<string, any>): Promise<RawLead[]> {
    this.logger.log(`[抖音] 开始采集创作者数据，查询: ${query}`);
    const limit = options?.limit || 20;

    try {
      // 判断 query 是否为 open_id 格式（通常为 32 位十六进制字符串）
      const isOpenId = /^[a-f0-9]{32}$/i.test(query.trim());

      if (isOpenId) {
        // 单用户查询路径
        const userInfo = await this.fetchSingleUserInfo(query);
        const stats = await this.fetchUserStats(query);
        return [this.mergeUserWithStats(userInfo, stats)];
      }

      // 关键词搜索路径：通过视频搜索间接获取创作者信息
      const results: RawLead[] = [];
      let cursor = options?.cursor || 0;
      let hasMore = true;
      let collectedCount = 0;

      while (hasMore && collectedCount < limit) {
        const searchResult = await this.searchCreatorsByKeyword(
          query,
          cursor,
          Math.min(limit - collectedCount, 20)
        );
        results.push(...searchResult.items);
        hasMore = searchResult.hasMore;
        cursor = searchResult.nextCursor;
        collectedCount += searchResult.items.length;
      }

      this.logger.log(`[抖音] 采集完成，共获取 ${results.length} 条创作者数据`);
      return results;
    } catch (error) {
      if ((error as Error).message.includes('handlePlatformError')) throw error;
      this.handlePlatformError(error, `fetchInfluencers(query=${query})`);
    }
  }

  /**
   * 获取指定创作者的详细统计数据
   *
   * 包括粉丝增长趋势、主页浏览量、互动数据等多维度指标。
   * 数据通常有 24-48 小时的延迟。
   *
   * @param influencerId 创作者的 open_id
   * @param options 可选参数：
   *   - start_date: 统计开始日期（格式 YYYYMMDD）
   *   - end_date: 统计结束日期（默认今天）
   * @returns 原始统计数据对象
   */
  async fetchInfluencerStats(influencerId: string, options?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const accessToken = await this.getValidAccessToken();

    const today = new Date();
    const endDate = String(options?.end_date || this.formatDate(today));
    const startDate =
      String(options?.start_date || this.formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000))); // 默认近 7 天

    const params = new URLSearchParams({
      open_id: influencerId,
      start_date: startDate,
      end_date: endDate,
      access_token: accessToken,
    });

    const response = await fetch(
      `${DouyinRealAdapter.API_BASE_URL}/user/data/?${params.toString()}`
    );

    const data = await response.json();
    const result = data as DouyinUserStatsResponse;

    if (result.error_code !== 0) {
      this.handlePlatformError(
        { errorCode: result.error_code, message: result.description },
        `fetchInfluencerStats(${influencerId})`
      );
    }

    return data as unknown as Record<string, unknown>;
  }

  /**
   * 获取指定创作者的视频/内容列表
   *
   * 支持分页获取创作者发布的所有公开视频，
   * 每条记录包含视频基本信息和核心统计数据。
   *
   * @param influencerId 创作者的 open_id
   * @param pagination 分页参数
   * @returns 分页的视频列表数据
   */
  async fetchContentList(
    influencerId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<RawLead>> {
    const accessToken = await this.getValidAccessToken();
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const cursor = pagination?.cursor || '0';

    const params = new URLSearchParams({
      open_id: influencerId,
      count: String(pageSize),
      cursor,
      access_token: accessToken,
    });

    const response = await fetch(
      `${DouyinRealAdapter.API_BASE_URL}/video/list/?${params.toString()}`
    );

    const data = await response.json();

    if (data.error_code !== 0) {
      this.handlePlatformError(
        { errorCode: data.error_code, message: data.description },
        `fetchContentList(${influencerId})`
      );
    }

    const videos: DouyinVideoItem[] = data.data?.list || [];
    const total = data.data?.total_number || 0;

    return {
      data: videos.map((v) => ({ ...v, _influencerId: influencerId }) as unknown as RawLead),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: !!data.data?.has_more,
        hasPreviousPage: page > 1,
        nextCursor: data.data?.cursor,
        prevCursor: undefined,
      },
    };
  }

  /**
   * 获取单条视频的详细互动数据
   *
   * 返回指定视频在时间范围内的播放量、点赞、评论、
   * 分享、收藏等完整互动指标。
   *
   * @param contentId 视频 item_id
   * @returns 视频详细统计数据
   */
  async fetchContentDetail(contentId: string): Promise<RawLead> {
    const accessToken = await this.getValidAccessToken();
    const today = new Date();
    const endDate = this.formatDate(today);
    const startDate = this.formatDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));

    const params = new URLSearchParams({
      item_id: contentId,
      start_date: startDate,
      end_date: endDate,
      access_token: accessToken,
    });

    const response = await fetch(
      `${DouyinRealAdapter.API_BASE_URL}/video/data/?${params.toString()}`
    );

    const data: DouyinVideoDataResponse = await response.json();

    if (data.error_code !== 0) {
      this.handlePlatformError(
        { errorCode: data.error_code, message: data.description },
        `fetchContentDetail(${contentId})`
      );
    }

    return { item_id: contentId, analytics: data.data } as RawLead;
  }

  /**
   * 获取指定视频的评论列表
   *
   * 支持分页获取视频下的所有评论（含子回复），
   * 每条评论包含作者信息、点赞数和回复数。
   *
   * @param contentId 视频 item_id
   * @param pagination 分页参数
   * @returns 分页的评论数据
   */
  async fetchComments(
    contentId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<RawLead>> {
    const accessToken = await this.getValidAccessToken();
    const pageSize = pagination?.pageSize || 20;
    const cursor = pagination?.cursor || '0';

    const params = new URLSearchParams({
      item_id: contentId,
      count: String(pageSize),
      cursor,
      sort_type: '0', // 0=按热度排序, 1=按时间排序
      access_token: accessToken,
    });

    const response = await fetch(
      `${DouyinRealAdapter.API_BASE_URL}/comment/list/?${params.toString()}`
    );

    const data = await response.json();

    if (data.error_code !== 0) {
      this.handlePlatformError(
        { errorCode: data.error_code, message: data.description },
        `fetchComments(${contentId})`
      );
    }

    const comments: DouyinCommentItem[] = data.data?.comments || [];

    return {
      data: comments as unknown as RawLead[],
      pagination: {
        page: pagination?.page || 1,
        pageSize,
        total: data.data?.total || 0,
        totalPages: Math.ceil((data.data?.total || 0) / pageSize),
        hasNextPage: !!data.data?.has_more,
        hasPreviousPage: false,
        nextCursor: data.data?.cursor,
        prevCursor: undefined,
      },
    };
  }

  // ==================== 数据标准化方法 ====================

  /**
   * 将抖音原始用户数据标准化为统一影响者格式
   *
   * 字段映射规则：
   * | 抖音字段 | 标准字段 |
   * |---------|---------|
   * | open_id / uid | id (前缀 douyin:) |
   * | nickname | displayName |
   * | unique_id / short_id | username (抖音号) |
   * | signature | bio |
   * | statistics.follower_count | followerCount |
   * | statistics.following_count | followingCount |
   * | statistics.aweme_count | postCount |
   * | avatar_thumb.url_list[0] | avatarUrl |
   * | verification_type | isVerified (>0 为已认证) |
   *
   * @param raw 抖音用户原始数据（含 user 和 statistics 子对象）
   * @returns 标准化的影响者数据
   */
  normalizeInfluencer(raw: Record<string, unknown>): NormalizedInfluencer {
    const now = new Date();
    const userInfo = (raw.user as Record<string, unknown>) || raw;
    const stats = (raw.statistics as Record<string, number>) || {};

    const originalId = (userInfo.open_id as string) || (userInfo.uid as string) || (raw.uid as string) || `dy_unknown_${Date.now()}`;

    return {
      id: `douyin:${originalId}`,
      platform: 'douyin' as NormalizedInfluencer['platform'],
      platformId: originalId,
      displayName: String(userInfo.nickname || '抖音用户'),
      username: String(userInfo.unique_id || userInfo.short_id || ''),
      bio: (userInfo.signature as string) || '',
      followerCount: stats.follower_count ?? 0,
      followingCount: stats.following_count ?? 0,
      postCount: stats.aweme_count ?? 0,
      engagementRate: this.calculateEngagementRate(stats),
      avatarUrl: (userInfo.avatar_thumb as { url_list?: string[] })?.url_list?.[0] || (userInfo.avatar_medium as { url_list?: string[] })?.url_list?.[0],
      profileUrl: userInfo.unique_id
        ? `https://www.douyin.com/user/${userInfo.unique_id}`
        : undefined,
      lastPostAt: raw.create_time ? new Date(Number(raw.create_time) * 1000) : undefined,
      isVerified: Number(userInfo.verification_type ?? 0) > 0,
      verificationType: this.getVerificationTypeLabel(Number(userInfo.verification_type)),
      location: String(raw.ip_location || userInfo.country || ''),
      language: 'zh-CN',
      tags: this.extractTags(userInfo),
      avgEngagement: {
        likes: stats.total_favorited
          ? Math.floor(stats.total_favorited / Math.max(stats.aweme_count || 1, 1))
          : 0,
        comments: 0, // 需要单独查询
        shares: 0,
        saves: 0,
      },
      contactInfo: {
        email: (raw.contact_info as { email?: string } | undefined)?.email,
        phone: (raw.contact_info as { phone?: string } | undefined)?.phone,
        website: raw.link_item?.[0]?.link,
      },
      businessContact: raw.business_contact
        ? {
            email: (raw.business_contact as { email?: string }).email,
            wechatId: (raw.business_contact as { wechat_id?: string }).wechat_id,
            minCooperationFee: (raw.business_contact as { min_fee?: number }).min_fee,
          }
        : undefined,
      contentCategories: this.inferContentCategories(String(userInfo.signature || ''), String(userInfo.nickname || '')),
      lastActiveAt: raw.modify_time ? new Date(Number(raw.modify_time) * 1000) : undefined,
      rawJson: JSON.stringify(raw),
      collectedAt: now,
    };
  }

  /**
   * 将抖音视频原始数据标准化为统一内容格式
   *
   * 字段映射规则：
   * | 抖音字段 | 标准字段 |
   * |---------|---------|
   * | item_id | id (前缀 dy_video:) |
   * | title | caption |
   * | video.play_addr.url_list | mediaUrls |
   * | video.cover.url_list[0] | thumbnailUrl |
   * | statistics.play_count | engagement.views |
   * | statistics.digg_count | engagement.likes |
   * | statistics.comment_count | engagement.comments |
   * | statistics.share_count | engagement.shares |
   * | statistics.collect_count | engagement.saves |
   *
   * @param raw 抖音视频原始数据
   * @returns 标准化的内容数据
   */
  normalizeContent(raw: any): NormalizedContent {
    return {
      id: `dy_video:${raw.item_id}`,
      platform: 'douyin',
      authorId: raw._influencerId || '',
      contentType: 'video',
      title: raw.title,
      caption: raw.title,
      mediaUrls: raw.video?.play_addr?.url_list || [],
      thumbnailUrl: raw.video?.cover?.url_list?.[0] || raw.video?.dynamic_cover?.url_list?.[0],
      publishedAt: new Date((raw.create_time || 0) * 1000),
      engagement: {
        views: raw.statistics?.play_count || 0,
        likes: raw.statistics?.digg_count || 0,
        comments: raw.statistics?.comment_count || 0,
        shares: raw.statistics?.share_count || 0,
        saves: raw.statistics?.collect_count || 0,
      },
      tags: this.extractHashtags(raw.title),
      url: raw.share_url,
      rawJson: JSON.stringify(raw),
    };
  }

  /**
   * 将抖音评论原始数据标准化为统一格式
   *
   * @param raw 抖音评论原始数据
   * @returns 标准化的评论数据
   */
  normalizeComment(raw: any): NormalizedComment {
    return {
      id: `dy_comment:${raw.cid}`,
      contentId: '', // 需要外部注入 item_id
      authorId: raw.user?.uid || '',
      authorName: raw.user?.nickname || '匿名用户',
      authorAvatarUrl: raw.user?.avatar_thumb?.url_list?.[0],
      text: raw.text || '',
      createdAt: new Date((raw.create_time || 0) * 1000),
      likes: raw.digg_count || 0,
      replyCount: raw.reply_comment_total || 0,
      parentCommentId: raw.reply_id || undefined,
      rawJson: JSON.stringify(raw),
    };
  }

  // ==================== 错误处理 ====================

  /**
   * 处理抖音平台特有的 API 错误
   *
   * 抖音开放平台使用数字错误码体系，常见错误码：
   * - **21016**: access_token 无效或过期 → 自动触发刷新流程
   * - **21017**: refresh_token 过期 → 需重新授权
   * - **21018**: authorization_code 已使用或过期 → 需重新发起授权
   * - **21019/21020**: 应用审核问题或用户未授权
   * - **21101/21102**: 频率限制 → 延迟重试
   * - **21300-21303**: 资源不存在
   *
   * @param error 原始错误（可能包含 errorCode 属性）
   * @param context 发生错误的上下文描述
   * @throws 永远抛出异常（never 返回类型）
   */
  handlePlatformError(error: Error | Record<string, unknown>, context: string): never {
    const errRecord = typeof error === 'object' && error && !('message' in error) ? error as Record<string, unknown> : null;
    const errorCode = errRecord?.errorCode || errRecord?.error_code || errRecord?.status;
    const errorMessage = (error as Error)?.message || errRecord?.description || errRecord?.body || String(error);

    // 查找已知错误码的人类可读描述
    const knownMessage = errorCode ? DOUYIN_ERROR_CODES[errorCode] : null;

    // 构建详细的错误信息
    let humanReadableMessage: string;

    if (knownMessage) {
      humanReadableMessage = `[抖音 API 错误] ${context}: [${errorCode}] ${knownMessage}`;

      // 特殊处理：token 相关错误给出明确的解决建议
      switch (errorCode) {
        case 21016:
          humanReadableMessage += ' → 请检查 access_token 是否正确设置，或触发令牌刷新';
          break;
        case 21017:
          humanReadableMessage += ' → Refresh Token 已失效，请引导用户重新授权';
          break;
        case 21018:
          humanReadableMessage += ' → 授权码已被使用或已超过 10 分钟有效期';
          break;
        case 21101:
        case 21102:
          humanReadableMessage += ' → 请求过于频繁，请降低调用频率后重试';
          break;
        case 21300:
          humanReadableMessage += ' → 指定的视频不存在或已被删除';
          break;
        case 21301:
          humanReadableMessage += ' → 指定的用户不存在或 open_id 有误';
          break;
      }
    } else {
      humanReadableMessage = `[抖音 API 未知错误] ${context}: ${errorMessage}`;
    }

    this.logger.error(humanReadableMessage);

    // 包装为统一的业务异常
    const platformError = new Error(humanReadableMessage);
    (platformError as any).platform = 'douyin';
    (platformError as any).errorCode = errorCode;
    (platformError as any).context = context;
    (platformError as any).originalError = error;

    throw platformError;
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 查询单个用户的详细信息
   *
   * @private
   * @param openId 用户 open_id
   * @returns 用户信息 + 统计数据
   */
  private async fetchSingleUserInfo(openId: string): Promise<any> {
    const accessToken = await this.getValidAccessToken();

    const params = new URLSearchParams({
      open_id: openId,
      access_token: accessToken,
    });

    const response = await fetch(
      `${DouyinRealAdapter.API_BASE_URL}/oauth/userinfo/?${params.toString()}`
    );

    const data: DouyinUserInfoResponse = await response.json();

    if (data.error_code !== 0 && data.error_code !== 21301) {
      this.handlePlatformError(
        { errorCode: data.error_code, message: data.description },
        `fetchSingleUserInfo(${openId})`
      );
    }

    // 合并用户信息和基础统计数据
    const stats = await this.fetchUserStats(openId).catch(
      () => ({ data: { total_data: [] } }) as any
    );
    return {
      user: data.data?.user_info || {},
      statistics: (stats as unknown as DouyinUserStatsResponse)?.data?.total_data?.[0] || {},
    };
  }

  /**
   * 获取用户统计数据
   *
   * @private
   */
  private async fetchUserStats(openId: string): Promise<DouyinUserStatsResponse> {
    const accessToken = await this.getValidAccessToken();
    const today = new Date();
    const params = new URLSearchParams({
      open_id: openId,
      start_date: this.formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
      end_date: this.formatDate(today),
      access_token: accessToken,
    });

    const response = await fetch(
      `${DouyinRealAdapter.API_BASE_URL}/user/data/?${params.toString()}`
    );

    return response.json();
  }

  /**
   * 通过关键词搜索创作者
   *
   * 注意：抖音开放平台没有直接的"搜索用户"API，
   * 这里通过搜索相关视频并提取作者信息来实现间接搜索。
   *
   * @private
   */
  private async searchCreatorsByKeyword(
    keyword: string,
    cursor: number,
    count: number
  ): Promise<{ items: RawLead[]; hasMore: boolean; nextCursor: number }> {
    const accessToken = await this.getValidAccessToken();

    const params = new URLSearchParams({
      keyword: encodeURIComponent(keyword),
      count: String(count),
      cursor: String(cursor),
      sort_type: '0',
      access_token: accessToken,
    });

    // 尝试调用视频搜索接口（如果可用），否则返回空结果并记录日志
    try {
      const response = await fetch(
        `${DouyinRealAdapter.API_BASE_URL}/video/search/?${params.toString()}`
      );

      const data = await response.json();

      if (data.error_code === 0 && data.data?.list) {
        // 从视频列表中提取唯一的创作者信息
        const creatorMap = new Map<string, any>();
        for (const video of data.data.list) {
          const authorKey = video.author?.uid || video.author?.open_id;
          if (authorKey && !creatorMap.has(authorKey)) {
            creatorMap.set(authorKey, {
              user: video.author,
              statistics: video.author_stats || video.statistics || {},
            });
          }
        }

        return {
          items: Array.from(creatorMap.values()) as RawLead[],
          hasMore: data.data.has_more || false,
          nextCursor: data.data.cursor || cursor + count,
        };
      }
    } catch (searchError) {
      this.logger.warn(
        `[抖音] 关键词搜索暂不可用 (${keyword}): ${searchError instanceof Error ? searchError.message : ''}`
      );
    }

    // 搜索不可用时返回空结果
    return { items: [], hasMore: false, nextCursor: cursor };
  }

  /**
   * 合并用户信息和统计数据
   *
   * @private
   */
  private mergeUserWithStats(userInfo: any, statsData: any): RawLead {
    const latestStats = statsData.data?.total_data?.[0] || {};
    return {
      user: userInfo.user || userInfo,
      statistics: {
        follower_count: latestStats.follower_count || userInfo.statistics?.follower_count,
        following_count: userInfo.statistics?.following_count,
        aweme_count: userInfo.statistics?.aweme_count,
        total_favorited: latestStats.like_total_cnt || userInfo.statistics?.total_favorited,
      },
    } as RawLead;
  }

  /**
   * 计算抖音用户的综合互动率
   *
   * 基于总获赞数/(粉丝数 × 作品数) 计算，归一化到 0-1 范围。
   * 抖音的特点是头部内容互动率较高，普通创作者约 1%-5%。
   *
   * @private
   */
  private calculateEngagementRate(stats: any): number {
    const followers = stats.follower_count || 0;
    const videos = stats.aweme_count || 0;
    const totalLikes = stats.total_favorited || 0;

    if (followers === 0 || videos === 0) return undefined as any;

    const avgLikesPerVideo = totalLikes / videos;
    const ratio = avgLikesPerVideo / followers;

    // 归一化：抖音典型互动率范围 0.001~0.1，线性映射到 0~1
    return parseFloat(Math.min(ratio * 10, 1).toFixed(4));
  }

  /**
   * 获取认证类型的中文标签
   *
   * @private
   * @param type 认证类型代码
   * @returns 认证类型中文描述
   */
  private getVerificationTypeLabel(type?: number): string {
    const types: Record<number, string> = {
      0: '未认证',
      1: '个人认证（黄V）',
      2: '企业/机构认证（蓝V）',
      3: '政府认证',
      4: '媒体认证',
    };
    return types[type ?? 0] || '未知认证状态';
  }

  /**
   * 从用户签名和昵称中提取标签
   *
   * @private
   */
  private extractTags(user: any): string[] {
    const text = `${user.nickname || ''} ${user.signature || ''}`.toLowerCase();
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
      '数码',
      '测评',
      '财经',
      '健身',
      '美食',
      '旅行',
      '穿搭',
      '美妆',
      '母婴',
      '宠物',
      '读书',
      '手工',
    ];
    return keywords.filter((kw) => text.includes(kw.toLowerCase()));
  }

  /**
   * 从视频标题中提取话题标签
   *
   * @private
   */
  private extractHashtags(title: string): string[] {
    if (!title) return [];
    const matches = title.match(/#[^#\s]+/g);
    return matches ? matches.map((tag) => tag.replace('#', '')) : [];
  }

  /**
   * 根据签名推断内容分类
   *
   * @private
   */
  private inferContentCategories(signature: string, nickname: string): string[] {
    const text = `${signature || ''} ${nickname || ''}`.toLowerCase();
    const categoryMap: Array<{ pattern: RegExp; category: string }> = [
      { pattern: /AI|人工智能|机器学习|深度学习|GPT|LLM/, category: '科技/AI' },
      { pattern: /编程|开发|代码|前端|后端|全栈|程序员/, category: '技术开发' },
      { pattern: /创业|融资|商业|CEO|创始人/, category: '创业商业' },
      { pattern: /投资|理财|基金|股票|金融|财经/, category: '金融投资' },
      { pattern: /区块链|Web3|加密货币|比特币|NFT/, category: '区块链/Web3' },
      { pattern: /电商|带货|淘宝|京东|跨境/, category: '电子商务' },
      { pattern: /营销|推广|运营|增长/, category: '市场营销' },
      { pattern: /设计|UI|UX|平面|品牌/, category: '设计创意' },
      { pattern: /穿搭|时尚|美妆|护肤/, category: '时尚美妆' },
      { pattern: /美食|探店|烹饪|食谱/, category: '美食生活' },
      { pattern: /健身|运动|减肥|瑜伽/, category: '健康运动' },
      { pattern: /旅行|旅游|攻略|景点/, category: '旅行户外' },
      { pattern: /育儿|亲子|宝宝|儿童/, category: '母婴亲子' },
      { pattern: /教育|学习|英语|考试/, category: '教育培训' },
    ];

    return categoryMap.filter(({ pattern }) => pattern.test(text)).map(({ category }) => category);
  }

  /**
   * 格式化日期为抖音要求的 YYYYMMDD 格式
   *
   * @private
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}
