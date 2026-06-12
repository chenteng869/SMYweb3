import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { createHash, randomBytes } from 'crypto';
import { ethers, Wallet, Contract, formatUnits } from 'ethers';

/**
 * 区块链存证核心服务
 *
 * 提供文件上链存证、链上验证、IPFS 存储等能力。
 * 支持开发模式（Mock 区块链）与生产模式（真实链上交互）自动切换。
 */
@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  /** 区块链 RPC 节点地址 */
  private readonly rpcUrl: string;

  /** 智能合约地址 */
  private readonly contractAddress: string;

  /** 签名私钥（仅服务端持有） */
  private readonly privateKey: string;

  /** 链 ID */
  private readonly chainId: number;

  /** IPFS 网关地址 */
  private readonly ipfsGatewayUrl: string;

  /** 是否启用开发模式（Mock 区块链） */
  private readonly devMode: boolean;

  /** ABI 定义（EvidenceRegistry 合约标准接口） */
  private readonly CONTRACT_ABI = [
    'function storeEvidence(bytes32 fileHash, string ipfsCid, bytes metadata) external returns (uint256 evidenceId)',
    'function getEvidence(uint256 evidenceId) external view returns (address submitter, bytes32 fileHash, string ipfsCid, uint256 timestamp, bool isValid)',
    'function verifyEvidence(uint256 evidenceId) external view returns (bool)',
    'event EvidenceStored(uint256 indexed evidenceId, address indexed submitter, bytes32 fileHash, string ipfsCid, uint256 timestamp)',
  ];

  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
    private configService: ConfigService
  ) {
    this.rpcUrl = this.configService.get<string>('BLOCKCHAIN_RPC_URL', '')!;
    this.contractAddress = this.configService.get<string>('BLOCKCHAIN_CONTRACT_ADDRESS', '')!;
    this.privateKey = this.configService.get<string>('BLOCKCHAIN_PRIVATE_KEY', '')!;
    this.chainId = this.configService.get<number>('BLOCKCHAIN_CHAIN_ID', 31337);
    this.ipfsGatewayUrl = this.configService.get<string>('IPFS_GATEWAY_URL', 'https://ipfs.io');
    this.devMode = !this.rpcUrl || !this.contractAddress || !this.privateKey;

    if (this.devMode) {
      this.logger.warn('⚠️  区块链配置不完整，已切换至开发模式（使用 Mock 数据）');
      this.logger.warn(
        '   请配置 BLOCKCHAIN_RPC_URL / BLOCKCHAIN_CONTRACT_ADDRESS / BLOCKCHAIN_PRIVATE_KEY 以启用生产模式'
      );
    } else {
      this.logger.log(
        `✅ 区块链存证服务初始化完成 | ChainId: ${this.chainId} | Contract: ${this.contractAddress}`
      );
    }
  }

  // ==================== 核心业务方法 ====================

  /**
   * 创建区块链存证记录
   *
   * 完整流程：获取文件 → 计算/读取哈希 → 上传 IPFS → 提交区块链 → 写入数据库
   *
   * @param fileId 文件存储表主键
   * @param didId 可选的 DID 关联 ID
   * @param userId 操作用户 ID
   * @returns 包含 evidenceId / txHash / blockNumber 的结果
   */
  async createEvidence(
    fileId: number,
    didId?: number,
    userId?: number
  ): Promise<{
    evidenceId: number;
    txHash: string;
    blockNumber: number;
  }> {
    this.logger.log(
      `[createEvidence] 开始创建存证 | fileId=${fileId} didId=${didId ?? '-'} userId=${userId ?? '-'}`
    );

    // 1. 查询文件存储记录，获取文件哈希和原始数据
    const fileRecord = await this.prisma.fileStorage.findUnique({
      where: { id: fileId },
    });
    if (!fileRecord) {
      throw new NotFoundException(`文件记录不存在: fileId=${fileId}`);
    }
    if (!fileRecord.hashSha256) {
      throw new BadRequestException('该文件尚未计算 SHA256 哈希，无法进行存证');
    }

    const fileHash = fileRecord.hashSha256;
    this.logger.debug(`[createEvidence] 文件哈希: ${fileHash}`);

    // 2. 从 MinIO 获取文件 Buffer 并上传到 IPFS
    let ipfsCid: string;
    try {
      const fileBuffer = await this.fetchFileBuffer(fileRecord);
      ipfsCid = await this.uploadToIpfs(fileBuffer, fileRecord.fileName || `evidence_${fileId}`);
      this.logger.log(`[createEvidence] IPFS 上传成功 | CID: ${ipfsCid}`);
    } catch (err: any) {
      this.logger.error(`[createEvidence] IPFS 上传失败: ${err.message}`);
      // 开发模式允许继续（使用模拟 CID）
      ipfsCid = this.devMode
        ? `QmMock${randomBytes(8).toString('hex')}`
        : ((): never => {
            throw err;
          })();
    }

    // 3. 提交到区块链智能合约
    let chainResult: { txHash: string; blockNumber: number };
    try {
      chainResult = await this.submitToBlockchain(fileHash, ipfsCid, {
        fileId,
        didId,
        userId,
        fileName: fileRecord.fileName,
      });
      this.logger.log(
        `[createEvidence] 区块链提交成功 | txHash: ${chainResult.txHash} | blockNumber: ${chainResult.blockNumber}`
      );
    } catch (err: any) {
      this.logger.error(`[createEvidence] 区块链提交失败: ${err.message}`);
      throw new BadRequestException(`区块链交易失败: ${err.message}`);
    }

    // 4. 写入数据库记录
    const evidence = await this.prisma.blockchainEvidence.create({
      data: {
        fileId: { connect: { id: fileId } },
        didId: didId ? { connect: { id: didId } } : undefined,
        fileHash,
        metadata: JSON.stringify({ ipfsCid }),
        txHash: chainResult.txHash,
        blockNumber: chainResult.blockNumber,
        chainId: this.chainId,
        contractAddress: this.contractAddress || null,
        isVerified: true,
      } as any,
    });

    this.logger.log(
      `[createEvidence] 存证创建成功 | evidenceId=${evidence.id} | txHash=${evidence.txHash}`
    );

    return {
      evidenceId: evidence.id,
      txHash: evidence.txHash!,
      blockNumber: Number(evidence.blockNumber!),
    };
  }

  /**
   * 验证区块链存证有效性
   *
   * 从数据库读取记录后，向区块链查询交易回执并比对链上数据
   *
   * @param evidenceId 存证记录 ID
   * @returns 验证结果：是否有效、链上哈希、验证时间
   */
  async verifyEvidence(evidenceId: number): Promise<{
    isValid: boolean;
    onChainHash: string;
    verifiedAt: Date;
  }> {
    this.logger.log(`[verifyEvidence] 开始验证存证 | evidenceId=${evidenceId}`);

    // 1. 查询本地记录
    const evidence = await this.prisma.blockchainEvidence.findUnique({
      where: { id: evidenceId },
    });
    if (!evidence) {
      throw new NotFoundException(`存证记录不存在: evidenceId=${evidenceId}`);
    }

    // 2. 开发模式下直接返回模拟验证结果
    if (this.devMode) {
      this.logger.warn(`[verifyEvidence] 开发模式 — 返回模拟验证结果`);
      const verifiedAt = new Date();
      await this.prisma.blockchainEvidence.update({
        where: { id: evidenceId },
        data: { isVerified: true, verifiedAt },
      });
      return {
        isValid: true,
        onChainHash: evidence.fileHash,
        verifiedAt,
      };
    }

    // 3. 向区块链查询交易回执
    let onChainData: { fileHash: string; isValid: boolean };
    try {
      const provider = new ethers.JsonRpcProvider(this.rpcUrl);
      const receipt = await provider.getTransactionReceipt(evidence.txHash!);

      if (!receipt || receipt.status === 0) {
        // 交易失败或不存在
        await this.prisma.blockchainEvidence.update({
          where: { id: evidenceId },
          data: { isVerified: false, verifiedAt: new Date() },
        });
        return {
          isValid: false,
          onChainHash: '',
          verifiedAt: new Date(),
        };
      }

      // 通过合约查询链上存证详情
      const contract = new Contract(this.contractAddress, this.CONTRACT_ABI, provider);
      const stored = await contract.getEvidence(evidenceId);
      onChainData = {
        fileHash: stored.fileHash,
        isValid: stored.isValid !== false,
      };
    } catch (err: any) {
      this.logger.error(`[verifyEvidence] 链上查询失败: ${err.message}`);
      throw new BadRequestException(`链上验证失败: ${err.message}`);
    }

    // 4. 比对链上哈希与本地记录
    const isMatch = onChainData.fileHash === `0x${evidence.fileHash}`;
    const isValid = isMatch && onChainData.isValid && evidence.isVerified;

    // 5. 更新验证状态
    const verifiedAt = new Date();
    await this.prisma.blockchainEvidence.update({
      where: { id: evidenceId },
      data: {
        isVerified: isValid,
        verifiedAt,
      },
    });

    this.logger.log(`[verifyEvidence] 验证完成 | evidenceId=${evidenceId} | valid=${isValid}`);

    return {
      isValid,
      onChainHash: onChainData.fileHash,
      verifiedAt,
    };
  }

  /**
   * 根据交易哈希查询单条存证记录
   *
   * @param txHash 区块链交易哈希
   * @returns 存证详情对象
   */
  async getEvidenceByTxHash(txHash: string): Promise<object> {
    const evidence = await this.prisma.blockchainEvidence.findFirst({
      where: { txHash },
      include: {
        file: { select: { id: true, fileName: true, sizeBytes: true, mimeType: true } },
        did: { select: { id: true, did: true } },
      },
    });
    if (!evidence) {
      throw new NotFoundException(`未找到对应存证记录: txHash=${txHash}`);
    }
    return evidence;
  }

  /**
   * 查询某文件的所有存证记录
   *
   * @param fileId 文件存储 ID
   * @returns 该文件的存证列表
   */
  async getEvidenceByFileId(fileId: number): Promise<object[]> {
    return this.prisma.blockchainEvidence.findMany({
      where: { fileId },
      orderBy: { createdAt: 'desc' },
      include: {
        did: { select: { id: true, did: true } },
      },
    });
  }

  /**
   * 分页查询用户的存证记录列表
   *
   * @param userId 用户 ID
   * @param page 页码（默认 1）
   * @param limit 每页条数（默认 20）
   * @returns 分页结果：items + total
   */
  async getUserEvidences(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    items: object[];
    total: number;
  }> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.blockchainEvidence.findMany({
        where: { didId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          file: { select: { id: true, fileName: true, sizeBytes: true, mimeType: true } },
        },
      }),
      this.prisma.blockchainEvidence.count({ where: { didId: userId } }),
    ]);

    return { items, total };
  }

  /**
   * 生成公开可访问的存证验证 URL
   *
   * @param evidenceId 存证记录 ID 或交易哈希
   * @returns 公开验证链接
   */
  generateProofUrl(evidenceId: string): string {
    const baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3000');
    return `${baseUrl}/api/evidence/proof/${evidenceId}`;
  }

  // ==================== 工具方法 ====================

  /**
   * 计算文件的 SHA256 哈希值
   *
   * 使用 Node.js 内置 crypto 模块，输出十六进制小写字符串
   *
   * @param fileBuffer 文件二进制内容
   * @returns SHA256 十六进制哈希字符串
   */
  calculateFileHash(fileBuffer: Buffer): string {
    return createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * 提交存证数据到区块链智能合约
   *
   * 使用 ethers.js v6 的 Wallet + Contract 进行链上交互，
   * 自动处理 Gas 估算和 Nonce 管理。开发环境下返回 Mock 数据。
   *
   * @param fileHash 文件 SHA256 哈希
   * @param ipfsCid IPFS 内容标识符
   * @param metadata 可选元数据对象
   * @returns 交易结果：txHash 和 blockNumber
   */
  async submitToBlockchain(
    fileHash: string,
    ipfsCid: string,
    metadata?: object
  ): Promise<{ txHash: string; blockNumber: number }> {
    // 开发模式：返回模拟交易数据
    if (this.devMode) {
      this.logger.warn('[submitToBlockchain] 开发模式 — 返回 Mock 交易');
      const mockTxHash = `0x${randomBytes(32).toString('hex')}`;
      const mockBlockNumber = Math.floor(Date.now() / 1000);
      return { txHash: mockTxHash, blockNumber: mockBlockNumber };
    }

    try {
      const provider = new ethers.JsonRpcProvider(this.rpcUrl);
      const wallet = new Wallet(this.privateKey, provider);
      const contract = new Contract(this.contractAddress, this.CONTRACT_ABI, wallet);

      // 将文件哈希转为 bytes32 格式（需加 0x 前缀）
      const hashBytes32 = fileHash.startsWith('0x') ? fileHash : `0x${fileHash}`;

      // 将元数据序列化为 bytes
      const metadataBytes = metadata ? ethers.toUtf8Bytes(JSON.stringify(metadata)) : '0x';

      // 发送交易
      this.logger.log(`[submitToBlockchain] 正在提交链上交易...`);
      const tx = await contract.storeEvidence(hashBytes32, ipfsCid, metadataBytes);

      this.logger.log(`[submitToBlockchain] 交易已发送 | txHash: ${tx.hash} | 等待确认...`);

      // 等待交易确认
      const receipt = await tx.wait();

      if (!receipt || receipt.status === 0) {
        throw new Error('交易执行失败或在链上被回滚');
      }

      this.logger.log(
        `[submitToBlockchain] 交易确认成功 | blockNumber: ${receipt.blockNumber} | gasUsed: ${receipt.gasUsed.toString()}`
      );

      return {
        txHash: receipt.hash,
        blockNumber: Number(receipt.blockNumber),
      };
    } catch (err: any) {
      this.logger.error(`[submitToBlockchain] 链上交易异常: ${err.message}`);
      // 将常见错误转换为更友好的提示
      if (err.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new Error('合约执行可能失败（Gas 估算异常），请检查合约状态');
      }
      if (err.code === 'NONCE_EXPIRED' || err.code === 'REPLACEMENT_UNDERPRICED') {
        throw new Error('Nonce 冲突，请稍后重试');
      }
      throw err;
    }
  }

  /**
   * 上传文件到 IPFS 分布式存储
   *
   * 优先通过 HTTP API 接入 IPFS 节点；
   * 若 IPFS 不可用，则降级使用 MinIO 作为本地备用存储。
   *
   * @param fileBuffer 文件二进制内容
   * @param fileName 文件名
   * @returns IPFS Content Identifier (CID)
   */
  async uploadToIpfs(fileBuffer: Buffer, fileName: string): Promise<string> {
    // 尝试通过 IPFS HTTP API 上传
    const ipfsApiUrl = this.configService.get<string>('IPFS_API_URL', '');

    if (ipfsApiUrl) {
      try {
        const formData = new FormData();
        formData.append('file', new Blob([new Uint8Array(fileBuffer)]), fileName);

        const response = await fetch(`${ipfsApiUrl}/api/v0/add`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          this.logger.log(`[uploadToIpfs] IPFS 直传成功 | Hash: ${result.Hash}`);
          return result.Hash;
        }

        this.logger.warn(
          `[uploadToIpfs] IPFS API 返回错误: ${response.status} ${response.statusText}`
        );
      } catch (err: any) {
        this.logger.warn(`[uploadToIpfs] IPFS 连接失败: ${err.message}，降级至 MinIO 存储`);
      }
    }

    // 降级方案：上传到 MinIO 的 evidence bucket
    try {
      const objectName = `ipfs-fallback/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      await this.minio.upload('smyweb3-evidence', objectName, fileBuffer, {
        contentType: 'application/octet-stream',
        size: fileBuffer.length,
      });

      // 使用 SHA256 哈希作为伪 CID
      const pseudoCid = this.calculateFileHash(fileBuffer);
      this.logger.log(`[uploadToIpfs] MinIO 降级存储成功 | pseudoCid: ${pseudoCid}`);
      return `minio-fallback-${pseudoCid}`;
    } catch (minioErr: any) {
      this.logger.error(`[uploadToIpfs] MinIO 降级也失败了: ${minioErr.message}`);
      throw new Error(`文件上传失败（IPFS 和 MinIO 均不可用）: ${minioErr.message}`);
    }
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 从 MinIO 获取文件原始 Buffer
   *
   * @param fileRecord FileStorage 数据库记录
   * @returns 文件二进制内容
   */
  private async fetchFileBuffer(fileRecord: any): Promise<Buffer> {
    // 如果记录中包含 bucket 和 objectName 信息，直接从 MinIO 下载
    if (fileRecord.bucketName && fileRecord.objectName) {
      // 使用 minio service 的内部方法下载
      const presigned = await this.minio.getPresignedGetUrl(
        fileRecord.bucketName,
        fileRecord.objectName,
        3600
      );
      const resp = await fetch(presigned.downloadUrl || presigned.uploadUrl);
      if (!resp.ok) throw new Error(`MinIO 下载失败: ${resp.status}`);
      return Buffer.from(await resp.arrayBuffer());
    }

    // 备选：如果记录中有完整 URL，直接 fetch
    if (fileRecord.url || fileRecord.fileUrl) {
      const fileUrl = fileRecord.url || fileRecord.fileUrl;
      const resp = await fetch(fileUrl);
      if (!resp.ok) throw new Error(`文件下载失败: ${resp.status}`);
      return Buffer.from(await resp.arrayBuffer());
    }

    throw new Error('无法从文件记录中获取可下载地址');
  }
}
