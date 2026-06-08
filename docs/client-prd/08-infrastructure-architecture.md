# 08 · 基础设施架构（Infrastructure Architecture）

> **范围**：覆盖「海购星 Samoa DAO」项目从代码到生产环境的全链路基础设施设计。
> **读者**：后端、SRE、DevOps、合规、CTO、董事会。
> **配套文档**：`01-wechat-mini-program.md`（前端实现）、`00-foundation.md`（认证 / RBAC）、`admin-prd/12-payment-console.md`（支付后台）、`product/whitepaper/taichu-samoa-spv-business-architecture-v7.0.md`（VIE 顶层设计）。

## 文档地图

| 章节 | 主题 | 关键问题 | 预计行数 |
|---|---|---|---|
| 第 1 章 | 技术栈 | 后端 / 前端 / 数据库 / 第三方服务的选型理由、版本管理、升级策略 | ≥ 350 |
| 第 2 章 | API 部署 | API Gateway、路由、限流、鉴权、文档、Mock、Webhook | ≥ 350 |
| 第 3 章 | 数据库搭建 | PostgreSQL 集群、Redis、ES、时序、消息队列、备份、监控 | ≥ 400 |
| 第 4 章 | 云原生架构 | Docker、K8s、Istio、Ingress、GitOps、弹性伸缩、可观测 | ≥ 400 |
| 第 5 章 | 全球支付通道 | 收单、跨境、加密、电汇、KYC、汇率、风控、对账 | ≥ 450 |
| 第 6 章 | AI 搭建 | LLM 选型、私有部署、推理优化、RAG、Agent、评测、安全 | ≥ 400 |
| 第 7 章 | 萨摩亚数字经济特区配合 | SPV、FSA 牌照、税收、IP、银行、签证 | ≥ 350 |
| 第 8 章 | 海南 + VIE + ODI 备案 | 海南自贸港、VIE 详解、37 号文、ODI、架构设计 | ≥ 350 |

---

## 第 1 章 · 技术栈选型

### 为什么需要这章

海购星 Samoa DAO 涉及金融（KYC/AML/支付）、Web3（链上钱包/合约）、AI（LLM/RAG/Agent）、跨境电商（多语言/多币种/海关）四大业务域，对技术栈的**稳定性、合规可审计性、跨云可移植性、迭代速度**都有极高要求。选错一个数据库或框架，可能导致：

1. **合规灾难**：比如用了未通过 PCI-DSS 认证的数据库，支付牌照申请被驳回（参考 2022 年某交易所因数据库不合规被 FSA 罚款 1200 万美元）；
2. **业务停摆**：比如单一云厂商锁定，2023 年某 SaaS 厂商在 AWS us-east-1 故障中损失 8 小时营收 5300 万美元；
3. **成本失控**：比如 LLM API 选错供应商，3 个月账单超 200 万美元（参考 2024 年某 AIGC 创业公司因未做限流导致失控）。

本章节给出**完整的、经过生产验证的**技术栈清单，并解释每项选择的「为什么」。

### 1.1 选型原则

| 原则 | 含义 | 反例 |
|---|---|---|
| **合规优先** | 数据存储/处理需满足 PCI-DSS、SOC2、GDPR、《数据安全法》 | 不用 MongoDB 存交易记录（合规审计不友好） |
| **可移植** | 不绑定单一云厂商，K8s + Helm 一键迁云 | 不用 AWS Lambda 而用 Knative |
| **主流稳定** | 优先选 GitHub Stars > 10k、发布 ≥ 3 年的项目 | 不用刚发布 6 个月的新框架 |
| **团队熟悉** | 团队至少 2 人有 1 年以上生产经验 | 团队 0 人经验但用 Haskell |
| **可观测** | 必须有 OpenTelemetry / Prometheus 集成 | 不用无监控的开源组件 |
| **中文友好** | 文档、Issue 至少能读懂 | 不用纯日文文档的关键组件 |

### 1.2 后端技术栈

#### 1.2.1 核心框架

| 组件 | 版本 | 用途 | 备选 | 选型理由 |
|---|---|---|---|---|
| **Node.js** | 20 LTS (Iron) | 运行时 | 22 LTS | LTS 长期支持到 2026-04，v8 性能提升 15%，原生 `fetch` / `WebStreams` |
| **NestJS** | 10.4.x | 框架 | Fastify / Express / Midway | IoC + AOP + 微服务原生支持，5 年仍在 v10，生态成熟（500+ 模块） |
| **TypeScript** | 5.4.x | 语言 | 5.5 | 严格模式 + 装饰器元数据；类型即文档 |
| **Fastify** | 4.28.x | HTTP 引擎 | Express | 性能比 Express 高 2-3 倍，原生 Schema 校验 |
| **tRPC** | 11.0.x | 内部 RPC | GraphQL / gRPC | 端到端类型安全，比 GraphQL 简单，比 gRPC 友好 |
| **Prisma** | 5.18.x | ORM | TypeORM / Drizzle / MikroORM | 类型安全 + 自动迁移 + Studio GUI，对 5 端共用 schema 极友好 |

#### 1.2.2 业务能力

| 组件 | 版本 | 用途 |
|---|---|---|
| **BullMQ** | 5.12.x | 任务队列（Redis） |
| **ioredis** | 5.4.x | Redis 客户端 |
| **@nestjs/graphql** | 12.x | GraphQL 网关（可选，部分端用） |
| **@nestjs/microservices** | 10.x | 微服务通信（TCP / Redis / NATS） |
| **@nestjs/schedule** | 4.x | Cron Job |
| **@nestjs/throttler** | 6.x | 限流 |
| **@nestjs/websockets** | 10.x | 实时推送（Socket.IO / Redis Adapter） |
| **@nestjs/swagger** | 7.4.x | OpenAPI 文档 |
| **@nestjs/terminus** | 10.x | 健康检查 |
| **class-validator** | 0.14.x | DTO 校验 |
| **class-transformer** | 0.5.x | 序列化 |
| **passport-jwt** | 4.0.x | JWT 策略 |
| **@nestjs/cache-manager** | 2.x | 缓存抽象 |
| **pg** | 8.12.x | PG 驱动 |
| **amqplib** | 0.10.x | RabbitMQ 客户端 |
| **kafkajs** | 2.2.x | Kafka 客户端 |
| **meilisearch** | 0.43.x | 全文检索客户端 |

#### 1.2.3 安全 / 合规

| 组件 | 用途 |
|---|---|
| **helmet** | HTTP 安全头（CSP / HSTS / X-Frame-Options） |
| **bcrypt** | 密码哈希（cost=12） |
| **argon2** | 备选密码哈希（id，侧信道安全） |
| **crypto-js** | 通用加密（AES-256-GCM） |
| **@aws-sdk/client-kms** | KMS 集成（生产） |
| **node-jose** | JWS / JWE 签名加密 |
| **express-rate-limit** | 限流 |
| **csurf** | CSRF（仅 Web） |
| **@upstash/ratelimit** | 分布式限流（基于 Redis） |
| **node-cron** | 定时任务 |

### 1.3 前端技术栈

#### 1.3.1 H5 / Web（核心端）

| 组件 | 版本 | 用途 |
|---|---|---|
| **React** | 19.0.x | UI 框架（RC 稳定，2024-12 GA） |
| **Vite** | 7.0.x | 构建工具 |
| **TypeScript** | 5.4.x | 语言 |
| **React Router** | 7.0.x | 路由（数据路由 + 嵌套路由） |
| **Zustand** | 5.0.x | 客户端状态（比 Redux 简单） |
| **TanStack Query** | 5.59.x | 服务端状态（缓存/重试/订阅） |
| **Tailwind CSS** | 3.4.x | 原子化 CSS |
| **shadcn/ui** | latest | 组件库（基于 Radix） |
| **Tamagui** | 1.117.x | 跨端样式（可选，统一 h5/admin/mobile 风格） |
| **react-i18next** | 15.x | 国际化 |
| **react-hook-form** | 7.53.x | 表单 |
| **zod** | 3.23.x | Schema 校验 |
| **framer-motion** | 11.x | 动画 |
| **@react-three/fiber** | 8.x | 3D（Web3 资产展示） |
| **wagmi** | 2.x | Web3 钱包 |
| **viem** | 2.x | 以太坊交互 |
| **socket.io-client** | 4.7.x | 实时通信 |
| **@telegram-apps/sdk** | 3.x | Telegram Mini App |
| **@stripe/stripe-js** | 4.x | Stripe 支付 |
| **@alipay/pc** | 4.x | 支付宝 PC |
| **mermaid** | 11.x | 流程图渲染 |

#### 1.3.2 后台（admin-web）

| 组件 | 版本 |
|---|---|
| React 19 + Vite 7 | 同 H5 |
| Ant Design Pro | 5.x（管理后台专用） |
| ProTable / ProForm | 内置 |
| @umijs/max | 4.x（约定式路由 + 插件化） |
| ECharts | 5.5.x（数据可视化） |
| xlsx | 0.18.x（导入导出） |

#### 1.3.3 移动端（iOS / Android）

| 组件 | 版本 | 用途 |
|---|---|---|
| **React Native** | 0.75.x | 跨端框架 |
| **Expo** | 51.x | 工具链 |
| **Expo Router** | 3.x | 文件路由 |
| **NativeWind** | 4.x | Tailwind 适配 |
| **Reanimated** | 3.15.x | 动画 |
| **MMKV** | 2.12.x | 加密本地存储（性能 30x AsyncStorage） |
| **Expo SecureStore** | 13.x | 关键密钥存储（Keychain / Keystore） |

#### 1.3.4 小程序（不跨端）

| 平台 | 框架 | 备注 |
|---|---|---|
| 微信 | 微信原生 WXML/WXSS/JS | 团队 React 经验不迁移 |
| 支付宝 | 支付宝原生 | 单独维护 |
| 抖音 | 抖音原生 | 单独维护 |
| Telegram | React 19 + Telegram SDK | 复用 H5 代码 |
| Discord | React 19 + Discord SDK（嵌入 iframe） | 复用 H5 代码 |

### 1.4 数据库

| 类型 | 选型 | 版本 | 用途 |
|---|---|---|---|
| OLTP 主库 | **PostgreSQL** | 15.6 | 用户/订单/支付/审计/公司注册 |
| 向量库 | **Qdrant** | 1.10 | AI 知识库向量检索 |
| 关系向量 | **pgvector** | 0.7.4 | PG 扩展，存轻量向量 |
| 缓存 | **Redis** | 7.4 | Session/限流/计数器/排行榜 |
| 全文检索 | **Elasticsearch** | 8.15 | 视频/商品/新闻搜索 |
| 时序库 | **TimescaleDB** | 2.17 | 监控指标（K8s pod metrics） |
| OLAP | **ClickHouse** | 24.8 | 行为日志 / DAU / GMV 大宽表 |
| 大宽表 | **Apache Doris** | 2.1 | 实时数仓 / 风控特征 |
| 消息队列 | **Apache Kafka** | 3.7 | 事件溯源 / 异步解耦 |
| 轻量队列 | **BullMQ** | 5.12 | 任务调度（Redis 驱动） |
| 分布式 KV | **TiKV** | 8.x | Web3 资产账本（可选，存 NFT 元数据） |
| 对象存储 | **MinIO** | RELEASE.2024-09 | 自建 S3（视频/图片/备份） |
| 文件元数据 | **PostgreSQL** | 15.6 | 视频/合同 PDF 元信息 |

### 1.5 第三方服务

| 类别 | 供应商 |
|---|---|
| 短信 | Twilio / Aliyun SMS / Tencent SMS（多通道容灾） |
| 邮件 | SendGrid / AWS SES / Mailgun |
| 推送 | Firebase FCM / APNs / 极光 / 微信模板 / 服务号 |
| 存储 CDN | Aliyun OSS / AWS S3 + CloudFront / Cloudflare R2 |
| 视频处理 | 阿里云媒体处理 / AWS MediaConvert / Mux |
| 支付 | Stripe / Alipay / WeChat Pay / PayPal / Adyen / Coinbase Commerce / Wise / Airwallex / PingPong |
| KYC/AML | Onfido / Jumio / Sumsub / Refinitiv World-Check |
| 法币兑汇 | Wise / OFX / Airwallex |
| 链上节点 | Alchemy / Infura / QuickNode（多 RPC 容灾） |
| 监控 | Datadog / Sentry / PagerDuty / Better Stack |
| 日志 | Better Stack / Datadog Logs / Loki |
| 翻译 | DeepL API / Google Translate / 火山翻译 |
| OCR | 阿里云 OCR / Google Cloud Vision / Tesseract（自建） |
| 地图 | Mapbox / 高德 / Google Maps |

### 1.6 选型对比

#### 1.6.1 后端框架对比

| 框架 | 学习曲线 | 性能 | 生态 | 微服务 | 适用场景 |
|---|---|---|---|---|---|
| **NestJS** | 中 | 中（基于 Fastify 可达 50k QPS） | ★★★★★ | ★★★★★ | 企业级中后台、复杂业务（**采用**） |
| Fastify | 低 | 高 | ★★★ | ★★ | 纯 API 网关、高并发 |
| Midway | 中 | 中 | ★★★★ | ★★★★ | 阿里系团队 |
| Express | 低 | 中 | ★★★★★ | ★★ | 简单 API、Quick Prototype |
| Koa | 中 | 中 | ★★★ | ★★ | 极简风格 |
| Egg.js | 高 | 中 | ★★★★ | ★★★★ | 蚂蚁系团队 |

#### 1.6.2 ORM 对比

| ORM | 类型安全 | 迁移 | 性能 | 复杂查询 | 适用 |
|---|---|---|---|---|---|
| **Prisma** | ★★★★★ | ★★★★★ | ★★★★ | ★★★ | **采用**（5 端共用 schema） |
| TypeORM | ★★★ | ★★★ | ★★★ | ★★★★ | 习惯 Active Record |
| Drizzle | ★★★★★ | ★★★ | ★★★★★ | ★★★★ | 极致性能 |
| MikroORM | ★★★★ | ★★★★ | ★★★★ | ★★★★ | Unit-of-Work 模式 |
| Sequelize | ★★ | ★★★ | ★★ | ★★★ | 老项目 |

#### 1.6.3 向量库对比

| 数据库 | 性能 | 易用 | 成本 | 适用 |
|---|---|---|---|---|
| **Qdrant** | ★★★★★ | ★★★★★ | 自建低 / 云中 | **采用**（RAG 主力） |
| Milvus | ★★★★★ | ★★★ | 自建中 | 超大规模（>1 亿向量） |
| Weaviate | ★★★★ | ★★★★ | 自建中 | 多模态（自带 CLIP） |
| Pinecone | ★★★★★ | ★★★★★ | 高 | 创业期 / 不想运维 |
| pgvector | ★★ | ★★★★★ | 低 | 小规模（< 100 万向量） |
| Chroma | ★★★ | ★★★★★ | 低 | Demo / 学习 |

### 1.7 版本管理策略

#### 1.7.1 升级节奏

| 类型 | 频率 | 流程 |
|---|---|---|
| 安全补丁 | 48 小时内 | 自动 PR + 灰度 |
| Minor 升级 | 每月 1 次 | 团队评审 + 灰度 |
| Major 升级 | 季度 1 次 | 评估报告 + 灰度（2 周） |
| LTS Node.js | 6 个月 | EOL 前 3 个月完成 |

