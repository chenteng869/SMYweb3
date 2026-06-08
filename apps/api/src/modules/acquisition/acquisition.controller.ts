import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AcquisitionService } from './acquisition.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('🎯 AI全球获客')
@Controller('acquisition')
export class AcquisitionController {
  constructor(private svc: AcquisitionService, private audit: AuditService) {}

  // ========== 平台管理 ==========
  @Get('platforms') @ApiOperation({ summary: '平台列表' })
  listPlatforms(@Query() q: any) { return this.svc.findAllPlatforms(q); }

  @Get('platforms/stats') @ApiOperation({ summary: '平台统计' })
  platformStats() { return this.svc.getPlatformStats(); }

  @Get('platforms/:id') @ApiOperation({ summary: '平台详情' })
  getPlatform(@Param('id', ParseIntPipe) id: number) { return this.svc.getPlatform(id); }

  @Post('platforms') @ApiOperation({ summary: '创建平台' })
  async createPlatform(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createPlatform(body);
    await this.audit.log(req, user.id, 'create_platform', 'acquisition', String(r.id), body);
    return r;
  }

  @Put('platforms/:id') @ApiOperation({ summary: '更新平台' })
  async updatePlatform(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.updatePlatform(id, body);
    await this.audit.log(req, user.id, 'update_platform', 'acquisition', String(id), body);
    return r;
  }

  @Delete('platforms/:id') @ApiOperation({ summary: '删除平台' })
  async deletePlatform(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.deletePlatform(id);
    await this.audit.log(req, user.id, 'delete_platform', 'acquisition', String(id));
    return r;
  }

  @Post('platforms/:id/refresh-token') @ApiOperation({ summary: '刷新Token' })
  refreshToken(@Param('id', ParseIntPipe) id: number) { return this.svc.refreshToken(id); }

  @Post('platforms/:id/test-connection') @ApiOperation({ summary: '测试连接' })
  testConnection(@Param('id', ParseIntPipe) id: number) { return this.svc.testConnection(id); }

  // ========== API配置 ==========
  @Get('configs') @ApiOperation({ summary: 'API配置列表' })
  listConfigs(@Query() q: any) { return this.svc.findAllConfigs(q); }

  @Get('configs/:id') @ApiOperation({ summary: 'API配置详情' })
  getConfig(@Param('id', ParseIntPipe) id: number) { return this.svc.getConfig(id); }

  @Post('configs') @ApiOperation({ summary: '创建API配置' })
  createConfig(@Body() body: any) { return this.svc.createConfig(body); }

  @Put('configs/:id') @ApiOperation({ summary: '更新API配置' })
  updateConfig(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.svc.updateConfig(id, body); }

  @Delete('configs/:id') @ApiOperation({ summary: '删除API配置' })
  deleteConfig(@Param('id', ParseIntPipe) id: number) { return this.svc.deleteConfig(id); }

  @Post('configs/:id/verify') @ApiOperation({ summary: '验证配置' })
  verifyConfig(@Param('id', ParseIntPipe) id: number) { return this.svc.verifyConfig(id); }

  // ========== 获客活动(Campaign) ==========
  @Get('campaigns') @ApiOperation({ summary: '活动列表' })
  listCampaigns(@Query() q: any) { return this.svc.findAllCampaigns(q); }

  @Get('campaigns/stats') @ApiOperation({ summary: '活动统计' })
  campaignStats() { return this.svc.getCampaignStats(); }

  @Get('campaigns/:id') @ApiOperation({ summary: '活动详情' })
  getCampaign(@Param('id', ParseIntPipe) id: number) { return this.svc.getCampaign(id); }

  @Post('campaigns') @ApiOperation({ summary: '创建活动' })
  async createCampaign(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createCampaign(body);
    await this.audit.log(req, user.id, 'create_campaign', 'acquisition', String(r.id), body);
    return r;
  }

  @Put('campaigns/:id') @ApiOperation({ summary: '更新活动' })
  async updateCampaign(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.updateCampaign(id, body);
    await this.audit.log(req, user.id, 'update_campaign', 'acquisition', String(id), body);
    return r;
  }

  @Delete('campaigns/:id') @ApiOperation({ summary: '删除活动' })
  async deleteCampaign(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.deleteCampaign(id);
    await this.audit.log(req, user.id, 'delete_campaign', 'acquisition', String(id));
    return r;
  }

  @Put('campaigns/:id/pause') @ApiOperation({ summary: '暂停活动' })
  pauseCampaign(@Param('id', ParseIntPipe) id: number) { return this.svc.pauseCampaign(id); }

  @Put('campaigns/:id/resume') @ApiOperation({ summary: '恢复活动' })
  resumeCampaign(@Param('id', ParseIntPipe) id: number) { return this.svc.resumeCampaign(id); }

  @Post('campaigns/:id/duplicate') @ApiOperation({ summary: '复制活动' })
  duplicateCampaign(@Param('id', ParseIntPipe) id: number) { return this.svc.duplicateCampaign(id); }

  // ========== 内容素材(Content) ==========
  @Get('contents') @ApiOperation({ summary: '内容列表' })
  listContents(@Query() q: any) { return this.svc.findAllContents(q); }

