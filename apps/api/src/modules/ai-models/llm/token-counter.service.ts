import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

/**
 * 各模型的 Token 估算比率（字符数 / Token 数）
 * 用于在无法调用 tokenizer 时做粗略估算
 */
const TOKEN_RATIOS: Record<string, number> = {
  'gpt-4o': 3.5,
  'gpt-4': 3.5,
  'gpt-4-turbo': 3.5,
  'gpt-3.5-turbo': 4.0,
  'claude-3-opus': 3.8,
  'claude-3-sonnet': 3.8,
  'claude-3-haiku': 3.8,
  'claude-sonnet-4-20250514': 3.8,
  'deepseek-chat': 2.0,
  'deepseek-reasoner': 2.0,
  'qwen-plus': 1.8,
  'qwen-turbo': 1.8,
};

/** 默认 Token 比率（中英文混合文本通用估算） */
const DEFAULT_TOKEN_RATIO = 3.0;

/**
 * 各模型的定价信息（美元 / 百万 Token）
 * 格式: [inputPrice, outputPrice]
 */
const MODEL_PRICING: Record<string, [number, number]> = {
  'gpt-4o': [2.5, 10],
  'gpt-4': [30, 60],
  'gpt-4-turbo': [10, 30],
  'gpt-3.5-turbo': [0.5, 1.5],
  'claude-3-opus': [15, 75],
  'claude-3-sonnet': [3, 15],
  'claude-3-haiku': [0.25, 1.25],
  'claude-sonnet-4-20250514': [3, 15],
  'deepseek-chat': [0.14, 0.28],
  'deepseek-reasoner': [0.55, 2.19],
  'qwen-plus': [0.8, 2.0],
  'qwen-turbo': [0.3, 0.6],
};

/** 默认定价（当模型不在定价表中时使用） */
const DEFAULT_PRICING: [number, number] = [5, 15];

/**
 * Token 计数与费用追踪服务
 *
 * 提供：
 * - 基于字符数的 Token 估算（按模型差异化比率）
 * - LLM 调用记录持久化（写入 LlmCallLog 表）
 * - 多维度费用统计查询（按 Provider / 模型 / 时间范围聚合）
 */
