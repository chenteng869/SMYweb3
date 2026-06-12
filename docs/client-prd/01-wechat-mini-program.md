# 01 · 微信小程序（WeChat Mini Program）

> **对应 H5**：H5 端全部 20 个菜单（**复用 H5 后端 API**，仅前端框架改为微信原生）
> **核心目标**：基于微信生态（10 亿+ 月活）做拉新裂变，重点覆盖社交分享、扫码、支付、订阅消息场景。
> **后端**：与 H5 端共用 `apps/api` NestJS 服务，前端只调 `/api/h5/*` 即可
> **前端**：微信原生小程序（**不**用 Taro / uni-app——团队 React 经验不迁移成本低，且调试更直接）

---

## 1. 业务目标

| 目标           | 指标                                  |
| -------------- | ------------------------------------- |
| 拉新成本       | 微信渠道 CAC < $1.5（vs H5 渠道 $5+） |
| 7 日留存       | ≥ 35%                                 |
| 分享裂变系数 K | ≥ 1.4（每用户带来 1.4 个新用户）      |
| 支付转化       | 小程序内支付成功率 ≥ 88%              |
| 服务号互通     | 服务号粉丝 ↔ 小程序用户绑定 ≥ 60%     |

---

## 2. 用户故事

| #    | 故事                                                        |
| ---- | ----------------------------------------------------------- |
| US-1 | 作为游客，我扫小程序码进入，看到 Discover 流（无需登录）    |
| US-2 | 作为新用户，我点"微信一键登录"完成授权 + 手机号绑定         |
| US-3 | 作为老用户，我分享 AI 名片给朋友，朋友点开直接看到我的名片  |
| US-4 | 作为 DLC 4 用户，我订阅"升级通知"模板，新推送通过服务号触达 |
| US-5 | 作为商家，我用小程序扫码登录 H5 admin-web 端                |
| US-6 | 作为客服，我在小程序内回复用户（用 AI Chat 接管）           |

---

## 3. 与 H5 的差异

### 3.1 复用部分（**后端 API 不动**）

- 所有 `/api/h5/*` 接口 100% 复用
- 所有 Prisma 数据模型 100% 复用
- i18n 字典文件复用（小程序端用 i18next 适配版）
- 业务状态机、权限点、审计日志全部复用

### 3.2 改造部分（**前端实现差异**）

| 维度       | H5                    | 小程序                                             | 改造点                           |
| ---------- | --------------------- | -------------------------------------------------- | -------------------------------- |
| 框架       | Vite + React 19       | 微信原生 (WXML/WXSS/JS)                            | 完全重写                         |
| 登录       | 手机号 + 密码 / OTP   | `wx.login()` 拿 code → 后端换 unionid              | 新增 `/api/h5/auth/wx-login`     |
| 支付       | Stripe / Alipay H5    | `wx.requestPayment()`                              | 新增 `WxPayController`           |
| 分享       | `navigator.share`     | `button open-type="share"` + `onShareAppMessage`   | —                                |
| 推送       | Web Push / FCM        | 微信订阅消息（一次性）+ 服务号模板（长期）         | 后端新增 `wechatPush.service.ts` |
| 支付结果   | 跳转 URL              | `wxpay.notify_url` 异步通知                        | 后端加 `WxPayCallback`           |
| 域名       | `https://smy.app`     | 后台 `request 合法域名` 需配 `https://api.smy.app` | 运维配置                         |
| 摄像头扫码 | `getUserMedia` + jsQR | `wx.scanCode()`                                    | —                                |
| 文件下载   | `<a download>`        | `wx.downloadFile()` + `wx.openDocument()`          | —                                |
| 后台保活   | —                     | 不需要                                             | —                                |

### 3.3 不支持的能力（明确告知产品）

- ❌ Web3 钱包（无 `window.ethereum`，DID 链上签名要靠「云端代理签名」或引导到 H5）
- ❌ Push API（用订阅消息替代）
- ❌ Service Worker（用 Storage 缓存替代）
- ❌ IndexedDB（用 `wx.setStorageSync` 限制 10MB / key）
- ❌ 跨域 fetch（通过 `wx.request` 解决，**只**支持 `request 合法域名`）

---

## 4. 业务流程

### 4.1 登录授权流程

```
┌──────────┐                ┌──────────┐                ┌──────────┐
│  小程序  │                │  后端    │                │ 微信服务 │
└────┬─────┘                └────┬─────┘                └────┬─────┘
     │  1. wx.login()            │                            │
     │ ──────────────────────►   │                            │
     │                           │  2. code2Session           │
     │                           │ ────────────────────────►  │
     │                           │ ◄───── openid+unionid ────│
     │                           │                            │
     │  3. /api/h5/auth/wx-login │                            │
     │    { code, encryptedData, iv }                          │
     │ ──────────────────────►   │                            │
     │                           │  4. 解密手机号 (可选)       │
     │                           │ ────────────────────────►  │
     │                           │ ◄─── phoneNumber ─────────│
     │                           │                            │
     │  5. { token, userInfo }   │                            │
     │ ◄────────────────────────│                            │
     │                           │                            │
```

