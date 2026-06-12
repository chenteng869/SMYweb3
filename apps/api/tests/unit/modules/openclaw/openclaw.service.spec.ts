import { OpenClawService } from '@/modules/openclaw/openclaw.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('OpenClawService', () => {
  let service: OpenClawService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      openClawAgent: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      openClawFineTune: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      openClawMarketplaceItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
      },
      openClawMonitorLog: {
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new OpenClawService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllAgents', () => {
    it('should return paginated agents list', async () => {
      const mockData = [{ id: 1, name: 'Test Agent', type: 'analysis', status: 'active' }];
      mockPrisma.openClawAgent.findMany.mockResolvedValue(mockData);
      mockPrisma.openClawAgent.count.mockResolvedValue(1);

      const result = await service.findAllAgents({ page: 1, pageSize: 10 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('getAgent', () => {
    it('should return agent with counts', async () => {
      mockPrisma.openClawAgent.findUnique.mockResolvedValue({ id: 1, name: 'Test' });
      mockPrisma.openClawFineTune.count.mockResolvedValueOnce(5);
      mockPrisma.openClawMonitorLog.count.mockResolvedValueOnce(100);

      const result = await service.getAgent(1);

      expect(result.fineTuneCount).toBe(5);
      expect(result.monitorLogCount).toBe(100);
    });

    it('should return null when agent not found', async () => {
      mockPrisma.openClawAgent.findUnique.mockResolvedValue(null);

      const result = await service.getAgent(999);

      expect(result).toBeNull();
    });
  });

  describe('createAgent', () => {
    it('should stringify config if object', async () => {
      mockPrisma.openClawAgent.create.mockResolvedValue({ id: 1 });

      await service.createAgent({ name: 'New Agent', config: { key: 'value' } });

      const callArgs = mockPrisma.openClawAgent.create.mock.calls[0][0].data;
      expect(typeof callArgs.config).toBe('string');
    });
  });

  describe('getAgentStats', () => {
    it('should return agent statistics', async () => {
      mockPrisma.openClawAgent.findMany.mockResolvedValue([
        { id: 1, type: 'analysis', status: 'active', runCount: 100, successRate: 0.95 },
      ]);
      mockPrisma.openClawAgent.groupBy
        .mockResolvedValueOnce([{ type: 'analysis', _count: 1 }])
        .mockResolvedValueOnce([{ status: 'active', _count: 1 }]);
      mockPrisma.openClawAgent.aggregate.mockResolvedValue({ _sum: { runCount: 100 }, _count: 1 });

      const result = await service.getAgentStats();

      expect(result.totalAgents).toBe(1);
      expect(result.avgSuccessRate).toBe(0.95);
    });
  });
});
