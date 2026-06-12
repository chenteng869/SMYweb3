import { Logger } from '@nestjs/common';
import { ITaskPayload, ITaskResult, TaskType, TaskStatus } from '../types/task.types';
import { IAgentSession, AgentSessionStatus } from '../types/agent.types';

/**
 * Agent 策略抽象基类
 *
 * 定义所有 Agent 策略的通用接口和默认行为。
 * 具体策略类（获客、内容、分析、存证、KYC 等）需继承此类并实现核心方法。
 * 采用模板方法模式，提供预处理 → 执行 → 后处理 的标准执行流程。
 */
export abstract class BaseAgentStrategy {
  /** 策略唯一名称标识 */
  abstract readonly strategyName: string;

  /** 该策略支持的任务类型列表 */
  abstract readonly supportedTaskTypes: TaskType[];

  /** 日志实例（使用子类构造函数名作为日志上下文） */
  protected logger: Logger;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * 核心执行方法（子类必须实现）
   *
   * @param session - 当前 Agent 会话信息
   * @param payload - 任务输入负载
   * @returns 任务执行结果
   */
  abstract execute(session: IAgentSession, payload: ITaskPayload): Promise<ITaskResult>;

  /**
   * 预处理钩子 - 在 execute 之前调用
   *
   * 默认实现直接返回原始 payload。子类可覆写此方法以实现：
   * - 参数校验与清洗
   * - 数据格式转换
   * - 权限检查
   *
   * @param payload - 原始任务负载
   * @returns 处理后的任务负载
   */
  async preprocess(payload: ITaskPayload): Promise<ITaskPayload> {
    this.logger.debug(`预处理阶段: 任务类型=${payload.type}, 策略=${this.strategyName}`);
    return payload;
  }

  /**
   * 后处理钩子 - 在 execute 成功之后调用
   *
   * 默认实现直接返回原始 result。子类可覆写此方法以实现：
   * - 结果数据格式化
   * - 指标补充
   * - 缓存更新
   *
   * @param result - 执行结果
   * @param session - 会话信息
   * @returns 处理后的执行结果
   */
  async postprocess(result: ITaskResult, session: IAgentSession): Promise<ITaskResult> {
    this.logger.debug(`后处理阶段: 会话ID=${session.id}, 成功=${result.success}`);
    return result;
  }

  /**
   * 统一错误处理方法
   *
   * 当 execute 抛出异常时由调用方触发此方法，
   * 返回标准化的错误结果结构。
   *
   * @param error - 捕获的异常对象
   * @param payload - 触发错误的原始负载（用于日志追踪）
   * @returns 标准化的失败结果
   */
  onError(error: Error, payload: ITaskPayload): ITaskResult {
    this.logger.error(`策略 [${this.strategyName}] 执行出错: ${error.message}`, error.stack);
    return {
      success: false,
      error: `[${this.strategyName}] ${error.message}`,
      metrics: { durationMs: 0 },
    };
  }

  /**
   * 判断当前策略是否支持指定的任务类型
   *
   * @param taskType - 待判断的任务类型
   * @returns 是否支持该类型
   */
  canHandle(taskType: TaskType): boolean {
    return this.supportedTaskTypes.includes(taskType);
  }

  /**
   * 获取策略元信息
   *
   * 用于策略注册表展示和路由匹配时的快速查询。
   *
   * @returns 包含策略名称和支持类型的元数据对象
   */
  getStrategyInfo(): { name: string; supportedTypes: TaskType[] } {
    return {
      name: this.strategyName,
      supportedTypes: [...this.supportedTaskTypes],
    };
  }
}
