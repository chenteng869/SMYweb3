# 13 · 银行开户（多银行 · 申请 · KYC · 审核）

> **对应 H5**：`/bank-account`（银行开户）
> **核心目标**：管理多银行开户申请（汇丰/渣打/花旗/数字银行 Wise 等）、KYC 审核、进度跟踪。

---

## 1. 业务目标

- 24 国 100+ 银行开户申请管理
- 集成合作银行的 API（部分）
- 状态机：草稿→提交→KYC→审批→开户中→完成
- KYC 资料管理

## 2. 用户故事

| #    | 故事                                  |
| ---- | ------------------------------------- |
| US-1 | 作为客服，我查某用户的开户进度        |
| US-2 | 作为风控，我审核 KYC 资料             |
| US-3 | 作为超管，我上传开户结果（账户/卡号） |
| US-4 | 作为运营，我看本月开户转化漏斗        |

## 3. 字段定义

### 3.1 BankProduct（银行产品）

| 字段                                     | 类型        | 必填 | 说明                                             |
| ---------------------------------------- | ----------- | ---- | ------------------------------------------------ |
| id                                       | String      | ✓    |                                                  |
| name                                     | String(120) | ✓    | 如「汇丰商业账户 1」                             |
| bankName                                 | String(80)  | ✓    | 银行名                                           |
| country                                  | String(60)  | ✓    |                                                  |
| countryCode                              | String(8)   | ✓    |                                                  |
| type                                     | enum        | ✓    | `personal` / `business` / `merchant` / `digital` |
| minDeposit                               | Decimal     |      | 最低存款                                         |
| monthlyFee                               | Decimal     |      | 月费                                             |
| setupFee                                 | Decimal     |      | 开户费                                           |
| supportedCurrencies                      | String      |      | JSON                                             |
| features                                 | String      |      | JSON 功能点                                      |
| processingDays                           | Int         |      | 预计处理天数                                     |
| documents                                | String      |      | JSON 所需材料                                    |
| enabled                                  | Boolean     |      |                                                  |
| iconUrl                                  | String      |      |                                                  |
| createdAt, updatedAt, deletedAt, version |             |      | 通用                                             |

### 3.2 BankAccountOrder（开户订单）

| 字段                                                | 类型       | 必填 | 说明                                                                                                                                                                                      |
| --------------------------------------------------- | ---------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                                                  | String     | ✓    |                                                                                                                                                                                           |
| orderNo                                             | String(32) | ✓    |                                                                                                                                                                                           |
| userId                                              | String     |      |                                                                                                                                                                                           |
| userName                                            | String     |      |                                                                                                                                                                                           |
| productId                                           | String     |      |                                                                                                                                                                                           |
| productName                                         | String     |      | 冗余                                                                                                                                                                                      |
| bankName                                            | String     |      | 冗余                                                                                                                                                                                      |
| country                                             | String     |      |                                                                                                                                                                                           |
| accountType                                         | String     |      |                                                                                                                                                                                           |
| status                                              | enum       | ✓    | `draft` / `submitted` / `kyc_pending` / `kyc_approved` / `kyc_rejected` / `bank_reviewing` / `bank_approved` / `bank_rejected` / `account_opening` / `completed` / `failed` / `cancelled` |
| kycDocuments                                        | String     |      | JSON                                                                                                                                                                                      |
| bankDocuments                                       | String     |      | JSON 银行额外要求                                                                                                                                                                         |
| assignedTo                                          | String     |      | adminUserId                                                                                                                                                                               |
| submittedAt                                         | DateTime   |      |                                                                                                                                                                                           |
| completedAt                                         | DateTime   |      |                                                                                                                                                                                           |
| bankAccount                                         | String     |      | 开户结果账号                                                                                                                                                                              |
| bankSwift                                           | String     |      |                                                                                                                                                                                           |
| bankAddress                                         | String     |      |                                                                                                                                                                                           |
| cardNumber                                          | String     |      | 信用卡号                                                                                                                                                                                  |
| cardExpiry                                          | String     |      |                                                                                                                                                                                           |
| metadata                                            | String     |      | JSON 业务信息                                                                                                                                                                             |
| serviceId                                           | String     |      | 关联服务商品                                                                                                                                                                              |
| amount                                              | Decimal    |      | 服务费                                                                                                                                                                                    |
| currency                                            | String     |      |                                                                                                                                                                                           |
| statusLogs                                          | String     |      | JSON 内嵌时间线                                                                                                                                                                           |
| createdBy, createdAt, updatedAt, deletedAt, version |            |      | 通用                                                                                                                                                                                      |

