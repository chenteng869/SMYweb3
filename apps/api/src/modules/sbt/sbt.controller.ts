import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SbtService } from './sbt.service';
import { JwtAuthGuard, Public } from '../../common/guards/jwt-auth.guard';

@ApiTags('🎫 SBT 凭证')
@Controller('did/sbt')
export class SbtController {
  constructor(private svc: SbtService) {}

  @UseGuards(JwtAuthGuard)
  @Post('issue')
  @ApiOperation({ summary: '签发SBT凭证' })
  async issue(
    @Body()
    body: {
      userId: number;
      didId: number;
      walletAddress: string;
      credentialType: string;
      credentialLevel?: string;
      issuedBy?: number;
    }
  ) {
    return { success: true, data: await this.svc.issue(body) };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/revoke')
  @ApiOperation({ summary: '撤销SBT凭证' })
  async revoke(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string; revokedBy?: number }
  ) {
    return { success: true, data: await this.svc.revoke(id, body.reason, body.revokedBy) };
  }

  @UseGuards(JwtAuthGuard)
  @Get('list')
  @ApiOperation({ summary: '查询SBT列表' })
  async list(@Query() query: any) {
    return { success: true, data: await this.svc.list(query) };
  }

  @Public()
  @Get('types')
  @ApiOperation({ summary: '获取SBT类型列表' })
  async types() {
    return { success: true, data: await this.svc.types() };
  }
}
