# 04 · AI 大脑（智能体 · 知识库 · Todo 编排）

> **对应 H5**：`/ai`（AI 大脑页面）
> **核心目标**：管理 H5 端可见的 AI 智能体（Agent）、知识库、待办任务。

---

## 1. 业务目标

- 配置 H5 端 AI 大脑展示的智能体（agent）
- 维护知识库（FAQ + 长文 + 多模态）
- 监控 AI 对话质量、人工接管
- 控制 AI 自动行为（自动推荐、自动审核）

## 2. 用户故事

| # | 故事 |
|---|---|
| US-1 | 作为运营，我希望新增一个「AI 选品官」智能体，配置头像/描述/能力标签 |
| US-2 | 作为运营，我希望上传一份 PDF 知识库，AI 立即能用 |
| US-3 | 作为超管，我希望关闭某个智能体的「自动外呼」能力 |
| US-4 | 作为客服，我希望接管一个 AI 对话 |

## 3. 字段定义

### 3.1 AiAgent（智能体）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| name | String(60) | ✓ | 名称 |
| code | String(64) | ✓ | 唯一编码 |
| role | String(120) | ✓ | 角色定位（"AI 选品官"） |
| description | String(500) | | 描述 |
| avatarUrl | String | | 头像 |
| color | String(16) | | 主题色 |
| capabilities | String | | JSON 数组：能力点 |
| knowledgeBaseIds | String | | JSON 数组：绑定的知识库 |
| model | String(40) | | `gpt-4o` / `claude-sonnet-4` / `local-llm` |
| systemPrompt | Text | | 系统提示词 |
| temperature | Decimal | | 0-2 |
| maxTokens | Int | | |
| status | enum | ✓ | `draft` / `online` / `offline` / `maintenance` |
| allowAutoAction | Boolean | | 是否允许自动行为（推荐/审核） |
| priority | Int | | 排序 |
| totalChats | Int | | 累计对话数（统计） |
| createdAt, updatedAt, deletedAt, version | | | 通用 |

### 3.2 KnowledgeBase（知识库）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| title | String | |
| type | enum | `faq` / `document` / `url` / `multimodal` |
| content | Text | FAQ 直接文本 / document 解析后内容 |
| sourceUrl | String | URL 类型 |
| fileUrl | String | 上传文件路径 |
| fileSize | Int | |
| mimeType | String | |
| agentIds | String | JSON：哪些 agent 可用 |
| vectorStatus | enum | `pending` / `indexed` / `failed` |
| vectorIndexedAt | DateTime | |
| chunkCount | Int | 切片数 |
| createdBy | String | |
| createdAt, updatedAt, deletedAt | | |

### 3.3 AiTodo（待办）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| title | String | |
| description | String | |
| agentId | String | |
| agentName | String | 冗余 |
| userId | String | 谁的任务 |
| priority | enum | `high` / `medium` / `low` |
| status | enum | `pending` / `in_progress` / `completed` / `cancelled` |
| dueDate | DateTime | |
| completedAt | DateTime | |
| result | Text | 任务结果 |
| createdAt, updatedAt | | |

## 4. 状态机

**Agent**：
```
draft → online ↔ offline
              → maintenance（维护）
```

**Todo**：
```
pending → in_progress → completed
                      ↘ cancelled
```

**KnowledgeBase**：
```
uploaded → pending (向量化) → indexed
                          → failed（可重试）
```

## 5. Prisma 模型

```prisma
model AiAgent {
  id              String   @id @default(uuid())
  name            String
  code            String   @unique
  role            String
  description     String?
  avatarUrl       String?
  color           String?
  capabilities    String?  // JSON
  knowledgeBaseIds String? // JSON
  model           String?
  systemPrompt    String?
  temperature     Decimal  @default(0.7)
  maxTokens       Int      @default(2048)
  status          String   @default("draft")
  allowAutoAction Boolean  @default(false)
  priority        Int      @default(0)
  totalChats      Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?
  version         Int      @default(0)

  @@index([status, priority])
}

model KnowledgeBase {
  id               String   @id @default(uuid())
  title            String
  type             String   // faq / document / url / multimodal
  content          String?
  sourceUrl        String?
  fileUrl          String?
  fileSize         Int?
  mimeType         String?
  agentIds         String?  // JSON
  vectorStatus     String   @default("pending")
  vectorIndexedAt  DateTime?
  chunkCount       Int      @default(0)
  createdBy        String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  deletedAt        DateTime?
}

model AiTodo {
  id          String    @id @default(uuid())
  title       String
  description String?
  agentId     String
  agentName   String
  userId      String
  priority    String    @default("medium")
  status      String    @default("pending")
  dueDate     DateTime?
  completedAt DateTime?
  result      String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId, status])
  @@index([agentId, status])
}
```

## 6. API 接口