## 4. 状态机

```
draft → submitted → kyc_pending → kyc_approved → bank_reviewing → bank_approved → account_opening → completed
                                                          ↘ bank_rejected
              ↘ kyc_rejected (回 submitted 重新补料)
              ↘ cancelled
```

## 5. Prisma 模型

```prisma
model BankProduct {
  id                  String   @id @default(uuid())
  name                String
  bankName            String
  country             String
  countryCode         String
  type                String
  minDeposit          Decimal  @default(0)
  monthlyFee          Decimal  @default(0)
  setupFee            Decimal  @default(0)
  supportedCurrencies String?  // JSON
  features            String?  // JSON
  processingDays      Int      @default(7)
  documents           String?  // JSON
  enabled             Boolean  @default(true)
  iconUrl             String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  deletedAt           DateTime?
  version             Int      @default(0)

  orders BankAccountOrder[]

  @@index([countryCode, type, enabled])
}

model BankAccountOrder {
  id              String   @id @default(uuid())
  orderNo         String   @unique
  userId          String
  userName        String?
  productId       String
  product         BankProduct @relation(fields: [productId], references: [id])
  productName     String
  bankName        String
  country         String
  accountType     String
  status          String   @default("draft")
  kycDocuments    String?  // JSON
  bankDocuments   String?  // JSON
  assignedTo      String?
  submittedAt     DateTime?
  completedAt     DateTime?
  bankAccount     String?
  bankSwift       String?
  bankAddress     String?
  cardNumber      String?
  cardExpiry      String?
  metadata        String?  // JSON
  serviceId       String?
  amount          Decimal
  currency        String
  createdBy       String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?
  version         Int      @default(0)

  statusLogs      BankOrderStatusLog[]  // 状态变更历史（按 00-foundation §4.3 独立表模式）

  @@index([userId, createdAt])
  @@index([status, createdAt])
}

model BankOrderStatusLog {
  id           String   @id @default(uuid())
  orderId      String
  order        BankAccountOrder @relation(fields: [orderId], references: [id], onDelete: Restrict)
  fromStatus   String
  toStatus     String
  note         String?
  operatorId   String?
  operator     AdminUser? @relation("BankOrderStatusLogOperator", fields: [operatorId], references: [id], onDelete: Restrict)
  operatorRole String?
  createdAt    DateTime @default(now())

  @@index([orderId, createdAt])
  @@index([operatorId])
  @@index([toStatus, createdAt])
}
```

## 6. API 接口

### 6.1 银行产品

| Method | Path                                    | 权限          | 说明 |
| ------ | --------------------------------------- | ------------- | ---- |
| GET    | `/api/admin/banks/products`             | `banks:read`  | 列表 |
| GET    | `/api/admin/banks/products/:id`         |               | 详情 |
| POST   | `/api/admin/banks/products`             | `banks:write` | 新增 |
| PUT    | `/api/admin/banks/products/:id`         | `banks:write` | 编辑 |
| POST   | `/api/admin/banks/products/:id/enable`  | `banks:write` | 启用 |
| POST   | `/api/admin/banks/products/:id/disable` | `banks:write` | 停用 |
| DELETE | `/api/admin/banks/products/:id`         | `banks:write` | 软删 |

### 6.2 开户订单

| Method | Path                                      | 权限            | 说明                                    |
| ------ | ----------------------------------------- | --------------- | --------------------------------------- |
| GET    | `/api/admin/banks/orders`                 | `banks:read`    | 列表（userId/bank/status/keyword/时间） |
| GET    | `/api/admin/banks/orders/:id`             |                 | 详情                                    |
| PUT    | `/api/admin/banks/orders/:id`             | `banks:write`   | 编辑（材料、备注）                      |
| POST   | `/api/admin/banks/orders/:id/assign`      | `banks:write`   | 指派                                    |
| POST   | `/api/admin/banks/orders/:id/kyc-approve` | `banks:approve` | KYC 通过                                |
| POST   | `/api/admin/banks/orders/:id/kyc-reject`  | `banks:approve` | KYC 驳回（reason 必填）                 |
| POST   | `/api/admin/banks/orders/:id/bank-submit` | `banks:write`   | 提交银行                                |
| POST   | `/api/admin/banks/orders/:id/bank-result` | `banks:write`   | 上传银行结果（账号/SWIFT）              |
| POST   | `/api/admin/banks/orders/:id/complete`    | `banks:write`   | 标记完成                                |
| POST   | `/api/admin/banks/orders/:id/cancel`      | `banks:write`   | 取消                                    |
| GET    | `/api/admin/banks/orders/export`          | `banks:export`  | 导出                                    |

