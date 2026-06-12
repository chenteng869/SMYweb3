import { SbtService } from '@/modules/sbt/sbt.service';
import { PrismaService } from '@/common/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('@/common/prisma.service');

describe('SbtService', () => {
  let service: SbtService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      sbtCredential: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new SbtService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('issue', () => {
    it('should issue new SBT credential successfully', async () => {
      mockPrisma.sbtCredential.findFirst.mockResolvedValue(null);
      mockPrisma.sbtCredential.create.mockResolvedValue({
        id: 1,
        userId: 1,
        credentialType: 'KYC_VERIFIED',
        status: 'active',
      });

      const result = await service.issue({
        userId: 1,
        didId: 1,
        walletAddress: '0xWalletAddress',
        credentialType: 'KYC_VERIFIED',
      });

      expect(result.status).toBe('active');
      expect(result.credentialType).toBe('KYC_VERIFIED');
    });

    it('should throw BadRequestException when SBT already issued', async () => {
      mockPrisma.sbtCredential.findFirst.mockResolvedValue({ id: 1, status: 'active' });

      await expect(
        service.issue({
          userId: 1,
          didId: 1,
          walletAddress: '0xWallet',
          credentialType: 'KYC_VERIFIED',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revoke', () => {
    it('should revoke active SBT credential', async () => {
      mockPrisma.sbtCredential.findUnique.mockResolvedValue({ id: 1, status: 'active' });
      mockPrisma.sbtCredential.update.mockResolvedValue({ id: 1, status: 'revoked' });

      const result = await service.revoke(1, 'User request', 1);

      expect(result.status).toBe('revoked');
    });

    it('should throw NotFoundException when SBT not found', async () => {
      mockPrisma.sbtCredential.findUnique.mockResolvedValue(null);

      await expect(service.revoke(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when SBT not active', async () => {
      mockPrisma.sbtCredential.findUnique.mockResolvedValue({ id: 1, status: 'revoked' });

      await expect(service.revoke(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('list', () => {
    it('should return filtered credentials list', async () => {
      const mockCredentials = [{ id: 1, credentialType: 'KYC_VERIFIED', status: 'active' }];
      mockPrisma.sbtCredential.findMany.mockResolvedValue(mockCredentials);

      const result = await service.list({ userId: 1, status: 'active' });

      expect(result).toEqual(mockCredentials);
    });
  });

  describe('types', () => {
    it('should return all available SBT types', async () => {
      const types = await service.types();

      expect(types.length).toBeGreaterThan(0);
      expect(types.some((t) => t.type === 'KYC_VERIFIED')).toBe(true);
      expect(types.some((t) => t.type === 'VIP')).toBe(true);
    });
  });
});
