import { Test, TestingModule } from '@nestjs/testing';
import { TokenCounterService } from '../../../../apps/api/src/modules/ai-models/llm/token-counter.service';

// Mock PrismaService
const mockPrisma = {
  llmCallLog: {
    create: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
};

describe('TokenCounterService', () => {
  let service: TokenCounterService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenCounterService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<TokenCounterService>(TokenCounterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('countTokens', () => {
    it('should return 0 for empty string', () => {
      const result = service.countTokens('', 'gpt-4o');
      expect(result).toBe(0);
    });

    it('should return 0 for null/undefined-like input', () => {
      const result = service.countTokens('' as any, 'gpt-4o');
      expect(result).toBe(0);
    });

    it('should count tokens for GPT-4o with correct ratio (3.5)', () => {
      const text = 'Hello world! This is a test.';
      // 28 chars / 3.5 ≈ 8 tokens (ceiling)
      const result = service.countTokens(text, 'gpt-4o');
      expect(result).toBe(Math.ceil(text.length / 3.5));
    });

    it('should count tokens for Claude with ratio 3.8', () => {
      const text = 'Testing token counting for Claude model';
      const result = service.countTokens(text, 'claude-3-opus');
      expect(result).toBe(Math.ceil(text.length / 3.8));
    });

    it('should count tokens for DeepSeek with ratio 2.0', () => {
      const text = 'DeepSeek模型测试文本';
      // 中文+英文混合，使用较低的比率
      const result = service.countTokens(text, 'deepseek-chat');
      expect(result).toBe(Math.ceil(text.length / 2.0));
    });

    it('should count tokens for Qwen with ratio 1.8', () => {
      const text = '通义千问测试';
      const result = service.countTokens(text, 'qwen-plus');
      expect(result).toBe(Math.ceil(text.length / 1.8));
    });

    it('should use default ratio (3.0) for unknown models', () => {
      const text = 'Unknown model test';
      const result = service.countTokens(text, 'unknown-model-v1');
      expect(result).toBe(Math.ceil(text.length / 3.0));
    });

    it('should handle fuzzy model name matching (prefix)', () => {
      const text = 'Test';
      // gpt-4-turbo should match from TOKEN_RATIOS
      const result = service.countTokens(text, 'gpt-4-turbo-2024');
      expect(result).toBe(Math.ceil(text.length / 3.5)); // matches gpt-4-turbo
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost for GPT-4o correctly', () => {
      // GPT-4o: [2.5, 10] per million tokens
      const cost = service.calculateCost('gpt-4o', 1000, 500);
      const expectedInputCost = (2.5 * 1000) / 1_000_000;
      const expectedOutputCost = (10 * 500) / 1_000_000;
      expect(cost).toBeCloseTo(expectedInputCost + expectedOutputCost, 8);
    });

    it('should calculate cost for DeepSeek-reasoner correctly', () => {
      // deepseek-reasoner: [0.55, 2.19]
      const cost = service.calculateCost('deepseek-reasoner', 10000, 2000);
      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('should use default pricing for unknown model', () => {
      // Default: [5, 15]
      const cost = service.calculateCost('unknown-model', 1000, 1000);
      const expected = (5 * 1000 + 15 * 1000) / 1_000_000;
      expect(cost).toBeCloseTo(expected, 8);
    });
  });

  describe('recordUsage', () => {
    it('should record LLM usage to database successfully', async () => {
      mockPrisma.llmCallLog.create.mockResolvedValue({ id: 1 } as any);

      await service.recordUsage({
        instanceId: '1',
        provider: 'openai',
        model: 'gpt-4o',
        promptTokens: 100,
        completionTokens: 50,
        latencyMs: 1500,
        success: true,
        userId: '10',
        sessionId: '20',
      });

      expect(mockPrisma.llmCallLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          instanceId: 1,
          provider: 'openai',
          model: 'gpt-4o',
          promptTokens: 100,
          completionTokens: 50,
          latencyMs: 1500,
          success: true,
          userId: 10,
          sessionId: 20,
          totalCost: expect.any(Number),
        }),
      });
    });

    it('should handle optional userId and sessionId as undefined', async () => {
      mockPrisma.llmCallLog.create.mockResolvedValue({ id: 1 } as any);

      await service.recordUsage({
        instanceId: '1',
        provider: 'openai',
        model: 'gpt-4o',
        promptTokens: 100,
        completionTokens: 50,
        latencyMs: 1000,
        success: true,
      });

      const callArgs = mockPrisma.llmCallLog.create.mock.calls[0][0];
      expect(callArgs.data.userId).toBeUndefined();
      expect(callArgs.data.sessionId).toBeUndefined();
    });

    it('should not throw on database error', async () => {
      mockPrisma.llmCallLog.create.mockRejectedValue(new Error('DB error'));

      // Should not throw, error is caught internally
      await expect(
        service.recordUsage({
          instanceId: '1',
          provider: 'openai',
          model: 'gpt-4o',
          promptTokens: 100,
          completionTokens: 50,
          latencyMs: 1000,
          success: true,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('getCostStats', () => {
    beforeEach(() => {
      mockPrisma.llmCallLog.aggregate.mockResolvedValue({
        _sum: { totalCost: 0.123456, latencyMs: 50000 },
        _count: 10,
      });
      mockPrisma.llmCallLog.groupBy
        .mockResolvedValueOnce([
          { provider: 'openai', _sum: { totalCost: 0.08, latencyMs: 30000 }, _count: 6 },
          { provider: 'deepseek', _sum: { totalCost: 0.043456, latencyMs: 20000 }, _count: 4 },
        ])
        .mockResolvedValueOnce([
          { model: 'gpt-4o', _sum: { totalCost: 0.08, latencyMs: 30000 }, _count: 6 },
          { model: 'deepseek-chat', _sum: { totalCost: 0.043456, latencyMs: 20000 }, _count: 4 },
        ]);
    });

    it('should return aggregated cost statistics', async () => {
      const stats = await service.getCostStats({});
      expect(stats.totalCost).toBeCloseTo(0.123456);
      expect(stats.totalCalls).toBe(10);
      expect(stats.avgLatency).toBe(5000); // 50000ms / 10 calls
    });

    it('should include byProvider breakdown', async () => {
      const stats = await service.getCostStats({});
      expect(stats.byProvider).toHaveLength(2);
      expect(stats.byProvider[0]).toEqual(
        expect.objectContaining({
          provider: 'openai',
          totalCalls: 6,
        })
      );
    });

    it('should include byModel breakdown', async () => {
      const stats = await service.getCostStats({});
      expect(stats.byModel).toHaveLength(2);
      expect(stats.byModel[0]).toEqual(
        expect.objectContaining({
          model: 'gpt-4o',
          totalCalls: 6,
        })
      );
    });

    it('should filter by provider when specified', async () => {
      mockPrisma.llmCallLog.aggregate.mockResolvedValue({
        _sum: { totalCost: 0.05, latencyMs: 20000 },
        _count: 3,
      });
      mockPrisma.llmCallLog.groupBy.mockResolvedValue([]);

      const stats = await service.getCostStats({ provider: 'deepseek' });
      expect(stats.totalCalls).toBe(3);
    });

    it('should filter by date range when specified', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      await service.getCostStats({ startDate, endDate });

      const aggregateCall = mockPrisma.llmCallLog.aggregate.mock.calls[0][0];
      expect(aggregateCall.where.createdAt).toEqual(
        expect.objectContaining({
          gte: startDate,
          lte: endDate,
        })
      );
    });

    it('should handle empty results gracefully', async () => {
      mockPrisma.llmCallLog.aggregate.mockResolvedValue({
        _sum: { totalCost: null, latencyMs: null },
        _count: 0,
      });
      mockPrisma.llmCallLog.groupBy.mockResolvedValue([]);

      const stats = await service.getCostStats({});
      expect(stats.totalCost).toBe(0);
      expect(stats.totalCalls).toBe(0);
      expect(stats.avgLatency).toBe(0);
      expect(stats.byProvider).toEqual([]);
      expect(stats.byModel).toEqual([]);
    });
  });
});
