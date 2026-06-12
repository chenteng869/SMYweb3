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

// ==================== 微信视频号 API 类型定义 ====================

/**
 * 微信第三方平台 component_access_token 响应
 * @see https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/2.0/api/Before_Develop/Access_Token.html
 */
interface WechatComponentTokenResponse {
  /** 组件访问令牌 */
  component_access_token: string;
  /** 过期时间（秒） */
  expires_in: number;
  errcode?: number;
  errmsg?: string;
}

/**
 * 微信授权方信息响应
 */
interface WechatAuthorizerInfoResponse {
  /** 授权方 appid */
  authorizer_appid: string;
  /** 授权方名称 */
  authorizer_info: {
    nick_name: string;
    head_img: string;
    service_type_info: { id: number };
    verify_type_info: { id: number };
    user_name: string; // 原始ID
    alias: string; // 微信号
    qrcode_url: string;
    signature?: string;
  };
  /** 授权信息 */
  authorization_info: {
    authorizer_appid: string;
    authorization_appid: string;
    func_info: Array<{ funcscope_category: { id: number } }>;
  };
  errcode?: number;
  errmsg?: string;
}

/**
 * 视频号直播间列表响应
 */
interface WechatBroadcastListResponse {
  errcode: number;
  errmsg: string;
  room_info_list: Array<{
    roomid: number;
    name: string;
    cover_img: string;
    live_status: number; // 101=直播中, 102=未开始, 103=已结束, 104=禁播, 105=暂停, 106=异常
    start_time: number;
    end_time: number;
    anchor_name: string;
    anchor_img: string;
    share_img: string;
    feed_public_img: string;
    screen_shot_img: string;
  }>;
  total: number;
}

/**
 * 视频号直播数据统计响应
 */
interface WechatBroadcastStatsResponse {
  errcode: number;
  errmsg: string;
  list: Array<{
    date_range: {
      begin_date: string;
      end_date: string;
    };
    ref_date: string;
    data: {
      member_count: number;
      total_user: number;
      new_user: number;
      total_user_pv: number;
      total_user_uv: number;
      pay_user_cnt: number;
      pay_order_cnt: number;
      pay_amount: number;
      watch_user_cnt: number;
      watch_user_pv: number;
      goods_show_cnt: number;
      goods_click_cnt: number;
      goods_pay_cnt: number;
      goods_pay_amount: number;
    };
  }>;
}

/**
 * 获取授权方选项值响应
 */
interface WechatAuthorizerOptionResponse {
  errcode: number;
  errmsg: string;
  authorizer_appid: string;
  option_name: string;
  option_value: string;
}

// ==================== 微信错误码映射表 ====================

const WECHAT_ERROR_CODES: Record<string, string> = {
  '0': '成功',
  '-1': '系统繁忙，请稍后重试',
  '40001': 'AppSecret 错误或 AppSecret 不属于此应用',
  '40002': 'grant_type 不合法',
  '40003': '不合法的 openid',
  '40013': '不合法的 AppID',
  '40014': 'access_token 无效或过期',
  '42001': 'access_token 已过期',
  '42002': 'refresh_token 已过期',
  '45009': '接口调用超过频率限制',
  '41001': '缺少 access_token 参数',
  '48001': 'API 功能未授权',
  '85066': '该房间号不存在',
  '85067': '获取数据失败',
  '85068': '没有权限查看该房间数据',
};

// ==================== 适配器实现 ====================

