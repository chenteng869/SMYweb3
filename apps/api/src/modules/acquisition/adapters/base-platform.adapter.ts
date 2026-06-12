import { Logger, Injectable } from '@nestjs/common';
import { NormalizedLead, RawLead, PlatformCollectOptions } from '../types/acquisition.types';

// ==================== 类型定义 ====================

/**
 * 平台认证配置接口
 * 定义 OAuth2 或其他认证方式所需的参数
 */
export interface PlatformAuthConfig {
  /** 客户端 ID（App Key / Client ID） */
  clientId: string;
  /** 客户端密钥（App Secret / Client Secret） */
  clientSecret: string;
  /** 授权回调地址 */
  redirectUri?: string;
  /** 额外的认证作用域（Scopes） */
  scopes?: string[];
}

/**
 * OAuth2 令牌信息
 */
export interface PlatformAccessToken {
  /** 访问令牌 */
  accessToken: string;
  /** 令牌类型（通常为 Bearer） */
  tokenType: string;
  /** 过期时间戳（毫秒） */
  expiresAt: number;
  /** 刷新令牌（可选） */
  refreshToken?: string;
  /** 令牌获取范围 */
  scope?: string;
}

/**
 * 标准化后的影响者/创作者数据
 * 扩展自 NormalizedLead，增加更丰富的字段
 */
export interface NormalizedInfluencer extends NormalizedLead {
  /** 平台唯一 ID */
  platformId: string;
  /** 认证状态 */
  isVerified?: boolean;
  /** 认证类型描述 */
  verificationType?: string;
  /** 商业合作联系方式 */
  businessContact?: {
    email?: string;
    phone?: string;
    wechatId?: string;
    minCooperationFee?: number;
  };
  /** 内容分类标签 */
  contentCategories?: string[];
  /** 平均互动数据 */
  avgEngagement?: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  /** 最近活跃时间 */
  lastActiveAt?: Date;
  /** 地理位置信息 */
  location?: string;
  /** 语言偏好 */
  language?: string;
}

/**
 * 标准化后的内容/帖子数据
 */
export interface NormalizedContent {
  /** 唯一标识 */
  id: string;
  /** 所属平台 */
  platform: string;
  /** 作者平台 ID */
  authorId: string;
  /** 内容类型（video/image/text/live 等） */
  contentType: 'video' | 'image' | 'text' | 'live' | 'story' | 'reel' | 'short';
  /** 标题或文案 */
  title?: string;
  /** 正文内容 */
  caption?: string;
  /** 媒体 URL 列表 */
  mediaUrls: string[];
  /** 缩略图 URL */
  thumbnailUrl?: string;
  /** 发布时间 */
  publishedAt: Date;
  /** 互动数据 */
  engagement: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  /** 内容标签/话题 */
  tags?: string[];
  /** 原始链接 */
  url?: string;
  /** 原始 JSON 数据 */
  rawJson: string;
}

/**
 * 标准化后的评论数据
 */
export interface NormalizedComment {
  /** 评论唯一 ID */
  id: string;
  /** 评论所属内容 ID */
  contentId: string;
  /** 评论者平台 ID */
  authorId: string;
  /** 评论者显示名称 */
  authorName: string;
  /** 评论者头像 URL */
  authorAvatarUrl?: string;
  /** 评论正文文本 */
  text: string;
  /** 评论发布时间 */
  createdAt: Date;
  /** 点赞数 */
  likes: number;
  /** 回复数 */
  replyCount: number;
  /** 父评论 ID（用于嵌套回复） */
  parentCommentId?: string;
  /** 原始 JSON 数据 */
  rawJson: string;
}

/**
 * 平台统计/分析数据
 */
export interface PlatformAnalytics {
  /** 时间范围 */
  dateRange: { start: Date; end: Date };
  /** 总浏览量 */
  totalViews: number;
  /** 总互动量 */
  totalEngagement: number;
  /** 粉丝增长数 */
  followerGrowth: number;
  /** 内容表现列表 */
  contentPerformance: Array<{
    contentId: string;
    title: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
  }>;
  /** 受众画像摘要 */
  audienceDemographics?: {
    genderDistribution?: Record<string, number>;
    ageDistribution?: Record<string, number>;
    topLocations?: Array<{ name: string; percentage: number }>;
  };
}

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  /** 每日最大请求数 */
  requestsPerDay: number;
  /** 每小时最大请求数 */
  requestsPerHour?: number;
  /** 每分钟最大请求数 */
  requestsPerMinute?: number;
  /** 并发请求数上限 */
  maxConcurrent?: number;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  /** 页码（从1开始） */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
  /** 游标/偏移标记（用于游标分页） */
  cursor?: string;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * API 响应包装器（分页）
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  data: T[];
  /** 分页信息 */
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

