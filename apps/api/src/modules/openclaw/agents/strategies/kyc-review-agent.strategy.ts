import { Injectable, Logger } from '@nestjs/common';
import { BaseAgentStrategy } from './base-agent.strategy';
import { ITaskPayload, ITaskResult, TaskType } from '../types/task.types';
import { IAgentSession } from '../types/agent.types';

/**
 * KYC 文档类型
 */
type KycDocType =
  | 'id_card_front'
  | 'id_card_back'
  | 'passport'
  | 'driver_license'
  | 'selfie'
  | 'address_proof'
  | 'business_license';

/**
 * KYC 文档记录（模拟）
 */
interface KycDocument {
  id: number;
  kycRecordId: number;
  docType: KycDocType;
  fileUrl: string;
  uploadStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed';
  ocrExtractedData?: Record<string, unknown>;
  verificationNotes?: string;
  uploadedAt: Date;
}

/**
 * KYC 审核主记录（模拟）
 */
interface KycRecord {
  id: number;
  didId: number;
  userId: number;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'requires_additional';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewerId?: number;
  documents: KycDocument[];
  riskFlags: string[];
  previousReviews?: ReviewHistoryItem[];
}

/**
 * 审核历史记录
 */
interface ReviewHistoryItem {
  reviewedAt: Date;
  reviewerId: number;
  decision: 'approved' | 'rejected';
  reason: string;
}

/**
 * OCR 识别结果
 */
interface OcrResult {
  docType: KycDocType;
  success: boolean;
  extractedFields: Record<string, string>;
  confidenceScore: number;
  warnings: string[];
  processingTimeMs: number;
}

/**
 * 风险等级
 */
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * KYC 审核最终结果
 */
interface KycReviewResult {
  reviewId: string;
  didId: number;
  userId: number;
  recommendation: 'approve' | 'reject' | 'manual_review';
  riskLevel: RiskLevel;
  confidenceScore: number; // 0-100
  riskFlags: RiskFlag[];
  documentAnalysis: DocumentAnalysisSummary;
  identityMatch: IdentityMatchResult;
  reviewedAt: string;
  notes: string;
}

/**
 * 单个风险标记
 */
interface RiskFlag {
  code: string;
  severity: RiskLevel;
  category: 'document' | 'identity' | 'behavioral' | 'sanctions';
  description: string;
  detail?: string;
}

/**
 * 文档分析摘要
 */
interface DocumentAnalysisSummary {
  totalDocuments: number;
  verifiedDocuments: number;
  rejectedDocuments: number;
  pendingDocuments: number;
  details: {
    docType: KycDocType;
    status: 'verified' | 'rejected' | 'pending';
    ocrConfidence: number;
    issues: string[];
  }[];
}

/**
 * 身份交叉比对结果
 */
interface IdentityMatchResult {
  nameMatch: boolean;
  dobMatch: boolean;
  documentNumberConsistent: boolean;
  selfieMatchScore: number; // 0-100
  addressConsistency: string;
  overallScore: number; // 0-100
}

/** 风险等级中文标签 */
const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中等风险',
  high: '高风险',
  critical: '严重风险',
};

/** 文档类型中文标签 */
const DOC_TYPE_LABELS: Record<KycDocType, string> = {
  id_card_front: '身份证正面',
  id_card_back: '身份证反面',
  passport: '护照',
  driver_license: '驾驶证',
  selfie: '活体自拍',
  address_proof: '地址证明',
  business_license: '营业执照',
};

/**
 * KYC 审核 Agent 策略
 *
 * 负责自动化审核用户身份认证（KYC）材料，通过 OCR 识别、身份交叉比对、
 * 风险评估等手段输出审核建议。
 *
 * 工作流程：
 * 1. 定位 KYC 记录及关联文档
 * 2. 对每份文档执行 OCR 识别（模拟）
 * 3. 交叉比对各文档中的身份信息一致性
 * 4. 活体检测与人脸匹配（模拟）
 * 5. 多维风险评估（文档真实性、身份一致性、行为异常、制裁名单）
 * 6. 输出审核建议与风险报告
 *
 * 安全合规要点：
 * - 所有 PII 数据仅在处理过程中存在于内存，不落盘存储
 * - 审核日志完整记录操作轨迹，满足审计要求
 * - 高风险案例强制转人工复核
 *
 * 当前版本为模拟实现（Mock），Phase 3 将接入真实 OCR 与人脸识别服务。
 */
