import { Injectable, Logger, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import crypto from 'crypto';
import { RedisService } from '../services/redis.service';

/** StatsCache 装饰器元数据 Key */
export const STATS_CACHE_KEY = 'smyweb3:stats_cache_options';

/** StatsCache 装饰器选项 */
export interface StatsCacheOptions {
  /** 缓存 TTL（秒），默认 60（统计类），详情查询建议 300 */
  ttlSeconds?: number;
}

/** 缓存命中/未命中指标 */
interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
}

/**
 * 统计/聚合数据的 Redis 缓存拦截器
 *
 * 功能:
 *   - 自动缓存 GET 方法返回的统计数据
 *   - Key 格式: smyweb3:stats:{className}:{methodName}:{hashOfParams}
 *   - POST/PUT/DELETE 操作自动失效同 Controller 的统计缓存
 *   - 命中/未命中指标记录与日志输出
 *   - Redis 故障时优雅降级：直接执行原方法并记录警告日志
 */
@Injectable()
export class StatsCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(StatsCacheInterceptor.name);
  private readonly metrics: CacheMetrics = { hits: 0, misses: 0, errors: 0 };

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    // 仅对 GET 请求启用缓存
    if (context.switchToHttp().getRequest().method !== 'GET') {
      return this.handleMutation(context, next);
    }

    const options = this.reflector.get<StatsCacheOptions | undefined>(
      STATS_CACHE_KEY,
      context.getHandler()
    );

    // 未标记 @StatsCache 的方法不拦截
    if (!options) return next.handle();

    const ttlSeconds = options.ttlSeconds ?? 60;
    const cacheKey = this.buildCacheKey(context);

    try {
      const cached = await this.redisService.getJson<unknown>(cacheKey);

      if (cached !== null) {
        this.metrics.hits++;
        this.logger.debug(`[StatsCache] 命中: ${cacheKey}`);
        // 返回缓存数据，包装为 Observable
        return new Observable((subscriber) => subscriber.next(cached));
      }

      this.metrics.misses++;
      this.logger.debug(`[StatsCache] 未命中: ${cacheKey}`);

      return next.handle().pipe(
        map((data) => {
          // 异步写入缓存，不阻塞响应
          this.redisService.setJson(cacheKey, data, ttlSeconds).catch(() => {});
          return data;
        })
      );
    } catch (error) {
      // Redis 故障时优雅降级
      this.metrics.errors++;
      this.logger.warn(
        `[StatsCache] Redis 异常，降级为直接执行: ${error instanceof Error ? error.message : String(error)}`
      );
      return next.handle();
    }
  }

  /**
   * 处理写操作（POST/PUT/DELETE）
   * 自动失效当前 Controller 下所有统计缓存
   */
  private handleMutation(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const className = context.getClass().name;

    return next.handle().pipe(
      tap(async () => {
        try {
          await this.redisService.del(`smyweb3:stats:${className}:*`);
          this.logger.debug(`[StatsCache] 写操作后失效: ${className}`);
        } catch {
          // 失效失败不影响主流程
        }
      })
    );
  }

  /**
   * 构建缓存 Key
   * 格式: smyweb3:stats:{className}:{methodName}:{hashOfParams}
   */
  private buildCacheKey(context: ExecutionContext): string {
    const className = context.getClass().name;
    const methodName = context.getHandler().name;
    const request = context.switchToHttp().getRequest();

    // 对查询参数和路径参数做哈希，避免 key 过长
    const paramsHash = this.hashParams({
      ...request.params,
      ...request.query,
    });

    return `smyweb3:stats:${className}:${methodName}:${paramsHash}`;
  }

  /**
   * 对参数对象计算 MD5 哈希值
   * 保证相同参数生成相同 key，不同参数生成不同 key
   */
  private hashParams(params: Record<string, unknown>): string {
    const sorted = Object.keys(params)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});

    return crypto.createHash('md5').update(JSON.stringify(sorted)).digest('hex').slice(0, 12);
  }
}

/**
 * @StatsCache() — 统计/聚合数据 Redis 缓存装饰器
 *
 * 用法示例:
 * ```typescript
 * // 默认 TTL=60 秒（适合高频刷新的统计数据）
 * @StatsCache()
 * @Get('dashboard')
 * async getDashboard() { ... }
 *
 * // 自定义 TTL=300 秒（适合低频变化的详情查询）
 * @StatsCache(300)
 * @Get('detail/:id')
 * async getDetail(@Param('id') id: string) { ... }
 * ```
 *
 * 特性:
 *   - 自动根据类名、方法名、请求参数生成唯一缓存 Key
 *   - GET 请求走缓存读写，POST/PUT/DELETE 自动触发失效
 *   - Redis 不可用时自动降级，不影响业务逻辑
 *   - 内置命中/未命中计数器，可通过日志监控缓存效率
 *
 * @param ttlSeconds 缓存有效期（秒），默认 60
 */
export function StatsCache(ttlSeconds: number = 60): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(STATS_CACHE_KEY, { ttlSeconds }, target, propertyKey);
    return descriptor;
  };
}
