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
import { CompaniesService } from './companies.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('🏢 公司管理')
@Controller('companies')
export class CompaniesController {
  constructor(
    private svc: CompaniesService,
    private audit: AuditService
  ) {}

  @Get()
  @ApiOperation({ summary: '公司列表' })
  list(@Query() q: any) {
    return this.svc.list(q);
  }

  @Get('stats')
  @ApiOperation({ summary: '公司统计' })
  stats() {
    return this.svc.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: '公司详情' })
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detail(id);
  }

  @Post()
  @ApiOperation({ summary: '创建公司' })
  async create(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.create(body);
    await this.audit.log(req, user.id, 'create_company', 'companies', String(r.id), body);
    return r;
  }

  @Put(':id')
  @ApiOperation({ summary: '更新公司' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const r = await this.svc.update(id, body);
    await this.audit.log(req, user.id, 'update_company', 'companies', String(id), body);
    return r;
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除公司' })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.delete(id);
    await this.audit.log(req, user.id, 'delete_company', 'companies', String(id));
    return r;
  }
}
