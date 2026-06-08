# 15 · 文档中心（模板 · 归档 · 检索）

> **对应 H5**：`/documents`（文档中心）
> **核心目标**：管理所有用户可见的文档（模板、上传的 PDF、归档）、支持全文检索。

---

## 1. 业务目标

- 多类型文档统一管理（PDF/Word/Markdown/合同/发票）
- 全文检索（标题 + 内容 + 标签）
- 模板库（可下载、可分享）
- 归档与分类

## 2. 用户故事

| # | 故事 |
|---|---|
| US-1 | 作为运营，我上传「萨摩亚注册指南.pdf」 |
| US-2 | 作为客服，我搜索「SPV」找到相关文档 |
| US-3 | 作为用户，我在 H5 端可下载文档 |
| US-4 | 作为超管，我删除过期文档 |

## 3. 字段定义

### 3.1 DocumentCategory（分类）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| name | String | |
| code | String | 唯一 |
| iconUrl | String | |
| parentId | String | 父子 |
| sortWeight | Int | |
| createdAt, updatedAt, deletedAt | | |

### 3.2 Document（文档）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| title | String(200) | ✓ | |
| description | String(500) | | |
| fileUrl | String | ✓ | 存储路径 |
| fileName | String | | 原始文件名 |
| fileSize | Int | | 字节 |
| mimeType | String | | |
| fileHash | String | | SHA-256 去重 |
| type | enum | ✓ | `pdf` / `docx` / `xlsx` / `image` / `video` / `other` |
| categoryId | String | | 分类 |
| tags | String | | JSON 数组 |
| accessLevel | enum | | `public` / `login` / `kyc` / `dlc3` / `dlc5` / `internal` |
| isTemplate | Boolean | | 是否模板 |
| downloadCount | Int | | 累计下载 |
| viewCount | Int | | 累计查看 |
| authorId | String | | |
| authorName | String | | |
| status | enum | ✓ | `draft` / `published` / `archived` |
| publishedAt | DateTime | | |
| expiresAt | DateTime | | 到期自动归档 |
| createdBy, createdAt, updatedAt, deletedAt, version | | | 通用 |

### 3.3 DocumentAccessLog（访问日志）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| documentId | String | |
| userId | String | null = 未登录 |
| action | enum | `view` / `download` / `share` |
| ipAddress | String | |
| createdAt | DateTime | |

## 4. 状态机

```
draft → published → archived
                    ↘ expired（到期自动）
```

## 5. Prisma 模型

```prisma
model DocumentCategory {
  id          String   @id @default(uuid())
  name        String
  code        String   @unique
  iconUrl     String?
  parentId    String?
  sortWeight  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
}

model Document {
  id            String   @id @default(uuid())
  title         String
  description   String?
  fileUrl       String
  fileName      String?
  fileSize      Int      @default(0)
  mimeType      String?
  fileHash      String?
  type          String
  categoryId    String?
  tags          String?  // JSON
  accessLevel   String   @default("login")
  isTemplate    Boolean  @default(false)
  downloadCount Int      @default(0)
  viewCount     Int      @default(0)
  authorId      String?
  authorName    String?
  status        String   @default("draft")
  publishedAt   DateTime?
  expiresAt     DateTime?
  createdBy     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
  version       Int      @default(0)

  accessLogs DocumentAccessLog[]

  @@index([status, publishedAt])
  @@index([categoryId, status])
  @@index([fileHash])
}

model DocumentAccessLog {
  id         String   @id @default(uuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id])
  userId     String?
  action     String   // view / download / share
  ipAddress  String?
  createdAt  DateTime @default(now())

  @@index([documentId, createdAt])
}
```

## 6. API 接口

### 6.1 分类
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/documents/categories` | `documents:read` | 列表（含子分类） |
| POST | `/api/admin/documents/categories` | `documents:write` | 新增 |
| PUT | `/api/admin/documents/categories/:id` | `documents:write` | 编辑 |
| DELETE | `/api/admin/documents/categories/:id` | `documents:write` | 软删 |

### 6.2 文档
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/documents` | `documents:read` | 列表（category/type/status/keyword/时间） |
| GET | `/api/admin/documents/:id` | | 详情（含下载链接） |
| POST | `/api/admin/documents/upload` | `documents:write` | 上传（multipart） |
| PUT | `/api/admin/documents/:id` | `documents:write` | 编辑 |
| POST | `/api/admin/documents/:id/publish` | `documents:write` | 发布 |
| POST | `/api/admin/documents/:id/archive` | `documents:write` | 归档 |
| POST | `/api/admin/documents/:id/duplicate` | `documents:write` | 复制 |
| DELETE | `/api/admin/documents/:id` | `documents:write` | 软删 |
| GET | `/api/admin/documents/:id/access-logs` | `documents:read` | 访问日志 |
| GET | `/api/admin/documents/export` | `documents:export` | 导出 |

### 6.3 H5 端
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/h5/documents` | 列表（仅 status=published） |
| GET | `/api/h5/documents/:id` | 详情 |
| GET | `/api/h5/documents/:id/download` | 下载（写访问日志） |
| GET | `/api/h5/documents/search` | 搜索（keyword + tag） |
| GET | `/api/h5/documents/categories` | 分类树 |

## 7. UI 组件

### 7.1 分类管理
- 树形列表（支持拖拽）
- 弹窗编辑

### 7.2 文档列表
- 列表 / 网格切换
- 筛选：分类、类型、状态、关键词
- 列：标题 / 类型 / 分类 / 状态 / 下载数 / 访问数 / 操作

### 7.3 文档编辑器
- 拖拽上传（支持批量）
- 元数据：标题、描述、标签、分类、访问级别
- 权限预览（不同等级看到的）

### 7.4 访问日志
- 列表：用户 / 操作 / 时间 / IP
- 导出

## 8. 权限

| 操作 | operator | cs | superadmin |
|---|---|---|---|
| 查看 | ✓ | ✓ | ✓ |
| 上传/编辑 | ✓ | ✓ | ✓ |
| 分类管理 | ✗ | ✗ | ✓ |
| 删除 | ✓ | ✗ | ✓ |
| 导出 | ✓ | ✓ | ✓ |

## 9. i18n

```json
{
  "documents": {
    "title": "文档中心",
    "type": {
      "pdf": "PDF",
      "docx": "Word",
      "xlsx": "Excel",
      "image": "图片",
      "video": "视频"
    },
    "accessLevel": {
      "public": "公开",
      "login": "需登录",
      "kyc": "需 KYC",
      "dlc3": "DLC 3+",
      "dlc5": "DLC 5",
      "internal": "内部"
    }
  }
}
```

## 10. 验收用例

| # | 用例 | 期望 |
|---|---|---|
| 1 | 上传 50MB PDF | 自动转存到 OSS |
| 2 | 上传重复文件 | 检测 hash 复用，不重复存储 |
| 3 | 公开文档，H5 未登录用户可下载 | 返回签名 URL |
| 4 | DLC 5 文档，DLC 3 用户下载 | 403 |
| 5 | 全文搜索「SPV」 | 命中标题/描述/标签 |
| 6 | 文档到期自动归档 | 定时任务执行 |
| 7 | 删除文档 | 列表消失，已生成的下载链接失效 |
| 8 | 复制文档 | 创建新 ID，引用同一文件 |
| 9 | 访问日志 | 用户/操作/时间/IP 全记录 |
| 10 | 模板库 | H5 端可下载，无水印 |
