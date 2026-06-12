# 后台管理 PRD 索引

> **状态**：草案 v0.1 · 2026-06-06
> **目的**：作为完整后台管理系统的**唯一开发参考**——按此实现即可交付。
> **范围**：覆盖 H5 端 20 个菜单的对应后台管理模块 + 运营支撑功能（RBAC/审计/通知/系统设置）。
> **技术栈**：NestJS 10 + Prisma 5 + JWT (后端) / React 19 + shadcn/ui + Vite 7 (前端) / SQLite (开发) → PostgreSQL (生产)。

---

## 1. 文档地图

### 1.1 基础

| #   | 文件                                   | 内容                                                                 |
| --- | -------------------------------------- | -------------------------------------------------------------------- |
| 00  | [00-foundation.md](./00-foundation.md) | 认证、JWT、RBAC 多角色、菜单权限、审计日志、系统通知、i18n、文案字典 |

### 1.2 核心运营（仪表盘 + 5 大发现/服务/AI 引擎）

| #   | 文件                                 | 对应 H5 路由 | 模块名                               |
| --- | ------------------------------------ | ------------ | ------------------------------------ |
| 01  | [01-dashboard.md](./01-dashboard.md) | `/`          | 仪表盘（KPI、待办、订单、活动）      |
| 02  | [02-discover.md](./02-discover.md)   | `/discover`  | 发现（内容流运营、推荐位、Banner）   |
| 03  | [03-services.md](./03-services.md)   | `/services`  | 服务（海购星 SaaS、商品、服务包）    |
| 04  | [04-ai-brain.md](./04-ai-brain.md)   | `/ai`        | AI 大脑（智能体、Todo 编排、知识库） |
| 05  | [05-profile.md](./05-profile.md)     | `/profile`   | 我的（用户管理、KYC、资料）          |

### 1.3 业务模块（法税/内容/AI 业务线）

| #   | 文件                                           | 对应 H5 路由                  | 模块名                          |
| --- | ---------------------------------------------- | ----------------------------- | ------------------------------- |
| 06  | [06-tax-calculator.md](./06-tax-calculator.md) | `/tax-calculator`             | 税务计算（税率库、税务规则）    |
| 07  | [07-legal-hub.md](./07-legal-hub.md)           | `/legal-hub`                  | 法务中台（合规法规、合同模板）  |
| 08  | [08-video-center.md](./08-video-center.md)     | `/video-center`、`/video/:id` | 视频中心（剧集、视频、评论）    |
| 09  | [09-media-center.md](./09-media-center.md)     | `/media-center`               | 自媒体中心（文章、平台数据）    |
| 10  | [10-ai-chat.md](./10-ai-chat.md)               | `/ai-chat/:agentId`           | AI 对话（智能体配置、对话日志） |

### 1.4 业务模块（公司/支付/银行/DLC/文档）

| #   | 文件                                               | 对应 H5 路由        | 模块名                           |
| --- | -------------------------------------------------- | ------------------- | -------------------------------- |
| 11  | [11-company-register.md](./11-company-register.md) | `/company-register` | 公司注册（SPV 申请、订单、审批） |
| 12  | [12-payment-console.md](./12-payment-console.md)   | `/payment-console`  | 全球收款（支付通道、交易、汇率） |
| 13  | [13-bank-account.md](./13-bank-account.md)         | `/bank-account`     | 银行开户（账户、KYC 审核）       |
| 14  | [14-dlc-level.md](./14-dlc-level.md)               | `/dlc-level`        | DLC 等级（会员等级、DVC 规则）   |
| 15  | [15-documents.md](./15-documents.md)               | `/documents`        | 文档中心（模板、归档）           |

### 1.5 系统与高级（设置/通知/身份/名片）

| #   | 文件                                               | 对应 H5 路由        | 模块名                           |
| --- | -------------------------------------------------- | ------------------- | -------------------------------- |
| 16  | [16-settings.md](./16-settings.md)                 | `/settings`         | 系统设置（系统配置、App 版本）   |
| 17  | [17-notifications.md](./17-notifications.md)       | `/notifications`    | 消息通知（推送、模板、消息队列） |
| 18  | [18-did-identity.md](./18-did-identity.md)         | `/did-identity`     | DID 身份（链上身份、凭证）       |
| 19  | [19-ai-business-card.md](./19-ai-business-card.md) | `/ai-business-card` | AI 电子名片（模板、使用统计）    |

### 1.6 运营支撑

