import { Body, Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SignatureService } from './signature.service';
import { SignDocumentDto, RevokeSignatureDto, VerifySignatureDto } from './dto/signature.dto';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';

/** 电子签名模块控制器 */
@ApiTags('\u270f\ufe0f \u7535\u5b50\u7b7e\u540d')
@ApiBearerAuth('JWT')
@Controller('signature')
export class SignatureController {
  constructor(private readonly svc: SignatureService) {}

  /**
   * 签署文档 — 对指定文档执行数字签名
   */
  @Post('sign')
  @ApiOperation({
    summary: '签署文档',
    description: '对指定文档生成数字签名并上传签名 PDF 至对象存储',
  })
  async sign(@Body() dto: SignDocumentDto, @Req() req: Request, @CurrentUser() user: any) {
    const headers = Object.fromEntries(req.headers.entries()) as Record<string, string>;
    return this.svc.signDocument(
      dto.documentId,
      user.didId || user.id,
      headers['x-forwarded-for'] || headers['x-real-ip'] || '',
      headers['user-agent'] || '',
      dto.algorithm
    );
  }

  /**
   * 验证签名 — 校验数字签名的密码学有效性及撤销状态
   */
  @Post(':id/verify')
  @ApiOperation({ summary: '验证签名', description: '使用公钥重新验算签名并返回验证结果' })
  async verify(@Param('id', ParseIntPipe) id: number) {
    return this.svc.verifySignature(id);
  }

  /**
   * 撤销签名 — 将指定签名标记为无效
   */
  @Post(':id/revoke')
  @ApiOperation({ summary: '撤销签名', description: '将签名标记为撤销状态并记录原因' })
  async revoke(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RevokeSignatureDto,
    @CurrentUser() user: any
  ) {
    await this.svc.revokeSignature(id, dto.reason, user.id);
    return { success: true, message: `签名 #${id} 已成功撤销` };
  }

  /**
   * 获取文档签名 — 查询指定文档的电子签名记录（1:1 关系）
   */
  @Get('document/:documentId')
  @ApiOperation({ summary: '获取文档签名', description: '查询某份文档的电子签名详情' })
  async getDocumentSignature(@Param('documentId', ParseIntPipe) documentId: number) {
    return this.svc.getDocumentSignature(documentId);
  }

  /**
   * 签名历史 — 按 DID 身份查询所有签名记录
   */
  @Get('history/:didId')
  @ApiOperation({
    summary: '签名历史',
    description: '获取指定 DID 身份的全部签名记录（按时间倒序）',
  })
  async getHistory(@Param('didId', ParseIntPipe) didId: number) {
    return this.svc.getSignatureHistory(didId);
  }
}
