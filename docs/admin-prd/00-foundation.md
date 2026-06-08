# 00 · 基础设施（认证 · RBAC · 审计 · i18n）

> **范围**：所有模块共用的底层能力。包含登录、JWT、6 角色权限矩阵、菜单权限点、审计日志、系统通知、4 语言字典、通用 API/UI 规范。
> **读者**：后端（最先实现）、前端（布局/字典）、产品（验收权限边界）。

---

## 1. 业务目标

- **统一身份**：H5 用户、后台管理员两套身份体系，**不互通**（用户不能登录后台）
- 详细跨表规则见 §13
- **细粒度权限**：6 角色 × N 权限点，控制到「菜单可见」「按钮可见」「API 写操作」「批量操作」「导出」
- **全审计**：所有写操作可追溯到「谁、何时、改了什么」
- **多语言**：所有用户可见文案走字典，**不允许硬编码**
- **可扩展**：新增模块只需挂载权限点 + 菜单项

---

## 2. 已有数据模型（基础）

```prisma
// apps/api/prisma/schema.prisma
model AdminUser {
  id        String     @id @default(uuid())
  username  String     @unique
  email     String     @unique
  password  String          // bcrypt hash
  roleId    String
  role      AdminRole  @relation(fields: [roleId], references: [id])
  isActive  Boolean    @default(true)
  lastLogin DateTime?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  auditLogs AuditLog[]
}

model AdminRole {
  id          String      @id @default(uuid())
  name        String      @unique           // superadmin / operator / cs / finance / risk / auditor
  description String?
  permissions String                         // JSON: 权限点 code 数组
  adminUsers  AdminUser[]
  createdAt   DateTime    @default(now())
}

model AuditLog {
  id          String     @id @default(uuid())
  adminUserId String
  adminUser   AdminUser? @relation(fields: [adminUserId], references: [id])
  action      String                          // CREATE / UPDATE / DELETE / APPROVE / REJECT / EXPORT / LOGIN
  module      String                          // companies / users / ai-brain ...
  resourceId  String?
  oldValues   String?                         // JSON 字符串
  newValues   String?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime   @default(now())

  @@index([adminUserId, createdAt])
  @@index([module, resourceId])
}
```

---

## 3. 角色与权限矩阵

### 3.1 角色清单

| code | 名称 | 业务定位 |
|---|---|---|
| `superadmin` | 超级管理员 | 全部权限，包括角色管理、系统设置 |
| `operator` | 运营 | 内容、商品、视频、自媒体 |
| `cs` | 客服 | 用户、订单、消息、初级审核 |
| `finance` | 财务 | 支付、税务、银行、对账 |
| `risk` | 风控 | 合规、DID、审计查看 |
| `auditor` | 审计 | 全只读 + 导出 |

### 3.2 权限点定义（action codes）

格式：`{module}:{action}`，如 `users:read`、`companies:approve`、`payments:export`。

| 模块 | 权限点 | 描述 |
|---|---|---|
| **users** | `users:read` | 查看用户列表/详情 |
| | `users:write` | 创建/编辑用户 |
| | `users:kyc:approve` | 审核 KYC |
| | `users:status:change` | 启/停用 |
| | `users:export` | 导出用户表 |
| **companies** | `companies:read` | 查看公司订单 |
| | `companies:approve` | 审批通过 |
| | `companies:reject` | 驳回 |
| | `companies:assign` | 指派处理人 |
| | `companies:export` | 导出 |
| **banks** | `banks:read` | 查看开户订单 |
| | `banks:approve` | 审核开户 |
| | `banks:write` | 编辑账户信息 |
| **payments** | `payments:read` | 查看交易 |
| | `payments:refund` | 退款 |
| | `payments:export` | 导出对账单 |
| | `payments:channels:write` | 配置支付通道 |
| **ai-brain** | `ai:agents:write` | 配置 AI 智能体 |
| | `ai:knowledge:write` | 知识库管理 |
| | `ai:chat:review` | 对话审核 |
| **tax** | `tax:rates:write` | 税率库编辑 |
| | `tax:rules:write` | 税务规则编辑 |
| **legal** | `legal:read` | 查看法务库 |
| | `legal:contracts:write` | 合同模板管理 |
| **video** | `video:read` | 查看视频 |
| | `video:write` | 上传/编辑视频 |
| | `video:audit` | 内容审核 |
| | `video:comments:moderate` | 评论管理 |
| **media** | `media:read` | 查看帖子 |
| | `media:write` | 编辑/排期 |
| | `media:publish` | 立即发布 |
| | `media:analytics` | 查看平台数据 |
| **dlc** | `dlc:levels:write` | DLC 等级配置 |
| | `dlc:dvc:adjust` | 手动调整用户 DVC |
| **documents** | `documents:read` | 查看文档 |
| | `documents:write` | 上传/编辑 |
| **notifications** | `notifications:push` | 发送推送 |
| | `notifications:templates:write` | 模板管理 |
| **did** | `did:read` | 查看 DID |
| | `did:credentials:issue` | 签发凭证 |
| | `did:credentials:revoke` | 吊销凭证 |
| **ai-card** | `ai-card:templates:write` | 名片模板 |
| | `ai-card:analytics:read` | 数据统计 |
| **settings** | `settings:read` | 查看系统设置 |
| | `settings:write` | 修改系统设置 |
| | `settings:roles:write` | 角色/权限管理 |
| **audit** | `audit:read` | 查看审计日志 |
| | `audit:export` | 导出审计 |
| **menu** | 全部模块都有 `module:read` | 决定菜单是否可见 |

### 3.3 默认角色绑定

> 权限码命名空间与 §3.2 严格对齐：`ai:agents:write / ai:knowledge:write / ai:chat:review / ai:todos:read` 等。**统一用 `ai:*` 通配**（不要写 `ai-brain:*`，那是旧命名约定）。

| 角色 | 默认权限集合 |
|---|---|
| `superadmin` | `["*"]`（全通配） |
| `operator` | `["users:read", "companies:read", "banks:read", "ai:*", "tax:read", "legal:read", "video:*", "media:*", "dlc:levels:read", "dlc:dvc:read", "documents:read", "ai-card:read", "ai-card:templates:write", "ai-card:analytics:read"]` |
| `cs` | `["users:read", "users:write", "users:kyc:approve", "companies:read", "companies:approve", "banks:read", "notifications:push", "notifications:templates:read", "documents:read"]` |
| `finance` | `["users:read", "payments:*", "banks:approve", "banks:write", "tax:*", "companies:read", "documents:read"]` |
| `risk` | `["users:read", "companies:read", "legal:read", "did:*", "audit:read", "video:audit", "video:comments:moderate"]` |
| `auditor` | `["*:read", "*:export", "audit:read"]`（任意模块的 `read` 和 `export`） |

### 3.4 权限匹配算法

