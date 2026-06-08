# WOPC 创业家 管理员后台 实施计划

> **For agentic workers:** 必需子技能: superpowers:subagent-driven-development(推荐) 或 superpowers:executing-plans。
> Steps 使用 checkbox (`- [ ]`) 语法追踪进度。

**Goal:** 把已存在的 `apps/admin-web-legacy/` 升级为 **WOPC 创业家** 品牌,接入 H5 端 JWT 鉴权,补齐 86 个 admin 页面细节,使 H5 + 后台构成完整 Web3 创业家 SaaS。

**Architecture:**
- `apps/admin-web-legacy/`(Next.js 14.1 + React 18 + Ant Design 5 + ECharts + Zustand 4 + React Query 5)— 桌面管理后台,**继续在此开发**
- `apps/h5-app/`(Vite 7 + React 19 + shadcn/ui + Tailwind 3.4 + Zustand 5)— 移动端 H5,**新增 JWT 鉴权 + 登录页**
- 两者通过 **localStorage `wopc-auth-storage`** 共享 token + user(由 H5 写入,admin-web-legacy 读取)
- 鉴权:复用 H5 JWT;admin-web-legacy 接受 `Bearer <token>`,后端可选(MVP 阶段用 Mock)
- 端口:admin-web-legacy **3002**,h5-app **5173**(Vite proxy 转发 `/api` 到 3001 后端预留)

**Tech Stack(两个项目各自保持):**
- admin-web-legacy: Next.js 14.1 / React 18.2 / Antd 5.12 / ECharts 5.4 / Zustand 4.4 / @tanstack/react-query 5.15 / xlsx / axios
- h5-app(新增):zustand/middleware persist / react-router-dom 6.28 / sonner(已有) / lucide-react / zod(已有)

---

## 🎯 用户决策摘要(已确认)

| 决策点 | 选择 | 备注 |
|---|---|---|
| 开发方向 | **继续在 admin-web-legacy 上开发** | h5-app 不加 /admin 路由 |
| 品牌重命名 | **全量重命名为 WOPC 创业家** | 含 Logo/标题/所有"国学出海" "萨摩亚交易所" |
| 鉴权方式 | **共享 H5 JWT** | h5-app 写 `wopc-auth-storage`,legacy 读 |
| 测试 | **不引入 Vitest(黄区警告)** | 仅用 `tsc --noEmit` + `next lint` |
| 后端 | **先 Mock(已有 mock 数据)** | 后端就绪后切 baseURL |

---

## 📁 关键文件结构

```
SMYweb3.020260527/
├── apps/
│   ├── h5-app/                              # 移动端
│   │   └── src/
│   │       ├── types/auth.ts                # 新增(Phase 2)
│   │       ├── store/authSlice.ts           # 新增(Phase 2,Zustand persist)
│   │       ├── pages/auth/Login.tsx         # 新增(Phase 2)
│   │       ├── components/layout/AuthGuard.tsx  # 新增(Phase 2)
│   │       └── store/index.ts               # 修改(集成 authSlice)
│   └── admin-web-legacy/                    # 桌面管理后台
│       ├── src/
│       │   ├── stores/authStore.ts          # 修改(读 wopc-auth-storage)
│       │   ├── services/api.ts              # 修改(拦截器)
│       │   ├── app/
│       │   │   ├── layout.tsx               # 修改(metadata: WOPC)
│       │   │   ├── login/page.tsx           # 修改(读 H5 storage)
│       │   │   └── admin/                   # 86 个页面,逐个完善
│       │   ├── components/admin/
│       │   │   └── AdminLayout.tsx          # 修改(Logo 改 WOPC)
│       │   ├── constants/adminMenuMapping.ts # 修改(标题改 WOPC)
│       │   └── types/index.ts               # 微调(role 加 isAdmin)
│       └── package.json                     # 不动
└── docs/superpowers/plans/
    └── 2026-06-07-admin-backend-wopc.md     # 本文件
```

---

## 📋 7 个 Phase × 33 个 Task 总览

