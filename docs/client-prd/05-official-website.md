# 05 · 官方网站（Marketing Site / Landing Page / Docs）

> **后端**：与 H5 / 小程序 / 后台共用 `apps/api` NestJS 服务，**但**走独立的公开接口前缀 `/api/public/website/*`（详见 §3.4 为什么不复用 `/api/h5/*`）
> **前端**：`apps/website/`，**Next.js 14 App Router**（**不**用 Vite + SPA——SEO 必须 SSR/SSG）
> **核心目标**：营销获客 + 品牌官网 + 开发者文档 + SEO 流量入口，**非交易**
> **渲染策略**：默认 **ISR + SSG**，仅登录态/表单提交走 SSR（按页面分级）
> **多语言**：Next.js i18n routing（`/zh-CN/...` / `/en-US/...` / `/ja-JP/...` / `/ko-KR/...`）

---

## 1. 业务目标

**为什么需要这章**：官网是「海购星 Samoa DAO」**唯一面向搜索引擎和未登录访客**的资产——H5 / 小程序 / APP 全部要登录、要权限、要鉴权，**只有官网是公开流量入口**。本节定义可量化的业务目标，作为后续 SEO、A/B、内容运营的北极星。

| 目标分类 | 指标                             | 目标值                | 监控频率 |
| -------- | -------------------------------- | --------------------- | -------- |
| 流量     | 月度自然搜索 UV                  | ≥ 80,000（12 个月内） | 周       |
|          | Google 收录页面数                | ≥ 200                 | 周       |
|          | 百度收录页面数                   | ≥ 350                 | 周       |
|          | 域名权威度（Ahrefs DR）          | ≥ 35（12 个月内）     | 月       |
| 转化     | 落地页 → 注册转化率              | ≥ 4.5%                | 日       |
|          | 注册 → 7 日激活率                | ≥ 55%                 | 周       |
|          | 试用 → 付费转化率                | ≥ 12%                 | 月       |
|          | 博客读者 → 邮件订阅              | ≥ 8%                  | 月       |
| 性能     | Lighthouse Performance           | ≥ 90（移动 + 桌面）   | 每次发布 |
|          | LCP（ Largest Contentful Paint） | < 2.5s（p75 4G）      | 实时     |
|          | INP（Interaction to Next Paint） | < 200ms（p75）        | 实时     |
|          | CLS（Cumulative Layout Shift）   | < 0.1（p75）          | 实时     |
| 品牌     | 直接访问占比                     | ≥ 25%                 | 月       |
|          | 媒体引述数                       | ≥ 15 篇 / 季度        | 季度     |
|          | NPS（注册 30 天后调研）          | ≥ 45                  | 季度     |

---

## 2. 用户故事

**为什么需要这章**：官网服务 4 类访客——他们的诉求、技术水平、决策路径**完全不同**。H5/小程序/APP 的用户故事模板不能照搬，因为这里**没有登录态、没有 H5 的 `User`**——访客是匿名的、由 `Lead` 抽象承担。本节把 4 类访客拆开看。

### 2.1 潜在用户（C 端 / 中小企业主）

| #    | 故事                                                                                                                                                              |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-1 | 作为**萨摩亚本地中小企业主**，我从 Google 搜索"萨摩亚公司注册流程"，进入 `/zh-CN/features/company-register`，看到流程图 + 费用表 + 用户证言，点 CTA「免费咨询」   |
| US-2 | 作为**想出海做跨境电商的创业者**，我看完定价页 `/zh-CN/pricing` 后，对比 Starter / Pro / Enterprise，留资（邮箱 + 公司名 + 月营收区间），1 个工作日内收到 BD 跟进 |
| US-3 | 作为**非中文母语者**，我浏览器语言是日语，访问官网自动跳 `/ja-JP/`，看到全日语落地页，能切换到英文或中文                                                          |
| US-4 | 作为**回头访客**，我 30 天前留过资，今天再访问时看到「您已留资，BD 张三将在 24h 内联系您」个性化提示                                                              |

### 2.2 开发者 / 合作伙伴

| #    | 故事                                                                                                                                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-5 | 作为**第三方开发者**，我进入 `/en-US/docs/api-reference`，看到 OpenAPI 3.1 文档，能直接复制 cURL 示例调 `/api/public/website/lead`                                   |
| US-6 | 作为**想集成 DID 凭证的合作伙伴**，我读 `/en-US/docs/integrations/did-verifier`，按步骤在自己的 Node.js 后端调 `/api/public/website/verify-vc`，跑通 end-to-end demo |
| US-7 | 作为**贡献者**，我在 GitHub 看到 typo，点文档页底部的「在 GitHub 编辑此页」跳转 PR                                                                                   |
| US-8 | 作为**集成方安全审计员**，我在 `/en-US/docs/security` 找到 SOC2 报告下载链接、渗透测试白皮书、加密规范                                                               |

### 2.3 投资人 / 媒体

| #     | 故事                                                                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------- |
| US-9  | 作为**机构投资人**，我访问 `/en-US/investors`（v2 上线前为 `/en-US/about` 单独区块），看到融资信息、董事会、增长数据 |
| US-10 | 作为**财经媒体记者**，我通过 `/en-US/press` 下载品牌素材包（logo SVG / 配色规范 / 高管照片），并找到 PR 联系人邮箱   |
| US-11 | 作为**自媒体内容创作者**，我在 `/en-US/blog` 看到 3 篇关于「Web3 出海合规」的深度长文，转发到 Twitter 并附官网链接   |

### 2.4 内部 BD / 市场运营

| #     | 故事                                                                                                                                   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| US-12 | 作为**市场运营**，我在 `/admin/website/leads` 看到今日新增 47 个 Lead，导出 CSV 给 BD 团队                                             |
| US-13 | 作为**内容运营**，我用 MDX 写博客 `apps/website/content/blog/2026-06-samoa-tax-guide.mdx`，提交 git → CI 自动 build → ISR 重新生成页面 |
| US-14 | 作为**增长经理**，我在 `/admin/website/ab-tests` 创建 A/B 实验：landing hero 文案 A vs B，50/50 流量分流，3 天后看到统计显著性         |

---

## 3. 与 H5 / 小程序 / APP 的差异（**官网独有，重点展开**）

**为什么需要这章**：官网是 5 个端里**唯一一个「公开 + 营销 + SEO」属性的端**——它**不**是 H5 的简化版、**不**是小程序的 Web 化、**不**是 APP 的网页壳。技术栈、鉴权、API 路径、状态机、监控指标**全都不一样**。本节是新人 onboarding 必读。

### 3.1 目标与定位差异

| 维度       | H5 / 小程序 / APP          | 官网                                           |
| ---------- | -------------------------- | ---------------------------------------------- |
| 主要目标   | 交易 + 留存 + 复购         | **获客 + 品牌 + SEO 流量**                     |
| 用户态     | 100% 登录                  | **99% 匿名**（访客）                           |
| 转化路径   | 进 APP → 下单 → 支付       | 访问 → 留资 → BD 跟进 → 注册                   |
| 留存手段   | 推送 / 订阅消息 / Web Push | **邮件订阅 + 内容营销 + 私域沉淀**             |
| 核心 KPI   | GMV / DAU / 留存           | **UV / 转化率 / 关键词排名 / Lighthouse 分数** |
| 数据敏感度 | 高（KYC / 支付）           | 低（仅 Lead 信息 + Cookie）                    |

### 3.2 技术栈差异

| 维度     | H5                        | 小程序              | APP                     | **官网**                                                 |
| -------- | ------------------------- | ------------------- | ----------------------- | -------------------------------------------------------- |
| 框架     | Vite + React 19           | 微信原生            | RN / Flutter            | **Next.js 14（App Router）**                             |
| 渲染     | CSR（Client Side Render） | 微信 JS 引擎        | Native                  | **SSR + SSG + ISR 混合**                                 |
| 路由     | React Router v6           | 微信页面栈          | React Navigation        | **Next.js file-based + `[locale]`**                      |
| 状态管理 | Zustand + React Query     | `App.globalData`    | Redux / Zustand         | **React Server Components + URL state + Server Actions** |
| 构建     | Vite 5                    | 微信开发者工具      | Metro                   | **Next.js 14 + Turbopack**                               |
| 部署     | CDN 静态资源              | 微信审核            | App Store / Google Play | **Vercel / Cloudflare Pages / 自建 CDN**                 |
| 鉴权     | JWT（7 天）               | 微信 code → unionid | 手机号 / 苹果登录       | **无登录态**（Lead 用 cookie + 邮箱标记）                |
| SEO      | ❌ 不关心                 | ❌ 不关心           | ❌ 不关心               | ✅ **必须**（meta / JSON-LD / sitemap）                  |
| 后端 API | `/api/h5/*`               | `/api/h5/*`         | `/api/h5/*`             | **`/api/public/website/*`**（**单独**）                  |

### 3.3 鉴权与身份差异（**最重要的差异**）

| 维度     | H5                          | **官网**                                                          |
| -------- | --------------------------- | ----------------------------------------------------------------- |
| 默认身份 | 登录 `User`                 | **匿名访客**（无 `User.id`）                                      |
| 身份载体 | JWT（Authorization Header） | **HttpOnly Cookie（leadId）** + LocalStorage（locale）            |
| 跨域     | 同源 `smy.app`              | **`smy.app` ↔ `api.smy.app` 跨域**——必须 CORS 白名单              |
| 隐私门槛 | 用户协议 + KYC              | **GDPR / CCPA / PIPL**——Cookie banner 强制                        |
| 二次身份 | 同设备静默登录              | **邮箱标记**——用邮箱关联 Lead 记录                                |
| 反作弊   | 风控引擎（设备指纹 + IP）   | **Cloudflare Turnstile / hCaptcha**（**不**用极验——海外访问困难） |

### 3.4 为什么 API 单独走 `/api/public/website/*`（**不**复用 `/api/h5/*`）

**为什么需要这章**：3 个客户端 + 1 个官网共用后端，但 API 路径**必须**物理隔离——这是「公开流量」与「鉴权流量」的本质区别。混用会引发 4 类严重问题（性能、安全、审计、CDN 缓存）。本节给硬性约束。

| 维度       | `/api/h5/*`                     | **`/api/public/website/*`**                 |
| ---------- | ------------------------------- | ------------------------------------------- |
| 鉴权       | 必须 JWT                        | **完全公开**（无 JWT）                      |
| 限流       | 按 userId 限流                  | **按 IP + UA + Cookie** 限流                |
| 缓存       | 几乎不缓存                      | **CDN 可激进缓存**（30s ~ 1h）              |
| WAF        | 后台规则                        | **更严**——防爬虫 / 防爆破 / 防 SQL 注入     |
| 审计       | 写 AuditLog（关联 adminUser）   | **写访问日志 + Lead 表**，**不**写 AuditLog |
| 域名白名单 | H5 / 小程序 / APP 客户端        | **搜索引擎爬虫 + 第三方集成**               |
| 鉴权层级   | NestJS Guards 全套              | **仅** CORS guard + RateLimit guard         |
| 字段过滤   | `class-transformer` `@Expose()` | **额外 DTO 过滤**——不能泄露 admin 字段      |

**硬性约束**（违反即代码 review 拒绝）：

```typescript
// apps/api/src/modules/website/website.module.ts
@Controller('api/public/website')   // ✅ 正确前缀
export class WebsiteController { ... }

@Controller('api/h5/website')         // ❌ 严禁：混用 /api/h5
export class WebsiteBadController { ... }
```

### 3.5 SEO 能力差异（**官网独有**）

| SEO 能力             | H5（CSR）                      | 小程序        | APP | **官网（SSR/SSG）**                                                       |
| -------------------- | ------------------------------ | ------------- | --- | ------------------------------------------------------------------------- |
| `<title>` / `<meta>` | 客户端设置（**不**被爬虫抓取） | 微信 SEO 黑盒 | N/A | **服务端渲染，爬虫直接抓**                                                |
| Open Graph           | 部分支持（需预渲染）           | ❌            | N/A | **完整支持**（`generateMetadata`）                                        |
| 结构化数据 JSON-LD   | ❌                             | ❌            | N/A | **完整支持**（`schema.org/Organization` / `Article` / `Product` / `FAQ`） |
| `sitemap.xml`        | ❌                             | ❌            | N/A | **动态生成**（`app/sitemap.ts`）                                          |
| `robots.txt`         | ❌                             | ❌            | N/A | **动态生成**（`app/robots.ts`）                                           |
| Canonical            | ❌                             | ❌            | N/A | **自动 + 手动**（`alternates.canonical`）                                 |
| Hreflang（多语言）   | ❌                             | ❌            | N/A | **自动**（`alternates.languages`）                                        |
| Core Web Vitals      | 差（CSR）                      | 中            | 优  | **优**（SSG 静态资源 + CDN）                                              |

### 3.6 性能与缓存策略差异

