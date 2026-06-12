import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly store = new Map<string, RateLimitEntry>();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(windowMs = 60_000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // 每5分钟清理过期记录，防止内存泄漏
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    // 不阻止进程退出
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const key = this.getClientKey(req);
    const now = Date.now();

    let entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      // 新窗口或已过期
      entry = { count: 1, resetAt: now + this.windowMs };
      this.store.set(key, entry);
      this.addHeaders(res, entry);
      return next();
    }

    entry.count++;
    this.addHeaders(res, entry);

    if (entry.count > this.maxRequests) {
      this.logger.warn(
        `[RateLimit] IP ${req.ip} 超出限制 (${entry.count}/${this.maxRequests}) on ${req.path}`
      );
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: '请求过于频繁，请稍后再试',
          retryAfter: Math.ceil((entry.resetAt - now) / 1000),
          timestamp: new Date().toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    next();
  }

  private getClientKey(req: Request): string {
    // 优先使用真实 IP（考虑反向代理）
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim() + ':' + (req.method + req.path);
    }
    return (req.ip || req.socket.remoteAddress || 'unknown') + ':' + (req.method + req.path);
  }

  private addHeaders(res: Response, entry: RateLimitEntry): void {
    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`[RateLimit] 清理 ${cleaned} 条过期记录`);
    }
  }
}
