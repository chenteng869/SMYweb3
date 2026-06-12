import { DashboardService } from '@/modules/dashboard/dashboard.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('DashboardService', () => {
  let service: DashboardService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        count: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      company: { count: jest.fn() },
      order: {
        count: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      video: { count: jest.fn(), findMany: jest.fn() },
      aiAgent: { count: jest.fn() },
      paymentChannel: { count: jest.fn() },
      paymentTransaction: { findMany: jest.fn() },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new DashboardService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('stats', () => {
    it('should return dashboard KPIs with all metrics', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(1000)
        .mockResolvedValueOnce(50);
      mockPrisma.user.aggregate.mockResolvedValueOnce({ _sum: { dvcBalance: 500000 } });
      mockPrisma.company.count.mockResolvedValue(200);
      mockPrisma.order.count
        .mockResolvedValueOnce(500)
        .mockResolvedValueOnce(30);
      mockPrisma.order.aggregate.mockResolvedValueOnce({ _sum: { amount: 100000 } });
      mockPrisma.video.count.mockResolvedValue(300);
      mockPrisma.aiAgent.count.mockResolvedValue(15);
      mockPrisma.paymentChannel.count.mockResolvedValue(5);
      mockPrisma.user.count.mockResolvedValueOnce(20);

      const result = await service.stats();

      expect(result.kpis).toBeDefined();
      expect(result.kpis.length).toBeGreaterThan(0);
    });
  });

  describe('recentActivities', () => {
    it('should return recent activities sorted by time', async () => {
      const mockUsers = [{ id: 1, name: 'User1', createdAt: new Date(), kycStatus: 'verified' }];
      const mockOrders = [{ id: 1, orderNo: 'WO001', title: 'Order 1', createdAt: new Date(), user: { name: 'User1' }, status: 'new' }];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.video.findMany.mockResolvedValue([]);

      const result = await service.recentActivities();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('title');
    });
  });

  describe('chartData', () => {
    it('should return chart data for last 7 days', async () => {
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.order.count.mockResolvedValue(5);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });

      const result = await service.chartData();

      expect(result.userTrend).toHaveLength(7);
      expect(result.orderTrend).toHaveLength(7);
      expect(result.revenueTrend).toHaveLength(7);
    });
  });
});
