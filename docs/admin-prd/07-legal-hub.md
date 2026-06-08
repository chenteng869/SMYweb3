# 07 · 法务中台（合规法规 · 合同模板）

> **对应 H5**：`/legal-hub`（法务中台）
> **核心目标**：管理各国合规法规库、合同模板、风险预警。

---

## 1. 业务目标

- 多国合规法规统一管理
- 合同模板在线生成
- 法务风险预警（KYC 异常 / 制裁名单 / 大额异常）
- AI 法务问答

## 2. 用户故事

| # | 故事 |
|---|---|
| US-1 | 作为风控，我希望添加「OFAC 制裁名单」到风险库 |
| US-2 | 作为超管，我希望编辑「SPV 股权代持协议」模板 |
| US-3 | 作为客服，我希望一键生成某用户的「服务协议」 |
| US-4 | 作为风控，我希望查看所有「待处理合规风险」 |

## 3. 字段定义

### 3.1 LegalCompliance（合规要求）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| country | String(60) | ✓ | |
| countryCode | String(8) | ✓ | |
| category | String(40) | ✓ | `aml` / `kyc` / `data_privacy` / `tax` / `sanctions` / `licensing` |
| requirement | String(200) | ✓ | 标题 |
| description | Text | | 详细说明 |
| penalty | String(500) | | 处罚说明 |
| severity | enum | | `low` / `medium` / `high` / `critical` |
| status | enum | | `required` / `recommended` / `optional` |
| effectiveDate | Date | | |
| sourceUrl | String | | 法规原文链接 |
| createdAt, updatedAt, deletedAt, version | | | 通用 |

### 3.2 ContractTemplate（合同模板）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| name | String(120) | |
| type | enum | `spv_agreement` / `service_agreement` / `nda` / `employment` / `partnership` / `custom` |
| jurisdiction | String | 适用法域 |
| language | String | `zh-CN` / `en-US` / ... |
| content | Text | 富文本（HTML 或 Markdown） |
| variables | String | JSON：变量定义（如 `{{companyName}}`） |
| version | Int | |
| enabled | Boolean | |
| aiGenerated | Boolean | |
| createdBy | String | |
| createdAt, updatedAt, deletedAt | | |

### 3.3 Contract（合同实例）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| templateId | String | |
| templateName | String | 冗余 |
| name | String | |
| parties | String | JSON 数组 |
| status | enum | `draft` / `reviewing` / `signed` / `expired` / `terminated` |
| content | Text | 渲染后内容 |
| variables | String | JSON：填入的变量值 |
| fileUrl | String | 生成的 PDF |
| hash | String | 区块链存证哈希 |
| signedAt | DateTime | |
| expiryDate | Date | |
| createdBy, createdAt, updatedAt | | |

### 3.4 RiskAlert（风险预警）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| userId | String | 关联用户 |
| type | enum | `sanctions_match` / `large_tx` / `unusual_pattern` / `pep_match` |
| level | enum | `info` / `warning` / `danger` |
| source | String | 数据源（OFAC / UN / EU / 自定义） |
| matchInfo | String | JSON 匹配详情 |
| status | enum | `pending` / `confirmed` / `dismissed` |
| reviewedBy | String | adminUserId |
| reviewedAt | DateTime | |
| reviewNote | String | |
| createdAt | DateTime | |

## 4. 状态机

**Contract**：
```
draft → reviewing → signed → expired
                            ↘ terminated
```

**RiskAlert**：
```
pending → confirmed（确认风险，处置）
        ↘ dismissed（误报，关闭）
```

## 5. Prisma 模型

```prisma
model LegalCompliance {
  id            String   @id @default(uuid())
  country       String
  countryCode   String
  category      String
  requirement   String
  description   String?
  penalty       String?
  severity      String   @default("medium")
  status        String   @default("required")
  effectiveDate DateTime?
  sourceUrl     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
  version       Int      @default(0)

  @@index([countryCode, category])
}

model ContractTemplate {
  id           String   @id @default(uuid())
  name         String
  type         String
  jurisdiction String?
  language     String   @default("zh-CN")
  content      String
  variables    String?  // JSON
  version      Int      @default(1)
  enabled      Boolean  @default(true)
  aiGenerated  Boolean  @default(false)
  createdBy    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?
}

model Contract {
  id           String    @id @default(uuid())
  templateId   String
  templateName String
  name         String
  parties      String?   // JSON
  status       String    @default("draft")
  content      String
  variables    String?   // JSON
  fileUrl      String?
  hash         String?
  signedAt     DateTime?
  expiryDate   DateTime?
  createdBy    String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([status, createdAt])
}

model RiskAlert {
  id         String    @id @default(uuid())
  userId     String
  type       String
  level      String    @default("warning")
  source     String?
  matchInfo  String?   // JSON
  status     String    @default("pending")
  reviewedBy String?
  reviewedAt DateTime?
  reviewNote String?
  createdAt  DateTime  @default(now())

  @@index([status, level, createdAt])
}
```

## 6. API 接口

