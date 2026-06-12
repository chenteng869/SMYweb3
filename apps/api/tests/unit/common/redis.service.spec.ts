import { RedisService } from '../../../src/common/services/redis.service';
import { ConfigService } from '@nestjs/config';

// Module-level storage for mock client - set in beforeEach, read by factory
let _mockRedisClient: any = {};

function getMockRedisClient(): any {
  return _mockRedisClient;
}

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => getMockRedisClient()),
}));

describe('RedisService', () => {
  let redisService: RedisService;
  let mockConfigService: any;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue: unknown) => {
        const defaults: Record<string, unknown> = {
          REDIS_KEY_PREFIX: 'smyweb3:',
          REDIS_HOST: 'localhost',
          REDIS_PORT: 6379,
          REDIS_PASSWORD: undefined,
        };
        return defaults[key] !== undefined ? defaults[key] : defaultValue;
      }),
    };

    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      hgetall: jest.fn(),
      hset: jest.fn(),
      incr: jest.fn(),
      incrby: jest.fn(),
      publish: jest.fn(),
      scan: jest.fn(),
      ping: jest.fn(),
      on: jest.fn(),
    };

    _mockRedisClient = mockRedisClient;
    redisService = new RedisService(mockConfigService as ConfigService);
    await redisService.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('基础操作', () => {
    it('应该能够设置和获取值 (set/get)', async () => {
      const testKey = 'test:key';
      const testValue = 'test-value';

      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue(testValue);

      await redisService.set(testKey, testValue);
      const result = await redisService.get(testKey);

      expect(mockRedisClient.set).toHaveBeenCalledWith(`smyweb3:${testKey}`, testValue);
      expect(mockRedisClient.get).toHaveBeenCalledWith(`smyweb3:${testKey}`);
      expect(result).toBe(testValue);
    });

    it('应该自动添加 smyweb3: 前缀到 key', async () => {
      const key = 'user:123';

      await redisService.get(key);

      expect(mockRedisClient.get).toHaveBeenCalledWith('smyweb3:user:123');
    });
  });

  describe('删除操作', () => {
    it('应该能够删除指定的 key', async () => {
      const key = 'delete:me';

      mockRedisClient.del.mockResolvedValue(1);

      const result = await redisService.del(key);

      expect(mockRedisClient.del).toHaveBeenCalledWith(`smyweb3:${key}`);
      expect(result).toBe(1);
    });

    it('删除不存在的 key 应该返回 0', async () => {
      mockRedisClient.del.mockResolvedValue(0);

      const result = await redisService.del('nonexistent');

      expect(result).toBe(0);
    });
  });

  describe('Hash 操作', () => {
    it('应该能够设置和获取 hash 字段 (hset/hgetall)', async () => {
      const hashKey = 'user:profile';
      const hashData = { name: '张三', age: '25' };

      mockRedisClient.hset.mockResolvedValue(2);
      mockRedisClient.hgetall.mockResolvedValue(hashData);

      await redisService.hset(hashKey, 'name', '张三');
      await redisService.hset(hashKey, 'age', '25');
      const result = await redisService.hgetall(hashKey);

      expect(mockRedisClient.hset).toHaveBeenCalledWith(`smyweb3:${hashKey}`, 'name', '张三');
      expect(mockRedisClient.hgetall).toHaveBeenCalledWith(`smyweb3:${hashKey}`);
      expect(result).toEqual(hashData);
    });

    it('hgetall 返回空对象当 hash 不存在时', async () => {
      mockRedisClient.hgetall.mockResolvedValue({});

      const result = await redisService.hgetall('nonexistent');

      expect(result).toEqual({});
    });
  });

  describe('自增操作', () => {
    it('应该能够对 key 进行自增操作 (incr)', async () => {
      const counterKey = 'counter:views';

      mockRedisClient.incr
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3);

      const result1 = await redisService.incr(counterKey);
      const result2 = await redisService.incr(counterKey);
      const result3 = await redisService.incr(counterKey);

      expect(mockRedisClient.incr).toHaveBeenCalledWith(`smyweb3:${counterKey}`);
      expect(result1).toBe(1);
      expect(result2).toBe(2);
      expect(result3).toBe(3);
    });
  });

  describe('JSON 序列化操作', () => {
    it('应该能够存储和获取 JSON 数据 (setJson/getJson)', async () => {
      const jsonKey = 'config:app';
      const jsonData = { theme: 'dark', language: 'zh-CN', version: 1 };

      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue(JSON.stringify(jsonData));

      await redisService.setJson(jsonKey, jsonData);
      const result = await redisService.getJson(jsonKey);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `smyweb3:${jsonKey}`,
        JSON.stringify(jsonData)
      );
      expect(result).toEqual(jsonData);
    });

    it('getJson 应该解析无效 JSON 时返回 null', async () => {
      mockRedisClient.get.mockResolvedValue('invalid-json');

      const result = await redisService.getJson('bad:json');

      expect(result).toBeNull();
    });

    it('getJson 当 key 不存在时返回 null', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await redisService.getJson('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('模式匹配查询', () => {
    it('应该能够根据模式查询 keys (getKeysByPattern)', async () => {
      const pattern = 'session:*';
      const mockKeys = ['smyweb3:user:abc', 'smyweb3:user:def'];

      mockRedisClient.scan.mockResolvedValueOnce(['0', ['smyweb3:user:abc', 'smyweb3:user:def']]);

      const result = await redisService.getKeysByPattern(pattern);

      expect(mockRedisClient.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        `smyweb3:${pattern}`,
        'COUNT',
        100
      );
      expect(result).toEqual(mockKeys);
    });
  });

  describe('发布订阅', () => {
    it('应该能够发布消息到频道 (publish)', async () => {
      const channel = 'notifications';
      const message = '{"type":"alert","text":"测试消息"}';

      mockRedisClient.publish.mockResolvedValue(1);

      const result = await redisService.publish(channel, message);

      expect(mockRedisClient.publish).toHaveBeenCalledWith(`smyweb3:${channel}`, message);
      expect(result).toBe(1);
    });
  });

  describe('健康检查', () => {
    it('healthCheck 应该在 Redis 正常时返回 ok 状态', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await redisService.healthCheck();

      expect(mockRedisClient.ping).toHaveBeenCalled();
      expect(result.status).toBe('ok');
      expect(typeof result.latencyMs).toBe('number');
    });

    it('healthCheck 应该在 Redis 异常时返回 error 状态', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection refused'));

      const result = await redisService.healthCheck();

      expect(result.status).toBe('error');
      expect(typeof result.latencyMs).toBe('number');
    });
  });

  describe('边界情况', () => {
    it('处理空字符串值', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('');

      await redisService.set('empty:key', '');
      const result = await redisService.get('empty:key');

      expect(result).toBe('');
    });

    it('处理特殊字符的 key 和 value', async () => {
      const specialKey = 'key with spaces and 特殊字符!';
      const specialValue = 'value with "quotes" and \\n newlines';

      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue(specialValue);

      await redisService.set(specialKey, specialValue);
      const result = await redisService.get(specialKey);

      expect(result).toBe(specialValue);
    });
  });
});
