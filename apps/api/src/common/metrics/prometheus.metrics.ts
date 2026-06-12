import { Injectable, OnModuleInit } from '@nestjs/common';
import { collectDefaultMetrics, Registry, Counter, Histogram, Gauge, Summary } from 'prom-client';

/**
 * Prometheus 指标埋点服务
 *
 * 职责:
 *   1. 初始化并管理所有自定义 Prometheus 指标（API/Agent/区块链/获客/LLM/基础设施）
 *   2. 提供结构化的指标记录方法，供各模块调用
 *   3. 管理 Registry 实例，供 /metrics 端点使用
 *
 * 使用方式:
 *   - 在 AppModule 中导入 PrometheusModule
 *   - 在各 Service 中注入 PrometheusMetricsService 并调用 record* 方法
 *   - 通过 HttpModule 提供 GET /metrics 端点供 Prometheus 抓取
 */
@Injectable()
export class PrometheusMetricsService implements OnModuleInit {
  private registry: Registry;

  // ===== API 层指标 =====
  private httpRequestsTotal: Counter<string>;
  private httpRequestDurationMs: Histogram<string>;
  private httpRequestsInProgress: Gauge<string>;
  private httpResponsesSizeBytes: Histogram<string>;

  // ===== Agent 层指标 =====
  private agentSessionsActive: Gauge<string>;
  private agentTasksTotal: Counter<string>;
  private agentTaskDurationMs: Histogram<string>;
  private agentErrorsTotal: Counter<string>;

  // ===== 区块链指标 =====
  private blockchainEvidenceTotal: Counter<string>;
  private blockchainEvidenceDurationMs: Histogram<string>;
  private blockchainVerifyTotal: Counter<string>;
  private blockchainVerifyFailures: Counter<string>;

  // ===== 获客指标 =====
  private acquisitionLeadsCollected: Counter<string>;
  private acquisitionSyncDurationMs: Histogram<string>;
  private acquisitionPlatformSyncStatus: Gauge<string>;

  // ===== LLM 指标 =====
  private llmCallsTotal: Counter<string>;
  private llmCallDurationMs: Histogram<string>;
  private llmCacheHitRate: Gauge<string>;
  private llmTokensTotal: Counter<string>;
  private llmCostUsdTotal: Counter<string>;

  // ===== 基础设施指标 =====
  private dbConnectionsActive: Gauge<string>;
  private redisOperationsTotal: Counter<string>;
  private rabbitmqMessagesTotal: Counter<string>;
  private rabbitmqQueueDepth: Gauge<string>;

