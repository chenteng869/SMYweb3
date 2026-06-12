# 03 · 服务（Services / 海购星 SaaS）

> **对应 H5**：`/services`（服务总览）+ 首页 8 个快捷入口（AI注册、AI名片、DID、法务、收款、海购星、客服、税务）
> **核心目标**：管理 H5 端用户可见的所有「服务商品」——含 SaaS 订阅、一次性服务、增值包。

---

## 1. 业务目标

- H5 端服务页所有「可购买项」统一管理
- 支持「订阅制」和「一次性」两种计费
- 服务上下架 + 限流 + 定向 DLC 等级
- 订单数据回流

## 2. 用户故事

| #    | 故事                                                                      |
| ---- | ------------------------------------------------------------------------- |
| US-1 | 作为运营，我希望上架一个「萨摩亚 SPV 注册」服务（含价格、说明、所需材料） |
| US-2 | 作为超管，我希望把某服务限定为 DLC=4+ 才能购买                            |
| US-3 | 作为运营，我希望临时下架某服务                                            |
| US-4 | 作为客服，我希望查询「用户购买了哪些服务」                                |

## 3. 字段定义

### 3.1 Service（服务商品）

| 字段                                                | 类型        | 必填 | 说明                                                                                                  |
| --------------------------------------------------- | ----------- | ---- | ----------------------------------------------------------------------------------------------------- |
| id                                                  | String UUID | ✓    |                                                                                                       |
| code                                                | String(64)  | ✓    | 唯一编码（`spv_samoa`、`ai_card`）                                                                    |
| name                                                | String(120) | ✓    | 名称                                                                                                  |
| category                                            | enum        | ✓    | `company`（公司）/ `tax`（税务）/ `legal`（法务）/ `bank`（银行）/ `ai`（AI 工具）/ `service`（通用） |
| shortDesc                                           | String(200) |      | 一句话描述                                                                                            |
| longDesc                                            | Text        |      | 富文本详情                                                                                            |
| coverUrl                                            | String      |      | 封面图                                                                                                |
| iconUrl                                             | String      |      | 列表小图标                                                                                            |
| type                                                | enum        | ✓    | `one_time`（一次性） / `subscription`（订阅） / `freemium`（免费增值）                                |
| price                                               | Decimal     | ✓    | 单价                                                                                                  |
| currency                                            | String(8)   | ✓    | USD/CNY/USDT                                                                                          |
| originalPrice                                       | Decimal     |      | 原价（划线）                                                                                          |
| billingPeriod                                       | enum        |      | `monthly` / `yearly`（订阅制）                                                                        |
| features                                            | String      |      | JSON 数组：功能点                                                                                     |
| requirements                                        | String      |      | JSON：所需材料/前置条件                                                                               |
| minDlcLevel                                         | Int         |      | 最低 DLC 等级（0 = 全部）                                                                             |
| targetCountries                                     | String      |      | JSON 国家代码数组                                                                                     |
| dailyLimit                                          | Int         |      | 每日售卖上限（0 = 不限）                                                                              |
| totalLimit                                          | Int         |      | 总量上限（0 = 不限）                                                                                  |
| soldCount                                           | Int         |      | 已售数量                                                                                              |
| status                                              | enum        | ✓    | `draft` / `online` / `offline` / `archived`                                                           |
| sortWeight                                          | Int         |      | 排序                                                                                                  |
| createdBy, createdAt, updatedAt, deletedAt, version |             |      | 通用                                                                                                  |

### 3.2 ServiceOrder（订单）

| 字段                 | 类型     | 说明                                                                                                         |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| id                   | String   |                                                                                                              |
| serviceId            | String   |                                                                                                              |
| serviceName          | String   | 冗余                                                                                                         |
| userId               | String   |                                                                                                              |
| userName             | String   | 冗余                                                                                                         |
| amount               | Decimal  | 实付                                                                                                         |
| originalAmount       | Decimal  |                                                                                                              |
| discount             | Decimal  |                                                                                                              |
| currency             | String   |                                                                                                              |
| status               | enum     | `pending` / `paid` / `processing` / `completed` / `refunded` / `partial_refunded` / `past_due` / `cancelled` |
| paymentMethod        | String   |                                                                                                              |
| paymentTxId          | String   |                                                                                                              |
| metadata             | String   | JSON：表单填写内容                                                                                           |
| completedAt          | DateTime |                                                                                                              |
| assignedTo           | String   | 处理人（adminUserId）                                                                                        |
| createdAt, updatedAt |          |                                                                                                              |

## 4. 状态机

**服务状态**：

```
draft → online → offline → archived
```

**订单状态**（Q4 修复 — 新增 `past_due` 和 `partial_refunded`）：

```
pending → paid → processing → completed
                     ↘ past_due ─► paid (续费成功) | cancelled (续费失败)
        → cancelled (未支付)
paid → partial_refunded ↔ refunded  (多次部分退，详见 00-foundation §7.5)
```

**触发条件**：

- `paid → past_due`：定时 cron 检测 `subscription.nextBillingAt < now()` 且未收到新支付（Stripe webhook 失败/用户卡失效）
- `past_due → paid`：Stripe webhook `invoice.payment_succeeded`
- `past_due → cancelled`：3 次续费失败后自动取消
- `paid → partial_refunded`：退款流程落库（00-foundation §7.5）
- `partial_refunded ↔ refunded`：可多次部分退，累计到全额转 `refunded`

## 5. Prisma 模型

