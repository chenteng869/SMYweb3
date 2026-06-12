import { TaxService } from '@/modules/tax/tax.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('TaxService', () => {
  let service: TaxService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      taxRate: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new TaxService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('should return tax rates filtered by country code', async () => {
      const mockRates = [
        { id: 1, country: 'Singapore', countryCode: 'SG', corporate: 17, vat: 9 },
        { id: 2, country: 'Hong Kong', countryCode: 'HK', corporate: 8.25, vat: 0 },
      ];
      mockPrisma.taxRate.findMany.mockResolvedValue(mockRates);

      const result = await service.list({ countryCode: 'SG' });

      expect(result).toEqual(mockRates);
    });
  });

  describe('create', () => {
    it('should stringify doubleTaxationTreaties array', async () => {
      mockPrisma.taxRate.create.mockResolvedValue({ id: 1 });

      await service.create({
        country: 'Test Country',
        countryCode: 'TC',
        corporate: 15,
        vat: 10,
        doubleTaxationTreaties: ['CountryA', 'CountryB'],
      });

      const callArgs = mockPrisma.taxRate.create.mock.calls[0][0].data;
      expect(typeof callArgs.doubleTaxationTreaties).toBe('string');
    });
  });

  describe('calculate', () => {
    it('should calculate tax for US structure correctly', async () => {
      const result = await service.calculate({
        revenue: 100000,
        margin: 30,
        structureType: 'LLC',
        countryCode: 'US',
      });

      expect(result.revenue).toBe(100000);
      expect(result.margin).toBe(30);
      expect(result.corporateTax).toBeGreaterThan(0);
      expect(result.effectiveRate).toBeGreaterThan(0);
    });

    it('should handle zero revenue gracefully', async () => {
      const result = await service.calculate({
        revenue: 0,
        margin: 0,
        structureType: 'LLC',
        countryCode: 'US',
      });

      expect(result.effectiveRate).toBe(0);
      expect(result.savings).toBe(0);
    });

    it('should use default tax rates for unknown countries', async () => {
      const result = await service.calculate({
        revenue: 100000,
        margin: 25,
        structureType: 'Corp',
        countryCode: 'UNKNOWN',
      });

      // Default is 15% corporate + 10% VAT
      expect(result.corporateTax).toBe(3750); // 15000 * 0.25 (profit) * 0.15
      expect(result.vat).toBe(10000); // 100000 * 0.10
    });
  });
});
