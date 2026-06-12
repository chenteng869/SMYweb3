# WOPC 创业家 管理员后台 全新独立开发 实施计划

> **For agentic workers:** 必需子技能: superpowers:subagent-driven-development(推荐) 或 superpowers:executing-plans。
> Steps 使用 checkbox (`- [ ]`) 语法追踪进度。
>
> ⚠️ **本计划替代** 上一版 `2026-06-07-admin-backend-wopc.md`(已废弃)。
> ⚠️ **admin-web-legacy 不再开发**;只保留作为历史参考。

**Goal:** 从零独立开发一套 **WOPC 创业家** 管理员后台,严格匹配 H5 业务(萨摩亚SPV、海购星Dapp、AI 大脑、直播/短视频、DAO、跨境支付、税务、DLC 等级),10 大模块 30+ 页面,API + 路由 + 数据库 + AI 全部严格到位。

**Architecture:**

- `apps/admin-app/`(新建) — **管理后台前端**,Vite 7 + React 19 + shadcn/ui + Tailwind 3.4 + Zustand 5 + React Router 6.28 + recharts + axios + zod
- `apps/admin-api/`(新建) — **管理后台后端**,NestJS 10 + Prisma 5 + PostgreSQL 16 + Redis 7 + JWT 鉴权 + RBAC + Swagger
- **完全独立**于 h5-app(独立端口、独立包、独立鉴权)
- 端口:admin-app = **4001**,admin-api = **4000**,PostgreSQL = **5432**,Redis = **6379**
- 鉴权:**admin 独立 JWT**(独立 secret、独立 login 页、admin 表与 h5 user 表无关)
- 数据:后端就绪后,admin 调真实 API;开发期用 Prisma + seed 脚本初始化 mock 数据

**Tech Stack(选定):**

- 前端:React 19.2 + TypeScript 5.9 + Vite 7.3 + Tailwind 3.4 + shadcn/ui + Zustand 5 + React Router 6.28 + recharts + axios + zod + sonner
- 后端:NestJS 10 + Prisma 5 + PostgreSQL 16 + Redis 7 + JWT(@nestjs/jwt) + bcrypt + Swagger + class-validator + class-transformer
- 工具:pnpm monorepo + turbo / npm workspaces

**10 大模块清单:**

| #   | 模块                    | 路由                            | 核心实体                                          |
| --- | ----------------------- | ------------------------------- | ------------------------------------------------- |
| 1   | **Dashboard 总览**      | `/admin/dashboard`              | KPI 卡片 / 趋势图 / 流水表                        |
| 2   | **用户管理**            | `/admin/users`                  | `User`(含 H5 端同步)、KYC、邀请层级               |
| 3   | **公司管理**            | `/admin/companies`              | `Company`(萨摩亚SPV/香港/新加坡/BVI/开曼)、订单   |
| 4   | **AI 智能体**           | `/admin/ai-agents`              | `AiAgent` 10 个、知识库、调用日志                 |
| 5   | **跨境支付**            | `/admin/payments`               | `PaymentOrder`、汇率、银行通道                    |
| 6   | **直播管理**            | `/admin/livestreams`            | `Livestream` 房间、PK 记录、礼物流水              |
| 7   | **短视频/UGC**          | `/admin/short-videos`           | `ShortVideo`、审核、举报处理                      |
| 8   | **DAO 社区**            | `/admin/dao`                    | `DaoProposal`、投票、奖励发放                     |
| 9   | **税务数据库**          | `/admin/taxes`                  | `TaxRate`(国家/地区)、DVSF 分红池                 |
| 10  | **DLC 等级 & 系统设置** | `/admin/dlc`、`/admin/settings` | `DlcLevel` 配置、Admin 账号、审计日志、服务器状态 |

---

## 📁 目录结构

