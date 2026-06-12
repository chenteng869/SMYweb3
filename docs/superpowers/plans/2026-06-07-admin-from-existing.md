# WOPC 创业家 管理员后台 实施计划(基于 admin-web + api)

> **For agentic workers:** 必需子技能: superpowers:subagent-driven-development(推荐) 或 superpowers:executing-plans。
> Steps 使用 checkbox (`- [ ]`) 语法追踪进度。
>
> ⚠️ **本计划取代** 之前两版:
>
> - `2026-06-07-admin-backend-wopc.md`(基于 admin-web-legacy,已废弃)
> - `2026-06-07-admin-from-scratch.md`(基于新建,已废弃)
>
> ⚠️ **admin-web-legacy 完全不动**(作为历史参考)

**Goal:** 在已存在的 `apps/admin-web/` + `apps/api/` 基础上,完善 **WOPC 创业家** 管理员后台:修基础(品牌、端口、Hash Router、JWT 流程)、补全 9 大模块的 API 与前端页面、接通前后端,做到可登录、可操作、可演示。

**Architecture:**

- `apps/admin-web/`(已有,Vite 7 + React 19 + shadcn/ui + Tailwind 3.4 + Zustand 5 + React Router 7) — 桌面管理后台前端
- `apps/api/`(已有,NestJS 10 + Prisma 5 + SQLite/PostgreSQL + JWT + bcrypt + Swagger) — 后端
- **保留** admin-web 的设计风格(暗色 #0B0F19 + 太初国链 logo 改 WOPC),不再造新项目
- 端口:admin-web **5173**(Vite 默认),api **3001**(已配);Vite proxy `/api → http://localhost:3001`
- 数据库:Prisma 现有 **SQLite**(MVP 阶段不切 PostgreSQL,节省部署复杂度)
- 鉴权:admin **独立 JWT**(`AuthGuard('jwt')`),admin-web 用 `admin-auth-storage` localStorage 存 token

**Tech Stack(沿用现有):**

- 前端:React 19 + TypeScript 5.9 + Vite 7 + Tailwind 3.4 + shadcn/ui 50+ 组件 + Zustand 5 + React Router 7 + framer-motion 12 + recharts 2 + lucide-react + zod
- 后端:NestJS 10 + Prisma 5.7 + SQLite 3 + JWT(@nestjs/jwt) + bcrypt + Passport + Swagger + class-validator
- 工具:npm workspaces(根 package.json 已配)

---

## 🎯 现状摸清(从代码确认)

### `apps/admin-web/` 现状

| 已有                                                                      | 缺失                                      |
| ------------------------------------------------------------------------- | ----------------------------------------- |
| App.tsx(hash router,9 nav items,Dashboard+UsersPage 实现,8 Placeholder)   | BrowserRouter 切换、登录页、AuthGuard     |
| 50+ shadcn/ui 组件(button/card/dialog/table/sidebar/sheet 等)             | DataTable 通用表格、FilterBar、PageHeader |
| lib/constants.ts(9 路由常量)                                              | 路由菜单映射                              |
| lib/utils.ts(cn)                                                          | format 工具(数字/日期)                    |
| store/index.ts(zustand,4 类 mock: AdminKpi/Order/User/Notification)       | API 接入、authSlice                       |
| types/index.ts                                                            | AdminUser/Token 类型                      |
| 6 个 shared 组件(Card/GradientButton/Skeleton/StatCard/StatusBadge/Toast) | 高级通用组件                              |
| **品牌"太初国链"**                                                        | WOPC 创业家                               |

### `apps/api/` 现状

| 已有                                                                                                                                                                            | 缺失                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Prisma schema 14 个表(AdminUser/AdminRole/AuditLog/User/KYC/Content/NFT/Transaction/TradingPair/Order/StakingPool/StakingRecord/SystemConfig/Product/EcommerceOrder/DailyStats) | 9 大模块的数据已基本就绪(只需 seed) |
| AuthModule(POST /api/auth/login + GET /api/auth/profile)                                                                                                                        | logout / refresh / RBAC guards      |
| UserModule(GET /users list+detail, PATCH status+level)                                                                                                                          | KYC 审核 / 邀请层级 / 删除          |
| DashboardModule(GET /dashboard stats)                                                                                                                                           | 趋势数据 / Top 列表                 |
| main.ts(端口 3001,Swagger,全局 ValidationPipe)                                                                                                                                  | 全局响应拦截器 / 异常过滤器         |
| **品牌"Guoxue Web3 Admin API"**                                                                                                                                                 | WOPC API 文档                       |
| **硬编码密码 'admin123'**                                                                                                                                                       | bcrypt 校验 + seed 脚本             |

---

## 📋 10 个 Phase × ~30 个 Task 总览

| Phase    | 内容                             | Tasks |
| -------- | -------------------------------- | ----- |
| **P0**   | 修复基础:品牌/端口/路由/密码     | 5     |
| **P1**   | 跑通前后端:登录 + Dashboard 数据 | 3     |
| **P2**   | 用户管理 API + 页面补全          | 3     |
| **P3**   | 内容管理 API + 页面补全          | 3     |
| **P4**   | NFT 管理 API + 页面补全          | 2     |
| **P5**   | 交易管理 API + 页面补全          | 3     |
| **P6**   | 交易对/订单(CEX/DEX)             | 3     |
| **P7**   | 质押挖矿                         | 2     |
| **P8**   | 电商                             | 2     |
| **P9**   | 系统配置 + 审计日志 + 角色       | 3     |
| **P10**  | 集成验证                         | 2     |
| **总计** |                                  | ~31   |

---

# Phase 0: 修复基础 (5 tasks)

### T0.1: 修品牌名(api main.ts + admin-web App.tsx + lib/constants)

**Files:**

- Modify: `apps/api/src/main.ts:26-27`(Swagger title/description)
- Modify: `apps/admin-web/src/App.tsx:30-32`(logo "太"/"太初国链")
- Modify: `apps/admin-web/src/lib/constants.ts:47`(`APP_CONFIG.name = '太初国链'`)

- [ ] **Step 1: api Swagger 改 WOPC**

`apps/api/src/main.ts:26-27`:

```typescript
// OLD
const config = new DocumentBuilder()
  .setTitle('Guoxue Web3 Admin API')
  .setDescription('国学出海 Web3 Dapp 管理员后台 API 文档');

// NEW
const config = new DocumentBuilder()
  .setTitle('WOPC 创业家 管理后台 API')
  .setDescription('WOPC 创业家 - Web3 One Person Company 运营中台');
```

- [ ] **Step 2: admin-web Logo 改 WOPC**

`apps/admin-web/src/App.tsx:30-32`:

```tsx
// OLD
<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F6A623] to-[#CE1126] flex items-center justify-center shrink-0">
  <span className="text-white font-bold text-sm">太</span>
</div>;
{
  !collapsed && <span className="ml-3 font-bold text-[#E5E7EB] whitespace-nowrap">太初国链</span>;
}

// NEW
<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F6A623] to-[#CE1126] flex items-center justify-center shrink-0">
  <span className="text-white font-bold text-sm">W</span>
</div>;
{
  !collapsed && (
    <span className="ml-3 font-bold text-[#E5E7EB] whitespace-nowrap">WOPC 创业家</span>
  );
}
```

- [ ] **Step 3: constants 改 WOPC**

`apps/admin-web/src/lib/constants.ts:47`:

```typescript
// OLD
name: '太初国链',

// NEW
name: 'WOPC 创业家',
```

- [ ] **Step 4: admin-web index.html title 改**
- Read 一下 `apps/admin-web/index.html` 找 `<title>` 标签
- 替换为 `WOPC 创业家 · 管理后台`

- [ ] **Step 5: 验证编译**

```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web"
npx tsc --noEmit
```

- 期望:无 error

**验收标准:** admin-web 显示 WOPC,api Swagger 显示 WOPC 创业家管理后台 API

---

### T0.2: 修 vite 代理 + CORS 双向打通

**Files:**

- Modify: `apps/admin-web/vite.config.ts`(加 proxy)
- Modify: `apps/api/src/main.ts:11`(CORS origin)

- [ ] **Step 1: 读 admin-web/vite.config.ts**
- 找到 `server` 配置
- 如果没有 server,加上 proxy

- [ ] **Step 2: 加 proxy**

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // ... 现有 alias 配置
});
```

- [ ] **Step 3: api CORS 允许 admin-web 端口**

`apps/api/src/main.ts:10-13`:

```typescript
// OLD
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
});

