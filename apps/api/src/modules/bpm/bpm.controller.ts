import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BpmService } from './bpm.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';

@ApiTags('📋 BPM 工作流引擎')
@Controller('bpm')
export class BpmController {
  constructor(private svc: BpmService) {}

  // ==================== 流程建模 ====================

  @Get('defs') @ApiOperation({ summary: '流程定义列表' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'pageSize', required: false }) @ApiQuery({ name: 'category', required: false }) @ApiQuery({ name: 'status', required: false })
  findAllDefs(@Query() q: any) { return this.svc.findAllDefs(Number(q.page) || 1, Number(q.pageSize) || 20, q.category, q.status); }

  @Get('defs/stats') @ApiOperation({ summary: '流程统计' })
  getDefStats() { return this.svc.getDefStats(); }

  @Get('defs/:id') @ApiOperation({ summary: '流程定义详情' })
  getDef(@Param('id') id: string) { return this.svc.getDef(Number(id)); }

  @Post('defs') @ApiOperation({ summary: '创建流程定义' })
  createDef(@Body() body: any) { return this.svc.createDef(body); }

  @Put('defs/:id') @ApiOperation({ summary: '更新流程定义' })
  updateDef(@Param('id') id: string, @Body() body: any) { return this.svc.updateDef(Number(id), body); }

  @Delete('defs/:id') @ApiOperation({ summary: '删除流程定义' })
  deleteDef(@Param('id') id: string) { return this.svc.deleteDef(Number(id)); }

  @Put('defs/:id/publish') @ApiOperation({ summary: '发布流程' })
  publishDef(@Param('id') id: string) { return this.svc.publishDef(Number(id)); }

  @Put('defs/:id/archive') @ApiOperation({ summary: '归档流程' })
  archiveDef(@Param('id') id: string) { return this.svc.archiveDef(Number(id)); }

  @Get('defs/:id/versions') @ApiOperation({ summary: '版本历史' })
  getVersionHistory(@Param('id') id: string) { return this.svc.getVersionHistory(Number(id)); }

  // ==================== 流程运行 ====================

  @Get('instances') @ApiOperation({ summary: '实例列表' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'pageSize', required: false }) @ApiQuery({ name: 'defId', required: false }) @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'initiator', required: false })
  findAllInstances(@Query() q: any) { return this.svc.findAllInstances(Number(q.page) || 1, Number(q.pageSize) || 20, q.defId ? Number(q.defId) : undefined, q.status, q.initiator); }

  @Get('instances/stats') @ApiOperation({ summary: '实例统计' })
  getInstanceStats(@Query('defId') defId?: string) { return this.svc.getInstanceStats(defId ? Number(defId) : undefined); }

  @Get('instances/:id') @ApiOperation({ summary: '实例详情' })
  getInstance(@Param('id') id: string) { return this.svc.getInstance(Number(id)); }

  @Post('instances') @ApiOperation({ summary: '启动新实例' })
  startInstance(@Body() body: any) { return this.svc.startInstance(body.defId, body); }

  @Put('instances/:id/complete') @ApiOperation({ summary: '完成实例' })
  completeInstance(@Param('id') id: string) { return this.svc.completeInstance(Number(id)); }

  @Put('instances/:id/cancel') @ApiOperation({ summary: '取消实例' })
  cancelInstance(@Param('id') id: string, @Body() body: any) { return this.svc.cancelInstance(Number(id), body.reason); }

  @Put('instances/:id/suspend') @ApiOperation({ summary: '暂停实例' })
  suspendInstance(@Param('id') id: string) { return this.svc.suspendInstance(Number(id)); }

  @Put('instances/:id/resume') @ApiOperation({ summary: '恢复实例' })
  resumeInstance(@Param('id') id: string) { return this.svc.resumeInstance(Number(id)); }

  @Get('instances/:id/timeline') @ApiOperation({ summary: '实例时间线' })
  getInstanceTimeline(@Param('id') id: string) { return this.svc.getInstanceTimeline(Number(id)); }

  // ==================== 任务管理 ====================

  @Get('tasks') @ApiOperation({ summary: '任务列表' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'pageSize', required: false }) @ApiQuery({ name: 'instanceId', required: false }) @ApiQuery({ name: 'assignee', required: false }) @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'type', required: false })
  findAllTasks(@Query() q: any) { return this.svc.findAllTasks(Number(q.page) || 1, Number(q.pageSize) || 20, q.instanceId ? Number(q.instanceId) : undefined, q.assignee, q.status, q.type); }

  @Get('tasks/stats') @ApiOperation({ summary: '任务统计' })
  getTaskStats() { return this.svc.getTaskStats(); }

  @Get('tasks/:id') @ApiOperation({ summary: '任务详情' })
  getTask(@Param('id') id: string) { return this.svc.getTask(Number(id)); }

  @Put('tasks/:id/complete') @ApiOperation({ summary: '完成任务' })
  completeTask(@Param('id') id: string, @Body() body: any) { return this.svc.completeTask(Number(id), body); }

  @Put('tasks/:id/delegate') @ApiOperation({ summary: '委派任务' })
  delegateTask(@Param('id') id: string, @Body() body: any) { return this.svc.delegateTask(Number(id), body.newAssignee); }

  @Put('tasks/:id/skip') @ApiOperation({ summary: '跳过任务' })
  skipTask(@Param('id') id: string, @Body() body: any) { return this.svc.skipTask(Number(id), body.reason); }

  @Put('tasks/:id/claim') @ApiOperation({ summary: '认领任务' })
  claimTask(@Param('id') id: string, @Body() body: any) { return this.svc.claimTask(Number(id), body.userId); }

  @Get('tasks/my/:assignee') @ApiOperation({ summary: '我的待办' })
  @ApiQuery({ name: 'status', required: false })
  getMyTasks(@Param('assignee') assignee: string, @Query('status') status?: string) { return this.svc.getMyTasks(assignee, status); }

  // ==================== 流程监控 ====================

  @Get('monitor/metrics') @ApiOperation({ summary: '监控指标' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'pageSize', required: false }) @ApiQuery({ name: 'defId', required: false }) @ApiQuery({ name: 'dateFrom', required: false }) @ApiQuery({ name: 'dateTo', required: false })
  findAllMetrics(@Query() q: any) { return this.svc.findAllMetrics(Number(q.page) || 1, Number(q.pageSize) || 20, q.defId ? Number(q.defId) : undefined, q.dateFrom ? new Date(q.dateFrom) : undefined, q.dateTo ? new Date(q.dateTo) : undefined); }

  @Get('monitor/dashboard') @ApiOperation({ summary: '监控大屏' })
  getDashboardData() { return this.svc.getDashboardData(); }

  @Get('monitor/bottlenecks') @ApiOperation({ summary: '瓶颈分析' })
  getBottlenecks() { return this.svc.getBottlenecks(); }

  @Get('monitor/efficiency') @ApiOperation({ summary: '效率报告' })
  @ApiQuery({ name: 'category', required: false })
  getEfficiencyReport(@Query('category') category?: string) { return this.svc.getEfficiencyReport(category); }

  @Get('monitor/sla') @ApiOperation({ summary: 'SLA 合规率' })
  @ApiQuery({ name: 'slaHours', required: false })
  getSlaCompliance(@Query('slaHours') slaHours?: string) { return this.svc.getSlaCompliance(Number(slaHours) || 24); }
}
