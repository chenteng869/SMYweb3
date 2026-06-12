/**
 * @fileoverview Anthropic (Claude) LLM 提供商实现
 *
 * 基于 @anthropic-ai/sdk 封装，提供对话补全、流式输出、Token 估算及健康检查能力。
 * 原生支持 Anthropic tool_use 工具调用协议。注意：Anthropic 不直接支持 Embedding，
 * 如需向量化功能请使用 OpenAI Provider。
 */
import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
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

/** Anthropic 支持的模型列表 */
const SUPPORTED_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-haiku-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
] as const;

@Injectable()
export class AnthropicProvider implements ILlmProvider {
  /** 提供商标识 */
  readonly provider = 'anthropic' as const;

  /** 支持的模型列表 */
  readonly supportedModels: string[] = [...SUPPORTED_MODELS];

  private readonly logger = new Logger(AnthropicProvider.name);

  constructor(private readonly config: LlmProviderConfig) {}

  /**
   * 非流式对话补全
   * 调用 Anthropic messages.create() 接口，原生支持 tool_use 工具调用
   *
   * @param request - 对话请求参数（模型、消息、工具等）
   * @returns 标准化的对话响应
   */
  async chatCompletion(request: LlmChatRequest): Promise<LlmChatResponse> {
    const startTime = Date.now();

    const client = this.createClient();
    const response = await this.withErrorMapping(() =>
      client.messages.create({
        model: request.model,
        max_tokens: request.maxTokens ?? 4096,
        system: this.extractSystemMessage(request.messages),
        messages: this.mapMessages(request.messages),
        tools: this.mapTools(request.tools),
        temperature: request.temperature,
        top_p: request.topP,
        stop_sequences: request.stop,
        metadata: { user_id: request.user },
      })
    );

    const latencyMs = Date.now() - startTime;
    const textBlock = response.content.find((b) => b.type === 'text');
    const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');

    return {
      id: response.id,
      model: response.model,
      provider: 'anthropic',
      content: textBlock && textBlock.type === 'text' ? textBlock.text : '',
      toolCalls: toolUseBlocks.map((block) => ({
        id: block.id,
        type: 'function' as const,
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input),
        },
      })),
      finishReason: this.mapFinishReason(response.stop_reason),
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      latencyMs,
      createdAt: new Date(),
    };
  }

  /**
   * 流式对话补全
   * 使用 Anthropic message.stream() 实现逐 token 流式输出
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
    const toolUseAccumulators: Map<
      number,
      { id: string; name: string; input: Record<string, unknown> }
    > = new Map();
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const client = this.createClient();
      const stream = client.messages.stream(
        {
          model: request.model,
          max_tokens: request.maxTokens ?? 4096,
          system: this.extractSystemMessage(request.messages),
          messages: this.mapMessages(request.messages),
          tools: this.mapTools(request.tools),
          temperature: request.temperature,
          top_p: request.topP,
          stop_sequences: request.stop,
        },
        { signal: abortController.signal }
      );

      (stream as any).on('message', (message: any) => {
        responseId = message.id;
        responseModel = message.model;
        inputTokens = message.usage?.input_tokens ?? 0;
        outputTokens = message.usage?.output_tokens ?? 0;
      });

      (stream as any).on('contentBlockStart', (event: any) => {
        if (event.content_block?.type === 'tool_use' && event.index !== undefined) {
          const block = event.content_block;
          toolUseAccumulators.set(event.index, {
            id: block.id,
            name: block.name,
            input: {},
          });
        }
      });

      (stream as any).on('contentBlockDelta', (event: any) => {
        const delta = event.delta;

        // 文本增量
        if (delta.type === 'text_delta' && delta.text) {
          fullContent += delta.text;
          callbacks.onChunk({
            id: responseId,
            content: delta.text,
            isComplete: false,
          });
        }

        // 工具调用输入增量（JSON 片段）
        if (delta.type === 'input_json_delta' && event.index !== undefined) {
          const acc = toolUseAccumulators.get(event.index);
          if (acc) {
            try {
              const parsed = JSON.parse(delta.partial_json);
              acc.input = { ...acc.input, ...parsed };
            } catch {
              // JSON 未完整时忽略解析错误，继续累积
            }
          }

          callbacks.onChunk({
            id: responseId,
            content: '',
            toolCalls: Array.from(toolUseAccumulators.values()).map((v) => ({
              id: v.id,
              type: 'function' as const,
              function: { name: v.name, arguments: JSON.stringify(v.input) },
            })),
            isComplete: false,
          });
        }
      });

      (stream as any).on('messageStop', (event: any) => {
        finishReason = event.stop_reason;
      });

      const message = await (stream as any).finalMessage();
      responseId = message.id;
      responseModel = message.model;
      inputTokens = message.usage.input_tokens;
      outputTokens = message.usage.output_tokens;

      // 流式结束回调
      callbacks.onComplete({
        id: responseId,
        model: responseModel,
        provider: 'anthropic',
        content: fullContent,
        toolCalls: Array.from(toolUseAccumulators.values()).map((v) => ({
          id: v.id,
          type: 'function' as const,
          function: { name: v.name, arguments: JSON.stringify(v.input) },
        })),
        finishReason: this.mapFinishReason(finishReason),
        usage: {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
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
        this.logger.warn('Anthropic 流式请求已被取消');
      } else {
        this.logger.error(`Anthropic 流式请求失败: ${(error as Error).message}`);
        callbacks.onError(error as Error);
      }
    }

    return abortController;
  }

  /**
   * 文本向量化（Embedding）
   * Anthropic 不直接支持 Embedding 功能，此方法始终抛出异常
   *
   * @throws Error 提示用户使用 OpenAI Provider 进行向量化
   */
  async embed(_request: LlmEmbedRequest): Promise<LlmEmbedResponse> {
    throw new Error(
      'Anthropic does not support embedding directly. 请使用 OpenAI Provider 进行文本向量化操作。'
    );
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
   * 通过调用一个最小化消息请求验证 API Key 有效性与网络连通性
   *
   * @returns 健康状态与延迟毫秒数
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; latencyMs: number }> {
    const startTime = Date.now();
    const timeout = this.config.timeoutMs ?? 10000;

    try {
      const client = this.createClient();

      await Promise.race([
        client.messages.create({
          model: this.supportedModels[0],
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('健康检查超时')), timeout)
        ),
      ]);

      return { status: 'ok', latencyMs: Date.now() - startTime };
    } catch (error) {
      this.logger.warn(`Anthropic 健康检查失败: ${(error as Error).message}`);
      return { status: 'error', latencyMs: Date.now() - startTime };
    }
  }

  // ===== 私有辅助方法 =====

  /**
   * 创建 Anthropic SDK 客户端实例
   * 根据 config 配置 API Key、Base URL 及超时参数
   */
  private createClient(): Anthropic {
    return new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      timeout: this.config.timeoutMs ?? 60000,
    });
  }

  /**
   * 从消息列表中提取系统提示词（Anthropic 使用独立 system 参数）
   */
  private extractSystemMessage(messages: LlmChatRequest['messages']): string {
    const systemMsgs = messages.filter((m) => m.role === 'system');
    return systemMsgs.map((m) => (typeof m.content === 'string' ? m.content : '')).join('\n');
  }

  /**
   * 将统一消息格式映射为 Anthropic SDK 所需格式
   * 过滤掉系统消息（已通过 system 参数传递）
   */
  private mapMessages(messages: LlmChatRequest['messages']): Anthropic.MessageParam[] {
    return messages
      .filter((m) => m.role !== 'system')
      .map((msg) => {
        const base: { role: 'user' | 'assistant' } = {
          role: msg.role as 'user' | 'assistant',
        };

        if (typeof msg.content === 'string') {
          return { ...base, content: msg.content };
        }

        // 多模态内容块
        const content: Anthropic.ContentBlockParam[] = msg.content.map((part) => {
          if (part.type === 'text') {
            return { type: 'text' as const, text: part.text ?? '' };
          }
          return {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: 'image/jpeg',
              data: part.image_url?.url ?? '',
            },
          };
        });

        return { ...base, content };
      });
  }

  /**
   * 将统一工具定义映射为 Anthropic tool_use 格式
   */
  private mapTools(tools?: LlmChatRequest['tools']): Anthropic.Tool[] {
    if (!tools) return undefined as unknown as Anthropic.Tool[];

    return tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description ?? '',
      input_schema: (tool.function.parameters as Anthropic.Tool.InputSchema) ?? {
        type: 'object',
        properties: {},
      },
    }));
  }

  /**
   * 将 Anthropic 的 stop_reason 映射为统一枚举值
   */
  private mapFinishReason(reason: string | null | undefined): LlmChatResponse['finishReason'] {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_calls';
      default:
        return 'stop';
    }
  }

  /**
   * 错误映射与转换包装器
   * 将 Anthropic SDK 原始错误转换为更友好的错误格式并记录日志
   *
   * @param fn - 待执行的异步函数
   * @returns 函数执行结果
   */
  private async withErrorMapping<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const err = error as Error & { status?: number };

      // 速率限制
      if (err.status === 429) {
        this.logger.error(`Anthropic API 速率限制: ${err.message}`);
        throw new Error(`Anthropic API 请求过于频繁，请稍后重试: ${err.message}`);
      }

      // 认证错误
      if (err.status === 401 || err.status === 403) {
        this.logger.error(`Anthropic API 认证失败: ${err.message}`);
        throw new Error(`Anthropic API Key 无效或权限不足: ${err.message}`);
      }

      // 模型不存在
      if (err.status === 404) {
        this.logger.error(`Anthropic 模型不存在: ${err.message}`);
        throw new Error(`Anthropic 请求的模型不存在: ${err.message}`);
      }

      // 服务端错误
      if (err.status && err.status >= 500) {
        this.logger.error(`Anthropic 服务端错误 (${err.status}): ${err.message}`);
        throw new Error(`Anthropic 服务暂时不可用 (${err.status}): ${err.message}`);
      }

      // 其他未知错误
      this.logger.error(`Anthropic 请求失败: ${err.message}`);
      throw new Error(`Anthropic API 调用失败: ${err.message}`);
    }
  }
}