```
SMYweb3.020260527/
├── apps/
│   ├── h5-app/                              # 现有,不动
│   ├── admin-web-legacy/                    # 停更,仅参考
│   ├── admin-app/                           # 新建 ← 本计划
│   │   ├── src/
│   │   │   ├── api/                         # axios 客户端 + 类型
│   │   │   │   ├── client.ts                # axios 实例 + interceptor
│   │   │   │   └── types.ts                 # 响应/请求类型
│   │   │   ├── components/
│   │   │   │   ├── layout/                  # AdminLayout / Sidebar / Header
│   │   │   │   ├── ui/                      # shadcn/ui 组件
│   │   │   │   └── common/                  # DataTable / StatCard / PageHeader / FilterBar / ConfirmDialog
│   │   │   ├── pages/
│   │   │   │   ├── auth/                    # Login.tsx / ForgotPassword.tsx
│   │   │   │   └── admin/                   # 10 大模块
│   │   │   │       ├── Dashboard.tsx
│   │   │   │       ├── users/               # List / Detail / Kyc
│   │   │   │       ├── companies/           # List / Detail / Orders
│   │   │   │       ├── ai-agents/           # List / Detail / Knowledge
│   │   │   │       ├── payments/            # List / Detail / Currencies
│   │   │   │       ├── livestreams/         # List / Detail
│   │   │   │       ├── short-videos/        # List / Audit / Reports
│   │   │   │       ├── dao/                 # Proposals / Members / Rewards
│   │   │   │       ├── taxes/               # TaxRates / DividendPool
│   │   │   │       ├── dlc/                 # Levels / Config
│   │   │   │       └── settings/            # Admins / Roles / AuditLogs / Server
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts                  # JWT 解析 / 守卫
│   │   │   │   ├── format.ts                # 数字/日期格式化
│   │   │   │   └── constants.ts             # 菜单 / 路由常量
│   │   │   ├── store/
│   │   │   │   ├── authSlice.ts             # admin 独立鉴权(Zustand persist)
│   │   │   │   └── uiSlice.ts               # sidebar 折叠 / 主题
│   │   │   ├── router.tsx                   # React Router 配置
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── components.json                  # shadcn/ui
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── .env.example
│   └── admin-api/                           # 新建 ← 本计划
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── prisma/                      # PrismaService
│       │   ├── common/
│       │   │   ├── guards/                  # JwtAuthGuard / RolesGuard
│       │   │   ├── decorators/              # @CurrentUser / @Roles
│       │   │   ├── filters/                 # 全局异常
│       │   │   └── interceptors/            # 响应格式化
│       │   ├── modules/
│       │   │   ├── auth/                    # 登录 / 刷新 / 登出
│       │   │   ├── users/
│       │   │   ├── companies/
│       │   │   ├── ai-agents/
│       │   │   ├── payments/
│       │   │   ├── livestreams/
│       │   │   ├── short-videos/
│       │   │   ├── dao/
│       │   │   ├── taxes/
│       │   │   ├── dlc/
│       │   │   ├── settings/
│       │   │   └── dashboard/
│       │   └── seed/                        # seed 脚本
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── seed.ts
│       ├── test/
│       ├── nest-cli.json
│       ├── tsconfig.json
│       ├── package.json
│       └── .env.example
├── package.json                             # monorepo 根
├── pnpm-workspace.yaml                      # (若用 pnpm)
└── docs/superpowers/plans/
    └── 2026-06-07-admin-from-scratch.md    # 本文件
```

---

## 🎯 用户决策摘要(已确认)

| 决策点   | 选择                                                                                          |
| -------- | --------------------------------------------------------------------------------------------- |
| 代码位置 | **新建独立 admin-app**(与 h5-app 平行,不耦合)                                                 |
| 后端     | **同时开发后端**(本计划) — NestJS + Prisma + PostgreSQL + Redis                               |
| 鉴权     | **admin 独立 JWT**(独立表/secret/login)                                                       |
| 菜单范围 | **10 大模块**                                                                                 |
| 测试     | **不引入 Vitest(黄区警告)**,用 `tsc --noEmit` + `nest build` + `tsc --noEmit` + 后端集成 curl |

---

## 📋 17 个 Phase × ~50 个 Task 总览

