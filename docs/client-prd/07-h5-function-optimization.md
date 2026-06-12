# 07 · H5 功能打磨（H5 Function Optimization）

> **对应项目**：`apps/h5-app/`（Vite 7 + React 19 + Zustand 5 + React Router 6 + TailwindCSS 3 + shadcn/ui + framer-motion 12）
> **核心目标**：在**不改动 UI 界面结构**（布局 / 组件 / 路由 / 视觉）的前提下，**优化性能、用户体验、转化率、留存、可访问性**。
> **约束红线**：
>
> 1. ❌ 不改路由表（`App.tsx` 中的 `<Route>`）
> 2. ❌ 不改组件树结构（`MobileLayout` / `BottomNav` / `TopBar` 内部层级）
> 3. ❌ 不改 Tailwind class 编排与视觉色板（仅可新增/调整 CSS 变量与运行时状态）
> 4. ❌ 不改 i18n 字典 key 命名（必须严格按 [00-foundation §5.5.1](../../admin-prd/00-foundation.md) 速查表）
> 5. ❌ 不改状态色彩（严格按 [00-foundation §8.3.1](../../admin-prd/00-foundation.md) 扩展色彩表）
> 6. ✅ 可做：性能优化（懒加载 / 缓存 / 预取 / 监控）、交互增强（Skeleton / 加载态 / 错误态）、数据获取策略（React Query / SWR）、A/B 测试、i18n 文案打磨、A11y、SEO/PWA、可观测性
>    **后端**：与 H5 复用 `apps/api` NestJS 服务，**所有数据**通过 `/api/h5/*` 获取
>    **跨文件一致性**：i18n 命名 / 状态色彩 / 状态日志模式严格按 `docs/admin-prd/00-foundation.md` 强约束

---

## 0. 目录

