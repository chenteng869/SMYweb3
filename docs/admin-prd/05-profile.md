# 05 · 用户管理（含 KYC）

> **对应 H5**：`/profile`（我的）+ `/did-identity`（DID 身份）+ H5 端所有用户登录/注册
> **核心目标**：管理 H5 端所有 C 端用户、审核 KYC、调整 DVC 余额、修改 DLC 等级。

---

## 1. 业务目标

- H5 端所有用户的总览、查询、编辑
- KYC 审核（证件照 + 视频认证）
- 手动调整 DVC 余额（充值/扣减）
- DLC 等级调整（升降级）
- 停用 / 注销账号

## 2. 用户故事

| #    | 故事                                                |
| ---- | --------------------------------------------------- |
| US-1 | 作为客服，我搜索「13800001234」找到用户             |
| US-2 | 作为风控，我审核 KYC，通过 / 驳回                   |
| US-3 | 作为运营，我手动给某用户充值 1000 DVC（活动奖励）   |
| US-4 | 作为超管，我停用某违规用户                          |
| US-5 | 作为客服，我查看用户的「全部订单 + KYC + 资金流水」 |

## 3. 字段定义

### 3.1 User（Dapp 用户）

| 字段                                     | 类型        | 必填 | 说明                                                |
| ---------------------------------------- | ----------- | ---- | --------------------------------------------------- |
| id                                       | String UUID | ✓    |                                                     |
| username                                 | String(60)  |      | 唯一                                                |
| email                                    | String(120) |      | 唯一                                                |
| phone                                    | String(40)  |      | 唯一                                                |
| avatar                                   | String      |      |                                                     |
| walletAddress                            | String      |      | 链上钱包                                            |
| did                                      | String      |      | 唯一，DID 标识                                      |
| kycStatus                                | enum        | ✓    | `not_started` / `pending` / `approved` / `rejected` |
| userLevel                                | Int         | ✓    | DLC 等级 1-5                                        |
| dvcBalance                               | Decimal     |      | DVC 余额                                            |
| usdtBalance                              | Decimal     |      | USDT 余额                                           |
| isActive                                 | Boolean     |      | 是否启用                                            |
| inviteCode                               | String      |      | 邀请码（唯一）                                      |
| inviterId                                | String      |      | 邀请人                                              |
| lastActiveAt                             | DateTime    |      |                                                     |
| lastLoginIp                              | String      |      |                                                     |
| joinDate                                 | DateTime    |      |                                                     |
| name                                     | String      |      | 真实姓名                                            |
| country                                  | String      |      | 国家代码                                            |
| language                                 | String      |      | 偏好语言                                            |
| createdAt, updatedAt, deletedAt, version |             |      | 通用                                                |

### 3.2 KYC（实名认证记录）

| 字段       | 类型     | 说明                                      |
| ---------- | -------- | ----------------------------------------- |
| id         | String   |                                           |
| userId     | String   |                                           |
| status     | enum     | `pending` / `approved` / `rejected`       |
| idType     | enum     | `passport` / `id_card` / `driver_license` |
| idNumber   | String   | 加密存储                                  |
| idFrontUrl | String   | 证件正面                                  |
| idBackUrl  | String   | 证件背面                                  |
| selfieUrl  | String   | 手持证件自拍                              |
| legalName  | String   |                                           |
| birthday   | Date     |                                           |
| address    | String   |                                           |
| country    | String   |                                           |
| reviewedBy | String   | adminUserId                               |
| reviewedAt | DateTime |                                           |
| reviewNote | String   |                                           |
| createdAt  | DateTime |                                           |

### 3.3 DvcTransaction（DVC 流水）

| 字段           | 类型     | 说明                                                      |
| -------------- | -------- | --------------------------------------------------------- |
| id             | String   |                                                           |
| userId         | String   |                                                           |
| type           | enum     | `earn` / `spend` / `reward` / `convert` / `manual_adjust` |
| amount         | Decimal  | 正负值                                                    |
| balanceAfter   | Decimal  | 操作后余额                                                |
| description    | String   |                                                           |
| relatedOrderId | String   | 关联订单                                                  |
| operatorId     | String   | 手动调整：adminUserId                                     |
| createdAt      | DateTime |                                                           |

