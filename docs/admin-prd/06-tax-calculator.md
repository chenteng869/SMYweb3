# 06 · 税务计算（税率库 · 规则引擎）

> **对应 H5**：`/tax-calculator`（税务计算器）
> **核心目标**：管理 24 国税率库 + 自定义税务规则 + 计算公式。

---

## 1. 业务目标

- 维护 H5 税务计算器所需的税率数据
- 支持多国多结构（萨摩亚 SPV / 香港 / 新加坡 / BVI / 开曼 / 美国 / 英国 等）
- 公式可调（如 VAT 抵扣、税收抵免）
- 缓存汇率、规则版本控制

## 2. 用户故事

| # | 故事 |
|---|---|
| US-1 | 作为运营，我希望添加「越南」税率数据 |
| US-2 | 作为超管，我希望修改企业所得税率（16% → 15%） |
| US-3 | 作为运营，我希望上传新法规文件 |
| US-4 | 作为超管，我希望回滚到上版本税率 |

## 3. 字段定义

### 3.1 TaxRate（税率）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| country | String(60) | ✓ | 国家名 |
| countryCode | String(8) | ✓ | ISO 代码 |
| structureType | String(40) | ✓ | SPV 类型（samoa_spv / hong_kong / ...） |
| corporateTax | Decimal | | 企业所得税 % |
| vatGst | Decimal | | 增值税 % |
| withholdingTax | Decimal | | 预提税 % |
| capitalGainsTax | Decimal | | 资本利得税 % |
| doubleTaxationTreaties | String | | JSON 国家数组 |
| notes | Text | | 备注 |
| effectiveFrom | Date | | 生效日期 |
| effectiveTo | Date | | 失效日期 |
| version | Int | | 版本号 |
| isCurrent | Boolean | | 是否当前生效 |
| createdBy | String | | |
| createdAt, updatedAt, deletedAt | | | 通用 |

### 3.2 TaxRule（计算规则）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| code | String | 唯一 |
| name | String | |
| description | String | |
| formula | Text | 计算公式（DSL 表达式） |
| parameters | String | JSON：参数定义 |
| example | String | JSON：示例输入输出 |
| enabled | Boolean | |
| priority | Int | 优先级 |
| countries | String | JSON 国家数组（空 = 全部） |
| createdAt, updatedAt, deletedAt, version | | |

### 3.3 TaxRegulation（法规文件）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| countryCode | String | |
| title | String | |
| fileUrl | String | 上传的法规文件 |
| publishDate | Date | |
| effectiveDate | Date | |
| summary | Text | AI 摘要 |
| createdAt, updatedAt, deletedAt | | |

## 4. Prisma 模型

```prisma
model TaxRate {
  id                        String   @id @default(uuid())
  country                   String
  countryCode               String
  structureType             String
  corporateTax              Decimal?
  vatGst                    Decimal?
  withholdingTax            Decimal?
  capitalGainsTax           Decimal?
  doubleTaxationTreaties    String?  // JSON
  notes                     String?
  effectiveFrom             DateTime?
  effectiveTo               DateTime?
  version                   Int      @default(1)
  isCurrent                 Boolean  @default(true)
  createdBy                 String?
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
  deletedAt                 DateTime?

  @@unique([countryCode, structureType, version])
  @@index([countryCode, structureType, isCurrent])
}

model TaxRule {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String?
  formula     String   // DSL 表达式
  parameters  String?  // JSON
  example     String?  // JSON
  enabled     Boolean  @default(true)
  priority    Int      @default(0)
  countries   String?  // JSON
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  version     Int      @default(0)
}

model TaxRegulation {
  id            String    @id @default(uuid())
  countryCode   String
  title         String
  fileUrl       String
  publishDate   DateTime?
  effectiveDate DateTime?
  summary       String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
}
```

## 5. API 接口