**关键点**：

- `wx.login()` 不弹窗，仅拿临时 code（5 分钟有效）
- 拿手机号需用户**主动**点 `<button open-type="getPhoneNumber">`，触发弹窗
- 同一用户 unionid 唯一，openid 跟公众号/小程序各自独立

### 4.2 支付流程（小程序内购买服务）

```
1. 用户选服务 → POST /api/h5/services/:id/orders  → 后端生成 WxPay 预付单
2. 后端调微信 `unifiedorder` → 拿到 prepay_id + 签名参数
3. 返回 prepay_id 给前端
4. 前端调 wx.requestPayment({ timeStamp, nonceStr, package, signType, paySign })
5. 微信支付完成 → 微信异步通知 `WxPayCallback`
6. 后端验签 → 更新 Order.status = 'paid' → 触发 DLC 升级 / 发凭证
7. 后端向前端 WebSocket 推 `order.paid` 事件
8. 前端 toast "支付成功" + 跳详情
```

**关键点**：

- 必须在 `wx.requestPayment` 前**先**调后端创建订单拿 prepay（**不能**前端本地算）
- 异步通知可能 5s-30min 不等，前端不能**只**等异步，要 WebSocket 主动推
- 退款用 `wxpay.refund` API（独立接口，**不**走支付接口）

### 4.3 分享裂变流程（核心拉新路径）

```
用户 A 在「AI 名片」页点右上角分享
   ↓
触发 onShareAppMessage({ title, imageUrl, path })
   ↓
path = '/pages/card/detail?id=' + A.userId + '&from=share&ref=' + A.id
   ↓
好友 B 扫码进入（首次）或 点击（已有小程序）
   ↓
B 落地页解析 query:
   - ref = A.id  (邀请人)
   - from = share
   ↓
B 触发「注册绑定邀请人」API:
   POST /api/h5/invitations/bind { inviterId: A.id }
   ↓
后端写 InvitationLog，邀请关系永久保存（即使 B 后续改手机号也保留）
   ↓
A 收到"好友 X 加入了"推送（订阅消息）
   ↓
A 获得 DVC 奖励（200），B 获得注册奖励（100）
```

**关键点**：

- 分享图必须**预生成**（CDN），不要 `canvas` 实时画（性能差 + 容易超时）
- 分享文案要带"福利钩子"（如"扫码得 100 DVC + 1 次免费税务咨询"）
- 邀请关系绑定有 7 天有效期（超时未注册不返利）

---

## 5. 字段定义（小程序特有）

### 5.1 WechatUser（微信用户映射）

| 字段                            | 类型       | 必填 | 说明                                        |
| ------------------------------- | ---------- | ---- | ------------------------------------------- |
| id                              | String     | ✓    |                                             |
| userId                          | String     | ✓    | 关联 User.id (00-foundation §13 双身份允许) |
| openid                          | String(40) | ✓    | 小程序 openid，唯一                         |
| unionid                         | String(40) |      | 跨公众号/小程序 unionid                     |
| appid                           | String(40) | ✓    | 多小程序隔离                                |
| nickname                        | String     |      | 微信昵称                                    |
| avatarUrl                       | String     |      |                                             |
| phoneNumber                     | String     |      | 解密后手机号（用户授权后）                  |
| phoneAuthorized                 | Boolean    |      | 是否授权过手机号                            |
| lastLoginAt                     | DateTime   |      |                                             |
| lastShareAt                     | DateTime   |      | 上次分享时间（防刷）                        |
| createdAt, updatedAt, deletedAt |            |      | 通用                                        |

```prisma
model WechatUser {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation("WechatUserMapping", fields: [userId], references: [id], onDelete: Restrict)
  openid          String
  appid           String
  unionid         String?
  nickname        String?
  avatarUrl       String?
  phoneNumber     String?
  phoneAuthorized Boolean  @default(false)
  lastLoginAt     DateTime?
  lastShareAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  @@unique([appid, openid])
  @@index([userId])
  @@index([unionid])
}
```

### 5.2 InvitationLog（邀请关系）

| 字段             | 类型     | 必填 | 说明                                          |
| ---------------- | -------- | ---- | --------------------------------------------- |
| id               | String   | ✓    |                                               |
| inviterId        | String   | ✓    | 邀请人 userId                                 |
| inviteeId        | String   | ✓    | 被邀请人 userId                               |
| inviterRewardDvc | Decimal  |      | 邀请人奖励 DVC                                |
| inviteeRewardDvc | Decimal  |      | 被邀请人奖励 DVC                              |
| rewardStatus     | enum     | ✓    | `pending` / `granted` / `expired` / `revoked` |
| source           | enum     | ✓    | `share` / `qrcode` / `poster`                 |
| grantedAt        | DateTime |      |                                               |
| expiresAt        | DateTime | ✓    | 默认 +7 天                                    |
| createdAt        | DateTime |      |                                               |

