import { WalletsService } from '@/modules/wallets/wallets.service';
import { PrismaService } from '@/common/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('@/common/prisma.service');

describe('WalletsService', () => {
  let service: WalletsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      walletNonce: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      walletAccount: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new WalletsService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNonce', () => {
    it('should create nonce for wallet address', async () => {
      const mockNonce = { id: 1, nonce: 'WOPC-login:abc123', expiredAt: new Date() };
      mockPrisma.walletNonce.create.mockResolvedValue(mockNonce);

      const result = await service.createNonce('0x1234567890abcdef', 'login');

      expect(result.nonce).toContain('WOPC-login:');
      expect(result.walletAddress).toBe('0x1234567890abcdef');
    });
  });

  describe('consumeNonce', () => {
    it('should consume valid nonce and return true', async () => {
      const futureDate = new Date(Date.now() + 300000);
      mockPrisma.walletNonce.findFirst.mockResolvedValue({
        id: 1,
        used: false,
        expiredAt: futureDate,
      });
      mockPrisma.walletNonce.update.mockResolvedValue({});

      const result = await service.consumeNonce('0x1234', 'valid-nonce');

      expect(result).toBe(true);
    });

    it('should return false when nonce not found', async () => {
      mockPrisma.walletNonce.findFirst.mockResolvedValue(null);

      const result = await service.consumeNonce('0x1234', 'invalid-nonce');

      expect(result).toBe(false);
    });
  });

  describe('bindWallet', () => {
    it('should bind wallet successfully', async () => {
      mockPrisma.walletAccount.findUnique.mockResolvedValue(null);
      mockPrisma.walletAccount.updateMany.mockResolvedValue({});
      mockPrisma.walletAccount.create.mockResolvedValue({ id: 1 });

      const result = await service.bindWallet(1, 1, {
        walletAddress: '0xNewWallet',
        chainId: '1',
        walletType: 'metamask',
        role: 'primary',
      });

      expect(mockPrisma.walletAccount.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when wallet already bound', async () => {
      mockPrisma.walletAccount.findUnique.mockResolvedValue({ id: 1 });

      await expect(
        service.bindWallet(1, 1, {
          walletAddress: '0xExisting',
          chainId: '1',
          walletType: 'metamask',
          role: 'primary',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('unbindWallet', () => {
    it('should unbind non-primary wallet', async () => {
      mockPrisma.walletAccount.findFirst.mockResolvedValue({ id: 1, isPrimary: false });
      mockPrisma.walletAccount.update.mockResolvedValue({});

      const result = await service.unbindWallet(1, '0xWallet');

      expect(mockPrisma.walletAccount.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when wallet not found', async () => {
      mockPrisma.walletAccount.findFirst.mockResolvedValue(null);

      await expect(service.unbindWallet(1, '0xNonExistent')).rejects.toThrow(NotFoundException);
    });
  });
});
