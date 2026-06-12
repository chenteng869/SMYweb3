import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature =
      (request.headers['x-webhook-signature'] as string) ||
      (request.headers['x-n8n-signature'] as string);

    // 开发环境跳过签名验证
    if (process.env.NODE_ENV !== 'production' && !process.env.WEBHOOK_SECRET) {
      this.logger.warn('[Webhook] 跳过签名验证（非生产环境且未配置 WEBHOOK_SECRET）');
      return true;
    }

    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error('[Webhook] WEBHOOK_SECRET 未配置');
      throw new UnauthorizedException('Webhook secret not configured');
    }

    if (!signature) {
      this.logger.warn('[Webhook] 请求缺少签名头 x-webhook-signature / x-n8n-signature');
      throw new UnauthorizedException('Missing webhook signature');
    }

    const body = JSON.stringify(request.body);
    const expectedSignature = createHmac('sha256', secret).update(body).digest('hex');

    // 常量时间比较，防止时序攻击
    try {
      const isValid = timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
      if (!isValid) {
        this.logger.warn(`[Webhook] 签名验证失败 from IP: ${request.ip}`);
        throw new UnauthorizedException('Invalid webhook signature');
      }
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      this.logger.error('[Webhook] 签名验证异常', e);
      throw new UnauthorizedException('Signature verification failed');
    }
  }
}
