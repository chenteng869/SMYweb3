/** Agent 任务负载（各策略的输入参数） */
export interface ITaskPayload {
  /** 任务类型 */
  type: TaskType;

  /** 平台标识（获客场景） */
  platform?: string;

  /** 查询关键词 */
  query?: string;

  /** 文件 ID（存证/签名场景） */
  fileId?: number;

  /** 文档 ID */
  documentId?: number;

  /** 用户 DID */
  didId?: number;

  /** 用户 ID */
  userId?: number;

  /** 会话 ID */
  sessionId?: number;

  /** 自定义参数 */
  params?: Record<string, unknown>;
}

/** Agent 任务执行结果 */
export interface ITaskResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  metrics?: {
    durationMs: number;
    tokensUsed?: number;
    itemsProcessed?: number;
  };
}

/** 任务优先级 (1=最高, 10=最低) */
export enum TaskPriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 5,
  BACKGROUND = 8,
  IDLE = 10,
}

/** 任务状态 */
export enum TaskStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
}

/** 任务类型枚举 */
export enum TaskType {
  ACQUISITION = 'acquisition', // 平台内容/数据采集
  CONTENT = 'content', // AI 内容生成
  ANALYSIS = 'analysis', // 数据分析
  EVIDENCE = 'evidence', // 区块链存证
  KYC_REVIEW = 'kyc_review', // KYC 审核
  NOTIFICATION = 'notification', // 消息通知
  REPORT = 'report', // 报告生成
  WEBHOOK = 'webhook', // Webhook 回调处理
}

/** 创建任务的请求 DTO 对应结构 */
export interface ICreateTaskRequest {
  sessionId: number;
  type: TaskType;
  priority?: TaskPriority;
  payload: ITaskPayload;
  createdBy?: number;
}
