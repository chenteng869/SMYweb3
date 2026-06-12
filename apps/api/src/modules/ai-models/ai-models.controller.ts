import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AiModelsService } from './ai-models.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';

@ApiTags('🤖 AI 大模型集成')
@Controller('ai-models')
export class AiModelsController {
  constructor(private svc: AiModelsService) {}

  // ==================== Provider 管理 ====================

  @Get('providers')
  @ApiOperation({ summary: 'Provider 列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAllProviders(@Query() q: any) {
    return this.svc.findAllProviders(Number(q.page) || 1, Number(q.pageSize) || 20, q.status);
  }

  @Get('providers/stats')
  @ApiOperation({ summary: 'Provider 统计' })
  getProviderStats() {
    return this.svc.getModelStats();
  }

  @Get('providers/:id')
  @ApiOperation({ summary: 'Provider 详情' })
  getProvider(@Param('id') id: string) {
    return this.svc.getProvider(Number(id));
  }

  @Post('providers')
  @ApiOperation({ summary: '创建 Provider' })
  createProvider(@Body() body: any) {
    return this.svc.createProvider(body);
  }

  @Put('providers/:id')
  @ApiOperation({ summary: '更新 Provider' })
  updateProvider(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateProvider(Number(id), body);
  }

  @Delete('providers/:id')
  @ApiOperation({ summary: '删除 Provider' })
  deleteProvider(@Param('id') id: string) {
    return this.svc.deleteProvider(Number(id));
  }

  // ==================== Model Instance 管理 ====================

  @Get('instances')
  @ApiOperation({ summary: 'Instance 列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'providerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAllInstances(@Query() q: any) {
    return this.svc.findAllInstances(
      Number(q.page) || 1,
      Number(q.pageSize) || 20,
      q.providerId ? Number(q.providerId) : undefined,
      q.status
    );
  }

  @Get('instances/:id')
  @ApiOperation({ summary: 'Instance 详情' })
  getInstance(@Param('id') id: string) {
    return this.svc.getInstance(Number(id));
  }

  @Post('instances')
  @ApiOperation({ summary: '创建 Instance' })
  createInstance(@Body() body: any) {
    return this.svc.createInstance(body.providerId, body);
  }

  @Put('instances/:id')
  @ApiOperation({ summary: '更新 Instance' })
  updateInstance(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateInstance(Number(id), body);
  }

  @Delete('instances/:id')
  @ApiOperation({ summary: '删除 Instance' })
  deleteInstance(@Param('id') id: string) {
    return this.svc.deleteInstance(Number(id));
  }

  @Put('instances/:id/toggle-recommended')
  @ApiOperation({ summary: '切换推荐状态' })
  toggleRecommended(@Param('id') id: string) {
    return this.svc.toggleRecommended(Number(id));
  }

  @Get('instances/stats')
  @ApiOperation({ summary: 'Instance 统计' })
  getInstanceStats() {
    return this.svc.getModelStats();
  }

  // ==================== 智能识别 ====================

  @Get('recognitions')
  @ApiOperation({ summary: '识别配置列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'instanceId', required: false })
  @ApiQuery({ name: 'taskType', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAllRecognitions(@Query() q: any) {
    return this.svc.findAllRecognitions(
      Number(q.page) || 1,
      Number(q.pageSize) || 20,
      q.instanceId ? Number(q.instanceId) : undefined,
      q.taskType,
      q.status
    );
  }

  @Get('recognitions/:id')
  @ApiOperation({ summary: '识别配置详情' })
  getRecognition(@Param('id') id: string) {
    return this.svc.getRecognition(Number(id));
  }

  @Post('recognitions')
  @ApiOperation({ summary: '创建识别配置' })
  createRecognition(@Body() body: any) {
    return this.svc.createRecognition(body);
  }

  @Put('recognitions/:id')
  @ApiOperation({ summary: '更新识别配置' })
  updateRecognition(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateRecognition(Number(id), body);
  }

  @Delete('recognitions/:id')
  @ApiOperation({ summary: '删除识别配置' })
  deleteRecognition(@Param('id') id: string) {
    return this.svc.deleteRecognition(Number(id));
  }

  @Post('recognitions/:id/test')
  @ApiOperation({ summary: '测试识别' })
  testRecognition(@Param('id') id: string, @Body() body: any) {
    return this.svc.testRecognition(Number(id), body);
  }

  @Get('recognitions/by-task/:taskType')
  @ApiOperation({ summary: '按任务类型查询推荐配置' })
  getRecognitionByTask(@Param('taskType') taskType: string) {
    return this.svc.getRecognitionByTask(taskType);
  }

  // ==================== 智能推荐 ====================

  @Get('recommendations')
  @ApiOperation({ summary: '推荐规则列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'instanceId', required: false })
  @ApiQuery({ name: 'scenario', required: false })
  findAllRecommendations(@Query() q: any) {
    return this.svc.findAllRecommendations(
      Number(q.page) || 1,
      Number(q.pageSize) || 20,
      q.instanceId ? Number(q.instanceId) : undefined,
      q.scenario
    );
  }

  @Get('recommendations/:id')
  @ApiOperation({ summary: '推荐规则详情' })
  getRecommendation(@Param('id') id: string) {
    return this.svc.getRecommendation(Number(id));
  }

  @Post('recommendations')
  @ApiOperation({ summary: '创建推荐规则' })
  createRecommendation(@Body() body: any) {
    return this.svc.createRecommendation(body);
  }

  @Put('recommendations/:id')
  @ApiOperation({ summary: '更新推荐规则' })
  updateRecommendation(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateRecommendation(Number(id), body);
  }

  @Delete('recommendations/:id')
  @ApiOperation({ summary: '删除推荐规则' })
  deleteRecommendation(@Param('id') id: string) {
    return this.svc.deleteRecommendation(Number(id));
  }

  @Get('recommendations/best/:scenario')
  @ApiOperation({ summary: '获取某场景最佳推荐' })
  getBestForScenario(@Param('scenario') scenario: string) {
    return this.svc.getBestForScenario(scenario);
  }

  @Get('recommendations/matrix')
  @ApiOperation({ summary: '场景×模型推荐矩阵' })
  getRecommendationMatrix() {
    return this.svc.getRecommendationMatrix();
  }

  // ==================== Prompt 工程 ====================

  @Get('prompts')
  @ApiOperation({ summary: 'Prompt 模板列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'isPublic', required: false })
  findAllPrompts(@Query() q: any) {
    return this.svc.findAllPrompts(
      Number(q.page) || 1,
      Number(q.pageSize) || 20,
      q.category,
      q.isPublic !== undefined ? q.isPublic === 'true' : undefined
    );
  }

  @Get('prompts/stats')
  @ApiOperation({ summary: 'Prompt 统计' })
  getPromptStats() {
    return this.svc.getPromptStats();
  }

  @Get('prompts/:id')
  @ApiOperation({ summary: 'Prompt 详情' })
  getPrompt(@Param('id') id: string) {
    return this.svc.getPrompt(Number(id));
  }

  @Post('prompts')
  @ApiOperation({ summary: '创建 Prompt' })
  createPrompt(@Body() body: any) {
    return this.svc.createPrompt(body);
  }

  @Put('prompts/:id')
  @ApiOperation({ summary: '更新 Prompt' })
  updatePrompt(@Param('id') id: string, @Body() body: any) {
    return this.svc.updatePrompt(Number(id), body);
  }

  @Delete('prompts/:id')
  @ApiOperation({ summary: '删除 Prompt' })
  deletePrompt(@Param('id') id: string) {
    return this.svc.deletePrompt(Number(id));
  }

  @Post('prompts/:id/fork')
  @ApiOperation({ summary: 'Fork 为新版本' })
  forkPrompt(@Param('id') id: string) {
    return this.svc.forkPrompt(Number(id));
  }

  @Post('prompts/:id/render')
  @ApiOperation({ summary: '渲染 Prompt（替换变量）' })
  renderPrompt(@Param('id') id: string, @Body() body: any) {
    return this.svc.renderPrompt(Number(id), body.variables || {});
  }

  // ==================== 成本分析 ====================

  @Get('costs')
  @ApiOperation({ summary: '成本记录列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'providerId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  findAllCostRecords(@Query() q: any) {
    return this.svc.findAllCostRecords(
      Number(q.page) || 1,
      Number(q.pageSize) || 20,
      q.providerId ? Number(q.providerId) : undefined,
      q.dateFrom ? new Date(q.dateFrom) : undefined,
      q.dateTo ? new Date(q.dateTo) : undefined
    );
  }

  @Get('costs/summary')
  @ApiOperation({ summary: '成本汇总' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  getCostSummary(@Query() q: any) {
    return this.svc.getCostSummary(
      q.dateFrom ? new Date(q.dateFrom) : undefined,
      q.dateTo ? new Date(q.dateTo) : undefined
    );
  }

  @Get('costs/trend')
  @ApiOperation({ summary: '成本趋势（每日）' })
  @ApiQuery({ name: 'days', required: false })
  getCostTrend(@Query('days') days?: string) {
    return this.svc.getCostTrend(Number(days) || 30);
  }

  @Get('costs/forecast')
  @ApiOperation({ summary: '成本预测' })
  @ApiQuery({ name: 'months', required: false })
  getCostForecast(@Query('months') months?: string) {
    return this.svc.getCostForecast(Number(months) || 3);
  }

  @Get('costs/top-models')
  @ApiOperation({ summary: '高花费模型排行' })
  @ApiQuery({ name: 'limit', required: false })
  getTopCostModels(@Query('limit') limit?: string) {
    return this.svc.getTopCostModels(Number(limit) || 10);
  }

  @Get('costs/token-stats')
  @ApiOperation({ summary: 'Token 用量统计' })
  getTokenUsageStats() {
    return this.svc.getTokenUsageStats();
  }
}
