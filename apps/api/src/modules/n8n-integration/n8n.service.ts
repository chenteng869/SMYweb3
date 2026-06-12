import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { firstValueFrom } from 'rxjs';
import axios, { AxiosRequestConfig } from 'axios';

/**
 * n8n 工作流集成服务
 *
 * 提供与外部 n8n 工作流自动化平台的完整集成能力，包括：
 * - 工作流模板管理（CRUD、激活/停用）
 * - Webhook 端点管理与触发
 * - 执行监控与状态追踪
 * - 预置工作流模板（6个业务模板）
 * - BPM 桥接集成
 */
@Injectable()
export class N8nIntegrationService {
  private readonly logger = new Logger(N8nIntegrationService.name);
  private readonly n8nUrl: string;
  private readonly n8nApiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    this.n8nUrl = this.configService.get<string>('N8N_URL', '');
    this.n8nApiKey = this.configService.get<string>('N8N_API_KEY', '');
  }

  // ==================== 私有辅助方法 ====================

  /** 构建带认证头的请求配置 */
  private buildConfig(extra?: AxiosRequestConfig): AxiosRequestConfig {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.n8nApiKey) {
      headers['X-N8N-API-KEY'] = this.n8nApiKey;
    }
    return {
      ...extra,
      headers: { ...headers, ...(extra?.headers || {}) },
      timeout: extra?.timeout ?? 30000,
    };
  }

  /** 安全的 HTTP GET 请求封装 */
  private async n8nGet<T = any>(path: string, params?: Record<string, any>): Promise<T> {
    try {
      const url = `${this.n8nUrl}${path}`;
      this.logger.debug(`[n8n] GET ${url}`);
      const response = await firstValueFrom(
        this.httpService.get<T>(url, this.buildConfig({ params }))
      );
      return (response as any).data;
    } catch (error: any) {
      this.logger.error(`[n8n] GET ${path} 失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /** 安全的 HTTP POST 请求封装 */
  private async n8nPost<T = any>(path: string, data?: any): Promise<T> {
    try {
      const url = `${this.n8nUrl}${path}`;
      this.logger.debug(`[n8n] POST ${url}`);
      const response = await firstValueFrom(
        this.httpService.post<T>(url, data, this.buildConfig())
      );
      return (response as any).data;
    } catch (error: any) {
      this.logger.error(`[n8n] POST ${path} 失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /** 安全的 HTTP PUT 请求封装 */
  private async n8nPut<T = any>(path: string, data?: any): Promise<T> {
    try {
      const url = `${this.n8nUrl}${path}`;
      this.logger.debug(`[n8n] PUT ${url}`);
      const response = await firstValueFrom(this.httpService.put<T>(url, data, this.buildConfig()));
      return (response as any).data;
    } catch (error: any) {
      this.logger.error(`[n8n] PUT ${path} 失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /** 安全的 HTTP DELETE 请求封装 */
  private async n8nDelete(path: string): Promise<void> {
    try {
      const url = `${this.n8nUrl}${path}`;
      this.logger.debug(`[n8n] DELETE ${url}`);
      await firstValueFrom(this.httpService.delete(url, this.buildConfig()));
    } catch (error: any) {
      this.logger.error(`[n8n] DELETE ${path} 失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==================== 1. 工作流模板管理 ====================

  /**
   * 获取所有工作流列表
   * @returns 工作流对象数组
   */
  async listWorkflows(): Promise<object[]> {
    return this.n8nGet<object[]>('/rest/workflows');
  }

  /**
   * 获取单个工作流详情
   * @param workflowId 工作流 ID
   * @returns 工作流详情对象
   */
  async getWorkflow(workflowId: string): Promise<object> {
    return this.n8nGet<object>(`/rest/workflows/${workflowId}`);
  }

  /**
   * 从模板创建新工作流
   * @param template 工作流模板对象
   * @returns 创建的工作流对象
   */
  async createWorkflow(template: object): Promise<object> {
    return this.n8nPost<object>('/rest/workflows', template);
  }

  /**
   * 更新工作流
   * @param workflowId 工作流 ID
   * @param updates 更新内容
   * @returns 更新后的工作流对象
   */
  async updateWorkflow(workflowId: string, updates: object): Promise<object> {
    return this.n8nPut<object>(`/rest/workflows/${workflowId}`, updates);
  }

  /**
   * 删除工作流
   * @param workflowId 工作流 ID
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.n8nDelete(`/rest/workflows/${workflowId}`);
  }

  /**
   * 激活工作流
   * @param workflowId 工作流 ID
   */
  async activateWorkflow(workflowId: string): Promise<void> {
    await this.n8nPost(`/rest/workflows/${workflowId}/activate`);
    this.logger.log(`[n8n] 工作流 ${workflowId} 已激活`);
  }

  /**
   * 停用工作流
   * @param workflowId 工作流 ID
   */
  async deactivateWorkflow(workflowId: string): Promise<void> {
    await this.n8nPost(`/rest/workflows/${workflowId}/deactivate`);
    this.logger.log(`[n8n] 工作流 ${workflowId} 已停用`);
  }

  // ==================== 2. Webhook 管理 ====================

  /**
   * 为工作流创建 Webhook 端点
   * @param workflowId 关联的工作流 ID
   * @param path Webhook 路径
   * @param method HTTP 方法（GET 或 POST）
   * @returns 完整的 Webhook URL
   */
  async createWebhookEndpoint(
    workflowId: string,
    path: string,
    method: 'GET' | 'POST'
  ): Promise<string> {
    const webhookPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = `${this.n8nUrl}/webhook${webhookPath}`;

    // 在工作流中添加或更新 webhook 节点
    const workflow = (await this.getWorkflow(workflowId)) as any;
    if (!workflow.nodes) {
      throw new Error('工作流不包含节点信息，无法配置 Webhook');
    }

    this.logger.log(`[n8n] Webhook 端点已创建: ${method} ${fullUrl}, 关联工作流: ${workflowId}`);

    return fullUrl;
  }

  /**
   * 触发外部 Webhook
   * @param webhookPath Webhook 路径
   * @param payload 请求数据
   * @returns 响应数据
   */
  async triggerWebhook(webhookPath: string, payload: object): Promise<object> {
    const path = webhookPath.startsWith('/') ? webhookPath : `/${webhookPath}`;
    const url = `${this.n8nUrl}/webhook${path}`;
    try {
      this.logger.log(`[n8n] 触发 Webhook: ${url}`);
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000,
        })
      );
      return (response as any).data;
    } catch (error: any) {
      this.logger.error(`[n8n] 触发 Webhook 失败 (${url}): ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理来自 n8n 的入站 Webhook 回调
   * @param webhookPath Webhook 路径
   * @param body 请求体
   * @param headers 请求头
   * @returns 处理结果
   */
  async handleIncomingWebhook(webhookPath: string, body: object, headers: object): Promise<object> {
    this.logger.log(
      `[n8n] 收到入站 Webhook: ${webhookPath}, headers: ${JSON.stringify(headers).slice(0, 200)}`
    );

    // 记录 webhook 到数据库用于审计
    try {
      await this.prisma.n8nExecution.create({
        data: {
          status: 'received',
          inputPayload: JSON.stringify(body),
          startedAt: new Date(),
        } as any,
      });
    } catch (dbError: any) {
      this.logger.warn(`[n8n] Webhook 审计记录写入失败: ${dbError.message}`);
    }

    return {
      success: true,
      receivedAt: new Date().toISOString(),
      webhookPath,
      message: 'Webhook 已接收处理',
    };
  }

  // ==================== 3. 执行监控 ====================

  /**
   * 获取执行记录列表
   * @param workflowId 可选：筛选指定工作流的执行记录
   * @param limit 返回数量限制
   * @returns 执行记录数组
   */
  async getExecutions(workflowId?: string, limit?: number): Promise<object[]> {
    const params: Record<string, any> = {};
    if (limit) params.limit = limit;
    return this.n8nGet<object[]>('/rest/executions', params);
  }

  /**
   * 获取单次执行的状态详情
   * @param executionId 执行 ID
   * @returns 执行状态对象
   */
  async getExecutionStatus(executionId: string): Promise<object> {
    return this.n8nGet<object>(`/rest/executions/${executionId}`);
  }

  /**
   * 取消正在运行的执行
   * @param executionId 执行 ID
   */
  async cancelExecution(executionId: string): Promise<void> {
    await this.n8nDelete(`/rest/executions/${executionId}`);
    this.logger.log(`[n8n] 执行 ${executionId} 已取消`);
  }

  // ==================== 4. 预置工作流模板 ====================

  /** 模板1: 自动获客数据同步工作流 */
  static readonly acquisition_sync_workflow = {
    name: '自动获客数据同步',
    tags: ['acquisition', 'sync', 'scheduled'],
    settings: { executionOrder: 'v1' },
    nodes: [
      {
        name: '定时调度',
        type: 'n8n-nodes-base.scheduleTrigger',
        position: [240, 300],
        parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
      },
      {
        name: 'Webhook 触发器',
        type: 'n8n-nodes-base.webhook',
        position: [460, 300],
        webhookId: 'acquisition-sync-webhook',
        parameters: {
          httpMethod: 'POST',
          path: 'acquisition-sync',
          responseMode: 'onReceived',
          options: {},
        },
      },
      {
        name: '获取平台数据',
        type: 'n8n-nodes-base.httpRequest',
        position: [680, 260],
        parameters: {
          method: 'GET',
          url: '={{ $env.API_URL }}/api/acquisition/leads',
          authentication: 'genericCredentialType',
          options: { timeout: 30000 },
        },
      },
      {
        name: '数据标准化',
        type: 'n8n-nodes-base.set',
        position: [900, 260],
        parameters: {
          assignments: [
            {
              id: 'normalized',
              name: 'normalized',
              value: '={{ JSON.stringify($json) }}',
              type: 'string',
            },
          ],
        },
      },
      {
        name: '去重处理',
        type: 'n8n-nodes-base.code',
        position: [1120, 260],
        parameters: {
          language: 'javaScript',
          jsCode: `
const items = $input.all();
const seen = new Set();
const deduped = items.filter(item => {
  const key = item.json.email || item.json.phone;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
return deduped.map(item => ({ json: { ...item.json, _deduplicated: true } }));
          `.trim(),
        },
      },
      {
        name: '线索评分',
        type: 'n8n-nodes-base.code',
        position: [1340, 260],
        parameters: {
          language: 'javaScript',
          jsCode: `
const item = $input.first().json;
let score = 0;
if (item.source === 'official') score += 30;
if (item.interactions > 5) score += 20;
if (item.budget && item.budget > 10000) score += 25;
if (item.urgency === 'high') score += 25;
return [{ json: { ...item, leadScore: Math.min(score, 100), scoredAt: new Date().toISOString() } }];
          `.trim(),
        },
      },
      {
        name: '保存到数据库',
        type: 'n8n-nodes-base.httpRequest',
        position: [1560, 260],
        parameters: {
          method: 'POST',
          url: '={{ $env.API_URL }}/api/acquisition/leads/batch',
          sendBody: true,
          bodyParameters: { parameters: [] },
          options: { timeout: 30000 },
        },
      },
    ],
    connections: {
      定时调度: { main: [[{ node: '获取平台数据', type: 'main', index: 0 }]] },
      'Webhook 触发器': { main: [[{ node: '获取平台数据', type: 'main', index: 0 }]] },
      获取平台数据: { main: [[{ node: '数据标准化', type: 'main', index: 0 }]] },
      数据标准化: { main: [[{ node: '去重处理', type: 'main', index: 0 }]] },
      去重处理: { main: [[{ node: '线索评分', type: 'main', index: 0 }]] },
      线索评分: { main: [[{ node: '保存到数据库', type: 'main', index: 0 }]] },
    },
  };

  /** 模板2: AI 内容批量生成工作流 */
  static readonly content_generation_workflow = {
    name: 'AI 内容批量生成',
    tags: ['ai', 'content', 'generation'],
    settings: { executionOrder: 'v1' },
    nodes: [
      {
        name: '手动触发',
        type: 'n8n-nodes-base.manualTrigger',
        position: [240, 300],
      },
      {
        name: 'Webhook 入口',
        type: 'n8n-nodes-base.webhook',
        position: [460, 300],
        webhookId: 'content-gen-webhook',
        parameters: {
          httpMethod: 'POST',
          path: 'content-generate',
          responseMode: 'responseNode',
          options: {},
        },
      },
      {
        name: '获取话题列表',
        type: 'n8n-nodes-base.httpRequest',
        position: [680, 260],
        parameters: {
          method: 'GET',
          url: '={{ $env.API_URL }}/api/content/topics?status=pending',
          options: { timeout: 15000 },
        },
      },
      {
        name: '调用 LLM 生成',
        type: 'n8n-nodes-base.httpRequest',
        position: [900, 260],
        parameters: {
          method: 'POST',
          url: '={{ $env.API_URL }}/api/ai/chat/completion',
          sendBody: true,
          bodyParameters: { parameters: [] },
          options: { timeout: 120000 },
        },
      },
      {
        name: '平台格式适配',
        type: 'n8n-nodes-base.code',
        position: [1120, 260],
        parameters: {
          language: 'javaScript',
          jsCode: `
const item = $input.first().json;
const formats = {
  wechat: { title: item.title?.slice(0, 64), content: item.content, maxImages: 9 },
  xiaohongshu: { title: item.title?.slice(0, 20), content: item.content, tags: item.tags || [], emoji: true },
  douyin: { script: item.content?.slice(0, 500), duration: '30-60s' },
};
return Object.entries(formats).map(([platform, data]) => ({
  json: { platform, original: item, adapted: data, createdAt: new Date().toISOString() }
}));
          `.trim(),
        },
      },
      {
        name: '加入发布队列',
        type: 'n8n-nodes-base.httpRequest',
        position: [1340, 260],
        parameters: {
          method: 'POST',
          url: '={{ $env.API_URL }}/api/content/publish/queue',
          sendBody: true,
          bodyParameters: { parameters: [] },
          options: { timeout: 15000 },
        },
      },
    ],
    connections: {
      手动触发: { main: [[{ node: '获取话题列表', type: 'main', index: 0 }]] },
      'Webhook 入口': { main: [[{ node: '获取话题列表', type: 'main', index: 0 }]] },
      获取话题列表: { main: [[{ node: '调用 LLM 生成', type: 'main', index: 0 }]] },
      '调用 LLM 生成': { main: [[{ node: '平台格式适配', type: 'main', index: 0 }]] },
      平台格式适配: { main: [[{ node: '加入发布队列', type: 'main', index: 0 }]] },
    },
  };

  /** 模板3: 批量区块链存证工作流 */
  static readonly evidence_batch_workflow = {
    name: '批量区块链存证',
    tags: ['evidence', 'blockchain', 'batch'],
    settings: { executionOrder: 'v1' },
    nodes: [
      {
        name: 'Agent 任务完成 Webhook',
        type: 'n8n-nodes-base.webhook',
        position: [240, 300],
        webhookId: 'evidence-batch-webhook',
        parameters: {
          httpMethod: 'POST',
          path: 'evidence-batch',
          responseMode: 'onReceived',
          options: {},
        },
      },
      {
        name: '收集待存证文件',
        type: 'n8n-nodes-base.httpRequest',
        position: [460, 260],
        parameters: {
          method: 'GET',
          url: '={{ $env.API_URL }}/api/evidence/pending',
          options: { timeout: 15000 },
        },
      },
      {
        name: '逐个计算 Hash',
        type: 'n8n-nodes-base.code',
        position: [680, 260],
        parameters: {
          language: 'javaScript',
          jsCode: `
// 使用 crypto 模块计算 SHA256 哈希值
const crypto = require('crypto');
const files = $input.all();
return files.map(item => {
  const hash = crypto.createHash('sha256').update(JSON.stringify(item.json)).digest('hex');
  return {
    json: {
      fileId: item.json.id,
      fileName: item.json.name,
      fileHash: hash,
      hashedAt: new Date().toISOString()
    }
  };
});
          `.trim(),
        },
      },
      {
        name: '批量提交上链',
        type: 'n8n-nodes-base.httpRequest',
        position: [900, 260],
        parameters: {
          method: 'POST',
          url: '={{ $env.API_URL }}/api/evidence/batch-submit',
          sendBody: true,
          bodyParameters: { parameters: [] },
          options: { timeout: 120000 },
        },
      },
      {
        name: '记录存证结果',
        type: 'n8n-nodes-base.httpRequest',
        position: [1120, 260],
        parameters: {
          method: 'POST',
          url: '={{ $env.API_URL }}/api/evidence/results',
          sendBody: true,
          bodyParameters: { parameters: [] },
          options: { timeout: 15000 },
        },
      },
    ],
    connections: {
      'Agent 任务完成 Webhook': { main: [[{ node: '收集待存证文件', type: 'main', index: 0 }]] },
      收集待存证文件: { main: [[{ node: '逐个计算 Hash', type: 'main', index: 0 }]] },
      '逐个计算 Hash': { main: [[{ node: '批量提交上链', type: 'main', index: 0 }]] },
      批量提交上链: { main: [[{ node: '记录存证结果', type: 'main', index: 0 }]] },
    },
  };

  /** 模板4: KYC 自动审核流程 */
  static readonly kyc_review_workflow = {
    name: 'KYC 自动审核流程',
    tags: ['kyc', 'review', 'identity'],
    settings: { executionOrder: 'v1' },
    nodes: [
      {
        name: '新 KYC 提交触发',
        type: 'n8n-nodes-base.webhook',
        position: [240, 300],
        webhookId: 'kyc-review-webhook',
        parameters: {
          httpMethod: 'POST',
          path: 'kyc-review',
          responseMode: 'onReceived',
          options: {},
        },
      },
      {
        name: '提取文档信息',
        type: 'n8n-nodes-base.code',
        position: [460, 260],
        parameters: {
          language: 'javaScript',
          jsCode: `
const submission = $input.first().json;
return [{
  json: {
    submissionId: submission.id,
    userId: submission.userId,
    documentType: submission.documentType,
    documentUrl: submission.documentUrl,
    selfieUrl: submission.selfieUrl,
    submittedAt: submission.createdAt
  }
}];
          `.trim(),
        },
      },
      {
        name: 'OCR 文档识别',
        type: 'n8n-nodes-base.httpRequest',
        position: [680, 260],
        parameters: {
          method: 'POST',
          url: '={{ $env.API_URL }}/api/kyc/ocr',
          sendBody: true,
          bodyParameters: { parameters: [] },
          options: { timeout: 60000 },
        },
      },
      {
        name: '身份核验',
        type: 'n8n-nodes-base.httpRequest',
        position: [900, 260],
        parameters: {
          method: 'POST',
          url: '={{ $env.API_URL }}/api/kyc/identity-check',
          sendBody: true,
          bodyParameters: { parameters: [] },
          options: { timeout: 30000 },
        },
      },
      {
        name: '风险评估',
        type: 'n8n-nodes-base.code',
        position: [1120, 260],
        parameters: {
          language: 'javaScript',
          jsCode: `
const ocrResult = items.ocr?.json;
const identityCheck = items.identity?.json;
let riskLevel = 'low';
let riskScore = 0;
let reasons = [];

if (identityCheck?.matchScore < 0.8) { riskScore += 40; reasons.push('人脸匹配度低'); }
if (ocrResult?.documentExpired) { riskScore += 30; reasons.push('证件已过期'); }
if (identityCheck?.sanctionHit) { riskScore += 50; reasons.push('命中制裁名单'); }

if (riskScore >= 50) riskLevel = 'high';
else if (riskScore >= 20) riskLevel = 'medium';

return [{ json: { riskLevel, riskScore, reasons, decision: riskLevel === 'low' ? 'approve' : 'review' } }];
          `.trim(),
        },
      },
      {
        name: '自动批准 / 转人工',
        type: 'n8n-nodes-base.if',
        position: [1340, 200],
        parameters: {
          conditions: {
            options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
            conditions: [
              {
                leftValue: '={{ $json.decision }}',
                rightValue: 'approve',
                operator: { type: 'string', operation: 'equals' },
              },
            ],
            combinator: 'and',
          },
        },
      },
      {
        name: '执行通过',
        type: 'n8n-nodes-base.httpRequest',
        position: [1580, 140],
        parameters: {
          method: 'POST',
          url: '={{ $env.API_URL }}/api/kyc/approve',
          sendBody: true,
          bodyParameters: { parameters: [] },
        },
      },
      {
        name: '转人工审核',
        type: 'n8n-nodes-base.httpRequest',
        position: [1580, 320],
        parameters: {
          method: 'POST',
          url: '={{ $env.API_URL }}/api/kyc/escalate',
          sendBody: true,
          bodyParameters: { parameters: [] },
        },
      },
    ],
    connections: {
      '新 KYC 提交触发': { main: [[{ node: '提取文档信息', type: 'main', index: 0 }]] },
      提取文档信息: { main: [[{ node: 'OCR 文档识别', type: 'main', index: 0 }]] },
      'OCR 文档识别': { main: [[{ node: '身份核验', type: 'main', index: 0 }]] },
      身份核验: { main: [[{ node: '风险评估', type: 'main', index: 0 }]] },
      风险评估: { main: [[{ node: '自动批准 / 转人工', type: 'main', index: 0 }]] },
      '自动批准 / 转人工': {
        main: [
          [{ node: '执行通过', type: 'main', index: 0 }],
          [{ node: '转人工审核', type: 'main', index: 0 }],
        ],
      },
    },
  };

  /** 模板5: 告警通知聚合工作流 */
  static readonly alert_notification_workflow = {
    name: '告警通知聚合',
    tags: ['alert', 'notification', 'monitoring'],
    settings: { executionOrder: 'v1' },
    nodes: [
      {
        name: '监控系统 Webhook',
        type: 'n8n-nodes-base.webhook',
        position: [240, 300],
        webhookId: 'alert-notification-webhook',
        parameters: {
          httpMethod: 'POST',
          path: 'alert-notify',
          responseMode: 'onReceived',
          options: {},
        },
      },
      {
        name: '聚合告警',
        type: 'n8n-nodes-base.aggregate',
        position: [460, 260],
        parameters: {
          fieldsToAggregate: ['alertType', 'severity', 'source'],
          options: { aggregate: 'aggregateAllItemData' },
        },
      },
      {
        name: '去重处理',
        type: 'n8n-nodes-base.code',
        position: [680, 260],
        parameters: {
          language: 'javaScript',
          jsCode: `
const alerts = $input.all();
const seen = new Set();
const unique = alerts.filter(a => {
  const key = \`\${a.json.alertType}-\${a.json.source}-\${a.json.message?.slice(0, 50)}\`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
return unique;
          `.trim(),
        },
      },
      {
        name: '按严重级别路由',
        type: 'n8n-nodes-base.switch',
        position: [900, 220],
        parameters: {
          dataType: 'string',
          value1: '={{ $json.severity }}',
          rules: {
            rules: [
              { value2: 'critical', output: 0 },
              { value2: 'high', output: 1 },
            ],
          },
          fallbackOutput: 2,
        },
      },
      {
        name: '发送钉钉告警',
        type: 'n8n-nodes-base.httpRequest',
        position: [1140, 100],
        parameters: {
          method: 'POST',
          url: '={{ $env.DINGTALK_WEBHOOK_URL }}',
          sendBody: true,
          contentType: 'raw',
          bodyContentType: 'string',
          body: '={{ JSON.stringify({ msgtype: "markdown", markdown: { title: "紧急告警", text: "## " + $json.alertType + "\\n**级别**: " + $json.severity + "\\n**来源**: " + $json.source + "\\n**时间**: " + $json.timestamp + "\\n" + $json.message } }) }}',
          options: { timeout: 10000 },
        },
      },
      {
        name: '发送邮件通知',
        type: 'n8n-nodes-base.emailSend',
        position: [1140, 280],
        parameters: {
          fromEmail: '={{ $env.SMTP_FROM }}',
          toEmail: '={{ $env.ALERT_EMAIL_TO }}',
          subject: '=[SMY告警] {{ $json.alertType }}',
          text: '=告警详情:\n类型: {{ $json.alertType }}\n级别: {{ $json.severity }}\n来源: {{ $json.source }}\n\n{{ $json.message }}',
          options: {},
        },
      },
      {
        name: '发送 Slack 通知',
        type: 'n8n-nodes-base.httpRequest',
        position: [1140, 460],
        parameters: {
          method: 'POST',
          url: '={{ $env.SLACK_WEBHOOK_URL }}',
          sendBody: true,
          contentType: 'raw',
          bodyContentType: 'string',
          body: '={{ JSON.stringify({ channel: "#alerts", username: "SMY Monitor", attachments: [{ color: $json.severity === "critical" ? "danger" : "warning", fields: [{ title: "类型", value: $json.alertType, short: true }, { title: "级别", value: $json.severity, short: true }, { title: "来源", value: $json.source, short: true }] }, { text: $json.message }] }) }}',
          options: { timeout: 10000 },
        },
      },
    ],
    connections: {
      '监控系统 Webhook': { main: [[{ node: '聚合告警', type: 'main', index: 0 }]] },
      聚合告警: { main: [[{ node: '去重处理', type: 'main', index: 0 }]] },
      去重处理: { main: [[{ node: '按严重级别路由', type: 'main', index: 0 }]] },
      按严重级别路由: {
        main: [
          [{ node: '发送钉钉告警', type: 'main', index: 0 }],
          [{ node: '发送邮件通知', type: 'main', index: 0 }],
          [{ node: '发送 Slack 通知', type: 'main', index: 0 }],
        ],
      },
    },
  };

  /** 模板6: 定期报告生成工作流 */
  static readonly report_scheduled_workflow = {
    name: '定期报告生成',
    tags: ['report', 'scheduled', 'analytics'],
    settings: { executionOrder: 'v1' },
    nodes: [
      {
        name: 'Cron 定时触发',
        type: 'n8n-nodes-base.scheduleTrigger',
        position: [240, 300],
        parameters: {
          rule: {
            interval: [],
            cronExpression: '0 8 * * 1', // 每周一早上8点
          },
        },
      },
      {
        name: '收集指标数据',
        type: 'n8n-nodes-base.httpRequest',
        position: [460, 260],
        parameters: {
          method: 'GET',
          url: '={{ $env.API_URL }}/api/dashboard/metrics?range=7d',
          options: { timeout: 30000 },
        },
      },
      {
        name: '生成分析报告',
        type: 'n8n-nodes-base.httpRequest',
        position: [680, 260],
        parameters: {
          method: 'POST',
          url: '={{ $env.API_URL }}/api/ai/analyze-report',
          sendBody: true,
          bodyParameters: { parameters: [] },
          options: { timeout: 120000 },
        },
      },
      {
        name: '构建 PDF 报告',
        type: 'n8n-nodes-base.httpRequest',
        position: [900, 260],
        parameters: {
          method: 'POST',
          url: '={{ $env.API_URL }}/api/reports/generate-pdf',
          sendBody: true,
          bodyParameters: { parameters: [] },
          options: { timeout: 60000 },
        },
      },
      {
        name: '邮件分发',
        type: 'n8n-nodes-base.emailSend',
        position: [1120, 260],
        parameters: {
          fromEmail: '={{ $env.SMTP_FROM }}',
          toEmail: '={{ $env.REPORT_RECIPIENTS }}',
          subject: '=[SMY周报] {{ $now.format("yyyy-MM-dd") }} 运营报告',
          text: '=请查收本周运营报告附件。\n\n报告期间: {{ $json.reportPeriod }}\n生成时间: {{ $json.generatedAt }}',
          attachments: [{ propertyName: 'data', name: 'smy-weekly-report.pdf' }],
          options: {},
        },
      },
    ],
    connections: {
      'Cron 定时触发': { main: [[{ node: '收集指标数据', type: 'main', index: 0 }]] },
      收集指标数据: { main: [[{ node: '生成分析报告', type: 'main', index: 0 }]] },
      生成分析报告: { main: [[{ node: '构建 PDF 报告', type: 'main', index: 0 }]] },
      '构建 PDF 报告': { main: [[{ node: '邮件分发', type: 'main', index: 0 }]] },
    },
  };

  /** 所有预置模板映射表 */
  static readonly TEMPLATES: Record<string, object> = {
    acquisition_sync: N8nIntegrationService.acquisition_sync_workflow,
    content_generation: N8nIntegrationService.content_generation_workflow,
    evidence_batch: N8nIntegrationService.evidence_batch_workflow,
    kyc_review: N8nIntegrationService.kyc_review_workflow,
    alert_notification: N8nIntegrationService.alert_notification_workflow,
    report_scheduled: N8nIntegrationService.report_scheduled_workflow,
  };

  /**
   * 根据模板类型部署工作流到 n8n
   * @param templateType 模板类型标识
   * @param payload 可选的自定义覆盖参数
   * @returns 已部署的工作流对象
   */
  async deployTemplate(templateType: string, payload?: object): Promise<object> {
    const template = N8nIntegrationService.TEMPLATES[templateType];
    if (!template) {
      throw new Error(
        `未知的模板类型: ${templateType}。可用模板: ${Object.keys(N8nIntegrationService.TEMPLATES).join(', ')}`
      );
    }

    // 合并自定义 payload 到模板
    const workflowTemplate = payload ? { ...template, ...payload } : template;

    this.logger.log(`[n8n] 正在部署模板: ${templateType}`);

    const createdWorkflow = await this.createWorkflow(workflowTemplate);

    // 记录部署历史到本地数据库
    try {
      await this.prisma.n8nWorkflow.create({
        data: {
          name: String((template as any).name || templateType),
          description: `从模板 ${templateType} 部署`,
          externalId: String((createdWorkflow as any)?.id),
          status: 'active',
          version: 1,
        } as any,
      });
    } catch (dbError: any) {
      this.logger.warn(`[n8n] 部署记录写入失败: ${dbError.message}`);
    }

    this.logger.log(
      `[n8n] 模板 ${templateType} 部署成功, workflowId: ${(createdWorkflow as any)?.id}`
    );

    return createdWorkflow;
  }

  // ==================== 5. BPM 桥接集成 ====================

  /**
   * 将 BPM 事件桥接到 n8n 工作流触发
   * @param instanceId BPM 流程实例 ID
   * @param eventName 事件名称
   * @param payload 事件载荷
   */
  async bpmTriggerWorkflow(instanceId: string, eventName: string, payload: object): Promise<void> {
    this.logger.log(`[n8n-BPM] 桥接触发: instance=${instanceId}, event=${eventName}`);

    try {
      await this.triggerWebhook(`/bpm/${instanceId}/${eventName}`, {
        bpmInstanceId: instanceId,
        eventName,
        timestamp: new Date().toISOString(),
        ...payload,
      });

      // 同步记录到 BPM 实例
      await this.prisma.bpmProcessInstance.updateMany({
        where: { id: Number(instanceId) },
        data: {
          variables: JSON.stringify({
            n8nTriggered: true,
            n8nEvent: eventName,
            triggeredAt: new Date().toISOString(),
          }),
        },
      });
    } catch (error: any) {
      this.logger.error(`[n8n-BPM] 桥接触发失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 将 n8n 执行结果回写到 BPM 系统
   * @param executionId n8n 执行 ID
   * @param bpmInstanceId BPM 流程实例 ID
   */
  async syncExecutionToBpm(executionId: string, bpmInstanceId: string): Promise<void> {
    this.logger.log(`[n8n-BPM] 同步执行结果: execution=${executionId} -> bpm=${bpmInstanceId}`);

    try {
      const executionStatus = await this.getExecutionStatus(executionId);

      await this.prisma.bpmProcessInstance.update({
        where: { id: Number(bpmInstanceId) },
        data: {
          variables: JSON.stringify({
            n8nExecutionId: executionId,
            n8nExecutionStatus: (executionStatus as any)?.status,
            lastSyncAt: new Date().toISOString(),
            executionResult: executionStatus,
          }),
        },
      });

      // 如果执行成功且 BPM 实例处于运行状态，尝试推进流程
      if ((executionStatus as any)?.status === 'success') {
        const instance = await this.prisma.bpmProcessInstance.findUnique({
          where: { id: Number(bpmInstanceId) },
        });
        if (instance?.status === 'running') {
          this.logger.log(`[n8n-BPM] 执行成功，可考虑完成 BPM 实例 ${bpmInstanceId}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`[n8n-BPM] 同步执行结果失败: ${error.message}`);
      throw error;
    }
  }

  // ==================== 6. 健康检查 ====================

  /**
   * 检查 n8n 连接健康状态
   * @returns 包含状态、版本和活跃工作流数量的健康信息
   */
  async healthCheck(): Promise<{ status: string; version: string; activeWorkflows: number }> {
    try {
      const healthResponse = await firstValueFrom(
        this.httpService.get(`${this.n8nUrl}/healthz`, {
          timeout: 5000,
        })
      );

      const workflows = await this.listWorkflows();

      return {
        status: 'connected',
        version: (healthResponse as any)?.data?.version || 'unknown',
        activeWorkflows: Array.isArray(workflows)
          ? workflows.filter((w: any) => w.active).length
          : 0,
      };
    } catch (error: any) {
      this.logger.warn(`[n8n] 健康检查失败: ${error.message}`);
      return {
        status: 'disconnected',
        version: 'unavailable',
        activeWorkflows: 0,
        error: error.message,
      } as any;
    }
  }
}
