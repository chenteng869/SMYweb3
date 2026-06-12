import { RabbitMqService } from '../../../src/common/services/rabbitmq.service';
import { ConfigService } from '@nestjs/config';

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

describe('RabbitMqService', () => {
  let rabbitMqService: RabbitMqService;
  let mockConfigService: any;
  let mockConnection: any;
  let mockChannel: any;

  beforeEach(() => {
    mockChannel = {
      assertQueue: jest.fn().mockResolvedValue({}),
      sendToQueue: jest.fn().mockReturnValue(true),
      prefetch: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn().mockResolvedValue(undefined),
      ack: jest.fn().mockResolvedValue(undefined),
      nack: jest.fn().mockResolvedValue(undefined),
      assertExchange: jest.fn().mockResolvedValue(undefined),
      bindQueue: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    };

    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    };

    const amqpMock = require('amqplib');
    amqpMock.connect.mockResolvedValue(mockConnection);

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'RABBITMQ_URL') return 'amqp://localhost';
        return undefined;
      }),
    };

    rabbitMqService = new RabbitMqService(mockConfigService as ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该在 onModuleInit 时连接 RabbitMQ', async () => {
      const amqpMock = require('amqplib');

      await rabbitMqService.onModuleInit();

      expect(amqpMock.connect).toHaveBeenCalledWith('amqp://localhost');
      expect(mockConnection.on).toHaveBeenCalledTimes(2);
    });
  });

  describe('发布消息', () => {
    beforeEach(async () => {
      await rabbitMqService.onModuleInit();
    });

    it('应该成功发布消息到队列', async () => {
      const payload = { type: 'test', data: 'hello' };

      const result = await rabbitMqService.publish('test.queue', payload);

      expect(result).toBe(true);
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('test.queue', { durable: true });
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'test.queue',
        Buffer.from(JSON.stringify(payload)),
        expect.objectContaining({ persistent: true })
      );
    });

    it('应该支持自定义选项', async () => {
      const payload = { priority: true };

      await rabbitMqService.publish('priority.queue', payload, { priority: 10 });

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'priority.queue',
        expect.any(Buffer),
        expect.objectContaining({ persistent: true, priority: 10 })
      );
    });
  });

  describe('消费消息', () => {
    beforeEach(async () => {
      await rabbitMqService.onModuleInit();
    });

    it('应该注册消费者并消费消息', async () => {
      const handler = jest.fn();
      const mockMsg = {
        content: Buffer.from(JSON.stringify({ test: true })),
        fields: { channel: mockChannel, deliveryTag: 1, routingKey: 'test.queue' },
      };

      // 让 consume 回调立即调用 handler
      mockChannel.consume.mockImplementation((_queue: string, fn: (msg: any) => void) => {
        fn(mockMsg);
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await rabbitMqService.consume('test.queue', handler);

      expect(handler).toHaveBeenCalledWith(mockMsg);
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('test.queue', { durable: true });
      expect(mockChannel.prefetch).toHaveBeenCalledWith(10);
    });

    it('应该支持自定义 prefetchCount', async () => {
      const handler = jest.fn();

      await rabbitMqService.consume('test.queue', handler, 5);

      expect(mockChannel.prefetch).toHaveBeenCalledWith(5);
    });
  });

  describe('消息确认/拒绝', () => {
    it('ack 应该确认消息', async () => {
      const msg = {
        content: Buffer.from('{}'),
        fields: { channel: mockChannel, deliveryTag: 1, routingKey: 'q' },
      };

      await rabbitMqService.ack(msg);

      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });

    it('nack 应该拒绝消息（默认重新入队）', async () => {
      const msg = {
        content: Buffer.from('{}'),
        fields: { channel: mockChannel, deliveryTag: 1, routingKey: 'q' },
      };

      await rabbitMqService.nack(msg);

      expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, true);
    });

    it('nack 应该支持不重新入队', async () => {
      const msg = {
        content: Buffer.from('{}'),
        fields: { channel: mockChannel, deliveryTag: 1, routingKey: 'q' },
      };

      await rabbitMqService.nack(msg, false);

      expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, false);
    });
  });

  describe('延迟队列', () => {
    beforeEach(async () => {
      await rabbitMqService.onModuleInit();
    });

    it('应该创建延迟队列', async () => {
      await rabbitMqService.createDelayedQueue('delayed.queue', 5000);

      expect(mockChannel.assertExchange).toHaveBeenCalledWith('delayed.queue.dlx', 'direct', {
        durable: true,
      });
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'delayed.queue.dlq',
        expect.objectContaining({
          arguments: expect.objectContaining({ 'x-message-ttl': 5000 }),
        })
      );
    });
  });

  describe('健康检查', () => {
    it('连接正常时应返回 connected 状态', async () => {
      await rabbitMqService.onModuleInit();

      const result = await rabbitMqService.healthCheck();

      expect(result.status).toBe('connected');
      expect(typeof result.channelCount).toBe('number');
    });

    it('未连接时应返回 disconnected 状态', async () => {
      const result = await rabbitMqService.healthCheck();

      expect(result.status).toBe('disconnected');
    });
  });

  describe('销毁', () => {
    it('onModuleDestroy 应关闭所有通道和连接', async () => {
      await rabbitMqService.onModuleInit();
      // 先获取一个通道来模拟有活跃通道
      await rabbitMqService.getChannel('test');

      await rabbitMqService.onModuleDestroy();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });
});