| Phase          | 内容                                             | Tasks                |
| -------------- | ------------------------------------------------ | -------------------- |
| **Phase 0**    | Monorepo 脚手架                                  | 3                    |
| **Phase 1**    | admin-api 基础(NestJS + Prisma + JWT + RBAC)     | 6                    |
| **Phase 2**    | admin-app 脚手架(Vite + React 19 + shadcn/ui)    | 5                    |
| **Phase 3**    | admin-app 鉴权(Login + AuthGuard + 路由)         | 4                    |
| **Phase 4**    | AdminLayout 桌面布局(Sidebar + Header + Content) | 3                    |
| **Phase 5**    | Dashboard 总览                                   | 2                    |
| **Phase 6-15** | 10 大模块各 1 个 Phase(Schema + API + 页面)      | 每个 Phase 3-4 tasks |
| **Phase 16**   | 集成验证                                         | 2                    |
| **总计**       |                                                  | ~50                  |

---

# Phase 0: Monorepo 脚手架 (3 tasks)

### T0.1: 在 monorepo 根配置 workspaces

**Files:**

- Modify: `package.json`(根)
- Create: `pnpm-workspace.yaml`

- [ ] **Step 1: 读根 package.json**

```bash
cat package.json
```

- [ ] **Step 2: 决定用 npm 还是 pnpm**
- 默认用 **npm workspaces**(无需额外安装)
- 在 `package.json` 根加:

```json
{
  "workspaces": ["apps/*"]
}
```

- [ ] **Step 3: 验证**

```bash
npm ls --workspaces --depth=0
# 期望:列出 h5-app, admin-web-legacy(若 workspaces 已含)
```

**验收标准:** 根 package.json 有 `"workspaces": ["apps/*"]`,`npm ls` 列出所有 apps

---

### T0.2: 创建 admin-app 包结构

**Files:**

- Create: `apps/admin-app/package.json`
- Create: `apps/admin-app/tsconfig.json`
- Create: `apps/admin-app/tsconfig.node.json`
- Create: `apps/admin-app/vite.config.ts`
- Create: `apps/admin-app/index.html`
- Create: `apps/admin-app/.env.example`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p apps/admin-app/src
```

- [ ] **Step 2: package.json**(用与 h5-app 相同核心栈)

```json
{
  "name": "@wopc/admin-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 4001 --host",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview --port 4001",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-avatar": "^1.1.1",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.1",
    "@radix-ui/react-tooltip": "^1.1.3",
    "axios": "^1.7.7",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.456.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^6.28.0",
    "recharts": "^2.13.0",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.5.4",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.23.8",
    "zustand": "^5.0.1"
  },
  "devDependencies": {
    "@types/node": "^22.9.0",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.9.3",
    "vite": "^7.3.5"
  }
}
```

- [ ] **Step 3: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 4: vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 4001,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
```

- [ ] **Step 5: index.html + tailwind/postcss + .env.example**

```html
<!-- index.html -->
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WOPC 创业家 · 管理后台</title>
  </head>
  <body class="bg-bg-dark text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```env
# .env.example
VITE_API_BASE_URL=http://localhost:4000/api
```

- [ ] **Step 6: 安装依赖**

```bash
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527"
npm install
```

- [ ] **Step 7: 验证**

```bash
cd apps/admin-app
npx tsc --noEmit
# 期望:无 error(尚无 src 代码)
```

**验收标准:** `npm install` 在根目录安装所有 workspace,`apps/admin-app` 编译通过

---

### T0.3: 创建 admin-api 包结构

**Files:**

- Create: `apps/admin-api/package.json`
- Create: `apps/admin-api/tsconfig.json`
- Create: `apps/admin-api/nest-cli.json`
- Create: `apps/admin-api/.env.example`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p apps/admin-api/src apps/admin-api/prisma
```

- [ ] **Step 2: package.json**