| 资源      | H5                             | **官网**                                                         |
| --------- | ------------------------------ | ---------------------------------------------------------------- |
| HTML      | 1 个空壳 + JS 渲染             | **每个 URL 一个静态 HTML**（ISR 缓存）                           |
| JS bundle | 全部加载（~800KB gzipped）     | **按路由懒加载**（首屏 ~120KB gzipped）                          |
| 图片      | 普通 `<img>`                   | **`next/image`**（自动 WebP / AVIF / 懒加载 / 响应式）           |
| 字体      | 系统字体                       | **`next/font`**（自动子集化 + preload）                          |
| 缓存策略  | Browser cache + Service Worker | **CDN edge cache + ISR + Browser cache 三层**                    |
| 失效      | 版本号 + 强制刷新              | **On-Demand Revalidation**（`revalidatePath` / `revalidateTag`） |

### 3.7 数据采集差异

| 维度           | H5                    | **官网**                                                       |
| -------------- | --------------------- | -------------------------------------------------------------- |
| 行为埋点       | 自研 + 神策 / Sensors | **GA4 + 百度统计 + 友盟 + Mixpanel** 四件套                    |
| 转化漏斗       | 后台 BI 平台          | **GA4 Funnels + Mixpanel Cohorts**                             |
| 热图           | —                     | **Hotjar / Microsoft Clarity**（**不**用百度热图——海外访问慢） |
| A/B 测试       | 无                    | **自研 A/B 框架 + PostHog**（详见 §13）                        |
| Session Replay | —                     | **Microsoft Clarity（免费）** / LogRocket（付费）              |
| GDPR 合规      | 用户协议覆盖          | **必须** Cookie banner + Do Not Track 尊重                     |

### 3.8 内容生产差异

| 维度     | H5 / 后台            | **官网**                                                                                         |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| 内容源   | 数据库（CMS 后台）   | **MDX 文件**（`apps/website/content/`）+ **Headless CMS**（Sanity / Strapi / Contentlayer 候选） |
| 发布流程 | 运营在后台点「发布」 | **Git 提交 → CI 触发 build → ISR 重生成**                                                        |
| 版本控制 | 后台内置             | **Git 全程**（可回滚）                                                                           |
| 协作     | 后台角色权限         | **Git PR + Review**                                                                              |
| 多语言   | 字典文件             | **每篇 MDX 有 4 个 `.zh-CN.mdx` / `.en-US.mdx` / `.ja-JP.mdx` / `.ko-KR.mdx`**                   |

---

## 4. 业务流程

**为什么需要这章**：官网 4 个核心流程——**访问 → 留资转化、SEO 收录、内容营销、合作申请**——它们**不**像 H5 那样有清晰的状态机，但同样需要明确时序、SLA、Owner。本节用流程图 + 文字双重定义。

### 4.1 落地页访问 → 注册转化（核心漏斗）

```
访客从 Google / 微信 / 朋友圈点链接
   ↓
Next.js ISR 生成的静态 HTML 立即响应（< 200ms）
   ↓
浏览器解析 + 加载 JS + hydrate
   ↓
GA4 自动采集 page_view + scroll_depth + click 事件
   ↓
访客点击 CTA「免费咨询」 / 「立即注册」 / 「预约演示」
   ↓
打开 Lead 弹窗（drawer / modal）
   ↓
填写表单（姓名 / 公司 / 邮箱 / 手机 / 需求描述）
   ↓
前端 Zod 校验 → 调 POST /api/public/website/leads
   ↓
后端：
  1. Turnstile 验真（防机器人）
  2. 限流检查（同 IP 1h 内 ≤ 3 次）
  3. 邮箱格式 + MX 记录检查
  4. 写 Lead 表（status=new）
  5. 触发 A/B 实验打点（lead_submit）
  6. 发邮件给 BD 团队（slack 通知）
  7. 发确认邮件给访客
   ↓
返回 leadId，前端跳「感谢页」/「预约成功」
   ↓
BD 1 个工作日内跟进
   ↓
BD 在后台 `/admin/leads/:id` 标记 status=contacted
   ↓
后续：qualified / negotiating / closed_won / closed_lost
```

**SLA**：

- 首屏 LCP < 2.5s（4G 网络，p75）
- 弹窗打开 < 100ms（本地状态，不打后端）
- 表单提交 → 返回结果 < 800ms
- 邮件确认 < 30s
- BD 跟进 < 24h（工作时间）

### 4.2 SEO 收录 → 流量增长

```
内容运营写 MDX 文章
   ↓
git push → GitHub
   ↓
CI（Vercel / GitHub Actions）触发 Next.js build
   ↓
ISR 生成静态 HTML + sitemap.xml 更新
   ↓
CDN 推送 + 搜索引擎 ping
   ↓
Google Search Console 检测到新 URL
   ↓
Googlebot 抓取 → 索引
   ↓
关键词排名（7-30 天出结果）
   ↓
搜索曝光 → 点击 → 落地
   ↓
GA4 归因 → 转化
```

**SEO 关键节点**：

- 提交 sitemap 给 Google Search Console + 百度站长平台
- 每篇文章手动设置 `canonical` + `hreflang`
- 内部链接结构：博客 → 功能详情 → 落地页
- 外链建设：媒体合作、合作伙伴页面、目录站提交
- Core Web Vitals 持续监控（详见 §17）

### 4.3 内容营销 → 私域沉淀

```
访客读博客文章（来源：SEO / 微信 / 朋友圈 / 知乎）
   ↓
滚动到 50% 触发「订阅 newsletter」弹窗
   ↓
填写邮箱 → POST /api/public/website/newsletter/subscribe
   ↓
后端：
  1. 邮箱去重（已订阅则更新偏好）
  2. 写 NewsletterSubscriber 表
  3. 触发欢迎邮件（drip campaign day 0）
   ↓
3 天后发「精选文章」邮件
   ↓
7 天后发「产品更新」邮件
   ↓
14 天后发「创始人来信」邮件
   ↓
访客点击邮件 → 回到官网 → 留资 / 注册
```

**关键工具**：

- 邮件发送：**Resend**（开发友好）+ **SendGrid**（生产稳定）
- 邮件模板：**React Email** 组件
- 反垃圾：**SPF + DKIM + DMARC** 三件套
- 退订：**List-Unsubscribe** Header 强制

### 4.4 合作申请 → BD 跟进

```
合作伙伴（律所 / 银行 / 投资机构）访问 `/zh-CN/partners`
   ↓
点「申请合作」打开表单
   ↓
填写：公司名 / 合作类型（payroll / tax / legal / banking）/ 业务描述
   ↓
提交 → POST /api/public/website/partners/apply
   ↓
后端写 PartnerApplication 表（status=pending）
   ↓
发送邮件给商务总监 + Slack 通知
   ↓
商务总监在后台审核 → approve / reject
   ↓
approved 后自动创建 Partner 记录 + 发邀请邮件
   ↓
BD 跟进 + 签约
```

---

## 5. 字段定义（官网特有）

**为什么需要这章**：官网的 4 张核心表（`PageView` / `LeadForm` / `ABTest` / `SEOPageMeta`）**与 H5 表完全正交**——它们在 H5 后台**不**存在，必须单独建表。本节给完整 schema。

### 5.1 PageView（页面浏览 — 替代 GA4 自有存储）

| 字段            | 类型         | 必填 | 说明                                            |
| --------------- | ------------ | ---- | ----------------------------------------------- |
| id              | String       | ✓    |                                                 |
| visitorId       | String(64)   | ✓    | Cookie 中的 UUID（**不**用 IP 关联）            |
| sessionId       | String(64)   | ✓    | 30 分钟无活动即结束会话                         |
| path            | String(2048) | ✓    | URL 路径（含 query）                            |
| locale          | String(8)    |      | zh-CN / en-US / ja-JP / ko-KR                   |
| referrer        | String(2048) |      | 来源 URL                                        |
| utmSource       | String(128)  |      | UTM 参数                                        |
| utmMedium       | String(128)  |      |                                                 |
| utmCampaign     | String(128)  |      |                                                 |
| utmContent      | String(128)  |      |                                                 |
| utmTerm         | String(128)  |      |                                                 |
| deviceType      | enum         | ✓    | `desktop` / `mobile` / `tablet`                 |
| os              | String(64)   |      | iOS / Android / Windows / macOS / Linux         |
| browser         | String(64)   |      | Chrome / Safari / Edge / Firefox                |
| country         | String(2)    |      | ISO 3166-1 alpha-2（Cloudflare CF-IPCountry）   |
| city            | String(64)   |      |                                                 |
| durationMs      | Int          |      | 页面停留时长（visibilitychange + beforeunload） |
| scrollDepth     | Int          |      | 0-100（百分比）                                 |
| isBounce        | Boolean      |      | 单页访问即跳出                                  |
| experimentsJson | String       |      | A/B 实验曝光记录（JSON 字符串）                 |
| createdAt       | DateTime     |      | 访问时间                                        |

```prisma
model PageView {
  id              String   @id @default(uuid())
  visitorId       String
  sessionId       String
  path            String
  locale          String?
  referrer        String?
  utmSource       String?
  utmMedium       String?
  utmCampaign     String?
  utmContent      String?
  utmTerm         String?
  deviceType      String
  os              String?
  browser         String?
  country         String?
  city            String?
  durationMs      Int      @default(0)
  scrollDepth     Int      @default(0)
  isBounce        Boolean  @default(true)
  experimentsJson String?
  createdAt       DateTime @default(now())

  @@index([visitorId, createdAt])
  @@index([sessionId])
  @@index([path, createdAt])
  @@index([utmCampaign, createdAt])
  @@index([createdAt])  // 时间分区候选
}
```

**采集策略**：

- **不**前端写死发请求 → 用 `@vercel/analytics` 或自研 `lib/tracker.ts`
- 1 分钟内同 path 多次访问去重（`sessionId + path + 1min`）
- **不**采集：精确 IP、邮箱、手机号（合规）
- **不**持久化：`User-Agent` 完整字符串（拆解为 `os` + `browser` 后丢弃）

### 5.2 LeadForm（线索表单提交）

| 字段                            | 类型         | 必填 | 说明                                                                                      |
| ------------------------------- | ------------ | ---- | ----------------------------------------------------------------------------------------- |
| id                              | String       | ✓    |                                                                                           |
| leadNo                          | String(20)   | ✓    | 业务编号 `LD-2026-00001`（年度递增）                                                      |
| name                            | String(64)   | ✓    | 姓名                                                                                      |
| email                           | String(128)  | ✓    | 邮箱（**唯一去重 + MX 校验**）                                                            |
| phone                           | String(32)   |      | 手机号（E.164 格式）                                                                      |
| company                         | String(128)  |      | 公司名                                                                                    |
| companySize                     | enum         |      | `1-10` / `11-50` / `51-200` / `201-1000` / `1000+`                                        |
| country                         | String(2)    |      | ISO 国家码                                                                                |
| interestArea                    | String[]     |      | 感兴趣领域（数组：`company` / `tax` / `legal` / `banking`）                               |
| monthlyRevenue                  | enum         |      | `<$10K` / `$10K-$100K` / `$100K-$1M` / `>$1M`                                             |
| message                         | String(2000) |      | 需求描述                                                                                  |
| source                          | enum         | ✓    | `landing_hero` / `pricing` / `blog_inline` / `contact_form` / `demo_request`              |
| referrerPath                    | String(2048) |      | 来源落地页                                                                                |
| utmParams                       | String       |      | UTM JSON                                                                                  |
| status                          | enum         | ✓    | `new` / `contacted` / `qualified` / `negotiating` / `closed_won` / `closed_lost` / `spam` |
| assignedToAdminId               | String?      |      | BD 负责人（关联 AdminUser）                                                               |
| assignedToAdmin                 | AdminUser?   |      | 详见 §12 规范                                                                             |
| experimentVariant               | String(64)   |      | 当前 A/B 实验变体                                                                         |
| ipAddress                       | String(45)   |      | 提交 IP（**不**长期保留，90 天后匿名化）                                                  |
| userAgent                       | String(512)  |      |                                                                                           |
| createdAt, updatedAt, deletedAt |              |      | 通用                                                                                      |

```prisma
model LeadForm {
  id                  String   @id @default(uuid())
  leadNo              String   @unique
  name                String
  email               String
  phone               String?
  company             String?
  companySize         String?
  country             String?
  interestArea        String?  // JSON 数组字符串
  monthlyRevenue      String?
  message             String?
  source              String
  referrerPath        String?
  utmParams           String?  // JSON 字符串
  status              String   @default("new")
  assignedToAdminId   String?
  assignedToAdmin     AdminUser? @relation("LeadFormAssignedTo", fields: [assignedToAdminId], references: [id], onDelete: Restrict)
  experimentVariant   String?
  ipAddress           String?
  userAgent           String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  deletedAt           DateTime?

  @@index([status, createdAt])
  @@index([email])
  @@index([assignedToAdminId, status])
  @@index([source, createdAt])
}
```

**业务约束**：

- 邮箱去重：同邮箱 24h 内重复提交 → 取最新，**不**新增记录
- 反垃圾：Turnstile 验证失败 → status='spam'，不入 BD 看板
- 合规：90 天后 `ipAddress` 字段自动置空（cron job）

