import { SignatureService } from '@/modules/signature/signature.service';
import { PrismaService } from '@/common/prisma.service';
import { MinioService } from '@/common/services/minio.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

jest.mock('@/common/prisma.service');
jest.mock('@/common/services/minio.service');
jest.mock('pdfkit', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => {
    const listeners: Record<string, ((...args: any[]) => void)[]> = {};
    const mockDoc = {
      fontSize: jest.fn().mockReturnThis(),
      font: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      strokeColor: jest.fn().mockReturnThis(),
      lineWidth: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      roundedRect: jest.fn().mockReturnThis(),
      fill: jest.fn().mockReturnThis(),
      fillAndStroke: jest.fn().mockReturnThis(),
      restore: jest.fn().mockReturnThis(),
      save: jest.fn().mockReturnThis(),
      y: 100,
      page: { width: 595.28, height: 841.89 },
      on: jest.fn((event: string, cb: (...args: any[]) => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
        return mockDoc;
      }),
      end: jest.fn(() => {
        // Trigger 'end' event to resolve the Promise in generateSignedPdf
        if (listeners['end']) listeners['end'].forEach((cb) => cb());
      }),
    };
    return mockDoc;
  }),
}));

describe('SignatureService', () => {
  let service: SignatureService;
  let mockPrisma: any;
  let mockMinio: any;

  beforeEach(() => {
    mockPrisma = {
      document: {
        findUnique: jest.fn(),
      },
      eSignature: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      didIdentity: {
        findUnique: jest.fn(),
      },
    };

    mockMinio = {
      upload: jest.fn().mockResolvedValue({ url: 'http://signed-doc.pdf', etag: 'etag' }),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    (MinioService as unknown as jest.Mock).mockImplementation(() => mockMinio);

    service = new SignatureService(mockPrisma as PrismaService, mockMinio as MinioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signDocument - 文档签名', () => {
    it('文档不存在时应抛出 NotFoundException', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);

      await expect(service.signDocument(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('DID 身份不存在时应抛出 NotFoundException', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 1,
        name: 'contract.pdf',
        fileUrl: 'http://file.url',
      });
      mockPrisma.eSignature.findUnique.mockResolvedValue(null);
      mockPrisma.didIdentity.findUnique.mockResolvedValue(null);

      await expect(service.signDocument(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('文档已有有效签名时应抛出 BadRequestException', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 1,
        name: 'contract.pdf',
        fileUrl: 'http://file.url',
      });
      mockPrisma.eSignature.findUnique.mockResolvedValue({
        documentId: 1,
        isValid: true,
      });

      await expect(service.signDocument(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('正常签名应返回完整签名信息', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 1,
        name: 'contract.pdf',
        fileUrl: 'http://file.url',
      });
      mockPrisma.eSignature.findUnique.mockResolvedValue(null);
      mockPrisma.didIdentity.findUnique.mockResolvedValue({
        id: 1,
        did: 'did:example:alice',
        name: 'Alice',
      });
      mockPrisma.eSignature.create.mockResolvedValue({
        id: 42,
        signatureValue: 'sig_value_abc...',
        publicKey: 'pub_key_xyz...',
      });

      const result = await service.signDocument(1, 1, '192.168.1.1', 'Mozilla/5.0', 'ECDSA');

      expect(result.signatureId).toBe(42);
      expect(result.signatureValue).toBe('sig_value_abc...');
      expect(result.publicKey).toBe('pub_key_xyz...');
      expect(result.documentUrl).toBe('http://signed-doc.pdf');
      expect(mockPrisma.eSignature.create).toHaveBeenCalled();
    });
  });

  describe('verifySignature - 验证签名', () => {
    it('签名记录不存在时应抛出 NotFoundException', async () => {
      mockPrisma.eSignature.findUnique.mockResolvedValue(null);

      await expect(service.verifySignature(999)).rejects.toThrow(NotFoundException);
    });

    it('已撤销的签名应返回 isValid=false', async () => {
      mockPrisma.eSignature.findUnique.mockResolvedValue({
        id: 1,
        isValid: false,
        revokeReason: '用户主动撤销',
        signedAt: new Date('2025-01-01'),
        algorithm: 'ECDSA',
        signer: { did: 'did:example:bob', name: 'Bob' },
        signerDid: 2,
      });

      const result = await service.verifySignature(1);

      expect(result.isValid).toBe(false);
    });
  });

  describe('revokeSignature - 撤销签名', () => {
    it('签名不存在时应抛出 NotFoundException', async () => {
      mockPrisma.eSignature.findUnique.mockResolvedValue(null);

      await expect(service.revokeSignature(999, '测试撤销', 1)).rejects.toThrow(NotFoundException);
    });

    it('已撤销的签名再次撤销应抛出 BadRequestException', async () => {
      mockPrisma.eSignature.findUnique.mockResolvedValue({
        id: 1,
        isValid: false,
      });

      await expect(service.revokeSignature(1, '重复操作', 1)).rejects.toThrow(BadRequestException);
    });

    it('正常撤销应更新签名状态', async () => {
      mockPrisma.eSignature.findUnique.mockResolvedValue({
        id: 1,
        isValid: true,
      });
      mockPrisma.eSignature.update.mockResolvedValue({});

      await service.revokeSignature(1, '合同作废', 10);

      expect(mockPrisma.eSignature.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            isValid: false,
            revokedAt: expect.any(Date),
            revokeReason: expect.stringContaining('[操作人:10]'),
          }),
        })
      );
    });
  });

  describe('generateKeyPair - 密钥对生成', () => {
    it('ECDSA 算法应生成 secp256k1 密钥对', () => {
      const keyPair = service.generateKeyPair('ECDSA');

      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('EdDSA 算法应生成 ed25519 密钥对', () => {
      const keyPair = service.generateKeyPair('EdDSA');

      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('RSA 算法应生成 RSA-2048 密钥对', () => {
      const keyPair = service.generateKeyPair('RSA');

      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('SM2 算法应使用 prime256v1 曲线生成密钥对', () => {
      const keyPair = service.generateKeyPair('SM2');

      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('不支持的算法应抛出 BadRequestException', () => {
      expect(() => service.generateKeyPair('UNSUPPORTED' as any)).toThrow(BadRequestException);
    });
  });

  describe('signData / verifyData - 加解签验证', () => {
    it('ECDSA 签名后验证应通过', () => {
      const keyPair = service.generateKeyPair('ECDSA');
      const data = Buffer.from('test message to sign');

      const signature = service.signData(data, keyPair.privateKey, 'ECDSA');
      expect(signature).toBeTruthy();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);

      const valid = service.verifyData(data, signature, keyPair.publicKey, 'ECDSA');
      expect(valid).toBe(true);
    });

    it('篡改数据后验证应失败', () => {
      const keyPair = service.generateKeyPair('ECDSA');
      const originalData = Buffer.from('original message');
      const tamperedData = Buffer.from('tampered message!!!');

      const signature = service.signData(originalData, keyPair.privateKey, 'ECDSA');
      const valid = service.verifyData(tamperedData, signature, keyPair.publicKey, 'ECDSA');

      expect(valid).toBe(false);
    });

    it('RSA 签名验证也应正确', () => {
      const keyPair = service.generateKeyPair('RSA');
      const data = Buffer.from('rsa test data');

      const signature = service.signData(data, keyPair.privateKey, 'RSA');
      const valid = service.verifyData(data, signature, keyPair.publicKey, 'RSA');

      expect(valid).toBe(true);
    });
  });

  describe('getSignatureHistory - 签名历史', () => {
    it('应返回 DID 的签名历史列表', async () => {
      mockPrisma.eSignature.findMany.mockResolvedValue([
        { id: 1, documentId: 10, algorithm: 'ECDSA', signedAt: new Date(), isValid: true },
      ]);

      const history = await service.getSignatureHistory(1);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(1);
    });
  });

  describe('getDocumentSignature - 文档签名查询', () => {
    it('无签名时应返回 null', async () => {
      mockPrisma.eSignature.findUnique.mockResolvedValue(null);

      const sig = await service.getDocumentSignature(999);

      expect(sig).toBeNull();
    });

    it('有签名时应返回格式化结果', async () => {
      mockPrisma.eSignature.findUnique.mockResolvedValue({
        id: 1,
        documentId: 10,
        signer: { did: 'did:example:a', id: 1 },
        document: { id: 10, name: 'doc.pdf', fileUrl: 'http://url' },
        algorithm: 'ECDSA',
        signatureValue: 'a'.repeat(128),
        publicKey: 'b'.repeat(128),
        signedAt: new Date(),
        ipAddress: '127.0.0.1',
        isValid: true,
        revokedAt: null,
        revokeReason: null,
        createdAt: new Date(),
      });

      const sig = await service.getDocumentSignature(10);

      expect(sig).not.toBeNull();
      expect((sig as any).documentId).toBe(10);
      expect((sig as any).algorithm).toBe('ECDSA');
      expect((sig as any).isValid).toBe(true);
    });
  });
});
