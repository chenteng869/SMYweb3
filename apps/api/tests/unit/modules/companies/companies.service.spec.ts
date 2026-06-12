import { CompaniesService } from '@/modules/companies/companies.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('CompaniesService', () => {
  let service: CompaniesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      company: {
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
    service = new CompaniesService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('should return paginated companies list with counts', async () => {
      const mockData = [
        { id: 1, name: 'Test Corp', _count: { directors: 2, shareholders: 3, documents: 5 } },
      ];
      mockPrisma.company.findMany.mockResolvedValue(mockData);
      mockPrisma.company.count.mockResolvedValue(1);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('detail', () => {
    it('should return company detail with all relations', async () => {
      const mockCompany = {
        id: 1,
        name: 'Test Corp',
        directors: [{ id: 1, name: 'Director One' }],
        shareholders: [],
        documents: [],
      };
      mockPrisma.company.findUnique.mockResolvedValue(mockCompany);

      const result = await service.detail(1);

      expect(result.name).toBe('Test Corp');
    });

    it('should throw error when company not found', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);

      await expect(service.detail(999)).rejects.toThrow('公司不存在');
    });
  });

  describe('create', () => {
    it('should create company with nested relations', async () => {
      const data = {
        name: 'New Company',
        registrationNumber: 'REG123',
        directors: [{ name: 'CEO' }],
        shareholders: [{ name: 'Investor', sharePercentage: 50 }],
      };
      mockPrisma.company.create.mockResolvedValue({ id: 1, ...data });

      const result = await service.create(data);

      expect(result.name).toBe('New Company');
    });
  });

  describe('stats', () => {
    it('should return company statistics by type and status', async () => {
      mockPrisma.company.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(20);
      mockPrisma.company.groupBy.mockResolvedValue([
        { type: 'LLC', _count: { _all: 60 } },
        { type: 'Corp', _count: { _all: 40 } },
      ]);

      const result = await service.stats();

      expect(result.total).toBe(100);
      expect(result.active).toBe(80);
    });
  });
});
