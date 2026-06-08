# 17 · 消息通知（推送 · 模板 · 队列 · 站内信）

> **对应 H5**：`/notifications`（消息中心）
> **核心目标**：多通道推送（站内/邮件/短信/微信/FCM/APNs）、模板管理、消息队列监控。

---

## 1. 业务目标

- 多通道统一管理（FCM/APNs/微信/短信/邮件）
- 模板可配置（多语言）
- 手动 + 定时 + 触发式发送
- 发送状态追踪
- 失败重试

## 2. 用户故事

| # | 故事 |
|---|---|
| US-1 | 作为运营，我编辑「订单已通过」模板（多语言） |
| US-2 | 作为超管，我向所有 DLC 5 用户推送一条通知 |
| US-3 | 作为客服，我查某用户的「消息投递状态」 |
| US-4 | 作为运营，我看 7 天消息发送量 |

## 3. 字段定义

### 3.1 NotificationTemplate（模板）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| code | String(60) | ✓ | 唯一编码 |
| name | String(120) | ✓ | |
| category | String(40) | | 业务分类 |
| channels | String | ✓ | JSON：支持通道（inapp / email / sms / wechat / fcm / apns） |
| subject | String | | 标题（邮件/推送） |
| content | Text | ✓ | 模板内容（变量 `{{var}}`） |
| variables | String | | JSON：变量定义 |
| translations | String | | JSON：多语言内容 `{ en: {...}, ja: {...} }` |
| enabled | Boolean | | |
| createdBy, createdAt, updatedAt, deletedAt, version | | | 通用 |

### 3.2 Notification（消息实例）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| userId | String | ✓ | 接收人 |
| templateCode | String | | 关联模板 |
| channel | enum | ✓ | `inapp` / `email` / `sms` / `wechat` / `fcm` / `apns` |
| title | String | | |
| content | Text | | |
| variables | String | | JSON 渲染后变量 |
| status | enum | ✓ | `pending` / `sent` / `delivered` / `read` / `failed` |
| externalId | String | | 通道返回 ID |
| failedReason | String | | |
| retryCount | Int | | |
| sentAt | DateTime | | |
| deliveredAt | DateTime | | |
| readAt | DateTime | | |
| createdAt | DateTime | | |

### 3.3 NotificationCampaign（推送活动）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| name | String | |
| templateId | String | |
| channels | String | JSON 通道 |
| targetType | enum | `all` / `segment` / `specific` |
| targetFilter | String | JSON 筛选条件（DLC 等级/语言/国家） |
| targetUserIds | String | JSON 特定用户 ID |
| scheduledAt | DateTime | 定时 |
| status | enum | `draft` / `scheduled` / `sending` / `completed` / `cancelled` |
| sentCount | Int | |
| successCount | Int | |
| failedCount | Int | |
| createdBy, createdAt, updatedAt | | |

### 3.4 ChannelConfig（通道配置）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| channel | String | |
| enabled | Boolean | |
| credentials | String | JSON 加密 |
| config | String | JSON 附加 |
| createdAt, updatedAt, deletedAt | | |

## 4. 状态机

**Notification**：
```
pending → sent → delivered → read
                  ↘ failed → retry → sent
```

**Campaign**：
```
draft → scheduled → sending → completed
        ↘ cancelled
```

## 5. Prisma 模型

```prisma
model NotificationTemplate {
  id           String   @id @default(uuid())
  code         String   @unique
  name         String
  category     String?
  channels     String   // JSON
  subject      String?
  content      String
  variables    String?  // JSON
  translations String?  // JSON
  enabled      Boolean  @default(true)
  createdBy    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?
  version      Int      @default(0)
}

model Notification {
  id            String    @id @default(uuid())
  userId        String
  templateCode  String?
  channel       String
  title         String?
  content       String
  variables     String?   // JSON
  status        String    @default("pending")
  externalId    String?
  failedReason  String?
  retryCount    Int       @default(0)
  sentAt        DateTime?
  deliveredAt   DateTime?
  readAt        DateTime?
  createdAt     DateTime  @default(now())

  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@index([templateCode])
}

model NotificationCampaign {
  id              String    @id @default(uuid())
  name            String
  templateId      String?
  channels        String    // JSON
  targetType      String    @default("all")
  targetFilter    String?   // JSON
  targetUserIds   String?   // JSON
  scheduledAt     DateTime?
  status          String    @default("draft")
  sentCount       Int       @default(0)
  successCount    Int       @default(0)
  failedCount     Int       @default(0)
  createdBy       String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model ChannelConfig {
  id          String   @id @default(uuid())
  channel     String   @unique
  enabled     Boolean  @default(true)
  credentials String?  // 加密
  config      String?  // JSON
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
}
```

## 6. API 接口

