import { EvidenceService } from '@/modules/evidence/evidence.service';
import { PrismaService } from '@/common/prisma.service';
import { MinioService } from '@/common/services/minio.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';

jest.mock('@/common/prisma.service');
jest.mock('@/common/services/minio.service');

describe('EvidenceService', () => {
  let service: EvidenceService;
  let mockPrisma: any;
  let mockMinio: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockPrisma = {
      fileStorage: {
        findUnique: jest.fn(),
      },
      blockchainEvidence: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    mockMinio = {
      getPresignedGetUrl: jest.fn().mockResolvedValue('http://minio-url'),
      upload: jest.fn().mockResolvedValue({ url: 'http://minio-upload', etag: 'etag123' }),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, unknown> = {
          BLOCKCHAIN_RPC_URL: '',
          BLOCKCHAIN_CONTRACT_ADDRESS: '',
          BLOCKCHAIN_PRIVATE_KEY: '',
          BLOCKCHAIN_CHAIN_ID: 31337,
          IPFS_GATEWAY_URL: 'https://ipfs.io',
          API_BASE_URL: 'http://localhost:3000',
        };
        return config[key];
      }),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    (MinioService as unknown as jest.Mock).mockImplementation(() => mockMinio);

    service = new EvidenceService(
      mockPrisma as PrismaService,
      mockMinio as MinioService,
      mockConfigService as ConfigService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateFileHash - 文件哈希计算', () => {
    it('应返回正确的 SHA256 十六进制哈希字符串', () => {
      const buffer = Buffer.from('hello world');
      const hash = service.calculateFileHash(buffer);

      expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
      expect(hash.length).toBe(64); // SHA256 hex length
    });

    it('空 Buffer 应返回有效哈希', () => {
      const buffer = Buffer.from('');
      const hash = service.calculateFileHash(buffer);

      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('相同输入应产生相同输出（确定性）', () => {
      const buffer = Buffer.from('test data');
      const hash1 = service.calculateFileHash(buffer);
      const hash2 = service.calculateFileHash(buffer);

      expect(hash1).toBe(hash2);
    });
  });

  describe('createEvidence - 创建存证', () => {
    it('文件不存在时应抛出 NotFoundException', async () => {
      mockPrisma.fileStorage.findUnique.mockResolvedValue(null);

      await expect(service.createEvidence(999)).rejects.toThrow(NotFoundException);
    });

    it('文件无哈希时应抛出 BadRequestException', async () => {
      mockPrisma.fileStorage.findUnique.mockResolvedValue({
        id: 1,
        fileName: 'test.txt',
        hashSha256: null,
      });

      await expect(service.createEvidence(1)).rejects.toThrow(BadRequestException);
    });

    it('开发模式下应成功创建存证记录', async () => {
      mockPrisma.fileStorage.findUnique.mockResolvedValue({
        id: 1,
        fileName: 'test.pdf',
        hashSha256: 'abc123def456',
        bucketName: 'smyweb3-files',
        objectName: 'files/test.pdf',
      });
      mockMinio.getPresignedGetUrl.mockResolvedValue('http://presigned-url');

      // Mock fetch for file download
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
      }) as any;

      mockPrisma.blockchainEvidence.create.mockResolvedValue({
        id: 100,
        txHash: '0xmockhash',
        blockNumber: 1700000000,
      });

      const result = await service.createEvidence(1);

      expect(result.evidenceId).toBe(100);
      expect(result.txHash).toBeDefined();
      expect(typeof result.blockNumber).toBe('number');
      expect(mockPrisma.blockchainEvidence.create).toHaveBeenCalled();

      delete (global as any).fetch;
    });
  });

  describe('verifyEvidence - 验证存证', () => {
    it('存证不存在时应抛出 NotFoundException', async () => {
      mockPrisma.blockchainEvidence.findUnique.mockResolvedValue(null);

      await expect(service.verifyEvidence(999)).rejects.toThrow(NotFoundException);
    });

    it('开发模式应返回模拟验证结果', async () => {
      mockPrisma.blockchainEvidence.findUnique.mockResolvedValue({
        id: 1,
        fileHash: 'abc123',
        isVerified: false,
      });
      mockPrisma.blockchainEvidence.update.mockResolvedValue({});

      const result = await service.verifyEvidence(1);

      expect(result.isValid).toBe(true);
      expect(result.onChainHash).toBe('abc123');
      expect(result.verifiedAt).toBeInstanceOf(Date);
    });
  });

  describe('generateProofUrl - 生成验证 URL', () => {
    it('应生成包含 evidenceId 的完整 URL', () => {
      const url = service.generateProofUrl('42');

      expect(url).toContain('/api/evidence/proof/42');
      expect(url).toContain('localhost:3000');
    });
  });
});