// NEW
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
});
```

**验收标准:** admin-web 调 `/api/auth/login` 实际打到 api:3001

---

### T0.3: 修硬编码密码(用 bcrypt)

**Files:**

- Modify: `apps/api/src/modules/auth/auth.service.ts:32-36`

- [ ] **Step 1: 移除硬编码**

```typescript
// OLD
const isPasswordValid =
  password === 'admin123' || (await bcrypt.compare(password, adminUser.password));

// NEW
const isPasswordValid = await bcrypt.compare(password, adminUser.password);
if (!isPasswordValid) {
  throw new UnauthorizedException('用户名或密码错误');
}
```

- [ ] **Step 2: 编译验证**

```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\api"
npx tsc --noEmit
```

**验收标准:** api 不再硬编码 'admin123'

---

### T0.4: admin-web 切换 BrowserRouter + 拆 main.tsx(若需要)

**Files:**

- Modify: `apps/admin-web/src/App.tsx:1-3`(去 hash router 改 BrowserRouter)
- Modify: `apps/admin-web/src/main.tsx`(加 BrowserRouter 包裹)

- [ ] **Step 1: 读 main.tsx**
- 看 App 是否已被 `<BrowserRouter>` 包裹
- 如果没,在 main.tsx 里加

- [ ] **Step 2: App.tsx 切掉 hash 逻辑**

`apps/admin-web/src/App.tsx:200`:

```tsx
// OLD
const path = window.location.hash.replace('#', '') || '/dashboard';

