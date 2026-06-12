import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { LlmProviderFactory } from '../../../modules/ai-models/llm/providers/index';
import { IAgentSession, AgentSessionStatus } from './types/agent.types';
import { ICreateTaskRequest, ITaskResult, TaskStatus } from './types/task.types';

/**
 * Agent Executor 服务 — 单个 Agent 完整生命周期管理器
 *
 * 职责：
 * - 管理 Agent 会话从「初始化 → 空闲 → 运行中 → 暂停 → 完成/异常」的状态流转
 * - 持久化会话与任务记录到数据库（Prisma）
 * - 提供心跳保活、进度更新、错误恢复等运行时能力
 *
 * 设计原则：
 * - 所有方法内部捕获异常，永不向上抛出（日志记录 + 标记为 ERROR 状态）
 * - 每次状态变更均通过 Logger 输出事件日志，便于追踪与审计
 */
@Injectable()
export class AgentExecutorService {
  private readonly logger = new Logger(AgentExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmProviderFactory: LlmProviderFactory
  ) {}

  // ==================== 会话生命周期 ====================

  /**
   * 初始化一个新的 Agent 会话
   *
   * 在数据库中创建 agentSession 记录，
   * 并返回包含完整信息的会话对象。
   *
   * @param sessionId - 外部传入的会话唯一标识（通常由调用方生成）
   * @param configId - 关联的 Agent 配置 ID（指向 agent_config 表）
   * @returns 新创建的会话对象；若失败返回 null（不抛异常）
   */
  async initialize(sessionId: number, configId: number): Promise<IAgentSession | null> {
    try {
      // 校验配置是否存在
      const config = await this.prisma.openClawAgent.findUnique({
        where: { id: configId },
      });
      if (!config) {
        this.logger.error(`初始化失败：Agent 配置不存在 [configId=${configId}]`);
        return null;
      }

      const session = await this.prisma.agentSession.create({
        data: {
          id: sessionId,
          configId,
          status: AgentSessionStatus.IDLE,
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          context: JSON.stringify({}),
          lastHeartbeatAt: new Date(),
        },
      });

      const sessionObj = this.mapToAgentSession(session);
      this.logger.log(`Agent 会话已初始化 [sessionId=${sessionId}, configId=${configId}]`);

      return sessionObj;
    } catch (error) {
      this.logger.error(
        `初始化 Agent 会话异常 [sessionId=${sessionId}, configId=${configId}]`,
        error instanceof Error ? error.stack : error
      );
      return null;
    }
  }

  /**
   * 启动一个新任务并关联到指定会话
   *
   * 在数据库中创建 agentTask 记录，
   * 同时更新会话状态为 RUNNING、递增 totalTasks 计数。
   *
   * @param sessionId - 目标会话 ID
   * @param task - 任务创建请求体
   * @returns 新创建的任务 ID；若失败返回 -1（不抛异常）
   */
  async startTask(sessionId: number, task: ICreateTaskRequest): Promise<number> {
    try {
      // 验证会话存在且可接受任务
      const session = await this.prisma.agentSession.findUnique({
        where: { id: sessionId },
      });
      if (!session) {
        this.logger.error(`启动任务失败：会话不存在 [sessionId=${sessionId}]`);
        return -1;
      }
      if (
        session.status === AgentSessionStatus.COMPLETED ||
        session.status === AgentSessionStatus.ERROR
      ) {
        this.logger.error(
          `启动任务失败：会话已终止 [sessionId=${sessionId}, status=${session.status}]`
        );
        return -1;
      }

      // 创建任务记录
      const createdTask = await this.prisma.agentTask.create({
        data: {
          sessionId,
          type: task.type,
          priority: task.priority ?? 5, // 默认 MEDIUM
          payload: JSON.stringify(task.payload),
          status: TaskStatus.RUNNING,
          createdBy: task.createdBy ?? null,
        },
      });

      // 更新会话状态与计数
      await this.prisma.agentSession.update({
        where: { id: sessionId },
        data: {
          status: AgentSessionStatus.RUNNING,
          currentTask: `${task.type}:${createdTask.id}`,
          totalTasks: { increment: 1 },
          startedAt: session.startedAt ?? new Date(), // 首次启动任务时设置 startedAt
        },
      });

      this.logger.log(
        `任务已启动 [taskId=${createdTask.id}, sessionId=${sessionId}, type=${task.type}]`
      );

      return createdTask.id;
    } catch (error) {
      this.logger.error(
        `启动任务异常 [sessionId=${sessionId}, type=${task.type}]`,
        error instanceof Error ? error.stack : error
      );
      return -1;
    }
  }

