import { LegalService } from '@/modules/legal/legal.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('LegalService', () => {
  let service: LegalService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      legalCompliance: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      contract: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new LegalService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listCompliance', () => {
    it('should return compliance items filtered by search and country', async () => {
      const mockData = [
        { id: 1, requirement: 'GDPR compliance', country: 'EU', category: 'privacy' },
      ];
      mockPrisma.legalCompliance.findMany.mockResolvedValue(mockData);

      const result = await service.listCompliance({ countryCode: 'EU' });

      expect(result).toEqual(mockData);
    });
  });

  describe('createCompliance', () => {
    it('should create new compliance item', async () => {
      const data = { requirement: 'AML policy', country: 'US', category: 'financial' };
      mockPrisma.legalCompliance.create.mockResolvedValue({ id: 1, ...data });

      const result = await service.createCompliance(data);

      expect(result.requirement).toBe('AML policy');
    });
  });

  describe('listContracts', () => {
    it('should return paginated contracts list', async () => {
      const mockData = [{ id: 1, name: 'Service Agreement', status: 'active', type: 'service' }];
      mockPrisma.contract.findMany.mockResolvedValue(mockData);
      mockPrisma.contract.count.mockResolvedValue(1);

      const result = await service.listContracts({ page: 1, pageSize: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('createContract', () => {
    it('should stringify parties array when creating contract', async () => {
      mockPrisma.contract.create.mockResolvedValue({ id: 1 });

      await service.createContract({
        name: 'NDA Agreement',
        parties: [{ name: 'Party A' }, { name: 'Party B' }],
        type: 'nda',
      });

      const callArgs = mockPrisma.contract.create.mock.calls[0][0].data;
      expect(typeof callArgs.parties).toBe('string');
    });
  });
});
