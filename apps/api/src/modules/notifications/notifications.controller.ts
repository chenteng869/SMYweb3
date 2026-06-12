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
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('🔔 通知管理')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private svc: NotificationsService,
    private audit: AuditService
  ) {}

  @Get()
  @ApiOperation({ summary: '通知列表' })
  list(@Query() q: any) {
    return this.svc.list(q);
  }

  @Post()
  @ApiOperation({ summary: '创建通知' })
  async create(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.create(body);
    await this.audit.log(req, user.id, 'create_notification', 'notifications', String(r.id), body);
    return r;
  }

  @Post('broadcast')
  @ApiOperation({ summary: '广播通知给所有用户' })
  async broadcast(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.broadcast(body);
    await this.audit.log(req, user.id, 'broadcast_notification', 'notifications', undefined, body);
    return r;
  }

  @Put(':id/read')
  @ApiOperation({ summary: '标记已读' })
  markRead(@Param('id', ParseIntPipe) id: number) {
    return this.svc.markRead(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.delete(id);
    await this.audit.log(req, user.id, 'delete_notification', 'notifications', String(id));
    return r;
  }
}