- [1. 总论](#1-总论)
- [2. H5 全局优化（横切关注点）](#2-h5-全局优化横切关注点)
- [3. H5 通用组件库优化](#3-h5-通用组件库优化)
- [4. 逐菜单优化（20 个菜单逐一覆盖）](#4-逐菜单优化20-个菜单逐一覆盖)
- [5. 优化排期与影响评估](#5-优化排期与影响评估)
- [6. 跨文件一致性检查](#6-跨文件一致性检查)
- [7. 验收用例（汇总）](#7-验收用例汇总)
- [8. 风险与回滚预案](#8-风险与回滚预案)

---

<a id="1-总论"></a>

## 1. 总论

**为什么需要这章**：H5 端已实现 20 个菜单，但**首屏慢、列表卡顿、错误易丢、转化漏斗不清、留存指标缺失**。本章定义"不动 UI 也能做"的所有优化范畴、指标基线、度量体系与 A/B 测试框架，作为后续 19 章的纲领。

### 1.1 优化原则（4 条不可妥协）

| #   | 原则                                                                                      | 反例                                               |
| --- | ----------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | **UI 不动**——不改 `<MobileLayout>` / `<BottomNav>` / `<TopBar>` / 任何菜单组件的 JSX 结构 | 把 `<div>` 换成 `<section>`、加 `data-testid` 属性 |
| 2   | **数据驱动**——所有优化均通过数据指标提升（LCP/CLS/INP、CTR、转化率、7 日留存）            | 加个漂亮的 loading 动画，没指标                    |
| 3   | **渐进增强**——优先做 P0 性能与错误处理，**P2 的高级动效/A11y 必须排在 P0/P1 之后**        | 一上来就做 PWA / Service Worker                    |
| 4   | **可回滚**——所有改动以 feature flag 包裹，单开关 5 分钟内可关                             | 改主流程核心路径，无 fallback                      |

### 1.2 优化分类（5 大范畴）

| 范畴         | 主要手段                                              | 受益指标                             |
| ------------ | ----------------------------------------------------- | ------------------------------------ |
| **性能**     | 路由懒加载 / 预取 / 缓存 / 资源压缩 / Web Vitals 优化 | LCP / FCP / TTI / TBT / 流量         |
| **体验**     | Skeleton / Shimmer / 错误边界 / 离线降级 / Toast 队列 | 跳出率 / 平均停留 / 错误率           |
| **转化**     | CTA 位置 A/B / 漏斗埋点 / 智能推荐 / 防流失           | 订阅转化率 / 支付成功率 / DLC 升级率 |
| **留存**     | 推送召回 / 智能预加载 / 离线收藏 / 复访激励           | 7 日留存 / 30 日留存 / DAU/MAU       |
| **可访问性** | 键盘导航 / ARIA / 屏幕阅读器 / 动效减弱               | A11y 评分 / Lighthouse Score         |

### 1.3 优化基线（当前指标 vs 目标指标）

> 以下数据基于现有 H5 端 Lighthouse 测评（移动端 4G Slow 模拟），目标值在 **2 个 sprint（4 周）** 内达成。

| 指标                                 | 当前                 | 目标                  | 提升 |
| ------------------------------------ | -------------------- | --------------------- | ---- |
| **FCP**（First Contentful Paint）    | 2.8s                 | ≤ 1.5s                | -46% |
| **LCP**（Largest Contentful Paint）  | 4.2s                 | ≤ 2.5s                | -40% |
| **TBT**（Total Blocking Time）       | 850ms                | ≤ 200ms               | -76% |
| **CLS**（Cumulative Layout Shift）   | 0.18                 | ≤ 0.1                 | -44% |
| **INP**（Interaction to Next Paint） | 380ms                | ≤ 200ms               | -47% |
| **TTI**（Time to Interactive）       | 5.6s                 | ≤ 3.5s                | -38% |
| **首屏 JS 体积**                     | 480KB（gzipped）     | ≤ 250KB               | -48% |
| **首屏 LCP 元素**                    | Discover Banner 大图 | 渐变背景 + 延迟加载图 | —    |
| **路由切换耗时**                     | 600ms                | ≤ 200ms               | -67% |
| **错误率**（JS 异常/接口失败）       | 2.1%                 | ≤ 0.5%                | -76% |
| **Discover CTR**                     | 6.2%                 | ≥ 9%                  | +45% |
| **AI 大脑点击 → 发起对话率**         | 12%                  | ≥ 20%                 | +67% |
| **服务订阅转化率**                   | 3.8%                 | ≥ 6%                  | +58% |
| **7 日留存**                         | 22%                  | ≥ 30%                 | +36% |
| **DLC 等级升级转化**                 | 8%                   | ≥ 13%                 | +63% |
| **AI 名片分享率**                    | 4.5%                 | ≥ 7%                  | +56% |

### 1.4 度量体系（3 层）

#### 1.4.1 性能层（Web Vitals）

```typescript
// apps/h5-app/src/lib/vitals.ts
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

export function reportVitals() {
  const send = (metric: any) => {
    // 上报到自建 metrics 服务
    navigator.sendBeacon(
      '/api/h5/metrics',
      JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
        delta: metric.delta,
        id: metric.id,
        page: location.pathname,
        ts: Date.now(),
      })
    );
  };
  onLCP(send);
  onINP(send);
  onCLS(send);
  onFCP(send);
  onTTFB(send);
}
```

#### 1.4.2 转化层（漏斗埋点）

```typescript
// apps/h5-app/src/lib/funnel.ts
type FunnelStep = 'view' | 'click' | 'intent' | 'submit' | 'success';

export const trackFunnel = (funnelName: string, step: FunnelStep, meta?: Record<string, any>) => {
  // 统一上报到 /api/h5/track
  navigator.sendBeacon(
    '/api/h5/track',
    JSON.stringify({
      type: 'funnel',
      funnel: funnelName,
      step,
      meta,
      page: location.pathname,
      ts: Date.now(),
    })
  );
};

// 用法示例
trackFunnel('service_subscribe', 'view', { serviceId: 'svc_123' });
trackFunnel('service_subscribe', 'click', { serviceId: 'svc_123' });
trackFunnel('service_subscribe', 'submit', { serviceId: 'svc_123', plan: 'yearly' });
trackFunnel('service_subscribe', 'success', { serviceId: 'svc_123', orderId: 'ord_456' });
```

**核心漏斗**（按菜单）：
| 漏斗 | 步骤 |
|---|---|
| **订阅漏斗** | 服务市场 view → 商品详情 view → 选 plan → submit → paid |
| **AI 对话漏斗** | AI 大脑 view → 选 Agent → 发起会话 → 第 1 条消息 → 7 日回访 |
| **DLC 升级漏斗** | DLC 页 view → 任务列表 view → 完成任务 → 升级 submit → 升级 success |
| **AI 名片漏斗** | 名片 view → 编辑 → 保存 → 分享 → 新增好友 |
| **公司注册漏斗** | 服务市场 view → 公司注册详情 → 填写 → submit → 审核 paid |
| **银行开户漏斗** | 银行开户 view → 选银行 → 填资料 → 提交 → KYC pass |
| **税务计算漏斗** | 工具 view → 填数字 → 出结果 → 收藏 → 分享 |

#### 1.4.3 留存层（用户行为）

```typescript
// apps/h5-app/src/lib/retention.ts
export const trackRetention = (event: string, meta?: any) => {
  // 关键事件：login / view_menu / action_done / share / pay / upgrade
  // 后端做 cohort 分析（按注册周分群）
  navigator.sendBeacon(
    '/api/h5/track',
    JSON.stringify({
      type: 'retention',
      event,
      meta,
      userId: getUserId(),
      ts: Date.now(),
    })
  );
};
```

**核心指标**：

- **DAU / WAU / MAU**（按日 / 周 / 月活）
- **新用户 7 日留存曲线**（D1 / D3 / D7）
- **菜单访问频次 TOP10**（驱动预加载策略）
- **人均停留时长**（按菜单 / 按用户分群）

### 1.5 A/B 测试框架

> **目标**：所有 P0/P1 优化上线前必须 A/B 验证，避免"自以为优化"。

```typescript
// apps/h5-app/src/lib/ab.ts
import { create } from 'zustand';

type Experiment = 'home_banner_layout' | 'service_card_cta' | 'ai_suggest' | /* ... */;

interface AbStore {
  assign: (key: Experiment) => 'A' | 'B';
  // 后端 A/B 决策：同 userId + experiment 永远同分桶
}

const STORAGE_KEY = 'ab_assignment';

export function useExperiment(key: Experiment): { variant: 'A' | 'B'; track: (event: string, meta?: any) => void } {
  const assignments = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  let variant = assignments[key];
  if (!variant) {
    variant = Math.random() < 0.5 ? 'A' : 'B';
    assignments[key] = variant;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  }

  const track = (event: string, meta: any = {}) => {
    navigator.sendBeacon('/api/h5/track', JSON.stringify({
      type: 'ab',
      experiment: key,
      variant,
      event,
      meta,
      ts: Date.now(),
    }));
  };

  return { variant, track };
}
```

**A/B 测试流程**：

1. **定义假设**：例"Discover 首页第 2 屏改为横滑卡片比竖列列表 CTR +20%"
2. **设计变体**：A = 当前 UI / B = 新 UI（**保持 layout 不变，仅改 props**）
3. **流量分配**：5% 灰度 → 20% → 50% → 100%
4. **最小样本**：每组 ≥ 1000 UV，统计显著性 p < 0.05
5. **决策**：胜出组全量；落败组回滚（feature flag 一键关）
6. **保留期**：实验持续 ≥ 7 天（覆盖工作日 + 周末）

**关键原则**：

- ❌ 不在同一实验里测两个变量（多变量 = 难归因）
- ✅ 单变量 + 单指标 + 最小样本
- ✅ 失败的实验也要发"复盘"邮件给产品

---

<a id="2-h5-全局优化横切关注点"></a>

## 2. H5 全局优化（横切关注点）

**为什么需要这章**：性能 / 缓存 / 错误处理 / 主题 / 字体 / 图片 / 代码分割 / PWA / 监控 这些**横切关注点**会影响所有 20 个菜单，单点优化无法解决系统性问题。本章给出**全局方案**，每节给出**真实可落地的代码**。

### 2.1 路由懒加载 + Prefetch

**现状问题**：`App.tsx` 一次性 import 全部 20 个页面（Home/Discover/.../AiBusinessCard），首次进入首屏需加载 ~480KB JS。

**优化方案**（**不**改 UI 与路由）：

- ✅ 用 `React.lazy` + `Suspense` 拆分（**不**动 `App.tsx` JSX 结构，只把 import 改为 lazy）
- ✅ 用 `<link rel="modulepreload">` 预加载 Top 5 高频页面
- ✅ 用 `IntersectionObserver` 监听用户 hover Tab 立即 prefetch

```typescript
// apps/h5-app/src/App.tsx（仅改 import 部分，JSX 结构不动）
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import ErrorBoundary from '@/components/ErrorFallback';

// ✅ 改为 lazy（首屏不打包）
const Home = lazy(() => import(/* webpackChunkName: "home" */ '@/pages/app/Home'));
const Discover = lazy(() => import(/* webpackChunkName: "discover" */ '@/pages/app/Discover'));
const Services = lazy(() => import(/* webpackChunkName: "services" */ '@/pages/app/Services'));
const AiBrain = lazy(() => import(/* webpackChunkName: "ai-brain" */ '@/pages/app/AiBrain'));
const Profile = lazy(() => import(/* webpackChunkName: "profile" */ '@/pages/app/Profile'));
const TaxCalculator = lazy(() => import('@/pages/sub/TaxCalculator'));
// ... 其余 15 个子页同样 lazy

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<MobileLayout />}>
          <Route path="/" element={<Suspense fallback={null}><Home /></Suspense>} />
          {/* ... 其余 19 个路由用同样模式包 Suspense */}
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
```

**首屏体积对比**（预估）：
| 页面 | 当前 | 优化后 |
|---|---|---|
| 首屏（/） | 480KB | **128KB**（-73%） |
| Discover 切 | 480KB | 95KB（已 cache） |
| 路由切换 | 600ms | **120ms**（命中 cache） |

**Vite 配置**（自动分 chunk）：

```typescript
// apps/h5-app/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // vendor 拆 3 段：react / radix / utilities
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            // ... 用到的 radix
          ],
          'vendor-utils': ['framer-motion', 'recharts', 'date-fns', 'zod'],
        },
      },
    },
  },
});
```

**Prefetch 策略**：

```typescript
// apps/h5-app/src/lib/prefetch.ts
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// 用户悬停 / touchstart 立即预取
const preloaded = new Set<string>();

export function prefetchRoute(path: string) {
  if (preloaded.has(path)) return;
  preloaded.add(path);

  // 触发 import
  switch (path) {
    case '/':
      import('@/pages/app/Home');
      break;
    case '/discover':
      import('@/pages/app/Discover');
      break;
    // ... 其余 18 个
  }
}

// 在 BottomNav 用
export function usePrefetchOnVisible() {
  const loc = useLocation();
  useEffect(() => {
    // 进入首页后，后台 idle 预取 Top 5 高频
    if (loc.pathname === '/' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        prefetchRoute('/discover');
        prefetchRoute('/services');
        prefetchRoute('/ai');
        prefetchRoute('/profile');
        prefetchRoute('/ai-business-card');
      });
    }
  }, [loc.pathname]);
}
```

### 2.2 全局状态管理（Zustand 5 选型）

**现状**：`apps/h5-app/src/store/index.ts` 用了 Zustand，但**所有数据塞在一个 store**（mockData 内嵌），实际生产数据要从 `/api/h5/*` 拉取。

**优化方案**：

- ✅ **数据 store**（user / wallet / companies / agents...）— 从 API 拉
- ✅ **UI store**（toast / modal / bottomSheet）— 纯本地
- ✅ **持久化 store**（locale / theme / abAssignment）— `persist` 中间件

```typescript
// apps/h5-app/src/store/data.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// ✅ 方式 1：UI 状态（toast / modal）— Zustand
interface UIStore {
  toasts: ToastItem[];
  pushToast: (t: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  modal: { open: boolean; content: ReactNode };
  openModal: (content: ReactNode) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  toasts: [],
  pushToast: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: nanoid() }] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  modal: { open: false, content: null },
  openModal: (content) => set({ modal: { open: true, content } }),
  closeModal: () => set({ modal: { open: false, content: null } }),
}));

// ✅ 方式 2：服务端数据 — React Query（不塞进 Zustand）
export const useUser = () =>
  useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.get('/api/h5/user/me'),
    staleTime: 5 * 60 * 1000, // 5 min fresh
    gcTime: 30 * 60 * 1000, // 30 min cache
  });

export const useCompanies = () =>
  useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/api/h5/companies'),
    staleTime: 1 * 60 * 1000,
  });

// ✅ 方式 3：用户偏好 — Zustand persist
interface PrefStore {
  locale: 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR';
  setLocale: (l: PrefStore['locale']) => void;
  theme: 'light' | 'dark' | 'auto';
  setTheme: (t: PrefStore['theme']) => void;
  recentlyViewed: string[]; // 最近访问菜单 id 数组
  addRecent: (id: string) => void;
}

export const usePrefStore = create<PrefStore>()(
  persist(
    (set) => ({
      locale: 'zh-CN',
      setLocale: (locale) => set({ locale }),
      theme: 'auto',
      setTheme: (theme) => set({ theme }),
      recentlyViewed: [],
      addRecent: (id) =>
        set((s) => ({
          recentlyViewed: [id, ...s.recentlyViewed.filter((x) => x !== id)].slice(0, 10),
        })),
    }),
    {
      name: 'smy-h5-pref',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**关键决策**：

- ❌ **不**把所有数据塞进 Zustand（重新发明 React Query）
- ✅ Zustand 仅管 UI 状态 + 用户偏好
- ✅ 服务端数据走 React Query（自动 stale / cache / refetch / 乐观更新）
- ❌ **不**用 Redux / MobX（团队 Zustand 5 已熟练）

### 2.3 全局错误边界（ErrorBoundary + Sentry）

**现状**：`App.tsx` 已有 `<ErrorBoundary>`，但**粒度太粗**（整个 App 崩溃才捕获），**无上报**、**无降级 UI**。

**优化方案**：

- ✅ **3 级 ErrorBoundary**：全局 → 页面级 → 区块级
- ✅ 接入 Sentry（前端 SDK）
- ✅ 降级 UI（不白屏）

```typescript
// apps/h5-app/src/components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'global' | 'page' | 'block';
  onError?: (err: Error, info: React.ErrorInfo) => void;
}

interface State { hasError: boolean; err?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, err };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    const { level = 'global', onError } = this.props;
    // ✅ Sentry 上报（带 tag 区分级别）
    Sentry.withScope((scope) => {
      scope.setTag('boundaryLevel', level);
      scope.setExtra('componentStack', info.componentStack);
      Sentry.captureException(err);
    });
    onError?.(err, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <h2 className="text-lg font-semibold">页面出错了</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {this.state.err?.message || '请稍后重试'}
          </p>
          <button onClick={() => location.reload()} className="mt-4 px-4 py-2 bg-primary text-white rounded">
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**3 级包裹**（**不动 UI**，仅在 App.tsx 加 boundary）：

```typescript
// 1. 全局：App.tsx 已包（保留）
<ErrorBoundary level="global">
  <Routes>...</Routes>
</ErrorBoundary>

// 2. 页面级：每个 menu 内部包
export default function Discover() {
  return (
    <ErrorBoundary level="page" fallback={<DiscoverFallback />}>
      {/* 原有 JSX 不动 */}
    </ErrorBoundary>
  );
}

// 3. 区块级：列表区 / 详情区
<ErrorBoundary level="block" fallback={<SmallFallback />}>
  <ListView />
</ErrorBoundary>
```

**降级 UI 三态**：

- **页面级 fallback**：显示骨架 + "返回首页"按钮
- **区块级 fallback**：显示 "该模块暂时不可用" + 重试按钮
- **白屏兜底**：Sentry 弹 toast "页面异常，请截图反馈"

**验收**：

- 故意 throw error → 触发 boundary → Sentry 收到 → 降级 UI 出现 → 不影响其他区块

### 2.4 全局 Loading 状态

**现状**：每个页面自己处理 loading，**风格不统一**，无统一 Spinner 规范。

**优化方案**（**不动**组件 JSX，仅优化策略）：

- ✅ 引入 **Skeleton 优先**（不用 Spinner）—— 感知更快
- ✅ 列表用 `react-virtuoso`（虚拟滚动 + 无限加载 + 骨架）
- ✅ 全屏 Loading 用 `nprogress`（顶部进度条）

```typescript
// ✅ 页面级 Skeleton
<Skeleton className="h-32 w-full" />  // 已有 @/components/shared/Skeleton

// ✅ 路由切换 Loading（不改 UI，仅加 Suspense fallback）
<Suspense fallback={<RouteSkeleton />}>
  <Home />
</Suspense>

// ✅ 列表 Skeleton
{isLoading ? (
  <>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</>
) : (
  <ListView items={data} />
)}
```

**`nprogress` 顶部进度条**（仅在 API 调用时显示）：

```typescript
// apps/h5-app/src/lib/axios-interceptor.ts
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

api.interceptors.request.use((config) => {
  if (!config.headers['X-No-Progress']) NProgress.start();
  return config;
});

api.interceptors.response.use(
  (res) => {
    NProgress.done();
    return res;
  },
  (err) => {
    NProgress.done();
    throw err;
  }
);
```

**关键原则**：

- **< 200ms**：不显示 loading（**FEP < 200ms 用户无感**）
- **200ms - 1s**：Skeleton 渐显
- **1s - 5s**：Skeleton + "加载中" 文字 + 可取消
- **> 5s**：超时提示 + 重试按钮

### 2.5 主题 / 暗色模式（不改 UI 但支持系统切换）

**现状**：H5 端颜色写死（`bg-bg-dark`），**不响应系统**。

**优化方案**：用 `next-themes`（**已**在 `package.json` 依赖里）+ 调整 CSS 变量层。

```typescript
// apps/h5-app/src/main.tsx（仅加 ThemeProvider，不动 UI）
import { ThemeProvider } from 'next-themes';

<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
  <App />
</ThemeProvider>
```

```css
/* src/index.css —— 已有 CSS 变量层，仅扩展支持 system */
:root {
  --bg-primary: #0a0e1a; /* dark default */
  --bg-surface: #131826;
  --text-primary: #ffffff;
}
:root.light {
  --bg-primary: #f9fafb;
  --bg-surface: #ffffff;
  --text-primary: #111827;
}
@media (prefers-color-scheme: light) {
  :root:not(.dark) {
    --bg-primary: #f9fafb;
    /* ... */
  }
}
```

**关键**：

- ❌ **不**改 `bg-bg-dark` 这种 Tailwind class
- ✅ 通过 CSS 变量覆盖实现系统暗色 → 浅色
- ✅ 用户偏好存 `localStorage.theme`（`auto`/`light`/`dark`）

### 2.6 字体优化

**现状**：`index.html` 默认系统字体，**未做字体子集化**。

**优化方案**（**不**改 UI）：

- ✅ 用 `font-display: swap`（已有）
- ✅ 4 语言**子集化**（中/英/日/韩 → ~30-50KB / 语言）
- ✅ Variable Font（思源黑体 1 个文件搞定所有字重）

```html
<!-- index.html -->
<link
  rel="preload"
  href="/fonts/SourceHanSansSC-VF.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
<style>
  @font-face {
    font-family: 'SourceHanSans';
    src: url('/fonts/SourceHanSansSC-VF.woff2') format('woff2-variations');
    font-display: swap;
    font-weight: 100 900;
  }
</style>
```

**性能影响**：

- 字体子集化后，**首屏字体体积从 ~800KB 降至 ~120KB**
- LCP **降低 200-400ms**（不再等字体下载）

### 2.7 图片优化

**现状**：H5 端有大量图片（Banner / 头像 / 视频封面 / 名片背景），**未做格式优化 + 响应式**。

**优化方案**：

- ✅ **WebP** / **AVIF**（CDN 自动转换）
- ✅ **响应式 srcset**（移动端 1x/2x/3x）
- ✅ **lazy loading**（`loading="lazy"` + IntersectionObserver）
- ✅ **占位图**（低质量缩略图 + blur-up）

```html
<!-- ✅ 标准模式：WebP + fallback + srcset + lazy -->
<picture>
  <source
    type="image/avif"
    srcset="https://cdn.smy.app/cover-640.avif 640w, https://cdn.smy.app/cover-1280.avif 1280w"
    sizes="(max-width: 640px) 100vw, 640px"
  />
  <source
    type="image/webp"
    srcset="https://cdn.smy.app/cover-640.webp 640w, https://cdn.smy.app/cover-1280.webp 1280w"
    sizes="(max-width: 640px) 100vw, 640px"
  />
  <img
    src="https://cdn.smy.app/cover-640.jpg"
    alt="封面"
    loading="lazy"
    decoding="async"
    class="w-full h-auto"
  />
</picture>
```

**性能影响**：

- WebP 比 JPEG **小 25-35%**
- AVIF 比 WebP **再小 20-30%**（兼容性 OK 后切换）
- 首屏 LCP 图片从 200KB → 60KB

**CDN 自动转换**（图片上传时）：

```typescript
// 业务侧：上传原图 → CDN 转 WebP/AVIF/多尺寸
async function uploadImage(file: File) {
  const form = new FormData();
  form.append('file', file);
  const { url } = await api.post('/api/h5/upload/image', form);

  // 返回 url 模板，前端拼接尺寸
  return {
    original: url,
    webp: url.replace(/\.\w+$/, '.webp'),
    avif: url.replace(/\.\w+$/, '.avif'),
    thumbnail: url.replace(/\.\w+$/, '_thumb.webp'),
  };
}
```

### 2.8 代码分割（vendor / route / component）

详见 §2.1。本节补充 **component 级分割**：

```typescript
// ✅ 重组件 lazy（不影响首屏）
const RechartsChart = lazy(() =>
  import('recharts').then((m) => ({ default: m.ResponsiveContainer }))
);

// ✅ 重弹窗 lazy
const RichTextEditor = lazy(() => import('@/components/RichTextEditor'));

// ✅ 大表单 lazy
const CompanyRegisterForm = lazy(() =>
  import('@/pages/sub/CompanyRegister').then((m) => ({ default: m.CompanyRegisterForm }))
);
```

**Vite 报告**（`vite-bundle-visualizer` 验证）：

- 首屏 chunk ≤ 250KB
- 单个 lazy chunk ≤ 80KB
- vendor-react 不变（仅拆分 radix / utils）

### 2.9 PWA（添加到主屏 / 离线访问）

**现状**：H5 **没有** PWA（无 `manifest.json`、无 Service Worker）。

**优化方案**（**不**改 UI）：

```typescript
// vite-plugin-pwa
import { VitePWA } from 'vite-plugin-pwa';

// vite.config.ts
plugins: [
  react(),
  VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: '海购星 - SMY',
      short_name: '海购星',
      description: '萨摩亚合规出海一站式平台',
      theme_color: '#0A0E1A',
      background_color: '#0A0E1A',
      display: 'standalone',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    workbox: {
      runtimeCaching: [
        {
          // API GET 请求 - StaleWhileRevalidate
          urlPattern: /^\/api\/h5\/(?!auth|payment|wx-).*$/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'api-cache',
            expiration: { maxAgeSeconds: 60 * 60 * 24 }, // 1 天
          },
        },
        {
          // CDN 图片 - CacheFirst
          urlPattern: /^https:\/\/cdn\.smy\.app\//,
          handler: 'CacheFirst',
          options: {
            cacheName: 'cdn-images',
            expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 天
          },
        },
      ],
    },
  }),
];
```

**离线策略**：

- **App Shell**：HTML / CSS / JS（CacheFirst）
- **API GET**：StaleWhileRevalidate（**关键**：让"上次看过"的内容可离线访问）
- **图片**：CacheFirst（30 天）
- **POST / 支付 / 写操作**：NetworkOnly（**不**缓存）

**添加到主屏**（PWA install prompt）：

```typescript
// apps/h5-app/src/lib/pwa-install.ts
let deferredPrompt: any;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // 触发自定义提示（"添加到主屏"按钮）
  useUIStore.getState().setCanInstall(true);
});

export async function installPwa() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === 'accepted';
}
```

**离线降级**：

- **首屏可显示**（已 cache 的 App Shell）
- **数据不可拉**：toast "您当前处于离线模式，部分功能不可用"
- **写操作**：toast "操作将在恢复网络后重试"

### 2.10 性能监控（Web Vitals / Lighthouse CI）

**实现**：

```typescript
// apps/h5-app/src/main.tsx
import { reportVitals } from '@/lib/vitals';

if ('performance' in window) {
  reportVitals();
}
```

**Lighthouse CI**（自动化）：

```yaml
# .github/workflows/lighthouse-ci.yml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - run: npm run preview &
      - uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:5174/
            http://localhost:5174/discover
            http://localhost:5174/services
            http://localhost:5174/ai
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

**`lighthouse-budget.json`**（性能预算）：

```json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script", "budget": 250 },
      { "resourceType": "image", "budget": 300 },
      { "resourceType": "total", "budget": 800 }
    ],
    "timings": [
      { "metric": "interactive", "budget": 3500 },
      { "metric": "first-contentful-paint", "budget": 1500 },
      { "metric": "largest-contentful-paint", "budget": 2500 }
    ]
  }
]
```

**RUM（Real User Monitoring）**：

- 上报：FCP / LCP / INP / CLS / TTFB（按页面、按时段、按设备）
- 看板：Grafana / 自建
- 告警：P95 LCP > 3s 自动告警

---

<a id="3-h5-通用组件库优化"></a>

## 3. H5 通用组件库优化

**为什么需要这章**：H5 现有 20 个菜单共用一批通用组件（ListView / Form / Modal / Toast / DatePicker / Search...），但**性能瓶颈集中在通用组件**——一次列表卡顿，10 个菜单受影响。本章逐组件给出**性能 / 体验 / A11y** 三维优化方案。

### 3.1 ListView（虚拟滚动 / 无限加载 / 骨架屏）

**现状**：用 `<ul>` + 全部渲染，**1000 条就卡顿**。

**优化方案**：

- ✅ `react-virtuoso`（虚拟滚动，仅渲染可视区）
- ✅ IntersectionObserver 实现无限加载
- ✅ Skeleton 占位
- ✅ `useMemo` 优化行渲染

```typescript
// apps/h5-app/src/components/shared/ListView.tsx
import { Virtuoso } from 'react-virtuoso';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Skeleton } from './Skeleton';

interface ListViewProps<T> {
  queryKey: string[];
  queryFn: (page: number) => Promise<{ data: T[]; hasMore: boolean }>;
  renderItem: (item: T, idx: number) => ReactNode;
  emptyText?: string;
  pageSize?: number;
  estimateSize?: number;  // 每行预估高度
}

export function ListView<T>({ queryKey, queryFn, renderItem, emptyText, pageSize = 20, estimateSize = 80 }: ListViewProps<T>) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) => queryFn(pageParam),
    getNextPageParam: (last) => last.hasMore ? last.data.length / pageSize + 1 : undefined,
    initialPageParam: 1,
  });

  const items = data?.pages.flatMap((p) => p.data) ?? [];

  if (isLoading) {
    return <>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 mb-2" />)}</>;
  }
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }
  if (items.length === 0) {
    return <EmptyState text={emptyText} />;
  }

  return (
    <Virtuoso
      data={items}
      endReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
      itemContent={(idx, item) => renderItem(item, idx)}
      overscan={200}  // 预渲染 200px
      increaseViewportBy={{ top: 0, bottom: 300 }}
    />
  );
}
```

**性能对比**：
| 列表 | 当前 | 优化后 |
|---|---|---|
| 1000 条滚动 | 35 FPS | **60 FPS** |
| 初次渲染 | 1.2s | **80ms** |
| 内存占用 | 80MB | **12MB** |

### 3.2 Form（React Hook Form + Zod 校验）

**现状**：`@hookform/resolvers` + `react-hook-form` + `zod` 已在依赖（**未**统一使用）。

**优化方案**：

- ✅ 全部表单走 RHF + Zod（**统一** schema）
- ✅ 字段级 debounce 校验
- ✅ 服务端错误回填（422 → field errors）

```typescript
// apps/h5-app/src/lib/form.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('请输入有效的邮箱'),
  phone: z.string().regex(/^\+\d{8,15}$/, '请输入带国家码的手机号'),
  password: z.string().min(8, '密码至少 8 位').max(64),
});

