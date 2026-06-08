# 10 · AI 对话（智能体 · 对话日志 · 反馈）

> **对应 H5**：`/ai-chat/:agentId`（AI 对话页）
> **核心目标**：H5 端 AI 对话的日志查询、反馈、人机协作。

> 注：本模块与 [04-ai-brain.md](./04-ai-brain.md) 紧耦合。AI 大脑是「配置」，本模块是「运营 + 数据」。两个 PRD 共享 `AiAgent` 表。

---

## 1. 业务目标

- 全量对话日志检索
- 用户反馈（点赞、点踩、问题未解决）
- 人工接管会话
- 数据统计：解决率、平均轮次、满意度

## 2. 用户故事

| # | 故事 |
|---|---|
| US-1 | 作为客服，我想查「昨日与 AI 选品官的对话」 |
| US-2 | 作为风控，我想看被点踩的对话，找出 AI 弱点 |
| US-3 | 作为客服，我接管一个 AI 对话，进入人工服务 |
| US-4 | 作为运营，我看平均对话轮次、解决率 |

## 3. 字段定义

### 3.1 AiChatSession（对话会话）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| userId | String | |
| userName | String | |
| agentId | String | |
| agentName | String | |
| status | enum | `ongoing` / `completed` / `taken_over` / `flagged` |
| messageCount | Int | |
| aiSatisfaction | Decimal | 0-5 |
| userFeedback | String | 文字反馈 |
| feedbackType | enum | `helpful` / `unhelpful` / `incomplete` / `incorrect` |
| startedAt | DateTime | |
| endedAt | DateTime | |
| takenOverBy | String | adminUserId |
| takenOverAt | DateTime | |
| flag | String | 违规标记 |
| flagReason | String | |
| metadata | String | JSON 上下文（设备、来源） |

### 3.2 AiChatMessage（消息）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| sessionId | String | |
| role | enum | `user` / `assistant` / `system` / `operator` |
| content | Text | |
| tokens | Int | |
| latency | Int | 响应延迟 ms |
| error | String | 调用错误 |
| createdAt | DateTime | |

## 4. 状态机

```
ongoing → completed（用户结束）
        ↘ taken_over（人工接管）
        ↘ flagged（被举报/违规）
```

## 5. Prisma 模型

```prisma
model AiChatSession {
  id              String   @id @default(uuid())
  userId          String
  userName        String
  agentId         String
  agentName       String
  status          String   @default("ongoing")
  messageCount    Int      @default(0)
  aiSatisfaction  Decimal  @default(0)
  userFeedback    String?
  feedbackType    String?
  startedAt       DateTime @default(now())
  endedAt         DateTime?
  takenOverBy     String?
  takenOverAt     DateTime?
  flag            String?
  flagReason      String?
  metadata        String?  // JSON

  messages AiChatMessage[]

  @@index([agentId, startedAt])
  @@index([userId, startedAt])
  @@index([status, startedAt])
}

model AiChatMessage {
  id        String   @id @default(uuid())
  sessionId String
  session   AiChatSession @relation(fields: [sessionId], references: [id])
  role      String   // user / assistant / system / operator
  content   String
  tokens    Int      @default(0)
  latency   Int      @default(0)
  error     String?
  createdAt DateTime @default(now())

  @@index([sessionId, createdAt])
}
```

## 6. API 接口

### 6.1 会话
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/ai/sessions` | `ai:chat:review` | 列表（userId/agentId/status/feedback/time） |
| GET | `/api/admin/ai/sessions/:id` | | 详情（含所有消息） |
| POST | `/api/admin/ai/sessions/:id/takeover` | `ai:chat:review` | 接管 |
| POST | `/api/admin/ai/sessions/:id/flag` | `ai:chat:review` | 标记违规 |
| POST | `/api/admin/ai/sessions/:id/feedback` | `ai:chat:review` | 客服反馈评分 |
| GET | `/api/admin/ai/sessions/export` | `ai:chat:export` | 导出 |

### 6.2 消息
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/ai/sessions/:id/messages` | `ai:chat:review` | 会话消息 |
| POST | `/api/admin/ai/sessions/:id/messages` | `ai:chat:review` | 客服回复（接管后） |

### 6.3 统计
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/ai/stats/overview` | `ai:chat:review` | 总览（会话数、消息数、满意度） |
| GET | `/api/admin/ai/stats/agents` | `ai:chat:review` | 各 agent 数据 |
| GET | `/api/admin/ai/stats/satisfaction` | `ai:chat:review` | 满意度趋势 |
| GET | `/api/admin/ai/stats/feedback` | `ai:chat:review` | 反馈分布 |

### 6.4 H5 端
| Method | Path | 说明 |
|---|---|---|
| POST | `/api/h5/ai/chat/start` | 开始会话 |
| POST | `/api/h5/ai/chat/:sessionId/message` | 发消息（流式 SSE） |
| POST | `/api/h5/ai/chat/:sessionId/end` | 结束 |
| POST | `/api/h5/ai/chat/:sessionId/feedback` | 反馈 |

## 7. UI 组件

### 7.1 会话列表
- 筛选：用户 / 智能体 / 状态 / 反馈 / 时间
- 列：用户 / 智能体 / 状态 / 消息数 / 满意度 / 起始时间 / 操作
- 实时刷新（10s）

### 7.2 会话详情
- 左侧：消息流（用户/AI/客服区分色）
- 右侧：用户信息 / 智能体信息 / 接管按钮 / 标记按钮
- 输入框：仅「已接管」时可用

### 7.3 数据看板
- 4 KPI：会话总数 / 消息总数 / 平均满意度 / 解决率
- 智能体对比
- 满意度趋势
- 反馈分布饼图

## 8. 权限

| 操作 | operator | cs | risk | superadmin |
|---|---|---|---|---|
| 查看 | ✓ | ✓ | ✓ | ✓ |
| 接管 | ✗ | ✓ | ✗ | ✓ |
| 标记违规 | ✗ | ✗ | ✓ | ✓ |
| 客服回复 | ✗ | ✓ | ✗ | ✓ |
| 导出 | ✓ | ✗ | ✓ | ✓ |

## 9. i18n

```json
{
  "aiChat": {
    "title": "AI 对话管理",
    "status": {
      "ongoing": "进行中",
      "completed": "已完成",
      "taken_over": "人工接管",
      "flagged": "已标记"
    }
  }
}
```

## 10. 验收用例

| # | 用例 | 期望 |
|---|---|---|
| 1 | 客服查昨日所有会话 | 列表带分页 |
| 2 | 客服接管一个进行中会话 | status=taken_over，写 takenOverBy |
| 3 | 客服回复消息 | H5 用户立刻收到 |
| 4 | 标记违规对话 | status=flagged，进入风控队列 |
| 5 | AI 满意度 1 星 | 反馈入反馈库 |
| 6 | 解决率：completed / (completed + flagged) | 数据看板显示 |
| 7 | 流式回复中断 | latency 写入，error 记录 |
| 8 | 单个用户 100 条消息 | 会话正常结束 |
| 9 | 导出 1000 条会话 | 异步 CSV |
| 10 | 接管后用户继续发消息 | 同时出现 AI 提示「客服已接管」 |
