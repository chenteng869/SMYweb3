import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Reflector } from '@nestjs/core';

/** 跳过包装的装饰器标记 */
export const SKIP_TRANSFORM_KEY = 'skip_transform';
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
import { SetMetadata } from '@nestjs/common';

/**
 * 响应格式标准化拦截器
 * 统一返回格式: { success: boolean, data: any, message: string, timestamp: string }
 *
 * 使用方式:
 * - 全局注册后自动包装所有响应
 * - 用 @SkipTransform() 跳过特定接口的包装（如 Swagger UI、健康检查）
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  { success: boolean; data: T; message: string; timestamp: string }
> {
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<{ success: boolean; data: T; message: string; timestamp: string }> {
    // 检查是否跳过转换（如 /swagger, /health 等端点）
    const skipTransform = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipTransform) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: data ?? null,
        message: '操作成功',
        timestamp: new Date().toISOString(),
      }))
    );
  }
}

/** 标准错误响应格式（供 ExceptionFilter 参考） */
export interface StandardErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path: string;
  requestId?: string;
}
