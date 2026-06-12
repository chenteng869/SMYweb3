import { Test, TestingModule } from '@nestjs/testing';
import { Reflector, SetMetadata } from '@nestjs/common';
import {
  TransformInterceptor,
  SkipTransform,
  SKIP_TRANSFORM_KEY,
} from '../../../../apps/api/src/common/interceptors/transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;
  let mockReflector: Partial<jest.Mocked<Reflector>>;

  // 辅助：创建模拟 ExecutionContext
  function createMockContext(handlerMeta?: boolean, classMeta?: boolean): ExecutionContext {
    const handler = jest.fn();
    const cls = class TestClass {};

    return {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
      getHandler: () => handler,
      getClass: () => cls,
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformInterceptor, { provide: Reflector, useValue: mockReflector }],
    }).compile();

    interceptor = module.get<TransformInterceptor<any>>(TransformInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('Response transformation', () => {
    it('should wrap response in standard format with success=true', (done) => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);

      const ctx = createMockContext();
      const next: CallHandler = { handle: () => of({ id: 1, name: 'test' }) };

      interceptor.intercept(ctx, next).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: { id: 1, name: 'test' },
            message: '操作成功',
            timestamp: expect.any(String),
          });
          // 验证 timestamp 是有效的 ISO 格式
          expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
          done();
        },
      });
    });

    it('should set data to null when response is undefined', (done) => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);

      const ctx = createMockContext();
      const next: CallHandler = { handle: () => of(undefined) };

      interceptor.intercept(ctx, next).subscribe({
        next: (result) => {
          expect(result.data).toBeNull();
          expect(result.success).toBe(true);
          done();
        },
      });
    });

    it('should preserve data when response is already null', (done) => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);

      const ctx = createMockContext();
      const next: CallHandler = { handle: () => of(null) };

      interceptor.intercept(ctx, next).subscribe({
        next: (result) => {
          expect(result.data).toBeNull();
          done();
        },
      });
    });

    it('should wrap array responses correctly', (done) => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);

      const ctx = createMockContext();
      const next: CallHandler = { handle: () => of([{ id: 1 }, { id: 2 }]) };

      interceptor.intercept(ctx, next).subscribe({
        next: (result) => {
          expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
          expect(result.message).toBe('操作成功');
          done();
        },
      });
    });

    it('should wrap string responses correctly', (done) => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);

      const ctx = createMockContext();
      const next: CallHandler = { handle: () => of('simple string') };

      interceptor.intercept(ctx, next).subscribe({
        next: (result) => {
          expect(result.data).toBe('simple string');
          expect(result.success).toBe(true);
          done();
        },
      });
    });

    it('should include ISO timestamp format', (done) => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);

      const beforeCall = new Date().toISOString();
      const ctx = createMockContext();
      const next: CallHandler = { handle: () => of({}) };

      interceptor.intercept(ctx, next).subscribe({
        next: (result) => {
          const timestampDate = new Date(result.timestamp);
          expect(timestampDate.getTime()).toBeGreaterThanOrEqual(new Date(beforeCall).getTime());
          done();
        },
      });
    });
  });

  describe('@SkipTransform bypass', () => {
    it('should bypass transformation when @SkipTransform is set on handler', (done) => {
      mockReflector.getAllAndOverride!.mockReturnValue(true);

      const ctx = createMockContext();
      const rawData = { raw: 'data', notWrapped: true };
      const next: CallHandler = { handle: () => of(rawData) };

      interceptor.intercept(ctx, next).subscribe({
        next: (result) => {
          // 应该返回原始数据，不包装
          expect(result).toEqual(rawData);
          expect(result).not.toHaveProperty('success');
          expect(result).not.toHaveProperty('message');
          expect(result).not.toHaveProperty('timestamp');
          done();
        },
      });
    });

    it('should bypass transformation when @SkipTransform is set on class', (done) => {
      mockReflector.getAllAndOverride!.mockReturnValue(true);

      const ctx = createMockContext();
      const next: CallHandler = { handle: () => of({ status: 'ok' }) };

      interceptor.intercept(ctx, next).subscribe({
        next: (result) => {
          expect(result).toEqual({ status: 'ok' });
          done();
        },
      });
    });

    it('should call reflector with correct metadata key', (done) => {
      mockReflector.getAllAndOverride!.mockReturnValue(true);

      const ctx = createMockContext();
      const next: CallHandler = { handle: () => of({}) };

      interceptor.intercept(ctx, next).subscribe({
        complete: () => {
          expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_TRANSFORM_KEY, [
            expect.any(Function),
            expect.any(Function),
          ]);
          done();
        },
      });
    });
  });

  describe('Message consistency', () => {
    it('should always use "操作成功" message for successful responses', (done) => {
      mockReflector.getAllAndOverride!.mockReturnValue(false);

      const ctx = createMockContext();
      const next: CallHandler = { handle: () => of({}) };

      interceptor.intercept(ctx, next).subscribe({
        next: (result) => {
          expect(result.message).toBe('操作成功');
          done();
        },
      });
    });
  });
});