// ==================== 抽象基类 ====================

/**
 * 平台适配器抽象基类
 *
 * 所有具体平台适配器必须继承此类并实现所有抽象方法。
 * 提供统一的 OAuth2 认证流程、HTTP 请求封装、速率限制管理、
 * 错误处理和数据标准化等基础能力。
 *
 * 设计原则：
 * - 模板方法模式：定义算法骨架，子类实现具体步骤
 * - 策略模式：各平台的认证、错误处理策略可独立变化
 * - 开闭原则：新增平台只需新增适配器类，无需修改已有代码
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class DouyinRealAdapter extends BasePlatformAdapter {
 *   readonly platformId = 'douyin';
 *   readonly platformName = '抖音';
 *   // ... 实现所有抽象方法
 * }
 * ```
 */
@Injectable()
export abstract class BasePlatformAdapter implements PlatformAdapterInterface {
  /** 平台唯一标识符 */
  abstract readonly platformId: string;

  /** 平台中文名称 */
  abstract readonly platformName: string;

  /** 日志记录器实例 */
  protected readonly logger: Logger;

  /** 当前有效的访问令牌缓存 */
  protected cachedToken: PlatformAccessToken | null = null;

  /** 今日已用请求数计数器 */
  private requestCountToday = 0;

  /** 请求计数重置日期 */
  private requestCountResetDate = new Date().toDateString();

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  // ==================== 必须实现的抽象方法 ====================

  /**
   * 获取该平台的速率限制配置
   *
   * 子类应根据各平台官方文档返回准确的限流参数。
   * 例如：抖音基础版 1000次/天，小红书 5000次/天。
   *
   * @returns 速率限制配置对象
   */
  abstract getRateLimitConfig(): RateLimitConfig;

  /**
   * 获取 OAuth2 授权 URL
   *
   * 用于引导用户完成第三方平台授权流程。
   * 返回的 URL 应包含 client_id、redirect_uri、scope、state 等必要参数。
   *
   * @param state 防 CSRF 的随机状态码
   * @returns 完整的授权跳转 URL
   */
  abstract getAuthorizationUrl(state: string): string;

  /**
   * 用授权码换取访问令牌
   *
   * OAuth2 标准授权码流程的第二步：
   * 用户授权后回调携带 code 参数，调用此方法换取 access_token。
   *
   * @param authorizationCode 授权服务器返回的授权码
   * @returns 包含 access_token 和 refresh_token 的令牌对象
   */
  abstract exchangeCodeForToken(authorizationCode: string): Promise<PlatformAccessToken>;

  /**
   * 刷新过期的访问令牌
   *
   * 当 access_token 过期时，使用 refresh_token 获取新的有效令牌。
   * 如果平台不支持刷新机制，应抛出异常提示重新授权。
   *
   * @param currentToken 当前的令牌对象（含 refresh_token）
   * @returns 新的有效令牌对象
   */
  abstract refreshToken(currentToken: PlatformAccessToken): Promise<PlatformAccessToken>;

  /**
   * 验证当前令牌是否有效
   *
   * 通过调用平台的令牌验证接口确认 token 仍然可用。
   * 部分平台可能不支持此操作，此时可基于过期时间做本地判断。
   *
   * @param token 待验证的令牌
   * @returns true 表示令牌有效，false 表示无效或已过期
   */
  abstract validateToken(token: PlatformAccessToken): Promise<boolean>;

  /**
   * 从平台搜索/获取影响者（创作者）原始数据
   *
   * 这是核心的数据采集方法。根据查询条件和选项，
   * 调用对应平台的搜索/用户列表 API 获取原始数据。
   *
   * @param query 搜索关键词或查询条件
   * @param options 可选参数（如分页、排序、筛选条件等）
   * @returns 原始的平台特定格式数据数组
   */
  abstract fetchInfluencers(query: string, options?: PlatformCollectOptions): Promise<RawLead[]>;