### 6.1 智能体
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/ai/agents` | `ai:agents:read` | 列表 |
| GET | `/api/admin/ai/agents/:id` | | 详情 |
| POST | `/api/admin/ai/agents` | `ai:agents:write` | 创建 |
| PUT | `/api/admin/ai/agents/:id` | `ai:agents:write` | 编辑 |
| DELETE | `/api/admin/ai/agents/:id` | `ai:agents:write` | 软删 |
| POST | `/api/admin/ai/agents/:id/online` | `ai:agents:write` | 上线 |
| POST | `/api/admin/ai/agents/:id/offline` | `ai:agents:write` | 下线 |
| POST | `/api/admin/ai/agents/:id/test` | `ai:agents:write` | 测试对话 |
| GET | `/api/admin/ai/agents/:id/stats` | `ai:agents:read` | 对话量 / 满意度 / 解决率 |
| GET | `/api/admin/ai/agents/:id/chats` | `ai:chat:review` | 对话日志列表 |

### 6.2 知识库
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/ai/knowledge` | `ai:knowledge:read` | 列表 |
| GET | `/api/admin/ai/knowledge/:id` | | 详情 |
| POST | `/api/admin/ai/knowledge` | `ai:knowledge:write` | 新增（FAQ / URL） |
| POST | `/api/admin/ai/knowledge/upload` | `ai:knowledge:write` | 上传文件 |
| PUT | `/api/admin/ai/knowledge/:id` | `ai:knowledge:write` | 编辑 |
| DELETE | `/api/admin/ai/knowledge/:id` | `ai:knowledge:write` | 软删 |
| POST | `/api/admin/ai/knowledge/:id/reindex` | `ai:knowledge:write` | 重建索引 |

### 6.3 Todo
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/ai/todos` | `ai:todos:read` | 列表（userId/agentId/priority/status） |
| GET | `/api/admin/ai/todos/:id` | | 详情 |
| POST | `/api/admin/ai/todos` | `ai:todos:write` | 创建 |
| PUT | `/api/admin/ai/todos/:id` | `ai:todos:write` | 编辑 |
| POST | `/api/admin/ai/todos/:id/cancel` | `ai:todos:write` | 取消 |
| POST | `/api/admin/ai/todos/batch/assign` | `ai:todos:write` | 批量指派 |

### 6.4 对话审核
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/ai/chats` | `ai:chat:review` | 对话列表 |
| GET | `/api/admin/ai/chats/:id` | | 对话详情 |
| POST | `/api/admin/ai/chats/:id/takeover` | `ai:chat:review` | 人工接管 |
| POST | `/api/admin/ai/chats/:id/flag` | `ai:chat:review` | 标记违规 |
| POST | `/api/admin/ai/chats/:id/feedback` | `ai:chat:review` | 反馈评分 |

### 6.5 H5 端
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/h5/ai/agents` | AI 大脑页智能体列表（status=online） |
| GET | `/api/h5/ai/todos` | 我的 todo |
| POST | `/api/h5/ai/chat` | 与 agent 对话 |
| GET | `/api/h5/ai/chat/:id` | 获取对话历史 |

## 7. UI 组件

### 7.1 智能体列表
- 卡片视图：头像 / 名称 / 角色 / 状态 / 累计对话
- 筛选：状态 / 能力
- 行操作：编辑 / 上下线 / 测试 / 数据

### 7.2 智能体编辑器
- 左侧：表单（基本信息 + 模型配置 + 提示词）
- 右侧：实时测试窗口（输入即调，输出展示）
- 高级：温度、token 上限、Auto-Action 开关

### 7.3 知识库管理
- 列表：标题 / 类型 / 状态（向量化中/已完成/失败）/ 切片数
- 上传：拖拽上传，限制 ≤ 50MB
- 进度条：向量化实时进度
- 失败重试

### 7.4 对话审核
- 列表：用户 / 智能体 / 起始时间 / 消息数 / 状态
- 详情：左右分栏（用户消息 / AI 回复）
- 接管：直接接管成为客服
- 评分：1-5 星

## 8. 权限

| 操作 | operator | cs | risk | superadmin |
|---|---|---|---|---|
| 查看 agent | ✓ | ✓ | ✓ | ✓ |
| 编辑 agent | ✓ | ✗ | ✗ | ✓ |
| 知识库 | ✓ | ✗ | ✗ | ✓ |
| 对话审核 | ✓ | ✓ | ✓ | ✓ |
| 接管对话 | ✗ | ✓ | ✗ | ✓ |

## 9. i18n

```json
{
  "ai": {
    "title": "AI 大脑",
    "agentStatus": {
      "draft": "草稿",
      "online": "在线",
      "offline": "离线",
      "maintenance": "维护中"
    },
    "vectorStatus": {
      "pending": "处理中",
      "indexed": "已索引",
      "failed": "失败"
    }
  }
}
```

## 10. 验收用例

| # | 用例 | 期望 |
|---|---|---|
| 1 | 新建 agent「AI 选品官」，分配 2 个知识库 | H5 AI 大脑页能看到 |
| 2 | 上传 10MB PDF | 自动切片、向量化 |
| 3 | 上传 60MB 文件 | 拒绝 |
| 4 | 测试对话窗口输入 | 实时输出 |
| 5 | 关闭某 agent.allowAutoAction | H5 端该 agent 推荐按钮消失 |
| 6 | 客服接管对话 | 对话详情显示「客服 XX 接管」 |
| 7 | AI 回复标记违规 | 进入风控审核队列 |
| 8 | 知识库编辑后未 reindex | H5 端 AI 仍返回旧内容 |
| 9 | 知识库 reindex | 状态 → pending → indexed |
| 10 | agent 软删 | H5 端看不到，已有对话仍可查看 |
