# 08 · 视频中心（剧集 · 视频 · 评论）

> **对应 H5**：`/video-center`（视频列表）、`/video/:id`（播放器）
> **核心目标**：管理 H5 视频中心的所有剧集、视频、评论审核、数据统计。

---

## 1. 业务目标

- 视频上传、编目、发布
- 评论审核（人工 + AI 辅助）
- 数据统计：播放量、完播率、互动
- 视频 NFT 化（关联 NFT 模块）

## 2. 用户故事

| # | 故事 |
|---|---|
| US-1 | 作为运营，我希望上传一个视频，封面/标签/分类自动识别 |
| US-2 | 作为运营，我希望创建剧集并把视频归入 |
| US-3 | 作为风控，我希望审核评论，封禁违规用户 |
| US-4 | 作为运营，我希望查看每集完播率 |

## 3. 字段定义

### 3.1 Video（视频）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| title | String(200) | ✓ | |
| description | Text | | |
| thumbnail | String | ✓ | 封面 |
| duration | Int | ✓ | 秒 |
| videoUrl | String | ✓ | 播放地址 |
| category | String(40) | ✓ | 国学/出海/营销/... |
| tags | String | | JSON 数组 |
| authorId | String | | |
| authorName | String | | 冗余 |
| authorAvatar | String | | |
| seriesId | String | | 所属剧集 |
| episode | Int | | 第几集 |
| status | enum | ✓ | `draft` / `pending` / `online` / `offline` / `banned` |
| auditStatus | enum | | `pending` / `approved` / `rejected` |
| auditNote | String | | |
| views | Int | | 累计播放 |
| likes | Int | | 点赞 |
| comments | Int | | 评论数 |
| shares | Int | | 分享数 |
| completionRate | Decimal | | 平均完播率 % |
| publishedAt | DateTime | | |
| nftId | String | | 关联 NFT（可选） |
| createdBy, createdAt, updatedAt, deletedAt, version | | | 通用 |

### 3.2 Series（剧集）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| title | String | |
| description | Text | |
| coverUrl | String | |
| category | String | |
| totalEpisodes | Int | 集数 |
| status | enum | `ongoing` / `completed` / `paused` |
| createdAt, updatedAt, deletedAt | | |

### 3.3 VideoComment（评论）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| videoId | String | |
| userId | String | |
| userName | String | |
| userAvatar | String | |
| content | Text | |
| parentId | String | 父评论（楼中楼） |
| likes | Int | |
| status | enum | `pending` / `approved` / `rejected` / `hidden` |
| aiScore | Decimal | AI 违规分数 |
| reportedCount | Int | 被举报次数 |
| createdAt | DateTime | |

## 4. 状态机

**Video**：
```
draft → pending → approved → online
                     ↘ rejected (回 draft)
online → offline
online → banned（违规下架）
```

**Comment**：
```
pending → approved
        ↘ rejected
        ↘ hidden（被举报多次）
```

## 5. Prisma 模型

```prisma
model Series {
  id             String   @id @default(uuid())
  title          String
  description    String?
  coverUrl       String?
  category       String
  totalEpisodes  Int      @default(0)
  status         String   @default("ongoing")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  videos         Video[]
}

model Video {
  id              String    @id @default(uuid())
  title           String
  description     String?
  thumbnail       String
  duration        Int
  videoUrl        String
  category        String
  tags            String?   // JSON
  authorId        String?
  authorName      String?
  authorAvatar    String?
  seriesId        String?
  series          Series?   @relation(fields: [seriesId], references: [id])
  episode         Int?
  status          String    @default("draft")
  auditStatus     String    @default("pending")
  auditNote       String?
  views           Int       @default(0)
  likes           Int       @default(0)
  comments        Int       @default(0)
  shares          Int       @default(0)
  completionRate  Decimal   @default(0)
  publishedAt     DateTime?
  nftId           String?
  createdBy       String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
  version         Int       @default(0)

  @@index([status, publishedAt])
  @@index([seriesId, episode])
  @@index([category, status])
}

model VideoComment {
  id            String   @id @default(uuid())
  videoId       String
  userId        String
  userName      String
  userAvatar    String?
  content       String
  parentId      String?
  likes         Int      @default(0)
  status        String   @default("pending")
  aiScore       Decimal  @default(0)
  reportedCount Int      @default(0)
  createdAt     DateTime @default(now())

  @@index([videoId, status])
  @@index([status, createdAt])
}
```

## 6. API 接口