#### 规则
- 权限码格式：**冒号分隔**（**非**连字符）。模块名仅 `ai-card` 一个例外（含连字符的历史命名），其余全部一个单词。
- 完整格式：`{module}[:{submodule}]:{action}`，如 `users:kyc:approve`、`ai:agents:write`。
- 通配符 `*` **仅出现在最末段**（即 action 位置）。**不允许** `users:*:approve` 这类中间通配。

#### 匹配优先级（自上而下短路求值）
```
1. 精确匹配     user.permissions.includes("users:kyc:approve")       → 通过
2. 末段通配     user.permissions.includes("users:*")                  → 通过
3. 全通配       user.permissions.includes("*")                        → 通过
4. 否则                                                                  → 拒绝
```

#### 支持的模式
| 模式 | 示例 | 匹配 | 不匹配 |
|---|---|---|---|
| 精确 | `users:read` | `users:read` | `users:write` |
| 模块全通配 | `payments:*` | `payments:read`, `payments:refund`, `payments:export`, `payments:channels:write` | `banks:read` |
| 全通配 | `*` | 任意权限码 | — |
| 任意 read | `*:read` | `users:read`, `companies:read`, `audit:read` | `users:write` |
| 任意 export | `*:export` | `users:export`, `audit:export` | `users:read` |

#### 禁用的模式
- `users:*:approve`（中间通配）→ 拒
- `users:kyc:*` 这类**末段**通配**允许**（如 `users:kyc:*` 匹配 `users:kyc:approve`）
- `us*ers:read`（前缀通配）→ 拒（仅末段允许通配）

#### 后端实现建议
```typescript
// src/common/guards/permissions.guard.ts
function hasPermission(userPerms: string[], required: string): boolean {
  // 1. 精确匹配
  if (userPerms.includes(required)) return true;
  // 2. 末段通配（如 "users:*" 匹配 "users:read"）
  const [module] = required.split(':');
  if (userPerms.includes(`${module}:*`)) return true;
  // 3. 全通配
  if (userPerms.includes('*')) return true;
  // 4. 任意 read/export
  if (userPerms.includes(`*:${required.split(':').pop()}`)) return true;
  return false;
}
```

#### 缓存
- 用户登录后，`permissions` 数组 JWT 注入，**不每次查 DB**。
- 角色权限变更后，强制该角色用户**重新登录**才生效（或维护 Redis 缓存 5 分钟）。

### 3.5 资源级权限叠加（Q10 修复）

> **为什么需要这章**：本系统有 **两套独立权限体系**——`RBAC 权限点`（控制"admin 能否访问后台"）+ `accessLevel / 资源档位`（控制"H5 用户能看什么资源"）。**两套不能互相替代、必须独立判定**。本节明确叠加规则。

#### 3.5.1 两套权限体系职责划分

| 体系 | 适用对象 | 控制范围 | 谁来判定 |
|---|---|---|---|
| **RBAC 权限点**（§3.2） | AdminUser（后台用户） | 后台页面可见性、API 调用权 | `PermissionsGuard` |
| **accessLevel / 资源档位** | User（H5 用户） | 文档下载、付费内容、AI 名片可见性 | `ResourceLevelGuard`（业务 Service 内） |
| **`User.userLevel`（DLC 等级 1-5）** | User | DLC 解锁权益（升级奖励、专属任务） | 业务 Service 内（前端也用于展示） |

**核心原则**：
- **后台 admin 可绕过 `accessLevel`**——超管/合规/法务可看任何资源（不限制档位）
- **H5 user 永远不查 `RBAC 权限点`**——他根本不是 AdminUser
- **DLC 等级 ≠ accessLevel dlc3/dlc5**——前者是用户画像，后者是资源门槛

#### 3.5.2 资源档位判定规则

| accessLevel | 判定逻辑（伪代码） | 谁可访问 |
|---|---|---|
| `public` | 永远通过 | 所有游客（无需登录） |
| `login` | `req.user != null` | 已登录 H5 用户 |
| `kyc` | `req.user.kycStatus === 'approved'` | KYC 通过的 H5 用户 |
| `dlc3` | `req.user.userLevel >= 3` | DLC 等级 ≥ 3（**不是**等于 3） |
| `dlc5` | `req.user.userLevel >= 5` | DLC 等级 ≥ 5 |
| `internal` | `req.adminUser.permissions.includes('documents:read')` | **仅后台用户**（H5 端 404） |

**关键决策**：
- `dlc3 / dlc5` 是**门槛**（`>=`），不是**精确匹配**（`==`）——一个 DLC 5 用户能下载 `accessLevel=dlc3` 的资源
- `internal` 在 H5 端**永远 404**（即使登录了），仅后台用户可访问

#### 3.5.3 双重权限叠加示例

**场景**：用户 user_123（DLC 4、KYC 通过）想下载某文档（accessLevel=dlc5）

| 检查步骤 | 判定 |
|---|---|
| 1. 该用户是否登录？ | ✅ req.user 存在 |
| 2. 该用户 KYC 是否通过？ | ✅ kycStatus=approved |
| 3. 该用户 DLC 等级是否 ≥ 5？ | ❌ userLevel=4 |
| **结果** | **拒绝**：返回 403 + i18n key `documents.error.dlcInsufficient` |

**场景**：后台 cs 角色（无 `documents:export`）想导出某 internal 文档

| 检查步骤 | 判定 |
|---|---|
| 1. cs 是否有 `documents:read`？ | ✅（cs 默认含 `documents:read`） |
| 2. cs 是否有 `documents:export`？ | ❌（cs 不含此权限） |
| **结果** | **拒绝**：返回 403 + i18n key `documents.error.exportForbidden` |

#### 3.5.4 资源级守卫实现建议

```typescript
// src/common/guards/resource-level.guard.ts
@Injectable()
export class ResourceLevelGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const doc = await this.docsService.findOne(req.params.id);

    // 后台用户绕过 accessLevel 判定
    if (req.adminUser) return true;

    // H5 用户按 accessLevel 走
    if (doc.accessLevel === 'public') return true;
    if (doc.accessLevel === 'login') return !!req.user;
    if (doc.accessLevel === 'kyc') return req.user?.kycStatus === 'approved';
    if (doc.accessLevel === 'dlc3') return (req.user?.userLevel ?? 0) >= 3;
    if (doc.accessLevel === 'dlc5') return (req.user?.userLevel ?? 0) >= 5;
    if (doc.accessLevel === 'internal') throw new NotFoundException(); // H5 端 404
    return false;
  }
}
```

#### 3.5.5 验收用例（资源级权限）