/**
 * 微信视频号平台适配器（真实 API 实现）
 *
 * 对接微信开放平台第三方应用模式（Component Mode），
 * 使用 **component_access_token** 认证机制（非标准 OAuth2）。
 *
 * 支持功能：
 * - 第三方平台 Component Access Token 管理
 * - 授权方（视频号账号）信息查询
 * - 直播间列表与状态监控
 * - 直播数据统计（观看人数、互动、带货等）
 *
 * ## 与其他平台的区别
 * 微信视频号使用**微信开放平台的第三方应用模式**：
 * - 不使用标准的 OAuth2 授权码流程
 * - 通过 `component_verify_ticket` + `component_access_token` 实现认证
 * - 每个授权的视频号有独立的 `authorizer_refresh_token`
 * - 需要先在微信开放平台创建第三方应用并完成资质审核
 *
 * ## 环境变量配置
 * - `WECHAT_COMPONENT_APP_ID` — 第三方应用 AppID
 * - `WECHAT_COMPONENT_APP_SECRET` — 第三方应用 AppSecret
 * - `WECHAT_COMPONENT_TOKEN` — 消息校验 Token
 * - `WECHAT_COMPONENT_ENCODING_AES_KEY` — 消息加密密钥
 *
 * ## API 文档参考
 * - 第三方平台：https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/2.0/api/
 * - 视频号直播：https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/livebroadcast/live-info/getLiveInfo.html
 *
 * @extends BasePlatformAdapter
 */
@Injectable()
export class WechatVideoAdapter extends BasePlatformAdapter {
  readonly platformId = 'wechat_video';
  override readonly platformName = '微信视频号';

  // ==================== 基础配置常量 ====================

  private static readonly API_BASE_URL = 'https://api.weixin.qq.com';
  private static readonly CGI_BIN_URL = '/cgi-bin/component';

  // TODO: 替换为实际的第三方应用配置
  private readonly componentAppId: string = process.env.WECHAT_COMPONENT_APP_ID || '';
  private readonly componentAppSecret: string = process.env.WECHAT_COMPONENT_APP_SECRET || '';

  /** 缓存的 component_access_token */
  private cachedComponentToken: {
    token: string;
    expiresAt: number;
  } | null = null;

  // ==================== 速率限制配置 ====================

  /**
   * 获取微信视频号平台的速率限制配置
   *
   * 微信开放平台的限制较为严格：
   * - 大部分接口：5000 次/分钟（按 IP + AppID 维度）
   * - 部分敏感接口：1000 次/天
   * - 直播相关接口：10000 次/天
   *
   * @returns 速率限制配置对象
   */
  getRateLimitConfig(): RateLimitConfig {
    return {
      requestsPerDay: parseInt(process.env.WECHAT_RATE_LIMIT_DAY || '50000', 10),
      requestsPerHour: parseInt(process.env.WECHAT_RATE_LIMIT_HOUR || '2000', 10),
      requestsPerMinute: parseInt(process.env.WECHAT_RATE_LIMIT_MINUTE || '100', 10),
      maxConcurrent: 5,
    };
  }

  // ==================== 认证流程（非标准 OAuth2） ====================

