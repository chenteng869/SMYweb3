# 00 · 生产标准手册（Production Readiness Manual）

> **项目**：海购星 Samoa DAO（萨摩亚合规出海一站式平台）
> **范围**：4 端（admin-web / h5-app / 微信小程序 / 移动 APP / 官网）+ 后端 NestJS 服务
> **目标读者**：
> - **首要**：SRE / DevOps 工程师（on-call 7×24、生产事故第一响应人）
> - **次要**：后端 / 前端开发（CI/CD、调优、Runbook 维护）
> - **验收**：PM / 运营（发布检查清单、故障沟通话术）
>
> **配套文档**：
> - [00-foundation](../admin-prd/00-foundation.md) — 权限 / 审计 / KMS
> - [01-wechat-mini-program](../client-prd/01-wechat-mini-program.md) — 业务实现参考
> - [README](../admin-prd/README.md) — 21 篇后台 PRD 索引

---

## 0. 总览与 SLO 目标

> **为什么需要这章**：SRE 第一性原理是 **"先定义可量化的可靠性目标，再倒推系统设计"**。如果连"什么叫 production ready"都没说清楚，所有后续操作（部署、监控、灾备）都失去基准。本章是整本手册的"北极星"。

### 0.1 生产标准 4 个维度

| 维度 | 关键问题 | 衡量指标 |
|---|---|---|
| **可靠性（Reliability）** | 用户能正常下单、登录、收到推送吗？ | 可用性 ≥ 99.95%，错误率 < 0.1% |
| **性能（Performance）** | 接口慢不慢？首屏多久出来？ | P99 延迟 < 500ms，首屏 < 1.5s |
| **安全性（Security）** | 数据会不会泄露？会不会被攻击？ | 0 高危漏洞、KMS 全量覆盖、审计无盲区 |
| **可观测性（Observability）** | 出问题能不能 5 分钟内发现并定位？ | MTTD < 5min，MTTR < 30min |

### 0.2 核心 SLO 目标（与 00-foundation §2 业务目标对齐）

| 业务模块 | 可用性 SLO | 延迟 SLO（P99） | 错误率 SLO | 错误预算（月） |
|---|---|---|---|---|
| `/api/auth/*`（登录/注册） | 99.99% | < 300ms | < 0.05% | 4.32 分钟 |
| `/api/h5/services/*`（订阅） | 99.95% | < 500ms | < 0.1% | 21.6 分钟 |
| `/api/h5/payments/*`（支付） | 99.99% | < 800ms | < 0.01% | 4.32 分钟（**零容忍**） |
| `/api/h5/companies/*`（公司注册） | 99.9% | < 1000ms | < 0.2% | 43.2 分钟 |
| `/api/h5/banks/*`（银行开户） | 99.9% | < 1000ms | < 0.2% | 43.2 分钟 |
| `/api/h5/did/*`（DID 凭证） | 99.9% | < 1500ms（含链上确认） | < 0.3% | 43.2 分钟 |
| `/api/admin/*`（后台） | 99.5% | < 800ms | < 0.5% | 216 分钟 |
| WebSocket（消息推送） | 99.5% | 消息延迟 < 2s | < 0.5% | 216 分钟 |
| 微信小程序（前端） | 99.9%（JS 无报错） | 首屏 < 1.5s | Crash < 0.1% | 43.2 分钟 |
| 官网（静态） | 99.99%（CDN） | 首屏 < 1s | < 0.01% | 4.32 分钟 |

### 0.3 SLA 分级（对外承诺）

| 客户等级 | 可用性 | 故障响应 | 故障恢复 | 适用对象 |
|---|---|---|---|---|
| **企业级** | 99.99% | 5 分钟 | 30 分钟 | DLC 5 商家、签约 SPV |
| **标准级** | 99.95% | 15 分钟 | 4 小时 | DLC 3-4 商家 |
| **基础级** | 99.9% | 30 分钟 | 24 小时 | DLC 1-2 用户 |
| **免费级** | 99.5% | 1 小时 | 48 小时 | 游客、未付费用户 |

### 0.4 真实事故案例参考（血泪史）

> SRE 文化强调"**从别人的事故里学**"，本手册中所有"必做项"都附真实事故来源。

| 事故 | 时间 | 根因 | 教训 |
|---|---|---|---|
| **AWS S3 us-east-1 大宕机** | 2017-02-28 | 工程师打错命令，删了大量服务器和配置 | (1) 命令执行要二次确认 (2) 变更要 code review (3) 关键操作限权 |
| **GitLab.com 数据库被误删** | 2017-01-31 | 运维误操作 `rm -rf` 删除生产数据 | (1) 备份要 5-2-1 原则（5 份、2 种介质、1 份异地）(2) 演练要真做 (3) 数据库不能 rm 删除 |
| **Cloudflare 内存泄漏** | 2017-02-23 | 边缘代码正则表达式回溯引发 CPU 100% | (1) 边缘代码要严格 lint (2) 灰度发布要充分 (3) 监控要细到边缘节点 |
| **Facebook BGP 误配** | 2021-10-04 | 配置变更删除了所有 AS 路径 | (1) 高危操作走工单审批 (2) 变更要分批 (3) 回滚预案必演练 |
| **Stripe 邮件 webhook 重复** | 2023-08 | 网络抖动导致 webhook 5 分钟内重发 100+ 次 | (1) 所有 webhook 必须**幂等** (2) 接收方要带 `idempotency-key` |
| **CloudFront Header 注入** | 2024-04 | 边缘配置变更未走 PR | (1) 任何配置变更走 GitOps (2) IaC 必须有 plan/apply 审计 |

---

## 1. 部署与发布

> **为什么需要这章**：生产事故 60% 来自变更。**本章目的**：(1) 把"上线"这件事从艺术变成科学 (2) 让任何工程师都能在 30 分钟内完成一次生产发布 (3) 让任何事故都能在 5 分钟内回滚。

### 1.1 环境分层（dev / staging / production / DR）

> **核心原则**：环境之间**不共享**任何状态（数据库、Redis、对象存储、密钥），且**生产环境有且仅有一份**。

| 环境 | 用途 | 域名 | 数据库 | Redis | 部署方式 | 访问控制 |
|---|---|---|---|---|---|---|
| **dev** | 本地开发 | `*.dev.smy.local` | SQLite / 本地 PG | 本地 Redis | `docker compose up` | 仅开发者本机 |
| **staging** | 集成测试 / 性能压测 / 客户演示 | `staging.smy.app` | 阿里云 RDS（独立实例） | 阿里云 Redis（独立） | Docker Compose / K8s（轻量） | 全公司 |
| **production** | 正式服务 | `api.smy.app` / `admin.smy.app` | 阿里云 RDS **主从 + 异地灾备** | 阿里云 Redis 集群 | K8s（多副本） | 严格 RBAC |
| **DR** | 灾难恢复（**不在线服务**） | 阿里云新加坡 region | RDS 只读副本（提升为主） | Redis 备份恢复 | 闲置资源 + 季度演练 | 仅 SRE + DBA |

**关键约束**：
- ❌ dev/staging **永远不**连接生产数据库（CI 强制检查 env 变量名）
- ❌ staging **不**用生产数据（用脱敏数据集，见 §5.2）
- ✅ production 数据库账号密码与 staging **完全不同**
- ✅ 任何环境变更（K8s apply、DB 迁移、密钥轮转）必须**双人审批**

### 1.2 CI/CD Pipeline

> **为什么需要这章**：4 个端（admin-web / h5-app / 微信小程序 / 移动 APP / 官网）+ 1 个后端，**一周 30+ 次部署**——必须把"构建-测试-部署"自动化到**点一个按钮就能完成**。

#### 1.2.1 CI/CD 工具对比

| 维度 | GitHub Actions | GitLab CI | Jenkins | 阿里云云效 |
|---|---|---|---|---|
| **推荐场景** | 仓库在 GitHub | 仓库在 GitLab | 私有化部署 | 阿里云生态 |
| **并发** | 20（免费）/ 数百（付费） | 无限（自建 runner） | 无限 | 无限 |
| **配置** | YAML | YAML | Groovy / Pipeline | YAML |
| **缓存** | ✅ 内置 | ✅ 内置 | 需插件 | ✅ 内置 |
| **密钥** | Secrets（加密） | Variables（Masked） | Credentials | 加密变量 |
| **K8s 集成** | ✅ 官方 Action | ✅ 官方 | 需配置 | ✅ |
| **价格** | 免费额度大 | 免费（自建） | 免费 | 阶梯 |
| **本项目选择** | ✅ **推荐** | 备选 | 备选 | 国内合规备选 |

#### 1.2.2 本项目 Pipeline（GitHub Actions）

```yaml
# .github/workflows/api-prod.yml
name: API Production Deploy

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'apps/api/prisma/**'
      - 'package.json'
      - 'pnpm-lock.yaml'

concurrency:
  group: api-prod
  cancel-in-progress: false  # 生产不取消正在跑的部署

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter api test
      - run: pnpm --filter api test:e2e
      - run: pnpm --filter api lint
      - run: pnpm --filter api typecheck

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build & push image
        run: |
          echo "${{ secrets.ALIYUN_CR_PASSWORD }}" | docker login registry.cn-hangzhou.aliyuncs.com -u ${{ secrets.ALIYUN_CR_USERNAME }} --password-stdin
          docker build -t registry.cn-hangzhou.aliyuncs.com/smy/api:${{ github.sha }} -f apps/api/Dockerfile .
          docker push registry.cn-hangzhou.aliyuncs.com/smy/api:${{ github.sha }}
          docker tag registry.cn-hangzhou.aliyuncs.com/smy/api:${{ github.sha }} registry.cn-hangzhou.aliyuncs.com/smy/api:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production  # 触发审批
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to K8s (Argo Rollouts)
        run: |
          kubectl argo rollouts set image api-staging \
            registry.cn-hangzhou.aliyuncs.com/smy/api:${{ github.sha }}
          kubectl argo rollouts status api-staging
        env:
          KUBECONFIG: ${{ secrets.KUBECONFIG_PROD }}
```

**关键点**：
- `concurrency.cancel-in-progress: false` — 生产部署排队，**不**取消
- `environment: production` — 触发 GitHub Environment 审批规则（必须 2 人 approve）
- 测试跑通才能进 build，build 成功才能进 deploy
- 镜像 tag 用 `git.sha`（精确追溯）

#### 1.2.3 分阶段部署策略

```
代码 push → [PR 触发] 单元测试 + Lint + TypeCheck
         ↓
   merge to main → [自动] 集成测试 + E2E + 镜像构建
         ↓
   推 staging → [自动] 部署 staging，触发 5% 灰度
         ↓
   验证 30 分钟 → [手动] 业务验收 + 性能基线对比
         ↓
   推 production → [手动 + 2 人审批] 100% 灰度（实际 Argo Rollouts 自动金丝雀）
         ↓
   5/15/30/60 分钟观察点 → 全部通过则完成
```

### 1.3 容器化

> **为什么需要这章**：容器是 K8s 的"细胞"——**容器做不好，K8s 也救不了你**。本节核心目标：(1) 镜像小（< 300MB）(2) 构建快（< 5min）(3) 启动快（< 10s）(4) 安全（无 CVE 高危漏洞）。

#### 1.3.1 NestJS 后端 Dockerfile（多阶段构建）

```dockerfile
# apps/api/Dockerfile
# ============ Stage 1: deps ============
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 复制 lockfile（缓存命中）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/

RUN corepack enable && pnpm install --frozen-lockfile --prod=false

# ============ Stage 2: builder ============
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl python3 make g++
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable && pnpm --filter api... exec prisma generate
RUN pnpm --filter api build
RUN pnpm --filter api --prod deploy /app/deploy

# ============ Stage 3: runner (final image) ============
FROM node:20-alpine AS runner
LABEL org.opencontainers.image.source="https://github.com/samoa-dao/smy"
LABEL org.opencontainers.image.authors="sre@smy.app"

# 安全：不以 root 运行
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# 装 dumb-init、tini、curl
RUN apk add --no-cache dumb-init curl tini

WORKDIR /app

# 复制生产依赖
COPY --from=builder --chown=nestjs:nodejs /app/deploy/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/deploy/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/deploy/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/deploy/package.json ./

# Prisma engines
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma

USER nestjs

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:3000/healthz || exit 1

# 启动
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

**关键点**：
- **3 阶段构建**：deps（装依赖）→ builder（编译 + 生成 Prisma client）→ runner（仅生产文件）
- **非 root 运行**（`nestjs:1001`）
- **`dumb-init`**：正确处理 PID 1 信号（SIGTERM），让 K8s 优雅关闭生效
- **`HEALTHCHECK`**：Docker 自带健康检查（K8s liveness probe 也会调用 `/healthz`）
- **目标镜像 < 300MB**

#### 1.3.2 前端 Dockerfile（admin-web / h5-app / 官网）

```dockerfile
# apps/admin-web/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm build

# 用 nginx 提供静态服务
FROM nginx:1.25-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 安全头
RUN echo 'add_header X-Frame-Options "SAMEORIGIN" always;' >> /etc/nginx/conf.d/security.conf
RUN echo 'add_header X-Content-Type-Options "nosniff" always;' >> /etc/nginx/conf.d/security.conf
RUN echo 'add_header Referrer-Policy "strict-origin-when-cross-origin" always;' >> /etc/nginx/conf.d/security.conf

EXPOSE 80
HEALTHCHECK --interval=30s CMD wget -q --spider http://localhost/ || exit 1
```

#### 1.3.3 镜像瘦身 checklist

- [ ] 基础镜像用 `-alpine` 或 `-slim`（**不**用 `-latest`）
- [ ] 合并 `RUN` 命令，减少 layer
- [ ] 删除 `node_modules` 中的 `.md`/`.d.ts`/test 文件（`pnpm deploy` 已做）
- [ ] 用 `.dockerignore` 排除 `.git`、`node_modules`、`*.log`、`coverage/`
- [ ] 用 **dive** 工具分析镜像每一层大小
- [ ] 用 **trivy** 扫描高危 CVE

```bash
# 镜像大小分析
docker images | grep smy
dive registry.cn-hangzhou.aliyuncs.com/smy/api:latest