```prisma
model InvitationLog {
  id               String   @id @default(uuid())
  inviterId        String
  inviteeId        String
  inviterRewardDvc Decimal  @default(0)
  inviteeRewardDvc Decimal  @default(0)
  rewardStatus     String   @default("pending")
  source           String   // share / qrcode / poster
  grantedAt        DateTime?
  expiresAt        DateTime
  createdAt        DateTime @default(now())

  inviter User @relation("Inviter", fields: [inviterId], references: [id], onDelete: Restrict)
  invitee User @relation("Invitee", fields: [inviteeId], references: [id], onDelete: Restrict)

  @@unique([inviterId, inviteeId])
  @@index([rewardStatus, expiresAt])
  @@index([inviterId, createdAt])
}
```

---

## 6. 状态机

### 6.1 微信支付订单

```
draft → wx_prepaid → paid → processing → completed
                          ↘ wx_refund_pending → partial_refunded ↔ refunded
                                         ↘ wx_refund_failed
        → cancelled
```

**触发条件**：

- `draft → wx_prepaid`：后端调 `unifiedorder` 成功
- `wx_prepaid → paid`：微信异步通知 `WxPayCallback` 验签成功
- `paid → wx_refund_pending`：用户/客服发起退款
- `wx_refund_pending → partial_refunded`：部分退款成功
- `wx_refund_failed` → 人工介入（`wx_refund_failed_reason` 字段记录）

### 6.2 邀请关系生命周期

```
created (用户扫码) → bound (新用户注册成功) → pending (7 天观察期)
                                                       ↓
                                              ┌────────┴────────┐
                                              ↓                 ↓
                                        granted (奖励发放)  expired (过期未达条件)
                                              ↓
                                         revoked (运营撤销)
```

---

## 7. 后端 API（小程序特有）

### 7.1 认证

| Method | Path                         | 权限   | 说明                                          |
| ------ | ---------------------------- | ------ | --------------------------------------------- |
| POST   | `/api/h5/auth/wx-login`      | 公开   | 微信一键登录（`code` + 可选 `encryptedData`） |
| POST   | `/api/h5/auth/wx-phone`      | 需登录 | 解密手机号（`getPhoneNumber` 回调）           |
| POST   | `/api/h5/auth/wx-bind-union` | 需登录 | 绑定 unionid（跨公众号/小程序）               |

### 7.2 支付

| Method | Path                           | 权限     | 说明                                  |
| ------ | ------------------------------ | -------- | ------------------------------------- |
| POST   | `/api/h5/payments/wx-prepay`   | 需登录   | 统一下单，返回 prepay 参数            |
| POST   | `/api/h5/payments/wx-callback` | 微信回调 | 验签 + 写 `paid` 状态（**不**需 JWT） |
| POST   | `/api/h5/payments/wx-refund`   | 需登录   | 申请退款                              |

### 7.3 邀请

| Method | Path                         | 权限      | 说明                                       |
| ------ | ---------------------------- | --------- | ------------------------------------------ |
| POST   | `/api/h5/invitations/bind`   | 需登录    | 绑定邀请关系（被邀请人调）                 |
| GET    | `/api/h5/invitations/me`     | 需登录    | 我的邀请统计（邀请人数 / 待奖励 / 已奖励） |
| GET    | `/api/h5/invitations/qrcode` | 需登录    | 生成个人小程序码（带 `ref` 参数）          |
| POST   | `/api/h5/invitations/grant`  | 内部 cron | 满足条件后自动发奖（**不**暴露给前端）     |

### 7.4 分享

| Method | Path                   | 权限   | 说明                       |
| ------ | ---------------------- | ------ | -------------------------- |
| POST   | `/api/h5/share/track`  | 需登录 | 记录分享行为（用于反作弊） |
| GET    | `/api/h5/share/poster` | 需登录 | 预生成分享海报 CDN URL     |

---

## 8. 前端架构

### 8.1 项目结构

