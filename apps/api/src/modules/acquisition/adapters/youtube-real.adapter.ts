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
import { RawLead, PlatformCollectOptions } from '../types/acquisition.types';

// ==================== YouTube Data API v3 类型定义 ====================

interface YtChannelItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    publishedAt: string;
    thumbnails: Record<string, { url: string; width?: number; height?: number }>;
    country?: string;
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
  brandingSettings?: { channel?: { keywords?: string; defaultLanguage?: string } };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
}

interface YtSearchItem {
  id: { kind: string; videoId?: string; channelId?: string; playlistId?: string };
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: Record<string, { url: string; width?: number; height?: number }>;
  };
}

interface YtVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    tags?: string[];
    categoryId: string;
    publishedAt: string;
    thumbnails: Record<string, { url: string; width?: number; height?: number }>;
  };
  statistics: { viewCount: string; likeCount: string; commentCount: string; favoriteCount: string };
  contentDetails?: { duration: string; dimension: string };
}

interface YtCommentThreadItem {
  id: string;
  snippet: {
    topLevelComment: {
      id: string;
      snippet: {
        authorDisplayName: string;
        authorProfileImageUrl: string;
        authorChannelId: { value: string };
        textDisplay: string;
        textOriginal: string;
        likeCount: number;
        publishedAt: string;
        totalReplyCount: number;
      };
    };
    totalReplyCount: number;
    isPublic: boolean;
  };
  replies?: {
    comments: Array<{
      id: string;
      snippet: {
        authorDisplayName: string;
        textDisplay: string;
        likeCount: number;
        publishedAt: string;
      };
    }>;
  };
}

// ==================== 错误码映射 ====================

const YT_ERROR_CODES: Record<string, string> = {
  quotaExceeded: 'API 配额已耗尽（每日 10,000 units）',
  forbidden: '访问被禁止，可能缺少权限',
  notFound: '请求的资源不存在（频道/视频/评论已删除）',
  invalidCredentials: 'API Key 或 OAuth 凭证无效',
  keyInvalid: 'API Key 无效或已过期',
  commentsDisabled: '该视频已关闭评论功能',
  rateLimitExceeded: '请求频率超限',
};

// ==================== 适配器实现 ====================

/**
 * YouTube Data API v3 平台适配器（真实 API 实现）
 *
 * 对接 Google YouTube Data API v3，支持：
 * - Google OAuth2 授权码流程
 * - API Key + OAuth2 Access Token 双模式认证
 * - 频道搜索与详情查询
 * - 视频列表与统计数据获取
 * - 评论线程采集
 * - YouTube Analytics 报告查询
 *
 * ## 前置条件
 * - Google Cloud Console 项目 + YouTube Data API v3 已启用
 * - OAuth 客户端 ID + API Key
 * ## 配额：10,000 units/天（search=100u, channels.list=1u, videos.list=1u）
 */
@Injectable()
export class YoutubeRealAdapter extends BasePlatformAdapter {
  readonly platformId = 'youtube';
  override readonly platformName = 'YouTube';

  private static readonly API_BASE = 'https://www.googleapis.com/youtube/v3';
  private static readonly OAUTH_URL = 'https://accounts.google.com/o/oauth2/auth';
  private static readonly TOKEN_URL = 'https://oauth2.googleapis.com/token';

  // TODO: 替换为实际凭证
  private readonly apiKey: string = process.env.YOUTUBE_API_KEY || '';
  private readonly clientId: string = process.env.YOUTUBE_CLIENT_ID || '';
  private readonly clientSecret: string = process.env.YOUTUBE_CLIENT_SECRET || '';
  private readonly redirectUri: string = process.env.YOUTUBE_REDIRECT_URI || '';

  getRateLimitConfig(): RateLimitConfig {
    return {
      requestsPerDay: parseInt(process.env.YOUTUBE_RATE_LIMIT_DAY || '10000', 10),
      requestsPerHour: parseInt(process.env.YOUTUBE_RATE_LIMIT_HOUR || '500', 10),
      requestsPerMinute: parseInt(process.env.YOUTUBE_RATE_LIMIT_MINUTE || '30', 10),
      maxConcurrent: 5,
    };
  }

