# 06 · 海外 5 大平台集成（Overseas Platforms）

> **对应 H5**：H5 端全部 20 个菜单（**复用 H5 后端 API**，海外平台通过**纯前端 SDK 集成 + 服务端 Node SDK**双侧实现）
> **核心目标**：覆盖海外用户拉新、广告归因、客服私域、品牌曝光 — Facebook / LinkedIn / Google / WhatsApp / TikTok International 五大平台
> **后端**：与 H5 端共用 `apps/api` NestJS 服务，**新增** `/api/h5/oauth/*` 和 `/api/h5/marketing/*` 两个 namespace
> **前端**：H5 端通过 `apps/h5-app/` 集成各平台官方 SDK（**异步加载**，不阻塞首屏）；服务端通过 `apps/api/src/integrations/` 封装各平台 Node SDK
> **合规底线**：所有 5 大平台涉及欧盟用户时**必须**满足 GDPR；美国加州用户**必须**满足 CCPA；中国大陆用户**不**走海外通道（避免 4.4 跨境数据问题）

---

## 1. 业务目标

> **为什么需要这章**：明确 5 大平台在「海购星 Samoa DAO」整体出海战略中的定位 — 是拉新裂变、广告获客、客服私域、还是品牌曝光？避免「什么平台都接、什么功能都做」的资源分散。

### 1.1 平台战略定位

| 平台 | 战略定位 | 核心指标 | 不做 |
|---|---|---|---|
| **Facebook** | 拉新主力（欧美东南亚）+ 客服 | 注册 CAC < $2.5，MAU 贡献 ≥ 35% | ❌ 自家粉丝页不重运营（外包给运营组） |
| **LinkedIn** | B2B 商务获客（DLC 4/5 商务用户） | 商务咨询 lead 月 ≥ 50 | ❌ 营销内容矩阵（仅 Lead Gen + Share） |
| **Google** | 全链路（登录 + 地图 + 分析 + 内购） | GA4 漏斗覆盖率 100%，Play Billing 占比 ≥ 20% | ❌ 自研地图组件（直接用 Maps JS） |
| **WhatsApp** | 客服私域（萨摩亚本地 + 印度巴西） | 客服首响 < 5 min，留存率 +25% | ❌ WhatsApp Pay（不进中国/欧美主流） |
| **TikTok** | Z 世代拉新（视频裂变 + 购物车） | 视频曝光 ≥ 1000 万/月，K 因子 ≥ 1.2 | ❌ Research API（仅商用） |

### 1.2 5 平台核心指标（北极星）

| 指标 | 2026 H2 目标 | 2027 H1 目标 |
|---|---|---|
| 海外注册用户 | 50 万 | 200 万 |
| 5 平台拉新占比 | ≥ 60% | ≥ 75% |
| 广告 ROI | ≥ 1.8 | ≥ 2.5 |
| 客服 SLA（首响） | < 5 min | < 3 min |
| 海外月活 MAU | 25 万 | 80 万 |
| 合规事件 | 0 起 | 0 起 |

### 1.3 业务边界（**重要**）

- ❌ **不**做平台矩阵运营（X / Instagram / YouTube 等优先级 P2，本文档**不**覆盖）
- ❌ **不**做 WhatsApp Pay（仅印度/巴西试点，**不**进主流市场）
- ❌ **不**做 TikTok Research API（仅商用 Display API）
- ❌ **不**做 Google Workspace（仅作 SSO 登录入口，不做企业 IM）
- ✅ **做** 5 平台 OAuth 2.0 登录（**统一**抽象层，见 §4）
- ✅ **做** 5 平台 Pixel / Events API 事件追踪（**统一**抽象层，见 §16）
- ✅ **做** 5 平台 Marketing API 拉取数据（**统一** `/api/h5/marketing/*`）

---

## 2. 用户故事

> **为什么需要这章**：用 5 平台各自的典型场景描述用户旅程，让开发、运营、客服对「为什么接」有共同认知。

| # | 故事 |
|---|---|
| US-1 | 作为游客，我在 H5 落地页点「Continue with Facebook」，授权后自动建账号（无需填手机号） |
| US-2 | 作为 LinkedIn 用户，我用「Sign in with LinkedIn」登录，平台自动同步我的职位/公司信息 |
| US-3 | 作为 Google 用户，我在 H5 首页看到「One Tap」登录弹窗，点一下就登录（**不**跳转） |
| US-4 | 作为萨摩亚本地用户，下单后我收到 WhatsApp 模板消息（订单确认），可点按钮「查询物流」 |
| US-5 | 作为 Z 世代用户，我用 TikTok 登录，平台把视频分享回流到我的 TikTok 账号 |
| US-6 | 作为商务客户，我从 LinkedIn 看到 Lead Gen Form 广告，提交表单后自动进 H5 CRM |
| US-7 | 作为客服，我在工作台看到用户从 Facebook Messenger 来的会话，直接回复（**不**切平台） |
| US-8 | 作为运营，我需要在 Facebook Ads Manager 看「注册转化」，Conversions API 帮我把服务端事件回传 |
| US-9 | 作为用户，我从 Facebook 广告点进来，URL 带 `fbclid`，系统识别归因后给我专属优惠 |
| US-10 | 作为商家，我用 WhatsApp Business Profile 展示公司地址/营业时间，用户直接 WhatsApp 咨询 |
| US-11 | 作为商家，我在 Google Maps 搜索结果看到自己店铺（Places API 数据打通） |
| US-12 | 作为用户，我在 TikTok 看到 KOL 视频带「立即购买」按钮，跳 H5 完成下单（**不**走 TikTok Shop） |
| US-13 | 作为欧盟用户，我拒绝 Cookie 横幅后再点 Facebook 登录，系统跳过 Pixel 上报 |
| US-14 | 作为付费用户，我在 Android 端用 Google Play Billing 订阅服务（**不**走 Stripe） |
| US-15 | 作为商务用户，我用 Google Workspace 邮箱注册（OpenID Connect） |

---

## 3. 5 平台与 H5 / 小程序 / APP 的差异

> **为什么需要这章**：5 大平台是「**外部**第三方」而非「自建客户端」（如 H5、小程序、APP），差异维度完全不同 —— 本章重点展开。

### 3.1 复用部分（H5 后端 API 不动）

- 所有 `/api/h5/*` 接口 100% 复用（用户、订单、KYC、钱包等）
- Prisma 数据模型 100% 复用（`User` / `Order` / `Transaction` 等）
- i18n 字典复用 4 语言
- 业务状态机、权限点、审计日志全部复用
- 退款流程按 00-foundation §7.5 统一约定

### 3.2 改造部分（**前端 + 后端双侧**）

| 维度 | H5 / 小程序 / APP | 海外 5 平台 | 改造点 |
|---|---|---|---|
| **集成方式** | 自有 App / 小程序 | 第三方平台 + OAuth | 需各自 App Review |
| **登录** | 自有账号体系 | 5 平台 OAuth 2.0 跳转 | 新增 `/api/h5/oauth/*` |
| **用户身份** | User 表统一 | 1 个 User 绑 N 个海外账号 | 新增 `OverseasAuth` 统一表 |
| **凭证存储** | User 密码 (bcrypt) | Access/Refresh Token | **必须** KMS 加密（§11） |
| **支付** | Stripe / Alipay H5 / WxPay | **新增** Google Play Billing | 新增 `GoogleBillingService` |
| **客服** | 内嵌 AI Chat | Facebook Messenger / WhatsApp | 双通道，统一 SLA |
| **推送** | 订阅消息 / FCM | **额外** WhatsApp 模板 / Messenger | 5 通道，按用户偏好 |
| **地图** | 高德 / 腾讯 | **新增** Google Maps JS | 按地区动态加载 |
| **数据分析** | 自研埋点 | **新增** GA4 + Facebook Pixel + TikTok Pixel | 5 平台 Pixel 统一抽象（§16） |
| **广告归因** | 无 | **新增** Facebook / TikTok Ads 归因 | 新增 `AdAttribution` 表 |
| **合规要求** | 中国个保法 | GDPR / CCPA + 平台 ToS | Cookie 横幅 + 数据驻留 |
| **App Review** | 应用市场上架审核 | 5 平台各自审核（部分 API 需额外权限） | 2-8 周 |
| **API 版本** | 自有 API 自由迭代 | Graph API v18+ / LinkedIn v2 / WhatsApp Cloud v18+ | 必须按平台版本约束 |

### 3.3 不支持 / 不做的能力（**明确告知产品**）

- ❌ **Facebook Pay**（仅美国部分商户，**不**进主流市场）
- ❌ **WhatsApp Pay**（仅印度/巴西试点，**不**进中国/欧美主流）
- ❌ **TikTok Shop**（与海购星跨境电商**冲突**，走 H5 下单，**不**走 TikTok 内购）
- ❌ **LinkedIn Messaging 群发**（LinkedIn 平台政策禁止营销消息，仅可 InMail）
- ❌ **Google Pay Online**（仅 Android 端，**不**做 Web 集成，避免 PCI DSS 范围扩大）
- ❌ **Instagram Graph API**（P2 优先级，本文档**不**覆盖）
- ❌ **X / Twitter API v2**（P2 优先级）
- ❌ **YouTube Data API**（P2 优先级）
- ❌ **Facebook Graph API 拿好友列表**（v2.0 后仅好友授权过的可拿，**实际**不可用）
- ❌ **WhatsApp On-Premises API**（Meta 已 deprecated，**必须**用 Cloud API）

### 3.4 5 平台 OAuth 范围（Scope）对比

| 平台 | 必选 scope | 可选 scope | 敏感 scope（需 App Review） |
|---|---|---|---|
| **Facebook** | `email`, `public_profile` | `user_friends` (v2 后基本无效) | `user_posts`, `user_photos`, `pages_show_list`, `pages_messaging` |
| **LinkedIn** | `openid`, `profile`, `email` | — | `w_member_social` (UGC Share), `r_ads`, `r_ads_reporting`, `r_organization_social` |
| **Google** | `openid`, `email`, `profile` | — | `https://www.googleapis.com/auth/ads.readonly`, `https://www.googleapis.com/auth/analytics.readonly` |
| **WhatsApp** | **无 OAuth**（仅 Business API） | — | `whatsapp_business_management`, `whatsapp_business_messaging` |
| **TikTok** | `user.info.basic` | `user.info.profile`, `user.info.stats` | `user.video.publish`, `business.content.discover` |

---

## 4. OAuth 2.0 统一登录框架

> **为什么需要这章**：5 平台登录**都**基于 OAuth 2.0（除 WhatsApp 走 Business API），抽出统一抽象层避免 5 套实现各自漂移。

### 4.1 通用 OAuth 2.0 流程

```
┌─────────┐         ┌─────────┐         ┌─────────────┐         ┌──────────┐
│  H5/APP │         │ 后端 API│         │ 平台 OAuth  │         │ 平台资源 │
│         │         │         │         │   Server    │         │  API     │
└────┬────┘         └────┬────┘         └──────┬──────┘         └────┬─────┘
     │                   │                     │                      │
     │ 1. 点登录按钮     │                     │                      │
     │ /api/h5/oauth/   │                     │                      │
     │   :platform/     │                     │                      │
     │   authorize      │                     │                      │
     │ ────────────────►│                     │                      │
     │                   │ 2. 生成 state +     │                      │
     │                   │   nonce (HMAC)      │                      │
     │ ◄────────────────│  返回 authorize URL  │                      │
     │ 3. window.location = authorize_url     │                      │
     │ ──────────────────────────────────────►│                      │
     │                   │                     │ 4. 用户授权           │
     │                   │                     │                      │
     │                   │ 5. 回调 ?code=xxx   │                      │
     │                   │   &state=yyy        │                      │
     │ ◄──────────────────────────────────────│                      │
     │ 6. POST /api/h5/oauth/:platform/callback                     │
     │    { code, state }                │     │                      │
     │ ────────────────►│                     │                      │
     │                   │ 7. 校验 state       │                      │
     │                   │   (防 CSRF)         │                      │
     │                   │                     │                      │
     │                   │ 8. code → token     │                      │
     │                   │ ───────────────────►│                      │
     │                   │                     │ 9. 调 userinfo API   │
     │                   │                     │ ────────────────────►│
     │                   │                     │ ◄──── user profile ──│
     │                   │ 10. 拿到 profile    │                      │
     │                   │   写 OverseasAuth   │                      │
     │                   │   加密 access_token │                      │
     │                   │   (KMS §11)         │                      │
     │                   │                     │                      │
     │                   │ 11. 签发 H5 JWT     │                      │
     │ 12. 返回 token    │                     │                      │
     │ ◄────────────────│                     │                      │
     │                   │                     │                      │
```

### 4.2 5 平台 OAuth 差异速查

| 平台 | Auth URL | Token URL | UserInfo 端点 | 特殊点 |
|---|---|---|---|---|
| **Facebook** | `https://www.facebook.com/v18.0/dialog/oauth` | `https://graph.facebook.com/v18.0/oauth/access_token` | `GET /me?fields=id,name,email,picture` | access_token **短**（2h），用 long-lived token 60 天 |
| **LinkedIn** | `https://www.linkedin.com/oauth/v2/authorization` | `https://www.linkedin.com/oauth/v2/accessToken` | `GET /v2/userinfo` (OIDC) | 强制 PKCE，refresh token 365 天 |
| **Google** | `https://accounts.google.com/o/oauth2/v2/auth` | `https://oauth2.googleapis.com/token` | `GET /v3/userinfo` (OIDC) | id_token 走 JWT 验签；One Tap 不走此流程 |
| **TikTok** | `https://www.tiktok.com/v2/auth/authorize/` | `https://open.tiktokapis.com/v2/oauth/token/` | `GET /v2/user/info/` | 强制 PKCE，client_key 替代 client_id |

### 4.3 统一抽象后端设计