## 4. 状态机

**KYC**：

```
not_started → pending → approved
                       ↘ rejected (可重提)
```

**User**：

```
isActive: true ↔ false
deletedAt: null → 软删（30 天可恢复）
```

## 5. Prisma 模型

```prisma
model User {
  id            String   @id @default(uuid())
  username      String?  @unique
  email         String?  @unique
  phone         String?  @unique
  avatar        String?
  walletAddress String?
  did           String?  @unique
  kycStatus     String   @default("not_started")
  userLevel     Int      @default(1)
  dvcBalance    Decimal  @default(0)
  usdtBalance   Decimal  @default(0)
  isActive      Boolean  @default(true)
  inviteCode    String?  @unique
  inviterId     String?
  name          String?
  country       String?
  language      String   @default("zh-CN")
  lastActiveAt  DateTime?
  lastLoginIp   String?
  joinDate      DateTime @default(now())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
  version       Int      @default(0)

  kycRecords   KYC[]
  dvcTxs       DvcTransaction[]
  nfts         NFT[]
  transactions Transaction[]
  contents     Content[]

  @@index([phone])
  @@index([email])
  @@index([isActive, userLevel])
}

model KYC {
  id         String    @id @default(uuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id])
  status     String    @default("pending")
  idType     String?
  idNumber   String?
  idFrontUrl String?
  idBackUrl  String?
  selfieUrl  String?
  legalName  String?
  birthday   DateTime?
  address    String?
  country    String?
  reviewedBy String?
  reviewedAt DateTime?
  reviewNote String?
  createdAt  DateTime  @default(now())

  @@index([status, createdAt])
}

model DvcTransaction {
  id             String   @id @default(uuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  type           String   // earn / spend / reward / convert / manual_adjust
  amount         Decimal
  balanceAfter   Decimal
  description    String
  relatedOrderId String?
  operatorId     String?
  createdAt      DateTime @default(now())

  @@index([userId, createdAt])
}
```

## 6. API 接口

### 6.1 用户

| Method | Path                                | 权限                  | 说明                                        |
| ------ | ----------------------------------- | --------------------- | ------------------------------------------- |
| GET    | `/api/admin/users`                  | `users:read`          | 列表（keyword/level/kycStatus/active/时间） |
| GET    | `/api/admin/users/:id`              | `users:read`          | 详情（含 KYC、订单、流水）                  |
| POST   | `/api/admin/users`                  | `users:write`         | 创建（后台代开）                            |
| PUT    | `/api/admin/users/:id`              | `users:write`         | 编辑（昵称/邮箱/手机）                      |
| POST   | `/api/admin/users/:id/active`       | `users:status:change` | 启用                                        |
| POST   | `/api/admin/users/:id/disable`      | `users:status:change` | 停用                                        |
| POST   | `/api/admin/users/:id/level`        | `users:write`         | 修改 DLC 等级                               |
| POST   | `/api/admin/users/:id/dvc/adjust`   | `users:write`         | 手动调整 DVC（必须 reason）                 |
| POST   | `/api/admin/users/:id/dvc/transfer` | `users:write`         | DVC 转账（用户间）                          |
| DELETE | `/api/admin/users/:id`              | `users:write`         | 软删（30 天可恢复）                         |
| POST   | `/api/admin/users/:id/restore`      | `users:write`         | 恢复                                        |
| GET    | `/api/admin/users/export`           | `users:export`        | 导出                                        |

### 6.2 KYC

| Method | Path                                 | 权限                | 说明                        |
| ------ | ------------------------------------ | ------------------- | --------------------------- |
| GET    | `/api/admin/users/kyc`               | `users:read`        | 列表（status=pending 默认） |
| GET    | `/api/admin/users/kyc/:id`           |                     | 详情（含证件图）            |
| POST   | `/api/admin/users/kyc/:id/approve`   | `users:kyc:approve` | 通过                        |
| POST   | `/api/admin/users/kyc/:id/reject`    | `users:kyc:approve` | 驳回（reason 必填）         |
| POST   | `/api/admin/users/kyc/batch/approve` | `users:kyc:approve` | 批量通过                    |

