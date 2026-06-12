import { Test, TestingModule } from '@nestjs/testing';
import { AgentExecutorService } from '../../../../apps/api/src/modules/openclaw/agents/agent-executor.service';

// Mock PrismaService
const mockPrisma = {
  openClawAgent: {
    findUnique: jest.fn(),
  },
  agentSession: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  agentTask: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
};

// Mock LlmProviderFactory
const mockLlmProviderFactory = {};

describe('AgentExecutorService', () => {
  let service: AgentExecutorService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentExecutorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'LlmProviderFactory', useValue: mockLlmProviderFactory },
      ],
    }).compile();

    service = module.get<AgentExecutorService>(AgentExecutorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialize (createSession)', () => {
    it('should create a new session successfully', async () => {
      mockPrisma.openClawAgent.findUnique.mockResolvedValue({ id: 1, name: 'test-agent' });
      mockPrisma.agentSession.create.mockResolvedValue({
        id: 100,
        configId: 1,
        status: 'IDLE',
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        context: '{}',
        lastHeartbeatAt: new Date(),
        createdAt: new Date(),
      } as any);

      const session = await service.initialize(100, 1);

      expect(session).toBeDefined();
      expect(session!.id).toBe(100);
      expect(session!.status).toBe('IDLE');
      expect(session!.configId).toBe(1);
    });

    it('should return null when config does not exist', async () => {
      mockPrisma.openClawAgent.findUnique.mockResolvedValue(null);

      const session = await service.initialize(100, 999);
      expect(session).toBeNull();
    });

    it('should return null on database error', async () => {
      mockPrisma.openClawAgent.findUnique.mockRejectedValue(new Error('DB error'));

      const session = await service.initialize(100, 1);
      expect(session).toBeNull();
    });
  });

  describe('startTask', () => {
    it('should create task and update session to RUNNING', async () => {
      mockPrisma.agentSession.findUnique.mockResolvedValue({
        id: 100,
        status: 'IDLE',
        totalTasks: 0,
        startedAt: null,
      } as any);
      mockPrisma.agentTask.create.mockResolvedValue({ id: 200 } as any);
      mockPrisma.agentSession.update.mockResolvedValue({} as any);

      const taskId = await service.startTask(100, {
        type: 'data_processing',
        payload: { source: 'api' },
        priority: 5,
        createdBy: 1,
      });

      expect(taskId).toBe(200);
      expect(mockPrisma.agentTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: 100,
          type: 'data_processing',
          payload: JSON.stringify({ source: 'api' }),
          status: 'RUNNING',
          priority: 5,
          createdBy: 1,
        }),
      });
    });

    it('should use default priority when not specified', async () => {
      mockPrisma.agentSession.findUnique.mockResolvedValue({ id: 100, status: 'IDLE' } as any);
      mockPrisma.agentTask.create.mockResolvedValue({ id: 201 } as any);
      mockPrisma.agentSession.update.mockResolvedValue({} as any);

      await service.startTask(100, { type: 'test', payload: {} });

      const createCall = mockPrisma.agentTask.create.mock.calls[0][0];
      expect(createCall.data.priority).toBe(5); // 默认 MEDIUM
    });

    it('should return -1 when session does not exist', async () => {
      mockPrisma.agentSession.findUnique.mockResolvedValue(null);

      const taskId = await service.startTask(999, { type: 'test', payload: {} });
      expect(taskId).toBe(-1);
    });

    it('should return -1 when session is already COMPLETED', async () => {
      mockPrisma.agentSession.findUnique.mockResolvedValue({
        id: 100,
        status: 'COMPLETED',
      } as any);

      const taskId = await service.startTask(100, { type: 'test', payload: {} });
      expect(taskId).toBe(-1);
    });

    it('should return -1 when session is in ERROR state', async () => {
      mockPrisma.agentSession.findUnique.mockResolvedValue({
        id: 100,
        status: 'ERROR',
      } as any);

      const taskId = await service.startTask(100, { type: 'test', payload: {} });
      expect(taskId).toBe(-1);
    });
  });

  describe('completeTask', () => {
    it('should mark task as SUCCESS and increment completedTasks', async () => {
      mockPrisma.agentTask.findUnique.mockResolvedValue({
        id: 200,
        sessionId: 100,
      } as any);
      mockPrisma.agentTask.update.mockResolvedValue({} as any);
      mockPrisma.agentSession.update.mockResolvedValue({} as any);

      await service.completeTask(200, {
        data: { result: 'ok' },
        metrics: { durationMs: 500 },
      });

      expect(mockPrisma.agentTask.update).toHaveBeenCalledWith({
        where: { id: 200 },
        data: expect.objectContaining({
          status: 'SUCCESS',
          completedAt: expect.any(Date),
        }),
      });
      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            completedTasks: { increment: 1 },
          }),
        })
      );
    });

    it('should handle non-existent task gracefully', async () => {
      mockPrisma.agentTask.findUnique.mockResolvedValue(null);

      // 不应抛出异常
      await expect(service.completeTask(999, { data: {}, metrics: {} })).resolves.toBeUndefined();
    });
  });

  describe('failTask', () => {
    it('should mark task as FAILED when not retryable', async () => {
      mockPrisma.agentTask.findUnique.mockResolvedValue({
        id: 200,
        sessionId: 100,
      } as any);
      mockPrisma.agentTask.update.mockResolvedValue({} as any);
      mockPrisma.agentSession.update.mockResolvedValue({} as any);

      await service.failTask(200, 'Something went wrong', false);

      expect(mockPrisma.agentTask.update).toHaveBeenCalledWith({
        where: { id: 200 },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Something went wrong',
        }),
      });
      // 应该增加会话的 failedTasks 计数
      expect(mockPrisma.agentSession.update).toHaveBeenCalled();
    });

    it('should mark task as RETRYING when retryable is true', async () => {
      mockPrisma.agentTask.findUnique.mockResolvedValue({
        id: 200,
        sessionId: 100,
      } as any);
      mockPrisma.agentTask.update.mockResolvedValue({} as any);
      mockPrisma.agentSession.update.mockResolvedValue({} as any);

      await service.failTask(200, 'Temporary failure', true);

      expect(mockPrisma.agentTask.update).toHaveBeenCalledWith({
        where: { id: 200 },
        data: expect.objectContaining({
          status: 'RETRYING',
          retryCount: { increment: 1 },
        }),
      });
    });
  });

  describe('pauseSession / resumeSession', () => {
    it('should pause session with reason', async () => {
      mockPrisma.agentSession.update.mockResolvedValue({} as any);

      await service.pauseSession(100, 'User requested pause');

      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: expect.objectContaining({
          status: 'PAUSED',
        }),
      });
    });

    it('should use default reason when not provided', async () => {
      mockPrisma.agentSession.update.mockResolvedValue({} as any);

      await service.pauseSession(100);

      const callArgs = mockPrisma.agentSession.update.mock.calls[0][0];
      expect(callArgs.data.context).toContain('用户手动暂停');
    });

    it('should resume paused session back to RUNNING', async () => {
      mockPrisma.agentSession.findUnique.mockResolvedValue({
        id: 100,
        status: 'PAUSED',
      } as any);
      mockPrisma.agentSession.update.mockResolvedValue({} as any);

      await service.resumeSession(100);

      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: expect.objectContaining({
          status: 'RUNNING',
        }),
      });
    });

    it('should skip resume if session is not PAUSED', async () => {
      mockPrisma.agentSession.findUnique.mockResolvedValue({
        id: 100,
        status: 'RUNNING',
      } as any);

      await service.resumeSession(100);
      // 不应调用 update，因为状态不是 PAUSED
      expect(mockPrisma.agentSession.update).not.toHaveBeenCalled();
    });

    it('should handle non-existent session on resume', async () => {
      mockPrisma.agentSession.findUnique.mockResolvedValue(null);

      await service.resumeSession(999);
      expect(mockPrisma.agentSession.update).not.toHaveBeenCalled();
    });
  });

  describe('completeSession / errorSession', () => {
    it('should complete session with summary', async () => {
      mockPrisma.agentSession.update.mockResolvedValue({} as any);

      await service.completeSession(100, 'All tasks finished');

      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: expect.objectContaining({
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        }),
      });
    });

    it('should mark session as ERROR with error message', async () => {
      mockPrisma.agentSession.update.mockResolvedValue({} as any);

      await service.errorSession(100, 'Critical failure occurred');

      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: expect.objectContaining({
          status: 'ERROR',
        }),
      });
    });
  });

  describe('heartbeat', () => {
    it('should update lastHeartbeatAt timestamp', async () => {
      mockPrisma.agentSession.update.mockResolvedValue({} as any);

      await service.heartbeat(100);

      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { lastHeartbeatAt: expect.any(Date) },
      });
    });
  });

  describe('getSession', () => {
    it('should return session with config name', async () => {
      mockPrisma.agentSession.findUnique.mockResolvedValue({
        id: 100,
        configId: 1,
        config: { name: 'Test Config' },
        status: 'IDLE',
        totalTasks: 10,
        completedTasks: 8,
        failedTasks: 1,
        currentTask: null,
        context: '{}',
        startedAt: new Date(),
        completedAt: null,
        lastHeartbeatAt: new Date(),
        createdAt: new Date(),
      } as any);

      const session = await service.getSession(100);

      expect(session).toBeDefined();
      expect(session!.id).toBe(100);
      expect(session!.configName).toBe('Test Config');
    });

    it('should return null for non-existent session', async () => {
      mockPrisma.agentSession.findUnique.mockResolvedValue(null);

      const session = await service.getSession(999);
      expect(session).toBeNull();
    });
  });

  describe('updateProgress', () => {
    it('should update currentTask description', async () => {
      mockPrisma.agentSession.update.mockResolvedValue({} as any);

      await service.updateProgress(100, 'Processing file #42');

      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { currentTask: 'Processing file #42' },
      });
    });
  });
});