```
miniprogram/
├── app.js                    # 全局入口
├── app.json                  # 全局配置（pages / tabBar / window）
├── app.wxss                  # 全局样式
├── project.config.json       # 小程序项目配置
├── sitemap.json              # 索引规则
├── pages/                    # 页面（与 H5 路由一一对应）
│   ├── index/                # /  Discover 首页
│   ├── discover/             # /discover
│   ├── services/             # /services
│   ├── ai/                   # /ai
│   ├── profile/              # /profile
│   ├── tax-calculator/
│   ├── legal-hub/
│   ├── video-center/
│   ├── media-center/
│   ├── ai-chat/
│   ├── company-register/
│   ├── payment-console/
│   ├── bank-account/
│   ├── dlc-level/
│   ├── documents/
│   ├── settings/
│   ├── notifications/
│   ├── did-identity/
│   └── ai-business-card/
├── components/               # 复用组件
│   ├── StatusBadge/          # 状态徽章（按 00-foundation §8.3.1 颜色）
│   ├── EmptyState/
│   ├── LoadingState/
│   └── ListView/             # 列表（下拉刷新 + 上拉加载）
├── utils/
│   ├── request.js            # wx.request 封装（自动加 token / 错误处理）
│   ├── auth.js               # 登录 / token 管理
│   ├── i18n.js               # 多语言（小程序版 i18next 适配）
│   └── share.js              # 分享 / 海报工具
├── services/                 # API client（与 H5 端 axios 调用一致）
└── images/                   # 图标 / 预生成海报
```

### 8.2 app.json 全局配置

```json
{
  "pages": [
    "pages/index/index",
    "pages/discover/discover",
    "pages/services/services",
    "pages/profile/profile",
    "...": "20 pages total"
  ],
  "tabBar": {
    "color": "#666666",
    "selectedColor": "#10B981",
    "backgroundColor": "#ffffff",
    "list": [
      { "pagePath": "pages/index/index", "text": "发现" },
      { "pagePath": "pages/services/services", "text": "服务" },
      { "pagePath": "pages/ai/ai", "text": "AI 大脑" },
      { "pagePath": "pages/profile/profile", "text": "我的" }
    ]
  },
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTitleText": "海购星",
    "navigationBarTextStyle": "black"
  },
  "permission": {
    "scope.userLocation": { "desc": "用于推荐附近服务" }
  },
  "requiredPrivateInfos": ["getLocation", "chooseLocation"],
  "lazyCodeLoading": "requiredComponents"
}
```

### 8.3 request.js 封装

```javascript
// utils/request.js
const API_BASE = 'https://api.smy.app';

class RequestError extends Error {
  constructor(code, message, errors) {
    super(message);
    this.code = code;
    this.errors = errors;
  }
}

async function request({ url, method = 'GET', data, header = {}, showLoading = true }) {
  const token = wx.getStorageSync('token');
  if (showLoading) wx.showLoading({ title: '加载中', mask: true });

  return new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        'X-Client': 'miniprogram',
        'X-Version': '1.0.0',
        ...header,
      },
      success: (res) => {
        if (showLoading) wx.hideLoading();
        const { statusCode, data: body } = res;
        if (statusCode !== 200) {
          reject(new RequestError(statusCode, `HTTP ${statusCode}`));
          return;
        }
        if (!body.success) {
          // 401 强制重新登录
          if (body.code === 401) {
            wx.removeStorageSync('token');
            wx.navigateTo({ url: '/pages/login/login' });
          }
          reject(new RequestError(body.code, body.message, body.errors));
          return;
        }
        resolve(body.data);
      },
      fail: (err) => {
        if (showLoading) wx.hideLoading();
        reject(new RequestError(-1, err.errMsg));
      },
    });
  });
}

module.exports = { request, RequestError };
```

### 8.4 登录实现

```javascript
// pages/login/login.js
const { request } = require('../../utils/request');

Page({
  data: { phoneAuthVisible: false },

  // 步骤 1：wx.login 拿 code 调后端
  async onWechatLogin() {
    try {
      const { code } = await wx.login();
      const data = await request({
        url: '/api/h5/auth/wx-login',
        method: 'POST',
        data: { code, appid: 'wx_your_appid' },
        showLoading: true,
      });

      if (data.needPhoneBind) {
        // 首次登录，需绑定手机号
        this.setData({ phoneAuthVisible: true });
        this._tempCode = code;
      } else {
        // 已绑定过，直接登录
        wx.setStorageSync('token', data.token);
        wx.setStorageSync('userInfo', data.user);
        this._onLoginSuccess();
      }
    } catch (err) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },

  // 步骤 2：用户授权手机号
  async onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '授权取消', icon: 'none' });
      return;
    }
    try {
      const data = await request({
        url: '/api/h5/auth/wx-phone',
        method: 'POST',
        data: {
          code: this._tempCode,
          encryptedData: e.detail.encryptedData,
          iv: e.detail.iv,
        },
      });
      wx.setStorageSync('token', data.token);
      wx.setStorageSync('userInfo', data.user);
      this._onLoginSuccess();
    } catch (err) {
      wx.showToast({ title: '绑定失败', icon: 'none' });
    }
  },

  _onLoginSuccess() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
```