```json
{
  "name": "@wopc/admin-api",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"src/**/*.ts\" --fix",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.6",
    "@nestjs/config": "^3.2.3",
    "@nestjs/core": "^10.4.6",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.4.6",
    "@nestjs/swagger": "^7.4.2",
    "@prisma/client": "^5.22.0",
    "bcrypt": "^5.1.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "redis": "^4.7.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.7",
    "@nestjs/schematics": "^10.2.3",
    "@types/bcrypt": "^5.0.2",
    "@types/express": "^5.0.0",
    "@types/node": "^22.9.0",
    "@types/passport-jwt": "^4.0.1",
    "prisma": "^5.22.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 3: tsconfig.json + nest-cli.json + .env.example**

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

```json
// nest-cli.json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

```env
# .env.example
DATABASE_URL=postgresql://wopc:wopc_dev_password@localhost:5432/wopc_admin?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-only-secret-change-in-prod-min-32-chars
JWT_EXPIRES_IN=7d
PORT=4000
```

- [ ] **Step 4: 安装依赖**

```bash
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527"
npm install
```

- [ ] **Step 5: 验证**

```bash
cd apps/admin-api
npx tsc --noEmit
# 期望:无 error
```

**验收标准:** NestJS 包结构就绪,`tsc --noEmit` 通过

---

# Phase 1: admin-api 基础 (6 tasks)

### T1.1: Prisma schema 完整设计(所有 10 大模块的表)

**Files:**

- Create: `apps/admin-api/prisma/schema.prisma`

- [ ] **Step 1: 设计 Admin 主表 + Auth**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ Auth & RBAC ============
enum AdminRole {
  SUPER_ADMIN
  ADMIN
  OPS
  FINANCE
  RISK
  AUDITOR
}

model Admin {
  id           String     @id @default(cuid())
  username     String     @unique
  email        String     @unique
  passwordHash String
  fullName     String
  role         AdminRole  @default(ADMIN)
  isActive     Boolean    @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  sessions     AdminSession[]
  auditLogs    AuditLog[]
}

model AdminSession {
  id          String   @id @default(cuid())
  adminId     String
  token       String   @unique
  expiresAt   DateTime
  ip          String?
  userAgent   String?
  createdAt   DateTime @default(now())
  admin       Admin    @relation(fields: [adminId], references: [id], onDelete: Cascade)

  @@index([adminId])
}
```

- [ ] **Step 2: 加业务表(User、Company、Payment、Livestream、ShortVideo、Dao、Tax、DLC、AiAgent)**

```prisma
// 完整 schema, 包含 10 大模块所有表
// User / Company / PaymentOrder / AiAgent / AiAgentCall / Livestream / ShortVideo /
// DaoProposal / DaoVote / TaxRate / DlcLevel / AuditLog / Setting

enum DlcLevel { BRONZE SILVER GOLD PLATINUM DIAMOND OBSIDIAN }
enum CompanyType { SAMOA_SPV HONG_KONG SINGAPORE BVI CAYMAN DELAWARE SEYCHELLES }
enum KycStatus { PENDING APPROVED REJECTED EXPIRED }
enum PaymentStatus { PENDING PROCESSING SUCCESS FAILED REFUNDED }
enum StreamStatus { SCHEDULED LIVE ENDED BANNED }
enum VideoStatus { UPLOADING TRANScoding PENDING_REVIEW PUBLISHED REJECTED DELETED }
enum ProposalStatus { DRAFTING VOTING PASSED REJECTED EXECUTED }
enum ReportStatus { PENDING RESOLVED REJECTED }