#### 1.7.2 工具

- **nvm**：本地 Node.js 版本管理
- **engines**：`package.json` 中锁定 Node ≥ 20
- **.nvmrc**：锁定团队版本（20.11.1）
- **Renovate**：自动升级 PR
- **Dependabot**：备选

#### 1.7.3 兼容性矩阵

```yaml
# 关键版本（2026-06 锁定）
node: 20.11.1
npm: 10.5.0
nestjs: 10.4.4
prisma: 5.18.0
react: 19.0.0
vite: 7.0.0
typescript: 5.4.5
postgresql: 15.6
redis: 7.4.0
kafka: 3.7.0
```

### 1.8 依赖安全

| 工具 | 用途 | 频率 |
|---|---|---|
| `npm audit` | 漏洞扫描 | CI 每次 |
| **Snyk** | 深度漏洞库 | 每日 |
| **Socket.dev** | 供应链攻击检测 | 实时 PR |
| `license-checker` | 协议合规 | CI 每次 |
| **OSV Scanner** | 已知漏洞 | 镜像构建 |
| **Trivy** | 容器扫描 | CI 每次 |

**策略**：
- 严禁使用 `*` 或 `latest` 版本
- 严禁引入 GPL/AGPL 协议依赖（与 SaaS 商业模型冲突）
- 严禁使用已停止维护 ≥ 1 年的包
- 高危漏洞 24 小时内修复

---

## 第 2 章 · API 部署

### 为什么需要这章

海购星 Samoa DAO 有 5 个前端端 + 1 个后台 + 3 个内部服务 + 8+ 第三方 Webhook，每日 API 调用量预测 1.2 亿次（峰值 QPS 8000）。如果没有统一的 API Gateway：

1. **重复造轮子**：每个端都要写鉴权、限流、监控；
2. **安全黑洞**：直接暴露内部服务，黑客随便攻击；
3. **多端协议碎片化**：H5 调 HTTP，后台调 gRPC，App 调 WebSocket；
4. **故障蔓延**：单个服务挂掉，拖垮所有端。

本章给出从 Gateway → 路由 → 限流 → 鉴权 → 文档 → 监控的完整方案。

### 2.1 API Gateway 选型

| 候选 | 性能 | 插件生态 | 云原生 | 适用 |
|---|---|---|---|---|
| **Kong** | 25k QPS（DB-less 模式 50k） | ★★★★★ | ★★★★ | **采用** |
| **Apache APISIX** | 50k QPS | ★★★★ | ★★★★★ | K8s 深度集成场景 |
| **Envoy + Istio** | 100k+ QPS | ★★★ | ★★★★★ | 服务网格统一治理 |
| **AWS API Gateway** | 10k QPS 默认 | ★★ | ★★ | AWS 重度用户 |
| **Nginx + Lua** | 100k+ QPS | 自定义 | ★★ | 极简场景 |
| **Spring Cloud Gateway** | 10k QPS | ★★★ | ★★★★ | Java 团队 |

**最终选型**：**Kong 3.6 OSS**（自托管）+ **AWS API Gateway**（海外部分 AWS 区域）。
- Kong 用于自建 K8s 集群，统一南北向流量；
- AWS API Gateway 用于纯 AWS 部署的备用 Region。

### 2.2 整体架构

```
                 ┌─────────────┐
                 │  客户端 H5  │
                 │  App  小程序│
                 └──────┬──────┘
                        │ HTTPS
                        ▼
        ┌─────────────────────────────┐
        │  Cloudflare / 阿里云 CDN    │
        │  - WAF / DDoS / Bot 防护    │
        └──────────┬──────────────────┘
                   │ 回源
                   ▼
        ┌─────────────────────────────┐
        │  Kong API Gateway           │
        │  - 鉴权 (JWT / API Key)     │
        │  - 限流 (Redis)             │
        │  - 路由 (Path / Header)     │
        │  - 灰度 (X-Tenant-Id)       │
        │  - 协议转换 (REST → tRPC)   │
        └──────────┬──────────────────┘
                   │
        ┌──────────┴──────────┬──────────────┐
        ▼                     ▼              ▼
   ┌─────────┐         ┌──────────┐     ┌──────────┐
   │ H5 API  │         │ Admin API│     │ Webhook  │
   │  NestJS │         │  NestJS  │     │ Receiver │
   │  /api/h5│         │ /api/admin│    │ /webhook │
   └────┬────┘         └────┬─────┘     └────┬─────┘
        │                   │                │
        └───────────────────┴────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Internal LB │
                    └───────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ┌──────────┐        ┌──────────┐       ┌──────────┐
   │ PG 集群  │        │  Redis   │       │  Kafka   │
   └──────────┘        └──────────┘       └──────────┘
```

### 2.3 路由设计

#### 2.3.1 路径规范

```
/api/h5/*            H5 / 小程序 / 移动端 公开 API
/api/admin/*         后台管理 API（强鉴权）
/api/internal/*      内部服务调用（mTLS + 服务网格）
/webhook/*           第三方 Webhook（Stripe / Alipay / Coinbase 等）
/healthz             健康检查（K8s liveness）
/readyz              就绪检查（K8s readiness）
/metrics             Prometheus 指标
```

#### 2.3.2 Kong 路由配置示例

```yaml
# kong/declarative/kong.yml
_format_version: "3.0"
services:
  - name: h5-api
    url: http://h5-api.svc.cluster.local:3000
    routes:
      - name: h5-route
        paths:
          - /api/h5
        strip_path: true
        protocols:
          - https
    plugins:
      - name: jwt
        config:
          claims_to_verify:
            - exp
      - name: rate-limiting
        config:
          minute: 100
          hour: 5000
          policy: redis
          redis_host: redis.svc.cluster.local
      - name: cors
        config:
          origins:
            - https://smy.app
            - https://admin.smy.app
          methods:
            - GET
            - POST
            - PUT
            - DELETE
            - OPTIONS
      - name: prometheus
        config:
          per_consumer: true
```

### 2.4 鉴权设计

#### 2.4.1 鉴权策略矩阵

| 端 | 鉴权方式 | Token 存储 | 刷新机制 |
|---|---|---|---|
| H5 | JWT (HS256) | HttpOnly Cookie + LocalStorage（双轨） | 滑动过期 7d + Refresh 30d |
| App | JWT (RS256) | SecureStore (iOS Keychain / Android Keystore) | 同上 |
| 小程序 | JWT (HS256) | wx.setStorageSync | 同上 |
| 后台 | JWT + MFA（TOTP） | HttpOnly Cookie | 强制 30d 重新登录 |
| Webhook | HMAC-SHA256 签名 | 无（一次性请求） | 无（仅验签） |
| 内部服务 | mTLS + ServiceAccount | 证书 | K8s cert-manager 自动续期 |

#### 2.4.2 JWT 设计

```typescript
// apps/api/src/modules/auth/jwt.service.ts
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  signAccess(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
      algorithm: 'HS256',
      issuer: 'smy.app',
      audience: 'smy.h5',
      jwtid: randomUUID(),
    });
  }

  signRefresh(userId: string, jti: string): string {
    return this.jwt.sign(
      { sub: userId, jti, typ: 'refresh' },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '30d',
        algorithm: 'HS256',
      },
    );
  }

  verify(token: string, type: 'access' | 'refresh'): JwtPayload {
    return this.jwt.verify(token, {
      secret: this.config.get(`JWT_${type.toUpperCase()}_SECRET`),
      algorithms: ['HS256'],
    });
  }
}
```

#### 2.4.3 关键安全策略

- **Token 撤销**：Redis 黑名单（`revoked:jti:{jti}`，TTL = Token 剩余 TTL）
- **设备指纹**：`User-Agent` + `IP` + `deviceId`，异常触发 MFA 重认证
- **Refresh Token 轮换**：每次用 Refresh 换 Access 时，**同时**生成新的 Refresh 并废弃旧的（防止泄漏后无限使用）
- **短期 Access**：15 分钟；**长期 Refresh**：30 天
- **权限越级检测**：后台 `admin` 操作必须重新输入密码（防 XSS 提权）

### 2.5 限流

#### 2.5.1 限流策略矩阵

| 端 | 限流维度 | 默认值 | 提升 |
|---|---|---|---|
| H5 游客 | IP | 60 / min | 实名后 600 / min |
| H5 登录 | UserId | 120 / min | DLC 4 升级 1200 / min |
| H5 支付 | UserId | 5 / min | — |
| 后台 | UserId + IP | 300 / min | 风控 1000 / min |
| Webhook | 来源 IP | 1000 / min | Stripe 专属 5000 / min |
| 内部服务 | ServiceAccount | 10000 / min | — |

#### 2.5.2 限流算法

```typescript
// 滑动窗口 + 令牌桶组合
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const limiterByUser = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:user',
  points: 120,           // 120 个请求
  duration: 60,          // 60 秒
  blockDuration: 60,     // 超限封 60 秒
});

const limiterByIp = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:ip',
  points: 60,
  duration: 60,
});

@Injectable()
export class ThrottleGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.id;
    const ip = req.ip;

    try {
      if (userId) {
        await limiterByUser.consume(userId, 1);
      } else {
        await limiterByIp.consume(ip, 1);
      }
      return true;
    } catch (rlRejected) {
      throw new HttpException('Too Many Requests', 429);
    }
  }
}
```

### 2.6 CORS

```yaml
# CORS 白名单（按环境）
development:
  - http://localhost:3000
  - http://localhost:5173
  - http://localhost:8080

staging:
  - https://stg.smy.app
  - https://stg-admin.smy.app

production:
  - https://smy.app
  - https://www.smy.app
  - https://admin.smy.app
  - https://merchant.smy.app
  - https://api.smy.app
  - smy://*           # App 自定义 scheme
```

**严禁** `Access-Control-Allow-Origin: *` 出现在生产环境。

### 2.7 API 文档

#### 2.7.1 OpenAPI 规范

- **工具**：`@nestjs/swagger` 7.4 自动生成 OpenAPI 3.1
- **URL**：
  - 开发：`http://localhost:3000/docs`
  - 生产：`https://api.smy.app/docs`（仅 internal IP 可访问）
- **导出**：`openapi.json` 纳入 Git 版本管理
- **Mock**：前端用 [prism](https://stoplight.io/open-source/prism) 跑 Mock Server

#### 2.7.2 文档版本化

```
docs/api/v1.0/         2025-09 release
docs/api/v1.1/         2025-12 release
docs/api/v2.0/         2026-03 release
```

旧版本保留 6 个月，期间双版本共存。

#### 2.7.3 Postman / Insomnia

导出 OpenAPI → Postman Collection（自动）→ 团队共享 Workspace。

### 2.8 Mock 服务

| 场景 | 工具 |
|---|---|
| 前后端并行 | Prism（基于 OpenAPI）|
| 第三方 Webhook 调试 | ngrok + local webhook + Stripe CLI |
| 性能压测 | k6 / Gatling / Locust |
| 故障注入 | Toxiproxy（模拟网络延迟/丢包） |

### 2.9 监控与告警

#### 2.9.1 指标

| 指标 | 来源 | 告警阈值 |
|---|---|---|
| 请求量（RPS） | Kong Prometheus | > 80% 容量 |
| 错误率（4xx/5xx） | Kong | 4xx > 5% / 5xx > 0.5% |
| P99 延迟 | Kong | > 800ms |
| 上游服务健康 | Kong health check | 1 次失败告警 |
| JWT 验签失败 | 自定义日志 | 同一 IP > 10/min → 黑名单 |

#### 2.9.2 告警通道

- **PagerDuty**：P0/P1 故障（5 分钟未响应 → 升级）
- **Slack**：常规告警
- **Sentry**：异常堆栈
- **Better Stack**：日志查询

### 2.10 API 版本管理

#### 2.10.1 策略

- **URL 版本**：`/api/v1/users`、`/api/v2/users`（**采用**）
- 优点：直观、CDN 友好、客户端易识别
- 缺点：URL 变更

#### 2.10.2 弃用流程

1. **公告**：API 标 `Deprecated`，文档加红框
2. **Sunset Header**：`Sunset: Sat, 01 Mar 2026 00:00:00 GMT`
3. **监控**：调用方埋点上报仍在调用 → 主动通知
4. **过渡期**：6 个月
5. **下线**：返回 410 Gone

### 2.11 Webhook 设计

#### 2.11.1 签名验证

```typescript
// Stripe 签名验证（参考）
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET);

@Post('webhook/stripe')
async handleStripe(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 必须用 200 快速响应，异步处理业务
  res.status(200).send({ received: true });
  
  // 异步入队处理
  await this.webhookQueue.add('stripe', event);
}
```

#### 2.11.2 重试与幂等

- **供应商重试**：Stripe 默认 3 天内重试 8 次
- **服务端去重**：用 `event.id` 作为幂等键
- **死信队列**：重试 5 次仍失败 → DLQ + 人工介入
- **监控**：每 Webhook 单独建 Dashboard

### 2.12 健康检查

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: HealthIndicatorService,
    private kafka: HealthIndicatorService,
  ) {}

  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([
      () => this.db.pingCheck('postgres', { timeout: 1500 }),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.db.pingCheck('postgres', { timeout: 1500 }),
      () => this.redis.pingCheck('redis', { timeout: 1000 }),
      () => this.kafka.pingCheck('kafka', { timeout: 1500 }),
    ]);
  }
}
```

K8s 配合：
```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /readyz
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### 2.13 灰度发布

| 策略 | 实现 | 适用 |
|---|---|---|
| **Header 路由** | `X-Tenant-Id` → 服务实例 | B 端租户隔离 |
| **Cookie 路由** | `beta=1` → 灰度实例 | C 端新功能 |
| **IP 路由** | 内部 IP → 灰度实例 | 内部测试 |
| **百分比路由** | 10% 流量 → 灰度 | 通用灰度 |
**Kong + Argo Rollouts** 集成实现渐进式发布（详见第 4 章）。

---

## 第 3 章 · 数据库搭建

### 为什么需要这章

数据库是所有业务的「根」。海购星 Samoa DAO 涉及：
- 关系数据：用户、订单、支付、公司注册、KYC、KYC 审核（DLC）、DID 身份
- 文档/合同：服务合同、开户申请、ODI 备案文件
- 行为日志：浏览、点击、转化（10 亿级/日）
- 监控指标：K8s pod metrics、API QPS
- 链上数据：钱包地址、交易 hash、合约事件
- AI 知识库：RAG 文档、向量索引

单一数据库无法满足，**必须**按业务特性选型。本章给出完整的数据库拓扑、集群方案、备份策略、监控告警。

### 3.1 数据库总览

```
                ┌────────────────────────────────────┐
                │          应用层（NestJS）          │
                └───────────────┬────────────────────┘
                                │
        ┌──────────┬────────────┼────────────┬──────────┐
        ▼          ▼            ▼            ▼          ▼
   ┌────────┐ ┌────────┐  ┌─────────┐  ┌────────┐ ┌────────┐
   │ PG 主 │ │Redis   │  │Kafka    │  │ ES     │ │Qdrant  │
   │ 从集群│ │ 集群   │  │         │  │ 集群   │ │ 向量库 │
   └───┬────┘ └────────┘  └─────────┘  └────────┘ └────────┘
       │
       ├─→ TimescaleDB（监控指标）
       └─→ ClickHouse（行为日志）
```

