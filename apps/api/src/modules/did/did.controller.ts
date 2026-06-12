import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DidService } from './did.service';
import { JwtAuthGuard, Public } from '../../common/guards/jwt-auth.guard';
import { RegisterDidDto } from './dto/register-did.dto';
import { FreezeDidDto, RevokeDidDto } from './dto/update-did.dto';

@ApiTags('🆔 DID 数字身份')
@Controller('did')
export class DidController {
  constructor(private svc: DidService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'DID 列表（分页/筛选）' })
  async list(@Query() q: any) {
    return { success: true, data: await this.svc.list(q) };
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'DID 统计' })
  async stats() {
    return { success: true, data: await this.svc.stats() };
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: '注册 DID' })
  async register(@Body() dto: RegisterDidDto) {
    return { success: true, data: await this.svc.register(dto.userId, dto.primaryWallet) };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'DID 详情' })
  async detail(@Param('id', ParseIntPipe) id: number) {
    return { success: true, data: await this.svc.detail(id) };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/freeze')
  @ApiOperation({ summary: '冻结 DID' })
  async freeze(@Param('id', ParseIntPipe) id: number, @Body() body: { reason?: string }) {
    return { success: true, data: await this.svc.freeze(id, body.reason) };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/unfreeze')
  @ApiOperation({ summary: '解冻 DID' })
  async unfreeze(@Param('id', ParseIntPipe) id: number) {
    return { success: true, data: await this.svc.unfreeze(id) };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/revoke')
  @ApiOperation({ summary: '吊销 DID' })
  async revoke(@Param('id', ParseIntPipe) id: number, @Body() dto: RevokeDidDto) {
    return { success: true, data: await this.svc.revoke(id, dto.reason) };
  }

  @Public()
  @Get('lookup/:did')
  @ApiOperation({ summary: '按 DID 字符串查询' })
  async findByDid(@Param('did') did: string) {
    return { success: true, data: await this.svc.findByDid(did) };
  }
}
