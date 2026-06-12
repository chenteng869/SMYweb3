import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { N8nIntegrationService } from './n8n.service';
import { TriggerWorkflowDto, WebhookCallbackDto, DeployWorkflowDto } from './dto/n8n.dto';

/**
 * n8n 工作流集成控制器
 *
 * 提供 SMYweb3 与外部 n8n 工作流自动化平台之间的 RESTful 接口，
 * 包括工作流管理、Webhook 回调接收、执行监控和手动触发等功能。
 */
@ApiTags('🔗 N8N 工作流集成')
@Controller('n8n-integration')
export class N8nIntegrationController {
  constructor(private readonly svc: N8nIntegrationService) {}

  // ==================== 工作流管理 ====================

  /**
   * 获取 n8n 中所有工作流列表
   */
  @Get('workflows')
  @ApiOperation({ summary: '列出 n8n 所有工作流' })
  async listWorkflows() {
    return this.svc.listWorkflows();
  }

  /**
   * 部署预置模板工作流到 n8n
   */
  @Post('workflows/deploy')
  @ApiOperation({
    summary: '部署一个模板工作流到 n8n',
    description: '从6个预置业务模板中选择一个部署到 n8n 平台',
  })
  @ApiBody({ type: DeployWorkflowDto })
  async deployWorkflow(@Body() dto: DeployWorkflowDto) {
    const workflow = await this.svc.deployTemplate(dto.templateType, dto.overrides);
    if (dto.autoActivate !== false && (workflow as any)?.id) {
      await this.svc.activateWorkflow(String((workflow as any).id));
    }
    return {
      success: true,
      message: `模板 "${dto.templateType}" 部署成功`,
      workflow,
    };
  }

  // ==================== Webhook ====================

  /**
   * 接收来自 n8n 的 Webhook 回调
   * 支持动态路径，用于处理不同类型的回调事件
   */
  @Post('webhook/:path(*)')
  @HttpCode(200)
  @ApiOperation({
    summary: '接收 n8n Webhook 回调',
    description: '通用 webhook 端点，处理 n8n 发送的各类回调通知',
  })
  async handleWebhook(
    @Param('path') path: string,
    @Body() body: WebhookCallbackDto,
    @Req() req: any
  ) {
    return this.svc.handleIncomingWebhook(path, body, req.headers);
  }

  // ==================== 执行监控 ====================

  /**
   * 获取 n8n 执行记录
   */
  @Get('executions')
  @ApiOperation({ summary: '获取工作流执行记录列表' })
  async getExecutions(@Query('workflowId') workflowId?: string, @Query('limit') limit?: string) {
    return this.svc.getExecutions(workflowId, limit ? Number(limit) : undefined);
  }

  // ==================== 健康检查 ====================

  /**
   * 检查与 n8n 服务的连接状态
   */
  @Get('health')
  @ApiOperation({
    summary: 'n8n 连接健康检查',
    description: '验证与外部 n8n 服务的连接状态、版本及活跃工作流数量',
  })
  async healthCheck() {
    return this.svc.healthCheck();
  }

  // ==================== 手动触发 ====================

  /**
   * 手动触发指定类型的工作流执行
   */
  @Post('trigger')
  @ApiOperation({ summary: '手动触发工作流', description: '根据模板类型手动触发一次工作流执行' })
  @ApiBody({ type: TriggerWorkflowDto })
  async triggerWorkflow(@Body() dto: TriggerWorkflowDto) {
    const workflow = await this.svc.deployTemplate(dto.templateType, dto.payload);

    if ((workflow as any)?.id) {
      await this.svc.activateWorkflow(String((workflow as any).id));
      // 通过 webhook 触发实际执行
      const result = await this.svc.triggerWebhook(
        `/trigger/${(workflow as any).id}`,
        dto.payload || {}
      );
      return {
        success: true,
        message: `工作流 "${dto.templateType}" 已触发`,
        workflowId: (workflow as any).id,
        executionResult: result,
      };
    }

    return {
      success: false,
      message: '工作流创建失败，无法触发',
    };
  }
}