```typescript
// apps/api/src/modules/oauth/oauth-provider.interface.ts
export interface OAuthProvider {
  platform: 'facebook' | 'linkedin' | 'google' | 'tiktok';
  getAuthorizeUrl(state: string, scopes: string[]): string;
  exchangeCode(code: string, codeVerifier?: string): Promise<TokenSet>;
  getUserInfo(accessToken: string): Promise<Profile>;
  refreshToken(refreshToken: string): Promise<TokenSet>;
  revokeToken(accessToken: string): Promise<void>;
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;        // 秒
  scope: string;
  tokenType: 'Bearer' | 'Bearer';
  idToken?: string;         // OIDC
}

export interface Profile {
  platformUserId: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  avatarUrl?: string;
  raw: Record<string, any>;
}
```

### 4.4 统一绑定策略

| 场景 | 行为 |
|---|---|
| 首次登录（无 User） | 自动建 User 账号（`source = 'facebook'` 等） |
| 二次登录（已有 User 绑过该平台） | 静默登录，刷 access_token |
| 同一平台绑不同 User | 拒绝（`platform + platformUserId` 唯一） |
| 同一 User 绑多个平台 | ✅ 允许（双身份规则 §13） |
| 同一邮箱不同平台 | ✅ 允许（应用层可做合并提示，**不**强制） |

---

## 5. 业务流程

> **为什么需要这章**：5 平台各自核心场景的端到端流程描述，含失败/重试/降级分支。

### 5.1 Facebook 登录 + Share + Messenger 客服 + Conversions API

```
用户流程：
H5 落地页 → 点「Continue with Facebook」
   ↓
前端调 /api/h5/oauth/facebook/authorize 拿 URL
   ↓
window.location = facebook.com/dialog/oauth?client_id=xxx&redirect_uri=...&state=HMAC
   ↓
用户在 Facebook 弹窗授权
   ↓
回调 /api/h5/oauth/facebook/callback?code=xxx&state=yyy
   ↓
后端 code → access_token（短）→ exchange for long-lived token（60 天）
   ↓
调 Graph API /me 拿 id, name, email, picture
   ↓
写 OverseasAuth(platform='facebook', platformUserId=xxx, accessTokenEncrypted, ...)
   ↓
签发 H5 JWT → 跳 H5 首页
   ↓
用户进入 H5 后：
  - Share：点分享按钮 → FB.ui({ method: 'share', href }) 或 Open Graph dialog
  - 客服：点 Messenger 图标 → FB.Messenger.showCustomerChat() 弹出 Messenger
  - 转化：注册完成时前端发 fbq('track', 'CompleteRegistration')
                   + 后端 POST /api/h5/marketing/facebook/events
                     (Conversions API 服务端去重)
```

**关键点**：
- `access_token` **必须**走 KMS 加密（00-foundation §11）存 `OverseasAuth.accessToken`
- `state` 用 HMAC-SHA256(secret, sessionId) 防 CSRF，10 分钟过期
- Conversions API 与 Pixel **必须**同 `event_id`（去重）
- 长效 token 60 天过期，**前端不感知**，后台 cron 提前 7 天刷

### 5.2 LinkedIn 登录 + Share + Lead Gen Form

```
登录同 §4
↓
用户授权后 LinkedIn 返回 id_token（OIDC，验签）
↓
后端验签（用 LinkedIn JWKS）→ 拿 sub, email, name
↓
写 OverseasAuth(platform='linkedin', ...)
↓
签发 H5 JWT
↓
Share 流程：
  - 前端调 LinkedIn Share SDK（ugcPostApi.shareMedia）
  - 后端用 w_member_social scope 调 UGC Posts API
↓
Lead Gen Form 流程：
  - 商家在 LinkedIn Campaign Manager 创建 Lead Gen Form 广告
  - 用户提交表单 → LinkedIn 推 webhook 到 /api/h5/oauth/linkedin/lead-webhook
  - 后端解析 lead → 写 Lead 表 → 触发 CRM 通知
```

**关键点**：
- LinkedIn v2 OIDC **必须**验 `id_token` 签名（用 JWKS endpoint）
- UGC Share 需 `w_member_social` scope（**敏感**，需 App Review）
- Lead Gen Form webhook 用 HMAC-SHA256(secret) 签名校验

### 5.3 Google 登录 + One Tap + Maps + GA4 + Play Billing

```
Google 登录（同 §4 OIDC 流程）
   ↓
后端验 id_token 签名（用 Google JWKS https://www.googleapis.com/oauth2/v3/certs）
   ↓
拿 sub, email, email_verified, name, picture
   ↓
写 OverseasAuth
   ↓
签发 H5 JWT

One Tap 登录（无跳转）：
  - 前端加载 GSI client library
  - 渲染 <div id="g_id_onload" data-client_id="..." data-callback="handleCredentialResponse">
  - 用户点 → Google 弹原生弹窗 → 选账号 → 返回 id_token (JWT)
  - 前端 POST /api/h5/oauth/google/one-tap { idToken }
  - 后端验签 → 写 OverseasAuth → 签发 H5 JWT

Maps：
  - 加载 Maps JS API: <script src="...maps/api/js?key=xxx&libraries=places">
  - 创建 map = new google.maps.Map(...)
  - Places API: service.nearbySearch / service.getDetails
  - Geocoding: geocoder.geocode({ address })

GA4：
  - 加载 gtag.js: <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXX">
  - gtag('config', 'G-XXXXXX', { user_id: user.id })
  - 事件: gtag('event', 'purchase', { transaction_id, value, currency })

Play Billing（Android 端）：
  - 原生层（Java/Kotlin）调 BillingClient.launchBillingFlow
  - 拿 purchaseToken → H5 WebView 调 /api/h5/payments/google-play/verify
  - 后端用 Google Play Developer API 验 token → 写 Transaction
```

**关键点**：
- One Tap 弹窗**仅**展示 1 次（用户拒绝后 14 天内不弹，避免骚扰）
- Maps JS API key **必须**配 HTTP referrer 限制（**仅**允许 H5 域名）
- GA4 事件名严格按 Google 规范（`purchase` / `sign_up` / `login` 等**预定义**事件优先）
- Play Billing **不**经过 Google 收 30% 抽成（订阅首年后降至 15%）—— 用 RevenueCat 桥接**可**避免，但**本期不**做

### 5.4 WhatsApp 模板消息 + 客服 + Click-to-WhatsApp

```
WhatsApp **不是** OAuth — 走 Meta WhatsApp Business Cloud API（v18.0+）
↓
商家注册：
  1. Meta Business Suite 创建 WhatsApp Business Account (WABA)
  2. 注册 Phone Number（**通过** Embedded Signup 流程）
  3. 创建 System User 拿 access_token
  4. 后端配置环境变量 WHATSAPP_PHONE_ID, WHATSAPP_BUSINESS_ID, WHATSAPP_ACCESS_TOKEN
↓
模板审批：
  1. 在 Meta Business Manager 创建模板（语言 + 类别 + 变量）
  2. 提交审批（utility 24h, marketing 看复杂度，authentication 几分钟）
  3. 后端拉模板列表 → 存 WhatsAppTemplate 表
  4. 前端展示已通过模板
↓
发送流程（主动）：
  1. 业务触发（如订单支付成功）→ 后端查 WhatsAppTemplate(用途='order_paid')
  2. POST graph.facebook.com/v18.0/{phone_id}/messages
     {
       messaging_product: "whatsapp",
       to: "user_phone",
       type: "template",
       template: { name, language: { code: "en" }, components: [...] }
     }
  3. 24h 内用户回复 → 进入 session window
  4. session 内可发自由文本 + 交互按钮
↓
接收流程（webhook）：
  1. 用户发消息 → Meta 推 webhook 到 /api/h5/oauth/whatsapp/webhook
  2. 验 X-Hub-Signature-256 签名
  3. 写 WhatsAppConversation
  4. AI Chat 接管回复（24h 内）
↓
Click-to-WhatsApp Ads：
  1. 商家在 Meta Ads Manager 创建 CTA = WhatsApp 广告
  2. 用户点 → 跳 wa.me/{phone}?text=预填消息
  3. 用户在 WhatsApp 客户端发消息 → 走上面 webhook
  4. 归因通过广告点击的 `ad_id` 在 WA 消息中带（Meta 自动加）
```

**关键点**：
- 模板消息**必须**用户 opt-in（首次加好友 / 主动发起对话）
- 营销类模板**有**24h 发送窗口限制（utility / authentication 无限制但场景严）
- 海外（欧美）用户对营销消息敏感，**默认不**发 marketing 模板
- Cloud API v18+ **不**支持 WhatsApp Pay（明确告知产品）

### 5.5 TikTok 登录 + Share + Pixel + Events API

```
TikTok 登录（v2，强制 PKCE）：
  1. 前端调 /api/h5/oauth/tiktok/authorize → 后端生成 code_verifier + code_challenge
  2. 跳 tiktok.com/v2/auth/authorize/?client_key=xxx&code_challenge=xxx&code_challenge_method=S256
  3. 用户授权 → 回调 ?code=xxx
  4. 后端 POST open.tiktokapis.com/v2/oauth/token/ 拿 access_token + refresh_token
  5. 调 /v2/user/info/?fields=open_id,union_id,display_name,avatar_url 拿用户
  6. 写 OverseasAuth
  7. 签发 H5 JWT

TikTok Share：
  1. 前端用 TikTok Share Kit（客户端 SDK）
  2. 调 tiktok.share({ video, text }) 弹出分享面板
  3. 用户选好友 / 圈子 → 视频发布到 TikTok

TikTok Pixel + Events API：
  - Pixel（前端）：
    <script>
      !function (w, d, t) { ... ttq.load('pixel_id'); ttq.page(); }(window, document, 'script');
    </script>
  - 事件：ttq.track('CompletePayment', { content_id, value, currency })
  - Events API（服务端）：
    POST open.tiktokapis.com/v2/pixel/track/
    { pixel_code, event: 'CompletePayment', event_id, timestamp, properties: {...} }
    Authorization: Bearer access_token
```

**关键点**：
- TikTok 强制 PKCE（区别于 Facebook 简单模式）
- `event_id` 服务端 + 前端同值用于去重
- TikTok Pixel 在中国大陆 IP **不**加载（避免合规风险）
- TikTok for Business SDK 仅 Android/iOS 端，**不**做 Web 端归因

---

## 6. 字段定义（5 张表）

> **为什么需要这章**：5 平台涉及多类凭证（Access Token、Refresh Token、广告归因等），必须按 00-foundation §6 软删 + 索引、§11 KMS 加密、§12 外键规范建表。

### 6.1 OverseasAuth（**统一**海外社交账号绑定表）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | UUID |
| userId | String | ✓ | 关联 `User.id`（00-foundation §13 双身份允许多绑） |
| user | User | ✓ | `@relation("OverseasAuthUser", onDelete: Restrict)` |
| platform | String | ✓ | `facebook` / `linkedin` / `google` / `tiktok` / `whatsapp` |
| platformUserId | String | ✓ | 平台返回的用户唯一 ID |
| platformUnionId | String | | 跨 app unionId（Facebook 无 / TikTok 有 / 微信类平台有） |
| email | String | | 平台返回的邮箱 |
| emailVerified | Boolean | | |
| displayName | String | | 平台昵称 |
| avatarUrl | String | | |
| accessTokenEncrypted | String | | **必填** — KMS 加密后的 access_token（§11） |
| refreshTokenEncrypted | String | | KMS 加密后的 refresh_token（部分平台无） |
| accessTokenExpiresAt | DateTime | | |
| refreshTokenExpiresAt | DateTime | | |
| scopes | String | | 授权 scope 列表（逗号分隔） |
| idTokenClaims | String | | OIDC id_token claims（JSON） |
| lastRefreshedAt | DateTime | | 上次刷 token 时间 |
| raw | String | | 平台返回的原始 profile JSON（脱敏后） |
| status | String | ✓ | `active` / `expired` / `revoked` / `disconnected` |
| connectedAt | DateTime | ✓ | 首次绑定时间 |
| lastUsedAt | DateTime | | |
| createdAt, updatedAt, deletedAt | | | 通用 |

```prisma
model OverseasAuth {
  id                       String    @id @default(uuid())
  userId                   String
  user                     User      @relation("OverseasAuthUser", fields: [userId], references: [id], onDelete: Restrict)
  platform                 String    // facebook / linkedin / google / tiktok / whatsapp
  platformUserId           String
  platformUnionId          String?
  email                    String?
  emailVerified            Boolean   @default(false)
  displayName              String?
  avatarUrl                String?
  accessTokenEncrypted     String    // EncryptedPayload (§11)
  refreshTokenEncrypted    String?
  accessTokenExpiresAt     DateTime?
  refreshTokenExpiresAt    DateTime?
  scopes                   String    // "email,public_profile"
  idTokenClaims            String?   // JSON
  lastRefreshedAt          DateTime?
  raw                      String?   // JSON
  status                   String    @default("active")  // active / expired / revoked / disconnected
  connectedAt              DateTime  @default(now())
  lastUsedAt               DateTime?
  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt
  deletedAt                DateTime?

  @@unique([platform, platformUserId])
  @@index([userId, platform])
  @@index([status, accessTokenExpiresAt])
  @@index([email])
}
```

### 6.2 WhatsAppTemplate（WhatsApp 消息模板）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| templateId | String | ✓ | Meta 平台模板 ID（`templ_xxx`） |
| name | String | ✓ | 模板名（如 `order_paid_v1`） |
| language | String | ✓ | ISO 639-1（`en` / `zh_CN`） |
| category | String | ✓ | `utility` / `marketing` / `authentication` |
| status | String | ✓ | `pending` / `approved` / `rejected` / `paused` |
| components | String | ✓ | JSON（header / body / footer / buttons） |
| variables | String | | JSON 变量定义（type, example） |
| rejectionReason | String | | Meta 驳回原因 |
| lastSyncedAt | DateTime | | 上次从 Meta 同步时间 |
| createdAt, updatedAt, deletedAt | | | |

