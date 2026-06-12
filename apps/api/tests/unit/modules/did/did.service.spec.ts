import { DidService } from '@/modules/did/did.service';
import { PrismaService } from '@/common/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('@/common/prisma.service');

describe('DidService', () => {
  let service: DidService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      didIdentity: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        $disconnect: jest.fn(),
      },
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new DidService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new DID successfully', async () => {
      mockPrisma.didIdentity.findUnique.mockResolvedValue(null);
      mockPrisma.didIdentity.findFirst.mockResolvedValue(null);
      mockPrisma.didIdentity.create.mockResolvedValue({
        id: 1,
        userId: 1,
        did: 'did:zsdt:U202600000001',
        status: 'created',
      });

      const result = await service.register(1);

      expect(result.did).toContain('did:zsdt:U');
      expect(result.status).toBe('created');
      expect(mockPrisma.didIdentity.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when DID already exists', async () => {
      mockPrisma.didIdentity.findUnique.mockResolvedValue({ id: 1, userId: 1 });

      await expect(service.register(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('list', () => {
    it('should return paginated DID list', async () => {
      const mockData = [{ id: 1, did: 'did:zsdt:U202600000001', status: 'created' }];
      mockPrisma.didIdentity.findMany.mockResolvedValue(mockData);
      mockPrisma.didIdentity.count.mockResolvedValue(1);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe('detail', () => {
    it('should return DID detail by id', async () => {
      const mockRecord = { id: 1, did: 'did:zsdt:U202600000001', status: 'active' };
      mockPrisma.didIdentity.findUnique.mockResolvedValue(mockRecord);

      const result = await service.detail(1);

      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException when DID not found', async () => {
      mockPrisma.didIdentity.findUnique.mockResolvedValue(null);

      await expect(service.detail(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('stats', () => {
    it('should return DID statistics', async () => {
      mockPrisma.didIdentity.count.mockResolvedValue(100);
      mockPrisma.didIdentity.groupBy
        .mockResolvedValueOnce([{ status: 'active', _count: 80 }])
        .mockResolvedValueOnce([{ kycStatus: 'verified', _count: 50 }]);

      const result = await service.stats();

      expect(result.total).toBe(100);
      expect(result.byStatus).toHaveProperty('active', 80);
      expect(result.byKyc).toHaveProperty('verified', 50);
    });
  });
});