| Phase | 任务 | 状态 |
|---|---|---|
| **Phase 1: 项目修复与品牌重命名** | 5 tasks | 立即开始 |
| **Phase 2: H5 端 JWT 鉴权前置** | 5 tasks | 立即开始 |
| **Phase 3: admin-web-legacy 鉴权对接** | 3 tasks | 立即开始 |
| **Phase 4: 16 大模块 86 页面细节完善** | 16 tasks | 后续分批 |
| **Phase 5: 通用组件与表格增强** | 3 tasks | 后续 |
| **Phase 6: 通用 CRUD 模式与导出** | 1 task | 后续 |
| **Phase 7: 集成验证 + 跨项目 E2E** | 2 tasks | 最后 |

**总计:7 phases × 35 tasks**

---

# Phase 1: 项目修复与品牌重命名 (5 tasks)

> **目标**:admin-web-legacy 能跑起来,品牌 100% 改为 WOPC 创业家

### Task 1.1: 验证 admin-web-legacy 项目能启动

**Files:**
- Modify: `apps/admin-web-legacy/package.json`(读)
- Read: `apps/admin-web-legacy/next.config.js`

- [ ] **Step 1: 检查 Node.js 与包管理器**
```powershell
node --version
npm --version
# 期望:Node.js >= 18.17, npm >= 9
```

- [ ] **Step 2: 安装依赖**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web-legacy"
npm install
# 期望:无 error,可能 deprecation warning 可忽略
```

- [ ] **Step 3: 启动开发服务器(后台运行)**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web-legacy"
npm run dev
# 期望:Ready in 2-3s, 端口 3002 (因 .next/cache 已存在)
```

- [ ] **Step 4: 验证 Dashboard 页面能打开**
- 浏览器访问 `http://localhost:3002/admin/dashboard`
- 期望:看到"数据概览"标题 + 4 个数据卡片 + 折线图 + 饼图

- [ ] **Step 5: 验证 Sider 菜单能折叠**
- 点击汉堡按钮
- 期望:Sider 从 240px 缩到 80px,菜单图标保留

**验收标准:** Dashboard 页面渲染成功,菜单可折叠,无控制台错误

---

### Task 1.2: 修改 metadata 为 WOPC 创业家

**Files:**
- Modify: `apps/admin-web-legacy/src/app/layout.tsx:7-9`

- [ ] **Step 1: 替换 metadata**

`apps/admin-web-legacy/src/app/layout.tsx` 第 7-9 行:
```tsx
// OLD
export const metadata: Metadata = {
  title: '国学出海Web3管理后台',
  description: '国学出海Web3 Dapp 管理后台系统',
};

// NEW
export const metadata: Metadata = {
  title: 'WOPC 创业家 · 萨摩亚SPV × 海购星Dapp',
  description: 'WOPC 创业家管理后台 - Web3 One Person Company 运营中台',
};
```

- [ ] **Step 2: 验证**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web-legacy"
npx tsc --noEmit
# 期望:无 error
```

**验收标准:** 浏览器 tab 标题显示 "WOPC 创业家 · 萨摩亚SPV × 海购星Dapp"

---

### Task 1.3: 修改 AdminLayout Sider Logo 与标题

**Files:**
- Modify: `apps/admin-web-legacy/src/components/admin/AdminLayout.tsx:555-561`

- [ ] **Step 1: 替换 Sider Logo 文案**

`apps/admin-web-legacy/src/components/admin/AdminLayout.tsx` 第 555-561 行:
```tsx
// OLD
        <div className="h-16 flex items-center justify-center border-b border-blue-800">
          {collapsed ? (
            <div className="text-white text-2xl font-bold">萨</div>
          ) : (
            <div className="text-white text-xl font-bold">萨摩亚交易所</div>
          )}
        </div>

// NEW
        <div className="h-16 flex items-center justify-center border-b border-blue-800">
          {collapsed ? (
            <div className="text-white text-2xl font-bold">W</div>
          ) : (
            <div className="text-white text-xl font-bold">WOPC 创业家</div>
          )}
        </div>
```

- [ ] **Step 2: 验证**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web-legacy"
npx tsc --noEmit
# 期望:无 error
```

- [ ] **Step 3: 浏览器验证**
- 刷新 `http://localhost:3002/admin/dashboard`
- 期望:Sider 顶部显示"WOPC 创业家",折叠后显示"W"