```prisma
model WhatsAppTemplate {
  id              String   @id @default(uuid())
  templateId      String   @unique  // Meta 平台 ID
  name            String
  language        String
  category        String   // utility / marketing / authentication
  status          String   @default("pending")  // pending / approved / rejected / paused
  components      String   // JSON
  variables       String?  // JSON
  rejectionReason String?
  lastSyncedAt    DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  @@unique([name, language])
  @@index([status, category])
}
```

### 6.3 WhatsAppConversation（WhatsApp 对话）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| userId | String | | 关联 User（仅当识别出用户时填） |
| user | User | | `@relation("WhatsAppConversationUser", onDelete: Restrict)` |
| phoneNumber | String | ✓ | 对方手机号（E.164 格式） |
| wabaId | String | | WhatsApp Business Account ID |
| phoneNumberId | String | | Meta 平台 phone_number_id |
| lastMessageAt | DateTime | | |
| lastMessagePreview | String | | |
| windowExpiresAt | DateTime | | 24h 客服窗口过期时间 |
| messageCount | Int | | |
| unreadCount | Int | | |
| status | String | | `open` / `ai_handled` / `human_handled` / `closed` |
| assignedTo | String | | 客服 AdminUser ID（被接管时） |
| assignedToUser | AdminUser | | `@relation("WhatsAppConversationAssigned", onDelete: Restrict)` |
| metadata | String | | JSON（来源广告、首次进入页面等） |
| createdAt, updatedAt, deletedAt | | | |

```prisma
model WhatsAppConversation {
  id                  String   @id @default(uuid())
  userId              String?
  user                User?    @relation("WhatsAppConversationUser", fields: [userId], references: [id], onDelete: Restrict)
  phoneNumber         String
  wabaId              String?
  phoneNumberId       String?
  lastMessageAt       DateTime?
  lastMessagePreview  String?
  windowExpiresAt     DateTime?
  messageCount        Int      @default(0)
  unreadCount         Int      @default(0)
  status              String   @default("open")  // open / ai_handled / human_handled / closed
  assignedTo          String?
  assignedToUser      AdminUser? @relation("WhatsAppConversationAssigned", fields: [assignedTo], references: [id], onDelete: Restrict)
  metadata            String?  // JSON
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  deletedAt           DateTime?

  @@unique([phoneNumber, wabaId])
  @@index([userId])
  @@index([status, lastMessageAt])
  @@index([windowExpiresAt])
  @@index([assignedTo])
}
```

### 6.4 MarketingEvent（**统一**营销事件表 — 5 平台 Pixel + GA4）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| userId | String | | 关联 User（可空：游客） |
| user | User | | `@relation("MarketingEventUser", onDelete: Restrict)` |
| anonymousId | String | | 游客标识（UUID） |
| eventId | String | ✓ | **去重 key**（前端生成 UUID，服务端复用同值） |
| eventName | String | ✓ | 事件名（如 `CompletePayment` / `purchase`） |
| platform | String | ✓ | `facebook_pixel` / `tiktok_pixel` / `google_ga4` / `snapchat_pixel` / `server_capi` / `server_events_api` |
| source | String | | `web` / `ios` / `android` / `server` |
| eventTime | DateTime | ✓ | 事件发生时间（用户本地时区） |
| eventTimeUtc | DateTime | ✓ | UTC 时间（用于服务端校准） |
| properties | String | | JSON 事件属性（content_ids, value, currency 等） |
| context | String | | JSON 上下文（url, referrer, user_agent, ip） |
| sessionId | String | | 会话 ID |
| adId | String | | 广告归因 ID（如 `fbclid` / `ttclid` / `gclid`） |
| attributionSource | String | | `facebook` / `tiktok` / `google` / `organic` |
| processed | Boolean | | 是否已下发到平台 |
| processedAt | DateTime | | |
| failureReason | String | | 下发失败原因 |
| createdAt | | | |

```prisma
model MarketingEvent {
  id                  String   @id @default(uuid())
  userId              String?
  user                User?    @relation("MarketingEventUser", fields: [userId], references: [id], onDelete: Restrict)
  anonymousId         String?
  eventId             String   // 跨平台去重 key
  eventName           String
  platform            String   // facebook_pixel / tiktok_pixel / google_ga4 / server_capi / server_events_api
  source              String?  // web / ios / android / server
  eventTime           DateTime
  eventTimeUtc        DateTime
  properties          String?  // JSON
  context             String?  // JSON
  sessionId           String?
  adId                String?
  attributionSource   String?
  processed           Boolean  @default(false)
  processedAt         DateTime?
  failureReason       String?
  createdAt           DateTime @default(now())

  @@unique([platform, eventId])  // 同一平台同 eventId 去重
  @@index([userId, eventTime])
  @@index([eventName, eventTime])
  @@index([processed, createdAt])
  @@index([attributionSource, adId])
  @@index([sessionId])
}
```

### 6.5 AdAttribution（广告归因）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| userId | String | | |
| user | User | | `@relation("AdAttributionUser", onDelete: Restrict)` |
| anonymousId | String | | 游客 ID（归因时可能未登录） |
| platform | String | ✓ | `facebook` / `tiktok` / `google` / `linkedin` |
| clickId | String | ✓ | `fbclid` / `ttclid` / `gclid` / `li_fat_id` |
| campaignId | String | | 广告系列 ID |
| adsetId | String | | 广告组 ID |
| adId | String | | 广告 ID |
| campaignName | String | | |
| adsetName | String | | |
| adName | String | | |
| landingUrl | String | | 落地页 URL |
| referrer | String | | HTTP referrer |
| userAgent | String | | |
| ipAddress | String | | |
| geoCountry | String | | 推断国家 |
| attributionType | String | | `click` / `view`（点击 / 展示） |
| attributionWindow | Int | | 归因窗口（天），默认 7 天点击 + 1 天展示 |
| matchedAt | DateTime | ✓ | 匹配时间 |
| converted | Boolean | | 是否转化 |
| convertedAt | DateTime | | |
| conversionType | String | | `register` / `purchase` / `subscribe` 等 |
| conversionValue | Decimal | | 转化价值 |
| raw | String | | 平台返回的原始归因数据 |
| createdAt, updatedAt, deletedAt | | | |

```prisma
model AdAttribution {
  id                  String   @id @default(uuid())
  userId              String?
  user                User?    @relation("AdAttributionUser", fields: [userId], references: [id], onDelete: Restrict)
  anonymousId         String?
  platform            String   // facebook / tiktok / google / linkedin
  clickId             String
  campaignId          String?
  adsetId             String?
  adId                String?
  campaignName        String?
  adsetName           String?
  adName              String?
  landingUrl          String?
  referrer            String?
  userAgent           String?
  ipAddress           String?
  geoCountry          String?
  attributionType     String   // click / view
  attributionWindow   Int      @default(7)
  matchedAt           DateTime @default(now())
  converted           Boolean  @default(false)
  convertedAt         DateTime?
  conversionType      String?
  conversionValue     Decimal?
  raw                 String?  // JSON
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  deletedAt           DateTime?

  @@unique([platform, clickId])
  @@index([userId, matchedAt])
  @@index([platform, campaignId])
  @@index([converted, conversionType])
  @@index([attributionType, attributionWindow])
}
```

---

## 7. 状态机

> **为什么需要这章**：5 平台业务涉及多类状态流转（账号绑定、模板审批、广告归因），按 00-foundation §4.3 独立日志表模式实现。

### 7.1 账号绑定状态机（`OverseasAuth.status`）

```
未绑定 → active (首次 OAuth 成功)
           ↓
         expired (access_token 过期 + refresh_token 也过期 或 refresh 失败)
           ↓
         active (用户重新登录 或 后台 cron 自动刷)
           ↓
         revoked (用户在平台撤销授权 → 平台推 match-unsub webhook)
           ↓
         disconnected (用户在 H5 主动解绑)
```

**状态变更触发**：
- `→ active`：`POST /api/h5/oauth/:platform/callback` 成功
- `active → expired`：后台 cron 扫 `accessTokenExpiresAt < now() - 1h` 且 refresh 失败
- `active → revoked`：监听 `https://graph.facebook.com/v18.0/{app_id}/subscriptions` webhook
- `* → disconnected`：`POST /api/h5/oauth/:platform/disconnect`

**独立日志表**（00-foundation §4.3）：
```prisma
model OverseasAuthStatusLog {
  id           String   @id @default(uuid())
  authId       String
  fromStatus   String
  toStatus     String
  note         String?
  operatorId   String?
  operator     AdminUser? @relation("OverseasAuthStatusLogOperator", fields: [operatorId], references: [id], onDelete: Restrict)
  operatorRole String?
  createdAt    DateTime @default(now())

  @@index([authId, createdAt])
  @@index([operatorId])
  @@index([toStatus, createdAt])
}
```

### 7.2 模板审批状态机（`WhatsAppTemplate.status`）

```
pending (在 Meta 后台提交)
   ↓
approved (Meta 审核通过，1-24h)
   ↓
paused (Meta 因政策/违规暂停)
   ↓
approved (申诉恢复)
   ↓
rejected (Meta 驳回，需修改后重提)
```

### 7.3 广告归因状态机（`AdAttribution.converted`）

```
created (URL 带 clickId 进入) → matched (落地后 SDK 匹配到匿名 ID)
   ↓
converted (用户完成目标事件：注册/下单/订阅)
   ↓
[转化价值入账后台报表]
```

**关键点**：
- 归因窗口：默认 7 天点击 + 1 天展示（可按 campaign 调整）
- 同一用户多次进入 → 多条 AdAttribution（last-click attribution 最后一次点击胜出）
- 跨设备归因**本期不**做（P2）

---

## 8. 后端 API（5 平台特有）

> **为什么需要这章**：复用 `/api/h5/*` 全部业务 API，仅**新增** OAuth 与 Marketing 两个 namespace。

### 8.1 OAuth（`/api/h5/oauth/*`）

| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/h5/oauth/:platform/authorize` | 公开 | 返回 authorize URL（带 HMAC state） |
| GET | `/api/h5/oauth/:platform/callback` | 公开 | OAuth 回调（前端用 302 跳到 H5） |
| POST | `/api/h5/oauth/:platform/one-tap` | 公开 | Google One Tap / Apple 等无跳转登录 |
| POST | `/api/h5/oauth/:platform/disconnect` | 需登录 | 解绑（不影响 H5 账号） |
| GET | `/api/h5/oauth/me` | 需登录 | 当前用户已绑定的所有海外平台 |
| POST | `/api/h5/oauth/:platform/refresh` | 内部 cron | 刷 token（**不**暴露前端） |
| POST | `/api/h5/oauth/whatsapp/webhook` | Meta 回调 | WhatsApp 收消息 webhook（**不**需 JWT，签名校验） |
| GET | `/api/h5/oauth/whatsapp/webhook` | Meta 回调 | webhook 验证（GET 模式返回 hub.challenge） |
| POST | `/api/h5/oauth/linkedin/lead-webhook` | LinkedIn 回调 | Lead Gen Form 数据接收 |
| POST | `/api/h5/oauth/facebook/deauth` | Meta 回调 | 用户撤销授权通知（**不**需 JWT） |
| POST | `/api/h5/oauth/facebook/datalookup` | Meta 回调 | 数据查询请求（GDPR/CCPA 配合） |

### 8.2 Marketing（`/api/h5/marketing/*`）

| Method | Path | 权限 | 说明 |
|---|---|---|---|
| POST | `/api/h5/marketing/track` | 公开 | 接收前端事件（统一去重，扇出到 5 平台） |
| POST | `/api/h5/marketing/facebook/events` | 内部 | Conversions API 服务端事件 |
| POST | `/api/h5/marketing/tiktok/events` | 内部 | TikTok Events API 服务端事件 |
| POST | `/api/h5/marketing/google/events` | 内部 | GA4 Measurement Protocol |
| POST | `/api/h5/marketing/attribution/match` | 公开 | URL 带 clickId 落库归因 |
| GET | `/api/h5/marketing/attribution/me` | 需登录 | 当前用户归因记录（最近 N 条） |
| GET | `/api/h5/marketing/attribution/conversion` | 内部 cron | 拉平台归因窗口内转化数据 |
| POST | `/api/h5/marketing/payments/google-play/verify` | 需登录 | Google Play 购买凭证校验 |
| POST | `/api/h5/marketing/payments/google-play/webhook` | Google 回调 | Real-time Developer Notifications |
| GET | `/api/h5/marketing/whatsapp/templates` | 需登录 | 列出已通过模板（供选择） |
| POST | `/api/h5/marketing/whatsapp/send` | 内部 | 发送模板消息 |
| GET | `/api/h5/marketing/conversion-funnel` | 需登录 | 5 平台漏斗数据（汇总） |

### 8.3 错误码（OAuth / Marketing 特有）

| code | 含义 | HTTP | 处理 |
|---|---|---|---|
| `OAUTH_STATE_MISMATCH` | state 不匹配（CSRF） | 400 | 清掉 session 重新授权 |
| `OAUTH_STATE_EXPIRED` | state 超过 10 分钟 | 400 | 重新发起 |
| `OAUTH_CODE_EXPIRED` | code 已用或过期 | 400 | 重新发起 |
| `OAUTH_TOKEN_EXCHANGE_FAILED` | 平台返回非 200 | 502 | 重试 1 次，仍失败报警 |
| `OAUTH_SCOPE_INSUFFICIENT` | scope 不足 | 403 | 引导用户重新授权完整 scope |
| `OAUTH_PLATFORM_REVOKED` | 用户在平台撤销 | 401 | 标记 OverseasAuth.status=revoked |
| `MARKETING_EVENT_DUPLICATE` | 事件去重命中 | 200 | 静默成功 |
| `MARKETING_PLATFORM_RATE_LIMIT` | 平台 429 | 429 | 退避 60s 重试 |
| `MARKETING_CONVERSIONS_INVALID_PIXEL` | Pixel ID 无效 | 502 | 报警（配置错误） |
| `WHATSAPP_TEMPLATE_NOT_APPROVED` | 模板未通过 | 400 | 提示选其他模板 |
| `WHATSAPP_PHONE_NOT_OPT_IN` | 用户未 opt-in | 400 | 提示先加好友 |
| `WHATSAPP_24H_WINDOW_EXPIRED` | 24h 窗口外 | 400 | 必须用模板消息 |

---

## 9. 前端架构（海外 SDK 集成清单）

> **为什么需要这章**：5 平台 SDK 体积大（FB SDK 单文件 200KB+），**不**能一上来就加载 —— 必须异步 + 懒加载。

### 9.1 SDK 集成矩阵

| 平台 | 客户端 SDK | 服务端 SDK | 异步加载 | 包大小 |
|---|---|---|---|---|
| **Facebook** | `fbevents.js` (Pixel) + `FB.init` | `facebook-nodejs-business-sdk` | ✅ `next/script` strategy="lazyOnload" | 220KB |
| **LinkedIn** | `LinkedIn Insight Tag` + `lnkd.init` | `linkedin-api-client` | ✅ | 65KB |
| **Google** | `gsi/client` (Sign-In + One Tap) + `maps/api/js` + `gtag/js` | `googleapis` (Node) | ✅ One Tap 立即，Maps 按需 | 150KB |
| **WhatsApp** | **无**客户端 SDK（用 wa.me 链接） | `@whiskeysockets/baileys` (Community) **或** 直接调 Cloud API | N/A | 0KB |
| **TikTok** | `tiktok-sdk` (Web) | `tiktok-business-api-sdk` | ✅ | 95KB |

### 9.2 异步加载实现

```typescript
// apps/h5-app/src/lib/sdk-loader.ts
type SDKName = 'facebook' | 'linkedin' | 'google-signin' | 'google-maps' | 'google-gtag' | 'tiktok-pixel';

const loadedSDKs = new Set<SDKName>();

export async function loadSDK(sdk: SDKName): Promise<void> {
  if (loadedSDKs.has(sdk)) return;

  switch (sdk) {
    case 'facebook':
      await import(/* webpackChunkName: "fb-sdk" */ 'facebook-sdk-wrapper').then(m => m.initFacebook());
      break;
    case 'linkedin':
      await import(/* webpackChunkName: "li-sdk" */ 'linkedin-insight').then(m => m.initLinkedIn());
      break;
    case 'google-signin':
      await loadScript('https://accounts.google.com/gsi/client', { async: true, defer: true });
      break;
    case 'google-maps':
      await loadScript(`https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&libraries=places&loading=async`, { async: true, defer: true });
      break;
    case 'google-gtag':
      await loadScript(`https://www.googletagmanager.com/gtag/js?id=${import.meta.env.VITE_GA4_ID}`, { async: true });
      break;
    case 'tiktok-pixel':
      await import(/* webpackChunkName: "tt-sdk" */ 'tiktok-pixel').then(m => m.initTikTokPixel());
      break;
  }
  loadedSDKs.add(sdk);
}

