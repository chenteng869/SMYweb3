# 06-07 - 后端/前端项目结构

> **来源**: MVP版本-DID制作文档.md (第2460~2884行)

---

## 六、NestJS后端项目结构

### 6.1 目录树

```
did-backend/
├── src/
│   ├── main.ts                          # 应用入口
│   ├── app.module.ts                    # 根模块
│   │
│   ├── common/                         # 公共模块
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── permissions.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── permission.guard.ts
│   │   ├── interceptors/
│   │   │   └── audit-log.interceptor.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   └── utils/
│   │       ├── crypto.util.ts           # 加密工具
│   │       ├── hash.util.ts             # SHA256哈希
│   │       └── did.util.ts             # DID生成工具
│   │
│   └── modules/                        # 业务模块
│       ├── auth/                       # 认证模块
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts       # /api/did/auth/*
│       │   ├── auth.service.ts
│       │   ├── jwt.strategy.ts
│       │   └── dto/
│       │       ├── wallet-login.dto.ts
│       │       └── register.dto.ts
│       │
│       ├── users/                      # 用户模块
│       │   ├── users.module.ts
│       │   ├── users.controller.ts
│       │   ├── users.service.ts
│       │   └── dto/
│       │
│       ├── did/                        # DID身份模块 ⭐ 核心
│       │   ├── did.module.ts
│       │   ├── did.controller.ts        # /api/did/{did} CRUD
│       │   ├── did.service.ts
│       │   ├── did.repository.ts
│       │   └── dto/
│       │       ├── create-did.dto.ts
│       │       └── update-did.dto.ts
│       │
│       ├── wallets/                    # 钱包模块
│       │   ├── wallets.module.ts
│       │   ├── wallets.controller.ts    # /api/did/wallets/*
│       │   ├── wallets.service.ts
│       │   └── dto/
│       │       ├── bind-wallet.dto.ts
│       │       └── nonce-response.dto.ts
│       │
│       ├── kyc/                        # KYC模块
│       │   ├── kyc.module.ts
│       │   ├── kyc.controller.ts        # /api/did/kyc/*
│       │   ├── kyc.service.ts
│       │   └── dto/
│       │
│       ├── sbt/                        # SBT凭证模块
│       │   ├── sbt.module.ts
│       │   ├── sbt.controller.ts        # /api/did/sbt/*
│       │   ├── sbt.service.ts
│       │   └── dto/
│       │
│       ├── platform-access/            # 平台权限模块
│       │   ├── platform-access.module.ts
│       │   ├── platform-access.controller.ts  # /api/did/platform-access
│       │   └── platform-access.service.ts
│       │
│       ├── audit/                      # 审计日志模块
│       │   ├── audit.module.ts
│       │   ├── audit.controller.ts      # /api/did/audit/*
│       │   └── audit.service.ts
│       │
│       ├── bpm/                        # BPM审批对接
│       │   ├── bpm.module.ts
│       │   ├── bpm.service.ts
│       │   └── bpm.controller.ts
│       │
│       ├── n8n/                        # n8n自动化对接
│       │   ├── n8n.module.ts
│       │   └── n8n.service.ts
│       │
│       └── blockchain/                # 区块链合约交互
│           ├── blockchain.module.ts
│           ├── blockchain.service.ts
│           └── contracts/
│               ├── did-registry.abi.json
│               └── sbt.abi.json
│
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── test/                                # 测试
│   ├── did.e2e-spec.ts
│   ├── wallet-login.e2e-spec.ts
│   └── sbt.e2e-spec.ts
│
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

### 6.2 模块职责清单

| 模块            | 路由前缀                   | 职责                                    |
| --------------- | -------------------------- | --------------------------------------- |
| auth            | `/api/did/auth`            | JWT登录、钱包签名登录、Nonce管理        |
| users           | `/api/did/users`           | 用户CRUD、用户信息管理                  |
| did             | `/api/did`                 | DID注册、查询、激活、冻结、撤销         |
| wallets         | `/api/did/wallets`         | 钱包绑定/解绑、Nonce生成/验证           |
| kyc             | `/api/did/kyc`             | KYC申请、资料上传、状态查询、第三方回调 |
| sbt             | `/api/did/sbt`             | SBT签发、撤销、列表查询                 |
| platform-access | `/api/did/platform-access` | 四平台权限查询、授权管理                |
| audit           | `/api/did/audit`           | 审计日志查询、导出                      |
| bpm             | `/api/did/bpm`             | BPM审批流创建/查询/回调                 |
| n8n             | `/api/did/n8n`             | n8n Webhook接收/发送                    |
| blockchain      | 内部                       | 合约交互(DIDRegistry/ZSDTSBT)、链上读写 |

---

## 七、Next.js前端项目结构

### 7.1 目录树

```
did-portal/
├── app/
│   ├── page.tsx                         # DID官网首页
│   ├── layout.tsx                       # Root Layout (RainbowKit Provider)
│   │
│   ├── (auth)/                          # 认证路由组
│   │   ├── register/
│   │   │   └── page.tsx                 # 注册DID页面
│   │   └── login/
│   │       └── page.tsx                 # 钱包登录页面
│   │
│   ├── (dashboard)/                     # 已登录路由组 (需要AuthGuard)
│   │   ├── dashboard/
│   │   │   └── page.tsx                 # DID仪表盘首页
│   │   ├── wallets/
│   │   │   └── page.tsx                 # 钱包管理页面
│   │   ├── kyc/
│   │   │   └── page.tsx                 # KYC认证页面
│   │   ├── credentials/
│   │   │   └── page.tsx                 # SBT凭证页面
│   │   ├── ecosystem/
│   │   │   └── page.tsx                 # 四平台入口
│   │   └── settings/
│   │       └── page.tsx                 # 设置页面
│   │
│   └── (admin)/                         # 管理后台路由组 (需要AdminGuard)
│       ├── did/
│       │   └── page.tsx                 # DID管理列表
│       ├── kyc/
│       │   └── page.tsx                 # KYC审核队列
│       ├── sbt/
│       │   └── page.tsx                 # SBT签发管理
│       └── audit/
│           └── page.tsx                 # 审计日志查看
│
├── components/
│   ├── WalletConnectButton.tsx          # 钱包连接/登录按钮
│   ├── DIDCard.tsx                      # DID身份卡片组件
│   ├── KYCStatusCard.tsx               # KYC状态展示组件
│   ├── SBTList.tsx                      # SBT凭证列表组件
│   ├── PlatformAccessCard.tsx          # 平台权限展示组件
│   ├── WalletList.tsx                  # 钱包列表组件
│   ├── AuditLogTable.tsx               # 审计日志表格
│   └── layout/
│       ├── Header.tsx                  # 顶部导航
│       ├── Sidebar.tsx                 # 侧边栏
│       └── Footer.tsx                  # 底部
│
├── lib/
│   ├── wagmi.ts                         # Wagmi/RainbowKit 配置
│   ├── api.ts                           # API客户端封装
│   ├── auth.ts                          # 认证工具(Token存储/读取/清除)
│   └── constants.ts                     # 常量定义(SBT类型/DID状态等)
│
├── hooks/
│   ├── useDID.ts                        # DID数据Hook
│   ├── useWalletLogin.ts               # 钱包登录Hook
│   ├── useKYC.ts                        # KYC状态Hook
│   └── useSBT.ts                        # SBT凭证Hook
│
├── types/
│   ├── did.ts                          # DID相关类型定义
│   ├── wallet.ts                       # 钱包相关类型定义
│   ├── kyc.ts                          # KYC相关类型定义
│   └── sbt.ts                          # SBT相关类型定义
│
├── public/
│   └── icons/                          # 静态图标资源
│
├── next.config.js
├── tailwind.config.ts
├── package.json
└── README.md
```

### 7.2 页面说明

| 页面路由       | 功能                           | 需要登录 | 需要管理员 |
| -------------- | ------------------------------ | -------- | ---------- |
| `/`            | DID官网首页                    | 否       | 否         |
| `/register`    | 注册DID                        | 否       | 否         |
| `/login`       | 钱包签名登录                   | 否       | 否         |
| `/dashboard`   | DID身份首页                    | 是       | 否         |
| `/wallets`     | 钱包管理（绑定/解绑/设主钱包） | 是       | 否         |
| `/kyc`         | KYC认证（提交资料/查看状态）   | 是       | 否         |
| `/credentials` | SBT凭证列表                    | 是       | 否         |
| `/ecosystem`   | 四平台入口（电商/交易所/博彩） | 是       | 否         |
| `/settings`    | 个人设置                       | 是       | 否         |
| `/admin/did`   | DID管理列表（搜索/冻结/解冻）  | 是       | 是         |
| `/admin/kyc`   | KYC审核队列（通过/驳回）       | 是       | 是         |
| `/admin/sbt`   | SBT签发管理（手动签发/撤销）   | 是       | 是         |
| `/admin/audit` | 审计日志查看/导出              | 是       | 是         |

---

_下一节_: [08-n8n-workflows.md](./08-n8n-workflows.md) — n8n自动化工作流
