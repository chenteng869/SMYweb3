import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AiTvService } from './ai-tv.service';

@ApiTags('📺 AI电视新闻')
@Controller('ai-tv')
export class AiTvController {
  constructor(private readonly aiTvService: AiTvService) {}

  // ========== 数字人 ==========
  @Get('humans')
  @ApiOperation({ summary: '获取数字人列表', description: '分页查询所有数字人主播' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'gender', required: false })
  async findAllHumans(@Query() query: any) {
    return this.aiTvService.findAllHumans(query);
  }

  @Get('humans/stats')
  @ApiOperation({ summary: '数字人统计' })
  async getHumanStats() {
    return this.aiTvService.getHumanStats();
  }

  @Get('humans/:id')
  @ApiOperation({ summary: '获取数字人详情' })
  @ApiParam({ name: 'id', type: Number })
  async getHuman(@Param('id') id: number) {
    return this.aiTvService.getHuman(id);
  }

  @Post('humans')
  @ApiOperation({ summary: '创建数字人' })
  async createHuman(@Body() data: any) {
    return this.aiTvService.createHuman(data);
  }

  @Put('humans/:id')
  @ApiOperation({ summary: '更新数字人' })
  @ApiParam({ name: 'id', type: Number })
  async updateHuman(@Param('id') id: number, @Body() data: any) {
    return this.aiTvService.updateHuman(id, data);
  }

  @Delete('humans/:id')
  @ApiOperation({ summary: '删除数字人' })
  @ApiParam({ name: 'id', type: Number })
  async deleteHuman(@Param('id') id: number) {
    return this.aiTvService.deleteHuman(id);
  }