```prisma
model Service {
  id              String   @id @default(uuid())
  code            String   @unique
  name            String
  category        String
  shortDesc       String?
  longDesc        String?
  coverUrl        String?
  iconUrl         String?
  type            String   // one_time / subscription / freemium
  price           Decimal
  currency        String
  originalPrice   Decimal?
  billingPeriod   String?  // monthly / yearly
  features        String?  // JSON
  requirements    String?  // JSON
  minDlcLevel     Int      @default(0)
  targetCountries String?  // JSON
  dailyLimit      Int      @default(0)
  totalLimit      Int      @default(0)
  soldCount       Int      @default(0)
  status          String   @default("draft")
  sortWeight      Int      @default(0)
  createdBy       String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?
  version         Int      @default(0)
  orders          ServiceOrder[]

  @@index([status, sortWeight])
  @@index([category, status])
}

model ServiceOrder {
  id              String   @id @default(uuid())
  serviceId       String
  service         Service  @relation(fields: [serviceId], references: [id])
  serviceName     String
  userId          String
  userName        String
  amount          Decimal
  originalAmount  Decimal
  discount        Decimal  @default(0)
  currency        String
  status          String   @default("pending")
  paymentMethod   String?
  paymentTxId     String?
  metadata        String?  // JSON
  completedAt     DateTime?
  assignedTo      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
  @@index([status, createdAt])
}
```

## 6. API 接口

### 6.1 服务 CRUD

| Method | Path                              | 权限              | 说明                            |
| ------ | --------------------------------- | ----------------- | ------------------------------- |
| GET    | `/api/admin/services`             | `services:read`   | 列表（category/status/keyword） |
| GET    | `/api/admin/services/:id`         | `services:read`   | 详情                            |
| POST   | `/api/admin/services`             | `services:write`  | 创建                            |
| PUT    | `/api/admin/services/:id`         | `services:write`  | 编辑                            |
| DELETE | `/api/admin/services/:id`         | `services:write`  | 软删                            |
| POST   | `/api/admin/services/:id/online`  | `services:write`  | 上架                            |
| POST   | `/api/admin/services/:id/offline` | `services:write`  | 下架                            |
| POST   | `/api/admin/services/reorder`     | `services:write`  | 批量改权重                      |
| GET    | `/api/admin/services/:id/stats`   | `services:read`   | 销量 / 收入 / 转化              |
| GET    | `/api/admin/services/export`      | `services:export` | 导出                            |

### 6.2 订单

| Method | Path                                     | 权限                      | 说明       |
| ------ | ---------------------------------------- | ------------------------- | ---------- |
| GET    | `/api/admin/service-orders`              | `service-orders:read`     | 列表       |
| GET    | `/api/admin/service-orders/:id`          | `service-orders:read`     | 详情       |
| POST   | `/api/admin/service-orders/:id/refund`   | `service-orders:refund`   | 退款       |
| POST   | `/api/admin/service-orders/:id/assign`   | `service-orders:assign`   | 指派处理人 |
| POST   | `/api/admin/service-orders/:id/complete` | `service-orders:complete` | 标记完成   |
| GET    | `/api/admin/service-orders/export`       | `service-orders:export`   | 导出       |

### 6.3 H5 端

| Method | Path                     | 说明                         |
| ------ | ------------------------ | ---------------------------- |
| GET    | `/api/h5/services`       | H5 服务列表（status=online） |
| GET    | `/api/h5/services/:id`   | H5 详情                      |
| POST   | `/api/h5/service-orders` | H5 下单                      |

## 7. UI 组件

### 7.1 服务列表

- Tabs 按 category 分类
- 卡片视图 + 列表视图切换
- 列：封面 / 名称 / 分类 / 类型 / 价格 / 销量 / 状态 / 操作

### 7.2 服务编辑器

- 基本信息表单
- 富文本详情（Editor，支持图片）
- 价格设置（订阅周期）
- 限购配置
- 限 DLC 等级
- 限国家
- 预览（移动端 iframe）

### 7.3 订单详情

- 顶部状态徽章 + 操作按钮（退款 / 指派 / 完成）
- 主体：客户信息 / 服务信息 / 支付信息 / 表单填写内容
- 时间线：状态流转 + 操作人

## 8. 权限

| 操作      | operator | cs  | finance | superadmin |
| --------- | -------- | --- | ------- | ---------- |
| 查看      | ✓        | ✓   | ✓       | ✓          |
| 创建/编辑 | ✓        | ✗   | ✗       | ✓          |
| 上下架    | ✓        | ✗   | ✗       | ✓          |
| 退款      | ✗        | ✗   | ✓       | ✓          |
| 导出      | ✓        | ✗   | ✓       | ✓          |

## 9. i18n

```json
{
  "services": {
    "title": "服务管理",
    "category": {
      "company": "公司注册",
      "tax": "税务",
      "legal": "法务",
      "bank": "银行",
      "ai": "AI 工具",
      "service": "通用服务"
    },
    "type": {
      "one_time": "一次性",
      "subscription": "订阅制",
      "freemium": "免费增值"
    }
  }
}
```

## 10. 验收用例

| #   | 用例                             | 期望                               |
| --- | -------------------------------- | ---------------------------------- |
| 1   | 创建「萨摩亚 SPV」服务，限 DLC≥3 | 列表新增，H5 DLC<3 用户看不到      |
| 2   | 设定 dailyLimit=10               | 当日第 11 单失败                   |
| 3   | H5 用户下单，状态=pending        | 列表出现                           |
| 4   | 客服指派给某运营                 | assignedTo 更新                    |
| 5   | 标记完成                         | 状态 → completed，写入 completedAt |
| 6   | 财务退款                         | 状态 → refunded，原路返回          |
| 7   | 软删服务                         | H5 端看不到，订单仍可见            |
| 8   | 订阅服务（monthly）              | H5 端自动续费逻辑触发              |
| 9   | 订阅服务（yearly）+ 续费失败     | 状态 → past_due（新增）            |
| 10  | 编辑价格，原价划线               | H5 端价格显示带删除线              |
