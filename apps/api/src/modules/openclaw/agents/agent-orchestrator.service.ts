import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { AgentPoolService } from './agent-pool.service';
import { AgentExecutorService } from './agent-executor.service';
import { RabbitMqService } from '../../../common/services/rabbitmq.service';
import { ITaskPayload, ITaskResult, TaskPriority, TaskStatus } from './types/task.types';

/** 任务队列统计信息 */
interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  dlq: number;
}

/** 正在运行的任务跟踪 */
interface RunningTask {
  taskId: number;
  sessionId: number;
  startedAt: Date;
}

/**
 * Agent 编排器 — 整个 Agent 系统的中央协调器
 *
 * 职责：
 * - 从 RabbitMQ 接收任务并持久化到数据库
 * - 按优先级调度任务到可用的 Agent 执行槽位
 * - 处理任务执行结果（成功/失败/重试）
 * - 管理死信队列（DLQ）用于永久失败的任务
 * - 优雅关闭时等待运行中的任务完成
 */
@Injectable()
export class AgentOrchestratorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentOrchestratorService.name);

  /** RabbitMQ 队列名常量 */
  private readonly TASK_QUEUE = 'agent.tasks';
  private readonly DLQ_QUEUE = 'agent.tasks.dlq';

  /** 最大重试次数（默认值，可通过任务配置覆盖） */
  private readonly DEFAULT_MAX_RETRIES = 3;

  /** 重试指数退避基础延迟（毫秒） */
  private readonly RETRY_BASE_DELAY_MS = 1000;

  /** 关闭超时时间（毫秒） */
  private readonly SHUTDOWN_TIMEOUT_MS = 30_000;

  /** 当前正在运行中的任务映射 */
  private runningTasks: Map<number, RunningTask> = new Map();

  /** 服务是否正在关闭 */
  private isShuttingDown = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentPool: AgentPoolService,
    private readonly executor: AgentExecutorService,
    private readonly rabbitMq: RabbitMqService
  ) {}

  /**
   * 模块初始化 — 启动 RabbitMQ 消费者并注册关闭处理程序
   */
  async onModuleInit(): Promise<void> {
    try {
      // 断言主任务队列和死信队列存在
      const channel = await this.rabbitMq.getChannel('orchestrator');
      await channel.assertQueue(this.TASK_QUEUE, { durable: true });
      await channel.assertQueue(this.DLQ_QUEUE, { durable: true });

      // 开始消费任务队列
      await this.rabbitMq.consume(
        this.TASK_QUEUE,
        async (msg) => {
          await this.handleMessage(msg);
        },
        5 // prefetch 较小以避免过载
      );

      this.logger.log(`Agent 编排器已启动，监听队列: ${this.TASK_QUEUE}`);

      // 注册进程级关闭钩子
      process.on('SIGTERM', () => this.gracefulShutdown());
      process.on('SIGINT', () => this.gracefulShutdown());
    } catch (error) {
      this.logger.error(`编排器初始化失败: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  /**
   * 模块销毁 — 停止消费，等待运行中任务完成
   */
  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }

  /**
   * 提交新任务 — 创建数据库记录并发布到 MQ（或直接调度）
   *
   * @param payload 任务负载数据
   * @param priority 任务优先级（默认 MEDIUM）
   * @param sessionId 可选的关联会话 ID
   * @returns 新创建任务的 ID
   */
  async submitTask(
    payload: ITaskPayload,
    priority: TaskPriority = TaskPriority.MEDIUM,
    sessionId?: number
  ): Promise<number> {
    // 创建任务记录
    const task = await this.prisma.agentTask.create({
      data: {
        sessionId: sessionId ?? null,
        type: payload.type,
        status: TaskStatus.QUEUED,
        priority,
        payload: JSON.stringify(payload),
        retryCount: 0,
        maxRetries: this.DEFAULT_MAX_RETRIES,
      },
    });

    this.logger.debug(`任务已创建 [id=${task.id}, type=${payload.type}, priority=${priority}]`);

    // 尝试发布到 RabbitMQ；若 MQ 不可用则直接调度
    try {
      await this.rabbitMq.publish(this.TASK_QUEUE, {
        taskId: task.id,
        payload,
        priority,
        sessionId,
        createdAt: task.createdAt.toISOString(),
      });
    } catch (mqError) {
      this.logger.warn(
        `RabbitMQ 发布失败，直接调度任务 [id=${task.id}]: ${(mqError as Error).message}`
      );
      // 降级为直接调度
      await this.dispatchTask(task.id).catch((err) =>
        this.logger.error(`直接调度失败 [id=${task.id}]: ${(err as Error).message}`)
      );
    }

    return task.id;
  }

  /**
   * 调度任务 — 从池中获取可用 Agent 槽位并启动执行
   *
   * @param taskId 要调度的任务 ID
   */
  async dispatchTask(taskId: number): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.warn(`系统关闭中，拒绝调度任务 [id=${taskId}]`);
      return;
    }

    // 获取任务详情
    const task = await this.prisma.agentTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      this.logger.error(`任务不存在 [id=${taskId}]`);
      return;
    }

    if (task.status !== TaskStatus.QUEUED && task.status !== TaskStatus.RETRYING) {
      this.logger.warn(`任务状态非待调度，跳过 [id=${taskId}, status=${task.status}]`);
      return;
    }

    try {
      // 从 Agent 池获取可用执行槽位
      const session = await this.agentPool.acquire(taskId);

      if (!session) {
        this.logger.warn(`无可用 Agent 槽位，任务重新入队 [id=${taskId}, type=${task.type}]`);
        // 更新状态回 queued 以便后续重新调度
        await this.prisma.agentTask.update({
          where: { id: taskId },
          data: { status: TaskStatus.QUEUED },
        });
        return;
      }

      // 更新任务状态为运行中
      await this.prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.RUNNING,
          sessionId: session.sessionId,
          startedAt: new Date(),
        },
      });

      // 跟踪运行中的任务
      this.runningTasks.set(taskId, {
        taskId,
        sessionId: session.sessionId,
        startedAt: new Date(),
      });

      this.logger.log(`任务已分配 [id=${taskId} → session=${session.sessionId}]`);

      // 解析负载并通过 Executor 启动执行
      const taskPayload: ITaskPayload = JSON.parse(String(task.payload));
      await this.executor.startTask(session.sessionId, {
        sessionId: session.sessionId,
        type: taskPayload.type,
        payload: taskPayload,
        priority: task.priority as TaskPriority,
      } as any);
    } catch (error) {
      this.logger.error(`任务调度失败 [id=${taskId}]: ${(error as Error).message}`);
      // 标记任务失败
      await this.failTask(taskId, `调度异常: ${(error as Error).message}`);
    }
  }

  /**
   * 处理任务 — 主任务处理循环：选择策略 → 执行 → 处理结果 → 必要时重试
   *
   * @param task 任务对象（含数据库字段）
   */
  async processTask(task: any): Promise<void> {
    const taskId = task.id;
    this.logger.debug(`开始处理任务 [id=${taskId}, type=${task.type}]`);

    try {
      // 1. 选择执行策略（根据任务类型和配置）
      // 策略选择逻辑可在此扩展：基于任务类型、历史成功率、资源可用性等

      // 2. 执行任务（由 Executor 负责）
      // 实际执行已在 dispatchTask 中通过 executor.startTask() 触发
      // 此方法主要用于从消息队列消费后的流程编排

      // 3. 检查执行结果
      // 结果通过 executor.completeTask() / executor.failTask() 回调回来
      this.logger.debug(`任务处理流程已触发 [id=${taskId}]`);
    } catch (error) {
      this.logger.error(`任务处理异常 [id=${taskId}]: ${(error as Error).message}`);
      await this.failTask(taskId, `处理异常: ${(error as Error).message}`);
    }
  }

  /**
   * 完成任务 — 标记成功并释放 Agent 槽位
   *
   * @param taskId 已完成的任务 ID
   * @param result 任务执行结果
   */
  async completeTask(taskId: number, result: ITaskResult): Promise<void> {
    this.logger.log(`任务完成 [id=${taskId}, success=${result.success}]`);

    try {
      // 通过 Executor 完成任务清理
      const runningTask = this.runningTasks.get(taskId);
      if (runningTask) {
        await this.executor.completeTask(taskId, result);
      }

      // 更新数据库记录
      await this.prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: result.success ? TaskStatus.SUCCESS : TaskStatus.FAILED,
          result: JSON.stringify(result),
          completedAt: new Date(),
          errorMessage: result.error ?? null,
        },
      });

      // 从运行跟踪中移除
      this.runningTasks.delete(taskId);

      // 如果会话的所有任务都已完成，释放槽位
      if (runningTask) {
        const sessionRemaining = await this.prisma.agentTask.count({
          where: {
            sessionId: runningTask.sessionId,
            status: TaskStatus.RUNNING,
          },
        });

        if (sessionRemaining === 0) {
          await this.agentPool.release(runningTask.sessionId);
          this.logger.debug(`会话槽位已释放 [session=${runningTask.sessionId}]`);
        }
      }
    } catch (error) {
      this.logger.error(`完成任务时出错 [id=${taskId}]: ${(error as Error).message}`);
    }
  }

  /**
   * 任务失败 — 检查重试次数，决定重排队或进入死信队列
   *
   * @param taskId 失败的任务 ID
   * @param error 错误信息
   */
  async failTask(taskId: number, error: string): Promise<void> {
    const task = await this.prisma.agentTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      this.logger.error(`无法标记失败：任务不存在 [id=${taskId}]`);
      return;
    }

    const retryCount = Number(task.retryCount) + 1;
    const maxRetries = Number(task.maxRetries) || this.DEFAULT_MAX_RETRIES;

    this.logger.warn(
      `任务失败 [id=${taskId}, attempt=${retryCount}/${maxRetries}, error=${error}]`
    );

    if (retryCount <= maxRetries) {
      // 还有重试机会
      await this.retryTask(taskId);
    } else {
      // 超过最大重试次数，发送到死信队列
      await this.sendToDeadLetter(taskId, `超过最大重试次数 (${maxRetries}), 最后错误: ${error}`);
    }
  }

  /**
   * 重试任务 — 增加重试计数、重置状态、计算退避延迟后重新调度
   *
   * @param taskId 要重试的任务 ID
   */
  async retryTask(taskId: number): Promise<void> {
    const task = await this.prisma.agentTask.findUnique({
      where: { id: taskId },
    });

    if (!task) return;

    const retryCount = Number(task.retryCount) + 1;
    const delayMs = this.RETRY_BASE_DELAY_MS * Math.pow(2, retryCount - 1); // 指数退避

    // 更新重试计数和状态
    await this.prisma.agentTask.update({
      where: { id: taskId },
      data: {
        retryCount,
        status: TaskStatus.RETRYING,
        errorMessage: null,
      },
    });

    // 从运行跟踪中移除
    this.runningTasks.delete(taskId);

    this.logger.log(`任务将在 ${delayMs}ms 后重试 [id=${taskId}, retryCount=${retryCount}]`);

    // 延迟后重新调度
    setTimeout(() => {
      this.dispatchTask(taskId).catch((err) =>
        this.logger.error(`重试调度失败 [id=${taskId}]: ${(err as Error).message}`)
      );
    }, delayMs);
  }

  /**
   * 发送到死信队列 — 标记任务为已取消并记录原因
   *
   * @param taskId 要移除的任务 ID
   * @param reason 进入 DLQ 的原因
   */
  async sendToDeadLetter(taskId: number, reason: string): Promise<void> {
    const task = await this.prisma.agentTask.findUnique({
      where: { id: taskId },
    });

    if (!task) return;

    // 更新数据库状态
    await this.prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.CANCELLED,
        errorMessage: `[DLQ] ${reason}`,
        completedAt: new Date(),
      },
    });

    // 从运行跟踪中移除
    this.runningTasks.delete(taskId);

    // 发布到死信队列以便后续分析和人工干预
    try {
      await this.rabbitMq.publish(this.DLQ_QUEUE, {
        taskId,
        originalType: task.type,
        originalPayload: task.payload,
        reason,
        failedAt: new Date().toISOString(),
        retryCount: task.retryCount,
      });
    } catch (mqError) {
      this.logger.error(`发送到 DLQ 失败 [id=${taskId}]: ${(mqError as Error).message}`);
    }

    this.logger.warn(`任务已进入死信队列 [id=${taskId}, reason=${reason}]`);
  }

  /**
   * 获取队列统计 — 按状态聚合任务数量
   *
   * @returns 各状态的任务计数值
   */
  async getQueueStats(): Promise<QueueStats> {
    const statuses = [
      TaskStatus.QUEUED,
      TaskStatus.RUNNING,
      TaskStatus.SUCCESS,
      TaskStatus.FAILED,
      TaskStatus.CANCELLED,
    ];

    const counts = await Promise.all(
      statuses.map((status) => this.prisma.agentTask.count({ where: { status } }))
    );

    return {
      pending: counts[0], // QUEUED
      running: counts[1], // RUNNING
      completed: counts[2], // SUCCESS
      failed: counts[3], // FAILED
      dlq: counts[4], // CANCELLED (DLQ)
    };
  }

  /**
   * 获取高优先级的待处理任务列表（按优先级升序、创建时间升序排列）
   *
   * @param limit 返回数量限制
   * @returns 待处理任务数组
   */
  async getPendingTasks(limit = 20): Promise<any[]> {
    return this.prisma.agentTask.findMany({
      where: {
        status: { in: [TaskStatus.QUEUED, TaskStatus.RETRYING] },
      },
      orderBy: [
        { priority: 'asc' }, // 优先级数值越小越优先
        { createdAt: 'asc' }, // 同优先级按创建时间排序
      ],
      take: limit,
    });
  }

  // ========== 内部辅助方法 ==========

  /**
   * 处理从 RabbitMQ 收到的消息
   */
  private async handleMessage(msg: any): Promise<void> {
    let parsed: any;
    try {
      parsed = JSON.parse(msg.content.toString());
    } catch {
      await this.rabbitMq.ack(msg);
      this.logger.error('收到非法 JSON 格式的消息，已丢弃');
      return;
    }

    const { taskId } = parsed;
    this.logger.debug(`收到 MQ 消息 [taskId=${taskId}]`);

    try {
      await this.processTask(parsed);
      await this.rabbitMq.ack(msg);
    } catch (error) {
      this.logger.error(`消息处理失败 [taskId=${taskId}]: ${(error as Error).message}`);
      await this.rabbitMq.nack(msg, false); // 不重新入队，由 failTask 决定后续
    }
  }

  /**
   * 优雅关闭 — 停止接收新任务，等待运行中任务完成或超时
   */
  private async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.logger.log('开始优雅关闭...');

    const runningCount = this.runningTasks.size;
    if (runningCount > 0) {
      this.logger.log(
        `等待 ${runningCount} 个运行中的任务完成 (超时: ${this.SHUTDOWN_TIMEOUT_MS}ms)`
      );

      // 等待所有运行中任务完成或超时
      const deadline = Date.now() + this.SHUTDOWN_TIMEOUT_MS;
      while (this.runningTasks.size > 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const remaining = this.runningTasks.size;
      if (remaining > 0) {
        this.logger.warn(`关闭超时，仍有 ${remaining} 个任务未完成`);
        // 将剩余运行中任务标记为失败
        for (const [taskId] of this.runningTasks) {
          await this.sendToDeadLetter(taskId, '优雅关闭超时，强制终止').catch(() => {});
        }
      }
    }

    this.logger.log('Agent 编排器已安全关闭');
  }
}