// ... (其他表)
```

完整 schema 见代码(留待 Step 3-8 实现,这里给概要)

- [ ] **Step 3-8: 逐步加表**(每个表 1 步,共 6 步)
  - Step 3: User + Kyc
  - Step 4: Company + Order
  - Step 5: AiAgent + AiAgentCall + Knowledge
  - Step 6: PaymentOrder + Currency
  - Step 7: Livestream + ShortVideo + VideoReport
  - Step 8: DaoProposal + DaoVote + TaxRate + DlcLevel + Setting + AuditLog

- [ ] **Step 9: 生成 Prisma Client**

```bash
cd apps/admin-api
npx prisma generate
# 期望:Generated Prisma Client
```

- [ ] **Step 10: 验证编译**

```bash
npx tsc --noEmit
# 期望:无 error
```

**验收标准:** 完整 schema,`prisma generate` 成功

---

### T1.2: PrismaService + 全局模块

**Files:**

- Create: `apps/admin-api/src/prisma/prisma.module.ts`
- Create: `apps/admin-api/src/prisma/prisma.service.ts`

- [ ] **Step 1: PrismaService**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 2: PrismaModule**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**验收标准:** PrismaModule 可被任何模块注入

---

### T1.3: Auth 模块(JWT 登录/刷新/登出)

**Files:**

- Create: `apps/admin-api/src/modules/auth/*`(controller / service / dto / strategy)
- Create: `apps/admin-api/src/common/guards/jwt-auth.guard.ts`
- Create: `apps/admin-api/src/common/decorators/roles.decorator.ts`
- Create: `apps/admin-api/src/common/guards/roles.guard.ts`

- [ ] **Step 1: Auth DTO**

```typescript
// auth/dto/login.dto.ts
import { IsString, MinLength } from 'class-validator';
export class LoginDto {
  @IsString() @MinLength(3) username: string;
  @IsString() @MinLength(6) password: string;
}
```

- [ ] **Step 2: AuthService**(登录校验 + bcrypt + 生成 token)

```typescript
// auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) {}

  async login(dto: LoginDto) {
    const admin = await this.prisma.admin.findUnique({ where: { username: dto.username } });
    if (!admin || !admin.isActive) throw new UnauthorizedException('账号不存在或已停用');
    if (!(await bcrypt.compare(dto.password, admin.passwordHash))) {
      throw new UnauthorizedException('密码错误');
    }
    const token = this.jwt.sign({ sub: admin.id, role: admin.role, username: admin.username });
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    await this.prisma.adminSession.create({ data: { adminId: admin.id, token, expiresAt } });
    await this.prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    return {
      token,
      expiresAt,
      admin: { id: admin.id, username: admin.username, fullName: admin.fullName, role: admin.role },
    };
  }

  async logout(token: string) {
    await this.prisma.adminSession.deleteMany({ where: { token } });
    return { ok: true };
  }

  async me(adminId: string) {
    return this.prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        lastLoginAt: true,
      },
    });
  }
}
```

- [ ] **Step 3: JwtAuthGuard + RolesGuard + decorators**

```typescript
// common/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// common/guards/roles.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRole[]>('roles', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;
    const { user } = ctx.switchToHttp().getRequest();
    return required.includes(user.role);
  }
}

// common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
export const Roles = (...roles: AdminRole[]) => SetMetadata('roles', roles);

// common/decorators/current-admin.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentAdmin = createParamDecorator(
  (_, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user
);
```

- [ ] **Step 4: JwtStrategy**

```typescript
// auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET!,
    });
  }
  async validate(payload: any) {
    return { id: payload.sub, role: payload.role, username: payload.username };
  }
}
```

- [ ] **Step 5: AuthController**

```typescript
// auth/auth.controller.ts
import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentAdmin } from '@/common/decorators/current-admin.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentAdmin() admin: any) {
    return this.auth.me(admin.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '') ?? '';
    return this.auth.logout(token);
  }
}
```

- [ ] **Step 6: 验证编译**

```bash
cd apps/admin-api
npx tsc --noEmit
# 期望:无 error
```

**验收标准:** Auth 模块完整,`/api/auth/login`、`/api/auth/me`、`/api/auth/logout` 端点就绪

---

### T1.4: Seed 脚本(初始化超级管理员 + 各模块 mock 数据)

**Files:**

- Create: `apps/admin-api/prisma/seed.ts`

- [ ] **Step 1: 写 seed 脚本**

```typescript
import { PrismaClient, AdminRole, DlcLevel, CompanyType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. 超级管理员
  const passwordHash = await bcrypt.hash('admin123456', 10);
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@wopc.io',
      passwordHash,
      fullName: '系统管理员',
      role: AdminRole.SUPER_ADMIN,
    },
  });

  // 2. 10 个 DLC 等级
  const levels = [
    { level: 1, name: '青铜', minDvc: 0, color: '#CD7F32', multiplier: 1.0 },
    { level: 2, name: '白银', minDvc: 1000, color: '#C0C0C0', multiplier: 1.2 },
    // ... 6 个等级
    { level: 6, name: '钻石', minDvc: 50000, color: '#B9F2FF', multiplier: 2.5 },
  ];
  for (const l of levels) {
    await prisma.dlcLevel.upsert({
      where: { id: `dlc-${l.level}` },
      update: l,
      create: { id: `dlc-${l.level}`, ...l },
    });
  }

  // 3. 各模块 mock 数据(50 个用户 / 30 家公司 / 20 笔支付 / 5 个 AI 智能体 / 10 场直播 / 50 短视频 / 10 提案)
  // ... 详细 seed 数据

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: 跑 seed**

```bash
cd apps/admin-api
npx ts-node prisma/seed.ts
# 期望:Seed completed
```

**验收标准:** 数据库初始化完成,有 admin / DLC 等级 / 各模块 mock 数据

---

### T1.5: 公共响应拦截器 + 全局异常过滤器

**Files:**

- Create: `apps/admin-api/src/common/interceptors/response.interceptor.ts`
- Create: `apps/admin-api/src/common/filters/all-exceptions.filter.ts`

- [ ] **Step 1: 统一响应格式**

```typescript
// response.interceptor.ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => ({ code: 0, message: 'OK', data })));
  }
}
```

- [ ] **Step 2: 全局异常过滤器**

```typescript
// all-exceptions.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal Server Error';
    if (status >= 500) this.logger.error(exception);
    res
      .status(status)
      .json({
        code: status,
        message: typeof message === 'string' ? message : ((message as any).message ?? 'Error'),
        data: null,
      });
  }
}
```

**验收标准:** 所有响应统一为 `{ code, message, data }`,异常不泄漏堆栈

---

### T1.6: AppModule + main.ts

**Files:**

- Create: `apps/admin-api/src/app.module.ts`
- Create: `apps/admin-api/src/main.ts`

- [ ] **Step 1: AppModule**

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    // 后续追加: UsersModule / CompaniesModule / ...
  ],
})
export class AppModule {}
```

- [ ] **Step 2: main.ts**

```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: ['http://localhost:4001'], credentials: true });

  const config = new DocumentBuilder()
    .setTitle('WOPC Admin API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT ?? 4000);
  console.log(`Admin API listening on http://localhost:${process.env.PORT ?? 4000}`);
  console.log(`Swagger UI: http://localhost:${process.env.PORT ?? 4000}/api/docs`);
}
bootstrap();
```

- [ ] **Step 3: 启动 + 验证**

```bash
cd apps/admin-api
# (需要先启动 PostgreSQL + Redis,见后续)
npx prisma migrate dev --name init
npm run dev
# 期望:Admin API listening on http://localhost:4000
```

```bash
curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123456"}'
# 期望:{"code":0,"message":"OK","data":{"token":"...","admin":{...}}}
```

**验收标准:** API 启动,登录端点工作

---

# Phase 2: admin-app 脚手架 (5 tasks)

### T2.1: Tailwind + shadcn/ui 配置

(详细步骤与 h5-app 一致,省略)

### T2.2: 全局 CSS + 主题

(配置 tailwind 主题 + 字体 + 暗色模式)

### T2.3: Axios client + 类型

(axios 实例 + JWT 拦截器 + 错误处理 + types)

### T2.4: Zustand authSlice(独立 JWT 持久化)

(`admin-auth-storage` 独立 key,持久化 admin + token)

### T2.5: React Router + 路由表

(routes.tsx,懒加载所有 admin 页面)

**验收标准:** `npm run dev` 启动 4001 端口,显示 Login 页

---

# Phase 3: 鉴权 (4 tasks)

### T3.1: Login 页面(shadcn Form + 暗色风格)

### T3.2: AuthGuard 组件(JWT 过期跳登录)

### T3.3: Logout(清 storage + 跳登录)

### T3.4: 路由守卫整合

---

# Phase 4: AdminLayout 桌面布局 (3 tasks)

### T4.1: AdminLayout(侧边栏 + 顶部 + 内容)

- 侧边栏 256px 可折叠到 64px
- 顶部 56px(用户菜单 + 主题切换 + 通知)
- 内容区自适应

### T4.2: Sidebar 菜单(10 大模块,带权限过滤)

### T4.3: Header(用户菜单 + 退出)

---

# Phase 5: Dashboard 总览 (2 tasks)

### T5.1: Dashboard API(/api/dashboard/stats)

- 返回:用户总数、公司总数、今日支付、活跃直播
- 趋势数据(7/30/90 天)
- Top 列表(交易/直播/AI 调用)

### T5.2: Dashboard 页面

- 4 个 KPI 卡片
- 趋势折线图(recharts)
- 占比饼图
- 最新交易流水表

---

# Phase 6-15: 10 大模块各 1 个 Phase(每个 Phase 3-4 tasks,共 ~35 tasks)

| Phase   | 模块       | Tasks                                                                                    |
| ------- | ---------- | ---------------------------------------------------------------------------------------- |
| **P6**  | 用户管理   | T6.1 用户 API / T6.2 用户列表页 / T6.3 用户详情 / T6.4 KYC 审核                          |
| **P7**  | 公司管理   | T7.1 公司 API / T7.2 公司列表 / T7.3 公司详情 / T7.4 订单管理                            |
| **P8**  | AI 智能体  | T8.1 AI API / T8.2 智能体列表 / T8.3 智能体详情 + 知识库 / T8.4 调用日志                 |
| **P9**  | 跨境支付   | T9.1 支付 API / T9.2 支付列表 / T9.3 支付详情 / T9.4 汇率 + 通道管理                     |
| **P10** | 直播管理   | T10.1 直播 API / T10.2 直播列表 / T10.3 直播详情 + 礼物流水                              |
| **P11** | 短视频/UGC | T11.1 视频 API / T11.2 视频列表 / T11.3 视频审核 / T11.4 举报处理                        |
| **P12** | DAO 社区   | T12.1 DAO API / T12.2 提案列表 / T12.3 提案详情 + 投票 / T12.4 奖励发放                  |
| **P13** | 税务数据库 | T13.1 税率 API / T13.2 税率列表(国家) / T13.3 DVSF 分红池                                |
| **P14** | DLC 等级   | T14.1 DLC API / T14.2 等级配置 / T14.3 等级变更历史                                      |
| **P15** | 系统设置   | T15.1 管理员 API / T15.2 管理员列表 / T15.3 角色权限 / T15.4 审计日志 / T15.5 服务器状态 |

**每个 Task 的标准步骤:**

1. Schema(若新增表)
2. API Controller / Service
3. 前端 API 客户端
4. 前端页面 + 表格 + 表单
5. 验证编译

---

# Phase 16: 集成验证 (2 tasks)

### T16.1: 启动 PostgreSQL + Redis + 跑迁移 + seed

### T16.2: 启动 admin-api + admin-app + E2E 验证

- 登录 → Dashboard → 切菜单 → 各模块页面渲染 → 退出

---

## ⚠️ 风险与限制

1. **PostgreSQL + Redis 必须先启动**(本地 / Docker / WSL)
2. **NestJS 是新依赖**,占 token 多,初始化阶段需要分步验证
3. **10 大模块 × 35 任务** 是大型工程,分批实施
4. **本计划不引入 Vitest/Playwright**(黄区警告),用 `tsc --noEmit` + `nest build` + 手动 curl 验证
5. **admin-app 与 h5-app 独立**,不共享 storage,登录互不影响

---

## 📝 修订记录

| 版本 | 日期       | 变更                             |
| ---- | ---------- | -------------------------------- |
| v0.1 | 2026-06-07 | 初稿(替代 admin-web-legacy 计划) |

---

_维护者:AI Dev Team | 项目:SMYweb3.020260527 | admin-app:4001 admin-api:4000_
