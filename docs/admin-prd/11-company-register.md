# 11 · 公司注册（SPV 申请 · 审批 · 订单）

> **对应 H5**：`/company-register`（公司注册）
> **核心目标**：管理 SPV 公司注册申请、审批、订单跟进。

---

## 1. 业务目标

- 萨摩亚、BVI、开曼、香港、新加坡等 24 国 SPV 申请统一入口
- 资料收集、审核、跟进
- 与第三方服务商（注册代理）API 集成（可选）
- 状态机推进 + 通知

## 2. 用户故事

| #    | 故事                                |
| ---- | ----------------------------------- |
| US-1 | 作为客服，我看到「待补料」的申请    |
| US-2 | 作为风控，我审批通过萨摩亚 SPV 申请 |
| US-3 | 作为超管，我把申请指派给某注册代理  |
| US-4 | 作为运营，我看 24 国申请量分布      |

## 3. 字段定义

### 3.1 CompanyOrder（公司注册订单）

| 字段                                                | 类型        | 必填 | 说明                                                                                                                       |
| --------------------------------------------------- | ----------- | ---- | -------------------------------------------------------------------------------------------------------------------------- |
| id                                                  | String      | ✓    |                                                                                                                            |
| orderNo                                             | String(32)  | ✓    | 唯一业务订单号（CO-2026-00001）                                                                                            |
| userId                                              | String      | ✓    |                                                                                                                            |
| userName                                            | String      |      |                                                                                                                            |
| companyName                                         | String(120) | ✓    | 拟注册公司名（中）                                                                                                         |
| companyNameEn                                       | String(200) | ✓    | 拟注册公司名（英）                                                                                                         |
| country                                             | String(60)  | ✓    | 注册地                                                                                                                     |
| countryCode                                         | String(8)   | ✓    |                                                                                                                            |
| structureType                                       | String(40)  | ✓    | samoa_spv / bvi / cayman / hk / sg ...                                                                                     |
| businessScope                                       | Text        |      | 业务范围                                                                                                                   |
| shareholders                                        | String      |      | JSON：股东信息                                                                                                             |
| directors                                           | String      |      | JSON：董事信息                                                                                                             |
| registeredCapital                                   | Decimal     |      | 注册资本                                                                                                                   |
| capitalCurrency                                     | String      |      |                                                                                                                            |
| status                                              | enum        | ✓    | `draft` / `submitted` / `reviewing` / `supplementing` / `approved` / `rejected` / `processing` / `completed` / `cancelled` |
| statusNote                                          | String      |      | 状态备注                                                                                                                   |
| assignedTo                                          | String      |      | adminUserId                                                                                                                |
| assignedAgent                                       | String      |      | 第三方注册代理                                                                                                             |
| serviceId                                           | String      |      | 关联服务商品                                                                                                               |
| amount                                              | Decimal     |      | 服务费                                                                                                                     |
| currency                                            | String      |      |                                                                                                                            |
| paymentTxId                                         | String      |      |                                                                                                                            |
| documents                                           | String      |      | JSON：上传材料 URL 列表                                                                                                    |
| supplementalDocs                                    | String      |      | JSON：补料                                                                                                                 |
| supplementNote                                      | Text        |      | 补料说明                                                                                                                   |
| expectedCompletionAt                                | Date        |      | 预计完成                                                                                                                   |
| actualCompletionAt                                  | Date        |      | 实际完成                                                                                                                   |
| certificateUrl                                      | String      |      | 证书 PDF                                                                                                                   |
| createdBy, createdAt, updatedAt, deletedAt, version |             |      | 通用                                                                                                                       |

### 3.2 CompanyStatusLog（状态日志）

| 字段       | 类型     | 说明 |
| ---------- | -------- | ---- |
| id         | String   |      |
| orderId    | String   |      |
| fromStatus | String   |      |
| toStatus   | String   |      |
| note       | String   |      |
| operatorId | String   |      |
| createdAt  | DateTime |      |

## 4. 状态机

```
draft → submitted → reviewing → approved → processing → completed
                  ↘ supplementing (用户补料后回 reviewing)
                  ↘ rejected
submitted → cancelled
```

## 5. Prisma 模型

```prisma
model CompanyOrder {
  id                   String   @id @default(uuid())
  orderNo              String   @unique
  userId               String
  userName             String?
  companyName          String
  companyNameEn        String
  country              String
  countryCode          String
  structureType        String
  businessScope        String?
  shareholders         String?  // JSON
  directors            String?  // JSON
  registeredCapital    Decimal?
  capitalCurrency      String?
  status               String   @default("draft")
  statusNote           String?
  assignedTo           String?
  assignedAgent        String?
  serviceId            String?
  amount               Decimal
  currency             String
  paymentTxId          String?
  documents            String?  // JSON
  supplementalDocs     String?  // JSON
  supplementNote       String?
  expectedCompletionAt DateTime?
  actualCompletionAt   DateTime?
  certificateUrl       String?
  createdBy            String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  deletedAt            DateTime?
  version              Int      @default(0)

  statusLogs CompanyStatusLog[]

  @@index([status, createdAt])
  @@index([userId])
  @@index([countryCode, status])
}

model CompanyStatusLog {
  id         String   @id @default(uuid())
  orderId    String
  order      CompanyOrder @relation(fields: [orderId], references: [id])
  fromStatus String
  toStatus   String
  note       String?
  operatorId String?
  createdAt  DateTime @default(now())

  @@index([orderId, createdAt])
}
```