# CVE 扫描
trivy image --severity HIGH,CRITICAL registry.cn-hangzhou.aliyuncs.com/smy/api:latest
```

### 1.4 K8s 部署

> **为什么需要这章**：K8s 是事实标准。本节给出**本项目标准模板**，复制即可用。

#### 1.4.1 命名空间（Namespace）

```yaml
# k8s/base/namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: smy-prod
  labels:
    env: production
    pod-security.kubernetes.io/enforce: restricted  # 强制非 root
---
apiVersion: v1
kind: Namespace
metadata:
  name: smy-staging
  labels:
    env: staging
```

#### 1.4.2 ConfigMap（公开配置）

```yaml
# k8s/overlays/prod/api-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
  namespace: smy-prod
data:
  NODE_ENV: "production"
  PORT: "3000"
  # 不含密钥
  LOG_LEVEL: "info"
  SENTRY_DSN: "https://xxx@sentry.io/123"
  FEATURE_GRAY_DLC5: "true"
```

#### 1.4.3 Secret（敏感配置）— **用 KMS / Vault 注入，不直接用 K8s Secret**

```yaml
# k8s/overlays/prod/api-secret.yaml  # 仅占位，真实值用 External Secrets Operator 注入
apiVersion: v1
kind: Secret
metadata:
  name: api-secret
  namespace: smy-prod
  annotations:
    secrets.aliyun.com/cluster-kms-key-id: "key-xxx"  # 阿里云 KMS 加密
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@rds-host:5432/smy"
  REDIS_URL: "redis://:pass@redis-host:6379/0"
  STRIPE_SECRET_KEY: "sk_live_xxx"
  WECHAT_PAY_API_V3_KEY: "xxx"
  # KMS KEK（KEK 自身绝对不能放在 Secret 里；Secret 是加密后的密文）
  KMS_KEY_ID: "key-xxx"
```

**关键约束**：
- ❌ **不**用 `kubectl create secret` 直接写明文（落到 etcd 明文）
- ✅ 用 **External Secrets Operator**（阿里云 KMS / AWS Secrets Manager / Vault）
- ✅ K8s Secret 默认 base64，**不**等于加密
- ✅ 开启 `encryption-at-rest`（K8s 1.27+ 需手动配置）

#### 1.4.4 Deployment

```yaml
# k8s/base/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: smy-prod
  labels: { app: api }
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels: { app: api }
  template:
    metadata:
      labels: { app: api }
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: api-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: api
          image: registry.cn-hangzhou.aliyuncs.com/smy/api:v1.2.3
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
              name: http
          envFrom:
            - configMapRef: { name: api-config }
            - secretRef: { name: api-secret }
          env:
            - name: POD_NAME
              valueFrom: { fieldRef: { fieldPath: metadata.name } }
            - name: POD_IP
              valueFrom: { fieldRef: { fieldPath: status.podIP } }
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "2000m"
              memory: "2Gi"
          livenessProbe:
            httpGet: { path: /healthz, port: 3000 }
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet: { path: /readyz, port: 3000 }
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          startupProbe:
            httpGet: { path: /healthz, port: 3000 }
            initialDelaySeconds: 0
            periodSeconds: 5
            failureThreshold: 30  # 启动最多 150s
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 10"]  # 给 LB 摘流时间
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: cache
              mountPath: /app/.cache
      volumes:
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels: { app: api }
```

**关键点**：
- `replicas: 3` + 跨 AZ 分布
- `readOnlyRootFilesystem: true`（容器安全）
- `preStop: sleep 10`（**关键**：让 K8s 滚动升级前先停 10s，让 Ingress 摘流）
- `startupProbe` 防止慢启动被 liveness 误杀
- Prometheus 注解自动发现
- 资源 limits 必填（**不**填会被集群驱逐）

#### 1.4.5 Service + Ingress

```yaml
# k8s/base/api-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: smy-prod
spec:
  type: ClusterIP
  selector: { app: api }
  ports:
    - name: http
      port: 80
      targetPort: 3000
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api
  namespace: smy-prod
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/rate-limit: "100"  # 每秒 100 req
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts: [api.smy.app]
      secretName: api-tls
  rules:
    - host: api.smy.app
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service: { name: api, port: { number: 80 } }
```

### 1.5 数据库迁移（Prisma）

> **为什么需要这章**：数据库迁移是**最容易炸的变更**。90% 的"上线后回滚"都是因为 schema 变更没考虑回滚路径。

#### 1.5.1 迁移命令 SOP

```bash
# 1. 本地：创建迁移（生成 SQL 文件）
cd apps/api
pnpm prisma migrate dev --name add_dlc5_fields  # 本地开发

# 2. 提交迁移文件到 Git
git add prisma/migrations/20260606_add_dlc5_fields/
git commit -m "feat(db): add DLC 5 fields"

# 3. CI 自动执行（GitHub Actions）
pnpm prisma migrate deploy  # 生产用 deploy，不自动写

# 4. 验证
pnpm prisma migrate status
```

#### 1.5.2 破坏性变更回滚策略

| 变更类型 | 风险 | 回滚方案 |
|---|---|---|
| **新增表 / 新增列（nullable）** | 低 | `prisma migrate resolve --rolled-back` |
| **新增列（NOT NULL + 默认值）** | 中 | 先加 nullable 列 → 填数据 → 改 NOT NULL（多步迁移） |
| **删除列 / 改列名** | **高** | 灰度：先加新列 → 双写 → 切读 → 删旧列（3 次发布） |
| **改列类型** | **高** | 新建临时列 → 同步数据 → 切换应用 → 删旧列 |
| **删除表** | **极高** | 备份 → 软删（重命名为 `_archived_`）→ 90 天后真删 |
| **加索引** | 低 | PG 9.2+ 支持 `CREATE INDEX CONCURRENTLY`（不锁表） |

**核心原则**：
- ✅ 所有迁移都要在 **staging** 先跑一次（必须有 staging 用的真实规模数据）
- ✅ 大表（> 1000 万行）加索引必须 `CONCURRENTLY`
- ✅ 删除数据**必须**先备份
- ❌ **禁止**在生产直接 `prisma db push`（不会生成迁移文件，无法追溯）

#### 1.5.3 蓝绿迁移（用于大表 schema 变更）

```sql
-- 蓝绿迁移示例：把 orders.status 从 String 改 Enum
-- Step 1（发布 1）：加新列
ALTER TABLE "orders" ADD COLUMN "status_new" VARCHAR(20);
UPDATE "orders" SET "status_new" = "status";
ALTER TABLE "orders" ALTER COLUMN "status_new" SET NOT NULL;

-- Step 2（发布 2）：应用层双写
-- INSERT INTO orders (status, status_new) VALUES (?, ?)
-- SELECT status AS status_old, status_new FROM orders

-- Step 3（发布 3）：切换读路径
-- SELECT status_new AS status FROM orders

-- Step 4（发布 4）：删除旧列
ALTER TABLE "orders" DROP COLUMN "status";
ALTER TABLE "orders" RENAME COLUMN "status_new" TO "status";
```

### 1.6 蓝绿发布 / 金丝雀发布

> **为什么需要这章**：金丝雀发布是 SRE 工具箱里**性价比最高**的手段——能把故障影响控制在 1% 流量内。

#### 1.6.1 三种发布策略对比

| 策略 | 流量切分 | 回滚时间 | 风险 | 适用场景 |
|---|---|---|---|---|
| **滚动发布**（Rolling） | 渐进式替换 | 5-10 分钟 | 中 | 普通迭代 |
| **蓝绿**（Blue/Green） | 一刀切 | < 10 秒（DNS/LB 切换） | 低（双倍资源） | 金融、大版本 |
| **金丝雀**（Canary） | 1% → 10% → 50% → 100% | < 30 秒 | 极低 | 日常推荐 |

**本项目推荐**：**金丝雀 + Argo Rollouts**（K8s 生态最佳）

#### 1.6.2 Argo Rollouts 配置

```yaml
# k8s/base/api-rollout.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api
  namespace: smy-prod
spec:
  replicas: 6  # 6 = 3 旧 + 3 新（灰度期间）
  selector:
    matchLabels: { app: api }
  strategy:
    canary:
      steps:
        - setWeight: 5     # 5% 流量
        - pause: { duration: 5m }   # 观察 5 分钟
        - setWeight: 20
        - pause: { duration: 5m }
        - setWeight: 50
        - pause: { duration: 10m }
        - setWeight: 100
      canaryService: api-canary
      stableService: api-stable
      trafficRouting:
        nginx:
          stableIngress: api-stable
          additionalIngressAnnotations:
            canary-by-header: X-Canary
            canary-by-header-value: enable
      analysis:
        templates:
          - templateName: success-rate
        startingStep: 2
        args:
          - name: service-name
            value: api
  template:
    metadata:
      labels: { app: api }
    spec:
      # ... 同 Deployment.template
```

#### 1.6.3 自动化分析（Argo Rollouts Analysis）

```yaml
# k8s/base/analysis-template.yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
  namespace: smy-prod
spec:
  args:
    - name: service-name
  metrics:
    - name: error-rate
      interval: 60s
      count: 5
      successCondition: result[0] < 0.01  # 错误率 < 1%
      failureCondition: result[0] > 0.05  # 错误率 > 5% 直接中止
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(http_requests_total{job="{{args.service-name}}",status=~"5.."}[2m]))
            /
            sum(rate(http_requests_total{job="{{args.service-name}}"}[2m]))
    - name: p99-latency
      interval: 60s
      count: 3
      successCondition: result[0] < 0.5  # P99 < 500ms
      failureCondition: result[0] > 1.0  # P99 > 1s 直接中止
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{job="{{args.service-name}}"}[2m]))
```

**关键点**：
- 自动分析每个 step 暂停 5 分钟
- 错误率 > 5% 或 P99 > 1s → **自动中止** + 自动回滚
- 可通过 `X-Canary: enable` header 强制全量（调试用）

### 1.7 灰度发布（按用户 / 比例 / 白名单）

> **业务灰度**（按用户 ID 灰度） vs **部署金丝雀**（按流量比例）——是**两件不同的事**。

```typescript
// apps/api/src/common/gray/gray.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class GrayReleaseService {
  // 配置来源：DB + Redis 缓存
  private rules = {
    // 1. 白名单用户（公司内部测试）
    whitelist: new Set(['user_admin_001', 'user_admin_002']),
    // 2. DLC 5 用户（高价值客户优先）
    dlcLevelThreshold: 5,
    // 3. 按 userId hash 灰度 10%
    rolloutPercentage: 10,
  };

  shouldUseNewVersion(userId: string, userLevel: number, feature: string): boolean {
    // 优先级：白名单 > DLC 等级 > hash 比例
    if (this.rules.whitelist.has(userId)) return true;
    if (userLevel >= this.rules.dlcLevelThreshold) return true;

    // 一致性 hash：同一用户始终在同一组
    const hash = this.hash(userId + feature);
    return hash % 100 < this.rules.rolloutPercentage;
  }

  private hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
}
```

**灰度配置**（运营后台 / 配置文件）：
```yaml
# k8s/overlays/prod/gray-config.yaml
data:
  GRAY_DLC5_NEW_HOME: "true"          # DLC 5 全量
  GRAY_INVITATION_V2_PERCENT: "20"    # 邀请 V2 灰度 20%
  GRAY_PAYMENT_ALIPAY_NEW: "whitelist" # 支付宝新通道仅白名单
  GRAY_AI_BRAIN_GPT4O: "dlc4plus"     # GPT-4o 仅 DLC 4+
```

### 1.8 紧急回滚（一键回滚到上一版本）

> **核心原则**：回滚必须**比上线更快**。30 秒内必须能完成。

#### 1.8.1 Argo Rollouts 一键回滚

```bash
# Argo Rollouts 一键中止 + 回滚
kubectl argo rollouts abort api -n smy-prod
kubectl argo rollouts undo api -n smy-prod --to-revision=2

# 强制回滚到指定镜像（即使历史 rollout 没记录）
kubectl argo rollouts set image api registry.cn-hangzhou.aliyuncs.com/smy/api:v1.2.2 -n smy-prod
```

#### 1.8.2 数据库迁移回滚

```bash
# 标记最后一次迁移为已回滚（不执行反向 SQL）
cd apps/api
pnpm prisma migrate resolve --rolled-back 20260606_add_dlc5_fields

# 真的需要反向 SQL 时（破坏性变更）
psql -h $DB_HOST -U $DB_USER -d smy < prisma/migrations/20260606_add_dlc5_fields/down.sql
```

#### 1.8.3 配置回滚（Helm/Kustomize）

```bash
# Helm 回滚到上一个 revision
helm history api -n smy-prod
helm rollback api 5 -n smy-prod  # 回滚到 revision 5

# Kustomize 回滚（GitOps）
git revert HEAD~  # 撤销上一次变更
git push  # ArgoCD 自动同步
```

**回滚 SLA**：
- 应用回滚：< 30 秒
- 数据库迁移回滚：< 5 分钟（但**强烈建议**提前演练）
- 配置回滚：< 1 分钟

### 1.9 配置管理

> **核心原则**：**12-factor 配置外置**——配置不进代码、不进镜像。

| 配置类型 | 存储位置 | 注入方式 | 轮转 |
|---|---|---|---|
| 环境变量（普通） | K8s ConfigMap | envFrom | 重启 |
| 密钥 / 凭证 | KMS / Vault | External Secrets Operator | 自动 |
| 业务配置（灰度比例、阈值） | DB / Apollo / Nacos | 应用启动时拉取 + 监听变更 | 热更新 |
| 特性开关（feature flag） | LaunchDarkly / 自建 | SDK 拉取 | 热更新 |

**自建特性开关**（推荐用 Apollo / Nacos，本项目示例）：

```typescript
// apps/api/src/common/config/dynamic-config.service.ts
@Injectable()
export class DynamicConfigService {
  private cache = new Map<string, { value: any; ts: number }>();