// NEW
import { useLocation } from 'react-router-dom';
// 在 App 组件里:
const location = useLocation();
const path = location.pathname;
```

- [ ] **Step 3: Sidebar 链接改成 react-router**

`apps/admin-web/src/App.tsx:38`:

```tsx
// OLD
<a key={item.id} href={`#${item.path}`} className={cn(...)}>
  <item.icon size={18} className="shrink-0" />
  ...
</a>

// NEW
import { Link } from 'react-router-dom';
<Link key={item.id} to={item.path} className={cn(...)}>
  <item.icon size={18} className="shrink-0" />
  ...
</Link>
```

- [ ] **Step 4: 验证**

```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web"
npx tsc --noEmit
```

**验收标准:** admin-web 用 BrowserRouter,无 hash 路由

---

### T0.5: seed 脚本(api 初始化数据 + 超级管理员)

**Files:**

- Create: `apps/api/prisma/seed.ts`
- Modify: `apps/api/package.json`(加 prisma seed 配置)

- [ ] **Step 1: 加 seed 脚本到 package.json**

```json
// apps/api/package.json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

- [ ] **Step 2: 写 seed.ts**

```typescript
// apps/api/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. 角色
  const superAdmin = await prisma.adminRole.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: { name: 'SUPER_ADMIN', description: '超级管理员', permissions: JSON.stringify(['*']) },
  });
  const admin = await prisma.adminRole.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: '普通管理员',
      permissions: JSON.stringify(['users:read', 'users:write']),
    },
  });
  const auditor = await prisma.adminRole.upsert({
    where: { name: 'AUDITOR' },
    update: {},
    create: {
      name: 'AUDITOR',
      description: '审计员(只读)',
      permissions: JSON.stringify(['*_*:read']),
    },
  });

  // 2. 超级管理员账号
  const passwordHash = await bcrypt.hash('admin123456', 10);
  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@wopc.io',
      password: passwordHash,
      roleId: superAdmin.id,
      isActive: true,
    },
  });

  // 3. 50 个 mock 用户
  const userCount = await prisma.user.count();
  if (userCount < 50) {
    for (let i = 1; i <= 50; i++) {
      await prisma.user.create({
        data: {
          username: `user${i.toString().padStart(3, '0')}`,
          email: `user${i}@wopc.io`,
          phone: `+861380000${(1000 + i).toString().slice(-4)}`,
          walletAddress: `0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`,
          did: `did:wopc:user${i.toString().padStart(3, '0')}`,
          kycStatus: i % 3 === 0 ? 'approved' : i % 3 === 1 ? 'pending' : 'not_started',
          userLevel: (i % 6) + 1,
          isActive: i % 10 !== 0,
        },
      });
    }
  }

  // 4. 30 笔交易
  const txCount = await prisma.transaction.count();
  if (txCount < 30) {
    for (let i = 1; i <= 30; i++) {
      await prisma.transaction.create({
        data: {
          type: ['nft_trade', 'content_purchase', 'deposit', 'withdraw', 'swap'][i % 5],
          status: i % 4 === 0 ? 'failed' : 'success',
          amount: Math.random() * 10000,
          currency: ['USDT', 'ETH', 'USDC', 'DAI'][i % 4],
          userId: `user-${(i % 50) + 1}`,
          txHash: `0x${Math.random().toString(16).slice(2, 66).padEnd(64, '0')}`,
          chain: ['Ethereum', 'Polygon', 'BSC', 'Arbitrum'][i % 4],
          blockNumber: 18000000 + i,
        },
      });
    }
  }

  // 5. 每日统计(过去 30 天)
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    await prisma.dailyStats.upsert({
      where: { date },
      update: {},
      create: {
        date,
        newUsers: Math.floor(Math.random() * 100) + 20,
        activeUsers: Math.floor(Math.random() * 500) + 200,
        transactions: Math.floor(Math.random() * 50) + 10,
        tradingVolume: Math.floor(Math.random() * 100000) + 10000,
        nftsMinted: Math.floor(Math.random() * 20),
        revenue: Math.floor(Math.random() * 5000) + 1000,
      },
    });
  }

  console.log('✅ Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: 跑迁移 + seed**

```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\api"
npx prisma migrate dev --name init
npx prisma db seed
```

**验收标准:** 数据库初始化完成,超级管理员 admin/admin123456 可登录

---

# Phase 1: 跑通前后端 (3 tasks)

### T1.1: api 启动 + 验证登录端点

- [ ] **Step 1: 写 .env(如不存在)**
- 读 `apps/api/.env`(若不存在则用 `.env.example` 模板创建)
- `DATABASE_URL="file:./dev.db"`
- `JWT_SECRET="dev-only-secret-change-in-prod-min-32-chars"`
- `JWT_EXPIRES_IN="7d"`
- `PORT=3001`
- `CORS_ORIGIN="http://localhost:5173"`

- [ ] **Step 2: 启动 api**

```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\api"
npm run start:dev
```

- 后台跑,等待 "Admin backend is running on http://localhost:3001"

- [ ] **Step 3: 测登录**

```powershell
(Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"admin123456"}' -UseBasicParsing).Content
```

- 期望:返回 `{ "token": "eyJ...", "user": { ... } }`

**验收标准:** api 登录端点返回 JWT token

---

### T1.2: admin-web 登录页 + AuthGuard

**Files:**

- Create: `apps/admin-web/src/pages/auth/Login.tsx`
- Create: `apps/admin-web/src/components/AuthGuard.tsx`
- Create: `apps/admin-web/src/store/authSlice.ts`
- Modify: `apps/admin-web/src/App.tsx`(加 /login 路由 + 包裹 /admin)

- [ ] **Step 1: types/auth.ts**

```typescript
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
}
export interface AuthState {
  token: string | null;
  user: AdminUser | null;
  isAuthenticated: boolean;
}
```

- [ ] **Step 2: authSlice(Zustand persist)**

```typescript
// store/authSlice.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, AdminUser } from '@/types/auth';