@Injectable()
export class TokenCounterService {
  private readonly logger = new Logger(TokenCounterService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 估算文本的 Token 数量
   *
   * 根据不同模型的语言特性采用差异化字符/Token 比率：
   * - 英文为主的模型（GPT/Claude）：~3.5~3.8 字符/Token
   * - 中文优化模型（DeepSeek/Qwen）：~1.8~2.0 字符/Token
   *
   * @param text 待计数的文本
   * @param model 模型名称，用于选取合适的估算比率
   * @returns 估算的 Token 数量
   */
  countTokens(text: string, model: string): number {
    if (!text || text.length === 0) return 0;

    // 尝试精确匹配模型名称
    let ratio = TOKEN_RATIOS[model];

    // 若未精确匹配，尝试前缀模糊匹配
    if (!ratio) {
      const matchedKey = Object.keys(TOKEN_RATIOS).find(
        (key) =>
          model.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().includes(model.toLowerCase())
      );
      ratio = matchedKey ? TOKEN_RATIOS[matchedKey] : DEFAULT_TOKEN_RATIO;
    }

    const tokenCount = Math.ceil(text.length / ratio);
    return tokenCount;
  }

  /**
   * 记录一次 LLM 调用到数据库
   *
   * 写入 LlmCallLog 表，包含 Provider、模型、Token 用量、延迟、成功状态等信息，
   * 用于后续的费用统计和用量分析。
   *
   * @param data 调用记录数据
   */
  async recordUsage(data: {
    instanceId: string;
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
    success: boolean;
    userId?: string;
    sessionId?: string;
  }): Promise<void> {
    try {
      const totalCost = this.calculateCost(data.model, data.promptTokens, data.completionTokens);

      await this.prisma.llmCallLog.create({
        data: {
          instanceId:
            typeof data.instanceId === 'string' ? parseInt(data.instanceId, 10) : data.instanceId,
          provider: data.provider,
          model: data.model,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          latencyMs: data.latencyMs,
          success: data.success,
          totalCost: totalCost,
          userId: data.userId
            ? typeof data.userId === 'string'
              ? parseInt(data.userId, 10)
              : data.userId
            : undefined,
          sessionId: data.sessionId
            ? typeof data.sessionId === 'string'
              ? parseInt(data.sessionId, 10)
              : data.sessionId
            : undefined,
        },
      });

      this.logger.debug(
        `LLM 调用记录已保存: ${data.provider}/${data.model}, ` +
          `tokens=${data.promptTokens + data.completionTokens}, cost=$${totalCost.toFixed(6)}`
      );
    } catch (error) {
      this.logger.error(
        `保存 LLM 调用记录失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 查询费用统计数据
   *
   * 支持按 Provider、模型、时间范围等多维度筛选与聚合统计。
   *
   * @param query 查询条件（可选过滤字段）
   * @returns 聚合统计结果，包括总费用、总调用次数、平均延迟、按 Provider/模型分组数据
   */
  async getCostStats(query: {
    provider?: string;
    model?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalCost: number;
    totalCalls: number;
    avgLatency: number;
    byProvider: Array<{
      provider: string;
      totalCost: number;
      totalCalls: number;
      avgLatency: number;
    }>;
    byModel: Array<{ model: string; totalCost: number; totalCalls: number; avgLatency: number }>;
  }> {
    const where: Record<string, unknown> = {};

    if (query.provider) where.provider = query.provider;
    if (query.model) where.model = query.model;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) (where.createdAt as Record<string, Date>).gte = query.startDate;
      if (query.endDate) (where.createdAt as Record<string, Date>).lte = query.endDate;
    }

    // 总体聚合
    const totalAgg = await this.prisma.llmCallLog.aggregate({
      where: where as any,
      _sum: { totalCost: true, latencyMs: true },
      _count: true,
    });

    // 按 Provider 分组
    const byProviderRaw = await this.prisma.llmCallLog.groupBy({
      by: ['provider'],
      where: where as any,
      _sum: { totalCost: true, latencyMs: true },
      _count: true,
    });

    // 按模型分组
    const byModelRaw = await this.prisma.llmCallLog.groupBy({
      by: ['model'],
      where: where as any,
      _sum: { totalCost: true, latencyMs: true },
      _count: true,
    });

    const totalCalls = (totalAgg._count as number) || 0;
    const totalCost = Number(totalAgg._sum?.totalCost || 0);
    const totalLatency = Number(totalAgg._sum?.latencyMs || 0);
    const avgLatency = totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0;

    return {
      totalCost,
      totalCalls,
      avgLatency,
      byProvider: byProviderRaw.map((row: any) => ({
        provider: row.provider,
        totalCost: Number(row._sum?.totalCost || 0),
        totalCalls: row._count || 0,
        avgLatency:
          (row._count || 0) > 0
            ? Math.round(Number(row._sum?.latencyMs || 0) / (row._count || 0))
            : 0,
      })),
      byModel: byModelRaw.map((row: any) => ({
        model: row.model,
        totalCost: Number(row._sum?.totalCost || 0),
        totalCalls: row._count || 0,
        avgLatency:
          (row._count || 0) > 0
            ? Math.round(Number(row._sum?.latencyMs || 0) / (row._count || 0))
            : 0,
      })),
    };
  }

  /**
   * 计算单次调用的费用（美元）
   * 公式: inputPrice × (promptTokens / 1M) + outputPrice × (completionTokens / 1M)
   *
   * @param model 模型名称
   * @param promptTokens 输入 Token 数
   * @param completionTokens 输出 Token 数
   * @returns 费用金额（USD）
   */
  calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    let pricing = MODEL_PRICING[model];

    if (!pricing) {
      const matchedKey = Object.keys(MODEL_PRICING).find(
        (key) =>
          model.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().includes(model.toLowerCase())
      );
      pricing = matchedKey ? MODEL_PRICING[matchedKey] : DEFAULT_PRICING;
    }

    const [inputPrice, outputPrice] = pricing;
    const inputCost = (inputPrice * promptTokens) / 1_000_000;
    const outputCost = (outputPrice * completionTokens) / 1_000_000;

    return parseFloat((inputCost + outputCost).toFixed(8));
  }
}
