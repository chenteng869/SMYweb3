import { UsersService } from '@/modules/users/users.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('UsersService', () => {
  let service: UsersService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      adminUser: {
        count: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      role: {
        findMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      userRole: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      bankAccount: { findMany: jest.fn() },
      order: { findMany: jest.fn() },
      dvcTransaction: { findMany: jest.fn() },
      mediaPost: { findMany: jest.fn() },
      contract: { findMany: jest.fn() },
      company: { findMany: jest.fn() },
      userRiskAssessment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        count: jest.fn(),
      },
      auditLogEnhanced: {
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        create: jest.fn(),
      },
      userSession: {
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      loginHistory: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new UsersService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('should return paginated user list', async () => {
      const mockData = [{ id: 1, name: 'Test User' }];
      mockPrisma.user.findMany.mockResolvedValue(mockData);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('detail', () => {
    it('should return user detail with relations', async () => {
      const mockUser = { id: 1, name: 'Test User', companies: [], bankAccounts: [] };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.detail(1);

      expect(result.name).toBe('Test User');
    });

    it('should throw error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.detail(999)).rejects.toThrow('用户不存在');
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updatedData = { name: 'Updated Name' };
      mockPrisma.user.update.mockResolvedValue({ id: 1, ...updatedData });

      const result = await service.update(1, updatedData);

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('updateStatus', () => {
    it('should activate user with reason cleared', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      await service.updateStatus(1, true);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: true, bannedReason: null }),
        })
      );
    });
  });
});