  @Get('contents/stats') @ApiOperation({ summary: '内容统计' })
  contentStats() { return this.svc.getContentStats(); }

  @Get('contents/:id') @ApiOperation({ summary: '内容详情' })
  getContent(@Param('id', ParseIntPipe) id: number) { return this.svc.getContent(id); }

  @Post('contents') @ApiOperation({ summary: '创建内容' })
  createContent(@Body() body: any) { return this.svc.createContent(body); }

  @Put('contents/:id') @ApiOperation({ summary: '更新内容' })
  updateContent(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.svc.updateContent(id, body); }

  @Delete('contents/:id') @ApiOperation({ summary: '删除内容' })
  deleteContent(@Param('id', ParseIntPipe) id: number) { return this.svc.deleteContent(id); }

  @Post('contents/:id/ai-generate') @ApiOperation({ summary: 'AI生成内容' })
  aiGenerateContent(@Param('id', ParseIntPipe) id: number, @Body() body?: any) { return this.svc.aiGenerateContent(id, body?.templateId); }

  @Post('contents/:id/publish') @ApiOperation({ summary: '发布内容' })
  publishContent(@Param('id', ParseIntPipe) id: number) { return this.svc.publishContent(id); }

  @Post('contents/batch-publish') @ApiOperation({ summary: '批量发布' })
  batchPublish(@Body() body: { ids: number[] }) { return this.svc.batchPublish(body.ids); }

  // ========== 线索管理(Lead) ==========
  @Get('leads') @ApiOperation({ summary: '线索列表' })
  listLeads(@Query() q: any) { return this.svc.findAllLeads(q); }

  @Get('leads/stats') @ApiOperation({ summary: '线索统计' })
  leadStats(@Query('stage') stage?: string) { return this.svc.getLeadStats(stage); }

  @Get('leads/my/:assignee') @ApiOperation({ summary: '我的线索' })
  getMyLeads(@Param('assignee') assignee: string) { return this.svc.getMyLeads(assignee); }

  @Get('leads/export') @ApiOperation({ summary: '导出线索' })
  exportLeads(@Query() q: any) { return this.svc.findAllLeads({ ...q, pageSize: 1000 }); }

  @Get('leads/:id') @ApiOperation({ summary: '线索详情' })
  getLead(@Param('id', ParseIntPipe) id: number) { return this.svc.getLead(id); }

  @Post('leads') @ApiOperation({ summary: '创建线索' })
  createLead(@Body() body: any) { return this.svc.createLead(body); }

  @Put('leads/:id') @ApiOperation({ summary: '更新线索' })
  updateLead(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.svc.updateLead(id, body); }

  @Delete('leads/:id') @ApiOperation({ summary: '删除线索' })
  deleteLead(@Param('id', ParseIntPipe) id: number) { return this.svc.deleteLead(id); }

  @Put('leads/:id/assign') @ApiOperation({ summary: '分配线索' })
  assignLead(@Param('id', ParseIntPipe) id: number, @Body() body: { assignee: string }) { return this.svc.assignLead(id, body.assignee); }

  @Put('leads/:id/stage') @ApiOperation({ summary: '变更阶段' })
  changeStage(@Param('id', ParseIntPipe) id: number, @Body() body: { stage: string }) { return this.svc.changeStage(id, body.stage); }

  @Post('leads/:id/ai-score') @ApiOperation({ summary: 'AI评分' })
  aiScoreLead(@Param('id', ParseIntPipe) id: number) { return this.svc.aiScoreLead(id); }

  // ========== 达人管理(Influencer) ==========
  @Get('influencers') @ApiOperation({ summary: '达人列表' })
  listInfluencers(@Query() q: any) { return this.svc.findAllInfluencers(q); }

  @Get('influencers/stats') @ApiOperation({ summary: '达人统计' })
  influencerStats() { return this.svc.getInfluencerStats(); }

  @Get('influencers/:id') @ApiOperation({ summary: '达人详情' })
  getInfluencer(@Param('id', ParseIntPipe) id: number) { return this.svc.getInfluencer(id); }

  @Post('influencers') @ApiOperation({ summary: '创建达人' })
  createInfluencer(@Body() body: any) { return this.svc.createInfluencer(body); }

  @Put('influencers/:id') @ApiOperation({ summary: '更新达人' })
  updateInfluencer(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.svc.updateInfluencer(id, body); }

  @Delete('influencers/:id') @ApiOperation({ summary: '删除达人' })
  deleteInfluencer(@Param('id', ParseIntPipe) id: number) { return this.svc.deleteInfluencer(id); }

  @Post('influencers/:id/sync') @ApiOperation({ summary: '同步达人资料' })
  syncProfile(@Param('id', ParseIntPipe) id: number) { return this.svc.syncProfile(id); }

  @Post('influencers/:id/analyze') @ApiOperation({ summary: 'AI分析达人' })
  analyzeInfluencer(@Param('id', ParseIntPipe) id: number) { return this.svc.analyzeInfluencer(id); }