### 6.1 合规法规
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/legal/compliance` | `legal:read` | 列表（country/category/severity） |
| GET | `/api/admin/legal/compliance/:id` | | 详情 |
| POST | `/api/admin/legal/compliance` | `legal:write` | 新增 |
| PUT | `/api/admin/legal/compliance/:id` | `legal:write` | 编辑 |
| DELETE | `/api/admin/legal/compliance/:id` | `legal:write` | 软删 |

### 6.2 合同模板
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/legal/contract-templates` | `legal:contracts:read` | 列表 |
| GET | `/api/admin/legal/contract-templates/:id` | | 详情 |
| POST | `/api/admin/legal/contract-templates` | `legal:contracts:write` | 新增 |
| PUT | `/api/admin/legal/contract-templates/:id` | `legal:contracts:write` | 编辑 |
| POST | `/api/admin/legal/contract-templates/:id/preview` | `legal:contracts:write` | 预览（填入变量） |
| POST | `/api/admin/legal/contract-templates/:id/ai-generate` | `legal:contracts:write` | AI 生成模板 |
| DELETE | `/api/admin/legal/contract-templates/:id` | `legal:contracts:write` | 软删 |

### 6.3 合同实例
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/legal/contracts` | `legal:contracts:read` | 列表 |
| GET | `/api/admin/legal/contracts/:id` | | 详情 |
| POST | `/api/admin/legal/contracts` | `legal:contracts:write` | 从模板生成 |
| POST | `/api/admin/legal/contracts/:id/sign` | `legal:contracts:write` | 签署 |
| POST | `/api/admin/legal/contracts/:id/terminate` | `legal:contracts:write` | 终止 |
| GET | `/api/admin/legal/contracts/:id/pdf` | | 下载 PDF |

### 6.4 风险预警
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/legal/risk-alerts` | `legal:risk:read` | 列表（status=pending 默认） |
| GET | `/api/admin/legal/risk-alerts/:id` | | 详情 |
| POST | `/api/admin/legal/risk-alerts/:id/confirm` | `legal:risk:write` | 确认风险 |
| POST | `/api/admin/legal/risk-alerts/:id/dismiss` | `legal:risk:write` | 误报 |
| POST | `/api/admin/legal/risk-alerts/batch/process` | `legal:risk:write` | 批量处理 |

### 6.5 H5 端
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/h5/legal/countries` | 国家列表 |
| GET | `/api/h5/legal/compliance/:countryCode` | 该国合规要求 |
| GET | `/api/h5/legal/templates` | 合同模板列表 |
| POST | `/api/h5/legal/contracts` | 生成合同 |
| GET | `/api/h5/legal/contracts` | 我的合同 |

## 7. UI 组件

### 7.1 合规法规列表
- Tabs：国家 / 类别
- 表格：国家 / 类别 / 标题 / 严重度 / 状态 / 生效日期
- 行操作：编辑 / 详情（弹窗显示处罚）

### 7.2 合同模板编辑器
- 富文本编辑器（Tiptap）
- 变量插入：点击插入 `{{companyName}}`
- AI 生成：输入需求 → 一键生成
- 预览：右侧实时

### 7.3 合同实例详情
- 头部：合同名 / 状态 / 签署时间
- 主体：合同内容（只读）
- 操作：签署 / 终止 / 下载 PDF / 区块链存证

### 7.4 风险预警
- 列表：用户 / 类型 / 等级 / 来源 / 时间
- 详情：匹配详情（OFAC 命中字段）+ 用户资料
- 处理：确认 / 误报 / 转交

## 8. 权限

| 操作 | operator | cs | risk | superadmin |
|---|---|---|---|---|
| 查看合规 | ✓ | ✓ | ✓ | ✓ |
| 编辑合规 | ✗ | ✗ | ✓ | ✓ |
| 合同模板 | ✗ | ✗ | ✓ | ✓ |
| 风险预警 | ✓ | ✓ | ✓ | ✓ |
| 风险处理 | ✗ | ✗ | ✓ | ✓ |

## 9. i18n

```json
{
  "legal": {
    "title": "法务中台",
    "category": {
      "aml": "反洗钱",
      "kyc": "实名认证",
      "data_privacy": "数据隐私",
      "tax": "税务",
      "sanctions": "制裁名单",
      "licensing": "牌照许可"
    },
    "severity": {
      "low": "低",
      "medium": "中",
      "high": "高",
      "critical": "严重"
    }
  }
}
```

## 10. 验收用例

| # | 用例 | 期望 |
|---|---|---|
| 1 | 新增「OFAC 制裁」到美国合规库 | 列表新增 |
| 2 | 编辑 SPV 协议模板，插入变量 | 预览替换 |
| 3 | AI 生成「保密协议」 | 一键填充 |
| 4 | 从模板生成用户「服务协议」 | 合同实例创建 |
| 5 | 签署合同 | status=signed，写入 hash |
| 6 | OFAC 命中：测试用户 | 自动创建 RiskAlert |
| 7 | 风控确认风险 | status=confirmed，用户被停用 |
| 8 | 风控误报关闭 | status=dismissed |
| 9 | 合同到期 | 定时任务 status=expired |
| 10 | 合同下载 PDF | 返回签名 URL |
