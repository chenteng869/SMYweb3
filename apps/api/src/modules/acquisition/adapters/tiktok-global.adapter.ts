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
import { RawLead } from '../types/acquisition.types';

// ==================== TikTok for Business API 类型定义 ====================

/** TikTok OAuth2 令牌响应 */
interface TiktokTokenResponse {
  code: number;
  message?: string;
  data: {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    refresh_token_expires_in: number;
    scope: string;
    advertiser_id?: string;
  };
}

/** TikTok 影响者信息 */
interface TiktokInfluencerInfo {
  advertiser_id: string;
  user_id: string;
  nickname: string;
  avatar_url: string;
  profile_url: string;
  bio_description: string;
  follower_count: number;
  following_count: number;
  video_count: number;
  like_count: number;
  is_verified: boolean;
  is_commerce_seller: boolean;
  region_code: string;
  language: string;
  category_tags: Array<{ id: string; name: string }>;
}

/** TikTok 视频列表项 */
interface TiktokVideoItem {
  item_id: string;
  create_time: number;
  title: string;
  description: string;
  video: {
    play_addr: { url_list: string[] };
    cover: { url_list: string[] };
    duration_ms: number;
  };
  statistics: {
    play_count: number;
    comment_count: number;
    digg_count: number;
    share_count: number;
    collect_count: number;
  };
  author: {
    id: string;
    unique_id: string;
    nickname: string;
  };
}

/** TikTok 视频统计数据 */
interface TiktokVideoStatsResponse {
  code: number;
  message?: string;
  data: {
    list: Array<{
      date: string;
      play_count: number;
      comment_count: number;
      digg_count: number;
      share_count: number;
      profile_view_count: number;
      follower_count: number;
      likes_count: number;
    }>;
    page_info: { total_number: number; page_size: number; page_number: number };
  };
}

/** TikTok 用户资料响应 */
interface TiktokUserProfileResponse {
  code: number;
  message?: string;
  data: {
    user_info: {
      open_id: string;
      union_id: string;
      avatar_url: string;
      avatar_depth_url: string;
      display_name: string;
      bio_description: string;
      profile_deep_link: string;
      is_verified: boolean;
      follower_count: number;
      following_count: number;
      likes_count: number;
      video_count: number;
      sec_uid: string;
      unique_id: string; // @handle
      language: string;
      region: string;
    };
  };
}

/** TikTok 评论列表 */
interface TiktokCommentsResponse {
  code: number;
  message?: string;
  data: {
    comments: Array<{
      comment_id: string;
      text: string;
      create_time: number;
      like_count: number;
      reply_comment_total: number;
      user: {
        uid: string;
        unique_id: string;
        nickname: string;
        avatar_thumb: { url_list: string[] };
      };
      parent_comment_id?: string;
    }>;
    cursor: number;
    has_more: boolean;
    total_count: number;
  };
}

// ==================== TikTok 错误码映射表 ====================

const TIKTOK_ERROR_CODES: Record<number, string> = {
  0: '成功',
  10001: '参数错误',
  10002: '签名验证失败',
  10003: 'access_token 无效或过期',
  10004: 'refresh_token 无效或过期',
  10005: 'code 已使用或过期',
  10006: '应用审核未通过',
  10007: '用户未授权该 scope',
  10008: '用户拒绝授权',
  20001: '接口调用频率超限',
  20002: '接口每日调用次数超限',
  20003: '接口权限不足',
  30001: '视频不存在',
  30002: '用户不存在',
  40001: '内容违规已被删除',
  50001: '内部服务错误',
};

// ==================== 适配器实现 ====================