### 5.3 ABTest（A/B 实验配置）

| 字段                            | 类型         | 必填 | 说明                                                                                              |
| ------------------------------- | ------------ | ---- | ------------------------------------------------------------------------------------------------- |
| id                              | String       | ✓    |                                                                                                   |
| key                             | String(64)   | ✓    | 实验唯一标识（如 `homepage_hero_v1`）                                                             |
| name                            | String(128)  | ✓    | 实验名                                                                                            |
| description                     | String(2000) |      |                                                                                                   |
| status                          | enum         | ✓    | `draft` / `running` / `paused` / `completed` / `archived`                                         |
| variants                        | String       | ✓    | JSON 数组：`[{ key: 'A', weight: 50, payload: {...} }, { key: 'B', weight: 50, payload: {...} }]` |
| targetAudience                  | String       |      | 受众过滤条件（JSON：locale / country / deviceType）                                               |
| trafficAllocation               | Int          | ✓    | 0-100（参与实验的流量百分比）                                                                     |
| primaryMetric                   | String(64)   |      | 主要指标（如 `cta_click_rate`）                                                                   |
| secondaryMetrics                | String       |      | 次要指标 JSON 数组                                                                                |
| minimumSampleSize               | Int          |      | 最小样本量（统计显著性）                                                                          |
| startedAt                       | DateTime?    |      | 实验开始时间                                                                                      |
| endedAt                         | DateTime?    |      | 实验结束时间                                                                                      |
| createdByAdminId                | String?      |      | 创建人                                                                                            |
| createdBy                       | AdminUser?   |      | 详见 §12                                                                                          |
| createdAt, updatedAt, deletedAt |              |      | 通用                                                                                              |

```prisma
model ABTest {
  id                  String   @id @default(uuid())
  key                 String   @unique
  name                String
  description         String?
  status              String   @default("draft")
  variants            String   // JSON
  targetAudience      String?  // JSON
  trafficAllocation   Int      @default(100)
  primaryMetric       String?
  secondaryMetrics    String?  // JSON
  minimumSampleSize   Int?
  startedAt           DateTime?
  endedAt             DateTime?
  createdByAdminId    String?
  createdBy           AdminUser? @relation("ABTestCreatedBy", fields: [createdByAdminId], references: [id], onclude: Restrict)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  deletedAt           DateTime?

  abTestEvents        ABTestEvent[]
  abTestStatusLogs    ABTestStatusLog[]

  @@index([status, startedAt])
  @@index([key])
}

model ABTestEvent {
  id              String   @id @default(uuid())
  abTestId        String
  abTest          ABTest   @relation(fields: [abTestId], references: [id], onDelete: Restrict)
  visitorId       String
  sessionId       String
  variantKey      String   // 'A' / 'B' / 'C'
  eventType       String   // 'exposure' / 'click' / 'conversion' / 'custom'
  eventName       String?  // 自定义事件名
  eventValue      Float?   // 事件值（如订单金额）
  metadata        String?  // JSON
  createdAt       DateTime @default(now())

  @@index([abTestId, variantKey, eventType])
  @@index([visitorId, abTestId])
  @@index([createdAt])
}

model ABTestStatusLog {
  id           String   @id @default(uuid())
  abTestId     String
  abTest       ABTest   @relation(fields: [abTestId], references: [id], onDelete: Restrict)
  fromStatus   String
  toStatus     String
  note         String?
  operatorId   String?
  operator     AdminUser? @relation("ABTestStatusLogOperator", fields: [operatorId], references: [id], onDelete: Restrict)
  operatorRole String?
  createdAt    DateTime @default(now())

  @@index([abTestId, createdAt])
  @@index([toStatus, createdAt])
}
```

> **关键决策**：`ABTest` / `ABTestEvent` / `ABTestStatusLog` 三表分离，遵循 [00-foundation §4.3](../../admin-prd/00-foundation.md) 业务状态日志独立表模式。

### 5.4 SEOPageMeta（页面 SEO 元数据）

| 字段                 | 类型        | 必填 | 说明                                                     |
| -------------------- | ----------- | ---- | -------------------------------------------------------- |
| id                   | String      | ✓    |                                                          |
| path                 | String(512) | ✓    | 页面路径（含 `[locale]` 占位）                           |
| locale               | String(8)   | ✓    | 单独存（`/` + `/en-US` 是不同记录）                      |
| title                | String(128) | ✓    | `<title>`                                                |
| description          | String(256) | ✓    | `<meta name="description">`                              |
| keywords             | String(512) |      | 逗号分隔                                                 |
| canonical            | String(512) |      | 规范 URL                                                 |
| ogImage              | String(512) |      | Open Graph 图片（1200×630）                              |
| ogType               | String(32)  |      | `website` / `article` / `product`                        |
| twitterCard          | String(32)  |      | `summary` / `summary_large_image`                        |
| jsonLd               | String      |      | JSON-LD 结构化数据                                       |
| robotsIndex          | Boolean     | ✓    | `index` / `noindex`                                      |
| robotsFollow         | Boolean     | ✓    | `follow` / `nofollow`                                    |
| hreflangAlternates   | String      |      | JSON：`{ 'en-US': '/en-US/...', 'ja-JP': '/ja-JP/...' }` |
| priority             | Decimal     |      | sitemap priority（0.0-1.0）                              |
| changefreq           | String(16)  |      | sitemap changefreq                                       |
| createdAt, updatedAt |             |      | 通用                                                     |

```prisma
model SEOPageMeta {
  id                  String   @id @default(uuid())
  path                String
  locale              String
  title               String
  description         String
  keywords            String?
  canonical           String?
  ogImage             String?
  ogType              String   @default("website")
  twitterCard         String   @default("summary_large_image")
  jsonLd              String?
  robotsIndex         Boolean  @default(true)
  robotsFollow        Boolean  @default(true)
  hreflangAlternates  String?
  priority            Decimal  @default(0.5)
  changefreq          String   @default("weekly")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([path, locale])
  @@index([locale])
}
```

---

## 6. 状态机

**为什么需要这章**：官网的 2 个核心状态机——`Lead` 状态机（销售漏斗）和 `ABTest` 状态机（实验生命周期）——决定了运营和增长团队的全部日常工作。状态枚举**必须**在 [00-foundation §8.3.1](../../admin-prd/00-foundation.md) 色彩表里有对应颜色，状态变更**必须**按 [00-foundation §4.3](../../admin-prd/00-foundation.md) 写独立日志表。

### 6.1 Lead 状态机（销售漏斗）

```
new → contacted → qualified → negotiating → closed_won
                  ↘                     ↘
                   closed_lost          closed_lost

任意状态 → spam（运营标记） / unqualified（明确无意向）
```

**状态定义**：

| 状态          | 颜色（00-foundation §8.3.1） | 文字       | 触发条件                               | Owner   |
| ------------- | ---------------------------- | ---------- | -------------------------------------- | ------- |
| `new`         | `#F6A623` 橙                 | 待跟进     | 表单提交成功，尚未有人联系             | BD 全员 |
| `contacted`   | `#3B82F6` 蓝                 | 已联系     | BD 在 24h 内拨打电话 / 发邮件          | BD 全员 |
| `qualified`   | `#8B5CF6` 紫                 | 已确认意向 | 客户回复有具体需求                     | BD 高级 |
| `negotiating` | `#F59E0B` 琥珀               | 商务谈判中 | 发送报价 / 合同中                      | BD 高级 |
| `closed_won`  | `#10B981` 绿                 | 成交       | 合同签署 + 首付款到账                  | BD 总监 |
| `closed_lost` | `#EF4444` 红                 | 失单       | 客户明确拒绝 / 30 天无回复             | BD 总监 |
| `spam`        | `#9CA3AF` 浅灰               | 垃圾线索   | Turnstile 失败 / 邮箱无效 / 关键字过滤 | 运营    |
| `unqualified` | `#6B7280` 灰                 | 无意向     | 客户不在目标画像（如个人开发者）       | 运营    |

**状态变更日志**（遵循 00-foundation §4.3 独立表模式）：

```prisma
model LeadFormStatusLog {
  id            String   @id @default(uuid())
  leadFormId    String
  leadForm      LeadForm @relation(fields: [leadFormId], references: [id], onDelete: Restrict)
  fromStatus    String
  toStatus      String
  note          String?
  operatorId    String?
  operator      AdminUser? @relation("LeadFormStatusLogOperator", fields: [operatorId], references: [id], onDelete: Restrict)
  operatorRole  String?
  createdAt     DateTime @default(now())

  @@index([leadFormId, createdAt])
  @@index([toStatus, createdAt])
  @@index([operatorId])
}
```

**验收用例**：

| #   | 用例                                            | 期望                                       |
| --- | ----------------------------------------------- | ------------------------------------------ |
| 1   | LeadForm 状态变更                               | 同步写 1 条 `LeadFormStatusLog`            |
| 2   | 同一 Lead 24h 内被 2 个 BD 同时改为 `contacted` | 第二次修改者收到 409 冲突提示              |
| 3   | BD 标记 `spam`                                  | 状态从 `new` 直接跳 `spam`，**不**走中间态 |
| 4   | 30 天未联系自动 `closed_lost`                   | cron job 每日 03:00 扫描                   |

### 6.2 ABTest 状态机（实验生命周期）

```
draft → running → paused ↔ running
         ↓
         completed
         ↓
         archived
```

**状态定义**：

| 状态        | 颜色           | 文字   | 触发条件                       |
| ----------- | -------------- | ------ | ------------------------------ |
| `draft`     | `#9CA3AF` 浅灰 | 草稿   | 创建未启动                     |
| `running`   | `#10B981` 绿   | 运行中 | 启动后开始分流                 |
| `paused`    | `#F59E0B` 琥珀 | 已暂停 | 人工暂停（紧急情况 / 节假日）  |
| `completed` | `#3B82F6` 蓝   | 已完成 | 达到样本量 / 显著性 / 手动结束 |
| `archived`  | `#6B7280` 灰   | 已归档 | 90 天后自动归档                |

**关键规则**：

- `draft → running`：必须设置 `startedAt`，开始分配流量
- `running → paused`：保留分流比例，访客继续看到原变体（**不**重新随机）
- `paused → running`：继续原实验，**不**重置样本
- `running → completed`：达到 `minimumSampleSize` **或** `primaryMetric` 显著（p < 0.05）
- `completed → archived`：90 天后 cron job 自动归档

---

## 7. 后端 API（官网特有）

**为什么需要这章**：官网 API 走 `/api/public/website/*` 前缀——这是公开接口，**不**走 JWT 鉴权，靠 Turnstile + 限流 + CORS 三层防护。本节列出所有官网特有接口。

### 7.1 公开接口（无需鉴权）

| Method | Path                                         | 限流        | 说明                                      |
| ------ | -------------------------------------------- | ----------- | ----------------------------------------- |
| GET    | `/api/public/website/config`                 | 60/min/IP   | 全局配置（GA ID / Turnstile Key / 公告）  |
| GET    | `/api/public/website/seo/:path`              | 300/min/IP  | 单页 SEO 元数据（按 path 查 SEOPageMeta） |
| GET    | `/api/public/website/blog/posts`             | 60/min/IP   | 博客列表（分页 + tag + locale）           |
| GET    | `/api/public/website/blog/posts/:slug`       | 60/min/IP   | 博客详情（MDX 编译后 HTML）               |
| GET    | `/api/public/website/case-studies`           | 60/min/IP   | 案例列表                                  |
| GET    | `/api/public/website/case-studies/:slug`     | 60/min/IP   | 案例详情                                  |
| GET    | `/api/public/website/testimonials`           | 60/min/IP   | 用户证言（按行业 / 国家筛选）             |
| GET    | `/api/public/website/pricing-plans`          | 60/min/IP   | 价格方案（多币种）                        |
| GET    | `/api/public/website/locales`                | 60/min/IP   | 支持的语言列表                            |
| POST   | `/api/public/website/track/pageview`         | 300/min/IP  | 上报页面浏览（不强制必传）                |
| POST   | `/api/public/website/track/event`            | 300/min/IP  | 上报自定义事件（按钮点击 / 表单字段）     |
| POST   | `/api/public/website/track/experiment`       | 600/min/IP  | 上报 A/B 实验曝光                         |
| POST   | `/api/public/website/leads`                  | 3/hour/IP   | 提交 Lead（**必须** Turnstile）           |
| POST   | `/api/public/website/newsletter/subscribe`   | 5/hour/IP   | 订阅 newsletter（**必须** Turnstile）     |
| POST   | `/api/public/website/newsletter/unsubscribe` | 10/hour/IP  | 退订（带 token 验证）                     |
| POST   | `/api/public/website/partners/apply`         | 3/hour/IP   | 合作申请（**必须** Turnstile）            |
| POST   | `/api/public/website/demo-request`           | 3/hour/IP   | 预约演示（**必须** Turnstile）            |
| POST   | `/api/public/website/contact`                | 5/hour/IP   | 联系表单（**必须** Turnstile）            |
| GET    | `/api/public/website/sitemap.xml`            | 1000/min/IP | 动态 sitemap                              |
| GET    | `/api/public/website/robots.txt`             | 1000/min/IP | 动态 robots                               |