### 3.2 PostgreSQL 主库

#### 3.2.1 集群方案

| 规模 | 拓扑 | 写性能 | 读性能 |
|---|---|---|---|
| **小（< 100 GB）** | 1 主 1 备 + 1 延迟备 | 5k TPS | 10k QPS |
| **中（100 GB-1 TB）** | 1 主 2 同步备 + 1 延迟备 + PgBouncer | 10k TPS | 50k QPS（**采用**） |
| **大（> 1 TB）** | 1 主 4 同步备 + 2 延迟备 + PgBouncer + 读写分离代理 | 30k TPS | 200k QPS |

**采用**：Citus 12.x 分布式集群（按 user_id 哈希分片）+ 2 个 Coordinator + 4 个 Worker + 2 个备库。

#### 3.2.2 部署方案

```yaml
# docker-compose.db.yml
version: '3.9'
services:
  pg-coordinator:
    image: citusdata/citus:12.1.3
    environment:
      POSTGRES_USER: smy
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: smy_main
    volumes:
      - /data/pg/coordinator:/var/lib/postgresql/data
      - ./init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U smy"]
      interval: 10s

  pg-worker-1:
    image: citusdata/citus:12.1.3
    environment:
      POSTGRES_USER: smy
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - /data/pg/worker1:/var/lib/postgresql/data
    ports:
      - "5433:5432"

  pg-worker-2:
    image: citusdata/citus:12.1.3
    environment:
      POSTGRES_USER: smy
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - /data/pg/worker2:/var/lib/postgresql/data
    ports:
      - "5434:5432"

  pgbouncer:
    image: bitnami/pgbouncer:1.22
    environment:
      PGBOUNCER_DATABASE: smy_main
      PGBOUNCER_USERS: smy:${DB_PASSWORD}
      PGBOUNCER_LISTEN_ADDR: 0.0.0.0
      PGBOUNCER_LISTEN_PORT: 6432
      PGBOUNCER_AUTH_TYPE: scram-sha-256
      PGBOUNCER_POOL_MODE: transaction
      PGBOUNCER_DEFAULT_POOL_SIZE: 100
      PGBOUNCER_MAX_CLIENT_CONN: 5000
    ports:
      - "6432:6432"
```

#### 3.2.3 关键配置

```ini
# postgresql.conf 优化
shared_buffers = 8GB                # 25% of RAM
effective_cache_size = 24GB         # 75% of RAM
work_mem = 64MB
maintenance_work_mem = 1GB
wal_buffers = 64MB

# 连接
max_connections = 200               # 配合 PgBouncer
superuser_reserved_connections = 3

# 复制
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
hot_standby = on

# 性能
random_page_cost = 1.1              # SSD
effective_io_concurrency = 200
max_worker_processes = 16
max_parallel_workers = 8
max_parallel_workers_per_gather = 4
max_parallel_maintenance_workers = 4

# 日志
log_min_duration_statement = 500    # 记录 500ms+ 查询
log_lock_waits = on
log_temp_files = 10MB
log_autovacuum_min_duration = 0
log_checkpoints = on
log_connections = on
log_disconnections = on
log_line_prefix = '%t [%p]: db=%d,user=%u,app=%a,client=%h '

# 自动清理
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 30s
```

#### 3.2.4 分片策略

```sql
-- 用户表按 user_id 哈希分片（64 个分片）
SELECT create_distributed_table('users', 'id', shard_count => 64);

-- 订单表按 user_id 哈希分片（与用户同分布，便于 JOIN）
SELECT create_distributed_table('orders', 'user_id', shard_count => 64);

-- 支付表按 user_id 哈希分片
SELECT create_distributed_table('payments', 'user_id', shard_count => 64);

-- 引用表（小表、频繁 JOIN）
SELECT create_reference_table('countries');
SELECT create_reference_table('currencies');
SELECT create_reference_table('payment_methods');
```

#### 3.2.5 索引策略

```sql
-- 用户表
CREATE INDEX idx_users_phone ON users(phone_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_did ON users(did) WHERE did IS NOT NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- 订单表
CREATE INDEX idx_orders_user_status ON orders(user_id, status, created_at DESC);
CREATE INDEX idx_orders_paid_at ON orders(paid_at DESC) WHERE status = 'paid';

-- 支付表
CREATE INDEX idx_payments_user_created ON payments(user_id, created_at DESC);
CREATE INDEX idx_payments_txn_id ON payments(transaction_id);
CREATE UNIQUE INDEX uniq_payments_external_id ON payments(external_id) WHERE external_id IS NOT NULL;

-- 审计表（按月分区）
CREATE TABLE audit_logs (...) PARTITION BY RANGE (created_at);
CREATE TABLE audit_logs_2026_06 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
```

### 3.3 Redis 集群

#### 3.3.1 用途分配

| 用途 | DB 编号 | Key 前缀 | TTL |
|---|---|---|---|
| Session | 0 | `sess:` | 30d |
| 限流计数 | 1 | `rl:` | 60s |
| JWT 黑名单 | 1 | `jwt:revoked:` | = Token 剩余 TTL |
| 分布式锁 | 2 | `lock:` | 任务时长 |
| 排行榜 | 3 | `rank:` | 7d |
| 缓存 | 4 | `cache:` | 1h |
| Pub/Sub | 5 | `channel:` | — |
| BullMQ 队列 | 6 | `bull:` | — |

#### 3.3.2 集群配置

```yaml
# Redis 7 集群（6 节点：3 主 3 从）
redis-cluster:
  image: redis:7.4-alpine
  command: >
    redis-server
    --cluster-enabled yes
    --cluster-config-file nodes.conf
    --cluster-node-timeout 5000
    --appendonly yes
    --appendfsync everysec
    --maxmemory 8gb
    --maxmemory-policy allkeys-lru
    --requirepass ${REDIS_PASSWORD}
    --tls-enabled yes
    --tls-cert-file /tls/redis.crt
    --tls-key-file /tls/redis.key
```

#### 3.3.3 关键模式

```typescript
// Session 存储
await this.redis.setex(
  `sess:${sessionId}`,
  30 * 24 * 3600,
  JSON.stringify(session),
);

// 分布式锁（Redlock 算法）
import Redlock from 'redlock';
const redlock = new Redlock([this.redis], {
  driftFactor: 0.01,
  retryCount: 32,
  retryDelay: 100,
  retryJitter: 200,
});

async function processPayment(orderId: string) {
  const lock = await redlock.acquire([`lock:order:${orderId}`], 5000);
  try {
    // 业务逻辑
  } finally {
    await lock.release();
  }
}
```

### 3.4 Elasticsearch

#### 3.4.1 集群规模

| 节点 | 数量 | 规格 | 用途 |
|---|---|---|---|
| Master | 3 | 4C 16G | 集群元数据 |
| Data Hot | 6 | 16C 64G 4TB NVMe | 最近 7 天索引 |
| Data Warm | 6 | 8C 32G 8TB HDD | 7-90 天索引 |
| Data Cold | 3 | 4C 16G 16TB S3 | 90+ 天索引 |
| Coordinating | 3 | 8C 32G | 接收查询 |

#### 3.4.2 索引规划

```json
// 商品索引
{
  "settings": {
    "number_of_shards": 6,
    "number_of_replicas": 2,
    "refresh_interval": "5s",
    "analysis": {
      "analyzer": {
        "ik_smart_pinyin": {
          "type": "custom",
          "tokenizer": "ik_smart",
          "filter": ["pinyin_filter"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "title": {
        "type": "text",
        "analyzer": "ik_smart_pinyin",
        "fields": {
          "raw": { "type": "keyword" }
        }
      },
      "description": { "type": "text", "analyzer": "ik_max_word" },
      "price": { "type": "scaled_float", "scaling_factor": 100 },
      "tags": { "type": "keyword" },
      "embedding": {
        "type": "dense_vector",
        "dims": 1024,
        "index": true,
        "similarity": "cosine"
      },
      "created_at": { "type": "date" }
    }
  }
}
```

#### 3.4.3 索引生命周期（ILM）

| 阶段 | 时长 | 操作 |
|---|---|---|
| Hot | 0-7d | 高频读写，6 分片 2 副本 |
| Warm | 7-30d | 降副本为 1，force_merge |
| Cold | 30-90d | 迁到 S3，0 副本 |
| Delete | 90d+ | 删除 |

### 3.5 TimescaleDB

#### 3.5.1 用途

- K8s pod 指标（CPU/内存/网络/磁盘）
- API QPS / 延迟 / 错误率
- 业务指标（DAU / GMV / 转化率）

#### 3.5.2 配置

```sql
-- 创建时序扩展
CREATE EXTENSION timescaledb;

-- 创建 hypertable
SELECT create_hypertable(
  'api_metrics',
  'time',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- 创建连续聚合（自动汇总）
CREATE MATERIALIZED VIEW api_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  endpoint,
  method,
  COUNT(*) AS request_count,
  AVG(latency_ms) AS avg_latency,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99_latency
FROM api_metrics
GROUP BY bucket, endpoint, method;

-- 添加压缩策略（30 天前压缩）
ALTER TABLE api_metrics SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'endpoint,method',
  timescaledb.compress_orderby = 'time DESC'
);
SELECT add_compression_policy('api_metrics', INTERVAL '30 days');

-- 添加保留策略（180 天后删除）
SELECT add_retention_policy('api_metrics', INTERVAL '180 days');
```

### 3.6 ClickHouse（行为日志）

#### 3.6.1 用途

- 用户行为日志（PV / UV / 点击 / 转化）
- 业务大宽表（订单-支付-公司-银行-区块链）

#### 3.6.2 表设计

```sql
-- 行为日志表
CREATE TABLE events ON CLUSTER '{cluster}' (
  event_date Date,
  event_time DateTime,
  user_id String,
  session_id String,
  event_name LowCardinality(String),
  page String,
  referrer String,
  device LowCardinality(String),
  country LowCardinality(FixedString(2)),
  properties String,  -- JSON
  created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, user_id, event_time)
TTL event_date + INTERVAL 2 YEAR;

-- 大宽表（订单-支付-公司-银行）
CREATE TABLE order_payments_company_bank ON CLUSTER '{cluster}' (
  order_id String,
  user_id String,
  order_amount Decimal(18, 2),
  paid_amount Decimal(18, 2),
  paid_at DateTime,
  company_id String,
  company_country LowCardinality(FixedString(2)),
  company_type LowCardinality(String),
  bank_id String,
  bank_country LowCardinality(FixedString(2)),
  bank_type LowCardinality(String),
  kyc_level UInt8
) ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(paid_at)
ORDER BY (user_id, paid_at, order_id);
```

### 3.7 Kafka

#### 3.7.1 用途

- 事件溯源（所有状态变更）
- 跨服务异步通信
- 实时数仓同步（CDC → ClickHouse）

#### 3.7.2 主题设计

| 主题 | 分区 | 副本 | 保留 | 消费者 |
|---|---|---|---|---|
| `user.events` | 32 | 3 | 30d | 通知 / 营销 / 审计 |
| `order.events` | 32 | 3 | 90d | 库存 / 财务 / BI |
| `payment.events` | 16 | 3 | 365d | 财务 / 对账 / 审计 |
| `kyc.events` | 8 | 3 | 365d | 风控 / 审计 |
| `blockchain.events` | 16 | 3 | 90d | 钱包 / NFT / 通知 |
| `audit.events` | 8 | 3 | 永久（S3 归档） | 审计 / 合规 |
| `webhook.inbox` | 16 | 3 | 7d | 业务重试 |
| `cdc.users` | 32 | 3 | 7d | ClickHouse 同步 |
| `cdc.payments` | 16 | 3 | 7d | ClickHouse 同步 |

#### 3.7.3 Schema Registry

- **Confluent Schema Registry**（自建）
- 强制 Avro / Protobuf 序列化
- 兼容性检查：`BACKWARD`（默认）/ `FULL`

### 3.8 备份与恢复

#### 3.8.1 备份策略

| 数据库 | 工具 | 频率 | 保留 | 存储 |
|---|---|---|---|---|
| **PostgreSQL** | `pg_basebackup` + WAL-G | 每日全量 + 持续 WAL | 30d 热 + 1y 冷 | S3 / OSS |
| **Redis** | 每日 RDB + AOF everysec | 每日 | 7d | S3 |
| **Elasticsearch** | `_snapshot` API | 每日 | 30d | S3 |
| **TimescaleDB** | `pg_basebackup` 复用 PG | 每日 | 30d | S3 |
| **ClickHouse** | `BACKUP ... TO S3` | 每日 | 90d | S3 |
| **Kafka** | MirrorMaker 2 跨集群 | 持续 | 7d | — |

#### 3.8.2 恢复演练

| 场景 | RPO | RTO | 演练频率 |
|---|---|---|---|
| PG 主库故障 | < 1min | < 5min | 季度 |
| Redis 全量丢失 | < 1min | < 10min | 季度 |
| 误删表（指定时间） | < 1h | < 1h | 半年 |
| Region 级别故障 | < 5min | < 30min | 年度 |

### 3.9 监控告警

| 指标 | 阈值 | 告警 |
|---|---|---|
| 连接数使用率 | > 80% | Warning / 立即扩容 |
| 复制延迟 | > 30s | Warning |
| 复制延迟 | > 5min | Critical / PagerDuty |
| 磁盘使用率 | > 70% | Warning |
| 慢查询 | > 1s | 日报 |
| 死锁 | > 0 | Critical / 自动分析 |
| 长事务 | > 5min | Warning |
| 表膨胀率 | > 30% | 立即 VACUUM FULL |
| 缓存命中率 | < 95% | Warning |

### 3.10 ORM 与 Prisma

#### 3.10.1 共享 Schema

```prisma
// apps/api/prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearchPostgres", "postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector, postgis, pg_trgm, uuidOssp]
}

model User {
  id           String    @id @default(uuid()) @db.Uuid
  phoneNumber  String?   @unique
  email        String?   @unique
  did          String?   @unique
  kycLevel     Int       @default(0) @db.SmallInt
  status       UserStatus @default(ACTIVE)
  metadata     Json      @default("{}")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  wechat       WechatUser?
  orders       Order[]
  payments     Payment[]
  kycRecords   KycRecord[]

  @@index([createdAt(sort: Desc)])
  @@index([status, kycLevel])
  @@map("users")
}
```

#### 3.10.2 迁移管理

```bash
# 开发
npx prisma migrate dev --name add_kyc_level

# 预发（手审）
npx prisma migrate deploy

# 生产（蓝绿）
npx prisma migrate deploy
# 配合 K8s 滚动更新，DB schema 变更 → 旧 pod 仍兼容 → 新 pod 上线 → 旧 pod 下线
```

#### 3.10.3 Prisma 性能

- **避免 N+1**：用 `include` 一次 JOIN
- **大查询分页**：用游标分页，不用 `skip/offset`
- **批量插入**：`createMany` / `$transaction`
- **原始 SQL**：`$queryRaw` 仅在 Prisma 表达不了时使用

---

## 第 4 章 · 云原生架构

### 为什么需要这章

海购星 Samoa DAO 涉及多云部署（阿里云 / AWS / GCP）+ 边缘节点（Cloudflare / 自建边缘）+ 多 Region（亚太 / 北美 / 欧洲），没有云原生架构：

