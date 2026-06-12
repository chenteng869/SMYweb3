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
import { MediaService } from './media.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('📱 自媒体中心')
@Controller('media')
export class MediaController {
  constructor(
    private svc: MediaService,
    private audit: AuditService
  ) {}

  @Get()
  @ApiOperation({ summary: '媒体发文列表' })
  list(@Query() q: any) {
    return this.svc.list(q);
  }

  @Get('stats')
  @ApiOperation({ summary: '媒体统计' })
  stats() {
    return this.svc.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: '媒体详情' })
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detail(id);
  }

  @Post()
  @ApiOperation({ summary: '创建媒体发文' })
  async create(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.create(body);
    await this.audit.log(req, user.id, 'create_media', 'media', String(r.id), body);
    return r;
  }

  @Put(':id')
  @ApiOperation({ summary: '更新媒体发文' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const r = await this.svc.update(id, body);
    await this.audit.log(req, user.id, 'update_media', 'media', String(id), body);
    return r;
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除媒体发文' })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.delete(id);
    await this.audit.log(req, user.id, 'delete_media', 'media', String(id));
    return r;
  }
}
