import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 手动触发工作流请求 DTO
 */
export class TriggerWorkflowDto {
  @ApiProperty({
    description: '模板类型标识',
    enum: [
      'acquisition_sync',
      'content_generation',
      'evidence_batch',
      'kyc_review',
      'alert_notification',
      'report_scheduled',
    ],
    example: 'acquisition_sync',
  })
  @IsString()
  templateType: string;

  @ApiPropertyOptional({
    description: '自定义载荷数据，将合并到模板中',
    example: { source: 'manual', priority: 'high' },
  })
  @IsOptional()
  @IsObject()
  payload?: object;

  @ApiPropertyOptional({ description: '执行选项配置', example: { timeout: 60000, retryCount: 3 } })
  @IsOptional()
  @IsObject()
  options?: object;
}

/**
 * Webhook 回调动态 DTO
 * n8n 回调的 payload 结构不固定，使用 Record 接收任意字段
 */
export class WebhookCallbackDto implements Record<string, any> {
  [key: string]: any;

  constructor(data?: Partial<WebhookCallbackDto>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}

/**
 * 部署工作流请求 DTO
 */
export class DeployWorkflowDto {
  @ApiProperty({
    description: '要部署的模板类型',
    enum: [
      'acquisition_sync',
      'content_generation',
      'evidence_batch',
      'kyc_review',
      'alert_notification',
      'report_scheduled',
    ],
    example: 'kyc_review',
  })
  @IsString()
  templateType: string;

  @ApiPropertyOptional({ description: '模板覆盖参数', example: { name: '自定义 KYC 审核流程' } })
  @IsOptional()
  @IsObject()
  overrides?: object;

  @ApiPropertyOptional({ description: '是否在部署后自动激活', default: true })
  @IsOptional()
  autoActivate?: boolean;
}