| 主题                | 归属文件                                     |
| ------------------- | -------------------------------------------- |
| RBAC 角色与权限矩阵 | [00-foundation.md §3](./00-foundation.md)    |
| 审计日志            | [00-foundation.md §4](./00-foundation.md)    |
| 系统通知            | [17-notifications.md](./17-notifications.md) |
| i18n 多语言         | [00-foundation.md §5](./00-foundation.md)    |
| 数据库设计原则      | [00-foundation.md §6](./00-foundation.md)    |
| 通用 API 规范       | [00-foundation.md §7](./00-foundation.md)    |
| 通用 UI 规范        | [00-foundation.md §8](./00-foundation.md)    |

---

## 2. 设计原则

1. **H5 字段沿用**：所有 Prisma 模型的字段定义必须**完全对齐** H5 端 `apps/h5-app/src/types/index.ts` 与 `apps/h5-app/src/lib/mockData.ts` 中的 TS 类型。H5 调什么接口，后端就返回什么字段。
2. **状态机优先**：每个有状态流转的实体（订单、公司、用户、KYC 等）必须有状态机表，状态值与 H5 端保持一致。
3. **写操作全审计**：所有写接口必须记录到 `AuditLog`，包含 `oldValues` / `newValues`。
4. **i18n 内置**：所有用户可见文案必须以 `key` 形式存在字典中，**不硬编码**。支持中/英/日/韩 4 语言。
5. **权限到操作点**：每个 API 标注「读/写/审核/导出/批量」权限点，RBAC 控制。
6. **乐观锁 + 软删**：核心实体使用 `version` 乐观锁、`deletedAt` 软删。

---

## 3. 角色清单（RBAC）

| 角色       | 标识         | 描述                         | 默认可见菜单                                                 |
| ---------- | ------------ | ---------------------------- | ------------------------------------------------------------ |
| 超级管理员 | `superadmin` | 全部权限                     | 全部                                                         |
| 运营       | `operator`   | 内容、推荐、服务、媒体、视频 | 仪表盘、发现、服务、AI 大脑、视频、媒体、AI 对话、自媒体中心 |
| 客服       | `cs`         | 用户、订单、KYC、消息        | 仪表盘、用户、消息通知、公司订单                             |
| 财务       | `finance`    | 支付、收款、税务、对账       | 仪表盘、全球收款、税务计算、银行开户                         |
| 风控       | `risk`       | 合规、审计、DID              | 仪表盘、DID 身份、法务中台、审计日志                         |
| 审计       | `auditor`    | 只读 + 导出                  | 全部（只读）                                                 |

详细权限点见 [00-foundation.md §3](./00-foundation.md)。

---

## 4. 通用约定

### 4.1 命名

- **表/模型**：PascalCase 单数（`User`、`CompanyOrder`）
- **字段**：camelCase（`userId`、`createdAt`）
- **API 路径**：`/api/admin/{module}/{action}`（如 `/api/admin/companies/approve`）
- **状态枚举**：全大写下划线（`PENDING`、`IN_REVIEW`），与 H5 TS 字面量一一对应

### 4.2 通用字段（所有表）

| 字段        | 类型                          | 说明                  |
| ----------- | ----------------------------- | --------------------- |
| `id`        | `String @id @default(uuid())` | 主键                  |
| `createdAt` | `DateTime @default(now())`    | 创建时间              |
| `updatedAt` | `DateTime @updatedAt`         | 更新时间              |
| `createdBy` | `String?`                     | 创建人（adminUserId） |
| `updatedBy` | `String?`                     | 最后修改人            |
| `version`   | `Int @default(0)`             | 乐观锁                |
| `deletedAt` | `DateTime?`                   | 软删标记              |

### 4.3 API 响应格式

```ts
{
  "success": true,
  "code": 200,
  "message": "ok",
  "data": { ... } | [ ... ] | { "items": [...], "total": 123, "page": 1, "pageSize": 20 },
  "timestamp": "2026-06-06T03:55:11.000Z"
}
```

错误：

```ts
{ "success": false, "code": 400, "message": "参数错误", "errors": [...], "timestamp": "..." }
```

### 4.4 分页

- Query: `?page=1&pageSize=20&keyword=...&status=...&sortBy=createdAt&sortOrder=desc`
- 默认 `page=1, pageSize=20, pageSizeMax=100`

### 4.5 错误码

| 范围 | 含义                   |
| ---- | ---------------------- |
| 200  | 成功                   |
| 400  | 参数错误               |
| 401  | 未登录                 |
| 403  | 无权限                 |
| 404  | 资源不存在             |
| 409  | 状态冲突（如重复提交） |
| 500  | 服务器内部错误         |

---

