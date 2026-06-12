import { Injectable, Logger } from '@nestjs/common';
import { BaseAgentStrategy } from './base-agent.strategy';
import { ITaskPayload, ITaskResult, TaskType } from '../types/task.types';
import { IAgentSession } from '../types/agent.types';
import { LlmProviderFactory } from '../../../ai-models/llm/providers/index';

/**
 * 内容生成参数接口
 */
interface ContentParams {
  /** 内容主题/标题 */
  topic: string;
  /** 语气风格 (professional/casual/friendly/persuasive) */
  tone?: string;
  /** 目标发布平台 */
  platform?: string;
  /** 目标字数 */
  length?: number;
  /** 额外要求/约束 */
  requirements?: string[];
  /** 参考素材链接 */
  references?: string[];
  /** 目标受众描述 */
  audience?: string;
}

/**
 * 生成的内容结果
 */
interface GeneratedContent {
  /** 正文内容 */
  body: string;
  /** 字数统计 */
  wordCount: number;
  /** 目标平台 */
  platform: string;
  /** 自动提取的标签 */
  tags: string[];
  /** 内容摘要 */
  summary: string;
  /** 建议的发布时间（最佳时段） */
  suggestedPostTime?: string;
}

/** 平台内容规范配置 */
const PLATFORM_FORMAT_RULES: Record<
  string,
  { maxLength: number; hashtageLimit: number; description: string }
> = {
  twitter: { maxLength: 280, hashtageLimit: 3, description: 'Twitter/X 短文' },
  xiaohongshu: { maxLength: 1000, hashtageLimit: 10, description: '小红书图文笔记' },
  douyin: { maxLength: 2000, hashtageLimit: 15, description: '抖音视频脚本' },
  youtube: { maxLength: 5000, hashtageLimit: 5, description: 'YouTube 视频脚本/简介' },
  wechat: { maxLength: 10000, hashtageLimit: 0, description: '微信公众号文章' },
  default: { maxLength: 2000, hashtageLimit: 5, description: '通用格式' },
};

/**
 * AI 内容生成 Agent 策略
 *
 * 基于 LLM 实现智能内容创作，支持多平台格式自适应。
 * 工作流程：需求解析 → LLM 生成 → 平台格式适配 → 标签提取 → 输出
 *
 * 通过构造函数注入 LlmProviderFactory 以支持多模型切换。
 */
@Injectable()
export class ContentAgentStrategy extends BaseAgentStrategy {
  override readonly strategyName = 'content-agent';

  override readonly supportedTaskTypes: TaskType[] = [TaskType.CONTENT];

  constructor(private readonly llmFactory: LlmProviderFactory) {
    super();
  }

  /**
   * 执行内容生成任务
   *
   * @param session - Agent 会话
   * @param payload - 任务负载（params 中含 topic/tone/platform/length 等）
   * @returns 生成的内容及元数据
   */
  async execute(session: IAgentSession, payload: ITaskPayload): Promise<ITaskResult> {
    const startTime = Date.now();

    this.logger.log(`开始执行内容生成任务 | 会话ID=${session.id}`);

    try {
      // Step 1: 提取并校验内容参数
      const params = this.extractContentParams(payload.params);
      this.logger.log(
        `内容生成参数: topic="${params.topic}", platform=${params.platform}, tone=${params.tone}`
      );

      // Step 2: 构建 LLM Prompt 并调用生成
      const prompt = this.buildGenerationPrompt(params);
      this.logger.debug('正在调用 LLM 服务生成内容...');

      const llmResponse = await this.callLlmForContent(prompt, params);
      let generatedBody = llmResponse.content;

      // Step 3: 平台格式适配（截断/调整排版等）
      const formatRules =
        PLATFORM_FORMAT_RULES[params.platform || 'default'] || PLATFORM_FORMAT_RULES.default;
      generatedBody = this.adaptForPlatform(generatedBody, formatRules, params);

      // Step 4: 自动提取标签与摘要
      const tags = this.extractTags(generatedBody, params.topic, formatRules.hashtageLimit);
      const summary = this.generateSummary(generatedBody);

      // Step 5: 组装最终结果
      const wordCount = this.countWords(generatedBody);
      const durationMs = Date.now() - startTime;

      const resultData: GeneratedContent = {
        body: generatedBody,
        wordCount,
        platform: params.platform || 'default',
        tags,
        summary,
        suggestedPostTime: this.suggestBestPostTime(params.platform),
      };

      this.logger.log(
        `内容生成完成 | 字数=${wordCount} | 平台=${resultData.platform} | 标签数=${tags.length} | 耗时=${durationMs}ms | tokens=${llmResponse.tokensUsed}`
      );

      return {
        success: true,
        data: {
          ...resultData,
          originalTopic: params.topic,
          tone: params.tone,
          generationModel: llmResponse.model,
        },
        metrics: {
          durationMs,
          itemsProcessed: 1,
          tokensUsed: llmResponse.tokensUsed,
        },
      };
    } catch (error) {
      return this.onError(error as Error, payload);
    }
  }