1. **部署一致性差**：开发在 macOS，测试在 CentOS，生产在 Ubuntu，依赖版本漂移；
2. **扩容困难**：大促 QPS 涨 10 倍，手动加机器要 2 小时；
3. **故障恢复慢**：单 Pod 挂掉，1 分钟才被替换，期间错误率飙升；
4. **多云迁移难**：绑死 AWS 后，议价能力弱，2024 年某企业因 AWS 涨价 30% 一年多付 8000 万美元。

本章给出从镜像构建 → 编排 → 服务网格 → 可观测 → GitOps 的完整方案。

### 4.1 整体架构

```
                          ┌─────────────────────────┐
                          │  Git (GitHub / GitLab)  │
                          └────────────┬────────────┘
                                       │ push
                          ┌────────────▼────────────┐
                          │  CI: GitHub Actions     │
                          │  - Lint / Test / Build  │
                          │  - Docker 多阶段构建    │
                          │  - 推送镜像到 Registry  │
                          └────────────┬────────────┘
                                       │
                          ┌────────────▼────────────┐
                          │  Registry               │
                          │  - Aliyun ACR           │
                          │  - AWS ECR              │
                          │  - GCP Artifact Registry│
                          └────────────┬────────────┘
                                       │ pull
                          ┌────────────▼────────────┐
                          │  CD: ArgoCD             │
                          │  - 监听 GitOps Repo     │
                          │  - 自动 Sync 到 K8s     │
                          └────────────┬────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
┌───────▼────────┐           ┌────────▼─────────┐          ┌─────────▼────────┐
│ 阿里云 ACK     │           │ AWS EKS          │          │ GCP GKE          │
│ 华东1 / 2      │           │ 新加坡 / 东京     │          │ 台湾 / 香港      │
│ - 业务 Pod     │           │ - 业务 Pod        │          │ - 业务 Pod       │
│ - 中间件 StatefulSet │     │ - 中间件          │          │ - 中间件         │
└───────┬────────┘           └────────┬─────────┘          └─────────┬────────┘
        │                             │                              │
        └─────────────────────────────┼──────────────────────────────┘
                                      │
                          ┌───────────▼────────────┐
                          │  全局 LB (Cloudflare)  │
                          │  - Anycast IP          │
                          │  - 智能路由            │
                          └────────────────────────┘
```

### 4.2 Docker 镜像

#### 4.2.1 多阶段构建（NestJS 示例）

```dockerfile
# apps/api/Dockerfile
# ========== Stage 1: deps ==========
FROM node:20.11.1-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --ignore-scripts
RUN npx prisma generate

# ========== Stage 2: build ==========
FROM node:20.11.1-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --production

# ========== Stage 3: prod-deps ==========
FROM node:20.11.1-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
RUN npx prisma generate

# ========== Stage 4: runtime ==========
FROM node:20.11.1-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache dumb-init curl tini \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nestjs -u 1001
ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://localhost:3000/healthz || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

#### 4.2.2 镜像优化

- 基础镜像：`node:20.11.1-alpine`（180MB → 120MB）
- 多阶段：构建工具不进生产镜像
- `npm prune --production`：剔除 devDependencies
- `dumb-init`：正确处理 PID 1 信号
- `USER nestjs`：以非 root 运行（安全）
- `.dockerignore`：排除 node_modules、.git、tests

#### 4.2.3 镜像扫描

- **Trivy**：CI 阶段扫描
- **Snyk Container**：深度漏洞库
- **Docker Scout**：Docker Desktop 集成

**门禁**：
- 高危漏洞（CVSS ≥ 7.0）→ 阻塞构建
- 中危（4.0-7.0）→ 警告 + 报告
- 低危（< 4.0）→ 仅报告

### 4.3 Kubernetes 编排

#### 4.3.1 集群规模

| Region | 集群 | 节点数 | 用途 |
|---|---|---|---|
| 阿里云华东 1 | prod-cn-hangzhou | 30（10 业务 + 20 中间件） | 主生产 |
| 阿里云华东 2 | prod-cn-shanghai | 30 | 灾备 |
| AWS 新加坡 | prod-sg | 20 | 东南亚 |
| AWS 东京 | prod-jp | 10 | 日本 |
| GCP 台湾 | prod-tw | 10 | 港台 |
| AWS 法兰克福 | prod-eu | 10 | 欧洲 |
| 阿里云华北 2 | stg | 6 | 预发 |
| 自建 | dev | 3 | 开发 |

#### 4.3.2 命名空间

```
prod-h5-api
prod-admin-api
prod-internal
prod-data         # 业务中间件
prod-monitor      # 监控
stg-h5-api
stg-admin-api
stg-internal
dev-*
```

#### 4.3.3 Deployment 示例

```yaml
# apps/api/k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: h5-api
  namespace: prod-h5-api
  labels:
    app: h5-api
    version: v1.2.3
spec:
  replicas: 6
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 0
  selector:
    matchLabels:
      app: h5-api
  template:
    metadata:
      labels:
        app: h5-api
        version: v1.2.3
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: h5-api
              topologyKey: kubernetes.io/hostname
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: workload
                    operator: In
                    values: [api]
      containers:
        - name: h5-api
          image: registry.cn-hangzhou.aliyuncs.com/smy/h5-api:v1.2.3
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 3000
            - name: metrics
              containerPort: 9090
          env:
            - name: NODE_ENV
              value: production
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "4Gi"
          livenessProbe:
            httpGet:
              path: /healthz
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /readyz
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          startupProbe:
            httpGet:
              path: /healthz
              port: http
            initialDelaySeconds: 0
            periodSeconds: 10
            failureThreshold: 30
          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 10"]
          securityContext:
            runAsNonRoot: true
            runAsUser: 1001
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: [ALL]
      imagePullSecrets:
        - name: aliyun-acr
      terminationGracePeriodSeconds: 30
```

#### 4.3.4 HPA（水平 Pod 自动伸缩）

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: h5-api
  namespace: prod-h5-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: h5-api
  minReplicas: 6
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
        - type: Pods
          value: 4
          periodSeconds: 30
      selectPolicy: Max
```

#### 4.3.5 VPA（垂直 Pod 自动伸缩）

- 推荐 + 自动模式
- 仅在维护窗口执行（生产慎用）

#### 4.3.6 KEDA（事件驱动伸缩）

| 触发器 | 场景 | 目标副本 |
|---|---|---|
| Kafka lag | 消费积压时扩容 | 0-20 |
| Redis 队列长度 | BullMQ 任务堆积 | 0-10 |
| Cron | 凌晨 2-4 点报表任务扩容 | 5 |
| Prometheus | 业务指标（如订单量） | 2-20 |

### 4.4 Helm Chart

#### 4.4.1 Chart 结构

```
helm/
├── smy-api/
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values-dev.yaml
│   ├── values-stg.yaml
│   ├── values-prod.yaml
│   ├── templates/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── serviceaccount.yaml
│   │   ├── hpa.yaml
│   │   ├── ingress.yaml
│   │   ├── configmap.yaml
│   │   ├── secret.yaml
│   │   ├── servicemonitor.yaml
│   │   ├── poddisruptionbudget.yaml
│   │   ├── networkpolicy.yaml
│   │   └── _helpers.tpl
│   └── README.md
```

#### 4.4.2 values.yaml 关键配置

```yaml
# values.yaml
image:
  repository: registry.cn-hangzhou.aliyuncs.com/smy/h5-api
  tag: ""  # CI 注入
  pullPolicy: IfNotPresent

replicaCount: 6

resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 2000m
    memory: 4Gi

autoscaling:
  enabled: true
  minReplicas: 6
  maxReplicas: 30
  targetCPUUtilizationPercentage: 70

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
  hosts:
    - host: api.smy.app
      paths:
        - path: /api/h5
          pathType: Prefix
  tls:
    - hosts:
        - api.smy.app
      secretName: api-smy-app-tls

postgresql:
  enabled: true
  host: pg-coordinator.prod-data
  port: 5432
  database: smy_main

redis:
  enabled: true
  host: redis-cluster.prod-data
  port: 6379

env:
  NODE_ENV: production
  LOG_LEVEL: info
```

### 4.5 服务网格（Istio）

#### 4.5.1 价值

- 端到端 mTLS（无侵入加密）
- 流量管理（灰度、A/B、故障注入）
- 统一可观测（指标/日志/Trace）
- 限流（Envoy 全局）
- 多语言友好（gRPC over HTTP/2）

#### 4.5.2 部署

```bash
istioctl install --set profile=production \
  -f istio-production.yaml
```

```yaml
# istio-production.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableAutoMtls: true
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
    pilot:
      enabled: true
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
  values:
    global:
      mtls:
        enabled: true
      meshID: smy-mesh
      network: smy-network
```

#### 4.5.3 灰度（金丝雀）

```yaml
# VirtualService
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: h5-api
spec:
  hosts:
    - h5-api
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: h5-api
            subset: v2
    - route:
        - destination:
            host: h5-api
            subset: v1
          weight: 90
        - destination:
            host: h5-api
            subset: v2
          weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: h5-api
spec:
  host: h5-api
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

#### 4.5.4 故障注入（测试）

```yaml
http:
  - fault:
      delay:
        percentage:
          value: 10
        fixedDelay: 5s
      abort:
        percentage:
          value: 1
        httpStatus: 500
    route:
      - destination:
          host: h5-api
```

### 4.6 Ingress / Gateway API

#### 4.6.1 Gateway API（K8s 新一代）

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: smy-gateway
  namespace: prod-h5-api
spec:
  gatewayClassName: istio
  listeners:
    - name: http
      port: 80
      protocol: HTTP
      allowedRoutes:
        namespaces:
          from: All
    - name: https
      port: 443
      protocol: HTTPS
      tls:
        mode: Terminate
        certificateRefs:
          - name: smy-tls
            kind: Secret
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: h5-api
spec:
  parentRefs:
    - name: smy-gateway
  hostnames: ["api.smy.app"]
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api/h5
      backendRefs:
        - name: h5-api
          port: 3000
    - matches:
        - path:
            type: PathPrefix
            value: /api/admin
      backendRefs:
        - name: admin-api
          port: 3000
```

### 4.7 配置与密钥

#### 4.7.1 ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: h5-api-config
  namespace: prod-h5-api
data:
  NODE_ENV: production
  LOG_LEVEL: info
  CORS_ORIGINS: "https://smy.app,https://admin.smy.app"
  RATE_LIMIT_PER_MIN: "120"
```

#### 4.7.2 Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
  namespace: prod-h5-api
type: Opaque
stringData:
  url: postgresql://smy:xxx@pg-coordinator:5432/smy_main
  password: xxx
```

#### 4.7.3 External Secrets Operator

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: aliyun-rds-secret
spec:
  secretStoreRef:
    name: aliyun-secret-store
    kind: ClusterSecretStore
  target:
    name: db-secret
  data:
    - secretKey: password
      remoteRef:
        key: rds/smy-main
        property: password
```

### 4.8 可观测性

#### 4.8.1 三大支柱

| 支柱 | 工具 | 用途 |
|---|---|---|
| **Metrics** | Prometheus + Grafana | 数值化指标 |
| **Logs** | Loki / EFK / Datadog Logs | 日志聚合 |
| **Traces** | Jaeger / Tempo / Datadog APM | 分布式链路 |

#### 4.8.2 OpenTelemetry 集成

```typescript
// apps/api/src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'h5-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector.observability:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();
```

#### 4.8.3 关键 Dashboard

| Dashboard | 关键指标 |
|---|---|
| **API 概览** | QPS / P50/P95/P99 延迟 / 错误率 / 状态码分布 |
| **业务概览** | DAU / GMV / 注册 / 转化漏斗 |
| **JVM/Node 运行时** | CPU / 内存 / GC / 事件循环延迟 |
| **数据库** | 连接数 / 慢查询 / 复制延迟 / 缓存命中率 |
| **K8s 节点** | CPU/Mem/Disk/Network / Pod 数 |
| **Istio Mesh** | 请求量 / 错误率 / 熔断 / 限流 |
| **告警总览** | 告警数 / MTTA / MTTR |

#### 4.8.4 告警分级

| 级别 | 含义 | 响应 | 通道 |
|---|---|---|---|
| **P0** | 业务完全不可用 | 5 分钟 | PagerDuty 立即呼叫 |
| **P1** | 核心功能受损 | 30 分钟 | PagerDuty 通知 |
| **P2** | 一般功能受损 | 4 小时 | Slack |
| **P3** | 优化项 | 24 小时 | 邮件 |
| **P4** | 信息 | 工作日 | 工单 |

### 4.9 GitOps（ArgoCD）

#### 4.9.1 仓库结构

```
gitops/
├── apps/
│   ├── h5-api/
│   │   ├── base/
│   │   │   ├── kustomization.yaml
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── ingress.yaml
│   │   └── overlays/
│   │       ├── dev/
│   │       ├── stg/
│   │       └── prod/
│   ├── admin-api/
│   ├── kong/
│   └── kafka/
└── infra/
    ├── namespaces.yaml
    ├── network-policies.yaml
    └── rbac.yaml
```

#### 4.9.2 Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: h5-api-prod
  namespace: argocd
spec:
  project: smy
  source:
    repoURL: https://github.com/smy/gitops
    targetRevision: HEAD
    path: apps/h5-api/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: prod-h5-api
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  revisionHistoryLimit: 10
```

### 4.10 渐进式发布（Argo Rollouts）

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: h5-api
  namespace: prod-h5-api
spec:
  replicas: 6
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: h5-api
  strategy:
    canary:
      canaryService: h5-api-canary
      stableService: h5-api-stable
      steps:
        - setWeight: 5
        - pause: { duration: 10m }
        - setWeight: 15
        - pause: { duration: 10m }
        - setWeight: 30
        - pause: { duration: 10m }
        - analysis:
            templates:
              - templateName: success-rate
        - setWeight: 50
        - pause: { duration: 10m }
        - setWeight: 80
        - pause: { duration: 10m }
      trafficRouting:
        istio:
          virtualService:
            name: h5-api
            routes:
              - primary
  template:
    metadata:
      labels:
        app: h5-api
    spec:
      containers:
        - name: h5-api
          image: registry.cn-hangzhou.aliyuncs.com/smy/h5-api:v1.2.4
