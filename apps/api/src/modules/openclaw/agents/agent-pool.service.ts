import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

/**
 * Agent 工作器状态枚举
 */
export enum WorkerStatus {
  /** 空闲等待任务 */
  IDLE = 'idle',
  /** 正在执行任务 */
  RUNNING = 'running',
  /** 已暂停 */
  PAUSED = 'paused',
  /** 已停止/销毁中 */
  STOPPED = 'stopped',
}

/**
 * 虚拟 Agent 工作器接口
 *
 * 使用异步任务队列模式管理，不依赖 Node.js 原生 Worker Thread，
 * 保证跨平台兼容性和内存可控性
 */
export interface AgentWorker {
  /** 关联的会话 ID */
  sessionId: number;
  /** 工作器当前状态 */
  status: WorkerStatus;
  /** 创建时间 */
  createdAt: Date;
  /** 最后活跃时间（心跳更新） */
  lastActiveAt: Date;
  /** 已完成任务计数 */
  taskCount: number;
  /** 当前正在执行的任务描述 */
  currentTask: string | null;
}

/**
 * 池状态指标接口
 */
export interface PoolStatus {
  /** 最大并发数 */
  max: number;
  /** 当前活跃工作器数 */
  active: number;
  /** 可用槽位数 */
  available: number;
  /** 利用率 (0-1) */
  utilization: number;
}

/** 心跳超时阈值：5 分钟（毫秒） */
const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000;

/** 默认最大并发数 */
const DEFAULT_MAX_CONCURRENCY = 50;

/**
 * Agent Pool 服务 — 虚拟工作器线程池管理器
 *
 * 职责：
 * - 管理虚拟 Agent 工作器的生命周期（创建、复用、回收）
 * - 控制最大并发数，防止系统过载
 * - 提供池状态监控与弹性扩缩容
 * - 基于心跳检测自动释放空闲超时的工作器
 *
 * 设计说明：
 * 本服务采用「异步任务队列」模式而非 Node.js Worker Threads，
 * 原因如下：
 * 1. NestJS 在某些部署环境（Serverless、部分容器）中对原生线程支持有限
 * 2. 避免内存泄漏风险——Worker Thread 的堆外内存不易被 GC 回收
 * 3. 统一通过事件循环调度，便于与 Prisma / NestJS DI 容器集成
 */
@Injectable()
export class AgentPoolService implements OnModuleDestroy {
  private readonly logger = new Logger(AgentPoolService.name);

  /**
   * 活跃工作器映射表 — sessionId → AgentWorker
   */
  private readonly activeAgents: Map<number, AgentWorker> = new Map();

  /**
   * 最大并发数上限（可通过环境变量 AGENT_MAX_CONCURRENCY 配置）
   */
  private maxConcurrency: number;

  /**
   * 当前负载计数
   */
  private currentLoad = 0;

  /**
   * 空闲超时定时器引用
   */
  private idleCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.maxConcurrency =
      parseInt(process.env.AGENT_MAX_CONCURRENCY || '', 10) || DEFAULT_MAX_CONCURRENCY;