  /**
   * 构建微信第三方平台授权 URL
   *
   * 微信使用预授权码（pre_auth_code）机制而非标准 OAuth2。
   * 此方法生成引导用户进入微信授权页面的 URL。
   *
   * 流程说明：
   * 1. 先调用 getComponentToken() 获取 component_access_token
   * 2. 用 component_access_token 创建预授权码 pre_auth_code
   * 3. 将 pre_auth_code 拼接到授权 URL 中
   * 4. 用户点击后跳转回回调地址并携带 auth_code
   * 5. 用 auth_code 换取 authorizer 的 refresh_token
   *
   * @param state 防 CSRF 的随机状态码
   * @returns 微信第三方平台授权页面 URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      component_appid: this.componentAppId,
      pre_auth_code: '', // 需要动态获取
      redirect_uri: process.env.WECHAT_REDIRECT_URI || '',
      auth_type: '1', // 1=授权后可复用, 2=每次需重新授权
      state,
    });

    return `https://mp.weixin.qq.com/cgi-bin/componentloginpage?${params.toString()}`;
  }

  /**
   * 用授权码换取访问令牌
   *
   * 在微信第三方平台模式下，这里处理的是**授权方令牌交换**：
   * 使用 auth_code 换取 authorizer_access_token 和 authorizer_refresh_token。
   *
   * 注意：这与标准 OAuth2 的 exchangeCodeForToken 有所不同，
   * 微信的流程是两步式：先换 refresh_token，再用 refresh_token 换 access_token。
   *
   * @param authorizationCode 微信回调返回的 auth_code（有效期约 10 分钟）
   * @returns 包含 access_token 和 refresh_token 的令牌对象
   */
  async exchangeCodeForToken(authorizationCode: string): Promise<PlatformAccessToken> {
    this.logger.log(`[微信视频号] 开始用 auth_code 换取授权方令牌...`);

    try {
      const componentToken = await this.getComponentToken();

      // 第一步：用 auth_code 换取 authorizer_refresh_token
      const querySetRefreshToken = new URLSearchParams({
        component_appid: this.componentAppId,
        component_access_token: componentToken,
        authorization_code: authorizationCode,
      });

      const setRefreshResponse = await fetch(
        `${WechatVideoAdapter.API_BASE_URL}${WechatVideoAdapter.CGI_BIN_URL}/api_query_auth?${querySetRefreshToken.toString()}`
      );

      const setRefreshData = await setRefreshResponse.json();

      if (setRefreshData.errcode !== 0) {
        this.handlePlatformError(
          { errorCode: setRefreshData.errcode, message: setRefreshData.errmsg },
          'exchangeCodeForToken-step1'
        );
      }

      const authorizerRefreshToken =
        setRefreshData.authorization_info?.authorizer_refresh_token || '';
      const authorizerAppId = setRefreshData.authorization_info?.authorizer_appid || '';

      if (!authorizerRefreshToken) {
        throw new Error('[微信视频号] 未获取到 authorizer_refresh_token');
      }

      // 第二步：用 refresh_token 换取 access_token
      const queryGetToken = new URLSearchParams({
        component_appid: this.componentAppId,
        authorizer_appid: authorizerAppId,
        authorizer_refresh_token: authorizerRefreshToken,
        component_access_token: componentToken,
      });

      const getTokenResponse = await fetch(
        `${WechatVideoAdapter.API_BASE_URL}${WechatVideoAdapter.CGI_BIN_URL}/api_authorizer_token?${queryGetToken.toString()}`
      );

      const getTokenData = await getTokenResponse.json();

      if (getTokenData.errcode !== 0) {
        this.handlePlatformError(
          { errorCode: getTokenData.errcode, message: getTokenData.errmsg },
          'exchangeCodeForToken-step2'
        );
      }

      const token: PlatformAccessToken = {
        accessToken: getTokenData.authorizer_access_token,
        tokenType: 'Bearer',
        expiresAt: Date.now() + (getTokenData.expires_in || 7200) * 1000,
        refreshToken: authorizerRefreshToken,
        scope: 'wechat_video_full',
      };

      // 缓存 authorizer 信息以便后续使用
      (token as any).authorizerAppId = authorizerAppId;

      this.logger.log(
        `[微信视频号] 成功获取授权方令牌，有效期 ${getTokenData.expires_in || 7200} 秒`
      );
      return token;
    } catch (error) {
      if ((error as Error).message.includes('handlePlatformError')) throw error;
      this.handlePlatformError(error, 'exchangeCodeForToken');
    }
  }

