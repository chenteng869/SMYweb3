import { DocumentsService } from '@/modules/documents/documents.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('DocumentsService', () => {
  let service: DocumentsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      document: {
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
    service = new DocumentsService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('should return paginated documents list', async () => {
      const mockData = [{ id: 1, name: 'Contract.pdf', type: 'contract', status: 'active' }];
      mockPrisma.document.findMany.mockResolvedValue(mockData);
      mockPrisma.document.count.mockResolvedValue(1);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('create', () => {
    it('should create new document', async () => {
      const data = { name: 'New Document.pdf', type: 'report', category: 'internal' };
      mockPrisma.document.create.mockResolvedValue({ id: 1, ...data });

      const result = await service.create(data);

      expect(result.name).toBe('New Document.pdf');
    });
  });

  describe('stats', () => {
    it('should return document statistics including expiry info', async () => {
      mockPrisma.document.count
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(25);
      mockPrisma.document.groupBy.mockResolvedValue([
        { category: 'legal', _count: { _all: 80 } },
        { category: 'financial', _count: { _all: 120 } },
      ]);

      const result = await service.stats();

      expect(result.total).toBe(200);
      expect(result.expired).toBe(10);
      expect(result.expiringSoon).toBe(25);
    });
  });
});
