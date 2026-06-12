import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma.service';
import { Public } from '../../common/guards/jwt-auth.guard';
import { WebhookSignatureGuard } from '../../common/guards/webhook-signature.guard';
import { Logger } from '@nestjs/common';

/**
 * DID n8n Webhook 端点
 *
 * 安全机制：
 * 1. HMAC-SHA256 签名验证（WebhookSignatureGuard）
 *    - 开发环境：未配置 WEBHOOK_SECRET 时自动跳过（方便本地调试）
 *    - 生产环境：必须配置 WEBHOOK_SECRET，否则拒绝所有请求
 *    - 使用 timingSafeEqual 防止时序攻击
 * 2. IP 白名单建议：生产环境应在反向代理层限制来源 IP 为 n8n 服务器
 *
 * 调用方签名生成方式：
 *   signature = HMAC-SHA256(WEBHOOK_SECRET, JSON.stringify(requestBody))
 *   Header: x-webhook-signature: <signature>
 */
@ApiTags('🔄 DID n8n Webhooks')
@Controller('did/webhooks')
@UseGuards(WebhookSignatureGuard)
export class DidN8nWebhooksController {
  private readonly logger = new Logger(DidN8nWebhooksController.name);

  constructor(private prisma: PrismaService) {}

  @Public()
  @Post('did-created')
  @HttpCode(200)
  @ApiOperation({ summary: 'DID创建时触发：初始化权限/发送通知' })
  async onDidCreated(
    @Body() body: { didId: number; userId: number; did: string },
    @Req() req: any
  ) {
    this.logger.log(`[Webhook] DID_CREATED from IP: ${req.ip}, didId: ${body.didId}`);
    return { success: true, event: 'DID_CREATED', did: body.did, status: 'webhook_received' };
  }

  @Public()
  @Post('kyc-verified')
  @HttpCode(200)
  @ApiOperation({ summary: 'KYC通过时触发：签发SBT/更新状态' })
  async onKycVerified(
    @Body() body: { didId: number; userId: number; kycRecordId: number },
    @Req() req: any
  ) {
    this.logger.log(`[Webhook] KYC_VERIFIED from IP: ${req.ip}, didId: ${body.didId}`);
    return { success: true, event: 'KYC_VERIFIED', didId: body.didId, status: 'webhook_received' };
  }

  /**
   * ⚠️ 安全说明：风控告警不再自动冻结 DID！
   * 原因：自动冻结存在误冻风险，生产环境必须经过人工审批流程。
   * 当前行为：仅记录告警日志，冻结操作需管理员在后台手动审批执行。
   * 审批流程入口：POST /did/bpm/did-freeze (需 JwtAuthGuard)
   */
  @Public()
  @Post('risk-alert')
  @HttpCode(200)
  @ApiOperation({ summary: '风控告警触发：记录日志/通知管理员（不自动冻结）' })
  async onRiskAlert(
    @Body() body: { didId: number; riskLevel: string; reason: string },
    @Req() req: any
  ) {
    this.logger.warn(
      `[Webhook] RISK_ALERT from IP: ${req.ip}, didId: ${body.didId}, ` +
        `level: ${body.riskLevel}, reason: ${body.reason}`
    );
    // 不再自动冻结 — 仅记录告警，等待人工审批
    return {
      success: true,
      event: 'RISK_ALERT',
      didId: body.didId,
      action: 'logged_for_review',
      message: '风险告警已记录，请管理员审批后手动处理',
    };
  }

  @Public()
  @Post('should-issue-sbt')
  @HttpCode(200)
  @ApiOperation({ summary: '条件满足时触发：自动签发SBT凭证' })
  async onShouldIssueSbt(
    @Body() body: { didId: number; userId: number; walletAddress: string; credentialType: string },
    @Req() req: any
  ) {
    this.logger.log(`[Webhook] SHOULD_ISSUE_SBT from IP: ${req.ip}, type: ${body.credentialType}`);
    return {
      success: true,
      event: 'SHOULD_ISSUE_SBT',
      credentialType: body.credentialType,
      status: 'pending_decision',
    };
  }
}
