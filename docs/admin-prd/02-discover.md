# 02 · 发现页运营（Discover）

> **对应 H5**：`/discover`（发现页）
> **核心目标**：控制 H5 发现页的「内容流 + 推荐位 + Banner + 专题」。

---

## 1. 业务目标

- 控制 H5 用户看到的「发现」信息流
- 运营可手动：置顶、调整顺序、限时上下架
- AI 推荐 + 人工干预双轨制
- 数据回流：CTR、转化、停留时长

## 2. 用户故事

| #    | 故事                                                        |
| ---- | ----------------------------------------------------------- |
| US-1 | 作为运营，我希望发布一个「专题活动」并指定 H5 发现页第 1 位 |
| US-2 | 作为运营，我希望查看每个推荐位的「点击率 + 转化」           |
| US-3 | 作为运营，我希望下架违规内容，H5 端立即看不到               |
| US-4 | 作为超管，我希望设置「AI 推荐 vs 人工」的混合比例           |

## 3. 字段定义

### 3.1 DiscoverItem（推荐位 / Banner / 专题）

| 字段                            | 类型        | 必填 | 说明                                          |
| ------------------------------- | ----------- | ---- | --------------------------------------------- |
| id                              | String UUID | ✓    |                                               |
| title                           | String(120) | ✓    | 标题                                          |
| subtitle                        | String(200) |      | 副标题                                        |
| type                            | enum        | ✓    | `banner` / `topic` / `recommend` / `ai_pick`  |
| coverUrl                        | String      | ✓    | 封面图                                        |
| linkType                        | enum        |      | `internal` / `external` / `h5_route` / `none` |
| linkTarget                      | String      |      | 跳转路径 / URL                                |
| weight                          | Int         | ✓    | 排序权重（数字越大越前）                      |
| status                          | enum        | ✓    | `draft` / `scheduled` / `online` / `offline`  |
| startAt                         | DateTime    |      | 定时上线                                      |
| endAt                           | DateTime    |      | 自动下线                                      |
| tags                            | String      |      | JSON 数组，关联标签                           |
| targetUserLevel                 | Int         |      | DLC 等级定向（0 = 全部）                      |
| targetCountries                 | String      |      | 国家代码数组（空 = 全部）                     |
| aiGenerated                     | Boolean     |      | AI 推荐的标记                                 |
| aiScore                         | Decimal     |      | AI 推荐分数（0-100）                          |
| ctr                             | Decimal     |      | 累计 CTR（%）                                 |
| conversions                     | Int         |      | 累计转化数                                    |
| createdBy                       | String      |      | adminUserId                                   |
| createdAt, updatedAt, deletedAt |             |      | 通用                                          |

### 3.2 DiscoverSection（推荐位配置）

| 字段         | 类型    | 说明                                         |
| ------------ | ------- | -------------------------------------------- |
| id           | String  |                                              |
| name         | String  | 如「热门商品」「AI 推荐」「专题活动」        |
| code         | String  | `hot`、`ai_pick`、`topic`、`new_arrival`     |
| displayCount | Int     | 显示条数                                     |
| layout       | enum    | `horizontal` / `grid` / `list`               |
| mixRatio     | Json    | `{ "ai": 0.6, "manual": 0.4 }` AI 与人工占比 |
| enabled      | Boolean |                                              |

## 4. 状态机

```
draft → scheduled → online → offline
                       ↓
                   (endAt 到期自动 offline)
```

## 5. Prisma 模型

