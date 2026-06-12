import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * 缓存失效服务 — 提供手动/批量缓存清理能力
 *
 * 使用场景:
 *   - 数据变更后主动清除相关缓存（如配置更新、数据导入）
 *   - 定时任务触发模块级缓存刷新
 *   - 运维管理接口调用
 *
 * 依赖: RedisService (ioredis)
 */
@Injectable()
export class CacheInvalidatorService {
  private readonly logger = new Logger(CacheInvalidatorService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * 按模式匹配失效所有缓存 Key
   *
   * 实现方式: 使用 KEYS 命令查找匹配的 key，再批量 DEL
   * 注意: KEYS 在大数据量下会阻塞 Redis，生产环境建议使用 SCAN 替代
   * 当前实现适用于中小规模缓存场景（< 10万 key）
   *
   * @param pattern 通配符模式，如 'smyweb3:stats:*' 或 'smyweb3:stats:LeadController:*'
   *
   * @example
   * ```typescript
   * // 清除所有统计缓存
   * await this.cacheInvalidator.invalidatePattern('smyweb3:stats:*');
   *
   * // 清除指定 Controller 的所有缓存
   * await this.cacheInvalidator.invalidatePattern('smyweb3:stats:LeadController:*');
   * ```
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // TODO: 生产环境建议替换为 SCAN 遍历，避免 KEYS 阻塞
      const keys = (await this.redisService.getKeysByPattern?.(pattern)) ?? [];

      if (keys.length === 0) {
        this.logger.debug(`[CacheInvalidator] 无匹配 Key，pattern: ${pattern}`);
        return;
      }

      // 分批删除，每批最多 100 个 key
      const batchSize = 100;
      let totalDeleted = 0;

      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const deleted = await this.redisService.del(batch.join(' '));
        totalDeleted += deleted;
      }

      this.logger.log(`[CacheInvalidator] 已删除 ${totalDeleted} 个 Key，pattern: ${pattern}`);
    } catch (error) {
      this.logger.error(
        `[CacheInvalidator] 失效失败 pattern=${pattern}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error; // 向上抛出，让调用方决定是否重试
    }
  }

  /**
   * 按模块名失效所有相关统计缓存
   *
   * 便捷方法，自动拼接前缀和模块名:
   *   smyweb3:stats:{moduleName}:*
   *
   * @param moduleName 模块/Controller 名称，如 'LeadController', 'AgentController'
   *
   * @example
   * ```typescript
   * // 失效获客模块所有缓存
   * await this.cacheInvalidator.invalidateStatsForModule('LeadController');
   *
   * // 失效 Agent 模块所有缓存
   * await this.cacheInvalidator.invalidateStatsForModule('AgentController');
   * ```
   */
  async invalidateStatsForModule(moduleName: string): Promise<void> {
    const pattern = `smyweb3:stats:${moduleName}:*`;
    this.logger.log(`[CacheInvalidator] 模块级失效: ${moduleName}`);
    return this.invalidatePattern(pattern);
  }

  /**
   * 全量失效所有 StatsCache 管理的缓存
   *
   * 危险操作！仅用于运维紧急场景或部署后预热
   */
  async invalidateAllStats(): Promise<void> {
    this.logger.warn('[CacheInvalidator] ⚠️ 执行全量统计缓存失效！');
    return this.invalidatePattern('smyweb3:stats:*');
  }
}