```xml
<!-- pages/login/login.wxml -->
<view class="login-page">
  <image class="logo" src="/images/logo.png" mode="aspectFit" />
  <view class="title">海购星</view>
  <view class="subtitle">萨摩亚合规出海一站式平台</view>

  <button class="btn-primary" bindtap="onWechatLogin">
    微信一键登录
  </button>

  <view class="agreement">
    登录即同意 <text class="link">《用户协议》</text> <text class="link">《隐私政策》</text>
  </view>
</view>
```

### 8.5 分享实现

```javascript
// pages/card/detail.js
Page({
  onShareAppMessage() {
    const userId = wx.getStorageSync('userInfo').id;
    return {
      title: '我的 AI 名片，扫码加我好友',
      path: `/pages/card/detail?id=${userId}&from=share&ref=${userId}`,
      imageUrl: this.data.sharePosterUrl, // 预生成的 CDN 海报
    };
  },

  onShareTimeline() {
    return {
      title: '海购星 - 萨摩亚合规出海',
      query: `ref=${wx.getStorageSync('userInfo').id}`,
    };
  },
});
```

---

## 9. UI 组件

### 9.1 状态徽章（StatusBadge）

按 [00-foundation §8.3.1 扩展状态色彩表](../../admin-prd/00-foundation.md) 映射：

```html
<view class="status-badge" style="background-color: {{bgColor}}; color: {{textColor}}">
  {{statusText}}
</view>
```

```javascript
// components/StatusBadge/index.js
const STATUS_COLORS = {
  // 通用（来自 00-foundation §8.3.1）
  PENDING: { bg: '#F6A623', text: '#FFFFFF', label: '待处理' },
  PROCESSING: { bg: '#3B82F6', text: '#FFFFFF', label: '处理中' },
  REVIEWING: { bg: '#8B5CF6', text: '#FFFFFF', label: '审核中' },
  APPROVED: { bg: '#10B981', text: '#FFFFFF', label: '已通过' },
  REJECTED: { bg: '#EF4444', text: '#FFFFFF', label: '已驳回' },
  DISABLED: { bg: '#6B7280', text: '#FFFFFF', label: '已停用' },
  // 微信特有
  PAID: { bg: '#10B981', text: '#FFFFFF', label: '已支付' },
  REFUNDED: { bg: '#EF4444', text: '#FFFFFF', label: '已退款' },
  // ...
};
```

### 9.2 列表组件（ListView）

下拉刷新 + 上拉加载 + 空状态 + 错误状态：

```html
<view class="list-view">
  <view wx:if="{{loading && items.length === 0}}" class="loading-state">
    <view class="spinner" />
    <text>加载中...</text>
  </view>

  <view wx:elif="{{items.length === 0}}" class="empty-state">
    <image src="/images/empty.png" />
    <text>{{emptyText || '暂无数据'}}</text>
  </view>

  <view wx:elif="{{error}}" class="error-state">
    <image src="/images/error.png" />
    <text>加载失败</text>
    <button bindtap="onRetry">重试</button>
  </view>

  <view wx:else>
    <view
      wx:for="{{items}}"
      wx:key="id"
      class="list-item"
      bindtap="onItemTap"
      data-id="{{item.id}}"
    >
      <slot item="{{item}}" />
    </view>
    <view wx:if="{{loadingMore}}" class="loading-more">加载中...</view>
    <view wx:elif="{{!hasMore}}" class="no-more">- 没有更多了 -</view>
  </view>
</view>
```

### 9.3 i18n 适配

```javascript
// utils/i18n.js
const I18N = {
  'zh-CN': {
    'common.create': '创建',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.loading': '加载中...',
    'services.subscribe': '订阅',
    'wallet.balance': '余额',
    // ...
  },
  'en-US': {
    'common.create': 'Create',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.loading': 'Loading...',
    'services.subscribe': 'Subscribe',
    'wallet.balance': 'Balance',
    // ...
  },
  // ja-JP, ko-KR 同结构
};

function t(key, locale = 'zh-CN') {
  return I18N[locale]?.[key] || key;
}

module.exports = { t, I18N };
```

> **关键决策**：i18n namespace 严格按 [00-foundation §5.5](../../admin-prd/00-foundation.md) 速查表（如 `payment.txStatus.paid`），不自定义 key

---

## 10. 微信开发者工具配置

### 10.1 project.config.json

```json
{
  "miniprogramRoot": "./",
  "projectname": "smy-miniprogram",
  "appid": "wx_your_appid",
  "setting": {
    "urlCheck": true,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "minified": true,
    "newFeature": true,
    "uglifyFileName": false,
    "uploadWithSourceMap": true,
    "useCompilerModule": true,
    "userConfirmedUseCompilerModuleSwitch": false,
    "babelSetting": {
      "ignore": [],
      "disablePlugins": [],
      "outputPath": ""
    }
  },
  "compileType": "miniprogram",
  "libVersion": "3.0.0",
  "condition": {}
}
```

### 10.2 服务器域名白名单（运维必配）