| # | 用例 | 期望 |
|---|---|---|
| 1 | DLC 3 用户下载 dlc3 资源 | 通过 |
| 2 | DLC 3 用户下载 dlc5 资源 | 403 + dlcInsufficient |
| 3 | DLC 5 用户下载 dlc3 资源 | 通过（**≥** 语义） |
| 4 | 未 KYC 用户下载 kyc 资源 | 403 + kycRequired |
| 5 | H5 用户下载 internal 资源 | 404（不暴露存在性） |
| 6 | 后台 cs 下载 internal 资源 | 通过（绕过 accessLevel） |
| 7 | 后台无 `documents:export` 角色导出 | 403 + exportForbidden |
| 8 | DLC 阈值下调，DLC 5 → DLC 4 用户 | 仍可访问 dlc5 资源（**等级不回算**） |

---

## 4. 审计日志

### 4.1 写入策略
- **强制审计**：`CREATE` / `UPDATE` / `DELETE` / `APPROVE` / `REJECT` / `EXPORT` 全部写
- **不入审计**：`GET` 查询（除非显式声明）
- **字段**：完整 `oldValues` + `newValues`（JSON 字符串）

### 4.2 审计查询 API
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/admin/audit-logs` | 列表（按 adminUserId/module/action/时间 筛选） |
| GET | `/api/admin/audit-logs/:id` | 详情 |
| GET | `/api/admin/audit-logs/export` | 导出 CSV（需 `audit:export`） |

字段：`id, adminUserId, adminUsername, action, module, resourceId, ipAddress, createdAt, diffs (字段名: old → new)`

### 4.3 业务状态日志统一模式（Q2 修复）

> **为什么需要这章**：订单/公司/银行等模块都有"状态变更历史"需求。**部分模块用独立表（11-company-register），部分用 JSON 内嵌（13-bank-account）——两种模式混用导致 API 不一致、审计场景下无法独立查询**。本节强制**统一采用"独立日志表"模式**。

#### 4.3.1 规范：业务状态变更日志

**所有业务实体的"状态变更"必须**：
- ✅ 建立独立 `<Entity>StatusLog` 表（如 `CompanyStatusLog` / `BankOrderStatusLog` / `ServiceOrderStatusLog` / `RefundStatusLog`）
- ✅ 字段统一：`id, entityId, fromStatus, toStatus, note?, operatorId (→ AdminUser), operatorRole, createdAt`
- ✅ `operatorId` 按 §12 规范加 `@relation("Name")`
- ❌ **禁止**用 `String?` JSON 字段内嵌时间线（之前 13-bank-account.md 如此，现已纠正）

#### 4.3.2 标准模板

```prisma
model <Entity>StatusLog {
  id           String   @id @default(uuid())
  entityId     String
  fromStatus   String   // 旧状态
  toStatus     String   // 新状态
  note         String?  // 变更备注（如"补件"）
  operatorId   String?
  operator     AdminUser? @relation("<Entity>StatusLogOperator", fields: [operatorId], references: [id], onDelete: Restrict)
  operatorRole String?  // 操作时角色（角色可能后续变更）
  createdAt    DateTime @default(now())

  @@index([entityId, createdAt])
  @@index([operatorId])
  @@index([toStatus, createdAt])
}
```

#### 4.3.3 API 规范

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/admin/{module}/:id/status-logs` | 列表（分页，按 createdAt desc） |
| GET | `/api/admin/{module}/:id/status-logs/:logId` | 详情 |

**响应示例**：
```json
{
  "data": [
    {
      "id": "log_xxx",
      "fromStatus": "draft",
      "toStatus": "submitted",
      "note": "用户提交",
      "operator": { "id": "admin_001", "username": "cs_zhang" },
      "operatorRole": "cs",
      "createdAt": "2026-06-01T10:30:00Z"
    }
  ],
  "total": 5
}
```

#### 4.3.4 各模块落地映射

| 模块 | 文档 | 状态日志表 | 备注 |
|---|---|---|---|
| 公司订单 | 11-company-register.md | `CompanyStatusLog` | ✅ 已是独立表 |
| 银行账户订单 | 13-bank-account.md | `BankOrderStatusLog` | **本轮修复**：原 `statusLogs String?` JSON 改独立表 |
| 服务订阅 | 03-services.md | `ServiceOrderStatusLog` | 需新增 |
| DLC 升级 | 14-dlc-level.md | `DlcUpgradeLog` | 已是独立表（§3.3） |
| AI 名片 | 19-ai-business-card.md | `AiCardStatusLog` | 需新增 |
| 退款 | 12-payment-console.md | `RefundStatusLog` | 需新增 |
| DID 凭证 | 18-did-identity.md | （用 `VerifiableCredential.status` 字段变化即可，单独日志可选） | — |
| AI Agent | 04-ai-brain.md | `AiAgentStatusLog` | 需新增 |

#### 4.3.5 验收用例（业务状态日志）

| # | 用例 | 期望 |
|---|---|---|
| 1 | 银行订单状态变更 | 同步写 1 条 `BankOrderStatusLog` |
| 2 | 列表页 1000 行订单 + 1000 行 log 联合查询 | 500ms 内返回（独立表 + 索引） |
| 3 | 运营查询"过去 7 天所有 kyc_rejected 变更" | 用 `@@index([toStatus, createdAt])` 命中 |
| 4 | 软删 AdminUser 后查其历史变更 | 仍可查（`onDelete: Restrict`） |
| 5 | 跨 3 个模块用同一接口 `/status-logs` | 字段一致，前端表格组件可复用 |

### 4.3 实现
- 拦截器 `AuditLogInterceptor`，自动捕获 `@Audit({ action, module })` 装饰器标注的接口
- 写入失败**不影响主业务**（try-catch，warn 日志）

---

## 5. i18n 多语言

### 5.1 支持语言
| code | 语言 | 字典文件 |
|---|---|---|
| `zh-CN` | 简体中文 | `i18n/zh-CN.json` |
| `en-US` | 英文 | `i18n/en-US.json` |
| `ja-JP` | 日文 | `i18n/ja-JP.json` |
| `ko-KR` | 韩文 | `i18n/ko-KR.json` |

### 5.2 实现
- **后端**：仅返回**枚举 + 字典 key**（如 `status: "PENDING"`，由前端按 locale 翻译）。特殊字段（如通知模板）从数据库读取对应语言版本。
- **前端**：用 `react-i18next` + `i18next-browser-languagedetector`，存 `localStorage.locale`，默认 `zh-CN`。

### 5.3 字典结构
```json
{
  "common": {
    "create": "创建",
    "edit": "编辑",
    "delete": "删除",
    "approve": "通过",
    "reject": "驳回",
    "export": "导出",
    "search": "搜索",
    "reset": "重置",
    "submit": "提交",
    "cancel": "取消",
    "confirm": "确认"
  },
  "status": {
    "PENDING": "待处理",
    "APPROVED": "已通过",
    "REJECTED": "已驳回",
    "PROCESSING": "处理中",
    "COMPLETED": "已完成"
  },
  "menu": {
    "dashboard": "仪表盘",
    "users": "用户管理",
    "companies": "公司订单",
    ...
  }
}
```