### 6.1 剧集
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/video/series` | `video:read` | 列表 |
| GET | `/api/admin/video/series/:id` | | 详情（含集列表） |
| POST | `/api/admin/video/series` | `video:write` | 新建 |
| PUT | `/api/admin/video/series/:id` | `video:write` | 编辑 |
| DELETE | `/api/admin/video/series/:id` | `video:write` | 软删 |

### 6.2 视频
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/video/videos` | `video:read` | 列表（seriesId/category/status/keyword/时间） |
| GET | `/api/admin/video/videos/:id` | `video:read` | 详情 |
| POST | `/api/admin/video/videos/upload` | `video:write` | 上传（multipart） |
| PUT | `/api/admin/video/videos/:id` | `video:write` | 编辑元数据 |
| POST | `/api/admin/video/videos/:id/audit` | `video:audit` | 审核（通过/驳回） |
| POST | `/api/admin/video/videos/:id/online` | `video:write` | 上线 |
| POST | `/api/admin/video/videos/:id/offline` | `video:write` | 下线 |
| POST | `/api/admin/video/videos/:id/ban` | `video:audit` | 封禁 |
| GET | `/api/admin/video/videos/:id/stats` | `video:read` | 播放/完播/互动 |
| GET | `/api/admin/video/videos/export` | `video:export` | 导出 |

### 6.3 评论
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/video/comments` | `video:comments:read` | 列表（videoId/status/aiScore） |
| GET | `/api/admin/video/comments/:id` | | 详情 |
| POST | `/api/admin/video/comments/:id/approve` | `video:comments:moderate` | 通过 |
| POST | `/api/admin/video/comments/:id/reject` | `video:comments:moderate` | 驳回 |
| POST | `/api/admin/video/comments/:id/hide` | `video:comments:moderate` | 隐藏 |
| POST | `/api/admin/video/comments/batch/process` | `video:comments:moderate` | 批量 |

### 6.4 H5 端
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/h5/video/series` | 剧集列表 |
| GET | `/api/h5/video/series/:id` | 剧集详情 + 集列表 |
| GET | `/api/h5/video/videos` | 视频列表 |
| GET | `/api/h5/video/videos/:id` | 视频详情 |
| GET | `/api/h5/video/videos/:id/comments` | 评论列表 |
| POST | `/api/h5/video/videos/:id/comments` | 发评论 |
| POST | `/api/h5/video/videos/:id/like` | 点赞 |
| POST | `/api/h5/video/videos/:id/share` | 分享 |

## 7. UI 组件

### 7.1 剧集列表
- 卡片视图：封面 / 标题 / 集数 / 状态
- 批量：批量上下线

### 7.2 视频列表
- 表格：封面缩略 / 标题 / 剧集 / 分类 / 时长 / 状态 / 播放 / 完播 / 操作
- 行操作：编辑 / 审核 / 上下线 / 数据

### 7.3 视频编辑器
- 上传：拖拽 / 选择，支持 mp4/mov，最大 2GB
- 自动转码（生成 720p / 1080p）
- 封面截取
- 元数据：标题、描述、分类、标签

### 7.4 评论审核
- 列表：评论 / 用户 / 视频 / AI 分数 / 状态
- 详情：评论上下文 + AI 判定原因
- 批量：按 AI 分数区间批量处理

### 7.5 数据看板
- 单视频：7 天播放曲线、完播率分布、用户画像
- 剧集：全剧集数据对比

## 8. 权限

| 操作 | operator | cs | risk | superadmin |
|---|---|---|---|---|
| 查看 | ✓ | ✓ | ✓ | ✓ |
| 上传/编辑 | ✓ | ✗ | ✗ | ✓ |
| 审核 | ✓ | ✓ | ✓ | ✓ |
| 封禁 | ✗ | ✗ | ✓ | ✓ |
| 评论审核 | ✓ | ✓ | ✓ | ✓ |
| 导出 | ✓ | ✗ | ✓ | ✓ |

## 9. i18n

```json
{
  "video": {
    "title": "视频中心",
    "status": {
      "draft": "草稿",
      "pending": "待审核",
      "online": "已上线",
      "offline": "已下线",
      "banned": "已封禁"
    },
    "auditStatus": {
      "pending": "待审核",
      "approved": "已通过",
      "rejected": "已驳回"
    }
  }
}
```

## 10. 验收用例

| # | 用例 | 期望 |
|---|---|---|
| 1 | 上传 1.5GB MP4 | 自动转码 720p/1080p |
| 2 | 上传 3GB | 拒绝 |
| 3 | 创建剧集《出海指南》 | 列表新增 |
| 4 | 上传视频归入剧集第 1 集 | episode=1 |
| 5 | 审核通过 → 上线 | H5 端可见 |
| 6 | 评论 AI 分数 0.9（高） | 自动通过 |
| 7 | 评论被举报 3 次 | 自动隐藏 |
| 8 | 封禁某视频 | H5 端 404，统计停止累计 |
| 9 | 完播率统计 | 数据看板显示 |
| 10 | 批量审核 50 条评论 | 一次提交，异步处理 |