  /**
   * 从平台获取指定影响者的详细统计数据
   *
   * 获取单个创作者的粉丝数、互动率、内容表现等深度数据。
   * 通常需要先通过 fetchInfluencers 获取到 user_id 后再调用此方法。
   *
   * @param influencerId 平台上的创作者唯一标识
   * @param options 统计维度和时间范围等选项
   * @returns 原始的统计数据
   */
  abstract fetchInfluencerStats(influencerId: string, options?: Record<string, any>): Promise<any>;

  /**
   * 从平台获取影响者的内容/帖子列表
   *
   * 支持分页获取指定创作者发布的内容数据。
   *
   * @param influencerId 创作者平台 ID
   * @param pagination 分页参数
   * @returns 分页的内容原始数据
   */
  abstract fetchContentList(
    influencerId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<RawLead>>;

  /**
   * 获取单条内容的详细互动数据
   *
   * 包括播放量、点赞、评论、分享、收藏等多维度指标。
   *
   * @param contentId 内容的唯一标识
   * @returns 内容的详细互动数据
   */
  abstract fetchContentDetail(contentId: string): Promise<RawLead>;

  /**
   * 获取内容的评论列表
   *
   * 支持分页获取指定内容下的用户评论。
   *
   * @param contentId 内容 ID
   * @param pagination 分页参数
   * @returns 分页的评论原始数据
   */
  abstract fetchComments(
    contentId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<RawLead>>;

  /**
   * 将原始影响者数据标准化为统一格式
   *
   * 各平台的数据结构差异巨大，此方法负责将平台特有字段映射
   * 到标准化的 NormalizedInfluencer 格式，确保下游处理的一致性。
   *
   * @param raw 影响者原始数据
   * @returns 标准化后的影响者数据
   */
  abstract normalizeInfluencer(raw: Record<string, unknown>): NormalizedInfluencer;

  /**
   * 将原始内容数据标准化为统一格式
   *
   * 映射平台特定的媒体、互动指标到标准格式。
   *
   * @param raw 内容原始数据
   * @returns 标准化后的内容数据
   */
  abstract normalizeContent(raw: Record<string, unknown>): NormalizedContent;

  /**
   * 将原始评论数据标准化为统一格式
   *
   * @param raw 评论原始数据
   * @returns 标准化后的评论数据
   */
  abstract normalizeComment(raw: Record<string, unknown>): NormalizedComment;

  /**
   * 处理平台特有的 API 错误响应
   *
   * 各平台的错误码体系不同，此方法将平台错误转换为统一的业务异常。
   * 例如：抖音 21016=token 过期，Instagram OAuthException 等。
   *
   * @param error 原始的错误响应或异常
   * @param context 发生错误的上下文（调用的 API 路径）
   * @throws 转换后带有明确信息的业务异常
   */
  abstract handlePlatformError(error: Error | Record<string, unknown>, context: string): never;

  // ==================== 可选覆写的方法（提供默认实现） ====================

  /**
   * 获取平台的综合分析报告数据
   *
   * 默认实现抛出未支持异常，子类可按需覆写。
   *
   * @param influencerId 创作者 ID
   * @param dateRange 日期范围
   * @returns 分析报告数据
   */
  async fetchAnalytics(
    _influencerId: string,
    _dateRange?: { start: Date; end: Date }
  ): Promise<PlatformAnalytics> {
    throw new Error(`[${this.platformName}] 暂不支持获取综合分析报告`);
  }

  /**
   * 在目标内容下发表评论
   *
   * 默认实现抛出未支持异常。仅当平台 API 支持以应用身份发表评论时才应实现。
   * 注意：大部分平台禁止机器人自动发评，需谨慎使用。
   *
   * @param contentId 目标内容 ID
   * @param text 评论正文
   * @returns 发表成功后的评论数据
   */
  async createComment(_contentId: string, _text: string): Promise<NormalizedComment> {
    throw new Error(`[${this.platformName}] 不支持自动发表评论功能`);
  }

  /**
   * 向创作者发送私信
   *
   * 默认实现抛出未支持异常。需注意各平台对私信发送有严格限制。
   *
   * @param influencerId 目标创作者 ID
   * @param message 消息正文
   * @returns 发送结果
   */
  async sendMessage(
    _influencerId: string,
    _message: string
  ): Promise<{ success: boolean; messageId?: string }> {
    throw new Error(`[${this.platformName}] 不支持发送私信功能`);
  }

  // ==================== 实现 PlatformAdapter 接口 ====================

  /**
   * 平台显示名称（自动从类名推导，兼容旧接口）
   */
  get platformDisplayName(): string {
    return (this.constructor as any).name
      .replace('Adapter', '')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  }

  /**
   * 从平台获取线索数据（兼容旧接口）
   *
   * 内部委托给 fetchInfluencers 方法，保持向后兼容。
   *
   * @param query 搜索查询条件
   * @param options 可选参数
   * @returns 原始线索数据数组
   */
  async fetchLeads(query: string, options?: Record<string, unknown>): Promise<RawLead[]> {
    return this.fetchInfluencers(query, options);
  }

  /**
   * 将原始数据标准化（兼容旧接口）
   *
   * 批量调用 normalizeInfluencer 进行标准化转换。
   *
   * @param rawLeads 原始数据数组
   * @returns 标准化后的线索数据数组
   */
  async normalizeData(rawLeads: RawLead[]): Promise<NormalizedLead[]> {
    return rawLeads.map((raw) => this.normalizeInfluencer(raw));
  }

  // ==================== 通用基础能力方法 ====================

  /**
   * 获取当前有效的访问令牌
   *
   * 自动处理令牌缓存和过期刷新逻辑：
   * 1. 缓存中存在且未过期 → 直接返回
   * 2. 缓存中存在但已过期 → 尝试刷新
   * 3. 缓存不存在 → 抛出异常提示先完成授权
   *
   * @returns 有效的访问令牌字符串
   * @throws 若无法获取有效令牌则抛出异常
   */
  async getValidAccessToken(): Promise<string> {
    if (this.cachedToken) {
      // 提前 5 分钟判断为过期，避免临界时刻失效
      const bufferTime = 5 * 60 * 1000;
      if (Date.now() < this.cachedToken.expiresAt - bufferTime) {
        return this.cachedToken.accessToken;
      }

      // 令牌即将过期，尝试刷新
      this.logger.log(`[${this.platformName}] 访问令牌即将过期，尝试刷新...`);
      try {
        if (this.cachedToken.refreshToken) {
          this.cachedToken = await this.refreshToken(this.cachedToken);
          this.logger.log(`[${this.platformName}] 令牌刷新成功`);
          return this.cachedToken.accessToken;
        }
      } catch (error) {
        this.logger.warn(
          `[${this.platformName}] 令牌刷新失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    throw new Error(
      `[${this.platformName}] 无有效的访问令牌，请先完成 OAuth2 授权流程。` +
        `调用 getAuthorizationUrl() 获取授权链接。`
    );
  }

  /**
   * 设置缓存的访问令牌
   *
   * 通常在 exchangeCodeForToken 成功后或从数据库恢复会话时调用。
   *
   * @param token 令牌对象
   */
  setCachedToken(token: PlatformAccessToken): void {
    this.cachedToken = token;
    this.logger.log(
      `[${this.platformName}] 已缓存访问令牌，有效期至 ${new Date(token.expiresAt).toISOString()}`
    );
  }

  /**
   * 执行带速率限制检查的 HTTP GET 请求
   *
   * 在实际请求前检查是否超出速率限制，若超限则等待或拒绝。
   * 自动附加认证头和平台所需的额外头信息。
   *
   * @param url 请求的完整 URL
   * @param headers 额外的请求头
   * @param timeoutMs 请求超时时间（毫秒），默认 30000
   * @returns 解析后的 JSON 响应体
   * @throws 速率限制超出或网络错误时抛出异常
   */
  async httpGet<T = any>(
    url: string,
    headers: Record<string, string> = {},
    timeoutMs: number = 30000
  ): Promise<T> {
    await this.checkRateLimit();
    this.incrementRequestCount();

    const authToken = await this.getValidAccessToken().catch(() => '');
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': `${this.platformName}AcquisitionBot/1.0`,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    };

    this.logger.debug(`[GET] ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: defaultHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        this.handlePlatformError(
          { status: response.status, statusText: response.statusText, body: errorBody },
          `GET ${url}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        this.handlePlatformError({ message: `请求超时 (${timeoutMs}ms)` }, `GET ${url}`);
      }
      throw error;
    }
  }

  /**
   * 执行带速率限制检查的 HTTP POST 请求
   *
   * 与 httpGet 类似，但支持发送 JSON 请求体。
   *
   * @param url 请求的完整 URL
   * @param body 请求体对象（将被序列化为 JSON）
   * @param headers 额外的请求头
   * @param timeoutMs 请求超时时间（毫秒），默认 30000
   * @returns 解析后的 JSON 响应体
   */
  async httpPost<T = Record<string, unknown>>(
    url: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
    timeoutMs: number = 30000
  ): Promise<T> {
    await this.checkRateLimit();
    this.incrementRequestCount();

    const authToken = await this.getValidAccessToken().catch(() => '');
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': `${this.platformName}AcquisitionBot/1.0`,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    };

    this.logger.debug(`[POST] ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: defaultHeaders,
        body: typeof body === 'string' ? body : JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        this.handlePlatformError(
          { status: response.status, statusText: response.statusText, body: errorBody },
          `POST ${url}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        this.handlePlatformError({ message: `请求超时 (${timeoutMs}ms)` }, `POST ${url}`);
      }
      throw error;
    }
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 检查是否超出速率限制
   *
   * 对比当前请求数与平台配额，若超出则计算等待时间并延迟执行。
   * 实现简单的令牌桶/滑动窗口限流逻辑。
   *
   * @private
   */
  private async checkRateLimit(): Promise<void> {
    const config = this.getRateLimitConfig();

    // 每日重置计数
    const today = new Date().toDateString();
    if (today !== this.requestCountResetDate) {
      this.requestCountToday = 0;
      this.requestCountResetDate = today;
    }

    // 检查每日限额
    if (this.requestCountToday >= config.requestsPerDay) {
      const waitMs = this.getMsUntilTomorrow();
      this.logger.warn(
        `[${this.platformName}] 已达到每日请求上限 (${config.requestsPerDay} 次)，` +
          `将在 ${Math.ceil(waitMs / 3600000)} 小时后重置`
      );

      // 生产环境应考虑抛出异常而非阻塞等待
      // 此处选择等待以便定时任务能自然恢复
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 60000)));
    }

    // 检查每分钟限额（如果配置了）
    if (config.requestsPerMinute) {
      // 简化实现：实际生产环境建议使用滑动窗口算法
      // 这里仅做日志提醒
      if (this.requestCountToday % config.requestsPerMinute === 0 && this.requestCountToday > 0) {
        this.logger.debug(
          `[${this.platformName}] 注意：已连续发起 ${config.requestsPerMinute} 个请求`
        );
      }
    }
  }

  /**
   * 递增请求计数器
   *
   * @private
   */
  private incrementRequestCount(): void {
    this.requestCountToday++;
    const config = this.getRateLimitConfig();
    const remaining = config.requestsPerDay - this.requestCountToday;

    if (remaining <= 10 || this.requestCountToday % 100 === 0) {
      this.logger.debug(
        `[${this.platformName}] 今日请求: ${this.requestCountToday}/${config.requestsPerDay} (剩余 ${remaining})`
      );
    }
  }

  /**
   * 计算距离今天结束还有多少毫秒
   *
   * @private
   * @returns 距午夜零点的毫秒数
   */
  private getMsUntilTomorrow(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  }
}

// ==================== 接口定义（兼容旧系统） ====================

/**
 * 平台适配器接口（扩展版）
 *
 * 兼容原有的 PlatformAdapter 接口，同时增加新方法签名
 */
export interface PlatformAdapterInterface {
  /** 平台名称标识 */
  readonly platformName: string;

  /** 从平台获取原始线索数据 */
  fetchLeads(query: string, options?: PlatformCollectOptions): Promise<RawLead[]>;

  /** 将原始数据标准化 */
  normalizeData(rawLeads: RawLead[]): Promise<NormalizedLead[]>;
}
