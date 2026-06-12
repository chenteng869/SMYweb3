import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderFactory } from './providers/index';
import type { ILlmProvider, LlmProviderName } from './llm-provider.interface';

/**
 * 场景路由映射配置
 * 定义各场景对应的推荐 Provider 和模型
 */
interface ScenarioRoute {
  provider: LlmProviderName;
  model: string;
  reason: string;
}

/**
 * LLM 智能路由服务
 *
 * 根据使用场景（代码生成、视觉理解、长文本、成本敏感、工具调用等）
 * 自动选择最优的 LLM Provider 和模型，兼顾质量、成本和延迟。
 */
@Injectable()
export class LlmRouterService {
  private readonly logger = new Logger(LlmRouterService.name);

  /** 场景 → 路由规则映射表 */
  private readonly scenarioRoutes: Record<string, ScenarioRoute> = {
    // 推理密集型场景：DeepSeek-R1 或 OpenAI o 系列
    code: {
      provider: 'deepseek',
      model: 'deepseek-reasoner',
      reason: '深度推理模型，擅长复杂代码生成与逻辑分析',
    },
    reasoning: {
      provider: 'deepseek',
      model: 'deepseek-reasoner',
      reason: '强化推理能力，适合数学/逻辑链式思考任务',
    },

    // 视觉/多模态场景：GPT-4o
    vision: {
      provider: 'openai',
      model: 'gpt-4o',
      reason: '业界领先的视觉理解能力，支持多模态输入',
    },
    image: {
      provider: 'openai',
      model: 'gpt-4o',
      reason: '图像分析与多模态理解首选模型',
    },

    // 长上下文场景：DeepSeek（64K+ 支持）
    long_context: {
      provider: 'deepseek',
      model: 'deepseek-chat',
      reason: '支持超长上下文窗口，适合长文档处理',
    },

    // 成本敏感 / 批量场景：Qwen-turbo 或 DeepSeek-chat
    cheap: {
      provider: 'qwen',
      model: 'qwen-turbo',
      reason: '极低单价，适合大批量非关键任务',
    },
    batch: {
      provider: 'qwen',
      model: 'qwen-turbo',
      reason: '高吞吐低成本，批量处理最优选择',
    },

    // 工具调用 / Agent 场景：Claude Sonnet
    tool_use: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      reason: '工具调用准确率最高，Agent 编排首选',
    },
    agent: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      reason: '结构化工具调用与多轮对话表现优异',
    },
  };

  constructor(private readonly providerFactory: LlmProviderFactory) {}

  /**
   * 根据使用场景智能路由到最优 Provider
   * @param scenario 使用场景标识（code/reasoning/vision/image/long_context/cheap/batch/tool_use/agent/default）
   * @returns 匹配该场景的 ILlmProvider 实例
   */
  route(scenario: string): ILlmProvider {
    const normalizedScenario = scenario.toLowerCase().trim();
    const route = this.scenarioRoutes[normalizedScenario];

    if (route) {
      this.logger.debug(
        `路由匹配: "${scenario}" → ${route.provider}/${route.model} (${route.reason})`
      );
      return this.providerFactory.getProvider(route.provider);
    }

    // 未匹配到具体场景时返回默认 Provider
    this.logger.debug(`路由未命中具体规则，使用默认 Provider: "${scenario}"`);
    return this.providerFactory.getDefaultProvider();
  }

  /**
   * 获取指定场景推荐的模型名称
   * @param scenario 使用场景标识
   * @returns 推荐的模型名称字符串
   */
  getRecommendedModel(scenario: string): string {
    const normalizedScenario = scenario.toLowerCase().trim();
    const route = this.scenarioRoutes[normalizedScenario];

    if (route) {
      return route.model;
    }

    // 返回默认 Provider 的默认模型
    const defaultProvider = this.providerFactory.getDefaultProvider();
    const config = this.providerFactory.getConfig(defaultProvider.provider);
    return config?.defaultModel || 'gpt-4o';
  }
}
