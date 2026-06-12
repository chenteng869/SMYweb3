import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { WalletLoginDto } from './dto/wallet-login.dto';
import { Public, CurrentUser } from '../../common/guards/jwt-auth.guard';

@ApiTags('🔐 认证管理')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: '管理员登录' })
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.auth.login(dto, req.ip);
  }

  @Public()
  @Post('wallet-login')
  @ApiOperation({ summary: '钱包签名登录' })
  walletLogin(@Body() dto: WalletLoginDto) {
    return this.auth.walletLogin(dto.walletAddress, dto.nonce, dto.signature);
  }

  @Get('profile')
  @ApiOperation({ summary: '获取当前管理员信息' })
  profile(@CurrentUser() user: any) {
    return this.auth.profile(user.id);
  }

  @Post('logout')
  @ApiOperation({ summary: '退出登录' })
  logout(@CurrentUser() user: any, @Req() req: any) {
    return this.auth.logout(user.id, req.ip);
  }
}
