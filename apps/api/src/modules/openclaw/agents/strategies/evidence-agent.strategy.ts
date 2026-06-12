import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { BaseAgentStrategy } from './base-agent.strategy';
import { ITaskPayload, ITaskResult, TaskType } from '../types/task.types';
import { IAgentSession } from '../types/agent.types';

/**
 * 文件存储记录（模拟 Prisma FileStorage 结构）
 */
interface FileStorageRecord {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  fileHash?: string;
  bucketName: string;
  uploadedAt: Date;
  uploadedBy: number;
  status: 'active' | 'archived' | 'deleted';
}

/**
 * 区块链存证结果
 */
interface EvidenceRecord {
  /** 存证记录 ID */
  evidenceId: string;
  /** 关联文件 ID */
  fileId: number;
  /** 文件名 */
  fileName: string;
  /** SHA256 哈希值 */
  fileHashSha256;
  /** 文件大小（字节） */
  fileSize: number;
  /** 区块链交易哈希 */
  txHash: string;
  /** 区块高度 */
  blockNumber: number;
  /** 上链时间戳 */
  timestamp: string;
  /** 合约地址 */
  contractAddress: string;
  /** 网络/链 ID */
  chainId: number;
  /** Gas 费用（模拟） */
  gasUsed: string;
  /** 存证状态 */
  status: 'confirmed' | 'pending' | 'failed';
  /** 存证证明 URL（模拟） */
  proofUrl?: string;
}

/**
 * 区块链存证 Agent 策略
 *
 * 负责将文件/数据的数字指纹（SHA256哈希）提交至区块链进行不可篡改存证。
 * 工作流程：文件定位 → 元数据获取 → SHA256 哈希计算 → 智能合约提交 → 存证记录返回
 *
 * 安全特性：
 * - 文件完整性通过 SHA-256 哈希保证
 * - 存证记录写入区块链后不可篡改
 * - 支持后续验真（通过 txHash + fileHash 双重验证）
 *
 * 当前版本为模拟实现（Mock），Phase 3 将接入真实区块链合约服务。
 */
@Injectable()
export class EvidenceAgentStrategy extends BaseAgentStrategy {
  override readonly strategyName = 'evidence-agent';

  override readonly supportedTaskTypes: TaskType[] = [TaskType.EVIDENCE];

  /** 模拟使用的合约地址 */
  private static readonly MOCK_CONTRACT_ADDRESS = '0x EvidenceContract123456789abcdef';

  /** 模拟使用的链 ID */
  private static readonly MOCK_CHAIN_ID = 137; // Polygon Mainnet

  constructor() {
    super();
  }

  /**
   * 执行区块链存证任务
   *
   * @param session - Agent 会话
   * @param payload - 任务负载（fileId 为必需参数）
   * @returns 存证记录（含 txHash、blockNumber、timestamp 等）
   */
  async execute(session: IAgentSession, payload: ITaskPayload): Promise<ITaskResult> {
    const startTime = Date.now();

    this.logger.log(`开始执行区块链存证任务 | 会话ID=${session.id} | fileId=${payload.fileId}`);

    try {
      // Step 1: 校验必需参数
      if (!payload.fileId) {
        throw new Error('存证任务缺少必需参数: fileId（文件 ID）');
      }

      // Step 2: 从 FileStorage 获取文件元信息（模拟 Prisma 查询）
      this.logger.log(`正在查询 FileStorage 记录, fileId=${payload.fileId}`);
      const fileInfo = await this.fetchFileStorageRecord(payload.fileId);

      if (!fileInfo) {
        throw new Error(`未找到文件记录: fileId=${payload.fileId}，请确认文件已正确上传`);
      }

      if (fileInfo.status !== 'active') {
        throw new Error(
          `文件状态异常: ${fileInfo.fileName} 当前状态为 ${fileInfo.status}，仅 active 状态文件可存证`
        );
      }

      // Step 3: 计算 SHA-256 哈希（模拟：基于文件元数据生成确定性哈希）
      this.logger.log(`正在计算文件 SHA-256 哈希: ${fileInfo.fileName}`);
      const fileHash = await this.calculateFileHash(fileInfo);

      // Step 4: 提交至区块链合约（模拟上链）
      this.logger.log(`正在提交存证至区块链合约... 文件哈希=${fileHash.substring(0, 16)}...`);
      const blockchainResult = await this.submitToBlockchain(fileInfo, fileHash);

      // Step 5: 构建存证记录并返回
      const durationMs = Date.now() - startTime;

      const evidenceRecord: EvidenceRecord = {
        evidenceId: `EVI_${randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase()}`,
        fileId: fileInfo.id,
        fileName: fileInfo.fileName,
        fileSize: fileInfo.fileSize,
        fileHashSha256: fileHash,
        txHash: blockchainResult.txHash,
        blockNumber: blockchainResult.blockNumber,
        timestamp: blockchainResult.timestamp,
        contractAddress: EvidenceAgentStrategy.MOCK_CONTRACT_ADDRESS,
        chainId: EvidenceAgentStrategy.MOCK_CHAIN_ID,
        gasUsed: blockchainResult.gasUsed,
        status: 'confirmed',
        proofUrl: `/api/v1/evidence/${blockchainResult.txHash}/proof`,
      };

      this.logger.log(
        `区块链存证成功 | evidenceId=${evidenceRecord.evidenceId} | txHash=${evidenceRecord.txHash} | blockNumber=${evidenceRecord.blockNumber} | 耗时=${durationMs}ms`
      );

      return {
        success: true,
        data: evidenceRecord as unknown as Record<string, unknown>,
        metrics: {
          durationMs,
          itemsProcessed: 1,
        },
      };
    } catch (error) {
      return this.onError(error as Error, payload);
    }
  }

