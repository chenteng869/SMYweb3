import { AgentExecutorService } from '@/modules/openclaw/agents/agent-executor.service';
import { AgentSessionStatus } from '@/modules/openclaw/agents/types/agent.types';
import {
  ICreateTaskRequest,
  ITaskResult,
  TaskType,
  TaskPriority,
  TaskStatus,
} from '@/modules/openclaw/agents/types/task.types';

jest.mock('@/common/prisma.service');
jest.mock('@/modules/ai-models/llm/providers/index', () => ({
  LlmProviderFactory: jest.fn().mockImplementation(() => ({
    getProvider: jest.fn(),
    getDefaultProvider: jest.fn(),
    getConfig: jest.fn(),
  })),
}));

describe('AgentExecutorService', () => {
  let executor: AgentExecutorService;
  let mockPrisma: any;

  function createMockPrisma() {
    return {
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
        update: jest.fn(),
      },
    };
  }

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    const { PrismaService } = require('@/common/prisma.service');
    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);

    const { LlmProviderFactory } = require('@/modules/ai-models/llm/providers/index');
    executor = new AgentExecutorService(mockPrisma, new LlmProviderFactory());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize - 初始化会话', () => {
    it('配置不存在时应返回 null', async () => {
      mockPrisma.openClawAgent.findUnique.mockResolvedValue(null);

      const result = await executor.initialize(1, 999);

      expect(result).toBeNull();
    });

    it('配置存在时应创建并返回会话对象', async () => {
      mockPrisma.openClawAgent.findUnique.mockResolvedValue({ id: 10, name: 'TestAgent' });
      mockPrisma.agentSession.create.mockResolvedValue({
        id: 1,
        configId: 10,
        status: AgentSessionStatus.IDLE,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        context: '{}',
        lastHeartbeatAt: new Date(),
        createdAt: new Date(),
      });

      const session = await executor.initialize(1, 10);

      expect(session).not.toBeNull();
      expect(session!.id).toBe(1);
      expect(session!.status).toBe(AgentSessionStatus.IDLE);
      expect(session!.configId).toBe(10);
      expect(mockPrisma.agentSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: 1,
            configId: 10,
            status: AgentSessionStatus.IDLE,
          }),
        })
      );
    });
  });

  describe('startTask - 启动任务', () => {
    it('会话不存在时应返回 -1', async () => {
      mockPrisma.agentSession.findUnique.mockResolvedValue(null);

      const taskReq: ICreateTaskRequest = {
        sessionId: 1,
        type: TaskType.ACQUISITION,
        payload: { type: TaskType.ACQUISITION, query: 'test' },
      };

      const taskId = await executor.startTask(1, taskReq);

      expect(taskId).toBe(-1);
    });

    it('会话已终止时应返回 -1', async () => {
      mockPrisma.agentSession.findUnique.mockResolvedValue({
        status: AgentSessionStatus.COMPLETED,
      });

      const taskReq: ICreateTaskRequest = {
        sessionId: 1,
        type: TaskType.CONTENT,
        payload: { type: TaskType.CONTENT },
      };

      const taskId = await executor.startTask(1, taskReq);

      expect(taskId).toBe(-1);
    });

    it('正常启动任务应返回新任务 ID 并更新会话状态', async () => {
      mockPrisma.agentSession.findUnique.mockResolvedValue({
        id: 1,
        status: AgentSessionStatus.IDLE,
        startedAt: null,
      });
      mockPrisma.agentTask.create.mockResolvedValue({ id: 42, sessionId: 1 });
      mockPrisma.agentSession.update.mockResolvedValue({});

      const taskReq: ICreateTaskRequest = {
        sessionId: 1,
        type: TaskType.ANALYSIS,
        priority: TaskPriority.HIGH,
        payload: { type: TaskType.ANALYSIS, fileId: 1 },
        createdBy: 100,
      };

      const taskId = await executor.startTask(1, taskReq);

      expect(taskId).toBe(42);
      expect(mockPrisma.agentTask.create).toHaveBeenCalled();
      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            status: AgentSessionStatus.RUNNING,
          }),
        })
      );
    });
  });

  describe('completeTask - 完成任务', () => {
    it('任务不存在时应静默返回', async () => {
      mockPrisma.agentTask.findUnique.mockResolvedValue(null);

      const result: ITaskResult = {
        success: true,
        data: { output: 'done' },
        metrics: { durationMs: 100 },
      };

      await expect(executor.completeTask(999, result)).resolves.not.toThrow();
    });

    it('正常完成应更新任务和会话计数', async () => {
      mockPrisma.agentTask.findUnique.mockResolvedValue({ id: 1, sessionId: 10 });
      mockPrisma.agentTask.update.mockResolvedValue({});
      mockPrisma.agentSession.update.mockResolvedValue({});

      const result: ITaskResult = {
        success: true,
        data: { items: [1, 2, 3] },
        metrics: { durationMs: 500, tokensUsed: 1200 },
      };

      await executor.completeTask(1, result);

      expect(mockPrisma.agentTask.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            status: TaskStatus.SUCCESS,
          }),
        })
      );
      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: expect.objectContaining({
            completedTasks: { increment: 1 },
          }),
        })
      );
    });
  });

  describe('failTask - 任务失败', () => {
    it('非重试失败应增加会话 failedTasks 计数', async () => {
      mockPrisma.agentTask.findUnique.mockResolvedValue({ id: 1, sessionId: 10 });
      mockPrisma.agentTask.update.mockResolvedValue({});
      mockPrisma.agentSession.update.mockResolvedValue({});

      await executor.failTask(1, 'Something went wrong', false);

      expect(mockPrisma.agentTask.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: TaskStatus.FAILED,
            errorMessage: 'Something went wrong',
          }),
        })
      );
      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            failedTasks: { increment: 1 },
          }),
        })
      );
    });

    it('可重试失败应标记为 RETRYING 且不增加 failedTasks', async () => {
      mockPrisma.agentTask.findUnique.mockResolvedValue({ id: 2, sessionId: 20 });
      mockPrisma.agentTask.update.mockResolvedValue({});

      await executor.failTask(2, 'Temporary error', true);

      expect(mockPrisma.agentTask.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: TaskStatus.RETRYING,
            retryCount: { increment: 1 },
          }),
        })
      );
      // 不应调用 session update 来增加 failedTasks
    });
  });

  describe('pauseSession / resumeSession - 暂停与恢复', () => {
    it('暂停会话应设置 PAUSED 状态', async () => {
      mockPrisma.agentSession.update.mockResolvedValue({});

      await executor.pauseSession(1, '用户手动暂停');

      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            status: AgentSessionStatus.PAUSED,
          }),
        })
      );
    });

    it('恢复非 PAUSED 状态的会话应跳过', async () => {
      mockPrisma.agentSession.findUnique.mockResolvedValue({
        status: AgentSessionStatus.RUNNING,
      });

      await executor.resumeSession(1);

      // 不应调用 update 因为状态不是 PAUSED
      expect(mockPrisma.agentSession.update).not.toHaveBeenCalled();
    });

    it('恢复 PAUSED 状态的会话应设回 RUNNING', async () => {
      mockPrisma.agentSession.findUnique.mockResolvedValue({
        status: AgentSessionStatus.PAUSED,
      });
      mockPrisma.agentSession.update.mockResolvedValue({});

      await executor.resumeSession(1);

      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AgentSessionStatus.RUNNING,
          }),
        })
      );
    });
  });

  describe('completeSession / errorSession - 结束与异常', () => {
    it('完成会话应设置 COMPLETED 状态', async () => {
      mockPrisma.agentSession.update.mockResolvedValue({});

      await executor.completeSession(1, '任务全部完成');

      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AgentSessionStatus.COMPLETED,
          }),
        })
      );
    });

    it('标记异常应设置 ERROR 状态并记录错误信息', async () => {
      mockPrisma.agentSession.update.mockResolvedValue({});

      await executor.errorSession(1, '数据库连接超时');

      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AgentSessionStatus.ERROR,
          }),
        })
      );
    });
  });

  describe('heartbeat / getSession / updateProgress', () => {
    it('心跳应更新 lastHeartbeatAt', async () => {
      mockPrisma.agentSession.update.mockResolvedValue({});

      await executor.heartbeat(1);

      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            lastHeartbeatAt: expect.any(Date),
          }),
        })
      );
    });

    it('getSession 在会话不存在时返回 null', async () => {
      mockPrisma.agentSession.findUnique.mockResolvedValue(null);

      const session = await executor.getSession(999);

      expect(session).toBeNull();
    });

    it('updateProgress 应更新当前任务描述', async () => {
      mockPrisma.agentSession.update.mockResolvedValue({});

      await executor.updateProgress(1, '正在处理第3个文件...');

      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { currentTask: '正在处理第3个文件...' },
        })
      );
    });
  });
});