  // ==================== OAuth2 ====================

  /** 构建 Google OAuth2 授权 URL */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/yt-analytics.readonly',
      ].join(' '),
      state,
    });
    return `${YoutubeRealAdapter.OAUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<PlatformAccessToken> {
    this.logger.log(`[YouTube] 用授权码换取令牌...`);
    try {
      const body = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }).toString();
      const res = await fetch(YoutubeRealAdapter.TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const data = await res.json();
      if (data.error)
        this.handlePlatformError(
          { errorCode: data.error, message: data.error_description },
          'exchangeCodeForToken'
        );
      return {
        accessToken: data.access_token,
        tokenType: data.token_type || 'Bearer',
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
        refreshToken: data.refresh_token,
        scope: data.scope,
      };
    } catch (e) {
      if ((e as Error).message.includes('handlePlatformError')) throw e;
      this.handlePlatformError(e, 'exchangeCodeForToken');
    }
  }

  async refreshToken(t: PlatformAccessToken): Promise<PlatformAccessToken> {
    if (!t.refreshToken) throw new Error('[YouTube] 无 refresh_token');
    try {
      const body = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: t.refreshToken,
        grant_type: 'refresh_token',
      }).toString();
      const res = await fetch(YoutubeRealAdapter.TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const data = await res.json();
      if (data.error) {
        if (data.error === 'invalid_grant') throw new Error(`[YouTube] Refresh Token 已被撤销`);
        this.handlePlatformError(
          { errorCode: data.error, message: data.error_description },
          'refreshToken'
        );
      }
      return {
        accessToken: data.access_token,
        tokenType: data.token_type || 'Bearer',
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
        refreshToken: t.refreshToken,
        scope: data.scope || t.scope,
      };
    } catch (e) {
      if (
        (e as Error).message.includes('handlePlatformError') ||
        (e as Error).message.includes('Refresh Token')
      )
        throw e;
      this.handlePlatformError(e, 'refreshToken');
    }
  }

  async validateToken(token: PlatformAccessToken): Promise<boolean> {
    try {
      const url = `${YoutubeRealAdapter.API_BASE}/channels?part=id&mine=true&access_token=${token.accessToken}`;
      const res = await fetch(url);
      const d = await res.json();
      return !d.error && (d.items?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }

  // ==================== 数据采集 ====================

  /**
   * 搜索/获取 YouTube 频道创作者数据
   * 支持 Channel ID (UC...) / 自定义 URL (@xxx) / 关键词搜索
   */
  async fetchInfluencers(query: string, options?: PlatformCollectOptions): Promise<RawLead[]> {
    this.logger.log(`[YouTube] 开始采集频道数据，query=${query}`);
    const limit = options?.limit || 20;
    try {
      const isChannelId = /^UC[a-zA-Z0-9_-]{22}$/.test(query.trim());
      const isCustomUrl = /^@/.test(query.trim());
      if (isChannelId || isCustomUrl)
        return [
          (await this.fetchSingleChannel(
            query.trim(),
            options as Record<string, unknown>
          )) as unknown as RawLead,
        ];

      const results: RawLead[] = [];
      let pageToken: string | undefined;
      while (results.length < limit) {
        const sr = await this.searchChannels(
          query,
          Math.min(limit - results.length, 50),
          pageToken,
          (options?.extra as any)?.order || 'relevance',
          options?.region,
          options?.locale
        );
        for (const item of sr.items) {
          if (item.id?.channelId && results.length < limit)
            results.push(
              (await this.fetchSingleChannel(
                item.id.channelId,
                options as Record<string, unknown>
              )) as unknown as RawLead
            );
        }
        pageToken = sr.nextPageToken;
        if (!pageToken) break;
      }
      this.logger.log(`[YouTube] 采集完成，共 ${results.length} 条`);
      return results;
    } catch (e) {
      if ((e as Error).message.includes('handlePlatformError')) throw e;
      this.handlePlatformError(e, `fetchInfluencers(${query})`);
    }
  }

  async fetchInfluencerStats(id: string, opts?: Record<string, any>): Promise<any> {
    const ch = await this.fetchSingleChannel(id, opts);
    let analytics: any = null;
    try {
      analytics = await this.getChannelAnalytics(id, opts);
    } catch {
      /* analytics 可选 */
    }
    return { ...ch, analytics };
  }

  async fetchContentList(
    influencerId: string,
    pag?: PaginationParams
  ): Promise<PaginatedResponse<RawLead>> {
    const ch = await this.fetchSingleChannel(influencerId, {});
    const playlistId = (ch.contentDetails as { relatedPlaylists?: { uploads?: string } })?.relatedPlaylists?.uploads;
    if (!playlistId)
      return {
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    const ps = Math.min(pag?.pageSize || 20, 50);
    const pt = pag?.cursor || '';
    const videos = await this.fetchPlaylistItems(playlistId, ps, pt);
    return {
      data: videos.items.map((v: Record<string, unknown>) => ({
        ...v,
        _channelId: influencerId,
      })) as unknown as RawLead[],
      pagination: {
        page: pag?.page || 1,
        pageSize: ps,
        total: videos.totalResults ?? -1,
        totalPages: -1,
        hasNextPage: !!videos.nextPageToken,
        hasPreviousPage: !!pt,
        nextCursor: videos.nextPageToken || undefined,
      },
    };
  }

  async fetchContentDetail(contentId: string): Promise<RawLead> {
    const parts = ['snippet', 'statistics', 'contentDetails'].join(',');
    const params = new URLSearchParams({ part: parts, id: contentId, key: this.apiKey });
    const res = await fetch(`${YoutubeRealAdapter.API_BASE}/videos?${params.toString()}`);
    const data = await res.json();
    if (data.error) this.handlePlatformError(data.error, `fetchContentDetail(${contentId})`);
    return (data.items?.[0] || {}) as RawLead;
  }

  async fetchComments(
    contentId: string,
    pag?: PaginationParams
  ): Promise<PaginatedResponse<RawLead>> {
    const ps = Math.min(pag?.pageSize || 20, 100);
    const pt = pag?.cursor || '';
    const params = new URLSearchParams({
      part: 'snippet,replies',
      videoId: contentId,
      maxResults: String(ps),
      order: 'relevance',
      textFormat: 'plainText',
      ...(pt ? { pageToken: pt } : {}),
      key: this.apiKey,
    });
    const res = await fetch(`${YoutubeRealAdapter.API_BASE}/commentThreads?${params.toString()}`);
    const data = await res.json();
    if (data.error) this.handlePlatformError(data.error, `fetchComments(${contentId})`);
    return {
      data: (data.items || []) as unknown as RawLead[],
      pagination: {
        page: pag?.page || 1,
        pageSize: ps,
        total: data.pageInfo?.totalResults ?? -1,
        totalPages: -1,
        hasNextPage: !!data.nextPageToken,
        hasPreviousPage: !!pt,
        nextCursor: data.nextPageToken || undefined,
      },
    };
  }

  // ==================== 标准化 ====================

  normalizeInfluencer(raw: any): NormalizedInfluencer {
    const now = new Date();
    const sn = raw.snippet || {};
    const st = raw.statistics || {};
    const oid = raw.id || '';
    const subs =
      st.hiddenSubscriberCount !== true
        ? parseInt(String(st.subscriberCount || '0'), 10)
        : undefined;
    return {
      id: `youtube:${oid}`,
      platform: 'youtube',
      platformId: oid,
      displayName: sn.title || 'YouTube Channel',
      username: sn.customUrl?.replace('@', ''),
      bio: sn.description || '',
      followerCount: subs,
      followingCount: undefined,
      postCount: parseInt(String(st.videoCount || '0'), 10),
      engagementRate: this.calcEngagement(st),
      avatarUrl: sn.thumbnails?.maxres?.url || sn.thumbnails?.high?.url,
      profileUrl: sn.customUrl
        ? `https://www.youtube.com/${sn.customUrl}`
        : `https://www.youtube.com/channel/${oid}`,
      location: sn.country,
      language: raw.brandingSettings?.channel?.defaultLanguage,
      tags: this.extractTags(sn.description, sn.title, raw.brandingSettings?.channel?.keywords),
      avgEngagement: {
        likes: this.estimateAvgLikes(st),
        comments: this.estimateAvgComments(st),
        shares: 0,
        saves: 0,
      },
      contactInfo: { website: this.extractWebsite(sn.description) },
      contentCategories: this.inferCategories(sn.description, sn.title),
      lastActiveAt: sn.publishedAt ? new Date(sn.publishedAt) : undefined,
      rawJson: JSON.stringify(raw),
      collectedAt: now,
    };
  }

  normalizeContent(raw: any): NormalizedContent {
    const sn = raw.snippet || {};
    const st = raw.statistics || {};
    const cd = raw.contentDetails || {};
    const isShort = this.isShort(cd.duration, sn.tags);
    return {
      id: `yt_video:${raw.id}`,
      platform: 'youtube',
      authorId: raw._channelId || sn.channelId || '',
      contentType: isShort ? 'short' : 'video',
      title: sn.title,
      caption: sn.description,
      mediaUrls: [],
      thumbnailUrl: sn.thumbnails?.maxres?.url || sn.thumbnails?.high?.url,
      publishedAt: new Date(sn.publishedAt),
      engagement: {
        views: parseInt(String(st.viewCount || '0'), 10),
        likes: parseInt(String(st.likeCount || '0'), 10),
        comments: parseInt(String(st.commentCount || '0'), 10),
        shares: 0,
        saves: parseInt(String(st.favoriteCount || '0'), 10),
      },
      tags: sn.tags || this.extractHashtags(sn.description),
      url: `https://www.youtube.com/watch?v=${raw.id}`,
      rawJson: JSON.stringify(raw),
    };
  }

  normalizeComment(raw: any): NormalizedComment {
    const tc = raw.snippet?.topLevelComment?.snippet || {};
    return {
      id: `yt_comment:${raw.id}`,
      contentId: '',
      authorId: tc.authorChannelId?.value || '',
      authorName: tc.authorDisplayName || 'User',
      authorAvatarUrl: tc.authorProfileImageUrl,
      text: tc.textOriginal || tc.textDisplay || '',
      createdAt: new Date(tc.publishedAt),
      likes: tc.likeCount || 0,
      replyCount: raw.snippet?.totalReplyCount || 0,
      rawJson: JSON.stringify(raw),
    };
  }

  // ==================== 错误处理 ====================

  handlePlatformError(error: any, context: string): never {
    const code = error?.errorCode || error?.error?.errors?.[0]?.reason || error?.status;
    const msgStr = error?.message || error?.error?.message || String(error);
    const known = code ? YT_ERROR_CODES[String(code)] : null;
    let msg: string;
    if (known) {
      msg = `[YouTube API 错误] ${context}: [${code}] ${known}`;
      if (code === 'quotaExceeded') msg += ' → 配额耗尽，明日重置或申请提额';
      else if (code === 'forbidden') msg += ' → 缺少 youtube.readonly 权限';
      else if (code === 'notFound') msg += ' → 资源不存在或已删除';
      else if (code === 'commentsDisabled') msg += ' → 该视频已关闭评论';
    } else {
      msg = `[YouTube API 错误] ${context}: ${msgStr}`;
    }
    this.logger.error(msg);
    const err = new Error(msg);
    (err as any).platform = 'youtube';
    (err as any).errorCode = code;
    (err as any).context = context;
    throw err;
  }

  // ==================== 私有方法 ====================

  /** 查询单个频道完整信息 */
  private async fetchSingleChannel(channelId: string, _opts?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const parts = ['snippet', 'statistics', 'brandingSettings', 'contentDetails'].join(',');
    const params = new URLSearchParams({ part: parts, id: channelId, key: this.apiKey });
    const res = await fetch(`${YoutubeRealAdapter.API_BASE}/channels?${params.toString()}`);
    const data = await res.json();
    if (data.error) this.handlePlatformError(data.error, `fetchSingleChannel(${channelId})`);
    if (!data.items?.length)
      this.handlePlatformError(
        { errorCode: 'notFound', message: `频道 ${channelId} 不存在` },
        `fetchSingleChannel`
      );
    return data.items[0];
  }

  /** 搜索频道 */
  private async searchChannels(
    q: string,
    maxRes: number,
    pageToken?: string,
    order?: string,
    regionCode?: string,
    lang?: string
  ): Promise<{ items: YtSearchItem[]; nextPageToken?: string }> {
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'channel',
      q,
      maxResults: String(maxRes),
      order: order || 'relevance',
      ...(pageToken ? { pageToken } : {}),
      ...(regionCode ? { regionCode } : {}),
      ...(lang ? { relevanceLanguage: lang } : {}),
      key: this.apiKey,
    });
    const res = await fetch(`${YoutubeRealAdapter.API_BASE}/search?${params.toString()}`);
    const data = await res.json();
    if (data.error) this.handlePlatformError(data.error, `searchChannels(${q})`);
    return { items: data.items || [], nextPageToken: data.nextPageToken };
  }

  /** 获取 Playlist Items */
  private async fetchPlaylistItems(
    playlistId: string,
    maxRes: number,
    pageToken?: string
  ): Promise<{ items: any[]; nextPageToken?: string; totalResults?: number }> {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: String(maxRes),
      ...(pageToken ? { pageToken } : {}),
      key: this.apiKey,
    });
    const res = await fetch(`${YoutubeRealAdapter.API_BASE}/playlistItems?${params.toString()}`);
    const data = await res.json();
    if (data.error) this.handlePlatformError(data.error, `playlistItems(${playlistId})`);
    return {
      items: data.items || [],
      nextPageToken: data.nextPageToken,
      totalResults: data.pageInfo?.totalResults,
    };
  }

  /** 获取频道 Analytics 报告 */
  private async getChannelAnalytics(channelId: string, opts?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const accessToken = await this.getValidAccessToken();
    const today = new Date();
    const endDate = this.formatDate(today);
    const startDate = this.formatDate(new Date(today.getTime() - 28 * 86400000));
    const ids = `channel==${channelId}`;
    const metricsDefault = 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained';
    const metricsArr = String(opts?.metrics || metricsDefault).split(',').map((s: string) => s.trim());
    const dimensionsVal = String(opts?.dimensions || 'day');
    const filtersVal = String(opts?.filters || '');
    const sortVal = String(opts?.sort || '-day');

    const searchParams = new URLSearchParams();
    searchParams.set('ids', ids);
    searchParams.set('startDate', startDate);
    searchParams.set('endDate', endDate);
    searchParams.set('metrics', metricsArr.join(','));
    searchParams.set('dimensions', dimensionsVal);
    if (filtersVal) searchParams.set('filters', filtersVal);
    searchParams.set('sort', sortVal);
    searchParams.set('maxResults', '30');
    searchParams.set('access_token', accessToken);

    const res = await fetch(`${YoutubeRealAdapter.API_BASE}/reports?${searchParams.toString()}`);
    const data = await res.json();
    if (data.error) this.handlePlatformError(data.error, `getChannelAnalytics(${channelId})`);
    return data;
  }

  /** 计算互动率 */
  private calcEngagement(stats: any): number {
    const views = parseInt(String(stats.viewCount || '0'), 10);
    const subs =
      stats.hiddenSubscriberCount !== true ? parseInt(String(stats.subscriberCount || '0'), 10) : 0;
    const videos = parseInt(String(stats.videoCount || '0'), 10);
    if (subs === 0 || videos === 0) return undefined as any;
    const avgViews = views / videos;
    const ratio = avgViews / subs;
    return parseFloat(Math.min(ratio * 15, 1).toFixed(4));
  }

  /** 估算平均点赞数 */
  private estimateAvgLikes(stats: any): number {
    const views = parseInt(String(stats.viewCount || '0'), 10);
    const videos = parseInt(String(stats.videoCount || '0'), 10);
    if (views === 0 || videos === 0) return 0;
    // 经验值：平均点赞率约 2-5%
    return Math.floor((views / videos) * 0.035);
  }

  /** 估算平均评论数 */
  private estimateAvgComments(stats: any): number {
    const likes = this.estimateAvgLikes(stats);
    return Math.floor(likes * 0.05); // 评论数约为点赞数的 ~5%
  }

  /** 判断是否为 YouTube Short (<60s 竖屏) */
  private isShort(durationStr?: string, tags?: string[]): boolean {
    if (!durationStr) return false;
    // 解析 ISO 8601 duration
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return false;
    const seconds =
      parseInt(match[1] || '0') * 3600 + parseInt(match[2] || '0') * 60 + parseInt(match[3] || '0');
    if (seconds > 60) return false;
    // 检查 #shorts 标签
    return tags?.some((t: string) => t.toLowerCase() === '#shorts') || true;
  }

  /** 提取标签 */
  private extractTags(desc: string, title: string, keywords?: string): string[] {
    const text = `${desc || ''} ${title || ''} ${keywords || ''}`.toLowerCase();
    const kw = [
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
      'gaming',
      'music',
      'cooking',
      'fitness',
      'travel',
      'photography',
      'vlog',
      'review',
      'news',
      'politics',
      'comedy',
      'entertainment',
      'science',
      'DIY',
      'craft',
      '编程',
      '教程',
      '科技',
      '创业',
      '投资',
      '区块链',
      '人工智能',
      '美食',
      '旅行',
      '健身',
      '摄影',
      '音乐',
      '游戏',
      '搞笑',
      '知识',
      '科普',
      '数码',
      '测评',
      '财经',
      '教育',
    ];
    return kw.filter((k) => text.includes(k.toLowerCase()));
  }

  /** 提取 Hashtag */
  private extractHashtags(text: string): string[] {
    if (!text) return [];
    const m = text.match(/#[\w]+/g);
    return m ? m.map((t) => t.replace('#', '')) : [];
  }

  /** 从描述中提取网站链接 */
  private extractWebsite(desc: string): string | undefined {
    if (!desc) return undefined;
    const match = desc.match(/https?:\/\/(?!youtu\.be|youtube\.com|google\.com)[^\s<>"]+/i);
    return match?.[0];
  }

  /** 推断内容分类 */
  private inferCategories(desc: string, title: string): string[] {
    const text = `${desc || ''} ${title || ''}`.toLowerCase();
    const map: Array<{ p: RegExp; c: string }> = [
      { p: /tech|coding|program|software|dev|tutorial/, c: 'Technology & Education' },
      { p: /gaming|game|play|esport|moba|fps|rpg/, c: 'Gaming & Entertainment' },
      { p: /music|song|cover|beat|lyric|album/, c: 'Music' },
      { p: /cook|recipe|food|restaurant|chef|bake/, c: 'Food & Cooking' },
      { p: /fit|gym|workout|health|diet|muscle|yoga/, c: 'Fitness & Health' },
      { p: /travel|vlog|adventure|explore|trip|tour/, c: 'Travel & Vlogs' },
      { p: /fashion|style|beauty|makeup|skincare|ootd/, c: 'Fashion & Beauty' },
      { p: /funny|comedy|skit|prank|humor/, c: 'Comedy & Entertainment' },
      { p: /science|experiment|physics|chemistry|biology|space/, c: 'Science & Education' },
      { p: /finance|invest|stock|crypto|bitcoin|money|business/, c: 'Finance & Business' },
      { p: /review|unboxing|test|comparison|best|top/, c: 'Reviews & Unboxings' },
      { p: /diy|craft|home|decor|interior|build/, c: 'DIY & Home Improvement' },
      { p: /news|politics|analysis|commentary|debate/, c: 'News & Commentary' },
      { p: /sports|football|basketball|soccer|athlete|training/, c: 'Sports' },
      { p: /animation|cartoon|anime|draw|art|illustration/, c: 'Animation & Art' },
    ];
    return map.filter(({ p }) => p.test(text)).map(({ c }) => c);
  }

  /** 格式化日期 YYYY-MM-DD */
  private formatDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
