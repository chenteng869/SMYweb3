import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BanksService } from './banks.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('🏦 银行账户')
@Controller('banks')
export class BanksController {
  constructor(
    private svc: BanksService,
    private audit: AuditService
  ) {}

  @Get()
  @ApiOperation({ summary: '银行账户列表' })
  list(@Query() q: any) {
    return this.svc.list(q);
  }

  @Get('stats')
  @ApiOperation({ summary: '银行账户统计' })
  stats() {
    return this.svc.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: '银行账户详情' })
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detail(id);
  }

  @Post()
  @ApiOperation({ summary: '创建银行账户' })
  async create(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.create(body);
    await this.audit.log(req, user.id, 'create_bank', 'banks', String(r.id), body);
    return r;
  }

  @Put(':id')
  @ApiOperation({ summary: '更新银行账户' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const r = await this.svc.update(id, body);
    await this.audit.log(req, user.id, 'update_bank', 'banks', String(id), body);
    return r;
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除银行账户' })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.delete(id);
    await this.audit.log(req, user.id, 'delete_bank', 'banks', String(id));
    return r;
  }
}