**验收标准:** Sider 顶部 logo 文字改为 WOPC 创业家

---

### Task 1.4: 全量文案搜索替换(国学出海 → WOPC 创业家)

**Files:**
- All `.tsx` `.ts` `.md` files in `apps/admin-web-legacy/src/`

- [ ] **Step 1: 搜索所有"国学出海"出现位置**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web-legacy"
Get-ChildItem -Path src -Recurse -Include *.tsx,*.ts,*.md | Select-String -Pattern "国学出海" | Select-Object -ExpandProperty Path
# 期望:列出所有含"国学出海"的文件路径
```

- [ ] **Step 2: 批量替换"国学出海" → "WOPC 创业家"**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web-legacy"
Get-ChildItem -Path src -Recurse -Include *.tsx,*.ts,*.md | ForEach-Object {
  (Get-Content $_.FullName -Encoding UTF8) -replace '国学出海', 'WOPC 创业家' | Set-Content $_.FullName -Encoding UTF8
}
# 期望:无输出
```

- [ ] **Step 3: 验证替换完成**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web-legacy"
Get-ChildItem -Path src -Recurse -Include *.tsx,*.ts,*.md | Select-String -Pattern "国学出海" | Measure-Object | Select-Object -ExpandProperty Count
# 期望:0
```

- [ ] **Step 4: 替换"萨摩亚交易所" → "WOPC 创业家"**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web-legacy"
Get-ChildItem -Path src -Recurse -Include *.tsx,*.ts,*.md | Select-String -Pattern "萨摩亚交易所" | Measure-Object | Select-Object -ExpandProperty Count
# 期望:0 (Task 1.3 已改)
```

- [ ] **Step 5: 验证编译**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web-legacy"
npx tsc --noEmit
# 期望:无 error
```

**验收标准:** 全项目无"国学出海""萨摩亚交易所"残留

---

### Task 1.5: 更新 portal 页面与门户菜单映射

**Files:**
- Modify: `apps/admin-web-legacy/src/constants/adminMenuMapping.ts`(L1,L489-507)
- Modify: `apps/admin-web-legacy/src/app/portal/page.tsx`(title/description)

- [ ] **Step 1: 更新 portal 页面顶部**
```tsx
// 查找 const metadata (在 portal/page.tsx)
// 替换为:
export const metadata: Metadata = {
  title: 'WOPC 创业家 · 门户首页',
  description: 'WOPC 创业家 - Web3 One Person Company 全景门户',
};
```

- [ ] **Step 2: 更新 adminMenuMapping.ts 注释**
```typescript
// 文件头 L1:
// OLD
// 管理员后台菜单与门户首页功能区域映射关系
// NEW
// WOPC 创业家 管理后台菜单与门户首页功能区域映射关系
```

- [ ] **Step 3: 编译验证**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web-legacy"
npx tsc --noEmit && npm run lint
# 期望:无 error
```

**验收标准:** portal 页面和菜单映射文件无旧品牌名,TS + ESLint 通过

---

# Phase 2: H5 端 JWT 鉴权前置 (5 tasks)

> **目标**:h5-app 有完整登录页 + token 持久化 + 路由守卫,token 写入 `wopc-auth-storage`

### Task 2.1: 定义 auth 类型

**Files:**
- Create: `apps/h5-app/src/types/auth.ts`

- [ ] **Step 1: 创建 auth 类型文件**

`apps/h5-app/src/types/auth.ts`:
```typescript
// ============ Auth Types ============
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'user' | 'admin' | 'super_admin';
  isAdmin: boolean;
  dlcLevel?: number;
  dvcBalance?: number;
  createdAt: string;
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  loginAt: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  expiresIn: number; // 秒
}

export type AuthError =
  | { code: 'INVALID_CREDENTIALS'; message: string }
  | { code: 'NETWORK_ERROR'; message: string }
  | { code: 'SERVER_ERROR'; message: string };
```