### 5.4 不可翻译项
- 状态枚举值（API 内部）
- 货币代码（USD/CNY）
- 链名称（ETH/BSC）

### 5.5 命名约定（Q7 修复）

> **为什么需要这章**：i18next 资源键名跨 21 个模块抽查出 **3 种命名空间风格**（`did` 单数 / `notifications` 复数 / `aiCard` 驼峰），导致 `useTranslation('xxx')` 调用混乱。本节强制统一。

#### 5.5.1 顶层 namespace 命名规则

| 规则 | 正确 | 错误 |
|---|---|---|
| namespace = **模块目录名**（与 §1~19 编号一致） | `did`、`dlc`、`tax`、`legal` | ❌ `did-identity`、`dlcLevel` |
| 全小写 | `aiCard` 是唯一例外 | ❌ `AiCard`、`AIBrain` |
| 复数用 `s` 结尾 | `users`、`companies`、`banks` | ❌ `user`、`company`（除非单数语义） |
| 含连字符模块转**驼峰** | `ai-business-card` → `aiCard` | ❌ `ai_business_card`（i18next 不友好） |
| 缩写词**不大写** | `dvc`、`kyc`、`usdt` | ❌ `DVC`、`KYC`（虽在 Prisma 字段大写） |

**各模块 namespace 速查**（统一规定，避免任意命名）：

| 模块 | namespace | 示例 key |
|---|---|---|
| 01-dashboard | `dashboard` | `dashboard.metrics.totalUsers` |
| 02-discover | `discover` | `discover.banner.title` |
| 03-services | `services` | `services.subscription.yearly` |
| 04-ai-brain | `ai` | `ai.agentStatus.online` |
| 05-profile | `profile` | `profile.kycStatus.approved` |
| 06-tax-calculator | `tax` | `tax.regime.samoa` |
| 07-legal-hub | `legal` | `legal.docType.contract` |
| 08-video-center | `video` | `video.status.online` |
| 09-media-center | `media` | `media.platform.facebook` |
| 10-ai-chat | `aiChat` | `aiChat.sessionStatus.ongoing` |
| 11-company-register | `company` | `company.orderStatus.submitted` |
| 12-payment-console | `payment` | `payment.txStatus.paid` |
| 13-bank-account | `bank` | `bank.orderStatus.kycPending` |
| 14-dlc-level | `dlc` | `dlc.level.bronze`（**禁纯数字**） |
| 15-documents | `document` | `document.category.legal` |
| 16-settings | `settings` | `settings.locale.zhCN` |
| 17-notifications | `notification` | `notification.channel.inapp` |
| 18-did-identity | `did` | `did.vcType.KYC` |
| 19-ai-business-card | `aiCard` | `aiCard.layout.classic` |
| 00-foundation | `common` | `common.create` |

#### 5.5.2 key 命名规则

| 规则 | 正确 | 错误 | 说明 |
|---|---|---|---|
| 全小写 + 驼峰 | `orderStatus`、`kycPending` | ❌ `order_status`、`KycPending` | i18next 默认驼峰 |
| 状态值用大写 | `PENDING`、`APPROVED` | ❌ `pending`、`Approved` | 跟 API 枚举一致，便于映射 |
| **禁止纯数字 key** | `levelBronze`、`level_1` | ❌ `level.1`、`level.2` | i18next 把数字当 plural 变量，会误判 |
| 多词用 camelCase | `accessLevel`、`operatorRole` | ❌ `access-level`、`operator_role` | — |
| 时间相关用 `xxxAt` 后缀 | `createdAt`、`expiredAt` | ❌ `created_at`、`expireDate` | — |

#### 5.5.3 状态翻译的特殊规则

**API 响应枚举** vs **i18n 字典**：**两套独立，但要求 key 严格对应**。

```typescript
// 后端 API 响应（不变）
{ status: "PENDING", kycStatus: "approved" }

// 前端翻译（status 字典用大写枚举）
t('common.status.PENDING')      // "待处理"
t('profile.kycStatus.approved') // "已通过"（key 用小写 + 字典匹配）
```

**规则**：
- `common.status.*` 收 6 个基础状态（PENDING/PROCESSING/REVIEWING/APPROVED/REJECTED/DISABLED），全模块复用
- 模块专属状态用 `<namespace>.<entity>Status.<value>` 命名（`company.orderStatus.submitted`）
- **状态字典的 value 永远用 API 枚举字面量**（如 `'PENDING'`），不要翻译成中文

#### 5.5.4 验收用例（i18n 命名）

| # | 用例 | 期望 |
|---|---|---|
| 1 | 前端 `t('did.vcType.KYC')` | 命中（`namespace=did`） |
| 2 | 前端 `t('dlc.level.1')` | 警告/i18next 误判为 plural 变量 |
| 3 | 前端 `t('notification.channel.inapp')` | 命中（`namespace=notification` 单数） |
| 4 | 前端 `t('aiCard.layout.classic')` | 命中（驼峰） |
| 5 | 翻译 zh-CN → en-US | 所有 key 在两个文件**必须**同结构（CI 检查） |
| 6 | 新增模块 | 按 §5.5.1 速查表选 namespace，**禁止**自由命名 |

---

## 6. 数据库设计原则

| 原则 | 说明 |
|---|---|
| 软删 | 所有业务表必须有 `deletedAt: DateTime?` |
| 乐观锁 | 核心表（订单、公司）有 `version: Int` |
| 时间统一 | `createdAt` / `updatedAt` 必有 |
| 索引 | 外键、状态字段、查询高频字段必加索引 |
| 枚举字符串化 | 状态用 `String`（SQLite/PG 通用），H5 端字面量一一对应 |
| JSON 字段 | 在 SQLite 中用 `String` + `JSON.stringify`；PG 升级后改 `Json` |

---

## 7. 通用 API 规范

### 7.1 鉴权
- Header: `Authorization: Bearer <jwt>`
- JWT payload: `{ sub: adminUserId, role: roleName, permissions: [...], iat, exp }`
- 过期：7 天

### 7.2 错误处理
- 业务异常：`throw new BusinessException(code, message, errors?)`
- 校验异常：NestJS `ValidationPipe` + `class-validator`
- 统一异常过滤器：返回 §4 错误响应

### 7.3 列表 API 通用参数
```
?page=1
&pageSize=20
&keyword=搜索关键字
&status=状态
&startDate=2026-01-01
&endDate=2026-06-06
&sortBy=createdAt
&sortOrder=desc
```

### 7.4 批量操作
- POST `/api/admin/{module}/batch`
- Body: `{ ids: [...], action: "approve" | "reject" | "delete" | "enable" | "disable" }`
- 响应：每条 ID 的处理结果

### 7.5 退款约定（Q8 修复）

