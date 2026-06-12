import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { AgentExecutorService } from './agent-executor.service';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { AgentSessionStatus } from './types/agent.types';

// ========== 健康检查接口定义 ==========

/** 单个会话健康状态 */
export interface SessionHealth {
  /** 会话 ID */
  sessionId: number;
  /** 当前会话状态 */
  status: string;
  /** 距离上次心跳的时长（秒） */
  lastHeartbeatAge: number;
  /** 是否健康（心跳未超时） */
  isHealthy: boolean;
  /** 发现的问题列表 */
  issues: string[];
}

/** 健康检查报告 */
export interface HealthReport {
  /** 检查时间戳 */
  checkedAt: Date;
  /** 检查的总会话数 */
  total: number;
  /** 健康会话数 */
  healthy: number;
  /** 不健康会话数 */
  unhealthy: number;
  /** 已自动恢复的会话数 */
  recovered: number;
  /** 本次检查采取的措施记录 */
  actionsTaken: string[];
}

/** 系统整体健康状态 */
export interface SystemHealth {
  /** 总体状态: healthy / degraded / unhealthy */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** 服务启动时间（Unix 时间戳，秒） */
  uptime: number;
  /** 会话统计 */
  sessions: {
    total: number;
    healthy: number;
    unhealthy: number;
    stale: number;
  };
  /** Agent 统计 */
  agents: {
    active: number;
    idle: number;
    error: number;
  };
  /** 队列深度 */
  queue: {
    pending: number;
    running: number;
  };
  /** 上次检查时间 */
  lastCheck: Date | null;
  /** 告警信息列表 */
  alerts: string[];
}

/**
 * Agent 健康检查服务 — 心跳检测、超时标记、自动恢复
 *
 * 职责：
 * - 定期轮询所有活跃会话的心跳时间戳
 * - 检测超时会话（超过阈值未上报心跳）
 * - 自动处理僵死会话：标记为错误、重新排队关联任务
 * - 提供系统级别的健康状态汇总接口
 * - 支持管理员手动强制恢复卡住的会话
 */
@Injectable()
export class AgentHealthService implements OnModuleInit {
  private readonly logger = new Logger(AgentHealthService.name);

  // ========== 可配置参数（支持环境变量覆盖） ==========

  /** Agent 心跳间隔 — Agent 应该以该频率发送心跳包（毫秒） */
  readonly HEARTBEAT_INTERVAL = parseInt(process.env.AGENT_HEARTBEAT_INTERVAL ?? '30000', 10);

  /** 会话超时阈值 — 超过此时间未收到心跳则视为僵死（毫秒），默认 5 分钟 */
  readonly SESSION_TIMEOUT = parseInt(process.env.AGENT_SESSION_TIMEOUT ?? '300000', 10);

  /** 健康检查执行间隔 — 本服务多久运行一次全面检查（毫秒），默认 60 秒 */
  readonly CHECK_INTERVAL = parseInt(process.env.AGENT_HEALTH_CHECK_INTERVAL ?? '60000', 10);

  // ========== 内部状态 ==========

  /** 定时器引用 */
  private checkTimer: NodeJS.Timeout | null = null;

  /** 服务启动时间 */
  private startTime: number;

