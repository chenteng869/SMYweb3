# 19 · AI 电子名片（模板 · 数据 · 分发）

> **对应 H5**：`/ai-business-card`（AI 电子名片）
> **核心目标**：管理名片模板、用户名片数据、分享统计、二维码生成。

---

## 1. 业务目标

- 多模板（行业、风格）
- AI 自动生成名片（用户上传资料 → AI 排版）
- 二维码 / 链接分享
- 查看/联系/转化统计
- 微信/支付宝名片夹对接（可选）

## 2. 用户故事

| #    | 故事                                      |
| ---- | ----------------------------------------- |
| US-1 | 作为运营，我新增「金融行业」模板          |
| US-2 | 作为超管，我编辑模板的字段、配色          |
| US-3 | 作为运营，我看每张名片的「查看→联系」转化 |
| US-4 | 作为超管，我配置 AI 生成的 prompt 模板    |

## 3. 字段定义

### 3.1 BusinessCardTemplate（模板）

| 字段                                                | 类型        | 必填 | 说明                                                  |
| --------------------------------------------------- | ----------- | ---- | ----------------------------------------------------- |
| id                                                  | String      | ✓    |                                                       |
| name                                                | String(120) | ✓    |                                                       |
| code                                                | String(60)  | ✓    | 唯一                                                  |
| category                                            | String(40)  |      | `finance` / `legal` / `tech` / `education` / `custom` |
| layout                                              | String(40)  | ✓    | `classic` / `modern` / `minimal` / `creative`         |
| colorScheme                                         | String      |      | JSON：主色/辅色                                       |
| fontFamily                                          | String      |      |                                                       |
| fields                                              | String      |      | JSON：字段定义                                        |
| backgroundUrl                                       | String      |      |                                                       |
| previewUrl                                          | String      |      |                                                       |
| aiPromptTemplate                                    | Text        |      | AI 生成 prompt 模板                                   |
| dlcRequired                                         | Int         |      | 最低 DLC 等级（0 = 全部）                             |
| enabled                                             | Boolean     |      |                                                       |
| sortWeight                                          | Int         |      |                                                       |
| createdBy, createdAt, updatedAt, deletedAt, version |             |      | 通用                                                  |

### 3.2 BusinessCard（名片实例）

| 字段                                                | 类型        | 必填 | 说明                               |
| --------------------------------------------------- | ----------- | ---- | ---------------------------------- |
| id                                                  | String      | ✓    |                                    |
| userId                                              | String      |      |                                    |
| templateId                                          | String      |      |                                    |
| name                                                | String(60)  | ✓    |                                    |
| title                                               | String(80)  |      | 职位                               |
| company                                             | String(120) |      |                                    |
| phone                                               | String(40)  |      |                                    |
| email                                               | String(120) |      |                                    |
| website                                             | String(200) |      |                                    |
| address                                             | String(200) |      |                                    |
| avatar                                              | String      |      |                                    |
| logo                                                | String      |      | 公司 logo                          |
| bio                                                 | Text        |      | 简介                               |
| socialLinks                                         | String      |      | JSON：LinkedIn/Twitter/微信        |
| customFields                                        | String      |      | JSON：用户自定义                   |
| aiGenerated                                         | Boolean     |      |                                    |
| shareSlug                                           | String      |      | 唯一短链 slug                      |
| qrCodeUrl                                           | String      |      |                                    |
| status                                              | enum        | ✓    | `draft` / `published` / `archived` |
| viewCount                                           | Int         |      | 累计查看                           |
| contactCount                                        | Int         |      | 累计联系（点击电话/邮箱）          |
| shareCount                                          | Int         |      | 累计分享                           |
| createdBy, createdAt, updatedAt, deletedAt, version |             |      | 通用                               |

### 3.3 BusinessCardViewLog（查看日志）

| 字段         | 类型     | 说明                                      |
| ------------ | -------- | ----------------------------------------- |
| id           | String   |                                           |
| cardId       | String   |                                           |
| viewerUserId | String   | null = 访客                               |
| viewerIp     | String   |                                           |
| action       | enum     | `view` / `contact` / `share` / `save_vcf` |
| userAgent    | String   |                                           |
| referrer     | String   |                                           |
| createdAt    | DateTime |                                           |

## 4. Prisma 模型

```prisma
model BusinessCardTemplate {
  id               String   @id @default(uuid())
  name             String
  code             String   @unique
  category         String?
  layout           String
  colorScheme      String?  // JSON
  fontFamily       String?
  fields           String   // JSON
  backgroundUrl    String?
  previewUrl       String?
  aiPromptTemplate String?
  dlcRequired      Int      @default(0)
  enabled          Boolean  @default(true)
  sortWeight       Int      @default(0)
  createdBy        String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  deletedAt        DateTime?
  version          Int      @default(0)
}

model BusinessCard {
  id           String    @id @default(uuid())
  userId       String?
  templateId   String?
  name         String
  title        String?
  company      String?
  phone        String?
  email        String?
  website      String?
  address      String?
  avatar       String?
  logo         String?
  bio          String?
  socialLinks  String?   // JSON
  customFields String?   // JSON
  aiGenerated  Boolean   @default(false)
  shareSlug    String    @unique
  qrCodeUrl    String?
  status       String    @default("draft")
  viewCount    Int       @default(0)
  contactCount Int       @default(0)
  shareCount   Int       @default(0)
  createdBy    String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?
  version      Int       @default(0)

  viewLogs BusinessCardViewLog[]

  @@index([userId])
  @@index([status, viewCount])
}

model BusinessCardViewLog {
  id           String   @id @default(uuid())
  cardId       String
  card         BusinessCard @relation(fields: [cardId], references: [id])
  viewerUserId String?
  viewerIp     String?
  action       String
  userAgent    String?
  referrer     String?
  createdAt    DateTime @default(now())

  @@index([cardId, createdAt])
}
```