> **为什么需要这章**：退款逻辑分散在 3 个模块（12-payment-console / 13-bank-account / 03-services），**3 套状态机、3 套字段、3 套 API**——多次部分退款的并发安全、累计已退金额、跨模块一致性无统一规范。本节强制统一。

#### 7.5.1 Transaction 必填字段

```prisma
model Transaction {
  // ... 原有字段 ...
  amount            Decimal  // 原始金额
  refundedAmount    Decimal  @default(0)  // 累计已退金额（本轮新增）
  remainingRefundable Decimal @default(0) // 剩余可退 = amount - refundedAmount（计算字段，落库便于查询）
  refundStatus      String   @default("none")  // none / partial / full
  refundCount       Int      @default(0)  // 退款笔数

  @@index([refundStatus])
}
```

**`refundedAmount` 写入规则**：
- 创建退款单时**不能**直接改 `refundedAmount`——必须用**事务 + 乐观锁**（`version: Int`）
- 多次部分退款：`refundedAmount += refund.amount`（仅当 `refund.status === 'succeeded'` 时累加）

#### 7.5.2 统一退款状态机

```
                 ┌─────────────────────────────────────────┐
                 ▼                                         │
Transaction ──► paid ──► partial_refunded ──► refunded     │
   │                       ▲                  │            │
   │                       └──────────────────┘            │
   │                                                        │
   └─► failed                                                │
   └─► cancelled (用户主动取消，未扣款)                       │
                                                                │
Refund ──► requested ──► processing ──► succeeded / failed │
            │                                              │
            └─► cancelled (用户撤回)                        │
```

**判定全退 vs 部分退**（必须在 Service 内统一函数）：
```typescript
function determineRefundType(tx: Transaction, refundAmount: Decimal): 'full' | 'partial' {
  if (refundAmount.equals(tx.amount)) return 'full';
  if (refundAmount.add(tx.refundedAmount).equals(tx.amount)) return 'full';  // 累计到全额
  if (refundAmount.gt(tx.remainingRefundable)) {
    throw new BusinessException('REFUND_EXCEED_REMAINING', `超出可退金额 ${tx.remainingRefundable}`);
  }
  return 'partial';
}
```

#### 7.5.3 跨模块退款路由

| 触发场景 | 退款发起方 | 关联实体 | 退款归属 |
|---|---|---|---|
| H5 取消服务订阅 | User 主动 | `ServiceOrder` | 底层 `Transaction`（**不是** ServiceOrder） |
| 公司订单失败 | CS 发起 | `CompanyOrder` | 关联的 `Transaction`（支付通道记录） |
| 银行账户审核拒绝 | 风控发起 | `BankAccountOrder` | 关联的 `Transaction` |
| AI 名片退款 | 客服发起 | `AiCardOrder` | 关联的 `Transaction` |
| 系统误扣 | 财务发起 | 直接指定 `Transaction` | 直接操作 |

**核心原则**：**所有退款最终落到一张 `Transaction` 表 + 一张 `Refund` 表**——不维护"订单级退款状态"（除 ServiceOrder 等需要外露给用户看）。

#### 7.5.4 Refund 必填字段

```prisma
model Refund {
  id              String   @id @default(uuid())
  refundNo       String   @unique
  transactionId  String
  transaction    Transaction @relation(fields: [transactionId], references: [id], onDelete: Restrict)
  amount         Decimal
  reason         String
  type           String   // 'full' | 'partial'（由 determineRefundType 判定后落库）
  status         String   @default("requested")  // requested / processing / succeeded / failed / cancelled
  channel        String?  // 'stripe' | 'alipay' | 'bank_transfer'
  channelRefundId String?  // 通道方退款单号
  requestedBy    String?  // userId (H5) 或 adminUserId
  requesterType  String   // 'user' | 'admin'
  processedAt    DateTime?
  failedReason   String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([transactionId, status])
  @@index([status, createdAt])
}
```

**并发安全**（多次部分退款）：
```typescript
async function processRefund(refundId: string) {
  await prisma.$transaction(async (tx) => {
    const refund = await tx.refund.findUniqueOrThrow({ where: { id: refundId } });
    const txn = await tx.transaction.findUniqueOrThrow({
      where: { id: refund.transactionId },
    });
    if (txn.refundedAmount.add(refund.amount).gt(txn.amount)) {
      throw new BusinessException('REFUND_EXCEED');
    }
    // 乐观锁：version 必须匹配
    const updated = await tx.transaction.update({
      where: { id: txn.id, version: txn.version },
      data: {
        refundedAmount: { increment: refund.amount },
        version: { increment: 1 },
        refundCount: { increment: 1 },
        refundStatus: determineRefundType(txn, refund.amount),
      },
    });
    if (updated.count === 0) throw new BusinessException('CONCURRENT_REFUND_CONFLICT');
    // 调通道真实退款
    await paymentChannel.refund(refund);
  });
}
```

#### 7.5.5 验收用例（退款）

| # | 用例 | 期望 |
|---|---|---|
| 1 | 全退（$100 → $100 退款） | `refundStatus=full`，`refundedAmount=100` |
| 2 | 部分退 1 次（$100 → 退 $30） | `refundStatus=partial`，`refundedAmount=30` |
| 3 | 部分退 2 次（$100 → 退 $30 + $40） | `refundedAmount=70`，`refundCount=2` |
| 4 | 部分退累计达 $100 | 第 3 次退 $30 → `refundStatus=full` |
| 5 | 超额退（已退 $80，再退 $30） | 抛 REFUND_EXCEED，事务回滚 |
| 6 | 并发退 2 次 | 一笔成功一笔 CONCURRENT_REFUND_CONFLICT |
| 7 | 跨模块查询退款 | 12-payment-console + 03-services + 13-bank-account 共享 `GET /api/admin/refunds` |

---

## 8. 通用 UI 规范

### 8.1 布局
- **桌面**（≥ 1024px）：左侧 220px 折叠菜单 + 主内容
- **平板**（768-1023px）：左侧 64px 折叠
- **手机**（< 768px）：抽屉式菜单 + 单列

### 8.2 列表页通用结构
```
┌──────────────────────────────────────────┐
│ 面包屑：首页 / 用户管理                    │
│                                          │
│ [筛选区：keyword | 状态 | 时间 | 重置 | 搜索]│
│                                          │
│ [操作区：创建 | 批量审批 | 导出]            │
│                                          │
│ ┌────┬────┬────┬────┬────┬────┬────┐    │
│ │ □ │ ID │ 名称 │ 状态 │ 创建 │ 操作 │    │
│ ├────┼────┼────┼────┼────┼────┼────┤    │
│ │ □ │ ...│ ... │ ... │ ... │ 编辑/详情/删除│
│ └────┴────┴────┴────┴────┴────┴────┘    │
│                                          │
│         [分页：共 123 条  1 2 3 ...]      │
└──────────────────────────────────────────┘
```

