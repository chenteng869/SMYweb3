import { Test, TestingModule } from '@nestjs/testing';
import { LlmRouterService } from '../../../../apps/api/src/modules/ai-models/llm/llm-router.service';

// Mock LlmProviderFactory
const mockProviderFactory = {
  getProvider: jest.fn(),
  getDefaultProvider: jest.fn(),
  getConfig: jest.fn(),
};

describe('LlmRouterService', () => {
  let service: LlmRouterService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmRouterService,
        { provide: 'LlmProviderFactory', useValue: mockProviderFactory },
      ],
    }).compile();

    service = module.get<LlmRouterService>(LlmRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Scenario-based routing', () => {
    it('should route "code" scenario to deepseek provider', () => {
      const mockProvider = { provider: 'deepseek' as const };
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);

      const result = service.route('code');
      expect(result).toBe(mockProvider);
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('deepseek');
    });

    it('should route "reasoning" scenario to deepseek provider', () => {
      const mockProvider = { provider: 'deepseek' as const };
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);

      const result = service.route('reasoning');
      expect(result).toBe(mockProvider);
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('deepseek');
    });

    it('should route "vision" scenario to openai provider', () => {
      const mockProvider = { provider: 'openai' as const };
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);

      const result = service.route('vision');
      expect(result).toBe(mockProvider);
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('openai');
    });

    it('should route "image" scenario to openai provider', () => {
      const mockProvider = { provider: 'openai' as const };
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);

      const result = service.route('image');
      expect(result).toBe(mockProvider);
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('openai');
    });

    it('should route "long_context" scenario to deepseek provider', () => {
      const mockProvider = { provider: 'deepseek' as const };
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);

      const result = service.route('long_context');
      expect(result).toBe(mockProvider);
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('deepseek');
    });

    it('should route "cheap" scenario to qwen provider', () => {
      const mockProvider = { provider: 'qwen' as const };
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);

      const result = service.route('cheap');
      expect(result).toBe(mockProvider);
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('qwen');
    });

    it('should route "batch" scenario to qwen provider', () => {
      const mockProvider = { provider: 'qwen' as const };
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);

      const result = service.route('batch');
      expect(result).toBe(mockProvider);
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('qwen');
    });

    it('should route "tool_use" scenario to anthropic provider', () => {
      const mockProvider = { provider: 'anthropic' as const };
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);

      const result = service.route('tool_use');
      expect(result).toBe(mockProvider);
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('anthropic');
    });

    it('should route "agent" scenario to anthropic provider', () => {
      const mockProvider = { provider: 'anthropic' as const };
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);

      const result = service.route('agent');
      expect(result).toBe(mockProvider);
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('anthropic');
    });
  });

  describe('Default routing (unknown scenarios)', () => {
    it('should use default provider for unknown scenario', () => {
      const mockDefaultProvider = { provider: 'default' as const };
      mockProviderFactory.getDefaultProvider.mockReturnValue(mockDefaultProvider);

      const result = service.route('unknown_scenario');
      expect(result).toBe(mockDefaultProvider);
      expect(mockProviderFactory.getDefaultProvider).toHaveBeenCalled();
    });

    it('should use default provider for empty string scenario', () => {
      const mockDefaultProvider = { provider: 'default' as const };
      mockProviderFactory.getDefaultProvider.mockReturnValue(mockDefaultProvider);

      const result = service.route('');
      expect(result).toBe(mockDefaultProvider);
    });
  });

  describe('Case insensitivity', () => {
    it('should handle uppercase scenario names', () => {
      const mockProvider = { provider: 'deepseek' as const };
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);

      const result = service.route('CODE');
      expect(result).toBe(mockProvider);
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('deepseek');
    });

    it('should handle mixed case scenario names', () => {
      const mockProvider = { provider: 'openai' as const };
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);

      const result = service.route('ViSiOn');
      expect(result).toBe(mockProvider);
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('openai');
    });

    it('should trim whitespace from scenario name', () => {
      const mockProvider = { provider: 'qwen' as const };
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);

      const result = service.route('  cheap  ');
      expect(result).toBe(mockProvider);
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('qwen');
    });
  });

  describe('getRecommendedModel', () => {
    it('should return correct model for code scenario', () => {
      const model = service.getRecommendedModel('code');
      expect(model).toBe('deepseek-reasoner');
    });

    it('should return correct model for vision scenario', () => {
      const model = service.getRecommendedModel('vision');
      expect(model).toBe('gpt-4o');
    });

    it('should return correct model for cheap scenario', () => {
      const model = service.getRecommendedModel('cheap');
      expect(model).toBe('qwen-turbo');
    });

    it('should return correct model for tool_use scenario', () => {
      const model = service.getRecommendedModel('tool_use');
      expect(model).toBe('claude-sonnet-4-20250514');
    });

    it('should return default model config for unknown scenario', () => {
      mockProviderFactory.getDefaultProvider.mockReturnValue({ provider: 'openai' } as any);
      mockProviderFactory.getConfig.mockReturnValue({ defaultModel: 'gpt-4o' });

      const model = service.getRecommendedModel('nonexistent');
      expect(model).toBe('gpt-4o');
    });
  });
});