  /**
   * 预处理：校验内容生成必需参数
   */
  override async preprocess(payload: ITaskPayload): Promise<ITaskPayload> {
    this.logger.debug('内容策略预处理：参数校验');

    if (!payload.params || !(payload.params as Record<string, unknown>).topic) {
      throw new Error('内容生成任务缺少必需参数: params.topic（内容主题）');
    }

    return payload;
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 从 payload.params 中安全提取内容生成参数
   */
  private extractContentParams(params?: Record<string, unknown>): ContentParams {
    const raw = params || {};
    return {
      topic: String(raw.topic || ''),
      tone: String(raw.tone || 'professional'),
      platform: String(raw.platform || 'default'),
      length: Number(raw.length) || 800,
      requirements: Array.isArray(raw.requirements) ? (raw.requirements as string[]) : [],
      references: Array.isArray(raw.references) ? (raw.references as string[]) : [],
      audience: String(raw.audience || ''),
    };
  }

  /**
   * 构建 LLM 内容生成 Prompt
   */
  private buildGenerationPrompt(params: ContentParams): string {
    const sections: string[] = [];

    sections.push(`# 内容生成任务`);
    sections.push(`请根据以下要求生成一篇高质量内容。\n`);

    sections.push(`## 基本信息`);
    sections.push(`- 主题/标题: ${params.topic}`);
    sections.push(`- 语气风格: ${params.tone}`);
    sections.push(`- 目标平台: ${params.platform || '通用'}`);
    sections.push(`- 目标字数: 约 ${params.length} 字`);
    if (params.audience) {
      sections.push(`- 目标受众: ${params.audience}`);
    }

    if (params.requirements && params.requirements.length > 0) {
      sections.push(`## 特殊要求`);
      params.requirements.forEach((req, idx) => {
        sections.push(`${idx + 1}. ${req}`);
      });
    }

    if (params.references && params.references.length > 0) {
      sections.push(`## 参考资料`);
      params.references.forEach((ref, idx) => {
        sections.push(`${idx + 1}. ${ref}`);
      });
    }

    sections.push('\n请直接输出正文内容，无需额外说明。确保内容原创、有价值且符合平台调性。');

    return sections.join('\n');
  }

  /**
   * 调用 LLM 服务生成内容
   */
  private async callLlmForContent(
    prompt: string,
    _params: ContentParams
  ): Promise<{ content: string; model: string; tokensUsed: number }> {
    try {
      // 使用注入的 LlmProviderFactory 获取 Provider 并调用
      const provider = this.llmFactory.getProvider('openai'); // 默认使用 OpenAI provider
      const response = await provider.chatCompletion({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 4000,
      });

      return {
        content: response.content || '',
        model: response.model || 'gpt-4o',
        tokensUsed: response.usage?.totalTokens || 0,
      };
    } catch (error) {
      this.logger.warn(`LLM 调用失败，回退到模拟生成: ${(error as Error).message}`);
      // 回退到模拟内容生成
      return this.fallbackGenerateContent(_params);
    }
  }

  /**
   * LLM 不可用时的回退模拟生成
   */
  private fallbackGenerateContent(params: ContentParams): {
    content: string;
    model: string;
    tokensUsed: number;
  } {
    const templates: Record<string, string> = {
      professional: `关于「${params.topic}」的专业分析\n\n在当前的市场环境下，${params.topic}已成为行业关注的焦点。本文将从多个维度深入剖析这一主题的核心要素与实践路径。\n\n首先，我们需要理解${params.topic}的基本概念及其在整体生态中的定位。通过系统性的分析框架，可以更清晰地把握其发展脉络与未来趋势。\n\n其次，从实际应用角度来看，${params.topic}的价值主要体现在以下几个方面：提升效率、降低成本、优化用户体验。这些优势使其在各行各业中得到广泛认可与应用。\n\n最后，建议从业者持续关注该领域的最新动态，结合自身业务特点制定相应的战略规划。`,
      casual: `聊聊${params.topic}那些事儿 🎯\n\n最近大家都在讨论${params.topic}，今天就来唠唠我的看法！\n\n说实话，刚开始接触这个话题的时候我也是一脸懵😅 但越研究越觉得有意思～\n\n简单来说，${params.topic}其实就是... （此处省略一万字）总之就是很厉害就对了！\n\n你们怎么看？评论区见 👇`,
      friendly: `你好呀！今天想和你分享关于${params.topic}的一些心得 💡\n\n作为一个在这个领域探索了一段时间的人，我想把一些实用的经验整理出来，希望能对你有所帮助。\n\n📌 第一点：保持好奇心和学习热情\n📌 第二点：实践出真知\n📌 第三点：找到适合自己的节奏\n\n希望这些分享能给你的旅程带来一些启发！有任何问题欢迎随时交流 ✨`,
      persuasive: `为什么你现在就需要关注${params.topic}？\n\n答案很简单：因为机会不等人。\n\n数据显示，已经率先布局${params.topic}的企业和个人，平均获得了超过 300% 的效率提升。这不是危言耸听，而是真实发生的变化。\n\n想象一下，当你的竞争对手还在犹豫的时候，你已经完成了技术积累和模式验证。这种先发优势是无价的。\n\n别再观望了。现在就开始行动，让${params.topic}成为你下一个增长引擎。`,
    };

    const template = templates[params.tone || 'professional'] || templates.professional;
    const tokensEstimate = Math.ceil(template.length / 4);

    return {
      content: template,
      model: 'fallback-mock',
      tokensUsed: tokensEstimate,
    };
  }

  /**
   * 根据平台规则适配内容格式
   */
  private adaptForPlatform(
    content: string,
    rules: { maxLength: number; hashtageLimit: number },
    _params: ContentParams
  ): string {
    let adapted = content.trim();

    // 字数截断（保留完整句子）
    if (adapted.length > rules.maxLength) {
      adapted = adapted.substring(0, rules.maxLength);
      const lastPeriod = Math.max(
        adapted.lastIndexOf('。'),
        adapted.lastIndexOf('.'),
        adapted.lastIndexOf('!'),
        adapted.lastIndexOf('!')
      );
      if (lastPeriod > rules.maxLength * 0.6) {
        adapted = adapted.substring(0, lastPeriod + 1);
      }
      adapted += '...';
    }

    return adapted;
  }

  /**
   * 从正文中自动提取标签
   */
  private extractTags(content: string, topic: string, limit: number): string[] {
    const tags: string[] = [];

    // 始终包含主题词作为基础标签
    if (topic && topic.length <= 20) {
      tags.push(topic.replace(/\s+/g, ''));
    }

    // 从内容中提取高频关键词（简单模拟）
    const keywords = ['AI', 'Web3', '区块链', '数据分析', '增长', '效率', '创新', '数字化'];
    const contentLower = content.toLowerCase();
    for (const kw of keywords) {
      if (contentLower.includes(kw.toLowerCase()) && !tags.includes(kw)) {
        tags.push(kw);
      }
      if (tags.length >= limit) break;
    }

    return tags.slice(0, limit);
  }

  /**
   * 生成内容摘要
   */
  private generateSummary(content: string): string {
    // 取前150字符作为简易摘要
    const cleaned = content
      .replace(/[#*\n\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned.length > 150 ? cleaned.substring(0, 147) + '...' : cleaned;
  }

  /**
   * 统计字数（中英文混合兼容）
   */
  private countWords(text: string): number {
    // 中文字符计数 + 英文单词计数
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return chineseChars + englishWords;
  }

  /**
   * 根据平台建议最佳发布时间
   */
  private suggestBestPostTime(platform?: string): string | undefined {
    const schedule: Record<string, string> = {
      twitter: '08:00-10:00, 18:00-21:00',
      xiaohongshu: '12:00-14:00, 20:00-23:00',
      douyin: '12:00-13:00, 18:00-21:00',
      youtube: '15:00-17:00 (周末)',
      wechat: '07:00-09:00, 20:00-22:00',
    };
    return schedule[platform || ''];
  }
}
