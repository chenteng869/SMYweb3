import { SetMetadata } from '@nestjs/common';

/** RateLimit 元数据 Key */
export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  /** 时间窗口（秒） */
  windowSeconds: number;
  /** 窗口内最大请求数 */
  maxRequests: number;
  /** 自定义 Key 生成函数（默认使用 IP） */
  keyGenerator?: (...args: any[]) => string;
}

/**
 * @RateLimit() 自定义装饰器
 * 支持按路由配置不同的限流阈值
 *
 * 使用示例:
 *   @RateLimit({ windowSeconds: 60, maxRequests:10 })
 *   @Get('profile')
 *   getProfile() { ... }
 *
 *   @RateLimit({ windowSeconds: 300, maxRequests: 5, keyGenerator: (req) => req.user.id })
 *   @Post('sensitive-action')
 *   sensitiveAction() { ... }
 */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
