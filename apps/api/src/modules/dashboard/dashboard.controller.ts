import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('📊 仪表盘')
@Controller('dashboard')
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'KPI 统计' })
  stats() {
    return this.svc.stats();
  }

  @Get('recent-activities')
  @ApiOperation({ summary: '最近活动' })
  recent() {
    return this.svc.recentActivities();
  }

  @Get('chart-data')
  @ApiOperation({ summary: '图表数据(7天趋势)' })
  chart() {
    return this.svc.chartData();
  }
}