type FormData = z.infer<typeof schema>;

export function useLoginForm() {
  return useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur', // 失焦校验（不比 onChange 烦人）
    defaultValues: { email: '', phone: '', password: '' },
  });
}
```

**统一错误提示**（i18n 字典）：

```typescript
// src/lib/zod-i18n.ts
import { z } from 'zod';

const errorMap: z.ZodErrorMap = (issue, ctx) => {
  // 查 i18n 字典（不动 key 命名）
  return { message: t(`form.error.${issue.code}`, { field: issue.path.join('.') }) };
};
z.setErrorMap(errorMap);
```

**好处**：

- 校验逻辑 100% 在 schema 里（前后端共用）
- 字段错自动回填（422 → `setError('email', ...)`）
- A11y：`aria-invalid` + `aria-describedby` 自动关联

### 3.3 Modal / Drawer（懒加载 / Portal）

**现状**：Modal / Drawer 用 shadcn/ui（**已** Portal 化）。

**优化方案**：

- ✅ **重 Modal 懒加载**（如 RichTextEditor Modal）
- ✅ **多 Modal 串行管理**（栈式 + ESC 关栈顶）
- ✅ **背景滚动锁定**（`overflow: hidden` on body）

```typescript
// apps/h5-app/src/components/shared/ModalStack.tsx
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';

interface ModalItem { id: string; content: ReactNode; onClose?: () => void; }

const stack: ModalItem[] = [];
const listeners = new Set<() => void>();

export function pushModal(content: ReactNode, onClose?: () => void) {
  stack.push({ id: nanoid(), content, onClose });
  listeners.forEach((fn) => fn());
}

export function popModal() {
  const item = stack.pop();
  item?.onClose?.();
  listeners.forEach((fn) => fn());
}

export function ModalStack() {
  const [, force] = useState({});
  useEffect(() => {
    const fn = () => force({});
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  // 锁定背景滚动
  useEffect(() => {
    if (stack.length > 0) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [stack.length]);

  return (
    <AnimatePresence>
      {stack.map((m, i) => (
        <ModalPortal key={m.id} index={i} total={stack.length}>
          {m.content}
        </ModalPortal>
      ))}
    </AnimatePresence>
  );
}
```

### 3.4 Toast / Notification（队列管理）

**现状**：`sonner` 已装（**未**统一使用）。

**优化方案**：

- ✅ 用 `sonner` 统一（`toast.success / error / warning / info`）
- ✅ 队列管理（最多 3 个同时，超过排队）
- ✅ 位置：底部居上（移动端友好）
- ✅ 自动消失 + 可手动关闭

```typescript
// apps/h5-app/src/main.tsx
import { Toaster } from 'sonner';

<Toaster
  position="top-center"
  duration={3000}
  visibleToasts={3}
  closeButton
  richColors
  theme="dark"
/>
```

**i18n 错误码**（API 错误 → i18n key）：

```typescript
// src/lib/toast.ts
import { toast } from 'sonner';
import { t } from 'i18next';

const ERROR_I18N_MAP: Record<string, string> = {
  AUTH_001: 'auth.error.tokenExpired',
  PAY_001: 'payment.error.insufficient',
  // ...
};

export function toastError(code: string, fallback?: string) {
  const key = ERROR_I18N_MAP[code];
  toast.error(key ? t(key) : fallback || code);
}
```

### 3.5 DatePicker / TimePicker（性能）

**现状**：`react-day-picker` 已装（**未**统一）。

**优化方案**：

- ✅ 用 `react-day-picker`（已支持 mobile）
- ✅ 懒加载（按需打开弹窗才 import）
- ✅ 内存化 locale 字典
- ✅ 快捷选项（"今天 / 7 天内 / 30 天内 / 自定义"）

```typescript
// 懒加载（用户点开 DatePicker 才下载）
const DayPicker = lazy(() => import('react-day-picker').then(m => ({ default: m.DayPicker })));

<Suspense fallback={<Skeleton className="h-64 w-80" />}>
  <DayPicker mode="single" selected={date} onSelect={setDate} locale={locale} />
</Suspense>
```

**性能**：首屏不打包，**节省 30KB**。

### 3.6 RichText Editor（懒加载）

**现状**：未统一。

**优化方案**：

- ✅ 用 `tiptap`（10x React 友好，**轻**）
- ✅ 懒加载（仅 AI Chat / 公司注册介绍需要时加载）

```typescript
// 懒加载（仅在富文本编辑时）
const Editor = lazy(() => import('@tiptap/react').then((m) => ({ default: m.useEditor })));
```

**好处**：

- 首屏**不打包** tiptap（节省 ~120KB）
- AI Chat 切换到富文本模式时才下载

### 3.7 StatusBadge（按 00-foundation §8.3.1 颜色）

**现状**：`<StatusBadge />` 组件已在 `components/shared/`。

**优化方案**（**不**改 UI）：

- ✅ 严格按 00-foundation §8.3.1 扩展色彩表映射
- ✅ 颜色 + 文字双标识（A11y 必需）
- ✅ 暗色模式自动调整（CSS 变量）

```typescript
// apps/h5-app/src/components/shared/StatusBadge.tsx
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

// 严格按 00-foundation §8.3.1
const STATUS_COLOR_MAP = {
  // 通用（来自 §8.3.1）
  PENDING: 'bg-[#F6A623] text-white',
  PROCESSING: 'bg-[#3B82F6] text-white',
  REVIEWING: 'bg-[#8B5CF6] text-white',
  APPROVED: 'bg-[#10B981] text-white',
  REJECTED: 'bg-[#EF4444] text-white',
  DISABLED: 'bg-[#6B7280] text-white',
  DRAFT: 'bg-[#9CA3AF] text-white',
  WITHDRAWN: 'bg-[#6B7280] text-white',
  EXPIRED: 'bg-[#9CA3AF] text-white',
  // ... 业务状态
  submitted: 'bg-[#3B82F6] text-white',
  supplementing: 'bg-[#F59E0B] text-white',
  cancelled: 'bg-[#6B7280] text-white',
  completed: 'bg-[#10B981] text-white',
  kyc_pending: 'bg-[#8B5CF6] text-white',
  kyc_approved: 'bg-[#10B981] text-white',
  kyc_rejected: 'bg-[#EF4444] text-white',
  // ...
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <Badge
      className={STATUS_COLOR_MAP[status as keyof typeof STATUS_COLOR_MAP] || 'bg-gray-500 text-white'}
      aria-label={t(`common.status.${status}`, status)}
    >
      {t(`common.status.${status}`, status)}
    </Badge>
  );
}
```

### 3.8 EmptyState / ErrorState / LoadingState

**统一规范**（**不**改 UI，仅统一）：

```typescript
// apps/h5-app/src/components/shared/States.tsx
export function EmptyState({ text, icon: Icon = Inbox }: { text: string; icon?: any }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Icon className="h-12 w-12 mb-4 opacity-50" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <AlertTriangle className="h-12 w-12 mb-4 text-destructive" aria-hidden="true" />
      <p className="text-foreground mb-4">{t('common.error.loadFailed')}</p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        {t('common.retry')}
      </Button>
    </div>
  );
}

export function LoadingState({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}
```

### 3.9 搜索（防抖 / 联想 / 高亮）

**现状**：未统一。

**优化方案**：

- ✅ **300ms debounce**（用户停止输入 300ms 才请求）
- ✅ **联想词**（前端预计算 + 后端返回）
- ✅ **高亮匹配**（`<mark>`）
- ✅ **搜索历史**（localStorage 存最近 10 个）
- ✅ **空结果降级**（"试试其他关键词" + 推荐搜索词）

```typescript
// apps/h5-app/src/hooks/useSearch.ts
import { useState, useMemo, useEffect } from 'react';
import { useDebounce } from 'use-debounce'; // 或自写

export function useSearch<T>(source: T[], fields: (keyof T)[], initial: string = '') {
  const [query, setQuery] = useState(initial);
  const [debouncedQuery] = useDebounce(query, 300);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return source;
    const q = debouncedQuery.toLowerCase();
    return source.filter((item) => fields.some((f) => String(item[f]).toLowerCase().includes(q)));
  }, [source, fields, debouncedQuery]);

  return { query, setQuery, results, isSearching: query !== debouncedQuery };
}
```

**性能**：

- 1000 条数据本地搜索：**< 5ms**
- 远程 API 搜索：debounce 300ms 后只发 1 次

### 3.10 筛选 / 排序（URL 同步 / 后端分页）

**现状**：筛选条件存组件 state，**刷新丢失**。

**优化方案**：

- ✅ **URL 同步**（`?status=active&sort=-createdAt`）— 刷新不丢、可分享、可书签
- ✅ **后端分页**（不一次性拉全部）
- ✅ **筛选项预加载**（打开页面时 idle 拉筛选项字典）

```typescript
// apps/h5-app/src/hooks/useUrlState.ts
import { useSearchParams } from 'react-router-dom';

export function useUrlState<T extends string>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [params, setParams] = useSearchParams();
  const value = (params.get(key) as T) || defaultValue;
  const setValue = (v: T) => {
    setParams(
      (p) => {
        if (v === defaultValue) p.delete(key);
        else p.set(key, v);
        return p;
      },
      { replace: true }
    );
  };
  return [value, setValue];
}
```

**好处**：

- 复制 URL 给同事，状态完整还原
- 浏览器前进/后退正常
- SEO 友好（爬虫可抓筛选后的页面）

---

<a id="4-逐菜单优化20-个菜单逐一覆盖"></a>

## 4. 逐菜单优化（20 个菜单逐一覆盖）

**为什么需要这章**：通用优化解决"系统级"问题，但**每个菜单的"业务瓶颈"不同**——Discover 是首屏 LCP 大图、Services 是 CTA 转化漏斗、AI Chat 是打字流畅度、AI Brain 是智能推荐。本章对 **20 个菜单逐一给出 6-8 项优化建议**，每节指出"现有 UI 是什么 + 不改 UI 的前提下能优化什么"。

---

<a id="4-1-discover-首页"></a>

### 4.1 `/` — Discover 首页（推荐流）

> **对应 PRD**：[docs/admin-prd/02-discover.md](../../admin-prd/02-discover.md)
> **现有 UI**（保持不变）：Home 页面含 Hero Banner + 5 个快捷入口（公司注册/银行开户/税务计算/法务中台/视频中心）+ AI 智能推荐卡片流 + 通知红点
> **关键指标**：LCP / CTR / 跳出率

#### 4.1.1 首屏性能优化（LCP）

**现状问题**：Hero Banner 是张大图（1920x1080 原图，~400KB），移动端加载 1.5s+。
**不改 UI 的优化**：

- ✅ **LCP 元素替换**：把"首屏 LCP 元素"从"图片"换成"渐变 + 标题文字"（CSS 渐变 0ms 渲染）
- ✅ Banner 图片 `loading="eager"` + `fetchpriority="high"`
- ✅ 用 AVIF + 移动端尺寸（640w 而非 1920w）
- ✅ **预连接** CDN 域名（`<link rel="preconnect">`）

```html
<!-- index.html -->
<link rel="preconnect" href="https://cdn.smy.app" />
<link rel="dns-prefetch" href="https://api.smy.app" />
```

**预期**：LCP 从 4.2s → 2.2s（-48%）

#### 4.1.2 智能预加载

**不改 UI 的优化**：

- ✅ 用户悬停 5 个快捷入口时，**立即 prefetch** 对应 chunk
- ✅ 滚动到第 3 屏时 prefetch AI 大脑 / 服务市场

#### 4.1.3 个性化推荐（提升 CTR）

**不改 UI 的优化**：

- ✅ **第 2 屏**根据用户 DLC 等级 / 浏览历史智能推荐（后端算，前端渲染）
- ✅ **第 4 屏**"你可能感兴趣"——AI 协同过滤 + 内容标签
- ✅ **A/B 测试**第 1 屏 Banner 是"渐变"还是"图片"

**预期**：Discover CTR 6.2% → 9%+

#### 4.1.4 转化漏斗埋点

**埋点**：

```typescript
useEffect(() => {
  trackFunnel('home_view', 'view');
}, []);

