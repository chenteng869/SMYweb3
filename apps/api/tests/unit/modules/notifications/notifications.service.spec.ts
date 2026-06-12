import { NotificationsService } from '@/modules/notifications/notifications.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      notification: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new NotificationsService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('should return paginated notification list', async () => {
      const mockData = [{ id: 1, title: 'Test Notification', read: false }];
      mockPrisma.notification.findMany.mockResolvedValue(mockData);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });

    it('should filter by type when provided', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.list({ page: 1, pageSize: 20, type: 'alert' });

      const whereArg = mockPrisma.notification.findMany.mock.calls[0][0].where;
      expect(whereArg.type).toBe('alert');
    });
  });

  describe('create', () => {
    it('should create a new notification', async () => {
      const notificationData = { title: 'New Alert', message: 'Something happened', userId: 1 };
      mockPrisma.notification.create.mockResolvedValue({ id: 1, ...notificationData });

      const result = await service.create(notificationData);

      expect(result.title).toBe('New Alert');
    });
  });

  describe('broadcast', () => {
    it('should broadcast notification to all users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 3 });

      const result = await service.broadcast({
        title: 'System Update',
        message: 'Maintenance scheduled',
        type: 'info',
      });

      expect(mockPrisma.notification.createMany).toHaveBeenCalled();
    });
  });

  describe('markRead', () => {
    it('should mark notification as read', async () => {
      mockPrisma.notification.update.mockResolvedValue({ id: 1, read: true });

      const result = await service.markRead(1);

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { read: true },
      });
    });
  });
});
