import { MediaService } from '@/modules/media/media.service';
import { PrismaService } from '@/common/prisma.service';

jest.mock('@/common/prisma.service');

describe('MediaService', () => {
  let service: MediaService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      mediaPost: {
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
    service = new MediaService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('should return paginated media posts', async () => {
      const mockData = [{ id: 1, title: 'Test Post', platform: 'twitter', status: 'published' }];
      mockPrisma.mediaPost.findMany.mockResolvedValue(mockData);
      mockPrisma.mediaPost.count.mockResolvedValue(1);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('detail', () => {
    it('should return media post detail with user', async () => {
      const mockPost = { id: 1, title: 'Test', user: { id: 1, name: 'Author' } };
      mockPrisma.mediaPost.findUnique.mockResolvedValue(mockPost);

      const result = await service.detail(1);

      expect(result.title).toBe('Test');
    });
  });

  describe('create', () => {
    it('should stringify imageUrls array when creating post', async () => {
      mockPrisma.mediaPost.create.mockResolvedValue({ id: 1 });

      await service.create({
        title: 'New Post',
        imageUrls: ['url1.jpg', 'url2.jpg'],
      });

      const callArgs = mockPrisma.mediaPost.create.mock.calls[0][0].data;
      expect(typeof callArgs.imageUrls).toBe('string');
    });
  });

  describe('stats', () => {
    it('should return media statistics', async () => {
      mockPrisma.mediaPost.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(5);
      mockPrisma.mediaPost.groupBy.mockResolvedValue([
        { platform: 'twitter', _count: { _all: 40 }, _sum: { impressions: 10000, likes: 500 } },
      ]);

      const result = await service.stats();

      expect(result.total).toBe(100);
      expect(result.published).toBe(80);
    });
  });
});
