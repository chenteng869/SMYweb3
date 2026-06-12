import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PlatformAccessService } from './platform-access.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('🔌 平台权限')
@Controller('did/platform-access')
@UseGuards(JwtAuthGuard)
export class PlatformAccessController {
  constructor(private svc: PlatformAccessService) {}

  @Get('check')
  @ApiOperation({ summary: '检查平台访问权限' })
  async check(@Query('did') did: string, @Query('platform') platform: string) {
    return { success: true, data: await this.svc.checkAccess(did, platform) };
  }

  @Post('grant')
  @ApiOperation({ summary: '授予/撤销平台权限' })
  async grant(
    @Body() body: { didId: number; platform: string; allowed: boolean; updatedBy?: number }
  ) {
    return {
      success: true,
      data: await this.svc.grant(body.didId, body.platform, body.allowed, body.updatedBy),
    };
  }

  @Get(':didId')
  @ApiOperation({ summary: '查询DID的所有平台权限' })
  async listByDid(@Param('didId') didId: string) {
    return { success: true, data: await this.svc.listByDid(Number(didId)) };
  }
}
