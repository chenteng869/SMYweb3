import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('✅ KYC 认证')
@Controller('did/kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(private svc: KycService) {}

  @Post('submit')
  @ApiOperation({ summary: '提交KYC' })
  async submit(
    @Body()
    body: {
      userId: number;
      didId: number;
      fullName: string;
      documentType: string;
      documentNo: string;
      country: string;
    }
  ) {
    return { success: true, data: await this.svc.submit(body.userId, body) };
  }

  @Post(':id/approve')
  @ApiOperation({ summary: '通过KYC' })
  async approve(@Param('id', ParseIntPipe) id: number, @Body('reviewerId') reviewerId: number) {
    return { success: true, data: await this.svc.approve(id, reviewerId) };
  }

  @Post(':id/reject')
  @ApiOperation({ summary: '驳回KYC' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reviewerId: number; reason: string }
  ) {
    return { success: true, data: await this.svc.reject(id, body.reviewerId, body.reason) };
  }

  @Get('status/:userId')
  @ApiOperation({ summary: '查询KYC状态' })
  async status(@Param('userId', ParseIntPipe) userId: number) {
    return { success: true, data: await this.svc.status(userId) };
  }

  @Get('queue')
  @ApiOperation({ summary: 'KYC审核队列' })
  async queue(@Query() q: any) {
    return { success: true, data: await this.svc.queue(q) };
  }
}
