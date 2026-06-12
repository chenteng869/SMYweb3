import { VideosService } from '@/modules/videos/videos.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('VideosService', () => {
  let service: VideosService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      video: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      videoComment: {
        findMany: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new VideosService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('should return paginated video list', async () => {
      const mockData = [{ id: 1, title: 'Test Video', status: 'published' }];
      mockPrisma.video.findMany.mockResolvedValue(mockData);
      mockPrisma.video.count.mockResolvedValue(1);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('detail', () => {
    it('should return video detail with comments', async () => {
      const mockVideo = {
        id: 1,
        title: 'Test Video',
        comments: [{ id: 1, content: 'Great video!' }],
      };
      mockPrisma.video.findUnique.mockResolvedValue(mockVideo);

      const result = await service.detail(1);

      expect(result.title).toBe('Test Video');
      expect(result.comments.length).toBeGreaterThan(0);
    });

    it('should throw error when video not found', async () => {
      mockPrisma.video.findUnique.mockResolvedValue(null);

      await expect(service.detail(999)).rejects.toThrow('视频不存在');
    });
  });

  describe('create', () => {
    it('should stringify tags when creating video', async () => {
      mockPrisma.video.create.mockResolvedValue({ id: 1 });

      await service.create({
        title: 'New Video',
        tags: ['AI', 'tech', 'education'],
      });

      const callArgs = mockPrisma.video.create.mock.calls[0][0].data;
      expect(typeof callArgs.tags).toBe('string');
    });
  });

  describe('stats', () => {
    it('should return video statistics', async () => {
      mockPrisma.video.count
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(5);
      mockPrisma.video.aggregate
        .mockResolvedValueOnce({ _sum: { views: 50000 } })
        .mockResolvedValueOnce({ _sum: { likes: 3000 } });
      // featured count (already called 4 times above, this is the 5th call)
      mockPrisma.video.count.mockResolvedValue(10);

      const result = await service.stats();

      expect(result.totalViews).toBe(50000);
      expect(result.totalLikes).toBe(3000);
    });
  });
});
