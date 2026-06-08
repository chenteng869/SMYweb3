# 09 · 自媒体中心（文章 · 多平台 · 数据）

> **对应 H5**：`/media-center`（自媒体中心）
> **核心目标**：管理多平台文章/动态、AI 自动排期、数据聚合。

---

## 1. 业务目标

- 多平台内容统一管理（公众号/微博/抖音/小红书/Twitter/LinkedIn）
- AI 自动生成 + 人工润色
- 定时排期发布
- 多平台数据聚合分析

## 2. 用户故事

| # | 故事 |
|---|---|
| US-1 | 作为运营，我希望 AI 生成一篇「萨摩亚税收」公众号文章 |
| US-2 | 作为运营，我希望同一篇文章排期到 6 个平台同时发布 |
| US-3 | 作为运营，我希望查看小红书的点击/转化漏斗 |
| US-4 | 作为超管，我希望关闭某平台的发布权限 |

## 3. 字段定义

### 3.1 MediaPost（帖子）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| title | String(200) | ✓ | |
| content | Text | ✓ | 富文本 |
| coverUrl | String | | 封面 |
| platform | enum | ✓ | `wechat` / `weibo` / `tiktok` / `xiaohongshu` / `twitter` / `linkedin` |
| platforms | String | | JSON：多平台同时发布 |
| status | enum | ✓ | `draft` / `scheduled` / `publishing` / `published` / `failed` |
| scheduledAt | DateTime | | 排期时间 |
| publishedAt | DateTime | | 实际发布 |
| failedReason | String | | 失败原因 |
| engagement | String | | JSON：`{ impressions, clicks, likes, shares, comments }` |
| aiGenerated | Boolean | | |
| aiPrompt | Text | | AI 提示词 |
| createdBy, createdAt, updatedAt, deletedAt, version | | | 通用 |

### 3.2 MediaAccount（平台账号）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| platform | String | |
| accountName | String | 显示名 |
| accountId | String | 平台内 ID |
| avatar | String | |
| followers | Int | 当前粉丝数 |
| totalPosts | Int | 累计发布 |
| enabled | Boolean | |
| credentials | String | JSON 加密：授权信息 |
| lastSyncAt | DateTime | |
| createdAt, updatedAt, deletedAt | | |

### 3.3 MediaDashboard（数据看板）
H5 用字段，参见 [01-dashboard.md](./01-dashboard.md) 同名实体。

## 4. 状态机

```
draft → scheduled → publishing → published
                            ↘ failed (可重试回 scheduled)
```

## 5. Prisma 模型

```prisma
model MediaPost {
  id           String    @id @default(uuid())
  title        String
  content      String
  coverUrl     String?
  platform     String    // 主平台
  platforms    String?   // JSON 多平台
  status       String    @default("draft")
  scheduledAt  DateTime?
  publishedAt  DateTime?
  failedReason String?
  engagement   String?   // JSON
  aiGenerated  Boolean   @default(false)
  aiPrompt     String?
  createdBy    String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?
  version      Int       @default(0)

  @@index([status, scheduledAt])
  @@index([platform, publishedAt])
}

model MediaAccount {
  id           String   @id @default(uuid())
  platform     String
  accountName  String
  accountId    String
  avatar       String?
  followers    Int      @default(0)
  totalPosts   Int      @default(0)
  enabled      Boolean  @default(true)
  credentials  String?  // 加密
  lastSyncAt   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?

  @@unique([platform, accountId])
}
```

## 6. API 接口