## 6. API 接口

### 6.1 订单

| Method | Path                                  | 权限                | 说明                                       |
| ------ | ------------------------------------- | ------------------- | ------------------------------------------ |
| GET    | `/api/admin/companies`                | `companies:read`    | 列表（userId/country/status/keyword/时间） |
| GET    | `/api/admin/companies/:id`            |                     | 详情（含状态日志）                         |
| PUT    | `/api/admin/companies/:id`            | `companies:write`   | 编辑（公司名/股东/董事）                   |
| POST   | `/api/admin/companies/:id/assign`     | `companies:assign`  | 指派                                       |
| POST   | `/api/admin/companies/:id/approve`    | `companies:approve` | 通过                                       |
| POST   | `/api/admin/companies/:id/reject`     | `companies:reject`  | 驳回（reason 必填）                        |
| POST   | `/api/admin/companies/:id/supplement` | `companies:write`   | 要求补料（说明必填）                       |
| POST   | `/api/admin/companies/:id/complete`   | `companies:approve` | 标记完成（上传证书）                       |
| POST   | `/api/admin/companies/:id/cancel`     | `companies:write`   | 取消                                       |
| POST   | `/api/admin/companies/batch/assign`   | `companies:assign`  | 批量指派                                   |
| GET    | `/api/admin/companies/export`         | `companies:export`  | 导出                                       |

### 6.2 统计

| Method | Path                                    | 权限             | 说明           |
| ------ | --------------------------------------- | ---------------- | -------------- |
| GET    | `/api/admin/companies/stats/overview`   | `companies:read` | 总览           |
| GET    | `/api/admin/companies/stats/countries`  | `companies:read` | 24 国分布      |
| GET    | `/api/admin/companies/stats/conversion` | `companies:read` | 提交→完成 漏斗 |

### 6.3 H5 端

| Method | Path                               | 说明      |
| ------ | ---------------------------------- | --------- |
| GET    | `/api/h5/companies/countries`      | 24 国可选 |
| POST   | `/api/h5/companies`                | 提交申请  |
| GET    | `/api/h5/companies`                | 我的订单  |
| GET    | `/api/h5/companies/:id`            | 详情      |
| PUT    | `/api/h5/companies/:id/supplement` | 用户补料  |
| POST   | `/api/h5/companies/:id/cancel`     | 取消      |

## 7. UI 组件

### 7.1 列表

- 筛选：用户 / 国家 / 状态 / 关键字 / 时间
- 列：订单号 / 用户 / 公司名 / 国家 / 状态 / 金额 / 处理人 / 创建时间 / 操作
- 批量：批量指派、批量审批

### 7.2 详情

- 头部：订单号 + 状态徽章 + 操作按钮
- 左侧：申请信息（公司名、股东、董事）
- 右侧：状态时间线 + 操作日志
- 底部：材料文件查看 + 证书下载

### 7.3 审批

- 一键通过 / 驳回（reason 弹窗）
- 通过后自动分配注册代理
- 驳回自动通知用户

### 7.4 统计

- 4 KPI：本月新申请、本月完成、平均周期、通过率
- 24 国分布地图
- 漏斗图

## 8. 权限

| 操作     | operator | cs  | finance | risk | superadmin |
| -------- | -------- | --- | ------- | ---- | ---------- |
| 查看     | ✓        | ✓   | ✓       | ✓    | ✓          |
| 编辑     | ✓        | ✓   | ✗       | ✗    | ✓          |
| 审批     | ✗        | ✓   | ✗       | ✓    | ✓          |
| 驳回     | ✗        | ✓   | ✗       | ✓    | ✓          |
| 指派     | ✗        | ✓   | ✗       | ✗    | ✓          |
| 标记完成 | ✗        | ✗   | ✗       | ✗    | ✓          |
| 导出     | ✓        | ✗   | ✓       | ✗    | ✓          |

## 9. i18n

```json
{
  "companies": {
    "title": "公司注册",
    "status": {
      "draft": "草稿",
      "submitted": "已提交",
      "reviewing": "审核中",
      "supplementing": "待补料",
      "approved": "已通过",
      "rejected": "已驳回",
      "processing": "办理中",
      "completed": "已完成",
      "cancelled": "已取消"
    }
  }
}
```

## 10. 验收用例

| #   | 用例                   | 期望                                  |
| --- | ---------------------- | ------------------------------------- |
| 1   | H5 提交萨摩亚 SPV 申请 | 后台列表出现                          |
| 2   | 客服要求补料           | 状态 → supplementing，写入补充说明    |
| 3   | 用户补料               | 状态 → reviewing                      |
| 4   | 风控审批通过           | 状态 → approved，自动分配代理         |
| 5   | 驳回 reason 太短       | 校验失败                              |
| 6   | 上传证书               | 状态 → completed，certificateUrl 写入 |
| 7   | 指派给某客服           | assignedTo 更新                       |
| 8   | 批量审批 20 条         | 一次提交，异步处理                    |
| 9   | 24 国分布统计          | 地图正确显示                          |
| 10  | 软删订单               | 列表消失，统计保留                    |