@Injectable()
export class KycReviewAgentStrategy extends BaseAgentStrategy {
  override readonly strategyName = 'kyc-review-agent';

  override readonly supportedTaskTypes: TaskType[] = [TaskType.KYC_REVIEW];

  constructor() {
    super();
  }

  /**
   * 执行 KYC 自动化审核任务
   *
   * @param session - Agent 会话
   * @param payload - 任务负载（didId 或 userId 为必需参数）
   * @returns 审核结果（含风险等级、置信度、风险标记、审核建议）
   */
  async execute(session: IAgentSession, payload: ITaskPayload): Promise<ITaskResult> {
    const startTime = Date.now();

    const targetId = payload.didId || payload.userId;
    this.logger.log(`开始执行 KYC 审核任务 | 会话ID=${session.id} | 目标ID=${targetId}`);

    try {
      // Step 1: 校验必需参数
      if (!targetId) {
        throw new Error('KYC 审核任务缺少必需参数: didId 或 userId');
      }

      // Step 2: 获取 KYC 记录及关联文档
      this.logger.log(`正在查询 KYC 记录, didId=${payload.didId}, userId=${payload.userId}`);
      const kycRecord = await this.fetchKycRecord(Number(targetId), payload);

      if (!kycRecord) {
        throw new Error(`未找到 KYC 记录: 目标ID=${targetId}，请确认用户已完成 KYC 信息提交`);
      }

      // Step 3: 对所有待处理文档执行 OCR 识别
      this.logger.log(`正在执行 OCR 识别, 共 ${kycRecord.documents.length} 份文档`);
      const ocrResults = await this.performOcrOnDocuments(kycRecord.documents);

      // Step 4: 身份信息交叉比对
      this.logger.log('正在进行身份信息交叉比对...');
      const identityMatch = await this.crossReferenceIdentity(ocrResults, kycRecord);

      // Step 5: 多维风险评估
      this.logger.log('正在进行多维风险评估...');
      const riskAssessment = await this.assessRisks(kycRecord, ocrResults, identityMatch);

      // Step 6: 生成审核结论
      const recommendation = this.generateRecommendation(riskAssessment, identityMatch);
      const documentSummary = this.buildDocumentAnalysisSummary(ocrResults, kycRecord.documents);

      // Step 7: 组装最终结果
      const durationMs = Date.now() - startTime;

      const reviewResult: KycReviewResult = {
        reviewId: `KYCR_${Date.now().toString(36).toUpperCase()}`,
        didId: kycRecord.didId,
        userId: kycRecord.userId,
        recommendation: recommendation.decision,
        riskLevel: riskAssessment.overallRiskLevel,
        confidenceScore: recommendation.confidenceScore,
        riskFlags: riskAssessment.flags,
        documentAnalysis: documentSummary,
        identityMatch: identityMatch,
        reviewedAt: new Date().toISOString(),
        notes: recommendation.notes,
      };

      this.logger.log(
        `KYC 审核完成 | reviewId=${reviewResult.reviewId} | 建议=${recommendation.decision}` +
          ` | 风险等级=${RISK_LEVEL_LABELS[riskAssessment.overallRiskLevel]}` +
          ` | 置信度=${recommendation.confidenceScore}% | 耗时=${durationMs}ms`
      );

      return {
        success: true,
        data: reviewResult as unknown as Record<string, unknown>,
        metrics: {
          durationMs,
          itemsProcessed: kycRecord.documents.length,
        },
      };
    } catch (error) {
      return this.onError(error as Error, payload);
    }
  }

  /**
   * 预处理：校验 KYC 审核必需参数
   */
  override async preprocess(payload: ITaskPayload): Promise<ITaskPayload> {
    this.logger.debug('KYC 策略预处理：参数校验');

    if (!payload.didId && !payload.userId) {
      throw new Error('KYC 审核任务至少需要以下参数之一: didId 或 userId');
    }

    return payload;
  }

  // ==================== 核心处理流程 ====================

