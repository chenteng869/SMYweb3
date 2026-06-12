import { Injectable } from '@nestjs/common';

@Injectable()
export class DidBpmStubsService {
  /** KYC 复核审批流程 */
  async kycReviewProcess(kycRecordId: number, userId: number) {
    return {
      processId: `bpm-kyc-review-${Date.now()}`,
      processName: 'KYC复核审批',
      status: 'created',
      assignee: 'compliance_officer',
      form: { kycRecordId, userId, action: 'review' },
    };
  }

  /** DID 冻结审批流程 */
  async didFreezeProcess(didId: number, reason: string, requestedBy: number) {
    return {
      processId: `bpm-did-freeze-${Date.now()}`,
      processName: 'DID冻结审批',
      status: 'created',
      assignee: 'admin',
      form: { didId, reason, requestedBy, action: 'approve_freeze' },
    };
  }

  /** DID 解冻审批流程 */
  async didUnfreezeProcess(didId: number, reason: string, requestedBy: number) {
    return {
      processId: `bpm-did-unfreeze-${Date.now()}`,
      processName: 'DID解冻审批',
      status: 'created',
      assignee: 'admin',
      form: { didId, reason, requestedBy, action: 'approve_unfreeze' },
    };
  }

  /** SBT 撤销审批流程 */
  async sbtRevokeProcess(credentialId: number, reason: string, requestedBy: number) {
    return {
      processId: `bpm-sbt-revoke-${Date.now()}`,
      processName: 'SBT撤销审批',
      status: 'created',
      assignee: 'admin',
      form: { credentialId, reason, requestedBy, action: 'approve_revoke' },
    };
  }
}
