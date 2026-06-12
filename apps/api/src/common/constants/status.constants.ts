/**
 * SMYweb3 统一状态枚举
 */

/** Agent 会话状态 */
export enum AgentSessionStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error',
}

/** Agent 任务状态 */
export enum AgentTaskStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
}

/** Agent 任务类型 */
export enum AgentTaskType {
  ACQUISITION = 'acquisition',
  CONTENT = 'content',
  ANALYSIS = 'analysis',
  EVIDENCE = 'evidence',
  KYC_REVIEW = 'kyc_review',
}

/** 存证类型 */
export enum EvidenceType {
  DOCUMENT = 'document',
  SIGNATURE = 'signature',
  REPORT = 'report',
}

/** 签名算法 */
export enum SignatureAlgorithm {
  ECDSA = 'ECDSA',
  RSA = 'RSA',
  EdDSA = 'EdDSA',
  SM2 = 'SM2',
}

/** LLM Provider 枚举 */
export enum LlmProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  QWEN = 'qwen',
  DEEPSEEK = 'deepseek',
}

/** 告警严重级别 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/** 链 ID 映射 */
export const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum Mainnet',
  137: 'Polygon',
  56: 'BSC Mainnet',
  11155111: 'Ethereum Sepolia',
  80001: 'Polygon Amoy',
  97: 'BSC Testnet',
};