```

### 4.11 弹性伸缩策略

| 资源 | 策略 | 工具 |
|---|---|---|
| Pod 水平 | CPU 70% / Mem 80% | HPA |
| Pod 垂直 | 资源推荐 | VPA（推荐模式） |
| 节点 | Spot + On-Demand 混合 | Karpenter |
| 集群 | 容量预测 | K8s Cluster Autoscaler |
| 跨 AZ | 副本均匀分布 | topologySpreadConstraints |
| 跨 Region | 流量切换 | Cloudflare / Route53 |

### 4.12 自愈能力

| 故障 | 自愈机制 |
|---|---|
| Pod 崩溃 | K8s 自动重启（restartPolicy: Always） |
| 节点宕机 | 副本迁移 + 节点自动替换 |
| 网络抖动 | Istio 重试 + 熔断 |
| DB 连接泄漏 | PgBouncer 自动回收 |
| Redis 连接耗尽 | 客户端连接池 + maxmemory-policy |
| 磁盘满 | logrotate + 30d 自动清理 |
| 配置错误 | ArgoCD 自动回滚 |

### 4.13 灾难恢复

| 场景 | RPO | RTO | 方案 |
|---|---|---|---|
| **单 Pod 故障** | 0 | < 30s | K8s 自愈 |
| **单节点故障** | 0 | < 2min | 副本迁移 |
| **单可用区故障** | < 1min | < 10min | 多 AZ 部署 |
| **单 Region 故障** | < 5min | < 30min | 多 Region + 全局 LB |
| **RDS 误删** | < 1h | < 1h | PITR + 备份恢复 |
| **数据损坏** | 0 | 0 | 事件溯源 + S3 归档 |

---

## 第 5 章 · 全球支付通道

### 为什么需要这章

海购星 Samoa DAO 的核心业务是「跨境合规出海」，支付环节是最复杂的部分。需要同时支持：

1. **国内支付**：支付宝、微信支付、银联（用于境内用户购买境内服务）
2. **跨境支付**：Stripe（国际信用卡）、PayPal、Adyen（欧洲主流）、Airwallex（跨境收款）
3. **加密支付**：USDT（TRC-20 / ERC-20）、BTC、ETH、Coinbase Commerce、Binance Pay
4. **电汇**：Wise（个人/中小企）、PingPong（跨境电商 B2B）、银行 SWIFT

每种支付方式都有：
- 不同的 **KYC/AML** 要求
- 不同的 **结算周期**（T+0 / T+1 / T+7）
- 不同的 **费率结构**（百分比 + 固定费）
- 不同的 **拒付/退款** 流程
- 不同的 **币种** 与 **汇率损失**
- 不同的 **合规风险**（如 Stripe 严禁涉赌、涉敏国家）

本章给出完整的支付架构、合规设计、风控模型、对账系统。

### 5.1 支付通道分类

| 通道 | 区域 | 币种 | 结算周期 | 费率 | 适用场景 |
|---|---|---|---|---|---|
| **支付宝** | 中国 | CNY | T+1 | 0.6% | 国内服务、跨境电商 C2C |
| **微信支付** | 中国 | CNY | T+1 | 0.6% | 小程序、H5 |
| **银联** | 中国 / 东南亚 | CNY/USD | T+1 | 0.3%-0.7% | 传统大额 |
| **Stripe** | 全球 46 国 | 135+ | T+2 | 2.9% + $0.30 | 国际信用卡（**采用**） |
| **Adyen** | 全球 37 国 | 35+ | T+1 | €0.11 + 收单费率 | 欧洲主流、B2C 大额 |
| **PayPal** | 全球 200+ | 25 | T+1 | 3.5% + $0.49 | 跨境电商个人卖家 |
| **Wise** | 全球 80+ | 50+ | T+1 | 0.4%-2% | 中小企业跨境汇款 |
| **Airwallex** | 全球 130+ | 50+ | T+1 | 0.4%-1% | 跨境电商（**采用**） |
| **PingPong** | 全球 200+ | 30+ | T+1 | 1% | B2B 跨境收款（**采用**） |
| **Coinbase Commerce** | 全球 | 6 加密币 | T+0 | 0.6% | 加密支付（**采用**） |
| **Binance Pay** | 全球 | 60+ 加密币 | T+0 | 0% | 加密支付（备选） |
| **NOWPayments** | 全球 | 200+ 币 | T+0 | 0.4%-0.5% | 加密支付（备选） |
| **SWIFT** | 全球 | 160+ | T+2-5 | $15-50/笔 | 大额电汇 |
| **本地支付**（iDEAL、FPX、UPI） | 各国 | 本币 | T+1 | 0.3%-1% | 区域深耕 |

### 5.2 支付路由（智能调度）

#### 5.2.1 路由策略矩阵

| 用户场景 | 优选通道 | 备选 | 降级 |
|---|---|---|---|
| 中国境内 H5 | 微信 / 支付宝 | 银联 | — |
| 东南亚信用卡 | Stripe | Adyen | 银联 |
| 欧洲信用卡 | Adyen | Stripe | PayPal |
| 美国信用卡 | Stripe | Adyen | PayPal |
| 中东 | Stripe (3DS) | — | Crypto |
| 俄罗斯 / 伊朗 / 朝鲜 | **禁用**（OFAC 制裁） | Crypto（合规审查） | — |
| 大额 B2B（>$10k） | SWIFT / PingPong | Wise | — |
| Web3 用户 | Coinbase Commerce | NOWPayments | Binance Pay |
| 跨境电商（< $5k） | Airwallex | PayPal / Wise | PingPong |

#### 5.2.2 路由决策引擎

```typescript
// apps/api/src/modules/payments/router/payment-router.service.ts
@Injectable()
export class PaymentRouterService {
  async selectChannel(input: PaymentIntentInput): Promise<PaymentChannel> {
    // 1. 合规检查（OFAC、敏感国家）
    if (this.isRestricted(input.userCountry)) {
      throw new ForbiddenException('Country restricted');
    }

    // 2. 业务规则
    const candidates: PaymentChannel[] = [];

    // 2.1 按金额
    if (input.amount >= 100000) {  // $1k+
      candidates.push('swift', 'pingpong');
    } else if (input.amount >= 10000) {  // $100-1k
      candidates.push('stripe', 'adyen', 'airwallex');
    } else {
      candidates.push('stripe', 'paypal', 'coinbase');
    }

    // 2.2 按地区
    if (['CN', 'HK', 'MO'].includes(input.userCountry)) {
      candidates.unshift('alipay', 'wechat');
    }
    if (['RU', 'IR', 'KP', 'SY', 'CU'].includes(input.userCountry)) {
      throw new ForbiddenException('OFAC sanctioned country');
    }

    // 2.3 按币种
    if (input.currency === 'USDT' || input.currency === 'BTC') {
      return 'coinbase';
    }

    // 2.4 按成功率排序（机器学习）
    const sorted = await this.mlModel.rank(candidates, input);

    // 2.5 降级链
    for (const ch of sorted) {
      if (await this.isChannelAvailable(ch)) {
        return ch;
      }
    }

    throw new ServiceUnavailableException('No payment channel available');
  }
}
```

#### 5.2.3 降级与重试

- **首失败**：3 秒后重试（同一通道）
- **二次失败**：30 秒后切下一通道
- **三次失败**：5 分钟后再切
- **最终失败**：人工介入 + 邮件通知用户

### 5.3 KYC / AML

#### 5.3.1 等级化 KYC（参考 FATF 6 级）

| DLC 等级 | 累计交易 | 所需材料 | 验证方式 | 限额 |
|---|---|---|---|---|
| **DLC 0** | $0 | 手机号 | 短信 OTP | $100/月 |
| **DLC 1** | $100 | 邮箱 + 身份证号 | Onfido / Sumsub | $1,000/月 |
| **DLC 2** | $1,000 | 身份证 + 人脸 + 地址证明 | Jumio + 视频核身 | $10,000/月 |
| **DLC 3** | $10,000 | + 收入证明 / 资金来源 | Refinitiv World-Check | $100,000/月 |
| **DLC 4** | $100,000 | + 公司注册文件 + 受益人 | 人工审核 + 律师函 | $1,000,000/月 |
| **DLC 5** | $1,000,000 | + 现场尽调 | 财务尽调 + 合规访谈 | 无限制 |

#### 5.3.2 供应商对比

| 供应商 | 覆盖国家 | OCR 准确率 | 人脸 | 视频核身 | 黑名单库 | 价格 |
|---|---|---|---|---|---|---|
| **Onfido** | 195 | 99% | ✓ | ✓ | PEP / 制裁 | $2-5/次 |
| **Jumio** | 200 | 98% | ✓ | ✓ | 全球 | $3-8/次 |
| **Sumsub** | 220 | 99% | ✓ | ✓ | 全 | $1-4/次（**采用**）|
| **Refinitiv World-Check** | — | — | — | — | 最全 | $30k+/年 |
| **Trulioo** | 195 | 95% | ✓ | — | — | $1-3/次 |

#### 5.3.3 制裁名单（实时筛查）

- **OFAC SDN**：美国制裁名单
- **UN Sanctions**：联合国
- **EU Sanctions**：欧盟
- **UK HMT**：英国
- **本地制裁**：中国大陆、香港、新加坡

**筛查频率**：
- 注册时：全量筛查
- 交易时：每笔 > $1k 触发
- 持续监控：每日增量筛查（变化通知）

#### 5.3.4 可疑交易报告（STR/SAR）

- **触发**：连续 3 笔 > $10k、24h 内 > $50k、可疑 IP / 设备
- **流程**：自动标记 → 风控审核 → 提交监管（FATF Travel Rule 同步）
- **保留**：报告内容加密存储 5 年
- **参考案例**：2023 年某交易所因未及时提交 STR 被 FinCEN 罚款 1.1 亿美元

### 5.4 汇率与多币种

#### 5.4.1 币种支持

- **法币**：USD、EUR、GBP、JPY、HKD、SGD、AUD、CAD、CNY、KRW 等 30+
- **加密币**：USDT、USDC、DAI、BTC、ETH、BNB、TRX（TRC-20）

#### 5.4.2 汇率源

| 数据源 | 用途 | 更新频率 |
|---|---|---|
| **Open Exchange Rates** | 基准汇率 | 实时（< 1s） |
| **央行中间价** | 合规参考 | 每日 9:15 |
| **Binance / Coinbase** | 加密币汇率 | 实时 |
| **Wise / OFX** | 跨境汇款报价 | 实时 |

#### 5.4.3 结算币种策略

- **B2C 用户**：用户支付币种 = 结算币种（避免汇损）
- **B2B 商家**：默认 USD，可选 EUR / HKD / SGD
- **平台收入**：自动转 USD 锁汇，规避汇率波动
- **加密币**：实时兑换 USD 入账，波动 > 2% 触发风控

### 5.5 风控引擎

#### 5.5.1 实时风控规则（> 100 条）

```yaml
# 风控规则示例
- name: high_frequency_purchase
  condition: 1h内同用户订单 > 5 笔
  action: step_up_mfa

- name: amount_anomaly
  condition: 单笔金额 > 用户历史 P99 * 5
  action: manual_review

- name: geo_mismatch
  condition: 登录IP国家 ≠ 支付卡国家
  action: 3ds_required

- name: velocity
  condition: 24h内累计 > $50k
  action: 人工审核

- name: device_reuse
  condition: 同一设备指纹关联 > 10 用户
  action: 设备黑名单

- name: new_country
  condition: 用户首次在敏感国家交易
  action: 增强 KYC
```

#### 5.5.2 机器学习模型

- **模型类型**：XGBoost 分类（欺诈 / 正常）
- **特征**（200+）：用户画像、行为序列、设备指纹、网络、交易模式
- **训练数据**：3 年历史 + 标记样本
- **在线推理延迟**：< 30ms
- **AUC**：> 0.95

#### 5.5.3 案例：阿里 / 京东风控

- **阿里**「蚁盾」：10 万 QPS 实时拦截，误杀率 < 0.1%
- **京东**「天眼」：规则引擎 + ML 混合，2022 年拦截黑产 200 亿+
- **参考**：海购星风控系统参考阿里「蚁盾」架构，但针对跨境 + Web3 场景定制

### 5.6 退款与拒付（Chargeback）

#### 5.6.1 退款流程

```
用户申请退款
  ↓
1. 风控预审（30 天内自动退，> 30 天人工）
  ↓
2. 资金路径检测
   - 余额未提现 → 内部划扣
   - 已提现 → 走原支付通道
  ↓
3. 调通道 API
  ↓
4. 异步回调确认
  ↓
5. 通知用户
  ↓