const onShortcutClick = (id: string) => {
  trackFunnel('home_shortcut', 'click', { id });
  navigate(`/sub/${id}`);
};
```

**漏斗**：Home view → 5 入口点击率 → 进入子页 → 完成业务

#### 4.1.5 推送召回（提升留存）

**D+1 推送**："您昨天浏览的 X 服务有更新"
**D+7 推送**："您关注的 AI Agent 新对话"
**D+30 推送**："您的 DLC 等级即将升级"（紧迫感）

#### 4.1.6 A11y 增强

- ✅ Banner 加 `role="banner"` + `aria-label`
- ✅ 快捷入口加 `aria-label="快速访问:公司注册"`
- ✅ 红点加 `aria-live="polite"`（屏幕阅读器播报）

#### 4.1.7 i18n 文案打磨

**当前文案 vs 优化**：
| key | zh-CN 现状 | 优化后 |
|---|---|---|
| `home.hero.title` | "海购星，萨摩亚合规出海" | "海购星" + 副标题 "萨摩亚合规出海一站式平台" |
| `home.shortcut.companyRegister` | "公司注册" | "公司注册" + tooltip "30 天拿证" |
| `home.recommend.title` | "为你推荐" | "为你推荐" + 副标题 "基于你的 DLC 等级" |

**4 语言**（zh-CN / en-US / ja-JP / ko-KR）**必须**对齐翻译（CI 校验）。

#### 4.1.8 错误降级

- ✅ Hero 加载失败 → 显示**渐变 fallback + 文字**
- ✅ 推荐流加载失败 → 显示"刷新试试"按钮 + 兜底推荐 3 个

---

<a id="4-2-discover"></a>

### 4.2 `/discover` — 发现（Banner / 推荐位 / 分类）

> **对应 PRD**：[docs/admin-prd/02-discover.md](../../admin-prd/02-discover.md)
> **现有 UI**（保持不变）：顶部 Tab 切换（"推荐 / 关注 / 最新"）+ 卡片瀑布流 + 右侧浮窗（"联系客服"）
> **关键指标**：停留时长 / 卡片 CTR / 滚动深度

#### 4.2.1 虚拟滚动瀑布流

**现状问题**：一次性渲染 50 张卡片，**滚动 30 张就卡**。
**不改 UI 的优化**：

- ✅ `react-virtuoso` 虚拟滚动（**结构不变**）
- ✅ 图片 IntersectionObserver lazy load
- ✅ 滚动到 80% 触发"加载更多"（与 `fetchNextPage`）

**预期**：50 张卡渲染从 600ms → 80ms

#### 4.2.2 视频卡片自动播放（H5 端可选）

**不改 UI 的优化**：

- ✅ 进入视口的视频 muted + autoplay
- ✅ 离开视口立即 `pause()`（省电省流量）
- ✅ 用 `<video preload="metadata">` 不预加载全片

#### 4.2.3 智能分类（AI 打标）

**后端**已 AI 打标，前端仅做：

- ✅ 顶部 Tab 加"智能分类"（AI 自动归类到 8 个主题）
- ✅ 卡片角标显示分类 chip（点击筛选同分类）

#### 4.2.4 关注 / 收藏 / 点赞埋点

```typescript
const onCardClick = (id: string, type: 'banner' | 'topic' | 'recommend' | 'ai_pick') => {
  trackFunnel('discover_card', 'click', { id, type });
};

const onFollow = (id: string) => {
  trackFunnel('discover_follow', 'intent', { id });
  // 乐观更新
  optimisticUpdate({ followStatus: true });
  api.post(`/api/h5/discover/${id}/follow`).catch(() => optimisticRevert());
};
```

#### 4.2.5 Tab 切换性能

**不改 UI 的优化**：

- ✅ Tab 内容**缓存**（已加载过的 Tab 不重新 fetch）
- ✅ 切换 Tab 加 transition 动画（已有 framer-motion）

#### 4.2.6 浮窗性能

**右侧浮窗**（"联系客服 / 回到顶部"）**不改 UI**：

- ✅ 默认隐藏，滚动 500px 后 fade in
- ✅ 点击"回到顶部"用 `window.scrollTo({ behavior: 'smooth' })`

#### 4.2.7 SEO / 分享

- ✅ `<title>` 动态拼接（"发现 - 海购星"）
- ✅ Open Graph meta（分享到微信/微博有卡片预览）
- ✅ 动态分享图（每张卡可生成"x 卡片"海报）

#### 4.2.8 错误降级

- ✅ 卡片图片加载失败 → 显示分类色块 + 文字
- ✅ 整个 Tab 加载失败 → 显示"该 Tab 数据暂不可用"

---

<a id="4-3-services"></a>

### 4.3 `/services` — 服务市场（订阅 / 商品）

> **对应 PRD**：[docs/admin-prd/03-services.md](../../admin-prd/03-services.md)
> **现有 UI**（保持不变）：顶部 4 个分类 Tab（订阅/咨询/工具/培训）+ 卡片网格 + 底部"推荐位"
> **关键指标**：CTR / 订阅转化率 / 平均订单金额（AOV）/ 退款率

#### 4.3.1 商品卡片优化（提升 CTR）

**不改 UI 的优化**：

- ✅ 卡片加 **"热门" / "新品" / "限时" 角标**（按 00-foundation §8.3.1 颜色）
- ✅ 价格区域加"原价 ~~划线~~ / 折后价"
- ✅ 加 "已售 N 件" 社会认同

#### 4.3.2 转化漏斗埋点

```typescript
const onServiceClick = (id: string) => trackFunnel('service_view', 'view', { serviceId: id });
const onSubscribeClick = (id: string, plan: string) =>
  trackFunnel('service_subscribe', 'click', { serviceId: id, plan });
const onPayClick = (id: string) => trackFunnel('service_pay', 'intent', { serviceId: id });
const onPaySuccess = (id: string, orderId: string) =>
  trackFunnel('service_pay', 'success', { serviceId: id, orderId });
```

**漏斗看板**（按服务 / 按 plan / 按用户分群）：

| 阶段          | 转化率 | 优化点                    |
| ------------- | ------ | ------------------------- |
| 服务市场 view | 100%   | —                         |
| 商品详情 view | 35%    | 卡片吸引力（首图 + 价格） |
| 选 plan       | 22%    | Plan 描述 + 利益可视化    |
| 提交订单      | 18%    | 支付流程简化              |
| 支付成功      | 14%    | 支付通道稳定性            |

**目标**：从 3.8% → 6%+

#### 4.3.3 个性化推荐（提升 AOV）

**不改 UI 的优化**：

- ✅ **"你可能还需要"** 区（基于浏览历史）
- ✅ **"X 用户也买了"**（社会认同）
- ✅ **捆绑套餐**（"订阅 X + Y 立省 30%"）

#### 4.3.4 CTA 位置 A/B 测试

**A/B 实验**（不改 UI 布局）：

- **变体 A**：CTA 在卡片底部（当前）
- **变体 B**：CTA 改为整张卡片可点（hover 浮出"立即订阅"按钮）

**假设**：B 变体因"目标区域扩大" CTR +20%

#### 4.3.5 防流失

**用户停留 > 30s 未下单**：

- ✅ 弹 Toast"限时优惠：现在订阅立减 10%"
- ✅ 卡片"降价提醒"按钮

**加购物车未支付 > 1h**：

- ✅ 推送提醒"您的 X 还未支付"（带 DVC 优惠）

#### 4.3.6 支付优化

- ✅ **支付方式前置**（详情页显示"支持 Stripe / 支付宝 / USDT"）
- ✅ **DVC 抵扣**（如有余额，提示"用 DVC 抵扣 5%"）
- ✅ **失败重试**（Stripe 失败自动 retry 1 次 + 引导换通道）

#### 4.3.7 退款流程优化

**用户在 7 天内**：

- ✅ "7 天无理由退款"标识
- ✅ 一键退款按钮（**不**走客服）

#### 4.3.8 错误降级

- ✅ 支付失败 → 显示具体原因（"卡余额不足"/"网络问题"）+ 重试 / 换通道
- ✅ 库存不足 → "已抢光" + "到货提醒" 按钮

---

<a id="4-4-ai"></a>

### 4.4 `/ai` — AI 大脑（智能体 / Todo / 知识库）

> **对应 PRD**：[docs/admin-prd/04-ai-brain.md](../../admin-prd/04-ai-brain.md)
> **现有 UI**（保持不变）：顶部 3 个 Tab（"智能体 / Todo / 知识库"）+ Agent 卡片网格 + 浮动"AI 助手"入口
> **关键指标**：Agent 点击率 / 对话发起率 / 7 日回访率

#### 4.4.1 智能体推荐（提升对话发起率）

**不改 UI 的优化**：

- ✅ "猜你想用" 智能体（基于用户最近 7 天行为）
- ✅ "今日热门" 智能体（基于平台 Top 10）
- ✅ "你的 Agent" 已订阅的优先展示

**预期**：点击 → 发起对话 12% → 20%+

#### 4.4.2 Agent 卡片智能排序

- ✅ **Elo 评分**（用户点赞 / 完整体验）
- ✅ **个人化排序**（用户历史上对某类 Agent 的 CTR 权重）
- ✅ **新鲜度**（新发布 Agent 加权）

#### 4.4.3 Todo 智能拆解

**不改 UI 的优化**：

- ✅ 自然语言输入"我要注册公司" → AI 自动拆为 5 个 Todo
- ✅ Todo 完成后自动 push 下一步
- ✅ 与「服务市场」联动（Todo 可一键转服务订单）

#### 4.4.4 知识库搜索优化

- ✅ **语义搜索**（不只是关键字，AI 理解意图）
- ✅ **快捷模板**（"如何注册萨摩亚公司"等高频问题）
- ✅ **多轮对话**（用户问 A → AI 追问 → 推荐文档）

#### 4.4.5 浮动入口"AI 助手"

- ✅ 滚动 80% 时缩小到 FAB（避免遮挡）
- ✅ 关闭时**记忆** 7 天（不重复弹）
- ✅ **首次使用引导**（3 步 onboarding）

#### 4.4.6 离线能力

- ✅ 最近 10 个对话缓存到 IndexedDB
- ✅ 离线时**显示**"离线可看，已发送的会同步"

#### 4.4.7 转化埋点

```typescript
const onAgentClick = (id: string) => trackFunnel('agent_view', 'view', { agentId: id });
const onStartChat = (id: string) => trackFunnel('agent_chat', 'intent', { agentId: id });
const onFirstMessage = (id: string) => trackFunnel('agent_chat', 'submit', { agentId: id });
const on7DayReturn = (id: string) => trackFunnel('agent_chat', 'success', { agentId: id });
```

#### 4.4.8 A11y

- ✅ 浮动按钮加 `aria-label="打开 AI 助手"`
- ✅ Agent 卡片加 `role="button"` + 键盘可激活

---

<a id="4-5-profile"></a>

### 4.5 `/profile` — 我的（用户中心 / KYC / 资料）

> **对应 PRD**：[docs/admin-prd/05-profile.md](../../admin-prd/05-profile.md)
> **现有 UI**（保持不变）：顶部用户卡片（头像/昵称/DLC等级/DVC余额）+ 9 个功能入口（KYC/钱包/订单/收藏/消息/设置/帮助/关于/退出）
> **关键指标**：KYC 完成率 / 资料完整度 / 7 日回访率

#### 4.5.1 KYC 引导优化

**不改 UI 的优化**：

- ✅ **KYC 状态可视化**（"已完成 60%，再填 X 即得 $20 奖励"）
- ✅ **分步引导**（1 / 3 / 5 步进度条）
- ✅ **激励提示**（"完成 KYC 解锁所有服务"）

**预期**：KYC 完成率 +25%

#### 4.5.2 DLC 等级可视化

- ✅ **进度环**（距离下级还差 X 经验）
- ✅ **权益对比**（当前 vs 下一级，**触发升级欲**）
- ✅ **任务列表**（"完成 X 任务 +50 经验"）

#### 4.5.3 钱包余额

- ✅ **隐藏金额**（默认 `****`，点击显示，长按 3s 切换）
- ✅ **DVC 余额**与"如何获得 DVC"引导
- ✅ **DVC 流水**（最近 10 条 + 全部）

#### 4.5.4 资料完整度

- ✅ **资料完整度评分**（80% 提示"补全资料"）
- ✅ **头像**未设置 → 红色提示
- ✅ **昵称 / 手机号**等必填项未填 → 引导弹窗

#### 4.5.5 订单快速入口

- ✅ **3 个 Tab**（待付款 / 进行中 / 已完成）徽标数
- ✅ 点击直接进订单详情（**不**跳列表）

#### 4.5.6 收藏 / 消息红点

- ✅ **精准红点**（精确到菜单项）
- ✅ **点击后自动消红点**（乐观更新）

#### 4.5.7 退出登录二次确认

- ✅ 弹 Modal "确定要退出吗？"（**不**直接退）
- ✅ 退出后清除本地缓存（Zustand persist 清空）

#### 4.5.8 错误降级

- ✅ 头像加载失败 → 渐变 + 昵称首字
- ✅ 钱包余额加载失败 → 显示"刷新试试"

---

<a id="4-6-tax-calculator"></a>

### 4.6 `/tax-calculator` — 税务计算器

> **对应 PRD**：[docs/admin-prd/06-tax-calculator.md](../../admin-prd/06-tax-calculator.md)
> **现有 UI**（保持不变）：顶部国家选择器（萨摩亚/BVI/新加坡/香港）+ 表单（收入/成本/利润/税前扣除）+ 结果区（应纳税额/有效税率/建议）
> **关键指标**：工具使用率 / 结果保存率 / 转化（导出报告/订阅税务服务）

#### 4.6.1 实时计算（输入即算）

**现状**：用户输完点"计算"才出结果，**反应慢**。
**不改 UI 的优化**：

- ✅ `useDebounce` 300ms 自动计算（**不**用 onChange 同步，避免卡顿）
- ✅ 数字格式化实时（`1234567` → `1,234,567`）
- ✅ 输入校验实时（红色边框 + 错误提示）

#### 4.6.2 历史记录

- ✅ **最近 10 次计算**（localStorage）
- ✅ **快速复用**（点击历史项 → 回填表单）

#### 4.6.3 分享结果

- ✅ **"分享结果" 按钮** → 生成图片 / 链接
- ✅ 链接带 query param（接收方点开**自动还原**表单）

#### 4.6.4 引导转化

- ✅ 计算完成后弹"想了解 X 国家的详细政策？订阅税务服务"
- ✅ **专业版解锁**（简单版免费，复杂版订阅）

#### 4.6.5 离线能力

- ✅ 税率表**预下载**到 IndexedDB
- ✅ 离线时仍可计算（用预下载的税率）

#### 4.6.6 数字 / 日期格式 i18n

- ✅ **千分位**：`Intl.NumberFormat`
- ✅ **货币符号**：按国家自动（USD / EUR / JPY）
- ✅ **日期**：按 locale 格式化

```typescript
const formatMoney = (amount: number, currency = 'USD', locale: string) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
```

#### 4.6.7 A11y

- ✅ 表单 `<label>` 关联 `<input id>`
- ✅ 结果区 `aria-live="polite"`（结果变化时播报）
- ✅ 错误信息 `aria-describedby` 关联

#### 4.6.8 错误降级

- ✅ 输入非法 → 表单红框 + 文字提示（**不**是 alert）
- ✅ 计算失败 → 兜底税率 + "请联系客服"

---

<a id="4-7-legal-hub"></a>

### 4.7 `/legal-hub` — 法务中台（合规法规 / 合同）

> **对应 PRD**：[docs/admin-prd/07-legal-hub.md](../../admin-prd/07-legal-hub.md)
> **现有 UI**（保持不变）：左侧分类（合同模板/合规法规/案例库）+ 右侧文档列表 + 顶部搜索
> **关键指标**：搜索使用率 / 文档打开率 / 模板下载率 / 转化为订阅

#### 4.7.1 文档搜索性能

**不改 UI 的优化**：

- ✅ **client-side 全文搜索**（FlexSearch / MiniSearch，~10ms 1000 文档）
- ✅ **搜索高亮**（`<mark>`）
- ✅ **分面搜索**（左侧"国家/类型/年份"二次筛选）

#### 4.7.2 文档缓存

- ✅ 文档详情**预加载**到 React Query（用户 hover 列表项时）
- ✅ **阅读进度**保存（localStorage）—— 下次进入**自动滚动到上次位置**

#### 4.7.3 合同模板

- ✅ **变量填充**（模板中 `{{companyName}}` → 替换为实际值）
- ✅ **一键导出**（PDF / Word）
- ✅ **保存草稿**（IndexedDB）

#### 4.7.4 案例库

- ✅ **AI 摘要**（长案例自动摘要前 200 字 + 关键判决）
- ✅ **相关推荐**（"看了 X 还应该看 Y"）

#### 4.7.5 转化埋点

```typescript
const onDocView = (id: string) => trackFunnel('legal_doc', 'view', { docId: id });
const onDocDownload = (id: string) => trackFunnel('legal_doc', 'intent', { docId: id });
const onSubscribeLegal = () => trackFunnel('legal_subscribe', 'click');
```

#### 4.7.6 SEO

- ✅ 每篇文档 `og:title / og:description`
- ✅ **结构化数据**（`Article` JSON-LD）—— 提升 Google 搜索排名

#### 4.7.7 离线阅读

- ✅ **"收藏到本地"**按钮 → 存 IndexedDB
- ✅ 离线时**可访问**已收藏文档

#### 4.7.8 错误降级

- ✅ 搜索失败 → 兜底显示 Top 10 热门
- ✅ 文档加载失败 → 提示"重试" + 显示缓存版

---

<a id="4-8-video-center"></a>

### 4.8 `/video-center` — 视频中心

> **对应 PRD**：[docs/admin-prd/08-video-center.md](../../admin-prd/08-video-center.md)
> **现有 UI**（保持不变）：顶部 Tab（"推荐 / 最新 / 直播"）+ 视频瀑布流（2 列）+ 视频详情页（播放器 + 简介 + 评论）
> **关键指标**：视频播放率（>50%）/ 完播率 / 评论率 / 分享率

#### 4.8.1 视频懒加载

**不改 UI 的优化**：

- ✅ 进入视口前**不加载**视频（仅显示封面）
- ✅ 进入视口时**仅加载 metadata**（不下载全片）
- ✅ 用户点击播放才下载 / 缓冲

#### 4.8.2 播放器性能

- ✅ **HLS 自适应码率**（auto 切换清晰度）
- ✅ **预缓冲** 5s
- ✅ **断点续播**（localStorage 存进度）

#### 4.8.3 视频自动播放

- ✅ 进入视口的视频**自动 muted 播放**（无音）
- ✅ 离开视口 `pause()` + `currentTime = 0`（省电）

#### 4.8.4 弹幕 / 评论性能

- ✅ 弹幕用 Canvas 渲染（**不**用 DOM，10x 性能）
- ✅ 长评论**分页加载**（不全量）

#### 4.8.5 直播特殊处理

- ✅ **首屏秒开** < 1s（用 LL-HLS / WebRTC）
- ✅ **断流重连**（自动 3 次重试）
- ✅ **延迟显示**（< 2s）

#### 4.8.6 视频 SEO

- ✅ 视频 sitemap.xml（Google 收录）
- ✅ 视频结构化数据（`VideoObject` JSON-LD）

#### 4.8.7 流量保护

- ✅ **WiFi 自动播 / 移动数据弹窗确认**
- ✅ **"省流模式"** 开关（默认 480p）
- ✅ 30 秒**没操作降清晰度**（省电）

#### 4.8.8 错误降级

- ✅ 视频加载失败 → 显示"重试" + 兜底 gif
- ✅ 直播已结束 → 显示"已结束" + "看回放"

---

<a id="4-9-media-center"></a>

### 4.9 `/media-center` — 自媒体中心

> **对应 PRD**：[docs/admin-prd/09-media-center.md](../../admin-prd/09-media-center.md)
> **现有 UI**（保持不变）：平台账号绑定列表（FB/IG/Twitter/LinkedIn/TikTok）+ 内容日历 + 数据看板
> **关键指标**：账号绑定率 / 内容发布数 / 平台点击率

#### 4.9.1 平台账号引导绑定

**不改 UI 的优化**：

- ✅ **未绑定平台**加红色"+"角标
- ✅ **绑定教程**（首次绑定时弹 3 步引导）
- ✅ **绑定奖励**（"绑定 Facebook 得 50 DVC"）

**预期**：账号绑定率 +40%

#### 4.9.2 内容日历性能

- ✅ **月份切换**用 `requestAnimationFrame` 优化
- ✅ **拖拽改期**加 optimistic update（拖动后立即变，失败回滚）

#### 4.9.3 数据看板缓存

- ✅ **当日数据**实时拉（5s 轮询）
- ✅ **历史数据**预加载（30 天）
- ✅ 数据图表用 `recharts` 懒加载

#### 4.9.4 一键发布

- ✅ **多平台同时发布**（A/B/C/D 平台勾选）
- ✅ **发布进度**实时显示（"FB 已发 / IG 发布中"）

#### 4.9.5 转化引导

- ✅ **"升级解锁多平台"**（免费版 2 平台，专业版 5 平台）
- ✅ **"AI 帮你写文案"**入口（跳 AI 大脑）

#### 4.9.6 离线能力

- ✅ **草稿**存 IndexedDB（离线编辑）
- ✅ 恢复网络后**自动发布**

#### 4.9.7 错误降级

- ✅ 平台 API 失败 → **重试 3 次** + 错误 toast
- ✅ 发布失败 → 标记"待重发" + 推送提醒

---

<a id="4-10-ai-chat"></a>

### 4.10 `/ai-chat/:agentId` — AI 对话

> **对应 PRD**：[docs/admin-prd/10-ai-chat.md](../../admin-prd/10-ai-chat.md)
> **现有 UI**（保持不变）：顶部 Agent 头像 + 名称 + "..."菜单 + 消息流（用户/AI 双气泡）+ 底部输入框
> **关键指标**：打字流畅度 / 响应时延 / 单对话消息数 / 7 日回访

#### 4.10.1 流式响应（SSE / WebSocket）

**现状问题**：等 AI 完全生成再一次性渲染，**用户感知慢 5-10s**。
**不改 UI 的优化**：

- ✅ **流式输出**（OpenAI SSE / WebSocket）— 第一个字 < 1s
- ✅ **打字机效果**（逐字渲染）
- ✅ **可中断**（用户输入时 cancel 旧 stream）

```typescript
async function* streamChat(messages: Message[]): AsyncGenerator<string> {
  const res = await fetch('/api/h5/ai-chat/stream', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    for (const line of chunk.split('\n').filter(Boolean)) {
      const data = JSON.parse(line);
      yield data.delta;
    }
  }
}