## 5. API 接口

### 5.1 模板

| Method | Path                                       | 权限                      | 说明 |
| ------ | ------------------------------------------ | ------------------------- | ---- |
| GET    | `/api/admin/ai-card/templates`             | `ai-card:templates:read`  | 列表 |
| GET    | `/api/admin/ai-card/templates/:id`         |                           | 详情 |
| POST   | `/api/admin/ai-card/templates`             | `ai-card:templates:write` | 新增 |
| PUT    | `/api/admin/ai-card/templates/:id`         | `ai-card:templates:write` | 编辑 |
| POST   | `/api/admin/ai-card/templates/:id/enable`  | `ai-card:templates:write` | 启用 |
| POST   | `/api/admin/ai-card/templates/:id/disable` | `ai-card:templates:write` | 停用 |
| DELETE | `/api/admin/ai-card/templates/:id`         | `ai-card:templates:write` | 软删 |

### 5.2 名片

| Method | Path                                   | 权限                      | 说明                           |
| ------ | -------------------------------------- | ------------------------- | ------------------------------ |
| GET    | `/api/admin/ai-card/cards`             | `ai-card:templates:read`  | 列表（userId/template/status） |
| GET    | `/api/admin/ai-card/cards/:id`         |                           | 详情                           |
| PUT    | `/api/admin/ai-card/cards/:id`         | `ai-card:templates:write` | 编辑（运营）                   |
| POST   | `/api/admin/ai-card/cards/:id/publish` | `ai-card:templates:write` | 发布                           |
| POST   | `/api/admin/ai-card/cards/:id/archive` | `ai-card:templates:write` | 归档                           |
| DELETE | `/api/admin/ai-card/cards/:id`         | `ai-card:templates:write` | 软删                           |

### 5.3 数据

| Method | Path                                  | 权限                     | 说明           |
| ------ | ------------------------------------- | ------------------------ | -------------- |
| GET    | `/api/admin/ai-card/cards/:id/stats`  | `ai-card:analytics:read` | 单名片 7 天    |
| GET    | `/api/admin/ai-card/stats/overview`   | `ai-card:analytics:read` | 总览           |
| GET    | `/api/admin/ai-card/stats/templates`  | `ai-card:analytics:read` | 模板使用率     |
| GET    | `/api/admin/ai-card/stats/conversion` | `ai-card:analytics:read` | 查看→联系 漏斗 |
| GET    | `/api/admin/ai-card/stats/export`     | `ai-card:export`         | 导出           |

### 5.4 H5 端

| Method | Path                                    | 说明                    |
| ------ | --------------------------------------- | ----------------------- |
| GET    | `/api/h5/ai-card/templates`             | 模板列表（DLC 过滤）    |
| POST   | `/api/h5/ai-card/cards`                 | 创建名片                |
| GET    | `/api/h5/ai-card/cards`                 | 我的名片                |
| GET    | `/api/h5/ai-card/cards/:id`             | 详情                    |
| PUT    | `/api/h5/ai-card/cards/:id`             | 编辑                    |
| POST   | `/api/h5/ai-card/cards/:id/ai-generate` | AI 一键生成             |
| GET    | `/api/h5/ai-card/c/:slug`               | 公开访问（写 view log） |
| GET    | `/api/h5/ai-card/c/:slug/vcf`           | 下载 VCF                |

## 6. UI 组件

### 6.1 模板列表

- 卡片视图：预览图 / 名称 / 类别 / 风格
- 行操作：编辑 / 启停 / 复制

### 6.2 模板编辑器

- 左侧表单
- 右侧实时预览
- 字段拖拽（添加/删除）
- 配色选择

### 6.3 名片列表

- 表格：头像 / 姓名 / 公司 / 模板 / 状态 / 查看 / 联系 / 分享
- 看板视图：按状态分

### 6.4 数据看板

- 4 KPI：总名片、累计查看、累计联系、分享次数
- 7 天趋势
- 模板使用率饼图
- 转化漏斗

## 7. 权限

| 操作     | operator | superadmin |
| -------- | -------- | ---------- |
| 模板查看 | ✓        | ✓          |
| 模板编辑 | ✓        | ✓          |
| 名片编辑 | ✓        | ✓          |
| 数据     | ✓        | ✓          |
| 导出     | ✓        | ✓          |

## 8. i18n

```json
{
  "aiCard": {
    "title": "AI 电子名片",
    "layout": {
      "classic": "经典",
      "modern": "现代",
      "minimal": "极简",
      "creative": "创意"
    },
    "category": {
      "finance": "金融",
      "legal": "法律",
      "tech": "科技",
      "education": "教育",
      "custom": "自定义"
    }
  }
}
```

## 9. 验收用例

| #   | 用例                 | 期望                            |
| --- | -------------------- | ------------------------------- |
| 1   | 创建「金融行业」模板 | 列表新增                        |
| 2   | 模板拖拽加字段       | H5 端表单字段对应               |
| 3   | H5 AI 一键生成名片   | 5s 内输出，自动选模板           |
| 4   | 名片发布             | shareSlug + 二维码生成          |
| 5   | 公开链接访问         | 写 view log                     |
| 6   | 点击电话联系         | 写 contact log，+1 contactCount |
| 7   | VCF 下载             | 标准 vCard 文件                 |
| 8   | 名片 DLC 限制        | DLC 3 以下不可用某些模板        |
| 9   | 7 天数据             | 看板曲线                        |
| 10  | 软删名片             | 链接 404                        |
