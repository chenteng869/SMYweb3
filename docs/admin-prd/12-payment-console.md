# 12 · 全球收款（支付通道 · 交易 · 对账）

> **对应 H5**：`/payment-console`（全球收款台）
> **核心目标**：管理多支付通道（Stripe/PayPal/币安支付/USDT-TRC20/银行汇款）、交易、退款、对账。

---

## 1. 业务目标

- 多通道接入与配置
- 交易全链路追踪
- 退款管理
- 每日对账
- 汇率管理

## 2. 用户故事

| # | 故事 |
|---|---|
| US-1 | 作为超管，我配置 Stripe 通道（API Key、Webhook） |
| US-2 | 作为财务，我查今日交易总额、各通道占比 |
| US-3 | 作为财务，我处理退款申请 |
| US-4 | 作为运营，我做每日对账 |

## 3. 字段定义

### 3.1 PaymentChannel（支付通道）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| name | String(60) | ✓ | 显示名（Stripe 信用卡） |
| code | String(40) | ✓ | 唯一编码（stripe / paypal / binance / usdt_trc20 / wire） |
| type | enum | ✓ | `card` / `wallet` / `crypto` / `bank` / `local` |
| enabled | Boolean | | 是否启用 |
| feePercent | Decimal | | 通道费率 % |
| feeFixed | Decimal | | 固定费 |
| minAmount | Decimal | | 最小额 |
| maxAmount | Decimal | | 最大额 |
| supportedCurrencies | String | | JSON 货币数组 |
| supportedCountries | String | | JSON 国家数组 |
| credentials | String | | JSON 加密：API Key、Secret |
| webhookUrl | String | | |
| config | String | | JSON：附加配置 |
| iconUrl | String | | |
| sortWeight | Int | | |
| createdAt, updatedAt, deletedAt, version | | | 通用 |

### 3.2 Transaction（交易）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| txNo | String(40) | ✓ | 业务流水号 |
| userId | String | | |
| userName | String | | |
| orderType | String(40) | | `service` / `company` / `bank` / `subscription` / `topup` |
| orderId | String | | 关联订单 |
| channelId | String | ✓ | |
| channelCode | String | | 冗余 |
| amount | Decimal | ✓ | 用户支付金额 |
| currency | String(8) | ✓ | |
| usdEquivalent | Decimal | | 折算 USD |
| fee | Decimal | | 通道费 |
| netAmount | Decimal | | 实际到账 |
| status | enum | ✓ | `pending` / `paid` / `failed` / `refunded` / `partial_refunded` |
| externalTxId | String | | 通道流水号 |
| paidAt | DateTime | | |
| failedReason | String | | |
| metadata | String | | JSON 上下文 |
| ipAddress | String | | |
| userAgent | String | | |
| createdAt, updatedAt | | | 通用 |

### 3.3 Refund（退款）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| refundNo | String | |
| transactionId | String | |
| amount | Decimal | |
| currency | String | |
| reason | String | |
| status | enum | `pending` / `processing` / `completed` / `failed` |
| externalRefundId | String | |
| requestedBy | String | userId |
| approvedBy | String | adminUserId |
| processedAt | DateTime | |
| failedReason | String | |
| createdAt, updatedAt | | |

### 3.4 ExchangeRate（汇率）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| fromCurrency | String | |
| toCurrency | String | |
| rate | Decimal | |
| effectiveAt | DateTime | |
| source | String | 数据源（manual / api） |
| createdBy | String | |
| createdAt, updatedAt, deletedAt | | |

## 4. 状态机

**Transaction**：
```
pending → paid
        ↘ failed
paid → refunded
     ↔ partial_refunded
```

**Refund**：
```
pending → processing → completed
                     ↘ failed
```

## 5. Prisma 模型

```prisma
model PaymentChannel {
  id                  String   @id @default(uuid())
  name                String
  code                String   @unique
  type                String
  enabled             Boolean  @default(true)
  feePercent          Decimal  @default(0)
  feeFixed            Decimal  @default(0)
  minAmount           Decimal  @default(0)
  maxAmount           Decimal  @default(999999)
  supportedCurrencies String?  // JSON
  supportedCountries  String?  // JSON
  credentials         String?  // 加密
  webhookUrl          String?
  config              String?  // JSON
  iconUrl             String?
  sortWeight          Int      @default(0)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  deletedAt           DateTime?
  version             Int      @default(0)

  transactions Transaction[]
}

model Transaction {
  id              String   @id @default(uuid())
  txNo            String   @unique
  userId          String?
  userName        String?
  orderType       String?
  orderId         String?
  channelId       String
  channel         PaymentChannel @relation(fields: [channelId], references: [id])
  channelCode     String
  amount          Decimal
  currency        String
  usdEquivalent   Decimal?
  fee             Decimal  @default(0)
  netAmount       Decimal?
  status          String   @default("pending")
  externalTxId    String?
  paidAt          DateTime?
  failedReason    String?
  metadata        String?  // JSON
  ipAddress       String?
  userAgent       String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  refunds Refund[]

  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@index([orderType, orderId])
}

model Refund {
  id                String   @id @default(uuid())
  refundNo          String   @unique
  transactionId     String
  transaction       Transaction @relation(fields: [transactionId], references: [id])
  amount            Decimal
  currency          String
  reason            String
  status            String   @default("pending")
  externalRefundId  String?
  requestedBy       String
  approvedBy        String?
  processedAt       DateTime?
  failedReason      String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([status, createdAt])
}

model ExchangeRate {
  id           String   @id @default(uuid())
  fromCurrency String
  toCurrency   String
  rate         Decimal
  effectiveAt  DateTime @default(now())
  source       String   @default("manual")
  createdBy    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?

  @@index([fromCurrency, toCurrency, effectiveAt])
}
```