```prisma
model DiscoverItem {
  id            String    @id @default(uuid())
  title         String
  subtitle      String?
  type          String    // banner / topic / recommend / ai_pick
  coverUrl      String
  linkType      String?   // internal / external / h5_route / none
  linkTarget    String?
  weight        Int       @default(0)
  status        String    @default("draft")  // draft / scheduled / online / offline
  startAt       DateTime?
  endAt         DateTime?
  tags          String?   // JSON 数组
  targetUserLevel Int     @default(0)
  targetCountries String? // JSON 数组
  aiGenerated   Boolean   @default(false)
  aiScore       Decimal?
  ctr           Decimal   @default(0)
  conversions   Int       @default(0)
  createdBy     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
  version       Int       @default(0)

  @@index([status, weight])
  @@index([type, status])
}

model DiscoverSection {
  id           String   @id @default(uuid())
  name         String
  code         String   @unique
  displayCount Int      @default(10)
  layout       String   @default("horizontal")
  mixRatio     String?  // JSON
  enabled      Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

## 6. API 接口

| Method | Path                                    | 权限              | 说明                                  |
| ------ | --------------------------------------- | ----------------- | ------------------------------------- |
| GET    | `/api/admin/discover/items`             | `discover:read`   | 列表（筛选 type/status/keyword/时间） |
| GET    | `/api/admin/discover/items/:id`         | `discover:read`   | 详情（含统计数据）                    |
| POST   | `/api/admin/discover/items`             | `discover:write`  | 创建                                  |
| PUT    | `/api/admin/discover/items/:id`         | `discover:write`  | 编辑                                  |
| DELETE | `/api/admin/discover/items/:id`         | `discover:write`  | 软删                                  |
| POST   | `/api/admin/discover/items/:id/online`  | `discover:write`  | 立即上线                              |
| POST   | `/api/admin/discover/items/:id/offline` | `discover:write`  | 立即下线                              |
| POST   | `/api/admin/discover/items/reorder`     | `discover:write`  | 批量调整 weight                       |
| GET    | `/api/admin/discover/sections`          | `discover:read`   | 推荐位配置                            |
| PUT    | `/api/admin/discover/sections/:id`      | `discover:write`  | 修改推荐位                            |
| GET    | `/api/admin/discover/items/:id/stats`   | `discover:read`   | 单条 CTR / 转化 / 7 天趋势            |
| GET    | `/api/admin/discover/export`            | `discover:export` | 导出 CSV                              |

### H5 端（只读）

| Method | Path                    | 权限 | 说明                                        |
| ------ | ----------------------- | ---- | ------------------------------------------- |
| GET    | `/api/h5/discover/feed` | user | 获取 H5 发现页 feed（按 section code 聚合） |

## 7. UI 组件

### 7.1 列表

- 筛选：类型（4 选）、状态（4 选）、关键词、时间
- 列：封面 / 标题 / 类型 / 状态 / 权重 / CTR / 转化 / 操作
- 行操作：编辑 / 上下线 / 删除 / 数据
- 批量：批量改权重、批量下线

### 7.2 编辑器

- 左侧表单，右侧预览（H5 端卡片模拟）
- 封面图上传
- 链接选择器（弹窗选 H5 路由或填 URL）
- 定时上线

### 7.3 推荐位配置

- 列表 + 拖拽排序
- 单条编辑弹窗：名称 / 布局 / 显示数 / AI 占比

## 8. 权限

| 操作   | operator | cs  | finance | risk | auditor | superadmin |
| ------ | -------- | --- | ------- | ---- | ------- | ---------- |
| 查看   | ✓        | ✓   | ✓       | ✓    | ✓       | ✓          |
| 编辑   | ✓        | ✗   | ✗       | ✗    | ✗       | ✓          |
| 上下线 | ✓        | ✗   | ✗       | ✓    | ✗       | ✓          |
| 导出   | ✓        | ✗   | ✓       | ✗    | ✓       | ✓          |

## 9. i18n

```json
{
  "discover": {
    "title": "发现页运营",
    "type": {
      "banner": "Banner",
      "topic": "专题活动",
      "recommend": "推荐位",
      "ai_pick": "AI 推荐"
    },
    "status": {
      "draft": "草稿",
      "scheduled": "待发布",
      "online": "已上线",
      "offline": "已下线"
    }
  }
}
```

## 10. 验收用例

| #   | 用例                           | 期望                                |
| --- | ------------------------------ | ----------------------------------- |
| 1   | 创建 banner，定时明早 8 点上线 | status=scheduled, startAt=明早 8 点 |
| 2   | 时间到，H5 端能看到            | 自动 status=online                  |
| 3   | 运营拖动排序，weight 变化      | H5 端列表顺序变                     |
| 4   | AI 推荐占比 60%                | 6 条 AI + 4 条人工                  |
| 5   | 点击率统计 7 天趋势图          | 折线图正确                          |
| 6   | 软删一条记录                   | 列表不显示，DB 中 `deletedAt` 有值  |
| 7   | 上传封面图                     | 限制 ≤ 2MB、jpg/png/webp            |
| 8   | 链接选择器选 H5 路由           | 自动校验路由存在                    |
| 9   | 客户定向 DLC=3                 | H5 端 DLC<3 用户不显示              |
| 10  | 客服尝试编辑                   | 403                                 |
