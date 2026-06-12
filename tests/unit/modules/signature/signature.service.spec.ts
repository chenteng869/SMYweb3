import { Test, TestingModule } from '@nestjs/testing';
import { SignatureService } from '../../../../apps/api/src/modules/signature/signature.service';

// Mock PrismaService
const mockPrisma = {
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

// Mock MinioService
const mockMinio = {
  upload: jest.fn(),
};

describe('SignatureService', () => {
  let service: SignatureService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignatureService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'MinioService', useValue: mockMinio },
      ],
    }).compile();

    service = module.get<SignatureService>(SignatureService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signDocument - ECDSA (default)', () => {
    it('should sign document with ECDSA algorithm successfully', async () => {
      // Mock dependencies
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 1,
        name: 'Contract.pdf',
        fileUrl: 'http://minio/contract.pdf',
      });
      mockPrisma.eSignature.findUnique.mockResolvedValue(null);
      mockPrisma.didIdentity.findUnique.mockResolvedValue({
        id: 10,
        did: 'did:example:signer1',
        name: 'John Doe',
      });
      mockMinio.upload.mockResolvedValue({
        url: 'http://minio/smyweb3-documents/signed-docs/1_1234567890.pdf',
        etag: 'etag-abc',
      });
      mockPrisma.eSignature.create.mockResolvedValue({
        id: 100,
        signatureValue: 'sig-value-ecdsa',
        publicKey: 'public-key-ecdsa',
      });

      const result = await service.signDocument(1, 10, '192.168.1.1', 'TestAgent/1.0');

      expect(result.signatureId).toBe(100);
      expect(result.signatureValue).toBe('sig-value-ecdsa');
      expect(result.publicKey).toBe('public-key-ecdsa');
      expect(result.documentUrl).toContain('.pdf');
      expect(mockPrisma.eSignature.create).toHaveBeenCalled();
    });

    it('should update existing signature record if one exists but invalid', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 1,
        name: 'Doc.pdf',
        fileUrl: 'http://url',
      });
      // 已存在但无效的签名
      mockPrisma.eSignature.findUnique.mockResolvedValue({
        isValid: false,
      });
      mockPrisma.didIdentity.findUnique.mockResolvedValue({
        id: 10,
        did: 'did:test',
        name: 'Signer',
      });
      mockMinio.upload.mockResolvedValue({ url: 'signed-url', etag: 'etag' });
      mockPrisma.eSignature.update.mockResolvedValue({
        id: 99,
        signatureValue: 'new-sig',
        publicKey: 'new-pub',
      });

      const result = await service.signDocument(1, 10);

      // 应该调用 update 而不是 create
      expect(mockPrisma.eSignature.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { documentId: 1 } })
      );
      expect(result.signatureId).toBe(99);
    });
  });

  describe('signDocument - validation errors', () => {
    it('should throw NotFoundException for non-existent document', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);

      await expect(service.signDocument(999, 10)).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining('文档不存在') })
      );
    });

    it('should throw BadRequestException when document already has valid signature', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({ id: 1, name: 'Doc.pdf', fileUrl: 'url' });
      mockPrisma.eSignature.findUnique.mockResolvedValue({ isValid: true });

      await expect(service.signDocument(1, 10)).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining('已签署有效签名') })
      );
    });

    it('should throw NotFoundException for non-existent signer DID', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({ id: 1, name: 'Doc.pdf', fileUrl: 'url' });
      mockPrisma.eSignature.findUnique.mockResolvedValue(null);
      mockPrisma.didIdentity.findUnique.mockResolvedValue(null);

      await expect(service.signDocument(1, 999)).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining('DID 身份不存在') })
      );
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature and return true', async () => {
      // 先签名获取密钥对
      const keyPair = service.generateKeyPair('ECDSA');

      const dataToSign = Buffer.from(
        JSON.stringify({
          documentId: 1,
          documentName: 'Test.pdf',
          fileUrl: 'http://url',
          signedAt: new Date().toISOString(),
          signerDid: 10,
        })
      );
      const sigValue = service.signData(dataToSign, keyPair.privateKey, 'ECDSA');

      mockPrisma.eSignature.findUnique.mockResolvedValue({
        id: 100,
        signerDid: 10,
        isValid: true,
        algorithm: 'ECDSA',
        signatureValue: sigValue,
        publicKey: keyPair.publicKey,
        signedAt: new Date(),
        signer: { did: 'did:example:10', name: 'John' },
        document: { id: 1, name: 'Test.pdf', fileUrl: 'http://url' },
      });

      const result = await service.verifySignature(100);

      expect(result.isValid).toBe(true);
      expect(result.algorithm).toBe('ECDSA');
      expect(result.signedAt).toBeInstanceOf(Date);
    });

    it('should return false for revoked signature', async () => {
      mockPrisma.eSignature.findUnique.mockResolvedValue({
        id: 101,
        isValid: false,
        revokeReason: 'User requested revocation',
        algorithm: 'ECDSA',
        signedAt: new Date(),
        signer: { did: 'did:example:10', name: 'John' },
      });

      const result = await service.verifySignature(101);

      expect(result.isValid).toBe(false);
    });

    it('should throw NotFoundException for non-existent signature', async () => {
      mockPrisma.eSignature.findUnique.mockResolvedValue(null);

      await expect(service.verifySignature(999)).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining('签名记录不存在') })
      );
    });
  });

  describe('revokeSignature', () => {
    it('should revoke a valid signature', async () => {
      mockPrisma.eSignature.findUnique.mockResolvedValue({
        id: 100,
        isValid: true,
      });
      mockPrisma.eSignature.update.mockResolvedValue({} as any);

      await service.revokeSignature(100, 'Security concern', 5);

      expect(mockPrisma.eSignature.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: expect.objectContaining({
          isValid: false,
          revokedAt: expect.any(Date),
          revokeReason: expect.stringContaining('[操作人:5]'),
          revokeReason: expect.stringContaining('Security concern'),
        }),
      });
    });

    it('should throw NotFoundException for non-existent signature', async () => {
      mockPrisma.eSignature.findUnique.mockResolvedValue(null);

      await expect(service.revokeSignature(999, 'reason', 1)).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining('签名记录不存在') })
      );
    });

    it('should throw BadRequestException when already revoked', async () => {
      mockPrisma.eSignature.findUnique.mockResolvedValue({
        id: 100,
        isValid: false,
      });

      await expect(service.revokeSignature(100, 'reason', 1)).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining('已被撤销') })
      );
    });
  });

  describe('generateKeyPair - multiple algorithms', () => {
    it('should generate ECDSA key pair (secp256k1)', () => {
      const keyPair = service.generateKeyPair('ECDSA');
      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('should generate EdDSA key pair (ed25519)', () => {
      const keyPair = service.generateKeyPair('EdDSA');
      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('should generate RSA key pair (2048-bit)', () => {
      const keyPair = service.generateKeyPair('RSA');
      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('should generate SM2 key pair (prime256v1 curve)', () => {
      const keyPair = service.generateKeyPair('SM2');
      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('should generate different key pairs on each call', () => {
      const kp1 = service.generateKeyPair('ECDSA');
      const kp2 = service.generateKeyPair('ECDSA');
      expect(kp1.publicKey).not.toBe(kp2.publicKey);
      expect(kp1.privateKey).not.toBe(kp2.privateKey);
    });

    it('should throw error for unsupported algorithm', () => {
      expect(() => service.generateKeyPair('UNSUPPORTED' as any)).toThrow(
        expect.objectContaining({ message: expect.stringContaining('不支持的签名算法') })
      );
    });
  });

  describe('signData / verifyData', () => {
    it('should sign and verify data correctly with ECDSA', () => {
      const data = Buffer.from('test message to sign');
      const keyPair = service.generateKeyPair('ECDSA');

      const signature = service.signData(data, keyPair.privateKey, 'ECDSA');
      const isValid = service.verifyData(data, signature, keyPair.publicKey, 'ECDSA');

      expect(isValid).toBe(true);
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should sign and verify data correctly with EdDSA', () => {
      const data = Buffer.from('ed25519 test');
      const keyPair = service.generateKeyPair('EdDSA');

      const signature = service.signData(data, keyPair.privateKey, 'EdDSA');
      const isValid = service.verifyData(data, signature, keyPair.publicKey, 'EdDSA');

      expect(isValid).toBe(true);
    });

    it('should sign and verify data correctly with RSA', () => {
      const data = Buffer.from('rsa test message');
      const keyPair = service.generateKeyPair('RSA');

      const signature = service.signData(data, keyPair.privateKey, 'RSA');
      const isValid = service.verifyData(data, signature, keyPair.publicKey, 'RSA');

      expect(isValid).toBe(true);
    });

    it('should fail verification for tampered data', () => {
      const originalData = Buffer.from('original data');
      const tamperedData = Buffer.from('tampered data!!!');
      const keyPair = service.generateKeyPair('ECDSA');

      const signature = service.signData(originalData, keyPair.privateKey, 'ECDSA');
      const isValid = service.verifyData(tamperedData, signature, keyPair.publicKey, 'ECDSA');

      expect(isValid).toBe(false);
    });

    it('should fail verification with wrong public key', () => {
      const data = Buffer.from('test data');
      const kp1 = service.generateKeyPair('ECDSA');
      const kp2 = service.generateKeyPair('ECDSA'); // 不同的密钥对

      const signature = service.signData(data, kp1.privateKey, 'ECDSA');
      const isValid = service.verifyData(data, signature, kp2.publicKey, 'ECDSA');

      expect(isValid).toBe(false);
    });
  });

  describe('generateSignedPdf', () => {
    it('should generate PDF buffer successfully', async () => {
      const pdfBuffer = await service.generateSignedPdf(42, {
        signerName: 'Jane Doe',
        signerDid: 'did:example:jane',
        signedAt: new Date(),
        algorithm: 'ECDSA',
        signatureValue: 'abcdef123456...',
      });

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0); // PDF 应该有内容
    });

    it('should generate PDF with correct metadata', async () => {
      const now = new Date();
      const pdfBuffer = await service.generateSignedPdf(99, {
        signerName: 'Test Signer',
        signerDid: 'did:example:test',
        signedAt: now,
        algorithm: 'SM2',
        signatureValue: 'sm2-sig-value-here',
      });

      expect(pdfBuffer.length).toBeGreaterThan(100); // 合理的最小大小
    });
  });

  describe('getSignatureHistory', () => {
    it('should return signature history for DID identity', async () => {
      const mockRecords = [
        {
          id: 100,
          documentId: 1,
          documentName: 'Doc1.pdf',
          algorithm: 'ECDSA',
          signedAt: new Date(),
          isValid: true,
        },
        {
          id: 101,
          documentId: 2,
          documentName: 'Doc2.pdf',
          algorithm: 'RSA',
          signedAt: new Date(),
          isValid: false,
        },
      ];

      mockPrisma.eSignature.findMany.mockResolvedValue(
        mockRecords.map((r) => ({
          ...r,
          document: { id: r.documentId, name: r.documentName },
          signer: { id: 10, did: 'did:example:10' },
        }))
      );

      const history = await service.getSignatureHistory(10);

      expect(history).toHaveLength(2);
      // 应该按 signedAt 倒序排列
      expect(mockPrisma.eSignature.findMany).toHaveBeenCalledWith({
        where: { signerDid: 10 },
        include: expect.any(Object),
        orderBy: { signedAt: 'desc' },
      });
    });
  });

  describe('getDocumentSignature', () => {
    it('should return signature for document', async () => {
      mockPrisma.eSignature.findUnique.mockResolvedValue({
        id: 100,
        documentId: 1,
        signatureValue: 'very-long-signature-value-that-will-be-truncated',
        publicKey: 'very-long-public-key-value-that-will-be-truncated',
        algorithm: 'ECDSA',
        signedAt: new Date(),
        ipAddress: '192.168.1.1',
        isValid: true,
        revokedAt: null,
        revokeReason: null,
        createdAt: new Date(),
        signer: { did: 'did:example:10', name: 'Signer' },
        document: { id: 1, name: 'Contract.pdf', fileUrl: 'http://url' },
      });

      const sig = await service.getDocumentSignature(1);

      expect(sig).not.toBeNull();
      expect(sig!.documentId).toBe(1);
      // 签名值和公钥应该被截断
      expect((sig as any).signatureValue).toMatch(/\.\.\.$/);
      expect((sig as any).publicKey).toMatch(/\.\.\.$/);
    });

    it('should return null when no signature exists', async () => {
      mockPrisma.eSignature.findUnique.mockResolvedValue(null);

      const sig = await service.getDocumentSignature(999);
      expect(sig).toBeNull();
    });
  });
});