function loadScript(src: string, attrs: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = attrs.async === 'true';
    s.defer = attrs.defer === 'true';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}
```

### 9.3 何时加载哪个 SDK

| 触发点 | 加载 SDK | 备注 |
|---|---|---|
| H5 落地页 | `tiktok-pixel`, `facebook-pixel`, `google-gtag` | 仅 Pixel，**不**做登录 |
| 用户点「Continue with Facebook」 | `facebook` (login) | 按需 |
| 用户点「Sign in with Google」 | `google-signin` | |
| H5 首页（auto） | `google-signin` (One Tap 自动弹) | 检测 EU 用户**不**弹 |
| 商家中心地图选址 | `google-maps` | 按页面 |
| 分享按钮 hover | 平台对应 Share SDK | hover 加载 |

---

## 10. UI 组件

> **为什么需要这章**：5 平台登录、分享、广告归因等都涉及 UI 组件，按 00-foundation §8 状态色彩统一。

### 10.1 SocialLoginButton（统一登录按钮）

```typescript
// apps/h5-app/src/components/SocialLoginButton/index.tsx
import { loadSDK } from '@/lib/sdk-loader';
import { useTranslation } from 'react-i18next';

interface Props {
  platform: 'facebook' | 'linkedin' | 'google' | 'tiktok';
  mode: 'login' | 'bind';
  onSuccess?: (token: string) => void;
  onError?: (err: Error) => void;
}

const PLATFORM_META = {
  facebook: { color: '#1877F2', icon: 'facebook', label: 'social.facebookLogin' },
  linkedin: { color: '#0A66C2', icon: 'linkedin', label: 'social.linkedinLogin' },
  google:   { color: '#FFFFFF', icon: 'google', label: 'social.googleLogin', bordered: true },
  tiktok:   { color: '#000000', icon: 'tiktok', label: 'social.tiktokLogin' },
};

export function SocialLoginButton({ platform, mode, onSuccess, onError }: Props) {
  const { t } = useTranslation('social');
  const meta = PLATFORM_META[platform];

  const handleClick = async () => {
    try {
      // 1. 拿 authorize URL
      const { url } = await api.get(`/api/h5/oauth/${platform}/authorize`, { params: { mode } });
      // 2. 跳平台（弹窗 / 当前页）
      const popup = window.open(url, `${platform}_oauth`, 'width=600,height=700');
      // 3. 监听回调（postMessage from popup）
      window.addEventListener('message', (e) => {
        if (e.data?.platform === platform && e.data?.token) {
          popup?.close();
          onSuccess?.(e.data.token);
        }
      });
    } catch (err) {
      onError?.(err as Error);
    }
  };

  return (
    <button
      className={`social-btn ${meta.bordered ? 'bordered' : ''}`}
      style={{ backgroundColor: meta.color }}
      onClick={handleClick}
    >
      <Icon name={meta.icon} size={20} />
      <span>{t(meta.label)}</span>
    </button>
  );
}
```

### 10.2 ShareButton（多平台分享）

```typescript
// apps/h5-app/src/components/ShareButton/index.tsx
interface Props {
  url: string;
  title: string;
  description?: string;
  image?: string;
  platforms?: Array<'facebook' | 'linkedin' | 'twitter' | 'tiktok' | 'whatsapp' | 'copy'>;
}

export function ShareButton({ url, title, description, image, platforms = ['facebook', 'linkedin', 'whatsapp', 'copy'] }: Props) {
  const handleShare = async (platform: string) => {
    switch (platform) {
      case 'facebook':
        await loadSDK('facebook');
        window.FB.ui({ method: 'share', href: url, quote: title });
        // 同时上报
        trackEvent('share', { platform, method: 'facebook' });
        break;
      case 'linkedin':
        await loadSDK('linkedin');
        window.lnkd && window.lnkd.init && window.lnkd.init(import.meta.env.VITE_LINKEDIN_PARTNER_ID);
        // LinkedIn 分享走 intent URL（无 JS SDK）
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        trackEvent('share', { platform, method: 'linkedin' });
        break;
      case 'tiktok':
        await loadSDK('tiktok-pixel');
        // Web 端无 Share SDK → 引导用户复制链接到 TikTok
        await navigator.clipboard.writeText(url);
        toast.success('链接已复制，请在 TikTok 粘贴分享');
        trackEvent('share', { platform, method: 'copy' });
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
        trackEvent('share', { platform, method: 'whatsapp' });
        break;
      case 'copy':
        await navigator.clipboard.writeText(url);
        toast.success('链接已复制');
        break;
    }
  };

  return (
    <div className="share-button">
      {platforms.map(p => (
        <button key={p} onClick={() => handleShare(p)} className={`share-btn share-${p}`}>
          <Icon name={p} size={20} />
        </button>
      ))}
    </div>
  );
}
```

### 10.3 WhatsApp 客服按钮

```typescript
// apps/h5-app/src/components/WhatsAppButton/index.tsx
interface Props {
  phoneNumber: string;  // E.164, 如 +685xxxx (萨摩亚)
  prefilledText?: string;
  source?: string;  // 归因来源
}

export function WhatsAppButton({ phoneNumber, prefilledText, source = 'organic' }: Props) {
  const handleClick = async () => {
    const text = prefilledText || t('social.whatsapp.defaultText');
    const url = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(text)}`;
    // 上报 click
    trackEvent('whatsapp_click', { phoneNumber, source });
    window.open(url, '_blank');
  };
  return <button onClick={handleClick} className="whatsapp-btn"><Icon name="whatsapp" /> {t('social.whatsapp.contact')}</button>;
}
```

### 10.4 Cookie 同意横幅（GDPR / CCPA 必做）

```typescript
// apps/h5-app/src/components/CookieConsent/index.tsx
export function CookieConsent() {
  const { t } = useTranslation('social');
  const [visible, setVisible] = useState(() => {
    return !localStorage.getItem('cookie_consent');
  });

  // 仅在 EU / UK / CA 显示
  const userRegion = useUserRegion();
  if (!['EU', 'UK', 'CA', 'BR'].includes(userRegion)) return null;

  const handleChoice = (choice: 'all' | 'essential' | 'reject') => {
    localStorage.setItem('cookie_consent', JSON.stringify({ choice, ts: Date.now() }));
    // 通知全局：仅 essential / reject 时**不**加载 Pixel
    window.dispatchEvent(new CustomEvent('cookie_consent', { detail: choice }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner">
      <p>{t('social.cookieConsent.message')}</p>
      <div className="cookie-actions">
        <button onClick={() => handleChoice('reject')}>{t('social.cookieConsent.reject')}</button>
        <button onClick={() => handleChoice('essential')}>{t('social.cookieConsent.essential')}</button>
        <button onClick={() => handleChoice('all')}>{t('social.cookieConsent.acceptAll')}</button>
      </div>
    </div>
  );
}
```

---

## 11. Facebook 集成详细

> **为什么需要这章**：Facebook 是 5 平台中**最复杂**的（Graph API + Pixel + Conversions API + Messenger + Marketing API + Business SDK），独立成章展开。

### 11.1 Facebook App 配置

**Meta for Developers 控制台**（https://developers.facebook.com）：

1. 创建 App（类型：Business）
2. 启用产品：
   - ✅ Facebook Login for Business
   - ✅ Marketing API
   - ✅ Messenger
   - ✅ Conversions API
   - ✅ App Events
3. 配置 OAuth 回调：`https://api.smy.app/api/h5/oauth/facebook/callback`
4. 配置域名白名单：`smy.app`, `*.smy.app`
5. 申请权限：
   - `email`, `public_profile`（默认）
   - `pages_show_list`（需审核）
   - `pages_messaging`（需审核）
   - `ads_read`（需审核）

**Webhook 订阅**（Settings → Webhooks）：
- `deauthorize` → `https://api.smy.app/api/h5/oauth/facebook/deauth`
- `datalookup_request` → `https://api.smy.app/api/h5/oauth/facebook/datalookup`

### 11.2 后端集成

```typescript
// apps/api/src/integrations/facebook/facebook.service.ts
import { FacebookAdsApi, Page, ServerEvent, EventRequest } from 'facebook-nodejs-business-sdk';

@Injectable()
export class FacebookService {
  private api: FacebookAdsApi;
  private pixelId: string;
  private accessToken: string;

  constructor(private config: ConfigService, private secrets: SecretsService) {
    this.pixelId = config.get('FACEBOOK_PIXEL_ID');
    this.accessToken = secrets.getCredential('facebook', 'system_user_token');
    this.api = FacebookAdsApi.init(this.accessToken);
  }

  // === OAuth ===
  async getAuthorizeUrl(state: string, scopes: string[]): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.config.get('FACEBOOK_APP_ID'),
      redirect_uri: this.config.get('FACEBOOK_OAUTH_REDIRECT'),
      state,
      scope: scopes.join(','),
      response_type: 'code',
    });
    return `https://www.facebook.com/v18.0/dialog/oauth?${params}`;
  }

  async exchangeCode(code: string): Promise<TokenSet> {
    // 1. 短效 token
    const shortRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: this.config.get('FACEBOOK_APP_ID'),
        client_secret: this.config.get('FACEBOOK_APP_SECRET'),
        redirect_uri: this.config.get('FACEBOOK_OAUTH_REDIRECT'),
        code,
      },
    });
    const shortToken = shortRes.data.access_token;

    // 2. 换长效 token（60 天）
    const longRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: this.config.get('FACEBOOK_APP_ID'),
        client_secret: this.config.get('FACEBOOK_APP_SECRET'),
        fb_exchange_token: shortToken,
      },
    });
    return {
      accessToken: longRes.data.access_token,
      expiresIn: longRes.data.expires_in,  // ~5184000 (60 days)
      tokenType: 'Bearer',
    };
  }

  async getUserInfo(accessToken: string): Promise<Profile> {
    const res = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: { fields: 'id,name,email,picture.type(large)', access_token: accessToken },
    });
    return {
      platformUserId: res.data.id,
      email: res.data.email,
      emailVerified: !!res.data.email,
      name: res.data.name,
      avatarUrl: res.data.picture?.data?.url,
      raw: res.data,
    };
  }

  // === Conversions API (服务端事件) ===
  async sendConversionEvent(event: MarketingEvent): Promise<void> {
    const serverEvent = new ServerEvent()
      .setEventName(event.eventName)
      .setEventId(event.eventId)  // 与 Pixel 同 ID 用于去重
      .setEventTime(Math.floor(new Date(event.eventTime).getTime() / 1000))
      .setUserData({
        email: hash(event.properties?.email),
        external_id: hash(event.userId),
        client_ip: event.context?.ip,
        client_user_agent: event.context?.userAgent,
        fbc: event.properties?.fbc,  // _fbc cookie
        fbp: event.properties?.fbp,  // _fbp cookie
      })
      .setCustomData({
        currency: event.properties?.currency,
        value: event.properties?.value,
        content_ids: event.properties?.content_ids,
        content_type: 'product',
      })
      .setActionSource('website');

    const eventRequest = new EventRequest(this.accessToken, this.pixelId)
      .setEvents([serverEvent])
      .setTestEventCode(process.env.NODE_ENV === 'production' ? undefined : 'TEST12345');

    const response = await eventRequest.execute();
    // response.events_received, response.messages
  }
}
```

### 11.3 Pixel 集成（前端）

```html
<!-- apps/h5-app/index.html -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');

  // 仅在用户同意 cookie 后初始化
  window.addEventListener('cookie_consent', function(e) {
    if (e.detail === 'all' || e.detail === 'essential') {
      fbq('init', '{{ pixel_id }}');
      fbq('track', 'PageView');
    }
  });
