/**
 * IPC 通信协议 — Agent ↔ Orchestrator 消息格式
 * 基于 RabbitMQ 或 Worker Thread 的进程内通信
 */

/** 消息类型枚举 */
export enum IpcMessageType {
  // ===== Orchestrator → Agent =====
  TASK_ASSIGN = 'task_assign', // 分配任务
  TASK_CANCEL = 'task_cancel', // 取消任务
  PAUSE_REQUEST = 'pause_request', // 暂停请求
  RESUME_REQUEST = 'resume_request', // 恢复请求
  SHUTDOWN = 'shutdown', // 关闭指令
  CONFIG_UPDATE = 'config_update', // 配置更新

  // ===== Agent → Orchestrator =====
  TASK_STARTED = 'task_started', // 任务开始执行
  TASK_PROGRESS = 'task_progress', // 任务进度报告
  TASK_COMPLETED = 'task_completed', // 任务完成
  TASK_FAILED = 'task_failed', // 任务失败
  HEARTBEAT = 'heartbeat', // 心跳包
  STATUS_UPDATE = 'status_update', // 状态变更通知
  LOG_OUTPUT = 'log_output', // 日志输出

  // ===== 双向 =====
  PING = 'ping',
  PONG = 'pong',
}

/** IPC 消息基础结构 */
export interface IpcMessage<T = unknown> {
  type: IpcMessageType;
  messageId: string; // UUID v4
  timestamp: number; // Unix ms
  senderId: string; // agent-session-id 或 'orchestrator'
  receiverId?: string; // 目标接收者
  payload: T;
  correlationId?: string; // 关联原始消息（用于响应）
}

/** 任务分配载荷 */
export interface TaskAssignPayload {
  taskId: number;
  taskType: string;
  priority: number;
  payload: Record<string, unknown>;
  maxRetries: number;
  queuedAt: string;
}

/** 任务进度载荷 */
export interface TaskProgressPayload {
  taskId: number;
  progress: number; // 0-100
  message: string;
  metadata?: Record<string, unknown>;
}

/** 任务完成载荷 */
export interface TaskCompletedPayload {
  taskId: number;
  result: Record<string, unknown>;
  metrics: {
    durationMs: number;
    tokensUsed?: number;
    itemsProcessed?: number;
  };
}

/** 任务失败载荷 */
export interface TaskFailedPayload {
  taskId: number;
  error: string;
  errorCode?: string;
  retryable: boolean;
  attempt: number;
}

/** 心跳载荷 */
export interface HeartbeatPayload {
  sessionId: number;
  status: string;
  currentTask: string | null;
  uptimeSeconds: number;
  memoryUsageMb: number;
  queueDepth: number;
}
