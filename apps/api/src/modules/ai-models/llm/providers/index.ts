import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILlmProvider, LlmProviderName, LlmProviderConfig } from '../llm-provider.interface';
import { OpenAiProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { DeepSeekProvider } from './deepseek.provider';
import { QwenProvider } from './qwen.provider';

/**
 * Provider 工厂 — 按名称动态创建/获取 LLM Provider 实例
 * 支持从环境变量自动加载配置，懒加载初始化
 */
@Injectable()
export class LlmProviderFactory {
  private readonly logger = new Logger(LlmProviderFactory.name);
  private providers: Map<LlmProviderName, ILlmProvider> = new Map();
  private configs: Map<LlmProviderName, LlmProviderConfig> = new Map();

  /** 默认 Provider（可配置） */
  private defaultProvider: LlmProviderName = 'openai';

  constructor(private configService: ConfigService) {
    this.loadConfigs();
  }

  /** 获取指定名称的 Provider */
  getProvider(name?: LlmProviderName): ILlmProvider {
    const providerName = name || this.defaultProvider;
    let provider = this.providers.get(providerName);

    if (!provider) {
      provider = this.createProvider(providerName);
      this.providers.set(providerName, provider);
    }

    return provider;
  }

  /** 获取默认 Provider */
  getDefaultProvider(): ILlmProvider {
    return this.getProvider(this.defaultProvider);
  }

  /** 设置默认 Provider */
  setDefaultProvider(name: LlmProviderName): void {
    if (!this.configs.has(name)) {
      throw new Error(`Provider "${name}" 未配置`);
    }
    this.defaultProvider = name;
  }

  /** 获取所有已注册的 Provider 名称列表 */
  getAvailableProviders(): LlmProviderName[] {
    return Array.from(this.configs.keys());
  }

  /** 获取指定 Provider 的配置 */
  getConfig(name: LlmProviderName): LlmProviderConfig | undefined {
    return this.configs.get(name);
  }

  /** 从环境变量加载各 Provider 配置 */
  private loadConfigs(): void {
    // OpenAI
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (openaiKey) {
      this.configs.set('openai', {
        apiKey: openaiKey,
        baseUrl: this.configService.get<string>('OPENAI_BASE_URL'),
        defaultModel: this.configService.get<string>('OPENAI_DEFAULT_MODEL', 'gpt-4o'),
        timeoutMs: 60000,
      });
    }

    // Anthropic
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (anthropicKey) {
      this.configs.set('anthropic', {
        apiKey: anthropicKey,
        baseUrl: this.configService.get<string>('ANTHROPIC_BASE_URL'),
        defaultModel: this.configService.get<string>(
          'ANTHROPIC_DEFAULT_MODEL',
          'claude-sonnet-4-20250514'
        ),
        timeoutMs: 60000,
      });
    }

    // DeepSeek
    const deepseekKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    if (deepseekKey) {
      this.configs.set('deepseek', {
        apiKey: deepseekKey,
        baseUrl: this.configService.get<string>('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
        defaultModel: this.configService.get<string>('DEEPSEEK_DEFAULT_MODEL', 'deepseek-chat'),
        timeoutMs: 120000, // DeepSeek 推理模型可能较慢
      });
    }

    // Qwen (通义千问)
    const qwenKey = this.configService.get<string>('QWEN_API_KEY');
    if (qwenKey) {
      this.configs.set('qwen', {
        apiKey: qwenKey,
        baseUrl: this.configService.get<string>(
          'QWEN_BASE_URL',
          'https://dashscope.aliyuncs.com/compatible-mode/v1'
        ),
        defaultModel: this.configService.get<string>('QWEN_DEFAULT_MODEL', 'qwen-plus'),
        timeoutMs: 60000,
      });
    }

    this.logger.log(
      `已加载 ${this.configs.size} 个 LLM Provider 配置: ${[...this.configs.keys()].join(', ')}`
    );

    // 如果配置了 DEFAULT_LLM_PROVIDER 环境变量，使用它作为默认值
    const envDefault = this.configService.get<string>('DEFAULT_LLM_PROVIDER') as
      | LlmProviderName
      | undefined;
    if (envDefault && this.configs.has(envDefault)) {
      this.defaultProvider = envDefault;
    }
  }

  /** 根据名称创建 Provider 实例 */
  private createProvider(name: LlmProviderName): ILlmProvider {
    const config = this.configs.get(name);
    if (!config) {
      throw new Error(`LLM Provider "${name}" 未配置，请检查环境变量`);
    }

    switch (name) {
      case 'openai':
        return new OpenAiProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'deepseek':
        return new DeepSeekProvider(config);
      case 'qwen':
        return new QwenProvider(config);
      default:
        throw new Error(`未知的 LLM Provider: ${name}`);
    }
  }
}
