import { RegistrationService } from '@/modules/registration/registration.service';
import { PrismaService } from '@/common/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';

jest.mock('@/common/prisma.service');

describe('RegistrationService', () => {
  let service: RegistrationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      domesticRegistrationPlan: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      domesticRegistration: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      overseasJurisdiction: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      overseasRegistration: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      privacyComplianceItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      registrationContractTemplate: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      registrationContract: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new RegistrationService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDomesticPlans', () => {
    it('should return active domestic plans sorted by sortOrder', async () => {
      const mockPlans = [
        { id: 1, name: 'Basic Plan', sortOrder: 1 },
        { id: 2, name: 'Premium Plan', sortOrder: 2 },
      ];
      mockPrisma.domesticRegistrationPlan.findMany.mockResolvedValue(mockPlans);

      const result = await service.getDomesticPlans();

      expect(result).toEqual(mockPlans);
      expect(mockPrisma.domesticRegistrationPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        })
      );
    });
  });

  describe('getDomesticPlan', () => {
    it('should return plan by id', async () => {
      const mockPlan = { id: 1, name: 'Test Plan' };
      mockPrisma.domesticRegistrationPlan.findUnique.mockResolvedValue(mockPlan);

      const result = await service.getDomesticPlan(1);

      expect(result.name).toBe('Test Plan');
    });

    it('should throw HttpException when plan not found', async () => {
      mockPrisma.domesticRegistrationPlan.findUnique.mockResolvedValue(null);

      await expect(service.getDomesticPlan(999)).rejects.toThrow(HttpException);
    });
  });

  describe('createDomesticRegistration', () => {
    it('should create domestic registration with pending status', async () => {
      const data = { companyName: 'Test Corp', planId: 1 };
      mockPrisma.domesticRegistration.create.mockResolvedValue({ id: 1, ...data, status: 'pending', progress: 0 });

      const result = await service.createDomesticRegistration(data);

      expect(result.status).toBe('pending');
      expect(result.progress).toBe(0);
    });
  });

  describe('getOverseasStats', () => {
    it('should return overseas registration statistics', async () => {
      mockPrisma.overseasRegistration.count.mockResolvedValue(50);
      mockPrisma.overseasRegistration.groupBy
        .mockResolvedValueOnce([{ status: 'completed', _count: { id: 30 } }])
        .mockResolvedValueOnce([{ jurisdictionId: 1, _count: { id: 20 } }]);
      mockPrisma.overseasRegistration.aggregate.mockResolvedValue({ _sum: { totalFeeUsd: 50000 } });

      const result = await service.getOverseasStats();

      expect(result.total).toBe(50);
      expect(result.totalFeesUsd).toBe(50000);
    });
  });
});