### 6.3 统计

| Method | Path                                | 权限         | 说明     |
| ------ | ----------------------------------- | ------------ | -------- |
| GET    | `/api/admin/banks/stats/overview`   | `banks:read` | 总览     |
| GET    | `/api/admin/banks/stats/conversion` | `banks:read` | 转化漏斗 |
| GET    | `/api/admin/banks/stats/banks`      | `banks:read` | 银行分布 |

### 6.4 H5 端

| Method | Path                         | 说明         |
| ------ | ---------------------------- | ------------ |
| GET    | `/api/h5/banks/products`     | 银行产品列表 |
| GET    | `/api/h5/banks/products/:id` | 详情         |
| POST   | `/api/h5/banks/orders`       | 提交申请     |
| GET    | `/api/h5/banks/orders`       | 我的订单     |
| GET    | `/api/h5/banks/orders/:id`   | 详情         |

## 7. UI 组件

### 7.1 银行产品列表

- 表格：银行 / 国家 / 类型 / 最低存款 / 月费 / 启用 / 操作
- 行操作：编辑 / 启停

### 7.2 订单列表

- 筛选：用户 / 银行 / 状态 / 时间
- 列：订单号 / 用户 / 银行 / 类型 / 状态 / 处理人 / 时间 / 操作
- 看板视图：按状态分列

### 7.3 订单详情

- 头部：状态 + 进度条（6 步）
- 左侧：用户信息 / 申请信息 / 银行信息
- 右侧：状态时间线 + 操作日志
- 底部：KYC 资料查看 + 银行结果上传

### 7.4 KYC 审核

- 左侧：材料文件
- 右侧：用户信息 + 审核操作
- 批量审核（按用户）

## 8. 权限

| 操作         | operator | cs  | finance | risk | superadmin |
| ------------ | -------- | --- | ------- | ---- | ---------- |
| 查看         | ✓        | ✓   | ✓       | ✓    | ✓          |
| 编辑产品     | ✗        | ✗   | ✗       | ✗    | ✓          |
| 订单编辑     | ✓        | ✓   | ✗       | ✗    | ✓          |
| KYC 审核     | ✗        | ✓   | ✗       | ✓    | ✓          |
| 上传银行结果 | ✗        | ✗   | ✗       | ✗    | ✓          |
| 导出         | ✓        | ✗   | ✓       | ✗    | ✓          |

## 9. i18n

```json
{
  "banks": {
    "title": "银行开户",
    "status": {
      "draft": "草稿",
      "submitted": "已提交",
      "kyc_pending": "KYC 待审",
      "kyc_approved": "KYC 已通过",
      "kyc_rejected": "KYC 已驳回",
      "bank_reviewing": "银行审核中",
      "bank_approved": "银行已通过",
      "bank_rejected": "银行已拒绝",
      "account_opening": "开户中",
      "completed": "已完成",
      "failed": "失败",
      "cancelled": "已取消"
    }
  }
}
```

## 10. 验收用例

| #   | 用例                 | 期望                              |
| --- | -------------------- | --------------------------------- |
| 1   | 配置 5 家银行产品    | 列表新增                          |
| 2   | H5 申请开户          | 后台列表                          |
| 3   | KYC 资料审核通过     | 状态 → kyc_approved               |
| 4   | 提交银行             | 状态 → bank_reviewing             |
| 5   | 银行返回账号         | 上传结果，状态 → bank_approved    |
| 6   | 开户完成             | 状态 → completed，写 bankAccount  |
| 7   | KYC 驳回             | 状态 → kyc_rejected，通知用户补料 |
| 8   | 月费自动扣           | 定时任务，扣款记录                |
| 9   | 看板：按状态分列拖拽 | 看板视图正常                      |
| 10  | 导出 100 条订单      | CSV 下载                          |
