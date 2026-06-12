import { AcquisitionService } from '@/modules/acquisition/acquisition.service';
import { PrismaService } from '@/common/prisma.service';
import { PlatformAdapter } from '@/modules/acquisition/adapters/platform-adapter.interface';
import { LlmProviderFactory } from '@/modules/ai-models/llm/providers/index';

jest.mock('@/common/prisma.service');

describe('AcquisitionService', () => {
  let service: AcquisitionService;
  let mockPrisma: any;
  let mockLlmProviderFactory: Partial<LlmProviderFactory>;

  beforeEach(() => {
    mockPrisma = {
      acquisitionLead: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        $queryRaw: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    mockLlmProviderFactory = {
      getDefaultProvider: jest.fn().mockReturnValue({
        chatCompletion: jest.fn().mockResolvedValue({ content: '15' }),
      }),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    service = new AcquisitionService(mockPrisma, mockLlmProviderFactory as LlmProviderFactory);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerAdapter', () => {
    it('should register a platform adapter', () => {
      const mockAdapter: PlatformAdapter = {
        platformName: 'test-platform',
        fetchLeads: jest.fn(),
        normalizeData: jest.fn(),
      };

      service.registerAdapter(mockAdapter);

      expect(service.getAvailablePlatforms()).toContain('test-platform');
    });
  });

  describe('getAdapter', () => {
    it('should return registered adapter', () => {
      const mockAdapter: PlatformAdapter = {
        platformName: 'twitter',
        fetchLeads: jest.fn(),
        normalizeData: jest.fn(),
      };
      service.registerAdapter(mockAdapter);

      const adapter = service.getAdapter('twitter');

      expect(adapter.platformName).toBe('twitter');
    });

    it('should throw error for unregistered platform', () => {
      expect(() => service.getAdapter('nonexistent')).toThrow('未注册的平台适配器');
    });
  });

  describe('normalizeRawLead', () => {
    it('should normalize raw lead data correctly', () => {
      const rawLead = {
        id: '12345',
        display_name: 'Test User',
        username: 'testuser',
        bio: 'AI enthusiast',
        follower_count: 10000,
        following_count: 500,
        post_count: 100,
        engagement_rate: 0.05,
        avatar_url: 'https://example.com/avatar.jpg',
        profile_url: 'https://example.com/testuser',
        tags: ['AI', 'tech'],
      };

      const result = service.normalizeRawLead(rawLead as any);

      expect(result.id).toContain('unknown:');
      expect(result.displayName).toBe('Test User');
      expect(result.followerCount).toBe(10000);
      expect(result.engagementRate).toBe(0.05);
    });
  });

  describe('deduplicate', () => {
    it('should remove duplicate leads', async () => {
      const leads = [
        { id: 'twitter:user1', platform: 'twitter' as any, displayName: 'User One' },
        { id: 'twitter:user1', platform: 'twitter' as any, displayName: 'User One' },
        { id: 'twitter:user2', platform: 'twitter' as any, displayName: 'User Two' },
      ] as any;

      const result = await service.deduplicate(leads);

      expect(result.unique.length).toBe(2);
      expect(result.duplicates).toBe(1);
    });
  });

  describe('scoreLeads', () => {
    it('should score leads and sort by score descending', async () => {
      const leads = [
        {
          id: 'test:1',
          platform: 'twitter' as any,
          displayName: 'Influencer',
          followerCount: 100000,
          engagementRate: 0.1,
          bio: 'AI expert and entrepreneur in Web3 space',
          collectedAt: new Date(),
        },
        {
          id: 'test:2',
          platform: 'twitter' as any,
          displayName: 'Normal User',
          followerCount: 100,
          engagementRate: 0.01,
          bio: 'Just a regular person',
          collectedAt: new Date(),
        },
      ] as any;

      const results = await service.scoreLeads(leads);

      expect(results.length).toBe(2);
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    });
  });
});