  async get<T>(key: string, defaultValue: T): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.ts < 60_000) {
      return cached.value as T;
    }
    const fresh = await this.configCenter.get(key) ?? defaultValue;
    this.cache.set(key, { value: fresh, ts: Date.now() });
    return fresh as T;
  }
}
```

### 1.10 密钥管理（KMS）

> **为什么需要这章**：密钥泄露 = 平台被控制。详见 00-foundation §11，本节给运维侧 SOP。

#### 1.10.1 推荐方案

| 云厂商 | 方案 | 适用 | 价格 |
|---|---|---|---|
| **AWS** | AWS Secrets Manager + KMS | AWS 部署 | $0.40/secret/月 + KMS 调用费 |
| **阿里云** | 阿里云 KMS + 密钥管理服务 | 阿里云部署 | ¥0.06/10k 次调用 |
| **自建** | HashiCorp Vault | 多云 / 私有化 | 免费（自建运维） |
| **SaaS** | 1Password Business / Doppler | 小团队 | 阶梯 |

**本项目选择**：**阿里云 KMS**（与 RDS 同 Region，性能好 + 合规）+ **HashiCorp Vault**（备选，离线场景）

#### 1.10.2 密钥轮转 SOP

```bash
# 1. 创建新 KEK
aliyun kms CreateKey --KeySpec aliyun.sm4_128 --KeyUsage ENCRYPT/DECRYPT --Description "smy-prod-v2"

# 2. 触发应用层轮转（应用代码读 KMS_NEW_KEY_ID，重加密所有 DEK）
kubectl set env deployment/api KMS_KEY_ID=key-new-xxx -n smy-prod

# 3. 监控解密失败率（必须 < 0.01%）
# 4. 7 天后销毁旧 KEK
aliyun kms ScheduleKeyDeletion --KeyId key-old-xxx --PendingWindowInDays 7
```

**轮转周期**：
- 数据库密码：90 天
- API Key（Stripe / Alipay / WxPay）：180 天（或泄露立即）
- JWT 签名密钥：30 天
- KMS KEK：365 天
- TLS 证书：90 天（Let's Encrypt 自动）

---

## 2. 监控与告警

> **为什么需要这章**：Google SRE 书第一句话："**如果你无法度量它，就无法管理它**"。没有监控的系统 = 盲人开车。

### 2.1 SLI / SLO 定义

> **SLI** (Service Level Indicator) - 指标
> **SLO** (Service Level Objective) - 目标

| SLI | 计算公式 | SLO | 数据源 |
|---|---|---|---|
| **可用性** | 成功请求数 / 总请求数 | 99.95% | Prometheus |
| **延迟** | histogram_quantile(0.99, ...) | P99 < 500ms | Prometheus |
| **错误率** | 5xx / 总请求数 | < 0.1% | Prometheus |
| **饱和度** | CPU/Memory/DB 连接池使用率 | < 80% | Prometheus |
| **业务指标** | 支付成功率 | > 98% | 业务 DB + 报表 |

### 2.2 错误预算（Error Budget）政策

> **Google SRE 核心概念**：**100% 可用性不是目标**——因为成本无穷大。SLO 是"我们承诺的"，错误预算是"我们允许犯错的额度"。

**计算**：
- 月度窗口 = 30 × 24 × 60 = 43,200 分钟
- 99.95% SLO → 错误预算 = 0.05% × 43,200 = **21.6 分钟/月**
- 99.99% SLO → 错误预算 = 0.01% × 43,200 = **4.32 分钟/月**

**政策**：

| 错误预算剩余 | 行动 |
|---|---|
| **> 50%** | 正常迭代，新功能可上 |
| **20-50%** | 谨慎发布，新功能要灰度 |
| **< 20%** | **冻结非必要变更**，优先稳定性 |
| **< 0%（透支）** | 全公司 freeze，下季度 SRE 优先修复根因 |

### 2.3 Prometheus + Grafana 监控栈

#### 2.3.1 架构

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  NestJS API │───→│  Prometheus │───→│   Grafana   │
│  /metrics   │    │  (scrape 15s)│    │  (Dashboard)│
└─────────────┘    └──────┬──────┘    └─────────────┘
                          │
┌─────────────┐           │    ┌─────────────┐
│ Node Exporter│──────────┘    │ AlertManager│──→ Slack/Phone
│ (主机)       │                └─────────────┘
└─────────────┘
┌─────────────┐
│cAdvisor/    │
│kube-state   │──→ 采集容器/K8s 指标
└─────────────┘
```

#### 2.3.2 Prometheus 关键配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: smy-prod
    region: cn-hangzhou

