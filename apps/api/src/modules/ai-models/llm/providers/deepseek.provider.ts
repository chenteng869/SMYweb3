/**
 * @fileoverview DeepSeek LLM 提供商实现
 *
 * DeepSeek（深度求索）是国内领先的大模型服务商，提供高性价比的对话与推理能力。
 * 本模块基于 OpenAI SDK 实现，利用 DeepSeek API 的 OpenAI 兼容特性，
 * 通过自定义 baseUrl 将请求路由至 DeepSeek 官方接口。
 *
 * 支持特性：
 * - 非流式 / 流式对话补全（chatCompletion / streamCompletion）
 * - 文本向量化（embed）
 * - Token 计数估算（countTokens）
 * - 健康检查（healthCheck）
 * - 长上下文支持（最高 64K+ tokens）
 *
 * 推荐模型：
 * - deepseek-chat：通用对话模型，性价比极高
 * - deepseek-reasoner (R1)：深度推理模型，擅长数学/代码/逻辑任务
 *
 * @module ai-models/llm/providers/deepseek
 */

import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type {
  ILlmProvider,
  LlmProviderConfig,
  LlmChatRequest,
  LlmChatResponse,
  LlmEmbedRequest,
  LlmEmbedResponse,
  StreamCallbacks,
  StreamChunk,
} from '../llm-provider.interface';

/** DeepSeek API 默认基础地址 */
const DEEPSEEK_DEFAULT_BASE_URL = 'https://api.deepseek.com/v1';

/** DeepSeek 支持的模型列表 */
const DEEPSEEK_SUPPORTED_MODELS = ['deepseek-chat', 'deepseek-reasoner'] as const;

/** 中文平均每字符约对应 token 数（粗略估算系数） */
const TOKEN_ESTIMATE_RATIO = 1.8;

/**
 * DeepSeek LLM 提供商
 *
 * 封装 DeepSeek API 调用逻辑，实现 {@link ILlmProvider} 接口。
 * DeepSeek API 兼容 OpenAI 接口规范，因此直接复用 OpenAI SDK，
 * 仅需将 baseUrl 指向 DeepSeek 官方端点即可。
 *
 * 定位：高性价比、长上下文、国内合规的 LLM 服务方案
 *
 * @example
 * ```typescript
 * const provider = new DeepSeekProvider({
 *   apiKey: 'sk-xxx',
 *   defaultModel: 'deepseek-chat',
 * });
 *
 * // 非流式调用
 * const response = await provider.chatCompletion({
 *   model: 'deepseek-chat',
 *   messages: [{ role: 'user', content: '你好' }],
 * });
 *
 * // 流式调用
 * const controller = provider.streamCompletion(
 *   { model: 'deepseek-chat', messages: [...] },
 *   {
 *     onChunk: (chunk) => console.log(chunk.content),
 *     onComplete: (res) => console.log('完成', res.content),
 *     onError: (err) => console.error(err),
 *   },
 * );
 * ```
 */
@Injectable()
export class DeepSeekProvider implements ILlmProvider {
  /** 日志实例 */
  private readonly logger = new Logger(DeepSeekProvider.name);

  /** OpenAI SDK 客户端实例（指向 DeepSeek 端点） */
  private readonly client: OpenAI;