- [ ] **Step 2: 验证 TS 编译**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\h5-app"
npx tsc --noEmit
# 期望:无 error
```

**验收标准:** 类型文件创建成功,类型严格

---

### Task 2.2: 创建 authSlice(Zustand persist)

**Files:**
- Create: `apps/h5-app/src/store/authSlice.ts`

- [ ] **Step 1: 创建 authSlice**

`apps/h5-app/src/store/authSlice.ts`:
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthState, AuthUser, LoginRequest, LoginResponse } from '@/types/auth';

interface AuthActions {
  login: (req: LoginRequest) => Promise<LoginResponse>;
  logout: () => void;
  setUser: (user: Partial<AuthUser>) => void;
  refreshToken: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

// 统一 storage key(与 admin-web-legacy 共享)
const STORAGE_KEY = 'wopc-auth-storage';

// Mock 登录实现(后端就绪后替换为 fetch)
async function mockLogin(req: LoginRequest): Promise<LoginResponse> {
  // 简单校验:用户名/密码都至少 3 位
  if (req.username.length < 3 || req.password.length < 3) {
    throw { code: 'INVALID_CREDENTIALS', message: '用户名或密码长度至少 3 位' };
  }
  // admin 账号:用户名含 admin → 管理员
  const isAdmin = req.username.toLowerCase().includes('admin');
  return {
    token: `mock-jwt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    user: {
      id: `u-${Date.now()}`,
      name: req.username,
      email: `${req.username}@wopc.io`,
      role: isAdmin ? 'admin' : 'user',
      isAdmin,
      dlcLevel: isAdmin ? 6 : 1,
      dvcBalance: isAdmin ? 12580 : 0,
      createdAt: new Date().toISOString(),
    },
    expiresIn: 86400,
  };
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      loginAt: null,

      login: async (req) => {
        const res = await mockLogin(req);
        set({
          token: res.token,
          user: res.user,
          isAuthenticated: true,
          loginAt: new Date().toISOString(),
        });
        return res;
      },

      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          loginAt: null,
        });
      },

      setUser: (patch) => set((s) => ({
        user: s.user ? { ...s.user, ...patch } : null,
      })),

      refreshToken: async () => {
        const { token } = get();
        if (!token) throw new Error('no token to refresh');
        // 简化:MVP 阶段直接延长,不真发请求
        set({ token: `refreshed-${Date.now()}-${token.slice(-6)}` });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        token: s.token,
        user: s.user,
        isAuthenticated: s.isAuthenticated,
        loginAt: s.loginAt,
      }),
    }
  )
);

// 便利 selector
export const selectIsAdmin = (s: AuthStore) => s.user?.isAdmin ?? false;
```

- [ ] **Step 2: 验证 TS 编译**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\h5-app"
npx tsc --noEmit
# 期望:无 error
```

**验收标准:** authSlice 创建成功,登录后 localStorage['wopc-auth-storage'] 有数据

---

### Task 2.3: 集成 authSlice 到主 store

**Files:**
- Modify: `apps/h5-app/src/store/index.ts`(删除 `isAdmin`,改为引用 useAuthStore)

- [ ] **Step 1: 修改 AppStore 接口**

`apps/h5-app/src/store/index.ts` L75-77:
```typescript
// OLD
  // Admin
  isAdmin: boolean;
  setAuthenticated?: (v: boolean) => void;

// NEW
  // Admin(已迁移至 useAuthStore,请使用 useAuthStore)
  isAdmin: boolean;
  setAuthenticated?: (v: boolean) => void;
```

- [ ] **Step 2: 修改 store 实现**

`apps/h5-app/src/store/index.ts` L144-146:
```typescript
// OLD
  // Admin
  isAdmin: true,
  setAuthenticated: () => {},

// NEW
  // Admin: 改为从 useAuthStore 读取
  isAdmin: false, // 默认值;实际从 useAuthStore 派生
  setAuthenticated: () => {},
```

