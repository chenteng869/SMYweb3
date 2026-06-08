import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DvsfService } from './dvsf.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('💰 DVSF 分红池')
@Controller('dvsf')
export class DvsfController {
  constructor(private svc: DvsfService, private audit: AuditService) {}

  @Get('pools') @ApiOperation({ summary: '分红池列表' })
  pools() { return this.svc.listPools(); }

  @Get('pools/:id') @ApiOperation({ summary: '分红池详情' })
  poolDetail(@Param('id', ParseIntPipe) id: number) { return this.svc.poolDetail(id); }

  @Post('pools') @ApiOperation({ summary: '创建分红池' })
  async createPool(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createPool(body);
    await this.audit.log(req, user.id, 'create_dvsf_pool', 'dvsf', String(r.id), body);
    return r;
  }

  @Put('pools/:id') @ApiOperation({ summary: '更新分红池' })
  async updatePool(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.updatePool(id, body);
    await this.audit.log(req, user.id, 'update_dvsf_pool', 'dvsf', String(id), body);
    return r;
  }

  @Get('records') @ApiOperation({ summary: '分红记录' })
  records(@Query() q: any) { return this.svc.listRecords(q); }

  @Post('records') @ApiOperation({ summary: '新增分红记录' })
  async createRecord(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createRecord(body);
    await this.audit.log(req, user.id, 'create_dvsf_record', 'dvsf', String(r.id), body);
    return r;
  }

  @Get('stats') @ApiOperation({ summary: 'DVSF 统计' })
  stats() { return this.svc.stats(); }
}