### 7.2 内部接口（需 admin JWT 鉴权）

| Method | Path                                        | 权限            | 说明                             |
| ------ | ------------------------------------------- | --------------- | -------------------------------- |
| GET    | `/api/admin/website/leads`                  | `leads:read`    | Lead 列表（分页 + 状态筛选）     |
| GET    | `/api/admin/website/leads/:id`              | `leads:read`    | Lead 详情（含状态日志）          |
| PATCH  | `/api/admin/website/leads/:id`              | `leads:write`   | 修改 Lead（含状态变更）          |
| POST   | `/api/admin/website/leads/:id/assign`       | `leads:write`   | 分配给 BD                        |
| GET    | `/api/admin/website/leads/:id/status-logs`  | `leads:read`    | 状态变更历史                     |
| GET    | `/api/admin/website/leads/export`           | `leads:export`  | 导出 CSV                         |
| GET    | `/api/admin/website/ab-tests`               | `website:read`  | 实验列表                         |
| POST   | `/api/admin/website/ab-tests`               | `website:write` | 创建实验                         |
| PATCH  | `/api/admin/website/ab-tests/:id`           | `website:write` | 修改实验（含启动 / 暂停 / 结束） |
| GET    | `/api/admin/website/ab-tests/:id/results`   | `website:read`  | 实验结果（统计显著性）           |
| GET    | `/api/admin/website/seo-pages`              | `website:read`  | SEO 页面列表                     |
| PUT    | `/api/admin/website/seo-pages/:id`          | `website:write` | 修改 SEO 元数据                  |
| GET    | `/api/admin/website/pageviews/stats`        | `website:read`  | 流量统计（按日 / 路径 / 来源）   |
| GET    | `/api/admin/website/newsletter/subscribers` | `website:read`  | 订阅者列表                       |
| POST   | `/api/admin/website/newsletter/campaigns`   | `website:write` | 发起邮件活动                     |

### 7.3 关键 DTO 校验（Zod）

```typescript
// apps/api/src/modules/website/dto/create-lead.dto.ts
import { z } from 'zod';

export const CreateLeadDto = z.object({
  name: z.string().min(2).max(64),
  email: z.string().email().max(128),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional(), // E.164
  company: z.string().max(128).optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-1000', '1000+']).optional(),
  country: z.string().length(2).optional(),
  interestArea: z
    .array(z.enum(['company', 'tax', 'legal', 'banking', 'ai']))
    .max(5)
    .optional(),
  monthlyRevenue: z.enum(['<$10K', '$10K-$100K', '$100K-$1M', '>$1M']).optional(),
  message: z.string().max(2000).optional(),
  source: z.enum(['landing_hero', 'pricing', 'blog_inline', 'contact_form', 'demo_request']),
  referrerPath: z.string().max(2048).optional(),
  utmParams: z.record(z.string()).optional(),
  turnstileToken: z.string().min(10), // 必填
  experimentVariant: z.string().max(64).optional(),
});

export type CreateLeadPayload = z.infer<typeof CreateLeadDto>;
```

**关键约束**：

- 邮箱 + 域名 MX 记录校验（防无效邮箱）
- 手机号 E.164 国际格式
- Turnstile token 必填，后端二次校验
- `message` 字段过关键词黑名单（色情 / 暴力 / 政治敏感）

---

## 8. 前端架构

**为什么需要这章**：官网用 **Next.js 14 App Router**——这是 5 个端里**唯一**用 Next.js 的，技术栈与 H5 (Vite) **完全不同**。新人必须理解「为什么必须用 Next.js」「App Router 怎么组织」「ISR 怎么配置」。

### 8.1 为什么必须用 Next.js（**不**用 Vite + React）

| 能力     | Vite + React (H5 用)           | **Next.js 14 (官网用)**                |
| -------- | ------------------------------ | -------------------------------------- |
| 渲染     | CSR（首屏空 HTML，靠 JS 渲染） | **SSR / SSG / ISR 混合**               |
| SEO      | ❌ 爬虫看不到内容              | ✅ 爬虫直接拿到完整 HTML               |
| 首屏     | 慢（要先下 JS 再渲染）         | **快**（HTML 直接有内容）              |
| 数据获取 | useEffect + fetch              | **Server Components + Server Actions** |
| 路由     | React Router v6（前端）        | **file-based + RSC**（部分服务端）     |
| 缓存     | 浏览器缓存                     | **CDN edge + ISR + 浏览器 三级**       |
| 部署     | 任意 CDN                       | **Vercel / Cloudflare Pages（最佳）**  |

**结论**：Vite + React 适合**已登录的 SPA**（H5 / 后台），**完全不适合**营销官网。SEO 是硬要求，必须用 Next.js。

### 8.2 项目结构

```
apps/website/
├── src/
│   ├── app/                          # App Router 入口
│   │   ├── [locale]/                 # 多语言路由段
│   │   │   ├── (marketing)/          # 营销页（无登录态）
│   │   │   │   ├── page.tsx          # 首页 /  Hero
│   │   │   │   ├── about/page.tsx
│   │   │   │   ├── pricing/page.tsx
│   │   │   │   ├── features/
│   │   │   │   │   └── [feature]/
│   │   │   │   │       └── page.tsx  # 动态功能详情
│   │   │   │   ├── case-studies/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [slug]/page.tsx
│   │   │   │   ├── contact/page.tsx
│   │   │   │   ├── partners/page.tsx
│   │   │   │   └── investors/page.tsx
│   │   │   ├── (content)/            # 内容站
│   │   │   │   ├── blog/
│   │   │   │   │   ├── page.tsx      # 博客列表
│   │   │   │   │   ├── [slug]/page.tsx
│   │   │   │   │   └── tag/[tag]/page.tsx
│   │   │   │   └── docs/             # 文档站
│   │   │   │       ├── layout.tsx
│   │   │   │       ├── [[...slug]]/page.tsx
│   │   │   │       └── api-reference/
│   │   │   ├── (legal)/              # 法律页（不索引 follow）
│   │   │   │   ├── legal/terms/page.tsx
│   │   │   │   ├── legal/privacy/page.tsx
│   │   │   │   └── legal/cookies/page.tsx
│   │   │   ├── layout.tsx            # 根布局
│   │   │   ├── not-found.tsx
│   │   │   └── error.tsx
│   │   ├── api/                      # Route Handlers（备用）
│   │   │   ├── revalidate/route.ts   # On-Demand Revalidation
│   │   │   └── og/route.tsx          # 动态 OG 图生成
│   │   ├── sitemap.ts                # 动态 sitemap.xml
│   │   ├── robots.ts                 # 动态 robots.txt
│   │   ├── opengraph-image.tsx       # 默认 OG 图
│   │   ├── icon.tsx                  # favicon
│   │   ├── manifest.ts               # PWA manifest
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                       # shadcn/ui 基础组件
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ...（按需 shadcn add）
│   │   ├── marketing/                # 营销页组件
│   │   │   ├── Hero.tsx
│   │   │   ├── ValueProps.tsx
│   │   │   ├── FeatureGrid.tsx
│   │   │   ├── Testimonials.tsx
│   │   │   ├── CTASection.tsx
│   │   │   ├── PricingTable.tsx
│   │   │   ├── FaqAccordion.tsx
│   │   │   ├── LogoCloud.tsx
│   │   │   └── StatsCounter.tsx
│   │   ├── forms/                    # 表单
│   │   │   ├── LeadCaptureForm.tsx
│   │   │   ├── NewsletterForm.tsx
│   │   │   ├── PartnerApplyForm.tsx
│   │   │   ├── DemoRequestForm.tsx
│   │   │   └── ContactForm.tsx
│   │   ├── layout/                   # 布局
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── LocaleSwitcher.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── CookieBanner.tsx
│   │   ├── seo/                      # SEO 组件
│   │   │   ├── JsonLd.tsx            # JSON-LD 注入
│   │   │   ├── CanonicalLink.tsx
│   │   │   └── HreflangTags.tsx
│   │   ├── analytics/                # 分析
│   │   │   ├── GoogleAnalytics.tsx
│   │   │   ├── BaiduAnalytics.tsx
│   │   │   ├── UmamiAnalytics.tsx
│   │   │   ├── HotjarScript.tsx
│   │   │   └── MicrosoftClarity.tsx
│   │   └── ab/                       # A/B 测试
│   │       ├── ABProvider.tsx
│   │       ├── useExperiment.ts
│   │       └── ExperimentBoundary.tsx
│   ├── lib/
│   │   ├── i18n.ts                   # 多语言配置
│   │   ├── seo.ts                    # SEO 工具函数
│   │   ├── analytics.ts              # 分析 SDK 封装
│   │   ├── experiments.ts            # A/B 实验工具
│   │   ├── api.ts                    # fetch 封装
│   │   ├── env.ts                    # 环境变量校验
│   │   ├── utils.ts                  # 通用工具
│   │   └── tracker.ts                # 自研事件埋点
│   ├── content/                      # MDX 内容
│   │   ├── blog/
│   │   │   ├── 2026-06-samoa-tax-guide.zh-CN.mdx
│   │   │   ├── 2026-06-samoa-tax-guide.en-US.mdx
│   │   │   ├── 2026-06-samoa-tax-guide.ja-JP.mdx
│   │   │   └── 2026-06-samoa-tax-guide.ko-KR.mdx
│   │   ├── docs/
│   │   │   ├── getting-started/
│   │   │   ├── api-reference/
│   │   │   └── integrations/
│   │   └── case-studies/
│   ├── styles/
│   │   ├── globals.css               # Tailwind + CSS Variables
│   │   └── mdx.css                   # MDX 样式
│   ├── types/
│   │   ├── seo.ts
│   │   ├── ab-test.ts
│   │   └── lead.ts
│   └── middleware.ts                 # i18n + 安全 headers
├── public/
│   ├── images/
│   ├── fonts/
│   ├── og/                           # Open Graph 静态图
│   └── icons/
├── contentlayer.config.ts            # Contentlayer 配置（v2 候选）
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local
```

### 8.3 渲染策略（按页面分级）

| 页面                                       | 渲染策略                     | 缓存 TTL             | revalidate                   |
| ------------------------------------------ | ---------------------------- | -------------------- | ---------------------------- |
| `/` 首页                                   | **SSG + ISR**                | 1h                   | `revalidate: 3600`           |
| `/about`                                   | SSG                          | 永久                 | —                            |
| `/pricing`                                 | SSG + ISR                    | 6h                   | `revalidate: 21600`          |
| `/features/:feature`                       | SSG + ISR                    | 24h                  | `revalidatePath` on update   |
| `/blog` 列表                               | SSG + ISR                    | 10min                | `revalidate: 600`            |
| `/blog/:slug`                              | SSG + ISR                    | 永久（内容更新触发） | `revalidatePath` on publish  |
| `/case-studies/:slug`                      | SSG + ISR                    | 永久                 | `revalidatePath` on update   |
| `/docs/*`                                  | **SSG 100%**（文档是静态的） | 永久                 | `revalidatePath` on git push |
| `/contact` / `/partners` / `/demo-request` | **SSR**（表单提交态）        | 0                    | —                            |
| `/legal/*`                                 | SSG                          | 永久                 | —                            |
| `/sitemap.xml`                             | 动态生成                     | 1h                   | —                            |
| `/robots.txt`                              | 动态生成                     | 24h                  | —                            |

**On-Demand Revalidation**（运营改 CMS 后立即刷新）：

```typescript
// apps/website/src/app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret');
  if (secret !== process.env.REVALIDATE_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { path, tag } = await req.json();
  if (path) revalidatePath(path);
  if (tag) revalidateTag(tag);
  return Response.json({ revalidated: true, now: Date.now() });
}
```

### 8.4 MDX 博客（contentlayer / next-mdx-remote）

```typescript
// apps/website/src/lib/mdx.ts
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');

export interface BlogPost {
  slug: string;
  locale: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  tags: string[];
  coverImage?: string;
  content: string; // MDX 编译后
  readingTimeMin: number;
}

export async function getBlogPosts(locale: string): Promise<BlogPost[]> {
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(`.${locale}.mdx`));

  return files
    .map((file) => {
      const slug = file.replace(`.${locale}.mdx`, '');
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
      const { data, content } = matter(raw);
      return {
        slug,
        locale,
        title: data.title,
        description: data.description,
        publishedAt: data.publishedAt,
        updatedAt: data.updatedAt,
        author: data.author,
        tags: data.tags ?? [],
        coverImage: data.coverImage,
        content,
        readingTimeMin: Math.ceil(content.split(/\s+/).length / 200),
      };
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
```