rule_files:
  - /etc/prometheus/rules/*.yml

alerting:
  alertmanagers:
    - static_configs: [targets: ['alertmanager:9093']]

scrape_configs:
  - job_name: 'api'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_namespace]
        action: keep
        regex: smy-prod
      - source_labels: [__meta_kubernetes_pod_label_app]
        target_label: job
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: instance

  - job_name: 'postgres'
    static_configs: [targets: ['postgres-exporter:9187']]

  - job_name: 'redis'
    static_configs: [targets: ['redis-exporter:9121']]

  - job_name: 'nginx-ingress'
    static_configs: [targets: ['nginx-ingress:10254']]

  - job_name: 'node'
    kubernetes_sd_configs: [{ role: node }]
```

#### 2.3.3 NestJS 埋点

```typescript
// apps/api/src/common/metrics/metrics.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private registry: Registry;
  private httpRequestsTotal: Counter;
  private httpRequestDuration: Histogram;

  constructor() {
    this.registry = new Registry();
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    // 标准化 path（避免 /users/123 拆成 N 个 label）
    const path = this.normalizePath(req.route?.path || req.url);

    return next.handle().pipe(
      tap({
        next: () => this.record(req.method, path, res.statusCode, start),
        error: (err) => this.record(req.method, path, err.status || 500, start),
      }),
    );
  }

  private record(method: string, path: string, status: number, start: number) {
    const duration = (Date.now() - start) / 1000;
    const statusClass = `${Math.floor(status / 100)}xx`;
    this.httpRequestsTotal.inc({ method, path, status: statusClass });
    this.httpRequestDuration.observe({ method, path, status: statusClass }, duration);
  }

  private normalizePath(url: string): string {
    return url.replace(/\/[0-9a-f-]{20,}/g, '/:id').replace(/\?.*$/, '');
  }
}
```

```typescript
// apps/api/src/main.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

app.useGlobalInterceptors(new MetricsInterceptor());
app.use('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 2.4 关键 Dashboard

#### 2.4.1 业务 Dashboard（PM / 运营看）

| 面板 | 指标 | 数据源 |
|---|---|---|
| **DAU / MAU** | 日活 / 月活 | 业务 DB + Prisma |
| **GMV** | 总交易额（按币种 / 渠道） | Transaction 表 |
| **支付成功率** | 成功 / 总支付 | 业务 DB |
| **退款率** | 退款金额 / GMV | Refund 表 |
| **DLC 分布** | 各等级用户数 | User 表 |
| **拉新 K 因子** | 邀请转化系数 | InvitationLog |
| **凭证签发数** | DID VC 日签发 | VerifiableCredential |

#### 2.4.2 应用 Dashboard（开发看）

| 面板 | 指标 |
|---|---|
| **QPS / RPS** | 按 endpoint 分 |
| **延迟分布** | P50 / P90 / P99 / P99.9 |
| **错误率** | 按 4xx / 5xx / 业务错误 |
| **慢 SQL Top 10** | Prisma query log |
| **内存 / CPU** | 进程级 |
| **Node 事件循环** | event loop lag |

#### 2.4.3 基础设施 Dashboard（SRE 看）

| 面板 | 指标 |
|---|---|
| **K8s Pod 状态** | Running / Pending / CrashLoopBackOff |
| **节点资源** | CPU / Memory / Disk / Network per node |
| **HPA 状态** | 副本数 vs 目标 |
| **Ingress 流量** | QPS / 5xx / 带宽 |
| **证书过期** | 距过期 < 30 天告警 |

#### 2.4.4 数据库 Dashboard（DBA 看）

| 面板 | 指标 |
|---|---|
| **PG 连接池** | active / idle / max |
| **复制延迟** | 主从 lag |
| **TPS / QPS** | 读写吞吐 |
| **慢查询** | pg_stat_statements |
| **锁等待** | pg_locks |
| **表 / 索引膨胀** | bloat ratio |
| **WAL 积压** | pg_stat_replication |

### 2.5 告警分级（P0 / P1 / P2 / P3）

| 级别 | 触发条件 | 响应时间 | 通知渠道 | 升级路径 |
|---|---|---|---|---|
| **P0 - 紧急** | 生产完全不可用 / 资金损失 | 5 分钟 | 电话 + 短信 + Slack #incident | SRE Lead → CTO |
| **P1 - 高** | 核心功能降级 / 错误率 > 5% | 15 分钟 | Slack + 短信 on-call | SRE |
| **P2 - 中** | 非核心功能受损 / 错误率 1-5% | 1 小时 | Slack #alerts | on-call |
| **P3 - 低** | 性能警告 / 容量 80% | 24 小时 | Slack #alerts（仅工作日） | — |

**P0 告警示例**：
```yaml
# prometheus rules
- alert: APIErrorRateHigh
  expr: |
    sum(rate(http_requests_total{job="api",status=~"5.."}[2m]))
    /
    sum(rate(http_requests_total{job="api"}[2m]))
    > 0.05
  for: 2m
  labels: { severity: P0 }
  annotations:
    summary: "API 错误率 {{ $value | humanizePercentage }} > 5%"
    runbook: "https://wiki.smy.app/runbook/api-error-rate"
```

**P1 告警示例**：
```yaml
- alert: PaymentSuccessRateLow
  expr: |
    sum(rate(payment_success_total[5m]))
    /
    sum(rate(payment_attempt_total[5m]))
    < 0.95
  for: 3m
  labels: { severity: P1 }
```

### 2.6 日志聚合

#### 2.6.1 选型对比

| 方案 | 优势 | 劣势 | 价格 | 推荐 |
|---|---|---|---|---|
| **ELK**（Elasticsearch + Logstash + Kibana） | 功能最全，社区大 | 重，运维成本高 | 中 | 自建 |
| **Loki + Grafana** | 轻量、集成 Grafana | 查询能力弱 | 低 | **✅ 本项目推荐** |
| **阿里云 SLS** | 国内合规、稳定 | 锁云 | 中 | 阿里云备选 |
| **Datadog Logs** | SaaS，开箱即用 | 贵 | 高 | 海外 |

#### 2.6.2 NestJS 日志规范

```typescript
// apps/api/src/common/logger/pino-logger.service.ts
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // 生产输出 JSON，便于 Loki 解析
  transport: process.env.NODE_ENV === 'production'
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true } },
  // 关键：包含 traceId 用于链路追踪
  mixin: () => ({ traceId: getTraceId() }),
});

// 禁止打印的字段（脱敏）
const redactPaths = [
  '*.password',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.apiKey',
  '*.secret',
  '*.cardNumber',
  '*.cvv',
  '*.idNumber',
  'req.headers.authorization',
  'req.headers.cookie',
];

export const safeLogger = logger.child({}).constructor;
```

**关键约束**：
- ✅ 所有日志含 `traceId`（链路追踪 ID）
- ✅ 错误日志含 `error.stack`
- ❌ **不**打印敏感信息（密码、token、身份证、卡号）
- ❌ **不**用 `console.log`（用 `Logger`）
- 日志级别：dev=debug，staging=info，prod=warn

#### 2.6.3 日志保留策略

| 环境 | 保留期 | 存储 |
|---|---|---|
| dev | 7 天 | 本地 |
| staging | 30 天 | SLS / Loki |
| prod hot | 30 天 | 阿里云 SLS（高频查询） |
| prod cold | 1 年 | OSS（归档存储，查询需解冻） |
| 审计日志 | **7 年** | 不可篡改 OSS（金融合规） |

### 2.7 链路追踪（APM）

#### 2.7.1 选型

| 方案 | 特点 | 推荐 |
|---|---|---|
| **Jaeger** | CNCF，开源，标准 OpenTelemetry | **✅ 本项目推荐** |
| **SkyWalking** | 国产 APM，中文社区好 | 国内合规备选 |
| **Datadog APM** | SaaS，体验好 | 贵 |
| **阿里云 ARMS** | 阿里云原生 | 阿里云部署优选 |
| **Sentry** | 错误追踪 + 性能 | **✅ 错误监控必装** |

#### 2.7.2 OpenTelemetry 集成

```typescript
// apps/api/src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PrismaInstrumentation } from '@prisma/instrumentation';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'smy-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.IMAGE_TAG || 'unknown',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318/v1/traces',
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new PrismaInstrumentation(),
  ],
});

sdk.start();
```

### 2.8 业务指标

```typescript
// apps/api/src/common/metrics/business-metrics.ts
import { Counter, Gauge, Histogram } from 'prom-client';

export const businessMetrics = {
  // 业务计数器
  paymentSuccess: new Counter({
    name: 'payment_success_total',
    help: 'Successful payments',
    labelNames: ['channel', 'currency'],
  }),
  paymentFailed: new Counter({
    name: 'payment_failed_total',
    help: 'Failed payments',
    labelNames: ['channel', 'reason'],
  }),
  kycApproved: new Counter({
    name: 'kyc_approved_total',
    help: 'KYC approvals',
    labelNames: ['country'],
  }),
  vcIssued: new Counter({
    name: 'vc_issued_total',
    help: 'Verifiable credentials issued',
    labelNames: ['type'],
  }),
  // 业务 Gauge（实时状态）
  activeUsers: new Gauge({
    name: 'active_users',
    help: 'Currently active users (5 min window)',
  }),
  pendingKyc: new Gauge({
    name: 'pending_kyc_count',
    help: 'KYC pending review count',
  }),
};
```

### 2.9 On-call 轮值

> **核心原则**：on-call **不能是惩罚**。必须有补偿、有兜底、有休息。

#### 2.9.1 轮值表（PagerDuty / 阿里云告警）

| 角色 | 人数 | 周期 | 补偿 |
|---|---|---|---|
| **SRE Primary** | 1 | 7 天 | ¥1000/天 |
| **SRE Secondary** | 1 | 7 天 | ¥500/天 |
| **DBA Primary** | 1 | 14 天 | ¥800/天 |
| **应用 Owner** | 模块负责人 | — | — |

#### 2.9.2 升级路径

```
告警触发 → Primary on-call（5 分钟未响应）
        ↓
        Secondary on-call（10 分钟未响应）
        ↓
        SRE Lead（20 分钟未响应）
        ↓
        CTO（30 分钟未响应）
```

### 2.10 告警降噪

> **告警疲劳是真实问题**：on-call 半夜被一个非紧急告警吵醒 3 次，下次 P0 告警他会把手机静音。

**降噪策略**：
1. **聚合**：1 分钟内同类告警只发一次（AlertManager `group_by` + `group_wait`）
2. **静默**：维护窗口提前静默（`amtool silence add --alertmatchers=...`）
3. **抑制**：上游故障时抑制下游告警（`inhibit_rule`）
4. **分级**：按 §2.5 严格分级
5. **去重**：相同 `instance + alertname` 5 分钟内只发一次
6. **自愈**：能自动修复的不告警（如 cert-manager 自动续期）

```yaml
# alertmanager.yml
route:
  group_by: ['alertname', 'cluster']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'slack-alerts'
  routes:
    - matchers: [severity="P0"]
      receiver: 'pagerduty-critical'
      group_wait: 10s
      repeat_interval: 5m
    - matchers: [severity="P3"]
      receiver: 'slack-low-priority'
      repeat_interval: 24h
inhibit_rules:
  - source_matchers: [alertname="APIErrorRateHigh"]
    target_matchers: [alertname="PaymentErrorRateHigh"]
    equal: ['cluster']
```

---

## 3. 备份与灾备

> **为什么需要这章**：**有备份没演练 = 没备份**。GitLab 2017 事故中他们 5 种备份方式全部失败——不是没备份，是**从来没真测过恢复**。

### 3.1 RPO / RTO 目标（按业务分级）

| 业务模块 | RPO（数据丢失上限） | RTO（恢复时间上限） | 等级 |
|---|---|---|---|
| **支付 / 交易** | **< 1 分钟** | **< 15 分钟** | Tier 0 |
| **用户账号 / KYC** | < 5 分钟 | < 1 小时 | Tier 1 |
| **订单 / 公司 / 银行** | < 15 分钟 | < 4 小时 | Tier 1 |
| **DID 凭证 / 审计** | **< 0**（不可丢） | < 4 小时 | Tier 0 |
| **DLC / DVC 流水** | < 5 分钟 | < 1 小时 | Tier 1 |
| **AI 对话 / 媒体内容** | < 1 小时 | < 24 小时 | Tier 2 |
| **日志 / 通知** | < 1 小时 | < 24 小时 | Tier 3 |

### 3.2 数据库备份（PostgreSQL）

#### 3.2.1 备份策略

| 备份类型 | 频率 | 保留 | 工具 |
|---|---|---|---|
| **全量备份** | 每天 03:00（低峰） | 30 天本地 / 1 年 OSS | `pg_basebackup` / 阿里云 RDS 自动 |
| **增量（WAL 归档）** | 实时 | 7 天本地 / 30 天 OSS | `archive_command` |
| **逻辑备份** | 每周日 02:00 | 90 天 | `pg_dump`（仅用于跨版本迁移） |
| **异地副本** | 实时（流复制） | 持续 | 阿里云 RDS 跨 region 副本 |

#### 3.2.2 WAL 归档配置

```ini
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'ossutil cp %p oss://smy-prod-pg-wal/wal/%f && echo %f >> /var/log/pg_wal_archive.log'
archive_timeout = 60
max_wal_senders = 10
wal_keep_size = '1GB'
```

#### 3.2.3 阿里云 RDS 自动备份

| 备份项 | 配置 |
|---|---|
| 数据备份 | 每日 1 次，保留 7 天（可升级 30 天） |
| 日志备份 | 保留 7 天 |
| 跨地域备份 | 启用（备份到新加坡 region） |
| 备份周期 | 周一-周日 03:00-04:00 |
| 高可用 | 同城双中心 + 异地灾备 |

#### 3.2.4 手动备份命令（自建 PG）

```bash
# 全量备份
pg_basebackup -h $DB_HOST -U replicator -D /backup/$(date +%Y%m%d) -Ft -z -Xs -P

# 逻辑备份（导出 SQL）
pg_dump -h $DB_HOST -U $DB_USER -d smy --schema=public -Fc -f /backup/smy_$(date +%Y%m%d).dump

# 恢复
pg_restore -h $NEW_HOST -U $DB_USER -d smy --schema=public -j 4 /backup/smy_20260606.dump

# 验证备份
pg_dump -h $DB_HOST -U $DB_USER -d smy --schema=public | head -100
```

### 3.3 Redis 备份

```bash
# RDB 快照（默认开启）
# redis.conf
save 900 1      # 900 秒内至少 1 个 key 变化
save 300 10
save 60 10000

# AOF 持久化（推荐 always）
appendonly yes
appendfsync always
auto-aof-rewrite-min-size 64mb

# 备份到 OSS
cat > /etc/cron.daily/redis-backup <<EOF
#!/bin/bash
ossutil cp /var/lib/redis/dump.rdb oss://smy-prod-redis/$(date +%Y%m%d)/dump.rdb
ossutil cp /var/lib/redis/appendonly.aof oss://smy-prod-redis/$(date +%Y%m%d)/appendonly.aof
EOF
```

### 3.4 文件存储备份（OSS）

| 资源 | 源 | 备份目标 | 频率 |
|---|---|---|---|
| 用户上传（KYC 图片、视频） | 阿里云 OSS（杭州） | 阿里云 OSS（新加坡） | 实时（跨区复制） |
| 备份归档 | 阿里云 OSS（杭州） | 阿里云 OSS（深圳）冷归档 | 每日 |
| 长期归档（> 1 年） | OSS 标准 | OSS 归档 / 冷归档 | 90 天后自动转 |

```bash
# ossutil 跨区复制
ossutil cp oss://smy-prod-files/ oss://smy-dr-files/ --recursive --update
```

### 3.5 备份验证（**最关键**）

> **血泪教训**：GitLab 2017 数据库被误删后，他们有 5 种备份方式，但**全部失败**——因为从来没真测过恢复。本节强制每月演练。

#### 3.5.1 月度恢复演练 SOP

```bash
# 1. 选一台隔离的 staging 机器
ssh staging-restore-01

# 2. 从 OSS 下载最新备份
ossutil cp oss://smy-prod-pg-backup/20260601/smy.dump /tmp/

# 3. 启动临时 PG 实例
docker run -d --name pg-restore \
  -e POSTGRES_PASSWORD=test \
  -v /tmp:/backup \
  -p 55432:5432 \
  postgres:15

# 4. 恢复
pg_restore -h localhost -p 55432 -U postgres -d smy --schema=public -j 4 /tmp/smy.dump

# 5. 验证数据完整性
psql -h localhost -p 55432 -U postgres -d smy -c "SELECT COUNT(*) FROM \"User\";"
psql -h localhost -p 55432 -U postgres -d smy -c "SELECT COUNT(*) FROM \"Transaction\";"
# 与生产对比（误差 < 1%）

# 6. 跑核心业务 E2E（用恢复出来的数据）
pnpm --filter api test:e2e:restore

# 7. 清理
docker rm -f pg-restore

# 8. 填演练报告（含耗时、问题、改进项）
```

**演练 checklist**：
- [ ] 本月 1 号完成恢复演练
- [ ] 恢复时间 RTO 达标
- [ ] 数据完整性校验通过
- [ ] E2E 测试通过
- [ ] 演练报告归档
- [ ] 发现的改进项已记录

### 3.6 灾备切换（DR Drill）

#### 3.6.1 三种模式对比

| 模式 | 资源占用 | 切换时间 | 数据丢失 | 成本 |
|---|---|---|---|---|
| **Active-Active** | 2x | 0 秒 | 0 | 高 |
| **Active-Passive** | 1.5x | 分钟级 | 秒级 | 中 |
| **Warm Standby** | 1.1x | 30-60 分钟 | 分钟级 | 低 |
| **Cold Standby** | 0.1x | 数小时 | 小时级 | 极低 |

**本项目选择**：**Warm Standby**（成本与可靠性平衡）

#### 3.6.2 灾备架构

```
┌────────────────────┐     实时同步     ┌────────────────────┐
│  杭州 Region        │ ──────────────→ │  新加坡 Region      │
│  (主)              │   异地复制        │  (备 - 闲置)        │
│                    │                 │                    │
│  - RDS 主库        │                 │  - RDS 备库        │
│  - Redis 主节点    │                 │  - Redis 备节点    │
│  - K8s 集群        │                 │  - 预部署镜像      │
│  - OSS 杭州        │                 │  - OSS 新加坡      │
└────────────────────┘                 └────────────────────┘
```

### 3.7 跨区域容灾

**RDS 跨地域灾备**：
- 阿里云 RDS 支持跨 region 只读副本
- 用 DMS（数据传输服务）做反向同步（灾备升主后能同步回杭州）

**K8s 灾备**：
- 镜像推送两地 Registry（自动）
- 灾备 region 的 K8s 集群保持运行但**不**调度业务 pod（节省资源）
- 切换时用 ArgoCD 拉起

### 3.8 DNS 切换

```bash
# 阿里云 DNS（强制走 API 切换，避免缓存）
aliyun alidns UpdateDomainRecord \
  --RecordId xxx \
  --RR api \
  --Type A \
  --Value $DR_LB_IP

# 检查全球 DNS 生效
for ns in $(dig NS smy.app +short); do
  dig @$ns api.smy.app A +short
done

# DNS 缓存清理命令
# Cloudflare：API purge cache
# 客户端：等 TTL 过期（设置 TTL=60s 灾备场景）
```

**TTL 策略**：
- 正常 TTL：1 小时
- 灾备 DNS：TTL 60 秒（牺牲查询性能换切换速度）

### 3.9 演练 SOP（季度全链路演练）

| 季度 | 演练类型 | 范围 |
|---|---|---|
| **Q1** | DB 恢复演练 | 仅 DB |
| **Q2** | 全链路切换 | DB + Redis + K8s + DNS |
| **Q3** | 区域切换 | 杭州 region 故障，切新加坡 |
| **Q4** | 备份完整性 | 验证所有备份 + 模拟攻击 |

**演练结果强制归档**：
- 演练视频（屏幕录制）
- 切换耗时
- 数据丢失量（对比演练前后数据）
- 沟通流程
- 改进项（next quarter follow up）

---

## 4. 事故应急

> **为什么需要这章**：事故**不是问题，问题是没有准备就发生事故**。本章是"真出事时怎么活下来"的 SOP。

### 4.1 事故分级

| 级别 | 定义 | 示例 | 客户影响 |
|---|---|---|---|
| **SEV-1** | 核心服务完全不可用 > 5 分钟 | 生产全站宕机、数据库主库故障 | 100% 用户 |
| **SEV-2** | 核心功能部分不可用 | 支付失败、登录失败、推送失败 | 50%+ 用户 |
| **SEV-3** | 非核心功能不可用 | AI Brain 卡顿、视频上传失败 | < 30% 用户 |
| **SEV-4** | 内部工具/性能问题 | 后台慢、报表延迟 | 无外部影响 |

### 4.2 响应流程

```
┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
│ 发现    │ →  │ 通报    │ →  │ 止血    │ →  │ 修复    │ →  │ 复盘   │
│(告警/   │    │(战时群  │    │(降级/   │    │(根因    │    │(post-  │
│ 用户)   │    │ 上线)   │    │ 回滚)   │    │ 修复)   │    │ mortem)│
└────────┘    └────────┘    └────────┘    └────────┘    └────────┘
   < 1min       < 5min         < 30min         < 24h         < 7d
```

### 4.3 关键角色

| 角色 | 职责 | 人数 |
|---|---|---|
| **IC（Incident Commander）** | 决策、统筹、对外发声 | 1 |
| **Comms（沟通官）** | 对内通报、对外公告、客服话术 | 1 |
| **Ops（操作员）** | 实际执行（kubectl / SQL / 部署） | 1-2 |
| **SME（领域专家）** | 提供业务/技术方案 | 按需 |
| **Scribe（记录员）** | 实时记录 timeline | 1 |

**绝对禁止**：IC 自己动手操作（必须 Ops 干，IC 只决策）。

### 4.4 战时指挥室

| 沟通工具 | 用途 | 优先级 |
|---|---|---|
| **Slack #incident-active** | 实时战时沟通（必须全员加入） | P0 |
| **腾讯会议** | 战时语音（一直挂着） | P0 |
| **PagerDuty** | 电话告警 | P0 |
| **钉钉群** | 通知高管 | P1 |
| **短信** | 备份通知 | P1 |

**Slack 频道模板**（战时立刻创建）：
```
#incident-2026-06-06-api-down
- 事故标题
- IC: @sre-lead
- Comms: @pr-lead
- Ops: @sre-oncall
- 状态: INVESTIGATING / MITIGATED / RESOLVED
- 实时 timeline（每分钟更新）
```

### 4.5 Kill Switch 清单

> **为什么需要这章**：紧急情况下，能**立刻关停某个能力**比修复它更重要。Kill Switch 必须**预埋**好，**演练**过。

| 开关 | 控制位置 | 触发场景 | 操作时间 |
|---|---|---|---|
| **支付通道** | Apollo / DB `feature_flag` | 支付通道故障 | < 30s |
| **提现** | 后台手动 / API | 风控触发 | < 1min |
| **用户登录** | API Gateway / 后台 | 防撞库/刷号 | < 1min |
| **AI Brain 调用** | 限流 0 | OpenAI/Anthropic 故障 | < 1min |
| **链上交易** | DB flag | 链 RPC 故障 / Gas 失控 | < 1min |
| **DID 凭证签发** | API | 私钥泄露 | < 30s |
| **视频上传** | 后台 | 存储满 | < 1min |
| **营销活动** | DB flag | 活动 bug | < 1min |
| **通知推送** | 后台 | 推送服务故障 | < 1min |
| **KMS 解密** | 应急模式 | KMS 不可用 | < 5min（切本地 KEK） |

**Kill Switch 实现**：
```typescript
// apps/api/src/common/killswitch/killswitch.service.ts
@Injectable()
export class KillSwitchService {
  async isEnabled(feature: string): Promise<boolean> {
    // 优先 Redis（毫秒级），降级 DB
    const cached = await this.redis.get(`killswitch:${feature}`);
    if (cached !== null) return cached === '1';
    const flag = await this.db.killSwitch.findUnique({ where: { feature } });
    await this.redis.set(`killswitch:${feature}`, flag?.enabled ? '1' : '0', 'EX', 60);
    return flag?.enabled ?? true;
  }
}

// 用法
@Post('pay')
async pay(@Body() dto: PayDto) {
  if (!(await this.killSwitch.isEnabled('payment'))) {
    throw new ServiceUnavailableException('支付通道维护中');
  }
  // ... 正常支付逻辑
}
```

### 4.6 沟通模板

#### 4.6.1 对内（Slack 公告）

```
[SEV-1] 2026-06-06 14:32 - 支付服务故障

📍 当前状态：支付通道 Stripe 不可用，估算 80% 支付失败
⏰ 起始时间：14:25
👤 IC: @sre-lead (张三)
🔧 Ops: @sre-oncall (李四)
📢 Comms: @pr-lead (王五)

✅ 已做：
- 14:26 收到告警
- 14:28 战时群建立
- 14:30 切到 Alipay 备份通道

⏳ 进行中：
- 联系 Stripe 客服
- 监控切换后成功率

🕐 下次更新：15:00 或状态变化时
```

#### 4.6.2 对外（官网 banner / 状态页）

```
[维护中] 支付功能暂时不可用
开始时间：2026-06-06 14:25
预计恢复：2026-06-06 15:30
影响范围：Stripe 支付
替代方案：您可使用 Alipay 微信支付完成订单
```

#### 4.6.3 客服话术

```
亲，非常抱歉，目前 Stripe 通道出现故障，导致部分用户支付失败。
您可以：
1. 切换到支付宝/微信支付完成订单（推荐）
2. 稍后 30 分钟再试
我们技术团队正在紧急处理，预计 1 小时内恢复。
如已扣款未到账，请提供订单号，我们会在 24 小时内退款。
```

#### 4.6.4 高管汇报

```
事故 #2026-06-001：Stripe 通道故障
- 影响用户：约 1.2 万用户，估算损失订单 ¥150 万
- 持续时间：65 分钟（14:25-15:30）
- 根因：Stripe 区域 API 故障（他们官方 incident）
- 我们的行动：自动切到 Alipay，30 分钟内恢复 80% 流量
- 改进项：增加第 3 家支付通道（PayPal）
```

### 4.7 客户支持

| 工单级别 | 响应时间 | 处理时间 | 适用 |
|---|---|---|---|
| P0 | 5 分钟 | 1 小时 | 资金问题、账号锁定 |
| P1 | 30 分钟 | 4 小时 | 功能故障、订单异常 |
| P2 | 4 小时 | 24 小时 | 使用咨询 |
| P3 | 24 小时 | 72 小时 | 建议反馈 |

**退款政策**：
- 系统故障导致扣款：24 小时内自动退
- 重复扣款：客服核实后立即退
- 用户主动退款：30 天内按 7.5 退（3% 通道费）

### 4.8 事故复盘（Postmortem）

#### 4.8.1 模板

```markdown
# 事故复盘：[SEV-1] 2026-06-06 支付故障

## 基本信息
- 事故 ID: INC-2026-0606-001
- 级别: SEV-1
- 开始: 2026-06-06 14:25
- 结束: 2026-06-06 15:30
- 持续: 65 分钟
- IC: 张三
- 影响: 1.2 万用户，¥150 万订单失败
- 根因: Stripe 区域 API 故障（官方确认）

## Timeline（关键节点）
| 时间 | 事件 |
|---|---|
| 14:25 | Stripe API 开始 5xx |
| 14:25:30 | Prometheus 告警触发 |
| 14:26 | PagerDuty 电话通知 on-call |
| 14:28 | 战时群建立，IC 就位 |
| 14:30 | 决定切 Alipay 备份通道 |
| 14:35 | Alipay 通道开始接收流量 |
| 14:45 | 监控显示 Alipay 成功率 98% |
| 15:00 | Stripe 官方恢复 |
| 15:30 | 全部流量切回，事故结束 |

## 根因分析（5 Whys）
1. 为什么用户支付失败？→ Stripe API 返回 5xx
2. 为什么 Stripe 5xx？→ 他们的 us-east-1 区域故障
3. 为什么我们没绕开？→ 只有 2 家支付通道，Stripe 故障时全压到 Alipay
4. 为什么 Alipay 也压垮了？→ 限流没提前调高
5. 为什么限流没调高？→ 预案没考虑到双通道全开

## 改进项（Action Items）
- [ ] 接入第 3 家支付通道（PayPal）（负责人：张三，截止 2026-07-15）
- [ ] 写自动故障切换 runbook（负责人：李四，截止 2026-06-20）
- [ ] 季度双通道灾备演练（负责人：王五，周期 Q3）
- [ ] 监控加 "双通道全失败" 告警（负责人：李四，截止 2026-06-10）
```

#### 4.8.2 文化（blameless）

> **核心**：复盘**永远不**追究个人责任。只问"系统/流程哪里出问题了"。
> - ❌ "李四没及时看告警"
> - ✅ "告警没有路由到正确的 on-call 人"

### 4.9 常见事故 Runbook

#### 4.9.1 支付失败 Runbook

```yaml
name: 支付失败应急
trigger: payment_success_rate < 90% for 3 min
severity: P0
estimated_response_time: 5 min

steps:
  - name: 确认故障范围
    commands:
      - "kubectl logs -n smy-prod -l app=api --tail=500 | grep -i 'payment'"
      - "curl -s https://api.smy.app/api/h5/payments/channels | jq"
    expected: 查看是单通道还是全通道故障

  - name: 检查支付通道状态
    commands:
      - "# Stripe 状态页"
      - "curl -s https://status.stripe.com/api/v2/summary.json | jq '.incidents'"
      - "# Alipay"
      - "curl -s https://openapi.alipay.com/gateway.do?method=alipay.trade.query | head"
    expected: 确认哪家通道故障

  - name: 切到备份通道
    commands:
      - "# 在 DB 更新通道开关"
      - "psql -h $DB_HOST -U $DB_USER -d smy -c \\"
      - "  \"UPDATE \\\"PaymentChannel\\\" SET enabled=false WHERE code='stripe';\""
      - ""
      - "# 清除 Redis 缓存（30s 内生效）"
      - "redis-cli -h $REDIS_HOST DEL payment:channel:enabled:*"
    rollback: 切回原通道（故障恢复后）

  - name: 通知 Comms
    actions:
      - "在战时群 @pr-lead 更新状态"
      - "客服群发话术"
    expected: 5 分钟内通知到

  - name: 持续监控
    commands:
      - "watch -n 30 'curl -s https://api.smy.app/api/h5/payments/stats | jq'"
    expected: 支付成功率 > 95%

  - name: 复盘
    actions:
      - "事故结束后 24h 内写 postmortem"
      - "记录到 incident/ 目录"
```

#### 4.9.2 DB 连接池耗尽 Runbook

```yaml
name: DB 连接池耗尽
trigger: pgbouncer_active_connections > 90% for 2 min
severity: P1

steps:
  - name: 查看当前连接
    commands:
      - "psql -h $DB_HOST -U $DB_USER -c \\"
      - "  \"SELECT state, count(*) FROM pg_stat_activity GROUP BY state;\""
      - "psql -h $DB_HOST -U $DB_USER -c \\"
      - "  \"SELECT pid, query_start, state, query FROM pg_stat_activity WHERE state='active' ORDER BY query_start LIMIT 20;\""
    expected: 找出长事务 / 锁等待

  - name: 杀长事务
    commands:
      - "psql -h $DB_HOST -U $DB_USER -c \\"
      - "  \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity \\"
      - "   WHERE state='idle in transaction' AND query_start < now() - interval '5 min';\""
    expected: 连接数下降

  - name: 临时扩容连接池
    commands:
      - "kubectl scale deploy api --replicas=10 -n smy-prod"
      - "# 同步调大 RDS max_connections（需重启）"
    expected: 5 分钟内连接数稳定

  - name: 根因
    actions:
      - "查 Prisma 慢查询"
      - "查新代码是否有连接泄漏"
```

#### 4.9.3 Redis 雪崩 Runbook

```yaml
name: Redis 雪崩
trigger: redis_evicted_keys_total 突增 OR 缓存命中率 < 80%
severity: P1

steps:
  - name: 启用本地缓存降级
    commands:
      - "kubectl set env deployment/api CACHE_FALLBACK=local -n smy-prod"
    expected: 5 分钟内 DB QPS 降回基线

  - name: 启用随机过期
    actions:
      - "代码修复：set key 时加 ±10% 随机 TTL"
    expected: 防止集中过期

  - name: 预热热点 key
    commands:
      - "redis-cli -h $REDIS_HOST -p 6379 --scan --pattern 'user:*' | head -1000 | xargs -I {} redis-cli GET {}"
```

#### 4.9.4 接口雪崩 Runbook

```yaml
name: 接口雪崩
trigger: 5xx 错误率 > 50%
severity: P0

steps:
  - name: 启用 Sentinel 全局限流
    commands:
      - "kubectl set env deployment/api SENTINEL_RULE=degrade-all -n smy-prod"
    expected: 5 分钟内 5xx 降回 < 5%

  - name: 拒绝非核心流量
    actions:
      - "Nginx 限流：仅允许 /api/h5/payments /api/h5/auth"
      - "其他 endpoint 返回 503"
    commands:
      - "kubectl apply -f k8s/emergency/limit-non-core.yaml"

  - name: 恢复
    actions:
      - "查 HPA 是否拉起新副本"
      - "逐步放开限流（10% → 50% → 100%）"
```

#### 4.9.5 链上交易卡住 Runbook

```yaml
name: 链上交易卡住
trigger: chain_tx_pending > 30 min
severity: P1

steps:
  - name: 查询链上状态
    commands:
      - "curl -s https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=$TX_HASH | jq"
    expected: 看是否 pending / dropped

  - name: 加速（replace-by-fee）
    commands:
      - "用相同 nonce 重新发，gas price × 1.5"
    expected: 5 分钟内确认

  - name: 取消（如果必要）
    commands:
      - "发 0 ETH 给自己，gas price × 2，同 nonce"
    expected: 取消原 tx
```

#### 4.9.6 KYC 审核积压 Runbook

```yaml
name: KYC 审核积压
trigger: kyc_pending_count > 200
severity: P2

steps:
  - name: 紧急扩审核员
    actions:
      - "通知 CS Lead 加派 3 名审核员"
      - "临时给 1 周权限（自动 7 天后回收）"

  - name: 启用 AI 预审
    commands:
      - "kubectl set env deployment/api KYC_AI_PREDICT=true -n smy-prod"
    expected: 80% 订单 AI 自动通过

  - name: 用户安抚
    actions:
      - "通知 24h 内提交的用户：'您的审核已加急'"
```

#### 4.9.7 推送失败 Runbook

```yaml
name: 推送失败
trigger: push_success_rate < 90%
severity: P2

steps:
  - name: 检查推送服务
    commands:
      - "curl -s https://status.fcm.googleapis.com/ | head"
      - "# 国内走个推 / 极光"
    expected: 找出故障推送商

  - name: 切备用推送
    commands:
      - "kubectl set env deployment/api PUSH_PROVIDER=jpush -n smy-prod"
```

#### 4.9.8 退款积压 Runbook

```yaml
name: 退款积压
trigger: refund_pending_count > 100 for 30 min
severity: P1

steps:
  - name: 查通道状态
    commands:
      - "psql -c \"SELECT channel, status, count(*) FROM \\\"Refund\\\" WHERE status='processing' GROUP BY channel, status;\""
    expected: 找出卡住的通道

  - name: 重试 / 切通道
    commands:
      - "pnpm ts-node scripts/refund-retry.ts --channel=stripe"
```

#### 4.9.9 视频上传失败 Runbook

```yaml
name: 视频上传失败
trigger: video_upload_success_rate < 90%
severity: P2

steps:
  - name: 检查 OSS
    commands:
      - "ossutil du oss://smy-prod-video/ --total"
      - "# 检查是否配额满"
    expected: < 80% 配额

  - name: 检查转码服务
    commands:
      - "kubectl logs -n smy-prod -l app=transcoder --tail=200"
```

#### 4.9.10 邮件退信 Runbook

```yaml
name: 邮件退信
trigger: email_bounce_rate > 5%
severity: P2

steps:
  - name: 检查 SPF / DKIM / DMARC
    commands:
      - "dig TXT smy.app"
      - "nslookup -type=txt default._domainkey.smy.app"
    expected: 配置正确

  - name: 暂停营销邮件
    commands:
      - "kubectl set env deployment/api EMAIL_MARKETING_PAUSE=true -n smy-prod"
    expected: 减少发信量
```

---

## 5. 合规与安全

> **为什么需要这章**：金融 + Web3 双重监管。**合规不是事后补救，是事前设计**。

### 5.1 GDPR / PIPL 合规清单

| 条款 | 要求 | 实施 |
|---|---|---|
| **知情同意** | 用户首次访问必须明确同意 | Cookie banner + 服务协议 |
| **数据访问权** | 用户可下载自己的所有数据 | `GET /api/h5/user/data-export` |
| **被遗忘权** | 用户可要求删除 | `DELETE /api/h5/user/me`（软删 + 90 天真删） |
| **数据可携** | JSON / CSV 导出 | 同上 |
| **纠正权** | 用户可改自己信息 | `PUT /api/h5/user/me` |
| **限制处理** | 用户可暂停画像 | `POST /api/h5/user/restrict-processing` |
| **数据最小化** | 不收无关字段 | schema review |
| **DPO** | 任命数据保护官 | 内部 DPO（PR Lead 兼任） |

**PIPL（中国）额外要求**：
- 单独同意（不能打包在服务协议里）
- 敏感信息（身份证、生物识别）单独同意
- 跨境传输：CAC 安全评估 / 标准合同 / 保护认证（三选一）
- 数据本地化：境内收集的境内存储

### 5.2 数据脱敏

#### 5.2.1 日志脱敏

```typescript
// apps/api/src/common/logger/redact.ts
const REDACT_KEYS = [
  'password', 'token', 'accessToken', 'refreshToken', 'idToken',
  'apiKey', 'api_key', 'secret', 'privateKey',
  'cardNumber', 'card_number', 'cvv', 'cvc',
  'idNumber', 'id_number', 'idCard', '身份证',
  'phone', 'mobile',  // 部分脱敏：保留前 3 后 4
  'email',            // 部分脱敏：保留首字母
  'bankAccount', 'iban',
];

export function redact<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) return obj.map(redact) as any;

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACT_KEYS.includes(key)) {
      result[key] = maskValue(key, value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redact(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function maskValue(key: string, value: any): string {
  if (value === null || value === undefined) return value;
  const str = String(value);
  if (key === 'phone' || key === 'mobile') {
    return str.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
  if (key === 'email') {
    const [user, domain] = str.split('@');
    return `${user[0]}***@${domain}`;
  }
  if (key === 'idNumber' || key === 'id_number') {
    return str.replace(/(\d{4})\d+(\d{4})/, '$1**********$2');
  }
  return '***REDACTED***';
}
```

#### 5.2.2 数据库脱敏（staging 用）

```sql
-- 生成脱敏数据集（staging 用）
UPDATE "User" SET
  phone = CONCAT('138****', LPAD(seq::text, 4, '0')),
  email = CONCAT('user_', seq, '@test.smy.local'),
  realName = CONCAT('测试用户', seq),
  idNumber = CONCAT('11010119900101', LPAD((seq % 10000)::text, 4, '0'));
```

#### 5.2.3 缓存脱敏

- Redis **不**存明文身份证 / 卡号（用 hash 引用）
- Session token 单独 Redis DB（与其他业务隔离）

### 5.3 加密规范

| 场景 | 算法 | 备注 |
|---|---|---|
| **传输** | TLS 1.3 | 强制，禁用 TLS 1.0/1.1 |
| **存储** | AES-256-GCM | 见 00-foundation §11.2 |
| **密码** | bcrypt (cost=12) | **不**用 MD5 / SHA1 / SHA256 |
| **JWT** | HS256 / RS256 | 见 §5.3.1 |
| **链上签名** | ECDSA secp256k1 | 钱包标准 |
| **API 签名** | HMAC-SHA256 | 微信支付 V3 |

**§5.3.1 JWT 配置**：
```typescript
{
  algorithm: 'RS256',  // 不用 HS256（防对称密钥泄露）
  expiresIn: '7d',
  issuer: 'smy.app',
  audience: 'smy-api',
  // 不放敏感信息（如密码、token、身份证）
}
```

### 5.4 跨境数据传输

> **为什么需要这章**：PIPL / GDPR 对"中国用户数据出境"有严格要求。

**PIPL 三条路径**：
1. **CAC 安全评估**（≥ 100 万用户或敏感行业强制）
2. **标准合同**（SCCs，与境外接收方签）
3. **个人信息保护认证**（第三方机构发证）

**本项目选择**：
- 萨摩亚 SPV 存储用户业务数据（**数据不出境**）
- 阿里云 RDS 杭州（境内）
- 仅链上数据（DID / VC）公开（用户主动选择）

### 5.5 萨摩亚金融合规

| 维度 | 要求 | 实施 |
|---|---|---|
| **SPV 注册** | 萨摩亚当地注册实体 | 已注册 Taichu Samoa SPV |
| **银行保密** | 客户资金隔离账户 | 每个 SPV 独立银行账户 |
| **AML（反洗钱）** | 交易监控、可疑上报 | §5.5.1 |
| **KYC** | 实名 + 地址 + 资金来源 | 见 05-profile.md |
| **OFAC / UN 制裁名单** | 交易前比对 | §5.5.2 |
| **大额报告** | 单笔 > USD 10,000 | 自动上报 |

#### 5.5.1 AML 规则

```typescript
// apps/api/src/modules/risk/aml.service.ts
@Injectable()
export class AmlService {
  async checkTransaction(tx: Transaction): Promise<AmlResult> {
    // 1. 单笔大额
    if (tx.amountUSD > 10000) {
      return { status: 'flagged', reason: 'single_large_tx', report: true };
    }
    // 2. 24 小时累计
    const daily = await this.getDailyTotal(tx.userId);
    if (daily + tx.amountUSD > 20000) {
      return { status: 'flagged', reason: 'daily_cumulative', report: true };
    }
    // 3. 短时间多次（拆分可疑）
    const last1h = await this.getRecentCount(tx.userId, 3600);
    if (last1h > 5) {
      return { status: 'flagged', reason: 'rapid_succession', report: true };
    }
    // 4. 制裁名单
    if (await this.isSanctioned(tx.userId)) {
      return { status: 'blocked', reason: 'sanctions_list' };
    }
    return { status: 'passed' };
  }
}
```

#### 5.5.2 制裁名单

- 接入源：OFAC SDN、UN Consolidated List、EU CFSP
- 更新频率：每日
- 比对：用户注册时 + 大额交易时

### 5.6 审计日志

> **金融合规要求**：审计日志**不可篡改** + **7 年保留**。

#### 5.6.1 写入规范

```typescript
// 审计日志加密 + 不可篡改
@Injectable()
export class AuditService {
  async log(entry: AuditEntry): Promise<void> {
    // 1. 计算 hash（链式 - 每条含上一条 hash）
    const prev = await this.getLastEntry();
    const hash = sha256(JSON.stringify({ ...entry, prevHash: prev.hash }));
    // 2. 加密（KMS）
    const encrypted = await this.kms.encrypt(JSON.stringify(entry));
    // 3. 写入（同时写 OSS 不可变存储）
    await this.db.auditLog.create({
      data: { ...entry, hash, encrypted, prevHash: prev.hash },
    });
    await this.oss.putObject('audit-log', `${entry.id}.json`, encrypted, {
      headers: { 'x-oss-object-tagging': 'retention=7y' },
    });
  }
}
```

#### 5.6.2 保留策略

| 类型 | 保留 | 存储 |
|---|---|---|
| 业务审计（订单/支付） | **7 年** | 阿里云 OSS 归档 + 加密 |
| 登录 / 权限 | 3 年 | RDS 冷数据 |
| 操作日志 | 1 年 | SLS |
| 调试日志 | 30 天 | SLS（热） |

### 5.7 漏洞管理

| 类型 | 工具 | 频率 | 负责人 |
|---|---|---|---|
| **依赖扫描** | Snyk / npm audit | 每次 PR | 开发 |
| **容器扫描** | Trivy / Grype | 每次镜像构建 | DevOps |
| **IaC 扫描** | Checkov / tfsec | 每次 PR | DevOps |
| **DAST**（动态扫描） | OWASP ZAP | 每周 | 安全 |
| **SAST**（静态扫描） | SonarQube / Semgrep | 每次 PR | 开发 |
| **渗透测试** | 第三方（绿盟 / 奇安信） | 半年 / 年度 | CISO |
| **Bug Bounty** | HackerOne / 漏洞盒子 | 持续 | CISO |

**漏洞 SLA**：

| 等级 | 修复时间 | 描述 |
|---|---|---|
| **Critical** | **24 小时** | 远程代码执行、SQL 注入、认证绕过 |
| **High** | **7 天** | 敏感信息泄露、权限提升 |
| **Medium** | 30 天 | XSS、CSRF、信息泄露（次要） |
| **Low** | 90 天 | 优化建议 |

### 5.8 密钥轮转

| 密钥类型 | 轮转周期 | 触发 |
|---|---|---|
| **KMS KEK** | 365 天 | 定期 + 泄露立即 |
| **DEK（数据加密密钥）** | 90 天 | 自动 cron |
| **数据库密码** | 90 天 | 自动 + 离职立即 |
| **API Key（Stripe/Alipay）** | 180 天 | 主动轮转 |
| **JWT 签名密钥** | 30 天 | 双 key 滚动 |
| **TLS 证书** | 90 天 | cert-manager 自动 |
| **Webhook 签名密钥** | 180 天 | 主动通知合作伙伴 |

### 5.9 访问控制

| 原则 | 实施 |
|---|---|
| **最小权限** | 按 00-foundation §3.2 权限点分配 |
| **RBAC** | 6 角色 × N 权限点 |
| **临时提权** | 申请工单 → 自动 24h 过期 |
| **离职清权** | HR 系统 webhook → 自动禁用账户 + 吊销 JWT |
| **MFA** | 强制所有 admin 开 2FA（Google Authenticator / 飞书 OTP） |
| **IP 白名单** | 后台 admin-web 仅公司 IP 段 + VPN |
| **会话超时** | 后台 30 分钟无操作自动登出 |

### 5.10 安全审计

| 类型 | 频率 | 范围 | 输出 |
|---|---|---|---|
| **内部审计** | 季度 | 权限变更、KMS 调用、异常登录 | 报告 + 整改项 |
| **外部审计** | 年度 | 全系统 + 合规 | SOC 2 / ISO 27001 报告 |
| **渗透测试** | 半年 | Web + API + 移动 | 漏洞清单 + 修复证明 |
| **合规审计** | 年度 | GDPR / PIPL / 萨摩亚金融 | 合规证书 |

### 5.11 Web3 特殊

#### 5.11.1 私钥托管

- 平台私钥（DID 签发、运营钱包）：**MPC / 多签钱包**（Fireblocks / Safe / 阿里云 KMS-MPC）
- ❌ **不**用单点热钱包
- ❌ **不**在 Git / 配置文件 / 数据库 写私钥

#### 5.11.2 多签

- 平台金库：**3/5 多签**（3 个管理员签名才能动）
- 紧急操作：**5/7 多签 + 24h 时间锁**

#### 5.11.3 链上交易审计

- 所有链上 tx 实时索引（The Graph / Alchemy Subgraph）
- 异常 tx 自动告警（gas 异常、合约异常调用）
- 月度链上对账（与 DB `Transaction` 表交叉验证）

### 5.12 事件响应

| 事件类型 | 响应 | 报告 |
|---|---|---|
| **数据泄露** | 24h 内通知监管（PIPL 强制） + 72h 内通知用户 | 公开公告 |
| **入侵** | 切断入口 + 改所有密钥 + 取证 | 内部 + 监管 |
| **勒索病毒** | 隔离 + 不付赎金 + 恢复备份 | 报警 |
| **钓鱼** | 关停仿冒域名 + 用户教育 | 内部 |

---

## 6. 性能与容量

> **为什么需要这章**：性能问题**永远在最忙的时候爆发**。必须提前规划，不能"边跑边看"。

### 6.1 性能基线

| 指标 | 目标 | 当前（P50 / P99） |
|---|---|---|
| **H5 首屏** | < 1.5s | TBD |
| **API P99 延迟** | < 500ms | TBD |
| **API P50 延迟** | < 100ms | TBD |
| **API 错误率** | < 0.1% | TBD |
| **DB QPS** | 1000+ | TBD |
| **Redis QPS** | 10000+ | TBD |
| **并发用户** | 10000+ | TBD |
| **WebSocket 连接** | 50000+ | TBD |
| **视频上传吞吐** | 1 GB/min | TBD |
| **AI Brain 推理** | < 3s (P95) | TBD |

### 6.2 容量规划

| 资源 | 当前 | 6 个月 | 12 个月 | 备注 |
|---|---|---|---|---|
| **用户数** | 1 万 | 10 万 | 50 万 | 营销驱动 |
| **DAU** | 3 千 | 3 万 | 15 万 | 30% 留存 |
| **订单/天** | 200 | 5000 | 25000 | 转化率 5% |
| **DB 存储** | 50 GB | 500 GB | 2 TB | 增长 10x |
| **OSS 存储** | 200 GB | 2 TB | 10 TB | 视频为主 |
| **CDN 流量** | 100 GB/天 | 1 TB/天 | 5 TB/天 | 视频占比 70% |
| **AI 调用** | 1k/天 | 50k/天 | 200k/天 | GPT-4o 为主 |

### 6.3 压测

#### 6.3.1 工具选型

| 工具 | 类型 | 学习曲线 | 推荐场景 |
|---|---|---|---|
| **wrk** | CLI | 低 | HTTP 基准 |
| **k6** | 脚本 | 中 | API + 业务流 |
| **JMeter** | GUI | 中 | 传统企业 |
| **Locust** | Python | 低 | 复杂业务流 |
| **Vegeta** | Go | 低 | 高并发基准 |
| **阿里云 PTS** | SaaS | 极低 | 生产级压测 |

#### 6.3.2 k6 压测 SOP

```javascript
// load-test/stress.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const paymentLatency = new Trend('payment_latency');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // 100 用户
    { duration: '5m', target: 1000 },  // 1000 用户
    { duration: '5m', target: 5000 },  // 5000 用户
    { duration: '2m', target: 0 },     // 降温
  ],
  thresholds: {
    http_req_duration: ['p(99)<500'],  // P99 < 500ms
    errors: ['rate<0.01'],              // 错误率 < 1%
  },
};

export default function () {
  // 模拟用户登录
  const loginRes = http.post('https://staging.smy.app/api/h5/auth/login', JSON.stringify({
    phone: `1380000${(__VU % 10000).toString().padStart(4, '0')}`,
    password: 'test123',
  }), { headers: { 'Content-Type': 'application/json' } });
  check(loginRes, { 'login 200': (r) => r.status === 200 });
  errorRate.add(loginRes.status !== 200);

  const token = loginRes.json('data.token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 浏览首页
  const homeRes = http.get('https://staging.smy.app/api/h5/discover', { headers });
  check(homeRes, { 'home 200': (r) => r.status === 200 });

  // 创建订单（核心支付链路）
  const start = Date.now();
  const orderRes = http.post('https://staging.smy.app/api/h5/services/1/orders',
    JSON.stringify({ quantity: 1 }), { headers });
  paymentLatency.add(Date.now() - start);
  check(orderRes, { 'order 200': (r) => r.status === 200 });

  sleep(Math.random() * 3);
}
```

```bash
# 运行
k6 run --out json=result.json load-test/stress.js

# 用阿里云 PTS（生成全球节点压测）
# 登录 pts.aliyun.com → 创建场景 → 上传脚本 → 执行
```

### 6.4 限流

#### 6.4.1 多层限流

```
              ┌──────────────┐
请求 → │  L7 LB (Nginx) │ → 全局限流（如 10万 QPS）
              └──────┬───────┘
                     ↓
              ┌──────────────┐
              │  Sentinel   │ → 单服务限流（如 1000 QPS/服务）
              └──────┬───────┘
                     ↓
              ┌──────────────┐
              │  API 层      │ → 单用户限流（如 100 req/min/user）
              └──────┬───────┘
                     ↓
              ┌──────────────┐
              │  Redis       │ → 分布式限流（滑动窗口）
              └──────────────┘
```

#### 6.4.2 Nginx 限流

```nginx
# /etc/nginx/conf.d/limit.conf
limit_req_zone $binary_remote_addr zone=per_ip:10m rate=10r/s;
limit_req_zone $http_authorization zone=per_user:10m rate=100r/m;
limit_conn_zone $binary_remote_addr zone=conn_per_ip:10m;

server {
  location /api/h5/auth/login {
    limit_req zone=per_ip burst=5 nodelay;  # IP 限流
    limit_req zone=per_user burst=10;        # 用户限流
  }

  location /api/h5/payments {
    limit_req zone=per_user burst=20 nodelay;
  }
}
```

#### 6.4.3 Sentinel 限流（应用层）

```typescript
// apps/api/src/common/ratelimit/sentinel.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import * as Sentinel from '@sentinel/node';

@Injectable()
export class RateLimitGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const key = `${req.user?.id || req.ip}:${req.route?.path}`;
    const rule = {
      resource: req.route?.path,
      count: 100,  // 100 req
      intervalSec: 60,  // per minute
      controlBehavior: 'reject',
    };
    return Sentinel.entry(rule.resource, 1, { ...rule, key });
  }
}
```

#### 6.4.4 Redis 滑动窗口

```typescript
async function slidingWindow(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, now - windowMs);
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  pipeline.zcard(key);
  pipeline.expire(key, Math.ceil(windowMs / 1000));
  const results = await pipeline.exec();
  const count = results[2][1];
  return count <= limit;
}
```

### 6.5 降级

| 降级级别 | 触发 | 表现 |
|---|---|---|
| **L1 - 部分字段降级** | DB 慢 | 列表返回精简版（少 5 个字段） |
| **L2 - 非核心功能降级** | 资源紧张 | 关闭推荐、AI Brain 简化版 |
| **L3 - 全功能降级** | 重大故障 | 仅保留登录、查看、支付 |
| **L4 - 静态页** | 极端 | 返回 CDN 缓存的纯静态页 |

```typescript
// 降级开关
@Injectable()
export class DegradeService {
  async shouldDegrade(feature: string): Promise<boolean> {
    return !(await this.killSwitch.isEnabled(feature));
  }
}

// 用法
async getRecommendations(userId: string) {
  if (await this.degrade.shouldDegrade('recommendations')) {
    return [];  // 降级：返回空
  }
  return this.aiBrain.getRecommendations(userId);
}
```

### 6.6 熔断

```typescript
import { CircuitBreaker } from '@nestjs/circuit-breaker';

@Injectable()
export class PaymentService {
  private breaker = new CircuitBreaker({
    timeout: 3000,         // 单次调用超时 3s
    errorThreshold: 50,    // 错误率 50% 触发熔断
    resetTimeout: 30000,   // 30s 后半开
  });

  async charge(amount: number): Promise<PaymentResult> {
    return this.breaker.fire(async () => {
      const result = await this.stripe.charges.create({ amount });
      return result;
    });
  }

  // 熔断时的 fallback
  async chargeWithFallback(amount: number): Promise<PaymentResult> {
    try {
      return await this.charge(amount);
    } catch (e) {
      if (this.breaker.opened) {
        return this.alipay.charges.create({ amount });  // 切到 Alipay
      }
      throw e;
    }
  }
}
```

### 6.7 重试

**重试原则**：
- ✅ **仅对幂等操作重试**（GET、PUT 带 idempotency-key）
- ❌ **永远不**对 POST 重试（除非带 idempotency-key）
- ✅ 指数退避 + 抖动（避免雪崩）

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 100,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      // 指数退避 + 抖动（100ms、200ms、400ms + 0-100ms 随机）
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 100;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}
```

### 6.8 缓存策略

| 缓存层 | 用途 | TTL |
|---|---|---|
| **CDN** | 静态资源、图片 | 30 天 |
| **浏览器** | 静态资源（带 hash） | 1 年 |
| **Nginx** | API 响应（GET） | 1 分钟 |
| **Redis (hot)** | 热点数据、Session | 5-60 分钟 |
| **Redis (cold)** | 列表第二页以后 | 1 小时 |
| **应用本地** | 配置、白名单 | 1 分钟 |
| **DB 缓冲池** | 索引、热数据 | 自动 |

**三大缓存问题**：

| 问题 | 原因 | 解决 |
|---|---|---|
| **击穿** | 热点 key 过期瞬间大量请求打到 DB | 互斥锁 / 永不过期 + 后台刷新 |
| **雪崩** | 大量 key 同时过期 | 加随机 TTL（±10%）/ 多级缓存 |
| **穿透** | 查询不存在的数据 | 布隆过滤器 / 空值缓存 |

```typescript
// 击穿防护：Single Flight
import { Semaphore } from 'async-mutex';

const locks = new Map<string, Semaphore>();

async function getWithLock<T>(key: string, loader: () => Promise<T>, ttl: number): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  let lock = locks.get(key);
  if (!lock) {
    lock = new Semaphore(1);
    locks.set(key, lock);
  }
  return lock.runExclusive(async () => {
    const cached2 = await redis.get(key);  // 二次检查
    if (cached2) return JSON.parse(cached2);
    const fresh = await loader();
    await redis.set(key, JSON.stringify(fresh), 'EX', ttl);
    return fresh;
  });
}
```

### 6.9 数据库优化

#### 6.9.1 连接池

```typescript
// apps/api/src/prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL + '?pgbouncer=true&connection_limit=20&pool_timeout=10',
        },
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
      ],
    });
  }
  async onModuleInit() {
    await this.$connect();
    // 慢查询日志
    this.$on('query', (e) => {
      if (e.duration > 200) {
        console.warn(`Slow query (${e.duration}ms): ${e.query}`);
      }
    });
  }
}
```

**K8s 副本数 × Prisma connection_limit ≤ DB max_connections**

#### 6.9.2 索引

```sql
-- 慢查询分析
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 缺失索引分析
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;
```

#### 6.9.3 分库分表

- 单表 > 5000 万行 → 考虑分表
- 单库 > 1TB → 考虑分库
- 分片键：选**高频查询字段**（如 userId、orderId）
- 工具：Vitess、Citus、ShardingSphere、阿里云 PolarDB

### 6.10 资源利用率

| 资源 | 目标 | 监控 |
|---|---|---|
| CPU | 50-70% | Prometheus `node_cpu_seconds_total` |
| 内存 | 50-80% | `node_memory_MemAvailable_bytes` |
| 磁盘 | < 80% | `node_filesystem_avail_bytes` |
| 带宽 | < 70% | `node_network_receive_bytes_total` |
| DB 连接 | < 70% | `pg_stat_activity` |
| Redis 内存 | < 70% | `redis_memory_used_bytes` |

**HPA 配置**（K8s）：
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
  namespace: smy-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
    - type: Resource
      resource:
        name: memory
        target: { type: Utilization, averageUtilization: 80 }
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5min 稳定才缩
    scaleUp:
      stabilizationWindowSeconds: 30   # 30s 内可快速扩
```

---

## 7. 成本控制

> **为什么需要这章**：FinOps 不是省小钱——是**避免钱被浪费**。本章给"看得清、花得值"的方法。

### 7.1 成本监控

| 维度 | 工具 | 频率 |
|---|---|---|
| **云账单** | 阿里云费用中心 / AWS Cost Explorer | 实时 |
| **分账** | 自建 tag 体系（按 project/env/team） | 实时 |
| **预算告警** | 阿里云预算管理 / AWS Budgets | 每日 |
| **趋势分析** | Grafana + Prometheus | 每周 |

**预算告警**：
- 50%：邮件
- 80%：Slack #finops
- 100%：电话

### 7.2 资源优化

| 资源 | 优化策略 | 节省 |
|---|---|---|
| **ECS** | 预留实例（1-3 年） vs 按量 | 30-50% |
| **ECS 突发** | Spot 实例（无状态服务） | 60-80% |
| **RDS** | 预留实例 + 自动扩缩容 | 30% |
| **Redis** | 集群 vs 单机 + 内存优化 | 20% |
| **OSS** | 冷数据转归档 / 冷归档 | 70% / 90% |
| **CDN** | 缓存命中率优化 | 30% |

**弹性伸缩**：
- 工作时间：高峰保留 3 副本
- 夜间：HPA min 1
- 周末：min 2

### 7.3 数据库成本

```sql
-- 慢查询 Top 10（优化的 ROI 最高）
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC LIMIT 10;

-- 表膨胀 Top 10
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_dead_tup, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC LIMIT 10;

-- 索引冗余（无用的索引）
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey';
```

**冷数据归档**：
- 1 年以上订单 → 归档表
- 5 年以上 → OSS 冷归档（删除时加 `pg_dump` 备份）
- 7 年后真删（金融合规 7 年保留例外）

### 7.4 带宽 / CDN 成本

| 优化 | 节省 |
|---|---|
| **图片 WebP / AVIF** | 30-50% |
| **视频 HLS / DASH** | 50% |
| **资源合并 / 懒加载** | 20% |
| **HTTP/2 / HTTP/3** | 10% |
| **浏览器缓存优化** | 30% |
| **CDN 缓存命中率 > 90%** | 50% |

**图片处理 SOP**：
```bash
# WebP 转换
cwebp -q 80 input.jpg -o output.webp

# AVIF 转换
avifenc --min 30 --max 50 input.jpg output.avif

# 响应式
<img srcset="image-320.webp 320w, image-640.webp 640w, image-1280.webp 1280w"
     sizes="(max-width: 640px) 100vw, 50vw"
     src="image-640.webp" alt="...">
```

### 7.5 KMS 成本

- 阿里云 KMS：¥0.06 / 1万次调用
- 月调用 1 亿次 ≈ ¥6000
- 优化：合并批量加解密 / 用会话加密减少 round-trip

**00-foundation §11.6 监控**：
- 解密调用次数（按 module 分）
- 解密失败率（异常告警）
- 单凭证平均调用次数（异常高频告警）

### 7.6 第三方 SaaS 成本

| 服务 | 月预算 | 优化 |
|---|---|---|
| **短信**（阿里云 / Twilio） | ¥5000 | 防刷（验证码限 1/min/手机） |
| **邮件**（SendGrid / 阿里云） | ¥500 | 用 SES（便宜），去 spam |
| **推送**（FCM / 个推） | ¥3000 | 推送合并 / 智能省电 |
| **支付通道手续费** | 0.6% GMV | 引导用户用低费率通道 |
| **AI 调用**（OpenAI / Anthropic） | ¥30000 | 缓存相同 prompt / 用 cheaper model |
| **CDN**（阿里云 / Cloudflare） | ¥10000 | 缓存命中率 / 区域选择 |
| **监控**（Datadog / Sentry） | ¥5000 | 控制 ingest 量 |

### 7.7 月度 FinOps 评审

**每月 1 日**：
1. 上月账单 review（实际 vs 预算）
2. Top 10 浪费项识别
3. 下月优化目标设定
4. 报告发给 CEO + CFO

**每季度**：
1. 大额资源（> ¥100k/年）续约 review
2. 架构优化 review（如是否能用 ARM 替代 x86）
3. 谈判预留实例

---

## 8. 发布检查清单（每个上线必勾）

> **为什么需要这章**：发布检查清单是**最便宜的保险**。GitLab / Knight Capital 等事故的根因之一就是发布前没走 checklist。

### 8.1 上线前（T-24h）

- [ ] 性能压测通过（k6 报告归档）
- [ ] 安全扫描 0 高危（Snyk + Trivy + Semgrep）
- [ ] DB 迁移在 staging 验证（含回滚演练）
- [ ] 配置项已就位（环境变量 / K8s ConfigMap / Secret）
- [ ] 监控 / 告警已配置（Prometheus rules + AlertManager）
- [ ] Runbook 已更新（新增故障处置 SOP）
- [ ] 灰度比例已设置（Argo Rollouts Analysis 模板）
- [ ] 备份已验证（最近 7 天内有成功备份）
- [ ] 文档已更新（PRD / API 文档 / 状态页）
- [ ] 通知 on-call 团队（Slack #releases + 邮件）

### 8.2 上线中（T-0）

- [ ] 双人审批（GitHub Environment approval）
- [ ] 镜像 tag 锁定（git SHA）
- [ ] Argo Rollouts 灰度（5% → 20% → 50% → 100%）
- [ ] 每 step 暂停 5-10 分钟观察
- [ ] 监控核心指标：5xx 率、P99、CPU、内存
- [ ] 业务指标：支付成功率、登录成功率
- [ ] 异常告警立即 abort

### 8.3 上线后（T+1h / T+24h / T+7d）

- [ ] T+1h：核心指标稳定，无告警
- [ ] T+24h：业务指标正常，无用户投诉
- [ ] T+7d：错误预算消耗在预期内
- [ ] 发版说明发到 Slack #releases
- [ ] 客户支持已通知（重大变更）
- [ ] 复盘（如有问题）

### 8.4 回滚预案（每次必演练）

- [ ] 知道回滚命令（`kubectl argo rollouts undo`）
- [ ] 知道回滚时间（应用 < 30s，DB < 5min）
- [ ] 知道回滚触发条件（SEV-1 / SEV-2 自动回滚）
- [ ] 有人 24h 待命（上线日 on-call 加强）

---

## 9. 跨文件一致性检查

> 与 [00-foundation §6.4](../admin-prd/00-foundation.md) 同结构，扩展生产标准维度。

- [ ] 状态枚举值是否在 00-foundation §8.3.1 扩展色彩表里有映射？（状态可视化一致性）
- [ ] 状态变更是否走 00-foundation §4.3 独立日志表模式？（审计完整性）
- [ ] `*UserId` 字段是否按 00-foundation §12 加 `@relation("Name")` + `onDelete: Restrict`？（FK 完整性）
- [ ] i18n namespace 是否在 00-foundation §5.5.1 速查表里？（多语言一致性）
- [ ] 退款是否走 00-foundation §7.5 统一约定？（事务安全）
- [ ] 资源级权限判定是否走 00-foundation §3.5？（访问控制）
- [ ] 凭证加密是否走 00-foundation §11 KMS？（密钥管理）
- [ ] 部署是否走本文档 §1.2 CI/CD？（交付一致性）
- [ ] 监控是否接入了 §2.3 Prometheus 统一栈？（可观测性）
- [ ] 告警级别是否按 §2.5 P0-P3 分级？（响应一致性）
- [ ] 备份是否按 §3.2 5-2-1 原则？（灾备完整性）
- [ ] Kill Switch 是否按 §4.5 预埋？（应急能力）
- [ ] 限流 / 降级 / 熔断是否按 §6.4-6.6 实现？（性能保障）
- [ ] 上线前是否勾选 §8 检查清单？（变更管理）
- [ ] 性能指标是否对齐 §6.1 基线？（性能一致性）

---

## 10. 验收用例

### 10.1 §1 部署与发布

| # | 用例 | 期望 |
|---|---|---|
| 1 | 推代码到 main | CI 自动跑测试 + 构镜像，1 次完成 |
| 2 | staging 部署 | 5 分钟内可用，灰度 5% 流量 |
| 3 | 推 production | 触发双人审批，金丝雀自动跑 5% → 100% |
| 4 | 错误率 > 5% 持续 2 分钟 | Argo Rollouts 自动 abort + 回滚 |
| 5 | 紧急回滚 | 30 秒内可完成 kubectl argo rollouts undo |
| 6 | DB 迁移 | staging 验证 → 生产 prisma migrate deploy |
| 7 | 镜像 CVE 扫描 | 0 高危，trivy report 归档 |
| 8 | 灰度比例配置 | 5/20/50/100 step 正常生效 |

### 10.2 §2 监控与告警

| # | 用例 | 期望 |
|---|---|---|
| 1 | 5xx 率 > 5% 持续 2 分钟 | P0 告警触发，电话通知 on-call |
| 2 | P99 延迟 > 1s 持续 5 分钟 | P1 告警 |
| 3 | CPU > 80% 持续 5 分钟 | P2 告警 |
| 4 | 月度错误预算消耗 50% | 邮件通知 SRE Lead |
| 5 | 错误预算透支 | 全公司 freeze |
| 6 | 日志含敏感字段（密码、卡号） | 脱敏显示（phone: 138****1234） |
| 7 | 链路追踪 5 层调用 | traceId 贯通 Jaeger |
| 8 | Slack 告警去重 | 5 分钟内相同告警只发 1 次 |

### 10.3 §3 备份与灾备

| # | 用例 | 期望 |
|---|---|---|
| 1 | 每日全量备份 | 03:00 自动完成，OSS 归档 |
| 2 | WAL 归档实时 | archive_command 正常，无 lag |
| 3 | 月度恢复演练 | RTO 达标，数据完整 |
| 4 | 季度全链路灾备切换 | 主 region 故障，备 region 30 分钟内接管 |
| 5 | DNS 切换 | TTL 60s 灾备 DNS 生效 < 5 分钟 |
| 6 | RDS 跨区副本 lag | < 5 秒 |
| 7 | 备份完整性校验 | pg_dump + count 一致 |
| 8 | 演练报告归档 | incident/dr-drills/2026Q1/ 目录 |

### 10.4 §4 事故应急

| # | 用例 | 期望 |
|---|---|---|
| 1 | P0 告警触发 | 5 分钟内 IC 就位 |
| 2 | 战时群建立 | Slack #incident-active，IC/Comms/Ops 全员 |
| 3 | Kill Switch 关闭支付 | 30 秒内生效，新订单支付失败 |
| 4 | 客服话术发送 | 5 分钟内所有客服收到 |
| 5 | 对外公告更新 | 状态页 + 官网 banner |
| 6 | 事故复盘 | 7 天内 postmortem 提交 |
| 7 | blameless 文化 | 复盘不追究个人，只追流程 |
| 8 | 改进项跟踪 | 90 天内整改率 > 80% |

### 10.5 §5 合规与安全

| # | 用例 | 期望 |
|---|---|---|
| 1 | 密码 bcrypt cost=12 存储 | DB 中不可逆 |
| 2 | 字段加密 EncryptedPayload 格式 | 必含 v/alg/iv/ct/tag/dek/kmsKeyId |
| 3 | KMS KEK 来源 | prod 必从 KMS 取，**不**从 env |
| 4 | 漏洞 SLA | Critical 24h 修复，High 7d |
| 5 | JWT 强算法 | RS256，非 HS256 |
| 6 | 审计日志 7 年保留 | OSS 归档 + 不可篡改 |
| 7 | 数据导出 | 用户可下载自己的所有数据（GDPR） |
| 8 | 删除账号 | 软删 + 90 天真删 |

### 10.6 §6 性能与容量

| # | 用例 | 期望 |
|---|---|---|
| 1 | k6 压测 1000 并发 | P99 < 500ms，错误率 < 1% |
| 2 | 缓存击穿防护 | 互斥锁生效，DB QPS 峰值 < 2x |
| 3 | 限流触发 | 超过 100 req/min/user 返回 429 |
| 4 | 熔断触发 | 50% 错误率持续 1 分钟，打开熔断 |
| 5 | HPA 扩缩容 | CPU > 70% 自动扩到上限 |
| 6 | CDN 缓存命中率 | > 90% |
| 7 | 慢查询 | P95 < 200ms |
| 8 | 资源利用率 | CPU 50-70%，内存 < 80% |

### 10.7 §7 成本控制

| # | 用例 | 期望 |
|---|---|---|
| 1 | 月度账单 | < 预算 100% |
| 2 | 预算告警 | 80% Slack，100% 电话 |
| 3 | 预留实例占比 | > 60% |
| 4 | Spot 实例 | 无状态服务用 spot（节省 60%+） |
| 5 | CDN 缓存命中率 | > 90% |
| 6 | AI 调用缓存命中率 | > 30%（相同 prompt） |
| 7 | 冷数据归档 | 1 年以上订单已转 OSS 归档 |
| 8 | FinOps 评审 | 月度报告归档 |

### 10.8 §8 发布检查清单

| # | 用例 | 期望 |
|---|---|---|
| 1 | 上线前 10 项 checklist | 全部勾选 |
| 2 | 上线中双人审批 | GitHub Environment 必 2 人 |
| 3 | 灰度每 step 暂停 | 5/20/50/100 各观察 5-10 分钟 |
| 4 | 上线后 T+1h | 监控无异常 |
| 5 | 上线后 T+24h | 业务指标正常 |
| 6 | 上线后 T+7d | 错误预算消耗在预期内 |
| 7 | 异常告警 | 立即 abort + 回滚 |
| 8 | 回滚演练 | 每季度 1 次，含 DB 反向 SQL |

---

## 11. 附录

### 11.1 推荐工具清单

| 类别 | 工具 | 用途 |
|---|---|---|
| **CI/CD** | GitHub Actions / GitLab CI | 持续集成 |
| **镜像** | Docker + 阿里云 ACR | 容器化 |
| **编排** | K8s + ArgoCD | 部署 + GitOps |
| **发布** | Argo Rollouts | 金丝雀 / 蓝绿 |
| **监控** | Prometheus + Grafana | 指标 |
| **日志** | Loki / 阿里云 SLS | 日志聚合 |
| **追踪** | Jaeger / SkyWalking | 链路追踪 |
| **告警** | AlertManager + PagerDuty | 告警路由 |
| **错误** | Sentry | 异常捕获 |
| **APM** | 阿里云 ARMS / Datadog | 应用性能 |
| **KMS** | 阿里云 KMS / AWS KMS | 密钥管理 |
| **Vault** | HashiCorp Vault | 密钥编排 |
| **限流** | Sentinel / Nginx | 限流降级 |
| **熔断** | Resilience4j | 熔断器 |
| **压测** | k6 / 阿里云 PTS | 压力测试 |
| **漏洞** | Snyk / Trivy / Grype | 漏洞扫描 |
| **审计** | 自建 + OSS 不可变存储 | 审计日志 |
| **FinOps** | 阿里云费用中心 / AWS Cost Explorer | 成本监控 |

### 11.2 关键 Runbook 速查

| 故障 | 第一个动作 | 文档位置 |
|---|---|---|
| 支付失败 | 看是单通道还是全通道 | §4.9.1 |
| DB 连接池耗尽 | 查长事务 + 杀 | §4.9.2 |
| Redis 雪崩 | 启用本地缓存降级 | §4.9.3 |
| 接口雪崩 | Sentinel 限流 | §4.9.4 |
| 链上交易卡住 | 查 etherscan + 加速 | §4.9.5 |
| KYC 积压 | 紧急扩审核员 + AI 预审 | §4.9.6 |
| 推送失败 | 切备用推送 | §4.9.7 |
| 退款积压 | 查通道 + 重试 | §4.9.8 |
| 视频上传失败 | 查 OSS + 转码 | §4.9.9 |
| 邮件退信 | 暂停营销邮件 | §4.9.10 |

### 11.3 关键链接

- 状态页：https://status.smy.app
- Runbook：https://wiki.smy.app/runbook
- 监控 Dashboard：https://grafana.smy.app
- 日志查询：https://logs.smy.app
- 链路追踪：https://trace.smy.app
- 审计日志：https://audit.smy.app
- 事故复盘：https://postmortem.smy.app
- 文档索引：https://docs.smy.app

### 11.4 紧急联系

| 角色 | 联系 |
|---|---|
| **SRE Lead** | 张三 / +86-138-0000-0001 / sre-lead@smy.app |
| **DBA** | 李四 / +86-138-0000-0002 / dba@smy.app |
| **CTO** | 王五 / +86-138-0000-0003 / cto@smy.app |
| **安全** | 赵六 / +86-138-0000-0004 / security@smy.app |
| **客服 Lead** | 钱七 / +86-138-0000-0005 / cs-lead@smy.app |
| **阿里云企业支持** | 400-xxx-xxxx / 工单 ID 优先 |

### 11.5 参考资料

- Google SRE Book：https://sre.google/sre-book/table-of-contents/
- Google SRE Workbook：https://sre.google/workbook/table-of-contents/
- AWS Well-Architected：https://aws.amazon.com/architecture/well-architected/
- CIS Benchmarks：https://www.cisecurity.org/cis-benchmarks/
- OWASP Top 10：https://owasp.org/Top10/
- NIST Cybersecurity Framework：https://www.nist.gov/cyberframework
- 12-Factor App：https://12factor.net/
- The Morning Paper - "A Decade of Dynamo"：https://blog.acolyer.org/
- Charity Majors - Observability：https://charity.wtf/

---

**变更记录**：

| 日期 | 版本 | 变更 | 作者 |
|---|---|---|---|
| 2026-06-06 | v1.0 | 初版（11 章，~1700 行） | SRE Team |

**审阅周期**：每季度（3/6/9/12 月）review 一次。

**Owner**：SRE Lead 张三（sre-lead@smy.app）