6. 更新订单状态
```

#### 5.6.2 拒付处理

- **Stripe Radar**：自动 ML 拦截（开启）
- **Win Rate 目标**：> 65%
- **证据包**：交易凭证 + 物流 + KYC + 服务记录
- **争议 SLA**：7 天内回复

#### 5.6.3 备付金 / 储备金

- **Stripe Reserve**：5%-25% 滚动保留（90 天后释放）
- **Airwallex 储备金**：视风险等级
- **平台自留**：交易额的 10% 锁仓 30 天

### 5.7 合规框架

#### 5.7.1 全球牌照

| 地区 | 牌照 | 申请周期 | 维护成本 |
|---|---|---|---|
| 美国 MSB | FinCEN 注册 | 1-3 月 | $5k/年 |
| 美国 MTL | 50 州单独申请 | 6-18 月 | $50k+/年 |
| 欧盟 EMI | Lithuania / Ireland | 12-18 月 | €100k+/年 |
| 英国 FCA | EMI / E-Money | 12-24 月 | £100k+/年 |
| 新加坡 MAS | MPI / SPI | 6-12 月 | $50k+/年 |
| 香港 HKMA | MSO / SVF | 12-18 月 | $200k+/年 |
| 萨摩亚 FSA | SPV 牌照 | 1-3 月 | $5k/年（**采用**）|

#### 5.7.2 合规岗位

- **MLRO**（Money Laundering Reporting Officer）：必须有
- **Compliance Officer**：必须有
- **DPO**（Data Protection Officer）：GDPR 必备
- **KYC Analyst**：全职 2+ 人
- **Audit**：外部审计师（年）

### 5.8 对账系统

#### 5.8.1 日终对账

```
08:00  拉取昨日所有支付通道账单（API / SFTP）
09:00  解析为统一格式
10:00  系统账单 vs 通道账单（三方对账：系统 + 通道 + 银行）
12:00  差异列表 → 工单系统
14:00  人工处理差异
17:00  财务确认
18:00  归档 S3 + Glacier（7 年）
```

#### 5.8.2 实时对账（> $1k 大额）

- 5 分钟内拉取
- 差异立即告警
- 自动调账

### 5.9 财务记账

#### 5.9.1 双账本

- **业务账本**：订单、支付、退款、手续费
- **会计账本**：复式记账（借贷），符合 GAAP / IFRS

#### 5.9.2 工具

- **NetSuite**（企业级）
- **金蝶云**（国内）
- **用友 U9**（国内）
- 自建（PostgreSQL + 复式记账表）

#### 5.9.3 税务

- **VAT / GST**：欧洲、东南亚
- **Sales Tax**：美国（各州不同）
- **中国增值税**：6%（服务）/ 13%（商品）
- **数字服务税**：英国 2%、法国 3%、意大利 3%

### 5.10 真实合规案例

#### 案例 1：阿里蚂蚁集团 VIE 案（2020-2024）

- **背景**：原计划 2020 年港股 + A 股同步上市
- **问题**：VIE 架构 + 金融监管风险
- **结果**：A 股暂停，港股估值从 $200B 跌至 $80B
- **启示**：海购星必须**先**理顺 VIE + 萨摩亚 SPV + 境内主体三角关系

#### 案例 2：京东数科上市失败（2021）

- **背景**：京东数科（原京东金融）拟科创板上市
- **问题**：监管对消费金融、ABS 的担忧
- **结果**：撤回申请
- **启示**：金融业务必须**先**持牌再规模化

#### 案例 3：滴滴数据安全审查（2022）

- **背景**：滴滴赴美上市
- **问题**：未通过《数据安全法》《网络安全审查办法》审查
- **结果**：App 下架 18 个月、罚款 80.26 亿
- **启示**：所有数据跨境（出境/出境存储）必须申报安全评估

#### 案例 4：TikTok 美国禁令（2020-2024）

- **背景**：ByteDance 旗下 TikTok 美国业务
- **问题**：CFIUS 国家安全审查
- **结果**：被强制出售（最终法案要求 2025 年剥离）
- **启示**：涉及美国用户数据 → 必须有 USDC（美国数据中心）+ 内容审核本地化

#### 案例 5：Tornado Cash OFAC 制裁（2022）

- **背景**：开源以太坊混币协议
- **问题**：被美国财政部 OFAC 制裁
- **结果**：所有美国人禁止使用，开发者被起诉
- **启示**：Web3 协议如果涉及混币、跨链桥、隐私币 → 高度风险，海购星**不**碰

---

## 第 6 章 · AI 搭建

### 为什么需要这章

海购星 Samoa DAO 的 AI 能力是核心差异化竞争力，覆盖：
- **C 端**：AI 名片、AI 翻译、AI 客服（7×24）、AI 内容生成、AI 视频剪辑
- **B 端**：AI 财务、AI 法务、AI 报税、AI 翻译、AI 数据分析
- **平台**：AI 风控、AI 文档抽取、AI 合同审查、AI OCR

AI 搭建涉及：
1. **多模型调度**：GPT-4o / Claude 3.5 / Gemini 1.5 / Qwen 2.5 / Llama 3.1
2. **私有部署**：vLLM / TGI / LiteLLM
3. **RAG**：向量库 + Embedding + 文档解析
4. **Agent**：LangGraph / AutoGen
5. **成本控制**：年付预算 $500k → 必须优化
6. **安全合规**：数据不外流（境内）/ 合规审计

本章给出从基础设施到上层应用的完整方案。

### 6.1 LLM 选型矩阵

| 模型 | 提供商 | 上下文 | 价格 (1M token) | 适用 | 部署 |
|---|---|---|---|---|---|
| **GPT-4o** | OpenAI | 128k | $2.5 / $10 | 通用主力 | API |
| **GPT-4o mini** | OpenAI | 128k | $0.15 / $0.6 | 高频低成本 | API |
| **Claude 3.5 Sonnet** | Anthropic | 200k | $3 / $15 | 长文档、写作 | API |
| **Claude 3.5 Haiku** | Anthropic | 200k | $0.8 / $4 | 客服 | API |
| **Gemini 1.5 Pro** | Google | 2M | $1.25 / $5 | 超长上下文 | API |
| **Llama 3.1 405B** | Meta | 128k | 自建 $1.5 / $3 | 私有部署 | 自建 |
| **Qwen 2.5 72B** | 阿里 | 128k | ¥4 / ¥12 | 境内主力 | 自建 / API |
| **DeepSeek V3** | DeepSeek | 64k | ¥2 / ¥8 | 代码、数学 | 自建 / API |
| **文心一言 4** | 百度 | 128k | ¥0.12 / ¥0.12 | 境内合规 | API |
| **GLM-4** | 智谱 | 128k | ¥1 / ¥1 | 境内合规 | API |
| **Hunyuan** | 腾讯 | 128k | — | 境内合规 | API |
| **Mistral Large 2** | Mistral | 128k | $2 / $6 | 欧洲合规 | API / 自建 |

### 6.2 推理基础设施

#### 6.2.1 自建 vs API

| 维度 | API（OpenAI/Anthropic） | 自建（vLLM/TGI） |
|---|---|---|
| 启动成本 | 0 | GPU $50k+ |
| 运维 | 0 | GPU 集群 + 推理优化 |
| 数据合规 | 数据出境（受监管） | 数据完全在境内 |
| 延迟 | 200-1000ms | 50-200ms |
| 弹性 | 无限 | 受 GPU 数量限制 |
| SLA | 99.9% | 99.5%（自建） |
| 适用 | 海外业务、PoC | 境内业务、大规模 |

**策略**：
- 境内用户数据 → **必须**自建或境内 API（Qwen / DeepSeek / GLM）
- 境外用户数据 → 可用 OpenAI / Anthropic
- 混合调度：智能路由（按用户 IP / 数据敏感度）

#### 6.2.2 GPU 集群

| 模型 | 显存需求 | 推荐 GPU | 数量（生产） | 备注 |
|---|---|---|---|---|
| **Llama 3.1 8B** | 16GB | A10 / L4 | 8 | 边缘推理 |
| **Qwen 2.5 72B** | 144GB（4-bit） | 2×H100 / 4×A100 | 4 | 主力 |
| **Qwen 2.5 32B** | 64GB | 2×A100 | 6 | 客服 |
| **BGE-M3** | 8GB | L4 | 4 | Embedding |
| **Whisper Large V3** | 10GB | L4 | 2 | 语音转文字 |
| **SDXL** | 12GB | L4 | 2 | 文生图 |

**总计**：约 16×H100 + 16×A100 + 16×L4，约 200 万美元硬件

#### 6.2.3 推理框架

| 框架 | 特点 | 适用 |
|---|---|---|
| **vLLM** | PagedAttention，吞吐量 24x HF | 自建主力（**采用**）|
| **TGI**（HuggingFace） | Rust 实现，稳定性好 | 备选 |
| **TensorRT-LLM** | NVIDIA 优化，推理最快 | 极致性能 |
| **LMDeploy** | 书生·浦语出品 | 中文优化 |
| **Xinference** | 全功能，国产 | 国内云 |

#### 6.2.4 LiteLLM 统一网关

```yaml
# litellm/config.yaml
model_list:
  - model_name: gpt-4o
    litellm_params:
      model: openai/gpt-4o
      api_key: os.environ/OPENAI_API_KEY
  - model_name: claude-3-5-sonnet
    litellm_params:
      model: anthropic/claude-3-5-sonnet-20241022
      api_key: os.environ/ANTHROPIC_API_KEY
  - model_name: qwen-72b
    litellm_params:
      model: openai/Qwen/Qwen2.5-72B-Instruct
      api_base: http://vllm-qwen72b.svc.cluster.local:8000/v1
      api_key: EMPTY
  - model_name: deepseek-v3
    litellm_params:
      model: openai/deepseek-chat
      api_base: https://api.deepseek.com/v1
      api_key: os.environ/DEEPSEEK_API_KEY

router_settings:
  num_retries: 3
  timeout: 30
  redis_host: redis.svc.cluster.local
  redis_port: 6379

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: postgresql://smy:xxx@pg:5432/litellm
```

### 6.3 Embedding 与 RAG

#### 6.3.1 Embedding 模型

| 模型 | 维度 | 适用语言 | 性能 |
|---|---|---|---|
| **BGE-M3** | 1024 | 多语言（含中文）| MTEB 第一（**采用**）|
| **BGE-Large-zh-v1.5** | 1024 | 中文 | 中文 SOTA |
| **OpenAI text-embedding-3-large** | 3072 | 多语言 | API |
| **Cohere embed-multilingual-v3** | 1024 | 多语言 | API |
| **Jina Embeddings v3** | 1024 | 多语言 | 长文本 |

#### 6.3.2 向量库

- **Qdrant** 1.10（主力）
- **Milvus** 2.4（备选，超大规模）
- **pgvector**（轻量，混合查询）

#### 6.3.3 RAG 流程

```
用户提问
  ↓
1. Query 改写（HyDE / Multi-Query）
  ↓
2. Embedding（BGE-M3）
  ↓
3. 向量检索（Qdrant top-50）
  ↓
4. 重排（BGE-Reranker-v2-m3 → top-5）
  ↓
5. Prompt 拼接：system + 检索结果 + 用户问题
  ↓
6. LLM 生成（Qwen-72B）
  ↓
7. 后处理（引用、敏感词过滤）
  ↓
8. 返回（带来源 + 置信度）
```

#### 6.3.4 文档处理

```typescript
// apps/api/src/modules/rag/ingest.service.ts
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class IngestService {
  async ingestPDF(filePath: string, metadata: DocMetadata) {
    // 1. 加载
    const loader = new PDFLoader(filePath, {
      parsedItemSeparator: '',
    });
    const docs = await loader.load();

    // 2. 切分（500 token / 50 overlap）
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
      separators: ['\n\n', '\n', '。', '!', '?', '！', '？'],
    });
    const chunks = await splitter.splitDocuments(docs);

    // 3. Embedding
    const embeddings = await this.embeddingModel.embedDocuments(
      chunks.map(c => c.pageContent),
    );

    // 4. 写入 Qdrant
    const points = chunks.map((chunk, i) => ({
      id: randomUUID(),
      vector: embeddings[i],
      payload: {
        text: chunk.pageContent,
        ...metadata,
        chunkIndex: i,
      },
    }));

    await this.qdrant.upsert('docs', {
      points,
      wait: true,
    });
  }
}
```

### 6.4 Agent 框架

#### 6.4.1 LangGraph（**采用**）

- 优势：状态管理、可中断、人工介入、可观测
- 适用：复杂多步任务（如 AI 法务审查、AI 报税）

#### 6.4.2 AutoGen

- 优势：多 Agent 协作
- 适用：研究型任务

#### 6.4.3 CrewAI

- 优势：角色扮演
- 适用：内容生产

#### 6.4.4 海购星 Agent 案例

| Agent | 工具 | 流程 |
|---|---|---|
| **AI 法务顾问** | 法律知识库 + 合同模板 + 律师函生成 | 5 步审查 |
| **AI 报税师** | 交易数据 + 税务规则 + 表单生成 | 6 步填表 |
| **AI 翻译** | 上下文 + 术语库 + 双语对照 | 3 步精翻 |
| **AI 客服** | FAQ + 工单 + 升级 | 4 步对话 |
| **AI 风控** | 交易 + 行为 + 黑名单 | 1 步判定 |

### 6.5 Prompt 工程

#### 6.5.1 模板规范

```yaml
# prompt 模板
id: legal.review.contract.v1
version: 1.0.0
model: claude-3-5-sonnet
temperature: 0.2
max_tokens: 4000
input_variables: [contract_text, jurisdiction, contract_type]
template: |
  你是萨摩亚注册的资深律师，专长 {contract_type}。
  
  # 任务
  请按以下 8 步审查合同：
  1. 当事人资质
  2. 标的合法性
  3. 权利义务对等
  4. 违约责任
  5. 争议解决
  6. 适用法律（建议 {jurisdiction}）
  7. 风险点（高/中/低）
  8. 修改建议
  
  # 输出
  以 JSON 格式返回：
  {
    "summary": "...",
    "risks": [{"level": "high", "clause": "...", "suggestion": "..."}],
    "score": 0-100,
    "action": "approve|negotiate|reject"
  }
  
  # 合同
  {contract_text}
```

#### 6.5.2 Few-shot 示例库

- 100+ 高质量示例
- 按业务分类
- A/B 测试持续优化

#### 6.5.3 Prompt 版本管理

- Git 版本控制
- PromptLayer / Helicone 监控
- 离线评估集（> 500 cases）

### 6.6 评测体系

#### 6.6.1 评估指标

| 任务 | 指标 | 目标 |
|---|---|---|
| **法律审查** | 风险点召回率 | > 95% |
| **翻译** | BLEU / COMET | > 0.8 |
| **客服** | 一次解决率（FCR） | > 75% |
| **OCR** | 字段准确率 | > 99% |
| **RAG** | 答案忠实度 | > 90% |

#### 6.6.2 评测集管理

- **Golden Set**：500+ 标准答案
- **LLM-as-Judge**：用 GPT-4o 评分
- **A/B Test**：新模型灰度

#### 6.6.3 工具

- **LangSmith**：LangChain 官方
- **Langfuse**：开源
- **Phoenix**（Arize）：开源可观测
- **Helicone**：开源
- **Promptfoo**：开源 Prompt 测试

### 6.7 安全

#### 6.7.1 Prompt 注入防御

- 系统 Prompt 强化（明确边界）
- 输入过滤（恶意指令检测）
- 输出过滤（敏感词 + 越权操作）
- 用户隔离（每个用户独立 Session）

#### 6.7.2 数据脱敏

```typescript
function maskPII(text: string): string {
  return text
    .replace(/[\w.-]+@[\w-]+\.[\w.-]+/g, '<EMAIL>')
    .replace(/\d{3}-\d{2}-\d{4}/g, '<SSN>')
    .replace(/1[3-9]\d{9}/g, '<PHONE>')
    .replace(/\d{16,19}/g, '<CARD>');
}
```

#### 6.7.3 输出审查

- 敏感词过滤（涉政、涉黄、涉暴）
- 事实核查（针对关键决策）
- 人类反馈（RLHF 数据收集）

### 6.8 成本控制

#### 6.8.1 预算

- 年预算：$500k（2026 年）
- 月均：$42k
- 单用户 AI 成本：< $0.5/月

#### 6.8.2 优化策略

| 策略 | 节省 | 影响 |
|---|---|---|
| **小模型优先** | -60% | 客服、简单任务 |
| **Prompt 压缩** | -30% | 通用 |
| **RAG 替代长上下文** | -80% | 知识问答 |
| **缓存** | -50% | 高频问题 |
| **批量 API** | -50% | 离线任务 |
| **Fine-tune 小模型** | -70% | 专域任务 |

#### 6.8.3 限流

```typescript
@Injectable()
export class AiCostGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.id;

    // 单用户每日 token 限制
    const used = await this.redis.incrby(`ai:user:${userId}:${today()}`, 0);
    if (used > this.dailyLimit(userId)) {
      throw new HttpException('Daily AI quota exceeded', 429);
    }

    return true;
  }
}
```

### 6.9 可观测

| 指标 | 工具 |
|---|---|
| **请求量 / 延迟 / 错误率** | Prometheus + Grafana |
| **Token 用量 / 成本** | Langfuse / Helicone |
| **Prompt / 响应** | LangSmith / Langfuse |
| **用户反馈** | 👍/👎 + 文字 |
| **幻觉率** | LLM-as-Judge 离线评估 |

---

## 第 7 章 · 萨摩亚数字经济特区配合

### 为什么需要这章

萨摩亚（Samoa）是位于南太平洋的岛国，2018 年与中国签署「一带一路」合作备忘录，是少数对中国友好的离岸金融中心。萨摩亚的：

1. **税收优惠**：International Companies 离岸公司免征所得税、资本利得税、印花税
2. **隐私保护**：股东 / 董事信息不公开
3. **合规友好**：English Common Law + 反洗钱合规
4. **地缘优势**：时区 +12 与中美欧均可工作日重叠
5. **数字经济特区**：2021 年通过《Economic Substance Act》，为数字经济专门设计

海购星选择萨摩亚作为顶层 SPV（Special Purpose Vehicle）注册地，原因：

| 候选地 | 优势 | 劣势 | 选定 |
|---|---|---|---|
| **BVI** | 成熟 | 信息共享 CRS、上市难 | × |
| **开曼** | 上市友好 | 经济实质要求严、信息公开 | × |
| **新加坡** | 声誉好 | 税收无优惠、合规严 | × |
| **香港** | 内地友好 | 税收高、隐私差 | × |
| **塞舌尔** | 隐私 | 制裁风险 | × |
| **萨摩亚** | 隐私+税收+中国友好+数字特区 | 小国风险 | ✓（**采用**）|
| **马绍尔** | 隐私 | 制裁风险 | × |

### 7.1 萨摩亚法律框架

#### 7.1.1 核心法律

| 法律 | 颁布 | 核心内容 |
|---|---|---|
| **International Companies Act 1988** | 1988 | 国际公司（IC）法律基础 |
| **International Trusts Act 1988** | 1988 | 离岸信托 |
| **Insurance Act 2007** | 2007 | 保险牌照 |
| **Money Laundering Prevention Act 2007** | 2007 | 反洗钱（已升级 2018） |
| **Financial Institutions Act 2020** | 2020 | 银行 / 金融机构 |
| **Economic Substance Act 2021** | 2021 | 经济实质（数字经济） |
| **Digital Asset Issuance Act 2022** | 2022 | 数字资产（**采用**）|
| **Personal Property Securities Act 2022** | 2022 | 动产担保 |

#### 7.1.2 Samoa Financial Services Authority（SFA）

- **监管机构**：Samoa Financial Services Authority
- **地址**：Level 5, Samoa National Provident Fund Building, Apia
- **网站**：https://www.samoa-fsa.ws
- **职责**：
  - 国际公司注册审批
  - 信托牌照
  - 数字资产牌照
  - AML/CFT 监督
  - 经济实质审查

### 7.2 顶层 SPV 架构

```
                              ┌──────────────────────┐
                              │   萨摩亚 IC（顶层）   │
                              │   Samoa DAO Ltd.     │
                              │   IC #12345          │
                              └──────────┬───────────┘
                                         │ 100% 控股
                ┌────────────────────────┼────────────────────────┐
                ▼                        ▼                        ▼
        ┌───────────────┐       ┌───────────────┐       ┌────────────────┐
        │  萨摩亚 IC     │       │  萨摩亚 IC     │       │  萨摩亚信托    │
        │  Samoa Tech   │       │  Samoa Pay    │       │  Samoa Family  │
        │  Ltd.         │       │  Ltd.         │       │  Trust         │
        │  (技术服务)   │       │  (支付清算)   │       │  (家族信托)    │
        └───────┬───────┘       └───────┬───────┘       └────────────────┘
                │                       │
                │ 100%                  │ 100%
                ▼                       ▼
        ┌───────────────┐       ┌───────────────┐
        │  海南公司      │       │  BVI/HK SPV   │
        │  (VIE 主体)   │       │  (海外平台)   │
        └───────────────┘       └───────────────┘
