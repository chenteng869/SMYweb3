import {
  TransformInterceptor,
  SKIP_TRANSFORM_KEY,
  SkipTransform,
} from '@/common/interceptors/transform.interceptor';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;
  let mockReflector: any;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };

    interceptor = new TransformInterceptor(mockReflector as Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createMockContext(): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/api/test' }),
        getResponse: () => ({ statusCode: 200 }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  function createCallHandler(data?: unknown): CallHandler {
    return {
      handle: (): Observable<unknown> => of(data),
    };
  }

  describe('导出检查', () => {
    it('SKIP_TRANSFORM_KEY 应被正确导出', () => {
      expect(SKIP_TRANSFORM_KEY).toBe('skip_transform');
    });

    it('SkipTransform 应为函数类型', () => {
      expect(typeof SkipTransform).toBe('function');
    });
  });

  describe('响应包装', () => {
    it('应将数据包装为标准格式 { success, data, message, timestamp }', (done) => {
      const ctx = createMockContext();
      const handler = createCallHandler({ items: [1, 2, 3] });

      interceptor.intercept(ctx, handler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: { items: [1, 2, 3] },
            message: '操作成功',
            timestamp: expect.any(String),
          });
          expect(new Date((result as any).timestamp).getTime()).not.toBeNaN();
          done();
        },
        error: done.fail,
      });
    });

    it('data 为 null 时应返回 null 而非 undefined', (done) => {
      const ctx = createMockContext();
      const handler = createCallHandler(null);

      interceptor.intercept(ctx, handler).subscribe({
        next: (result) => {
          expect((result as any).data).toBeNull();
          done();
        },
        error: done.fail,
      });
    });

    it('data 为 undefined 时应返回 null', (done) => {
      const ctx = createMockContext();
      const handler = createCallHandler(undefined);

      interceptor.intercept(ctx, handler).subscribe({
        next: (result) => {
          expect((result as any).data).toBeNull();
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('跳过转换', () => {
    it('当标记 @SkipTransform 时应返回原始数据', (done) => {
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const ctx = createMockContext();
      const rawData = { raw: true };
      const handler = createCallHandler(rawData);

      interceptor.intercept(ctx, handler).subscribe({
        next: (result) => {
          expect(result).toEqual(rawData);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('Reflector 调用验证', () => {
    it('应调用 reflector 查询 SKIP_TRANSFORM_KEY 元数据', async () => {
      const ctx = createMockContext();
      const handler = createCallHandler({ data: 'test' });

      await firstValueFrom(interceptor.intercept(ctx, handler));

      expect(mockReflector.getAllAndOverride).toHaveBeenCalled();
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        SKIP_TRANSFORM_KEY,
        expect.arrayContaining([expect.any(Function)])
      );
    });
  });
});
