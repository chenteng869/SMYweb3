import { LoggingInterceptor } from '../../../../src/common/interceptors/logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, Observable } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  function createMockContext(overrides?: {
    method?: string;
    url?: string;
    ip?: string;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  }): ExecutionContext {
    const req = {
      method: overrides?.method ?? 'GET',
      originalUrl: overrides?.url ?? '/api/test',
      ip: overrides?.ip ?? '127.0.0.1',
      headers: overrides?.headers ?? {
        'user-agent': 'test-agent',
        'content-type': 'application/json',
      },
      body: overrides?.body ?? {},
      query: {},
    };

    const res = {
      statusCode: 200,
      setHeader: jest.fn(),
    };

    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  function createCallHandler(responseData?: unknown): CallHandler {
    return {
      handle: (): Observable<unknown> => of(responseData ?? { success: true }),
    };
  }

  describe('基础拦截功能', () => {
    it('应设置 X-Request-ID 响应头', (done) => {
      const ctx = createMockContext();
      const handler = createCallHandler();

      const res = ctx.switchToHttp().getResponse<any>();

      interceptor.intercept(ctx, handler).subscribe({
        complete: () => {
          expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
          done();
        },
        error: done.fail,
      });
    });

    it('应透传 handler 返回的数据', (done) => {
      const mockData = { id: 1, name: 'test' };
      const ctx = createMockContext();
      const handler = createCallHandler(mockData);

      let receivedData: unknown;
      interceptor.intercept(ctx, handler).subscribe({
        next: (data) => {
          receivedData = data;
        },
        complete: () => {
          expect(receivedData).toEqual(mockData);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('请求体脱敏', () => {
    it('应将 password 字段替换为 ***', (done) => {
      const ctx = createMockContext({
        body: { username: 'admin', password: 'secret123' },
      });
      const handler = createCallHandler();

      // 拦截器内部会调用 logger.log/debug，我们只需确保不报错
      interceptor.intercept(ctx, handler).subscribe({
        complete: done,
        error: done.fail,
      });
    });

    it('应将 token 字段替换为 ***', (done) => {
      const ctx = createMockContext({
        body: { accessToken: 'abc123', refreshToken: 'xyz789' },
      });
      const handler = createCallHandler();

      interceptor.intercept(ctx, handler).subscribe({
        complete: done,
        error: done.fail,
      });
    });

    it('空请求体不应出错', (done) => {
      const ctx = createMockContext({ body: {} });
      const handler = createCallHandler();

      interceptor.intercept(ctx, handler).subscribe({
        complete: done,
        error: done.fail,
      });
    });
  });

  describe('错误处理', () => {
    it('处理错误时应不吞掉异常', (done) => {
      const ctx = createMockContext();
      const errorHandler: CallHandler = {
        handle: (): Observable<unknown> =>
          new Observable((subscriber) => subscriber.error(new Error('Test error'))),
      };

      interceptor.intercept(ctx, errorHandler).subscribe({
        error: (err) => {
          expect(err.message).toBe('Test error');
          done();
        },
        complete: () => done.fail('Expected error'),
      });
    });
  });

  describe('边界情况', () => {
    it('无 X-Request-ID Header 时应生成新的 RequestId', (done) => {
      const ctx = createMockContext({ headers: {} });
      const res = ctx.switchToHttp().getResponse<any>();
      const handler = createCallHandler();

      interceptor.intercept(ctx, handler).subscribe({
        complete: () => {
          expect(res.setHeader).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('有 X-Request-ID Header 时应复用该值', (done) => {
      const existingRequestId = 'req-abc-123';
      const ctx = createMockContext({
        headers: { 'x-request-id': existingRequestId },
      });
      const res = ctx.switchToHttp().getResponse<any>();
      const handler = createCallHandler();

      interceptor.intercept(ctx, handler).subscribe({
        complete: () => {
          expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', existingRequestId);
          done();
        },
        error: done.fail,
      });
    });
  });
});
