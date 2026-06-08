import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { N8nService } from './n8n.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('⚡ N8N 工作流')
@Controller('n8n')
export class N8nController {
  constructor(private svc: N8nService, private audit: AuditService) {}

  // ========== 工作流编辑器 ==========

  @Get('workflows')
  @ApiOperation({ summary: '工作流列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'tag', required: false })
  findAllWorkflows(@Query() q: any) {
    return this.svc.findAllWorkflows(q);
  }

  @Get('workflows/stats')
  @ApiOperation({ summary: '工作流统计' })
  getWorkflowStats() {
    return this.svc.getWorkflowStats();
  }

  @Get('workflows/:id')
  @ApiOperation({ summary: '工作流详情' })
  getWorkflow(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getWorkflow(id);
  }

  @Post('workflows')
  @ApiOperation({ summary: '创建工作流' })
  async createWorkflow(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createWorkflow(body);
    // TODO: 审计日志 - 创建工作流
    await this.audit.log(req, user.id, 'create_workflow', 'n8n', String(r.id), body);
    return r;
  }

  @Put('workflows/:id')
  @ApiOperation({ summary: '更新工作流' })
  async updateWorkflow(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.updateWorkflow(id, body);
    // TODO: 审计日志 - 更新工作流
    await this.audit.log(req, user.id, 'update_workflow', 'n8n', String(id), body);
    return r;
  }

  @Delete('workflows/:id')
  @ApiOperation({ summary: '删除工作流' })
  async deleteWorkflow(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.deleteWorkflow(id);
    // TODO: 审计日志 - 删除工作流
    await this.audit.log(req, user.id, 'delete_workflow', 'n8n', String(id));
    return r;
  }

  @Post('workflows/:id/duplicate')
  @ApiOperation({ summary: '复制工作流' })
  async duplicateWorkflow(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.duplicateWorkflow(id);
    // TODO: 审计日志 - 复制工作流
    await this.audit.log(req, user.id, 'duplicate_workflow', 'n8n', String(id), { sourceId: id, newId: r.id });
    return r;
  }

  // ========== 触发器管理 ==========

  @Get('triggers')
  @ApiOperation({ summary: '触发器列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'workflowId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  findAllTriggers(@Query() q: any) {
    return this.svc.findAllTriggers(q);
  }

  @Get('triggers/:id')
  @ApiOperation({ summary: '触发器详情' })
  getTrigger(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getTrigger(id);
  }

  @Post('triggers')
  @ApiOperation({ summary: '创建触发器' })
  async createTrigger(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createTrigger(body);
    // TODO: 审计日志 - 创建触发器
    await this.audit.log(req, user.id, 'create_trigger', 'n8n', String(r.id), body);
    return r;
  }

  @Put('triggers/:id')
  @ApiOperation({ summary: '更新触发器' })
  async updateTrigger(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.updateTrigger(id, body);
    // TODO: 审计日志 - 更新触发器
    await this.audit.log(req, user.id, 'update_trigger', 'n8n', String(id), body);
    return r;
  }

  @Delete('triggers/:id')
  @ApiOperation({ summary: '删除触发器' })
  async deleteTrigger(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.deleteTrigger(id);
    // TODO: 审计日志 - 删除触发器
    await this.audit.log(req, user.id, 'delete_trigger', 'n8n', String(id));
    return r;
  }

  @Put('triggers/:id/toggle')
  @ApiOperation({ summary: '切换触发器状态' })
  async toggleTrigger(@Param('id', ParseIntPipe) id: number, @Body('isActive') isActive: boolean, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.toggleTrigger(id, isActive);
    // TODO: 审计日志 - 切换触发器
    await this.audit.log(req, user.id, 'toggle_trigger', 'n8n', String(id), { isActive });
    return r;
  }

  @Post('triggers/:id/test')
  @ApiOperation({ summary: '测试触发器' })
  testTrigger(@Param('id', ParseIntPipe) id: number) {
    return this.svc.testTrigger(id);
  }

  // ========== 执行历史 ==========

  @Get('executions')
  @ApiOperation({ summary: '执行历史列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'workflowId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  findAllExecutions(@Query() q: any) {
    return this.svc.findAllExecutions(q);
  }

  @Get('executions/:id')
  @ApiOperation({ summary: '执行详情' })
  getExecution(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getExecution(id);
  }

  @Put('executions/:id/cancel')
  @ApiOperation({ summary: '取消执行' })
  async cancelExecution(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.cancelExecution(id);
    // TODO: 审计日志 - 取消执行
    await this.audit.log(req, user.id, 'cancel_execution', 'n8n', String(id));
    return r;
  }

  @Post('executions/:id/retry')
  @ApiOperation({ summary: '重试执行' })
  async retryExecution(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.retryExecution(id);
    // TODO: 审计日志 - 重试执行
    await this.audit.log(req, user.id, 'retry_execution', 'n8n', String(id), { newExecutionId: r.id });
    return r;
  }

  @Get('executions/stats')
  @ApiOperation({ summary: '执行统计' })
  @ApiQuery({ name: 'workflowId', required: false })
  getExecutionStats(@Query('workflowId') workflowId?: string) {
    return this.svc.getExecutionStats(workflowId ? Number(workflowId) : undefined);
  }

  // ========== 模板市场 ==========

  @Get('templates')
  @ApiOperation({ summary: '模板列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'difficulty', required: false })
  @ApiQuery({ name: 'isOfficial', required: false })
  findAllTemplates(@Query() q: any) {
    return this.svc.findAllTemplates(q);
  }

  @Get('templates/stats')
  @ApiOperation({ summary: '模板统计' })
  getTemplateStats() {
    return this.svc.getTemplateStats();
  }

  @Get('templates/:id')
  @ApiOperation({ summary: '模板详情' })
  getTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getTemplate(id);
  }

  @Post('templates')
  @ApiOperation({ summary: '创建模板' })
  async createTemplate(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createTemplate(body);
    // TODO: 审计日志 - 创建模板
    await this.audit.log(req, user.id, 'create_template', 'n8n', String(r.id), body);
    return r;
  }

  @Put('templates/:id')
  @ApiOperation({ summary: '更新模板' })
  async updateTemplate(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.updateTemplate(id, body);
    // TODO: 审计日志 - 更新模板
    await this.audit.log(req, user.id, 'update_template', 'n8n', String(id), body);
    return r;
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: '删除模板' })
  async deleteTemplate(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.deleteTemplate(id);
    // TODO: 审计日志 - 删除模板
    await this.audit.log(req, user.id, 'delete_template', 'n8n', String(id));
    return r;
  }

  @Post('templates/:id/install')
  @ApiOperation({ summary: '安装模板为工作流' })
  async installTemplate(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.installTemplate(id);
    // TODO: 审计日志 - 安装模板
    await this.audit.log(req, user.id, 'install_template', 'n8n', String(id), { templateId: id, newWorkflowId: r.id });
    return r;
  }
}