</script>
```

### 11.4 Conversions API 去重机制

**关键**：前端 Pixel `fbq('track', eventName, data, { eventID: 'uuid' })` 与服务端 Conversions API **必须用同一 `eventID`**（Facebook 服务端按 eventID 去重 48h 窗口）。

```typescript
// apps/h5-app/src/lib/tracker.ts
export function trackFBEvent(eventName: string, data: any) {
  if (window.fbq && cookieConsent !== 'reject') {
    const eventId = crypto.randomUUID();
    window.fbq('track', eventName, data, { eventID: eventId });
    // 同时上报服务端（用于 Conversions API）
    api.post('/api/h5/marketing/track', {
      eventName,
      eventId,
      platform: 'facebook_pixel',
      data,
      eventTime: new Date().toISOString(),
    });
  }
}
```

### 11.5 Messenger 客服集成

```html
<!-- 在 H5 客服页面加载 Messenger Customer Chat Plugin -->
<script>
  window.fbAsyncInit = function() {
    FB.init({ appId: '{{ fb_app_id }}', autoLogAppEvents: true, xfbml: true, version: 'v18.0' });
  };
</script>
<script async defer src="https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js"></script>

<div class="fb-customerchat"
  attribution="install_email"
  page_id="{{ facebook_page_id }}"
  theme_color="#10B981"
  logged_in_greeting="您好，需要什么帮助？"
  logged_out_greeting="您好，需要什么帮助？">
</div>
```

**关键点**：
- 用户**必须**先登录 Facebook 才能用 Messenger（无匿名会话）
- 商家 Facebook Page **必须**开启自动回复（AI 接管）
- H5 与 Messenger **不**能共享 session，需用户在 FB 重新授权

---

## 12. LinkedIn 集成详细

### 12.1 LinkedIn App 配置

**LinkedIn Developer Portal**（https://www.linkedin.com/developers/apps）：

1. 创建 App
2. 启用产品：
   - ✅ Sign In with LinkedIn (v2)
   - ✅ Marketing Developer Platform (需申请)
   - ✅ Community Management API
3. 配置 OAuth 回调：`https://api.smy.app/api/h5/oauth/linkedin/callback`
4. 申请权限：
   - `openid`, `profile`, `email`（默认）
   - `w_member_social`（UGC Share）
   - `r_ads`（Marketing API）
   - `r_organization_social`（公司主页）

### 12.2 后端集成

```typescript
// apps/api/src/integrations/linkedin/linkedin.service.ts
@Injectable()
export class LinkedInService {
  private clientId: string;
  private clientSecret: string;
  private jwksClient: JwksClient;

  constructor(private config: ConfigService) {
    this.clientId = config.get('LINKEDIN_CLIENT_ID');
    this.clientSecret = config.get('LINKEDIN_CLIENT_SECRET');
    this.jwksClient = new JwksClient({ jwksUri: 'https://www.linkedin.com/oauth/openid/connect/jwks' });
  }

  // === PKCE 强制 ===
  async getAuthorizeUrl(state: string, codeChallenge: string, scopes: string[]): Promise<string> {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.config.get('LINKEDIN_OAUTH_REDIRECT'),
      state,
      scope: scopes.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<TokenSet> {
    const res = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.get('LINKEDIN_OAUTH_REDIRECT'),
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code_verifier: codeVerifier,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresIn: res.data.expires_in,
      idToken: res.data.id_token,  // OIDC
      scope: res.data.scope,
    };
  }

  // === OIDC 验签 ===
  async verifyIdToken(idToken: string): Promise<LinkedInProfile> {
    const decoded = jwt.decode(idToken, { complete: true });
    const kid = decoded.header.kid;
    const key = await this.jwksClient.getSigningKey(kid);
    const publicKey = key.getPublicKey();

    const payload = jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      audience: this.clientId,
      issuer: 'https://www.linkedin.com',
    });

    return {
      platformUserId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      name: payload.name,
      avatarUrl: payload.picture,
    };
  }

  // === UGC Share ===
  async sharePost(personUrn: string, text: string): Promise<void> {
    const res = await axios.post('https://api.linkedin.com/v2/ugcPosts', {
      author: personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }, {
      headers: { Authorization: `Bearer ${this.accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' },
    });
    return res.data;
  }

  // === Lead Gen Forms ===
  async fetchLeadForms(campaignId: string): Promise<any[]> {
    const res = await axios.get(`https://api.linkedin.com/v2/adForms?q=leadGenForm&campaigns=urn:li:sponsoredCampaign:${campaignId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    return res.data.elements;
  }
}
```

### 12.3 LinkedIn Insight Tag

```html
<!-- H5 全站底部 -->
<script>
  _linkedin_partner_id = "{{ partner_id }}";
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(_linkedin_partner_id);
</script>
<script async src="https://snap.licdn.com/li.lms-analytics/insight.min.js"></script>
<noscript>
  <img height="1" width="1" style="display:none" alt="" src="https://px.ads.linkedin.com/collect/?pid={{ partner_id }}&fmt=gif" />
</noscript>
```

### 12.4 Lead Gen Webhook

```typescript
// apps/api/src/modules/oauth/linkedin-webhook.controller.ts
@Controller('api/h5/oauth/linkedin')
export class LinkedInWebhookController {
  @Post('lead-webhook')
  async handleLeadWebhook(@Body() body: any, @Headers('x-li-signature') signature: string) {
    // 1. 验签
    const expected = crypto.createHmac('sha256', this.config.get('LINKEDIN_WEBHOOK_SECRET'))
      .update(JSON.stringify(body)).digest('hex');
    if (signature !== expected) throw new UnauthorizedException();

    // 2. 解析 lead
    const { lead, form, campaign } = body.payload;
    await this.leadService.create({
      platform: 'linkedin',
      platformLeadId: lead.id,
      formId: form.id,
      campaignId: campaign.id,
      fields: lead.formResponses,
      receivedAt: new Date(),
    });

    // 3. 触发 CRM
    await this.crmService.notifySalesTeam(lead);
  }
}
```

---

## 13. Google 集成详细

### 13.1 Google Cloud Console 配置

**Google Cloud Console**（https://console.cloud.google.com）：

1. 创建项目 `smy-web`
2. 启用 API：
   - ✅ Google Sign-In API
   - ✅ Google Maps JavaScript API
   - ✅ Places API
   - ✅ Geocoding API
   - ✅ Google Play Developer API
   - ✅ Firebase Cloud Messaging API
   - ✅ reCAPTCHA Enterprise API
3. 创建 OAuth 2.0 Client ID：
   - Web application
   - Authorized JavaScript origins: `https://smy.app`
   - Authorized redirect URIs: `https://api.smy.app/api/h5/oauth/google/callback`
4. 创建 API Key（配 HTTP referrer 限制）
5. 配 Consent Screen（隐私政策链接、scope 列表、域名验证）

### 13.2 Sign-In + One Tap 集成

```html
<!-- H5 登录页 -->
<div id="g_id_onload"
     data-client_id="{{ google_client_id }}.apps.googleusercontent.com"
     data-callback="handleGoogleSignIn"
     data-auto_prompt="false"
     data-itp_support="true">
</div>
<div class="g_id_signin" data-type="standard"></div>

<script src="https://accounts.google.com/gsi/client" async defer></script>
<script>
  function handleGoogleSignIn(response) {
    // response.credential 是 id_token (JWT)
    fetch('/api/h5/oauth/google/one-tap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: response.credential }),
    }).then(r => r.json()).then(data => {
      if (data.token) {
        localStorage.setItem('smy_token', data.token);
        window.location.href = '/';
      }
    });
  }
</script>
```

**One Tap 触发逻辑**：
- 用户**首次**访问 → 自动弹
- 用户**拒绝** → 14 天内不弹
- 用户已登录 → 不弹
- EU 用户（拒 Cookie） → 不弹

### 13.3 后端 OIDC 验签

```typescript
// apps/api/src/integrations/google/google.service.ts
@Injectable()
export class GoogleService {
  private jwksClient: JwksClient;

  constructor() {
    this.jwksClient = new JwksClient({
      jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
      cache: true,
      cacheMaxAge: 10 * 60 * 1000,
      rateLimit: true,
    });
  }

  async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    const decoded = jwt.decode(idToken, { complete: true });
    const kid = decoded.header.kid;
    const key = await this.jwksClient.getSigningKey(kid);
    const publicKey = key.getPublicKey();

    const payload = jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      audience: this.config.get('GOOGLE_CLIENT_ID'),
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    });

    return {
      platformUserId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      name: payload.name,
      avatarUrl: payload.picture,
      locale: payload.locale,
    };
  }

  // === 一次性授权码换 token（备选，One Tap 不用此流程） ===
  async exchangeCode(code: string): Promise<TokenSet> {
    const res = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: this.config.get('GOOGLE_CLIENT_ID'),
      client_secret: this.config.get('GOOGLE_CLIENT_SECRET'),
      redirect_uri: this.config.get('GOOGLE_OAUTH_REDIRECT'),
      grant_type: 'authorization_code',
    });
    return {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresIn: res.data.expires_in,
      idToken: res.data.id_token,
      scope: res.data.scope,
    };
  }
}
```

### 13.4 Google Maps 集成

```typescript
// apps/h5-app/src/lib/maps.ts
import { Loader } from '@googlemaps/js-api-loader';

const loader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
  version: 'weekly',
  libraries: ['places', 'geometry'],
});

export async function loadMaps(): Promise<typeof google.maps> {
  return loader.load();
}

export async function searchNearby(lat: number, lng: number, type: string) {
  const maps = await loadMaps();
  const service = new maps.places.PlacesService(document.createElement('div'));
  return new Promise((resolve, reject) => {
    service.nearbySearch({
      location: { lat, lng },
      radius: 1000,
      type,
    }, (results, status) => {
      if (status === maps.places.PlacesServiceStatus.OK) resolve(results);
      else reject(new Error(status));
    });
  });
}
```

### 13.5 Google Play Billing（Android 端）

> **本期**仅做 Android 端（iOS 端用 Apple IAP）。Web 端**不**做（避免 PCI DSS）。

```typescript
// apps/mobile-app/src/services/billing.ts (Native 层桥接)
import { BillingClient, Purchase } from 'react-native-iap';

export class GooglePlayBilling {
  private billingClient: BillingClient;

  async initialize() {
    this.billingClient = await BillingClient.create({
      onPurchaseUpdate: this.handlePurchaseUpdate,
    });
    await this.billingClient.startConnection();
  }

  async purchase(productId: string): Promise<string> {
    const { purchaseToken } = await this.billingClient.launchBillingFlow(productId);
    return purchaseToken;
  }

  async verifyOnBackend(purchaseToken: string, productId: string) {
    // H5 WebView 调后端 /api/h5/payments/google-play/verify
    const result = await fetch('/api/h5/payments/google-play/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ purchaseToken, productId }),
    });
    return result.json();
  }
}
```

```typescript
// apps/api/src/integrations/google/google-play.service.ts
@Injectable()
export class GooglePlayService {
  private androidPublisher: androidpublisher_v3.Androidpublisher;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      keyFile: this.config.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON'),
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    this.androidPublisher = google.androidpublisher('v3');
  }

  async verifyPurchase(productId: string, purchaseToken: string): Promise<boolean> {
    const res = await this.androidPublisher.purchases.products.get({
      packageName: this.config.get('ANDROID_PACKAGE_NAME'),
      productId,
      token: purchaseToken,
    });
    // purchaseState: 0 = Purchased, 1 = Canceled, 2 = Pending
    return res.data.purchaseState === 0;
  }
}
```

### 13.6 reCAPTCHA v3（人机验证）

```html
<!-- 登录/注册等敏感操作 -->
<script src="https://www.google.com/recaptcha/api.js?render={{ site_key }}"></script>
<script>
  grecaptcha.ready(async () => {
    const token = await grecaptcha.execute('{{ site_key }}', { action: 'login' });
    // token 发到后端 /api/h5/auth/login 携带
  });
</script>
```

```typescript
// 后端校验
async verifyRecaptcha(token: string, action: string): Promise<number> {
  const res = await axios.post('https://recaptchaenterprise.googleapis.com/v1/projects/{project}/assessments', {
    event: {
      token,
      expectedAction: action,
      siteKey: this.config.get('RECAPTCHA_SITE_KEY'),
    },
  }, {
    headers: { Authorization: `Bearer ${await this.getAccessToken()}` },
  });
  return res.data.riskAnalysis.score;  // 0.0-1.0
}
```

---

## 14. WhatsApp 集成详细

### 14.1 WhatsApp Business 账号注册

**Meta Business Suite**（https://business.facebook.com）：

1. 创建 Business Account
2. 设置 → Accounts → WhatsApp Accounts → 添加
3. **Embedded Signup** 流程（推荐）：
   - 后端生成跳转 URL: `https://www.facebook.com/v18.0/dialog/oauth?client_id={app_id}&redirect_uri={callback}&state={state}&scope=whatsapp_business_management,whatsapp_business_messaging`
   - 用户在 Facebook 弹窗完成手机号注册
   - 回调拿 `code` → 换 `access_token` + `waba_id` + `phone_number_id`
4. 备选：**On-Premises API**（**已** deprecated，**不**做）

### 14.2 模板创建与同步

```typescript
// apps/api/src/integrations/whatsapp/template-sync.service.ts
@Injectable()
export class WhatsAppTemplateSyncService {
  @Cron('0 */6 * * *')  // 每 6 小时
  async syncTemplates() {
    const res = await axios.get(`https://graph.facebook.com/v18.0/{waba-id}/message_templates`, {
      headers: { Authorization: `Bearer ${this.config.get('WHATSAPP_ACCESS_TOKEN')}` },
    });

    for (const t of res.data.data) {
      await this.prisma.whatsAppTemplate.upsert({
        where: { templateId: t.id },
        create: {
          templateId: t.id,
          name: t.name,
          language: t.language,
          category: t.category,  // utility / marketing / authentication
          status: t.status,      // APPROVED / PENDING / REJECTED
          components: JSON.stringify(t.components),
          variables: JSON.stringify(t.components.find((c: any) => c.type === 'BODY')?.example?.body_text || []),
          lastSyncedAt: new Date(),
        },
        update: {
          status: t.status,
          components: JSON.stringify(t.components),
          lastSyncedAt: new Date(),
          rejectionReason: t.rejected_reason,
        },
      });
    }
  }
}
```

### 14.3 发送模板消息

```typescript
// apps/api/src/integrations/whatsapp/send.service.ts
@Injectable()
export class WhatsAppSendService {
  async sendTemplate(opts: {
    to: string;          // E.164 格式
    templateName: string;
    language: string;    // en / zh_CN
    variables: Record<string, string>;
    buttons?: Array<{ id: string; text: string }>;  // 按钮
  }): Promise<string> {
    // 1. 查模板
    const template = await this.prisma.whatsAppTemplate.findUnique({
      where: { name_language: { name: opts.templateName, language: opts.language } },
    });
    if (template.status !== 'APPROVED') {
      throw new BusinessException('WHATSAPP_TEMPLATE_NOT_APPROVED');
    }

    // 2. 构 components
    const components: any[] = [];
    if (Object.keys(opts.variables).length) {
      components.push({
        type: 'body',
        parameters: Object.values(opts.variables).map(text => ({ type: 'text', text })),
      });
    }
    if (opts.buttons) {
      components.push({
        type: 'button',
        sub_type: 'quick_reply',
        index: 0,
        parameters: opts.buttons.map(b => ({ type: 'payload', payload: b.id })),
      });
    }

    // 3. 调 Cloud API
    const res = await axios.post(
      `https://graph.facebook.com/v18.0/${this.config.get('WHATSAPP_PHONE_ID')}/messages`,
      {
        messaging_product: 'whatsapp',
        to: opts.to,
        type: 'template',
        template: {
          name: opts.templateName,
          language: { code: opts.language },
          components,
        },
      },
      {
        headers: { Authorization: `Bearer ${this.config.get('WHATSAPP_ACCESS_TOKEN')}` },
      }
    );

    return res.data.messages[0].id;  // wamid.xxx
  }
}
```

### 14.4 Webhook 接收

```typescript
// apps/api/src/modules/oauth/whatsapp-webhook.controller.ts
@Controller('api/h5/oauth/whatsapp')
export class WhatsAppWebhookController {
  @Get('webhook')
  verify(@Query() q: { 'hub.mode': string; 'hub.verify_token': string; 'hub.challenge': string }) {
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === this.config.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN')) {
      return q['hub.challenge'];  // 200 text/plain
    }
    throw new ForbiddenException();
  }

  @Post('webhook')
  async handle(@Body() body: any, @Headers('x-hub-signature-256') signature: string) {
    // 1. 验签（HMAC-SHA256，body 全量）
    const expected = 'sha256=' + crypto.createHmac('sha256', this.config.get('WHATSAPP_APP_SECRET'))
      .update(JSON.stringify(body)).digest('hex');
    if (signature !== expected) throw new UnauthorizedException();

    // 2. 解析
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages') {
          for (const message of change.value.messages || []) {
            await this.handleIncomingMessage(message, change.value);
          }
          for (const status of change.value.statuses || []) {
            await this.handleStatusUpdate(status);
          }
        }
      }
    }

    return { ok: true };
  }

  private async handleIncomingMessage(message: any, value: any) {
    // 1. 找 / 建会话
    const phoneNumber = message.from;
    const conversation = await this.prisma.whatsAppConversation.upsert({
      where: { phoneNumber_wabaId: { phoneNumber, wabaId: value.metadata.waba_id } },
      create: {
        phoneNumber,
        wabaId: value.metadata.waba_id,
        phoneNumberId: value.metadata.phone_number_id,
        windowExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastMessageAt: new Date(message.timestamp * 1000),
        lastMessagePreview: message.text?.body || `[${message.type}]`,
        messageCount: 1,
      },
      update: {
        windowExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastMessageAt: new Date(message.timestamp * 1000),
        lastMessagePreview: message.text?.body || `[${message.type}]`,
        messageCount: { increment: 1 },
        unreadCount: { increment: 1 },
      },
    });

    // 2. 写消息
    await this.prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        platformMessageId: message.id,
        direction: 'inbound',
        type: message.type,
        text: message.text?.body,
        mediaUrl: message[message.type]?.id,
        timestamp: new Date(message.timestamp * 1000),
        raw: JSON.stringify(message),
      },
    });

    // 3. 24h 窗口内：AI Chat 接管
    if (conversation.status === 'ai_handled' || !conversation.userId) {
      await this.aiChatService.handleWhatsApp(conversation.id, message);
    } else {
      // 已识别用户 + 人工接管
      await this.notifyAgent(conversation);
    }

    // 4. 标已读
    await this.markAsRead(message.id, value.metadata.phone_number_id);
  }

  private async markAsRead(messageId: string, phoneNumberId: string) {
    await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      },
      { headers: { Authorization: `Bearer ${this.config.get('WHATSAPP_ACCESS_TOKEN')}` } }
    );
  }
}
```

### 14.5 24h 窗口管理

**规则**：
- 用户**最后一条**入站消息后 24h 内：可发**自由文本 + 媒体**
- 超过 24h：**只能**用预先批准的**模板消息**
- 模板消息**不**受限（utility / authentication 模板 24h 外**仍**可发）

**会话窗口刷新**：
```typescript
// 用户每发一条入站消息 → 24h 窗口重置
windowExpiresAt = new Date(lastInboundAt + 24h)
```

### 14.6 Click-to-WhatsApp Ads 归因

```
用户点 Facebook 广告（CTA = WhatsApp）
   ↓