```

### 7.3 SPV 注册流程

#### 7.3.1 步骤

1. **名称核准**：向 SFA 提交 3 个备选名（3 个工作日）
2. **准备文件**：
   - Articles of Association（公司章程）
   - Memorandum of Association（备忘录）
   - Register of Directors（董事名册）
   - Register of Members（股东名册）
3. **提交注册**（线上）
4. **缴纳费用**：政府费 + 注册代理费
5. **领取证书**（5-10 个工作日）

#### 7.3.2 所需材料

| 材料 | 备注 |
|---|---|
| 公司名（中/英） | 3 备选 |
| 经营范围 | 6-10 项 |
| 注册资本 | 标准 $1M（无实缴要求） |
| 董事（最少 1） | 自然人 / 法人 |
| 股东（最少 1） | 自然人 / 法人 |
| 注册地址 | 萨摩亚本地 |
| 注册代理 | 必须（持牌律所） |
| 受益人 | 实际控制人 |

#### 7.3.3 费用（2026 年）

| 项目 | 一次性 | 年度 |
|---|---|---|
| 政府注册费 | $350 | — |
| 注册代理（首年） | $1,500 | $1,200 |
| 注册地址 | $500 | $500 |
| 经济实质声明 | $1,000 | $1,000 |
| 牌照费（如需） | $5,000 | $5,000 |
| 法务服务 | $5,000-15,000 | — |
| **合计** | **$15,000-25,000** | **$8,000-10,000** |

### 7.4 经济实质要求（ESA 2021）

#### 7.4.1 适用范围

- 纯控股公司（Pure Equity Holding）：**例外**，仅需备案
- 知识产权持有：严格
- 数字业务：**中等**
- 金融业务：**严格**

#### 7.4.2 海购星的实质要求

作为**数字经济业务**（AI / 平台 / 数据服务），需要：
- 萨摩亚有 **CIGA**（Core Income Generating Activity）员工 ≥ 1 人
- 萨摩亚有 **办公场所**
- 萨摩亚有 **董事会决策**（≥ 1 次/年）
- 萨摩亚有 **服务器**（可选，纯云也可）

#### 7.4.3 简化方案

- 萨摩亚设 1 名本地董事（可聘请居住在新西兰的萨摩亚籍董事）
- 1 名 CIGA 员工（业务经理 / 合规官）
- 注册办公室（SFA 持牌代理提供）
- 每年 1 次现场董事会（与年度股东大会合并）

### 7.5 税务

#### 7.5.1 萨摩亚税务

| 税种 | 税率 | 海购星 |
|---|---|---|
| **企业所得税** | 0%（国际公司） | 0 |
| **资本利得税** | 0 | 0 |
| **股息税** | 0 | 0 |
| **利息税** | 0 | 0 |
| **特许权使用费税** | 0 | 0 |
| **印花税** | 0 | 0 |
| **遗产税** | 0 | 0 |
| **增值税（VAGST）** | 15% | 仅萨摩亚本地业务 |

#### 7.5.2 转让定价

- 萨摩亚与中国有 **DTA**（全面税收协定）吗？**无**！
- 与美国有 FATCA IGA吗？**有 Model 1**
- 与 OECD CRS？**是**

**实操**：
- 萨摩亚 IC → 海南公司 收取 **技术许可费**（5% 收入）
- 萨摩亚 IC → 海南公司 收取 **管理服务费**（3% 收入）
- 全部在萨摩亚免税

#### 7.5.3 中国反避税

- 海南公司付给萨摩亚的费用，需要符合 **独立交易原则**（OECD 标准）
- 同期资料准备
- 国别报告（CbCR）：营业收入 > 8 亿元人民币才需要

### 7.6 数字资产牌照

#### 7.6.1 Digital Asset Issuance Act 2022

- **牌照类型**：
  - DARE（Digital Asset Real Estate）：房地产代币
  - DASS（Digital Asset Security Service）：证券类代币
  - DAEP（Digital Asset Exchange Platform）：交易所（**海购星需要**）

#### 7.6.2 DAEP 申请条件

| 项目 | 要求 |
|---|---|
| 注册地 | 萨摩亚 |
| 注册资本 | $100,000（实缴）|
| 董事 | ≥ 2 名，其中 1 名本地 |
| 合规官 | 1 名全职 |
| AML/CFT | 完整制度 + 培训 |
| 审计 | 年度外部审计 |
| 保险 | 网络责任险 ≥ $5M |
| 网络安全 | 渗透测试报告 |
| 储备金 | 用户资产的 100% 储备 |

#### 7.6.3 费用与周期

- 政府费：$10,000（一次性）
- 法务费：$30,000-50,000
- 周期：3-6 个月
- 维护：年度审计 $20k + 持续合规 $50k/年

### 7.7 知识产权布局

#### 7.7.1 商标

- 萨摩亚商标注册
- 同步注册：欧盟、马德里体系（90+ 国）、美国、日本
- **「Samoa DAO」「海购星」** 商标布局
- 费用：单国 $1,500 + 马德里 $3,000

#### 7.7.2 专利

- AI 算法专利（境内 + PCT）
- Web3 合约专利（美国）
- 跨境支付系统专利

#### 7.7.3 版权

- 源代码（自动产生）
- AI 训练数据（合规来源证明）
- 用户生成内容（UGC）协议

### 7.8 移民 / 签证

| 签证类型 | 适用 | 周期 | 费用 |
|---|---|---|---|
| **Visitor Visa** | 短期出差 | 30 天 | 0 |
| **Business Visa** | 商务考察 | 90 天 | $200 |
| **Work Permit** | 本地员工 | 1-2 年 | $500/年 |
| **Investor Visa** | 投资 ≥ $500k | 5 年 | $2,000 |

**实操**：
- 中国员工用 Business Visa 入境
- 萨摩亚董事用 Citizenship（投资入籍，$200k 起）

### 7.9 银行账户

#### 7.9.1 萨摩亚本地银行

| 银行 | 服务 | 费用 |
|---|---|---|
| **ANZ Bank Samoa** | 美元 / 萨摩亚塔拉 | 标准 |
| **Bank South Pacific** | 多币种 | 低 |
| **Samoa Commercial Bank** | 本地 | 标准 |

#### 7.9.2 推荐方案

- 萨摩亚开户（基本户）
- 香港开户（中转户，接收跨境电商收款）
- 新加坡开户（高端客户）

**挑战**：萨摩亚本地银行服务有限，主要靠香港 / 新加坡。

### 7.10 三住所合规

海购星同时在三个司法辖区注册：

| 司法辖区 | 实体 | 角色 |
|---|---|---|
| **萨摩亚** | Samoa DAO Ltd. | 顶层控股，保密 + 免税 |
| **香港** | HK Tech Ltd. | 收款 + 海外平台运营 |
| **海南** | 海南自贸港公司 | VIE 主体，连接境内业务 |

### 7.11 萨摩亚 vs 其他离岸中心对比

| 维度 | 萨摩亚 | BVI | 开曼 | 新加坡 | 香港 |
|---|---|---|---|---|---|
| **隐私** | ★★★★★ | ★★★ | ★★ | ★ | ★★ |
| **税收** | ★★★★★ | ★★★★★ | ★★★★★ | ★★★ | ★★ |
| **声誉** | ★★★ | ★★★ | ★★★★★ | ★★★★★ | ★★★★★ |
| **上市友好** | ★★ | ★★★★ | ★★★★★ | ★★★★★ | ★★★★★ |
| **银行开户** | ★★ | ★★★ | ★★★★ | ★★★★★ | ★★★★★ |
| **合规要求** | ★★★ | ★★ | ★★★★ | ★★★★★ | ★★★★★ |
| **数字资产** | ★★★★★ | ★★★ | ★★★ | ★★★★ | ★★★★ |
| **中国友好** | ★★★★★ | ★★ | ★★★ | ★★★ | ★★★ |

### 7.12 业务落地清单

| 业务 | 萨摩亚角色 | 牌照 |
|---|---|---|
| 顶层控股 | Samoa DAO Ltd. | IC |
| Web3 钱包 | Samoa Crypto Ltd. | DAEP |
| AI 服务 | Samoa Tech Ltd. | IC + 经济实质 |
| 支付清算 | Samoa Pay Ltd. | 申请 PSP 牌照 |
| 数字内容 | Samoa Media Ltd. | IC |
| 电商平台 | Samoa Marketplace Ltd. | IC |

---

## 第 8 章 · 海南公司 + VIE + ODI 备案

### 为什么需要这章

VIE（Variable Interest Entity，可变利益实体）架构是中国企业境外上市 / 跨境合规的标准方式，90%+ 在美 / 港上市的中概股采用 VIE。涉及：

1. **法律风险**：VIE 在中国法律下**无明确地位**（《外商投资法》未承认 VIE）
2. **监管审批**：VIE 需走 ODI 备案 + 37 号文登记
3. **税务优化**：海南自贸港「零关税 + 低税率 + 简税制」
4. **合规红线**：用户数据必须境内存储、关键信息基础设施（CII）安全审查

本章给出完整的 VIE 架构、37 号文登记、ODI 备案、海南主体搭建方案。

### 8.1 海南自贸港政策（参考 2025 年版）

#### 8.1.1 核心政策

| 政策 | 内容 | 时间 |
|---|---|---|
| **零关税** | 加工增值 ≥ 30% 免关税进口 | 2025 全岛封关 |
| **企业所得税** | 鼓励类企业 15%（一般 25%）| 2025-2035 |
| **个人所得税** | 高端人才 15% 封顶 | 2025-2035 |
| **离岛免税** | 旅客 10 万/年 | 已实施 |
| **加工增值免关税** | 鼓励类 30% 增值 | 2025 |
| **跨境服务贸易** | 负面清单 | 2024 |
| **数据跨境** | 自贸港「数据出境管理清单」| 2024 |

#### 8.1.2 鼓励类产业（海购星相关）

- **信息技术**：云计算、大数据、AI
- **金融科技**：跨境支付、供应链金融
- **Web3 / 区块链**：数字资产（**待明确**）
- **跨境电商**：保税仓 + 跨境物流
- **文化 / 影视**：短视频、直播
- **专业服务**：法律、会计、咨询

#### 8.1.3 税收优惠对比

| 地区 | 所得税 | 个税 | 增值税 |
|---|---|---|---|
| **海南（鼓励类）** | 15% | 15% 封顶 | 6%/13% |
| **北京中关村** | 15% | — | 6%/13% |
| **上海临港** | 15% | — | 6%/13% |
| **深圳前海** | 15% | 15%（紧缺人才） | 6%/13% |
| **全国一般** | 25% | 3%-45% | 6%/13% |

### 8.2 海南公司主体设计

#### 8.2.1 公司类型选择

| 类型 | 优势 | 劣势 | 海购星 |
|---|---|---|---|
| **有限责任公司** | 简单 | 资本限制 | × |
| **股份有限公司** | 上市友好 | 治理复杂 | ✓（未来上市）|
| **外商投资企业（FIE）** | ODI 配套 | 设立复杂 | ✓（**采用**）|
| **有限合伙** | 税务穿透 | 不能上市 | × |

#### 8.2.2 海南公司信息（拟）

- **名称**：「海购星（海南）数字科技有限公司」
- **类型**：外商投资股份有限公司
- **注册资本**：$50,000,000（认缴）
- **实缴**：$10,000,000（首期）
- **注册地**：海南三亚崖州湾科技城
- **经营范围**：
  - 互联网信息服务
  - 跨境电商平台运营
  - 技术服务 / 技术开发
  - 信息系统集成
  - 数据处理
  - 信息技术咨询服务
  - 软件开发
  - 广告设计
  - 会议展览
  - 进出口贸易

#### 8.2.3 入驻流程

1. **名称核准**（3 工作日）
2. **外资备案 / 审批**（商务部 / 发改委）
3. **工商注册**（5 工作日）
4. **税务登记**（1 工作日）
5. **外汇登记**（银行）
6. **行业资质**（如 ICP / EDI / 拍卖 / 文化）
7. **海关登记**（如需进出口）
8. **实际入驻**

**周期**：2-3 个月
**费用**：注册代理 ¥30,000-50,000

#### 8.2.4 行业资质

| 资质 | 适用 | 难度 | 周期 |
|---|---|---|---|
| **ICP 备案** | 任何网站 | 简单 | 7 天 |
| **ICP 经营许可证** | 经营性网站 | 中 | 60 天 |
| **EDI 许可证** | 电商 | 中 | 60 天 |
| **网络文化经营许可证** | 视频 / 直播 | 高 | 90 天 |
| **支付业务许可证** | 自有支付 | 极高 | —（停发）|
| **拍卖经营批准证书** | 拍卖业务 | 高 | 90 天 |
| **拍卖备案** | 网络拍卖 | 中 | 30 天 |

### 8.3 VIE 架构详解

#### 8.3.1 什么是 VIE

VIE（Variable Interest Entity，可变利益实体）= 通过**协议控制**而非股权控制境内运营公司，使境外上市主体能合并境内运营公司的财务。

#### 8.3.2 标准 VIE 架构

```
                         ┌──────────────────────┐
                         │   境外上市主体        │
                         │   开曼 / 萨摩亚 / BVI│
                         │   Samoa DAO Holdings │
                         └──────────┬───────────┘
                                    │ 100%
                                    ▼
                         ┌──────────────────────┐
                         │   境外中间层（HK）    │
                         │   HK Tech Ltd.       │
                         └──────────┬───────────┘
                                    │ 100%
                                    ▼
                         ┌──────────────────────┐
                         │   WFOE（境内外资）   │
                         │   海南外商投资公司   │
                         └──────────┬───────────┘
                                    │ VIE 协议
                                    ▼
                  ┌────────────────────────────────┐
                  │   OPCO（境内运营公司）         │
                  │   海南运营实体（持牌）         │
                  │   含 ICP / 支付 / 数据         │
                  └────────────────────────────────┘
                                    │
                                    ▼
                  ┌────────────────────────────────┐
                  │   中国籍股东（创始人）         │
                  │   通过协议控制 OPCO            │
                  └────────────────────────────────┘
