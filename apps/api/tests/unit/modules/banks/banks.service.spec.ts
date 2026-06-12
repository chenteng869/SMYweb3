import { BanksService } from '@/modules/banks/banks.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('BanksService', () => {
  let service: BanksService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      bankAccount: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new BanksService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('should return paginated bank accounts list', async () => {
      const mockData = [{ id: 1, bankName: 'Test Bank', accountName: 'Test Account' }];
      mockPrisma.bankAccount.findMany.mockResolvedValue(mockData);
      mockPrisma.bankAccount.count.mockResolvedValue(1);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('detail', () => {
    it('should return bank account detail with relations', async () => {
      const mockBank = { id: 1, bankName: 'Test Bank', user: { name: 'User' }, company: null };
      mockPrisma.bankAccount.findUnique.mockResolvedValue(mockBank);

      const result = await service.detail(1);

      expect(result.bankName).toBe('Test Bank');
    });
  });

  describe('create', () => {
    it('should create new bank account', async () => {
      const data = { bankName: 'New Bank', accountName: 'Test Account', accountNumber: '123456' };
      mockPrisma.bankAccount.create.mockResolvedValue({ id: 1, ...data });

      const result = await service.create(data);

      expect(result.bankName).toBe('New Bank');
    });
  });

  describe('stats', () => {
    it('should return bank statistics by currency and status', async () => {
      mockPrisma.bankAccount.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(40)
        .mockResolvedValueOnce(10);
      mockPrisma.bankAccount.groupBy.mockResolvedValue([
        { currency: 'USD', _count: { _all: 30 } },
        { currency: 'CNY', _count: { _all: 20 } },
      ]);

      const result = await service.stats();

      expect(result.total).toBe(50);
      expect(result.active).toBe(40);
    });
  });
});
