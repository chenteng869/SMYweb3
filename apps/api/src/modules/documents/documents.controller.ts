import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('📄 文档中心')
@Controller('documents')
export class DocumentsController {
  constructor(private svc: DocumentsService, private audit: AuditService) {}

  @Get() @ApiOperation({ summary: '文档列表' })
  list(@Query() q: any) { return this.svc.list(q); }

  @Get('stats') @ApiOperation({ summary: '文档统计' })
  stats() { return this.svc.stats(); }

  @Get(':id') @ApiOperation({ summary: '文档详情' })
  detail(@Param('id', ParseIntPipe) id: number) { return this.svc.detail(id); }

  @Post() @ApiOperation({ summary: '上传文档' })
  async create(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.create(body);
    await this.audit.log(req, user.id, 'create_document', 'documents', String(r.id), body);
    return r;
  }

  @Put(':id') @ApiOperation({ summary: '更新文档' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.update(id, body);
    await this.audit.log(req, user.id, 'update_document', 'documents', String(id), body);
    return r;
  }

  @Delete(':id') @ApiOperation({ summary: '删除文档' })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.delete(id);
    await this.audit.log(req, user.id, 'delete_document', 'documents', String(id));
    return r;
  }
}
