import { DvsfService } from '@/modules/dvsf/dvsf.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('DvsfService', () => {
  let service: DvsfService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      dvsfPool: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        aggregate: jest.fn(),
      },
      dvsfRecord: {
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new DvsfService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listPools', () => {
    it('should return all pools ordered by creation date', async () => {
      const mockPools = [
        { id: 1, name: 'Pool A', totalAmount: 100000 },
        { id: 2, name: 'Pool B', totalAmount: 200000 },
      ];
      mockPrisma.dvsfPool.findMany.mockResolvedValue(mockPools);

      const result = await service.listPools();

      expect(result).toEqual(mockPools);
    });
  });

  describe('createPool', () => {
    it('should create new DVSF pool', async () => {
      const data = { name: 'New Pool', totalAmount: 50000 };
      mockPrisma.dvsfPool.create.mockResolvedValue({ id: 1, ...data });

      const result = await service.createPool(data);

      expect(result.name).toBe('New Pool');
    });
  });

  describe('listRecords', () => {
    it('should return paginated records list with pool info', async () => {
      const mockData = [{ id: 1, poolId: 1, status: 'distributed', pool: { name: 'Pool A' } }];
      mockPrisma.dvsfRecord.findMany.mockResolvedValue(mockData);
      mockPrisma.dvsfRecord.count.mockResolvedValue(1);

      const result = await service.listRecords({ page: 1, pageSize: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('stats', () => {
    it('should return DVSF statistics', async () => {
      const mockPools = [{ id: 1 }, { id: 2 }, { id: 3 }];
      mockPrisma.dvsfPool.findMany.mockResolvedValue(mockPools);
      mockPrisma.dvsfPool.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 300000 } })
        .mockResolvedValueOnce({ _sum: { distributed: 150000 } });
      mockPrisma.dvsfRecord.count.mockResolvedValue(50);

      const result = await service.stats();

      expect(result.poolCount).toBe(3);
      expect(result.totalPool).toBe(300000);
      expect(result.pendingRecords).toBe(50);
    });
  });
});