// 组件内
const [text, setText] = useState('');
for await (const delta of streamChat(messages)) {
  setText((t) => t + delta); // 逐字更新
}
```

#### 4.10.2 输入框优化

- ✅ **输入法兼容**（compositionstart/end 处理中文）
- ✅ **发送时禁用**（防双发）
- ✅ **Shift+Enter 换行** / **Enter 发送**
- ✅ **粘贴图片**自动上传

#### 4.10.3 消息渲染性能

- ✅ **虚拟滚动**（长对话 1000+ 条不卡）
- ✅ **代码块高亮**懒加载（`react-syntax-highlighter` 仅在视口）
- ✅ **Markdown 渲染**缓存（已渲染的消息不重渲）

#### 4.10.4 上下文管理

- ✅ **自动滚动到底部**（仅在用户**没向上滚**时）
- ✅ "回到最新" 浮动按钮（**不**改 UI）
- ✅ **引用上下文**（点消息 → 高亮对应输入）

#### 4.10.5 历史会话

- ✅ **左侧抽屉**（已有）— 会话按时间分组
- ✅ **搜索会话**（client-side）
- ✅ **重命名 / 删除 / 置顶**

#### 4.10.6 离线能力

- ✅ **已发送消息**存 IndexedDB
- ✅ 离线时**标记**"等待同步"
- ✅ 联网后**自动重发**

#### 4.10.7 打字流畅度

- ✅ 打字时**不重渲染**消息列表（仅追加）
- ✅ `useDeferredValue` 优化（输入 vs 列表分离）
- ✅ 60 FPS（Chrome DevTools Performance 验证）

#### 4.10.8 A11y

- ✅ 消息区 `role="log" aria-live="polite"`
- ✅ 发送按钮 `aria-label="发送消息"`
- ✅ 代码块 `aria-label="代码，可复制"`

---

<a id="4-11-company-register"></a>

### 4.11 `/company-register` — 公司注册

> **对应 PRD**：[docs/admin-prd/11-company-register.md](../../admin-prd/11-company-register.md)
> **现有 UI**（保持不变）：顶部 3 步进度（公司信息/股东信息/补充材料）+ 表单 + 底部"下一步"
> **关键指标**：表单完成率 / 提交转化率 / 审核通过率

#### 4.11.1 多步表单优化

**不改 UI 的优化**：

- ✅ **自动保存草稿**（每 10s + 失焦时）
- ✅ **步骤恢复**（用户离开 → 再进来**自动到上次步骤**）
- ✅ **进度可视化**（"已完成 60%"）

**预期**：表单完成率 +35%

#### 4.11.2 字段智能提示

- ✅ **国家选择**联动"公司类型"可选
- ✅ **公司名查重**实时（debounce 500ms 调后端）
- ✅ **股东人数**超 5 人提示"需要专业服务"

#### 4.11.3 文件上传优化

- ✅ **拖拽上传** + **粘贴上传**
- ✅ **图片压缩**（< 2MB 限制，前端先压缩）
- ✅ **多文件并发**（最多 3 个并行）
- ✅ **进度条**

#### 4.11.4 实时校验

- ✅ **RHF + Zod schema**（前后端共用）
- ✅ **失焦校验** + **提交时全量校验**
- ✅ **错误可视化**（红框 + 文字 + 抖动）

#### 4.11.5 提交防流失

- ✅ **未提交离开** → 浏览器原生 `beforeunload` 提示
- ✅ **保存草稿成功** → toast 提示

#### 4.11.6 转化引导

- ✅ **完成 100%** → 弹"是否需要 X 增值服务"（银行开户/税务）
- ✅ **"X 用户本月成功注册"** 社会认同

#### 4.11.7 错误降级

- ✅ **网络错误** → 自动重试 3 次 + 提示
- ✅ **图片上传失败** → 重试该文件（**不**重传所有）
- ✅ **提交 422** → 字段错误回填

#### 4.11.8 状态日志

**业务状态变更**按 00-foundation §4.3 走：

- ✅ `CompanyStatusLog` 表（独立）
- ✅ 状态：`draft` / `submitted` / `kyc_pending` / `kyc_approved` / `kyc_rejected` / `supplementing` / `completed` / `cancelled` / `failed`
- ✅ 颜色按 00-foundation §8.3.1 映射（**不**自创颜色）

---

<a id="4-12-payment-console"></a>

### 4.12 `/payment-console` — 全球收款

> **对应 PRD**：[docs/admin-prd/12-payment-console.md](../../admin-prd/12-payment-console.md)
> **现有 UI**（保持不变）：顶部 4 个统计卡（今日/本月/总收款/通道数）+ 通道列表（Stripe/PayPal/Alipay/...）+ 交易流水
> **关键指标**：收款成功率 / 平均到账时延 / 通道可用率

#### 4.12.1 实时数据刷新

**不改 UI 的优化**：

- ✅ **统计卡 5s 轮询**（WebSocket 优先）
- ✅ **流水 30s 轮询**
- ✅ **新交易**顶部插入 + 闪光动画

#### 4.12.2 通道状态可视化

- ✅ **可用率徽标**（绿/黄/红）
- ✅ **失败率排行**（**不**改 UI，仅数据）
- ✅ **切换建议**（"Stripe 失败率高，建议切到 PayPal"）

#### 4.12.3 流水筛选

- ✅ **多条件筛选**（按通道 / 金额 / 时间 / 状态）
- ✅ **URL 同步**（`?channel=stripe&minAmount=100`）
- ✅ **导出 CSV**（带审计）

#### 4.12.4 退款流程

- ✅ **单笔退款** + **批量退款**
- ✅ **部分退款**校验（按 00-foundation §7.5）
- ✅ **退款进度追踪**（succeeded / processing / failed）

#### 4.12.5 对账

- ✅ **日对账**按钮 → 生成日报
- ✅ **月对账** + **跨通道对账**（按 00-foundation §7.5）

#### 4.12.6 错误降级

- ✅ 通道 API 失败 → 显示兜底统计 + 提示
- ✅ 拉取慢 → skeleton + 30s 超时提示

#### 4.12.7 转化引导

- ✅ "X 通道支持更多国家，**升级解锁**" 提示
- ✅ "DVC 抵扣手续费 1%"

#### 4.12.8 状态日志

- ✅ 退款按 00-foundation §7.5 走独立 `RefundStatusLog` 表
- ✅ 颜色按 00-foundation §8.3.1（`partial_refunded` 琥珀色）

---

<a id="4-13-bank-account"></a>

### 4.13 `/bank-account` — 银行开户

> **对应 PRD**：[docs/admin-prd/13-bank-account.md](../../admin-prd/13-bank-account.md)
> **现有 UI**（保持不变）：顶部 3 步流程（选银行/填资料/上传材料）+ 已开户列表
> **关键指标**：开户完成率 / 审核通过率 / 客户经理响应速度

#### 4.13.1 银行对比

**不改 UI 的优化**：

- ✅ **银行对比表**（最低存款 / 审批时长 / 月费 / 国家）
- ✅ **智能推荐**（基于公司注册地 / 行业）
- ✅ **"X 用户本月选了 X 银行"** 社会认同

#### 4.13.2 资料预填

- ✅ **从 KYC / 公司信息自动填充**（**不**让用户重输）
- ✅ **OCR 识别**（上传身份证 → 自动提取）

#### 4.13.3 流程可视化

- ✅ **审核进度条**（**不**改 UI）—— 5 阶段：`资料提交` → `KYC 审核` → `银行审核` → `开户中` → `成功`
- ✅ **每阶段预计时长**

#### 4.13.4 客户经理沟通

- ✅ **IM 入口**（**不**改 UI）
- ✅ **预约时间**（calendar 组件）
- ✅ **进度主动推送**

#### 4.13.5 失败重提

- ✅ **KYC 驳回** → 弹原因 + 重新上传按钮
- ✅ **银行驳回** → 转人工 + 备选银行推荐

#### 4.13.6 状态日志

**业务状态变更**按 00-foundation §4.3：

- ✅ 独立 `BankOrderStatusLog` 表（**本轮修复**：原 `statusLogs String?` JSON 改独立表）
- ✅ 状态：`draft` / `submitted` / `kyc_pending` / `kyc_approved` / `kyc_rejected` / `bank_reviewing` / `bank_approved` / `bank_rejected` / `account_opening` / `completed` / `failed`
- ✅ 颜色按 00-foundation §8.3.1

#### 4.13.7 错误降级

- ✅ OCR 识别失败 → 手动输入兜底
- ✅ 银行 API 超时 → 标记"待重试"

#### 4.13.8 转化引导

- ✅ **"X 银行限时 0 月费"** 标签
- ✅ **捆绑销售**（开户 + 收款通道打包）

---

<a id="4-14-dlc-level"></a>

### 4.14 `/dlc-level` — DLC 等级

> **对应 PRD**：[docs/admin-prd/14-dlc-level.md](../../admin-prd/14-dlc-level.md)
> **现有 UI**（保持不变）：顶部当前等级卡（图标/名称/经验值/进度）+ 等级权益对比表 + 任务列表
> **关键指标**：升级完成率 / 任务完成率 / 7 日活跃

#### 4.14.1 升级进度可视化

**不改 UI 的优化**：

- ✅ **进度环**（SVG 动画，0-100%）
- ✅ **"距下一级还差 X 经验"**
- ✅ **等级横幅**（恭喜动画，仅首次升级时）

#### 4.14.2 任务优化

- ✅ **任务分类**（每日 / 每周 / 一次性）
- ✅ **快速完成**（点任务 → 直接跳对应页面）
- ✅ **任务奖励预览**（完成 +50 经验 + 100 DVC）

#### 4.14.3 等级权益对比

- ✅ **"升级到 X 解锁 Y"**（强烈激发欲）
- ✅ **当前 vs 下一级**差异可视化
- ✅ **历史升级**回顾

#### 4.14.4 升级转化埋点

```typescript
const onDlcView = () => trackFunnel('dlc_view', 'view');
const onTaskClick = (id: string) => trackFunnel('dlc_task', 'click', { taskId: id });
const onTaskDone = (id: string) => trackFunnel('dlc_task', 'submit', { taskId: id });
const onUpgrade = () => trackFunnel('dlc_upgrade', 'intent');
const onUpgradeSuccess = (level: number) => trackFunnel('dlc_upgrade', 'success', { level });
```

**预期**：升级转化 8% → 13%+

#### 4.14.5 推送召回

- ✅ **D+1**：您今天完成了 X 任务（鼓励）
- ✅ **D+3**：您距离下一级还差 X 经验（提醒）
- ✅ **D+7**：您的 DLC 等级已 X 天未变（召回）

#### 4.14.6 状态日志

按 00-foundation §4.3：

- ✅ 独立 `DlcUpgradeLog` 表（**已有**）
- ✅ 状态：`PENDING` / `APPROVED` / `REJECTED`
- ✅ 颜色按 00-foundation §8.3.1

#### 4.14.7 错误降级

- ✅ 升级 API 失败 → 标记"待重试" + 离线缓存
- ✅ 任务状态不同步 → 提示"刷新"按钮

---

<a id="4-15-documents"></a>

### 4.15 `/documents` — 文档中心

> **对应 PRD**：[docs/admin-prd/15-documents.md](../../admin-prd/15-documents.md)
> **现有 UI**（保持不变）：左侧分类树（合同/凭证/账单/导出）+ 右侧文档列表 + 顶部搜索
> **关键指标**：文档打开率 / 下载率 / 搜索成功率

#### 4.15.1 资源级权限（accessLevel）

**不改 UI 的优化**：

- ✅ 按 00-foundation §3.5 资源级权限判定
- ✅ 文档列表**前端不显示** 403 资源（避免暴露存在性）
- ✅ 锁定文档显示"解锁需要 DLC X 级"

#### 4.15.2 文档预览

- ✅ **PDF.js 在线预览**（懒加载）
- ✅ **图片预览**（点击放大）
- ✅ **Word / Excel** → 转 PDF 后预览

#### 4.15.3 搜索性能

- ✅ **client-side 搜索**（MiniSearch 索引，~10ms）
- ✅ **高亮匹配**
- ✅ **分面搜索**（左侧分类树联动）

#### 4.15.4 批量操作

- ✅ **多选** + **批量下载**（ZIP 打包）
- ✅ **批量分享**（生成临时链接）
- ✅ **批量删除**（带二次确认）

#### 4.15.5 离线收藏

- ✅ **"收藏到本地"** → IndexedDB
- ✅ 离线**可读**（PWA 缓存）

#### 4.15.6 分享链接

- ✅ **临时链接**（24h 有效，密码保护）
- ✅ **水印**（下载的 PDF 加用户 ID 水印）

#### 4.15.7 错误降级

- ✅ 文档加载失败 → 重试 + 兜底摘要
- ✅ 搜索失败 → 显示 Top 10 热门

#### 4.15.8 转化引导

- ✅ "**X 文档需 DLC 3 访问，升级解锁**"
- ✅ "**导出此报表需订阅**"

---

<a id="4-16-settings"></a>

### 4.16 `/settings` — 设置

> **对应 PRD**：[docs/admin-prd/16-settings.md](../../admin-prd/16-settings.md)
> **现有 UI**（保持不变）：分组列表（账号/通知/隐私/语言/关于/退出）
> **关键指标**：设置使用率 / 通知订阅率 / 主题切换率

#### 4.16.1 设置项搜索

**不改 UI 的优化**：

- ✅ **顶部搜索框**（"通知" → 跳通知设置）
- ✅ **快速跳**（减少滚动）

#### 4.16.2 通知偏好

- ✅ **细粒度控制**（哪些事件要推送、哪些不要）
- ✅ **免打扰时段**（22:00 - 8:00 静音）
- ✅ **推送通道**（App / 微信 / 邮件 / SMS）

#### 4.16.3 隐私设置

- ✅ **数据导出**（GDPR / CCPA 合规）
- ✅ **账户注销**（二次确认 + 7 天冷静期）
- ✅ **第三方授权管理**（已授权的第三方应用列表）

#### 4.16.4 语言切换

- ✅ **4 语言**（zh-CN / en-US / ja-JP / ko-KR）
- ✅ **跟随系统**（auto-detect）
- ✅ **实时切换**（不刷新页面）

#### 4.16.5 缓存清理

- ✅ **"清除缓存"** 按钮（清 React Query / IndexedDB / localStorage）
- ✅ **缓存大小**显示
- ✅ **"重置全部"**（恢复出厂）

#### 4.16.6 主题切换

- ✅ **3 模式**：auto / light / dark
- ✅ **跟随系统**（prefers-color-scheme）
- ✅ **下次进入保留**

#### 4.16.7 关于页

- ✅ **版本号**（VITE_APP_VERSION）
- ✅ **开源许可**
- ✅ **检查更新**（灰度发布）

#### 4.16.8 错误降级

- ✅ 保存设置失败 → 标记"待重试"
- ✅ 切换语言失败 → 回滚 + toast

---

<a id="4-17-notifications"></a>

### 4.17 `/notifications` — 消息通知

> **对应 PRD**：[docs/admin-prd/17-notifications.md](../../admin-prd/17-notifications.md)
> **现有 UI**（保持不变）：顶部 Tab（全部/未读/系统/交易/活动）+ 通知列表 + 右滑操作
> **关键指标**：通知到达率 / 打开率 / 24h 内行动率

#### 4.17.1 实时推送（WebSocket）

**不改 UI 的优化**：

- ✅ **WebSocket** 实时收通知（**不**用轮询）
- ✅ **断线重连**（指数退避）
- ✅ **离线缓存**（断网期间的通知排队）

#### 4.17.2 通知分组

- ✅ **按时间**（今天 / 昨天 / 本周 / 更早）
- ✅ **按事件类型**（DLC / 支付 / 邀请 / 系统）
- ✅ **按重要性**（高 / 中 / 低，**不**改 UI，**仅**排序）

#### 4.17.3 通知操作

- ✅ **右滑标记已读**（移动端手势）
- ✅ **长按多选**（批量操作）
- ✅ **点开跳详情**

#### 4.17.4 通知订阅

- ✅ **细粒度订阅**（哪些事件要推）
- ✅ **免打扰时段**
- ✅ **多通道**（App / 微信 / 邮件）

#### 4.17.5 转化引导

- ✅ "您有 3 条 DLC 任务通知" → 跳 DLC
- ✅ "您有 1 条退款通知" → 跳订单

#### 4.17.6 性能

- ✅ **虚拟滚动**（1000+ 通知不卡）
- ✅ **分页加载**（20 / 页）
- ✅ **图片懒加载**

#### 4.17.7 错误降级

- ✅ WebSocket 断开 → 自动重连 + toast
- ✅ 标记已读失败 → 重试

#### 4.17.8 状态日志

按 00-foundation §4.3 + 8.3.1：

- ✅ 通知状态：`pending` / `sent` / `delivered` / `read` / `failed`
- ✅ 颜色严格按色彩表

---

<a id="4-18-did-identity"></a>

### 4.18 `/did-identity` — DID 身份

> **对应 PRD**：[docs/admin-prd/18-did-identity.md](../../admin-prd/18-did-identity.md)
> **现有 UI**（保持不变）：DID 标识（did:smy:xxx...）+ 凭证列表（KYC/地址/学历/工作）+ 凭证详情
> **关键指标**：凭证签发率 / 凭证分享率 / 验证次数

#### 4.18.1 DID 显示优化

**不改 UI 的优化**：

- ✅ **DID 完整显示**（hover 复制 + 二维码）
- ✅ **"什么是 DID"** 引导（首次访问 3 步引导）
- ✅ **DID 状态**（active / deactivated / rotated）

#### 4.18.2 凭证申请引导

- ✅ **未签发凭证**红色"+"提示
- ✅ **"签发 X 凭证可解锁 Y 服务"** 引导
- ✅ **一键签发**（OIDC 流程）

#### 4.18.3 凭证分享

- ✅ **生成可验证凭证（VC）** → 二维码 / 链接
- ✅ **24h 临时链接**
- ✅ **撤销凭证**（revoke）

#### 4.18.4 链上签名优化

- ✅ **Web3 钱包未安装** → 引导用云端代理签名（00-foundation §18 决策）
- ✅ **签名提示**（"本次签名仅用于 X，不消耗 gas"）
- ✅ **签名失败** → 友好提示 + 重试

#### 4.18.5 离线能力

- ✅ **DID 文档**缓存到 IndexedDB
- ✅ **凭证展示**离线可看
- ✅ **签名**离线不可用

#### 4.18.6 状态日志

- ✅ 凭证状态：`issued` / `revoked` / `suspended`（按 00-foundation §8.3.1 颜色）
- ✅ DID 状态：`active` / `deactivated` / `rotated`

#### 4.18.7 错误降级

- ✅ 钱包未装 → 引导 H5 模式
- ✅ 签名失败 → 提示 + 重试
- ✅ 凭证加载失败 → 兜底（仅展示元数据）

#### 4.18.8 转化引导

- ✅ "签发 X 凭证 +50 DVC"
- ✅ "凭证可用于 KYC / 法务 / 招聘"

---

<a id="4-19-ai-business-card"></a>

### 4.19 `/ai-business-card` — AI 名片

> **对应 PRD**：[docs/admin-prd/19-ai-business-card.md](../../admin-prd/19-ai-business-card.md)
> **现有 UI**（保持不变）：顶部名片预览（卡片 + 二维码 + 联系方式）+ 底部 3 个 Tab（编辑/分享/数据）
> **关键指标**：名片创建率 / 分享率 / 新增好友 / 联系方式点击率

#### 4.19.1 名片模板

**不改 UI 的优化**：

- ✅ **5 套模板**（经典 / 商务 / 创意 / 极简 / 科技）
- ✅ **实时预览**（切换模板立即看到效果）
- ✅ **AI 智能推荐模板**（基于行业）

#### 4.19.2 分享优化

- ✅ **多渠道分享**（复制链接 / 二维码 / 海报 / 微信）
- ✅ **预生成海报**（CDN，**不**实时画 canvas）
- ✅ **"X 用户通过你的名片加好友"** 提示

**预期**：分享率 4.5% → 7%+

#### 4.19.3 数据看板

- ✅ **浏览数 / 分享数 / 加好友数**
- ✅ **7 日 / 30 日趋势**
- ✅ **Top 渠道**（微信 / 链接 / 二维码）

#### 4.19.4 转化引导

- ✅ "**升级解锁高级模板**"
- ✅ "**分享得 50 DVC**"
- ✅ "**个性化域名**"（vip.smy.app/yourname）

#### 4.19.5 海报生成

- ✅ **CDN 预生成**（用户上传头像 → 后端 Puppeteer 渲染 → CDN URL）
- ✅ **多套海报**（不同主题 / 不同尺寸）
- ✅ **微信扫码识别**（h5 落地页）

#### 4.19.6 A/B 测试

- ✅ **默认模板** A/B（经典 vs 商务）
- ✅ **CTA 文案** A/B（"分享名片" vs "立即分享"）

#### 4.19.7 错误降级

- ✅ 海报生成失败 → 退回到二维码分享
- ✅ 上传头像失败 → 兜底默认头像

#### 4.19.8 状态日志

按 00-foundation §4.3：

- ✅ 独立 `AiCardStatusLog` 表（**本轮新增**）
- ✅ 状态：`active` / `paused` / `archived`

---

<a id="5-优化排期与影响评估"></a>

## 5. 优化排期与影响评估

**为什么需要这章**：20 个菜单的优化**不能一口气全做**——P0 性能 / 错误处理 优先，P1 缓存 / 转化 次之，P2 A11y / PWA 最后。本章给出**优先级矩阵**、**工作量估算**、**影响评估**、**回滚预案**。

### 5.1 P0（必做，2 周内完成）

> **目标**：首屏 LCP ≤ 2.5s、错误率 ≤ 0.5%、路由切换 ≤ 200ms

| #   | 优化项                              | 影响范围 | 工作量 | 风险 | 验收指标         |
| --- | ----------------------------------- | -------- | ------ | ---- | ---------------- |
| 1   | 路由懒加载（§2.1）                  | 20 菜单  | 3 天   | 低   | 首屏 JS ≤ 250KB  |
| 2   | Skeleton 统一（§2.4）               | 20 菜单  | 2 天   | 低   | 跳出率 -10%      |
| 3   | 3 级 ErrorBoundary（§2.3）          | 20 菜单  | 1 天   | 低   | 错误率 -76%      |
| 4   | 列表虚拟滚动（§3.1）                | 8 菜单   | 3 天   | 中   | 1000 条不卡      |
| 5   | 图片 WebP/AVIF（§2.7）              | 12 菜单  | 2 天   | 中   | LCP -30%         |
| 6   | 字体子集化（§2.6）                  | 全局     | 1 天   | 低   | LCP -200ms       |
| 7   | 错误降级 UI（§1.4 + 各菜单 §4.x.8） | 20 菜单  | 3 天   | 中   | 错误时**不**白屏 |
| 8   | 性能监控（§2.10）                   | 全局     | 1 天   | 低   | 数据上送**不**丢 |
| 9   | StatusBadge 颜色统一（§3.7）        | 20 菜单  | 1 天   | 极低 | CI 校验          |
| 10  | React Query 接入（§2.2）            | 20 菜单  | 5 天   | 中   | 数据 stale 5 min |

**P0 合计**：~22 人天（2.5 周）

**P0 业务指标**：

- LCP 4.2s → 2.5s（-40%）
- 错误率 2.1% → 0.5%（-76%）
- 跳出率 -15%

### 5.2 P1（应做，4 周内完成）

> **目标**：CTR +45%、订阅转化 +58%、7 日留存 +36%

| #   | 优化项                                 | 影响范围   | 工作量 | 风险 | 验收指标          |
| --- | -------------------------------------- | ---------- | ------ | ---- | ----------------- |
| 1   | 漏斗埋点（§1.4.2）                     | 7 核心漏斗 | 3 天   | 低   | 漏斗看板上线      |
| 2   | 转化引导（各菜单 §4.x 转化）           | 12 菜单    | 5 天   | 中   | 转化率 +20%       |
| 3   | CTA 位置 A/B（§1.5）                   | 5 菜单     | 3 天   | 中   | 胜出组 CTR +20%   |
| 4   | 个性化推荐（Discover / AI / Services） | 3 菜单     | 5 天   | 中   | CTR +30%          |
| 5   | 缓存策略（§2.1 + §3.1）                | 15 菜单    | 3 天   | 中   | 二进 0 数据       |
| 6   | 预加载策略（§2.1）                     | 10 菜单    | 2 天   | 低   | 路由切换 -50%     |
| 7   | 防流失（Services / DLC）               | 3 菜单     | 3 天   | 中   | D+7 留存 +10%     |
| 8   | 推送召回（§1.4.3）                     | 全局       | 3 天   | 中   | D+1/D+7/D+30 召回 |
| 9   | 搜索防抖 + 高亮（§3.9）                | 5 菜单     | 2 天   | 低   | 搜索体验 +50%     |
| 10  | i18n 文案打磨（§1.1 + 各菜单 §4.x.7）  | 4 语言     | 5 天   | 低   | 4 语言对齐        |
| 11  | 数字 / 日期本地化（§4.6.6）            | 6 菜单     | 2 天   | 极低 | 4 locale 校验     |
| 12  | 状态日志独立表（00-foundation §4.3）   | 8 模块     | 3 天   | 中   | CI 校验外键       |
| 13  | DID / 名片 / 服务订单 离线缓存         | 3 菜单     | 3 天   | 中   | 离线可看          |

**P1 合计**：~42 人天（5 周）

**P1 业务指标**：

- Discover CTR 6.2% → 9%+
- 订阅转化 3.8% → 6%+
- 7 日留存 22% → 30%+

### 5.3 P2（可做，6 周后规划）

> **目标**：Lighthouse Score ≥ 90、A11y WCAG 2.1 AA、PWA install rate ≥ 5%

| #   | 优化项                            | 影响范围 | 工作量 | 风险 | 验收指标             |
| --- | --------------------------------- | -------- | ------ | ---- | -------------------- |
| 1   | PWA（§2.9）                       | 全局     | 5 天   | 中   | 添加到主屏可用       |
| 2   | A11y 全量（§1.2 + 各菜单 §4.x.6） | 20 菜单  | 10 天  | 低   | Lighthouse A11y ≥ 90 |
| 3   | 高级动效（视差 / 渐显）           | 5 菜单   | 3 天   | 中   | 流畅 60 FPS          |
| 4   | 实时协作（AI Chat / 名片编辑）    | 2 菜单   | 5 天   | 中   | WebRTC 接入          |
| 5   | 国际化扩展（5+ 语言）             | 全局     | 5 天   | 低   | 字典对齐             |
| 6   | AR / VR（视频中心 / 名片）        | 1 菜单   | 10 天  | 高   | 探索性               |
| 7   | Web Bluetooth / NFC（DID）        | 1 菜单   | 5 天   | 高   | 兼容性               |
| 8   | 智能客服（替代 IM 入口）          | 全局     | 5 天   | 中   | 转人工率 < 20%       |

**P2 合计**：~48 人天（6 周）

### 5.4 总工作量与人月

| 阶段     | 工作量        | 周期                 | 团队                    |
| -------- | ------------- | -------------------- | ----------------------- |
| P0       | 22 人天       | 2.5 周               | 2 前端                  |
| P1       | 42 人天       | 5 周                 | 2 前端 + 1 后端（埋点） |
| P2       | 48 人天       | 6 周                 | 2 前端 + 1 设计（A11y） |
| **合计** | **~112 人天** | **~14 周（3.5 月）** |                         |

### 5.5 影响评估（按业务指标）

| 业务指标             | 当前 | P0 后 | P1 后 | P2 后 | 总提升 |
| -------------------- | ---- | ----- | ----- | ----- | ------ |
| **LCP**              | 4.2s | 2.5s  | 2.2s  | 1.8s  | -57%   |
| **跳出率**           | 48%  | 41%   | 36%   | 32%   | -33%   |
| **Discover CTR**     | 6.2% | —     | 9%    | 10%   | +61%   |
| **订阅转化**         | 3.8% | —     | 6%    | 7%    | +84%   |
| **DLC 升级**         | 8%   | —     | 13%   | 15%   | +88%   |
| **AI 名片分享**      | 4.5% | —     | 7%    | 9%    | +100%  |
| **7 日留存**         | 22%  | —     | 30%   | 33%   | +50%   |
| **Lighthouse Score** | 62   | 78    | 85    | 92    | +48%   |
| **错误率**           | 2.1% | 0.5%  | 0.3%  | 0.2%  | -90%   |
| **PWA install rate** | 0%   | —     | —     | 8%    | —      |

---

<a id="6-跨文件一致性检查"></a>

## 6. 跨文件一致性检查

**为什么需要这章**：20 个菜单的优化涉及 i18n / 状态色彩 / 状态日志 / 字段命名 / 跨表外键等多个**全局约束**，缺一不可。本章给出**逐项检查清单**，与 `00-foundation.md` 强对齐。

### 6.1 i18n 命名空间（严格按 00-foundation §5.5.1）

| 菜单             | namespace      | 必查                                                   |
| ---------------- | -------------- | ------------------------------------------------------ |
| Discover         | `discover`     | ☐ `t('discover.banner.title')` 命中                    |
| Services         | `services`     | ☐ `t('services.subscription.yearly')` 命中             |
| AI Brain         | `ai`           | ☐ `t('ai.agentStatus.online')` 命中                    |
| Profile          | `profile`      | ☐ `t('profile.kycStatus.approved')` 命中               |
| Tax Calculator   | `tax`          | ☐ `t('tax.regime.samoa')` 命中                         |
| Legal Hub        | `legal`        | ☐ `t('legal.docType.contract')` 命中                   |
| Video Center     | `video`        | ☐ `t('video.status.online')` 命中                      |
| Media Center     | `media`        | ☐ `t('media.platform.facebook')` 命中                  |
| AI Chat          | `aiChat`       | ☐ `t('aiChat.sessionStatus.ongoing')` 命中（**驼峰**） |
| Company Register | `company`      | ☐ `t('company.orderStatus.submitted')` 命中            |
| Payment Console  | `payment`      | ☐ `t('payment.txStatus.paid')` 命中                    |
| Bank Account     | `bank`         | ☐ `t('bank.orderStatus.kycPending')` 命中              |
| DLC Level        | `dlc`          | ☐ `t('dlc.level.bronze')` 命中（**禁纯数字**）         |
| Documents        | `document`     | ☐ `t('document.category.legal')` 命中                  |
| Settings         | `settings`     | ☐ `t('settings.locale.zhCN')` 命中                     |
| Notifications    | `notification` | ☐ `t('notification.channel.inapp')` 命中               |
| DID Identity     | `did`          | ☐ `t('did.vcType.KYC')` 命中                           |
| AI Business Card | `aiCard`       | ☐ `t('aiCard.layout.classic')` 命中（**驼峰**）        |

**CI 校验**：

```bash
# 校验 i18n key 命名
node scripts/check-i18n-namespace.js
# 必须所有 t('namespace.key') 命中 00-foundation §5.5.1 速查表
```

### 6.2 状态色彩（严格按 00-foundation §8.3.1）

| 状态值                | 期望颜色  | 实际颜色 | 是否一致 |
| --------------------- | --------- | -------- | -------- |
| PENDING               | `#F6A623` |          | ☐        |
| PROCESSING            | `#3B82F6` |          | ☐        |
| REVIEWING             | `#8B5CF6` |          | ☐        |
| APPROVED              | `#10B981` |          | ☐        |
| REJECTED              | `#EF4444` |          | ☐        |
| DISABLED              | `#6B7280` |          | ☐        |
| submitted（公司订单） | `#3B82F6` |          | ☐        |
| supplementing         | `#F59E0B` |          | ☐        |
| kyc_pending（银行）   | `#8B5CF6` |          | ☐        |
| kyc_approved          | `#10B981` |          | ☐        |
| kyc_rejected          | `#EF4444` |          | ☐        |
| past_due（订阅）      | `#F59E0B` |          | ☐        |
| partial_refunded      | `#F59E0B` |          | ☐        |
| online（AI Agent）    | `#10B981` |          | ☐        |
| offline               | `#6B7280` |          | ☐        |
| maintenance           | `#F59E0B` |          | ☐        |
| pending（DLC）        | `#F6A623` |          | ☐        |
| scheduled（Discover） | `#3B82F6` |          | ☐        |
| pending（视频）       | `#F6A623` |          | ☐        |
| online（视频）        | `#10B981` |          | ☐        |
| banned                | `#7F1D1D` |          | ☐        |
| ongoing（AI Chat）    | `#3B82F6` |          | ☐        |
| taken_over            | `#8B5CF6` |          | ☐        |
| flagged               | `#F59E0B` |          | ☐        |
| issued（VC）          | `#10B981` |          | ☐        |
| revoked               | `#EF4444` |          | ☐        |
| suspended             | `#F59E0B` |          | ☐        |
| active（DID）         | `#10B981` |          | ☐        |
| deactivated           | `#6B7280` |          | ☐        |
| rotated               | `#3B82F6` |          | ☐        |