  /**
   * 获取 KYC 记录及关联文档（模拟 Prisma 查询）
   *
   * Phase 3: 替换为真实的 Prisma 查询
   */
  private async fetchKycRecord(targetId: number, payload: ITaskPayload): Promise<KycRecord | null> {
    await this.delay(80, 200);

    // 模拟 KYC 记录
    const docTypes: KycDocType[] = ['id_card_front', 'id_card_back', 'selfie', 'address_proof'];
    const documents: KycDocument[] = docTypes.map((docType, index) => ({
      id: index + 1,
      kycRecordId: targetId,
      docType,
      fileUrl: `/storage/kyc/${targetId}/${docType}_${Date.now()}.jpg`,
      uploadStatus: 'pending' as const,
      ocrStatus: 'pending' as const,
      uploadedAt: new Date(Date.now() - this.getRandomInt(3600000, 86400000 * 3)),
    }));

    return {
      id: targetId,
      didId: payload.didId || targetId,
      userId: payload.userId || targetId,
      status: 'in_review',
      submittedAt: new Date(Date.now() - this.getRandomInt(3600000, 86400000 * 3)),
      documents,
      riskFlags: [],
      previousReviews: this.generateRandomHistory(),
    };
  }

  /**
   * 对所有文档执行 OCR 识别（模拟）
   *
   * Phase 3: 接入真实 OCR 服务（如百度 OCR、腾讯云 OCR）
   */
  private async performOcrOnDocuments(
    documents: KycDocument[]
  ): Promise<Map<KycDocType, OcrResult>> {
    const results = new Map<KycDocType, OcrResult>();

    for (const doc of documents) {
      await this.delay(200, 800); // 模拟 OCR 处理时间

      const ocrResult: OcrResult = this.mockOcrForDocType(doc.docType);
      results.set(doc.docType, ocrResult);

      this.logger.debug(
        `OCR 完成: ${DOC_TYPE_LABELS[doc.docType]} | 置信度=${ocrResult.confidenceScore}% | 耗时=${ocrResult.processingTimeMs}ms`
      );
    }

    return results;
  }

  /**
   * 身份信息交叉比对
   *
   * 比对各文档中提取的身份字段是否一致
   */
  private async crossReferenceIdentity(
    ocrResults: Map<KycDocType, OcrResult>,
    _kycRecord: KycRecord
  ): Promise<IdentityMatchResult> {
    await this.delay(300, 600);

    // 从身份证正面提取基准信息
    const idCardFront = ocrResults.get('id_card_front');
    const idCardBack = ocrResults.get('id_card_back');
    const selfie = ocrResults.get('selfie');

    const baseName = idCardFront?.extractedFields['name'] || '';
    const backName = idCardBack?.extractedFields['name'] || '';

    // 模拟匹配逻辑
    const nameMatch =
      !baseName ||
      !backName ||
      baseName === backName ||
      this.similarityScore(baseName, backName) > 0.9;
    const dobMatch = true; // 模拟出生日期一致
    const documentNumberConsistent = true; // 模拟证件号一致
    const selfieMatchScore = selfie ? this.getRandomInt(78, 98) : 0;

    const overallScore = Math.round(
      Number(nameMatch) * 25 +
        Number(dobMatch) * 20 +
        Number(documentNumberConsistent) * 20 +
        selfieMatchScore * 0.35
    );

    return {
      nameMatch,
      dobMatch,
      documentNumberConsistent,
      selfieMatchScore,
      addressConsistency: overallScore > 80 ? '一致' : '存在差异需核实',
      overallScore,
    };
  }