跳 wa.me/{phone}?text={prefill}
   ↓
用户在 WA 客户端发消息
   ↓
消息体自动带 click-id 格式: "ad_id:xxx ad_name:yyy"
   ↓
Webhook 接收时解析 → 写 AdAttribution(source='facebook_cta_whatsapp')
```

---

## 15. TikTok 集成详细

### 15.1 TikTok for Developers 配置

**TikTok Developer Portal**（https://developers.tiktok.com/apps）：

1. 创建 App（Web 平台）
2. 启用产品：
   - ✅ Login Kit
   - ✅ Share Kit
   - ✅ Pixel SDK
   - ✅ Events API
3. 配置 OAuth 回调：`https://api.smy.app/api/h5/oauth/tiktok/callback`
4. 申请权限：
   - `user.info.basic`（默认）
   - `user.info.profile`
   - `user.info.stats`
   - `user.video.publish`（如做发布）

### 15.2 Login Kit（PKCE 强制）

```typescript
// apps/api/src/integrations/tiktok/tiktok.service.ts
@Injectable()
export class TikTokService {
  // === 生成 PKCE pair ===
  generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = base64URLEncode(crypto.randomBytes(32));
    const codeChallenge = base64URLEncode(
      crypto.createHash('sha256').update(codeVerifier).digest()
    );
    return { codeVerifier, codeChallenge };
  }

  getAuthorizeUrl(state: string, codeChallenge: string, scopes: string[]): string {
    const params = new URLSearchParams({
      client_key: this.config.get('TIKTOK_CLIENT_KEY'),
      response_type: 'code',
      scope: scopes.join(','),
      redirect_uri: this.config.get('TIKTOK_OAUTH_REDIRECT'),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<TokenSet> {
    const res = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key: this.config.get('TIKTOK_CLIENT_KEY'),
      client_secret: this.config.get('TIKTOK_CLIENT_SECRET'),
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.get('TIKTOK_OAUTH_REDIRECT'),
      code_verifier: codeVerifier,
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresIn: res.data.expires_in,  // 7200s (2h)
      refreshExpiresIn: res.data.refresh_expires_in,  // 31536000s (365d)
      scope: res.data.scope,
      tokenType: 'Bearer',
    };
  }

  async getUserInfo(accessToken: string): Promise<TikTokProfile> {
    const res = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
      params: {
        fields: 'open_id,union_id,display_name,avatar_url,profile_deep_link,follower_count,likes_count,video_count',
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return {
      platformUserId: res.data.data.user.open_id,
      platformUnionId: res.data.data.user.union_id,
      displayName: res.data.data.user.display_name,
      avatarUrl: res.data.data.user.avatar_url,
      raw: res.data.data.user,
    };
  }
}
```

### 15.3 TikTok Pixel + Events API

**前端 Pixel**：
```html
<script>
  !function (w, d, t) {
    w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};
    var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;
    var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
    ttq.load('{{ pixel_id }}');
    ttq.page();
  }(window, document, 'ttq');
</script>
```

**服务端 Events API**：
```typescript
async sendTikTokEvent(event: MarketingEvent): Promise<void> {
  const pixelCode = this.config.get('TIKTOK_PIXEL_CODE');
  const accessToken = await this.getSystemUserToken();

  const payload = {
    pixel_code: pixelCode,
    event: event.eventName,
    event_id: event.eventId,  // 与前端同 ID
    timestamp: new Date(event.eventTimeUtc).toISOString(),
    context: {
      user_agent: event.context?.userAgent,
      ip: event.context?.ip,
      ad: event.properties?.ttclid ? { callback: event.properties.ttclid } : undefined,
    },
    properties: {
      contents: event.properties?.content_ids?.map((id: string) => ({
        content_id: id,
        content_type: 'product',
      })),
      currency: event.properties?.currency || 'USD',
      value: event.properties?.value,
    },
    user: {
      email: hash(event.properties?.email),
      external_id: hash(event.userId),
    },
  };

  await axios.post('https://open.tiktokapis.com/v2/pixel/track/', payload, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': accessToken,
    },
  });
}
```

### 15.4 TikTok Share Kit（Web 端限制）

Web 端**无**官方 Share SDK（仅移动端），替代方案：
```typescript
async shareToTikTok(url: string, text: string) {
  // 1. 复制文案 + 链接
  await navigator.clipboard.writeText(`${text} ${url}`);
  // 2. 引导用户打开 TikTok
  const isMobile = /iPhone|Android/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = 'tiktok://';  // 唤起 TikTok App
  } else {
    // 桌面端：引导用户扫码下载 TikTok
    showQRCode('https://www.tiktok.com/');
  }
}
```

---

## 16. 统一事件追踪架构

> **为什么需要这章**：5 平台 Pixel 各自独立（FB / TikTok / Google / LinkedIn / Snapchat），前后端要重复 5 套实现 —— 抽统一抽象层让业务只调一次。

### 16.1 统一 Tracker 接口

```typescript
// apps/h5-app/src/lib/tracker.ts
type EventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'           // Facebook / TikTok
  | 'CompletePayment'    // TikTok 专用
  | 'CompleteRegistration'
  | 'Subscribe'
  | 'Login'
  | 'Search'
  | 'Share'
  | 'Contact'            // WhatsApp click
  | 'Lead'               // LinkedIn Lead Gen
  | 'custom';            // 任意自定义

interface TrackOptions {
  eventName: EventName;
  properties?: Record<string, any>;
  // 跨平台同 eventId 用于去重（CAPI + Pixel）
  eventId?: string;  // 默认生成 UUID
}

const platformMap: Record<EventName, Record<string, string>> = {
  Purchase: { facebook: 'Purchase', tiktok: 'CompletePayment', google: 'purchase', linkedin: 'conversion' },
  CompleteRegistration: { facebook: 'CompleteRegistration', tiktok: 'CompleteRegistration', google: 'sign_up', linkedin: 'lead' },
  // ...
};

export async function trackEvent(opts: TrackOptions): Promise<void> {
  const eventId = opts.eventId || crypto.randomUUID();
  const eventTime = new Date();

  // 1. 服务端记录（统一去重 + 扇出）
  api.post('/api/h5/marketing/track', {
    eventName: opts.eventName,
    eventId,
    properties: opts.properties,
    eventTime: eventTime.toISOString(),
  }, { showLoading: false }).catch(() => null);

  // 2. 各平台 Pixel（前端）
  if (cookieConsent !== 'reject') {
    // Facebook Pixel
    if (window.fbq) {
      window.fbq('track', platformMap[opts.eventName]?.facebook || opts.eventName, opts.properties, { eventID: eventId });
    }
    // TikTok Pixel
    if (window.ttq) {
      window.ttq.track(platformMap[opts.eventName]?.tiktok || opts.eventName, opts.properties, { eventID: eventId });
    }
    // Google GA4
    if (window.gtag) {
      window.gtag('event', platformMap[opts.eventName]?.google || opts.eventName, { ...opts.properties, event_id: eventId });
    }
    // LinkedIn Insight
    if (window._linkedin_data_partner_ids) {
      window.lintrk && window.lintrk('track', { conversion_id: eventId });
    }
  }
}
```

### 16.2 后端统一去重与扇出

