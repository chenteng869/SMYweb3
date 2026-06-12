import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../services/redis.service';

/** 缓存配置元数据 Key */
export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';
export const SKIP_CACHE_KEY = 'skip_cache';

/**
 * Redis 缓存拦截器
 * - 基于 URL + Query + Body 生成缓存 Key
 * - 可配置 TTL（默认 300s）
 * - 仅缓存 GET 请求
 * - 防缓存穿透：空值不缓存
 * - 支持按路由跳过缓存
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private redisService: RedisService,
    @Inject(Reflector) private reflector: Reflector
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 仅缓存 GET 请求
    if (request.method.toUpperCase() !== 'GET') {
      return next.handle();
    }

    // 检查是否跳过缓存
    const skipCache = this.reflector.getAllAndOverride<boolean>(SKIP_CACHE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipCache) {
      return next.handle();
    }

    // 获取缓存配置
    const keyTemplate = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler());
    const ttl = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler()) ?? 300;

    // 生成缓存 Key
    const cacheKey = keyTemplate
      ? this.renderKeyTemplate(keyTemplate, request)
      : this.generateCacheKey(request);

    try {
      // 尝试从缓存读取
      const cached = await this.redisService.get(cacheKey);
      if (cached !== null && cached !== undefined) {
        response.setHeader('X-Cache', 'HIT');
        return of(JSON.parse(cached));
      }

      response.setHeader('X-Cache', 'MISS');

      // 执行原始处理并缓存结果
      return next.handle().pipe(
        switchMap(async (data) => {
          // 防缓存穿透：空值/null 不缓存
          if (data !== null && data !== undefined && data !== '') {
            await this.redisService.set(cacheKey, JSON.stringify(data), ttl);
          }
          return data;
        }),
        catchError((err) => {
          // 错误时不缓存，直接抛出
          return throwError(() => err);
        })
      );
    } catch (cacheErr) {
      // Redis 异常时降级为直通（不影响业务）
      console.warn(
        `[CacheInterceptor] Redis error, bypassing cache: ${(cacheErr as Error).message}`
      );
      return next.handle();
    }
  }

  /** 基于请求信息生成标准缓存 Key */
  private generateCacheKey(request: Record<string, any>): string {
    const { method, originalUrl, query, user } = request;
    const queryString =
      Object.keys(query).length > 0
        ? '?' +
          Object.entries(query)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('&')
        : '';
    const userId = user?.id ?? 'anonymous';
    const prefix = 'smyweb3:api:cache';
    return `${prefix}:${method}:${originalUrl}${queryString}:user:${userId}`;
  }

  /** 渲染带参数的 Key 模板 */
  private renderKeyTemplate(template: string, request: Record<string, any>): string {
    const { params, query, user } = request;
    return template
      .replace(':userId', user?.id ?? 'anonymous')
      .replace(/\{(\w+)\}/g, (_, key) => params[key] ?? query[key] ?? `unknown_${key}`);
  }
}
