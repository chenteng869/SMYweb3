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
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('💳 支付管理')
@Controller('payments')
export class PaymentsController {
  constructor(
    private svc: PaymentsService,
    private audit: AuditService
  ) {}

  // Channels
  @Get('channels')
  @ApiOperation({ summary: '支付渠道列表' })
  channels() {
    return this.svc.channels();
  }

  @Get('channels/:id')
  @ApiOperation({ summary: '支付渠道详情' })
  channelDetail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.channelDetail(id);
  }

  @Post('channels')
  @ApiOperation({ summary: '创建支付渠道' })
  async createChannel(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createChannel(body);
    await this.audit.log(req, user.id, 'create_channel', 'payments', String(r.id), body);
    return r;
  }

  @Put('channels/:id')
  @ApiOperation({ summary: '更新支付渠道' })
  async updateChannel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const r = await this.svc.updateChannel(id, body);
    await this.audit.log(req, user.id, 'update_channel', 'payments', String(id), body);
    return r;
  }

  @Delete('channels/:id')
  @ApiOperation({ summary: '删除支付渠道' })
  async deleteChannel(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const r = await this.svc.deleteChannel(id);
    await this.audit.log(req, user.id, 'delete_channel', 'payments', String(id));
    return r;
  }

  // Transactions
  @Get('transactions')
  @ApiOperation({ summary: '交易流水列表' })
  listTxns(@Query() q: any) {
    return this.svc.listTransactions(q);
  }

  @Post('transactions')
  @ApiOperation({ summary: '创建交易' })
  async createTxn(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createTransaction(body);
    await this.audit.log(req, user.id, 'create_transaction', 'payments', String(r.id), body);
    return r;
  }

  @Put('transactions/:id')
  @ApiOperation({ summary: '更新交易状态' })
  async updateTxn(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const r = await this.svc.updateTransaction(id, body);
    await this.audit.log(req, user.id, 'update_transaction', 'payments', String(id), body);
    return r;
  }

  // Exchange Rates
  @Get('rates')
  @ApiOperation({ summary: '汇率列表' })
  rates() {
    return this.svc.rates();
  }

  @Post('rates')
  @ApiOperation({ summary: '新增/更新汇率' })
  async createRate(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createRate(body);
    await this.audit.log(req, user.id, 'create_rate', 'payments', String(r.id), body);
    return r;
  }

  @Put('rates/:id')
  @ApiOperation({ summary: '更新汇率' })
  async updateRate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { rate: number },
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const r = await this.svc.updateRate(id, body.rate);
    await this.audit.log(req, user.id, 'update_rate', 'payments', String(id), body);
    return r;
  }

  @Get('stats')
  @ApiOperation({ summary: '支付统计' })
  stats() {
    return this.svc.stats();
  }
}
