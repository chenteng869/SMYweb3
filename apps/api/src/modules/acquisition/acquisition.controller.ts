import { Controller, Get, Post, Body, Query, UseGuards, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AcquisitionService, CollectResult } from './acquisition.service';
import {
  CollectDto,
  BatchCollectDto,
  ExportDto,
  ScheduleCollectionDto,
  PaginationDto,
} from './dto/acquisition.dto';

/**
 * 客户获取数据同步控制器
 *
 * 提供多平台客户采集、管理、导出等 REST API 接口
 * 所有接口需要 JWT 认证
 */
@UseGuards(JwtAuthGuard)
@Controller('acquisition')
export class AcquisitionController {
  constructor(private readonly acquisitionService: AcquisitionService) {}

  /**
   * 单平台数据采集
   *
   * 从指定平台采集潜在客户线索数据
   * 支持平台：twitter、youtube、telegram、douyin、xiaohongshu
   *
   * POST /api/acquisition/collect
   */
  @Post('collect')
  async collect(@Body() dto: CollectDto) {
    const result = await this.acquisitionService.collectFromPlatform(
      dto.platform,
      dto.query,
      dto.options
    );
    return {
      code: 200,
      message: '采集完成',
      data: result,
    };
  }

  /**
   * 批量多平台并行采集
   *
   * 同时从多个平台采集数据，自动并行执行
   *
   * POST /api/acquisition/batch-collect
   */
  @Post('batch-collect')
  async batchCollect(@Body() dto: BatchCollectDto) {
    const results = await this.acquisitionService.collectBatch(
      dto.tasks.map((t) => ({
        platform: t.platform,
        query: t.query,
        options: t.options,
      }))
    );

    // 汇总统计
    const summary = {
      totalTasks: results.length,
      totalCollected: results.reduce((sum, r) => sum + r.collected, 0),
      totalNormalized: results.reduce((sum, r) => sum + r.normalized, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      totalDurationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
    };

    return {
      code: 200,
      message: '批量采集完成',
      data: {
        summary,
        details: results,
      },
    };
  }

  /**
   * 获取客户获取统计仪表盘数据
   *
   * 返回采集总量、各平台分布、Top 线索、趋势图等统计数据
   *
   * GET /api/acquisition/stats
   */
  @Get('stats')
  async getStats(@Query('start') start?: string, @Query('end') end?: string) {
    const dateRange = start || end ? { start: start || '', end: end || '' } : undefined;
    const stats = await this.acquisitionService.getAcquisitionStats(dateRange);

    return {
      code: 200,
      message: '获取成功',
      data: stats,
    };
  }

  /**
   * 分页查询线索列表
   *
   * 支持按平台、评分、关键词筛选，按评分降序排列
   *
   * GET /api/acquisition/leads
   */
  @Get('leads')
  async getLeads(
    @Query() pagination: PaginationDto,
    @Query('platform') platform?: string,
    @Query('minScore') minScore?: number,
    @Query('search') search?: string
  ) {
    const result = await this.acquisitionService.getLeadsPaginated(
      pagination.page,
      pagination.pageSize,
      { platform, minScore, search }
    );

    return {
      code: 200,
      message: '获取成功',
      data: result,
    };
  }

  /**
   * 导出线索数据
   *
   * 支持 CSV 和 JSON 格式导出，可按条件过滤
   * 返回文件下载流
   *
   * GET /api/acquisition/export
   */
  @Get('export')
  async exportLeads(@Query() dto: ExportDto, @Res({ passthrough: true }) res: Response) {
    const buffer = await this.acquisitionService.exportLeads(dto.filters || {}, dto.format);

    const filename = `acquisition_leads_${new Date().toISOString().slice(0, 10)}.${dto.format}`;
    const mimeType = dto.format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.status(HttpStatus.OK);

    return buffer;
  }

  /**
   * 注册定时采集任务
   *
   * 设置周期性自动采集任务，支持 Cron 表达式配置
   *
   * POST /api/acquisition/schedule
   */
  @Post('schedule')
  async scheduleCollection(@Body() dto: ScheduleCollectionDto) {
    const jobId = await this.acquisitionService.scheduleCollection(
      dto.cronExpression,
      dto.config as unknown as Record<string, unknown> & { platforms?: string[]; query?: string },
      dto.timezone
    );

    return {
      code: 200,
      message: '定时任务已注册',
      data: { jobId },
    };
  }

  /**
   * 获取已注册的平台列表
   *
   * GET /api/acquisition/platforms
   */
  @Get('platforms')
  async getPlatforms() {
    const platforms = this.acquisitionService.getAvailablePlatforms();
    return {
      code: 200,
      message: '获取成功',
      data: platforms,
    };
  }
}
