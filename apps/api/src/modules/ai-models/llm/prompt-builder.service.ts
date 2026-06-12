import { Injectable, Logger } from '@nestjs/common';
import type { ChatMessage, ToolDefinition } from './llm-provider.interface';

/** 默认上下文窗口大小（Token 数）— 大多数现代模型支持 128K */
const DEFAULT_CONTEXT_WINDOW = 131072;
/** 上下文安全比例 — 仅使用上下文窗口的 80% 作为可用预算 */
const CONTEXT_SAFETY_RATIO = 0.8;
/** System Prompt 预留 Token 数（保守估计） */
const SYSTEM_PROMPT_RESERVED_TOKENS = 2000;
/** 单条消息平均预估 Token 数（用于截断策略中的粗略估算） */
const AVG_TOKENS_PER_MESSAGE_ESTIMATE = 500;

/**
 * 提示词组装服务
 *
 * 负责：
 * - 基于 {{variable}} 模板语法的系统提示词变量替换
 * - 对话历史管理（上下文窗口预算控制、自动截断旧消息）
 * - 工具定义格式化为系统提示词文本
 * - 上下文窗口安全边界管理
 */
@Injectable()
export class PromptBuilderService {
  private readonly logger = new Logger(PromptBuilderService.name);

  /**
   * 构建系统提示词（模板变量替换）
   *
   * 支持双花括号语法 {{variable}} 进行变量替换。
   * 未匹配到的变量占位符将被保留原样，方便排查缺失变量。
   *
   * @param template 包含 {{variable}} 占位符的模板字符串
   * @param variables 变量键值对映射
   * @returns 替换后的完整系统提示词
   */
  buildSystemPrompt(template: string, variables: Record<string, string>): string {
    if (!template) {
      this.logger.warn('buildSystemPrompt 收到空模板');
      return '';
    }

    try {
      let result = template;

      for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`\\{\\{\\s*${this.escapeRegExp(key)}\\s*\\}\\}`, 'g');
        result = result.replace(placeholder, value);
      }

