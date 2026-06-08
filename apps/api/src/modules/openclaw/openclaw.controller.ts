import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OpenClawService } from './openclaw.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('🦞 OpenClaw 智能体')
@Controller('openclaw')
export class OpenClawController {
  constructor(private svc: OpenClawService, private audit: AuditService) {}

  // ========== 智能体编排 ==========

  @Get('agents')
  @ApiOperation({ summary: '智能体列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAllAgents(@Query() q: any) {
    return this.svc.findAllAgents(q);
  }

  @Get('agents/stats')
  @ApiOperation({ summary: '智能体统计' })
  getAgentStats() {
    return this.svc.getAgentStats();
  }

  @Get('agents/:id')
  @ApiOperation({ summary: '智能体详情' })
  getAgent(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getAgent(id);
  }

  @Post('agents')
  @ApiOperation({ summary: '创建智能体' })
  async createAgent(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createAgent(body);
    // TODO: 审计日志 - 创建智能体
    await this.audit.log(req, user.id, 'create_openclaw_agent', 'openclaw', String(r.id), body);
    return r;
  }

  @Put('agents/:id')
  @ApiOperation({ summary: '更新智能体' })
  async updateAgent(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.updateAgent(id, body);
    // TODO: 审计日志 - 更新智能体
    await this.audit.log(req, user.id, 'update_openclaw_agent', 'openclaw', String(id), body);
    return r;
  }

  @Delete('agents/:id')
  @ApiOperation({ summary: '删除智能体' })
  async deleteAgent(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.deleteAgent(id);
    // TODO: 审计日志 - 删除智能体
    await this.audit.log(req, user.id, 'delete_openclaw_agent', 'openclaw', String(id));
    return r;
  }

  // ========== 市场管理 ==========

  @Get('marketplace')
  @ApiOperation({ summary: '市场列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAllMarketItems(@Query() q: any) {
    return this.svc.findAllMarketItems(q);
  }

  @Get('marketplace/stats')
  @ApiOperation({ summary: '市场统计' })
  getMarketStats() {
    return this.svc.getMarketStats();
  }

  @Get('marketplace/:id')
  @ApiOperation({ summary: '市场项详情' })
  getMarketItem(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getMarketItem(id);
  }

  @Post('marketplace')
  @ApiOperation({ summary: '创建市场项' })
  async createMarketItem(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createMarketItem(body);
    // TODO: 审计日志 - 创建市场项
    await this.audit.log(req, user.id, 'create_market_item', 'openclaw', String(r.id), body);
    return r;
  }

  @Put('marketplace/:id')
  @ApiOperation({ summary: '更新市场项' })
  async updateMarketItem(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.updateMarketItem(id, body);
    // TODO: 审计日志 - 更新市场项
    await this.audit.log(req, user.id, 'update_market_item', 'openclaw', String(id), body);
    return r;
  }

  @Delete('marketplace/:id')
  @ApiOperation({ summary: '删除市场项' })
  async deleteMarketItem(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.deleteMarketItem(id);
    // TODO: 审计日志 - 删除市场项
    await this.audit.log(req, user.id, 'delete_market_item', 'openclaw', String(id));
    return r;
  }

  // ========== 训练微调 ==========

  @Get('fine-tunes')
  @ApiOperation({ summary: '微调任务列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAllFineTunes(@Query() q: any) {
    return this.svc.findAllFineTunes(q);
  }

  @Get('fine-tunes/:id')
  @ApiOperation({ summary: '微调任务详情' })
  getFineTune(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getFineTune(id);
  }

  @Post('fine-tunes')
  @ApiOperation({ summary: '创建微调任务' })
  async createFineTune(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createFineTune(body);
    // TODO: 审计日志 - 创建微调任务
    await this.audit.log(req, user.id, 'create_finetune', 'openclaw', String(r.id), body);
    return r;
  }

  @Put('fine-tunes/:id')
  @ApiOperation({ summary: '更新微调任务' })
  async updateFineTune(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.updateFineTune(id, body);
    // TODO: 审计日志 - 更新微调任务
    await this.audit.log(req, user.id, 'update_finetune', 'openclaw', String(id), body);
    return r;
  }

  @Delete('fine-tunes/:id')
  @ApiOperation({ summary: '删除微调任务' })
  async deleteFineTune(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.deleteFineTune(id);
    // TODO: 审计日志 - 删除微调任务
    await this.audit.log(req, user.id, 'delete_finetune', 'openclaw', String(id));
    return r;
  }

  // ========== 监控大屏 ==========

  @Get('monitor/logs')
  @ApiOperation({ summary: '监控日志列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  findMonitorLogs(@Query() q: any) {
    return this.svc.findMonitorLogs(q);
  }

  @Get('monitor/stats')
  @ApiOperation({ summary: '监控统计' })
  @ApiQuery({ name: 'agentId', required: false })
  getMonitorStats(@Query('agentId') agentId?: string) {
    return this.svc.getMonitorStats(agentId ? Number(agentId) : undefined);
  }

  @Get('monitor/dashboard')
  @ApiOperation({ summary: '监控大屏数据' })
  getMonitorDashboard() {
    return this.svc.getMonitorDashboard();
  }
}
