import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DlcService } from './dlc.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('🏆 DLC 等级')
@Controller('dlc')
export class DlcController {
  constructor(
    private svc: DlcService,
    private audit: AuditService
  ) {}

  @Get('levels')
  @ApiOperation({ summary: 'DLC 等级列表' })
  levels() {
    return this.svc.listLevels();
  }

  @Post('levels')
  @ApiOperation({ summary: '新增 DLC 等级' })
  async createLevel(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createLevel(body);
    await this.audit.log(req, user.id, 'create_dlc_level', 'dlc', String(r.id), body);
    return r;
  }

  @Put('levels/:id')
  @ApiOperation({ summary: '更新 DLC 等级' })
  async updateLevel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const r = await this.svc.updateLevel(id, body);
    await this.audit.log(req, user.id, 'update_dlc_level', 'dlc', String(id), body);
    return r;
  }

  @Get('transactions')
  @ApiOperation({ summary: 'DVC 流水' })
  transactions(@Query() q: any) {
    return this.svc.listTransactions(q);
  }

  @Post('transactions')
  @ApiOperation({ summary: '手动发放 DVC' })
  async createTransaction(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createTransaction(body);
    await this.audit.log(req, user.id, 'create_dvc_txn', 'dlc', String(r.id), body);
    return r;
  }

  @Get('stats')
  @ApiOperation({ summary: 'DLC 统计' })
  stats() {
    return this.svc.stats();
  }
}