### 6.1 帖子
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/media/posts` | `media:read` | 列表（platform/status/keyword/时间） |
| GET | `/api/admin/media/posts/:id` | `media:read` | 详情 |
| POST | `/api/admin/media/posts` | `media:write` | 创建 |
| PUT | `/api/admin/media/posts/:id` | `media:write` | 编辑 |
| DELETE | `/api/admin/media/posts/:id` | `media:write` | 软删 |
| POST | `/api/admin/media/posts/:id/ai-generate` | `media:write` | AI 生成 |
| POST | `/api/admin/media/posts/:id/schedule` | `media:write` | 排期 |
| POST | `/api/admin/media/posts/:id/publish` | `media:publish` | 立即发布 |
| POST | `/api/admin/media/posts/:id/cancel-schedule` | `media:write` | 取消排期 |
| POST | `/api/admin/media/posts/batch/publish` | `media:publish` | 批量发布 |
| GET | `/api/admin/media/posts/:id/engagement` | `media:read` | 数据 |
| GET | `/api/admin/media/posts/export` | `media:export` | 导出 |

### 6.2 账号
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/media/accounts` | `media:read` | 列表 |
| POST | `/api/admin/media/accounts` | `media:write` | 新增（含授权） |
| PUT | `/api/admin/media/accounts/:id` | `media:write` | 编辑 |
| POST | `/api/admin/media/accounts/:id/sync` | `media:write` | 同步数据 |
| POST | `/api/admin/media/accounts/:id/enable` | `media:write` | 启用 |
| POST | `/api/admin/media/accounts/:id/disable` | `media:write` | 停用 |
| DELETE | `/api/admin/media/accounts/:id` | `media:write` | 删除 |

### 6.3 数据
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/media/dashboard` | `media:analytics` | 看板（多平台聚合） |
| GET | `/api/admin/media/dashboard/platforms` | `media:analytics` | 平台分布 |
| GET | `/api/admin/media/dashboard/growth` | `media:analytics` | 增长曲线 |

### 6.4 H5 端
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/h5/media/posts` | 我的帖子 |
| GET | `/api/h5/media/posts/:id` | 详情 |
| POST | `/api/h5/media/posts` | 创建 |
| GET | `/api/h5/media/dashboard` | 我的看板 |

## 7. UI 组件

### 7.1 帖子列表
- 平台筛选（多选）
- 状态筛选
- 日历视图（按 scheduledAt）
- 批量：批量排期、批量发布

### 7.2 帖子编辑器
- 富文本编辑器
- AI 生成：输入主题 + 提示词 → 一键生成
- 平台选择（多平台同时发布）
- 封面：上传或 AI 生图
- 排期：日期时间选择

### 7.3 数据看板
- 4 大 KPI：总帖数、总曝光、总粉丝、增长率
- 平台分布饼图
- 增长曲线
- 帖子表现 Top 10

## 8. 权限

| 操作 | operator | superadmin |
|---|---|---|
| 查看 | ✓ | ✓ |
| 编辑 | ✓ | ✓ |
| 立即发布 | ✓ | ✓ |
| 账号管理 | ✗ | ✓ |
| 导出 | ✓ | ✓ |

## 9. i18n

```json
{
  "media": {
    "title": "自媒体中心",
    "platform": {
      "wechat": "微信公众号",
      "weibo": "微博",
      "tiktok": "抖音",
      "xiaohongshu": "小红书",
      "twitter": "Twitter",
      "linkedin": "LinkedIn"
    },
    "status": {
      "draft": "草稿",
      "scheduled": "已排期",
      "publishing": "发布中",
      "published": "已发布",
      "failed": "失败"
    }
  }
}
```

## 10. 验收用例

| # | 用例 | 期望 |
|---|---|---|
| 1 | AI 生成「萨摩亚税收」公众号文章 | 一键填充内容 |
| 2 | 编辑后选择 3 个平台排期明早 9 点 | scheduledAt 写入 |
| 3 | 定时到，发布 | 状态 publishing → published |
| 4 | 某平台授权过期 | publishing → failed，failedReason 写入 |
| 5 | 重新发布 | 状态回 published |
| 6 | 停用某平台账号 | 列表不能选该平台 |
| 7 | 数据看板 | 4 KPI + 6 平台分布 |
| 8 | 单帖 7 天曝光曲线 | 折线图 |
| 9 | 批量发布 10 条 | 异步队列处理 |
| 10 | 软删帖子 | 列表消失，统计仍保留 |
