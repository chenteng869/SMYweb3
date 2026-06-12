import {
  AgentPoolService,
  WorkerStatus,
  AgentWorker,
  PoolStatus,
} from '@/modules/openclaw/agents/agent-pool.service';

jest.mock('@/common/prisma.service');

describe('AgentPoolService', () => {
  let poolService: AgentPoolService;
  let mockPrisma: any;

  beforeEach(() => {
    // Save and restore AGENT_MAX_CONCURRENCY
    const originalEnv = process.env.AGENT_MAX_CONCURRENCY;

    mockPrisma = {};
    poolService = new AgentPoolService(mockPrisma);

    // Restore env
    if (originalEnv === undefined) {
      delete process.env.AGENT_MAX_CONCURRENCY;
    }
  });

  afterEach(() => {
    // Clean up timers created by startIdleChecker
    if ((poolService as any).idleCheckTimer) {
      clearInterval((poolService as any).idleCheckTimer);
    }
    jest.clearAllMocks();
  });

  describe('WorkerStatus 枚举导出', () => {
    it('WorkerStatus 应包含所有预期状态值', () => {
      expect(WorkerStatus.IDLE).toBe('idle');
      expect(WorkerStatus.RUNNING).toBe('running');
      expect(WorkerStatus.PAUSED).toBe('paused');
      expect(WorkerStatus.STOPPED).toBe('stopped');
    });
  });

  describe('acquire - 获取工作器', () => {
    it('首次获取应创建新工作器', async () => {
      const worker = await poolService.acquire(1001);

      expect(worker.sessionId).toBe(1001);
      expect(worker.status).toBe(WorkerStatus.IDLE);
      expect(worker.taskCount).toBe(0);
      expect(worker.currentTask).toBeNull();
      expect(worker.createdAt).toBeInstanceOf(Date);
    });

    it('相同 sessionId 应复用已有工作器', async () => {
      await poolService.acquire(1001);
      const worker2 = await poolService.acquire(1001);

      expect(worker2.sessionId).toBe(1001);
    });

    it('池满时应抛出错误', async () => {
      // Sequentially fill up the pool to maxConcurrency
      for (let i = 1; i <= 50; i++) {
        await poolService.acquire(i);
      }

      // Pool is now full, next acquire should throw
      await expect(poolService.acquire(9999)).rejects.toThrow('已满');
    });
  });

  describe('release - 释放工作器', () => {
    it('释放存在的工作器应更新状态为 IDLE', async () => {
      await poolService.acquire(2001);
      poolService.release(2001);

      const worker = poolService.getActiveSession(2001);
      expect(worker?.status).toBe(WorkerStatus.IDLE);
    });

    it('释放不存在的工作器不应报错', () => {
      expect(() => poolService.release(9999)).not.toThrow();
    });
  });

  describe('查询方法', () => {
    it('getAvailableSlots 应返回可用槽位数', async () => {
      // 初始状态：maxConcurrency=50, currentLoad=0 → available=50
      expect(poolService.getAvailableSlots()).toBe(50);

      await poolService.acquire(3001);
      expect(poolService.getAvailableSlots()).toBe(49);
    });

    it('getPoolStatus 应返回完整状态指标', async () => {
      await poolService.acquire(4001);
      await poolService.acquire(4002);

      const status: PoolStatus = poolService.getPoolStatus();

      expect(status.max).toBe(50);
      expect(status.active).toBe(2);
      expect(status.available).toBe(48);
      expect(typeof status.utilization).toBe('number');
      expect(status.utilization).toBeGreaterThanOrEqual(0);
      expect(status.utilization).toBeLessThanOrEqual(1);
    });

    it('getActiveSession 应返回指定会话的工作器或 undefined', async () => {
      expect(poolService.getActiveSession(5001)).toBeUndefined();

      await poolService.acquire(5001);
      expect(poolService.getActiveSession(5001)).toBeDefined();
    });

    it('getAllActive 应返回所有活跃工作器的快照', async () => {
      await poolService.acquire(6001);
      await poolService.acquire(6002);

      const all = poolService.getAllActive();

      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBe(2);
    });
  });

  describe('扩缩容方法', () => {
    it('scaleUp 应增加最大并发数', () => {
      const before = poolService.getPoolStatus().max;
      poolService.scaleUp(10);
      const after = poolService.getPoolStatus().max;

      expect(after).toBe(before + 10);
    });

    it('scaleDown 应减少最大并发数但不低于默认值', () => {
      poolService.scaleUp(20);
      const before = poolService.getPoolStatus().max;
      poolService.scaleDown(10);
      const after = poolService.getPoolStatus().max;

      expect(after).toBeLessThan(before);
    });
  });

  describe('onModuleDestroy - 优雅关闭', () => {
    it('应清理所有活跃工作器', async () => {
      await poolService.acquire(7001);
      await poolService.acquire(7002);

      await poolService.onModuleDestroy();

      expect(poolService.getAllActive().length).toBe(0);
    });
  });
});
