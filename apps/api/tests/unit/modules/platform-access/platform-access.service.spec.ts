import { PlatformAccessService } from '@/modules/platform-access/platform-access.service';
import { PrismaService } from '@/common/prisma.service';
import { NotFoundException } from '@nestjs/common';

jest.mock('@/common/prisma.service');

describe('PlatformAccessService', () => {
  let service: PlatformAccessService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      didIdentity: {
        findUnique: jest.fn(),
      },
      platformPermission: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new PlatformAccessService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkAccess', () => {
    it('should return access info for valid DID', async () => {
      mockPrisma.didIdentity.findUnique.mockResolvedValue({
        id: 1,
        did: 'did:test:123',
        status: 'active',
        kycStatus: 'verified',
        riskLevel: 'low',
        memberLevel: 'gold',
      });
      mockPrisma.platformPermission.findUnique.mockResolvedValue({ allowed: true, permissionStatus: 'approved' });

      const result = await service.checkAccess('did:test:123', 'twitter');

      expect(result.allowed).toBe(true);
      expect(result.didStatus).toBe('active');
    });

    it('should throw NotFoundException when DID not found', async () => {
      mockPrisma.didIdentity.findUnique.mockResolvedValue(null);

      await expect(service.checkAccess('did:nonexistent', 'twitter')).rejects.toThrow(NotFoundException);
    });

    it('should return allowed false when identity not active', async () => {
      mockPrisma.didIdentity.findUnique.mockResolvedValue({
        id: 1,
        status: 'frozen',
        kycStatus: 'pending',
        riskLevel: 'medium',
        memberLevel: 'standard',
      });
      mockPrisma.platformPermission.findUnique.mockResolvedValue(null);

      const result = await service.checkAccess('did:frozen:123', 'twitter');

      expect(result.allowed).toBe(false);
    });
  });

  describe('grant', () => {
    it('should grant platform access permission', async () => {
      mockPrisma.didIdentity.findUnique.mockResolvedValue({ id: 1, userId: 1 });
      mockPrisma.platformPermission.upsert.mockResolvedValue({});

      const result = await service.grant(1, 'twitter', true, 1);

      expect(mockPrisma.platformPermission.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { didId_platform: { didId: 1, platform: 'twitter' } },
          update: expect.objectContaining({ allowed: true, permissionStatus: 'approved' }),
          create: expect.objectContaining({ allowed: true }),
        })
      );
    });
  });

  describe('listByDid', () => {
    it('should return permissions list for DID', async () => {
      const mockPermissions = [
        { id: 1, platform: 'twitter', allowed: true },
        { id: 2, platform: 'youtube', allowed: false },
      ];
      mockPrisma.platformPermission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.listByDid(1);

      expect(result).toEqual(mockPermissions);
    });
  });
});
