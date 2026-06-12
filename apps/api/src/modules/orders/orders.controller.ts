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
import { OrdersService } from './orders.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('📋 订单/工单')
@Controller('orders')
export class OrdersController {
  constructor(
    private svc: OrdersService,
    private audit: AuditService
  ) {}

  @Get()
  @ApiOperation({ summary: '工单列表' })
  list(@Query() q: any) {
    return this.svc.list(q);
  }

  @Get('stats')
  @ApiOperation({ summary: '工单统计' })
  stats() {
    return this.svc.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: '工单详情' })
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detail(id);
  }

  @Post()
  @ApiOperation({ summary: '创建工单' })
  async create(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.create(body);
    await this.audit.log(req, user.id, 'create_order', 'orders', String(r.id), body);
    return r;
  }

  @Put(':id')
  @ApiOperation({ summary: '更新工单' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const r = await this.svc.update(id, body);
    await this.audit.log(req, user.id, 'update_order', 'orders', String(id), body);
    return r;
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新工单状态' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string; progress?: number; notes?: string },
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const r = await this.svc.updateStatus(id, body.status, body.progress, body.notes);
    await this.audit.log(req, user.id, 'update_order_status', 'orders', String(id), body);
    return r;
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除工单' })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.delete(id);
    await this.audit.log(req, user.id, 'delete_order', 'orders', String(id));
    return r;
  }
}
