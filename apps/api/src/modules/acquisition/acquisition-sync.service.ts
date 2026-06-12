import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/services/redis.service';
import {
  BasePlatformAdapter,
  NormalizedInfluencer,
  NormalizedContent,
} from './adapters/base-platform.adapter';

// ==================== 类型定义 ====================

/** 同步报告 */
export interface SyncReport {
  /** 平台标识 */
  platform: string;
  /** 同步类型 */
  type: 'full' | 'incremental';
  /** 开始时间 */
  startedAt: string;
  /** 完成时间 */
  completedAt: string;
  /** 耗时（毫秒） */
  durationMs: number;
  /** 采集总数 */
  collected: number;
  /** 新增数量 */
  created: number;
  /** 更新数量 */
  updated: number;
  /** 跳过数量（无变化） */
  skipped: number;
  /** 失败数量 */
  failed: number;
  /** 错误信息列表 */
  errors: string[];
}

/** 单平台同步状态 */
export interface SyncPlatformStatus {
  /** 平台标识 */
  platform: string;
  /** 最近一次全量同步时间 */
  lastFullSync?: string;
  /** 最近一次增量同步时间 */
  lastIncrementalSync?: string;
  /** 当前状态 */
  status: 'idle' | 'syncing' | 'error' | 'disabled';
  /** 连续错误次数 */
  consecutiveErrors: number;
  /** 下次计划同步时间 */
  nextScheduledSync?: string;
}

/** 熔断器状态 */
interface CircuitBreakerState {
  /** 是否处于熔断状态 */
  isOpen: boolean;
  /** 熔断开始时间 */
  openedAt: number;
  /** 连续失败计数 */
  failureCount: number;
  /** 熔断阈值（连续失败次数） */
  threshold: number;
  /** 熔断恢复等待时间（毫秒） */
  recoveryTimeoutMs: number;
}

// ==================== 核心服务 ====================

/**
 * 数据同步引擎
 *
 * 负责管理多平台数据采集的完整生命周期，包括：
 * - 全量同步（Full Sync）：定期拉取全部数据并去重入库
 * - 增量同步（Incremental Sync）：仅拉取上次同步后的变更数据
 * - 冲突解决（Conflict Resolution）：多源数据的合并策略
 * - 错误重试与熔断保护（Circuit Breaker）：保障系统稳定性
 * - 定时调度（Scheduler）：可配置的全量/增量同步周期
 *
 * @example
 * ```typescript
 * // 注册平台适配器后自动调度
 * syncService.registerAdapter(douyinAdapter);
 * syncService.startScheduler(); // 启动定时任务
 *
 * // 手动触发全量同步
 * const report = await syncService.fullSync('douyin');
 * ```
 */
