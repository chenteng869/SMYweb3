import { SetMetadata } from '@nestjs/common';

/** Cache 元数据 Key */
export const CACHE_OPTIONS_KEY = 'cache_options';

export interface CacheOptions {
  /** 缓存 TTL（秒），默认 300 */
  ttl?: number;
  /** 自定义缓存 Key 模板，支持 {param} 和 :userId 占位符 */
  keyTemplate?: string;
  /** 是否根据用户 ID 隔离缓存，默认 true */
  byUser?: boolean;
}

/**
 * @Cache() 自定义装饰器
 * 支持按路由配置 TTL 和 Key 模板
 *
 * 使用示例:
 *   // 默认 TTL=300s，自动生成 key
 *   @Cache()
 *   @Get('list')
 *   getList() { ... }
 *
 *   // 自定义 TTL 和 Key
 *   @Cache({ ttl: 60, keyTemplate: 'config:system:{type}' })
 *   @Get('config/:type')
 *   getConfig(@Param('type') type: string) { ... }
 *
 *   // 不隔离用户（公共数据）
 *   @Cache({ ttl: 600, byUser: false })
 *   @Get('public/data')
 *   getPublicData() { ... }
 */
export const Cache = (options?: CacheOptions) => SetMetadata(CACHE_OPTIONS_KEY, options ?? {});