### 6.3 DVC 流水

| Method | Path                              | 权限           | 说明          |
| ------ | --------------------------------- | -------------- | ------------- |
| GET    | `/api/admin/users/:id/dvc/txs`    | `users:read`   | 用户 DVC 流水 |
| GET    | `/api/admin/users/dvc/txs/export` | `users:export` | 导出          |

### 6.4 H5 端

| Method | Path                    | 说明          |
| ------ | ----------------------- | ------------- |
| POST   | `/api/h5/auth/register` | 注册          |
| POST   | `/api/h5/auth/login`    | 登录          |
| POST   | `/api/h5/auth/sms-code` | 短信验证码    |
| GET    | `/api/h5/users/me`      | 我的资料      |
| PUT    | `/api/h5/users/me`      | 修改资料      |
| POST   | `/api/h5/users/me/kyc`  | 提交 KYC      |
| GET    | `/api/h5/users/me/kyc`  | 查看 KYC 状态 |

## 7. UI 组件

### 7.1 用户列表

- 筛选：keyword (姓名/手机/邮箱/DID) / 等级 / KYC 状态 / 启用 / 时间
- 列：头像 / 用户名 / 等级徽章 / 手机 / 邮箱 / DVC / USDT / KYC 状态 / 启用 / 注册时间 / 操作
- 批量：批量启用 / 停用 / 调等级

### 7.2 用户详情（Drawer 4 tab）

- **资料**：基本信息 + 实名信息 + 钱包地址
- **KYC**：KYC 记录 + 证件图查看
- **DVC 流水**：时间线 + 调整按钮
- **订单**：该用户全部订单（公司/银行/支付/订阅）

### 7.3 KYC 审核

- 左侧：证件正面 / 反面 / 手持 / 基本信息
- 右侧：审核操作（通过 / 驳回 / reason）
- 列表：默认只显示 pending

### 7.4 DVC 调整

- 弹窗：金额（正负） / 类型 / reason（必填，最少 10 字）
- 预览：调整后余额
- 二次确认（防误操作）

## 8. 权限

| 操作     | operator | cs  | finance | risk | superadmin |
| -------- | -------- | --- | ------- | ---- | ---------- |
| 查看     | ✓        | ✓   | ✓       | ✓    | ✓          |
| 编辑     | ✓        | ✓   | ✗       | ✗    | ✓          |
| 改等级   | ✗        | ✗   | ✗       | ✗    | ✓          |
| 调 DVC   | ✗        | ✗   | ✓       | ✗    | ✓          |
| 启停     | ✗        | ✓   | ✗       | ✓    | ✓          |
| 软删     | ✗        | ✗   | ✗       | ✓    | ✓          |
| 导出     | ✗        | ✗   | ✓       | ✗    | ✓          |
| KYC 通过 | ✗        | ✓   | ✗       | ✓    | ✓          |

## 9. i18n

```json
{
  "users": {
    "title": "用户管理",
    "kycStatus": {
      "not_started": "未提交",
      "pending": "审核中",
      "approved": "已通过",
      "rejected": "已驳回"
    }
  }
}
```

## 10. 验收用例

| #   | 用例                     | 期望                                             |
| --- | ------------------------ | ------------------------------------------------ |
| 1   | 搜索手机号 13800001234   | 列表筛出                                         |
| 2   | KYC pending → 通过       | User.kycStatus → approved，记录审核人            |
| 3   | KYC 驳回 reason 必填     | 校验失败                                         |
| 4   | 调 DVC +1000 reason 太短 | 拒绝                                             |
| 5   | 调 DVC -1000 后余额变负  | 拒绝（需超管特批）                               |
| 6   | 软删用户                 | 登录 H5 失败，30 天内可恢复                      |
| 7   | DLC 等级 3 → 5           | H5 端立刻显示新等级权益                          |
| 8   | 客服停用用户             | User.isActive=false，H5 端登录提示「账号已停用」 |
| 9   | 批量 KYC 通过 10 条      | 全部 status=approved，写审计                     |
| 10  | 导出 1w 用户 CSV         | 异步下载，邮件通知                               |
