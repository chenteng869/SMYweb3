/**
 * @fileoverview 通义千问（Qwen）LLM 提供商实现
 *
 * 通义千问是阿里巴巴达摩院推出的大语言模型系列，通过阿里云 DashScope 平台提供服务。
 * 本模块基于 OpenAI SDK 实现，利用 DashScope 的 OpenAI 兼容模式（compatible-mode），
 * 通过自定义 baseUrl 将请求路由至 DashScope 官方端点。
 *
 * 支持特性：
 * - 非流式 / 流式对话补全（chatCompletion / streamCompletion）
 * - 文本向量化（embed）
 * - Token 计数估算（countTokens）
 * - 健康检查（healthCheck）
 * - 国内合规部署，数据不出境
 *
 * 推荐模型：
 * - qwen-max：旗舰模型，综合能力最强
 * - qwen-plus：均衡型模型，性能与成本平衡
 * - qwen-turbo：轻量高速模型，适合高频调用场景
 *
 * @module ai-models/llm/providers/qwen
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

/** DashScope OpenAI 兼容模式默认基础地址 */
const QWEN_DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

/** 通义千问支持的模型列表 */
const QWEN_SUPPORTED_MODELS = ['qwen-max', 'qwen-plus', 'qwen-turbo'] as const;

/** 中文平均每字符约对应 token 数（粗略估算系数） */
const TOKEN_ESTIMATE_RATIO = 1.8;

/**
 * 通义千问（Qwen）LLM 提供商
 *
 * 封装阿里云 DashScope API 调用逻辑，实现 {@link ILlmProvider} 接口。
 * DashScope 提供 OpenAI 兼容模式（compatible-mode/v1），因此直接复用 OpenAI SDK，
 * 仅需将 baseUrl 指向 DashScope 兼容端点即可。
 *
 * 定位：国内合规、多规格可选、企业级稳定的 LLM 服务方案
 *
 * @example
 * ```typescript
 * const provider = new QwenProvider({
 *   apiKey: 'sk-xxx',
 *   defaultModel: 'qwen-max',
 * });
 *
 * // 非流式调用
 * const response = await provider.chatCompletion({
 *   model: 'qwen-max',
 *   messages: [{ role: 'user', content: '你好' }],
 * });
 *
 * // 流式调用
 * const controller = provider.streamCompletion(
 *   { model: 'qwen-max', messages: [...] },
 *   {
 *     onChunk: (chunk) => console.log(chunk.content),
 *     onComplete: (res) => console.log('完成', res.content),
 *     onError: (err) => console.error(err),
 *   },
 * );
 * ```
 */
@Injectable()
export class QwenProvider implements ILlmProvider {
  /** 日志实例 */
  private readonly logger = new Logger(QwenProvider.name);

  /** OpenAI SDK 客户端实例（指向 DashScope 兼容端点） */
  private readonly client: OpenAI;

  /**
   * 创建通义千问提供商实例
   *
   * @param config - Provider 配置项
   * @param config.apiKey - DashScope API 密钥
   * @param config.baseUrl - 自定义 API 地址，默认为 DashScope 兼容模式地址
   * @param config.defaultModel - 默认使用的模型名称
   * @param config.timeoutMs - 请求超时时间（毫秒），默认 60000
   * @param config.maxRetries - 最大重试次数，默认 3
   */
  constructor(private readonly config: LlmProviderConfig) {
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl ?? QWEN_DEFAULT_BASE_URL,
      timeout: this.config.timeoutMs ?? 60000,
      maxRetries: this.config.maxRetries ?? 3,
    });

    this.logger.log(
      `Qwen Provider 初始化完成 | baseUrl=${this.config.baseUrl ?? QWEN_DEFAULT_BASE_URL} | defaultModel=${this.config.defaultModel}`
    );
  }

  /** 提供商标识 */
  readonly provider = 'qwen' as const;

  /** 支持的模型列表 */
  readonly supportedModels = [...QWEN_SUPPORTED_MODELS];

  /**
   * 非流式对话补全
   *
   * 将请求转发至 DashScope chat/completions 接口，返回完整响应内容。
   * 支持 system / user / assistant / tool 角色消息，以及工具调用（function calling）。
   * 通义千问系列模型对中文理解能力优异，适合中文场景下的复杂对话任务。
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
   * 适用于需要实时展示生成过程的场景（如打字机效果、实时对话界面）。
   * 通义千问的流式输出在中文场景下表现稳定，首 token 延迟较低。
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
        this.logger.warn('Qwen 流式请求被用户取消');
      } else {
        this.logger.error(`Qwen 流式请求异常: ${(error as Error).message}`, (error as Error).stack);
        callbacks.onError(error as Error);
      }
    }

    return abortController;
  }

  /**
   * 文本向量化（Embedding）
   *
   * 将输入文本转换为高维向量表示，用于语义搜索、文本相似度计算、RAG 检索增强等场景。
   * DashScope 提供 text-embedding-v1 / text-embedding-v2 / text-embedding-v3 等专用 embedding 模型，
   * 可通过 model 参数指定。若未指定，默认使用 text-embedding-v2。
   *
   * @param request - 向量化请求参数
   * @returns 向量数组及元信息
   */
  async embed(request: LlmEmbedRequest): Promise<LlmEmbedResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.embeddings.create({
        model: request.model ?? 'text-embedding-v2',
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
      this.logger.error(`Qwen Embedding 请求失败: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Token 计数估算
   *
   * 基于字符数进行粗略估算，非精确计数。
   * 中文场景下平均每个汉字约对应 1.5~2 个 token，此处取 1.8 作为默认系数。
   * 对于精确 token 计数需求，建议调用 DashScope 的 tokenizer 接口或使用专用计数库。
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
   * 通过调用 DashScope models.list() 接口验证 API 连通性与密钥有效性。
   * 返回状态码及接口响应延迟，用于监控告警和故障排查。
   * 国内网络环境下通常延迟较低且稳定。
   *
   * @returns 健康检查结果，包含状态（ok/error）和延迟（毫秒）
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; latencyMs: number }> {
    const startTime = Date.now();

    try {
      await this.client.models.list();
      const latencyMs = Date.now() - startTime;

      this.logger.debug(`Qwen 健康检查通过 | latency=${latencyMs}ms`);
      return { status: 'ok', latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.logger.error(`Qwen 健康检查失败: ${(error as Error).message}`);
      return { status: 'error', latencyMs };
    }
  }
}
