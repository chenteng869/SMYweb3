/**
 * @fileoverview OpenAI LLM 提供商实现
 *
 * 基于 OpenAI SDK 封装，提供对话补全、流式输出、向量化、Token 估算及健康检查能力。
 * 支持 GPT-4o、o1、o3-mini 等主流模型，内置重试机制与超时控制。
 */
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type {
  ILlmProvider,
  LlmProviderConfig,
  LlmChatRequest,
  LlmChatResponse,
  StreamCallbacks,
  StreamChunk,
  LlmEmbedRequest,
  LlmEmbedResponse,
} from '../llm-provider.interface';

/** OpenAI 支持的模型列表 */
const SUPPORTED_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'o1',
  'o1-preview',
  'o1-mini',
  'o3-mini',
] as const;

/** 默认 Embedding 模型 */
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

@Injectable()
export class OpenAiProvider implements ILlmProvider {
  /** 提供商标识 */
  readonly provider = 'openai' as const;

  /** 支持的模型列表 */
  readonly supportedModels: string[] = [...SUPPORTED_MODELS];

  private readonly logger = new Logger(OpenAiProvider.name);

  constructor(private readonly config: LlmProviderConfig) {}

  /**
   * 非流式对话补全
   * 调用 OpenAI chat.completions.create() 接口，将响应映射为统一的 LlmChatResponse 格式
   *
   * @param request - 对话请求参数（模型、消息、工具等）
   * @returns 标准化的对话响应
   */
  async chatCompletion(request: LlmChatRequest): Promise<LlmChatResponse> {
    const startTime = Date.now();

    const client = this.createClient();
    const response = await this.withRetry(() =>
      client.chat.completions.create({
        model: request.model,
        messages: this.mapMessages(request.messages),
        tools: request.tools?.map((t) => ({
          type: 'function' as const,
          function: t.function,
        })),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        top_p: request.topP,
        frequency_penalty: request.frequencyPenalty,
        presence_penalty: request.presencePenalty,
        stop: request.stop,
        user: request.user,
      })
    );

    const choice = response.choices[0];
    const latencyMs = Date.now() - startTime;

    return {
      id: response.id,
      model: response.model,
      provider: 'openai',
      content: choice.message.content ?? '',
      toolCalls: choice.message.tool_calls?.map((tc: any) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function?.name ?? tc.function_call?.name,
          arguments: tc.function?.arguments ?? tc.function_call?.arguments,
        },
      })),
      finishReason: this.mapFinishReason(choice.finish_reason),
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      latencyMs,
      createdAt: new Date(),
    };
  }

  /**
   * 流式对话补全（Server-Sent Events）
   * 使用 stream: true 模式逐 token 返回，通过 onChunk 回调推送每个数据块
   *
   * @param request - 对话请求参数
   * @param callbacks - 流式回调集合（onChunk / onComplete / onError）
   * @returns AbortController 用于外部取消请求
   */
  async streamCompletion(
    request: LlmChatRequest,
    callbacks: StreamCallbacks
  ): Promise<AbortController> {
    const startTime = Date.now();
    const abortController = new AbortController();
    let fullContent = '';
    let responseId = '';
    let responseModel = request.model;
    let finishReason: string | undefined;
    const accumulatedToolCalls: Map<number, { id: string; name: string; argumentsStr: string }> =
      new Map();

    try {
      const client = this.createClient();
      const stream = await this.withRetry(() =>
        client.chat.completions.create(
          {
            model: request.model,
            messages: this.mapMessages(request.messages),
            tools: request.tools?.map((t) => ({
              type: 'function' as const,
              function: t.function,
            })),
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
            top_p: request.topP,
            stop: request.stop,
            user: request.user,
            stream: true,
          },
          { signal: abortController.signal }
        )
      );

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (!delta) continue;

        if (chunk.id) responseId = chunk.id;
        if (chunk.model) responseModel = chunk.model;

        // 累积文本内容
        if (delta.content) {
          fullContent += delta.content;
          callbacks.onChunk({
            id: responseId,
            content: delta.content,
            isComplete: false,
          });
        }

        // 累积工具调用（增量拼接）
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!accumulatedToolCalls.has(idx)) {
              accumulatedToolCalls.set(idx, {
                id: tc.id ?? '',
                name: tc.function?.name ?? '',
                argumentsStr: '',
              });
            }
            const acc = accumulatedToolCalls.get(idx)!;
            if (tc.function?.arguments) {
              acc.argumentsStr += tc.function.arguments;
            }
          }

          callbacks.onChunk({
            id: responseId,
            content: '',
            toolCalls: Array.from(accumulatedToolCalls.entries()).map(([, v]) => ({
              id: v.id,
              type: 'function' as const,
              function: { name: v.name, arguments: v.argumentsStr },
            })),
            isComplete: false,
          });
        }

        // 检查完成标志
        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }
      }

      // 流式结束回调
      callbacks.onComplete({
        id: responseId,
        model: responseModel,
        provider: 'openai',
        content: fullContent,
        toolCalls: Array.from(accumulatedToolCalls.values()).map((v) => ({
          id: v.id,
          type: 'function' as const,
          function: { name: v.name, arguments: v.argumentsStr },
        })),
        finishReason: this.mapFinishReason(finishReason),
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        latencyMs: Date.now() - startTime,
        createdAt: new Date(),
      });

      callbacks.onChunk({
        id: responseId,
        content: '',
        isComplete: true,
        finishReason,
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.logger.warn('OpenAI 流式请求已被取消');
      } else {
        this.logger.error(`OpenAI 流式请求失败: ${(error as Error).message}`);
        callbacks.onError(error as Error);
      }
    }

    return abortController;
  }

  /**
   * 文本向量化（Embedding）
   * 调用 OpenAI embeddings.create() 接口生成向量表示
   *
   * @param request - 向量化请求（输入文本、可选模型）
   * @returns 向量数组及元信息
   */
  async embed(request: LlmEmbedRequest): Promise<LlmEmbedResponse> {
    const startTime = Date.now();
    const client = this.createClient();

    const response = await this.withRetry(() =>
      client.embeddings.create({
        model: request.model ?? DEFAULT_EMBEDDING_MODEL,
        input: request.input,
      })
    );

    return {
      embeddings: response.data.map((d) => d.embedding),
      model: response.model,
      provider: 'openai',
      totalTokens: response.usage.total_tokens,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Token 计数估算
   * 基于字符数的粗略估算：英文约 4 字符/token，中文约 1.5 字符/token
   *
   * @param text - 待估算的文本
   * @param _model - 模型名称（当前未使用，预留扩展）
   * @returns 估算的 token 数量
   */
  countTokens(text: string, _model?: string): number {
    if (!text) return 0;

    // 统计中文字符数量
    const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    const otherChars = text.length - chineseChars;

    // 中文约 1.5 字符/token，其他语言约 4 字符/token
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  /**
   * 健康检查
   * 通过调用 models.list() 验证 API Key 有效性与网络连通性，带超时控制
   *
   * @returns 健康状态与延迟毫秒数
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; latencyMs: number }> {
    const startTime = Date.now();
    const timeout = this.config.timeoutMs ?? 10000;

    try {
      const client = this.createClient();

      const result = await Promise.race([
        client.models.list({ limit: 1 } as any),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('健康检查超时')), timeout)
        ),
      ]);

      // 触发迭代确认连接正常
      for await (const _ of result) {
        break; // 只取一条即返回
      }

      return { status: 'ok', latencyMs: Date.now() - startTime };
    } catch (error) {
      this.logger.warn(`OpenAI 健康检查失败: ${(error as Error).message}`);
      return { status: 'error', latencyMs: Date.now() - startTime };
    }
  }

  // ===== 私有辅助方法 =====

  /**
   * 创建 OpenAI SDK 客户端实例
   * 根据 config 配置 API Key、Base URL 及超时参数
   */
  private createClient(): OpenAI {
    return new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      timeout: this.config.timeoutMs ?? 60000,
      maxRetries: 0, // 重试由上层 withRetry 统一管理
    });
  }

  /**
   * 将统一消息格式映射为 OpenAI SDK 所需格式
   */
  private mapMessages(messages: LlmChatRequest['messages']): OpenAI.ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      const base = { role: msg.role as OpenAI.ChatCompletionMessageParam['role'] };

      if (typeof msg.content === 'string') {
        return { ...base, content: msg.content } as OpenAI.ChatCompletionMessageParam;
      }

      // 多模态内容块
      return {
        ...base,
        content: msg.content.map((part) => {
          if (part.type === 'text') return { type: 'text' as const, text: part.text ?? '' };
          return {
            type: 'image_url' as const,
            image_url: { url: part.image_url?.url ?? '' },
          };
        }),
      } as OpenAI.ChatCompletionMessageParam;
    });
  }

  /**
   * 将 OpenAI 的 finish_reason 映射为统一枚举值
   */
  private mapFinishReason(reason: string | null | undefined): LlmChatResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
        return 'tool_calls';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }

  /**
   * 带重试逻辑的异步执行包装器
   * 在可重试错误（网络错误、速率限制）上自动重试指定次数
   *
   * @param fn - 待执行的异步函数
   * @returns 函数执行结果
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    const maxRetries = this.config.maxRetries ?? 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || attempt >= maxRetries) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt), 8000); // 指数退避，最大 8s
        this.logger.warn(
          `OpenAI 请求失败（第 ${attempt + 1}/${maxRetries} 次重试），${delay}ms 后重试: ${lastError.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * 判断错误是否可重试
   * 网络错误、429 速率限制、500/502/503 服务端错误视为可重试
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // 网络层错误（ECONNRESET、ETIMEDOUT 等）
      if (
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('network') ||
        error.message.includes('fetch failed')
      ) {
        return true;
      }

      // OpenAI SDK 错误（含 status 属性）
      const err = error as { status?: number };
      if (err.status === 429 || err.status === 500 || err.status === 502 || err.status === 503) {
        return true;
      }
    }
    return false;
  }
}