**CI 校验**：

```bash
node scripts/check-status-colors.js
# 扫描所有 <StatusBadge status="xxx" /> 调用
# 校验 xxx 颜色是否在 00-foundation §8.3.1 表中
```

### 6.3 业务状态日志独立表（按 00-foundation §4.3）

| 模块         | 应有表                                            | 实际                           | 状态 |
| ------------ | ------------------------------------------------- | ------------------------------ | ---- |
| 公司订单     | `CompanyStatusLog`                                | 已有                           | ☐    |
| 银行账户订单 | `BankOrderStatusLog`                              | **本轮修复**：从 JSON 改独立表 | ☐    |
| 服务订阅     | `ServiceOrderStatusLog`                           | **本轮新增**                   | ☐    |
| DLC 升级     | `DlcUpgradeLog`                                   | 已有                           | ☐    |
| AI 名片      | `AiCardStatusLog`                                 | **本轮新增**                   | ☐    |
| 退款         | `RefundStatusLog`                                 | **本轮新增**                   | ☐    |
| AI Agent     | `AiAgentStatusLog`                                | **本轮新增**                   | ☐    |
| DID 凭证     | （用 `VerifiableCredential.status` 字段变化即可） | OK                             | ☐    |

**CI 校验**：

```bash
node scripts/check-status-logs.js
# 扫描所有 *.ts / *.tsx / schema.prisma
# 校验 Entity 有独立 <Entity>StatusLog 表
# 校验有 operatorId @relation + onDelete: Restrict
```

