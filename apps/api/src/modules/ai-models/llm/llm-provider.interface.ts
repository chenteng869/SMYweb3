/**
 * LLM Provider 统一接口抽象
 * 所有 LLM 提供商（OpenAI / Anthropic / DeepSeek / Qwen）必须实现此接口
 */
export interface ILlmProvider {
  /** 提供商标识 */
  readonly provider: LlmProviderName;

  /** 支持的模型列表 */
  readonly supportedModels: string[];

  /**
   * 非流式对话补全
   */
  chatCompletion(request: LlmChatRequest): Promise<LlmChatResponse>;

  /**
   * 流式对话补全（SSE 格式）
   * @param onChunk 每个 token 片段的回调
   * @param onComplete 完成时的回调
   * @param onError 错误时的回调
   */
  streamCompletion(request: LlmChatRequest, callbacks: StreamCallbacks): Promise<AbortController>;

  /**
   * 文本向量化（Embedding）
   */
  embed(request: LlmEmbedRequest): Promise<LlmEmbedResponse>;

  /**
   * Token 计数估算
   */
  countTokens(text: string, model?: string): number;

  /** 健康检查 */
  healthCheck(): Promise<{ status: 'ok' | 'error'; latencyMs: number }>;
}

// ===== 类型定义 =====

export type LlmProviderName = 'openai' | 'anthropic' | 'deepseek' | 'qwen';

/** 聊天消息角色 */
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

/** 聊天消息 */
export interface ChatMessage {
  role: ChatRole;
  content: string | ContentPart[];
  name?: string;
  toolCallId?: string;
}

/** 多模态内容块（支持图片等） */
export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

/** 工具/函数调用定义 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

/** 工具调用结果 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/** 非流式请求 */
export interface LlmChatRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number; // 0-2，默认 0.7
  maxTokens?: number; // 最大输出 token 数
  topP?: number; // 默认 1
  frequencyPenalty?: number; // -2~2
  presencePenalty?: number; // -2~2
  stop?: string[]; // 停止序列
  user?: string; // 最终用户标识
  metadata?: Record<string, string>;
}

/** 非流式响应 */
export interface LlmChatResponse {
  id: string;
  model: string;
  provider: LlmProviderName;
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  createdAt: Date;
}

/** 流式回调 */
export interface StreamCallbacks {
  onChunk: (chunk: StreamChunk) => void;
  onComplete: (response: LlmChatResponse) => void;
  onError: (error: Error) => void;
}

/** 流式数据块 */
export interface StreamChunk {
  id?: string;
  content: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
  usage?: { promptTokens: number; completionTokens: number };
  isComplete: boolean;
}

/** Embedding 请求 */
export interface LlmEmbedRequest {
  input: string | string[];
  model?: string;
}

/** Embedding 响应 */
export interface LlmEmbedResponse {
  embeddings: number[][]; // 向量数组
  model: string;
  provider: LlmProviderName;
  totalTokens: number;
  latencyMs: number;
}

/** Provider 配置 */
export interface LlmProviderConfig {
  apiKey: string;
  baseUrl?: string; // 自定义 API endpoint
  defaultModel: string;
  timeoutMs?: number; // 默认 60000
  maxRetries?: number; // 默认 3
}