在 [微信公众平台](https://mp.weixin.qq.com) → 开发 → 开发管理 → 服务器域名：

| 类型                      | 域名                                         |
| ------------------------- | -------------------------------------------- |
| **request 合法域名**      | `https://api.smy.app`                        |
| **uploadFile 合法域名**   | `https://api.smy.app`                        |
| **downloadFile 合法域名** | `https://cdn.smy.app`, `https://api.smy.app` |
| **socket 合法域名**       | `wss://ws.smy.app`                           |

**关键**：

- 必须是 HTTPS，且 SSL 证书要受信（推荐 Let's Encrypt / 阿里云）
- 域名需 ICP 备案
- 小程序正式版必须配（开发版可勾"不校验合法域名"）

### 10.3 业务域名

配置后可用 `web-view` 组件跳转 H5 页面：

- `https://smy.app`
- `https://admin.smy.app`

---

## 11. 微信支付配置

### 11.1 申请流程

1. 微信公众平台 → 微信支付 → 申请开通
2. 提交营业执照、法人身份证、对公账户
3. 审核 1-3 工作日
4. 获得 `mch_id`（商户号）+ API 密钥 v3
5. 下载商户证书（apiclient_cert.pem / apiclient_key.pem）

### 11.2 后端配置（环境变量）

```bash
# .env.production
WECHAT_MINIPROGRAM_APPID=wx_your_appid
WECHAT_MINIPROGRAM_SECRET=your_secret_here
WECHAT_PAY_MCH_ID=1234567890
WECHAT_PAY_API_KEY=v3_key_here
WECHAT_PAY_API_V3_KEY=32_byte_v3_key
WECHAT_PAY_CERT_PATH=/etc/secrets/wechat/apiclient_cert.pem
WECHAT_PAY_KEY_PATH=/etc/secrets/wechat/apiclient_key.pem
WECHAT_PAY_NOTIFY_URL=https://api.smy.app/api/h5/payments/wx-callback
```

### 11.3 微信支付 V3 签名

```typescript
// apps/api/src/modules/payments/wxpay.service.ts
import WxPay from 'wechatpay-node-v3';
import fs from 'fs';

@Injectable()
export class WxPayService {
  private pay: WxPay;

  constructor(private config: ConfigService) {
    this.pay = new WxPay({
      appid: this.config.get('WECHAT_MINIPROGRAM_APPID'),
      mchid: this.config.get('WECHAT_PAY_MCH_ID'),
      publicKey: fs.readFileSync(this.config.get('WECHAT_PAY_CERT_PATH')),
      privateKey: fs.readFileSync(this.config.get('WECHAT_PAY_KEY_PATH')),
      key: this.config.get('WECHAT_PAY_API_V3_KEY'),
    });
  }

  async createPrepay(params: {
    orderId: string;
    amount: number; // 单位：分
    description: string;
    openid: string;
  }): Promise<WxPrepayResult> {
    const result = await this.pay.transactions_native({
      description: params.description,
      out_trade_no: params.orderId,
      notify_url: this.config.get('WECHAT_PAY_NOTIFY_URL'),
      amount: { total: params.amount, currency: 'CNY' },
      payer: { openid: params.openid },
    });
    return result;
  }

  async verifyCallback(
    rawBody: string,
    signature: string,
    timestamp: string,
    nonce: string
  ): Promise<WxCallback> {
    // 验签 + 解密
    return this.pay.verify_sign({
      timestamp,
      nonce,
      body: rawBody,
      sign: signature,
    });
  }
}
```

---

## 12. 订阅消息（推送替代方案）

> 微信**没有**真正的 Push，必须用**订阅消息**（一次性）或**服务号模板**（长期）。

### 12.1 订阅消息（用户主动订阅）

```javascript
// 在关键节点弹出订阅授权
async onSubscribeNotification() {
  const tmplIds = [
    'template_id_1_for_dlc_upgrade',  // DLC 升级通知
    'template_id_2_for_payment',       // 支付结果
    'template_id_3_for_invitation',    // 邀请成功
  ];
  try {
    const res = await wx.requestSubscribeMessage({ tmplIds });
    // res[tmplId] === 'accept' 表示用户同意
    const accepted = Object.entries(res).filter(([_, v]) => v === 'accept').map(([k]) => k);
    // 上报后端（用于发奖激励）
    await request({
      url: '/api/h5/notifications/subscribe',
      method: 'POST',
      data: { tmplIds: accepted },
    });
    if (accepted.length > 0) {
      wx.showToast({ title: `已订阅 ${accepted.length} 项通知`, icon: 'success' });
    }
  } catch (err) {
    // 用户拒绝订阅，不阻断主流程
    console.warn('订阅失败', err);
  }
}
```

### 12.2 模板消息（必须从服务号发）

**核心原则**：

- 订阅消息**只能在用户产生交互时**发（如支付完成后 7 天内）
- 长期触达必须**引导用户关注服务号**，用服务号模板

```
┌────────────────────────────────────────────┐
│ 用户在 H5 / 小程序 / 官网 触发「升级 DLC」  │
│   ↓                                        │
│ 后端查 WechatUser.openid                   │
│   ↓                                        │
│ 查 ServiceAccountUnionid（绑定的服务号）   │
│   ↓                                        │
│ 服务号模板消息（可跨场景、不限时）         │
│   ↓                                        │
│ 用户收到微信服务号通知                      │
└────────────────────────────────────────────┘
```

### 12.3 模板 ID 申请

在微信公众平台 → 订阅消息 → 公共模板库 申请，每个业务场景单独申请：

| 场景     | 模板标题     | 关键词                                     |
| -------- | ------------ | ------------------------------------------ |
| DLC 升级 | 等级提升通知 | {{thing1.DATA}} 等级提升至 {{thing2.DATA}} |
| 支付成功 | 订单支付成功 | {{thing1.DATA}} 已支付 {{amount.DATA}} 元  |
| 邀请成功 | 好友加入     | {{name.DATA}} 通过你的邀请加入             |
| 凭证签发 | 凭证已签发   | {{thing1.DATA}} 凭证已签发，点击查看       |

---

## 13. i18n 多语言

按 [00-foundation §5.5](../../admin-prd/00-foundation.md) 速查表 — 小程序端 namespace 命名严格遵循。

小程序端 4 语言切换：

```javascript
// app.js
App({
  globalData: {
    locale: wx.getStorageSync('locale') || 'zh-CN',
  },
  onLaunch() {
    // 探测系统语言
    const systemInfo = wx.getSystemSystemInfoSync
      ? wx.getSystemSystemInfoSync()
      : wx.getSystemInfoSync();
    const sysLang = systemInfo.language; // 'zh_CN' / 'en' / 'ja' / 'ko'
    const map = { zh_CN: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR' };
    this.globalData.locale = map[sysLang] || 'zh-CN';
  },
});
```

---

## 14. 验收用例

### 14.1 登录流程

| #   | 用例               | 期望                                         |
| --- | ------------------ | -------------------------------------------- |
| 1   | 首次 wx.login      | 拿到 code，调后端拿 token + 跳转首页         |
| 2   | 已登录用户再次进入 | 静默登录，token 续期                         |
| 3   | 拒绝授权手机号     | 仅用 openid 建账号，profile 显示未绑定手机号 |
| 4   | token 过期         | 自动跳登录页，重新 wx.login                  |
| 5   | 同一微信换手机号   | 提示"该微信号已绑定其他手机号，是否切换"     |

### 14.2 支付流程

| #   | 用例                     | 期望                                     |
| --- | ------------------------ | ---------------------------------------- |
| 1   | 下单 → wx.requestPayment | 成功，订单状态 `paid`                    |
| 2   | 支付中途退出             | 订单停在 `wx_prepaid`，5 分钟后过期      |
| 3   | 微信异步通知             | 验签成功 + 写 DB + WebSocket 推前端      |
| 4   | 重复通知                 | 幂等（订单已是 `paid` 直接返回 success） |
| 5   | 签名错误                 | 拒绝 + 写 AuditLog(severity=critical)    |
| 6   | 退款 30 天后             | 微信拒绝（订单超过 30 天不可退）         |

### 14.3 分享裂变

| #   | 用例                       | 期望                                         |
| --- | -------------------------- | -------------------------------------------- |
| 1   | A 分享给 B，B 首次进入     | query 带 `ref=A.id`                          |
| 2   | B 完成注册                 | 写 InvitationLog，B 收 100 DVC，A 收 200 DVC |
| 3   | B 7 天内未注册             | 邀请关系 expired                             |
| 4   | A 自我邀请                 | 拒绝（`inviterId !== inviteeId`）            |
| 5   | A 邀请 B 后拉黑 B          | 仍发奖，事后运营可 revoke                    |
| 6   | 同一微信 1 分钟分享 100 次 | 防刷，触发黑名单 + 提示                      |

### 14.4 上线审核

| #   | 用例                | 期望                               |
| --- | ------------------- | ---------------------------------- |
| 1   | 类目正确            | 工具 / 商业服务 / 金融（按业务选） |
| 2   | 用户协议 / 隐私政策 | 必须挂链接（`web-view` 跳 H5）     |
| 3   | 备案号              | 工信部 ICP 备案号展示              |
| 4   | 测试账号            | 提供给审核员的测试手机号 + 密码    |
| 5   | 关键词过滤          | 政治/色情/暴力等关键词有过滤       |

---

## 15. 性能与优化

### 15.1 包大小控制

- 主包 ≤ 2MB（超出需分包）
- 单个分包 ≤ 2MB
- 图片用 CDN 引用，**不**打入包
- 用 `lazyCodeLoading: "requiredComponents"` 启用按需注入

### 15.2 启动性能

- 首屏渲染 < 1.5s
- 启动到可交互 < 3s
- 用 `app.js` 的 `onLaunch` **不**做重操作（仅拉 token 校验）

### 15.3 数据预取

```javascript
// app.js
onLaunch() {
  this.prefetchCriticalData();
},

async prefetchCriticalData() {
  // 后台拉取（不阻塞首屏）
  Promise.all([
    request({ url: '/api/h5/user/me', showLoading: false }).catch(() => null),
    request({ url: '/api/h5/dlc/level', showLoading: false }).catch(() => null),
    request({ url: '/api/h5/notifications/unread-count', showLoading: false }).catch(() => null),
  ]).then(([user, level, unread]) => {
    this.globalData.user = user;
    this.globalData.level = level;
    this.globalData.unread = unread;
  });
},
```

---

## 16. 发布流程

### 16.1 提审清单

- [ ] 全局 HTTPS 配置正确
- [ ] 业务域名 / request 域名已配
- [ ] 用户协议 + 隐私政策链接
- [ ] 类目与代码内容一致
- [ ] 测试账号可正常走通核心流程
- [ ] 关键词过滤
- [ ] 性能数据达标（首屏 < 1.5s）
- [ ] 兼容性测试（iOS 13+ / Android 7+）
- [ ] 灰度用户白名单（10% → 50% → 100%）

### 16.2 灰度发布

```javascript
// app.js - 灰度逻辑
async checkGrayRelease() {
  const res = await request({
    url: '/api/h5/config/gray',
    method: 'GET',
    showLoading: false,
  });
  if (res.grayVersion && res.grayVersion !== this.globalData.version) {
    // 当前用户在灰度名单
    wx.showModal({
      title: '发现新版本',
      content: '是否立即更新？',
      success: (r) => { if (r.confirm) wx.updateManager.applyUpdate(); },
    });
  }
}
```

### 16.3 紧急回滚

- 在微信公众平台 → 版本管理 → 撤回审核（审核中可撤回）
- 紧急情况联系腾讯客服（已上架的版本不可撤回，但可发"版本更新提示"）

---

## 17. 反作弊

### 17.1 邀请刷量

- 同 IP 1 分钟内 ≥ 3 次邀请绑定 → 标记可疑
- 同一被邀请人 7 天内被多个邀请人绑定 → 取第一个，其余忽略
- 邀请人 / 被邀请人设备指纹（`wx.getSystemInfo` 的 `model` + `system` + `platform`）相同 → 拒绝

### 17.2 支付刷单

- 同 openid 1 分钟内 ≥ 5 笔订单 → 风控
- 退款率 > 30% 的用户 → 标记 + 人工审核
- 同一银行卡号短时间多笔退款 → 报警

### 17.3 分享刷量

- 单 openid 1 分钟分享 ≥ 10 次 → 限速（10s/次）
- 同一分享 link 1 小时被打开 ≥ 1000 次 → 标记 + 限速

---

## 18. 监控与日志

### 18.1 关键指标

- 日活（DAU）/ 月活（MAU）
- 启动成功率
- API 成功率（按端分）
- 支付成功率
- 分享转化率

### 18.2 上报 SDK

```javascript
// utils/tracker.js
function trackEvent(event, params = {}) {
  // 1. 上报到后端
  request({
    url: '/api/h5/track',
    method: 'POST',
    data: {
      event,
      params,
      openid: wx.getStorageSync('openid'),
      page: getCurrentPages().pop()?.route,
      ts: Date.now(),
    },
    showLoading: false,
  }).catch(() => null);

  // 2. 上报到微信分析（可选）
  if (wx.reportEvent) wx.reportEvent(event, params);
}

module.exports = { trackEvent };
```

---

## 19. 跨文件一致性检查（每个 P0 模块必勾）

- [ ] 状态枚举值是否在 00-foundation §8.3.1 扩展色彩表里有映射？
- [ ] 状态变更是否走 00-foundation §4.3 独立日志表模式？
- [ ] `*UserId` 字段是否按 00-foundation §12 加 `@relation("Name")` + `onDelete: Restrict`？
- [ ] i18n namespace 是否在 00-foundation §5.5.1 速查表里？
- [ ] 退款是否走 00-foundation §7.5 统一约定？
- [ ] 资源级权限判定是否走 00-foundation §3.5？
- [ ] 凭证加密是否走 00-foundation §11 KMS？

---

## 20. 未来规划（v2）

- ⏸ 跨端：迁移到 Taro（如果需要同时支持 H5 / RN / 小程序）
- ⏸ 小程序直播（仅特定类目可用）
- ⏸ 小游戏（拉新裂变 K 因子 > 1.4 时启动）
- ⏸ AR 扫描（用于 KYC 活体检测补充）