      // 检测未被替换的残留占位符
      const remainingPlaceholders = result.match(/\{\{[^}]+\}\}/g);
      if (remainingPlaceholders?.length) {
        this.logger.warn(
          `系统提示词中存在 ${remainingPlaceholders.length} 个未替换的变量: ${remainingPlaceholders.join(', ')}`
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `构建系统提示词失败: ${error instanceof Error ? error.message : String(error)}`
      );
      return template;
    }
  }

  /**
   * 构建完整的消息列表（含上下文窗口管理）
   *
   * 组装 system prompt + 对话历史 + 新用户消息，同时执行上下文窗口预算控制：
   * - 可用预算 = contextWindow × 安全比例（默认 80%）
   * - 预留给 system prompt 固定额度
   * - 剩余空间分配给对话历史，超出时从最早的消息开始截断
   * - 始终保留最新的用户消息和最近的 assistant 回复
   *
   * @param systemPrompt 系统提示词
   * @param conversationHistory 历史对话消息数组
   * @param newUserMessage 当前用户的新消息
   * @param maxContextTokens 最大上下文 Token 上限（可选，默认 128K × 80%）
   * @returns 经过裁剪后的完整消息列表
   */
  buildMessages(
    systemPrompt: string,
    conversationHistory: ChatMessage[],
    newUserMessage: string,
    maxContextTokens?: number
  ): ChatMessage[] {
    const effectiveMaxTokens =
      maxContextTokens ?? Math.floor(DEFAULT_CONTEXT_WINDOW * CONTEXT_SAFETY_RATIO);

    // 构建 System 消息
    const systemMessage: ChatMessage = {
      role: 'system',
      content: systemPrompt,
    };

    // 构建当前用户消息
    const currentMessage: ChatMessage = {
      role: 'user',
      content: newUserMessage,
    };

    // 计算 system prompt 的 Token 开销（粗略估算）
    const systemTokens = SYSTEM_PROMPT_RESERVED_TOKENS + Math.ceil(systemPrompt.length / 3); // ~3 chars/token

    // 当前用户消息的 Token 开销
    const currentMsgTokens = Math.ceil(newUserMessage.length / 3) + AVG_TOKENS_PER_MESSAGE_ESTIMATE;

    // 剩余可用于历史消息的 Token 预算
    const historyBudget = effectiveMaxTokens - systemTokens - currentMsgTokens;

    if (historyBudget <= 0) {
      this.logger.warn(
        `上下文窗口不足: system(${systemTokens}) + current(${currentMsgTokens}) 已超过上限 ${effectiveMaxTokens}，将仅发送 system + 当前消息`
      );
      return [systemMessage, currentMessage];
    }

    // 如果历史消息能全部容纳，直接拼接
    const estimatedHistoryTokens = this.estimateHistoryTokens(conversationHistory);

    if (estimatedHistoryTokens <= historyBudget) {
      return [systemMessage, ...conversationHistory, currentMessage];
    }

    // 需要截断：从最早的消息开始丢弃，直到剩余消息能放入预算
    const truncatedHistory = this.truncateHistoryToFitBudget(conversationHistory, historyBudget);

    if (truncatedHistory.length < conversationHistory.length) {
      this.logger.debug(
        `上下文截断: ${conversationHistory.length} 条 → ${truncatedHistory.length} 条消息` +
          `（预算 ${historyBudget} tokens）`
      );
    }

    return [systemMessage, ...truncatedHistory, currentMessage];
  }

  /**
   * 将工具定义数组格式化为系统提示词中的描述文本
   *
   * 输出结构化的 Markdown 格式工具说明，便于 LLM 理解并正确调用。
   *
   * @param tools 工具定义数组
   * @returns 格式化后的工具描述文本
   */
  injectToolsDescription(tools: ToolDefinition[]): string {
    if (!tools || tools.length === 0) {
      return '';
    }

    try {
      const sections: string[] = [
        '\n## 可用工具\n\n你可以使用以下工具来完成任务。请根据用户的请求选择合适的工具。\n',
      ];

      for (const tool of tools) {
        const fn = tool.function;
        const paramsStr = fn.parameters ? JSON.stringify(fn.parameters, null, 2) : '{}';

        sections.push(
          `### ${fn.name}\n\n` +
            `${fn.description ? `${fn.description}\n\n` : ''}` +
            `**参数 Schema:**\n\`\`\`json\n${paramsStr}\n\`\`\`\n`
        );
      }

      sections.push(
        '\n**使用规则:**\n' +
          '- 每次只调用一个工具\n' +
          '- 必须严格遵循参数 schema\n' +
          '- 缺少必要参数时应先询问用户\n'
      );

      return sections.join('');
    } catch (error) {
      this.logger.error(
        `格式化工具描述失败: ${error instanceof Error ? error.message : String(error)}`
      );
      return `\n## 可用工具\n\n${JSON.stringify(tools)}\n`;
    }
  }

  /** 粗略估算整段对话历史的 Token 数量 */
  private estimateHistoryTokens(messages: ChatMessage[]): number {
    let totalTokens = 0;

    for (const msg of messages) {
      const contentLength =
        typeof msg.content === 'string' ? msg.content.length : JSON.stringify(msg.content).length;

      // 每条消息有约 4 token 的角色/格式开销 + 内容本身
      totalTokens += 4 + Math.ceil(contentLength / 3);
    }

    return totalTokens;
  }

  /**
   * 截断对话历史以适应 Token 预算
   *
   * 策略：从最旧的消息开始逐条移除，确保最新消息优先保留。
   * 同时保证 user/assistant 消息成对出现（避免孤立的 assistant 回复）。
   */
  private truncateHistoryToFitBudget(messages: ChatMessage[], budgetTokens: number): ChatMessage[] {
    if (messages.length === 0) return [];

    // 从尾部开始累加，找到能装入预算的最大子集
    const selected: ChatMessage[] = [];
    let accumulatedTokens = 0;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const contentLength =
        typeof msg.content === 'string' ? msg.content.length : JSON.stringify(msg.content).length;

      const msgTokens = 4 + Math.ceil(contentLength / 3);

      if (accumulatedTokens + msgTokens <= budgetTokens) {
        selected.unshift(msg);
        accumulatedTokens += msgTokens;
      } else {
        break;
      }
    }

    return selected;
  }

  /** 转义正则表达式特殊字符 */
  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
