# 16 · 系统设置（全局配置 · 版本 · 角色）

> **对应 H5**：`/settings`（设置）
> **核心目标**：管理全局系统配置（税率、限流、App 版本、角色权限、字典维护）。

---

## 1. 业务目标

- 集中管理所有「系统级」配置
- 角色权限动态调整
- App 版本灰度发布
- 字典维护
- 系统开关（维护模式/注册开关等）

## 2. 用户故事

| #    | 故事                                           |
| ---- | ---------------------------------------------- |
| US-1 | 作为超管，我打开「维护模式」拦截所有 H5 请求   |
| US-2 | 作为超管，我调整某角色权限（运营加 AI 知识库） |
| US-3 | 作为运营，我修改「客服电话」配置               |
| US-4 | 作为超管，我灰度发布 H5 1.2.0 给 10% 用户      |

## 3. 字段定义

### 3.1 SystemConfig（系统配置 KV）

| 字段                                     | 类型        | 必填 | 说明                                               |
| ---------------------------------------- | ----------- | ---- | -------------------------------------------------- |
| id                                       | String      | ✓    |                                                    |
| key                                      | String(120) | ✓    | 唯一配置 key                                       |
| value                                    | String      | ✓    | JSON 值                                            |
| type                                     | enum        | ✓    | `string` / `number` / `boolean` / `json` / `array` |
| category                                 | String(40)  | ✓    | 分组                                               |
| description                              | String      |      | 描述                                               |
| isPublic                                 | Boolean     |      | 是否 H5 端可读                                     |
| isEditable                               | Boolean     |      | 是否可在后台修改                                   |
| validation                               | String      |      | JSON 校验规则                                      |
| createdAt, updatedAt, deletedAt, version |             |      | 通用                                               |

### 3.2 AppVersion（App 版本）

| 字段                            | 类型       | 必填 | 说明                                                |
| ------------------------------- | ---------- | ---- | --------------------------------------------------- |
| id                              | String     | ✓    |                                                     |
| platform                        | enum       | ✓    | `ios` / `android` / `h5`                            |
| version                         | String(40) | ✓    | 如 1.2.0                                            |
| buildNumber                     | Int        |      | 构建号                                              |
| minSupportedVersion             | String     |      | 最低支持版本                                        |
| forceUpdate                     | Boolean    |      | 强制升级                                            |
| updateUrl                       | String     |      | App Store / Google Play                             |
| releaseNotes                    | Text       |      | 更新日志                                            |
| rolloutPercent                  | Int        |      | 灰度比例 0-100                                      |
| status                          | enum       | ✓    | `draft` / `released` / `rolling_out` / `deprecated` |
| releasedAt                      | DateTime   |      |                                                     |
| createdBy, createdAt, updatedAt |            |      | 通用                                                |

### 3.3 DictionaryItem（字典项）

| 字段                            | 类型    | 说明        |
| ------------------------------- | ------- | ----------- |
| id                              | String  |             |
| dictType                        | String  | 字典类型    |
| code                            | String  | 值          |
| label                           | String  | 显示名      |
| translations                    | String  | JSON 多语言 |
| sortWeight                      | Int     |             |
| enabled                         | Boolean |             |
| createdAt, updatedAt, deletedAt |         |             |

### 3.4 MaintenanceMode（维护模式）

| 字段         | 类型     | 说明                 |
| ------------ | -------- | -------------------- |
| id           | String   |                      |
| enabled      | Boolean  |                      |
| startAt      | DateTime |                      |
| endAt        | DateTime |                      |
| allowedRoles | String   | JSON：哪些角色可绕过 |
| message      | Text     | 维护提示             |
| platforms    | String   | JSON 平台数组        |

## 4. Prisma 模型

```prisma
model SystemConfig {
  id          String   @id @default(uuid())
  key         String   @unique
  value       String   // JSON
  type        String
  category    String
  description String?
  isPublic    Boolean  @default(false)
  isEditable  Boolean  @default(true)
  validation  String?  // JSON
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  version     Int      @default(0)
}

model AppVersion {
  id                  String   @id @default(uuid())
  platform            String
  version             String
  buildNumber         Int?
  minSupportedVersion String?
  forceUpdate         Boolean  @default(false)
  updateUrl           String?
  releaseNotes        String?
  rolloutPercent      Int      @default(0)
  status              String   @default("draft")
  releasedAt          DateTime?
  createdBy           String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([platform, version])
}

model DictionaryItem {
  id           String   @id @default(uuid())
  dictType     String
  code         String
  label        String
  translations String?  // JSON
  sortWeight   Int      @default(0)
  enabled      Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?

  @@unique([dictType, code])
}

model MaintenanceMode {
  id            String   @id @default(uuid())
  enabled       Boolean  @default(false)
  startAt       DateTime?
  endAt         DateTime?
  allowedRoles  String?  // JSON
  message       String?
  platforms     String?  // JSON
  updatedBy     String?
  updatedAt     DateTime @updatedAt
}
```

## 5. API 接口

### 5.1 系统配置