### 6.4 `*UserId` 外键（按 00-foundation §12）

| 字段                          | 期望                                   | 实际 | 状态 |
| ----------------------------- | -------------------------------------- | ---- | ---- |
| `CompanyOrder.assignedTo`     | `@relation("Name") onDelete: Restrict` |      | ☐    |
| `CompanyOrder.approvedBy`     | 同上                                   |      | ☐    |
| `BankOrder.assignedTo`        | 同上                                   |      | ☐    |
| `ServiceOrder.approvedBy`     | 同上                                   |      | ☐    |
| `Refund.requestedBy`          | 同上                                   |      | ☐    |
| `DlcUpgradeLog.operatorId`    | 同上                                   |      | ☐    |
| `KYC.userId`                  | `@relation onDelete: Restrict`         |      | ☐    |
| `Transaction.userId`          | 同上                                   |      | ☐    |
| `BusinessCard.userId`         | 同上                                   |      | ☐    |
| `VerifiableCredential.userId` | 同上                                   |      | ☐    |

### 6.5 资源级权限（按 00-foundation §3.5）

| accessLevel | 判定逻辑                            | 验证 |
| ----------- | ----------------------------------- | ---- |
| `public`    | 永远通过                            | ☐    |
| `login`     | `req.user != null`                  | ☐    |
| `kyc`       | `req.user.kycStatus === 'approved'` | ☐    |
| `dlc3`      | `req.user.userLevel >= 3`           | ☐    |
| `dlc5`      | `req.user.userLevel >= 5`           | ☐    |
| `internal`  | H5 端 404（不暴露存在性）           | ☐    |

**H5 端关键场景**：

- ☐ Documents 页 dlc3 资源：H5 端 **不显示** 403，仅 DLC ≥ 3 用户可点
- ☐ internal 资源 H5 端**永远 404**
- ☐ 后台 admin 可绕过（`req.adminUser`）

### 6.6 退款统一约定（按 00-foundation §7.5）

| 场景                              | 验证                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| 全退                              | ☐ `refundStatus=full`, `refundedAmount=amount`                                     |
| 部分退 1 次                       | ☐ `refundStatus=partial`, `refundedAmount=30`                                      |
| 部分退累计达 100%                 | ☐ 第 3 次 `refundStatus=full`                                                      |
| 超额退                            | ☐ 抛 REFUND_EXCEED，事务回滚                                                       |
| 并发退 2 次                       | ☐ 一笔成功一笔 CONCURRENT_REFUND_CONFLICT                                          |
| `Transaction.refundedAmount` 累加 | ☐ 用 `version` 乐观锁                                                              |
| 跨模块查询退款                    | ☐ 12-payment-console / 03-services / 13-bank-account 共享 `GET /api/admin/refunds` |

### 6.7 跨 admin-prd 链接

每菜单优化节都 link 到对应 admin-prd：

- ☐ §4.1 → [02-discover.md](../../admin-prd/02-discover.md)
- ☐ §4.2 → [02-discover.md](../../admin-prd/02-discover.md)
- ☐ §4.3 → [03-services.md](../../admin-prd/03-services.md)
- ☐ §4.4 → [04-ai-brain.md](../../admin-prd/04-ai-brain.md)
- ☐ §4.5 → [05-profile.md](../../admin-prd/05-profile.md)
- ☐ §4.6 → [06-tax-calculator.md](../../admin-prd/06-tax-calculator.md)
- ☐ §4.7 → [07-legal-hub.md](../../admin-prd/07-legal-hub.md)
- ☐ §4.8 → [08-video-center.md](../../admin-prd/08-video-center.md)
- ☐ §4.9 → [09-media-center.md](../../admin-prd/09-media-center.md)
- ☐ §4.10 → [10-ai-chat.md](../../admin-prd/10-ai-chat.md)
- ☐ §4.11 → [11-company-register.md](../../admin-prd/11-company-register.md)
- ☐ §4.12 → [12-payment-console.md](../../admin-prd/12-payment-console.md)
- ☐ §4.13 → [13-bank-account.md](../../admin-prd/13-bank-account.md)
- ☐ §4.14 → [14-dlc-level.md](../../admin-prd/14-dlc-level.md)
- ☐ §4.15 → [15-documents.md](../../admin-prd/15-documents.md)
- ☐ §4.16 → [16-settings.md](../../admin-prd/16-settings.md)
- ☐ §4.17 → [17-notifications.md](../../admin-prd/17-notifications.md)
- ☐ §4.18 → [18-did-identity.md](../../admin-prd/18-did-identity.md)
- ☐ §4.19 → [19-ai-business-card.md](../../admin-prd/19-ai-business-card.md)

### 6.8 端一致矩阵（H5 ↔ admin-web ↔ 小程序）

| 维度             | H5                 | admin-web            | 小程序            | 一致性 |
| ---------------- | ------------------ | -------------------- | ----------------- | ------ |
| i18n namespace   | `discover`         | `discover`           | `discover`        | ☐      |
| 状态色 `#10B981` | APPROVED           | APPROVED             | APPROVED          | ☐      |
| 状态日志表       | `CompanyStatusLog` | 共享                 | 共享              | ☐      |
| 退款路由         | `/api/h5/refunds`  | `/api/admin/refunds` | `/api/h5/refunds` | ☐      |
| 资源级权限       | `dlc3` 不可见      | 后台可见             | `dlc3` 不可见     | ☐      |

---

<a id="7-验收用例汇总"></a>

## 7. 验收用例（汇总）

### 7.1 性能