```

#### 8.3.3 VIE 控制协议（7 套）

| 协议 | 目的 |
|---|---|
| **独家服务协议** | OPCO 向 WFOE 独家支付服务费，转移利润 |
| **独家购买权协议** | WFOE 有权随时购买 OPCO 全部股权 |
| **股权质押协议** | OPCO 股东将股权质押给 WFOE |
| **授权委托书** | OPCO 股东委托 WFOE 行使股东权利 |
| **配偶同意函** | 股东配偶同意协议条款（防离婚纠纷） |
| **借款协议** | WFOE 向 OPCO 股东提供贷款，用于实缴 |
| **业务经营协议** | OPCO 关键业务决策须经 WFOE 同意 |

#### 8.3.4 VIE 风险与缓解

| 风险 | 案例 | 缓解 |
|---|---|---|
| **政策风险** | 《外商投资法》未承认 VIE | 选择海南 / 香港「白名单」行业 |
| **监管风险** | 阿里 / 京东 / 滴滴被调查 | 加强合规 + 数据安全审查 |
| **司法风险** | 2022 年最高法承认 VIE 在合同纠纷中效力 | 协议合规化 |
| **税务风险** | VIE 利润转移被反避税 | 准备转让定价同期资料 |
| **外汇风险** | 利润汇出受限 | 合理分红的 ODI 备案 |
| **控制权风险** | 创始人离婚 / 死亡 | 配偶同意函 + 信托 |

### 8.4 ODI 备案

#### 8.4.1 什么是 ODI

ODI（Overseas Direct Investment）= 中国企业境外投资备案 / 核准。

#### 8.4.2 备案部门

| 部门 | 职责 |
|---|---|
| **发改委** | 项目核准 / 备案（按金额分级）|
| **商务部** | 境外投资备案（企业 + 金融）|
| **外汇局** | 外汇登记 + 资金汇出 |

#### 8.4.3 金额分级

| 金额 | 发改委 | 商务部 | 外汇局 |
|---|---|---|---|
| < $300M | 备案 | 备案 | 登记 |
| ≥ $300M | 核准 | 备案 | 登记 |
| 敏感行业 / 敏感国家 | 核准 | 核准 | 登记 |

**敏感行业**：电信 / 媒体 / 金融 / 军工 / 部分跨境数据
**敏感国家**：未建交国、制裁国、战乱国

#### 8.4.4 备案材料（20+ 项）

| 类别 | 具体材料 |
|---|---|
| **企业资质** | 营业执照、章程、近 3 年审计报告 |
| **项目可研** | 可行性研究报告 / 投资分析 |
| **资金来源** | 资金来源说明、董事会决议 |
| **境外主体** | 萨摩亚 IC 注册证书、章程 |
| **协议** | 投资协议 / 股东协议 / VIE 协议 |
| **法律意见** | 境内 + 境外律师双意见 |
| **环境评估** | 环境影响评估（部分行业）|
| **行业审批** | 行业主管部门意见（如金融）|

#### 8.4.5 流程与周期

```
项目内部决策
  ↓
发改委提交（1-3 月）
  ↓
商务部提交（1-3 月）
  ↓
外汇局登记（1-4 周）
  ↓
境外注资
  ↓
境外公司注册
  ↓
外汇登记变更
  ↓
年度 ODI 报告（4 月 30 日前）
```

**总周期**：3-9 个月
**总费用**：律师费 + 服务费 ¥200,000-500,000

#### 8.4.6 关键合规要点

- **资金来源**：自有资金 / 境外融资均可，但**不可**使用境内银行贷款（部分情况除外）
- **境外主体**：不能是空壳，必须有实际业务
- **投资行业**：不能是限制类（境外赌博、色情、影视、地产）
- **返程投资**：ODI 备案的境外公司投资境内，仍需走 FIE 设立流程

### 8.5 37 号文登记

#### 8.5.1 什么是 37 号文

「国家外汇管理局关于境内居民通过特殊目的公司境外投融资及返程投资外汇管理有关问题的通知」（汇发〔2014〕37 号），2014 年 7 月 4 日实施，俗称「37 号文」。

#### 8.5.2 适用对象

- **中国境内居民**（含港澳同胞 + 外籍绿卡）
- 通过 **特殊目的公司（SPV）** 境外投融资
- **返程投资**境内

#### 8.5.3 登记流程

```
创始人 / 员工 / 投资人
  ↓
设立境外 SPV（开曼 / 萨摩亚）
  ↓
外汇局登记（37 号文）
  - 个人基本信息
  - SPV 信息
  - 返程投资计划
  ↓
领取《境内居民个人境外投资外汇登记表》
  ↓
境外注资（汇入 / 利润汇出）
  ↓
境外融资 / 上市
  ↓
年度更新
```

**周期**：3-6 周
**费用**：律师费 ¥20,000-50,000

#### 8.5.4 所需材料

| 材料 | 备注 |
|---|---|
| 身份证 / 护照 | 中国籍 / 外籍 |
| 境外 SPV 资料 | 注册证书、章程、董事名册 |
| 融资协议 | 投资协议、SAFE / 可转债 |
| 资金来源说明 | 个人资金来源证明 |
| 返程投资计划 | 投资金额、路径 |
| 税务证明 | 个人所得税完税证明 |

#### 8.5.5 处罚案例

- **未登记罚款**：个人最高 5 万人民币
- **虚假登记**：5 年内不得重新登记
- **未变更登记**：影响后续利润汇出

#### 8.5.6 关键合规要点

- **及时登记**：必须在境外 SPV 设立后 60 日内登记
- **资金路径清晰**：境外注资必须经过登记的 SPV
- **年度更新**：股权变更、融资、新增股东都要更新
- **不可隐瞒**：登记信息会与境外银行 KYC 交叉验证

### 8.6 海南 + VIE + 萨摩亚三角架构

#### 8.6.1 三角关系

```
                        ┌──────────────────────┐
                        │   萨摩亚（境外）      │
                        │   Samoa DAO Holdings │
                        │   - 免税              │
                        │   - 隐私              │
                        │   - 数字资产牌照      │
                        └──────────┬───────────┘
                                   │ 100% ODI
                                   ▼
                        ┌──────────────────────┐
                        │   香港（中间层）      │
                        │   HK Tech Ltd.       │
                        │   - 银行账户          │
                        │   - 境外业务          │
                        └──────────┬───────────┘
                                   │ 100% FIE
                                   ▼
                        ┌──────────────────────┐
                        │   海南 WFOE           │
                        │   海购星（海南）      │
                        │   - 15% 所得税        │
                        │   - 数据境内          │
                        │   - 业务运营          │
                        └──────────┬───────────┘
                                   │ VIE 协议
                                   ▼
                        ┌──────────────────────┐
                        │   海南 OPCO           │
                        │   持牌公司            │
                        │   - ICP / EDI 牌照    │
                        │   - 实际业务          │
                        └──────────────────────┘
```

#### 8.6.2 资金流

```
客户付款
  ↓
Stripe / Airwallex（海外客户）
  ↓
HK Tech Ltd.（香港）
  ↓
ODI 备案后服务费回流
  ↓
海购星（海南）WFOE
  ↓
VIE 服务费
  ↓
OPCO（实际业务运营）
```

#### 8.6.3 数据流

- **用户数据**：100% 境内（OPCO / WFOE）
- **支付数据**：境内 + 跨境（合规申报）
- **AI 训练数据**：境内（用境内大模型）
- **海外用户数据**：仅在 HK Tech，符合 GDPR / CCPA

### 8.7 完整时间表

| 阶段 | 任务 | 周期 | 责任方 |
|---|---|---|---|
| **T+0** | 创始人 37 号文登记 | 3-6 周 | 创始人 / 律师 |
| **T+0** | 萨摩亚 IC 注册 | 2 周 | 注册代理 |
| **T+2 月** | 香港公司注册 | 2 周 | 律师 |
| **T+2 月** | 海南 WFOE 设立 | 2-3 月 | 注册代理 |
| **T+3 月** | 海南 OPCO 设立 | 2-3 月 | 注册代理 |
| **T+4 月** | VIE 协议签署 | 2 周 | 律师 |
| **T+5 月** | ODI 备案（发改委 + 商务部 + 外汇局） | 3-6 月 | 律师 |
| **T+8 月** | 银行开户（HK + 海南） | 1-2 月 | 财务 |
| **T+10 月** | 行业资质申请（ICP / EDI） | 1-3 月 | 法务 |
| **T+12 月** | 上线运营 | — | 团队 |

### 8.8 关键风险与应对

| 风险 | 概率 | 影响 | 应对 |
|---|---|---|---|
| **VIE 政策收紧** | 中 | 极高 | 持续关注政策，准备「直接持股」备选架构 |
| **ODI 备案被否** | 低 | 高 | 提前与商务局沟通，准备完整材料 |
| **37 号文未及时登记** | 中 | 中 | 设 60 天 deadline 提醒 |
| **海南资质审批延期** | 中 | 中 | 提前 3 月启动，并行办理 |
| **外汇汇出被卡** | 低 | 高 | 准备多套方案（服务费 / 货款 / 投资款）|
| **创始团队变动** | 中 | 高 | 股权激励 + 信托 + 投票权委托 |

### 8.9 总结

海购星 Samoa DAO 的 VIE + ODI + 海南 + 萨摩亚四层架构，是当前中国互联网公司**最完整、最优的跨境合规架构**。它实现了：

1. **顶层控股**（萨摩亚）：免税 + 隐私 + 数字资产牌照
2. **资金中转**（香港）：银行便利 + 跨境电商
3. **境内运营**（海南）：15% 税 + 数据合规 + 政策红利
4. **上市路径**（未来）：可走港股 / 美股 / 萨摩亚本地

相比阿里 / 京东 / 滴滴的 VIE 案，海购星在以下方面做了**实质性改进**：

- **主动合规**：先持牌再业务（萨摩亚 DAEP + 海南 ICP / EDI）
- **数据安全**：境内存储 + 自建 AI（避免滴滴式数据问题）
- **税务优化**：海南 15% + 萨摩亚 0%（不依赖 VIE 利润转移）
- **政策友好**：海南自贸港 + 一带一路（中萨友好）

这套架构的搭建周期约 12 个月，费用约 ¥500 万-1000 万（含 ODI 律师费、注册费、资质申请、咨询费）。

---

## 附录 A · 关键术语表

| 术语 | 英文 | 含义 |
|---|---|---|
| DLC | Digital Life Certificate | 海购星特色等级（类 KYC） |
| DVC | Digital Value Coin | 海购星平台积分 |
| FIE | Foreign Invested Enterprise | 外商投资企业 |
| WFOE | Wholly Foreign Owned Enterprise | 外资全资子公司 |
| OPCO | Operating Company | 境内运营公司 |
| VIE | Variable Interest Entity | 可变利益实体 |
| ODI | Overseas Direct Investment | 境外直接投资 |
| SPV | Special Purpose Vehicle | 特殊目的公司 |
| KYC | Know Your Customer | 了解你的客户 |
| AML | Anti-Money Laundering | 反洗钱 |
| STR | Suspicious Transaction Report | 可疑交易报告 |
| CTF | Counter-Terrorist Financing | 反恐怖融资 |
| DTA | Double Taxation Agreement | 双重税收协定 |
| FATCA | Foreign Account Tax Compliance Act | 美国海外账户税务合规法 |
| CRS | Common Reporting Standard | 共同申报准则 |
| PSP | Payment Service Provider | 支付服务提供商 |
| EMI | E-Money Institution | 电子货币机构 |
| MSB | Money Services Business | 货币服务业务 |
| MTL | Money Transmitter License | 资金转移牌照 |
| KYT | Know Your Transaction | 了解你的交易 |
| Travel Rule | — | 资金转移规则（FATF R.16） |
| CNY | Chinese Yuan | 人民币 |
| USD | United States Dollar | 美元 |
| USDT | Tether USD | 泰达币 |
| USDC | USD Coin | USD 硬币 |
| NFT | Non-Fungible Token | 非同质化代币 |
| DAO | Decentralized Autonomous Organization | 去中心化自治组织 |
| DID | Decentralized Identifier | 去中心化身份 |
| PoC | Proof of Concept | 概念验证 |
| ROI | Return on Investment | 投资回报率 |
| TCO | Total Cost of Ownership | 总拥有成本 |
| RPO | Recovery Point Objective | 恢复点目标 |
| RTO | Recovery Time Objective | 恢复时间目标 |
| SLA | Service Level Agreement | 服务水平协议 |
| CDN | Content Delivery Network | 内容分发网络 |
| WAF | Web Application Firewall | Web 应用防火墙 |
| DDoS | Distributed Denial of Service | 分布式拒绝服务 |
| mTLS | Mutual TLS | 双向 TLS |
| CI/CD | Continuous Integration / Continuous Deployment | 持续集成 / 持续部署 |
| RAG | Retrieval-Augmented Generation | 检索增强生成 |
| LLM | Large Language Model | 大语言模型 |
| GPU | Graphics Processing Unit | 图形处理单元 |
| MCP | Model Context Protocol | 模型上下文协议 |

---

## 附录 B · 参考资源

### 法规
- 《中华人民共和国外商投资法》（2019）
- 《境外投资管理办法》（商务部 2014）
- 《国家外汇管理局关于境内居民通过特殊目的公司境外投融资及返程投资外汇管理有关问题的通知》（汇发〔2014〕37 号）
- 《数据出境安全评估办法》（2022）
- 《关键信息基础设施安全保护条例》（2021）
- 《萨摩亚国际公司法》（1988）
- 《萨摩亚经济实质法》（2021）
- 《萨摩亚数字资产发行法》（2022）
- FATF 40 项建议
- OFAC SDN 制裁名单
- EU GDPR

### 工具
- [Samoa FSA](https://www.samoa-fsa.ws)
- [商务部对外投资合作信息服务系统](https://fec.mofcom.gov.cn)
- [国家外汇管理局应用服务平台](https://asps.csrc.gov.cn)
- [Kong Gateway](https://konghq.com)
- [ArgoCD](https://argo-cd.readthedocs.io)
- [Istio](https://istio.io)
- [vLLM](https://vllm.ai)
- [LangChain](https://langchain.com)
- [Prisma](https://prisma.io)
- [Citus](https://www.citusdata.com)

### 案例
- 阿里 / 蚂蚁 VIE 案（2020-2024）
- 京东数科 IPO 失败（2021）
- 滴滴安全审查（2022）
- TikTok 美国剥离（2024）
- Tornado Cash 制裁（2022）

---

> **文档版本**：v1.0.0  
> **更新日期**：2026-06-06  
> **下次评审**：2026-09-06  
> **维护人**：基础设施组（infra@smy.app）  
> **保密级别**：内部公开


