# SMYweb3 AI 自动化解决方案 — 全面项目规划文档

> **文档版本**: v1.0
> **创建日期**: 2026-06-11
> **文档状态**: 待审批
> **适用范围**: SMYweb3 平台 AI 自动化系统全栈开发
> **计划周期**: 12 周 (Week 1 - Week 12)
>
> ---
>
> **目标概述**:
> 本规划文档定义了 SMYweb3 AI 自动化解决方案的完整实施路径，涵盖 OpenClaw 智能体引擎、n8n 工作流集成、AI 大模型调用、BPM 工作流协同、区块链存证服务、DID 身份认证增强、AI 全球获客系统等核心模块的设计、开发、测试与部署。
>
> **关键性能指标 (KPI)**:
>
> - 支持 50 个并发智能体同时运行
> - 区块链存证响应时间 ≤ 3 秒
> - 获客数据更新频率：实时 / 准实时（≤30s 延迟）
> - 系统稳定性：72 小时连续运行无阻塞性故障
> - API 可用性 ≥ 99.5%

---

## 目录

- [第一章 目录结构与命名规范](#第一章-目录结构与命名规范)
  - [1.1 项目根目录总览](#11-项目根目录总览)
  - [1.2 后端 API 目录结构](#12-后端-api-目录结构)
  - [1.3 前端 Admin Web 目录结构](#13-前端-admin-web-目录结构)
  - [1.4 基础设施与运维目录](#14-基础设施与运维目录)
  - [1.5 命名规范总则](#15-命名规范总则)
- [第二章 分阶段实施计划](#第二章-分阶段实施计划)
  - [2.1 Phase 1: 基础设施补全 (Week 1-2)](#21-phase-1-基础设施补全-week-1-2)
  - [2.2 Phase 2: 核心功能模块开发 (Week 3-6)](#22-phase-2-核心功能模块开发-week-3-6)
  - [2.3 Phase 3: 获客系统增强 & 性能优化 (Week 7-9)](#23-phase-3-获客系统增强--性能优化-week-7-9)
  - [2.4 Phase 4: 测试 & 监控 & 部署 (Week 10-12)](#24-phase-4-测试--监控--部署-week-10-12)
  - [2.5 里程碑甘特图](#25-里程碑甘特图)
  - [2.6 关键路径与依赖关系](#26-关键路径与依赖关系)
- [第三章 质量标准与验收标准](#第三章-质量标准与验收标准)
  - [3.1 代码质量标准](#31-代码质量标准)
  - [3.2 各模块交付物验收标准](#32-各模块交付物验收标准)
  - [3.3 性能验收标准](#33-性能验收标准)
  - [3.4 安全验收标准](#34-安全验收标准)
- [第四章 风险评估与应急计划](#第四章-风险评估与应急计划)
  - [4.1 风险登记册](#41-风险登记册)
  - [4.2 应急响应预案](#42-应急响应预案)
- [第五章 文档要求与审查机制](#第五章-文档要求与审查机制)
  - [5.1 代码内联文档规范](#51-代码内联文档规范)
  - [5.2 流程文档要求](#52-流程文档要求)
  - [5.3 架构决策记录 (ADR) 要求](#53-架构决策记录-adr-要求)
  - [5.4 定期审查机制](#54-定期审查机制)
  - [5.5 变更控制流程](#55-变更控制流程)

---

## 第一章 目录结构与命名规范

### 1.1 项目根目录总览

```
SMYweb3.020260527/                          # 项目根目录
│
├── apps/                                    # 应用层（多应用 Monorepo）
│   ├── api/                                 # ★ NestJS 后端 API
│   │   ├── src/
│   │   │   ├── modules/                    # 业务模块
│   │   │   ├── common/                     # 公共组件
│   │   │   ├── config/                     # 配置文件
│   │   │   └── main.ts                     # 入口
│   │   ├── prisma/                         # 数据库
│   │   │   ├── schema.prisma               # 主 Schema (98→105+ 模型)
│   │   │   ├── migrations/                 # 迁移脚本
│   │   │   └── seed.ts                     # 种子数据
│   │   ├── Dockerfile                      # 容器构建
│   │   └── package.json
│   │
│   ├── admin-web/                           # ★ React 管理后台 (Vite + shadcn/ui)
│   │   ├── src/
│   │   │   ├── pages/                      # 页面路由
│   │   │   ├── components/                 # 组件库
│   │   │   ├── lib/                        # 工具函数
│   │   │   ├── types/                      # TypeScript 类型
│   │   │   └── hooks/                      # 自定义 Hooks
│   │   ├── Dockerfile
│   │   └── nginx.conf
│   │
│   ├── h5-app/                              # H5 移动端应用
│   │   ├── src/
│   │   └── vite.config.ts
│   │
│   ├── h5/                                  # H5 静态页面
│   └── admin-web-legacy/                    # 旧版 Next.js 管理后台（维护模式）
│
├── docs/                                    # ★ 文档中心
│   ├── superpowers/plans/                  # 实施计划（本文档所在位置）
│   ├── architecture/                       # 架构设计文档
│   ├── did/                                 # DID 专题文档
│   ├── ops-manual/                          # 运维手册
│   ├── admin-prd/                           # 产品需求文档
│   └── client-prd/                          # 客户端 PRD
│
├── scripts/                                 # 工具脚本
│   ├── export-sqlite-to-postgres.py
│   └── ...
│
├── .github/workflows/                       # CI/CD 流水线
├── docker-compose.yml                       # 编排配置
├── docker-compose.prod.yml                  # 生产环境编排
├── .env.production                          # 生产环境变量模板
├── ecosystem.config.cjs                     # PM2 进程管理
└── package.json                             # 根 workspace 配置
```

### 1.2 后端 API 目录结构

#### 1.2.1 新增模块完整目录树

```
apps/api/src/modules/
│
├── did/                                     # ✅ 已完成 (95%)
│   ├── did.controller.ts
│   ├── did.service.ts
│   ├── did.module.ts
│   ├── did-n8n-webhooks.controller.ts       # ✅ 已完成
│   ├── did-bpm-stubs.service.ts             # ✅ 已完成
│   ├── did-bpm-stubs.controller.ts          # ✅ 已完成
│   └── dto/
│       ├── register-did.dto.ts              # ✅ 已完成
│       └── update-did.dto.ts                # ✅ 已完成
│
├── openclaw/                                # 🔧 从 10% → 90% (Phase 2 重点)
│   ├── openclaw.module.ts                   # 增强：注册新子模块依赖
│   ├── openclaw.controller.ts               # 增强：新增执行/停止/状态端点
│   ├── openclaw.service.ts                  # 增强：生命周期管理
│   │
│   ├── agents/                              # ★ 新建 — Agent 核心引擎
│   │   ├── agent-orchestrator.service.ts    # Agent 编排器（50并发调度）
│   │   ├── agent-executor.service.ts        # 单 Agent 执行器
│   │   ├── agent-pool.service.ts            # 连接池管理（Worker Thread）
│   │   ├── agent-health.service.ts          # 心跳与健康检查
│   │   │
│   │   ├── types/                           # 类型定义
│   │   │   ├── agent.types.ts               # IAgentConfig, IAgentSession, IAgentStatus
│   │   │   ├── task.types.ts                # IAgentTask, ITaskPayload, ITaskResult
│   │   │   └── protocol.types.ts            # IPC 协议消息格式
│   │   │
│   │   └── strategies/                      # Agent 策略实现
│   │       ├── base-agent.strategy.ts        # 抽象基类
│   │       ├── acquisition-agent.strategy.ts     # 获客策略
│   │       ├── content-agent.strategy.ts         # 内容生成策略
│   │       ├── analysis-agent.strategy.ts        # 数据分析策略
│   │       ├── evidence-agent.strategy.ts        # 存证策略
│   │       └── kyc-review-agent.strategy.ts      # KYC审核策略
│   │
│   └── dto/
│       ├── create-session.dto.ts
│       ├── execute-task.dto.ts
│       └── agent-config.dto.ts
│
├── ai-models/                               # 🔧 从 60% → 95%
│   ├── ai-models.module.ts                  # 更新：注册 LLM 子模块
│   ├── ai-models.service.ts                 # 保留：元数据 CRUD
│   ├── ai-models.controller.ts
│   │
│   ├── llm/                                  # ★ 新建 — LLM 调用引擎
│   │   ├── llm-provider.interface.ts         # 统一接口抽象
│   │   ├── llm-router.service.ts             # 智能路由（按场景选模型）
│   │   ├── llm-cache.service.ts              # 语义缓存（相似查询复用）
│   │   ├── token-counter.service.ts          # Token 计费统计
│   │   ├── prompt-builder.service.ts         # Prompt 组装器
│   │   │
│   │   └── providers/                        # LLM 提供商实现
│   │       ├── openai.provider.ts            # GPT-4o / o1 / o3-mini
│   │       ├── anthropic.provider.ts         # Claude 3.5 Sonnet / Opus
│   │       ├── qwen.provider.ts              # 通义千问（国内合规备用）
│   │       ├── deepseek.provider.ts          # DeepSeek-V3（性价比首选）
│   │       └── index.ts                      # Provider 工厂导出
│   │
│   └── dto/
│       ├── chat-completion.dto.ts           # 请求/响应 DTO
│       └── embed.dto.ts
│
├── blockchain-evidence/                     # ★ 新建 — 区块链存证 (0% → 80%)
│   ├── blockchain-evidence.module.ts
│   ├── blockchain-evidence.controller.ts
│   ├── blockchain-evidence.service.ts        # 核心：存证业务逻辑
│   │
│   ├── contracts/                            # 智能合约交互
│   │   ├── evidence-registry.abi.json        # 合约 ABI 定义
│   │   ├── evidence-contract.service.ts      # ethers.js v6 合约调用封装
│   │   └── contract-addresses.ts            # 多网络合约地址配置
│   │
│   ├── ipfs/                                 # IPFS 文件存储
│   │   └── ipfs.service.ts                  # Pinata/Kubo 接口封装
│   │
│   ├── guards/
│   │   └── blockchain-signature.guard.ts    # 钱包签名验证 Guard
│   │
│   └── dto/
│       ├── create-evidence.dto.ts
│       ├── verify-evidence.dto.ts
│       └── upload-file.dto.ts
│
├── e-signature/                             # ★ 新建 — 电子签收 (0% → 80%)
│   ├── e-signature.module.ts
│   ├── e-signature.controller.ts
│   ├── e-signature.service.ts                # 核心：签名业务逻辑
│   │
│   ├── pdf/                                  # PDF 处理
│   │   └── pdf-generator.service.ts         # PDFKit 文档生成
│   │
│   ├── crypto/                               # 密码学
│   │   └── signature.service.ts             # EdDSA/ECDSA 数字签名
│   │
│   └── dto/
│       ├── sign-request.dto.ts
│       ├── verify-signature.dto.ts
│       └── sign-certificate.dto.ts
│
├── n8n/                                     # 🔧 从 5% → 85%
│   ├── n8n.module.ts                         # 更新：增加新依赖
│   ├── n8n.controller.ts                     # 增强：新增触发/状态端点
│   ├── n8n.service.ts                        # 增强：实际 n8n HTTP 对接
│   ├── n8n-integration.service.ts            # ★ 新建 — 深度集成服务
│   ├── n8n-webhook.service.ts                # ★ 新建 — Webhook 注册与管理
│   └── workflows/                            # ★ 新建 — 工作流模板定义
│       ├── did-onboarding.template.ts
│       ├── kyc-auto-review.template.ts
│       ├── content-publish.template.ts
│       ├── lead-nurture.template.ts
│       ├── evidence-alert.template.ts
│       └── daily-report.template.ts
│
├── bpm/                                     # 🔧 从 70% → 90%
│   ├── bpm.module.ts                         # 更新：注册 Agent 联动
│   ├── bpm.controller.ts                     # 保留
│   ├── bpm.service.ts                        # 增强：添加 Agent 触发能力
│   ├── bpm-agent-bridge.service.ts           # ★ 新建 — BPM ↔ Agent 桥接
│   └── dto/
│
├── acquisition/                             # 🔧 从 65% → 90%
│   ├── acquisition.module.ts
│   ├── acquisition.controller.ts             # 保留
│   ├── acquisition.service.ts                # 增强：替换 Mock 为真实调用
│   ├── acquisition-sync.service.ts           # ★ 新建 — 平台数据同步引擎
│   ├── acquisition-ws.gateway.ts             # ★ 新建 — WebSocket 实时推送
│   ├── acquisition-ai.service.ts             # ★ 新建 — AI 策略推荐
│   ├── adapters/                             # ★ 新建 — 各平台 API 适配器
│   │   ├── douyin.adapter.ts                # 抖音创作者平台
│   │   ├── xiaohongshu.adapter.ts           # 小红书专业号平台
│   │   ├── wechat-video.adapter.ts          # 微信视频号
│   │   ├── instagram.adapter.ts             # Instagram Graph API
│   │   ├── youtube.adapter.ts               # YouTube Data API
│   │   ├── tiktok-global.adapter.ts         # TikTok for Business
│   │   └── base-platform.adapter.ts         # 抽象基类
│   └── dto/
│
├── documents/                               # 🔧 从 25% → 80%
│   ├── documents.module.ts                   # 更新：关联 FileStorage
│   ├── documents.controller.ts               # 增强：上传/下载/预览
│   ├── documents.service.ts                  # 增强：MinIO 集成
│   ├── file-upload.service.ts               # ★ 新建 — MinIO 文件上传
│   └── dto/
│       ├── upload.dto.ts
│       └── file-metadata.dto.ts
│
├── auth/                                    # ✅ 已完成
├── wallets/                                 # ✅ 已完成
├── kyc/                                     # ✅ 已完成
├── sbt/                                     # ✅ 已完成
├── platform-access/                         # ✅ 已完成
├── users/                                   # ✅ 已完成
│
└── ... 其余已有模块保持不变
```

#### 1.2.2 Common 公共组件扩展

```
apps/api/src/common/
│
├── guards/                                  # 认证与授权
│   ├── jwt-auth.guard.ts                    # ✅ JWT 认证
│   ├── permissions.guard.ts                 # ✅ 权限校验
│   ├── webhook-signature.guard.ts           # ✅ Webhook HMAC 签名
│   ├── rate-limit.guard.ts                  # ★ 新建 — 限流 Guard（替代中间件方案）
│   ├── api-key.guard.ts                     # ★ 新建 — API Key 鉴权（外部系统集成）
│   └── blockchain-signature.guard.ts        # ★ 新建 — 链上签名验证
│
├── filters/                                 # 异常过滤器
│   ├── all-exceptions.filter.ts             # ✅ 全局异常处理
│   └── http-exception.filter.ts             # ★ 新建 — HTTP 层专用异常
│
├── interceptors/                            # 拦截器
│   ├── logging.interceptor.ts               # ★ 新建 — 请求日志拦截器
│   ├── transform.interceptor.ts             # ★ 新建 — 响应格式标准化
│   └── cache.interceptor.ts                 # ★ 新建 — Redis 缓存拦截器
│
├── decorators/                              # 自定义装饰器
│   ├── public.decorator.ts                  # ✅ @Public()
│   ├── rate-limit.decorator.ts              # ★ 新建 — @RateLimit() 自定义限流
│   └── cache.decorator.ts                   # ★ 新建 — @Cache() 缓存装饰器
│
├── middleware/                              # 中间件
│   ├── rate-limit.middleware.ts             # ✅ 限流中间件
│   ├── cors.middleware.ts                   # ★ 新建 — CORS 配置中间件
│   └── compression.middleware.ts            # ★ 新建 — Gzip 压缩
│
├── services/                                # 公共服务
│   ├── prisma.service.ts                    # ✅ Prisma 单例
│   ├── audit.service.ts                     # ✅ 审计日志
│   ├── redis.service.ts                     # ★ 新建 — Redis 连接管理
│   ├── rabbitmq.service.ts                  # ★ 新建 — RabbitMQ 连接管理
│   ├── minio.service.ts                     # ★ 新建 — MinIO 对象存储客户端
│   └── notification.service.ts              # ★ 新建 — 通知发送服务
│
├── utils/                                   # 工具函数
│   ├── crypto.utils.ts                      # ★ 新建 — 加密工具集
│   ├── date.utils.ts                        # ★ 新建 — 日期处理
│   ├── validation.utils.ts                  # ★ 新建 — 校验工具
│   └── format.utils.ts                      # ★ 新建 — 格式化工具
│
└── constants/                               # 常量定义
    ├── error-codes.constants.ts             # ★ 新建 — 统一错误码
    ├── status.constants.ts                  # ★ 新建 — 状态枚举
    └── config.constants.ts                  # ★ 新建 — 配置常量
```

### 1.3 前端 Admin Web 目录结构

```
apps/admin-web/src/
│
├── pages/                                   # 页面路由
│   ├── dashboard/                           # ✅ 仪表盘
│   ├── did/                                 # ✅ DID 管理（已完成）
│   │   ├── List.tsx                         # DID 列表页
│   │   ├── Issue.tsx                        # DID 签发页
│   │   └── Cards.tsx                        # DID 卡片展示
│   │
│   ├── agents/                              # ★ 新建 — Agent 管理
│   │   ├── Dashboard.tsx                    # Agent 运行看板（50并发可视化）
│   │   ├── ConfigList.tsx                   # Agent 配置列表
│   │   ├── SessionDetail.tsx               # 会话详情（实时状态）
│   │   ├── TaskQueue.tsx                    # 任务队列监控
│   │   └── components/
│   │       ├── AgentStatusBadge.tsx         # 状态徽章
│   │       ├── SessionTimeline.tsx          # 会话时间线
│   │       └── TaskLogViewer.tsx            # 任务日志查看器
│   │
│   ├── ai-models/                           # ★ 新建/增强 — AI 模型管理
│   │   ├── ProviderList.tsx                 # 提供商管理
│   │   ├── ModelInstanceList.tsx            # 模型实例管理
│   │   ├── PromptTemplateEditor.tsx         # Prompt 编辑器（Monaco Editor）
│   │   ├── CostDashboard.tsx               # 成本分析面板
│   │   ├── CallLogViewer.tsx               # 调用日志查看
│   │   └── components/
│   │       ├── ModelCard.tsx
│   │       ├── CostChart.tsx
│   │       └── TokenUsageGauge.tsx
│   │
│   ├── blockchain/                           # ★ 新建 — 区块链存证
│   │   ├── EvidenceList.tsx                 # 存证记录列表
│   │   ├── UploadEvidence.tsx              # 上传存证
│   │   ├── VerifyEvidence.tsx              # 存证验证
│   │   ├── CertificateView.tsx             # 存证证书展示
│   │   └── components/
│   │       ├── TxLink.tsx                   # 链上交易链接
│   │       ├── HashDisplay.tsx              # 哈希值展示
│   │       └── EvidenceTimeline.tsx         # 存证时间线
│   │
│   ├── e-signature/                          # ★ 新建 — 电子签收
│   │   ├── SignRequestList.tsx              # 待签署列表
│   │   ├── SignDocument.tsx                # 在线签署页面
│   │   ├── SignatureVerify.tsx             # 签名验证
│   │   └── components/
│   │       ├── SignaturePad.tsx             # 手写签名板
│   │       ├── PdfPreview.tsx               # PDF 预览
│   │       └── CertificateDownload.tsx      # 证书下载
│   │
│   ├── acquisition/                          # ★ 新建/增强 — 获客系统
│   │   ├── Dashboard.tsx                    # 获客看板（实时数据）
│   │   ├── PlatformManager.tsx              # 平台账号管理
│   │   ├── CampaignManager.tsx              # 活动管理
│   │   ├── LeadPipeline.tsx                 # 线索漏斗
│   │   ├── InfluencerRoster.tsx             # 达人库
│   │   ├── ContentCalendar.tsx              # 内容日历
│   │   ├── AiStrategyPanel.tsx             # AI 策略推荐面板
│   │   ├── ReportCenter.tsx                 # 报告中心
│   │   └── components/
│   │       ├── PlatformIcon.tsx
│   │       ├── KpiCard.tsx
│   │       ├── FunnelChart.tsx
│   │       ├── InfluencerCard.tsx
│   │       ├── RealtimeChart.tsx            # 实时图表（WebSocket）
│   │       └── MapView.tsx                  # 地域分布图
│   │
│   ├── workflow/                             # ★ 新建 — n8n 工作流管理
│   │   ├── WorkflowList.tsx                 # 工作流列表
│   │   ├── WorkflowDesigner.tsx             # 工作流设计器（嵌入 n8n Editor）
│   │   ├── ExecutionHistory.tsx             # 执行历史
│   │   └── WebhookManager.tsx              # Webhook 管理
│   │
│   ├── bpm/                                  # ★ 新建/增强 — BPM 流程管理
│   │   ├── ProcessDesigner.tsx              # 流程设计器
│   │   ├── InstanceMonitor.tsx              # 实例监控
│   │   ├── TaskInbox.tsx                    # 我的待办
│   │   ├── SlaReport.tsx                    # SLA 报告
│   │   └── components/
│   │       ├── BpmDiagram.tsx               # 流程图渲染
│   │       └── TaskCard.tsx
│   │
│   └── settings/                             # ★ 新建 — 系统设置
│       ├── GeneralSettings.tsx              # 通用设置
│       ├── IntegrationSettings.tsx          # 第三方集成配置
│       ├── SecuritySettings.tsx             # 安全策略
│       └── NotificationSettings.tsx         # 通知配置
│
├── components/did/                          # ✅ 已完成 DID 组件
├── components/ui/                           # ✅ shadcn/ui 组件
├── lib/
│   ├── api.ts                               # ✅ API 客户端
│   ├── utils.ts                             # ✅ 工具函数
│   ├── ws-client.ts                         # ★ 新建 — WebSocket 客户端
│   └── constants.ts                         # ★ 新建 — 前端常量
│
├── hooks/
│   ├── use-agent.ts                         # ★ 新建 — Agent 状态 Hook
│   ├── use-realtime.ts                      # ★ 新建 — 实时数据 Hook
│   └── use-signature.ts                     # ★ 新建 — 电子签名 Hook
│
└── types/
    ├── agent.types.ts                       # ★ 新建
    ├── blockchain.types.ts                  # ★ 新建
    ├── acquisition.types.ts                 # ★ 新建
    ├── e-signature.types.ts                 # ★ 新建
    └── workflow.types.ts                    # ★ 新建
```

### 1.4 基础设施与运维目录

```
project-root/
│
├── docker/                                   # Docker 相关配置
│   ├── docker-compose.yml                   # 开发环境（当前，需扩展）
│   ├── docker-compose.prod.yml              # ★ 新建 — 生产环境编排
│   ├── docker-compose.dev.yml               # ★ 新建 — 开发环境增强版
│   │
│   ├── nginx/                                # Nginx 配置
│   │   ├── nginx.conf                       # 主配置
│   │   ├── conf.d/
│   │   │   ├── api.conf                     # API 反向代理
│   │   │   ├── admin.conf                   # Admin Web
│   │   │   ├── websocket.conf               # WS 代理
│   │   │   └── n8n.conf                     # n8n 代理
│   │   └── ssl/                             # SSL 证书
│   │
│   └── monitoring/                           # 监控配置
│       ├── prometheus.yml                   # Prometheus 配置
│       ├── alertmanager.yml                 # 告警规则
│       └── grafana/
│           ├── dashboards/                  # Grafana 仪表盘 JSON
│           │   ├── api-overview.json
│   │   │   ├── agent-monitoring.json
│   │   │   ├── blockchain-evidence.json
│   │   │   ├── acquisition-dashboard.json
│   │   │   └── system-overview.json
│           ├── provisioning/
│           └── datasources/
│
├── configs/                                  # 应用配置
│   ├── .env.development                     # 开发环境变量
│   ├── .env.staging                         # 预发布环境变量
│   ├── .env.production                      # 生产环境变量（已存在，需扩展）
│   └── .env.production.example              # 生产环境示例（已存在）
│
├── scripts/                                  # 运维脚本
│   ├── export-sqlite-to-postgres.py         # ✅ 已有
│   ├── deploy.sh                             # ★ 新建 — 一键部署脚本
│   ├── backup-db.sh                          # ★ 新建 — 数据库备份
│   ├── health-check.sh                       # ★ 新建 — 健康检查
│   ├── seed-prod-data.sh                     # ★ 新建 — 生产数据初始化
│   └── rotate-logs.sh                        # ★ 新建 — 日志轮转
│
├── tests/                                    # 测试目录
│   ├── unit/                                 # 单元测试
│   │   ├── common/                           # 公共组件测试
│   │   ├── modules/                          # 业务模块测试
│   │   │   ├── did/
│   │   │   ├── openclaw/
│   │   │   ├── ai-models/
│   │   │   ├── blockchain-evidence/
│   │   │   ├── e-signature/
│   │   │   └── acquisition/
│   │   └── utils/
│   │
│   ├── integration/                          # 集成测试
│   │   ├── api/                             # API 集成测试
│   │   │   ├── did.e2e.spec.ts
│   │   │   ├── auth.e2e.spec.ts
│   │   │   ├── agents.e2e.spec.ts
│   │   │   ├── evidence.e2e.spec.ts
│   │   │   ├── signature.e2e.spec.ts
│   │   │   └── acquisition.e2e.spec.ts
│   │   └── webhook/                        # Webhook 集成测试
│   │
│   ├── e2e/                                  # 端到端测试
│   │   ├── user-journey/                    # 用户旅程测试
│   │   │   ├── did-registration.spec.ts
│   │   │   ├── kyc-flow.spec.ts
│   │   │   ├── evidence-upload.spec.ts
│   │   │   ├── signing-flow.spec.ts
│   │   │   └── campaign-create.spec.ts
│   │   └── performance/                    # 性能测试
│   │       ├── 50-agents-load.spec.ts
│   │       ├── evidence-latency.spec.ts
│   │       └── realtime-data.spec.ts
│   │
│   └── fixtures/                             # 测试数据
│       ├── test-users.json
│       ├── test-dids.json
│       └── mock-responses/
│
└── .github/workflows/                        # CI/CD
    ├── ci.yml                                # ✅ 已有 — CI 流水线
    ├── deploy-staging.yml                   # ★ 新建 — 预发布部署
    ├── deploy-production.yml                # ★ 新建 — 生产部署
    ├── security-scan.yml                    # ★ 新建 — 安全扫描
    └── load-test.yml                         # ★ 新建 — 定期压测
```

### 1.5 命名规范总则

#### 1.5.1 文件命名规范

| 类型                | 规范                       | 示例                            |
| ------------------- | -------------------------- | ------------------------------- |
| **TypeScript 文件** | `kebab-case.ts`            | `agent-orchestrator.service.ts` |
| **类型定义文件**    | `*.types.ts`               | `agent.types.ts`                |
| **DTO 文件**        | `*.dto.ts`                 | `create-evidence.dto.ts`        |
| **接口文件**        | `*.interface.ts`           | `llm-provider.interface.ts`     |
| **配置文件**        | `kebab-case.*`             | `docker-compose.prod.yml`       |
| **测试文件**        | `*.spec.ts` 或 `*.test.ts` | `evidence.e2e.spec.ts`          |
| **文档文件**        | `kebab-case.md`            | `ai-automation-master-plan.md`  |

#### 1.5.2 代码标识符命名规范

| 范围               | 规范                        | 示例                                           |
| ------------------ | --------------------------- | ---------------------------------------------- |
| **Class 类名**     | `PascalCase`                | `BlockchainEvidenceService`, `AgentPool`       |
| **Interface 接口** | `PascalCase` + `I` 前缀     | `ILlmProvider`, `IAgentTask`                   |
| **Type 类型别名**  | `PascalCase`                | `AgentStatus`, `EvidenceType`                  |
| **方法/函数**      | `camelCase`                 | `createEvidence()`, `verifySignature()`        |
| **变量/参数**      | `camelCase`                 | `fileHash`, `txReceipt`                        |
| **常量**           | `UPPER_SNAKE_CASE`          | `MAX_AGENT_POOL_SIZE`, `EVIDENCE_TTL_MS`       |
| **Enum 枚举**      | `PascalCase`                | `AgentStatus.Running`, `EvidenceType.Document` |
| **数据库表名**     | `snake_case` (Prisma @@map) | `blockchain_evidences`, `agent_sessions`       |
| **API 路由**       | `kebab-case`                | `/api/blockchain-evidence/upload`              |
| **环境变量**       | `UPPER_SNAKE_CASE`          | `BLOCKCHAIN_RPC_URL`, `N8N_WEBHOOK_SECRET`     |
| **Docker 服务名**  | `kebab-case`                | `smyweb3-api`, `smyweb3-redis`                 |

#### 1.5.3 Git Commit 规范

采用 Conventional Commits：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 列表**:

| Type       | 用途      | 示例                                                            |
| ---------- | --------- | --------------------------------------------------------------- |
| `feat`     | 新功能    | `feat(blockchain): add evidence creation endpoint`              |
| `fix`      | Bug 修复  | `fix(did): resolve register 500 error on empty body`            |
| `docs`     | 文档      | `docs(api): add swagger description for webhook endpoints`      |
| `style`    | 格式调整  | `style(admin): fix lint warnings in List.tsx`                   |
| `refactor` | 重构      | `refactor(agents): extract pool management to separate service` |
| `perf`     | 性能优化  | `perf(cache): add Redis caching layer for stats endpoints`      |
| `test`     | 测试      | `test(evidence): add integration tests for verify endpoint`     |
| `chore`    | 构建/工具 | `chore(deps): upgrade ethers.js to v6`                          |

---

## 第二章 分阶段实施计划

### 2.1 Phase 1: 基础设施补全 (Week 1-2)

**目标**: 搭建所有后续开发所需的基础设施，确保开发环境一致性。

#### Week 1: Docker 扩展 + 数据库 Schema + 依赖安装

| 天  | 任务 ID | 任务描述                                                                                                                      | 产出物                                            | 依赖        |
| --- | ------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------- |
| D1  | P1-01   | 扩展 docker-compose.yml，添加 n8n/RabbitMQ/MinIO/Prometheus/Grafana 6个服务                                                   | `docker-compose.dev.yml`                          | 无          |
| D1  | P1-02   | 创建生产环境编排文件 docker-compose.prod.yml（含健康检查、资源限制、日志驱动）                                                | `docker/docker-compose.prod.yml`                  | P1-01       |
| D1  | P1-03   | 创建 Nginx 完整配置（API反向代理/WS代理/SSL/Gzip/速率限制）                                                                   | `docker/nginx/conf.d/*.conf`                      | P1-01       |
| D2  | P1-04   | 编写 7 个新 Prisma 模型（FileStorage, BlockchainEvidence, ESignature, AgentSession, AgentTask, LlmCallLog, NotificationRule） | Schema 新增 ~300行                                | 无          |
| D2  | P1-05   | 执行 Prisma migrate，生成迁移 SQL 并验证                                                                                      | `prisma/migrations/xxx_add_ai_automation_models/` | P1-04       |
| D2  | P1-06   | 更新 seed.ts，添加新模型的种子数据                                                                                            | `prisma/seed.ts` 更新                             | P1-05       |
| D3  | P1-07   | 安装后端新依赖包（ethers@6, @nestjs/microservices, minio, pdfkit, openai, @anthropic-ai/sdk, ioredis, amqplib）               | `package.json` 更新                               | 无          |
| D3  | P1-08   | 安装前端新依赖（recharts/d3 图表库, monaco-editor, react-signature-pad, xterm.js）                                            | `admin-web/package.json`                          | 无          |
| D3  | P1-09   | 扩展 .env.production，添加所有新服务的环境变量（约 40 个新变量）                                                              | `.env.production` 更新                            | P1-01       |
| D4  | P1-10   | 创建 Redis 服务封装（连接池、重连、键前缀管理）                                                                               | `common/services/redis.service.ts`                | P1-07       |
| D4  | P1-11   | 创建 RabbitMQ 服务封装（连接管理、通道池、确认模式）                                                                          | `common/services/rabbitmq.service.ts`             | P1-07       |
| D4  | P1-12   | 创建 MinIO 服务封装（Bucket 管理、分片上传、预签名 URL）                                                                      | `common/services/minio.service.ts`                | P1-07       |
| D5  | P1-13   | 创建统一错误码常量文件                                                                                                        | `common/constants/error-codes.constants.ts`       | 无          |
| D5  | P1-14   | 创建统一状态枚举常量文件                                                                                                      | `common/constants/status.constants.ts`            | 无          |
| D5  | P1-15   | 验证：Docker Compose up 全部服务启动成功，健康检查通过                                                                        | 验证报告                                          | P1-01~P1-12 |

#### Week 2: 公共基础设施 + CI/CD 完善

| 天    | 任务 ID | 任务描述                                                              | 产出物                                         | 依赖         |
| ----- | ------- | --------------------------------------------------------------------- | ---------------------------------------------- | ------------ |
| D1    | P1-16   | 创建请求日志拦截器（请求ID、耗时、请求体脱敏）                        | `common/interceptors/logging.interceptor.ts`   | P1-10        |
| D1    | P1-17   | 创建响应格式标准化拦截器（统一 `{success,data,message}` 格式）        | `common/interceptors/transform.interceptor.ts` | 无           |
| D1    | P1-18   | 创建 Redis 缓存拦截器（TTL、Key 生成、缓存穿透防护）                  | `common/interceptors/cache.interceptor.ts`     | P1-16        |
| D2    | P1-19   | 创建 @RateLimit() 自定义装饰器（支持按路由配置不同阈值）              | `common/decorators/rate-limit.decorator.ts`    | 无           |
| D2    | P1-20   | 创建 @Cache() 自定义装饰器（支持 TTL 和 Key 模板）                    | `common/decorators/cache.decorator.ts`         | P1-18        |
| D2    | P1-21   | 创建 API Key 鉴权 Guard（用于 n8n 回调、外部系统集成）                | `common/guards/api-key.guard.ts`               | 无           |
| D3    | P1-22   | 完善 GitHub Actions CI（添加安全扫描、Docker 构建验证、负载测试触发） | `.github/workflows/*.yml`                      | 已有 ci.yml  |
| D3    | P1-23   | 创建预发布部署流水线                                                  | `.github/workflows/deploy-staging.yml`         | P1-22        |
| D3    | P1-24   | 创建生产部署流水线（含审批门禁）                                      | `.github/workflows/deploy-production.yml`      | P1-23        |
| D4-D5 | P1-25   | Phase 1 集成验证：全部新服务启动、API 健康检查、DB 迁移回滚测试       | Phase 1 验收报告                               | 全部 P1 任务 |

**Phase 1 里程碑 M1**: 基础设施就绪 — 所有容器服务可运行，数据库 Schema 完成，CI/CD 流水线可用。

**M1 验收标准**:

- [ ] `docker compose -f docker-compose.dev.yml up -d` 启动 10 个服务全部 healthy
- [ ] `npx prisma migrate dev` 执行无错误，新模型可通过 Prisma Client 操作
- [ ] `npm run build` 后端编译 0 错误
- [ ] CI 流水线在 main 分支 push 时自动通过
- [ ] Redis/MQ/MinIO 连接测试脚本全部 PASS

---

### 2.2 Phase 2: 核心功能模块开发 (Week 3-6)

**目标**: 实现 6 大核心功能模块的业务逻辑，达到可独立演示的水平。

#### Week 3: LLM 调用引擎 + Agent Pool 基础框架

| 天  | 任务 ID | 任务描述                                                                                  | 产出物                                | 依赖        |
| --- | ------- | ----------------------------------------------------------------------------------------- | ------------------------------------- | ----------- |
| D1  | P2-01   | 定义 LLM 统一接口抽象 `ILlmProvider`（chatCompletion/streamCompletion/embed/countTokens） | `llm/llm-provider.interface.ts`       | M1          |
| D1  | P2-02   | 实现 OpenAI Provider（GPT-4o/o1/o3-mini，支持流式输出）                                   | `llm/providers/openai.provider.ts`    | P2-01       |
| D1  | P2-03   | 实现 Anthropic Provider（Claude 3.5 Sonnet/Opus，支持 tool_use）                          | `llm/providers/anthropic.provider.ts` | P2-01       |
| D2  | P2-04   | 实现 DeepSeek Provider（高性价比，长上下文支持）                                          | `llm/providers/deepseek.provider.ts`  | P2-01       |
| D2  | P2-05   | 实现 Qwen Provider（国内合规，通义千问 Max/Plus）                                         | `llm/providers/qwen.provider.ts`      | P2-01       |
| D2  | P2-06   | 创建 Provider 工厂（按名称/场景动态选择 Provider）                                        | `llm/providers/index.ts`              | P2-02~P2-05 |
| D3  | P2-07   | 实现 LLM Router 服务（基于场景/成本/延迟智能路由）                                        | `llm/llm-router.service.ts`           | P2-06       |
| D3  | P2-08   | 实现 LLM 语义缓存服务（Embedding 相似度匹配，Redis 存储）                                 | `llm/llm-cache.service.ts`            | P2-07       |
| D3  | P2-09   | 实现 Token 计费统计服务（输入/输出 Token 记录，成本汇总）                                 | `llm/token-counter.service.ts`        | P2-07       |
| D4  | P2-10   | 实现 Prompt 组装服务（模板变量替换、上下文窗口管理、System Prompt 注入）                  | `llm/prompt-builder.service.ts`       | P2-07       |
| D4  | P2-11   | 创建 ChatCompletion DTO（请求/响应模型，支持 stream/function_calling）                    | `llm/dto/chat-completion.dto.ts`      | P2-01       |
| D4  | P2-12   | 创建 LLM 调用 Controller（POST /ai/chat, POST /ai/embed, GET /ai/cost/stats）             | `ai-models.controller.ts` 更新        | P2-07~P2-11 |
| D5  | P2-13   | 定义 Agent 类型体系（IAgentConfig, IAgentSession, IAgentTask, IAgentStatus 等）           | `agents/types/agent.types.ts`         | M1          |
| D5  | P2-14   | 定义任务类型体系（ITaskPayload, ITaskResult, TaskPriority, TaskType 枚举）                | `agents/types/task.types.ts`          | P2-13       |
| D5  | P2-15   | 定义 IPC 通信协议（Agent↔Orchestrator 消息格式）                                          | `agents/types/protocol.types.ts`      | P2-13       |

#### Week 4: Agent 引擎核心（50 并发架构）

| 天  | 任务 ID | 任务描述                                                                              | 产出物                                            | 依赖               |
| --- | ------- | ------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------ |
| D1  | P2-16   | 实现 Agent Pool 服务（Worker Thread 池管理，最大 50 并发，动态扩缩容）                | `agents/agent-pool.service.ts`                    | P2-13~P2-15, P1-11 |
| D1  | P2-17   | 实现 Agent Executor 服务（单 Agent 生命周期：init→idle→running→pause→complete/error） | `agents/agent-executor.service.ts`                | P2-16              |
| D1  | P2-18   | 实现 Agent Orchestrator 服务（任务分发、优先级队列、失败重试、死信队列）              | `agents/agent-orchestrator.service.ts`            | P2-16, P2-17       |
| D2  | P2-19   | 实现 Agent Health Check 服务（心跳检测、超时标记、自动恢复）                          | `agents/agent-health.service.ts`                  | P2-18              |
| D2  | P2-20   | 实现 RabbitMQ Agent Task Consumer（消费任务→分配到 Pool→执行→回调）                   | 集成代码                                          | P2-18, P1-11       |
| D2  | P2-21   | 创建 Agent Session CRUD（会话创建/查询/停止/状态变更）                                | `openclaw.controller.ts` 更新                     | P2-18              |
| D3  | P2-22   | 创建 Agent 抽象基类 Strategy（通用执行框架：preprocess→execute→postprocess）          | `agents/strategies/base-agent.strategy.ts`        | P2-17              |
| D3  | P2-23   | 实现获客 Agent 策略（平台数据采集→线索评分→内容推荐）                                 | `agents/strategies/acquisition-agent.strategy.ts` | P2-22              |
| D3  | P2-24   | 实现内容生成 Agent 策略（AI 写作→多平台适配→定时发布）                                | `agents/strategies/content-agent.strategy.ts`     | P2-22              |
| D4  | P2-25   | 实现数据分析 Agent 策略（KPI 计算→趋势预测→异常检测→报告生成）                        | `agents/strategies/analysis-agent.strategy.ts`    | P2-22              |
| D4  | P2-26   | 实现存证 Agent 策略（文件监听→自动存证→证书生成→通知）                                | `agents/strategies/evidence-agent.strategy.ts`    | P2-22              |
| D4  | P2-27   | 实现 KYC 审核 Agent 策略（OCR→信息核验→风险评级→建议输出）                            | `agents/strategies/kyc-review-agent.strategy.ts`  | P2-22              |
| D5  | P2-28   | Agent 引擎集成测试（启动 50 个模拟 Agent 并发运行 10 分钟，验证资源不泄漏）           | 测试报告                                          | P2-16~P2-27        |
| D5  | P2-29   | OpenClaw Module 整合（注册所有新 Service 到 Module）                                  | `openclaw.module.ts` 更新                         | P2-16~P2-27        |

#### Week 5: 区块链存证 + 电子签收

| 天  | 任务 ID | 任务描述                                                                 | 产出物                                    | 依赖                |
| --- | ------- | ------------------------------------------------------------------------ | ----------------------------------------- | ------------------- |
| D1  | P2-30   | 定义 EvidenceRegistry 合约 ABI（存储证据哈希、时间戳、提交者地址）       | `contracts/evidence-registry.abi.json`    | M1                  |
| D1  | P2-31   | 实现 ethers.js v6 合约交互封装（连接多链、发送交易、等待确认、事件监听） | `contracts/evidence-contract.service.ts`  | P2-30, P1-07        |
| D1  | P2-32   | 实现多网络合约地址配置（以太坊主网/Polygon/BSC/BSC Testnet）             | `contracts/contract-addresses.ts`         | P2-31               |
| D2  | P2-33   | 实现 IPFS 服务封装（Pinata API / 自建 Kubo 节点，文件 Pin/CID 获取）     | `ipfs/ipfs.service.ts`                    | P1-12               |
| D2  | P2-34   | 实现存证核心 Service（上传→哈希→IPFS→合约写入→返回证书，全流程 <3s）     | `blockchain-evidence.service.ts`          | P2-31, P2-33, P1-12 |
| D2  | P2-35   | 实现存证验证 Service（链上查询→哈希比对→证书展示）                       | `blockchain-evidence.service.ts` (verify) | P2-31               |
| D3  | P2-36   | 实现区块链签名验证 Guard（recoverAddress 验证 EIP-712 签名）             | `guards/blockchain-signature.guard.ts`    | P1-07               |
| D3  | P2-37   | 创建存证 Controller（POST 上传存证, GET 验证, GET 证书, GET 列表）       | `blockchain-evidence.controller.ts`       | P2-34~P2-36         |
| D3  | P2-38   | 实现文件上传 Service（MinIO 分片上传、断点续传、类型校验、大小限制）     | `documents/file-upload.service.ts`        | P1-12               |
| D4  | P2-39   | 实现 PDF 生成服务（PDFKit 模板渲染：合同/报告/证书模板）                 | `pdf/pdf-generator.service.ts`            | P1-07               |
| D4  | P2-40   | 实现数字签名服务（EdDSA 密钥对生成、签名/验签、证书编码）                | `crypto/signature.service.ts`             | P1-07               |
| D4  | P2-41   | 实现电子签收核心 Service（发起签署→签名收集→PDF 嵌入→归档）              | `e-signature.service.ts`                  | P2-39, P2-40        |
| D5  | P2-42   | 创建签收 Controller（POST 发起签署, POST 签名, GET 验证, GET 证书下载）  | `e-signature.controller.ts`               | P2-41               |
| D5  | P2-43   | 存证 + 签收集成测试（完整用户旅程：上传→存证→发起签收→签署→验证）        | E2E 测试                                  | P2-37, P2-42        |

#### Week 6: n8n 深度集成 + BPM 联动

| 天    | 任务 ID | 任务描述                                                                       | 产出物                            | 依赖           |
| ----- | ------- | ------------------------------------------------------------------------------ | --------------------------------- | -------------- |
| D1    | P2-44   | 实现 n8n HTTP Client 封装（认证、Workflow 触发、Execution 查询、Webhook 管理） | `n8n-integration.service.ts`      | M1             |
| D1    | P2-45   | 实现 Webhook 注册服务（动态注册/注销 Webhook，HMAC 签名生成）                  | `n8n-webhook.service.ts`          | P2-44          |
| D1    | P2-46   | 创建 6 个核心工作流模板定义（JSON 格式，可直接导入 n8n）                       | `workflows/*.template.ts`         | P2-45          |
| D2    | P2-47   | 实现 DID 事件联动（DID创建→触发onboarding工作流）                              | `n8n.service.ts` 增强             | P2-44          |
| D2    | P2-48   | 实现 KYC 事件联动（KYC提交→自动初审工作流→人工复审通知）                       | `n8n.service.ts` 增强             | P2-47          |
| D2    | P2-49   | 实现存证事件联动（存证完成→证书生成→通知相关方→归档工作流）                    | `n8n.service.ts` 增强             | P2-47          |
| D3    | P2-50   | 实现 BPM ↔ Agent Bridge（BPM 任务节点触发 Agent 执行，Agent 结果回写 BPM）     | `bpm/bpm-agent-bridge.service.ts` | P2-18, 已有bpm |
| D3    | P2-51   | BPM Service 增强（添加 Agent 节点类型定义、Agent 任务处理器）                  | `bpm.service.ts` 更新             | P2-50          |
| D3    | P2-52   | 创建 n8n 管理 Controller（工作流列表/导入/导出/执行历史/Webhook 管理）         | `n8n.controller.ts` 更新          | P2-44~P2-46    |
| D4    | P2-53   | Documents 模块增强（关联 FileStorage，支持上传/下载/预览/版本管理）            | `documents.service.ts` 更新       | P2-38          |
| D4    | P2-54   | Acquisition Mock 替换为真实数据源（至少接入 1 个平台的 API）                   | `acquisition.service.ts` 重构     | P2-23          |
| D4-D5 | P2-55   | Phase 2 集成验证：LLM 调用 + Agent 运行 + 存证 + 签收 + n8n + BPM 全链路打通   | Phase 2 验收报告                  | 全部 P2 任务   |

**Phase 2 里程碑 M2**: 核心功能就绪 — 6 大模块可独立运行并通过冒烟测试。

**M2 验收标准**:

- [ ] LLM 调用：4 个 Provider 均可正常 chatCompletion + streamCompletion
- [ ] Agent 引擎：可启动 50 个 Agent 并发运行 ≥10 分钟无崩溃
- [ ] 区块链存证：从文件上传到获取存证证书 < 3 秒（缓存命中 <100ms）
- [ ] 电子签收：完整签署流程可走通（发起→签署→验证→证书下载）
- [ ] n8n 集成：6 个工作流模板可在 n8n UI 中正确导入和执行
- [ ] BPM 联动：审批流程中的 Agent 节点可正确触发和回写结果

---

### 2.3 Phase 3: 获客系统增强 & 性能优化 (Week 7-9)

**目标**: 将获客系统从 Mock 数据升级为真实运营系统，并满足性能 KPI。

#### Week 7: 获客平台适配器 + 数据同步

| 天    | 任务 ID | 任务描述                                                                         | 产出物                              | 依赖        |
| ----- | ------- | -------------------------------------------------------------------------------- | ----------------------------------- | ----------- |
| D1    | P3-01   | 实现抽象平台适配器基类（统一接口：auth/list/create/update/delete/stats）         | `adapters/base-platform.adapter.ts` | M2          |
| D1    | P3-02   | 实现抖音创作者平台适配器（OAuth2 认证、视频数据、评论数据、达人数据）            | `adapters/douyin.adapter.ts`        | P3-01       |
| D1    | P3-03   | 实现小红书专业号平台适配器（API 认证、笔记数据、互动数据）                       | `adapters/xiaohongshu.adapter.ts`   | P3-01       |
| D2    | P3-04   | 实现微信视频号适配器（基础数据同步）                                             | `adapters/wechat-video.adapter.ts`  | P3-01       |
| D2    | P3-05   | 实现 Instagram Graph API 适配器（媒体洞察、Stories、Reels）                      | `adapters/instagram.adapter.ts`     | P3-01       |
| D2    | P3-06   | 实现 YouTube Data API 适配器（频道分析、视频表现）                               | `adapters/youtube.adapter.ts`       | P3-01       |
| D3    | P3-07   | 实现 TikTok for Business API 适配器（广告账户、创意、投放效果）                  | `adapters/tiktok-global.adapter.ts` | P3-01       |
| D3    | P3-08   | 实现数据同步引擎（定时批量同步、增量更新、冲突解决、错误重试）                   | `acquisition-sync.service.ts`       | P3-02~P3-07 |
| D3    | P3-09   | 同步引擎注册为 Cron Job（每 30 分钟全量同步，每 5 分钟增量更新）                 | `app.module.ts` cron 注册           | P3-08       |
| D4-D5 | P3-10   | 适配器单元测试（每个适配器至少覆盖 happy path + auth failure + rate limit 场景） | 测试套件                            | P3-02~P3-07 |

#### Week 8: AI 获客策略 + WebSocket 实时推送

| 天    | 任务 ID | 任务描述                                                                  | 产出物                                   | 依赖         |
| ----- | ------- | ------------------------------------------------------------------------- | ---------------------------------------- | ------------ |
| D1    | P3-11   | 实现 AI 策略推荐服务（投放效果分析→预算优化建议→人群包推荐→时段建议）     | `acquisition-ai.service.ts`              | M2, P3-08    |
| D1    | P3-12   | 实现达人智能匹配算法（标签匹配×互动率×粉丝重叠度→综合评分排序）           | `acquisition-ai.service.ts` (match)      | P3-08        |
| D1    | P3-13   | 实现预算分配优化算法（基于历史 ROI 的多目标优化）                         | `acquisition-ai.service.ts` (budget)     | P3-08        |
| D2    | P3-14   | 实现 WebSocket Gateway（连接管理、房间划分、心跳保活、断线重连）          | `acquisition-ws.gateway.ts`              | P1-10        |
| D2    | P3-15   | 实现实时数据推送（线索变更→WS广播、KPI 更新→定时推送、告警事件→即时推送） | `acquisition-ws.gateway.ts` (broadcast)  | P3-14        |
| D2    | P3-16   | 前端 WebSocket 客户端（自动重连、消息分发、状态同步）                     | `lib/ws-client.ts`                       | P3-14        |
| D3    | P3-17   | 前端获客看板页面（KPI 卡片 + 实时折线图 + 平台对比 + 漏斗图）             | `pages/acquisition/Dashboard.tsx`        | P3-15, P3-16 |
| D3    | P3-18   | 前端达人库页面（卡片列表 + 筛选 + AI 分析按钮 + 匹配度展示）              | `pages/acquisition/InfluencerRoster.tsx` | P3-12        |
| D3    | P3-19   | 前端 AI 策略面板（推荐列表 + 效果预测 + 一键采纳）                        | `pages/acquisition/AiStrategyPanel.tsx`  | P3-11        |
| D4-D5 | P3-20   | 获客系统端到端测试（平台同步→数据处理→AI 推荐→WS 推送→前端展示完整链路）  | E2E 测试套件                             | P3-10~P3-19  |

#### Week 9: 性能优化达标

| 天    | 任务 ID | 任务描述                                                                | 产出物                     | 依赖        |
| ----- | ------- | ----------------------------------------------------------------------- | -------------------------- | ----------- |
| D1    | P3-21   | API 响应优化：统计类接口加 Redis 缓存（Stats TTL=60s, Detail TTL=300s） | 缓存层实现                 | P1-18       |
| D1    | P3-22   | 数据库查询优化：慢查询分析 + 索引优化 + N+1 查询修复                    | SQL 优化报告               | M2          |
| D1    | P3-23   | 存证性能优化：文件去重索引 + 预存证缓存 + 合约调用异步化（目标 P99<3s） | 性能基准测试               | P2-34       |
| D2    | P3-24   | Agent 并发压力测试：逐步增加到 50 并发，监控内存/CPU/队列深度           | 压测报告                   | M2          |
| D2    | P3-25   | 内存泄漏排查：使用 heapdump 分析 Agent 生命周期，修复潜在泄漏点         | 修复记录                   | P3-24       |
| D2    | P3-26   | 前端构建优化：Code Splitting、Lazy Loading、Tree Shaking、Bundle 分析   | Bundle Report              | M1          |
| D3    | P3-27   | Nginx 配置优化：Gzip、缓存头、速率限制、连接超时调优                    | `nginx/conf.d/*.conf` 更新 | P1-03       |
| D3    | P3-28   | PostgreSQL 连接池调优（Prisma connection_limit、statement_timeout）     | 配置优化                   | P3-22       |
| D3-D5 | P3-29   | Phase 3 性能验收：全部 KPI 达标验证                                     | Phase 3 验收报告           | P3-21~P3-28 |

**Phase 3 里程碑 M3**: 获客系统上线就绪 — 真实数据、实时展示、性能达标。

**M3 验收标准**:

- [ ] 至少 3 个国内/海外平台适配器可正常同步数据
- [ ] 获客看板数据刷新延迟 ≤ 30 秒
- [ ] AI 策略推荐响应时间 ≤ 5 秒
- [ ] 50 个 Agent 并发运行 1 小时，内存稳定无泄漏
- [ ] 存证 P99 响应时间 ≤ 3 秒
- [ ] 前端首屏加载时间 ≤ 2 秒（4G 网络）

---

### 2.4 Phase 4: 测试 & 监控 & 部署 (Week 10-12)

**目标**: 确保系统质量达到生产标准，完成 72 小时稳定性验证。

#### Week 10: 全面测试

| 天  | 任务 ID | 任务描述                                                                     | 产出物                 | 依赖        |
| --- | ------- | ---------------------------------------------------------------------------- | ---------------------- | ----------- |
| D1  | P4-01   | Unit Tests：核心 Service 层单元测试覆盖率 ≥ 80%（重点：LLM/Agent/存证/签收） | ~200 个测试用例        | M3          |
| D1  | P4-02   | Unit Tests：Common 层测试（Guards/Filters/Interceptors/Utils）               | ~50 个测试用例         | M1          |
| D2  | P4-03   | Integration Tests：API 端到端测试（每个 Controller 主要端点）                | ~80 个测试用例         | M3          |
| D2  | P4-04   | Integration Tests：Webhook 回调测试（n8n→API 全部事件流）                    | ~15 个测试用例         | M2          |
| D3  | P4-05   | E2E Tests：用户旅程测试（DID注册→KYC→存证→签收→获客活动创建）                | ~15 个 Playwright 场景 | M3          |
| D3  | P4-06   | E2E Tests：管理员操作旅程（Agent启动→监控→工作流触发→报告查看）              | ~10 个 Playwright 场景 | M3          |
| D4  | P4-07   | Performance Tests：50 Agent 并发负载测试（Artillery/k6 脚本）                | 压测脚本+报告          | M3          |
| D4  | P4-08   | Performance Tests：存证接口压力测试（100 QPS 持续 5 分钟）                   | 压测报告               | M3          |
| D5  | P4-09   | Security Tests：OWASP Top 10 自动扫描 + 手工渗透测试关键端点                 | 安全扫描报告           | M3          |
| D5  | P4-10   | 缺陷修复周：P1/P2 缺陷全部修复，P3 缺陷评估是否阻塞发布                      | 缺陷跟踪表             | P4-01~P4-09 |

#### Week 11: 监控告警 + 生产部署准备

| 天    | 任务 ID | 任务描述                                                                      | 产出物                      | 依赖        |
| ----- | ------- | ----------------------------------------------------------------------------- | --------------------------- | ----------- |
| D1    | P4-11   | Prometheus 指标埋点（API 延迟/QPS/错误率/Agent 数量/队列深度/DB 连接数）      | 指标代码                    | M3          |
| D1    | P4-12   | Grafana 仪表盘配置（6 张核心仪表盘：系统概览/API/Agent/区块链/获客/基础设施） | Grafana JSON 导出           | P4-11       |
| D1    | P4-13   | Alertmanager 告警规则配置（8 条核心规则 + 通知渠道：钉钉/邮件/短信）          | `alertmanager.yml`          | P4-12       |
| D2    | P4-14   | 日志聚合配置（结构化 JSON 日志 + ELK/P Loki 收集 + 日志级别过滤）             | 日志配置                    | M3          |
| D2    | P4-15   | PM2 生产配置完善（cluster 模式、优雅重启、日志轮转、自动重启策略）            | `ecosystem.config.cjs` 更新 | M1          |
| D2    | P4-16   | 生产环境 .env.final 生成（所有密钥占位符替换为真实值或 Vault 引用）           | `.env.production` 最终版    | M3          |
| D3    | P4-17   | 数据库备份脚本（每日全量 + 每小时增量 + 30 天保留 + S3 归档）                 | `scripts/backup-db.sh`      | M3          |
| D3    | P4-18   | 健康检查端点完善（/health → DB/Redis/MQ/MinIO/n8n 全链路探针）                | health controller           | M3          |
| D3    | P4-19   | 一键部署脚本（Docker 构建→镜像推送→服务滚动更新→健康检查→回滚）               | `scripts/deploy.sh`         | P4-15~P4-18 |
| D4-D5 | P4-20   | 预发布环境部署 + 冒烟测试（Staging 环境完整功能验证）                         | Staging 验收报告            | P4-11~P4-19 |

#### Week 12: 72h 稳定性测试 + 文档 + 发布

| 天    | 任务 ID | 任务描述                                                                         | 产出物                  | 依赖        |
| ----- | ------- | -------------------------------------------------------------------------------- | ----------------------- | ----------- |
| D1-D3 | P4-21   | **72 小时连续稳定性测试**：模拟真实负载（20 用户 + 30 Agent），每 6 小时巡检一次 | 稳定性报告              | P4-20       |
| D4    | P4-22   | 操作手册编写（部署指南、日常运维、故障排查、备份恢复）                           | `docs/ops-manual/` 补充 | P4-21       |
| D4    | P4-23   | API 文档完善（Swagger/OpenAPI 3.0 补充描述、示例、错误码）                       | Swagger UI 完善         | M3          |
| D5    | P4-24   | 用户操作手册（管理员后台各功能模块操作指引）                                     | 用户手册                | M3          |
| D5    | P4-25   | **正式发布**：打 Tag、构建生产镜像、部署到生产环境、DNS 切换、公告通知           | Release v1.0.0          | P4-21~P4-24 |

**Phase 4 里程碑 M4**: 生产就绪 — 通过 72h 稳定性测试，文档齐全，已发布。

**M4 验收标准**:

- [ ] 单元测试覆盖率 ≥ 80%，集成测试全部通过
- [ ] E2E 关键用户旅程 100% 通过
- [ ] 72 小时连续运行：0 次非计划重启，错误率 < 0.1%
- [ ] 监控告警：8 条规则全部生效，测试告警可正常触发
- [ ] 备份恢复验证：可在 30 分钟内从备份完全恢复
- [ ] 部署文档完整，新人可在 2 小时内完成环境搭建
- [ ] 生产环境部署成功，域名可访问，HTTPS 正常

---

### 2.5 里程碑甘特图

```
Week:     1    2    3    4    5    6    7    8    9    10   11   12
          ├────┤├────┤├────┤├────┤├────┤├────┤├────┤├────┤├────┤├────┤├────┤

Phase 1:  [====基础设施补全====]
          ████████████████████
                              M1 ✓

Phase 2:            [========核心功能模块开发=========]
                    ████████████████████████████████████
                                                M2 ✓

Phase 3:                              [==获客增强&性能优化==]
                                          ████████████████████████
                                                              M3 ✓

Phase 4:                                            [==测试&监控&部署==]
                                                      ████████████████████████
                                                                          M4 ✓

关键节点:
M1 基础设施就绪     ████ W2End
M2 核心功能就绪     ████████████ W6End
M3 获客系统就绪     ████████████████ W9End
M4 生产发布         ████████████████████ W12End
```

### 2.6 关键路径与依赖关系

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
              [P1-01] Docker 扩展                             │
              (n8n/RabbitMQ/MinIO)                            │
                    │                                         │
          ┌─────────┼─────────┐                              │
          ▼         ▼         ▼                              │
    [P1-04]    [P1-07]    [P1-09]                             │
    Schema    npm install  env vars                           │
          │         │         │                              │
          ▼         ▼         ▼                              │
    ════════ M1: 基础设施就绪 ═══════                          │
                    │                                         │
        ┌───────────┼───────────┐                              │
        ▼           ▼           ▼                              │
  [P2-01]     [P2-13]     [P2-30]  ←── 关键路径并行分支         │
  LLM引擎     Agent类型    存证合约                              │
        │           │           │                              │
        ▼           ▼           ▼                              │
  [P2-07]     [P2-16]     [P2-34]                              │
  LLM Router  Agent Pool  存证Service                            │
        │           │           │                              │
        ▼           ▼           ▼                              │
  ════════ M2: 核心功能就绪 ═══════                          │
                    │                                         │
        ┌───────────┼───────────┐                              │
        ▼           ▼           ▼                              │
  [P3-01]     [P3-11]     [P3-21]                              │
  平台适配器   AI策略推荐   性能优化                              │
        │           │           │                              │
        ▼           ▼           ▼                              │
  ════════ M3: 获客系统就绪 ═══════                          │
                    │                                         │
        ┌───────────┼───────────┐                              │
        ▼           ▼           ▼                              │
  [P4-01]     [P4-11]     [P4-21]                              │
  全面测试     监控告警     72h稳定性                            │
        │           │           │                              │
        ▼           ▼           ▼                              │
  ════════ M4: 生产发布 ═════════════                          │
                    │                                         │
                    └─────────────────────────────────────────┘
                              循环审查
```

**关键路径（Critical Path）**:

```
P1-01 → P1-04 → M1 → P2-01 → P2-07 → P2-13 → P2-16 → P2-18 → M2 → P3-01 → P3-08 → M3 → P4-01 → P4-21 → M4
```

**关键路径长度**: 12 周（无浮动时间）

**高风险依赖**:

- P2-16 (Agent Pool) 依赖 P1-11 (RabbitMQ) — 消息队列是 Agent 并发的硬依赖
- P2-34 (存证) 依赖 P2-31 (ethers.js 合约交互) — 区块链 RPC 不确定性高
- P3-01 (平台适配器) 依赖第三方 API 稳定性 — 外部 API 可能变更

---

## 第三章 质量标准与验收标准

### 3.1 代码质量标准

#### 3.1.1 TypeScript 代码规范

| 规范项           | 标准                                                 | 检查方式               |
| ---------------- | ---------------------------------------------------- | ---------------------- |
| **编译零错误**   | `npx tsc --noEmit` 输出 0 errors, 0 warnings         | CI 自动检查            |
| **ESLint 通过**  | `npx eslint src --max-warnings=50`                   | CI 自动检查            |
| **any 类型禁止** | 代码中不允许出现 `: any` 或 `as any`（DTO 解析除外） | Code Review            |
| **复杂度限制**   | 单函数圈复杂度 ≤ 15，单文件行数 ≤ 500                | ESLint complexity 规则 |
| **命名一致**     | 符合 1.5.2 节命名规范                                | Code Review            |
| **注释必要**     | 公共方法必须有 JSDoc 注释（@param/@returns/@throws） | Code Review            |
| **魔法数字消除** | 数字常量必须提取为命名常量                           | Code Review            |
| **错误处理**     | 所有 async 调用必须有 try-catch 或 .catch()          | Code Review            |

#### 3.1.2 NestJS 特定规范

| 规范项              | 标准                                                      |
| ------------------- | --------------------------------------------------------- |
| **Module 边界清晰** | 每个 Module 只引用自身需要的 Module，禁止循环依赖         |
| **DTO 验证完整**    | 所有入参 DTO 必须使用 class-validator 装饰器              |
| **Guard 正确使用**  | 敏感端点必须使用 JwtAuthGuard，公开端点必须标注 @Public() |
| **Service 可测试**  | Service 依赖通过 constructor 注入，便于 Mock              |
| **Controller 瘦身** | Controller 只做参数解析和调用 Service，不含业务逻辑       |
| **异常统一**        | 使用 AllExceptionsFilter，禁止直接 throw 原始 Error       |

#### 3.1.3 React 前端规范

| 规范项           | 标准                                                          |
| ---------------- | ------------------------------------------------------------- |
| **组件职责单一** | 每个组件 ≤ 300 行，超过则拆分                                 |
| **Hooks 规范**   | 自定义 Hook 以 `use` 开头，副作用必须在 useEffect 中清理      |
| **类型安全**     | 禁止 `as any` 强制转换，未知数据先定义 interface              |
| **API 调用封装** | 所有 API 调用通过 `lib/api.ts` 统一封装，禁止散落 fetch/axios |
| **无障碍访问**   | 语义化 HTML，图片 alt 属性，颜色对比度 ≥ 4.5:1                |

### 3.2 各模块交付物验收标准

#### 3.2.1 OpenClaw 智能体引擎

| 验收项   | 标准                                             | 验证方法             |
| -------- | ------------------------------------------------ | -------------------- |
| 并发能力 | 50 个 Agent 同时运行 1 小时不崩溃                | 压力测试脚本         |
| 资源控制 | 单 Agent 内存 ≤ 100MB，CPU ≤ 单核 30%            | Node.js profiler     |
| 任务分发 | 任务从入队到开始执行平均延迟 ≤ 500ms             | 日志时间戳对比       |
| 失败恢复 | Agent 异常终止后 30 秒内自动重启                 | kill -9 测试         |
| 心跳健康 | 每 10 秒上报心跳，连续 3 次缺失标记异常          | Redis key TTL 检查   |
| 策略扩展 | 新增 Agent 策略只需继承基类 + 注册，不改核心代码 | 实际添加一个测试策略 |

#### 3.2.2 LLM 调用引擎

| 验收项      | 标准                                                     | 验证方法           |
| ----------- | -------------------------------------------------------- | ------------------ |
| 多 Provider | 4 个 Provider 均可正常 chatCompletion + streamCompletion | 单元测试           |
| 智能路由    | 根据场景自动选择最优 Provider（成本/速度/质量权衡）      | 路由决策日志       |
| 流式输出    | SSE 流式输出首 token 延迟 ≤ 2 秒                         | curl 测试          |
| 缓存命中率  | 相似查询缓存命中率 ≥ 40%（降低成本）                     | Redis 统计         |
| Token 计费  | 每次 LLM 调用准确记录 input/output tokens 和费用         | DB 查询验证        |
| 错误降级    | Provider 不可用时自动切换到备用 Provider                 | 模拟 Provider 故障 |

#### 3.2.3 区块链存证服务

| 验收项     | 标准                                            | 验证方法       |
| ---------- | ----------------------------------------------- | -------------- |
| 端到端延迟 | 文件上传 → 存证证书返回 P99 ≤ 3 秒              | 性能基准测试   |
| 缓存命中   | 相同文件重复存证返回 < 100ms（缓存命中）        | 重复请求测试   |
| 数据完整性 | 存证哈希 = 原始文件 SHA256（链上可验证）        | hash 对比验证  |
| 链上可查   | 通过 txHash 可在 Etherscan/Polygonscan 查到交易 | 区块浏览器验证 |
| 并发存证   | 10 QPS 并发存证无丢失、无重复                   | 并发测试脚本   |

#### 3.2.4 电子签收服务

| 验收项     | 标准                                  | 验证方法            |
| ---------- | ------------------------------------- | ------------------- |
| 签名真实性 | 使用 EdDSA/ECDSA，私钥不出服务器端    | 代码审计            |
| 文档完整性 | 签名后的 PDF 哈希与原文一致           | hash 验证           |
| 不可否认性 | 签名包含时间戳 + 签名者 DID + 文档 ID | 证书内容检查        |
| 签名验证   | 任何第三方可使用公钥验证签名有效性    | 独立验证脚本        |
| 审计追踪   | 每次签署/验证操作记录审计日志         | DB audit_log 表查询 |

#### 3.2.5 获客系统

| 验收项     | 标准                                | 验证方法       |
| ---------- | ----------------------------------- | -------------- |
| 平台覆盖   | 至少接入 3 个国内 + 2 个海外平台    | 适配器数量统计 |
| 数据新鲜度 | 数据更新延迟 ≤ 30 分钟（准实时）    | 时间戳对比     |
| WebSocket  | 连接断开后 5 秒内自动重连           | 网络断开测试   |
| AI 推荐    | 策略推荐响应 ≤ 5 秒，匹配度评分合理 | 功能测试       |
| 达人库     | 支持筛选/搜索/批量操作/数据导出     | 功能测试       |

#### 3.2.6 n8n 工作流集成

| 验收项     | 标准                                     | 验证方法         |
| ---------- | ---------------------------------------- | ---------------- |
| 工作流导入 | 6 个模板均可正确导入 n8n UI              | 手动导入验证     |
| 事件触发   | DID/KYC/存证事件可正确触发对应工作流     | Webhook 测试     |
| 执行状态   | 可通过 API 查询工作流执行状态和结果      | API 调用验证     |
| 错误处理   | 工作流执行失败时有明确错误日志和重试机制 | 故意制造失败测试 |

### 3.3 性能验收标准

| 指标                 | 目标值                                     | 测量方法    | 工具                          |
| -------------------- | ------------------------------------------ | ----------- | ----------------------------- |
| **API 平均响应时间** | P50 < 200ms, P99 < 2000ms                  | APM 监控    | Prometheus + Grafana          |
| **API 可用性**       | ≥ 99.5% (月度)                             | Uptime 监控 | Pingdom / 自研                |
| **存证响应时间**     | P99 ≤ 3000ms                               | 端到端计时  | k6 / Artillery                |
| **Agent 并发数**     | ≥ 50 同时运行                              | Pool 监控   | 自研 metrics                  |
| **获客数据延迟**     | ≤ 30 秒（准实时）                          | 时间戳差    | WS 推送日志                   |
| **数据库查询**       | 无 > 1s 的慢查询                           | PG slow log | pg_stat_statements            |
| **Redis 命中率**     | ≥ 85%                                      | Redis INFO  | redis-cli                     |
| **前端首屏加载**     | ≤ 2s (4G)                                  | Lighthouse  | Chrome DevTools               |
| **WebSocket 延迟**   | 消息推送延迟 < 1s                          | 时间戳差    | 自测                          |
| **内存占用**         | API 进程 < 512MB, 前端构建 < 5MB (gzipped) | 系统监控    | top / webpack-bundle-analyzer |

### 3.4 安全验收标准

| 安全域           | 标准                                    | 验证方式        |
| ---------------- | --------------------------------------- | --------------- |
| **认证授权**     | 所有敏感端点返回 401（未登录时）        | 自动化安全测试  |
| **SQL 注入**     | Prisma ORM 参数化查询，无拼接 SQL       | 代码审计        |
| **XSS 防护**     | 前端 React 自动转义 + CSP 头            | 安全扫描        |
| **CSRF 防护**    | API 使用 Bearer Token（非 Cookie）      | 架构评审        |
| **Webhook 安全** | HMAC-SHA256 签名验证 + IP 白名单        | 渗透测试        |
| **敏感数据加密** | 数据库字段 AES 加密，传输 TLS 1.3       | 配置检查        |
| **密钥管理**     | 生产密钥不在代码中，使用 Vault/环境变量 | 代码扫描        |
| **速率限制**     | 所有公开端点有 RateLimit 保护           | 压力测试        |
| **依赖安全**     | 无已知 High/Critical CVE                | `npm audit`     |
| **权限最小化**   | Docker 容器以 non-root 用户运行         | Dockerfile 检查 |

---

## 第四章 风险评估与应急计划

### 4.1 风险登记册

| ID  | 风险描述                                 | 概率 | 影响 | 风险等级 | 所属阶段 | 缓解措施                                    | 应急计划                                          |
| --- | ---------------------------------------- | ---- | ---- | -------- | -------- | ------------------------------------------- | ------------------------------------------------- |
| R01 | **第三方 LLM API 不稳定或价格大幅上涨**  | 中   | 高   | **高**   | P2       | 多 Provider 架构 + 智能路由 + 本地缓存      | 启用 DeepSeek/Qwen 降级方案；紧急采购备用 API Key |
| R02 | **区块链 RPC 节点不稳定导致存证超时**    | 中   | 高   | **高**   | P2       | 多 RPC 节点备选 + 异步存证 + 本地暂存队列   | 切换至备用 RPC；暂时返回"存证中"状态，异步补偿    |
| R03 | **Agent 并发 50 导致内存溢出 OOM**       | 中   | 高   | **高**   | P2-P3    | Worker Thread 限制 + 内存监控 + 自动扩缩容  | 降低并发上限至 30；启用 RabbitMQ 持久化队列堆积   |
| R04 | **外部获客平台 API 变更或封号**          | 高   | 中   | **高**   | P3       | 适配器抽象层 + 版本化 API + Mock 兜底       | 降级为手动录入模式；紧急联系平台商务              |
| R05 | **n8n 工作流引擎学习曲线陡峭**           | 中   | 中   | **中**   | P2       | 预制 6 个核心模板 + 详细文档                | 简化为直接 API 调用绕过 n8n                       |
| R06 | **Docker 资源不足（开发机无法跑全栈）**  | 高   | 低   | **中**   | P1       | docker-compose.dev.yml 精简版（仅必需服务） | 使用云开发环境；关键服务本地 + 其他远程           |
| R07 | **Prisma Schema 过大导致迁移变慢**       | 低   | 中   | **低**   | P1-P2    | 分批迁移；dev 环境用 SQLite                 | 保持 SQLite 开发，仅 PG 生产迁移                  |
| R08 | **WebSocket 连接数过多导致服务器负载高** | 中   | 中   | **中**   | P3       | 连接数限制 + 心跳清理 + 消息合并            | 降级为 30s 轮询模式                               |
| R09 | **团队成员技能差距导致进度延期**         | 中   | 高   | **高**   | 全周期   | 详细文档 + Code Review + Pair Programming   | 外部技术顾问支持；降低非关键功能 scope            |
| R10 | **需求变更频繁导致返工**                 | 高   | 中   | **高**   | 全周期   | 变更控制流程（见 5.5 节）；冻结 M1-M4 范围  | 变更走 ADR 流程；影响评估后决定纳入或推迟         |
| R11 | **电子签名法律合规性风险**               | 低   | 极高 | **高**   | P2       | 采用国密算法（SM2/SM3）；参考《电子签名法》 | 咨询法律顾问；切换为第三方签名服务（如法大大）    |
| R12 | **72h 稳定性测试发现阻塞性缺陷**         | 中   | 高   | **高**   | P4       | 每日构建 + 冒烟测试尽早发现问题             | 延迟发布；hotfix 分支修复                         |

### 4.2 应急响应预案

#### 4.2.1 P0 级别：系统宕机 / 数据丢失

```
触发条件: 生产环境 API 无法响应 或 数据库不可用

响应流程:
1. 发现 (0-5 min)
   ├── 监控告警触发 (Alertmanager → 钉钉群)
   └── 用户反馈 (客服 → 技术)

2. 初步诊断 (5-15 min)
   ├── 检查 Docker 容器状态: docker ps -a
   ├── 检查资源使用: top / df -h / free -m
   ├── 检查日志: tail -f logs/api-error.log
   └── 检查 DB: pg_isready

3. 快速恢复 (15-30 min)
   ├── 服务崩溃 → pm2 restart / docker restart
   ├── DB 问题 → 切换到只读副本 / 从备份恢复
   ├── 资源耗尽 → 水平扩容 / 清理临时文件
   └── 网络问题 → DNS 检查 / CDN 切换

4. 根因分析与预防 (事后 24h 内)
   ├── 编写事故报告 (5 Whys 分析)
   ├── 更新 Runbook
   └── 加入回归测试用例
```

#### 4.2.2 P1 级别：核心功能降级

```
触发条件: LLM API 全部不可用 / 区块链存证持续超时 / Agent 大面积异常

响应流程:
1. 自动降级 (系统内置)
   ├── LLM → 切换到缓存响应 / 返回"服务繁忙"
   ├── 存证 → 异步排队 / 返回"处理中"
   ├── Agent → 暂停新任务 / 保存现场

2. 手动干预 (15 min 内)
   ├── 通知相关人员
   ├── 评估影响范围
   ├── 决定降级策略
   └── 公告用户

3. 恢复验证
   ├── 逐步恢复服务
   ├── 监控关键指标
   └── 全量回归验证
```

#### 4.2.3 P2 级别：非核心功能异常

```
触发条件: 单个平台适配器报错 / 次要工作流失败 / 告警误报

响应流程:
1. 记录问题
2. 评估是否需要立即修复
3. 排入下一个 Sprint
4. 如影响用户体验 → 临时屏蔽功能入口
```

---

## 第五章 文档要求与审查机制

### 5.1 代码内联文档规范

#### 5.1.1 JSDoc 标注要求

所有公共 API（Controller 端点、Service 方法、公共函数）必须包含 JSDoc 注释：

````typescript
/**
 * 创建区块链存证记录
 *
 * 将指定文件上传至对象存储，计算 SHA256 哈希，
 * 通过 IPFS 固定内容，最终将证据哈希写入区块链智能合约。
 *
 * @param fileId - 文件存储记录 ID (来自 FileStorage 表)
 * @param evidenceType - 存证类型: 'document' | 'signature' | 'report'
 * @param didId - 关联的 DID 身份 ID（可选，用于追溯）
 * @param options - 可选配置
 * @param options.skipIpfs - 是否跳过 IPFS 存储（用于测试）
 * @returns 存证记录，包含 txHash 和 blockNumber
 * @throws {BadRequestException} 文件不存在或已被删除
 * @throws {ServiceUnavailableException} 区块链 RPC 节点不可达
 *
 * @example
 * ```ts
 * const evidence = await evidenceService.createEvidence({
 *   fileId: 42,
 *   evidenceType: 'document',
 *   didId: 1,
 * });
 * console.log(evidence.txHash); // "0xabc123..."
 * ```
 */
async createEvidence(
  fileId: number,
  evidenceType: string,
  didId?: number,
  options?: { skipIpfs?: boolean },
): Promise<BlockchainEvidence> {
  // ...
}
````

**JSDoc 必填项清单**:

- [ ] 简短描述（第一行）
- [ ] 详细说明（如有复杂逻辑）
- [ ] `@param` — 每个参数的类型和含义
- [ ] `@returns` — 返回值类型和说明
- [ ] `@throws` — 可能抛出的异常及触发条件
- [ ] `@example` — 至少一个使用示例（公共 API 必须）

#### 5.1.2 复杂逻辑行内注释

对于算法核心、业务规则、临时方案，必须添加行内注释：

```typescript
// TODO(P2): 当前使用线性外推做成本预测，准确度有限。
// 未来应引入 ARIMA 或 Prophet 时间序列模型。参见: TECH-142
const forecast = this.linearExtrapolation(costHistory);

// HACK: 抖音 API 的 createTime 字段返回的是毫秒而非秒，
// 这是官方文档未说明的 bug，已反馈给抖音开放平台。
// 如果他们修复了这个 bug，下面的代码需要同步修改！
const createdAt = new Date(rawData.createTime * (rawData.createTime > 1e12 ? 1 : 1000));
```

**注释标签约定**:
| 标签 | 含义 | 使用场景 |
|------|------|---------|
| `TODO(x)` | 待办事项，x=优先级 | 已知但尚未实现的功能 |
| `FIXME(x)` | 需要修复的问题，x=优先级 | 已知的 bug 或 workaround |
| `HACK` | 临时方案/权宜之计 | 不够优雅但能工作的代码 |
| `NOTE` | 重要提示 | 容易被忽略的关键信息 |
| `WARNING` | 警告 | 可能导致问题的用法 |
| `SEE` | 参考 | 指向相关代码/文档/Issue |

### 5.2 流程文档要求

#### 5.2.1 必须编写的流程文档

| 文档                 | 路径                                     | 内容要求                                         | 负责人 | 截止时间 |
| -------------------- | ---------------------------------------- | ------------------------------------------------ | ------ | -------- |
| **部署指南**         | `docs/ops-manual/deployment.md`          | 环境准备→Docker 构建→服务启动→健康检查→回滚操作  | DevOps | W11      |
| **日常运维手册**     | `docs/ops-manual/daily-ops.md`           | 日志查看→备份操作→证书更新→密码轮转→常见故障处理 | DevOps | W11      |
| **API 集成指南**     | `docs/api/integration-guide.md`          | 认证方式→接口列表→错误码→SDK 示例→Webhook 格式   | 后端   | W11      |
| **n8n 工作流手册**   | `docs/ops-manual/n8n-guide.md`           | 安装配置→模板导入→自定义开发→调试技巧            | 后端   | W10      |
| **Agent 开发指南**   | `docs/architecture/agent-dev-guide.md`   | 策略开发步骤→调试方法→性能调优→常见问题          | 后端   | W8       |
| **获客平台对接指南** | `docs/architecture/platform-adapters.md` | 各平台 OAuth 流程→API 限速→字段映射→错误码       | 后端   | W8       |
| **用户操作手册**     | `docs/admin-user-manual.md`              | 各功能模块截图+操作步骤（面向管理员）            | 前端   | W12      |

#### 5.2.2 文档模板标准

每份文档必须包含以下头部元信息：

```markdown
# [文档标题]

> **版本**: v1.0
> **作者**: [姓名]
> **最后更新**: YYYY-MM-DD
> **状态**: Draft / Review / Approved / Deprecated
> **关联**: [相关 ADR / Issue / PR]

---

## 1. 概述

[一段话说明本文档的用途和读者]

## 2. 前置条件

[阅读本文档前需要了解的知识/具备的环境]

## 3. 详细步骤

[分步骤说明，每步包含命令/截图/预期结果]

## 4. 验证方法

[如何确认操作成功]

## 5. 故障排查

[常见问题和解决方案表格]

## 6. 变更记录

| 日期 | 版本 | 作者 | 变更内容 |
| ---- | ---- | ---- | -------- |
```

### 5.3 架构决策记录 (ADR) 要求

#### 5.3.1 ADR 触发条件

以下情况必须撰写 ADR：

- 技术选型决策（如选择 RabbitMQ vs Kafka vs Redis Stream）
- 架构模式选择（如选择 Worker Thread vs Cluster vs Child Process）
- 跨越多个模块的重要设计决策
- 明显存在多种可行方案的决策点
- 可能在未来引发争议的决策

#### 5.3.2 ADR 模板

```markdown
# ADR-NNN: [简短标题]

## 状态

Proposed / Accepted / Deprecated / Superseded

## 上下文

[描述驱使我们做出这个决策的问题或背景]

## 决策

[我们决定做什么，用一句话概括]

## 方案选项

### 选项 A: [名称]

[优点]
[缺点]

### 选项 B: [名称]

[优点]
[缺点]

### 选项 C: [名称] (推荐)

[优点]
[缺点]

## 理由

[为什么选择的方案优于其他选项]

## 后果

[采用这个决策后的影响，包括正面和负面]

## 关联

- Issue: #
- PR: #
- 影响: [受影响的模块/文件列表]
```

#### 5.3.3 本项目预设 ADR 清单

| ADR 编号 | 标题                                                 | 预计提出时间 |
| -------- | ---------------------------------------------------- | ------------ |
| ADR-001  | Agent 并发模型选择：Worker Threads vs Cluster        | Week 3       |
| ADR-002  | 消息队列选型：RabbitMQ vs Redis Stream vs Kafka      | Week 3       |
| ADR-003  | LLM Provider 选型与路由策略                          | Week 3       |
| ADR-004  | 区块链存证方案：自建合约 vs 第三方存证服务           | Week 5       |
| ADR-005  | 电子签名方案：自研 vs 集成法大大/e签宝               | Week 5       |
| ADR-006  | 文件存储选型：MinIO vs 阿里云 OSS vs AWS S3          | Week 1       |
| ADR-007  | 获客数据同步架构：Polling vs Webhook vs Streaming    | Week 7       |
| ADR-008  | 前端状态管理方案：Context + Zustand vs Redux Toolkit | Week 8       |
| ADR-009  | 监控方案：Prometheus + Grafana vs 商业 APM           | Week 11      |
| ADR-010  | CI/CD 策略：GitHub Actions vs Jenkins vs GitLab CI   | Week 1       |

### 5.4 定期审查机制

#### 5.4.1 周审查 (Weekly Review)

**时间**: 每周五 16:00-17:00
**参与者**: 全体开发人员 + 产品负责人
**议程**:

| 序号 | 议题                     | 时长  | 产出              |
| ---- | ------------------------ | ----- | ----------------- |
| 1    | 本周完成任务回顾         | 10min | 完成清单          |
| 2    | 当前进度 vs 计划偏差分析 | 10min | 偏差报告          |
| 3    | 下周计划与风险评估       | 15min | 下周任务卡        |
| 4    | 阻塞问题讨论与决策       | 15min | 决策记录          |
| 5    | 技术债务识别             | 10min | Tech Debt Backlog |

**审查产出物**: `docs/reviews/weekly-YYYY-MM-DD.md`

#### 5.4.2 里程碑审查 (Milestone Review)

**时间**: 每个里程碑完成后 2 个工作日内
**参与者**: 全体成员 + 利益相关者（Stakeholders）
**议程**:

| 序号 | 议题                   | 验证方式              |
| ---- | ---------------------- | --------------------- |
| 1    | 里程碑验收标准逐条核查 | Checklist 签字        |
| 2    | 质量指标达成情况       | 测试报告 + 覆盖率报告 |
| 3    | 风险登记册更新         | 新增/关闭/重新评估    |
| 4    | 下一里程碑计划确认     | 计划签字              |
| 5    | 经验教训总结           | Lessons Learned 文档  |

**审查产出物**: `docs/reviews/milestone-M{N}-review.md`

#### 5.4.3 代码审查 (Code Review) 规范

**触发条件**: 所有 PR/MR 必须经过 Code Review 才能合并

**审查清单 (Checklist)**:

```
□ 功能完整性: 代码实现了 PR 描述的全部功能吗？
□ 测试覆盖: 有对应的单元/集成测试吗？
□ 类型安全: 没有 any 类型滥用吗？（除 DTO 解析）
□ 错误处理: 异常路径有合理的处理吗？
□ 性能: 没有 N+1 查询 / 内存泄漏 / 不必要的循环吗？
□ 安全: 没有硬编码密钥 / SQL 注入风险 / XSS 风险吗？
□ 命名: 符合项目命名规范吗？
□ 文档: 公共 API 有 JSDoc 注释吗？
□ 日志: 关键操作有适当的日志输出吗？
□ 向后兼容: 不破坏现有 API 吗？（如涉及）
```

**审查 SLA**:

- 普通 PR: 24 小时内给出首次 Review 意见
- Hotfix PR: 4 小时内给出首次 Review 意见
- Blocker 问题: 2 小时内响应

### 5.5 变更控制流程

#### 5.5.1 变更分类

| 类别          | 定义                     | 审批层级                   | 示例                                     |
| ------------- | ------------------------ | -------------------------- | ---------------------------------------- |
| **L1 - 微小** | 不影响功能和接口的改动   | Developer 自主             | 注释修正、格式调整、日志优化             |
| **L2 - 小**   | 影响单个模块内部实现     | Tech Lead 审批             | 方法重构、Bug 修复、新增私有函数         |
| **L3 - 中**   | 影响模块间接口或数据结构 | Tech Lead + Architect      | API 签名变更、Schema 修改、新增 DTO 字段 |
| **L4 - 大**   | 影响系统架构或多模块协同 | 全团队评审 + Product Owner | 新增模块、技术选型变更、数据库迁移       |
| **L5 - 关键** | 影响范围大且不可逆       | Steering Committee 审批    | 数据库 Schema 重大重构、核心协议变更     |

#### 5.5.2 变更流程

```
                    ┌──────────────────┐
                    │   变更请求提出     │
                    │  (Issue/PR 描述)  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │   影响范围评估     │
                    │  (Impact Analysis)│
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         [L1-L2]        [L3-L4]        [L5]
              │              │              │
         自主/TechLead   团队评审       委员会审批
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼─────────┐
                    │   实施变更         │
                    │  (Coding + Test)  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │   验证与发布       │
                    │  (Review + Merge) │
                    └──────────────────┘
```

#### 5.5.3 变更记录

所有 L3 及以上变更必须记录到变更日志：

```markdown
## 变更日志

| 日期  | 变更ID  | 类别 | 模块   | 描述                        | 影响评估       | 审批人    | 状态     |
| ----- | ------- | ---- | ------ | --------------------------- | -------------- | --------- | -------- |
| 06-11 | CHG-001 | L4   | Schema | 新增 7 个 AI 自动化相关模型 | 影响迁移和Seed | Architect | Approved |
```

---

## 附录

### A. 术语表

| 术语    | 全称                         | 说明                           |
| ------- | ---------------------------- | ------------------------------ |
| DID     | Decentralized Identity       | 分布式数字身份                 |
| SBT     | Soul Bound Token             | 灵魂绑定代币（不可转移）       |
| KYC     | Know Your Customer           | 了解你的客户（身份认证）       |
| BPM     | Business Process Management  | 业务流程管理                   |
| LLM     | Large Language Model         | 大语言模型                     |
| Agent   | Intelligent Agent            | 智能代理（自主运行的 AI 程序） |
| n8n     | -                            | 开源工作流自动化平台           |
| ADR     | Architecture Decision Record | 架构决策记录                   |
| SLA     | Service Level Agreement      | 服务水平协议                   |
| QPS     | Queries Per Second           | 每秒查询数                     |
| P50/P99 | Percentile                   | 百分位数（响应时间指标）       |
| RPC     | Remote Procedure Call        | 远程过程调用（区块链节点通信） |
| IPFS    | InterPlanetary File System   | 星际文件系统（分布式存储）     |
| E2E     | End-to-End                   | 端到端（全链路）               |
| OOM     | Out of Memory                | 内存溢出                       |
| CSRF    | Cross Site Request Forgery   | 跨站请求伪造                   |
| XSS     | Cross Site Scripting         | 跨站脚本攻击                   |

### B. 技术栈总览

| 层级         | 技术                           | 版本   | 用途                             |
| ------------ | ------------------------------ | ------ | -------------------------------- |
| **后端框架** | NestJS                         | 10.x   | API 服务框架                     |
| **ORM**      | Prisma                         | 5.x    | 数据库 ORM                       |
| **数据库**   | PostgreSQL                     | 16     | 主数据库（生产）/ SQLite（开发） |
| **缓存**     | Redis                          | 7.x    | 缓存 + Session + Pub/Sub         |
| **消息队列** | RabbitMQ                       | 3.x    | Agent 任务队列                   |
| **对象存储** | MinIO                          | 最新版 | 文件/文档存储                    |
| **工作流**   | n8n                            | 最新版 | 自动化工作流引擎                 |
| **区块链**   | ethers.js                      | 6.x    | 以太坊生态交互                   |
| **LLM**      | OpenAI/Anthropic/DeepSeek/Qwen | -      | AI 大模型调用                    |
| **前端框架** | React                          | 19     | 管理后台 UI                      |
| **构建工具** | Vite                           | 7.x    | 前端构建                         |
| **UI 库**    | shadcn/ui + Radix              | -      | 组件库                           |
| **样式**     | Tailwind CSS                   | 4.x    | CSS 框架                         |
| **图表**     | Recharts                       | 2.x    | 数据可视化                       |
| **容器**     | Docker + Compose               | 最新版 | 容器化部署                       |
| **进程管理** | PM2                            | 最新版 | 生产进程管理                     |
| **CI/CD**    | GitHub Actions                 | -      | 持续集成/部署                    |
| **监控**     | Prometheus + Grafana           | -      | 监控告警                         |
| **签名**     | node-forge                     | -      | 密码学操作                       |
| **PDF**      | PDFKit                         | -      | PDF 生成                         |
| **测试**     | Jest + Supertest + Playwright  | -      | 测试框架                         |

### C. 环境矩阵

| 环境        | 用途       | URL                     | 数据库     | 特殊配置               |
| ----------- | ---------- | ----------------------- | ---------- | ---------------------- |
| Development | 本地开发   | localhost:3001          | SQLite     | 热重载、Debug 日志     |
| Staging     | 预发布验证 | staging.api.smyweb3.com | PostgreSQL | 接近生产的配置和数据量 |
| Production  | 正式生产   | api.smyweb3.com         | PostgreSQL | PM2 cluster、完整监控  |

---

> **文档结束**
>
> **审批区**:
>
> | 角色       | 姓名               | 日期                   | 签字         |
> | ---------- | ------------------ | ---------------------- | ------------ |
> | 架构师     | ********\_******** | \_**\_ / \_\_** / 2026 | **\_\_\_\_** |
> | 技术负责人 | ********\_******** | \_**\_ / \_\_** / 2026 | **\_\_\_\_** |
> | 产品负责人 | ********\_******** | \_**\_ / \_\_** / 2026 | **\_\_\_\_** |
> | 项目经理   | ********\_******** | \_**\_ / \_\_** / 2026 | **\_\_\_\_** |