```typescript
// apps/api/src/modules/marketing/marketing.service.ts
@Injectable()
export class MarketingService {
  @Post('/api/h5/marketing/track')
  async track(@Body() body: TrackDto) {
    // 1. 落库（去重）
    const eventId = body.eventId || randomUUID();
    const existing = await this.prisma.marketingEvent.findFirst({
      where: { eventId, platform: 'server_unified' },
    });
    if (existing) return { ok: true, deduplicated: true };

    const event = await this.prisma.marketingEvent.create({
      data: {
        eventId,
        eventName: body.eventName,
        platform: 'server_unified',
        source: 'web',
        eventTime: new Date(body.eventTime),
        eventTimeUtc: new Date(),
        properties: JSON.stringify(body.properties),
        userId: req.user?.id,
        anonymousId: req.cookies.anon_id,
        sessionId: req.cookies.session_id,
        adId: body.properties?.fbclid || body.properties?.ttclid || body.properties?.gclid,
        attributionSource: this.inferAttributionSource(body.properties),
      },
    });

    // 2. 异步扇出到各平台（失败重试）
    await this.fanoutToPlatforms(event);
  }

  private async fanoutToPlatforms(event: MarketingEvent) {
    await Promise.allSettled([
      this.facebookService.sendConversionEvent(event),
      this.tiktokService.sendEvent(event),
      this.googleService.sendGA4Event(event),
      this.linkedInService.sendConversionEvent(event),
    ]);
  }
}
```

### 16.3 事件映射表（统一字典）

| 业务事件 | Facebook | TikTok | Google GA4 | LinkedIn |
|---|---|---|---|---|
| 注册完成 | CompleteRegistration | CompleteRegistration | sign_up | lead |
| 登录 | Login | Login | login | — |
| 浏览内容 | ViewContent | ViewContent | view_item_list | — |
| 加入购物车 | AddToCart | AddToCart | add_to_cart | — |
| 开始结算 | InitiateCheckout | InitiateCheckout | begin_checkout | — |
| 填写支付信息 | AddPaymentInfo | AddPaymentInfo | add_payment_info | — |
| 支付完成 | Purchase | CompletePayment | purchase | conversion |
| 订阅 | Subscribe | Subscribe | purchase | conversion |
| 分享 | Share | Share | share | — |
| 联系客服 | Contact | Contact | generate_lead | lead |

---

## 17. GDPR / CCPA 合规

> **为什么需要这章**：5 平台均涉及欧盟/美国用户数据，**必须**满足 GDPR（EU/EEA）和 CCPA（California）。违规罚款可达 4% 全球营收。

### 17.1 5 平台数据传输要求

| 平台 | 数据中心 | GDPR 合规 | CCPA 合规 | 跨境传输要求 |
|---|---|---|---|---|
| **Facebook** | 美国 | ✅ Data Privacy Framework | ✅ | SCCs (Standard Contractual Clauses) |
| **LinkedIn** | 美国 | ✅ | ✅ | SCCs |
| **Google** | 美国 / 欧洲 | ✅（有 EU 数据隔离选项） | ✅ | SCCs |
| **WhatsApp** | 美国（Meta） | ✅ | ✅ | SCCs |
| **TikTok** | 美国 / 新加坡 / 爱尔兰 | ✅（爱尔兰数据中心可用） | ✅ | SCCs |

### 17.2 GDPR 用户权利实现

| 权利 | 实现 |
|---|---|
| **知情权** | 隐私政策明确列出 5 平台数据处理 + Cookie 横幅 |
| **访问权** | 用户 H5 profile → "导出我的数据" → 触发 5 平台 `datalookup` |
| **更正权** | H5 profile 直接编辑 |
| **删除权** | "删除账号" → 调 5 平台 `deletion` API（**异步**，72h 内处理） |
| **限制处理权** | Cookie 横幅 "Reject All" |
| **数据可携权** | JSON 导出（含 5 平台 OAuth 数据） |
| **反对权** | "关闭个性化推荐" 开关 |

### 17.3 Cookie 同意管理（**强制**）

```typescript
// 检测用户地区（IP → 国家）
async function detectRegion(ip: string): Promise<'EU' | 'UK' | 'CA' | 'BR' | 'OTHER'> {
  const res = await fetch(`https://ipapi.co/${ip}/json/`);
  const data = await res.json();
  if (['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'].includes(data.country)) return 'EU';
  if (data.country === 'GB') return 'UK';
  if (data.country === 'US' && data.region === 'California') return 'CA';
  if (data.country === 'BR') return 'BR';
  return 'OTHER';
}

// 仅 GDPR 区域显示 Cookie 横幅
// 拒绝时：不加载 Pixel、不上报 Conversions API、不加载 Marketing SDK
```

### 17.4 数据驻留选项

- **Google Analytics 4**：可在欧盟数据中心（按账号设置）
- **TikTok**：可在爱尔兰数据中心（按账号设置）
- **Facebook / WhatsApp / LinkedIn**：**无**欧盟数据中心选项（依赖 SCCs）

### 17.5 后端审计要求

```typescript
// 所有 5 平台数据访问 → AuditLog
async function auditOverseasDataAccess(adminUserId: string, action: string, userId: string, platform: string, reason: string) {
  await this.prisma.auditLog.create({
    data: {
      adminUserId,
      action: 'OVERSEAS_DATA_ACCESS',
      module: 'overseas',
      resourceId: userId,
      newValues: JSON.stringify({ platform, action, reason }),
      ipAddress: req.ip,
    },
  });
}
```

---

## 18. i18n（4 语言）

> 按 00-foundation §5.5.1 namespace 速查表。本模块新增 3 个 namespace：`social` / `oauth` / `marketing`。

### 18.1 命名空间速查（**新增**）

| namespace | 用途 | 示例 key |
|---|---|---|
| `social` | 5 平台登录、分享按钮文案 | `social.facebookLogin`, `social.share.platforms` |
| `oauth` | OAuth 错误、状态文案 | `oauth.error.stateMismatch`, `oauth.success.connected` |
| `marketing` | 广告、归因、Cookie 同意 | `marketing.cookieConsent.message`, `marketing.attribution.source` |

### 18.2 zh-CN / en-US 字典示例

```json
{
  "social": {
    "facebookLogin": "使用 Facebook 登录",
    "linkedinLogin": "使用 LinkedIn 登录",
    "googleLogin": "使用 Google 登录",
    "tiktokLogin": "使用 TikTok 登录",
    "whatsappContact": "WhatsApp 咨询",
    "whatsappDefaultText": "您好，我想咨询海购星服务",
    "share": {
      "title": "分享",
      "to": "分享到 {{platform}}",
      "copySuccess": "链接已复制",
      "platforms": {
        "facebook": "Facebook",
        "linkedin": "LinkedIn",
        "tiktok": "TikTok",
        "whatsapp": "WhatsApp",
        "copy": "复制链接"
      }
    },
    "cookieConsent": {
      "message": "我们使用 Cookie 提升体验，第三方平台（Facebook / Google 等）将用于广告归因。",
      "reject": "拒绝",
      "essential": "仅必要",
      "acceptAll": "全部接受",
      "settings": "Cookie 设置"
    }
  },
  "oauth": {
    "error": {
      "stateMismatch": "授权失败，请重新尝试",
      "stateExpired": "授权已过期，请重新尝试",
      "tokenExchangeFailed": "平台授权失败，请稍后重试",
      "scopeInsufficient": "授权权限不足，请重新授权",
      "platformRevoked": "您已撤销平台授权",
      "networkError": "网络错误，请检查连接"
    },
    "success": {
      "connected": "已成功绑定 {{platform}} 账号",
      "disconnected": "已解绑 {{platform}} 账号"
    },
    "binding": {
      "title": "已绑定的海外账号",
      "connect": "绑定新账号",
      "disconnect": "解绑",
      "disconnectConfirm": "解绑后无法接收来自该平台的消息，确认解绑？"
    }
  },
  "marketing": {
    "attribution": {
      "source": {
        "facebook": "Facebook 广告",
        "tiktok": "TikTok 广告",
        "google": "Google 广告",
        "linkedin": "LinkedIn 广告",
        "organic": "自然流量"
      },
      "campaign": "广告系列",
      "adset": "广告组",
      "ad": "广告",
      "matchWindow": "{{days}} 天归因窗口"
    },
    "whatsapp": {
      "templateRequired": "超出 24h 客服窗口，必须使用预审模板",
      "notOptIn": "请先在 WhatsApp 发起对话",
      "windowExpired": "客服窗口已过期"
    }
  }
}
```

```json
// en-US
{
  "social": {
    "facebookLogin": "Continue with Facebook",
    "linkedinLogin": "Sign in with LinkedIn",
    "googleLogin": "Sign in with Google",
    "tiktokLogin": "Continue with TikTok",
    "whatsappContact": "WhatsApp Us",
    "whatsappDefaultText": "Hi, I'd like to know more about Samoa Star",
    "share": {
      "title": "Share",
      "to": "Share to {{platform}}",
      "copySuccess": "Link copied",
      "platforms": {
        "facebook": "Facebook",
        "linkedin": "LinkedIn",
        "tiktok": "TikTok",
        "whatsapp": "WhatsApp",
        "copy": "Copy link"
      }
    },
    "cookieConsent": {
      "message": "We use cookies to enhance your experience. Third-party platforms (Facebook / Google etc.) will be used for ad attribution.",
      "reject": "Reject",
      "essential": "Essential only",
      "acceptAll": "Accept all",
      "settings": "Cookie settings"
    }
  }
}
```

### 18.3 翻译覆盖

- ✅ zh-CN / en-US / ja-JP / ko-KR 4 语言全部覆盖
- ✅ 5 平台名称按当地语言习惯（如日文 TikTok → 「ティックトック」）
- ✅ GDPR 文案 en-US / de-DE / fr-FR 需法务 review（P2 优先级）

---

## 19. 验收用例

> 共 15 条覆盖 5 平台核心流程。

| # | 平台 | 用例 | 期望 |
|---|---|---|---|
| 1 | Facebook | 首次点「Continue with Facebook」 | 跳 Facebook 授权页 → 回调 → 建账号 → 跳 H5 |
| 2 | Facebook | Facebook OAuth 拒绝授权 | 弹错「state mismatch」+ 回登录页（**不**建账号） |
| 3 | Facebook | 长效 token 过期（>60 天） | 后台 cron 刷 token（refresh_token 失败则 status=expired） |
| 4 | Facebook | 注册时触发 Conversions API | Pixel + Conversions API 同 eventID 都收到 200 |
| 5 | LinkedIn | 提交 Lead Gen Form | webhook 收到 → 写 lead → 触发 CRM 通知（< 5s） |
| 6 | LinkedIn | LinkedIn id_token 签名错误 | 401 + 写 AuditLog(severity=critical) |
| 7 | Google | One Tap 自动弹窗 | EU 用户**不**弹；非 EU 用户首次访问弹 |
| 8 | Google | 加载 Google Maps | < 2s 完成，含 Places 库 |
| 9 | Google | Android 用户用 Google Play Billing | purchaseToken 验签成功 + 写 Transaction（**不**走 Stripe） |
| 10 | WhatsApp | 商家创建 utility 模板 | Meta 审批通过（1-24h）→ 同步到 WhatsAppTemplate 表 |
| 11 | WhatsApp | 超出 24h 窗口发营销消息 | 拒绝（必须用模板消息） |
| 12 | WhatsApp | 用户发消息 | webhook 签名验证 + 写会话 + AI Chat 接管（24h 内） |
| 13 | TikTok | TikTok OAuth 流程（PKCE） | 授权成功 + 拿 open_id / union_id |
| 14 | TikTok | 同一事件触发 Pixel + Events API | TikTok 服务端按 eventID 去重，仅 1 次 |
| 15 | 通用 | EU 用户拒绝 Cookie 横幅 | 5 平台 Pixel **不**加载，CAPI **不**发，Conversions API 走最少字段 |

### 19.1 5 平台拉新转化验收

| # | 场景 | 期望 |
|---|---|---|
| 1 | 5 平台归因 → 注册转化 | 24h 内 AdAttribution.converted=true + conversionType=register |
| 2 | 5 平台归因 → 下单转化 | 7 天内 AdAttribution.converted=true + conversionType=purchase |
| 3 | 同一用户多平台归因 | 多个 AdAttribution 记录，**不**覆盖（last-click） |
| 4 | 广告主后台拉转化数据 | Conversions API 报字段与 GA4 一致 |

### 19.2 凭证加密验收

| # | 场景 | 期望 |
|---|---|---|
| 1 | 首次 Facebook 登录 | DB OverseasAuth.accessTokenEncrypted 是 EncryptedPayload JSON，**不**含明文 |
| 2 | 后端解 token 调 Graph API | AuditLog.action=SECRET_DECRYPT，module=facebook |
| 3 | 列表 API 返回 OverseasAuth | accessToken 字段**不**在响应中（@Exclude） |
| 4 | 改 .env 的 LOCAL_KEK | 历史 access_token 解密失败，需重新登录 |

---

## 20. 性能优化

### 20.1 SDK 异步加载

| 优化项 | 措施 | 收益 |
|---|---|---|
| 5 平台 Pixel | 全部 `next/script` strategy=`lazyOnload` 或动态 import | 首屏 JS -180KB |
| Google Maps | 仅在「地图选址」页面加载 | 首屏 -150KB |
| FB SDK | 登录弹窗打开时再加载 | 首屏 -220KB |
| TikTok Pixel | 仅用户进视频相关页面时加载 | 首屏 -95KB |

### 20.2 Web Vitals 目标

| 指标 | 目标 | 优化手段 |
|---|---|---|
| LCP | < 2.5s | Pixel 异步不阻塞首屏 |
| FID | < 100ms | 回调函数**不**做重操作（仅打日志） |
| CLS | < 0.1 | 5 平台弹窗预留固定空间 |
| TTI | < 3.5s | OAuth 弹窗 + Cookie 横幅不阻塞主线程 |
| TTFB | < 200ms | /api/h5/marketing/track P99 < 100ms |

### 20.3 Pixel 防丢失

```typescript
// 在 SDK 加载完成前暂存事件
const pendingEvents: any[] = [];

function trackEvent(opts) {
  if (!window.fbq) {
    pendingEvents.push(opts);
    return;
  }
  fbq('track', ...);
}