interface AuthActions {
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
}

const STORAGE_KEY = 'admin-auth-storage';

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    { name: STORAGE_KEY }
  )
);
```

- [ ] **Step 3: 写 api client**

```typescript
// lib/api.ts
import axios from 'axios';
import { useAuthStore } from '@/store/authSlice';

export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

- [ ] **Step 4: Login 页**

```tsx
// pages/auth/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authSlice';
import { api } from '@/lib/api';
import { LogIn, User, Lock } from 'lucide-react';

export default function Login() {
  const nav = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123456');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.token, res.data.user);
      nav('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-[#F6A623] to-[#CE1126] flex items-center justify-center mb-3">
            <span className="text-white font-bold text-xl">W</span>
          </div>
          <h1 className="text-2xl font-bold text-[#E5E7EB]">WOPC 创业家</h1>
          <p className="text-sm text-[#6B7280] mt-1">管理员后台登录</p>
        </div>
        <div className="relative">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="用户名"
            className="w-full h-11 pl-10 pr-3 bg-[#131B2C] border border-white/[0.06] rounded-lg text-[#E5E7EB] outline-none focus:border-[#F6A623]"
          />
        </div>
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            className="w-full h-11 pl-10 pr-3 bg-[#131B2C] border border-white/[0.06] rounded-lg text-[#E5E7EB] outline-none focus:border-[#F6A623]"
          />
        </div>
        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm">{error}</div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 bg-gradient-to-r from-[#F6A623] to-[#CE1126] rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            '登录中...'
          ) : (
            <>
              <LogIn size={16} /> 登录
            </>
          )}
        </button>
        <p className="text-xs text-[#6B7280] text-center">默认账号 admin / admin123456</p>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: AuthGuard + 路由改造**

`apps/admin-web/src/components/AuthGuard.tsx`:

```tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authSlice';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
```

`apps/admin-web/src/App.tsx`(在 Routes 之上加):

```tsx
import Login from '@/pages/auth/Login';
import { AuthGuard } from '@/components/AuthGuard';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authSlice';
import { api } from '@/lib/api';