  /**
   * 标记任务执行成功
   *
   * 更新任务状态为 SUCCESS，同时更新会话的 completedTasks 计数。
   *
   * @param taskId - 任务 ID
   * @param result - 任务执行结果
   */
  async completeTask(taskId: number, result: ITaskResult): Promise<void> {
    try {
      // 获取任务信息以关联会话
      const task = await this.prisma.agentTask.findUnique({ where: { id: taskId } });
      if (!task) {
        this.logger.error(`完成任务失败：任务不存在 [taskId=${taskId}]`);
        return;
      }

      // 更新任务记录
      await this.prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.SUCCESS,
          result: JSON.stringify({ ...result.data, metrics: result.metrics }),
          completedAt: new Date(),
        },
      });

      // 更新会话计数器
      await this.prisma.agentSession.update({
        where: { id: task.sessionId },
        data: {
          completedTasks: { increment: 1 },
          currentTask: null,
        },
      });

      this.logger.log(`任务已完成 [taskId=${taskId}, sessionId=${task.sessionId}]`);
    } catch (error) {
      this.logger.error(
        `完成任务异常 [taskId=${taskId}]`,
        error instanceof Error ? error.stack : error
      );
    }
  }

  /**
   * 标记任务执行失败
   *
   * 更新任务状态为 FAILED 或 RETRYING（根据 retryable 标志），
   * 同步更新会话的 failedTasks 计数。
   *
   * @param taskId - 任务 ID
   * @param error - 错误描述信息
   * @param retryable - 是否允许重试（true 则标记 RETRYING，否则 FAILED）
   */
  async failTask(taskId: number, error: string, retryable = false): Promise<void> {
    try {
      const task = await this.prisma.agentTask.findUnique({ where: { id: taskId } });
      if (!task) {
        this.logger.error(`标记任务失败：任务不存在 [taskId=${taskId}]`);
        return;
      }

      const targetStatus = retryable ? TaskStatus.RETRYING : TaskStatus.FAILED;

      await this.prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: targetStatus,
          errorMessage: error,
          completedAt: new Date(),
          retryCount: retryable ? { increment: 1 } : undefined,
        },
      });

      // 仅在最终失败时增加会话失败计数
      if (!retryable) {
        await this.prisma.agentSession.update({
          where: { id: task.sessionId },
          data: {
            failedTasks: { increment: 1 },
            currentTask: null,
          },
        });
      }

      this.logger.warn(`任务${retryable ? '进入重试' : '失败'} [taskId=${taskId}, error=${error}]`);
    } catch (err) {
      this.logger.error(
        `标记任务失败异常 [taskId=${taskId}]`,
        err instanceof Error ? err.stack : err
      );
    }
  }

  /**
   * 暂停指定会话
   *
   * 将会话状态切换为 PAUSED，当前正在运行的任务不受影响
   * （由上层调度器决定是否中断）。
   *
   * @param sessionId - 会话 ID
   * @param reason - 暂停原因说明
   */
  async pauseSession(sessionId: number, reason?: string): Promise<void> {
    try {
      await this.prisma.agentSession.update({
        where: { id: sessionId },
        data: {
          status: AgentSessionStatus.PAUSED,
          context: JSON.stringify({
            pauseReason: reason ?? '用户手动暂停',
            pausedAt: new Date().toISOString(),
          }),
        },
      });

      this.logger.log(`会话已暂停 [sessionId=${sessionId}, reason=${reason ?? '未提供'}]`);
    } catch (error) {
      this.logger.error(
        `暂停会话异常 [sessionId=${sessionId}]`,
        error instanceof Error ? error.stack : error
      );
    }
  }

  /**
   * 恢复已暂停的会话
   *
   * 将状态切回 RUNNING，清除暂停上下文。
   *
   * @param sessionId - 会话 ID
   */
  async resumeSession(sessionId: number): Promise<void> {
    try {
      const session = await this.prisma.agentSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        this.logger.error(`恢复会话失败：会话不存在 [sessionId=${sessionId}]`);
        return;
      }

      if (session.status !== AgentSessionStatus.PAUSED) {
        this.logger.warn(
          `恢复会话跳过：当前状态非 PAUSED [sessionId=${sessionId}, status=${session.status}]`
        );
        return;
      }

      await this.prisma.agentSession.update({
        where: { id: sessionId },
        data: {
          status: AgentSessionStatus.RUNNING,
          context: JSON.stringify({}), // 清除暂停上下文
        },
      });

      this.logger.log(`会话已恢复 [sessionId=${sessionId}]`);
    } catch (error) {
      this.logger.error(
        `恢复会话异常 [sessionId=${sessionId}]`,
        error instanceof Error ? error.stack : error
      );
    }
  }

  /**
   * 完成会话（正常结束）
   *
   * 将状态设为 COMPLETED，记录完成时间与摘要信息。
   *
   * @param sessionId - 会话 ID
   * @param summary - 执行摘要（可选）
   */
  async completeSession(sessionId: number, summary?: string): Promise<void> {
    try {
      await this.prisma.agentSession.update({
        where: { id: sessionId },
        data: {
          status: AgentSessionStatus.COMPLETED,
          completedAt: new Date(),
          context: JSON.stringify({
            ...(summary && { summary }),
            completedAt: new Date().toISOString(),
          }),
        } as any,
      });

      this.logger.log(`会话已完成 [sessionId=${sessionId}${summary ? `, ${summary}` : ''}]`);
    } catch (error) {
      this.logger.error(
        `完成会话异常 [sessionId=${sessionId}]`,
        error instanceof Error ? error.stack : error
      );
    }
  }

  /**
   * 标记会话进入异常状态
   *
   * 将状态设为 ERROR，记录错误信息以便排查。
   *
   * @param sessionId - 会话 ID
   * @param error - 错误描述
   */
  async errorSession(sessionId: number, error: string): Promise<void> {
    try {
      await this.prisma.agentSession.update({
        where: { id: sessionId },
        data: {
          status: AgentSessionStatus.ERROR,
          context: JSON.stringify({ error, errorAt: new Date().toISOString() }),
        },
      });

      this.logger.error(`会话已标记为异常 [sessionId=${sessionId}, error=${error}]`);
    } catch (err) {
      this.logger.error(
        `标记会话异常状态失败 [sessionId=${sessionId}]`,
        err instanceof Error ? err.stack : err
      );
    }
  }

  // ==================== 运行时方法 ====================

  /**
   * 更新会话心跳时间戳
   *
   * 由 Agent Pool 的空闲检测机制或定时器周期性调用，
   * 用于判断会话是否仍存活。
   *
   * @param sessionId - 会话 ID
   */
  async heartbeat(sessionId: number): Promise<void> {
    try {
      await this.prisma.agentSession.update({
        where: { id: sessionId },
        data: { lastHeartbeatAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(
        `心跳更新失败 [sessionId=${sessionId}]`,
        error instanceof Error ? error.message : error
      );
    }
  }

  /**
   * 从数据库获取完整会话信息
   *
   * 包含关联配置名称等扩展字段。
   *
   * @param sessionId - 会话 ID
   * @returns 会话对象；不存在则返回 null
   */
  async getSession(sessionId: number): Promise<IAgentSession | null> {
    try {
      const session = await this.prisma.agentSession.findUnique({
        where: { id: sessionId },
        include: {
          config: { select: { name: true } },
        },
      });

      if (!session) {
        return null;
      }

      return this.mapToAgentSessionWithConfig(session);
    } catch (error) {
      this.logger.error(
        `获取会话信息异常 [sessionId=${sessionId}]`,
        error instanceof Error ? error.stack : error
      );
      return null;
    }
  }

  /**
   * 更新会话当前执行中的任务描述
   *
   * 用于 UI 展示或日志追踪当前进度。
   *
   * @param sessionId - 会话 ID
   * @param currentTask - 当前任务描述文本
   */
  async updateProgress(sessionId: number, currentTask: string): Promise<void> {
    try {
      await this.prisma.agentSession.update({
        where: { id: sessionId },
        data: { currentTask },
      });
    } catch (error) {
      this.logger.debug(
        `更新进度失败 [sessionId=${sessionId}]`,
        error instanceof Error ? error.message : error
      );
    }
  }

  // ==================== 内部辅助方法 ====================

  /**
   * 将 Prisma 原始 Session 行映射为 IAgentSession 接口对象
   */
  private mapToAgentSession(row: Record<string, unknown>): IAgentSession {
    return {
      id: row.id as number,
      configId: row.configId as number,
      configName: '',
      userId: (row.userId as number) ?? null,
      status: row.status as AgentSessionStatus,
      currentTask: (row.currentTask as string) ?? null,
      totalTasks: row.totalTasks as number,
      completedTasks: row.completedTasks as number,
      failedTasks: row.failedTasks as number,
      context: (row.context as Record<string, unknown>) ?? {},
      startedAt: (row.startedAt as Date) ?? null,
      completedAt: (row.completedAt as Date) ?? null,
      lastHeartbeatAt: row.lastHeartbeatAt as Date,
      createdAt: row.createdAt as Date,
    };
  }

  /**
   * 带配置名称的映射版本（用于 getSession 关联查询结果）
   */
  private mapToAgentSessionWithConfig(
    row: Record<string, unknown> & { config?: { name: string } }
  ): IAgentSession {
    const base = this.mapToAgentSession(row);
    base.configName = row.config?.name ?? '';
    return base;
  }
}
