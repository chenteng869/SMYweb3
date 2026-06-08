import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DidService } from './did.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('🆔 DID 数字身份')
@Controller('did')
export class DidController {
  constructor(private svc: DidService, private audit: AuditService) {}

  @Get() @ApiOperation({ summary: 'DID 列表' })
  list(@Query() q: any) { return this.svc.list(q); }

  @Get('stats') @ApiOperation({ summary: 'DID 统计' })
  stats() { return this.svc.stats(); }

  @Get(':id') @ApiOperation({ summary: 'DID 详情' })
  detail(@Param('id', ParseIntPipe) id: number) { return this.svc.detail(id); }

  @Post('issue') @ApiOperation({ summary: '签发 DID' })
  async issue(@Body() body: { userId: number; blockchain?: string }, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.issue(body.userId, body.blockchain);
    await this.audit.log(req, user.id, 'issue_did', 'did', String(r.id), body);
    return r;
  }

  @Post(':id/revoke') @ApiOperation({ summary: '吊销 DID' })
  async revoke(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.revoke(id);
    await this.audit.log(req, user.id, 'revoke_did', 'did', String(id));
    return r;
  }
}