/**
 * TikTok for Business / Marketing API 平台适配器（真实 API 实现）
 *
 * 对接 TikTok Marketing API（全球版，非中国版抖音），
 * 支持：
 * - TikTok OAuth2 授权码流程
 * - 影响者搜索与资料获取
 * - 视频列表与统计数据分析
 * - 评论数据采集
 * - 用户画像数据
 *
 * ## 使用前准备
 * 1. 在 [TikTok for Business](https://ads.tiktok.com) 注册开发者账号
 * 2. 创建应用并获取 App Key 和 App Secret
 * 3. 配置 OAuth 回调地址
 * 4. 申请 Research API 权限（影响者数据读取）
 *
 * ## 环境变量配置
 * - `TIKTOK_APP_KEY` — 应用 App Key
 * - `TIKTOK_APP_SECRET` — 应用 App Secret
 * - `TIKTOK_REDIRECT_URI` — OAuth 回调地址
 *
 * ## 重要说明
 * 本适配器对接的是 **TikTok Global API**（国际版），
 * 与国内**抖音开放平台 API** 是两套完全不同的体系。
 * 如果需要采集国内抖音数据，请使用 DouyinRealAdapter。
 *
 * ## 速率限制
 * - 各端点限制不同：通常 500-1000 次/天/端点
 * - Research API 可能有额外限制
 *
 * @extends BasePlatformAdapter
 */
@Injectable()
export class TiktokGlobalAdapter extends BasePlatformAdapter {
  readonly platformId = 'tiktok';
  override readonly platformName = 'TikTok';

  // ==================== 基础配置常量 ====================

  private static readonly API_BASE_URL = 'https://open.tiktokapis.com/v2';
  private static readonly RESEARCH_API_BASE = 'https://open.tiktokapis.com/research/v1';
  private static readonly OAUTH_AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/';
  private static readonly TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';

  // TODO: 替换为实际的应用凭证
  private readonly appKey: string = process.env.TIKTOK_APP_KEY || '';
  private readonly appSecret: string = process.env.TIKTOK_APP_SECRET || '';
  private readonly redirectUri: string =
    process.env.TIKTOK_REDIRECT_URI || 'https://your-domain.com/api/callback/tiktok';

  // ==================== 速率限制配置 ====================

  /**
   * 获取 TikTok API 的速率限制配置
   *
   * TikTok 各端点的限制不同：
   * - 用户信息查询：~1000 次/天
   * - 视频列表：~500 次/天
   * - 评论列表：~500 次/天
   * - 搜索接口：~200 次/天
   * - Research API：可能更严格
   */
  getRateLimitConfig(): RateLimitConfig {
    return {
      requestsPerDay: parseInt(process.env.TIKTOK_RATE_LIMIT_DAY || '5000', 10),
      requestsPerHour: parseInt(process.env.TIKTOK_RATE_LIMIT_HOUR || '200', 10),
      requestsPerMinute: parseInt(process.env.TIKTOK_RATE_LIMIT_MINUTE || '5', 10),
      maxConcurrent: 3,
    };
  }

  // ==================== OAuth2 认证流程 ====================