### 8.3 状态色彩
| 状态 | 颜色（hex） | 文字 |
|---|---|---|
| 待处理 PENDING | `#F6A623` | 橙 |
| 处理中 PROCESSING | `#3B82F6` | 蓝 |
| 审核中 REVIEWING | `#8B5CF6` | 紫 |
| 已通过 APPROVED | `#10B981` | 绿 |
| 已驳回 REJECTED | `#EF4444` | 红 |
| 已停用 DISABLED | `#6B7280` | 灰 |

#### 8.3.1 扩展状态色彩映射（Q3 修复）

> **为什么需要这章**：21 个模块的业务状态值共 **30+ 种**，原 §8.3 只覆盖 6 个基础状态——前端会自己拍颜色，导致整套后台颜色语义不一致。本表强制统一所有业务状态的颜色。

| 模块 | 状态值 | 颜色 | 文字 | 备注 |
|---|---|---|---|---|
| **通用** | 草稿 DRAFT | `#9CA3AF` | 浅灰 | 任何实体的 `draft` 都用此色 |
| | 已撤回 WITHDRAWN | `#6B7280` | 灰 | 不可逆 |
| | 已过期 EXPIRED | `#9CA3AF` | 浅灰 | 不可操作 |
| **公司订单** (11) | 已提交 submitted | `#3B82F6` | 蓝 | |
| | 补件中 supplementing | `#F59E0B` | 琥珀 | 待用户补件 |
| | 已取消 cancelled | `#6B7280` | 灰 | |
| | 已完成 completed | `#10B981` | 绿 | |
| **银行账户订单** (13) | KYC 待审核 kyc_pending | `#8B5CF6` | 紫 | |
| | KYC 已通过 kyc_approved | `#10B981` | 绿 | |
| | KYC 已驳回 kyc_rejected | `#EF4444` | 红 | |
| | 银行审核中 bank_reviewing | `#8B5CF6` | 紫 | |
| | 银行已通过 bank_approved | `#10B981` | 绿 | |
| | 银行已驳回 bank_rejected | `#EF4444` | 红 | |
| | 开户中 account_opening | `#3B82F6` | 蓝 | |
| | 失败 failed | `#EF4444` | 红 | |
| **服务订阅** (03) | 续费失败 past_due | `#F59E0B` | 琥珀 | 本轮新增 |
| | 部分退款 partial_refunded | `#F59E0B` | 琥珀 | |
| **AI Agent** (04) | 已上线 online | `#10B981` | 绿 | |
| | 已下线 offline | `#6B7280` | 灰 | |
| | 维护中 maintenance | `#F59E0B` | 琥珀 | |
| **DLC 升级** (14) | 待审核 PENDING | `#F6A623` | 橙 | |
| | 已通过 APPROVED | `#10B981` | 绿 | |
| | 已驳回 REJECTED | `#EF4444` | 红 | |
| **Discover** (02) | 已排期 scheduled | `#3B82F6` | 蓝 | |
| **Campaign** (17) | 排期中 scheduled | `#3B82F6` | 蓝 | |
| | 发送中 sending | `#8B5CF6` | 紫 | |
| **视频** (08) | 待审 pending | `#F6A623` | 橙 | |
| | 已发布 online | `#10B981` | 绿 | |
| | 已下架 offline | `#6B7280` | 灰 | |
| | 已封禁 banned | `#7F1D1D` | 暗红 | |
| **评论** (08) | 待审 pending | `#F6A623` | 橙 | |
| | 已隐藏 hidden | `#9CA3AF` | 浅灰 | |
| **AI Chat** (10) | 进行中 ongoing | `#3B82F6` | 蓝 | |
| | 已接管 taken_over | `#8B5CF6` | 紫 | |
| | 已标记 flagged | `#F59E0B` | 琥珀 | |
| **通知** (17) | 待发送 pending | `#F6A623` | 橙 | |
| | 已发送 sent | `#3B82F6` | 蓝 | |
| | 已送达 delivered | `#10B981` | 绿 | |
| | 已读 read | `#9CA3AF` | 浅灰 | |
| | 发送失败 failed | `#EF4444` | 红 | |
| **VC 凭证** (18) | 已签发 issued | `#10B981` | 绿 | |
| | 已吊销 revoked | `#EF4444` | 红 | |
| | 已暂停 suspended | `#F59E0B` | 琥珀 | |
| **DID 身份** (18) | 已激活 active | `#10B981` | 绿 | |
| | 已停用 deactivated | `#6B7280` | 灰 | |
| | 已轮换 rotated | `#3B82F6` | 蓝 | |

#### 8.3.2 颜色使用规范

- **shadcn Badge 组件**：`variant="default" | "secondary" | "destructive" | "outline"`，自定义颜色用 `<Badge className="bg-[#F6A623]">`
- **状态值大小写**：API 响应枚举用小写（`status: "submitted"`），**但 i18n 字典 key 用大写**（`status.SUBMITTED`）——见 §5.5
- **暗色主题**：所有 hex 颜色的 R/G/B 通道值需在暗色模式下加 `mix-blend-mode: screen` 或换算为 `hsl(var(--warning))` 变量
- **可访问性**：颜色 + 文字 双标识（不让色盲用户仅靠颜色判断），状态色对应文字必须见 §5.5 i18n 字典

#### 8.3.3 验收用例（状态色彩）

| # | 用例 | 期望 |
|---|---|---|
| 1 | 公司订单 submitted 状态 | 蓝色徽章 + 文字"已提交" |
| 2 | 视频 banned 状态 | 暗红徽章 + 文字"已封禁" |
| 3 | 通知 failed 状态 | 红色徽章 + 文字"发送失败" |
| 4 | 暗色模式下所有徽章 | 颜色对应 CSS 变量自动调整 |
| 5 | 仅色盲用户访问 | 状态文字 + 颜色 双标识可识别 |

### 8.4 表单页通用规则
- 必填项标 `*`
- 提交前 `dirty` 提示
- 提交后 toast 提示（i18n 字典）
- 编辑/详情 用 drawer 抽屉（不离开列表）

### 8.5 详情页
- 头部：标题 + 状态 + 操作按钮（审核/驳回/编辑）
- 主体：左右两栏（左：基本信息；右：审计/活动）
- 底部：相关业务跳转（订单 → 用户 → KYC）

---

## 9. 验收用例（基础）