## 5. 与 H5 端的对接

后台只是「配置 + 审核」端，**所有用户行为**仍在 H5 端发起。后台：

- 配置：写库（税率、DLC 等级、AI 知识库等）
- 审核：状态机推进
- 查询：H5 端通过 `/api/h5/*` 调用同一后端，复用相同数据
- 通知：通过 WebSocket / 推送推送到 H5

完整 API 命名空间分配：
| 前缀 | 调用方 | 说明 |
|---|---|---|
| `/api/admin/*` | 后台 admin-web | 后台专用，需 admin JWT + RBAC |
| `/api/h5/*` | H5 端 | 用户端，需 user JWT |
| `/api/public/*` | 公开 | 登录、注册、验证码 |

---

## 6. 实施依赖图与风险矩阵（Q5 修复）

> **为什么需要这章**：21 篇 PRD 涉及 4 类团队（后端 / 前端 / 智能合约 / AI 引擎），**没有依赖图 = 排期瞎拍**。本节是 PM 排期必看。

### 6.1 实施依赖图（按层依赖）

```
Layer 0 基础设施（必先做，所有模块依赖）
├── 00-foundation §11 KMS 信封加密（P0 阻塞，5 模块 credentials 字段落库无意义）
├── 00-foundation §3 RBAC 权限点定义 + §3.5 资源级权限叠加
├── 00-foundation §7.5 退款约定（refundedAmount / Transaction 模式）
└── 00-foundation §4.3 业务状态日志统一模式（<Entity>StatusLog 模板）

Layer 1 数据模型与基础 API
├── 05-profile (User/AdminUser + KYC) ← Layer 0
├── 14-dlc-level (DlcLevel + DvcTransaction) ← 05
├── 12-payment-console (Transaction) ← 05
└── 16-settings (SystemConfig + Menu) ← 00

Layer 2 业务实体
├── 11-company-register (CompanyOrder + CompanyStatusLog) ← 12
├── 13-bank-account (BankAccountOrder + BankOrderStatusLog) ← 12
├── 03-services (ServiceOrder + ServiceOrderStatusLog + past_due) ← 12
├── 08-video-center (Video + Comment) ← 05
├── 09-media-center (Post + Platform) ← 05
└── 19-ai-business-card (AiCard + AiCardStatusLog) ← 12

Layer 3 引擎与 AI
├── 04-ai-brain (AiAgent + Knowledge + Todo) ← 16
├── 10-ai-chat (AiChatSession + takeover) ← 04
├── 06-tax-calculator (TaxRule + TaxRate) ← 16
└── 07-legal-hub (LegalDoc + ContractTemplate) ← 16

Layer 4 内容运营
├── 02-discover (Banner + Recommend) ← 08 + 09
├── 15-documents (Document + accessLevel) ← §3.5
├── 17-notifications (Template + Campaign + Push) ← 00
└── 01-dashboard (聚合 KPI) ← Layer 2/3 全部

Layer 5 高级功能（可后置）
└── 18-did-identity (DidIdentity + VerifiableCredential + AnchorRegistry) ← 16 + KMS
    ├── 18 §11.1-11.5 链选型 / 私钥 / gas / 合约 / 流程（NestJS 部分）
    └── 18 §11.6 合约升级策略（独立 Solidity 工程，单独排期）
```

### 6.2 风险矩阵