- [ ] **Step 3: 验证 TS 编译**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\h5-app"
npx tsc --noEmit
# 期望:无 error
```

**验收标准:** store 修改后编译通过,isAdmin 字段保留(向后兼容)

---

### Task 2.4: 创建登录页 Login.tsx

**Files:**
- Create: `apps/h5-app/src/pages/auth/Login.tsx`
- Modify: `apps/h5-app/src/App.tsx`(加 /login 路由)

- [ ] **Step 1: 创建 Login 页面**

`apps/h5-app/src/pages/auth/Login.tsx`:
```tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authSlice';
import { Lock, User, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from || '/';

  // 已登录则直接跳转
  if (isAuthenticated) {
    setTimeout(() => navigate(user?.isAdmin ? '/admin' : from, { replace: true }), 0);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await login({ username, password });
      // 管理员登录:跳到 /admin 入口(admin-web-legacy,需要新窗口)
      if (res.user.isAdmin) {
        // 跳到 h5-app 的 /admin 占位(目前还没实现)
        navigate('/profile', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-accent mx-auto flex items-center justify-center mb-3">
            <ShieldCheck size={32} className="text-bg-dark" />
          </div>
          <h1 className="text-h2 font-bold text-white">WOPC 创业家</h1>
          <p className="text-body-sm text-text-muted mt-1">登录以使用完整功能</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名(管理员请用 admin)"
              className="w-full h-12 pl-11 pr-3 rounded-xl bg-bg-card border border-white/10 text-white outline-none focus:border-coral/50"
              required
              minLength={3}
              autoComplete="username"
            />
          </div>

          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码(至少 3 位)"
              className="w-full h-12 pl-11 pr-11 rounded-xl bg-bg-card border border-white/10 text-white outline-none focus:border-coral/50"
              required
              minLength={3}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-caption">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 gradient-accent rounded-xl font-semibold text-bg-dark flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? '登录中...' : (<><LogIn size={18} /> 登录</>)}
          </button>
        </form>

        <p className="text-caption text-text-muted text-center mt-6">
          提示:用户名含 <code className="px-1 py-0.5 rounded bg-bg-card">admin</code> 即可登录为管理员
        </p>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: 添加 /login 路由**

`apps/h5-app/src/App.tsx` 顶部 import 区(L28 之后):
```tsx
// Auth Pages
import Login from '@/pages/auth/Login';
```

`apps/h5-app/src/App.tsx` Routes 内(L59 之后,`</Routes>` 之前):
```tsx
        <Route path="/login" element={<Login />} />
```

- [ ] **Step 3: 验证**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\h5-app"
npx tsc --noEmit
# 期望:无 error
```

- [ ] **Step 4: 浏览器验证**
- 访问 `http://localhost:5173/login`
- 期望:看到 WOPC Logo + 用户名/密码输入框 + 登录按钮
- 输入 `admin` / `admin123` → 登录成功跳转 /profile
- 检查 DevTools → Application → localStorage → `wopc-auth-storage` 有 token

**验收标准:** 登录页可用,登录后 token 写入 `wopc-auth-storage`

---

### Task 2.5: 创建 AuthGuard 路由守卫

**Files:**
- Create: `apps/h5-app/src/components/layout/AuthGuard.tsx`
- Modify: `apps/h5-app/src/App.tsx`(包裹需要鉴权的路由)

- [ ] **Step 1: 创建 AuthGuard 组件**

`apps/h5-app/src/components/layout/AuthGuard.tsx`:
```tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authSlice';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireAdmin && !user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: 修改 App.tsx 包裹需要鉴权的路由**

`apps/h5-app/src/App.tsx` 顶部 import(L29 之后):
```tsx
import { AuthGuard } from '@/components/layout/AuthGuard';
```

`apps/h5-app/src/App.tsx` 的 Sub Pages Route block,包裹需要登录的:
```tsx
        {/* Sub Pages (no bottom nav) */}
        <Route element={<MobileLayout showNav={false} />}>
          <Route path="/tax-calculator" element={<AuthGuard><TaxCalculator /></AuthGuard>} />
          <Route path="/legal-hub" element={<AuthGuard><LegalHub /></AuthGuard>} />
          <Route path="/company-register" element={<AuthGuard><CompanyRegister /></AuthGuard>} />
          <Route path="/payment-console" element={<AuthGuard><PaymentConsole /></AuthGuard>} />
          <Route path="/bank-account" element={<AuthGuard><BankAccount /></AuthGuard>} />
          <Route path="/dlc-level" element={<AuthGuard><DlcLevel /></AuthGuard>} />
          <Route path="/documents" element={<AuthGuard><DocumentCenter /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
          <Route path="/did-identity" element={<AuthGuard><DidIdentity /></AuthGuard>} />
          <Route path="/ai-business-card" element={<AuthGuard><AiBusinessCard /></AuthGuard>} />
          {/* 以下保持无鉴权 */}
          <Route path="/video-center" element={<VideoCenter />} />
          <Route path="/video/:id" element={<VideoPlayer />} />
          <Route path="/media-center" element={<MediaCenter />} />
          <Route path="/ai-chat/:agentId" element={<AiChatDetail />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>
```

- [ ] **Step 3: 验证**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\h5-app"
npx tsc --noEmit
# 期望:无 error
```

- [ ] **Step 4: 浏览器验证**
- 未登录访问 `/settings` → 跳转 `/login`
- 登录后访问 `/settings` → 正常显示

**验收标准:** 未登录访问受保护路由会自动跳登录页

---

# Phase 3: admin-web-legacy 鉴权对接 (3 tasks)

> **目标**:admin-web-legacy 读 `wopc-auth-storage`,自动登录(共享 H5 鉴权)

### Task 3.1: 改造 authStore 读取 H5 storage

**Files:**
- Modify: `apps/admin-web-legacy/src/stores/authStore.ts`

- [ ] **Step 1: 重写 authStore 读取 H5 storage**

完整重写 `apps/admin-web-legacy/src/stores/authStore.ts`:
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AdminUser } from '@/types';

const STORAGE_KEY = 'wopc-auth-storage'; // 与 h5-app 共享

interface H5AuthData {
  state?: {
    token?: string | null;
    user?: {
      id: string;
      name: string;
      email: string;
      isAdmin: boolean;
      role: string;
    } | null;
    isAuthenticated?: boolean;
  };
}

interface AuthState {
  token: string | null;
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
  updateUser: (user: Partial<AdminUser>) => void;
  syncFromH5: () => void;
}

// 从 localStorage 读取 H5 端 storage
function readH5Storage(): H5AuthData {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// 把 H5 user 映射成 admin user
function mapH5UserToAdmin(h5User: NonNullable<H5AuthData['state']>['user']): AdminUser {
  return {
    id: h5User.id,
    username: h5User.name,
    email: h5User.email,
    roleId: h5User.isAdmin ? '1' : '2',
    roleName: h5User.isAdmin ? '超级管理员' : '普通用户',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: (token: string, user: AdminUser) => {
        localStorage.setItem('admin_token', token);
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        // 注意:不能清 H5 storage,只清 admin 自己的
        localStorage.removeItem('admin_token');
        set({ token: null, user: null, isAuthenticated: false });
      },

      updateUser: (user: Partial<AdminUser>) =>
        set((state) => ({ user: state.user ? { ...state.user, ...user } : null })),

      // 新增:从 H5 storage 同步
      syncFromH5: () => {
        const h5 = readH5Storage();
        const h5State = h5.state;
        if (h5State?.isAuthenticated && h5State.token && h5State.user) {
          set({
            token: h5State.token,
            user: mapH5UserToAdmin(h5State.user),
            isAuthenticated: true,
          });
        } else {
          set({ token: null, user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

- [ ] **Step 2: 验证**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web-legacy"
npx tsc --noEmit
# 期望:无 error
```

**验收标准:** authStore 改造完成,新方法 `syncFromH5()` 可用

---

### Task 3.2: 修改根 layout 自动同步 H5 鉴权

**Files:**
- Create: `apps/admin-web-legacy/src/components/providers/AuthSyncProvider.tsx`
- Modify: `apps/admin-web-legacy/src/app/layout.tsx`

- [ ] **Step 1: 创建 AuthSyncProvider**

`apps/admin-web-legacy/src/components/providers/AuthSyncProvider.tsx`:
```tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, syncFromH5 } = useAuthStore();

  useEffect(() => {
    // 每次路由变化都尝试从 H5 同步
    syncFromH5();
  }, [pathname, syncFromH5]);

  useEffect(() => {
    // 未登录且不在登录页 → 跳登录页
    if (!isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [isAuthenticated, pathname, router]);

  return <>{children}</>;
}
```

- [ ] **Step 2: 修改 layout.tsx 包裹 AuthSyncProvider**

`apps/admin-web-legacy/src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import '@/styles/globals.css';
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider';
import AuthSyncProvider from '@/components/providers/AuthSyncProvider';
import { ConfigProvider } from 'antd';

export const metadata: Metadata = {
  title: 'WOPC 创业家 · 萨摩亚SPV × 海购星Dapp',
  description: 'WOPC 创业家管理后台 - Web3 One Person Company 运营中台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <ReactQueryProvider>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#1d4ed8',
              },
            }}
          >
            <AuthSyncProvider>{children}</AuthSyncProvider>
          </ConfigProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: 验证**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web-legacy"
npx tsc --noEmit
# 期望:无 error
```

**验收标准:** 自动同步 H5 鉴权,未登录自动跳 /login

---

### Task 3.3: 改造登录页支持 H5 storage 检测

**Files:**
- Modify: `apps/admin-web-legacy/src/app/login/page.tsx`

- [ ] **Step 1: 读取并修改 login/page.tsx**

读取 `apps/admin-web-legacy/src/app/login/page.tsx` 完整内容(后续 edit),在 `useEffect` 里加:
```typescript
useEffect(() => {
  // 检测 H5 端是否已登录
  syncFromH5();
  if (isAuthenticated) {
    router.push('/admin/dashboard');
  }
}, []);
```

并在登录成功后调用 `syncFromH5()`。

- [ ] **Step 2: 验证**
```powershell
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web-legacy"
npx tsc --noEmit
# 期望:无 error
```

- [ ] **Step 3: 跨项目 E2E 验证**
- 在 H5 端 `http://localhost:5173/login` 用 `admin` 登录
- 打开新 tab `http://localhost:3002/admin/dashboard`
- 期望:不需要重新登录,直接进入 Dashboard

**验收标准:** H5 端登录后,admin-web-legacy 共享鉴权,无需重新登录

---

# Phase 4: 16 大模块 86 页面细节完善 (16 tasks)

> **目标**:逐模块完善细节,所有页面文案品牌统一、数据完整、交互流畅
>
> **执行方式**:每个 task 重点是**质量审查 + 细节修复**,不重写整个页面

| Task | 模块 | 路径 | 重点 |
|---|---|---|---|
| T4.1 | Dashboard | `admin/dashboard/` | KPI 卡片数据准确性,图表主题色 |
| T4.2 | Web3.0 | `admin/web3/*`(3 页) | dapp 接入流程、区块链监控指标 |
| T4.3 | 公链 | `admin/chain/*`(5 页) | 节点状态、区块浏览、跨链桥 |
| T4.4 | CEX | `admin/cex/*`(7 页) | 交易对/订单/行情/风控 |
| T4.5 | DEX | `admin/dex/*`(4 页) | 流动性池/闪兑/挖矿 |
| T4.6 | DeFi | `admin/defi/*`(3 页) | 质押/流动性/收益 |
| T4.7 | Web3 钱包 | `admin/wallet/*`(5 页) | 地址/资产/交易/NFT/安全 |
| T4.8 | 质押挖矿 | `admin/staking/*`(5 页) | 矿池/记录/收益/推荐/配置 |
| T4.9 | IDO/Launchpad | `admin/ido/*`(5 页) | 项目/白名单/申购/解锁/发放 |
| T4.10 | 量化交易 | `admin/quant/*`(5 页) | 策略/回测/跟单/绩效/风控 |
| T4.11 | 娱乐游戏 | `admin/entertainment/*`(5 页) | 抽奖/盲盒/竞技/奖品/记录 |
| T4.12 | 电商商城 | `admin/ecommerce/*`(5 页) | 商品/订单/库存/物流/财务 |
| T4.13 | 国学内容 | `admin/content/*`(5 页) | 动漫/短剧/非遗/审核/NFT |
| T4.14 | 用户运营 | `admin/users/*`(4 页) | 用户/KYC/等级/邀请 |
| T4.15 | 财务中心 | `admin/finance/*`(4 页) | 概览/收入/对账/结算 |
| T4.16 | 系统管理 | `admin/settings/*`(4 页) + `admin/audit-logs/` | 系统/管理员/权限/日志/服务器 |

**每个 Task 的标准步骤**:
1. `npx tsc --noEmit` 确保无 TS 错误
2. 浏览器逐个打开页面,检查 mock 数据是否合理
3. 检查表单/按钮/Modal 是否可用
4. 检查图表渲染
5. 修复发现的 bug

---

# Phase 5: 通用组件与表格增强 (3 tasks)

### T5.1: 通用 CRUD 表格组件
- Files: `apps/admin-web-legacy/src/components/admin/CrudTable.tsx`
- 功能:封装 Antd Table + 查询/分页/批量操作/导出

### T5.2: 通用搜索筛选条
- Files: `apps/admin-web-legacy/src/components/admin/FilterBar.tsx`
- 功能:关键字 + 状态 + 时间范围 + 高级筛选

### T5.3: 通用详情 Drawer
- Files: `apps/admin-web-legacy/src/components/admin/DetailDrawer.tsx`
- 功能:右侧滑出,显示详情 + 操作按钮

---

# Phase 6: 通用 CRUD 模式与导出 (1 task)

### T6.1: 统一 Mock API 与 Excel/CSV 导出
- Files: `apps/admin-web-legacy/src/services/api.ts` + `src/lib/excel.ts`
- 功能:所有 admin 页面统一从 `*Api` 拉数据;统一导出函数

---

# Phase 7: 集成验证 + 跨项目 E2E (2 tasks)

### T7.1: 跨项目鉴权 + 路由跳转 E2E
- 验证:H5 端登录 → admin-web-legacy 自动登录 → 跳 Dashboard → 切换页面正常
- 验证:admin-web-legacy 退出后,H5 端不退出(独立 logout)
- 验证:H5 端退出后,admin-web-legacy 下次访问会跳登录

### T7.2: 全量编译 + Lint 验证
```powershell
# h5-app
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\h5-app"
npx tsc --noEmit
npm run lint

# admin-web-legacy
cd "d:\3、系统项目开发\trae_projects\SMYweb3.020260527\apps\admin-web-legacy"
npx tsc --noEmit
npm run lint
```
- 期望:两个项目都 0 error

---

## ⚠️ 风险与限制

1. **admin-web-legacy 的 .next/cache 已存在**,可能有 stale 缓存,需要 `rm -rf .next` 后重 build
2. **Next.js 14 + React 18 仍在维护期**,但 Next.js 15 + React 19 已发布,**本次不升级**(黄区警告:依赖升级需用户确认)
3. **H5 端原本没有 login 系统**,Task 2.4 实现的是 mock 登录。后端就绪后需切换为真实 API
4. **Mock 数据散落 86 个页面里**,统一抽象(Phase 6)需要逐个替换,工作量较大
5. **跨项目 storage 共享**依赖 localStorage 同源协议。H5 端口 5173,admin-web-legacy 端口 3002,**不同源,localStorage 不共享**!

### ⚠️ 重要:跨域 localStorage 问题

5173 和 3002 是**不同源**(不同端口),`localStorage` **不共享**。

**修正方案**:
- 方案 A:把所有 admin 链接改为 `http://localhost:3002/admin/dashboard`,用户在 H5 端登录后,**手动**打开新 tab 到 3002(需要先在 3002 端也登录一次)
- 方案 B:用 Vite proxy 把 5173 代理到 3002 路径下共享 cookie
- 方案 C:H5 登录页登录后,**自动新窗口打开 3002 并把 token 通过 URL hash 传过去**

**推荐方案 C** 的实现:在 Task 2.4 登录成功后,如果 user.isAdmin,新窗口打开 3002 并把 token 放到 URL(`http://localhost:3002/login?token=xxx`),admin-web-legacy /login 页读取后写入自己的 storage。

这个修正需要在 Phase 3 实施时**改 Task 3.3**。

---

## 📝 修订记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1 | 2026-06-07 | 初稿 |

---
*维护者:AI Dev Team | 项目:SMYweb3.020260527 | 关联 H5:H5 in `apps/h5-app/`*
