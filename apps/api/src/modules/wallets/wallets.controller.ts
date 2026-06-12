import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard, Public } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('👛 DID 钱包管理')
@Controller('did/wallets')
export class WalletsController {
  constructor(private svc: WalletsService) {}

  @Public()
  @Get('nonce')
  @ApiOperation({ summary: '获取登录Nonce' })
  async getNonce(@Query('walletAddress') walletAddress: string) {
    return { success: true, data: await this.svc.createNonce(walletAddress, 'login') };
  }

  @UseGuards(JwtAuthGuard)
  @Post('bind')
  @ApiOperation({ summary: '绑定钱包' })
  async bindWallet(@Body() body: any, @CurrentUser() user: any) {
    return { success: true, data: await this.svc.bindWallet(user.id, body.didId, body) };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':address')
  @ApiOperation({ summary: '解绑钱包' })
  async unbindWallet(@Param('address') address: string, @CurrentUser() user: any) {
    return { success: true, data: await this.svc.unbindWallet(user.id, address) };
  }

  @UseGuards(JwtAuthGuard)
  @Get('list')
  @ApiOperation({ summary: '查询钱包列表' })
  async listWallets(@CurrentUser() user: any) {
    return { success: true, data: await this.svc.listWallets(user.id) };
  }
}