### 6.1 模板
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/notifications/templates` | `notifications:read` | 列表 |
| GET | `/api/admin/notifications/templates/:id` | | 详情 |
| POST | `/api/admin/notifications/templates` | `notifications:templates:write` | 新增 |
| PUT | `/api/admin/notifications/templates/:id` | `notifications:templates:write` | 编辑 |
| POST | `/api/admin/notifications/templates/:id/preview` | `notifications:templates:write` | 预览（填入变量） |
| POST | `/api/admin/notifications/templates/:id/test-send` | `notifications:templates:write` | 测试发送（给自己） |
| DELETE | `/api/admin/notifications/templates/:id` | `notifications:templates:write` | 软删 |

### 6.2 消息查询
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/notifications/messages` | `notifications:read` | 列表（userId/channel/status/templateCode/时间） |
| GET | `/api/admin/notifications/messages/:id` | | 详情 |
| POST | `/api/admin/notifications/messages/:id/retry` | `notifications:push` | 重发 |
| GET | `/api/admin/notifications/messages/export` | `notifications:export` | 导出 |

### 6.3 推送活动
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/notifications/campaigns` | `notifications:read` | 列表 |
| GET | `/api/admin/notifications/campaigns/:id` | | 详情 |
| POST | `/api/admin/notifications/campaigns` | `notifications:push` | 新建 |
| PUT | `/api/admin/notifications/campaigns/:id` | `notifications:push` | 编辑 |
| POST | `/api/admin/notifications/campaigns/:id/send` | `notifications:push` | 立即发送 |
| POST | `/api/admin/notifications/campaigns/:id/cancel` | `notifications:push` | 取消 |
| GET | `/api/admin/notifications/campaigns/:id/stats` | `notifications:read` | 发送统计 |

### 6.4 通道配置
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/notifications/channels` | `notifications:read` | 列表 |
| PUT | `/api/admin/notifications/channels/:channel` | `notifications:templates:write` | 编辑 |
| POST | `/api/admin/notifications/channels/:channel/test` | `notifications:templates:write` | 测试连通 |

### 6.5 统计
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/notifications/stats/overview` | `notifications:read` | 总览 |
| GET | `/api/admin/notifications/stats/channels` | `notifications:read` | 通道分布 |
| GET | `/api/admin/notifications/stats/timeline` | `notifications:read` | 7 天发送曲线 |
| GET | `/api/admin/notifications/stats/failures` | `notifications:read` | 失败原因分布 |

### 6.6 H5 端
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/h5/notifications` | 我的消息（inapp） |
| GET | `/api/h5/notifications/unread-count` | 未读数（用于红点） |
| POST | `/api/h5/notifications/:id/read` | 标记已读 |
| POST | `/api/h5/notifications/read-all` | 全部已读 |
| POST | `/api/h5/notifications/device-token` | 注册推送 token |

## 7. UI 组件

### 7.1 模板列表
- Tabs 按 category
- 表格：code / 名称 / 通道 / 启用 / 操作
- 行操作：编辑 / 预览 / 测试 / 删除

### 7.2 模板编辑器
- 左侧表单（基本信息 + 通道勾选 + 多语言）
- 变量插入：可视化变量管理
- 右侧预览（实时渲染）

### 7.3 推送活动
- 列表：名称 / 模板 / 目标 / 计划 / 状态 / 发送数 / 操作
- 向导式创建：选模板 → 选目标 → 选通道 → 排期

### 7.4 消息查询
- 列表：用户 / 通道 / 模板 / 状态 / 时间
- 详情：投递链路（pending → sent → delivered → read）

### 7.5 通道配置
- 卡片视图：通道 / 启用 / 凭证 / 操作
- 编辑：凭证加密保存

## 8. 权限

| 操作 | operator | cs | superadmin |
|---|---|---|---|
| 模板查看 | ✓ | ✓ | ✓ |
| 模板编辑 | ✓ | ✗ | ✓ |
| 发送推送 | ✓ | ✓ | ✓ |
| 通道配置 | ✗ | ✗ | ✓ |
| 导出 | ✓ | ✗ | ✓ |

## 9. i18n

```json
{
  "notifications": {
    "title": "消息通知",
    "channel": {
      "inapp": "站内信",
      "email": "邮件",
      "sms": "短信",
      "wechat": "微信",
      "fcm": "FCM",
      "apns": "APNs"
    },
    "status": {
      "pending": "待发送",
      "sent": "已发送",
      "delivered": "已送达",
      "read": "已读",
      "failed": "失败"
    }
  }
}
```

## 10. 验收用例

| # | 用例 | 期望 |
|---|---|---|
| 1 | 编辑「订单通过」模板 | H5 用户收到多语言消息 |
| 2 | 推送活动 1000 用户 | 队列处理，状态 sending → completed |
| 3 | FCM token 失效 | 投递失败，自动重试 3 次 |
| 4 | 用户标记已读 | 状态 → read |
| 5 | 未读数查询 | 顶部红点显示 |
| 6 | 定时推送明早 9 点 | scheduledAt 写入 |
| 7 | DLC 5 推送活动筛选 | 仅 DLC 5 用户收到 |
| 8 | 短信通道凭证错误 | 通道配置标红 |
| 9 | 模板变量缺失 | 渲染时自动补 `{{name:用户}}` |
| 10 | 导出 1w 消息 | 异步 CSV |
