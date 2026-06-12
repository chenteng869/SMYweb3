import { KycService } from '@/modules/kyc/kyc.service';
import { PrismaService } from '@/common/prisma.service';
import { NotFoundException } from '@nestjs/common';

jest.mock('@/common/prisma.service');

describe('KycService', () => {
  let service: KycService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      kycRecord: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      didIdentity: {
        update: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new KycService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submit', () => {
    it('should submit KYC record successfully', async () => {
      const mockRecord = { id: 1, kycStatus: 'pending' };
      mockPrisma.kycRecord.create.mockResolvedValue(mockRecord);
      mockPrisma.didIdentity.update.mockResolvedValue({});

      const result = await service.submit(1, {
        didId: 1,
        fullName: 'Test User',
        documentType: 'passport',
        documentNo: 'AB123456',
        country: 'US',
      });

      expect(result.kycStatus).toBe('pending');
    });
  });

  describe('approve', () => {
    it('should approve KYC record and activate DID', async () => {
      const mockRecord = { id: 1, didId: 1, kycStatus: 'pending' };
      mockPrisma.kycRecord.findUnique.mockResolvedValue(mockRecord);
      mockPrisma.kycRecord.update.mockResolvedValue({});
      mockPrisma.didIdentity.update.mockResolvedValue({});

      const result = await service.approve(1, 1);

      expect(result.success).toBe(true);
      expect(result.status).toBe('approved');
    });

    it('should throw NotFoundException when record not found', async () => {
      mockPrisma.kycRecord.findUnique.mockResolvedValue(null);

      await expect(service.approve(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('status', () => {
    it('should return unverified status when no records exist', async () => {
      mockPrisma.kycRecord.findFirst.mockResolvedValue(null);

      const result = await service.status(1);

      expect(result.kycStatus).toBe('unverified');
    });

    it('should return current KYC status', async () => {
      const mockRecord = { id: 1, kycStatus: 'approved', provider: 'manual' };
      mockPrisma.kycRecord.findFirst.mockResolvedValue(mockRecord);

      const result = await service.status(1);

      expect(result.kycStatus).toBe('approved');
    });
  });

  describe('queue', () => {
    it('should return paginated KYC queue', async () => {
      const mockData = [{ id: 1, kycStatus: 'pending' }];
      mockPrisma.kycRecord.findMany.mockResolvedValue(mockData);
      mockPrisma.kycRecord.count.mockResolvedValue(1);

      const result = await service.queue({ page: 1, pageSize: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });
});