  /**
   * 多维风险评估
   *
   * 从四个维度评估风险：文档真实性、身份一致性、行为异常、制裁名单
   */
  private async assessRisks(
    kycRecord: KycRecord,
    ocrResults: Map<KycDocType, OcrResult>,
    identityMatch: IdentityMatchResult
  ): Promise<{ flags: RiskFlag[]; overallRiskLevel: RiskLevel; score: number }> {
    await this.delay(200, 400);

    const flags: RiskFlag[] = [];

    // 维度 1: 文档真实性检查
    for (const [docType, ocrResult] of ocrResults) {
      if (ocrResult.confidenceScore < 70) {
        flags.push({
          code: `DOC_LOW_CONF_${docType.toUpperCase()}`,
          severity: 'medium',
          category: 'document',
          description: `${DOC_TYPE_LABELS[docType]} OCR 识别置信度偏低 (${ocrResult.confidenceScore}%)`,
          detail: `可能原因：图像模糊、反光遮挡、证件磨损`,
        });
      }
      if (ocrResult.warnings.length > 0) {
        flags.push({
          code: `DOC_WARNING_${docType.toUpperCase()}`,
          severity: 'low',
          category: 'document',
          description: `${DOC_TYPE_LABELS[docType]} 存在 ${ocrResult.warnings.length} 条警告`,
          detail: ocrResult.warnings.join('; '),
        });
      }
    }

    // 维度 2: 身份一致性检查
    if (!identityMatch.nameMatch) {
      flags.push({
        code: 'IDENTITY_NAME_MISMATCH',
        severity: 'high',
        category: 'identity',
        description: '多份文档中的姓名信息不一致',
        detail: '身份证正反面或与其他证件姓名不符',
      });
    }
    if (identityMatch.selfieMatchScore < 75) {
      flags.push({
        code: 'SELFIE_LOW_MATCH',
        severity: identityMatch.selfieMatchScore < 50 ? 'critical' : 'high',
        category: 'identity',
        description: `活体自拍与证件照匹配度过低 (${identityMatch.selfieMatchScore}%)`,
        detail: '可能存在代冒风险，建议人工复核',
      });
    }

    // 维度 3: 行为异常检查
    if (kycRecord.previousReviews && kycRecord.previousReviews.length > 2) {
      flags.push({
        code: 'MULTIPLE_SUBMISSIONS',
        severity: 'medium',
        category: 'behavioral',
        description: `该用户已有 ${kycRecord.previousReviews?.length || 0} 次提交记录`,
        detail: '多次提交 KYC 可能表明前次审核未通过或有其他异常',
      });
    }

    // 维度 4: 制裁名单模拟检查（通常为低概率命中）
    if (Math.random() < 0.02) {
      // 2% 概率模拟命中
      flags.push({
        code: 'SANCTIONS_HIT',
        severity: 'critical',
        category: 'sanctions',
        description: '身份信息与制裁名单存在潜在匹配',
        detail: '需进一步人工核实身份真实性',
      });
    }

    // 综合风险等级判定
    const hasCritical = flags.some((f) => f.severity === 'critical');
    const hasHigh = flags.some((f) => f.severity === 'high');
    const mediumCount = flags.filter((f) => f.severity === 'medium').length;
    const lowCount = flags.filter((f) => f.severity === 'low').length;

    let overallRiskLevel: RiskLevel;
    let score: number;

    if (hasCritical) {
      overallRiskLevel = 'critical';
      score = this.getRandomInt(0, 25);
    } else if (hasHigh) {
      overallRiskLevel = 'high';
      score = this.getRandomInt(26, 50);
    } else if (mediumCount >= 2) {
      overallRiskLevel = 'high';
      score = this.getRandomInt(45, 58);
    } else if (mediumCount >= 1 || lowCount >= 3) {
      overallRiskLevel = 'medium';
      score = this.getRandomInt(59, 75);
    } else {
      overallRiskLevel = 'low';
      score = this.getRandomInt(76, 98);
    }

    return { flags, overallRiskLevel, score };
  }

  /**
   * 生成审核建议
   */
  private generateRecommendation(
    riskAssessment: { overallRiskLevel: RiskLevel; flags: RiskFlag[] },
    identityMatch: IdentityMatchResult
  ): { decision: 'approve' | 'reject' | 'manual_review'; confidenceScore: number; notes: string } {
    const { overallRiskLevel, flags } = riskAssessment;

    let decision: 'approve' | 'reject' | 'manual_review';
    let notes: string;

    switch (overallRiskLevel) {
      case 'critical':
        decision = 'reject';
        notes = `检测到 ${flags.filter((f) => f.severity === 'critical').length} 个严重风险标记，建议拒绝本次申请。用户需重新提交完整材料。`;
        break;
      case 'high':
        decision = 'manual_review';
        notes = `检测到高风险标记 ${flags.filter((f) => f.severity === 'high').length} 个，建议转人工审核团队进行详细核查。`;
        break;
      case 'medium':
        decision = identityMatch.overallScore > 70 ? 'manual_review' : 'reject';
        notes =
          overallRiskLevel === 'medium'
            ? `存在若干中等风险标记，结合身份匹配分数(${identityMatch.overallScore})，建议${decision === 'manual_review' ? '人工复核' : '拒绝'}。`
            : '中等风险且身份匹配不足，建议拒绝。';
        break;
      case 'low':
        decision = 'approve';
        notes = `审核通过。所有文档验证正常，身份信息一致性好(${identityMatch.overallScore}分)，无重大风险标记。`;
        break;
      default:
        decision = 'manual_review';
        notes = '无法自动判定，转人工审核。';
    }

    const confidenceScore =
      overallRiskLevel === 'low'
        ? this.getRandomInt(85, 97)
        : overallRiskLevel === 'medium'
          ? this.getRandomInt(65, 82)
          : overallRiskLevel === 'high'
            ? this.getRandomInt(40, 62)
            : this.getRandomInt(15, 35);

    return { decision, confidenceScore, notes };
  }

