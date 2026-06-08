import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LiveService } from './live.service';

@ApiTags('📺 直播管理')
@Controller('live')
export class LiveController {
  constructor(private svc: LiveService) {}

  // ==================== 平台配置 ====================

  @Get('platforms') @ApiOperation({ summary: '平台列表' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'pageSize', required: false }) @ApiQuery({ name: 'type', required: false }) @ApiQuery({ name: 'status', required: false })
  findAllPlatforms(@Query() q: any) { return this.svc.findAllPlatforms(Number(q.page) || 1, Number(q.pageSize) || 20, q.type, q.status); }

  @Get('platforms/:id') @ApiOperation({ summary: '平台详情' })
  getPlatform(@Param('id') id: string) { return this.svc.getPlatform(Number(id)); }

  @Post('platforms') @ApiOperation({ summary: '创建平台' })
  createPlatform(@Body() body: any) { return this.svc.createPlatform(body); }

  @Put('platforms/:id') @ApiOperation({ summary: '更新平台' })
  updatePlatform(@Param('id') id: string, @Body() body: any) { return this.svc.updatePlatform(Number(id), body); }

  @Delete('platforms/:id') @ApiOperation({ summary: '删除平台' })
  deletePlatform(@Param('id') id: string) { return this.svc.deletePlatform(Number(id)); }

  // ==================== 直播间管理 ====================

  @Get('rooms') @ApiOperation({ summary: '直播间列表' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'pageSize', required: false }) @ApiQuery({ name: 'platformId', required: false }) @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'category', required: false })
  findAllRooms(@Query() q: any) { return this.svc.findAllRooms(Number(q.page) || 1, Number(q.pageSize) || 20, q.platformId ? Number(q.platformId) : undefined, q.status, q.category); }

  @Get('rooms/stats') @ApiOperation({ summary: '直播间统计' })
  getRoomStats() { return this.svc.getRoomStats(); }

  @Get('rooms/:id') @ApiOperation({ summary: '直播间详情' })
  getRoom(@Param('id') id: string) { return this.svc.getRoom(Number(id)); }

  @Post('rooms') @ApiOperation({ summary: '创建直播间' })
  createRoom(@Body() body: any) { return this.svc.createRoom(body); }

  @Put('rooms/:id') @ApiOperation({ summary: '更新直播间' })
  updateRoom(@Param('id') id: string, @Body() body: any) { return this.svc.updateRoom(Number(id), body); }

  @Delete('rooms/:id') @ApiOperation({ summary: '删除直播间' })
  deleteRoom(@Param('id') id: string) { return this.svc.deleteRoom(Number(id)); }

  @Post('rooms/:id/start') @ApiOperation({ summary: '开始直播' })
  startLive(@Param('id') id: string) { return this.svc.startLive(Number(id)); }

  @Post('rooms/:id/end') @ApiOperation({ summary: '结束直播' })
  endLive(@Param('id') id: string) { return this.svc.endLive(Number(id)); }

  // ==================== 直播记录 ====================

  @Get('streams') @ApiOperation({ summary: '直播记录列表' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'pageSize', required: false }) @ApiQuery({ name: 'roomId', required: false }) @ApiQuery({ name: 'platformId', required: false }) @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'dateFrom', required: false }) @ApiQuery({ name: 'dateTo', required: false })
  findAllStreams(@Query() q: any) { return this.svc.findAllStreams(Number(q.page) || 1, Number(q.pageSize) || 20, q.roomId ? Number(q.roomId) : undefined, q.platformId ? Number(q.platformId) : undefined, q.status, q.dateFrom, q.dateTo); }

  @Get('streams/:id') @ApiOperation({ summary: '直播记录详情' })
  getStream(@Param('id') id: string) { return this.svc.getStream(Number(id)); }

  @Get('streams/stats') @ApiOperation({ summary: '直播统计' })
  @ApiQuery({ name: 'platformId', required: false }) @ApiQuery({ name: 'days', required: false })
  getStreamStats(@Query('platformId') platformId?: string, @Query('days') days?: string) { return this.svc.getStreamStats(platformId ? Number(platformId) : undefined, Number(days) || 7); }

  // ==================== 排期管理 ====================

  @Get('schedules') @ApiOperation({ summary: '排期列表' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'pageSize', required: false }) @ApiQuery({ name: 'roomId', required: false }) @ApiQuery({ name: 'status', required: false })
  findAllSchedules(@Query() q: any) { return this.svc.findAllSchedules(Number(q.page) || 1, Number(q.pageSize) || 20, q.roomId ? Number(q.roomId) : undefined, q.status); }

  @Post('schedules') @ApiOperation({ summary: '创建排期' })
  createSchedule(@Body() body: any) { return this.svc.createSchedule(body); }

  @Put('schedules/:id') @ApiOperation({ summary: '更新排期' })
  updateSchedule(@Param('id') id: string, @Body() body: any) { return this.svc.updateSchedule(Number(id), body); }

  @Delete('schedules/:id') @ApiOperation({ summary: '删除排期' })
  deleteSchedule(@Param('id') id: string) { return this.svc.deleteSchedule(Number(id)); }

  @Get('schedules/today') @ApiOperation({ summary: '今日排期' })
  getSchedulesToday() { return this.svc.getSchedulesToday(); }

  // ==================== 弹幕评论 ====================

  @Get('comments') @ApiOperation({ summary: '弹幕评论列表' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'pageSize', required: false }) @ApiQuery({ name: 'roomId', required: false }) @ApiQuery({ name: 'commentType', required: false }) @ApiQuery({ name: 'dateFrom', required: false }) @ApiQuery({ name: 'dateTo', required: false })
  findComments(@Query() q: any) { return this.svc.findComments(Number(q.page) || 1, Number(q.pageSize) || 20, q.roomId ? Number(q.roomId) : undefined, q.commentType, q.dateFrom, q.dateTo); }

  @Delete('comments/:id') @ApiOperation({ summary: '删除评论' })
  deleteComment(@Param('id') id: string) { return this.svc.deleteComment(Number(id)); }

  @Put('comments/:id/pin') @ApiOperation({ summary: '置顶/取消置顶评论' })
  pinComment(@Param('id') id: string) { return this.svc.pinComment(Number(id)); }

  @Get('comments/stats') @ApiOperation({ summary: '评论统计' })
  @ApiQuery({ name: 'roomId', required: false })
  getCommentStats(@Query('roomId') roomId?: string) { return this.svc.getCommentStats(roomId ? Number(roomId) : undefined); }

  // ==================== 数据看板 ====================

  @Get('dashboard') @ApiOperation({ summary: '数据看板概览' })
  getDashboardData() { return this.svc.getDashboardData(); }

  @Get('dashboard/platforms') @ApiOperation({ summary: '平台对比数据' })
  @ApiQuery({ name: 'days', required: false })
  getPlatformComparison(@Query('days') days?: string) { return this.svc.getPlatformComparison(Number(days) || 30); }

  @Get('dashboard/trend') @ApiOperation({ summary: '趋势数据' })
  @ApiQuery({ name: 'days', required: false })
  getTrendData(@Query('days') days?: string) { return this.svc.getTrendData(Number(days) || 7); }
}