  // ========== 资讯源 ==========
  @Get('sources')
  @ApiOperation({ summary: '获取资讯源列表', description: '分页查询所有资讯采集源' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'sourceType', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  async findAllSources(@Query() query: any) {
    return this.aiTvService.findAllSources(query);
  }

  @Get('sources/stats')
  @ApiOperation({ summary: '资讯源统计' })
  async getSourceStats() {
    return this.aiTvService.getSourceStats();
  }

  @Get('sources/:id')
  @ApiOperation({ summary: '获取资讯源详情' })
  @ApiParam({ name: 'id', type: Number })
  async getSource(@Param('id') id: number) {
    return this.aiTvService.getSource(id);
  }

  @Post('sources')
  @ApiOperation({ summary: '创建资讯源' })
  async createSource(@Body() data: any) {
    return this.aiTvService.createSource(data);
  }

  @Put('sources/:id')
  @ApiOperation({ summary: '更新资讯源' })
  @ApiParam({ name: 'id', type: Number })
  async updateSource(@Param('id') id: number, @Body() data: any) {
    return this.aiTvService.updateSource(id, data);
  }

  @Delete('sources/:id')
  @ApiOperation({ summary: '删除资讯源' })
  @ApiParam({ name: 'id', type: Number })
  async deleteSource(@Param('id') id: number) {
    return this.aiTvService.deleteSource(id);
  }

  @Post('sources/:id/fetch')
  @ApiOperation({ summary: '触发单次抓取', description: '手动触发指定资讯源的抓取任务' })
  @ApiParam({ name: 'id', type: Number })
  async triggerFetch(@Param('id') id: number) {
    return this.aiTvService.triggerFetch(id);
  }

  // ========== 稿件 ==========
  @Get('articles')
  @ApiOperation({ summary: '获取稿件列表', description: '分页查询所有新闻稿件' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'sourceId', required: false })
  async findAllArticles(@Query() query: any) {
    return this.aiTvService.findAllArticles(query);
  }

  @Get('articles/stats')
  @ApiOperation({ summary: '稿件统计' })
  async getArticleStats() {
    return this.aiTvService.getArticleStats();
  }

  @Get('articles/:id')
  @ApiOperation({ summary: '获取稿件详情' })
  @ApiParam({ name: 'id', type: Number })
  async getArticle(@Param('id') id: number) {
    return this.aiTvService.getArticle(id);
  }

  @Post('articles')
  @ApiOperation({ summary: '创建稿件' })
  async createArticle(@Body() data: any) {
    return this.aiTvService.createArticle(data);
  }

  @Put('articles/:id')
  @ApiOperation({ summary: '更新稿件' })
  @ApiParam({ name: 'id', type: Number })
  async updateArticle(@Param('id') id: number, @Body() data: any) {
    return this.aiTvService.updateArticle(id, data);
  }

  @Delete('articles/:id')
  @ApiOperation({ summary: '删除稿件' })
  @ApiParam({ name: 'id', type: Number })
  async deleteArticle(@Param('id') id: number) {
    return this.aiTvService.deleteArticle(id);
  }

  @Put('articles/:id/approve')
  @ApiOperation({ summary: '审核通过稿件' })
  @ApiParam({ name: 'id', type: Number })
  async approveArticle(@Param('id') id: number) {
    return this.aiTvService.approveArticle(id);
  }

  @Put('articles/:id/reject')
  @ApiOperation({ summary: '驳回稿件' })
  @ApiParam({ name: 'id', type: Number })
  async rejectArticle(@Param('id') id: number) {
    return this.aiTvService.rejectArticle(id);
  }

  @Post('articles/:id/rewrite')
  @ApiOperation({ summary: 'AI改写稿件', description: '调用AI模型将原文改写为口播稿风格' })
  @ApiParam({ name: 'id', type: Number })
  async aiRewrite(@Param('id') id: number, @Body() body?: { text?: string }) {
    return this.aiTvService.aiRewrite(id);
  }

  // ========== 排班 ==========
  @Get('schedules')
  @ApiOperation({ summary: '获取排班列表', description: '分页查询节目排班' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'programSlot', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAllSchedules(@Query() query: any) {
    return this.aiTvService.findAllSchedules(query);
  }

  @Get('schedules/today')
  @ApiOperation({ summary: '今日排班', description: '获取今日所有时段的排班安排' })
  async getTodaySchedule() {
    return this.aiTvService.getTodaySchedule();
  }

  @Get('schedules/stats')
  @ApiOperation({ summary: '排班统计' })
  async getScheduleStats() {
    return this.aiTvService.getScheduleStats();
  }

  @Get('schedules/:id')
  @ApiOperation({ summary: '获取排班详情' })
  @ApiParam({ name: 'id', type: Number })
  async getSchedule(@Param('id') id: number) {
    return this.aiTvService.getSchedule(id);
  }

  @Post('schedules')
  @ApiOperation({ summary: '创建排班' })
  async createSchedule(@Body() data: any) {
    return this.aiTvService.createSchedule(data);
  }

  @Put('schedules/:id')
  @ApiOperation({ summary: '更新排班' })
  @ApiParam({ name: 'id', type: Number })
  async updateSchedule(@Param('id') id: number, @Body() data: any) {
    return this.aiTvService.updateSchedule(id, data);
  }

  @Delete('schedules/:id')
  @ApiOperation({ summary: '删除排班' })
  @ApiParam({ name: 'id', type: Number })
  async deleteSchedule(@Param('id') id: number) {
    return this.aiTvService.deleteSchedule(id);
  }

  @Put('schedules/reorder')
  @ApiOperation({ summary: '重排序排班', description: '批量调整同一时段内稿件的播出顺序' })
  async reorderSchedules(@Body() body: { scheduledFor: string; orderIds: number[] }) {
    return this.aiTvService.reorderSchedules(body.scheduledFor, body.orderIds);
  }

  // ========== TTS语音 ==========
  @Get('tts-configs')
  @ApiOperation({ summary: '获取TTS配置列表', description: '分页查询所有TTS语音配置' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'engine', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAllTtsConfigs(@Query() query: any) {
    return this.aiTvService.findAllTtsConfigs(query);
  }

  @Get('tts-configs/stats')
  @ApiOperation({ summary: 'TTS配置统计' })
  async getTtsStats() {
    return this.aiTvService.getTtsStats();
  }

  @Get('tts-configs/:id')
  @ApiOperation({ summary: '获取TTS配置详情' })
  @ApiParam({ name: 'id', type: Number })
  async getTtsConfig(@Param('id') id: number) {
    return this.aiTvService.getTtsConfig(id);
  }

  @Post('tts-configs')
  @ApiOperation({ summary: '创建TTS配置' })
  async createTtsConfig(@Body() data: any) {
    return this.aiTvService.createTtsConfig(data);
  }

  @Put('tts-configs/:id')
  @ApiOperation({ summary: '更新TTS配置' })
  @ApiParam({ name: 'id', type: Number })
  async updateTtsConfig(@Param('id') id: number, @Body() data: any) {
    return this.aiTvService.updateTtsConfig(id, data);
  }

  @Delete('tts-configs/:id')
  @ApiOperation({ summary: '删除TTS配置' })
  @ApiParam({ name: 'id', type: Number })
  async deleteTtsConfig(@Param('id') id: number) {
    return this.aiTvService.deleteTtsConfig(id);
  }

  @Post('tts-configs/:id/test')
  @ApiOperation({ summary: '试听TTS音色', description: '生成指定文本的试听音频' })
  @ApiParam({ name: 'id', type: Number })
  async testTts(@Param('id') id: number, @Body() body: { text: string }) {
    return this.aiTvService.testTts(id, body.text || '这是一段测试文本，用于验证TTS音色效果。');
  }

  // ========== 推流管理 ==========
  @Get('pushes')
  @ApiOperation({ summary: '获取推流列表', description: '分页查询所有推流通道' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  async findAllPushes(@Query() query: any) {
    return this.aiTvService.findAllPushes(query);
  }

  @Get('pushes/stats')
  @ApiOperation({ summary: '推流统计' })
  async getPushStats() {
    return this.aiTvService.getPushStats();
  }

  @Get('pushes/:id')
  @ApiOperation({ summary: '获取推流详情' })
  @ApiParam({ name: 'id', type: Number })
  async getPush(@Param('id') id: number) {
    return this.aiTvService.getPush(id);
  }

  @Post('pushes')
  @ApiOperation({ summary: '创建推流通道' })
  async createPush(@Body() data: any) {
    return this.aiTvService.createPush(data);
  }

  @Put('pushes/:id')
  @ApiOperation({ summary: '更新推流通道' })
  @ApiParam({ name: 'id', type: Number })
  async updatePush(@Param('id') id: number, @Body() data: any) {
    return this.aiTvService.updatePush(id, data);
  }

  @Delete('pushes/:id')
  @ApiOperation({ summary: '删除推流通道' })
  @ApiParam({ name: 'id', type: Number })
  async deletePush(@Param('id') id: number) {
    return this.aiTvService.deletePush(id);
  }

  @Post('pushes/:id/start')
  @ApiOperation({ summary: '启动推流', description: '开始向目标平台推送直播流' })
  @ApiParam({ name: 'id', type: Number })
  async startPush(@Param('id') id: number) {
    return this.aiTvService.startPush(id);
  }

  @Post('pushes/:id/stop')
  @ApiOperation({ summary: '停止推流' })
  @ApiParam({ name: 'id', type: Number })
  async stopPush(@Param('id') id: number) {
    return this.aiTvService.stopPush(id);
  }

  @Post('pushes/:id/restart')
  @ApiOperation({ summary: '重启推流', description: '先停止再启动推流' })
  @ApiParam({ name: 'id', type: Number })
  async restartPush(@Param('id') id: number) {
    return this.aiTvService.restartPush(id);
  }

  // ========== 媒资库 ==========
  @Get('media-assets')
  @ApiOperation({ summary: '获取媒资列表', description: '分页查询所有媒体素材' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'assetType', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAllAssets(@Query() query: any) {
    return this.aiTvService.findAllAssets(query);
  }

  @Get('media-assets/stats')
  @ApiOperation({ summary: '媒资统计' })
  async getAssetStats() {
    return this.aiTvService.getAssetStats();
  }

  @Get('media-assets/:id')
  @ApiOperation({ summary: '获取媒资详情' })
  @ApiParam({ name: 'id', type: Number })
  async getAsset(@Param('id') id: number) {
    return this.aiTvService.getAsset(id);
  }

  @Post('media-assets')
  @ApiOperation({ summary: '上传媒资素材' })
  async createAsset(@Body() data: any) {
    return this.aiTvService.createAsset(data);
  }

  @Put('media-assets/:id')
  @ApiOperation({ summary: '更新媒资素材' })
  @ApiParam({ name: 'id', type: Number })
  async updateAsset(@Param('id') id: number, @Body() data: any) {
    return this.aiTvService.updateAsset(id, data);
  }

  @Delete('media-assets/:id')
  @ApiOperation({ summary: '删除媒资素材' })
  @ApiParam({ name: 'id', type: Number })
  async deleteAsset(@Param('id') id: number) {
    return this.aiTvService.deleteAsset(id);
  }

  // ========== 播出日志与数据看板 ==========
  @Get('broadcast-logs')
  @ApiOperation({ summary: '获取播出日志列表', description: '分页查询历史播出记录' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async findAllLogs(@Query() query: any) {
    return this.aiTvService.findAllLogs(query);
  }

  @Get('broadcast-logs/:id')
  @ApiOperation({ summary: '获取播出日志详情' })
  @ApiParam({ name: 'id', type: Number })
  async getLog(@Param('id') id: number) {
    return this.aiTvService.getLog(id);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'AI电视数据看板', description: '获取今日核心指标和统计数据' })
  async getDashboard() {
    return this.aiTvService.getDashboard();
  }

  @Get('dashboard/trend')
  @ApiOperation({
    summary: '播出趋势(近N天)',
    description: '获取最近N天的播出量、时长、观看数据趋势',
  })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getBroadcastTrend(@Query('days') days?: string) {
    return this.aiTvService.getBroadcastTrend(Number(days) || 7);
  }

  @Get('dashboard/human-performance')
  @ApiOperation({ summary: '数字人表现分析', description: '获取指定数字人的播出表现数据' })
  @ApiQuery({ name: 'humanId', type: Number })
  async getHumanPerformance(@Query('humanId') humanId: string) {
    return this.aiTvService.getHumanPerformance(Number(humanId));
  }

  @Get('dashboard/content-stats')
  @ApiOperation({ summary: '内容统计分析', description: '按分类、状态、优先级统计稿件分布' })
  async getContentStats() {
    return this.aiTvService.getContentStats();
  }
}