  // ==================== 辅助方法 ====================

  /**
   * 构建文档分析摘要
   */
  private buildDocumentAnalysisSummary(
    ocrResults: Map<KycDocType, OcrResult>,
    documents: KycDocument[]
  ): DocumentAnalysisSummary {
    const details: DocumentAnalysisSummary['details'] = [];

    for (const doc of documents) {
      const ocr = ocrResults.get(doc.docType);
      details.push({
        docType: doc.docType,
        status: ocr?.success ? 'verified' : 'rejected',
        ocrConfidence: ocr?.confidenceScore || 0,
        issues: ocr?.warnings || [],
      });
    }

    return {
      totalDocuments: documents.length,
      verifiedDocuments: details.filter((d) => d.status === 'verified').length,
      rejectedDocuments: details.filter((d) => d.status === 'rejected').length,
      pendingDocuments: details.filter((d) => d.status === 'pending').length,
      details,
    };
  }

  /**
   * 模拟针对不同文档类型的 OCR 结果
   */
  private mockOcrForDocType(docType: KycDocType): OcrResult {
    const baseFields: Record<KycDocType, Record<string, string>> = {
      id_card_front: {
        name: '张三',
        gender: '男',
        nation: '汉',
        birth: '19900101',
        address: '北京市朝阳区某某街道XX号',
        idNumber: '110101199001011234',
      },
      id_card_back: {
        name: '张三',
        issueAuthority: '北京市公安局朝阳分局',
        validPeriod: '2015.01.01-2035.01.01',
      },
      passport: {
        name: '张三 SAN ZHANG',
        nationality: '中国',
        passportNumber: 'E12345678',
        birth: '1990-01-01',
        expiry: '2035-06-15',
      },
      driver_license: {
        name: '张三',
        licenseNumber: '110101199001011234',
        vehicleClass: 'C1',
        validFrom: '2020-03-15',
        validTo: '2026-03-15',
      },
      selfie: { faceDetected: 'true', livenessPassed: 'true', faceQuality: 'good' },
      address_proof: {
        address: '北京市朝阳区某某街道XX号XX小区X号楼X单元XXX室',
        holderName: '张三',
        issueDate: '2025-01',
      },
      business_license: {
        companyName: '某某科技有限公司',
        creditCode: '91110105MA01ABCD2X',
        legalPerson: '张三',
        registeredCapital: '100万元',
      },
    };

    const confidenceBase: Record<KycDocType, number> = {
      id_card_front: 96,
      id_card_back: 93,
      passport: 91,
      driver_license: 89,
      selfie: 88,
      address_proof: 82,
      business_license: 85,
    };

    const baseConfidence = confidenceBase[docType];
    const confidenceVariance = this.getRandomInt(-5, 5);
    const finalConfidence = Math.max(60, Math.min(99, baseConfidence + confidenceVariance));

    const warnings: string[] = [];
    if (finalConfidence < 85) {
      warnings.push('图像质量一般，部分区域模糊');
    }
    if (docType === 'selfie' && Math.random() < 0.1) {
      warnings.push('检测到非正面角度，可能影响比对精度');
    }

    return {
      docType,
      success: finalConfidence >= 60,
      extractedFields: baseFields[docType] || {},
      confidenceScore: finalConfidence,
      warnings,
      processingTimeMs: this.getRandomInt(300, 1200),
    };
  }

  /**
   * 生成随机历史审核记录
   */
  private generateRandomHistory(): ReviewHistoryItem[] | undefined {
    if (Math.random() > 0.3) return undefined; // 70% 概率为首次提交

    const count = this.getRandomInt(1, 3);
    return Array.from({ length: count }, (_, i) => ({
      reviewedAt: new Date(Date.now() - 86400000 * (count - i) * 10),
      reviewerId: 100 + i,
      decision: i < count - 1 ? ('rejected' as const) : ('approved' as const),
      reason: i < count - 1 ? `材料不全/信息有误 #${i + 1}` : '补齐材料后通过',
    }));
  }

  /** 简单文本相似度计算 */
  private similarityScore(a: string, b: string): number {
    if (!a || !b) return 0;
    const setA = new Set(a.split(''));
    const setB = new Set(b.split(''));
    const intersection = [...setA].filter((x) => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  /** 延迟工具 */
  private delay(minMs: number, maxMs: number): Promise<void> {
    const ms = minMs + Math.random() * (maxMs - minMs);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** 随机整数 */
  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