```mdx
---
title: 萨摩亚公司注册全流程 2026 完整指南
description: 从公司类型选择到银行开户，详解萨摩亚合规出海的关键步骤
publishedAt: 2026-06-01
updatedAt: 2026-06-05
author: 张三
tags: [萨摩亚, 公司注册, 合规]
coverImage: /images/blog/samoa-company-2026.jpg
---

# 萨摩亚公司注册全流程

<Callout type="info">本文基于 2026 年 6 月最新政策，所有信息均经过萨摩亚注册处官方核对。</Callout>

## 一、为什么选择萨摩亚

...

## 二、注册流程

<Steps>
  <Step title="公司查名">...</Step>
  <Step title="准备 KYC">...</Step>
  <Step title="提交申请">...</Step>
  <Step title="领取证书">...</Step>
</Steps>

## 三、常见问题

<Faq
  items={[
    { q: '需要本人去萨摩亚吗？', a: '不需要，远程即可。' },
    { q: '注册需要多久？', a: '10-15 个工作日。' },
  ]}
/>
```

### 8.5 多语言 i18n 路由

```typescript
// apps/website/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const LOCALES = ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'] as const;
const DEFAULT_LOCALE = 'en-US';

function getLocale(req: NextRequest): string {
  const headers = { 'accept-language': req.headers.get('accept-language') ?? '' };
  const languages = new Negotiator({ headers }).languages();
  return match(languages, LOCALES, DEFAULT_LOCALE);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 跳过 API、_next、静态资源
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.') // 文件
  ) {
    return NextResponse.next();
  }

  // 检查路径是否已包含 locale
  const pathnameHasLocale = LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return NextResponse.next();

  // 探测并重定向
  const locale = getLocale(req);
  const newUrl = req.nextUrl.clone();
  newUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(newUrl);
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|robots.txt|sitemap.xml).*)'],
};
```

---

## 9. UI 组件库

**为什么需要这章**：官网视觉调性决定品牌质感——5 个端里官网是**唯一**对设计要求最严的（直接影响 SEO 跳出率 + 转化率）。本节给出统一技术栈。

### 9.1 技术栈

| 层       | 选型                                        | 原因                                                   |
| -------- | ------------------------------------------- | ------------------------------------------------------ |
| 基础 UI  | **shadcn/ui**（基于 Radix UI）              | 可复制可定制，无运行时依赖，**不**锁死主题             |
| 样式     | **Tailwind CSS 3.4**                        | 原子化 + 树摇，与 Next.js 完美集成                     |
| 动效     | **Framer Motion 11**                        | 轻量、声明式、支持 RSC                                 |
| 图标     | **lucide-react**                            | 与 shadcn 同源，tree-shakable                          |
| 字体     | **next/font**（Inter + Noto Sans SC/JP/KR） | 自动子集化 + preload + 零 CLS                          |
| 图表     | **Recharts**                                | 纯 React，与 RSC 兼容（不**用** ECharts——H5 后台在用） |
| 主题     | **next-themes**                             | 暗色模式 SSR 友好                                      |
| 代码高亮 | **Shiki**（构建时）                         | 服务端高亮，**不**用 Prism（运行时）                   |
| 表单     | **React Hook Form + Zod**                   | 类型安全 + 性能好                                      |
| 国际化   | **next-intl**                               | App Router 官方推荐                                    |

### 9.2 Hero 组件（核心营销组件）

```typescript
// apps/website/src/components/marketing/Hero.tsx
import { useTranslations } from 'next-intl';
import { LeadCaptureForm } from '@/components/forms/LeadCaptureForm';
import { motion } from 'framer-motion';
import { Sparkles, ShieldCheck, Zap } from 'lucide-react';

export function Hero() {
  const t = useTranslations('marketing.hero');

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            {t('title')}
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
            {t('subtitle')}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <LeadCaptureForm source="landing_hero" />
            <a href="#features" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('learnMore')} →
            </a>
          </div>

          <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              {t('trust.samoaRegistered')}
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              {t('trust.aiPowered')}
            </li>
            <li className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              {t('trust.fastOnboarding')}
            </li>
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
```

### 9.3 状态徽章（StatusBadge）

按 [00-foundation §8.3.1](../../admin-prd/00-foundation.md) 扩展状态色彩表映射：

```typescript
// apps/website/src/components/shared/StatusBadge.tsx
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  // 通用（来自 00-foundation §8.3.1）
  PENDING:        { bg: 'bg-[#F6A623]', text: 'text-white',        label: '待处理' },
  PROCESSING:     { bg: 'bg-[#3B82F6]', text: 'text-white',        label: '处理中' },
  REVIEWING:      { bg: 'bg-[#8B5CF6]', text: 'text-white',        label: '审核中' },
  APPROVED:       { bg: 'bg-[#10B981]', text: 'text-white',        label: '已通过' },
  REJECTED:       { bg: 'bg-[#EF4444]', text: 'text-white',        label: '已驳回' },
  DISABLED:       { bg: 'bg-[#6B7280]', text: 'text-white',        label: '已停用' },
  // 官网 Lead 状态
  NEW:            { bg: 'bg-[#F6A623]', text: 'text-white',        label: '待跟进' },
  CONTACTED:      { bg: 'bg-[#3B82F6]', text: 'text-white',        label: '已联系' },
  QUALIFIED:      { bg: 'bg-[#8B5CF6]', text: 'text-white',        label: '已确认意向' },
  NEGOTIATING:    { bg: 'bg-[#F59E0B]', text: 'text-white',        label: '商务谈判中' },
  CLOSED_WON:     { bg: 'bg-[#10B981]', text: 'text-white',        label: '成交' },
  CLOSED_LOST:    { bg: 'bg-[#EF4444]', text: 'text-white',        label: '失单' },
  SPAM:           { bg: 'bg-[#9CA3AF]', text: 'text-white',        label: '垃圾' },
  // A/B 实验状态
  DRAFT:          { bg: 'bg-[#9CA3AF]', text: 'text-white',        label: '草稿' },
  RUNNING:        { bg: 'bg-[#10B981]', text: 'text-white',        label: '运行中' },
  PAUSED:         { bg: 'bg-[#F59E0B]', text: 'text-white',        label: '已暂停' },
  COMPLETED:      { bg: 'bg-[#3B82F6]', text: 'text-white',        label: '已完成' },
  ARCHIVED:       { bg: 'bg-[#6B7280]', text: 'text-white',        label: '已归档' },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
      config.bg, config.text, className,
    )}>
      {config.label}
    </span>
  );
}
```

---

## 10. SEO 配置

**为什么需要这章**：SEO 是官网**唯一**核心 KPI 来源（自然流量占 60%+）。从 metadata 到 JSON-LD 到 sitemap 到 robots，**每一项**都直接影响 Google 排名。本节给出 5 个层级的 SEO 配置规范。

### 10.1 Metadata 层级（Next.js 14 `generateMetadata`）

```typescript
// apps/website/src/app/[locale]/page.tsx
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/config';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'marketing.home' });

  return {
    title: t('title'), // 海购星 - 萨摩亚合规出海一站式平台
    description: t('description'),
    keywords: ['萨摩亚', '公司注册', '出海', '合规', 'DID', 'KYC'],
    authors: [{ name: '海购星 Samoa DAO' }],
    creator: '海购星 Samoa DAO',
    publisher: '海购星 Samoa DAO',

    // Open Graph
    openGraph: {
      type: 'website',
      locale: locale.replace('-', '_'),
      url: `https://smy.app/${locale}`,
      siteName: '海购星 Samoa DAO',
      title: t('title'),
      description: t('description'),
      images: [
        {
          url: '/og/home.png',
          width: 1200,
          height: 630,
          alt: t('title'),
        },
      ],
    },

    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/og/home.png'],
      creator: '@smyapp',
    },

    // Robots
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },

    // Canonical + hreflang
    alternates: {
      canonical: `https://smy.app/${locale}`,
      languages: {
        'zh-CN': 'https://smy.app/zh-CN',
        'en-US': 'https://smy.app/en-US',
        'ja-JP': 'https://smy.app/ja-JP',
        'ko-KR': 'https://smy.app/ko-KR',
        'x-default': 'https://smy.app/en-US',
      },
    },
  };
}
```

### 10.2 结构化数据 JSON-LD

```typescript
// apps/website/src/components/seo/JsonLd.tsx
export function OrganizationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: '海购星 Samoa DAO',
          alternateName: 'Samoa DAO',
          url: 'https://smy.app',
          logo: 'https://smy.app/icons/logo-512.png',
          description: '萨摩亚合规出海一站式平台',
          foundingDate: '2025-01-15',
          founders: [
            { '@type': 'Person', name: '创始人姓名' },
          ],
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'WS',
            addressLocality: 'Apia',
          },
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: 'support@smy.app',
            availableLanguage: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'],
          },
          sameAs: [
            'https://twitter.com/smyapp',
            'https://www.linkedin.com/company/smyapp',
            'https://github.com/smyapp',
          ],
        }),
      }}
    />
  );
}

export function ArticleJsonLd({ post }: { post: BlogPost }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.description,
          image: post.coverImage,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt ?? post.publishedAt,
          author: { '@type': 'Person', name: post.author },
          publisher: {
            '@type': 'Organization',
            name: '海购星 Samoa DAO',
            logo: { '@type': 'ImageObject', url: 'https://smy.app/icons/logo-512.png' },
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://smy.app/${post.locale}/blog/${post.slug}`,
          },
        }),
      }}
    />
  );
}

export function FAQJsonLd({ items }: { items: { q: string; a: string }[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map(item => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        }),
      }}
    />
  );
}

export function ProductJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: '海购星',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          offers: {
            '@type': 'Offer',
            price: '99',
            priceCurrency: 'USD',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            reviewCount: '127',
          },
        }),
      }}
    />
  );
}
```

### 10.3 动态 sitemap.xml

```typescript
// apps/website/src/app/sitemap.ts
import { MetadataRoute } from 'next';
import { getBlogPosts } from '@/lib/mdx';
import { locales } from '@/i18n/config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://smy.app';
  const now = new Date();

  // 静态页面
  const staticPages = ['', '/about', '/pricing', '/contact', '/partners'].flatMap((path) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1.0 : 0.8,
    }))
  );

  // 博客
  const blogPages = (
    await Promise.all(
      locales.map(async (locale) => {
        const posts = await getBlogPosts(locale);
        return posts.map((post) => ({
          url: `${baseUrl}/${locale}/blog/${post.slug}`,
          lastModified: new Date(post.updatedAt ?? post.publishedAt),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        }));
      })
    )
  ).flat();

  // 案例
  const caseStudies = await getCaseStudies();
  const casePages = caseStudies.flatMap((cs) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}/case-studies/${cs.slug}`,
      lastModified: new Date(cs.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  );

  return [...staticPages, ...blogPages, ...casePages];
}
```

### 10.4 动态 robots.txt

```typescript
// apps/website/src/app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/', '/legal/draft/'],
      },
      // 屏蔽 AI 爬虫（保护原创内容）
      {
        userAgent: ['GPTBot', 'CCBot', 'anthropic-ai', 'ClaudeBot', 'PerplexityBot'],
        disallow: '/',
      },
      // 屏蔽 SEO 工具爬虫
      {
        userAgent: ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot'],
        disallow: '/',
      },
    ],
    sitemap: 'https://smy.app/sitemap.xml',
    host: 'https://smy.app',
  };
}
```

### 10.5 SEO 验收清单

| #   | 验收项                    | 工具                     | 期望                    |
| --- | ------------------------- | ------------------------ | ----------------------- |
| 1   | `<title>` 长度            | Lighthouse SEO           | 50-60 字符              |
| 2   | `<meta description>` 长度 | Lighthouse SEO           | 150-160 字符            |
| 3   | H1 唯一                   | Lighthouse SEO           | 每页 1 个 H1            |
| 4   | 图片 alt                  | Lighthouse SEO           | 100% 覆盖               |
| 5   | Canonical                 | `curl -I`                | 与 URL 一致或规范化     |
| 6   | Hreflang                  | Google Search Console    | 4 语言 + x-default 完整 |
| 7   | JSON-LD 验证              | Google Rich Results Test | 无错误                  |
| 8   | Sitemap 可访问            | `curl sitemap.xml`       | 200 + 合法 XML          |
| 9   | Robots.txt                | `curl robots.txt`        | 200 + 包含 sitemap      |
| 10  | Lighthouse SEO 分数       | Lighthouse               | ≥ 95                    |

---

## 11. 性能优化

**为什么需要这章**：Core Web Vitals 直接影响 SEO 排名（Google 官方 2020 确认）。Lighthouse 分数是品牌门面。本节给出 12 个关键优化点。

### 11.1 关键优化清单