  /**
   * 预处理：校验存证任务必需参数
   */
  override async preprocess(payload: ITaskPayload): Promise<ITaskPayload> {
    this.logger.debug('存证策略预处理：参数校验');

    if (!payload.fileId) {
      throw new Error('存证任务缺少必需参数: fileId');
    }

    if (typeof payload.fileId !== 'number' || payload.fileId <= 0) {
      throw new Error(`fileId 必须为正整数，当前值: ${payload.fileId}`);
    }

    return payload;
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 从 FileStorage 表查询文件记录（模拟 Prisma 操作）
   *
   * Phase 3: 替换为真实的 PrismaService.fileStorage.findUnique()
   */
  private async fetchFileStorageRecord(fileId: number): Promise<FileStorageRecord | null> {
    // 模拟数据库查询延迟
    await this.delay(50, 150);

    // 模拟返回文件记录
    // 在真实环境中，这里应该调用:
    // return this.prisma.fileStorage.findUnique({ where: { id: fileId } });
    return {
      id: fileId,
      fileName: `document_${fileId}_${randomUUID().substring(0, 8)}.pdf`,
      fileSize: this.getRandomInt(1024 * 100, 1024 * 1024 * 50), // 100KB ~ 50MB
      mimeType: 'application/pdf',
      filePath: `/uploads/documents/${fileId}/${randomUUID().substring(0, 8)}.pdf`,
      fileHash: undefined, // 尚未计算哈希
      bucketName: 'evidence-bucket-prod',
      uploadedAt: new Date(Date.now() - this.getRandomInt(0, 86400000 * 30)),
      uploadedBy: 1,
      status: 'active',
    };
  }

  /**
   * 计算文件的 SHA-256 哈希值
   *
   * 模拟实现：基于文件元数据生成确定性的伪哈希。
   * Phase 3: 应读取 MinIO/OSS 中的实际文件流进行真实哈希计算：
   *   const stream = this.minioClient.getObject(bucketName, filePath);
   *   return hashStream(stream, 'sha256');
   */
  private async calculateFileHash(fileInfo: FileStorageRecord): Promise<string> {
    // 模拟哈希计算延迟（大文件耗时更长）
    const simulatedDelay = Math.min(2000, Math.floor(fileInfo.fileSize / 10000));
    await this.delay(simulatedDelay, simulatedDelay + 200);

    // 基于文件元数据生成确定性哈希（仅用于演示）
    const rawData = `${fileInfo.id}:${fileInfo.fileName}:${fileInfo.fileSize}:${fileInfo.uploadedAt.toISOString()}:EVIDENCE_SALT`;
    return createHash('sha256').update(rawData).digest('hex');
  }

  /**
   * 提交存证数据至区块链智能合约（模拟）
   *
   * Phase 3: 接入真实区块链交互服务：
   *   const contract = this.blockchainService.getContract(EvidenceABI, CONTRACT_ADDRESS);
   *   const tx = await contract.storeEvidence(fileHash, metadata, timestamp);
   *   return { txHash: tx.hash, blockNumber: tx.blockNumber, ... };
   */
  private async submitToBlockchain(
    _fileInfo: FileStorageRecord,
    fileHash: string
  ): Promise<{ txHash: string; blockNumber: number; timestamp: string; gasUsed: string }> {
    // 模拟区块链交易确认延迟
    await this.delay(1000, 3000);

    // 生成模拟的交易哈希
    const txHash = `0x${createHash('sha256')
      .update(`${fileHash}_${Date.now()}_${randomUUID()}`)
      .digest('hex')
      .substring(0, 64)}`;

    // 模拟区块高度（基于当前时间的伪随机）
    const latestBlock = 55_000_000 + Math.floor(Date.now() / 15000); // 约 15 秒一个块
    const blockNumber = latestBlock + this.getRandomInt(1, 5);

    const timestamp = new Date().toISOString();

    // 模拟 Gas 消耗
    const gasUsed = (65000 + this.getRandomInt(0, 30000)).toString();

    this.logger.debug(
      `模拟上链完成 | txHash=${txHash.substring(0, 20)}... | blockNumber=${blockNumber} | gasUsed=${gasUsed}`
    );

    return { txHash, blockNumber, timestamp, gasUsed };
  }

  /** 延迟工具方法 */
  private delay(minMs: number, maxMs: number): Promise<void> {
    const ms = minMs + Math.random() * (maxMs - minMs);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** 随机整数生成 */
  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