| 模块                                   | 工作量预估  | 风险等级        | 关键风险点                                                | 缓解措施                                     |
| -------------------------------------- | ----------- | --------------- | --------------------------------------------------------- | -------------------------------------------- |
| **00-foundation §11 KMS**              | 5 人天      | 🔴 **CRITICAL** | 5 模块 credentials 字段落库无意义；轮转流程错误会丢失凭证 | 优先实现，先于 12/13/15/17/18 开发           |
| **00-foundation §3.5 资源级权限**      | 2 人天      | 🟡 MEDIUM       | 跨 RBAC + accessLevel + userLevel 三层                    | 必须先写单元测试覆盖每档                     |
| **00-foundation §7.5 退款**            | 3 人天      | 🔴 **CRITICAL** | 并发部分退款的乐观锁；跨 3 模块状态一致性                 | 优先实现，财务相关                           |
| **12-payment-console**                 | 8 人天      | 🔴 **CRITICAL** | 真实支付通道对接（Stripe/Alipay）；汇率定时 job           | 财务团队 review                              |
| **18-did-identity §11.6 合约升级**     | 10 人天     | 🔴 **CRITICAL** | UUPS Proxy + Timelock + 第三方审计 + 跨链锚定             | **独立 Solidity 工程**，需 Solidity 工程师   |
| **18-did-identity §3.1.1 method 范围** | 1 人天      | 🟢 LOW          | MVP 仅 web/ethr，写明 v2 计划                             | —                                            |
| **14-dlc-level §4.5 紧急回滚**         | 4 人天      | 🟡 MEDIUM       | 误调阈值回滚流程复杂；7 天 1 次限制                       | 必须配"dry-run"模式                          |
| **13-bank-account 状态日志迁移**       | 1 人天      | 🟡 MEDIUM       | 已有 JSON 数据迁移到独立表                                | 写迁移脚本，保留旧字段 1 个版本              |
| **i18n 字典结构对齐**                  | 3 人天      | 🟡 MEDIUM       | 21 模块 namespace 风格统一（§5.5）                        | CI 检查 zh-CN / en-US / ja-JP / ko-KR 同结构 |
| **11/12/13 跨模块退款路由**            | 3 人天      | 🟡 MEDIUM       | 退款最终落 Transaction + Refund，不在 ServiceOrder        | 财务/产品双签字                              |
| **01-dashboard 聚合**                  | 4 人天      | 🟢 LOW          | 需 Layer 2/3 全部完成才能聚合                             | 放最后做                                     |
| **其他模块**                           | 2-5 人天/个 | 🟢 LOW          | 单一 CRUD + 状态机                                        | 标准化模板                                   |

### 6.3 推荐 Sprint 排期（4 团队 6 周）

| Sprint         | 后端组                                                                           | 前端组                            | 合约组                             | AI 引擎组                      |
| -------------- | -------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------- | ------------------------------ |
| **S1（W1-2）** | 00-foundation §11 KMS、§3 RBAC、§4.3 日志、§7.5 退款 + 05-profile + 16-settings  | 登录/布局/RBAC/审计/i18n 框架     | （等待）                           | （等待）                       |
| **S2（W3）**   | 12-payment-console（Transaction + Refund）+ 14-dlc-level（含 §4.5 回滚）         | 14-dlc-level + 12-payment-console | 18-did-identity §11.6 合约工程启动 | 04-ai-brain 智能体基础         |
| **S3（W4）**   | 11-company-register + 13-bank-account（含状态日志迁移）+ 03-services（past_due） | 11 + 13 + 03                      | 18 §11.6 合约开发 + 测试           | 10-ai-chat + 06-tax + 07-legal |
| **S4（W5）**   | 08-video + 09-media + 19-ai-card + 15-documents（accessLevel）                   | 08 + 09 + 19 + 15                 | 18 §11.6 审计 + 部署               | 02-discover（推荐位/Banner）   |
| **S5（W6）**   | 17-notifications + 18-did-identity 业务代码                                      | 17 + 18                           | 18 集成测试                        | 01-dashboard 聚合              |
| **S6（W7+）**  | 联调 + 压测 + UAT                                                                | 联调 + UAT                        | 主网部署                           | 联调                           |

### 6.4 跨文件一致性检查清单

> **每个模块完成时**，owner 必勾 4 项：

- [ ] 状态枚举值是否在 `00-foundation §8.3.1` 扩展色彩表里有映射？
- [ ] 状态变更是否走 `00-foundation §4.3` 独立日志表模式（不是 JSON 内嵌）？
- [ ] `*UserId` 字段是否按 `00-foundation §12` 加 `@relation("Name")` + `onDelete: Restrict`？
- [ ] i18n namespace 是否在 `00-foundation §5.5.1` 速查表里？

未勾选 = 不可合并。

---

## 7. 文档版本

| 版本 | 日期       | 变更                                                                                                                                                                                                       |
| ---- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v0.1 | 2026-06-06 | 初始草案，21 篇文档框架完成                                                                                                                                                                                |
| v0.2 | 2026-06-06 | 修复 RBAC 命名矛盾（Q3）、DLC 跳级（Q4）、KMS（Q7）、DID 锚定（Q9）、User/AdminUser（Q6）、\*UserId 规范（Q额外）                                                                                          |
| v0.3 | 2026-06-06 | 修复 DidIdentity FK（Q11.6）、AnchorRegistry 升级（Q11.6）、KMS 成本监控（Q11.6）                                                                                                                          |
| v0.4 | 2026-06-06 | **Round 3 Reader Testing 修复**：\*UserId 落地指南、状态日志统一、退款约定、资源权限叠加、DID method MVP、状态色彩扩展、i18n 命名约定、DLC 紧急回滚、ServiceOrder past_due、状态机一致性、依赖图与风险矩阵 |