// 在 App 顶部,useEffect 里加载用户信息:
const { isAuthenticated, user, login, logout } = useAuthStore();
useEffect(() => {
  if (isAuthenticated && !user) {
    api
      .get('/auth/profile')
      .then((res) => login(useAuthStore.getState().token!, res.data))
      .catch(() => logout());
  }
}, [isAuthenticated]);

// Routes 改造:
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/" element={<Navigate to="/dashboard" replace />} />
  <Route
    path="/*"
    element={
      <AuthGuard>
        <Dashboard />
      </AuthGuard>
    }
  />
</Routes>;
```

- [ ] **Step 6: 启动 admin-web**

```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web"
npm run dev
```

- [ ] **Step 7: 浏览器验证**
- 访问 `http://localhost:5173/login`
- 输入 admin / admin123456
- 期望:登录成功跳 /dashboard,显示 KPIs

**验收标准:** 登录后能进 Dashboard,KPI 数据从后端拉取

---

### T1.3: Dashboard 数据接通(后端已有 dashboard.service)

**Files:**

- Modify: `apps/admin-web/src/App.tsx`(Dashboard 改用 API)
- Modify: `apps/api/src/modules/dashboard/dashboard.service.ts`(返回 KPI 结构)

- [ ] **Step 1: api 返回 KPI 结构**
- 在 `dashboard.service.ts` 加 `getStats()` 返回 `{ users, companies, revenue, aiCalls, todayOrders, risks }` 6 个数
- `dashboard.controller.ts` 加 `@Get('stats')` 端点

- [ ] **Step 2: admin-web Dashboard 改用 API**
- 删除 mock 数据
- 调 `api.get('/dashboard/stats')` 拿数据
- KpiCards 渲染 API 返回值

**验收标准:** Dashboard KPI 来自后端真实查询

---

# Phase 2: 用户管理 (3 tasks)

### T2.1: UserService 扩展(KYC / 邀请 / 详情)

### T2.2: UserController 新增端点

### T2.3: UsersPage 改 DataTable + 操作按钮

---

# Phase 3-8: 内容/NFT/交易/订单/质押/电商 (16 tasks)

每个模块 1 个 Phase(2-3 tasks),结构同 Phase 2:

- API 扩展
- Controller 新增端点
- 前端页面补全

---

# Phase 9: 系统配置 + 审计日志 + 角色 (3 tasks)

### T9.1: AuditLog 服务(记录所有写操作)

### T9.2: 角色权限管理(SUPER_ADMIN 可见,ADMIN 只读)

### T9.3: 审计日志页面(分页 + 筛选 + 详情)

---

# Phase 10: 集成验证 (2 tasks)

### T10.1: 完整 E2E(登录 → 各模块页面 → 操作 → 退出)

### T10.2: 编译 + Lint 全量验证

```powershell
# admin-web
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web"
npx tsc --noEmit && npm run lint

# api
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\api"
npx tsc --noEmit && npm run lint
```

---

## ⚠️ 风险与限制

1. **Prisma 现有 SQLite**,后续如切 PostgreSQL 需要重生成 migration
2. **硬编码 'admin123' 已修复**,但 seed 的 `admin/admin123456` 是 dev-only,生产前必须改
3. **9 大模块的 API 很多**,但 Prisma schema 已就绪,主要是写 Service/Controller
4. **前端 8 个 PlaceholderPage 需要补全**,工作量大
5. **不引入 Vitest**(黄区警告),用 tsc + 手动 curl 验证

---

## 📝 修订记录

| 版本 | 日期       | 变更                                            |
| ---- | ---------- | ----------------------------------------------- |
| v0.1 | 2026-06-07 | 初稿(基于现有 admin-web + api,替代两版废弃计划) |

---

_维护者:AI Dev Team | 项目:SMYweb3.020260527 | admin-web:5173 api:3001_
