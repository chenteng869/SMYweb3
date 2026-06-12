import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChannelWrapper,
  MessageBody,
  PublishOptions,
  QueueOptions,
  RabbitMQHealthStatus,
} from '../types/rabbitmq.types';

// amqplib 没有提供官方 TypeScript 类型定义，使用 unknown 并在调用时进行类型断言
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires
const amqp: any = require('amqplib');

/** ConsumeMessage 简化类型 */
interface ConsumeMsg {
  content: Buffer;
  fields: { channel: ChannelWrapper['channel']; deliveryTag: number; routingKey: string };
}

/**
 * RabbitMQ 服务 — 连接管理、通道池、消息确认模式
 * 支持: publish/consume/ack/nack/createQueue/bindExchange
 */
@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection: unknown;
  private channels: Map<string, ChannelWrapper> = new Map();

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.get<string>('RABBITMQ_URL');
    if (!url) {
      this.logger.warn('RABBITMQ_URL not configured — skipping RabbitMQ connection');
      return;
    }
    try {
      this.connection = await amqp.connect(url);
      this.logger.log('RabbitMQ connected');

      (
        this.connection as { on: (event: string, handler: (...args: unknown[]) => void) => void }
      ).on('close', () => this.logger.warn('RabbitMQ connection closed'));
      (
        this.connection as { on: (event: string, handler: (...args: unknown[]) => void) => void }
      ).on('error', (err: Error) => this.logger.error(`RabbitMQ error: ${err.message}`));
    } catch (e) {
      this.logger.error(`Failed to connect to RabbitMQ: ${(e as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const [name, ch] of this.channels) {
      try {
        // amqp channel 的 close 方法
        await (ch.channel as { close: () => Promise<void> }).close();
      } catch {
        // ignore close errors during shutdown
      }
      this.channels.delete(name);
    }
    if (this.connection) {
      try {
        await (this.connection as { close: () => Promise<void> }).close();
      } catch {
        // ignore close errors during shutdown
      }
    }
  }

  /** 获取或创建通道 */
  async getChannel(channelName = 'default'): Promise<ChannelWrapper> {
    let wrapper = this.channels.get(channelName);
    if (!wrapper) {
      const ch = await (
        this.connection as { createChannel: () => Promise<unknown> }
      ).createChannel();
      (ch as { on: (event: string, handler: (...args: unknown[]) => void) => void }).on(
        'error',
        (err: Error) => this.logger.error(`Channel ${channelName} error: ${err.message}`)
      );
      wrapper = {
        channel: ch,
        queueName: channelName,
        // 代理方法：直接转发到底层 channel
        assertQueue: (queue, opts) =>
          (ch as { assertQueue: (q: string, o?: QueueOptions) => Promise<unknown> }).assertQueue(
            queue,
            opts
          ),
        sendToQueue: (queue, content, opts) =>
          (
            ch as {
              sendToQueue: (q: string, c: MessageBody, o?: PublishOptions) => Promise<boolean>;
            }
          ).sendToQueue(queue, content, opts),
      };
      this.channels.set(channelName, wrapper);
    }
    return wrapper;
  }

  /** 发布消息到队列 */
  async publish(
    queueName: string,
    payload: MessageBody,
    options?: PublishOptions
  ): Promise<boolean> {
    const ch = await this.getChannel('publisher');
    const queueOpts: QueueOptions = { durable: true };
    await (
      ch.channel as {
        assertQueue: (queue: string, opts?: QueueOptions) => Promise<unknown>;
      }
    ).assertQueue(queueName, queueOpts);

    const content =
      typeof payload === 'string' || Buffer.isBuffer(payload)
        ? payload
        : Buffer.from(JSON.stringify(payload));

    return (
      ch.channel as {
        sendToQueue: (
          queue: string,
          content: MessageBody,
          opts?: Record<string, unknown>
        ) => Promise<boolean>;
      }
    ).sendToQueue(queueName, content, { persistent: true, ...options });
  }

  /** 消费队列消息 */
  async consume(
    queueName: string,
    handler: (msg: ConsumeMsg) => void | Promise<void>,
    prefetchCount = 10
  ): Promise<void> {
    const ch = await this.getChannel(`consumer-${queueName}`);
    const queueOpts: QueueOptions = { durable: true };
    await (
      ch.channel as {
        assertQueue: (queue: string, opts?: QueueOptions) => Promise<unknown>;
      }
    ).assertQueue(queueName, queueOpts);
    await (
      ch.channel as {
        prefetch: (count: number) => Promise<unknown>;
      }
    ).prefetch(prefetchCount);
    await (
      ch.channel as {
        consume: (
          queue: string,
          callback: (msg: ConsumeMsg | null) => void | Promise<void>,
          opts?: { noAck: boolean }
        ) => Promise<{ consumerTag: string }>;
      }
    ).consume(
      queueName,
      async (msg: ConsumeMsg | null) => {
        if (msg !== null) {
          await handler(msg);
        }
      },
      { noAck: false }
    );
    this.logger.log(`Consuming from queue: ${queueName} (prefetch=${prefetchCount})`);
  }

  /** 确认消息处理完成 */
  async ack(msg: ConsumeMsg): Promise<void> {
    const ch = msg.fields.channel;
    await (ch as { ack: (msg: ConsumeMsg) => Promise<void> }).ack(msg);
  }

  /** 拒绝消息（重新入队或丢弃） */
  async nack(msg: ConsumeMsg, requeue = true): Promise<void> {
    const ch = msg.fields.channel;
    await (
      ch as { nack: (msg: ConsumeMsg, allUpTo: boolean, requeue: boolean) => Promise<void> }
    ).nack(msg, false, requeue);
  }

  /** 创建延迟队列 */
  async createDelayedQueue(queueName: string, delayMs: number): Promise<void> {
    const ch = await this.getChannel();
    const dlxExchange = `${queueName}.dlx`;
    const dlqName = `${queueName}.dlq`;

    await (
      ch.channel as {
        assertExchange: (exchange: string, type: string, opts?: QueueOptions) => Promise<unknown>;
      }
    ).assertExchange(dlxExchange, 'direct', { durable: true });

    await (
      ch.channel as {
        assertQueue: (queue: string, opts?: QueueOptions) => Promise<unknown>;
      }
    ).assertQueue(dlqName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': dlxExchange,
        'x-dead-letter-routing-key': queueName,
        'x-message-ttl': delayMs,
      },
    });

    await (
      ch.channel as {
        bindQueue: (queue: string, exchange: string, pattern: string) => Promise<unknown>;
      }
    ).bindQueue(dlqName, dlxExchange, queueName);
  }

  /** 健康检查 */
  async healthCheck(): Promise<RabbitMQHealthStatus> {
    return {
      status: this.connection ? 'connected' : 'disconnected',
      channelCount: this.channels.size,
    };
  }
}