  /**
   * 创建 DeepSeek 提供商实例
   *
   * @param config - Provider 配置项
   * @param config.apiKey - DeepSeek API 密钥
   * @param config.baseUrl - 自定义 API 地址，默认为 DeepSeek 官方地址
   * @param config.defaultModel - 默认使用的模型名称
   * @param config.timeoutMs - 请求超时时间（毫秒），默认 60000
   * @param config.maxRetries - 最大重试次数，默认 3
   */
  constructor(private readonly config: LlmProviderConfig) {
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl ?? DEEPSEEK_DEFAULT_BASE_URL,
      timeout: this.config.timeoutMs ?? 60000,
      maxRetries: this.config.maxRetries ?? 3,
    });

    this.logger.log(
      `DeepSeek Provider 初始化完成 | baseUrl=${this.config.baseUrl ?? DEEPSEEK_DEFAULT_BASE_URL} | defaultModel=${this.config.defaultModel}`
    );
  }

  /** 提供商标识 */
  readonly provider = 'deepseek' as const;

  /** 支持的模型列表 */
  readonly supportedModels = [...DEEPSEEK_SUPPORTED_MODELS];

  /**
   * 非流式对话补全
   *
   * 将请求转发至 DeepSeek chat/completions 接口，返回完整响应内容。
   * 支持 system / user / assistant / tool 角色消息，以及工具调用（function calling）。
   *
   * @param request - 对话请求参数
   * @returns 完整的对话响应，包含内容、Token 用量、延迟等元信息
   */
  async chatCompletion(request: LlmChatRequest): Promise<LlmChatResponse> {
    const startTime = Date.now();

    const response = await this.client.chat.completions.create(
      {
        model: request.model,
        messages: request.messages as OpenAI.ChatCompletionMessageParam[],
        tools: request.tools?.map((tool) => ({
          type: 'function',
          function: tool.function,
        })),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        top_p: request.topP,
        frequency_penalty: request.frequencyPenalty,
        presence_penalty: request.presencePenalty,
        stop: request.stop,
        user: request.user,
      },
      { stream: false }
    );

    const choice = response.choices[0];
    const latencyMs = Date.now() - startTime;

    return {
      id: response.id,
      model: response.model,
      provider: this.provider,
      content: choice.message?.content ?? '',
      toolCalls: choice.message?.tool_calls?.map((tc) => ({
        id: tc.id,
        type: tc.type as 'function',
        function: {
          name: (tc as any).function?.name ?? (tc as any).function_call?.name,
          arguments: (tc as any).function?.arguments ?? (tc as any).function_call?.arguments,
        },
      })),
      finishReason: (choice.finish_reason as LlmChatResponse['finishReason']) ?? 'stop',
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      latencyMs,
      createdAt: new Date(),
    };
  }

  /**
   * 流式对话补全（SSE 格式）
   *
   * 以 Server-Sent Events 方式逐 token 返回响应内容，
   * 适用于需要实时展示生成过程的场景（如打字机效果）。
   *
   * @param request - 对话请求参数
   * @param callbacks - 流式回调函数集合
   * @returns AbortController 用于取消正在进行的流式请求
   */
  async streamCompletion(
    request: LlmChatRequest,
    callbacks: StreamCallbacks
  ): Promise<AbortController> {
    const startTime = Date.now();
    const abortController = new AbortController();
    let fullContent = '';
    const accumulatedToolCalls: LlmChatResponse['toolCalls'] = [];
    let responseId = '';
    let responseModel = request.model;
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      const stream = await this.client.chat.completions.create(
        {
          model: request.model,
          messages: request.messages as OpenAI.ChatCompletionMessageParam[],
          tools: request.tools?.map((tool) => ({
            type: 'function',
            function: tool.function,
          })),
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          top_p: request.topP,
          stop: request.stop,
          user: request.user,
          stream: true,
          stream_options: { include_usage: true },
        },
        { signal: abortController.signal }
      );

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (chunk.id) responseId = chunk.id;
        if (chunk.model) responseModel = chunk.model;

        // 累积文本内容
        if (delta?.content) {
          fullContent += delta.content;

          const streamChunk: StreamChunk = {
            id: chunk.id,
            content: delta.content,
            finishReason: chunk.choices[0]?.finish_reason ?? undefined,
            isComplete: false,
          };
          callbacks.onChunk(streamChunk);
        }

        // 累积工具调用
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!accumulatedToolCalls[idx]) {
              accumulatedToolCalls[idx] = {
                id: tc.id,
                type: 'function',
                function: { name: '', arguments: '' },
              };
            }
            if (tc.id) accumulatedToolCalls[idx].id = tc.id;
            if (tc.function?.name) accumulatedToolCalls[idx].function.name += tc.function.name;
            if (tc.function?.arguments)
              accumulatedToolCalls[idx].function.arguments += tc.function.arguments;
          }

          callbacks.onChunk({
            id: chunk.id,
            content: '',
            toolCalls: accumulatedToolCalls.filter(Boolean),
            isComplete: false,
          });
        }

        // 收集 usage 信息（通常在最后一个 chunk 中返回）
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens ?? 0;
          completionTokens = chunk.usage.completion_tokens ?? 0;
        }

        // 检查是否完成
        const finishReason = chunk.choices[0]?.finish_reason;
        if (finishReason && finishReason !== null) {
          const latencyMs = Date.now() - startTime;

          callbacks.onComplete({
            id: responseId,
            model: responseModel,
            provider: this.provider,
            content: fullContent,
            toolCalls: accumulatedToolCalls.filter(Boolean),
            finishReason: (finishReason as LlmChatResponse['finishReason']) ?? 'stop',
            usage: {
              promptTokens,
              completionTokens,
              totalTokens: promptTokens + completionTokens,
            },
            latencyMs,
            createdAt: new Date(),
          });

          break;
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.logger.warn('DeepSeek 流式请求被用户取消');
      } else {
        this.logger.error(
          `DeepSeek 流式请求异常: ${(error as Error).message}`,
          (error as Error).stack
        );
        callbacks.onError(error as Error);
      }
    }

    return abortController;
  }

  /**
   * 文本向量化（Embedding）
   *
   * 将输入文本转换为高维向量表示，用于语义搜索、文本相似度计算等场景。
   * DeepSeek 当前不提供官方 Embedding 接口，此处预留实现结构，
   * 实际使用时建议接入第三方 Embedding 服务或使用兼容接口。
   *
   * @param request - 向量化请求参数
   * @returns 向量数组及元信息
   */
  async embed(request: LlmEmbedRequest): Promise<LlmEmbedResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.embeddings.create({
        model: request.model ?? 'deepseek-chat',
        input: request.input,
      });

      const latencyMs = Date.now() - startTime;

      return {
        embeddings: response.data.map((item) => item.embedding),
        model: response.model,
        provider: this.provider,
        totalTokens: response.usage?.total_tokens ?? 0,
        latencyMs,
      };
    } catch (error) {
      this.logger.error(`DeepSeek Embedding 请求失败: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Token 计数估算
   *
   * 基于字符数进行粗略估算，非精确计数。
   * 中文场景下平均每个汉字约对应 1.5~2 个 token，此处取 1.8 作为默认系数。
   * 对于精确 token 计数需求，建议调用各模型方的 tokenizer 接口。
   *
   * @param text - 待估算的文本内容
   * @param _model - 模型名称（当前未使用，保留扩展能力）
   * @returns 估算的 token 数量
   */
  countTokens(text: string, _model?: string): number {
    return Math.ceil(text.length * TOKEN_ESTIMATE_RATIO);
  }

  /**
   * 健康检查
   *
   * 通过调用 DeepSeek models.list() 接口验证 API 连通性与密钥有效性。
   * 返回状态码及接口响应延迟，用于监控告警和故障排查。
   *
   * @returns 健康检查结果，包含状态（ok/error）和延迟（毫秒）
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; latencyMs: number }> {
    const startTime = Date.now();

    try {
      await this.client.models.list();
      const latencyMs = Date.now() - startTime;

      this.logger.debug(`DeepSeek 健康检查通过 | latency=${latencyMs}ms`);
      return { status: 'ok', latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.logger.error(`DeepSeek 健康检查失败: ${(error as Error).message}`);
      return { status: 'error', latencyMs };
    }
  }
}
