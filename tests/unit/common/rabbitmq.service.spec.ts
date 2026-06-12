import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RabbitMqService } from '../../../../apps/api/src/common/services/rabbitmq.service';

describe('RabbitMqService', () => {
  let service: RabbitMqService;
  let mockConfigService: Partial<jest.Mocked<ConfigService>>;
  let mockConnection: any;
  let mockChannel: any;

  beforeEach(async () => {
    mockChannel = {
      assertQueue: jest.fn().mockResolvedValue(undefined),
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

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'RABBITMQ_URL') return 'amqp://localhost';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMqService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RabbitMqService>(RabbitMqService);

    // 手动设置 mock 连接（绕过真实 amqplib 连接）
    (service as any).connection = mockConnection;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getChannel', () => {
    it('should create new channel when not cached', async () => {
      const ch = await service.getChannel('test');
      expect(ch).toBe(mockChannel);
      expect(mockConnection.createChannel).toHaveBeenCalled();
    });

    it('should return cached channel for same name', async () => {
      await service.getChannel('cached');
      const ch2 = await service.getChannel('cached');
      expect(mockConnection.createChannel).toHaveBeenCalledTimes(1);
      expect(ch2).toBe(mockChannel);
    });
  });

  describe('publish', () => {
    it('should publish message to queue with persistence', async () => {
      const payload = { action: 'test' };
      const result = await service.publish('test-queue', payload);

      expect(result).toBe(true);
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('test-queue', { durable: true });
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'test-queue',
        Buffer.from(JSON.stringify(payload)),
        expect.objectContaining({ persistent: true })
      );
    });

    it('should merge custom options with defaults', async () => {
      const options = { priority: 5 };
      await service.publish('test-queue', {}, options);

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Buffer),
        expect.objectContaining({ persistent: true, priority: 5 })
      );
    });
  });

  describe('consume', () => {
    it('should consume messages from queue', async () => {
      const handler = jest.fn();
      await service.consume('test-queue', handler, 20);

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('test-queue', { durable: true });
      expect(mockChannel.prefetch).toHaveBeenCalledWith(20);
      expect(mockChannel.consume).toHaveBeenCalled();
    });

    it('should use default prefetch of 10', async () => {
      await service.consume('test-queue', jest.fn());
      expect(mockChannel.prefetch).toHaveBeenCalledWith(10);
    });
  });

  describe('ack', () => {
    it('should acknowledge message via its channel', async () => {
      const msg = {
        content: Buffer.from('{}'),
        fields: { channel: mockChannel, deliveryTag: 1, routingKey: 'test' },
      };
      await service.ack(msg as any);
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });
  });

  describe('nack', () => {
    it('should reject message with requeue by default', async () => {
      const msg = {
        content: Buffer.from('{}'),
        fields: { channel: mockChannel, deliveryTag: 1, routingKey: 'test' },
      };
      await service.nack(msg as any);
      expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, true);
    });

    it('should reject message without requeue when specified', async () => {
      const msg = {
        content: Buffer.from('{}'),
        fields: { channel: mockChannel, deliveryTag: 1, routingKey: 'test' },
      };
      await service.nack(msg as any, false);
      expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, false);
    });
  });

  describe('createDelayedQueue', () => {
    it('should create delayed queue with dead-letter exchange', async () => {
      await service.createDelayedQueue('delayed-q', 5000);

      expect(mockChannel.assertExchange).toHaveBeenCalledWith('delayed-q.dlx', 'direct', {
        durable: true,
      });
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'delayed-q.dlq',
        expect.objectContaining({
          arguments: expect.objectContaining({
            'x-message-ttl': 5000,
          }),
        })
      );
      expect(mockChannel.bindQueue).toHaveBeenCalledWith(
        'delayed-q.dlq',
        'delayed-q.dlx',
        'delayed-q'
      );
    });
  });

  describe('healthCheck', () => {
    it('should return ok status when connection exists', async () => {
      const result = await service.healthCheck();
      expect(result.status).toBe('ok');
      expect(typeof result.channelCount).toBe('number');
    });

    it('should return disconnected status when no connection', async () => {
      (service as any).connection = null;
      const result = await service.healthCheck();
      expect(result.status).toBe('disconnected');
    });
  });
});