  @Post('influencers/bulk-import') @ApiOperation({ summary: '批量导入达人' })
  bulkImport(@Body() body: { influencers: any[] }) {
    // 模拟批量导入
    return Promise.all(body.influencers.map((inf: any) => this.svc.createInfluencer(inf)));
  }

  // ========== 自动化任务(Task) ==========
  @Get('tasks') @ApiOperation({ summary: '任务列表' })
  listTasks(@Query() q: any) { return this.svc.findAllTasks(q); }

  @Get('tasks/stats') @ApiOperation({ summary: '任务统计' })
  taskStats() { return this.svc.getTaskStats(); }

  @Get('tasks/:id') @ApiOperation({ summary: '任务详情' })
  getTask(@Param('id', ParseIntPipe) id: number) { return this.svc.getTask(id); }

  @Post('tasks') @ApiOperation({ summary: '创建任务' })
  createTask(@Body() body: any) { return this.svc.createTask(body); }

  @Put('tasks/:id') @ApiOperation({ summary: '更新任务' })
  updateTask(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.svc.updateTask(id, body); }

  @Delete('tasks/:id') @ApiOperation({ summary: '删除任务' })
  deleteTask(@Param('id', ParseIntPipe) id: number) { return this.svc.deleteTask(id); }

  @Post('tasks/:id/execute') @ApiOperation({ summary: '执行任务' })
  executeTask(@Param('id', ParseIntPipe) id: number) { return this.svc.executeTask(id); }

  @Post('tasks/:id/retry') @ApiOperation({ summary: '重试任务' })
  retryTask(@Param('id', ParseIntPipe) id: number) { return this.svc.retryTask(id); }

  @Put('tasks/:id/cancel') @ApiOperation({ summary: '取消任务' })
  cancelTask(@Param('id', ParseIntPipe) id: number) { return this.svc.cancelTask(id); }

  // ========== 报告 & 看板 ==========
  @Get('reports') @ApiOperation({ summary: '报告列表' })
  listReports(@Query() q: any) { return this.svc.findAllReports(q); }

  @Post('reports/generate') @ApiOperation({ summary: '生成报告' })
  generateReport(@Body() body: { platformId?: number; campaignId?: number; type?: string; dateRange?: string }) {
    return this.svc.generateReport(body.platformId, body.campaignId, body.type, body.dateRange);
  }

  @Get('dashboard') @ApiOperation({ summary: '获客看板' })
  dashboard() { return this.svc.getDashboardData(); }

  @Get('dashboard/trend') @ApiOperation({ summary: '趋势数据' })
  trendData(@Query('days', ParseIntPipe) days?: number) { return this.svc.getTrendData(days || 30); }

  @Get('dashboard/comparison') @ApiOperation({ summary: '平台对比' })
  platformComparison() { return this.svc.getPlatformComparison(); }

  @Get('funnels/:campaignId') @ApiOperation({ summary: '漏斗分析' })
  funnelAnalysis(@Param('campaignId', ParseIntPipe) campaignId: number) { return this.svc.getFunnelAnalysis(campaignId); }

  // ========== 消息模板(Template) ==========
  @Get('templates') @ApiOperation({ summary: '模板列表' })
  listTemplates(@Query() q: any) { return this.svc.findAllTemplates(q); }

  @Get('templates/top') @ApiOperation({ summary: '热门模板' })
  topTemplates(@Query('limit', ParseIntPipe) limit?: number) { return this.svc.getTopTemplates(limit || 10); }

  @Get('templates/:id') @ApiOperation({ summary: '模板详情' })
  getTemplate(@Param('id', ParseIntPipe) id: number) { return this.svc.getTemplate(id); }

  @Post('templates') @ApiOperation({ summary: '创建模板' })
  createTemplate(@Body() body: any) { return this.svc.createTemplate(body); }

  @Put('templates/:id') @ApiOperation({ summary: '更新模板' })
  updateTemplate(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.svc.updateTemplate(id, body); }

  @Delete('templates/:id') @ApiOperation({ summary: '删除模板' })
  deleteTemplate(@Param('id', ParseIntPipe) id: number) { return this.svc.deleteTemplate(id); }

  @Post('templates/:id/render') @ApiOperation({ summary: '渲染模板' })
  renderTemplate(@Param('id', ParseIntPipe) id: number, @Body() variables: Record<string, string>) { return this.svc.renderTemplate(id, variables); }

  @Post('templates/:id/fork') @ApiOperation({ summary: '复制模板' })
  forkTemplate(@Param('id', ParseIntPipe) id: number) { return this.svc.forkTemplate(id); }

  // ========== API日志(ApiLog) ==========
  @Get('api-logs') @ApiOperation({ summary: 'API日志列表' })
  listLogs(@Query() q: any) { return this.svc.findAllLogs(q); }

  @Get('api-logs/usage-stats') @ApiOperation({ summary: 'API使用统计' })
  usageStats(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) { return this.svc.getApiUsageStats(dateFrom, dateTo); }

  @Get('api-logs/errors') @ApiOperation({ summary: '错误日志' })
  errorLogs() { return this.svc.getErrorLogs(); }
}
