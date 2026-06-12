/**
 * SMYweb3 统一错误码常量
 * 格式: SMY_模块_编号 (如 SMY_DID_001)
 */
export enum ErrorCode {
  // ===== 通用 (000-099) =====
  SUCCESS = 'SMY_000',
  UNKNOWN_ERROR = 'SMY_001',
  INVALID_PARAMS = 'SMY_002',
  UNAUTHORIZED = 'SMY_003',
  FORBIDDEN = 'SMY_004',
  NOT_FOUND = 'SMY_005',
  RATE_LIMITED = 'SMY_006',
  INTERNAL_ERROR = 'SMY_007',

  // ===== DID 模块 (100-199) =====
  DID_NOT_FOUND = 'SMY_DID_001',
  DID_ALREADY_EXISTS = 'SMY_DID_002',
  DID_STATUS_INVALID = 'SMY_DID_003',
  DID_FROZEN = 'SMY_DID_004',
  DID_REVOKED = 'SMY_DID_005',

  // ===== KYC 模块 (200-299) =====
  KYC_NOT_FOUND = 'SMY_KYC_001',
  KYC_DUPLICATE = 'SMY_KYC_002',
  KYC_REJECTED = 'SMY_KYC_003',
  KYC_PENDING = 'SMY_KYC_004',

  // ===== SBT 模块 (300-399) =====
  SBT_NOT_FOUND = 'SMY_SBT_001',
  SBT_ALREADY_ISSUED = 'SMY_SBT_002',
  SBT_REVOKED = 'SMY_SBT_003',

  // ===== 区块链存证 (400-499) =====
  EVIDENCE_NOT_FOUND = 'SMY_EVD_001',
  EVIDENCE_VERIFY_FAILED = 'SMY_EVD_002',
  EVIDENCE_CHAIN_ERROR = 'SMY_EVD_003',
  FILE_HASH_MISMATCH = 'SMY_EVD_004',
  FILE_TOO_LARGE = 'SMY_EVD_005',

  // ===== 电子签名 (500-599) =====
  SIGNATURE_INVALID = 'SMY_SIG_001',
  SIGNATURE_EXPIRED = 'SMY_SIG_002',
  SIGNATURE_REVOKED = 'SMY_SIG_003',
  DOCUMENT_NOT_SIGNABLE = 'SMY_SIG_004',

  // ===== Agent 模块 (600-699) =====
  AGENT_NOT_FOUND = 'SMY_AGT_001',
  AGENT_POOL_FULL = 'SMY_AGT_002',
  AGENT_TASK_FAILED = 'SMY_AGT_003',
  AGENT_TIMEOUT = 'SMY_AGT_004',
  AGENT_STRATEGY_NOT_FOUND = 'SMY_AGT_005',

  // ===== LLM 模块 (700-799) =====
  LLM_PROVIDER_ERROR = 'SMY_LLM_001',
  LLM_QUOTA_EXCEEDED = 'SMY_LLM_002',
  LLM_CONTEXT_TOO_LONG = 'SMY_LLM_003',
  LLM_MODEL_NOT_AVAILABLE = 'SMY_LLM_004',

  // ===== 获客模块 (800-899) =====
  ACQ_PLATFORM_ERROR = 'SMY_ACQ_001',
  ACQ_ADAPTER_NOT_FOUND = 'SMY_ACQ_002',
  ACQ_RATE_LIMITED = 'SMY_ACQ_003',
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.SUCCESS]: '操作成功',
  [ErrorCode.UNKNOWN_ERROR]: '未知错误',
  [ErrorCode.INVALID_PARAMS]: '请求参数无效',
  [ErrorCode.UNAUTHORIZED]: '未授权访问',
  [ErrorCode.FORBIDDEN]: '权限不足',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.RATE_LIMITED]: '请求过于频繁',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.DID_NOT_FOUND]: 'DID 身份不存在',
  [ErrorCode.DID_ALREADY_EXISTS]: 'DID 身份已存在',
  [ErrorCode.DID_STATUS_INVALID]: 'DID 状态无效',
  [ErrorCode.DID_FROZEN]: 'DID 已被冻结',
  [ErrorCode.DID_REVOKED]: 'DID 已被撤销',
  [ErrorCode.KYC_NOT_FOUND]: 'KYC 记录不存在',
  [ErrorCode.KYC_DUPLICATE]: 'KYC 记录已存在',
  [ErrorCode.KYC_REJECTED]: 'KYC 审核被拒绝',
  [ErrorCode.KYC_PENDING]: 'KYC 审核待处理',
  [ErrorCode.SBT_NOT_FOUND]: 'SBT 凭证不存在',
  [ErrorCode.SBT_ALREADY_ISSUED]: 'SBT 凭证已签发',
  [ErrorCode.SBT_REVOKED]: 'SBT 凭证已撤销',
  [ErrorCode.EVIDENCE_NOT_FOUND]: '存证记录不存在',
  [ErrorCode.EVIDENCE_VERIFY_FAILED]: '存证验证失败',
  [ErrorCode.EVIDENCE_CHAIN_ERROR]: '区块链连接错误',
  [ErrorCode.FILE_HASH_MISMATCH]: '文件哈希不匹配',
  [ErrorCode.FILE_TOO_LARGE]: '文件过大',
  [ErrorCode.SIGNATURE_INVALID]: '签名无效',
  [ErrorCode.SIGNATURE_EXPIRED]: '签名已过期',
  [ErrorCode.SIGNATURE_REVOKED]: '签名已撤销',
  [ErrorCode.DOCUMENT_NOT_SIGNABLE]: '文档不可签署',
  [ErrorCode.AGENT_NOT_FOUND]: 'Agent 不存在',
  [ErrorCode.AGENT_POOL_FULL]: 'Agent 连接池已满',
  [ErrorCode.AGENT_TASK_FAILED]: 'Agent 任务执行失败',
  [ErrorCode.AGENT_TIMEOUT]: 'Agent 执行超时',
  [ErrorCode.AGENT_STRATEGY_NOT_FOUND]: 'Agent 策略不存在',
  [ErrorCode.LLM_PROVIDER_ERROR]: 'LLM 提供商错误',
  [ErrorCode.LLM_QUOTA_EXCEEDED]: 'LLM 配额已用尽',
  [ErrorCode.LLM_CONTEXT_TOO_LONG]: 'LLM 上下文过长',
  [ErrorCode.LLM_MODEL_NOT_AVAILABLE]: 'LLM 模型不可用',
  [ErrorCode.ACQ_PLATFORM_ERROR]: '获客平台错误',
  [ErrorCode.ACQ_ADAPTER_NOT_FOUND]: '平台适配器不存在',
  [ErrorCode.ACQ_RATE_LIMITED]: '获客平台限流',
};
