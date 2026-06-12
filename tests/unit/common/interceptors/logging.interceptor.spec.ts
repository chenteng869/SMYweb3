import { Test, TestingModule } from '@nestjs/testing';
import { LoggingInterceptor } from '../../../../apps/api/src/common/interceptors/logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  // 辅助：创建模拟 ExecutionContext
  function createMockContext(overrides?: {
    method?: string;
    url?: string;
    ip?: string;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
    requestId?: string;
  }): ExecutionContext {
    const req: any = {
      method: overrides?.method ?? 'POST',
      originalUrl: overrides?.url ?? '/api/users',
      ip: overrides?.ip ?? '192.168.1.1',
      headers: {
        'user-agent': 'test-agent/1.0',
        'content-type': 'application/json',
        ...overrides?.headers,
      },
      body: overrides?.body ?? {},
    };

    if (overrides?.requestId) {
      req.headers['x-request-id'] = overrides.requestId;
    }

    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({
          statusCode: 200,
          setHeader: jest.fn(),
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  // 辅助：创建模拟 CallHandler
  function createMockCallHandler(response?: unknown, error?: Error): CallHandler {
    return {
      handle: () => (error ? throwError(() => error) : of(response ?? { success: true, data: {} })),
    };
  }

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('X-Request-ID generation', () => {
    it('should generate new request ID when not provided', (done) => {
      const ctx = createMockContext();
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        complete: () => {
          const res = ctx.switchToHttp().getResponse<any>();
          expect(res.setHeader).toHaveBeenCalledWith(
            'x-request-id',
            expect.stringMatching(
              /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
            )
          );
          done();
        },
      });
    });

    it('should use provided X-Request-ID from header', (done) => {
      const ctx = createMockContext({ requestId: 'custom-request-id-123' });
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        complete: () => {
          const res = ctx.switchToHttp().getResponse<any>();
          expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'custom-request-id-123');
          done();
        },
      });
    });
  });

  describe('Request logging', () => {
    it('should log request method and URL', (done) => {
      const spyLog = jest.spyOn(interceptor as any, 'logger', 'get').mockReturnValue({
        log: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      });

      const ctx = createMockContext({ method: 'GET', url: '/api/health' });
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        complete: () => {
          const logger = spyLog.mock.results[0].value;
          expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('GET /api/health'));
          spyLog.mockRestore();
          done();
        },
      });
    });

    it('should include IP address in log', (done) => {
      const spyLog = jest.spyOn(interceptor as any, 'logger', 'get').mockReturnValue({
        log: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      });

      const ctx = createMockContext({ ip: '10.0.0.1' });
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        complete: () => {
          const logger = spyLog.mock.results[0].value;
          expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('IP:10.0.0.1'));
          spyLog.mockRestore();
          done();
        },
      });
    });
  });

  describe('Response logging with timing', () => {
    it('should log response status and duration on success', (done) => {
      const spyLog = jest.spyOn(interceptor as any, 'logger', 'get').mockReturnValue({
        log: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      });

      const ctx = createMockContext();
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        complete: () => {
          const logger = spyLog.mock.results[0].value;
          expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('200'));
          expect(logger.log).toHaveBeenCalledWith(expect.stringMatching(/\d+ms/));
          spyLog.mockRestore();
          done();
        },
      });
    });

    it('should use warn for 4xx/5xx responses', (done) => {
      const spyLog = jest.spyOn(interceptor as any, 'logger', 'get').mockReturnValue({
        log: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      });

      const ctx = createMockContext();
      const res = ctx.switchToHttp().getResponse<any>();
      res.statusCode = 404;

      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        complete: () => {
          const logger = spyLog.mock.results[0].value;
          expect(logger.warn).toHaveBeenCalled();
          spyLog.mockRestore();
          done();
        },
      });
    });
  });

  describe('Error handling', () => {
    it('should log error details and rethrow', (done) => {
      const spyLog = jest.spyOn(interceptor as any, 'logger', 'get').mockReturnValue({
        log: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      });

      const ctx = createMockContext();
      const next = createMockCallHandler(undefined, new Error('Test error'));

      interceptor.intercept(ctx, next).subscribe({
        error: (err) => {
          const logger = spyLog.mock.results[0].value;
          expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Test error'));
          expect(err.message).toBe('Test error');
          spyLog.mockRestore();
          done();
        },
      });
    });
  });

  describe('Password masking (sanitizeBody)', () => {
    it('should mask password field', (done) => {
      const spyLog = jest.spyOn(interceptor as any, 'logger', 'get').mockReturnValue({
        log: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      });

      const ctx = createMockContext({
        body: { username: 'admin', password: 'secret123' },
      });
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        complete: () => {
          const logger = spyLog.mock.results[0].value;
          expect(logger.debug).toHaveBeenCalledWith(expect.not.stringContaining('secret123'));
          expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('***'));
          spyLog.mockRestore();
          done();
        },
      });
    });

    it('should mask token field', (done) => {
      const spyLog = jest.spyOn(interceptor as any, 'logger', 'get').mockReturnValue({
        log: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      });

      const ctx = createMockContext({
        body: { access_token: 'eyJhbGciOi' },
      });
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        complete: () => {
          const logger = spyLog.mock.results[0].value;
          expect(logger.debug).toHaveBeenCalledWith(expect.not.stringContaining('eyJhbGciOi'));
          spyLog.mockRestore();
          done();
        },
      });
    });

    it('should mask secret_key field', (done) => {
      const spyLog = jest.spyOn(interceptor as any, 'logger', 'get').mockReturnValue({
        log: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      });

      const ctx = createMockContext({
        body: { name: 'test', secret_key: 'sk-live-12345' },
      });
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        complete: () => {
          const logger = spyLog.mock.results[0].value;
          expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('***'));
          spyLog.mockRestore();
          done();
        },
      });
    });

    it('should not mask normal fields', (done) => {
      const spyLog = jest.spyOn(interceptor as any, 'logger', 'get').mockReturnValue({
        log: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      });

      const ctx = createMockContext({
        body: { name: 'John Doe', email: 'john@example.com' },
      });
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        complete: () => {
          const logger = spyLog.mock.results[0].value;
          expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('John Doe'));
          spyLog.mockRestore();
          done();
        },
      });
    });

    it('should handle empty body gracefully', (done) => {
      const spyLog = jest.spyOn(interceptor as any, 'logger', 'get').mockReturnValue({
        log: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      });

      const ctx = createMockContext({ body: {} });
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        complete: () => {
          const logger = spyLog.mock.results[0].value;
          // Should not call debug for empty body
          expect(logger.debug).not.toHaveBeenCalled();
          spyLog.mockRestore();
          done();
        },
      });
    });
  });
});