    // 启动空闲检测定时器（每分钟检查一次）
    this.startIdleChecker();
  }

  // ==================== 核心方法 ====================

  /**
   * 获取或创建一个 Agent 工作器
   *
   * @param sessionId - 会话唯一标识
   * @param config - 工作器配置（预留扩展字段）
   * @returns 可用的 AgentWorker 实例
   * @throws 当池已满时抛出异常
   */
  async acquire(sessionId: number, config?: Record<string, unknown>): Promise<AgentWorker> {
    // 先检查是否已有该会话的工作器
    const existing = this.activeAgents.get(sessionId);
    if (existing) {
      this.touchHeartbeat(sessionId);
      this.currentLoad++;
      existing.status = WorkerStatus.RUNNING;
      this.logger.debug(`会话 ${sessionId} 复用已有工作器`);
      return existing;
    }

    // 检查池容量
    if (this.currentLoad >= this.maxConcurrency) {
      throw new Error(
        `Agent Pool 已满（当前负载: ${this.currentLoad}/${this.maxConcurrency}），无法分配新工作器`
      );
    }

    // 创建新工作器
    const now = new Date();
    const worker: AgentWorker = {
      sessionId,
      status: WorkerStatus.IDLE,
      createdAt: now,
      lastActiveAt: now,
      taskCount: 0,
      currentTask: null,
    };

    this.activeAgents.set(sessionId, worker);
    this.currentLoad++;

    this.logger.log(
      `新工作器已创建 [sessionId=${sessionId}] 当前负载: ${this.currentLoad}/${this.maxConcurrency}`
    );

    return worker;
  }

  /**
   * 释放指定会话的工作器资源
   *
   * 减少当前负载计数；若工作器已空闲超过阈值则直接移除。
   * 否则保留在池中以供后续复用。
   *
   * @param sessionId - 要释放的会话 ID
   */
  release(sessionId: number): void {
    const worker = this.activeAgents.get(sessionId);
    if (!worker) {
      this.logger.warn(`尝试释放不存在的工作器 [sessionId=${sessionId}]`);
      return;
    }

    this.currentLoad = Math.max(0, this.currentLoad - 1);
    worker.status = WorkerStatus.IDLE;
    worker.currentTask = null;
    this.touchHeartbeat(sessionId);

    // 检查是否长时间无活动 → 直接清理
    const idleTime = Date.now() - worker.lastActiveAt.getTime();
    if (idleTime > HEARTBEAT_TIMEOUT_MS) {
      this.cleanupWorker(sessionId);
      this.logger.log(`工作器因空闲超时被清理 [sessionId=${sessionId}]`);
    } else {
      this.logger.debug(`工作器已释放回池 [sessionId=${sessionId}] 剩余负载: ${this.currentLoad}`);
    }
  }

  // ==================== 查询方法 ====================

  /**
   * 获取当前可用槽位数量
   * @returns 剩余可分配的工作器槽位
   */
  getAvailableSlots(): number {
    return Math.max(0, this.maxConcurrency - this.currentLoad);
  }

  /**
   * 获取池整体运行状态指标
   * @returns 包含 max / active / available / utilization 的状态对象
   */
  getPoolStatus(): PoolStatus {
    const active = this.activeAgents.size;
    const available = this.getAvailableSlots();
    const utilization = this.maxConcurrency > 0 ? this.currentLoad / this.maxConcurrency : 0;

    return {
      max: this.maxConcurrency,
      active,
      available,
      utilization: parseFloat(utilization.toFixed(4)),
    };
  }

  /**
   * 根据 ID 获取单个活跃工作器
   * @param id - 会话 ID
   * @returns 对应的 AgentWorker，不存在则返回 undefined
   */
  getActiveSession(id: number): AgentWorker | undefined {
    return this.activeAgents.get(id);
  }

  /**
   * 获取所有活跃工作器的快照数组
   * @returns 当前所有活跃 AgentWorker 的副本
   */
  getAllActive(): AgentWorker[] {
    return Array.from(this.activeAgents.values());
  }

  // ==================== 扩缩容方法 ====================

  /**
   * 临时提升最大并发数（应对突发流量）
   *
   * @param n - 额外增加的槽数，默认 +10
   */
  scaleUp(n = 10): void {
    const previous = this.maxConcurrency;
    this.maxConcurrency += n;
    this.logger.warn(
      `Pool 弹性扩容: ${previous} → ${this.maxConcurrency} (+${n})，请记得及时 scaleDown`
    );
  }

  /**
   * 缩减最大并发数回正常水平
   *
   * @param n - 减少的槽数，不会低于初始配置值或 1
   */
  scaleDown(n = 10): void {
    const baseMax =
      parseInt(process.env.AGENT_MAX_CONCURRENCY || '', 10) || DEFAULT_MAX_CONCURRENCY;
    this.maxConcurrency = Math.max(baseMax, this.maxConcurrency - n);
    this.logger.log(`Pool 缩容至: ${this.maxConcurrency}`);
  }

  // ==================== 生命周期钩子 ====================

  /**
   * 模块销毁时优雅关闭所有工作器
   */
  async onModuleDestroy(): Promise<void> {
    // 停止空闲检测定时器
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
      this.idleCheckTimer = null;
    }

    const count = this.activeAgents.size;
    if (count === 0) {
      this.logger.log('Agent Pool 为空，无需清理');
      return;
    }

    this.logger.log(`开始优雅关闭 Agent Pool，共 ${count} 个活跃工作器...`);

    // 标记所有工作器为停止状态
    for (const [sessionId, worker] of this.activeAgents) {
      worker.status = WorkerStatus.STOPPED;
      this.logger.debug(`工作器已标记为 STOPPED [sessionId=${sessionId}]`);
    }

    // 清空映射表
    this.activeAgents.clear();
    this.currentLoad = 0;

    this.logger.log('Agent Pool 已优雅关闭');
  }

  // ==================== 内部辅助方法 ====================

  /**
   * 更新指定工作器的心跳时间戳
   * @param sessionId - 会话 ID
   */
  private touchHeartbeat(sessionId: number): void {
    const worker = this.activeAgents.get(sessionId);
    if (worker) {
      worker.lastActiveAt = new Date();
    }
  }

  /**
   * 从池中彻底移除并清理指定工作器
   * @param sessionId - 会话 ID
   */
  private cleanupWorker(sessionId: number): void {
    const removed = this.activeAgents.delete(sessionId);
    if (removed) {
      this.logger.debug(`工作器已从池中移除 [sessionId=${sessionId}]`);
    }
  }

  /**
   * 启动空闲超时检测定时器
   * 每 60 秒扫描一次，清理超过 5 分钟未心跳的工作器
   */
  private startIdleChecker(): void {
    this.idleCheckTimer = setInterval(() => {
      const now = Date.now();
      for (const [sessionId, worker] of this.activeAgents) {
        const idleMs = now - worker.lastActiveAt.getTime();
        if (idleMs > HEARTBEAT_TIMEOUT_MS && worker.status === WorkerStatus.IDLE) {
          this.logger.warn(
            `检测到空闲超时工作器 [sessionId=${sessionId}, 空闲${Math.round(idleMs / 1000)}s]，自动释放`
          );
          this.cleanupWorker(sessionId);
          this.currentLoad = Math.max(0, this.currentLoad - 1);
        }
      }
    }, 60_000); // 每分钟检查一次
  }
}