  /** 最近一次健康检查结果缓存 */
  private lastReport: HealthReport | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly executor: AgentExecutorService,
    private readonly orchestrator: AgentOrchestratorService
  ) {
    this.startTime = Math.floor(Date.now() / 1000);
  }

  /**
   * 模块初始化 — 启动定期健康检查定时器
   */
  onModuleInit(): void {
    this.logger.log(
      `Agent 健康检查服务启动 [heartbeat=${this.HEARTBEAT_INTERVAL}ms, ` +
        `timeout=${this.SESSION_TIMEOUT}ms, checkInterval=${this.CHECK_INTERVAL}ms]`
    );

    // 启动后立即执行一次检查
    this.checkAllSessions().catch((err) =>
      this.logger.error(`首次健康检查异常: ${(err as Error).message}`)
    );

    // 设置周期性检查定时器
    this.checkTimer = setInterval(async () => {
      try {
        await this.checkAllSessions();
      } catch (error) {
        this.logger.error(`定期健康检查异常: ${(error as Error).message}`);
      }
    }, this.CHECK_INTERVAL);

    // 防止定时器阻止进程退出
    if (this.checkTimer && this.checkTimer.unref) {
      this.checkTimer.unref();
    }
  }

  /**
   * 全面检查所有非已完成会话的健康状态
   *
   * @returns 健康检查报告
   */
  async checkAllSessions(): Promise<HealthReport> {
    const now = new Date();
    const actionsTaken: string[] = [];
    let recovered = 0;

    // 查询所有非终态会话（idle / running / paused / error）
    const sessions = await this.prisma.agentSession.findMany({
      where: {
        status: {
          in: [
            AgentSessionStatus.IDLE,
            AgentSessionStatus.RUNNING,
            AgentSessionStatus.PAUSED,
            AgentSessionStatus.ERROR,
          ],
        },
      },
    });

    let healthyCount = 0;
    let unhealthyCount = 0;

    for (const session of sessions) {
      const health = this.checkSession(session);

      if (health.isHealthy) {
        healthyCount++;
      } else {
        unhealthyCount++;
        // 对不健康的会话采取行动
        if (health.lastHeartbeatAge > this.SESSION_TIMEOUT / 1000) {
          this.logger.warn(
            `检测到僵死会话 [session=${session.id}, ` +
              `lastHeartbeatAge=${Math.round(health.lastHeartbeatAge)}s, issues=${health.issues.join(',')}]`
          );
          try {
            await this.handleStaleSession(session.id);
            await this.handleZombieTasks(session.id);
            recovered++;
            actionsTaken.push(`会话 ${session.id} 已自动恢复（僵死清理）`);
          } catch (error) {
            this.logger.error(`自动恢复会话 ${session.id} 失败: ${(error as Error).message}`);
            actionsTaken.push(`会话 ${session.id} 恢复失败: ${(error as Error).message}`);
          }
        }
      }
    }

    const report: HealthReport = {
      checkedAt: now,
      total: sessions.length,
      healthy: healthyCount,
      unhealthy: unhealthyCount,
      recovered,
      actionsTaken: actionsTaken,
    };

    this.lastReport = report;

    if (unhealthyCount > 0) {
      this.logger.warn(
        `健康检查完成 [total=${sessions.length}, healthy=${healthyCount}, ` +
          `unhealthy=${unhealthyCount}, recovered=${recovered}]`
      );
    } else {
      this.logger.debug(`健康检查通过 [total=${sessions.length}, all healthy]`);
    }

    return report;
  }

  /**
   * 评估单个会话的健康状态
   *
   * @param session 会话对象
   * @returns 该会话的健康评估结果
   */
  checkSession(session: any): SessionHealth {
    const issues: string[] = [];
    const now = Date.now();

    // 计算距上次心跳的时间差（秒）
    const lastHeartbeat = session.lastHeartbeatAt ? new Date(session.lastHeartbeatAt).getTime() : 0;
    const lastHeartbeatAge = lastHeartbeat > 0 ? (now - lastHeartbeat) / 1000 : Infinity;

    // 判断是否健康
    let isHealthy = true;

    if (!session.lastHeartbeatAt) {
      issues.push('从未收到过心跳');
      isHealthy = false;
    } else if (lastHeartbeatAge > this.SESSION_TIMEOUT / 1000) {
      issues.push(`心跳超时 (${Math.round(lastHeartbeatAge)}s > ${this.SESSION_TIMEOUT / 1000}s)`);
      isHealthy = false;
    }

    if (session.status === AgentSessionStatus.ERROR) {
      issues.push('会话处于错误状态');
      isHealthy = false;
    }

    // 运行中但长时间无心跳也视为可疑
    if (
      session.status === AgentSessionStatus.RUNNING &&
      lastHeartbeatAge > this.SESSION_TIMEOUT / 1000
    ) {
      issues.push('运行中会话心跳超时，可能为僵尸进程');
      isHealthy = false;
    }

    return {
      sessionId: session.id,
      status: session.status,
      lastHeartbeatAge,
      isHealthy,
      issues,
    };
  }

  /**
   * 处理僵死会话 — 标记为错误状态并通知编排器
   *
   * @param sessionId 僵死的会话 ID
   */
  async handleStaleSession(sessionId: number): Promise<void> {
    this.logger.warn(`处理僵死会话 [sessionId=${sessionId}]`);

    try {
      // 更新会话状态为 error
      await this.prisma.agentSession.update({
        where: { id: sessionId },
        data: {
          status: AgentSessionStatus.ERROR,
          context: JSON.stringify({
            ...this.safeParseJson(null),
            staleDetectedAt: new Date().toISOString(),
            reason: 'heartbeat_timeout',
          }),
        },
      });

      this.logger.log(`会话已标记为错误 [sessionId=${sessionId}]`);
    } catch (error) {
      this.logger.error(
        `更新僵死会话状态失败 [sessionId=${sessionId}]: ${(error as Error).message}`
      );
      throw error;
    }
  }

  /**
   * 处理僵尸任务 — 将崩溃会话上处于 running 状态的任务重新排队
   *
   * @param sessionId 已崩溃的会话 ID
   */
  async handleZombieTasks(sessionId: number): Promise<void> {
    // 查找该会话下所有仍在 running 状态的任务
    const zombieTasks = await this.prisma.agentTask.findMany({
      where: {
        sessionId,
        status: 'running',
      },
    });

    if (zombieTasks.length === 0) {
      this.logger.debug(`会话 ${sessionId} 无僵尸任务`);
      return;
    }

    this.logger.warn(`发现 ${zombieTasks.length} 个僵尸任务 [sessionId=${sessionId}]`);

    for (const task of zombieTasks) {
      try {
        // 将任务状态重置为 queued 以便重新调度
        await this.prisma.agentTask.update({
          where: { id: task.id },
          data: {
            status: 'queued',
            sessionId: null,
            startedAt: null,
            errorMessage: `[僵尸回收] 会话 ${sessionId} 在执行期间崩溃`,
          },
        });

        this.logger.log(`僵尸任务已重新排队 [taskId=${task.id}]`);

        // 通知编排器重新调度
        await this.orchestrator.dispatchTask(task.id);
      } catch (error) {
        this.logger.error(`僵尸任务回收失败 [taskId=${task.id}]: ${(error as Error).message}`);
      }
    }
  }

  /**
   * 注册心跳 — 委托给 Executor 更新会话心跳时间戳
   *
   * @param sessionId 发送心跳的会话 ID
   */
  async registerHeartbeat(sessionId: number): Promise<void> {
    try {
      await this.executor.heartbeat(sessionId);
    } catch (error) {
      this.logger.error(`注册心跳失败 [sessionId=${sessionId}]: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 获取系统整体健康状态 — 包含会话、Agent、队列等多维度指标
   *
   * @returns 系统健康摘要
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const alerts: string[] = [];

    // 并行获取各维度数据
    const [sessionStats, agentStats, queueStats] = await Promise.all([
      // 会话统计
      this.prisma.agentSession
        .groupBy({
          by: ['status'],
          _count: true,
        })
        .then((groups) => {
          const map = new Map(groups.map((g) => [g.status, g._count]));
          return {
            total: groups.reduce((sum, g) => sum + g._count, 0),
            healthy:
              (map.get(AgentSessionStatus.IDLE) ?? 0) + (map.get(AgentSessionStatus.RUNNING) ?? 0),
            unhealthy: map.get(AgentSessionStatus.ERROR) ?? 0,
            stale: 0, // 将在下面动态计算
          };
        }),

      // Agent 配置统计（按状态分组）
      this.prisma.openClawAgent
        .groupBy({
          by: ['status'],
          _count: true,
        })
        .then((groups) => {
          const map = new Map(groups.map((g) => [g.status, g._count]));
          return {
            active: map.get('active') ?? 0,
            idle: map.get('draft') ?? 0,
            error: 0,
          };
        }),

      // 队列深度
      this.orchestrator.getQueueStats(),
    ]);

    // 计算僵死会话数
    const staleSessions = await this.countStaleSessions();
    sessionStats.stale = staleSessions;

    // 生成告警
    if (staleSessions > 0) {
      alerts.push(`检测到 ${staleSessions} 个僵死会话`);
    }
    if (queueStats.failed > 10) {
      alerts.push(`失败任务数量偏高: ${queueStats.failed}`);
    }
    if (queueStats.dlq > 5) {
      alerts.push(`死信队列积压: ${queueStats.dlq} 个任务`);
    }

    // 判定总体状态
    let status: SystemHealth['status'] = 'healthy';
    if (alerts.length > 0 || sessionStats.unhealthy > 0) {
      status = 'degraded';
    }
    if (staleSessions > 3 || queueStats.dlq > 20) {
      status = 'unhealthy';
    }

    return {
      status,
      uptime: Math.floor(Date.now() / 1000) - this.startTime,
      sessions: sessionStats,
      agents: agentStats,
      queue: {
        pending: queueStats.pending,
        running: queueStats.running,
      },
      lastCheck: this.lastReport?.checkedAt ?? null,
      alerts,
    };
  }

  /**
   * 强制恢复卡住的会话 — 管理员操作，尝试将 stuck 会话重置为空闲状态
   *
   * @param sessionId 要恢复的会话 ID
   * @returns 是否成功恢复
   */
  async forceRecoverSession(sessionId: number): Promise<boolean> {
    this.logger.warn(`管理员强制恢复会话 [sessionId=${sessionId}]`);

    const session = await this.prisma.agentSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      this.logger.error(`会话不存在 [sessionId=${sessionId}]`);
      return false;
    }

    if (session.status === AgentSessionStatus.COMPLETED) {
      this.logger.warn(`会话已完成，无需恢复 [sessionId=${sessionId}]`);
      return false;
    }

    if (session.status === AgentSessionStatus.IDLE) {
      this.logger.debug(`会话已是空闲状态 [sessionId=${sessionId}]`);
      return true;
    }

    try {
      // 先处理僵尸任务
      await this.handleZombieTasks(sessionId);

      // 重置会话状态为空闲
      await this.prisma.agentSession.update({
        where: { id: sessionId },
        data: {
          status: AgentSessionStatus.IDLE,
          currentTask: null,
          lastHeartbeatAt: new Date(), // 刷新心跳时间
          context: JSON.stringify({
            ...this.safeParseJson(session.context),
            forceRecoveredAt: new Date().toISOString(),
            previousStatus: session.status,
          }),
        },
      });

      this.logger.log(`会话已强制恢复为空闲 [sessionId=${sessionId}]`);
      return true;
    } catch (error) {
      this.logger.error(`强制恢复会话失败 [sessionId=${sessionId}]: ${(error as Error).message}`);
      return false;
    }
  }

  // ========== 内部辅助方法 ==========

  /**
   * 安全解析 JSON 字符串，返回对象或空对象
   */
  private safeParseJson(jsonStr: string | null): Record<string, unknown> {
    if (!jsonStr) return {};
    try {
      return JSON.parse(jsonStr) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  /**
   * 统计当前僵死会话数量
   */
  private async countStaleSessions(): Promise<number> {
    const cutoff = new Date(Date.now() - this.SESSION_TIMEOUT);

    const count = await this.prisma.agentSession.count({
      where: {
        status: { in: [AgentSessionStatus.RUNNING, AgentSessionStatus.PAUSED] },
        OR: [{ lastHeartbeatAt: null }, { lastHeartbeatAt: { lt: cutoff } }],
      },
    });

    return count;
  }
}
