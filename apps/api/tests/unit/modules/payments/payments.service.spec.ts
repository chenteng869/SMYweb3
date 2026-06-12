import { PaymentsService } from '@/modules/payments/payments.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      paymentChannel: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      paymentTransaction: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      exchangeRate: {
        findMany: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new PaymentsService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('channels', () => {
    it('should return all channels sorted by sortOrder', async () => {
      const mockChannels = [
        { id: 1, name: 'Alipay', isActive: true, sortOrder: 1 },
        { id: 2, name: 'WeChat Pay', isActive: true, sortOrder: 2 },
      ];
      mockPrisma.paymentChannel.findMany.mockResolvedValue(mockChannels);

      const result = await service.channels();

      expect(result).toEqual(mockChannels);
    });
  });

  describe('createTransaction', () => {
    it('should generate reference number if not provided', async () => {
      mockPrisma.paymentTransaction.create.mockResolvedValue({ id: 1 });

      const result = await service.createTransaction({
        amount: 1000,
        currency: 'CNY',
        type: 'incoming',
        channelId: 1,
      });

      const callArgs = mockPrisma.paymentTransaction.create.mock.calls[0][0].data;
      expect(callArgs.reference).toContain('TXN-');
      expect(callArgs.netAmount).toBe(1000);
    });

    it('should calculate netAmount as amount minus fee', async () => {
      mockPrisma.paymentTransaction.create.mockResolvedValue({ id: 1 });

      await service.createTransaction({
        amount: 1000,
        fee: 50,
        currency: 'USD',
        type: 'outgoing',
        channelId: 2,
      });

      const callArgs = mockPrisma.paymentTransaction.create.mock.calls[0][0].data;
      expect(callArgs.netAmount).toBe(950);
    });
  });

  describe('listTransactions', () => {
    it('should return paginated transactions list', async () => {
      const mockData = [{ id: 1, reference: 'TXN001', amount: 1000, status: 'completed' }];
      mockPrisma.paymentTransaction.findMany.mockResolvedValue(mockData);
      mockPrisma.paymentTransaction.count.mockResolvedValue(1);

      const result = await service.listTransactions({ page: 1, pageSize: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('stats', () => {
    it('should return payment statistics', async () => {
      mockPrisma.paymentChannel.count.mockResolvedValue(5);
      mockPrisma.paymentTransaction.count.mockResolvedValue(1000);
      mockPrisma.paymentTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 500000 } })
        .mockResolvedValueOnce({ _sum: { amount: 300000 } })
        .mockResolvedValueOnce({ _sum: { fee: 15000 } });

      const result = await service.stats();

      expect(result.channelCount).toBe(5);
      expect(result.txCount).toBe(1000);
      expect(result.totalIncoming).toBe(500000);
      expect(result.totalOutgoing).toBe(300000);
      expect(result.totalRevenue).toBe(15000);
    });
  });
});