| 优化项             | 实现                             | 目标                             |
| ------------------ | -------------------------------- | -------------------------------- |
| **图片优化**       | `<Image>` 组件                   | 自动 WebP/AVIF + 懒加载 + 响应式 |
| **字体优化**       | `next/font/google`               | 子集化 + preload + 零 CLS        |
| **JS bundle 拆分** | App Router + dynamic import      | 首屏 < 120KB gzipped             |
| **CSS 关键路径**   | Tailwind JIT                     | 首屏 CSS < 20KB                  |
| **预加载**         | `<link rel="preload">`           | LCP 资源优先                     |
| **预连接**         | `<link rel="preconnect">`        | 第三方域提前握手                 |
| **CDN 缓存**       | Vercel Edge / Cloudflare         | HTML 30min，静态资源 1y          |
| **流式渲染**       | React Server Components          | TTFB < 600ms                     |
| **图片懒加载**     | `loading="lazy"`                 | 折叠以下图片延后                 |
| **代码分割**       | 路由级 + 组件级                  | 不在首屏的组件 lazy              |
| **压缩**           | Brotli（Vercel/Cloudflare 默认） | 文本资源 70%+ 压缩               |
| **HTTP/3 + 0-RTT** | Vercel / Cloudflare 默认         | 复用连接                         |

### 11.2 图片优化示例

```typescript
import Image from 'next/image';

<Image
  src="/images/hero/hero-samoa.webp"
  alt="萨摩亚公司注册流程"
  width={1200}
  height={630}
  priority            // LCP 图片必加
  quality={85}         // 平衡质量与大小
  placeholder="blur"   // 模糊占位（需 blurDataURL）
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
  className="rounded-2xl shadow-xl"
/>
```

### 11.3 字体优化示例

```typescript
// apps/website/src/app/layout.tsx
import { Inter, Noto_Sans_SC, Noto_Sans_JP, Noto_Sans_KR } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

const notoSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-noto-sc',
  preload: true,
});

const notoJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-noto-jp',
});

const notoKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-noto-kr',
});

export default function RootLayout({ children, params: { locale } }: any) {
  // 按 locale 动态加载字体，避免不必要下载
  return (
    <html
      lang={locale}
      className={`${inter.variable} ${notoSC.variable} ${notoJP.variable} ${notoKR.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
```

### 11.4 预加载关键资源

```typescript
// apps/website/src/app/[locale]/page.tsx
import { Inter } from 'next/font/google';

export default function Home() {
  return (
    <>
      {/* 预加载 LCP 字体 */}
      <link
        rel="preload"
        href="/_next/static/media/inter-latin-400-normal.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      {/* 预连接到 GA / Sentry */}
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      <link rel="preconnect" href="https://www.google-analytics.com" />
      <link rel="dns-prefetch" href="https://cdn.smy.app" />
      <main>...</main>
    </>
  );
}
```

---

## 12. 分析集成

**为什么需要这章**：官网 4 套分析工具（GA4 / 百度统计 / 友盟 / Mixpanel）覆盖**国内 + 海外**全部访客——**不**像 H5 那样只埋神策。每个工具的职责、数据流、采样率、隐私边界**必须**清晰。

### 12.1 工具矩阵

| 工具                         | 覆盖                      | 主要职责                              | 采样率                   | 隐私                 |
| ---------------------------- | ------------------------- | ------------------------------------- | ------------------------ | -------------------- |
| **Google Analytics 4 (GA4)** | 海外（Google 流量）       | 流量分析、转化漏斗、受众              | 100%                     | Cookieless mode 可选 |
| **百度统计**                 | 国内（百度 / 360 / 搜狗） | 国内 SEO 排名、搜索词                 | 100%                     | 合规版（无 PII）     |
| **友盟（cnzz）**             | 国内补充                  | 实时访客、点击热图                    | 100%                     | —                    |
| **Mixpanel**                 | 全球产品分析              | 用户行为 cohort、funnel               | 100% → 10%（高流量降级） | Cookieless 模式      |
| **Hotjar**                   | 海外                      | 点击热图、滚动深度、feedback          | 10% 采样                 | EU 屏蔽              |
| **Microsoft Clarity**        | 全球                      | Session Replay（**免费**替代 Hotjar） | 100%                     | 自动屏蔽敏感输入     |

### 12.2 GA4 集成

```typescript
// apps/website/src/components/analytics/GoogleAnalytics.tsx
import Script from 'next/script';
import { GA_TRACKING_ID } from '@/lib/env';

export function GoogleAnalytics() {
  if (process.env.NODE_ENV !== 'production') return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_TRACKING_ID}', {
            page_path: window.location.pathname,
            anonymize_ip: true,           // GDPR 合规
            send_page_view: true,
            cookie_flags: 'SameSite=None;Secure',
          });
        `}
      </Script>
    </>
  );
}
```

### 12.3 自研事件埋点（统一接口）

```typescript
// apps/website/src/lib/tracker.ts
import { GA_TRACKING_ID, MIXPANEL_TOKEN } from '@/lib/env';

type EventParams = Record<string, string | number | boolean | undefined>;

class Tracker {
  private sessionId: string;
  private visitorId: string;

  constructor() {
    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.getOrCreateSessionId();
  }

  trackEvent(eventName: string, params: EventParams = {}) {
    // 1. GA4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, {
        ...params,
        session_id: this.sessionId,
        visitor_id: this.visitorId,
      });
    }
    // 2. Mixpanel
    if (typeof window !== 'undefined' && (window as any).mixpanel) {
      (window as any).mixpanel.track(eventName, {
        ...params,
        session_id: this.sessionId,
      });
    }
    // 3. 自建埋点（用于精细分析）
    this.sendToServer('event', { eventName, params });
  }

  trackPageView(path: string) {
    this.trackEvent('page_view', { path });
  }

  trackLead(source: string, plan?: string) {
    this.trackEvent('lead_submit', { source, plan });
  }

  trackExperimentExposure(experimentKey: string, variant: string) {
    this.trackEvent('experiment_exposure', { experimentKey, variant });
  }

  private getOrCreateVisitorId(): string {
    if (typeof document === 'undefined') return 'ssr';
    const key = 'smy_vid';
    let id = document.cookie.match(new RegExp(`${key}=([^;]+)`))?.[1];
    if (!id) {
      id = crypto.randomUUID();
      document.cookie = `${key}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
    return id;
  }

  private getOrCreateSessionId(): string {
    if (typeof sessionStorage === 'undefined') return 'ssr';
    let id = sessionStorage.getItem('smy_sid');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('smy_sid', id);
    }
    return id;
  }

  private async sendToServer(type: 'event' | 'pageview', data: any) {
    // 使用 sendBeacon 异步发送，失败不重试
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return;
    const payload = JSON.stringify({
      type,
      ...data,
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      path: location.pathname,
      referrer: document.referrer,
      locale: document.documentElement.lang,
      ts: Date.now(),
    });
    navigator.sendBeacon('/api/public/website/track/' + type, payload);
  }
}

export const tracker = new Tracker();
```

### 12.4 转化漏斗定义（GA4 + Mixpanel 同步）

```
步骤 1: page_view（访问任意页）
   ↓
步骤 2: cta_click（点击 CTA 按钮）
   ↓
步骤 3: form_open（打开表单）
   ↓
步骤 4: form_field_complete（填完表单字段）
   ↓
步骤 5: form_submit（提交）
   ↓
步骤 6: lead_submit_success（提交成功，leadId 拿到）
```

每一步骤对应 1 个事件，**所有**工具（GA4 / Mixpanel / 友盟）按相同事件名上报，便于跨工具对比。

---

## 13. A/B 测试

**为什么需要这章**：落地页 1% 转化率提升 = 每年千万级营收。A/B 测试是增长团队的核心武器。本节给自研 + PostHog 双方案对比，**按规模选择**。

### 13.1 方案对比

| 维度         | 自研 A/B 框架             | **PostHog（推荐）**          | GrowthBook |
| ------------ | ------------------------- | ---------------------------- | ---------- |
| 实施成本     | 高（自研分流 + 统计）     | **低**（SDK 开箱即用）       | 中         |
| 统计显著性   | 需自研（Z 检验 / 贝叶斯） | **内置**（PostHog 实验引擎） | 内置       |
| Feature Flag | 需自研                    | **内置**                     | 内置       |
| 数据存储     | 自建 DB                   | **PostHog Cloud / 自托管**   | 多种       |
| 多变体支持   | ✅                        | ✅                           | ✅         |
| MDE 检测     | 需自研                    | ✅ 自动                      | ✅         |
| 价格         | 自建成本                  | **< 100 万 MAU 免费**        | 开源免费   |

**推荐**：**PostHog**（功能最全，free tier 够用）。

### 13.2 PostHog 集成

```typescript
// apps/website/src/components/ab/ABProvider.tsx
'use client';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { POSTHOG_KEY, POSTHOG_HOST } from '@/lib/env';

export function ABProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: 'identified_only',  // GDPR 友好
        capture_pageview: false,             // 手动控制
        capture_pageleave: true,
        session_recording: {
          maskAllInputs: true,                // 屏蔽输入框
          recordCrossOriginIframes: false,
        },
      });
    }
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
```

```typescript
// apps/website/src/components/ab/useExperiment.ts
'use client';
import { useFeatureFlagVariantKey } from 'posthog-js/react';

export function useExperiment(key: string, variants: string[] = ['control', 'variant']): string {
  const variant = useFeatureFlagVariantKey(key);
  if (!variant) return variants[0];
  return variant;
}
```

```typescript
// 使用示例
'use client';
import { useExperiment } from '@/components/ab/useExperiment';