  /**
   * 刷新过期的访问令牌
   *
   * 使用 authorizer_refresh_token 刷新 authorizer_access_token。
   *
   * @param currentToken 当前包含 refresh_token 的令牌对象
   * @returns 新的有效令牌对象
   */
  async refreshToken(currentToken: PlatformAccessToken): Promise<PlatformAccessToken> {
    if (!currentToken.refreshToken) {
      throw new Error('[微信视频号] 没有 authorizer_refresh_token，需要重新进行授权');
    }

    this.logger.log(`[微信视频号] 正在刷新授权方访问令牌...`);

    try {
      const componentToken = await this.getComponentToken();
      const authorizerAppId = (currentToken as any).authorizerAppId || '';

      if (!authorizerAppId) {
        throw new Error('[微信视频号] 缺少 authorizer_appid，无法刷新令牌');
      }

      const params = new URLSearchParams({
        component_appid: this.componentAppId,
        authorizer_appid: authorizerAppId,
        authorizer_refresh_token: currentToken.refreshToken,
        component_access_token: componentToken,
      });

      const response = await fetch(
        `${WechatVideoAdapter.API_BASE_URL}${WechatVideoAdapter.CGI_BIN_URL}/api_authorizer_token?${params.toString()}`
      );

      const data = await response.json();

      if (data.errcode !== 0) {
        if (data.errcode === 61003 || data.errcode === 42002) {
          throw new Error(
            `[微信视频号] Authorizer Refresh Token 已过期或无效，` +
              `请引导用户重新完成微信第三方平台授权。`
          );
        }
        this.handlePlatformError({ errorCode: data.errcode, message: data.errmsg }, 'refreshToken');
      }

      return {
        accessToken: data.authorizer_access_token,
        tokenType: 'Bearer',
        expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
        refreshToken: currentToken.refreshToken,
        scope: currentToken.scope,
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
   * 验证当前令牌是否有效
   *
   * 通过调用 getAuthorizerOption 尝试读取一个安全选项来验证 token。
   *
   * @param token 待验证的令牌
   * @returns true=有效
   */
  async validateToken(token: PlatformAccessToken): Promise<boolean> {
    try {
      const componentToken = await this.getComponentToken();
      const authorizerAppId = (token as any).authorizerAppId || '';

      if (!authorizerAppId) return false;

      const params = new URLSearchParams({
        component_appid: this.componentAppId,
        authorizer_appid: authorizerAppId,
        option_name: 'account_type',
        component_access_token: componentToken,
      });

      const response = await fetch(
        `${WechatVideoAdapter.API_BASE_URL}${WechatVideoAdapter.CGI_BIN_URL}/getAuthorizerOption?${params.toString()}`
      );
      const data = await response.json();
      return data.errcode === 0;
    } catch {
      return false;
    }
  }

  // ==================== 数据采集方法 ====================

  /**
   * 从微信视频号搜索/获取创作者原始数据
   *
   * 微信视频号的"创作者"概念对应于**小程序/公众号运营者**。
   * 由于微信生态的封闭性，不支持公开搜索用户，
   * 此方法主要支持通过已知 authorizer_appid 查询已授权账号信息。
   *
   * @param query 可为 authorizer_appid 或昵称关键词
   * @param options 可选参数
   * @returns 创作者原始数据数组
   */
  async fetchInfluencers(query: string, options?: Record<string, any>): Promise<RawLead[]> {
    this.logger.log(`[微信视频号] 开始采集创作者数据，查询: ${query}`);

    try {
      // 如果是已知的 authorizer_appid 格式（wx 开头 + 18 位），直接查询
      const isAppId = /^wx[a-f0-9]{16}$/i.test(query.trim());

      if (isAppId) {
        const info = await this.getAuthorizerBasicInfo(query);
        return [info];
      }

      // 微信不支持公开搜索用户，尝试通过昵称匹配已授权列表
      this.logger.warn(`[微信视频号] 微信不支持公开用户搜索，仅支持通过 authorizer_appid 查询`);
      return [];
    } catch (error) {
      if ((error as Error).message.includes('handlePlatformError')) throw error;
      this.handlePlatformError(error, `fetchInfluencers(query=${query})`);
    }
  }

  /**
   * 获取指定视频号账号的详细统计数据
   *
   * 包括基础信息、认证状态和可用功能权限等。
   *
   * @param influencerId authorizer_appid
   * @param options 可选参数
   * @returns 统计数据
   */
  async fetchInfluencerStats(influencerId: string, options?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const info = await this.getAuthorizerBasicInfo(influencerId);

    // 补充直播数据统计
    let broadcastStats: any = null;
    try {
      broadcastStats = await this.fetchBroadcastStatistics(influencerId);
    } catch {
      // 直播数据可能不可用
    }

    return { ...info, broadcast_stats: broadcastStats };
  }

  /**
   * 获取指定视频号的直播内容列表
   *
   * 微信视频号的核心内容形式之一就是**直播**。
   * 此方法返回该账号历史和正在进行的直播间信息。
   *
   * @param influencerId authorizer_appid
   * @param pagination 分页参数
   * @returns 分页的直播间列表
   */
  async fetchContentList(
    influencerId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<RawLead>> {
    const pageSize = pagination?.pageSize || 20;
    const page = pagination?.page || 0; // 微信从 0 开始分页

    try {
      const broadcastList = await this.getBroadcastList(influencerId, page, pageSize);

      return {
        data: broadcastList.room_info_list.map((room: Record<string, unknown>) => ({
          ...room,
          _influencerId: influencerId,
        })) as RawLead[],
        pagination: {
          page: page + 1, // 转换为 1-based
          pageSize,
          total: broadcastList.total,
          totalPages: Math.ceil(broadcastList.total / pageSize),
          hasNextPage: (page + 1) * pageSize < broadcastList.total,
          hasPreviousPage: page > 0,
          nextCursor: String(page + 1),
          prevCursor: page > 0 ? String(page - 1) : undefined,
        },
      };
    } catch (error) {
      if ((error as Error).message.includes('handlePlatformError')) throw error;
      this.handlePlatformError(error, `fetchContentList(${influencerId})`);
    }
  }

  /**
   * 获取单条直播内容的详细数据
   *
   * 对于微信视频号，contentId 对应的是直播间 roomid。
   *
   * @param contentId 直播间 roomid（数字）
   * @returns 直播详细统计数据
   */
  async fetchContentDetail(contentId: string): Promise<RawLead> {
    const roomId = parseInt(contentId, 10);
    if (isNaN(roomId)) {
      this.handlePlatformError({ message: `无效的直播间 ID: ${contentId}` }, 'fetchContentDetail');
    }

    // 获取单场直播的详细数据
    const stats = await this.getSingleBroadcastStats(roomId);
    return stats as RawLead;
  }

  /**
   * 获取直播评论/弹幕数据
   *
   * 微信视频号的评论系统基于**弹幕**机制，
   * 需要通过 WebSocket 实时连接获取。
   * 当前实现返回模拟结构，实际部署时需接入 WebSocket 服务。
   *
   * @param contentId 直播间 roomid
   * @param pagination 分页参数
   * @returns 分页的弹幕/评论数据
   */
  async fetchComments(
    _contentId: string,
    _pagination?: PaginationParams
  ): Promise<PaginatedResponse<RawLead>> {
    // TODO: 微信视频号评论需要通过 WebSocket 实时推送获取
    // 参考文档：https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/livebroadcast/live-comment/getLiveComments.html
    // 当前返回空结果
    this.logger.warn(`[微信视频号] 直播弹幕需要 WebSocket 实时连接，暂不支持离线拉取`);
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
  }

  // ==================== 数据标准化方法 ====================

  /**
   * 将微信视频号原始数据标准化为统一影响者格式
   *
   * 字段映射规则：
   * | 微信字段 | 标准字段 |
   * |---------|---------|
   * | authorizer_appid | platformId |
   * | nick_name | displayName |
   * | user_name | username (原始ID) |
   * | alias | bio (微信号) |
   * | head_img | avatarUrl |
   * | service_type_info.id | verificationType |
   * | verify_type_info.id | isVerified |
   *
   * @param raw 微信授权方信息原始数据
   * @returns 标准化的影响者数据
   */
  normalizeInfluencer(raw: Record<string, unknown>): NormalizedInfluencer {
    const now = new Date();
    const info = raw.authorizer_info as Record<string, unknown> || raw;

    return {
      id: `wechat_video:${raw.authorizer_appid || raw.appid || ''}`,
      platform: 'wechat_video' as NormalizedInfluencer['platform'],
      platformId: raw.authorizer_appid || raw.appid || '',
      displayName: info.nick_name || '微信视频号',
      username: info.alias || info.user_name,
      bio: info.signature || info.alias || '',
      followerCount: undefined, // 微信不公开粉丝数
      followingCount: undefined,
      postCount: raw.broadcast_total_count || undefined,
      engagementRate: undefined,
      avatarUrl: info.head_img,
      profileUrl: info.qrcode_url,
      isVerified: !!(info.verify_type_info?.id && info.verify_type_info.id > -1),
      verificationType: this.getVerifyTypeName(
        info.verify_type_info?.id,
        info.service_type_info?.id
      ),
      location: undefined,
      language: 'zh-CN',
      tags: ['视频号', '微信', '直播'],
      avgEngagement: raw.broadcast_avg_data
        ? {
            likes: raw.broadcast_avg_data.like_count || 0,
            comments: raw.broadcast_avg_data.comment_count || 0,
            shares: 0,
            saves: 0,
          }
        : undefined,
      contactInfo: {
        website: info.qrcode_url,
      },
      lastActiveAt: raw.last_broadcast_time ? new Date(raw.last_broadcast_time * 1000) : undefined,
      rawJson: JSON.stringify(raw),
      collectedAt: now,
    };
  }

  /**
   * 将微信直播间数据标准化为统一内容格式
   *
   * 微信视频号的内容主要是**直播**形式，
   * 因此 contentType 固定为 'live'。
   *
   * @param raw 直播间原始数据
   * @returns 标准化的内容数据
   */
  normalizeContent(raw: any): NormalizedContent {
    const liveStatusMap: Record<number, string> = {
      101: '直播中',
      102: '未开始',
      103: '已结束',
      104: '已禁播',
      105: '已暂停',
      106: '异常',
    };

    return {
      id: `wechat_live:${raw.roomid}`,
      platform: 'wechat_video',
      authorId: raw._influencerId || '',
      contentType: 'live',
      title: raw.name || '视频号直播',
      caption: raw.name || '',
      mediaUrls: [raw.cover_img, raw.feed_public_img].filter(Boolean),
      thumbnailUrl: raw.cover_img || raw.share_img,
      publishedAt: new Date((raw.start_time || 0) * 1000),
      engagement: {
        views: raw.watch_user_cnt || 0,
        likes: 0, // 微信不单独提供点赞数
        comments: 0,
        shares: 0,
        saves: 0,
      },
      tags: [liveStatusMap[raw.live_status] || '未知状态'],
      url: raw.roomid
        ? `https://channels.weixin.qq.com/web/pages/live-room-detail?roomId=${raw.roomid}`
        : undefined,
      rawJson: JSON.stringify(raw),
    };
  }

  /**
   * 将微信弹幕/评论数据标准化为统一格式
   *
   * @param raw 弹幕原始数据
   * @returns 标准化的评论数据
   */
  normalizeComment(raw: Record<string, unknown>): NormalizedComment {
    return {
      id: `wechat_danmaku:${raw.comment_id || Date.now()}`,
      contentId: raw.room_id || '',
      authorId: raw.user_id || '',
      authorName: raw.nickname || '匿名观众',
      authorAvatarUrl: raw.avatar_url,
      text: raw.content || '',
      createdAt: new Date((raw.create_time || 0) * 1000),
      likes: raw.like_count || 0,
      replyCount: 0,
      rawJson: JSON.stringify(raw),
    };
  }

  // ==================== 错误处理 ====================

  /**
   * 处理微信平台特有的 API 错误
   *
   * 微信错误码体系特点：
   * - **负数错误码**（-1 等）：通用系统错误
   * - **40xxx 系列**：认证/授权问题
   * - **45xxx 系列**：频率限制
   * - **48xxx 系列**：权限不足
   * - **85xxx 系列**：视频号特有错误
   *
   * @param error 原始错误
   * @param context 上下文
   * @throws 永远抛出异常
   */
  handlePlatformError(error: any, context: string): never {
    const errorCode = error?.errorCode || error?.errcode || error?.status;
    const errorMessage = error?.message || error?.errmsg || error?.body || String(error);

    const knownMessage = errorCode ? WECHAT_ERROR_CODES[errorCode] : null;

    let humanReadableMessage: string;

    if (knownMessage) {
      humanReadableMessage = `[微信 API 错误] ${context}: [${errorCode}] ${knownMessage}`;

      switch (errorCode) {
        case 40014:
        case 42001:
          humanReadableMessage += ' → access_token 过期，请触发刷新流程';
          break;
        case 42002:
          humanReadableMessage += ' → refresh_token 过期，需重新授权';
          break;
        case 45009:
          humanReadableMessage += ' → 接口调用超频，请降低请求速率后重试';
          break;
        case 48001:
          humanReadableMessage += ' → 该 API 未在开放平台开通权限';
          break;
        case 85066:
          humanReadableMessage += ' → 直播间不存在或已被删除';
          break;
        case 85068:
          humanReadableMessage += ' → 无权查看该直播间数据，确认是否已获得授权';
          break;
      }
    } else {
      humanReadableMessage = `[微信 API 未知错误] ${context}: ${errorMessage}`;
    }

    this.logger.error(humanReadableMessage);

    const platformError = new Error(humanReadableMessage);
    (platformError as any).platform = 'wechat_video';
    (platformError as any).errorCode = errorCode;
    (platformError as any).context = context;
    (platformError as any).originalError = error;

    throw platformError;
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 获取 component_access_token
   *
   * 这是微信第三方平台认证的核心令牌，
   * 用于后续所有 API 调用的身份验证。
   *
   * @private
   * @returns component_access_token 字符串
   */
  private async getComponentToken(): Promise<string> {
    if (this.cachedComponentToken && Date.now() < this.cachedComponentToken.expiresAt - 300000) {
      return this.cachedComponentToken.token;
    }

    this.logger.log(`[微信视频号] 正在获取新的 component_access_token...`);

    const params = new URLSearchParams({
      component_appid: this.componentAppId,
      component_appsecret: this.componentAppSecret,
      grant_type: 'client_credential',
    });

    const response = await fetch(
      `${WechatVideoAdapter.API_BASE_URL}${WechatVideoAdapter.CGI_BIN_URL}/api_component_token?${params.toString()}`
    );

    const data: WechatComponentTokenResponse = await response.json();

    if (!data.component_access_token) {
      this.handlePlatformError(
        {
          errorCode: data.errcode ?? -1,
          message: data.errmsg || '获取 component_access_token 失败',
        },
        'getComponentToken'
      );
    }

    this.cachedComponentToken = {
      token: data.component_access_token,
      expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
    };

    this.logger.log(`[微信视频号] component_access_token 获取成功`);
    return this.cachedComponentToken.token;
  }

  /**
   * 获取授权方基础信息
   *
   * @private
   * @param authorizerAppId 授权方 AppID
   * @returns 授权方详细信息
   */
  private async getAuthorizerBasicInfo(authorizerAppId: string): Promise<Record<string, unknown>> {
    const componentToken = await this.getComponentToken();

    const params = new URLSearchParams({
      component_appid: this.componentAppId,
      authorizer_appid: authorizerAppId,
      component_access_token: componentToken,
    });

    const response = await fetch(
      `${WechatVideoAdapter.API_BASE_URL}${WechatVideoAdapter.CGI_BIN_URL}/get_authorizer_info?${params.toString()}`
    );

    const data: WechatAuthorizerInfoResponse = await response.json();

    if (data.errcode !== 0) {
      this.handlePlatformError(
        { errorCode: data.errcode, message: data.errmsg },
        `getAuthorizerBasicInfo(${authorizerAppId})`
      );
    }

    return data;
  }

  /**
   * 获取直播房间列表
   *
   * @private
   * @param authorizerAppId 授权方 AppID
   * @param start 页码起始（从 0 开始）
   * @param limit 每页数量
   * @returns 直播间列表
   */
  private async getBroadcastList(
    authorizerAppId: string,
    start: number,
    limit: number
  ): Promise<WechatBroadcastListResponse> {
    const accessToken = await this.getValidAccessToken();

    const body = {
      start,
      limit,
      action: 'get_room_list',
    };

    const response = await fetch(
      `${WechatVideoAdapter.API_BASE_URL}/cgi-bin/wxopen/broadcast/find?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data: WechatBroadcastListResponse = await response.json();

    if (data.errcode !== 0) {
      this.handlePlatformError(
        { errorCode: data.errcode, message: data.errmsg },
        `getBroadcastList(${authorizerAppId})`
      );
    }

    return data;
  }

  /**
   * 获取直播数据统计
   *
   * @private
   * @param authorizerAppId 授权方 AppID
   * @returns 统计数据
   */
  private async fetchBroadcastStatistics(_authorizerAppId: string): Promise<any> {
    const accessToken = await this.getValidAccessToken();
    const today = new Date();
    const endDate = this.formatDate(today);
    const startDate = this.formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));

    const body = {
      begin_date: startDate,
      end_date: endDate,
      action: 'get_live_statistics',
    };

    const response = await fetch(
      `${WechatVideoAdapter.API_BASE_URL}/cgi-bin/wxopen/broadcast/statistics?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data: WechatBroadcastStatsResponse = await response.json();

    if (data.errcode !== 0) {
      // 统计数据不可用时静默返回 null
      this.logger.warn(`[微信视频号] 获取直播统计失败 [${data.errcode}]: ${data.errmsg}`);
      return null;
    }

    return data;
  }

  /**
   * 获取单场直播的详细统计
   *
   * @private
   * @param roomId 直播间 ID
   * @returns 详细统计数据
   */
  private async getSingleBroadcastStats(roomId: number): Promise<Record<string, unknown>> {
    const accessToken = await this.getValidAccessToken();

    const body = {
      room_id: roomId,
      action: 'get_live_detail',
    };

    const response = await fetch(
      `${WechatVideoAdapter.API_BASE_URL}/cgi-bin/wxopen/broadcast/get_live_detail?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    return response.json();
  }

  /**
   * 获取认证类型的中文名称
   *
   * @private
   * @param verifyType 认证类型 ID
   * @param serviceType 服务类型 ID
   * @returns 认证类型描述
   */
  private getVerifyTypeName(verifyType?: number, serviceType?: number): string {
    const verifyTypes: Record<number, string> = {
      '-1': '未认证',
      '0': '微信认证',
      '1': '微信认证（政府/媒体）',
      '2': '微信认证（企业）',
      '3': '微信认证（其他组织）',
      '4': '微信认证（小程序）',
    };

    const serviceTypes: Record<number, string> = {
      '0': '订阅号',
      '1': '订阅号（历史老号）',
      '2': '服务号',
      '3': '服务号',
      '4': '小程序',
      '6': '微信视频号',
    };

    return `${verifyTypes[verifyType ?? -1] || '未知'} / ${serviceTypes[serviceType ?? 0] || '未知'}`;
  }

  /**
   * 格式化日期为微信要求的 YYYYMMDD 格式
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