  /**
   * 构建 TikTok OAuth2 授权 URL
   *
   * 支持的 Scopes：
   * - `user.info.basic` — 基础用户信息
   * - `video.list` — 视频列表
   * - `video.data` — 视频数据统计
   * - `comment.list` — 评论列表
   * - `research.data` — 研究数据（如已申请）
   *
   * @param state CSRF 随机码
   * @returns TikTok 授权页面 URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: this.appKey,
      response_type: 'code',
      scope: ['user.info.basic', 'video.list', 'video.data', 'comment.list'].join(','),
      redirect_uri: this.redirectUri,
      state,
    });

    return `${TiktokGlobalAdapter.OAUTH_AUTHORIZE_URL}?${params.toString()}`;
  }

  /**
   * 用授权码换取访问令牌
   *
   * @param authorizationCode 授权码
   * @returns 令牌对象
   */
  async exchangeCodeForToken(authorizationCode: string): Promise<PlatformAccessToken> {
    this.logger.log(`[TikTok] 用授权码换取令牌...`);

    try {
      const body = new URLSearchParams({
        client_key: this.appKey,
        client_secret: this.appSecret,
        code: authorizationCode,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }).toString();

      const response = await fetch(TiktokGlobalAdapter.TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      const data: TiktokTokenResponse = await response.json();

      if (data.code !== 0) {
        this.handlePlatformError(
          { errorCode: data.code, message: data.message },
          'exchangeCodeForToken'
        );
      }

      this.logger.log(`[TikTok] 令牌获取成功，有效期 ${data.data.expires_in} 秒`);
      return {
        accessToken: data.data.access_token,
        tokenType: data.data.token_type || 'Bearer',
        expiresAt: Date.now() + data.data.expires_in * 1000,
        refreshToken: data.data.refresh_token,
        scope: data.data.scope,
      };
    } catch (error) {
      if ((error as Error).message.includes('handlePlatformError')) throw error;
      this.handlePlatformError(error, 'exchangeCodeForToken');
    }
  }

  /**
   * 刷新过期的访问令牌
   *
   * @param currentToken 当前令牌
   * @returns 新的令牌对象
   */
  async refreshToken(currentToken: PlatformAccessToken): Promise<PlatformAccessToken> {
    if (!currentToken.refreshToken) {
      throw new Error('[TikTok] 没有 refresh_token，需要重新进行 OAuth 授权');
    }

    this.logger.log(`[TikTok] 正在刷新令牌...`);

    try {
      const body = new URLSearchParams({
        client_key: this.appKey,
        client_secret: this.appSecret,
        grant_type: 'refresh_token',
        refresh_token: currentToken.refreshToken,
      }).toString();

      const response = await fetch(TiktokGlobalAdapter.TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      const data: TiktokTokenResponse = await response.json();

      if (data.code !== 0) {
        if (data.code === 10004) {
          throw new Error(`[TikTok] Refresh Token 已过期或无效，请重新引导用户授权。`);
        }
        this.handlePlatformError({ errorCode: data.code, message: data.message }, 'refreshToken');
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

  /** 验证令牌有效性 */
  async validateToken(token: PlatformAccessToken): Promise<boolean> {
    try {
      const url = `${TiktokGlobalAdapter.API_BASE_URL}/user/info/?access_token=${token.accessToken}&fields=open_id`;
      const res = await fetch(url);
      const d = await res.json();
      return d.code === 0 && !!d.data?.user_info?.open_id;
    } catch {
      return false;
    }
  }

  // ==================== 数据采集方法 ====================

  /**
   * 从 TikTok 搜索/获取影响者原始数据
   *
   * 支持模式：
   * 1. **用户 ID 直接查询** → /user/profile/
   * 2. **关键词搜索** → /research/influencer/ （Research API）
   *
   * @param query 用户 ID、@handle 或搜索关键词
   * @param options 可选参数
   * @returns 影响者原始数据数组
   */
  async fetchInfluencers(query: string, options?: Record<string, any>): Promise<RawLead[]> {
    this.logger.log(`[TikTok] 开始采集影响者数据，query=${query}`);
    const limit = options?.limit || 20;

    try {
      // 判断是否为用户 ID 或 @handle 格式
      const isHandle = /^@[\w.]+$/.test(query.trim());
      const isOpenId = /^[a-f0-9]{32}$/i.test(query.trim());

      if (isHandle || isOpenId) {
        const profile = await this.fetchUserProfile(query.trim(), options);
        return [profile];
      }

      // 关键词搜索路径
      const results: RawLead[] = [];
      let cursor = options?.cursor || 0;
      let hasMore = true;

      while (hasMore && results.length < limit) {
        const searchResult = await this.searchInfluencers(
          query,
          Math.min(limit - results.length, 20),
          cursor,
          options
        );

        results.push(...searchResult.items);
        hasMore = searchResult.hasMore;
        cursor = searchResult.nextCursor;
      }

      this.logger.log(`[TikTok] 采集完成，共 ${results.length} 条`);
      return results;
    } catch (error) {
      if ((error as Error).message.includes('handlePlatformError')) throw error;
      this.handlePlatformError(error, `fetchInfluencers(${query})`);
    }
  }

  async fetchInfluencerStats(influencerId: string, _options?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const profile = await this.fetchUserProfile(influencerId);
    return profile;
  }

  /**
   * 获取指定用户的视频内容列表
   *
   * @param influencerId 用户 ID
   * @param pagination 分页参数
   * @returns 分页的视频列表
   */
  async fetchContentList(
    influencerId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<RawLead>> {
    const accessToken = await this.getValidAccessToken();
    const pageSize = Math.min(pagination?.pageSize || 20, 20); // TikTok 最大 20
    const cursor = pagination?.cursor || '0';

    const params = new URLSearchParams({
      open_id: influencerId,
      count: String(pageSize),
      cursor,
      access_token: accessToken,
    });

    const url = `${TiktokGlobalAdapter.API_BASE_URL}/video/list/?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 0) {
      this.handlePlatformError(
        { errorCode: data.code, message: data.message },
        `fetchContentList(${influencerId})`
      );
    }

    const videos: TiktokVideoItem[] = data.data?.videos || [];

    return {
      data: videos.map((v) => ({ ...v, _influencerId: influencerId })) as unknown as RawLead[],
      pagination: {
        page: pagination?.page || 1,
        pageSize,
        total: data.data?.total_number ?? -1,
        totalPages: -1,
        hasNextPage: data.data?.has_more || false,
        hasPreviousPage: parseInt(cursor, 10) > 0,
        nextCursor: data.data?.cursor,
        prevCursor: undefined,
      },
    };
  }

  /** 获取单条视频的详细统计数据 */
  async fetchContentDetail(contentId: string): Promise<RawLead> {
    const accessToken = await this.getValidAccessToken();
    const today = new Date();
    const params = new URLSearchParams({
      video_id: contentId,
      start_date: this.formatDate(new Date(today.getTime() - 30 * 86400000)),
      end_date: this.formatDate(today),
      access_token: accessToken,
    });
    const url = `${TiktokGlobalAdapter.API_BASE_URL}/video/data/?${params.toString()}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 0)
      this.handlePlatformError(
        { errorCode: data.code, message: data.message },
        `fetchContentDetail(${contentId})`
      );
    return { item_id: contentId, analytics: data.data } as RawLead;
  }

  /** 获取视频评论列表 */
  async fetchComments(
    contentId: string,
    pag?: PaginationParams
  ): Promise<PaginatedResponse<RawLead>> {
    const accessToken = await this.getValidAccessToken();
    const ps = Math.min(pag?.pageSize || 20, 30);
    const cursor = pag?.cursor || '0';
    const params = new URLSearchParams({
      video_id: contentId,
      count: String(ps),
      cursor,
      sort_type: '0', // 0=按热度, 1=按时间
      access_token: accessToken,
    });
    const url = `${TiktokGlobalAdapter.API_BASE_URL}/comment/list/?${params.toString()}`;
    const res = await fetch(url);
    const data: TiktokCommentsResponse = await res.json();
    if (data.code !== 0)
      this.handlePlatformError(
        { errorCode: data.code, message: data.message },
        `fetchComments(${contentId})`
      );
    return {
      data: (data.data?.comments || []) as unknown as RawLead[],
      pagination: {
        page: pag?.page || 1,
        pageSize: ps,
        total: data.data?.total_count || 0,
        totalPages: Math.ceil((data.data?.total_count || 0) / ps),
        hasNextPage: data.data?.has_more || false,
        hasPreviousPage: parseInt(cursor, 10) > 0,
        nextCursor: String(data.data?.cursor || 0),
        prevCursor: undefined,
      },
    };
  }

  // ==================== 标准化方法 ====================

  normalizeInfluencer(raw: Record<string, unknown>): NormalizedInfluencer {
    const now = new Date();
    const ui = raw.user_info as Record<string, unknown> || raw;
    const oid = (ui.open_id as string) || (ui.user_id as string) || (raw.id as string) || `tt_${Date.now()}`;

    return {
      id: `tiktok:${oid}`,
      platform: 'tiktok' as NormalizedInfluencer['platform'],
      platformId: oid,
      displayName: ui.display_name || ui.nickname || 'TikTok User',
      username: ui.unique_id,
      bio: ui.bio_description || '',
      followerCount: ui.follower_count ?? 0,
      followingCount: ui.following_count ?? 0,
      postCount: ui.video_count ?? 0,
      engagementRate: this.calcEngagement(ui),
      avatarUrl: ui.avatar_url || ui.avatar_depth_url,
      profileUrl:
        ui.profile_deep_link ||
        (ui.unique_id ? `https://www.tiktok.com/@${ui.unique_id}` : undefined),
      isVerified: ui.is_verified ?? false,
      verificationType: ui.is_verified ? 'TikTok Verified Account' : undefined,
      location: ui.region,
      language: ui.language,
      tags: this.extractTags(ui.bio_description, ui.display_name, ui.category_tags),
      avgEngagement: {
        likes: ui.likes_count ? Math.floor(ui.likes_count / Math.max(ui.video_count || 1, 1)) : 0,
        comments: 0,
        shares: 0,
        saves: 0,
      },
      contactInfo: { website: ui.profile_deep_link },
      contentCategories: this.inferCategories(ui.bio_description, ui.display_name),
      lastActiveAt: raw.last_video_time ? new Date(raw.last_video_time * 1000) : undefined,
      rawJson: JSON.stringify(raw),
      collectedAt: now,
    };
  }

  normalizeContent(raw: Record<string, unknown>): NormalizedContent {
    const videoData = raw.video as Record<string, unknown> | undefined;
    const playAddr = videoData?.play_addr as Record<string, unknown> | undefined;
    const cover = videoData?.cover as Record<string, unknown> | undefined;
    const statistics = raw.statistics as Record<string, unknown> | undefined;
    const authorData = raw.author as Record<string, unknown> | undefined;
    return {
      id: `tt_video:${raw.item_id}`,
      platform: 'tiktok',
      authorId: (raw._influencerId as string) || (authorData?.id as string) || '',
      contentType: 'video',
      title: raw.title as string | undefined,
      caption: raw.description as string | undefined,
      mediaUrls: (playAddr?.url_list as string[]) || [],
      thumbnailUrl: (cover?.url_list as string[])?.[0],
      publishedAt: new Date(((raw.create_time as number) || 0) * 1000),
      engagement: {
        views: (statistics?.play_count as number) || 0,
        likes: (statistics?.digg_count as number) || 0,
        comments: (statistics?.comment_count as number) || 0,
        shares: (statistics?.share_count as number) || 0,
        saves: (statistics?.collect_count as number) || 0,
      },
      tags: this.extractHashtags(raw.description as string),
      url: raw.item_id
        ? `https://www.tiktok.com/@${authorData?.unique_id}/video/${raw.item_id}`
        : undefined,
      rawJson: JSON.stringify(raw),
    };
  }

  normalizeComment(raw: Record<string, unknown>): NormalizedComment {
    const userData = raw.user as Record<string, unknown> | undefined;
    const avatarThumb = userData?.avatar_thumb as Record<string, unknown> | undefined;
    return {
      id: `tt_comment:${raw.comment_id}`,
      contentId: '',
      authorId: (userData?.uid as string) || '',
      authorName: (userData?.nickname as string) || 'User',
      authorAvatarUrl: (avatarThumb?.url_list as string[])?.[0],
      text: (raw.text as string) || '',
      createdAt: new Date(((raw.create_time as number) || 0) * 1000),
      likes: (raw.like_count as number) || 0,
      replyCount: (raw.reply_comment_total as number) || 0,
      parentCommentId: raw.parent_comment_id as string | undefined,
      rawJson: JSON.stringify(raw),
    };
  }

  // ==================== 错误处理 ====================

  handlePlatformError(error: Error | Record<string, unknown>, context: string): never {
    const code = error?.errorCode || error?.code || error?.status;
    const msgStr = error?.message || error?.body || String(error);
    const known = code ? TIKTOK_ERROR_CODES[code as number] : null;
    let msg: string;
    if (known) {
      msg = `[TikTok API 错误] ${context}: [${code}] ${known}`;
      switch (code) {
        case 10003:
          msg += ' → access_token 无效，请检查或触发刷新';
          break;
        case 10004:
          msg += ' → refresh_token 过期，需重新授权';
          break;
        case 20001:
        case 20002:
          msg += ' → 请求频率超限，请降低调用频率';
          break;
        case 30001:
          msg += ' → 视频不存在或已被删除';
          break;
        case 30002:
          msg += ' → 用户不存在';
          break;
      }
    } else {
      msg = `[TikTok API 错误] ${context}: ${msgStr}`;
    }
    this.logger.error(msg);
    const err = new Error(msg);
    (err as any).platform = 'tiktok';
    (err as any).errorCode = code;
    (err as any).context = context;
    throw err;
  }

  // ==================== 私有辅助方法 ====================

  /** 获取用户完整资料 */
  private async fetchUserProfile(userIdentifier: string, _opts?: any): Promise<any> {
    const accessToken = await this.getValidAccessToken();
    const fields = [
      'open_id',
      'union_id',
      'avatar_url',
      'avatar_depth_url',
      'display_name',
      'bio_description',
      'profile_deep_link',
      'is_verified',
      'follower_count',
      'following_count',
      'likes_count',
      'video_count',
      'sec_uid',
      'unique_id',
      'language',
      'region',
    ].join(',');
    const params = new URLSearchParams({ fields, access_token: accessToken });
    // 根据标识类型选择不同参数名
    if (/^@/.test(userIdentifier)) {
      params.set('unique_id', userIdentifier.replace('@', ''));
    } else {
      params.set('open_id', userIdentifier);
    }
    const url = `${TiktokGlobalAdapter.API_BASE_URL}/user/info/?${params.toString()}`;
    const res = await fetch(url);
    const data: TiktokUserProfileResponse = await res.json();
    if (data.code !== 0)
      this.handlePlatformError(
        { errorCode: data.code, message: data.message },
        `fetchUserProfile(${userIdentifier})`
      );
    return data.data;
  }

  /** 通过 Research API 搜索影响者 */
  private async searchInfluencers(
    keyword: string,
    count: number,
    cursor: number,
    opts?: any
  ): Promise<{ items: RawLead[]; hasMore: boolean; nextCursor: number }> {
    const accessToken = await this.getValidAccessToken();

    // Research API 的搜索端点
    const body = {
      keyword,
      count,
      cursor,
      min_follower_count: opts?.min_fans,
      max_follower_count: opts?.max_fans,
      categories: opts?.categories,
      regions: opts?.regions,
      languages: opts?.languages,
    };

    try {
      const url = `${TiktokGlobalAdapter.RESEARCH_API_BASE}/research/influencer/?access_token=${accessToken}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.code === 0 && data.data?.list) {
        return {
          items: (data.data?.list || []).map((inf: Record<string, unknown>) => ({
            ...inf,
            _source: 'research_search',
          })) as RawLead[],
          hasMore: data.data.has_more || false,
          nextCursor: data.data.cursor || cursor + count,
        };
      }

      // Search not available or no results
      this.logger.warn(`[TikTok] Research API 搜索不可用 [${data.code}]: ${data.message}`);
      return { items: [], hasMore: false, nextCursor: cursor };
    } catch (e) {
      this.logger.warn(`[TikTok] 搜索失败: ${e instanceof Error ? e.message : ''}`);
      return { items: [], hasMore: false, nextCursor: cursor };
    }
  }

  /** 计算互动率 */
  private calcEngagement(ui: any): number {
    const fans = ui.follower_count || 0;
    const videos = ui.video_count || 0;
    const likes = ui.likes_count || 0;
    if (fans === 0 || videos === 0) return undefined as any;
    const avgLikes = likes / videos;
    const ratio = avgLikes / fans;
    // TikTok 典型互动率范围 0.003~0.08
    return parseFloat(Math.min(ratio * 12, 1).toFixed(4));
  }

  /** 提取标签 */
  private extractTags(bio: string, name: string, cats?: Array<{ name: string }>): string[] {
    const text = `${bio || ''} ${name || ''}`.toLowerCase();
    const kw = [
      'dance',
      'comedy',
      'education',
      'entertainment',
      'food',
      'gaming',
      'sports',
      'fitness',
      'fashion',
      'beauty',
      'travel',
      'music',
      'art',
      'DIY',
      'family',
      'pets',
      'lifestyle',
      'vlog',
      'storytelling',
      'review',
      'tutorial',
      'challenge',
      'duet',
      'stitch',
      'AI',
      'tech',
      'business',
      'finance',
      'crypto',
      'motivation',
      'health',
      'cooking',
      '舞蹈',
      '搞笑',
      '教育',
      '美食',
      '游戏',
      '运动',
      '健身',
      '时尚',
      '美妆',
      '旅行',
      '音乐',
      '艺术',
      '手工',
      '宠物',
      '生活',
      'Vlog',
      '教程',
      '挑战',
      '科技',
      '创业',
    ];
    const extracted = kw.filter((k) => text.includes(k.toLowerCase()));
    if (cats?.length) extracted.push(...cats.map((c) => c.name));
    return [...new Set(extracted)];
  }

  /** 提取 Hashtag */
  private extractHashtags(text: string): string[] {
    if (!text) return [];
    const m = text.match(/#[\w]+/g);
    return m ? m.map((t) => t.replace('#', '')) : [];
  }

  /** 推断内容分类 */
  private inferCategories(bio: string, name: string): string[] {
    const text = `${bio || ''} ${name || ''}`.toLowerCase();
    const map: Array<{ p: RegExp; c: string }> = [
      { p: /dance|choreo|trending|viral/, c: 'Dance & Viral' },
      { p: /comedy|funny|skit|humor|prank/, c: 'Comedy & Entertainment' },
      { p: /educat|learn|teach|study|fact|science/, c: 'Education & Knowledge' },
      { p: /food|cook|recipe|bake|chef|eat/, c: 'Food & Cooking' },
      { p: /game|gaming|esport|play|stream/, c: 'Gaming' },
      { p: /sport|fitness|gym|workout|athlet|train/, c: 'Sports & Fitness' },
      { p: /fashion|style|outfit|ootd|clothes|model/, c: 'Fashion & Style' },
      { p: /beauty|makeup|skincare|cosmetic|glam/, c: 'Beauty & Makeup' },
      { p: /travel|trip|adventure|explore|wanderlust/, c: 'Travel & Adventure' },
      { p: /music|song|cover|beat|sing|dj|producer/, c: 'Music' },
      { p: /art|draw|paint|design|create|craft|diy/, c: 'Art & Creativity' },
      { p: /famil|parent|kid|baby|child|home/, c: 'Family & Home' },
      { p: /pet|dog|cat|animal|cute|adorable/, c: 'Pets & Animals' },
      { p: /tech|gadget|review|unbox|test|comparison/, c: 'Tech & Reviews' },
      { p: /busin|entrepreneur|founder|startup|money|invest/, c: 'Business & Finance' },
      { p: /motivat|inspir|positiv|minds|growth|success/, c: 'Motivation & Lifestyle' },
      { p: /health|wellness|mental|self.care|mindful/, c: 'Health & Wellness' },
    ];
    return map.filter(({ p }) => p.test(text)).map(({ c }) => c);
  }

  /** 格式化日期 YYYYMMDD */
  private formatDate(d: Date): string {
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }
}