export function Hero() {
  const variant = useExperiment('homepage_hero_v2');

  if (variant === 'variant') {
    return <HeroV2 />;  // 新文案 + 新 CTA
  }
  return <HeroControl />;  // 原始
}
```

### 13.3 实验规范

| 规范           | 说明                                                             |
| -------------- | ---------------------------------------------------------------- |
| **分流方式**   | 哈希 `visitorId` → modulo 100 → 落到变体                         |
| **流量分配**   | 起步 10% → 30% → 100% 灰度                                       |
| **最小样本量** | 公式 `n = 16 * p * (1-p) / δ²`（p=基线转化率，δ=最小可检测效应） |
| **运行周期**   | ≥ 7 天（覆盖工作日 + 周末）                                      |
| **显著性阈值** | p < 0.05（双尾）                                                 |
| **停止条件**   | 达到样本量 **+** 显著性 **+** ≥ 7 天                             |
| **互斥实验**   | 同页面**最多** 1 个实验（避免互相干扰）                          |
| **回滚预案**   | 暂停实验 = 100% 流量回 control                                   |

### 13.4 关键实验清单（v1 启动）

| #   | 实验名                     | 页面       | 变体                                                            |
| --- | -------------------------- | ---------- | --------------------------------------------------------------- |
| 1   | `homepage_hero_v1`         | `/`        | A: 通用 CTA「立即注册」 / B: 钩子 CTA「免费咨询萨摩亚公司注册」 |
| 2   | `pricing_anchor_v1`        | `/pricing` | A: 月付优先 / B: 年付优先（省 20%）                             |
| 3   | `blog_cta_inline_v1`       | `/blog/*`  | A: 文中无 CTA / B: 文末 CTA 卡片                                |
| 4   | `lead_form_fields_v1`      | 表单       | A: 4 字段 / B: 2 字段（极简）                                   |
| 5   | `social_proof_position_v1` | `/`        | A: 顶部证言 / B: 底部证言                                       |

---

## 14. 表单管理

**为什么需要这章**：官网 5 类表单（Lead / Newsletter / Partner / Demo / Contact）是**唯一**与后端有交互的入口——99% 流量是匿名的，表单是建立**Lead 实体**的关键。表单的可用性、合规性、转化率直接决定业务成败。

### 14.1 技术栈

| 库                       | 用途                          |
| ------------------------ | ----------------------------- |
| **React Hook Form**      | 状态管理 + 性能（不重渲染）   |
| **Zod**                  | 类型安全校验 + 错误信息多语言 |
| **@hookform/resolvers**  | Zod ↔ RHF 桥接                |
| **next-use-translation** | 错误信息 i18n                 |
| **react-turnstile**      | Cloudflare Turnstile 验证     |
| **sonner**               | Toast 提示                    |

### 14.2 Lead 提交表单（核心）

```typescript
// apps/website/src/components/forms/LeadCaptureForm.tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Turnstile } from 'react-turnstile';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { tracker } from '@/lib/tracker';
import { toast } from 'sonner';

const LeadFormSchema = z.object({
  name: z.string().min(2, '姓名至少 2 字').max(64),
  email: z.string().email('邮箱格式不正确'),
  company: z.string().max(128).optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-1000', '1000+']).optional(),
  country: z.string().length(2).optional(),
  interestArea: z.array(z.enum(['company', 'tax', 'legal', 'banking', 'ai'])).optional(),
  message: z.string().max(2000).optional(),
  turnstileToken: z.string().min(10, '请完成人机验证'),
});

type LeadFormValues = z.infer<typeof LeadFormSchema>;

export function LeadCaptureForm({ source }: { source: string }) {
  const t = useTranslations('forms.lead');
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<LeadFormValues>({
    resolver: zodResolver(LeadFormSchema),
    defaultValues: { name: '', email: '', turnstileToken: '' },
  });

  const onSubmit = async (data: LeadFormValues) => {
    try {
      const response = await fetch('/api/public/website/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          turnstileToken,
          source,
          referrerPath: window.location.pathname,
          utmParams: getUtmParams(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '提交失败');
      }

      const { leadId } = await response.json();
      tracker.trackLead(source, leadId);
      toast.success(t('success'));
      reset();
      // 跳感谢页
      window.location.href = `/${document.documentElement.lang}/thank-you?leadId=${leadId}`;
    } catch (err: any) {
      toast.error(err.message || t('error'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          {t('name')} <span className="text-red-500">*</span>
        </label>
        <Input id="name" {...register('name')} error={errors.name?.message} />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          {t('email')} <span className="text-red-500">*</span>
        </label>
        <Input id="email" type="email" {...register('email')} error={errors.email?.message} />
      </div>

      <div>
        <label htmlFor="company" className="block text-sm font-medium">
          {t('company')}
        </label>
        <Input id="company" {...register('company')} />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium">
          {t('message')}
        </label>
        <Textarea id="message" rows={4} {...register('message')} />
      </div>

      <Turnstile
        sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        onVerify={setTurnstileToken}
      />

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
```

### 14.3 表单通用规则

| 规则                | 说明                                |
| ------------------- | ----------------------------------- |
| 必填项标 `*`        | 视觉强提示                          |
| 错误就近显示        | 输入框下方红字                      |
| 提交前 `dirty` 检查 | 提示是否离开                        |
| Turnstile 必填      | 防机器人                            |
| 提交后 toast        | 成功 / 失败都提示                   |
| 成功后跳感谢页      | **不**留在原页（避免重复提交）      |
| 失败后保留输入      | 用户改完可重提                      |
| 失败有重试入口      | 错误信息含客服联系方式              |
| 多语言错误          | 错误信息走 i18n（**不**硬编码中文） |
| 防止重复提交        | 提交中按钮 disabled + loading       |

---

## 15. 多语言

**为什么需要这章**：4 语言是官网**面向全球**的基本盘。i18n **必须**在 SEO 层面正确（hreflang）、在 URL 层面规范（`/zh-CN/...`）、在内容层面完整（每篇博客 4 个版本）。本节给统一规范。

### 15.1 语言支持

| code    | 语言     | 默认 URL                | 字典文件          |
| ------- | -------- | ----------------------- | ----------------- |
| `zh-CN` | 简体中文 | `https://smy.app/zh-CN` | `i18n/zh-CN.json` |
| `en-US` | 英文     | `https://smy.app/en-US` | `i18n/en-US.json` |
| `ja-JP` | 日文     | `https://smy.app/ja-JP` | `i18n/ja-JP.json` |
| `ko-KR` | 韩文     | `https://smy.app/ko-KR` | `i18n/ko-KR.json` |

> **关键决策**：i18n namespace 严格按 [00-foundation §5.5.1](../../admin-prd/00-foundation.md) 速查表。**官网** 不在原速查表内，本项目新增 namespace：**`marketing`**（营销文案）、`forms`（表单）、`seo`（SEO 模板）——保持与 §5.5.1 同结构（全小写、无连字符、复数加 s）。

### 15.2 字典结构

```json
// apps/website/i18n/zh-CN.json
{
  "marketing": {
    "hero": {
      "title": "萨摩亚合规出海一站式平台",
      "subtitle": "公司注册 · 税务规划 · 法务咨询 · 银行开户",
      "trust": {
        "samoaRegistered": "萨摩亚官方注册",
        "aiPowered": "AI 智能合规",
        "fastOnboarding": "7 天极速上线"
      },
      "learnMore": "了解更多"
    },
    "features": {
      "company": { "title": "公司注册", "description": "..." },
      "tax": { "title": "税务规划", "description": "..." },
      "legal": { "title": "法务咨询", "description": "..." },
      "banking": { "title": "银行开户", "description": "..." }
    },
    "testimonials": { "...": "..." },
    "cta": {
      "title": "开启你的萨摩亚之旅",
      "description": "1 个工作日内，专属顾问与你联系",
      "button": "免费咨询"
    }
  },
  "forms": {
    "lead": {
      "name": "姓名",
      "email": "邮箱",
      "company": "公司名",
      "companySize": "公司规模",
      "message": "需求描述",
      "submit": "提交咨询",
      "submitting": "提交中...",
      "success": "已收到您的咨询，专属顾问将在 1 个工作日内联系您",
      "error": "提交失败，请稍后重试"
    },
    "newsletter": { "...": "..." }
  },
  "seo": {
    "home": {
      "title": "海购星 - 萨摩亚合规出海一站式平台",
      "description": "海购星提供萨摩亚公司注册、税务规划、法务咨询、银行开户等一站式出海合规服务。"
    }
  },
  "common": {
    "create": "创建",
    "submit": "提交",
    "cancel": "取消",
    "loading": "加载中..."
  }
}
```

### 15.3 多语言切换器

```typescript
// apps/website/src/components/layout/LocaleSwitcher.tsx
'use client';
import { usePathname, useRouter } from 'next/navigation';
import { locales, type Locale } from '@/i18n/config';
import { useLocale, useTranslations } from 'next-intl';

export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as Locale;
  const t = useTranslations('common');

  const switchLocale = (newLocale: Locale) => {
    // 替换 URL 中的 locale 段
    const segments = pathname.split('/');
    segments[1] = newLocale;
    const newPath = segments.join('/');
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    router.push(newPath);
  };

  return (
    <select
      value={currentLocale}
      onChange={(e) => switchLocale(e.target.value as Locale)}
      className="rounded-md border px-2 py-1 text-sm"
      aria-label={t('selectLanguage')}
    >
      {locales.map(locale => (
        <option key={locale} value={locale}>
          {LOCALE_LABELS[locale]}
        </option>
      ))}
    </select>
  );
}
```

### 15.4 翻译工作流

| 步骤                          | 工具                              | 责任方   |
| ----------------------------- | --------------------------------- | -------- |
| 1. 工程师写 key（en-US 为主） | `i18n/en-US.json`                 | 前端     |
| 2. 翻译其他语言               | **Lokalise** / Crowdin / 内部工具 | 翻译团队 |
| 3. 翻译提交 PR                | Git                               | 翻译     |
| 4. CI 检查 key 完整性         | `i18next-parser` 校验             | CI       |
| 5. 未翻译项标记               | missing key 检测                  | CI       |
| 6. 部署                       | Vercel 自动                       | —        |

---

## 16. 验收用例

**为什么需要这章**：本节是**整个 PRD 的测试基线**——QA 团队按这 15 条验收。覆盖 SEO、性能、表单、A/B、i18n、CDN 缓存 6 大场景。

### 16.1 SEO 验收（5 条）

| #   | 用例                                  | 期望                                |
| --- | ------------------------------------- | ----------------------------------- |
| 1   | 首页 `<title>` 抓取                   | 长度 50-60 字符，含核心关键词       |
| 2   | 提交 sitemap 给 Google Search Console | 24h 内索引率 ≥ 80%                  |
| 3   | 4 语言 hreflang 检查                  | Google Search Console 零错误        |
| 4   | JSON-LD 通过 Google Rich Results Test | Organization + Article + FAQ 全通过 |
| 5   | Lighthouse SEO 分数（4 个核心页）     | ≥ 95                                |

### 16.2 性能验收（3 条）

| #   | 用例                                   | 期望   |
| --- | -------------------------------------- | ------ |
| 6   | Lighthouse Performance（移动 4G 模拟） | ≥ 90   |
| 7   | LCP p75（4 个核心页）                  | < 2.5s |
| 8   | CLS p75                                | < 0.1  |

### 16.3 表单验收（3 条）

| #   | 用例                          | 期望                                                           |
| --- | ----------------------------- | -------------------------------------------------------------- |
| 9   | 提交 Lead 成功                | 跳感谢页 + 后端写 LeadForm（status=new） + 发邮件 + Slack 通知 |
| 10  | 提交失败（Turnstile 失效）    | 提示人机验证失败，**不**写库                                   |
| 11  | 重复提交（同邮箱 1h 内 3 次） | 第 3 次返回 429，前端提示「请稍后再试」                        |

### 16.4 A/B 实验验收（2 条）

| #   | 用例               | 期望                                   |
| --- | ------------------ | -------------------------------------- |
| 12  | 启动实验后访问页面 | 50% 流量看到 A，50% 看到 B（±5% 误差） |
| 13  | 暂停实验           | 100% 流量回到 control（不分流）        |

### 16.5 i18n 验收（1 条）

| #   | 用例               | 期望                                |
| --- | ------------------ | ----------------------------------- |
| 14  | 浏览器语言日语访问 | 自动跳 `/ja-JP`，无硬编码中文字符串 |

### 16.6 CDN 缓存验收（1 条）

| #   | 用例           | 期望                                                                                |
| --- | -------------- | ----------------------------------------------------------------------------------- |
| 15  | 第二次访问首页 | HTML 来自 CDN 边缘（`x-vercel-cache: HIT` 或 `cf-cache-status: HIT`），TTFB < 100ms |

---

## 17. Lighthouse 90+ 性能基线

**为什么需要这章**：Lighthouse 90+ 是品牌门面 + SEO 排名因素。本节给出**硬性指标 + 监控方案 + 失败应对**。

### 17.1 性能预算（**每次发布必检**）

| 指标                 | 移动（4G 模拟） | 桌面    | 测量工具     |
| -------------------- | --------------- | ------- | ------------ |
| **Performance**      | ≥ 90            | ≥ 95    | Lighthouse   |
| **LCP**              | < 2.5s          | < 1.5s  | Web Vitals   |
| **INP**              | < 200ms         | < 100ms | Web Vitals   |
| **CLS**              | < 0.1           | < 0.05  | Web Vitals   |
| **TBT**              | < 200ms         | < 100ms | Lighthouse   |
| **FCP**              | < 1.8s          | < 1.0s  | Lighthouse   |
| **Speed Index**      | < 3.4s          | < 2.0s  | Lighthouse   |
| **首屏 JS（gzip）**  | < 130KB         | < 200KB | Build report |
| **首屏 CSS（gzip）** | < 20KB          | < 30KB  | Build report |
| **LCP 图片（KB）**   | < 100KB         | < 200KB | WebPageTest  |

### 17.2 CI 集成（Lighthouse CI）

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
      - run: npm run start &
      - run: npx wait-on http://localhost:3000
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:3000/en-US
            http://localhost:3000/en-US/pricing
            http://localhost:3000/en-US/blog
            http://localhost:3000/en-US/docs/getting-started
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

```json
// lighthouse-budget.json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script", "budget": 130 },
      { "resourceType": "stylesheet", "budget": 20 },
      { "resourceType": "image", "budget": 100 },
      { "resourceType": "font", "budget": 80 }
    ],
    "timings": [
      { "metric": "interactive", "budget": 3000 },
      { "metric": "first-contentful-paint", "budget": 1800 },
      { "metric": "largest-contentful-paint", "budget": 2500 },
      { "metric": "cumulative-layout-shift", "budget": 0.1 }
    ]
  }
]
```

### 17.3 实时监控

| 工具                                       | 用途                                  | 采样率    |
| ------------------------------------------ | ------------------------------------- | --------- |
| **Vercel Speed Insights**（部署在 Vercel） | 真实用户 Core Web Vitals              | 100%      |
| **Google Search Console**                  | CrUX（Chrome User Experience Report） | 自动      |
| **Sentry Performance**                     | 自定义 trace + transaction            | 100%      |
| **PageSpeed Insights API**                 | 定时任务调 Lighthouse                 | 每日 1 次 |

---

## 18. 部署

**为什么需要这章**：官网部署的**关键诉求**是边缘缓存 + 全球加速 + 零停机 + 原子回滚。本节对比 3 种方案，给出选型建议。

### 18.1 方案对比

| 维度         | **Vercel（推荐）** | Cloudflare Pages      | 自建 CDN（阿里云 / AWS） |
| ------------ | ------------------ | --------------------- | ------------------------ |
| Next.js 集成 | **原生最佳**       | 良好（部分 RSC 限制） | 需自配                   |
| 边缘缓存     | 100+ 节点          | 200+ 节点             | 50-100 节点（国内受限）  |
| ISR 支持     | ✅ 一级公民        | 部分支持              | 需自实现                 |
| 部署速度     | **秒级**           | 秒级                  | 分钟级                   |
| 预览环境     | ✅ 每个 PR         | ✅                    | ❌                       |
| 价格         | $20/月起           | **免费**              | ¥1000+/月                |
| 国内访问     | 慢（需代理）       | 慢                    | **快**                   |
| 团队熟悉度   | 高                 | 中                    | 中                       |
| 原子回滚     | ✅                 | ✅                    | 需脚本                   |

**推荐**：

- **海外流量为主** → Vercel
- **国内流量为主** → 阿里云 / 腾讯云 CDN + 自建 Next.js
- **混合** → Vercel 主站 + 阿里云 CDN 国内镜像（DNS 智能解析）

### 18.2 Vercel 部署配置

```json
// vercel.json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install --frozen-lockfile",
  "regions": ["sin1", "hnd1", "fra1", "iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.sentry.io https://*.google-analytics.com; frame-ancestors 'none';"
        }
      ]
    },
    {
      "source": "/_next/static/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/(.*)\\.(jpg|jpeg|png|webp|avif|svg)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=2592000" }]
    }
  ],
  "redirects": [{ "source": "/blog", "destination": "/en-US/blog", "permanent": false }]
}
```

### 18.3 环境分级

| 环境                  | 域名                  | 部署触发     | 用途                 |
| --------------------- | --------------------- | ------------ | -------------------- |
| **preview**           | `pr-{number}.smy.app` | 每个 PR 自动 | QA 验证              |
| **staging**           | `staging.smy.app`     | main 分支    | 集成测试             |
| **production**        | `smy.app`             | release tag  | 正式流量             |
| **production 中镜像** | `smy.cn`              | 手动         | 国内用户（智能 DNS） |

### 18.4 部署清单（每次上线必勾）

- [ ] Lighthouse CI 通过（≥ 90）
- [ ] TypeScript 编译通过
- [ ] ESLint 0 错误
- [ ] 单元测试通过（表单、A/B、i18n）
- [ ] E2E 测试通过（Playwright：登录、留资、订阅）
- [ ] 环境变量齐全（GA / Turnstile / Sentry / PostHog / Resend）
- [ ] Sentry source map 上传
- [ ] 监控告警就绪（uptime / 性能 / 错误率）

---

## 19. 监控

**为什么需要这章**：官网是**公开资产**——宕机 1 分钟 = 错过 50+ 访客、SEO 排名下降。监控必须**主动**（**不**等用户报障）。

### 19.1 监控分层

| 层         | 工具                           | 指标                        | 告警阈值                |
| ---------- | ------------------------------ | --------------------------- | ----------------------- |
| **可用性** | Better Uptime / UptimeRobot    | HTTP 200 / SSL 证书 / DNS   | 1 分钟内 2 次失败       |
| **性能**   | Vercel Speed Insights + Sentry | LCP / INP / CLS / TTFB      | p75 > 阈值持续 5 分钟   |
| **错误**   | Sentry                         | JS 异常 / API 5xx           | 5 分钟内 > 10 次        |
| **流量**   | GA4 + 自建 PageView            | UV / 跳出率 / 转化          | 日 UV 同比下降 > 30%    |
| **SEO**    | Google Search Console          | 索引数 / 排名 / 抓取错误    | 索引数 1 周内下降 > 10% |
| **业务**   | 自建指标看板                   | Lead 数 / 订阅数 / A/B 显著 | 日 Lead 数 < 10         |

### 19.2 Sentry 集成

```typescript
// apps/website/src/lib/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(10),
  REVALIDATE_SECRET: z.string().min(32),
});

export const env = EnvSchema.parse(process.env);
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% 采样
  replaysSessionSampleRate: 0.05, // 5% session replay
  replaysOnErrorSampleRate: 1.0, // 错误时 100% replay
  beforeSend(event) {
    // 脱敏
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});
```

### 19.3 关键告警规则

```yaml
# alerts/website.yaml
groups:
  - name: website-availability
    rules:
      - alert: WebsiteDown
        expr: probe_http_status_code{job="smy-app"} != 200
        for: 1m
        labels: { severity: critical }
        annotations:
          summary: '官网宕机'

      - alert: SSLExpiringSoon
        expr: probe_ssl_earliest_cert_expiry{job="smy-app"} - time() < 86400 * 14
        for: 1h
        labels: { severity: warning }

  - name: website-performance
    rules:
      - alert: SlowLCP
        expr: histogram_quantile(0.75, web_vitals_lcp) > 2500
        for: 5m
        labels: { severity: warning }

      - alert: HighErrorRate
        expr: |
          sum(rate(sentry_events_total{level="error"}[5m])) /
          sum(rate(sentry_events_total[5m])) > 0.01
        for: 5m
        labels: { severity: critical }

  - name: website-seo
    rules:
      - alert: IndexingDrop
        expr: google_search_console_indexed_pages < on() (google_search_console_indexed_pages offset 7d) * 0.9
        for: 1d
        labels: { severity: warning }
```

### 19.4 监控看板（每日看）

| 面板     | 工具              | 看什么                 |
| -------- | ----------------- | ---------------------- |
| 实时流量 | GA4 DebugView     | 当前在线 / 事件流      |
| 性能     | Vercel Analytics  | LCP / INP / CLS 趋势   |
| 错误     | Sentry            | 异常 / 性能问题        |
| SEO      | GSC               | 索引 / 排名 / 抓取错误 |
| 业务     | 自建 Mixpanel     | Lead 漏斗 / A/B 结果   |
| 告警     | Slack / PagerDuty | 即时通知               |

---

## 20. 跨文件一致性检查

**为什么需要这章**：21 个模块 + 5 个客户端的 PRD 间，命名、颜色、状态、字段命名必须严格一致——任何不一致都会让前端实现出现 3 套并列方案。本节是发布前的**必勾清单**。

### 20.1 跨文件规范检查（官网特有）

- [ ] API 路径前缀是否 `/api/public/website/*`（**不**是 `/api/h5/*`、**不**是 `/api/admin/*`）？
- [ ] 官网 i18n namespace 是否用 `marketing` / `forms` / `seo`（**不**自定义）？
- [ ] 状态色是否按 [00-foundation §8.3.1](../../admin-prd/00-foundation.md)（**不**自定义 hex）？
- [ ] Lead 状态变更是否写 `LeadFormStatusLog` 独立日志表（**不**用 JSON 字段内嵌）？
- [ ] `*UserId` 字段是否按 00-foundation §12 加 `@relation("Name")` + `onDelete: Restrict`？
- [ ] i18n 字典 key 是否在 00-foundation §5.5.1 速查表（**不**自创）？
- [ ] 资源级权限判定（API 公开访问）是否在 00-foundation §3.5 框架内？
- [ ] 凭证加密（如有）是否走 00-foundation §11 KMS？
- [ ] 是否使用 React Hook Form + Zod（与 H5 admin-web 一致）？
- [ ] UI 组件是否基于 shadcn/ui（与 H5 admin-web 一致）？
- [ ] 错误处理是否走统一 `BusinessException`（与 H5 一致）？
- [ ] 软删字段 `deletedAt: DateTime?` 是否齐全？

### 20.2 官网独有规范

- [ ] 是否配置 Cloudflare Turnstile（**不**用极验，国内访问困难）？
- [ ] 是否 4 语言（zh-CN / en-US / ja-JP / ko-KR）全覆盖？
- [ ] 是否生成动态 `sitemap.xml` + `robots.txt`？
- [ ] 是否配置 Hreflang（4 语言 + x-default）？
- [ ] 是否配置 JSON-LD（Organization / Article / FAQ / Product）？
- [ ] 是否使用 `next/image`（**不**用 `<img>`）？
- [ ] 是否使用 `next/font`（**不**用 Google Fonts CSS link）？
- [ ] Core Web Vitals 是否达标（LCP < 2.5s / INP < 200ms / CLS < 0.1）？
- [ ] Lighthouse Performance 是否 ≥ 90？
- [ ] 是否配置 CSP / HSTS / X-Frame-Options 安全头？
- [ ] 是否符合 GDPR / CCPA / PIPL（Cookie banner）？

### 20.3 上线前最终检查

- [ ] **必读** [00-foundation](../../admin-prd/00-foundation.md) §1-§13 全部对齐
- [ ] 1 篇示例博客（4 语言）已发布
- [ ] 1 个 Lead 完整流程跑通（提交 → DB → 邮件 → Slack → BD 跟进）
- [ ] 1 个 A/B 实验跑 1 轮（draft → running → completed）
- [ ] 1 次 Lighthouse CI 通过（PR 流程跑通）
- [ ] 1 次 on-demand revalidation 跑通（修改 MDX → 静态页更新）
- [ ] 1 次 CDN 缓存命中（x-vercel-cache: HIT）
- [ ] 1 次故障演练（Vercel 模拟 downtime → 告警触发 → Slack 通知）

---

## 附录 A · 关键决策记录

| 决策            | 选项                                            | 最终选择                         | 理由                       |
| --------------- | ----------------------------------------------- | -------------------------------- | -------------------------- |
| 前端框架        | Vite + React / Next.js                          | **Next.js 14**                   | SEO 必须 SSR/SSG           |
| UI 组件库       | Ant Design / MUI / shadcn                       | **shadcn/ui**                    | 可定制，无运行时依赖       |
| 表单            | Formik / React Hook Form                        | **RHF + Zod**                    | 性能 + 类型安全            |
| 状态管理        | Redux / Zustand / URL state                     | **RSC + URL state**              | 官网无全局状态             |
| i18n            | next-i18next / next-intl                        | **next-intl**                    | App Router 官方推荐        |
| 验证码          | 极验 / reCAPTCHA / Turnstile                    | **Cloudflare Turnstile**         | 海外体验好，免费           |
| A/B 框架        | 自研 / PostHog / GrowthBook                     | **PostHog**                      | 功能全 + free tier 够用    |
| 热图            | Hotjar / Clarity / FullStory                    | **Microsoft Clarity**            | 免费 + Session Replay      |
| 部署            | Vercel / Cloudflare / 自建                      | **Vercel**                       | Next.js 原生最佳           |
| 内容            | Headless CMS / MDX 文件                         | **MDX 文件**（v1）→ Sanity（v2） | 起步轻量，Git 控版本       |
| API 前缀        | `/api/h5/*` 复用 / `/api/public/website/*` 单独 | **单独**                         | 公开流量与鉴权流量物理隔离 |
| Lead 关联 admin | JSON 字段 / 外键                                | **外键 + Restrict**              | 遵循 00-foundation §12     |

---

## 附录 B · 与 H5 / 小程序 / APP 的关键差异速查

| 维度     | H5 / 小程序 / APP | **官网**                                                |
| -------- | ----------------- | ------------------------------------------------------- |
| 渲染     | CSR / Native      | **SSR + SSG + ISR**                                     |
| 鉴权     | JWT               | **无登录态（Cookie + Email 标记）**                     |
| API 前缀 | `/api/h5/*`       | **`/api/public/website/*`**                             |
| 用户实体 | `User`            | **`Lead`（线索）**                                      |
| 状态机   | H5 业务状态机     | **Lead 状态机 + ABTest 状态机**                         |
| KPI      | GMV / DAU / 留存  | **UV / 转化率 / 关键词排名 / Lighthouse**               |
| 性能     | 首屏 < 3s         | **LCP < 2.5s + Lighthouse 90+**                         |
| SEO      | ❌                | **✅ 完整 meta + JSON-LD + sitemap + hreflang**         |
| 内容生产 | 后台 CMS          | **MDX 文件 + Git 流程**                                 |
| 分析     | 神策 / Sensors    | **GA4 + 百度统计 + 友盟 + Mixpanel + Hotjar + Clarity** |
| 隐私     | 用户协议 + KYC    | **GDPR + CCPA + PIPL（Cookie banner）**                 |
| 验证码   | 极验              | **Cloudflare Turnstile**                                |
| 部署     | CDN 静态资源      | **Vercel / Cloudflare Pages**                           |
| A/B 测试 | 无                | **PostHog 实验引擎**                                    |
| 监控     | 业务指标          | **uptime + 性能 + SEO + 业务四层**                      |

---

## 附录 C · 文件清单（官网项目结构速查）

```
apps/website/
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/             # 组件
│   │   ├── ui/                 # shadcn/ui
│   │   ├── marketing/          # 营销页组件
│   │   ├── forms/              # 表单
│   │   ├── layout/             # 布局
│   │   ├── seo/                # SEO 组件
│   │   ├── analytics/          # 分析 SDK 注入
│   │   └── ab/                 # A/B 测试
│   ├── lib/                    # 工具
│   ├── content/                # MDX 博客 / 文档
│   ├── styles/                 # 全局样式
│   ├── types/                  # TypeScript 类型
│   └── middleware.ts           # i18n + 安全头
├── public/                     # 静态资源
├── i18n/                       # 多语言字典
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 附录 D · Roadmap（v1 → v3）

| 版本                | 目标             | 关键能力                                             |
| ------------------- | ---------------- | ---------------------------------------------------- |
| **v1（3 个月内）**  | 基础营销站 + SEO | 10 个核心页 + 4 语言 + 博客 + Lead 表单 + GA4        |
| **v2（6 个月内）**  | 增长优化         | 文档站 + 案例 + A/B 平台 + Newsletter + Mixpanel     |
| **v3（12 个月内）** | 内容生态         | Headless CMS + 多作者 + 视频 + 播客 + 国际化媒体合作 |

---

> **本 PRD 完结**。官网是 5 个端里最特殊的——**它面向搜索引擎、未登录访客、品牌用户、潜在客户、媒体记者、机构投资人**。所有技术选型（Next.js / ISR / MDX / PostHog / Vercel）都围绕「公开 + 营销 + SEO」这一个核心。本 PRD 严格遵循 [00-foundation](../../admin-prd/00-foundation.md) §3.5 资源权限、§4.3 状态日志、§5.5.1 i18n 命名、§8.3.1 状态色彩、§11 KMS、§12 外键规范，与 H5 / 小程序 / APP / 后台保持一致。
