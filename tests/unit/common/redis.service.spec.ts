import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../../apps/api/src/common/services/redis.service';
import Redis from 'ioredis';

describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: jest.Mocked<Redis>;
  let mockConfigService: Partial<jest.Mocked<ConfigService>>;

  beforeEach(async () => {
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
      ping: jest.fn(),
      scan: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
    } as unknown as jest.Mocked<Redis>;

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const defaults: Record<string, string> = {
          REDIS_KEY_PREFIX: 'smyweb3:',
          REDIS_HOST: 'localhost',
          REDIS_PORT: '6379',
        };
        return defaults[key] ?? defaultValue ?? '';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);

    // 手动设置 mock client（绕过 onModuleInit 中的真实 Redis 连接）
    (service as any).client = mockRedisClient;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return value for existing key', async () => {
      mockRedisClient.get.mockResolvedValue('test-value');
      const result = await service.get('test-key');
      expect(result).toBe('test-value');
      expect(mockRedisClient.get).toHaveBeenCalledWith('smyweb3:test-key');
    });

    it('should return null for non-existing key', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const result = await service.get('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set key without TTL', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      const result = await service.set('key', 'value');
      expect(result).toBe('OK');
      expect(mockRedisClient.set).toHaveBeenCalledWith('smyweb3:key', 'value');
    });

    it('should set key with TTL using setex', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');
      const result = await service.set('key', 'value', 3600);
      expect(result).toBe('OK');
      expect(mockRedisClient.setex).toHaveBeenCalledWith('smyweb3:key', 3600, 'value');
    });
  });

  describe('del', () => {
    it('should delete a key and return count', async () => {
      mockRedisClient.del.mockResolvedValue(1);
      const result = await service.del('key');
      expect(result).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith('smyweb3:key');
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);
      const result = await service.exists('key');
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);
      const result = await service.exists('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('expire', () => {
    it('should set expiration on key', async () => {
      mockRedisClient.expire.mockResolvedValue(1);
      const result = await service.expire('key', 3600);
      expect(result).toBe(true);
    });
  });

  describe('hgetall / hset', () => {
    it('should get all hash fields', async () => {
      const hashData = { field1: 'value1', field2: 'value2' };
      mockRedisClient.hgetall.mockResolvedValue(hashData);
      const result = await service.hgetall('hash-key');
      expect(result).toEqual(hashData);
      expect(mockRedisClient.hgetall).toHaveBeenCalledWith('smyweb3:hash-key');
    });

    it('should set hash field', async () => {
      mockRedisClient.hset.mockResolvedValue(1);
      const result = await service.hset('hash-key', 'field1', 'value1');
      expect(result).toBe(1);
      expect(mockRedisClient.hset).toHaveBeenCalledWith('smyweb3:hash-key', 'field1', 'value1');
    });
  });

  describe('incr', () => {
    it('should increment by 1 using incr', async () => {
      mockRedisClient.incr.mockResolvedValue(1);
      const result = await service.incr('counter');
      expect(result).toBe(1);
      expect(mockRedisClient.incr).toHaveBeenCalledWith('smyweb3:counter');
    });

    it('should increment by custom amount using incrby', async () => {
      mockRedisClient.incrby.mockResolvedValue(5);
      const result = await service.incr('counter', 5);
      expect(result).toBe(5);
      expect(mockRedisClient.incrby).toHaveBeenCalledWith('smyweb3:counter', 5);
    });
  });

  describe('publish (pubsub)', () => {
    it('should publish message to channel', async () => {
      mockRedisClient.publish.mockResolvedValue(1);
      const result = await service.publish('channel', 'message');
      expect(result).toBe(1);
      expect(mockRedisClient.publish).toHaveBeenCalledWith('smyweb3:channel', 'message');
    });
  });

  describe('getJson / setJson', () => {
    it('should parse JSON from getJson', async () => {
      mockRedisClient.get.mockResolvedValue('{"name":"test"}');
      const result = await service.getJson<{ name: string }>('json-key');
      expect(result).toEqual({ name: 'test' });
    });

    it('should return null for invalid JSON in getJson', async () => {
      mockRedisClient.get.mockResolvedValue('not-json');
      const result = await service.getJson('json-key');
      expect(result).toBeNull();
    });

    it('should return null for empty value in getJson', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const result = await service.getJson('json-key');
      expect(result).toBeNull();
    });

    it('should stringify and store JSON in setJson', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      const data = { foo: 'bar' };
      const result = await service.setJson('json-key', data);
      expect(result).toBe('OK');
      expect(mockRedisClient.set).toHaveBeenCalledWith('smyweb3:json-key', JSON.stringify(data));
    });
  });

  describe('healthCheck', () => {
    it('should return ok status when ping succeeds', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');
      const result = await service.healthCheck();
      expect(result.status).toBe('ok');
      expect(typeof result.latencyMs).toBe('number');
    });

    it('should return error status when ping fails', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection refused'));
      const result = await service.healthCheck();
      expect(result.status).toBe('error');
    });
  });

  describe('getKeysByPattern', () => {
    it('should scan keys matching pattern', async () => {
      mockRedisClient.scan
        .mockResolvedValueOnce(['0', ['smyweb3:user:1', 'smyweb3:user:2']])
        .mockResolvedValueOnce(['0', []]);

      const result = await service.getKeysByPattern('user:*');
      expect(result).toEqual(['smyweb3:user:1', 'smyweb3:user:2']);
    });

    it('should handle multiple scan cursors', async () => {
      mockRedisClient.scan
        .mockResolvedValueOnce(['cursor1', ['key1']])
        .mockResolvedValueOnce(['0', ['key2']]);

      const result = await service.getKeysByPattern('*');
      expect(result).toEqual(['key1', 'key2']);
    });
  });
});
