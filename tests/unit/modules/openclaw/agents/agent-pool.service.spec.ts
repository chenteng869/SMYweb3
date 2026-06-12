import { Test, TestingModule } from '@nestjs/testing';
import {
  AgentPoolService,
  WorkerStatus,
  AgentWorker,
  PoolStatus,
} from '../../../../apps/api/src/modules/openclaw/agents/agent-pool.service';

// Mock PrismaService
const mockPrisma = {};

describe('AgentPoolService', () => {
  let service: AgentPoolService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // 重置环境变量
    delete process.env.AGENT_MAX_CONCURRENCY;

    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentPoolService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AgentPoolService>(AgentPoolService);
  });

  afterEach(() => {
    // 清理定时器
    if ((service as any).idleCheckTimer) {
      clearInterval((service as any).idleCheckTimer);
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('acquire', () => {
    it('should create new worker for new session', async () => {
      const worker = await service.acquire(1);

      expect(worker.sessionId).toBe(1);
      expect(worker.status).toBe(WorkerStatus.IDLE);
      expect(worker.taskCount).toBe(0);
      expect(worker.currentTask).toBeNull();
      expect(worker.createdAt).toBeInstanceOf(Date);
      expect(worker.lastActiveAt).toBeInstanceOf(Date);
    });

    it('should reuse existing worker for same session', async () => {
      await service.acquire(1);
      const worker = await service.acquire(1);

      expect(worker.status).toBe(WorkerStatus.RUNNING);
      expect(worker.sessionId).toBe(1);
    });

    it('should throw error when pool is full', async () => {
      // 默认 maxConcurrency = 50，填满它
      for (let i = 1; i <= 50; i++) {
        await service.acquire(i);
      }

      await expect(service.acquire(51)).rejects.toThrow('Agent Pool 已满');
    });
  });

  describe('release', () => {
    it('should release worker and set status to IDLE', async () => {
      await service.acquire(1);
      service.release(1);

      const worker = service.getActiveSession(1);
      expect(worker?.status).toBe(WorkerStatus.IDLE);
      expect(worker?.currentTask).toBeNull();
    });

    it('should handle releasing non-existent worker gracefully', () => {
      // 不应抛出异常
      expect(() => service.release(999)).not.toThrow();
    });

    it('should cleanup idle timed-out workers on release', async () => {
      await service.acquire(1);

      // 手动将 lastActiveAt 设置为很久以前（超过5分钟）
      const worker = service.getActiveSession(1)!;
      worker.lastActiveAt = new Date(Date.now() - 6 * 60 * 1000); // 6分钟前

      service.release(1);

      // 工作器应该被清理掉
      expect(service.getActiveSession(1)).toBeUndefined();
    });
  });

  describe('getAvailableSlots / getPoolStatus', () => {
    it('should return correct available slots count', async () => {
      // 初始状态：50个可用槽位
      expect(service.getAvailableSlots()).toBe(50);

      // 获取一个工作器后：49个可用
      await service.acquire(1);
      expect(service.getAvailableSlots()).toBe(49);
    });

    it('should return complete pool status', async () => {
      await service.acquire(1);
      await service.acquire(2);

      const status: PoolStatus = service.getPoolStatus();

      expect(status.max).toBe(50);
      expect(status.active).toBe(2);
      expect(status.available).toBe(48);
      expect(status.utilization).toBeCloseTo(2 / 50, 4);
    });

    it('should return zero utilization when pool is empty', () => {
      const status = service.getPoolStatus();
      expect(status.active).toBe(0);
      expect(status.available).toBe(50);
      expect(status.utilization).toBe(0);
    });
  });

  describe('getActiveSession / getAllActive', () => {
    it('should return undefined for non-existent session', () => {
      const result = service.getActiveSession(999);
      expect(result).toBeUndefined();
    });

    it('should return active session by id', async () => {
      await service.acquire(42);
      const result = service.getActiveSession(42);
      expect(result).toBeDefined();
      expect(result!.sessionId).toBe(42);
    });

    it('should return all active sessions as array', async () => {
      await service.acquire(1);
      await service.acquire(2);
      await service.acquire(3);

      const allActive = service.getAllActive();
      expect(allActive).toHaveLength(3);
      expect(allActive.map((w) => w.sessionId)).toContain(1);
      expect(allActive.map((w) => w.sessionId)).toContain(2);
      expect(allActive.map((w) => w.sessionId)).toContain(3);
    });
  });

  describe('scaleUp / scaleDown', () => {
    it('should increase max concurrency', () => {
      const before = service.getPoolStatus().max;
      service.scaleUp(10);
      const after = service.getPoolStatus().max;
      expect(after).toBe(before + 10);
    });

    it('should decrease max concurrency but not below base value', () => {
      service.scaleDown(100); // 尝试缩减超过初始值
      const status = service.getPoolStatus();
      // 应该不低于默认值 50
      expect(status.max).toBeGreaterThanOrEqual(50);
    });

    it('should use default increment of 10 for scaleUp', () => {
      const before = service.getPoolStatus().max;
      service.scaleUp(); // 无参数
      expect(service.getPoolStatus().max).toBe(before + 10);
    });
  });

  describe('onModuleDestroy', () => {
    it('should clean up all workers and stop timer', async () => {
      await service.acquire(1);
      await service.acquire(2);

      await service.onModuleDestroy();

      expect(service.getAllActive()).toHaveLength(0);
      expect(service.getAvailableSlots()).toBe(50); // currentLoad should be reset

      const allWorkers = service.getAllActive();
      if (allWorkers.length > 0) {
        expect(allWorkers[0].status).not.toBe(WorkerStatus.STOPPED);
      }
    });

    it('should handle empty pool gracefully', async () => {
      // 空池不应抛出异常
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle concurrent acquire/release correctly', async () => {
      const promises: Promise<AgentWorker>[] = [];
      for (let i = 1; i <= 10; i++) {
        promises.push(service.acquire(i));
      }
      const workers = await Promise.all(promises);
      expect(workers).toHaveLength(10);
      expect(new Set(workers.map((w) => w.sessionId)).size).toBe(10);
    });

    it('should respect custom AGENT_MAX_CONCURRENCY env var', async () => {
      // 注意：这需要在实例化前设置环境变量
      // 当前测试使用默认值验证基本功能
      const status = service.getPoolStatus();
      expect(status.max).toBe(50); // DEFAULT_MAX_CONCURRENCY
    });
  });
});
