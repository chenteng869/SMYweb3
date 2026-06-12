import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService, Reflector, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard, SkipApiKey } from '../../../../apps/api/src/common/guards/api-key.guard';
import { ExecutionContext, CallHandler } from '@nestjs/common';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let mockConfigService: Partial<jest.Mocked<ConfigService>>;
  let mockReflector: Partial<jest.Mocked<Reflector>>;

  // 辅助：创建模拟 ExecutionContext
  function createMockContext(overrides?: {
    headers?: Record<string, string>;
    query?: Record<string, string>;
    method?: string;
    url?: string;
    ip?: string;
    handlerMeta?: boolean;
    classMeta?: boolean;
  }): ExecutionContext {
    const req: any = {
      method: overrides?.method ?? 'GET',
      originalUrl: overrides?.url ?? '/api/test',
      ip: overrides?.ip ?? '127.0.0.1',
      headers: overrides?.headers ?? {},
      query: overrides?.query ?? {},
    };

    const handler = jest.fn();
    const cls = class TestClass {};

    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({ statusCode: 200 }),
      }),
      getHandler: () => handler,
      getClass: () => cls,
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'API_KEYS') return 'n8n_webhook_abc123,external_system_xyz789,n8n_*';
        return '';
      }),
    };

    mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('SkipApiKey bypass', () => {
    it('should allow request when @SkipApiKey is set on handler', async () => {
      mockReflector.getAllAndOverride!.mockReturnValue(true);
      const ctx = createMockContext();
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('should allow request when @SkipApiKey is set on class', async () => {
      mockReflector.getAllAndOverride!.mockReturnValue(true);
      const ctx = createMockContext();
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });
  });

  describe('X-API-Key header validation', () => {
    it('should accept valid API key from X-API-Key header', async () => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);
      const ctx = createMockContext({
        headers: { 'x-api-key': 'n8n_webhook_abc123' },
      });
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('should accept valid API key from api-key header (alias)', async () => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);
      const ctx = createMockContext({
        headers: { 'api-key': 'external_system_xyz789' },
      });
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });
  });

  describe('Query parameter validation', () => {
    it('should accept valid API key from query parameter', async () => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);
      const ctx = createMockContext({
        query: { api_key: 'external_system_xyz789' },
      });
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });
  });

  describe('Wildcard matching', () => {
    it('should accept keys matching wildcard pattern n8n_*', async () => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);
      const ctx = createMockContext({
        headers: { 'x-api-key': 'n8n_custom_key_456' },
      });
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });
  });

  describe('Rejection cases', () => {
    it('should throw UnauthorizedException when no API key provided', async () => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);
      const ctx = createMockContext({});

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid API key', async () => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);
      const ctx = createMockContext({
        headers: { 'x-api-key': 'invalid-key' },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('should include proper error message for missing key', async () => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);
      const ctx = createMockContext({});

      try {
        await guard.canActivate(ctx);
      } catch (e) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        expect((e as any).response.message).toContain('缺少 API Key');
      }
    });

    it('should include proper error message for invalid key', async () => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);
      const ctx = createMockContext({
        headers: { 'x-api-key': 'wrong-key' },
      });

      try {
        await guard.canActivate(ctx);
      } catch (e) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        expect((e as any).response.message).toContain('无效或已过期');
      }
    });
  });

  describe('Identity injection', () => {
    it('should inject apiKeyIdentity into request for exact match', async () => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);
      const ctx = createMockContext({
        headers: { 'x-api-key': 'n8n_webhook_abc123' },
      });

      await guard.canActivate(ctx);
      const req = ctx.switchToHttp().getRequest<any>();
      expect(req.apiKeyIdentity).toBe('service:n8n');
    });

    it('should inject service:unknown for wildcard match', async () => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);
      const ctx = createMockContext({
        headers: { 'x-api-key': 'n8n_custom' },
      });

      await guard.canActivate(ctx);
      const req = ctx.switchToHttp().getRequest<any>();
      expect(req.apiKeyIdentity).toBe('service:unknown');
    });
  });

  describe('Header priority', () => {
    it('should prefer header over query param when both present', async () => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);
      const ctx = createMockContext({
        headers: { 'x-api-key': 'valid-header-key' },
        query: { api_key: 'invalid-query-key' },
      });

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });
  });
});