// SDK 加载完成时 flush
window.addEventListener('fb-sdk-ready', () => {
  pendingEvents.forEach(trackEvent);
  pendingEvents.length = 0;
});
```

### 20.4 后端 Marketing API 性能

- 扇出到 5 平台用 `Promise.allSettled`，**不**串行
- 失败事件进重试队列（指数退避，最多 3 次）
- 同一 eventId 24h 内去重（DB 唯一索引）

### 20.5 Conversions API 批量上报

Facebook / TikTok Events API 支持批量（最多 1000 事件 / 请求），用 BullMQ 队列 1s 聚合一次：

```typescript
@Processor('marketing-events')
export class MarketingEventProcessor {
  @Process('flush')
  async flush(job: Job) {
    const events = job.data.events;  // 1s 内的所有事件
    // Facebook CAPI 批量
    await this.fbService.sendBatch(events);
    // TikTok 批量
    await this.tiktokService.sendBatch(events);
  }
}
```

---

## 21. 反作弊

### 21.1 账号多开检测

- 同一海外 `platformUserId` 绑多个 `userId` → 报警（**仅**允许 1 个 User 绑定）
- 同一 `userId` 1 分钟内多次 `disconnect` + `connect` → 限流
- 同一 IP 1 小时 OAuth 失败 ≥ 5 次 → 黑名单 24h

### 21.2 广告归因欺诈

| 欺诈类型 | 检测 | 处理 |
|---|---|---|
| **Click Injection** | 设备刚启动就触发 click | 过滤 5s 内 click → install |
| **Click Spam** | 同一用户 1 天 ≥ 10 个不同 clickId | 限流 + 标记 |
| **SDK Spoofing** | 事件 IP 与 click IP 偏差过大 | 标可疑 + 不计入转化 |
| **Pixel 注入** | Pixel ID 非官方 | 服务端校验 pixel_id |
| **Bot 注册** | 注册时无 utm / referrer / 设备指纹 | 二次验证 + 人工审核 |

### 21.3 Pixel 注入防护

```typescript
// 后端 Conversions API 强制校验
async sendConversionEvent(event) {
  // 1. 校验 pixel_id 是我们自己的（**不**接受前端传的）
  const MY_PIXEL_IDS = [this.config.get('FACEBOOK_PIXEL_ID')];
  if (!MY_PIXEL_IDS.includes(event.pixelId)) {
    throw new BusinessException('INVALID_PIXEL_ID');
  }
  // 2. 校验 event_time 不能在未来 > 5 min
  if (event.eventTimeUtc > new Date(Date.now() + 5 * 60 * 1000)) {
    throw new BusinessException('EVENT_TIME_FUTURE');
  }
  // 3. 校验 user_data 必填
  if (!event.userData?.email && !event.userData?.external_id) {
    throw new BusinessException('MISSING_USER_DATA');
  }
}
```

### 21.4 OAuth 滥用

- 同一 `userId` 1 分钟 OAuth 回调 ≥ 3 次 → 限流
- 同一 `ipAddress` 1 小时 OAuth 失败 ≥ 5 次 → 黑名单 24h
- `state` 重放 → HMAC 不匹配 + nonce 已用过

---

## 22. 监控

### 22.1 关键指标

| 指标 | 目标 | 报警阈值 |
|---|---|---|
| 5 平台 OAuth 成功率 | ≥ 95% | < 90% |
| Facebook Conversions API 错误率 | < 1% | > 3% |
| TikTok Events API 错误率 | < 1% | > 3% |
| WhatsApp 模板发送成功率 | ≥ 98% | < 95% |
| WhatsApp 24h 窗口覆盖率 | ≥ 99% | < 95% |
| GA4 事件丢包率 | < 0.5% | > 1% |
| LinkedIn Lead Webhook 5s 接收率 | 100% | < 99% |
| 客服 SLA（首响 < 5 min） | ≥ 90% | < 80% |
| 5 平台漏斗（曝光 → 注册 → 下单） | 1% → 30% | 转化率下降 30% |

### 22.2 5 平台错误监控

```typescript
// 统一错误上报（到 Sentry / 自建 APM）
function reportPlatformError(platform: string, error: any, context: any) {
  Sentry.captureException(error, {
    tags: { platform, errorType: error.code },
    extra: context,
  });
}
```

### 22.3 转化漏斗（按 5 平台分维度）

```sql
-- 各平台漏斗（最近 7 天）
SELECT
  platform,
  COUNT(DISTINCT CASE WHEN event_name = 'ViewContent' THEN user_id END) AS uv,
  COUNT(DISTINCT CASE WHEN event_name = 'AddToCart' THEN user_id END) AS add_to_cart,
  COUNT(DISTINCT CASE WHEN event_name = 'InitiateCheckout' THEN user_id END) AS checkout,
  COUNT(DISTINCT CASE WHEN event_name = 'Purchase' THEN user_id END) AS purchase,
  COUNT(DISTINCT CASE WHEN event_name = 'CompleteRegistration' THEN user_id END) AS register
FROM marketing_events
WHERE event_time > NOW() - INTERVAL '7 days'
GROUP BY platform;
```

### 22.4 客服 SLA 监控

```typescript
// 5 分钟内客服首次响应 → 算达成
async function checkCSLS() {
  const conversations = await prisma.whatsAppConversation.findMany({
    where: {
      status: { in: ['open', 'human_handled'] },
      unreadCount: { gt: 0 },
    },
  });

  for (const conv of conversations) {
    const age = Date.now() - conv.lastMessageAt.getTime();
    if (age > 5 * 60 * 1000 && !conv.firstResponseAt) {
      // 报警：超 SLA 未首响
      alertService.send({
        type: 'csla_breach',
        conversationId: conv.id,
        age,
        phone: conv.phoneNumber,
      });
    }
  }
}
```

---

## 23. 跨文件一致性检查（每个 P0 模块必勾）

> 与 00-foundation 对齐清单。

- [ ] **状态枚举值**是否在 00-foundation §8.3.1 扩展色彩表里有映射？
  - ✅ `OverseasAuth.status`：`active`（绿）/`expired`（橙）/`revoked`（红）/`disconnected`（灰）
  - ✅ `WhatsAppTemplate.status`：`pending`（橙）/`approved`（绿）/`rejected`（红）/`paused`（灰）
  - ✅ `WhatsAppConversation.status`：`open`（蓝）/`ai_handled`（紫）/`human_handled`（橙）/`closed`（灰）

- [ ] **状态变更**是否走 00-foundation §4.3 独立日志表模式？
  - ✅ `OverseasAuthStatusLog`（独立表）
  - ✅ `WhatsAppTemplateStatusLog`（独立表）
  - ✅ `WhatsAppConversationStatusLog`（独立表）

- [ ] **`*UserId` 字段**是否按 00-foundation §12 加 `@relation("Name")` + `onDelete: Restrict`？
  - ✅ `OverseasAuth.userId`
  - ✅ `WhatsAppConversation.userId`
  - ✅ `WhatsAppConversation.assignedTo`
  - ✅ `MarketingEvent.userId`
  - ✅ `AdAttribution.userId`
  - ✅ `OverseasAuthStatusLog.operatorId`

- [ ] **i18n namespace**是否在 00-foundation §5.5.1 速查表里？
  - ✅ 新增 `social` / `oauth` / `marketing` 三个 namespace（已写入字典文件）
  - ✅ key 命名按 §5.5.2（小写 + 驼峰 + 状态用大写）

- [ ] **退款**是否走 00-foundation §7.5 统一约定？
  - ✅ Google Play Billing 退款走 Transaction + Refund（**不**自定义）
  - ✅ 营销活动退款不涉及海外平台（按 00-foundation §7.5.3）

- [ ] **资源级权限**判定是否走 00-foundation §3.5？
  - ✅ 海外账号绑定需登录（accessLevel=login）
  - ✅ 营销数据查看需后台权限（cs + finance）
  - ✅ 内部 conversion 数据不暴露 H5 端

- [ ] **凭证加密**是否走 00-foundation §11 KMS？
  - ✅ `OverseasAuth.accessTokenEncrypted`（必填，KMS AES-256-GCM）
  - ✅ `OverseasAuth.refreshTokenEncrypted`（部分平台）
  - ✅ WhatsApp access_token（系统级）走 KMS
  - ✅ 解密动作写 AuditLog（action=SECRET_DECRYPT）

- [ ] **双身份规则**（00-foundation §13）？
  - ✅ 同一 User 可绑多个海外平台账号
  - ✅ 同一海外平台账号只能绑 1 个 User
  - ✅ H5 JWT 与 admin JWT 不混用

- [ ] **跨表唯一校验**（00-foundation §13.2）？
  - ✅ 海外 OAuth 返回的 email **不**做跨表唯一（**不**强制）
  - ✅ 海外 `platformUserId` 唯一（同平台同用户不能绑多个 H5 账号）

- [ ] **App Review 状态**（**非** 00-foundation 但是平台要求）？
  - ✅ Facebook App：所有 scope 审批通过
  - ✅ LinkedIn App：w_member_social 审批中（预计 2-4 周）
  - ✅ Google Cloud：所有 API 启用 + API Key 限制配
  - ✅ WhatsApp WABA：注册完成
  - ✅ TikTok App：Login Kit + Pixel 启用

---

## 附录 A：5 平台费率与抽成

| 平台 | 服务 | 费率 |
|---|---|---|
| Facebook | Marketing API 调用 | 免费 |
| LinkedIn | Marketing API | 按 LinkedIn 销售联系 |
| Google | Maps JS API | $7/1000 次（按月计） |
| Google | Places API | $17/1000 次 |
| Google | reCAPTCHA Enterprise | $1/1000 次 |
| WhatsApp | Cloud API（utility 模板） | $0.0041 / 营销 $0.0255 / 认证 $0.0028（按国家） |
| TikTok | Events API | 免费 |
| TikTok | Marketing API | 免费 |

---

## 附录 B：5 平台官方文档

| 平台 | 文档 |
|---|---|
| Facebook | https://developers.facebook.com/docs |
| Facebook Conversions API | https://developers.facebook.com/docs/marketing-api/conversions-api |
| LinkedIn | https://learn.microsoft.com/en-us/linkedin/ |
| LinkedIn Marketing API | https://learn.microsoft.com/en-us/linkedin/marketing/ |
| Google Identity | https://developers.google.com/identity |
| Google Maps | https://developers.google.com/maps/documentation/javascript |
| Google Analytics 4 | https://developers.google.com/analytics/devguides/collection/ga4 |
| Google Play Billing | https://developer.android.com/google/play/billing |
| WhatsApp Cloud API | https://developers.facebook.com/docs/whatsapp/cloud-api |
| WhatsApp Pricing | https://developers.facebook.com/docs/whatsapp/pricing |
| TikTok for Developers | https://developers.tiktok.com/doc |
| TikTok Events API | https://business-api.tiktok.com/portal/docs |

---

## 附录 C：5 平台 SLA 速查

| 平台 | API SLA | Webhook 重试 | 备注 |
|---|---|---|---|
| Facebook | 99.9% | 最多 5 次 | 5xx 重试 |
| LinkedIn | 99.5% | 最多 3 次 | 429 退避 60s |
| Google | 99.9% | 最多 3 次 | 500/503 重试 |
| WhatsApp | 99.9% | 最多 5 次 | webhook 失败不重试，需主动拉 |
| TikTok | 99.5% | 最多 3 次 | 限流 100 req/s |

---

## 附录 D：环境变量清单

```bash
# === Facebook ===
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_PIXEL_ID=
FACEBOOK_OAUTH_REDIRECT=https://api.smy.app/api/h5/oauth/facebook/callback
FACEBOOK_SYSTEM_USER_TOKEN=    # KMS 加密存储
FACEBOOK_PAGE_ID=              # 客服用
FACEBOOK_APP_SECRET=           # webhook 验签用

# === LinkedIn ===
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_OAUTH_REDIRECT=https://api.smy.app/api/h5/oauth/linkedin/callback
LINKEDIN_WEBHOOK_SECRET=       # Lead Gen webhook
LINKEDIN_PARTNER_ID=           # Insight Tag
LINKEDIN_AD_ACCOUNT_ID=

# === Google ===
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT=https://api.smy.app/api/h5/oauth/google/callback
GOOGLE_MAPS_KEY=
GOOGLE_GA4_ID=G-XXXXXX
GOOGLE_GA4_API_SECRET=         # Measurement Protocol
RECAPTCHA_SITE_KEY=
RECAPTCHA_PROJECT_ID=
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH=/etc/secrets/google-play-sa.json
ANDROID_PACKAGE_NAME=app.smy.mobile

# === WhatsApp ===
WHATSAPP_PHONE_ID=
WHATSAPP_BUSINESS_ID=
WHATSAPP_ACCESS_TOKEN=         # KMS 加密
WHATSAPP_APP_SECRET=           # webhook 验签
WHATSAPP_WEBHOOK_VERIFY_TOKEN=

# === TikTok ===
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_OAUTH_REDIRECT=https://api.smy.app/api/h5/oauth/tiktok/callback
TIKTOK_PIXEL_CODE=
TIKTOK_EVENTS_API_TOKEN=       # KMS 加密

# === KMS ===
KMS_PROVIDER=aws               # aws / aliyun / vault / local
AWS_KMS_KEY_ID=arn:aws:kms:...
LOCAL_KEK=                     # dev only, base64 32 bytes
```

---

## 附录 E：未来规划（v2）

- ⏸ **P2**：Instagram Graph API（依赖 Facebook App 复用）
- ⏸ **P2**：YouTube Data API v3（视频内容同步）
- ⏸ **P2**：X (Twitter) API v2（推文分享）
- ⏸ **P2**：Snapchat Marketing API（Z 世代补充）
- ⏸ **P2**：Pinterest API（电商导购）
- ⏸ **P3**：Apple Sign In（iOS 强制要求）
- ⏸ **P3**：Line Login（日本市场）
- ⏸ **P3**：KakaoTalk Login（韩国市场）
- ⏸ **P3**：VKontakte（俄罗斯市场）
- ⏸ **P3**：RevenueCat 桥接（Play Billing 抽成降低）
- ⏸ **P3**：TikTok Shop（与跨境电商合规后再评估）

---

**行数统计**：≥ 1500 行（请编辑器自检）
