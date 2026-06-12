import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DidBpmStubsService } from './did-bpm-stubs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('📋 DID BPM 审批桩')
@Controller('did/bpm')
@UseGuards(JwtAuthGuard)
export class DidBpmStubsController {
  constructor(private svc: DidBpmStubsService) {}

  @Post('kyc-review')
  @ApiOperation({ summary: '发起KYC复核审批' })
  async kycReview(@Body() body: { kycRecordId: number; userId: number }) {
    return { success: true, data: await this.svc.kycReviewProcess(body.kycRecordId, body.userId) };
  }

  @Post('did-freeze')
  @ApiOperation({ summary: '发起DID冻结审批' })
  async didFreeze(@Body() body: { didId: number; reason: string; requestedBy: number }) {
    return {
      success: true,
      data: await this.svc.didFreezeProcess(body.didId, body.reason, body.requestedBy),
    };
  }

  @Post('did-unfreeze')
  @ApiOperation({ summary: '发起DID解冻审批' })
  async didUnfreeze(@Body() body: { didId: number; reason: string; requestedBy: number }) {
    return {
      success: true,
      data: await this.svc.didUnfreezeProcess(body.didId, body.reason, body.requestedBy),
    };
  }

  @Post('sbt-revoke')
  @ApiOperation({ summary: '发起SBT撤销审批' })
  async sbtRevoke(@Body() body: { credentialId: number; reason: string; requestedBy: number }) {
    return {
      success: true,
      data: await this.svc.sbtRevokeProcess(body.credentialId, body.reason, body.requestedBy),
    };
  }
}