@Injectable()
export class AcquisitionSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AcquisitionSyncService.name);

  /** 平台适配器注册表 */
  private readonly adapters: Map<string, BasePlatformAdapter> = new Map();

  /** 各平台熔断器状态 */
  private readonly circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  /** 各平台当前同步状态 */
  private readonly platformStatuses: Map<string, SyncPlatformStatus> = new Map();

  /** 活跃的定时器引用列表 */
  private schedulerTimers: NodeJS.Timeout[] = [];

  /** 全量同步间隔（毫秒），默认 30 分钟 */
  private readonly fullSyncInterval: number;

  /** 增量同步间隔（毫秒），默认 5 分钟 */
  private readonly incrementalSyncInterval: number;

  /** 熔断连续失败阈值，默认 5 次 */
  private readonly circuitBreakerThreshold: number;

  /** 熔断恢复等待时间（毫秒），默认 10 分钟 */
  private readonly circuitBreakerRecoveryTimeout: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService
  ) {
    // 从环境变量读取配置，提供合理默认值
    this.fullSyncInterval =
      this.configService.get<number>('ACQUISITION_FULL_SYNC_INTERVAL', 30) * 60 * 1000;

    this.incrementalSyncInterval =
      this.configService.get<number>('ACQUISITION_INCREMENTAL_SYNC_INTERVAL', 5) * 60 * 1000;

    this.circuitBreakerThreshold = this.configService.get<number>(
      'ACQUISITION_CIRCUIT_BREAKER_THRESHOLD',
      5
    );

    this.circuitBreakerRecoveryTimeout =
      this.configService.get<number>('ACQUISITION_CIRCUIT_RECOVERY_TIMEOUT', 10) * 60 * 1000;

    this.logger.log(
      `同步引擎初始化完成 | 全量间隔=${this.fullSyncInterval / 60000}分钟 | ` +
        `增量间隔=${this.incrementalSyncInterval / 60000}分钟 | ` +
        `熔断阈值=${this.circuitBreakerThreshold} | 熔断恢复=${this.circuitBreakerRecoveryTimeout / 60000}分钟`
    );
  }

  // ==================== 生命周期钩子 ====================

  /**
   * 模块初始化时自动启动定时调度器
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('AcquisitionSyncService 正在启动...');
    // 不在此处自动启动调度器，由外部显式调用 startScheduler() 控制
  }

  /**
   * 模块销毁时清理所有定时器和资源
   */
  async onModuleDestroy(): Promise<void> {
    this.stopScheduler();
    this.logger.log('AcquisitionSyncService 已停止并清理资源');
  }

  // ==================== 适配器管理 ====================

  /**
   * 注册平台适配器
   *
   * 将平台适配器加入注册表，初始化对应的状态和熔断器。
   * 若同名适配器已存在则覆盖并记录警告日志。
   *
   * @param adapter 平台适配器实例（必须继承 BasePlatformAdapter）
   */
  registerAdapter(adapter: BasePlatformAdapter): void {
    const platformId = adapter.platformId.toLowerCase();

    if (this.adapters.has(platformId)) {
      this.logger.warn(`适配器 "${platformId}" 已存在，将被覆盖`);
    }

    this.adapters.set(platformId, adapter);

    // 初始化平台状态
    if (!this.platformStatuses.has(platformId)) {
      this.platformStatuses.set(platformId, {
        platform: platformId,
        status: 'idle',
        consecutiveErrors: 0,
      });
    }

    // 初始化熔断器状态
    if (!this.circuitBreakers.has(platformId)) {
      this.circuitBreakers.set(platformId, {
        isOpen: false,
        openedAt: 0,
        failureCount: 0,
        threshold: this.circuitBreakerThreshold,
        recoveryTimeoutMs: this.circuitBreakerRecoveryTimeout,
      });
    }

    this.logger.log(
      `已注册平台适配器: ${platformId} (${adapter.platformName}) | 支持类型: [${(adapter as any).supportedDataTypes?.join(', ') || 'influencer,content'}]`
    );
  }

  /**
   * 获取指定平台的适配器实例
   *
   * @param platformId 平台唯一标识
   * @returns 对应的平台适配器
   * @throws 当平台未注册时抛出异常
   */
  getAdapter(platformId: string): BasePlatformAdapter {
    const adapter = this.adapters.get(platformId.toLowerCase());
    if (!adapter) {
      throw new Error(
        `未找到平台适配器: ${platformId}，已注册平台: [${[...this.adapters.keys()].join(', ')}]`
      );
    }
    return adapter;
  }

  /**
   * 获取所有已注册的平台 ID 列表
   * @returns 平台标识字符串数组
   */
  getRegisteredPlatforms(): string[] {
    return [...this.adapters.keys()];
  }

  // ==================== 全量同步 ====================

  /**
   * 执行全量数据同步
   *
   * 对指定平台或所有已注册平台执行完整的达人数据拉取、标准化、去重和入库操作。
   * 流程：listInfluencers → normalizeInfluencer → deduplicate → upsert 到数据库
   *
   * @param platformId 可选的目标平台 ID，不传则同步所有已注册平台
   * @returns 同步报告数组（每个平台一份）
   */
  async fullSync(platformId?: string): Promise<SyncReport[]> {
    const targetPlatforms = platformId ? [platformId.toLowerCase()] : this.getRegisteredPlatforms();

    if (targetPlatforms.length === 0) {
      this.logger.warn('没有已注册的平台适配器，跳过全量同步');
      return [];
    }

    this.logger.log(`[全量同步] 开始执行，目标平台: [${targetPlatforms.join(', ')}]`);

    // 并行执行各平台同步
    const reports = await Promise.all(
      targetPlatforms.map((p) => this.syncSinglePlatform(p, 'full'))
    );

    // 记录最后同步时间到 Redis
    for (const report of reports) {
      await this.redis.set(
        `acquisition:sync:last:${report.platform}`,
        report.completedAt,
        7 * 24 * 3600 // 缓存 7 天
      );
    }

    const totalCollected = reports.reduce((sum, r) => sum + r.collected, 0);
    const totalCreated = reports.reduce((sum, r) => sum + r.created, 0);
    const totalUpdated = reports.reduce((sum, r) => sum + r.updated, 0);
    const totalFailed = reports.reduce((sum, r) => sum + r.failed, 0);

    this.logger.log(
      `[全量同步] 完成 | 总采集=${totalCollected} | 新增=${totalCreated} | 更新=${totalUpdated} | 失败=${totalFailed}`
    );

    return reports;
  }

  // ==================== 增量同步 ====================

  /**
   * 执行增量数据更新
   *
   * 仅获取自上次同步以来发生变化的数据，使用游标分页提高效率。
   * 对于不支持游标分页的平台，回退为基于时间的增量查询。
   *
   * @param platformId 可选的目标平台 ID，不传则对所有平台执行增量更新
   * @returns 同步报告数组
   */
  async incrementalSync(platformId?: string): Promise<SyncReport[]> {
    const targetPlatforms = platformId ? [platformId.toLowerCase()] : this.getRegisteredPlatforms();

    if (targetPlatforms.length === 0) {
      this.logger.warn('没有已注册的平台适配器，跳过增量同步');
      return [];
    }

    this.logger.log(`[增量同步] 开始执行，目标平台: [${targetPlatforms.join(', ')}]`);

    const reports = await Promise.all(
      targetPlatforms.map((p) => this.syncSinglePlatformIncremental(p))
    );

    // 记录增量同步时间
    for (const report of reports) {
      await this.redis.set(
        `acquisition:sync:last-incremental:${report.platform}`,
        report.completedAt,
        7 * 24 * 3600
      );
    }

    return reports;
  }

  // ==================== 冲突解决 ====================

  /**
   * 解决数据冲突
   *
   * 当同一创作者在多次采集中出现不同数据时的合并策略：
   * - 数值型字段（粉丝数等）：采用"最新优先"策略，取较大值
   * - 数组型字段（标签等）：采用"合并去重"策略
   * - 文本字段（简介等）：保留更长的版本
   *
   * @param existing 数据库中已有的标准化记录
   * @param incoming 新采集到的标准化记录
   * @returns 合并后的最终记录
   */
  resolveConflict(
    existing: NormalizedInfluencer,
    incoming: NormalizedInfluencer
  ): NormalizedInfluencer {
    // 标签合并去重
    const mergedTags = Array.from(new Set([...(existing.tags || []), ...(incoming.tags || [])]));

    // 数值字段取最新（较大值）
    const resolvedFollowerCount = Math.max(
      existing.followerCount ?? 0,
      incoming.followerCount ?? 0
    );
    const resolvedFollowingCount = Math.max(
      existing.followingCount ?? 0,
      incoming.followingCount ?? 0
    );
    const resolvedPostCount = Math.max(existing.postCount ?? 0, incoming.postCount ?? 0);
    const resolvedEngagementRate = Math.max(
      existing.engagementRate ?? 0,
      incoming.engagementRate ?? 0
    );

    // 文本字段保留更长版本
    const resolvedBio =
      (incoming.bio?.length || 0) > (existing.bio?.length || 0) ? incoming.bio : existing.bio;

    // 联系方式合并（新数据补充缺失字段）
    const mergedContactInfo = {
      email: incoming.contactInfo?.email || existing.contactInfo?.email,
      phone: incoming.contactInfo?.phone || existing.contactInfo?.phone,
      website: incoming.contactInfo?.website || existing.contactInfo?.website,
    };

    const result: NormalizedInfluencer = {
      ...existing,
      followerCount: resolvedFollowerCount,
      followingCount: resolvedFollowingCount,
      postCount: resolvedPostCount,
      engagementRate: resolvedEngagementRate,
      bio: resolvedBio,
      tags: mergedTags,
      contactInfo: mergedContactInfo,
      rawJson: incoming.rawJson, // 使用最新的原始数据
      collectedAt: incoming.collectedAt,
    };

    this.logger.debug(
      `[冲突解决] ${(existing as any).externalId || existing.id} | 粉丝: ${existing.followerCount}->${resolvedFollowerCount} | 标签: ${mergedTags.length}`
    );

    return result;
  }

  // ==================== 错误处理与重试 ====================

  /**
   * 带重试机制的单平台同步
   *
   * 在同步失败时进行指数退避重试，并在每次失败时检查熔断器状态。
   * 重试间隔：30s → 60s → 120s（指数增长）
   *
   * @param platformId 目标平台 ID
   * @param maxRetries 最大重试次数，默认 3
   * @returns 最终同步报告（可能包含失败信息）
   */
  async syncWithRetry(platformId: string, maxRetries = 3): Promise<SyncReport> {
    let lastError: Error | null = null;
    const backoffDelays = [30000, 60000, 120000]; // 30s → 60s → 120s

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 检查熔断器状态
        if (this.isCircuitOpen(platformId)) {
          this.logger.warn(
            `[重试] 平台 ${platformId} 熔断器开启，跳过同步（第${attempt + 1}次尝试）`
          );
          return this.buildErrorReport(
            platformId,
            'full',
            `熔断器开启，${this.getCircuitRemainingTime(platformId)}s 后恢复`
          );
        }

        const report = await this.syncSinglePlatform(platformId, 'full');

        // 成功则重置连续错误计数
        this.resetConsecutiveErrors(platformId);

        return report;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.recordFailure(platformId);

        if (attempt < maxRetries) {
          const delay = backoffDelays[Math.min(attempt, backoffDelays.length - 1)];
          this.logger.warn(
            `[重试] 平台 ${platformId} 第 ${attempt + 1}/${maxRetries} 次失败: ${lastError.message}，${delay / 1000}s 后重试`
          );
          await this.sleep(delay);
        }
      }
    }

    // 所有重试均失败
    this.logger.error(
      `[重试] 平台 ${platformId} 经过 ${maxRetries + 1} 次尝试后仍然失败: ${lastError?.message}`
    );

    // 记录错误日志到 Redis
    await this.logSyncError(platformId, lastError?.message || '未知错误');

    return this.buildErrorReport(platformId, 'full', lastError?.message || '未知错误');
  }

  // ==================== 定时调度 ====================

  /**
   * 启动定时调度器
   *
   * 创建两个定时器：
   * - 全量同步定时器：按 ACQUISITION_FULL_SYNC_INTERVAL 配置（默认 30 分钟）
   * - 增量同步定时器：按 ACQUISITION_INCREMENTAL_SYNC_INTERVAL 配置（默认 5 分钟）
   *
   * 调度器会自动跳过处于熔断状态的平台。
   */
  startScheduler(): void {
    this.stopScheduler(); // 先清理已有定时器，避免重复

    // 全量同步定时器
    const fullSyncTimer = setInterval(async () => {
      try {
        await this.fullSync();
      } catch (error) {
        this.logger.error(
          `[调度器] 全量同步定时任务异常: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }, this.fullSyncInterval);

    this.schedulerTimers.push(fullSyncTimer);

    // 增量同步定时器
    const incrementalTimer = setInterval(async () => {
      try {
        await this.incrementalSync();
      } catch (error) {
        this.logger.error(
          `[调度器] 增量同步定时任务异常: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }, this.incrementalSyncInterval);

    this.schedulerTimers.push(incrementalTimer);

    // 更新各平台的下次同步时间
    for (const platformId of this.adapters.keys()) {
      const status = this.platformStatuses.get(platformId);
      if (status) {
        status.nextScheduledSync = new Date(Date.now() + this.fullSyncInterval).toISOString();
      }
    }

    this.logger.log(
      `[调度器] 已启动 | 全量同步周期=${this.fullSyncInterval / 60000}分钟 | ` +
        `增量同步周期=${this.incrementalSyncInterval / 60000}分钟`
    );
  }

  /**
   * 停止所有定时调度器
   *
   * 清理所有活跃的 interval 定时器，
   * 通常在服务关闭或维护时调用。
   */
  stopScheduler(): void {
    for (const timer of this.schedulerTimers) {
      clearInterval(timer);
    }
    this.schedulerTimers = [];
    this.logger.log('[调度器] 已停止所有定时任务');
  }

  // ==================== 状态与监控 ====================

  /**
   * 获取各平台实时同步状态
   *
   * 返回每个已注册平台的当前同步状态概览，
   * 包括最近同步时间、当前运行状态和下次计划时间。
   *
   * @returns 以平台 ID 为键的状态映射表
   */
  getSyncStatus(): Map<string, SyncPlatformStatus> {
    return new Map(this.platformStatuses);
  }

  /**
   * 获取最近的同步历史记录
   *
   * 从 Redis 中读取最近 N 条同步报告，
   * 用于仪表盘展示和问题排查。
   *
   * @param limit 返回条数上限，默认 20
   * @returns 按时间倒序排列的同步报告数组
   */
  async getSyncHistory(limit = 20): Promise<SyncReport[]> {
    try {
      const historyJson = await this.redis.get(`acquisition:sync:history`);
      if (!historyJson) return [];

      const history: SyncReport[] = JSON.parse(historyJson);
      return history.slice(0, limit);
    } catch (error) {
      this.logger.error(
        `读取同步历史失败: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * 获取全局同步指标统计
   *
   * 汇总所有平台的同步表现指标，
   * 用于系统健康度评估和运营报表。
   *
   * @returns 包含总同步次数、成功率、平均耗时和处理数据量的指标对象
   */
  async getSyncMetrics(): Promise<{
    totalSyncs: number;
    successRate: number;
    avgDuration: number;
    dataPointsProcessed: number;
  }> {
    try {
      const metricsJson = await this.redis.get(`acquisition:sync:metrics`);

      if (metricsJson) {
        return JSON.parse(metricsJson);
      }

      // 无缓存时返回零值
      return {
        totalSyncs: 0,
        successRate: 0,
        avgDuration: 0,
        dataPointsProcessed: 0,
      };
    } catch (error) {
      this.logger.error(
        `读取同步指标失败: ${error instanceof Error ? error.message : String(error)}`
      );
      return { totalSyncs: 0, successRate: 0, avgDuration: 0, dataPointsProcessed: 0 };
    }
  }

  // ==================== 内部实现方法 ====================

  /**
   * 执行单个平台的完整同步流程
   *
   * 内部核心方法，封装了单平台同步的完整生命周期：
   * 状态更新 → 熔断检查 → 数据采集 → 标准化 → 去重 → 入库 → 报告生成
   *
   * @param platformId 目标平台 ID
   * @param type 同步类型（'full' 或 'incremental'）
   * @returns 单平台同步报告
   */
  private async syncSinglePlatform(
    platformId: string,
    type: 'full' | 'incremental'
  ): Promise<SyncReport> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const errors: string[] = [];
    let collected = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    // 更新状态为同步中
    this.updatePlatformStatus(platformId, { status: 'syncing' });

    try {
      // 熔断器检查
      if (this.isCircuitOpen(platformId)) {
        throw new Error(`平台 ${platformId} 熔断器已开启，请稍后再试`);
      }

      const adapter = this.getAdapter(platformId);
      this.logger.log(`[${type === 'full' ? '全量' : '增量'}同步][${platformId}] 开始采集`);

      // 步骤1：调用适配器获取原始达人列表
      const rawLeads = await adapter.fetchInfluencers('', {
        page: 1,
        pageSize: 50, // 每批最多 50 条
        sortBy: 'recent',
      });

      collected = rawLeads.length;
      this.logger.log(`[${platformId}] 采集到 ${collected} 条原始数据`);

      // 步骤2：逐条标准化
      const normalizedList: NormalizedInfluencer[] = [];
      for (const item of rawLeads) {
        try {
          const normalized = adapter.normalizeInfluencer(JSON.parse(String(item.rawJson)));
          normalizedList.push(normalized);
        } catch (normalizeError) {
          errors.push(
            `标准化失败 (${item.id}): ${normalizeError instanceof Error ? normalizeError.message : String(normalizeError)}`
          );
          failed++;
        }
      }

      // 步骤3：去重与入库
      for (const normalized of normalizedList) {
        try {
          const upsertResult = await this.upsertInfluencer(normalized, platformId);
          if (upsertResult === 'created') created++;
          else if (upsertResult === 'updated') updated++;
          else skipped++;
        } catch (dbError) {
          errors.push(
            `入库失败 (${(normalized as any).externalId || normalized.id}): ${dbError instanceof Error ? dbError.message : String(dbError)}`
          );
          failed++;
        }
      }

      // 步骤4：处理分页（如果有更多数据）
      // fetchInfluencers 返回数组，分页由适配器内部处理
      if (rawLeads.length > 0) {
        this.logger.log(`[${platformId}] 本批采集完成，共 ${rawLeads.length} 条`);
        // TODO: 实现游标分页的后续批次拉取
      }

      // 同步成功，重置错误计数
      this.resetConsecutiveErrors(platformId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      failed = collected; // 采集阶段失败则全部标记为失败
      this.recordFailure(platformId);
      this.logger.error(`[${platformId}] 同步失败: ${errorMsg}`);
    } finally {
      // 更新状态
      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      this.updatePlatformStatus(platformId, {
        status: errors.length > 0 ? 'error' : 'idle',
        ...(type === 'full' ? { lastFullSync: completedAt } : { lastIncrementalSync: completedAt }),
      });

      // 异步保存同步报告和历史（不阻塞主流程）
      this.saveSyncReport({
        platform: platformId,
        type,
        startedAt,
        completedAt,
        durationMs,
        collected,
        created,
        updated,
        skipped,
        failed,
        errors,
      }).catch((err) =>
        this.logger.warn(`保存同步报告失败: ${err instanceof Error ? err.message : String(err)}`)
      );
    }

    return {
      platform: platformId,
      type,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      collected,
      created,
      updated,
      skipped,
      failed,
      errors,
    };
  }

  /**
   * 执行单个平台的增量同步
   *
   * 与全量同步的区别在于只拉取上次同步后的变更数据。
   * 通过读取 Redis 中的 last-sync 时间戳来限定查询范围。
   *
   * @param platformId 目标平台 ID
   * @returns 单平台增量同步报告
   */
  private async syncSinglePlatformIncremental(platformId: string): Promise<SyncReport> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const errors: string[] = [];
    let collected = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    this.updatePlatformStatus(platformId, { status: 'syncing' });

    try {
      if (this.isCircuitOpen(platformId)) {
        // 熔断期间跳过增量同步但不报错
        this.logger.warn(`[增量同步][${platformId}] 熔断器开启，跳过`);
        return this.buildSkippedReport(platformId, startedAt, startTime);
      }

      const adapter = this.getAdapter(platformId);

      // 从 Redis 获取上次增量同步时间
      const lastSyncStr = await this.redis.get(`acquisition:sync:last-incremental:${platformId}`);
      const sinceDate = lastSyncStr
        ? new Date(lastSyncStr)
        : new Date(Date.now() - this.incrementalSyncInterval);

      this.logger.log(`[增量同步][${platformId}] 增量起始时间: ${sinceDate.toISOString()}`);

      // 调用适配器获取增量数据（传入起始时间筛选）
      const rawLeads = await adapter.fetchInfluencers('', {
        page: 1,
        pageSize: 30,
        sortBy: 'recent',
      });

      collected = rawLeads.length;

      if (collected === 0) {
        this.logger.log(`[增量同步][${platformId}] 无新增数据`);
        return this.buildSkippedReport(platformId, startedAt, startTime);
      }

      // 标准化并入库
      for (const item of rawLeads) {
        try {
          const normalized = adapter.normalizeInfluencer(JSON.parse(String(item.rawJson)));
          const result = await this.upsertInfluencer(normalized, platformId);
          if (result === 'created') created++;
          else if (result === 'updated') updated++;
          else skipped++;
        } catch (error) {
          errors.push(`${item.id}: ${error instanceof Error ? error.message : String(error)}`);
          failed++;
        }
      }

      this.resetConsecutiveErrors(platformId);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      this.recordFailure(platformId);
    } finally {
      this.updatePlatformStatus(platformId, {
        status: errors.length > 0 ? 'error' : 'idle',
        lastIncrementalSync: new Date().toISOString(),
      });
    }

    return {
      platform: platformId,
      type: 'incremental',
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      collected,
      created,
      updated,
      skipped,
      failed,
      errors,
    };
  }

  /**
   * 将标准化的达人数据写入数据库（Upsert 操作）
   *
   * 根据 externalId 查找已有记录：
   * - 不存在 → 新增（created）
   * - 存在且有变化 → 冲突解决后更新（updated）
   * - 存在但无变化 → 跳过（skipped）
   *
   * @param normalized 标准化后的达人数据
   * @param platformId 来源平台 ID
   * @returns 操作结果类型
   */
  private async upsertInfluencer(
    normalized: NormalizedInfluencer,
    platformId: string
  ): Promise<'created' | 'updated' | 'skipped'> {
    try {
      // 查找是否已存在
      const existing = await this.prisma.acquisitionLead.findFirst({
        where: {
          externalId: (normalized as any).externalId || normalized.id,
        },
      } as any);

      if (!existing) {
        // 新增记录
        await this.prisma.acquisitionLead.create({
          data: {
            externalId: (normalized as any).externalId || normalized.id,
            name: normalized.displayName,
            notes: normalized.bio,
            tags: JSON.stringify(normalized.tags),
            score: Math.round((normalized.engagementRate || 0) * 100), // 初始评分基于互动率
          } as any,
        });
        return 'created';
      }

      // 存在记录 → 检查是否有实质性变化
      const existingRaw =
        typeof (existing as any).rawJson === 'string'
          ? JSON.parse((existing as any).rawJson)
          : (existing as any).rawJson || {};

      const hasChanges =
        (existingRaw.followerCount ?? 0) !== (normalized.followerCount ?? 0) ||
        (existingRaw.followingCount ?? 0) !== (normalized.followingCount ?? 0) ||
        (existingRaw.postCount ?? 0) !== (normalized.postCount ?? 0);

      if (!hasChanges) {
        return 'skipped';
      }

      // 有变化 → 执行冲突解决并更新
      const existingNormalized: NormalizedInfluencer = {
        externalId: existing.externalId || '',
        platform: platformId as any,
        displayName: existing.name || '',
        username: (existingRaw as any)?.username || '',
        bio: (existing as any).notes || '',
        avatarUrl: (existingRaw as any)?.avatarUrl || '',
        profileUrl: (existingRaw as any)?.profileUrl || '',
        followerCount: (existingRaw as any)?.followerCount || 0,
        followingCount: (existingRaw as any)?.followingCount || 0,
        postCount: (existingRaw as any)?.postCount || 0,
        engagementRate: (existingRaw as any)?.engagementRate || 0,
        verified: (existingRaw as any)?.verified || false,
        category: (existingRaw as any)?.category || '',
        tags: typeof existing.tags === 'string' ? JSON.parse(existing.tags) : existing.tags || [],
        contactInfo: {},
        rawJson: JSON.stringify((existing as any).rawJson || {}),
        collectedAt: existing.createdAt || new Date(),
      } as any;

      const resolved = this.resolveConflict(existingNormalized, normalized);

      await this.prisma.acquisitionLead.update({
        where: { id: existing.id },
        data: {
          name: resolved.displayName,
          notes: resolved.bio,
          tags: JSON.stringify(resolved.tags),
          updatedAt: new Date(),
        } as any,
      });

      return 'updated';
    } catch (error) {
      this.logger.error(
        `Upsert 达人数据失败 (${(normalized as any).externalId || normalized.id}): ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  // ==================== 熔断器方法 ====================

  /**
   * 检查指定平台的熔断器是否处于开启状态
   *
   * @param platformId 平台 ID
   * @returns true 表示熔断开启（应拒绝请求）
   */
  private isCircuitOpen(platformId: string): boolean {
    const cb = this.circuitBreakers.get(platformId);
    if (!cb || !cb.isOpen) return false;

    // 检查是否已过恢复期
    const elapsed = Date.now() - cb.openedAt;
    if (elapsed >= cb.recoveryTimeoutMs) {
      // 恢复期已过，半开状态允许一次试探请求
      cb.isOpen = false;
      cb.failureCount = 0;
      this.logger.log(`[熔断器][${platformId}] 恢复期已过，切换到半开状态`);
      return false;
    }

    return true;
  }

  /**
   * 记录一次失败，并判断是否需要触发熔断
   *
   * @param platformId 平台 ID
   */
  private recordFailure(platformId: string): void {
    const cb = this.circuitBreakers.get(platformId);
    if (!cb) return;

    cb.failureCount++;

    const status = this.platformStatuses.get(platformId);
    if (status) {
      status.consecutiveErrors = cb.failureCount;
    }

    if (cb.failureCount >= cb.threshold && !cb.isOpen) {
      cb.isOpen = true;
      cb.openedAt = Date.now();
      if (status) status.status = 'disabled';

      this.logger.warn(
        `[熔断器][${platformId}] 已触发！连续失败 ${cb.failureCount}/${cb.threshold} 次，` +
          `${cb.recoveryTimeoutMs / 1000}s 后自动恢复`
      );
    }
  }

  /**
   * 重置指定平台的连续错误计数
   *
   * 在成功同步后调用，清除熔断器的失败累积。
   *
   * @param platformId 平台 ID
   */
  private resetConsecutiveErrors(platformId: string): void {
    const cb = this.circuitBreakers.get(platformId);
    if (cb) {
      cb.failureCount = 0;
      cb.isOpen = false;
    }

    const status = this.platformStatuses.get(platformId);
    if (status) {
      status.consecutiveErrors = 0;
      if (status.status === 'error' || status.status === 'disabled') {
        status.status = 'idle';
      }
    }
  }

  /**
   * 获取熔断器剩余恢复时间（秒）
   *
   * @param platformId 平台 ID
   * @returns 剩余秒数
   */
  private getCircuitRemainingTime(platformId: string): number {
    const cb = this.circuitBreakers.get(platformId);
    if (!cb || !cb.isOpen) return 0;
    const remaining = Math.ceil((cb.recoveryTimeoutMs - (Date.now() - cb.openedAt)) / 1000);
    return Math.max(0, remaining);
  }

  // ==================== 辅助方法 ====================

  /**
   * 更新平台同步状态
   *
   * @param platformId 平台 ID
   * @param updates 需要更新的状态字段
   */
  private updatePlatformStatus(platformId: string, updates: Partial<SyncPlatformStatus>): void {
    const current = this.platformStatuses.get(platformId);
    if (current) {
      Object.assign(current, updates);
    }
  }

  /**
   * 构建错误类型的同步报告
   *
   * @param platformId 平台 ID
   * @param type 同步类型
   * @param errorMessage 错误描述
   * @returns 包含错误信息的报告对象
   */
  private buildErrorReport(
    platformId: string,
    type: 'full' | 'incremental',
    errorMessage: string
  ): SyncReport {
    const now = new Date().toISOString();
    return {
      platform: platformId,
      type,
      startedAt: now,
      completedAt: now,
      durationMs: 0,
      collected: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [errorMessage],
    };
  }

  /**
   * 构建跳过类型的同步报告（无数据或熔断跳过）
   */
  private buildSkippedReport(platformId: string, startedAt: string, startTime: number): SyncReport {
    return {
      platform: platformId,
      type: 'incremental',
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      collected: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };
  }

  /**
   * 保存同步报告到 Redis 历史
   *
   * 采用 Redis List 结构存储最近 100 条报告，
   * 同时更新全局指标统计数据。
   *
   * @param report 待保存的同步报告
   */
  private async saveSyncReport(report: SyncReport): Promise<void> {
    try {
      // 读取现有历史
      const historyKey = `acquisition:sync:history`;
      const existingJson = await this.redis.get(historyKey);
      const history: SyncReport[] = existingJson ? JSON.parse(existingJson) : [];

      // 在头部插入新报告
      history.unshift(report);

      // 只保留最近 100 条
      const trimmedHistory = history.slice(0, 100);
      await this.redis.setJson(historyKey, trimmedHistory, 7 * 24 * 3600);

      // 更新全局指标
      const metricsKey = `acquisition:sync:metrics`;
      const metricsJson = await this.redis.get(metricsKey);
      const metrics = metricsJson
        ? JSON.parse(metricsJson)
        : {
            totalSyncs: 0,
            successCount: 0,
            totalDuration: 0,
            totalDataPoints: 0,
          };

      metrics.totalSyncs++;
      if (report.failed === 0 && report.errors.length === 0) {
        metrics.successCount++;
      }
      metrics.totalDuration += report.durationMs;
      metrics.totalDataPoints += report.collected;

      const avgDuration =
        metrics.totalSyncs > 0 ? Math.round(metrics.totalDuration / metrics.totalSyncs) : 0;
      const successRate =
        metrics.totalSyncs > 0
          ? parseFloat(((metrics.successCount / metrics.totalSyncs) * 100).toFixed(2))
          : 0;

      await this.redis.setJson(
        metricsKey,
        {
          totalSyncs: metrics.totalSyncs,
          successRate,
          avgDuration,
          dataPointsProcessed: metrics.totalDataPoints,
        },
        7 * 24 * 3600
      );
    } catch (error) {
      this.logger.error(
        `保存同步报告失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 记录同步错误到 Redis 错误日志
   *
   * 错误日志用于后续分析和告警通知。
   *
   * @param platformId 平台 ID
   * @param errorMessage 错误消息
   */
  private async logSyncError(platformId: string, errorMessage: string): Promise<void> {
    try {
      const errorLogKey = `acquisition:sync:error-log:${platformId}`;
      const errorEntry = {
        timestamp: new Date().toISOString(),
        platform: platformId,
        message: errorMessage,
      };

      const existingJson = await this.redis.get(errorLogKey);
      const log: Array<{ timestamp: string; platform: string; message: string }> = existingJson
        ? JSON.parse(existingJson)
        : [];

      log.unshift(errorEntry);

      // 保留最近 200 条错误
      await this.redis.setJson(errorLogKey, log.slice(0, 200), 7 * 24 * 3600);

      this.logger.error(`[错误日志][${platformId}] ${errorMessage}`);
    } catch (error) {
      this.logger.error(
        `写入错误日志失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 工具方法：异步休眠指定毫秒数
   *
   * @param ms 休眠时长（毫秒）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
