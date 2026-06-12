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
import { VideosService } from './videos.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('🎬 视频中心')
@Controller('videos')
export class VideosController {
  constructor(
    private svc: VideosService,
    private audit: AuditService
  ) {}

  @Get()
  @ApiOperation({ summary: '视频列表' })
  list(@Query() q: any) {
    return this.svc.list(q);
  }

  @Get('stats')
  @ApiOperation({ summary: '视频统计' })
  stats() {
    return this.svc.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: '视频详情' })
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detail(id);
  }

  @Post()
  @ApiOperation({ summary: '创建视频' })
  async create(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.create(body);
    await this.audit.log(req, user.id, 'create_video', 'videos', String(r.id), body);
    return r;
  }

  @Put(':id')
  @ApiOperation({ summary: '更新视频' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const r = await this.svc.update(id, body);
    await this.audit.log(req, user.id, 'update_video', 'videos', String(id), body);
    return r;
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除视频' })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.delete(id);
    await this.audit.log(req, user.id, 'delete_video', 'videos', String(id));
    return r;
  }

  @Get(':id/comments')
  @ApiOperation({ summary: '视频评论' })
  comments(@Param('id', ParseIntPipe) id: number) {
    return this.svc.listComments(id);
  }
}
