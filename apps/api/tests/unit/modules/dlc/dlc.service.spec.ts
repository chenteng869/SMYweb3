import { DlcService } from '@/modules/dlc/dlc.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('DlcService', () => {
  let service: DlcService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      dlcLevel: {
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      dvcTransaction: {
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      user: {
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new DlcService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listLevels', () => {
    it('should return DLC levels sorted by sortOrder', async () => {
      const mockLevels = [
        { id: 1, name: 'Bronze', level: 1, sortOrder: 1 },
        { id: 2, name: 'Silver', level: 2, sortOrder: 2 },
      ];
      mockPrisma.dlcLevel.findMany.mockResolvedValue(mockLevels);

      const result = await service.listLevels();

      expect(result).toEqual(mockLevels);
    });
  });

  describe('createLevel', () => {
    it('should stringify benefits when creating level', async () => {
      mockPrisma.dlcLevel.create.mockResolvedValue({ id: 1 });

      await service.createLevel({
        name: 'Platinum',
        benefits: { discount: 20, prioritySupport: true },
      });

      const callArgs = mockPrisma.dlcLevel.create.mock.calls[0][0].data;
      expect(typeof callArgs.benefits).toBe('string');
    });
  });

  describe('listTransactions', () => {
    it('should return paginated transactions list', async () => {
      const mockData = [{ id: 1, type: 'credit', amount: 100, status: 'completed' }];
      mockPrisma.dvcTransaction.findMany.mockResolvedValue(mockData);
      mockPrisma.dvcTransaction.count.mockResolvedValue(1);

      const result = await service.listTransactions({ page: 1, pageSize: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('stats', () => {
    it('should return DLC statistics including circulation and distribution', async () => {
      mockPrisma.user.aggregate.mockResolvedValueOnce({ _sum: { dvcBalance: 1000000 } });
      mockPrisma.user.groupBy.mockResolvedValueOnce([{ dlcLevel: 2, _count: { _all: 500 } }]);
      mockPrisma.dvcTransaction.groupBy.mockResolvedValue([
        { type: 'credit', _sum: { amount: 50000 } },
        { type: 'debit', _sum: { amount: 30000 } },
      ]);

      const result = await service.stats();

      expect(result.totalCirculation).toBe(1000000);
      expect(result.byLevel).toHaveProperty('2', 500);
    });
  });
});
