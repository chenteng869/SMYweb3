import { BpmService } from '@/modules/bpm/bpm.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('BpmService', () => {
  let service: BpmService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      bpmProcessDef: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      bpmProcessInstance: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      bpmTask: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      bpmMonitorMetric: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new BpmService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllDefs', () => {
    it('should return paginated process definitions', async () => {
      const mockData = [{ id: 1, name: 'Approval Process', status: 'active' }];
      mockPrisma.bpmProcessDef.findMany.mockResolvedValue(mockData);
      mockPrisma.bpmProcessDef.count.mockResolvedValue(1);

      const result = await service.findAllDefs(1, 20);

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('createDef', () => {
    it('should create new process definition with default values', async () => {
      const data = { name: 'New Process', category: 'approval' };
      mockPrisma.bpmProcessDef.create.mockResolvedValue({ id: 1, version: 1, status: 'draft', ...data });

      const result = await service.createDef(data);

      expect(result.version).toBe(1);
      expect(result.status).toBe('draft');
    });
  });

  describe('startInstance', () => {
    it('should start a new process instance', async () => {
      mockPrisma.bpmProcessDef.findUnique.mockResolvedValue({ id: 1, status: 'active' });
      mockPrisma.bpmProcessInstance.create.mockResolvedValue({
        id: 1,
        status: 'running',
        initiator: 'admin',
      });

      const result = await service.startInstance(1, { initiator: 'admin' });

      expect(result.status).toBe('running');
    });
  });

  describe('completeTask', () => {
    it('should complete a pending task', async () => {
      mockPrisma.bpmTask.findUnique.mockResolvedValue({ id: 1, status: 'pending' });
      mockPrisma.bpmTask.update.mockResolvedValue({ id: 1, status: 'completed' });

      const result = await service.completeTask(1, { comment: 'Done' });

      expect(result.status).toBe('completed');
    });
  });
});
