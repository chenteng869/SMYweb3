import { ApiKeyGuard, SkipApiKey } from '../../../../src/common/guards/api-key.guard';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let mockConfigService: any;
  let mockReflector: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'API_KEYS') return 'n8n_webhook_abc123,test_key_xyz789';
        return '';
      }),
    };

    mockReflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };

    guard = new ApiKeyGuard(mockConfigService as ConfigService, mockReflector as Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createMockContext(overrides?: {
    headerApiKey?: string;
    queryApiKey?: string;
    skipMetadata?: boolean;
  }): ExecutionContext {
    const headers: Record<string, string> = {};
    if (overrides?.headerApiKey !== undefined) {
      headers['x-api-key'] = overrides.headerApiKey;
    }
    if (overrides?.queryApiKey !== undefined) {
      // query will be accessed via request.query
    }

    const request = {
      method: 'POST',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      headers,
      query: overrides?.queryApiKey ? { api_key: overrides.queryApiKey } : {},
      body: {},
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ statusCode: 200, setHeader: jest.fn() }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  describe('SkipApiKey 装饰器导出', () => {
    it('SkipApiKey 应该被正确导出', () => {
      expect(typeof SkipApiKey).toBe('function');
    });
  });

  describe('canActivate - 跳过验证', () => {
    it('当标记 @SkipApiKey 时应直接放行', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const ctx = createMockContext();
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });
  });

  describe('canActivate - Header API Key 验证', () => {
    it('通过 X-API-Key Header 提供有效 Key 应放行', async () => {
      const ctx = createMockContext({ headerApiKey: 'n8n_webhook_abc123' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('通过 x-api-key 小写 Header 也应放行', async () => {
      const ctx = createMockContext({ headerApiKey: 'test_key_xyz789' });
      // Set lowercase api-key header
      const req = ctx.switchToHttp().getRequest();
      req.headers['x-api-key'] = undefined;
      req.headers['api-key'] = 'test_key_xyz789';

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });
  });

  describe('canActivate - Query API Key 验证', () => {
    it('通过 query 参数 api_key 提供有效 Key 应放行', async () => {
      const ctx = createMockContext({ queryApiKey: 'n8n_webhook_abc123' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });
  });

  describe('canActivate - 无效/缺失 Key', () => {
    it('缺少 API Key 应抛出 UnauthorizedException', async () => {
      const ctx = createMockContext();

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('无效的 API Key 应抛出 UnauthorizedException', async () => {
      const ctx = createMockContext({ headerApiKey: 'invalid_key' });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('canActivate - 身份注入', () => {
    it('验证通过后应将 apiKeyIdentity 注入 request', async () => {
      const ctx = createMockContext({ headerApiKey: 'n8n_webhook_abc123' });

      await guard.canActivate(ctx);

      const req = ctx.switchToHttp().getRequest();
      expect(req['apiKeyIdentity']).toBe('service:n8n');
    });
  });

  describe('构造函数 - 配置加载', () => {
    it('应从环境变量加载合法 Key 列表', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('API_KEYS', '');
    });
  });
});
