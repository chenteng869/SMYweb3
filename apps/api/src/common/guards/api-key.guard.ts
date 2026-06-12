import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { isMatch } from 'micromatch';

/** 跳过 API Key 验证的元数据 Key */
const SKIP_API_KEY = 'skip_api_key';
export const SkipApiKey = () => SetMetadata(SKIP_API_KEY, true);

/**
 * API Key 鉴权 Guard
 * 用于 n8n 回调、外部系统集成等非 JWT 场景
 *
 * 工作流程:
 * 1. 检查请求头 X-API-Key 或 query 参数 api_key
 * 2. 与配置的合法 API Key 列表比对
 * 3. 支持通配符匹配（如 n8n_* 匹配所有 n8n 开头的 key）
 *
 * 使用方式:
 *   @UseGuards(ApiKeyGuard)
 *   @Controller('webhooks')
 *   export class WebhookController { ... }
 *
 * 配置环境变量:
 *   API_KEYS=n8n_webhook_abc123,external_system_xyz789
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private validKeys: string[] = [];

  constructor(
    private configService: ConfigService,
    private reflector: Reflector
  ) {
    this.loadValidKeys();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查是否跳过验证
    const skipApiKey = this.reflector.getAllAndOverride<boolean>(SKIP_API_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipApiKey) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      this.logger.warn(
        `Missing API Key for ${request.method} ${request.originalUrl} from ${request.ip}`
      );
      throw new UnauthorizedException({
        success: false,
        message: '缺少 API Key，请在请求头 X-API-Key 中提供',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      });
    }

    if (!this.validateApiKey(apiKey)) {
      this.logger.warn(
        `Invalid API Key for ${request.method} ${request.originalUrl} from ${request.ip}`
      );
      throw new UnauthorizedException({
        success: false,
        message: 'API Key 无效或已过期',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      });
    }

    // 将 API Key 身份注入 request（供后续使用）
    request['apiKeyIdentity'] = this.resolveIdentity(apiKey);

    return true;
  }

  /** 从 Header 或 Query 提取 API Key */
  private extractApiKey(request: Request): string | undefined {
    // 优先从 Header 获取
    const headerKey =
      (request.headers['x-api-key'] as string) || (request.headers['api-key'] as string);
    if (headerKey) return headerKey;

    // 其次从 Query 参数获取
    const queryKey = request.query.api_key as string;
    if (queryKey) return queryKey;

    return undefined;
  }

  /** 验证 API Key 是否合法（支持通配符） */
  private validateApiKey(apiKey: string): boolean {
    return this.validKeys.some((pattern) => isMatch(apiKey, pattern));
  }

  /** 根据 API Key 解析调用方身份标识 */
  private resolveIdentity(apiKey: string): string {
    const exactMatch = this.validKeys.find((k) => k === apiKey);
    if (exactMatch) {
      // 从 key 前缀推断来源（如 n8n_xxx → 来源: n8n）
      const prefix = exactMatch.split('_')[0];
      return `service:${prefix}`;
    }
    return 'service:unknown';
  }

  /** 从环境变量加载合法 Key 列表 */
  private loadValidKeys(): void {
    const keysStr = this.configService.get<string>('API_KEYS', '');
    this.validKeys = keysStr
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    if (this.validKeys.length > 0) {
      this.logger.log(`Loaded ${this.validKeys.length} API Key pattern(s)`);
    } else {
      this.logger.warn('No API Keys configured — ApiKeyGuard will reject all requests');
    }
  }
}