  onModuleInit() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry, prefix: 'smyweb3' });
    this.initApiMetrics();
    this.initAgentMetrics();
    this.initBlockchainMetrics();
    this.initAcquisitionMetrics();
    this.initLlmMetrics();
    this.initInfraMetrics();
  }

  getRegistry(): Registry {
    return this.registry;
  }

  // ===== API 层指标记录方法 =====

  recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    this.httpRequestsTotal.inc({ method, route, status_code: String(statusCode) });
    this.httpRequestDurationMs.observe({ method, route }, durationMs);
  }

  incrementInProgress(delta: number): void {
    this.httpRequestsInProgress.inc(delta);
  }

  // ===== Agent 层指标记录方法 =====

  recordAgentSessionStart(): void {
    this.agentSessionsActive.inc();
  }

  recordAgentSessionEnd(): void {
    this.agentSessionsActive.dec();
  }

  recordAgentTaskComplete(type: string, durationMs: number, success: boolean): void {
    this.agentTasksTotal.inc({ type, success: String(success) });
    this.agentTaskDurationMs.observe({ type }, durationMs);
    if (!success) this.agentErrorsTotal.inc({ type });
  }

  // ===== 区块链层指标记录方法 =====

  recordEvidenceCreated(chainId: number, durationMs: number): void {
    this.blockchainEvidenceTotal.inc({ chain_id: String(chainId) });
    this.blockchainEvidenceDurationMs.observe({ chain_id: String(chainId) }, durationMs);
  }

  recordVerifyResult(success: boolean): void {
    this.blockchainVerifyTotal.inc({ success: String(success) });
    if (!success) this.blockchainVerifyFailures.inc();
  }

  // ===== 获客层指标记录方法 =====

  recordLeadCollected(platform: string): void {
    this.acquisitionLeadsCollected.inc({ platform });
  }

  recordSyncComplete(platform: string, durationMs: number, count: number): void {
    this.acquisitionSyncDurationMs.observe({ platform }, durationMs);
  }

  setPlatformSyncStatus(platform: string, status: number): void {
    this.acquisitionPlatformSyncStatus.set({ platform }, status);
  }

  // ===== LLM 层指标记录方法 =====

  recordLlmCall(
    provider: string,
    model: string,
    durationMs: number,
    tokens: number,
    cost: number,
    cacheHit: boolean
  ): void {
    this.llmCallsTotal.inc({ provider, model });
    this.llmCallDurationMs.observe({ provider, model }, durationMs);
    this.llmTokensTotal.inc({ provider, model }, tokens);
    this.llmCostUsdTotal.inc({ provider, model }, cost);
    if (cacheHit) this.llmCacheHitRate.inc({ provider, model });
  }

  // ===== 基础设施层指标记录方法 =====

  setDbConnections(count: number): void {
    this.dbConnectionsActive.set(count);
  }

  recordRedisOperation(operation: string): void {
    this.redisOperationsTotal.inc({ operation });
  }

  recordRabbitMQMessage(queue: string): void {
    this.rabbitmqMessagesTotal.inc({ queue });
  }

  setRabbitMQQueueDepth(queue: string, depth: number): void {
    this.rabbitmqQueueDepth.set({ queue }, depth);
  }

  // ===== 私有初始化方法 =====

  private initApiMetrics(): void {
    this.httpRequestsTotal = new Counter({
      name: 'smyweb3_http_requests_total',
      help: 'HTTP 请求总数，按方法、路由、状态码维度统计',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDurationMs = new Histogram({
      name: 'smyweb3_http_request_duration_ms',
      help: 'HTTP 请求处理延迟分布（毫秒），用于计算 P50/P95/P99',
      labelNames: ['method', 'route'],
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000],
      registers: [this.registry],
    });

    this.httpRequestsInProgress = new Gauge({
      name: 'smyweb3_http_requests_in_progress',
      help: '当前正在处理的 HTTP 请求数量',
      registers: [this.registry],
    });

    this.httpResponsesSizeBytes = new Histogram({
      name: 'smyweb3_http_response_size_bytes',
      help: 'HTTP 响应体大小分布（字节）',
      labelNames: ['method', 'route'],
      buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000],
      registers: [this.registry],
    });
  }

  private initAgentMetrics(): void {
    this.agentSessionsActive = new Gauge({
      name: 'smyweb3_agent_sessions_active',
      help: '当前活跃的 Agent 会话数量',
      registers: [this.registry],
    });

    this.agentTasksTotal = new Counter({
      name: 'smyweb3_agent_tasks_total',
      help: 'Agent 任务完成总数，按任务类型和成功/失败维度统计',
      labelNames: ['type', 'success'],
      registers: [this.registry],
    });

    this.agentTaskDurationMs = new Histogram({
      name: 'smyweb3_agent_task_duration_ms',
      help: 'Agent 任务执行耗时分布（毫秒），按任务类型分类',
      labelNames: ['type'],
      buckets: [100, 500, 1000, 3000, 5000, 10000, 30000, 60000],
      registers: [this.registry],
    });

    this.agentErrorsTotal = new Counter({
      name: 'smyweb3_agent_errors_total',
      help: 'Agent 错误总数，按任务类型分类',
      labelNames: ['type'],
      registers: [this.registry],
    });
  }

  private initBlockchainMetrics(): void {
    this.blockchainEvidenceTotal = new Counter({
      name: 'smyweb3_blockchain_evidence_total',
      help: '区块链存证创建总数，按链 ID 分类',
      labelNames: ['chain_id'],
      registers: [this.registry],
    });

    this.blockchainEvidenceDurationMs = new Histogram({
      name: 'smyweb3_blockchain_evidence_duration_ms',
      help: '区块链存证上链确认耗时分布（毫秒）',
      labelNames: ['chain_id'],
      buckets: [500, 1000, 2000, 5000, 10000, 15000, 30000, 60000],
      registers: [this.registry],
    });

    this.blockchainVerifyTotal = new Counter({
      name: 'smyweb3_blockchain_verify_total',
      help: '区块链存证验证请求总数',
      labelNames: ['success'],
      registers: [this.registry],
    });

    this.blockchainVerifyFailures = new Counter({
      name: 'smyweb3_blockchain_verify_failures_total',
      help: '区块链存证验证失败总数',
      registers: [this.registry],
    });
  }

  private initAcquisitionMetrics(): void {
    this.acquisitionLeadsCollected = new Counter({
      name: 'smyweb3_acquisition_leads_total',
      help: '获客线索收集总数，按来源平台分类',
      labelNames: ['platform'],
      registers: [this.registry],
    });

    this.acquisitionSyncDurationMs = new Histogram({
      name: 'smyweb3_acquisition_sync_duration_ms',
      help: '平台数据同步耗时分布（毫秒）',
      labelNames: ['platform'],
      buckets: [1000, 3000, 5000, 10000, 30000, 60000, 120000],
      registers: [this.registry],
    });

    this.acquisitionPlatformSyncStatus = new Gauge({
      name: 'smyweb3_acquisition_platform_sync_status',
      help: '各平台数据同步状态 (0=idle, 1=syncing, 2=error, 3=disabled)',
      labelNames: ['platform'],
      registers: [this.registry],
    });
  }

  private initLlmMetrics(): void {
    this.llmCallsTotal = new Counter({
      name: 'smyweb3_llm_calls_total',
      help: 'LLM API 调用总数，按提供商和模型分类',
      labelNames: ['provider', 'model'],
      registers: [this.registry],
    });

    this.llmCallDurationMs = new Histogram({
      name: 'smyweb3_llm_call_duration_ms',
      help: 'LLM 推理调用耗时分布（毫秒）',
      labelNames: ['provider', 'model'],
      buckets: [100, 250, 500, 1000, 2000, 5000, 10000, 30000],
      registers: [this.registry],
    });

    this.llmCacheHitRate = new Gauge({
      name: 'smyweb3_llm_cache_hit_rate',
      help: 'LLM 缓存命中累计次数，配合总调用量计算命中率',
      labelNames: ['provider', 'model'],
      registers: [this.registry],
    });

    this.llmTokensTotal = new Counter({
      name: 'smyweb3_llm_tokens_total',
      help: 'LLM Token 消耗总量，用于成本核算',
      labelNames: ['provider', 'model'],
      registers: [this.registry],
    });

    this.llmCostUsdTotal = new Counter({
      name: 'smyweb3_llm_cost_usd_total',
      help: 'LLM 总花费（美元），按提供商和模型分类',
      labelNames: ['provider', 'model'],
      registers: [this.registry],
    });
  }

  private initInfraMetrics(): void {
    this.dbConnectionsActive = new Gauge({
      name: 'smyweb3_db_connections_active',
      help: '数据库连接池当前活跃连接数',
      registers: [this.registry],
    });

    this.redisOperationsTotal = new Counter({
      name: 'smyweb3_redis_operations_total',
      help: 'Redis 操作总数，按操作类型分类',
      labelNames: ['operation'],
      registers: [this.registry],
    });

    this.rabbitmqMessagesTotal = new Counter({
      name: 'smyweb3_rabbitmq_messages_total',
      help: 'RabbitMQ 消息总数，按队列名称分类',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.rabbitmqQueueDepth = new Gauge({
      name: 'smyweb3_rabbitmq_queue_depth',
      help: 'RabbitMQ 队列当前积压消息数',
      labelNames: ['queue'],
      registers: [this.registry],
    });
  }
}
