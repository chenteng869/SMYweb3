/** RabbitMQ 连接配置 */
export interface RabbitMQConfig {
  url: string;
  hostname?: string;
  port?: number;
  username?: string;
  password?: string;
  vhost?: string;
  protocol?: 'amqp' | 'amqps';
  heartbeat?: number;
  timeout?: number;
}

/** 消息体（支持多种格式） */
export type MessageBody = string | Buffer | Record<string, unknown>;

/** 发布消息选项 */
export interface PublishOptions {
  /** 路由键（用于 topic/direct exchange） */
  routingKey?: string;
  /** 是否持久化消息 */
  persistent?: boolean;
  /** TTL（毫秒） */
  expiration?: number | string;
  /** 消息优先级 */
  priority?: number;
  /** 消息 ID */
  messageId?: string;
  /** 关联 ID */
  correlationId?: string;
  /** 自定义 headers */
  headers?: Record<string, string | number | boolean>;
}

/** 队列声明选项 */
export interface QueueOptions {
  /** 是否持久化队列 */
  durable?: boolean;
  /** 排他性（仅当前连接可用） */
  exclusive?: boolean;
  /** 自动删除（无消费者时） */
  autoDelete?: boolean;
  /** 消息 TTL（毫秒） */
  messageTtl?: number;
  /** 死信交换机 */
  deadLetterExchange?: string;
  /** 死信路由键 */
  deadLetterRoutingKey?: string;
  /** 最大长度 */
  maxLength?: number;
  /** 额外参数（如 x-dead-letter-exchange, x-message-ttl 等） */
  arguments?: Record<string, unknown>;
}

/** 消费者回调函数类型 */
export type MessageHandler = (
  msg: unknown,
  ack: () => void,
  nack: (requeue?: boolean) => void
) => Promise<void>;

/** 延迟队列选项 */
export interface DelayedQueueOptions {
  queueName: string;
  delayMs: number;
  exchangeName?: string;
  routingKey?: string;
}

/**
 * 频道包装器（代理模式）
 *
 * amqplib 无官方 TypeScript 类型声明。
 * wrapper 同时暴露底层 channel 和代理方法，
 * 使用者可直接在 wrapper 上调用 assertQueue/sendToQueue 等。
 */
export interface ChannelWrapper {
  /** 底层 amqp 频道实例（unknown — amqplib 无官方 TS 类型） */
  channel: unknown;
  /** 关联的队列名称 */
  queueName: string;
  /** 消费者标签 */
  consumerTag?: string;
  /** 代理：声明队列 */
  assertQueue(queue: string, options?: QueueOptions): Promise<unknown>;
  /** 代理：发送消息 */
  sendToQueue(queue: string, content: MessageBody, options?: PublishOptions): Promise<boolean>;
}

/** RabbitMQ 服务健康状态 */
export interface RabbitMQHealthStatus {
  status: 'connected' | 'disconnected' | 'error';
  url?: string;
  channelCount: number;
  uptime?: number;
  error?: string;
}
