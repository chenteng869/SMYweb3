import { OrdersService } from '@/modules/orders/orders.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('OrdersService', () => {
  let service: OrdersService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      order: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new OrdersService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('should return paginated orders list', async () => {
      const mockData = [{ id: 1, orderNo: 'WO-2026-001', title: 'Test Order', status: 'new' }];
      mockPrisma.order.findMany.mockResolvedValue(mockData);
      mockPrisma.order.count.mockResolvedValue(1);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('create', () => {
    it('should auto-generate order number if not provided', async () => {
      mockPrisma.order.create.mockResolvedValue({ id: 1 });

      const result = await service.create({ title: 'New Order' });

      const callArgs = mockPrisma.order.create.mock.calls[0][0].data;
      expect(callArgs.orderNo).toContain('WO-');
      expect(callArgs.title).toBe('New Order');
    });
  });

  describe('updateStatus', () => {
    it('should update order status and set completedAt when completed', async () => {
      mockPrisma.order.update.mockResolvedValue({ id: 1, status: 'completed', completedAt: new Date() });

      const result = await service.updateStatus(1, 'completed');

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'completed',
            completedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('stats', () => {
    it('should return order statistics by status and type', async () => {
      mockPrisma.order.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(40)
        .mockResolvedValueOnce(25);
      mockPrisma.order.groupBy.mockResolvedValue([{ type: 'consulting', _count: { _all: 60 } }]);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 500000 } });

      const result = await service.stats();

      expect(result.total).toBe(100);
      expect(result.newCount).toBe(30);
      expect(result.processing).toBe(40);
      expect(result.completed).toBe(25);
      expect(result.totalRevenue).toBe(500000);
    });
  });
});