| Method | Path                                | 权限             | 说明                      |
| ------ | ----------------------------------- | ---------------- | ------------------------- |
| GET    | `/api/admin/settings/configs`       | `settings:read`  | 列表（category）          |
| GET    | `/api/admin/settings/configs/:key`  |                  | 详情                      |
| PUT    | `/api/admin/settings/configs/:key`  | `settings:write` | 修改（写审计）            |
| POST   | `/api/admin/settings/configs/batch` | `settings:write` | 批量修改                  |
| GET    | `/api/h5/settings/configs`          | H5               | 公开配置（isPublic=true） |

### 5.2 角色管理

| Method | Path                                    | 权限                   | 说明                   |
| ------ | --------------------------------------- | ---------------------- | ---------------------- |
| GET    | `/api/admin/settings/roles`             | `settings:read`        | 列表                   |
| GET    | `/api/admin/settings/roles/:id`         |                        | 详情（permissions）    |
| POST   | `/api/admin/settings/roles`             | `settings:roles:write` | 新增                   |
| PUT    | `/api/admin/settings/roles/:id`         | `settings:roles:write` | 编辑（含权限）         |
| DELETE | `/api/admin/settings/roles/:id`         | `settings:roles:write` | 删除（若有用户，拒绝） |
| GET    | `/api/admin/settings/roles/permissions` | `settings:read`        | 全部权限点列表         |

### 5.3 App 版本

| Method | Path                                           | 权限             | 说明     |
| ------ | ---------------------------------------------- | ---------------- | -------- |
| GET    | `/api/admin/settings/app-versions`             | `settings:read`  | 列表     |
| POST   | `/api/admin/settings/app-versions`             | `settings:write` | 新增     |
| PUT    | `/api/admin/settings/app-versions/:id`         | `settings:write` | 编辑     |
| POST   | `/api/admin/settings/app-versions/:id/release` | `settings:write` | 发布     |
| POST   | `/api/admin/settings/app-versions/:id/rollout` | `settings:write` | 调整灰度 |

### 5.4 字典

| Method | Path                                   | 权限             | 说明                     |
| ------ | -------------------------------------- | ---------------- | ------------------------ |
| GET    | `/api/admin/settings/dictionaries`     | `settings:read`  | 列表（按 dictType 分组） |
| POST   | `/api/admin/settings/dictionaries`     | `settings:write` | 新增                     |
| PUT    | `/api/admin/settings/dictionaries/:id` | `settings:write` | 编辑                     |
| DELETE | `/api/admin/settings/dictionaries/:id` | `settings:write` | 软删                     |
| GET    | `/api/h5/settings/dictionaries/:type`  | H5               | 字典查询（按 locale）    |

### 5.5 维护模式

| Method | Path                              | 权限             | 说明         |
| ------ | --------------------------------- | ---------------- | ------------ |
| GET    | `/api/admin/settings/maintenance` | `settings:read`  | 当前状态     |
| PUT    | `/api/admin/settings/maintenance` | `settings:write` | 开启/关闭    |
| GET    | `/api/h5/settings/maintenance`    | H5               | 当前是否维护 |

## 6. UI 组件

### 6.1 系统配置

- Tabs 按 category 分组
- 列表 + 弹窗编辑
- 校验提示（实时）

### 6.2 角色管理

- 列表：角色名 / 描述 / 用户数 / 权限数
- 编辑器：权限树（按模块分组，全选/部分选）

### 6.3 App 版本

- 平台切换 Tabs
- 列表：版本 / 构建号 / 强制升级 / 灰度 / 状态
- 发布向导：版本号 / 升级 URL / 更新日志 / 灰度比例

### 6.4 字典

- 左侧 dictType 树
- 右侧表格：code / label / 多语言 / 启用

### 6.5 维护模式

- 单卡片
- 开关 + 时间 + 提示文案 + 允许角色

## 7. 权限

| 操作     | operator | superadmin |
| -------- | -------- | ---------- |
| 查看配置 | ✓        | ✓          |
| 修改配置 | ✗        | ✓          |
| 修改角色 | ✗        | ✓          |
| 维护模式 | ✗        | ✓          |
| 字典     | ✗        | ✓          |

## 8. i18n

```json
{
  "settings": {
    "title": "系统设置",
    "configCategory": {
      "general": "基础",
      "payment": "支付",
      "ai": "AI",
      "notification": "通知"
    }
  }
}
```

## 9. 验收用例

| #   | 用例                           | 期望                               |
| --- | ------------------------------ | ---------------------------------- |
| 1   | 开启维护模式                   | H5 端所有请求被拦截，显示维护页    |
| 2   | 客服电话配置修改               | H5 端下次读取拿到新值（缓存 5min） |
| 3   | 编辑运营角色，加 AI 知识库权限 | 运营用户立刻可访问                 |
| 4   | 删除有用户的角色               | 拒绝                               |
| 5   | 发布 H5 1.2.0，灰度 10%        | 10% 用户收到升级提示               |
| 6   | 调整灰度到 50%                 | 更多用户收到                       |
| 7   | 强制升级打开                   | 旧版本用户必须升级                 |
| 8   | 字典 status.PENDING 翻译       | H5 端按 locale 翻译                |
| 9   | 公开配置 H5 可读               | 私密配置 H5 端 404                 |
| 10  | 修改配置写审计                 | AuditLog 记录 old/new              |
