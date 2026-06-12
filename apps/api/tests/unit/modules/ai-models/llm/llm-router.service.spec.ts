import { LlmRouterService } from '@/modules/ai-models/llm/llm-router.service';

// Mock LlmProviderFactory
const mockGetProvider = jest.fn();
const mockGetDefaultProvider = jest.fn(() => ({
  provider: 'openai',
}));
const mockGetConfig = jest.fn(() => ({
  defaultModel: 'gpt-4o',
}));

jest.mock('@/modules/ai-models/llm/providers/index', () => ({
  LlmProviderFactory: jest.fn().mockImplementation(() => ({
    getProvider: mockGetProvider,
    getDefaultProvider: mockGetDefaultProvider,
    getConfig: mockGetConfig,
  })),
}));

describe('LlmRouterService', () => {
  let routerService: LlmRouterService;

  beforeEach(() => {
    jest.clearAllMocks();
    routerService = new LlmRouterService(
      require('@/modules/ai-models/llm/providers/index').LlmProviderFactory()
    );
  });

  describe('getRecommendedModel - 场景路由', () => {
    it('code 场景应推荐 deepseek-reasoner', () => {
      const model = routerService.getRecommendedModel('code');
      expect(model).toBe('deepseek-reasoner');
    });

    it('reasoning 场景应推荐 deepseek-reasoner', () => {
      const model = routerService.getRecommendedModel('reasoning');
      expect(model).toBe('deepseek-reasoner');
    });

    it('vision 场景应推荐 gpt-4o', () => {
      const model = routerService.getRecommendedModel('vision');
      expect(model).toBe('gpt-4o');
    });

    it('image 场景应推荐 gpt-4o', () => {
      const model = routerService.getRecommendedModel('image');
      expect(model).toBe('gpt-4o');
    });

    it('long_context 场景应推荐 deepseek-chat', () => {
      const model = routerService.getRecommendedModel('long_context');
      expect(model).toBe('deepseek-chat');
    });

    it('cheap 场景应推荐 qwen-turbo', () => {
      const model = routerService.getRecommendedModel('cheap');
      expect(model).toBe('qwen-turbo');
    });

    it('batch 场景应推荐 qwen-turbo', () => {
      const model = routerService.getRecommendedModel('batch');
      expect(model).toBe('qwen-turbo');
    });

    it('tool_use 场景应推荐 claude-sonnet-4-20250514', () => {
      const model = routerService.getRecommendedModel('tool_use');
      expect(model).toBe('claude-sonnet-4-20250514');
    });

    it('agent 场景应推荐 claude-sonnet-4-20250514', () => {
      const model = routerService.getRecommendedModel('agent');
      expect(model).toBe('claude-sonnet-4-20250514');
    });

    it('未知场景应回退到默认模型', () => {
      const model = routerService.getRecommendedModel('unknown_scenario');
      expect(mockGetDefaultProvider).toHaveBeenCalled();
      expect(mockGetConfig).toHaveBeenCalled();
      expect(model).toBe('gpt-4o');
    });
  });

  describe('场景名称大小写兼容', () => {
    it('大写 CODE 应匹配 code 规则', () => {
      const model = routerService.getRecommendedModel('CODE');
      expect(model).toBe('deepseek-reasoner');
    });

    it('混合大小写 Vision 应匹配 vision 规则', () => {
      const model = routerService.getRecommendedModel('Vision');
      expect(model).toBe('gpt-4o');
    });

    it('带空格的场景名应正常 trim 处理', () => {
      const model = routerService.getRecommendedModel('  agent  ');
      expect(model).toBe('claude-sonnet-4-20250514');
    });
  });

  describe('route - Provider 路由', () => {
    it('code 场景应返回 deepseek provider', () => {
      const mockProvider = { provider: 'deepseek', chat: jest.fn() };
      mockGetProvider.mockReturnValue(mockProvider as any);
      const provider = routerService.route('code');
      expect(mockGetProvider).toHaveBeenCalledWith('deepseek');
      expect(provider).toEqual(mockProvider);
    });

    it('vision 场景应返回 openai provider', () => {
      const provider = routerService.route('vision');
      expect(mockGetProvider).toHaveBeenCalledWith('openai');
    });

    it('agent 场景应返回 anthropic provider', () => {
      const provider = routerService.route('agent');
      expect(mockGetProvider).toHaveBeenCalledWith('anthropic');
    });

    it('未知场景应使用默认 provider', () => {
      const provider = routerService.route('nonexistent');
      expect(mockGetDefaultProvider).toHaveBeenCalled();
      expect(provider).toBeDefined();
    });
  });
});
