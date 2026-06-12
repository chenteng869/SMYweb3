import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../common/services/redis.service';
import { LlmProviderFactory } from './providers/index';
import type { ChatMessage, LlmChatResponse } from './llm-provider.interface';
import { createHash } from 'crypto';

/** 缓存键前缀 */
const CACHE_KEY_PREFIX = 'llm:cache:';
/** 默认缓存 TTL（秒） */
const DEFAULT_TTL_SECONDS = 3600;
/** 语义相似度阈值 */
const SIMILARITY_THRESHOLD = 0.95;

/**
 * LLM 语义缓存服务
 *
 * 基于 Redis 实现两级缓存策略：
 * 1. 精确匹配层 — 对请求内容做 SHA256 哈希，精确命中直接返回
 * 2. 语义相似度层 — 精确未命中时，通过 Embedding 向量计算余弦相似度，
 *    当相似度超过阈值（0.95）时视为语义等价请求，复用缓存响应
 */
@Injectable()
export class LlmCacheService {
  private readonly logger = new Logger(LlmCacheService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly providerFactory: LlmProviderFactory
  ) {}

  /**
   * 根据请求哈希获取缓存的 LLM 响应
   * @param requestHash 请求的唯一哈希值
   * @returns 缓存的响应对象，未命中时返回 null
   */
  async getCached(requestHash: string): Promise<LlmChatResponse | null> {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${requestHash}`;
      const cached = await this.redisService.getJson<LlmChatResponse>(cacheKey);

      if (cached) {
        this.logger.debug(`缓存精确命中: ${cacheKey}`);
        return cached;
      }

      return null;
    } catch (error) {
      this.logger.warn(`读取缓存失败: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * 将 LLM 响应写入缓存
   * @param requestHash 请求的唯一哈希值
   * @param response 需要缓存的响应对象
   * @param ttlSeconds 缓存过期时间（秒），默认 3600 秒（1 小时）
   */
  async setCache(
    requestHash: string,
    response: LlmChatResponse,
    ttlSeconds: number = DEFAULT_TTL_SECONDS
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${requestHash}`;
      await this.redisService.setJson(cacheKey, response, ttlSeconds);
      this.logger.debug(`缓存已写入: ${cacheKey}, TTL=${ttlSeconds}s`);
    } catch (error) {
      this.logger.warn(`写入缓存失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 生成请求的规范化哈希值（SHA256）
   *
   * 对消息列表进行序列化后做 SHA256 哈希，确保相同语义的请求产生相同的哈希值。
   * 序列化过程会去除空白差异并统一排序。
   *
   * @param messages 聊天消息数组
   * @param model 模型名称（不同模型的缓存隔离）
   * @returns 十六进制格式的 SHA256 哈希字符串
   */
  generateRequestHash(messages: ChatMessage[], model: string): string {
    try {
      const normalized = this.normalizeMessages(messages);
      const raw = JSON.stringify({ model, messages: normalized });
      return createHash('sha256').update(raw).digest('hex');
    } catch (error) {
      this.logger.warn(
        `生成请求哈希失败，降级为简单哈希: ${error instanceof Error ? error.message : String(error)}`
      );
      const fallbackRaw = JSON.stringify({ model, messageCount: messages.length });
      return createHash('sha256').update(fallbackRaw).digest('hex');
    }
  }

  /**
   * 通过语义相似度查找近似缓存
   *
   * 当精确哈希未命中时，将当前请求向量化并与已缓存请求的向量做余弦相似度比较。
   * 相似度超过阈值则返回最接近的缓存结果。
   *
   * @param messages 当前请求的消息数组
   * @param model 模型名称
   * @returns 语义相似的缓存响应，或 null（无近似匹配）
   */
  async findSimilarCached(messages: ChatMessage[], model: string): Promise<LlmChatResponse | null> {
    try {
      // 提取用户最后一条消息作为查询文本用于向量比对
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
      if (!lastUserMsg || typeof lastUserMsg.content !== 'string') {
        return null;
      }

      // 获取可用的 Provider 用于 Embedding
      const providers = this.providerFactory.getAvailableProviders();
      if (providers.length === 0) {
        return null;
      }

      const provider = this.providerFactory.getProvider(providers[0]);
      const queryEmbed = await provider.embed({
        input: lastUserMsg.content.slice(0, 2000),
      });

      if (!queryEmbed.embeddings?.[0]) {
        return null;
      }

      const queryVector = queryEmbed.embeddings[0];
      let bestMatch: LlmChatResponse | null = null;
      let bestSimilarity = 0;

      // 遍历缓存中的 embedding 向量进行余弦相似度计算
      const embedCacheKey = `${CACHE_KEY_PREFIX}embeddings:${model}`;
      const cachedEmbeds =
        await this.redisService.getJson<
          Array<{ hash: string; vector: number[]; responseKey: string }>
        >(embedCacheKey);

      if (cachedEmbeds && cachedEmbeds.length > 0) {
        for (const entry of cachedEmbeds) {
          const similarity = this.cosineSimilarity(queryVector, entry.vector);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            // 从对应 key 取出完整响应
            bestMatch = await this.redisService.getJson<LlmChatResponse>(
              `${CACHE_KEY_PREFIX}${entry.hash}`
            );
          }
        }
      }

      if (bestSimilarity >= SIMILARITY_THRESHOLD && bestMatch) {
        this.logger.debug(`语义缓存命中，相似度: ${(bestSimilarity * 100).toFixed(1)}%`);
        return bestMatch;
      }

      return null;
    } catch (error) {
      this.logger.warn(
        `语义相似度查询失败，回退到精确匹配: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * 存储请求的 Embedding 向量以供后续语义匹配
   * @param requestHash 请求哈希
   * @param messages 消息数组（取最后一条用户消息做向量化）
   * @param model 模型名称
   */
  async storeEmbedding(requestHash: string, messages: ChatMessage[], model: string): Promise<void> {
    try {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
      if (!lastUserMsg || typeof lastUserMsg.content !== 'string') {
        return;
      }

      const providers = this.providerFactory.getAvailableProviders();
      if (providers.length === 0) return;

      const provider = this.providerFactory.getProvider(providers[0]);
      const embedResult = await provider.embed({
        input: lastUserMsg.content.slice(0, 2000),
      });

      if (!embedResult.embeddings?.[0]) return;

      const embedCacheKey = `${CACHE_KEY_PREFIX}embeddings:${model}`;
      const cachedEmbeds =
        await this.redisService.getJson<
          Array<{ hash: string; vector: number[]; responseKey: string }>
        >(embedCacheKey);

      const newEntry = {
        hash: requestHash,
        vector: embedResult.embeddings[0],
        responseKey: `${CACHE_KEY_PREFIX}${requestHash}`,
      };

      const updatedEmbeds = [...(cachedEmbeds || []), newEntry];
      // 限制存储最近 1000 条 embedding 记录，防止内存膨胀
      if (updatedEmbeds.length > 1000) {
        updatedEmbeds.splice(0, updatedEmbeds.length - 1000);
      }

      await this.redisService.setJson(embedCacheKey, updatedEmbeds, DEFAULT_TTL_SECONDS * 2);
    } catch (error) {
      this.logger.warn(
        `存储 Embedding 向量失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /** 规范化消息数组用于哈希计算 */
  private normalizeMessages(messages: ChatMessage[]): unknown[] {
    return messages.map((msg) => ({
      role: msg.role,
      content:
        typeof msg.content === 'string' ? msg.content.trim().replace(/\s+/g, ' ') : msg.content,
    }));
  }

  /** 计算两个向量之间的余弦相似度 */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}
