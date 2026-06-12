import { SystemService } from '@/modules/system/system.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('SystemService', () => {
  let service: SystemService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      systemConfig: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      adminUser: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      adminRole: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new SystemService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listConfigs', () => {
    it('should return configs optionally filtered by group', async () => {
      const mockConfigs = [{ id: 1, key: 'site_name', value: 'SMY', group: 'general' }];
      mockPrisma.systemConfig.findMany.mockResolvedValue(mockConfigs);

      const result = await service.listConfigs('general');

      expect(result).toEqual(mockConfigs);
    });
  });

  describe('updateConfig', () => {
    it('should update config value by id', async () => {
      mockPrisma.systemConfig.update.mockResolvedValue({ id: 1, key: 'test', value: 'new_value' });

      const result = await service.updateConfig(1, 'new_value');

      expect(result.value).toBe('new_value');
    });
  });

  describe('listAuditLogs', () => {
    it('should return paginated audit logs with filters', async () => {
      const mockLogs = [{ id: 1, action: 'login', module: 'auth' }];
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await service.listAuditLogs({ page: 1, pageSize: 20, action: 'login' });

      expect(result.data).toEqual(mockLogs);
      expect(result.total).toBe(1);
    });
  });

  describe('listRoles', () => {
    it('should return roles ordered by id', async () => {
      const mockRoles = [{ id: 1, name: 'Admin' }, { id: 2, name: 'User' }];
      mockPrisma.adminRole.findMany.mockResolvedValue(mockRoles);

      const result = await service.listRoles();

      expect(result).toEqual(mockRoles);
    });
  });
});
