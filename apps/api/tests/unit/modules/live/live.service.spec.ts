import { LiveService } from '@/modules/live/live.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('LiveService', () => {
  let service: LiveService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      livePlatform: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      liveRoom: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      liveStream: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      liveSchedule: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      liveComment: {
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      liveAnalytics: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new LiveService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPlatforms', () => {
    it('should return paginated platforms with room counts', async () => {
      const mockPlatforms = [{ id: 1, name: 'TikTok', displayName: '抖音' }];
      mockPrisma.livePlatform.findMany.mockResolvedValue(mockPlatforms);
      mockPrisma.livePlatform.count.mockResolvedValue(1);
      mockPrisma.liveRoom.count.mockResolvedValue(10);

      const result = await service.findAllPlatforms(1, 20);

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.total).toBe(1);
    });
  });

  describe('createRoom', () => {
    it('should create room with default values', async () => {
      const data = { title: 'Test Room', anchorName: 'Host', platformId: 1 };
      mockPrisma.liveRoom.create.mockResolvedValue({ id: 1, ...data, status: 'offline' });

      const result = await service.createRoom(data);

      expect(result.status).toBe('offline');
    });
  });

  describe('startLive', () => {
    it('should start a live stream for a room', async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: 1,
        title: 'Test Room',
        platformId: 1,
        status: 'offline',
      });
      mockPrisma.liveRoom.update.mockResolvedValue({ id: 1, status: 'living' });
      mockPrisma.liveStream.create.mockResolvedValue({ id: 1, status: 'living' });

      const result = await service.startLive(1);

      expect(result.room.status).toBe('living');
      expect(result.stream.status).toBe('living');
    });

    it('should throw error when room not found', async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(null);

      await expect(service.startLive(999)).rejects.toThrow('直播间不存在');
    });
  });

  describe('endLive', () => {
    it('should end a live stream successfully', async () => {
      const now = new Date();
      const startedAt = new Date(now.getTime() - 3600000);
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: 1,
        status: 'living',
        streams: [{ id: 1, status: 'living', startedAt }],
      });
      mockPrisma.liveStream.update.mockResolvedValue({});
      mockPrisma.liveRoom.update.mockResolvedValue({});

      await service.endLive(1);

      expect(mockPrisma.liveStream.update).toHaveBeenCalled();
    });
  });
});
