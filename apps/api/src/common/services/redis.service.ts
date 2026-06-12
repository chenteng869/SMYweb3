import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis 服务 — 连接管理、键前缀、重连机制
 * 支持: GET/SET/DEL/EXPIRE/HGETALL/HSET/INCR/PUBLISH/SUBSCRIBE
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private readonly keyPrefix: string;

  constructor(private configService: ConfigService) {
    this.keyPrefix = this.configService.get<string>('REDIS_KEY_PREFIX', 'smyweb3:');
  }

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      retryStrategy: (times) => Math.min(times * 200, 3000),
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      enableReadyCheck: true,
      keepAlive: 10000,
      connectTimeout: 10000,
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
    this.client.on('reconnecting', () => this.logger.warn('Redis reconnecting...'));
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  /** 获取带前缀的完整 key */
  private prefixedKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  // ===== 基础操作 =====
  async get(key: string): Promise<string | null> {
    return this.client.get(this.prefixedKey(key));
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    const fullKey = this.prefixedKey(key);
    if (ttlSeconds) return this.client.setex(fullKey, ttlSeconds, value);
    return this.client.set(fullKey, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(this.prefixedKey(key));
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(this.prefixedKey(key))) === 1;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    return (await this.client.expire(this.prefixedKey(key), seconds)) === 1;
  }

  // ===== Hash 操作 =====
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(this.prefixedKey(key));
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(this.prefixedKey(key), field, value);
  }

  // ===== 计数器操作 =====
  async incr(key: string, by = 1): Promise<number> {
    if (by === 1) return this.client.incr(this.prefixedKey(key));
    return this.client.incrby(this.prefixedKey(key), by);
  }

  // ===== Pub/Sub 操作 =====
  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(this.prefixedChannel(channel), message);
  }

  /** 获取带前缀的完整 channel（与 key 共用前缀） */
  private prefixedChannel(channel: string): string {
    return `${this.keyPrefix}${channel}`;
  }

  // ===== 缓存便捷方法 =====
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<'OK'> {
    return this.set(key, JSON.stringify(value), ttlSeconds);
  }

  // ===== 健康检查 =====
  async healthCheck(): Promise<{ status: string; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.client.ping();
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (e) {
      return { status: 'error', latencyMs: Date.now() - start };
    }
  }

  // ===== 模式匹配（用于缓存失效） =====

  /** 按 glob 模式查找所有匹配的 key */
  async getKeysByPattern(pattern: string): Promise<string[]> {
    const fullPattern = this.prefixedKey(pattern);
    // 使用 SCAN 替代 KEYS（生产安全，不阻塞 Redis）
    let cursor = '0';
    const keys: string[] = [];
    do {
      const [nextCursor, foundKeys] = await this.client.scan(
        cursor,
        'MATCH',
        fullPattern,
        'COUNT',
        100
      );
      cursor = nextCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');
    return keys;
  }
}