### 5.1 税率
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/tax/rates` | `tax:rates:read` | 列表（country/structureType/keyword/时间） |
| GET | `/api/admin/tax/rates/:id` | | 详情 |
| POST | `/api/admin/tax/rates` | `tax:rates:write` | 新增（自动 version+1，旧 isCurrent=false） |
| PUT | `/api/admin/tax/rates/:id` | `tax:rates:write` | 编辑 |
| DELETE | `/api/admin/tax/rates/:id` | `tax:rates:write` | 软删 |
| POST | `/api/admin/tax/rates/:id/restore/:version` | `tax:rates:write` | 回滚到指定版本 |
| GET | `/api/admin/tax/rates/:id/history` | `tax:rates:read` | 版本历史 |
| GET | `/api/admin/tax/rates/export` | `tax:rates:export` | 导出 |

### 5.2 规则
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/tax/rules` | `tax:rules:read` | 列表 |
| GET | `/api/admin/tax/rules/:id` | | 详情 |
| POST | `/api/admin/tax/rules` | `tax:rules:write` | 新增 |
| PUT | `/api/admin/tax/rules/:id` | `tax:rules:write` | 编辑 |
| POST | `/api/admin/tax/rules/:id/test` | `tax:rules:write` | 测试公式 |
| POST | `/api/admin/tax/rules/:id/enable` | `tax:rules:write` | 启用 |
| POST | `/api/admin/tax/rules/:id/disable` | `tax:rules:write` | 停用 |

### 5.3 法规
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/tax/regulations` | `tax:regulations:read` | 列表 |
| POST | `/api/admin/tax/regulations` | `tax:regulations:write` | 上传 |
| DELETE | `/api/admin/tax/regulations/:id` | `tax:regulations:write` | 删除 |

### 5.4 H5 端
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/h5/tax/calculate` | 税务计算（参数：营收、毛利、目标国、结构） |
| GET | `/api/h5/tax/rates/:countryCode` | 该国所有结构税率 |
| GET | `/api/h5/tax/countries` | 24 国列表 |

## 6. UI 组件

### 6.1 税率列表
- Tabs：按国家 / 按结构类型
- 表格：国家 / 结构 / 企业税 / 增值税 / 预提税 / 资本利得 / 生效日期 / 版本 / 操作
- 行操作：编辑 / 版本历史 / 设为当前

### 6.2 税率编辑器
- 左侧表单
- 右侧：计算示例（输入营收/毛利/结构 → 输出税额）
- 版本对比

### 6.3 规则编辑器
- DSL 代码编辑器（Monaco）
- 实时测试
- 启用国家下拉

### 6.4 法规管理
- 文件列表 + 上传
- AI 摘要显示

## 7. 权限

| 操作 | operator | finance | superadmin |
|---|---|---|---|
| 查看 | ✓ | ✓ | ✓ |
| 编辑税率 | ✗ | ✓ | ✓ |
| 编辑规则 | ✗ | ✓ | ✓ |
| 回滚版本 | ✗ | ✗ | ✓ |

## 8. i18n

```json
{
  "tax": {
    "title": "税务计算",
    "structureType": {
      "samoa_spv": "萨摩亚 SPV",
      "hong_kong": "香港公司",
      "singapore": "新加坡公司",
      "bvi": "BVI 公司",
      "cayman": "开曼公司"
    }
  }
}
```

## 9. 验收用例

| # | 用例 | 期望 |
|---|---|---|
| 1 | 越南税率新增 | 列表新增，H5 端可查 |
| 2 | 编辑企业税 16→15% | version +1，旧版本 isCurrent=false |
| 3 | H5 调用 calculate，营收 100 万，香港 | 返回税额 |
| 4 | DSL 公式语法错误 | 实时红字提示 |
| 5 | 公式测试用例失败 | 警告但允许保存（需 reason） |
| 6 | 法规上传 PDF | 自动解析，AI 摘要填充 |
| 7 | 回滚到 v3 | 当前 v4 isCurrent=false，v3 isCurrent=true |
| 8 | 24 国全部存在 | H5 端选择器有 24 个 |
| 9 | 财务导出税率 | CSV 完整 |
| 10 | 修改税率实时生效 | H5 端下次调用拿到新值（缓存 5min） |
