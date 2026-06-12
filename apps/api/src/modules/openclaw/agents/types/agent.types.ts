/** Agent 配置类型 */
export interface IAgentConfig {
  id: number;
  name: string;
  type: AgentType;
  description: string;
  version: string;
  config: Record<string, unknown>; // JSON 解析后的配置对象
  tools: string[]; // 可用工具列表
  memoryType: MemoryType;
  status: AgentConfigStatus;
  runCount: number;
  successRate: number;
  avgLatencyMs: number;
}

/** Agent 会话 */
export interface IAgentSession {
  id: number;
  configId: number;
  configName: string;
  userId: number | null;
  status: AgentSessionStatus;
  currentTask: string | null;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  context: Record<string, unknown>; // JSON 解析后的上下文
  startedAt: Date | null;
  completedAt: Date | null;
  lastHeartbeatAt: Date;
  createdAt: Date;
}

/** Agent 枚举 */

export enum AgentType {
  CHATBOT = 'chatbot',
  RPA_AGENT = 'rpa_agent',
  DATA_ANALYST = 'data_analyst',
  CODE_ASSISTANT = 'code_assistant',
  DOCUMENT_PROCESSOR = 'document_processor',
  ACQUISITION = 'acquisition', // 获客采集
  CONTENT = 'content', // 内容生成
  ANALYSIS = 'analysis', // 数据分析
  EVIDENCE = 'evidence', // 区块链存证
  KYC_REVIEW = 'kyc_review', // KYC 审核
}

export enum AgentConfigStatus {
  DRAFT = 'draft',
  TESTING = 'testing',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum AgentSessionStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export enum MemoryType {
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
  HYBRID = 'hybrid',
}