## 6. API 接口

### 6.1 通道
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/payments/channels` | `payments:read` | 列表 |
| GET | `/api/admin/payments/channels/:id` | | 详情（**不返回 credentials**） |
| POST | `/api/admin/payments/channels` | `payments:channels:write` | 新增 |
| PUT | `/api/admin/payments/channels/:id` | `payments:channels:write` | 编辑 |
| POST | `/api/admin/payments/channels/:id/enable` | `payments:channels:write` | 启用 |
| POST | `/api/admin/payments/channels/:id/disable` | `payments:channels:write` | 停用 |
| POST | `/api/admin/payments/channels/:id/test` | `payments:channels:write` | 测试连通 |
| DELETE | `/api/admin/payments/channels/:id` | `payments:channels:write` | 软删 |

### 6.2 交易
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/payments/transactions` | `payments:read` | 列表（userId/channel/status/时间/金额） |
| GET | `/api/admin/payments/transactions/:id` | | 详情 |
| POST | `/api/admin/payments/transactions/:id/refund` | `payments:refund` | 退款（金额可选） |
| GET | `/api/admin/payments/transactions/export` | `payments:export` | 导出 |

### 6.3 退款
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/payments/refunds` | `payments:read` | 列表 |
| GET | `/api/admin/payments/refunds/:id` | | 详情 |
| POST | `/api/admin/payments/refunds/:id/approve` | `payments:refund` | 审批通过 |
| POST | `/api/admin/payments/refunds/:id/reject` | `payments:refund` | 驳回 |
| POST | `/api/admin/payments/refunds/batch/approve` | `payments:refund` | 批量 |

### 6.4 汇率
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/payments/exchange-rates` | `payments:read` | 列表 |
| POST | `/api/admin/payments/exchange-rates` | `payments:channels:write` | 新增 |
| POST | `/api/admin/payments/exchange-rates/refresh` | `payments:channels:write` | 从外部 API 刷新 |

### 6.5 对账
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/payments/reconciliation/daily` | `payments:read` | 每日对账 |
| GET | `/api/admin/payments/reconciliation/monthly` | `payments:read` | 每月对账 |
| GET | `/api/admin/payments/reconciliation/export` | `payments:export` | 对账单 |

### 6.6 H5 端
| Method | Path | 说明 |
|---|---|
| GET | `/api/h5/payments/channels` | 可用通道 |
| POST | `/api/h5/payments/create` | 创建支付 |
| GET | `/api/h5/payments/:txNo` | 查询支付状态 |
| POST | `/api/h5/payments/:txNo/refund` | 用户申请退款 |

## 7. UI 组件

### 7.1 通道列表
- 卡片视图：图标 / 名称 / 类型 / 启用 / 费率 / 操作
- 凭证编辑：API Key 输入（密码框）

### 7.2 交易列表
- 筛选：通道 / 状态 / 时间 / 金额 / 用户
- 列：流水号 / 用户 / 通道 / 金额 / 状态 / 通道流水 / 时间
- 导出 CSV

### 7.3 退款审批
- 列表：金额 / 申请人 / 原因 / 状态
- 详情：原交易 + 用户信息 + 审批按钮

### 7.4 通道测试
- 弹窗：输入测试金额 → 模拟支付 → 显示结果

## 8. 权限

| 操作 | operator | cs | finance | superadmin |
|---|---|---|---|---|
| 查看 | ✓ | ✓ | ✓ | ✓ |
| 通道配置 | ✗ | ✗ | ✗ | ✓ |
| 退款审批 | ✗ | ✗ | ✓ | ✓ |
| 对账 | ✗ | ✗ | ✓ | ✓ |
| 导出 | ✗ | ✗ | ✓ | ✓ |

## 9. i18n

```json
{
  "payments": {
    "title": "全球收款",
    "channelType": {
      "card": "银行卡",
      "wallet": "电子钱包",
      "crypto": "加密货币",
      "bank": "银行汇款",
      "local": "本地支付"
    },
    "status": {
      "pending": "待支付",
      "paid": "已支付",
      "failed": "失败",
      "refunded": "已退款",
      "partial_refunded": "部分退款"
    }
  }
}
```

## 10. 验收用例

| # | 用例 | 期望 |
|---|---|---|
| 1 | 配置 Stripe 通道 | API Key 加密存储 |
| 2 | 通道测试连通 | 显示 200 OK |
| 3 | H5 支付 100 USD → Stripe | 交易记录创建 |
| 4 | Stripe Webhook 回调 paid | status → paid |
| 5 | 财务审批退款 50 USD | 通道返回成功 |
| 6 | 部分退款 | status → partial_refunded |
| 7 | 每日对账差异 > 1% | 报警 |
| 8 | 汇率刷新 | 全部通道按新汇率计算 |
| 9 | 停用某通道 | H5 端不可见该通道 |
| 10 | 凭证字段不出现在列表响应 | credentials 字段被屏蔽 |
