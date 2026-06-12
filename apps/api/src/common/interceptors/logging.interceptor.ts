import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * 请求日志拦截器
 * - 自动生成请求 ID (X-Request-ID)
 * - 记录请求方法、URL、IP、耗时
 * - 请求体脱敏（password/token/secret 等字段）
 * - 响应状态码记录
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const start = Date.now();

    // 生成请求 ID（优先使用传入的，否则生成新的）
    const requestId = req.headers['x-request-id'] || this.generateRequestId();
    res.setHeader('X-Request-ID', requestId);

    // 基础请求信息
    const { method, originalUrl, ip, headers } = req;
    const contentType = headers['content-type'] || '';

    // 脱敏后的请求体
    const sanitizedBody = this.sanitizeBody(req.body);

    this.logger.log(
      `[${requestId}] → ${method} ${originalUrl} | IP:${ip} | Content-Type:${contentType}`
    );

    if (Object.keys(sanitizedBody).length > 0) {
      this.logger.debug(`[${requestId}]   Body: ${JSON.stringify(sanitizedBody)}`);
    }

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        const logFn = statusCode >= 400 ? 'warn' : 'log';
        this.logger[logFn](
          `[${requestId}] ← ${method} ${originalUrl} | ${statusCode} | ${duration}ms`
        );
      }),
      catchError((err) => {
        const duration = Date.now() - start;
        this.logger.error(
          `[${requestId}] ✗ ${method} ${originalUrl} | ${err.status || 500} | ${duration}ms | ${err.message}`
        );
        throw err;
      })
    );
  }

  /** 生成 UUID v4 风格的请求 ID */
  private generateRequestId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /** 敏感字段脱敏 */
  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body || typeof body !== 'object') return {};

    const sensitiveFields = [
      'password',
      'passwd',
      'pwd',
      'token',
      'access_token',
      'refresh_token',
      'api_key',
      'apiKey',
      'secret',
      'secret_key',
      'secretKey',
      'authorization',
      'credential',
      'card_number',
      'cardNumber',
      'cvv',
      'ssn',
      'idNumber',
    ];

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some((f) => lowerKey.includes(f.toLowerCase()))) {
        sanitized[key] = '***';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeBody(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
