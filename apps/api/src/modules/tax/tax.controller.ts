import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TaxService } from './tax.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('🧾 税务管理')
@Controller('tax')
export class TaxController {
  constructor(private svc: TaxService, private audit: AuditService) {}

  @Get('rates') @ApiOperation({ summary: '税率列表' })
  list(@Query() q: any) { return this.svc.list(q); }

  @Get('rates/:id') @ApiOperation({ summary: '税率详情' })
  detail(@Param('id', ParseIntPipe) id: number) { return this.svc.detail(id); }

  @Post('rates') @ApiOperation({ summary: '创建税率' })
  async create(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.create(body);
    await this.audit.log(req, user.id, 'create_tax_rate', 'tax', String(r.id), body);
    return r;
  }

  @Put('rates/:id') @ApiOperation({ summary: '更新税率' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.update(id, body);
    await this.audit.log(req, user.id, 'update_tax_rate', 'tax', String(id), body);
    return r;
  }

  @Delete('rates/:id') @ApiOperation({ summary: '删除税率' })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.delete(id);
    await this.audit.log(req, user.id, 'delete_tax_rate', 'tax', String(id));
    return r;
  }

  @Post('calculate') @ApiOperation({ summary: '税务计算' })
  calculate(@Body() body: any) { return this.svc.calculate(body); }
}
