import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EvidenceService } from '../../../../apps/api/src/modules/evidence/evidence.service';

// Mock PrismaService
const mockPrisma = {
  fileStorage: {
    findUnique: jest.fn(),
  },
  blockchainEvidence: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
};

// Mock MinioService
const mockMinio = {
  upload: jest.fn(),
  getPresignedGetUrl: jest.fn(),
};

describe('EvidenceService', () => {
  let service: EvidenceService;
  let mockConfigService: Partial<jest.Mocked<ConfigService>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // 开发模式配置（不设置区块链相关变量）
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const defaults: Record<string, any> = {
          BLOCKCHAIN_RPC_URL: '',
          BLOCKCHAIN_CONTRACT_ADDRESS: '',
          BLOCKCHAIN_PRIVATE_KEY: '',
          BLOCKCHAIN_CHAIN_ID: 31337,
          IPFS_GATEWAY_URL: 'https://ipfs.io',
          IPFS_API_URL: '', // 空 = IPFS 不可用，降级到 MinIO
          API_BASE_URL: 'http://localhost:3000',
        };
        return key in defaults ? defaults[key] : (defaultValue ?? '');
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidenceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'MinioService', useValue: mockMinio },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EvidenceService>(EvidenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be in dev mode when blockchain config is missing', () => {
    // 构造函数中会检测 devMode
    expect((service as any).devMode).toBe(true);
  });

  describe('createEvidence (dev mode)', () => {
    it('should throw NotFoundException for non-existent file', async () => {
      mockPrisma.fileStorage.findUnique.mockResolvedValue(null);

      await expect(service.createEvidence(999)).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining('文件记录不存在') })
      );
    });

    it('should throw BadRequestException when file has no hash', async () => {
      mockPrisma.fileStorage.findUnique.mockResolvedValue({
        id: 1,
        fileName: 'test.pdf',
        hashSha256: null,
      } as any);

      await expect(service.createEvidence(1)).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining('尚未计算 SHA256 哈希') })
      );
    });

    it('should create evidence successfully in dev mode with valid file', async () => {
      const fileRecord = {
        id: 1,
        fileName: 'contract.pdf',
        hashSha256: 'abc123def4567890abcdef1234567890abcdef1234567890abcdef1234567890',
        bucketName: 'smyweb3-files',
        objectName: 'uploads/contract.pdf',
      };

      mockPrisma.fileStorage.findUnique.mockResolvedValue(fileRecord);
      mockMinio.getPresignedGetUrl.mockResolvedValue('http://minio:9000/presigned-url');
      mockMinio.upload.mockResolvedValue({
        url: 'http://minio:9000/smyweb3-evidence/ipfs-fallback-xxx',
        etag: 'etag-123',
      });
      mockPrisma.blockchainEvidence.create.mockResolvedValue({
        id: 100,
        txHash: '0xmockhash',
        blockNumber: 1718000000,
      } as any);

      const result = await service.createEvidence(1, undefined, 10);

      expect(result.evidenceId).toBe(100);
      expect(result.txHash).toMatch(/^0x/);
      expect(typeof result.blockNumber).toBe('number');
      expect(mockPrisma.blockchainEvidence.create).toHaveBeenCalled();
    });
  });

  describe('verifyEvidence (dev mode)', () => {
    it('should return mock verification result in dev mode', async () => {
      const evidenceRecord = {
        id: 100,
        fileHash: 'abc123',
        isVerified: false,
        txHash: '0xmocktx',
      };

      mockPrisma.blockchainEvidence.findUnique.mockResolvedValue(evidenceRecord);
      mockPrisma.blockchainEvidence.update.mockResolvedValue({} as any);

      const result = await service.verifyEvidence(100);

      expect(result.isValid).toBe(true);
      expect(result.onChainHash).toBe('abc123');
      expect(result.verifiedAt).toBeInstanceOf(Date);
      expect(mockPrisma.blockchainEvidence.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: expect.objectContaining({ isVerified: true }),
      });
    });

    it('should throw NotFoundException for non-existent evidence', async () => {
      mockPrisma.blockchainEvidence.findUnique.mockResolvedValue(null);

      await expect(service.verifyEvidence(999)).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining('存证记录不存在') })
      );
    });
  });

  describe('getEvidenceByTxHash', () => {
    it('should return evidence by transaction hash', async () => {
      const mockEvidence = {
        id: 100,
        txHash: '0xabc123',
        file: { id: 1, fileName: 'doc.pdf' },
        did: { id: 1, did: 'did:example:123' },
      };

      mockPrisma.blockchainEvidence.findFirst.mockResolvedValue(mockEvidence);

      const result = await service.getEvidenceByTxHash('0xabc123');

      expect(result).toEqual(mockEvidence);
      expect(mockPrisma.blockchainEvidence.findFirst).toHaveBeenCalledWith({
        where: { txHash: '0xabc123' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when no evidence found', async () => {
      mockPrisma.blockchainEvidence.findFirst.mockResolvedValue(null);

      await expect(service.getEvidenceByTxHash('0xnonexistent')).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining('未找到对应存证记录') })
      );
    });
  });

  describe('getEvidenceByFileId', () => {
    it('should return all evidences for a file', async () => {
      const mockEvidences = [
        { id: 100, createdAt: new Date() },
        { id: 101, createdAt: new Date('2025-01-01') },
      ];

      mockPrisma.blockchainEvidence.findMany.mockResolvedValue(mockEvidences);

      const result = await service.getEvidenceByFileId(1);

      expect(result).toHaveLength(2);
      // 应该按创建时间倒序排列
      expect(mockPrisma.blockchainEvidence.findMany).toHaveBeenCalledWith({
        where: { fileId: 1 },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  describe('getUserEvidences (pagination)', () => {
    it('should return paginated results', async () => {
      mockPrisma.blockchainEvidence.findMany.mockResolvedValue([{ id: 100 }, { id: 101 }]);
      mockPrisma.blockchainEvidence.count.mockResolvedValue(25);

      const result = await service.getUserEvidences(1, 2, 10);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(25);
      expect(mockPrisma.blockchainEvidence.findMany).toHaveBeenCalledWith({
        where: { didId: 1 },
        skip: 10, // (2-1)*10
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should use default page=1 and limit=20', async () => {
      mockPrisma.blockchainEvidence.findMany.mockResolvedValue([]);
      mockPrisma.blockchainEvidence.count.mockResolvedValue(0);

      await service.getUserEvidences(1);

      expect(mockPrisma.blockchainEvidence.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      );
    });
  });

  describe('generateProofUrl', () => {
    it('should generate verification URL with evidence ID', () => {
      const url = service.generateProofUrl('100');
      expect(url).toBe('http://localhost:3000/api/evidence/proof/100');
    });

    it('should generate URL with txHash', () => {
      const url = service.generateProofUrl('0xabc123');
      expect(url).toContain('0xabc123');
    });
  });

  describe('calculateFileHash', () => {
    it('should calculate SHA256 hash of buffer', () => {
      const buffer = Buffer.from('Hello World');
      const hash = service.calculateFileHash(buffer);

      // SHA256 of "Hello World" 的固定值
      expect(hash).toBe('a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e');
      expect(hash.length).toBe(64); // SHA256 hex length
    });

    it('should produce different hashes for different content', () => {
      const hash1 = service.calculateFileHash(Buffer.from('content A'));
      const hash2 = service.calculateFileHash(Buffer.from('content B'));
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('submitToBlockchain (dev mode)', () => {
    it('should return mock transaction data in dev mode', async () => {
      const result = await service.submitToBlockchain('abc123hash', 'QmTestCID', { fileId: 1 });

      expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(typeof result.blockNumber).toBe('number');
      expect(result.blockNumber).toBeGreaterThan(0);
    });
  });
});