| # | 用例 | 期望 |
|---|---|---|
| 1 | admin/admin123 登录 | 返回 JWT，permissions 含 `["*"]` |
| 2 | 错误密码 5 次 | 账户锁定 30 分钟 |
| 3 | 客服登录访问 `/users` 列表 | 可看 |
| 4 | 客服尝试访问 `/audit-logs` | 403 |
| 5 | 客服尝试导出用户 | 403 |
| 6 | 运营修改 AI 知识库 | AuditLog 记录 `action=UPDATE, module=ai-brain, old/new` |
| 7 | 切换语言 en-US | 所有菜单/按钮/状态显示英文 |
| 8 | 软删用户 | `deletedAt` 写入，列表不显示 |
| 9 | 同时编辑同一订单（乐观锁） | 后提交者收到 409 + `version` 冲突提示 |
| 10 | JWT 过期 | 401 + 前端跳登录 |

---

## 10. 与现有实现的差距

| 项目 | 现状 | 待补 |
|---|---|---|
| AdminUser / AdminRole / AuditLog 模型 | 已有 schema + seed | ✓ |
| 登录接口 | `POST /api/admin/auth/login` 返回 JWT | ✓ |
| 6 角色 | seed 只有 `superadmin` | 需 seed 其他 5 角色 |
| RBAC Guard | 部分实现（仅 role 检查） | 需精确到 permission code（§3.4 算法） |
| 审计装饰器 | 无 | 需新增 `@Audit()` |
| i18n | 无 | 需新增 4 语言字典 + 前端集成 |
| 菜单权限 | 前端硬编码 | 改从后端 `/api/admin/menu` 拉取 |
| 密钥管理（§11） | 无 | **必须优先实现**，否则 5 个模块的 `credentials` 字段落库无意义 |
| `*UserId` 外键（§12） | 无 | 需统一规范（见 §12） |

---

## 11. 密钥与凭证管理（KMS / Credentials Vault）

> **为什么需要这章**：5 个模块存了敏感凭证（`PaymentChannel.credentials` / `ChannelConfig.credentials` / `MediaAccount.credentials` / `KYC.idNumber` / `VerifiableCredential.proof` 等），但**静态加密、密钥管理、轮转、env 隔离、解密审计**等基础设施文档全部空白——本节是后端"先于模块代码"必须落地的能力。

### 11.1 总体架构

```
┌──────────────────────────────────────────────────────────┐
│  Application Code (NestJS)                                │
│    ↓ getCredential('paymentChannel', id)                  │
│  Secrets Service (src/common/secrets/secrets.service.ts) │
│    ↓ 解密请求                                              │
│  KMS (LocalVault / AWS KMS / Aliyun KMS / HashiCorp Vault)│
│    ↓ 返回明文 (内存中)                                    │
│  Application Code 使用 (调 Stripe / FCM / DID 签名)        │
└──────────────────────────────────────────────────────────┘
```

**信封加密 (Envelope Encryption)**：
- 每个凭证用独立 **DEK (Data Encryption Key)** 加密（`AES-256-GCM`）。
- DEK 本身用 **KEK (Key Encryption Key)** 加密后存入 DB。
- KEK **绝不落盘**，由 KMS 托管。

### 11.2 字段加密规范

所有 `credentials String?` 字段必须按此格式存储：

```typescript
interface EncryptedPayload {
  v: 1;                              // schema 版本
  alg: 'AES-256-GCM';                // 算法
  iv: string;                        // base64, 12 字节
  ct: string;                        // base64, 密文
  tag: string;                       // base64, GCM auth tag (16 字节)
  dek: string;                       // base64, 用 KEK 加密后的 DEK
  kmsKeyId: string;                  // KEK 引用 ID
  createdAt: string;                 // ISO 8601
  rotatedFrom?: string;              // 上一个版本的 payload（轮转时填）
}
```

**禁止**：
- ❌ 直接存明文 JSON
- ❌ 用 `AES-CBC` / `ECB`
- ❌ 写死 IV
- ❌ 把 KEK 放在 `.env`（除非是 dev 环境且 `NODE_ENV !== 'production'`）

### 11.3 环境隔离

| 环境 | 密钥来源 | 备注 |
|---|---|---|
| **dev** (本地) | `.env.development` 写入 dev-only KEK (32 字节 base64) | 仅本地使用，**绝不能**与 staging/prod 共享 |
| **staging** | `.env.staging` 或 Vault dev mode | 用 staging 专属 KEK |
| **production** | **必须**用托管 KMS（AWS KMS / 阿里云 KMS / Vault） | 绝不允许从 env 读 KEK |

**禁止**：
- ❌ dev/staging/prod 共享同一 KEK
- ❌ prod 部署时使用 dev `.env`

### 11.4 轮转策略

| 场景 | 轮转周期 | 流程 |
|---|---|---|
| 定期轮转 | **90 天** | Cron job：旧 DEK 解密 → 新 DEK 重加密 → 旧 payload 保留 7 天（grayscale） |
| 泄露事件 | 立即 | 新 KEK + 全量 DEK 重加密 |
| 凭证变更（如 Stripe key 失效） | 立即 | 单条记录重加密 |
| AdminUser 离职 | 立即 | 吊销其 JWT + 重置其能访问的 secrets |

### 11.5 解密审计

所有"读取明文凭证"的动作必须写 `AuditLog`：
```typescript
{
  action: 'SECRET_DECRYPT',
  module: 'payment-channels',  // 或 'did', 'notifications' 等
  resourceId: 'channel_xxx',
  reason: '调用 Stripe API 创建 charge',  // 调用方必填
  operatorId: 'adminUserId',
  ipAddress: '...',
}
```

### 11.6 推荐实现库

- **`@aws-sdk/client-kms`** + **`@aws-crypto/client-node`**（AWS）
- **`@alicloud/kms20160120`** + **`@alicloud/crypto-sdk`**（阿里云）
- **`node-vault`**（HashiCorp Vault）
- **`@noble/ciphers`**（纯 JS 实现的 AES-256-GCM，备选）

dev fallback：本地实现 `LocalVaultService`，用 `crypto.createCipheriv('aes-256-gcm', ...)` 实现，KEK 从 `process.env.LOCAL_KEK` 读取（**仅 dev**）。

### 11.8 验收用例

| # | 用例 | 期望 |
|---|---|---|
| 1 | 配置 Stripe 通道并保存 API Key | DB 中 `credentials` 字段为 EncryptedPayload，**不**含明文 |
| 2 | 后端解密并调 Stripe | 调用成功 + AuditLog 写 SECRET_DECRYPT |
| 3 | 列表 API 返回 channel | `credentials` 字段**不**在响应中（DTO `@Exclude()`） |
| 4 | 改 dev `.env` 的 LOCAL_KEK | 历史 channel 解密失败，需重新录入 |
| 5 | 手动触发轮转 | 7 天内新旧 DEK 都能解密 |
| 6 | prod 环境启动检查 KEK 来源 | 启动失败若发现 KEK 是 env 直读 |
| 7 | 凭证解密操作 | AuditLog 立刻有记录 |
| 8 | 同事离职 | 审计可查"该用户解密过哪些凭证" |

---

## 12. `*UserId` 外键与索引规范