| #   | 用例                          | 期望                                      |
| --- | ----------------------------- | ----------------------------------------- |
| 1   | Lighthouse 移动端 4G Slow `/` | Performance ≥ 85, LCP ≤ 2.5s, TBT ≤ 200ms |
| 2   | 首屏 JS 体积                  | ≤ 250KB（gzipped）                        |
| 3   | 路由切换耗时                  | ≤ 200ms（命中 cache）                     |
| 4   | 1000 条列表滚动               | 60 FPS（Chrome DevTools Performance）     |
| 5   | Web Vitals 上送成功率         | ≥ 99%                                     |
| 6   | Lighthouse CI 在 PR 阻断      | 任一指标超 budget → 阻断合并              |

### 7.2 体验

| #   | 用例             | 期望                                         |
| --- | ---------------- | -------------------------------------------- |
| 1   | 任意 API 失败    | 显示 ErrorState + 重试按钮（**不**白屏）     |
| 2   | 路由切换         | 显示 Skeleton ≥ 200ms                        |
| 3   | 离线断网         | toast"您当前处于离线模式" + 已缓存数据可访问 |
| 4   | PWA install 弹窗 | "添加到主屏"按钮可点，安装成功               |
| 5   | 错误边界触发     | 降级 UI 出现 + Sentry 上报 + 不影响其他区块  |

### 7.3 转化

| #   | 用例           | 期望               |
| --- | -------------- | ------------------ |
| 1   | Discover CTR   | 6.2% → ≥ 9%        |
| 2   | 订阅转化       | 3.8% → ≥ 6%        |
| 3   | DLC 升级       | 8% → ≥ 13%         |
| 4   | AI 名片分享    | 4.5% → ≥ 7%        |
| 5   | 漏斗埋点完整性 | 7 核心漏斗全部埋点 |
| 6   | A/B 实验显著性 | p < 0.05 才全量    |

### 7.4 留存

| #   | 用例           | 期望        |
| --- | -------------- | ----------- |
| 1   | 7 日留存       | 22% → ≥ 30% |
| 2   | D+1 推送到达率 | ≥ 80%       |
| 3   | D+7 召回点击率 | ≥ 8%        |
| 4   | 离线复访率     | ≥ 5%        |

### 7.5 可访问性

| #   | 用例            | 期望                                          |
| --- | --------------- | --------------------------------------------- |
| 1   | Lighthouse A11y | ≥ 90                                          |
| 2   | 键盘可访问性    | 全部菜单 Tab 可达，Enter 可激活               |
| 3   | 屏幕阅读器      | VoiceOver / NVDA 正常播报                     |
| 4   | 颜色对比度      | WCAG 2.1 AA（4.5:1 正文，3:1 大字）           |
| 5   | 减少动效        | `prefers-reduced-motion` 时关闭 framer-motion |
| 6   | ARIA 标签       | 全部交互元素有 `aria-label`                   |

### 7.6 i18n

| #   | 用例            | 期望                                                  |
| --- | --------------- | ----------------------------------------------------- |
| 1   | 4 语言切换      | 所有菜单 / 按钮 / 状态 / 错误显示对应语言             |
| 2   | CI 字典对齐     | zh-CN / en-US / ja-JP / ko-KR 4 文件 key 完全一致     |
| 3   | 数字 / 日期格式 | `Intl.NumberFormat` / `Intl.DateTimeFormat` 按 locale |
| 4   | 货币符号        | 按国家自动（USD / EUR / JPY / KRW）                   |
| 5   | 命名空间严格    | 所有 t('namespace.key') 命中 00-foundation §5.5.1     |

### 7.7 跨文件一致性

| #   | 用例       | 期望                                                             |
| --- | ---------- | ---------------------------------------------------------------- |
| 1   | 状态色     | 所有 <StatusBadge status="x" /> 颜色在 00-foundation §8.3.1 表中 |
| 2   | 状态日志   | 所有 Entity 有独立 <Entity>StatusLog 表                          |
| 3   | 外键       | 所有 \*UserId 字段有 @relation onDelete: Restrict                |
| 4   | 资源级权限 | dlc3 / dlc5 阈值正确，internal H5 端 404                         |
| 5   | 退款统一   | 跨模块共享 GET /api/admin/refunds                                |

---

<a id="8-风险与回滚预案"></a>

## 8. 风险与回滚预案

### 8.1 风险矩阵

| 风险                    | 等级 | 触发场景       | 缓解措施                           | 回滚方案                             |
| ----------------------- | ---- | -------------- | ---------------------------------- | ------------------------------------ |
| 路由懒加载导致白屏      | 高   | chunk 加载失败 | Suspense fallback = skeleton       | 关闭 lazy，恢复同步 import（5 分钟） |
| Service Worker 缓存陈旧 | 中   | 后端 API 变更  | StaleWhileRevalidate + 7 天 maxAge | 推送 SW 更新（`skipWaiting`）        |
| A/B 实验误判            | 中   | 流量分配不均   | 后端决定分桶 + 同 userId 同组      | feature flag 一键关                  |
| 推送召回过度            | 中   | 用户投诉骚扰   | 频控（每周 ≤ 3 条） + 退订按钮     | 立即关停 campaign                    |
| 性能监控 SDK 拖慢       | 低   | 弱网           | 异步 + beacon                      | 关闭 SDK                             |
| PWA 缓存敏感数据        | 中   | 用户退出后     | 退出时清 SW cache                  | 监听事件清                           |
| 离线模式误用            | 中   | 写操作未拦截   | NetworkOnly 写操作                 | 强制 NetworkOnly                     |
| 主题切换闪烁            | 低   | 首屏暗 → 浅    | 阻塞 script 设 data-theme          | 关闭跟随系统                         |

### 8.2 灰度发布策略

```
P0 性能优化：
  Day 1-3:   5% 灰度（VIP 用户）
  Day 4-7:   20% 灰度
  Day 8-14:  50% 灰度
  Day 15+:   100%

P1 转化优化：
  Week 1-2:  A/B 5% 流量
  Week 3:    胜出组 20% → 50% → 100%
  落败组  →  回滚（5 分钟）

P2 PWA / A11y：
  一次性发布（影响小）
```

### 8.3 监控告警

| 指标       | 阈值       | 告警            |
| ---------- | ---------- | --------------- |
| LCP P95    | > 3s       | 企业微信 + 邮件 |
| 错误率     | > 1%       | 短信 + 电话     |
| 转化率     | 跌幅 > 20% | 企业微信        |
| 7 日留存   | 跌幅 > 10% | 邮件 + 复盘     |
| 推送到达率 | < 70%      | 企业微信        |

### 8.4 紧急回滚 Runbook

```bash
# 1. 关闭所有 feature flag（< 1 分钟）
./scripts/feature-flag.sh off optimization.*

# 2. 回滚到上一个稳定版本（< 5 分钟）
git revert HEAD
git push
# CI/CD 自动部署

# 3. 清 PWA 缓存（用户侧）
./scripts/clear-sw-cache.sh

# 4. 回滚后监控 1 小时
# - 错误率恢复正常
# - 性能恢复正常
# - 转化率恢复正常
```

---

## 9. 附录

### 9.1 推荐依赖（package.json 增量）

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.59.0",
    "react-virtuoso": "^4.10.0",
    "react-intersection-observer": "^9.13.0",
    "use-debounce": "^10.0.0",
    "minisearch": "^7.1.0",
    "nprogress": "^0.2.0",
    "react-syntax-highlighter": "^15.6.0",
    "web-vitals": "^4.2.0",
    "@sentry/react": "^8.0.0",
    "next-themes": "^0.4.6"
  },
  "devDependencies": {
    "vite-plugin-pwa": "^0.20.0",
    "vite-bundle-visualizer": "^1.2.0",
    "@lhci/cli": "^0.14.0"
  }
}
```

### 9.2 脚本（CI / 校验）

```bash
# scripts/check-i18n-namespace.js
# 扫描所有 t('namespace.key') 调用
# 校验 namespace 在 00-foundation §5.5.1 速查表

# scripts/check-status-colors.js
# 扫描所有 <StatusBadge status="x" />
# 校验 x 颜色在 00-foundation §8.3.1 表中

# scripts/check-status-logs.js
# 扫描 schema.prisma
# 校验所有 Entity 有独立 <Entity>StatusLog 表

# scripts/check-user-id-fk.js
# 扫描所有 *UserId 字段
# 校验有 @relation onDelete: Restrict

# scripts/lighthouse-ci.sh
# 跑 Lighthouse CI
# 任一指标超 budget → exit 1
```

### 9.3 度量看板（Grafana）

```yaml
# 推荐看板布局
1. 总览：LCP / FID / CLS / 错误率 / 转化率 / 7日留存
2. Web Vitals（按页面）
3. 漏斗看板（7 核心漏斗）
4. 留存曲线（按注册周分群）
5. 性能瓶颈（Top 10 慢接口 / 慢 chunk）
6. 错误聚合（按类型 / 频次）
7. 推送召回效果（D+1 / D+7 / D+30）
8. A/B 实验进度
```

### 9.4 未来规划（v2）

- ⏸ **Streaming SSR**（用 Vite SSR / Next.js 13+ App Router）
- ⏸ **React Server Components**（首屏 0 JS）
- ⏸ **Edge Computing**（Cloudflare Workers / Vercel Edge）
- ⏸ **WebGPU** 加速 AI Chat 渲染
- ⏸ **Web Codecs** 视频硬解码
- ⏸ **Predictive Prefetch**（ML 预测下一菜单）
- ⏸ **Federation**（Module Federation 跨团队拆分）

---

## 10. 实施 CheckList（开发者视角）

> **为什么需要这章**：上面给了大量策略与代码片段，落地时需要一个**逐项可勾选**的 CheckList，避免漏项。

### 10.1 P0 必做清单

#### 10.1.1 路由懒加载

- [ ] `src/App.tsx` 改 import 为 `React.lazy`
- [ ] 加 `Suspense fallback`（用现有 Skeleton）
- [ ] `vite.config.ts` 加 `manualChunks`
- [ ] 跑 `npm run build` 验证首屏 chunk ≤ 250KB
- [ ] Lighthouse 验证 LCP ≤ 2.5s

#### 10.1.2 3 级 ErrorBoundary

- [ ] `src/components/ErrorBoundary.tsx` 支持 `level` prop
- [ ] 接入 Sentry（`@sentry/react`）
- [ ] 全局：`<ErrorBoundary level="global">` 包裹 `<Routes>`
- [ ] 页面级：20 个菜单各自包
- [ ] 区块级：列表区 / 详情区
- [ ] 故意 throw 验证降级 UI 出现
- [ ] Sentry 后台验证收到事件

#### 10.1.3 列表虚拟滚动

- [ ] 安装 `react-virtuoso`
- [ ] `src/components/shared/ListView.tsx` 用 Virtuoso
- [ ] 8 个列表密集菜单接入：Discover / AI Brain / AI Chat / Video Center / Media Center / Notifications / Documents / Services
- [ ] 1000 条数据滚动验证 60 FPS
- [ ] Skeleton 在 `isLoading` 时显示

#### 10.1.4 图片 WebP/AVIF

- [ ] CDN 开启自动转换（与运维对齐）
- [ ] 上传接口返回 url 模板
- [ ] H5 端用 `<picture>` + `<source type="image/avif">` + `<source type="image/webp">`
- [ ] 加 `loading="lazy"` + `decoding="async"`
- [ ] Lighthouse 验证 LCP 改善

#### 10.1.5 字体子集化

- [ ] 字体文件转 WOFF2 Variable Font
- [ ] `index.html` `<link rel="preload">` 字体
- [ ] `@font-face` 加 `font-display: swap`
- [ ] 4 语言分别子集化
- [ ] Lighthouse 验证字体体积 ≤ 150KB

#### 10.1.6 Skeleton 统一

- [ ] 20 菜单全部用 `<Skeleton />` 替代 Spinner
- [ ] `< 200ms` 不显示 loading
- [ ] `200ms - 1s` Skeleton
- [ ] `1s - 5s` Skeleton + "加载中"
- [ ] `> 5s` 超时提示 + 重试

#### 10.1.7 错误降级 UI

- [ ] `<ErrorState />` 组件
- [ ] `<EmptyState />` 组件
- [ ] `<LoadingState />` 组件
- [ ] 20 菜单全部接入 3 态
- [ ] 故意 fail 接口验证降级 UI

#### 10.1.8 性能监控

- [ ] 安装 `web-vitals`
- [ ] `src/lib/vitals.ts` 上报 LCP/INP/CLS/FCP/TTFB
- [ ] 后端 `/api/h5/metrics` 接收
- [ ] Grafana 看板
- [ ] 告警阈值配置

#### 10.1.9 StatusBadge 颜色统一

- [ ] `STATUS_COLOR_MAP` 严格按 00-foundation §8.3.1
- [ ] 颜色 + 文字 双标识
- [ ] CI 校验脚本

#### 10.1.10 React Query 接入

- [ ] 安装 `@tanstack/react-query`
- [ ] `main.tsx` 加 `<QueryClientProvider>`
- [ ] 20 菜单迁移（**不**改 UI 内部）
- [ ] `staleTime` / `gcTime` 配置
- [ ] 5 分钟内不重复请求

### 10.2 P1 应做清单

#### 10.2.1 漏斗埋点

- [ ] 7 核心漏斗埋点（订阅/AI对话/DLC/名片/公司/银行/税务）
- [ ] 后端 `/api/h5/track` 接收
- [ ] Grafana 漏斗看板
- [ ] A/B 实验埋点

#### 10.2.2 转化引导

- [ ] 12 菜单加 CTA / 限时 / 捆绑
- [ ] A/B 实验 5 项
- [ ] 落地页转化率 +20%

#### 10.2.3 推送召回

- [ ] 推送 SDK 接入
- [ ] D+1 / D+3 / D+7 / D+30 4 节奏
- [ ] 频控（每周 ≤ 3 条）
- [ ] 退订按钮

#### 10.2.4 i18n 文案打磨

- [ ] 4 语言字典完整
- [ ] CI 校验 4 文件 key 一致
- [ ] 文案 A/B 测试

#### 10.2.5 状态日志独立表

- [ ] 8 个模块新增/修复 `<Entity>StatusLog`
- [ ] 外键 `operatorId @relation onDelete: Restrict`
- [ ] CI 校验

### 10.3 P2 可做清单

#### 10.3.1 PWA

- [ ] `vite-plugin-pwa` 接入
- [ ] `manifest.json` 配 192/512 图标
- [ ] Service Worker 缓存策略
- [ ] "添加到主屏"按钮
- [ ] 离线降级 UI

#### 10.3.2 A11y

- [ ] Lighthouse A11y ≥ 90
- [ ] 键盘 Tab 可达
- [ ] ARIA 标签完整
- [ ] 颜色对比度 WCAG 2.1 AA
- [ ] `prefers-reduced-motion` 关闭动效

#### 10.3.3 高级动效

- [ ] 视差滚动
- [ ] Hero 渐显
- [ ] 列表项入场动画
- [ ] 60 FPS 验证

---

> **最后更新**：2026-06-06
> **作者**：前端架构组
> **审核**：产品 / 设计 / 后端
> **版本**：v1.0.0
> **配套文档**：
>
> - [00-foundation.md](../../admin-prd/00-foundation.md)（基础）
> - [02-discover.md ~ 19-ai-business-card.md](../../admin-prd/)（21 个后台 PRD）
> - [01-wechat-mini-program.md](../01-wechat-mini-program.md)（微信小程序）