> **为什么需要这章**：PRD 多个模块用了 `assignedTo` / `approvedBy` / `operatorId` / `revokedBy` / `takenOverBy` / `createdBy` / `updatedBy` 等**裸 `String` 字段**——它们**逻辑上**指向 `AdminUser.id`，但**没有 `@relation`**，导致：(1) 数据库层无法保证外键存在；(2) 软删 AdminUser 后审计日志"孤儿"；(3) 缺索引拖慢按操作人查询。本节给出统一规范。

### 12.1 规范

所有指向 admin 操作人的字段必须：

```prisma
model CompanyOrder {
  // ... 其他字段 ...
  assignedTo   String?
  assignedToUser AdminUser?  @relation("CompanyOrderAssignedTo", fields: [assignedTo], references: [id], onDelete: Restrict)

  approvedBy   String?
  approvedByUser AdminUser?  @relation("CompanyOrderApprovedBy", fields: [approvedBy], references: [id], onDelete: Restrict)

  // 通用 createdBy / updatedBy
  createdBy    String?
  createdByUser AdminUser?  @relation("CompanyOrderCreatedBy", fields: [createdBy], references: [id], onDelete: Restrict)
  updatedBy    String?
  updatedByUser AdminUser?  @relation("CompanyOrderUpdatedBy", fields: [updatedBy], references: [id], onDelete: Restrict)

  @@index([assignedTo])
  @@index([approvedBy])
  @@index([createdBy])
}
```

### 12.2 关键约束

- **类型**：必须是 `String?`（不是 `Int`）
- **关系命名**：每个外键必须用 `@relation("Name")` 显式命名（Prisma 多关系会冲突）
- **删除策略**：`onDelete: Restrict`（**禁止** Cascade——admin 软删时**必须**保留历史审计归属）
- **索引**：每个 `*UserId` 字段加 `@@index([xxx])`

### 12.3 AdminUser 软删时

- 软删 AdminUser 时**不影响**历史数据，审计 `*UserId` 仍指向被软删用户的 id
- 历史审计日志 (`AuditLog.adminUserId`) 也用同样策略
- 重建 admin 时**不可**复用已软删的 id（UUID 重新生成）

### 12.4 跨表字段

`User`（H5 端）相关字段（如 `KYC.userId`、`Transaction.userId`、`DvcTransaction.userId`、`BusinessCard.userId` 等）也按相同规范加外键：

```prisma
model KYC {
  userId  String
  user    User    @relation(fields: [userId], references: [id], onDelete: Restrict)
  @@index([userId])
}
```

### 12.5 验收用例

| # | 用例 | 期望 |
|---|---|---|
| 1 | 删除 `CompanyOrder.assignedTo` 外键 | Prisma 报错"必须引用 AdminUser" |
| 2 | 软删某 admin（其 ID 出现在 100 条审计日志） | 历史 100 条审计仍可查 |
| 3 | 按 `assignedTo` 查订单 | 命中索引，< 50ms |
| 4 | 删除 admin 时使用 Cascade | Prisma 报错（Restrict 阻止） |

---

## 13. User 与 AdminUser 跨表规则（Q6 修复）

> **为什么需要这章**：§1 说"两套身份不互通"，但**一个自然人能否同时是 User 和 AdminUser**（如老板自己用 H5 又是运营）？**同一手机/邮箱能否两边都用**？**升级路径**？——本章明确。

### 13.1 核心规则

| 维度 | 规则 |
|---|---|
| **登录入口** | H5 用户登录 → `/api/h5/auth/login` → 返回 user JWT<br>后台管理员登录 → `/api/admin/auth/login` → 返回 admin JWT<br>**两套 JWT，密钥可不同，过期时间可不同** |
| **身份唯一性** | 一个自然人**可以同时**是 User + AdminUser（双身份），但**两套表完全独立**，不共享字段 |
| **手机/邮箱** | `User.phone @unique` / `User.email @unique` / `AdminUser.email @unique`——**应用层做跨表唯一**（业务校验，DB 不强制） |
| **JWT 互不混用** | admin JWT 调 `/api/admin/*`，user JWT 调 `/api/h5/*`——**绝对不混用** |
| **审计归属** | 一切 admin 操作的 `*UserId` 都指向 `AdminUser.id`（见 §12） |
| **共享功能** | **禁止** AdminUser 走 H5 端接口购买产品；H5 端接口不接受 admin JWT |

### 13.2 应用层跨表唯一校验

```typescript
// src/common/validators/unique-identity.validator.ts
@ValidatorConstraint({ name: 'uniqueIdentity', async: true })
class UniqueIdentityConstraint implements ValidatorConstraintInterface {
  async validate(value: string, args: any) {
    const [field] = args.constraints;
    // 校验 User 表
    const inUser = await db.user.findFirst({ where: { [field]: value, deletedAt: null } });
    // 校验 AdminUser 表
    const inAdmin = await db.adminUser.findFirst({ where: { [field]: value, deletedAt: null } });
    return !inUser && !inAdmin;
  }
}

// 用法
class CreateUserDto {
  @Validate(UniqueIdentityConstraint, ['phone'])
  phone: string;
}
```

### 13.3 升级路径

| 场景 | 流程 |
|---|---|
| User 申请成为 admin | **不支持自助申请**。超管在后台 `/admin/settings/admins` 新建 AdminUser，**手动指定邮箱**（不必与 User 邮箱一致） |
| 老板既是 User 又是 AdminUser | 在两表分别创建，邮箱/手机可一致，但**业务上不推荐**（审计混淆） |
| AdminUser 想体验 H5 | 在 User 表新建一条记录，**独立身份**（即使与 AdminUser 同邮箱） |
| AdminUser 离职 | 仅软删 AdminUser，**不影响**其 User 身份（如有） |

### 13.4 AdminUser 加 phone 字段（推荐）

为支持 §13.2 跨表唯一，建议 `AdminUser` 补 `phone` 字段：

```prisma
model AdminUser {
  id        String   @id @default(uuid())
  username  String   @unique
  email     String   @unique
  phone     String?  @unique  // 新增
  password  String
  // ...
}
```

迁移后所有新建 AdminUser 录入 phone（可选但推荐）。

### 13.5 验收用例

| # | 用例 | 期望 |
|---|---|---|
| 1 | User 表 phone=13800001234，再创建 AdminUser phone=13800001234 | 应用层校验失败 |
| 2 | admin JWT 调 `/api/h5/services` | 401（不接受 admin JWT） |
| 3 | user JWT 调 `/api/admin/users` | 401 |
| 4 | 软删 AdminUser | User 端不受影响，admin 端不能登录 |
| 5 | 创建 User 用 admin 已存在的 email | 应用层校验失败 |
| 6 | 同一浏览器同时登录 H5 和 admin | 两套 JWT 并存，互不串 |
