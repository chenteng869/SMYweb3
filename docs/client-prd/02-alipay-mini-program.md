# 02 · 支付宝小程序（Alipay Mini Program）

> **对应 H5**：H5 端全部 20 个菜单（**完全复用 H5 后端 API `/api/h5/*`**，仅前端框架改为支付宝原生）
> **核心目标**：依托支付宝 10 亿+ 国内用户基础 + 强金融属性，做**金融类、信用类、商家收款**三大场景。**重点复用微信小程序的业务模型**（用户、订单、邀请等），**独有**芝麻信用集成与生活号触达。
> **后端**：与 H5 / 微信小程序共用 `apps/api` NestJS 服务，前端只调 `/api/h5/*` 即可（**不**新增 `alipay-*` 命名空间）
> **前端**：支付宝原生小程序（AXML/ACSS/JS），**不**用 Taro / uni-app——团队 React 经验不迁移成本低

---

## 1. 业务目标

> **为什么需要这章**：明确支付宝小程序在三大端（H5 / 微信小程序 / 支付宝小程序）中的**差异化定位**——避免"为做而做"，每个端必须有自己的"主战场"。

| 目标 | 指标 | 备注 |
|---|---|---|
| 拉新成本 | 支付宝渠道 CAC < $1.2 | 支付宝对金融类精准人群投放 |
| 7 日留存 | ≥ 38% | 金融类用户粘性高于微信场景 |
| 金融类转化 | 花呗分期支付占比 ≥ 25% | 独有能力 |
| 商家收款 | T+0 结算资金到账 < 实时 | 商家端强诉求 |
| 芝麻信用 | 信用分 600+ 用户占比 ≥ 30% | 用作 KYC 补充 / 风控标签 |
| 生活号粉丝 | 关注生活号用户数 ≥ 40% 注册用户 | 长期触达通道 |

**与微信小程序的定位差异**：

| 维度 | 微信小程序 | 支付宝小程序 | 优先级 |
|---|---|---|---|
| 拉新主战场 | 社交分享、扫码、朋友圈 | 支付成功页推荐、花呗分期、芝麻信用 | 微信 > 支付宝 |
| 金融场景 | 一般（依赖服务号） | **强**（花呗 / 余额宝 / 借呗） | 支付宝 >> 微信 |
| 信用体系 | 无 | **芝麻信用**（独有） | 支付宝独占 |
| 生活号触达 | 服务号模板（需关注） | 生活号模板（需关注） | 等价 |
| 跨境支付 | 仅 V3 接口 | **跨境汇款直接走支付宝国际** | 支付宝优势 |

---

## 2. 用户故事

| # | 故事 | 与微信差异 |
|---|---|---|
| US-1 | 作为游客，我扫支付宝小程序码进入，看到 Discover 流 | 同微信 |
| US-2 | 作为新用户，我点"支付宝一键登录"完成授权 + 手机号绑定 | **用 `my.getAuthCode` 而非 `wx.login`** |
| US-3 | 作为高信用分用户，我授权芝麻信用，登录时自动跳过部分 KYC 步骤 | **支付宝独有** |
| US-4 | 作为商家，我用花呗分期收款，T+0 到账 | **支付宝独有** |
| US-5 | 作为老用户，我使用"吱口令"分享小程序给支付宝好友 | **替代微信"小程序码"** |
| US-6 | 作为 DLC 4 用户，我通过生活号模板消息收到升级通知 | **生活号替代服务号** |

---

## 3. 与 H5 / 微信小程序的差异

> **为什么需要这章**：支付宝小程序与微信小程序**表面相似**（都是"小程序"），但 API、生态、审核、商业化逻辑**完全不同**。本章是**本端独有的核心章节**（H5 / 微信文档不需要此章），必须深入展开，避免直接复用微信代码。

### 3.1 复用部分（**后端 API / 数据模型不动**）

- ✅ 所有 `/api/h5/*` 接口 100% 复用（**不**新增 `alipay-*` 路径）
- ✅ 所有 Prisma 数据模型 100% 复用（含 `WechatUser` 表，支付宝用 `AlipayUser` 独立表）
- ✅ i18n 字典文件复用（`zh-CN` / `en-US` / `ja-JP` / `ko-KR`），namespace 严格按 00-foundation §5.5.1
- ✅ 业务状态机、权限点、审计日志全部复用
- ✅ DLC 等级、邀请关系、退款流程全部复用

### 3.2 改造部分（**前端 + 支付通道**）

| 维度 | H5 | 微信小程序 | **支付宝小程序** | 改造点 |
|---|---|---|---|---|
| 框架 | Vite + React 19 | 微信原生 (WXML/WXSS/JS) | **支付宝原生 (AXML/ACSS/JS)** | 完全重写 |
| 登录 | 手机号 + 密码 / OTP | `wx.login()` 拿 code | **`my.getAuthCode()`** 拿 authCode | 新增 `/api/h5/auth/alipay-login` |
| 手机号授权 | 手动输入 | `getPhoneNumber` button | **`my.getPhoneNumber`** | — |
| 实名认证 | 上传身份证 | 上传 + 活体 | **`my.checkAuth` + `my.userNameAuth`** | 走"支付宝账号授权" |
| 支付 | Stripe / Alipay H5 | `wx.requestPayment()` | **`my.tradePay()`** | 新增 `AlipayTradePayController` |
| 异步通知 | 同步回调 | `wxpay.notify_url` | **`alipay.notify_url` (V3)** | 后端加 `AlipayTradeCallback` |
| 分享 | `navigator.share` | `onShareAppMessage` | **`my.ap.navigateToAlipayPage` + 吱口令** | 走"吱口令"+"小程序收藏" |
| 推送 | Web Push / FCM | 微信订阅消息 + 服务号 | **生活号模板消息** | 长期触达 |
| 信用体系 | 无 | 无 | **芝麻信用（独有）** | `my.getZMCreditScore` + 后端快照 |
| 支付通道 | Stripe / Alipay H5 | 微信 V3 | **支付宝 V3**（公私钥模式） | — |
| 域名 | `https://smy.app` | 微信公众平台白名单 | **支付宝开放平台白名单**（**不**需 ICP 备案） | — |
| 摄像头扫码 | `getUserMedia` + jsQR | `wx.scanCode()` | **`my.scan`** | — |
| 文件下载 | `<a download>` | `wx.downloadFile()` | **`my.downloadFile`** | — |
| 缓存 | localStorage | `wx.setStorageSync` 10MB | **`my.setStorageSync` 10MB** | — |
| HTTP 请求 | `fetch` | `wx.request` | **`my.httpRequest`** | — |
| 后台保活 | — | 不需要 | 不需要 | — |
| ICP 备案 | 必须 | 必须 | **不需要**（仅白名单） | 运维配置 |

### 3.3 支付宝独有的能力

#### 3.3.1 芝麻信用（**核心差异化**）
- `my.getZMCreditScore()` 拿用户芝麻信用分（350-950）
- 600+ 可作为"高级用户"标签，跳过部分 KYC
- 650+ 可解锁"先享后付"
- 700+ 可作为风控"白名单"用户
- **后端必须**保存快照（`ZmcCreditSnapshot`），防客户端篡改

#### 3.3.2 花呗分期
- `my.tradePay({ ... })` 支付时，**用户主动选**花呗分期
- 商家端承担 0.5%-1.5% 手续费（**不**转嫁给用户）
- 后端用支付宝 `alipay.trade.create` + `extend_params.hb_fq_num` 指定期数

#### 3.3.3 商家 T+0 结算
- 商家入驻后开通"即时到账"，资金实时到银行卡
- 仅企业 / 个体工商户可开通，个人主体**不支持**

#### 3.3.4 支付宝国际（跨境汇款）
- 单笔 5 万美元限额
- 用于 H5"跨境汇款"菜单的"支付宝国际"通道

#### 3.3.5 小程序收藏 + 添加到桌面
- 用户主动收藏后，下次从"我的小程序"快速进入
- "添加到桌面"等同于 PWA 安装，但**不**走浏览器

### 3.4 不支持的能力（明确告知产品）

- ❌ **Web3 钱包**（无 `window.ethereum`，DID 链上签名要靠「云端代理签名」或引导到 H5）
- ❌ **web-view 跳外链**（仅可跳已配置业务域名，且**不能**带 query 跳第三方）
- ❌ **unionid 跨主体**（同主体可走 `alipayUnionId`，跨主体不支持）
- ❌ **Push API**（用生活号模板消息替代）
- ❌ **Service Worker**（用 Storage 缓存替代）
- ❌ **IndexedDB**（用 `my.setStorageSync` 限制 10MB / key）
- ❌ **跨域 fetch**（通过 `my.httpRequest` 解决，**只**支持 `request 合法域名`）
- ❌ **朋友圈分享**（无"朋友圈"概念，用"吱口令"+"小程序码"替代）
- ❌ **H5 支付**（必须用 `my.tradePay` 收银台）

### 3.5 与微信小程序的 API 命名差异速查

| 微信 | **支付宝** | 说明 |
|---|---|---|
| `wx.login()` | **`my.getAuthCode()`** | 拿临时凭证 |
| `wx.getUserInfo()` | **`my.getOpenUserInfo()`** | 拿加密用户信息 |
| `wx.getPhoneNumber()` | **`my.getPhoneNumber()`** | 手机号授权 |
| `wx.requestPayment()` | **`my.tradePay()`** | 支付 |
| `wx.requestSubscribeMessage()` | **`my.subscribe()`** + 生活号模板 | 订阅消息 |
| `wx.request()` | **`my.httpRequest()`** | HTTP 请求 |
| `wx.scanCode()` | **`my.scan()`** | 扫码 |
| `wx.downloadFile()` | **`my.downloadFile()`** | 文件下载 |
| `wx.setStorageSync()` | **`my.setStorageSync()`** | 同步存 |
| `onShareAppMessage` | **`onShareAppMessage` (AXML `button open-type="share"`)** | 分享回调（语法**一致**！） |
| `wx.checkSession()` | **`my.checkSession()`** | session 校验 |
| `wx.login` 的 `code` | **`my.getAuthCode` 的 `authCode`** | 字段名不同 |

---

## 4. 业务流程

### 4.1 登录授权流程（含支付宝账号授权 + 芝麻信用授权）

```
┌──────────┐                ┌──────────┐                ┌──────────┐
│  支付宝  │                │  后端    │                │ 支付宝   │
│  小程序  │                │          │                │ 开放平台 │
└────┬─────┘                └────┬─────┘                └────┬─────┘
     │  1. my.getAuthCode()      │                            │
     │ ──────────────────────►   │                            │
     │ ◄──── authCode (5min) ───│                            │
     │                           │  2. alipay.system.oauth.token │
     │                           │ ────────────────────────►  │
     │                           │ ◄─── access_token + user_id ─│
     │                           │                            │
     │  3. /api/h5/auth/alipay-login                            │
     │    { authCode, appid }    │                            │
     │ ──────────────────────►   │                            │
     │                           │  4. alipay.user.info.share  │
     │                           │ ────────────────────────►  │
     │                           │ ◄─── nickname + avatar ───│
     │                           │                            │
     │  5. (可选) 触发手机号授权  │                            │
     │     my.getPhoneNumber()   │                            │
     │ ──────────────────────►   │                            │
     │  6. (可选) 触发芝麻信用授权 │                            │
     │     my.getZMCreditScore() │                            │
     │ ──────────────────────►   │  7. 写 AlipayUser + ZmcCreditSnapshot
     │                           │                            │
     │  8. { token, userInfo }   │                            │
     │ ◄────────────────────────│                            │
     │                           │                            │
```

**关键点**：
- `my.getAuthCode()` 拿的是**临时** `authCode`（5 分钟有效），不是最终 token
- 拿用户信息需用户**主动**点 `<button open-type="getUserInfo">` 触发 `my.getOpenUserInfo()`
- 手机号需用户**主动**点 `<button open-type="getPhoneNumber">` 触发 `my.getPhoneNumber()`
- **芝麻信用**需用户**主动**点 `<button open-type="getAuthorize">` 授权
- 同一用户 `user_id` 唯一（同一小程序），`alipayUnionId` 跨小程序（仅同主体）
- 后端**不**存明文手机号 / 实名信息，必须走 [00-foundation §11 KMS 加密](../../admin-prd/00-foundation.md) 落库

### 4.2 支付流程（my.tradePay + 异步通知）

```
1. 用户选服务 → POST /api/h5/services/:id/orders → 后端生成 Alipay 预付单
2. 后端调支付宝 `alipay.trade.create` (V3) → 拿到 tradeNo + 签名 sign
3. 返回 tradeStr 给前端
4. 前端调 my.tradePay({ tradeNO, orderStr }) → 拉起支付宝收银台
5. 用户选支付方式（花呗 / 余额宝 / 余额 / 银行卡 / 吱口令）→ 支付完成
6. 支付宝异步通知 `AlipayTradeCallback` (V3 notify_url)
7. 后端验签（公钥验签）→ 更新 Order.status = 'paid' → 触发 DLC 升级 / 发凭证
8. 后端向前端 WebSocket 推 `order.paid` 事件
9. 前端 toast "支付成功" + 跳详情
```

**关键点**：
- 必须在 `my.tradePay` 前**先**调后端创建订单拿 `tradeStr`（**不能**前端本地算签名）
- 异步通知可能 5s-30min 不等，前端不能**只**等异步，要 WebSocket 主动推
- **退款**用 `alipay.trade.refund` API（独立接口，**不**走支付接口）
- V3 接口用 **公钥验签**（**不**是微信的"商户证书"模式）
- 收银台可让用户选**花呗分期**（`hb_fq_num` 参数）

### 4.3 分享裂变流程（小程序收藏 + 吱口令 + 小程序码）

```
用户 A 在「AI 名片」页点右上角分享
   ↓
触发 onShareAppMessage({ title, imageUrl, path })
   ↓
path = '/pages/card/detail?id=' + A.userId + '&from=share&ref=' + A.id
   ↓
好友 B 在支付宝内打开（首次）或 点击（已有小程序）
   ↓
B 落地页解析 query:
   - ref = A.id  (邀请人)
   - from = share
   ↓
B 触发「注册绑定邀请人」API:
   POST /api/h5/invitations/bind { inviterId: A.id }
   ↓
后端写 InvitationLog，邀请关系永久保存
   ↓
A 收到"好友 X 加入了"生活号模板消息
   ↓
A 获得 DVC 奖励（200），B 获得注册奖励（100）

【额外裂变通道：吱口令】
用户 A 点"吱口令"按钮 → my.ap.navigateToAlipayPage({ url: 'alipays://platformapi/startapp?...' })
   ↓
生成吱口令文案 + 海报（带小程序码）
   ↓
B 长按图片识别 → 进入小程序 → 同样绑定邀请关系

【额外裂变通道：小程序码】
后端调 alipay.open.app.qrcode.create → 拿小程序码 URL
   ↓
A 保存到相册 → 群发 → 其他人长按识别
```

**关键点**：
- 分享图必须**预生成**（CDN），不要 `canvas` 实时画（性能差 + 容易超时）
- 分享文案要带"福利钩子"（如"扫码得 100 DVC + 1 次免费税务咨询"）
- 邀请关系绑定有 7 天有效期（超时未注册不返利）
- **没有朋友圈**，靠"吱口令"+"小程序码"+"小程序收藏"+"添加到桌面" 4 个触点
- 生活号模板消息仅在用户**关注生活号**后可达（与微信服务号等价）

### 4.4 实名认证流程（my.checkAuth + my.userNameAuth）

```
场景 A：用户主动"实名认证"
   ↓
1. 用户点"立即实名" → my.checkAuth({ scope: 'USER_INFO' })
   ↓
2. 支付宝弹窗，用户同意
   ↓
3. 返回 { authCode }
   ↓
4. 后端用 authCode 调 alipay.user.certify.open.initialize → 拿到 certifyId
   ↓
5. 前端调 my.userNameAuth({ certifyId }) → 拉起支付宝人脸核身
   ↓
6. 用户完成活体检测
   ↓
7. 后端轮询 alipay.user.certify.open.query → 拿到 PASSED
   ↓
8. 写 KYC.status = 'approved'，更新 User.kycStatus
   ↓
9. 颁发 VC 凭证（DID 模块，参考 00-foundation §11 KMS）

场景 B：芝麻信用替代（信用分 600+）
   ↓
1. 用户授权 my.getZMCreditScore()
   ↓
2. 后端拿 score=650 → 自动通过"基础 KYC"（跳过活体）
   ↓
3. 写 KYC.status = 'auto_approved_zm'
   ↓
4. 但**不**颁发"完整 VC 凭证"，仅给基础权益
```

**关键点**：
- 支付宝的"实名认证" = **公安二要素 + 活体**，比 H5 手动上传身份证 + 活体**可信度高**
- 芝麻信用 600+ 可作为**补充 KYC**，但**不能完全替代**金融类 KYC
- 涉及支付 / 提现的场景**仍需**走完整 `my.userNameAuth`
- 认证结果必须**服务器验签**（支付宝公钥验签），不能信任前端

---

## 5. 字段定义（支付宝特有）

### 5.1 AlipayUser（支付宝用户映射）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | UUID |
| userId | String | ✓ | 关联 User.id（00-foundation §13 双身份允许） |
| alipayUserId | String(20) | ✓ | 支付宝 user_id，唯一 |
| alipayUnionId | String(40) | | 跨小程序 unionId（仅同主体） |
| appid | String(40) | ✓ | 多小程序隔离 |
| nickname | String | | 支付宝昵称（**不**用真名） |
| avatarUrl | String | | |
| phoneNumber | String | | 加密存储（00-foundation §11 KMS） |
| phoneAuthorized | Boolean | | 是否授权过手机号 |
| realNameStatus | String | | `none` / `partial` / `full` |
| zmcAuthorized | Boolean | | 是否授权过芝麻信用 |
| zmcLatestScore | Int | | 最新信用分（不存历史，仅最新） |
| zmcLatestLevel | String | | `EXCELLENT` / `GREAT` / `GOOD` / `MEDIUM` / `BAD` |
| lastLoginAt | DateTime | | |
| lastShareAt | DateTime | | 上次分享时间（防刷） |
| lastZmcQueryAt | DateTime | | 上次芝麻信用查询时间（**7 天一次**，避免骚扰） |
| createdAt, updatedAt, deletedAt | | | 通用 |

```prisma
model AlipayUser {
  id               String   @id @default(uuid())
  userId           String
  user             User     @relation("AlipayUserMapping", fields: [userId], references: [id], onDelete: Restrict)
  alipayUserId     String
  appid            String
  alipayUnionId    String?
  nickname         String?
  avatarUrl        String?
  phoneNumber      String?          // KMS 加密的 EncryptedPayload
  phoneAuthorized  Boolean  @default(false)
  realNameStatus   String   @default("none")
  zmcAuthorized    Boolean  @default(false)
  zmcLatestScore   Int?
  zmcLatestLevel   String?
  lastLoginAt      DateTime?
  lastShareAt      DateTime?
  lastZmcQueryAt   DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  deletedAt        DateTime?

  // 关联：芝麻信用快照
  zmcSnapshots     ZmcCreditSnapshot[]

  @@unique([appid, alipayUserId])
  @@index([userId])
  @@index([alipayUnionId])
  @@index([zmcLatestScore])
}
```

> **关键决策**：
> - `phoneNumber` 字段按 [00-foundation §11 KMS](../../admin-prd/00-foundation.md) 加密落库（EncryptedPayload 格式），**不**存明文
> - 信用卡号、身份证号等同样强制 KMS 加密
> - `zmcLatestScore` **不存历史**，历史走 `ZmcCreditSnapshot` 独立表

### 5.2 ZmcCreditSnapshot（芝麻信用分快照）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| alipayUserId | String | ✓ | 关联 AlipayUser.id（**不**是 userId） |
| score | Int | ✓ | 信用分 350-950 |
| level | String | ✓ | `EXCELLENT` / `GREAT` / `GOOD` / `MEDIUM` / `BAD` |
| zmScoreGrade | String | | 支付宝返回的分级（A+/A/B/C/D） |
| identityHash | String(64) | ✓ | 支付宝返回的"用户标识哈希"（SHA256） |
| bizNo | String(40) | | 业务流水号（用于查证） |
| queryReason | String | | 查询原因（KYC / 风控 / 营销） |
| scene | String | ✓ | `kyc` / `risk` / `marketing` / `credit_check` |
| isConsumed | Boolean | | 是否已用于某次判定（**防止重复判定**） |
| consumedAt | DateTime | | |
| consumedFor | String | | `kyc_basic` / `kyc_advance` / `risk_whitelist` / `credit_payment` |
| expiresAt | DateTime | ✓ | 默认 +30 天（过期重查） |
| createdAt | DateTime | | |

```prisma
model ZmcCreditSnapshot {
  id            String   @id @default(uuid())
  alipayUserId  String
  alipayUser    AlipayUser @relation(fields: [alipayUserId], references: [id], onDelete: Restrict)
  score         Int
  level         String
  zmScoreGrade  String?
  identityHash  String
  bizNo         String?
  queryReason   String?
  scene         String
  isConsumed    Boolean  @default(false)
  consumedAt    DateTime?
  consumedFor   String?
  expiresAt     DateTime
  createdAt     DateTime @default(now())

  @@index([alipayUserId, createdAt])
  @@index([scene, score])
  @@index([expiresAt, isConsumed])
  @@unique([alipayUserId, scene, identityHash])
}
```

**关键约束**：
- **每次查询写一条新快照**（防客户端 / 中间人篡改）
- 同一 `alipayUserId + scene` 30 天内最多 1 条未消费的快照（防骚扰）
- `isConsumed=true` 后**不**再用于判定，必须重查
- `identityHash` 是支付宝返回的"用户标识哈希"，**不**是用户真实身份——保证隐私

### 5.3 InvitationLog（邀请关系）

**与微信小程序完全共用一张表**（参考 [01-wechat-mini-program §5.2](./01-wechat-mini-program.md)），字段不变。`source` 枚举值 `share` / `qrcode` / `poster` 同样适用，支付宝独有 `zhikouling`（吱口令）也复用此枚举。

---

## 6. 状态机

### 6.1 支付宝支付订单

```
draft → alipay_precreated → paid → processing → completed
                              ↘ alipay_refund_pending → partial_refunded ↔ refunded
                                              ↘ alipay_refund_failed
      → cancelled
```

**触发条件**：
- `draft → alipay_precreated`：后端调 `alipay.trade.create` 成功
- `alipay_precreated → paid`：支付宝异步通知 `AlipayTradeCallback` 验签成功
- `paid → alipay_refund_pending`：用户/客服发起退款
- `alipay_refund_pending → partial_refunded`：部分退款成功
- `alipay_refund_failed` → 人工介入（`alipay_refund_failed_reason` 字段记录）
- 任何状态变更必须按 [00-foundation §4.3](../../admin-prd/00-foundation.md) 写独立 `OrderStatusLog` 表

**与微信支付订单的差异**：

| 状态 | 微信 | **支付宝** | 备注 |
|---|---|---|---|
| 预付状态 | `wx_prepaid` | **`alipay_precreated`** | V3 接口命名 |
| 退款失败 | `wx_refund_failed` | **`alipay_refund_failed`** | — |
| 异步通知 | `WxPayCallback` | **`AlipayTradeCallback`** | 验签方式不同 |

### 6.2 芝麻信用分等级

```
无信用（< 550）
   ↓ 初次查询
初次查询（550-599）
   ↓ 增长
良好 MEDIUM（600-649）
   ↓ 增长
良好 GOOD（650-699）
   ↓ 增长
优秀 GREAT（700-949）
   ↓ 增长
极好 EXCELLENT（950）

【伴随状态】
未授权 → 已授权 zmcAuthorized=true
未消费 → 已消费 isConsumed=true
未过期 → 已过期 expiresAt < now()
```

**判定逻辑**（伪代码）：
```typescript
function determineZmcLevel(score: number): string {
  if (score >= 950) return 'EXCELLENT';
  if (score >= 700) return 'GREAT';
  if (score >= 650) return 'GOOD';
  if (score >= 600) return 'MEDIUM';
  return 'BAD';
}
```

**KYC 联动**：
- `score >= 600` → 可跳过"基础 KYC"中的活体检测
- `score >= 650` → 可解锁"先享后付"支付
- `score >= 700` → 标记为"风控白名单"用户，简化后续审核

### 6.3 邀请关系生命周期

**与微信小程序完全共用**，参考 [01-wechat-mini-program §6.2](./01-wechat-mini-program.md)。支付宝独有 `source=zhikouling` 走相同状态机。

---

## 7. 后端 API（支付宝特有）

> **核心原则**：所有路由继续挂在 `/api/h5/*` 下，**不**新增 `alipay-*` 命名空间。**所有 API 在控制器层判断 `clientType=alipay`**，业务逻辑复用。

### 7.1 认证

| Method | Path | 权限 | 说明 |
|---|---|---|---|
| POST | `/api/h5/auth/alipay-login` | 公开 | 支付宝一键登录（`authCode` + `appid`） |
| POST | `/api/h5/auth/alipay-phone` | 需登录 | 解密手机号（`my.getPhoneNumber` 回调） |
| POST | `/api/h5/auth/alipay-bind-union` | 需登录 | 绑定 alipayUnionId（跨小程序） |
| POST | `/api/h5/auth/alipay-realname-init` | 需登录 | 初始化实名认证（调 `alipay.user.certify.open.initialize`） |
| POST | `/api/h5/auth/alipay-realname-query` | 需登录 | 轮询认证结果（`alipay.user.certify.open.query`） |

### 7.2 支付

| Method | Path | 权限 | 说明 |
|---|---|---|---|
| POST | `/api/h5/payments/alipay-precreate` | 需登录 | 预创建交易，返回 `tradeStr` |
| POST | `/api/h5/payments/alipay-callback` | 支付宝回调 | V3 公钥验签 + 写 `paid` 状态（**不**需 JWT） |
| POST | `/api/h5/payments/alipay-refund` | 需登录 | 申请退款（调 `alipay.trade.refund`） |
| POST | `/api/h5/payments/alipay-query` | 需登录 | 查询交易状态（`alipay.trade.query`） |
| POST | `/api/h5/payments/alipay-close` | 需登录 | 关闭未支付订单（`alipay.trade.close`） |

### 7.3 邀请

**与微信共用**，参考 [01-wechat-mini-program §7.3](./01-wechat-mini-program.md)。支付宝吱口令走 `POST /api/h5/invitations/zhikouling-create` 生成吱口令文案。

### 7.4 分享

| Method | Path | 权限 | 说明 |
|---|---|---|---|
| POST | `/api/h5/share/track` | 需登录 | 记录分享行为（**与微信共用**，按 `clientType` 区分） |
| GET | `/api/h5/share/poster` | 需登录 | 预生成分享海报 CDN URL |
| POST | `/api/h5/share/zhikouling` | 需登录 | 生成吱口令文案（**支付宝独有**） |
| POST | `/api/h5/share/alipay-qrcode` | 需登录 | 生成支付宝小程序码（调 `alipay.open.app.qrcode.create`） |

### 7.5 芝麻信用（**支付宝独有**）

| Method | Path | 权限 | 说明 |
|---|---|---|---|
| POST | `/api/h5/credit/zm-authorize` | 需登录 | 用户授权芝麻信用（`my.getZMCreditScore` 回调） |
| GET | `/api/h5/credit/zm-score` | 需登录 | 查询当前用户最新信用分（用快照，不实时调） |
| POST | `/api/h5/credit/zm-query` | 内部 cron / 后台 | 主动查询（**不**暴露给前端，防骚扰） |
| GET | `/api/h5/credit/zm-snapshots` | 需登录 | 用户历史信用分趋势（近 90 天） |
| POST | `/api/h5/credit/zm-verify-kyc` | 需登录 | 校验信用分是否满足 KYC 等级（`>= 600` 跳过活体） |
| POST | `/api/h5/credit/zm-credit-pay` | 需登录 | "先享后付"支付资格校验（`>= 650`） |

### 7.6 实名认证

| Method | Path | 权限 | 说明 |
|---|---|---|---|
| POST | `/api/h5/kyc/alipay-realname-init` | 需登录 | 初始化（调 `alipay.user.certify.open.initialize`） |
| POST | `/api/h5/kyc/alipay-realname-query` | 需登录 | 轮询结果 |
| GET | `/api/h5/kyc/me` | 需登录 | 查询当前 KYC 状态（多端共用） |

### 7.7 生活号（替代服务号）

| Method | Path | 权限 | 说明 |
|---|---|---|---|
| POST | `/api/h5/notifications/alipay-template` | 内部 | 发送生活号模板消息 |
| POST | `/api/h5/notifications/alipay-follow` | 需登录 | 记录用户关注生活号（用于后续触达） |

---

## 8. 前端架构

### 8.1 项目结构

```
alipay-miniprogram/
├── app.js                    # 全局入口
├── app.json                  # 全局配置（pages / tabBar / window）
├── app.acss                  # 全局样式（ACSS = AXML CSS）
├── project.config.json       # 支付宝小程序项目配置
├── pages/                    # 页面（与 H5 路由一一对应）
│   ├── index/                # /  Discover 首页
│   ├── discover/
│   ├── services/
│   ├── ai/
│   ├── profile/
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
│   ├── ai-business-card/
│   ├── login/                # 支付宝登录（独立页）
│   ├── realname/             # 实名认证（独立页）
│   └── credit/               # 芝麻信用（独立页）
├── components/               # 复用组件
│   ├── StatusBadge/          # 状态徽章（按 00-foundation §8.3.1 颜色）
│   ├── EmptyState/
│   ├── LoadingState/
│   ├── ListView/             # 列表（下拉刷新 + 上拉加载）
│   ├── ZhikoulingShare/      # 吱口令分享（支付宝独有）
│   └── AlipayMiniCode/       # 小程序码展示
├── utils/
│   ├── http.js               # my.httpRequest 封装（自动加 token / 错误处理）
│   ├── auth.js               # 登录 / token 管理
│   ├── i18n.js               # 多语言（i18next 适配）
│   ├── share.js              # 分享 / 吱口令 / 小程序码
│   ├── zmc.js                # 芝麻信用工具
│   └── realname.js           # 实名认证工具
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
    "selectedColor": "#1677FF",
    "backgroundColor": "#ffffff",
    "list": [
      { "pagePath": "pages/index/index", "text": "发现" },
      { "pagePath": "pages/services/services", "text": "服务" },
      { "pagePath": "pages/ai/ai", "text": "AI 大脑" },
      { "pagePath": "pages/profile/profile", "text": "我的" }
    ]
  },
  "window": {
    "defaultTitle": "海购星",
    "titleBarColor": "#1677FF",
    "backgroundColor": "#F5F5F5"
  },
  "permission": {
    "scope.userLocation": {
      "desc": "用于推荐附近服务"
    }
  },
  "styleIsolation": "apply-shared",
  "enableAppxNg": true
}
```

**与微信 app.json 的关键差异**：
- `selectedColor` 选支付宝品牌色 `#1677FF`（蓝色，区别于微信绿 `#10B981`）
- `window.titleBarColor` 而非 `navigationBarBackgroundColor`
- **没有** `lazyCodeLoading` 字段（支付宝自动优化）
- **没有** `requiredPrivateInfos` 字段（支付宝用 `permission.scope` 描述）

### 8.3 http.js 封装（my.httpRequest）

```javascript
// utils/http.js
const API_BASE = 'https://api.smy.app';

class HttpError extends Error {
  constructor(code, message, errors) {
    super(message);
    this.code = code;
    this.errors = errors;
  }
}

async function httpRequest({ url, method = 'GET', data, header = {}, showLoading = true }) {
  const token = my.getStorageSync({ key: 'token' }).data || null;
  if (showLoading) my.showLoading({ content: '加载中' });

  return new Promise((resolve, reject) => {
    my.httpRequest({
      url: API_BASE + url,
      method,
      data,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Client': 'alipay-miniprogram',
        'X-Version': '1.0.0',
        ...header,
      },
      success: (res) => {
        if (showLoading) my.hideLoading();
        const { status, data: body } = res;
        if (status !== 200) {
          reject(new HttpError(status, `HTTP ${status}`));
          return;
        }
        if (!body.success) {
          // 401 强制重新登录
          if (body.code === 401) {
            my.removeStorageSync({ key: 'token' });
            my.reLaunch({ url: '/pages/login/login' });
          }
          reject(new HttpError(body.code, body.message, body.errors));
          return;
        }
        resolve(body.data);
      },
      fail: (err) => {
        if (showLoading) my.hideLoading();
        reject(new HttpError(-1, err.errorMessage || err.error));
      },
    });
  });
}

module.exports = { httpRequest, HttpError };
```

**与微信 `wx.request` 的差异**：
- `my.httpRequest` **没有** `data` 字段命名问题（参数同 `wx.request`）
- 异步 API 走 **Promise / callback 双模式**（更老派）
- `my.showLoading` 用 `content` 而非 `title`
- `my.hideLoading` 不需参数

### 8.4 登录实现

```javascript
// pages/login/login.js
const { httpRequest } = require('../../utils/http');

Page({
  data: { phoneAuthVisible: false, realnameAuthVisible: false },

  // 步骤 1：my.getAuthCode 拿 authCode 调后端
  async onAlipayLogin() {
    try {
      const res = await new Promise((resolve, reject) => {
        my.getAuthCode({
          scopes: ['auth_user'],
          success: resolve,
          fail: reject,
        });
      });
      const data = await httpRequest({
        url: '/api/h5/auth/alipay-login',
        method: 'POST',
        data: { authCode: res.authCode, appid: 'your_appid' },
      });

      if (data.needPhoneBind) {
        this.setData({ phoneAuthVisible: true });
        this._tempAuthCode = res.authCode;
      } else {
        my.setStorageSync({ key: 'token', data: data.token });
        my.setStorageSync({ key: 'userInfo', data: data.user });
        this._onLoginSuccess();
      }
    } catch (err) {
      my.showToast({ content: err.message, type: 'none' });
    }
  },

  // 步骤 2：用户授权手机号
  async onGetPhoneNumber(e) {
    if (e.detail.error) {
      my.showToast({ content: '授权取消', type: 'none' });
      return;
    }
    try {
      const data = await httpRequest({
        url: '/api/h5/auth/alipay-phone',
        method: 'POST',
        data: {
          authCode: this._tempAuthCode,
          encryptedData: e.detail.response,
        },
      });
      my.setStorageSync({ key: 'token', data: data.token });
      my.setStorageSync({ key: 'userInfo', data: data.user });
      this._onLoginSuccess();
    } catch (err) {
      my.showToast({ content: '绑定失败', type: 'none' });
    }
  },

  // 步骤 3（可选）：用户授权芝麻信用
  async onZmCreditAuthorize() {
    try {
      const res = await new Promise((resolve, reject) => {
        my.getZMCreditScore({
          success: resolve,
          fail: reject,
        });
      });
      await httpRequest({
        url: '/api/h5/credit/zm-authorize',
        method: 'POST',
        data: { zmScore: res.zmScore, bizNo: res.bizNo },
      });
      my.showToast({ content: '授权成功', type: 'success' });
    } catch (err) {
      my.showToast({ content: '授权失败', type: 'none' });
    }
  },

  _onLoginSuccess() {
    my.switchTab({ url: '/pages/index/index' });
  },
});
```

```xml
<!-- pages/login/login.axml -->
<view class="login-page">
  <image class="logo" src="/images/logo.png" mode="aspectFit" />
  <view class="title">海购星</view>
  <view class="subtitle">萨摩亚合规出海一站式平台</view>

  <button class="btn-primary" onTap="onAlipayLogin">
    支付宝一键登录
  </button>

  <button class="btn-secondary" open-type="getAuthorize"
          scope="userInfo" onTap="onGetUserInfo">
    获取用户信息（可选）
  </button>

  <button class="btn-secondary" open-type="getAuthorize"
          scope="phoneNumber" onTap="onGetPhoneNumber">
    绑定手机号（可选）
  </button>

  <button class="btn-secondary" open-type="getAuthorize"
          scope="zmCredit" onTap="onZmCreditAuthorize">
    授权芝麻信用（可选，得 DVC 奖励）
  </button>

  <view class="agreement">
    登录即同意 <text class="link">《用户协议》</text> <text class="link">《隐私政策》</text>
  </view>
</view>
```

### 8.5 分享 + 吱口令实现

```javascript
// pages/card/detail.js
Page({
  data: { zhikoulingText: '' },

  // 微信/支付宝共有：onShareAppMessage 语法一致！
  onShareAppMessage() {
    const userId = my.getStorageSync({ key: 'userInfo' }).data.id;
    return {
      title: '我的 AI 名片，扫码加我好友',
      path: `pages/card/detail?id=${userId}&from=share&ref=${userId}`,
      imageUrl: this.data.sharePosterUrl,  // 预生成的 CDN 海报
    };
  },

  // 吱口令分享（支付宝独有）
  async onZhikoulingShare() {
    try {
      const data = await httpRequest({
        url: '/api/h5/share/zhikouling',
        method: 'POST',
        data: { contentId: this.data.cardId },
      });
      this.setData({ zhikoulingText: data.text });
      // 复制到剪贴板
      my.setClipboard({ text: data.text });
      my.showToast({ content: '吱口令已复制，快去发给好友吧', type: 'success' });
    } catch (err) {
      my.showToast({ content: '生成失败', type: 'none' });
    }
  },
});
```

### 8.6 支付实现（my.tradePay）

```javascript
// pages/payment/confirm.js
async onPay() {
  try {
    // 1. 先调后端创建订单
    const order = await httpRequest({
      url: '/api/h5/payments/alipay-precreate',
      method: 'POST',
      data: { serviceId: this.data.serviceId },
    });

    // 2. 拉起支付宝收银台
    const res = await new Promise((resolve, reject) => {
      my.tradePay({
        tradeNO: order.tradeNo,   // 来自 alipay.trade.create 返回的 tradeNo
        success: resolve,
        fail: reject,
      });
    });

    if (res.resultCode === '9000') {
      // 支付成功
      my.showToast({ content: '支付成功', type: 'success' });
      // 等待 WebSocket 推 order.paid，或主动 query
      setTimeout(() => {
        my.redirectTo({ url: '/pages/order/detail?id=' + order.orderId });
      }, 1500);
    } else if (res.resultCode === '6001') {
      my.showToast({ content: '已取消支付', type: 'none' });
    } else {
      my.showToast({ content: '支付失败：' + res.memo, type: 'none' });
    }
  } catch (err) {
    my.showToast({ content: err.message, type: 'none' });
  }
},
```

---

## 9. UI 组件

### 9.1 状态徽章（StatusBadge）

按 [00-foundation §8.3.1 扩展状态色彩表](../../admin-prd/00-foundation.md) 映射，**颜色与微信小程序完全一致**：

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
  // 支付宝特有
  PAID: { bg: '#10B981', text: '#FFFFFF', label: '已支付' },
  REFUNDED: { bg: '#EF4444', text: '#FFFFFF', label: '已退款' },
  ALIPAY_PRECREATED: { bg: '#3B82F6', text: '#FFFFFF', label: '待支付' },
  // 芝麻信用等级
  ZMC_EXCELLENT: { bg: '#FFD700', text: '#000000', label: '信用极好' },
  ZMC_GREAT: { bg: '#10B981', text: '#FFFFFF', label: '信用优秀' },
  ZMC_GOOD: { bg: '#3B82F6', text: '#FFFFFF', label: '信用良好' },
  ZMC_MEDIUM: { bg: '#F6A623', text: '#FFFFFF', label: '信用中等' },
  ZMC_BAD: { bg: '#9CA3AF', text: '#FFFFFF', label: '信用一般' },
};
```

### 9.2 列表组件（ListView）

下拉刷新 + 上拉加载 + 空状态 + 错误状态，**与微信完全一致**（参考 [01-wechat-mini-program §9.2](./01-wechat-mini-program.md)）。仅 AXML 标签替换 `view` / `text` 不变（AXML 兼容）。

### 9.3 i18n 适配

```javascript
// utils/i18n.js
const I18N = {
  'zh-CN': {
    'common.create': '创建',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.loading': '加载中...',
    'payment.txStatus.paid': '已支付',
    'credit.zmcScore.excellent': '信用极好',
    'auth.realname.title': '实名认证',
    'auth.zmcredit.title': '芝麻信用',
    // ...
  },
  'en-US': {
    'common.create': 'Create',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.loading': 'Loading...',
    'payment.txStatus.paid': 'Paid',
    'credit.zmcScore.excellent': 'Excellent Credit',
    'auth.realname.title': 'Real-name Verification',
    'auth.zmcredit.title': 'Zhima Credit',
    // ...
  },
  // ja-JP, ko-KR 同结构
};

function t(key, locale = 'zh-CN') {
  return I18N[locale]?.[key] || key;
}

module.exports = { t, I18N };
```

> **关键决策**：i18n namespace 严格按 [00-foundation §5.5.1 速查表](../../admin-prd/00-foundation.md)：
> - `payment.txStatus.paid`（payment 单数）
> - `credit.zmcScore.*`（**新增** `credit` namespace）
> - `auth.realname.*` / `auth.zmcredit.*`（**新增** `auth` namespace）
> - **禁止** 自定义 key（如 `aliPay.realName`）

### 9.4 吱口令分享组件（ZhikoulingShare，**支付宝独有**）

```xml
<view class="zhikouling-share">
  <image class="qrcode" src="{{qrcodeUrl}}" mode="aspectFit" />
  <view class="tip">长按识别 / 保存到相册</view>
  <button class="btn-primary" onTap="onCopyText">复制吱口令文案</button>
  <button class="btn-secondary" onTap="onSaveImage">保存到相册</button>
</view>
```

---

## 10. 支付宝开发者工具配置

### 10.1 project.config.json

```json
{
  "miniprogramRoot": "./",
  "projectname": "smy-alipay-miniprogram",
  "appid": "your_alipay_appid",
  "setting": {
    "urlCheck": true,
    "es6": true,
    "postcss": true,
    "minified": true,
    "uploadWithSourceMap": true
  },
  "compileType": "miniprogram",
  "libVersion": "2.0.0",
  "condition": {}
}
```

**与微信 project.config.json 的差异**：
- 字段名 `appid` 一致，但值是支付宝 appid
- 支付宝没有 `useCompilerModule` / `babelSetting` 字段
- 没有 `sitemap.json`（支付宝自动生成）
- `libVersion` 固定为 `2.0.0`（支付宝的库版本号）

### 10.2 服务器域名白名单（运维必配）

在 [支付宝开放平台](https://open.alipay.com) → 开发中心 → 小程序 → 设置 → 服务器域名白名单：

| 类型 | 域名 |
|---|---|
| **request 合法域名** | `https://api.smy.app` |
| **uploadFile 合法域名** | `https://api.smy.app` |
| **downloadFile 合法域名** | `https://cdn.smy.app`, `https://api.smy.app` |
| **socket 合法域名** | `wss://ws.smy.app` |

**关键**：
- 必须是 HTTPS，且 SSL 证书要受信（推荐 Let's Encrypt / 阿里云）
- **不**需 ICP 备案（**支付宝小程序免备案**）——仅服务器白名单
- 小程序正式版必须配（开发版可勾"不校验合法域名"）

### 10.3 业务域名（**仅限同主体**）

配置后可用 `web-view` 组件跳转 H5 页面（**仅**同主体已认证的域名）：
- `https://smy.app`
- `https://admin.smy.app`

> **限制**：支付宝 `web-view` **不能**跳第三方外链（仅同主体），与微信对比更严格。

---

## 11. 支付宝支付配置

### 11.1 申请流程

1. 登录 [支付宝开放平台](https://open.alipay.com) → 创建小程序
2. 主体认证（企业 / 个体工商户）—— 需营业执照、法人身份证、对公账户
3. 申请"移动支付"能力 → 提交审核（1-3 工作日）
4. 获得 `APPID`（小程序 ID）+ 配置 RSA2 公私钥对
5. 在开放平台 → 应用信息 → 接口加签方式 → 选 **公钥证书**（推荐）或 **公钥**
6. 申请生活号（用于模板消息）

### 11.2 密钥对生成

```bash
# 生成应用私钥（2048 位 RSA2）
openssl genrsa -out app_private_key.pem 2048

# 生成应用公钥
openssl rsa -in app_private_key.pem -pubout -out app_public_key.pem

# 把应用公钥上传到支付宝开放平台 → 接口加签方式
# 支付宝会返回"支付宝公钥"（alipay_public_key.pem）——用于验签
# 证书模式下还会返回 alipay_cert_public_key.crt
```

### 11.3 后端配置（环境变量）

```bash
# .env.production
ALIPAY_MINIPROGRAM_APPID=your_alipay_appid
ALIPAY_MINIPROGRAM_PRIVATE_KEY=/etc/secrets/alipay/app_private_key.pem
ALIPAY_PUBLIC_KEY=/etc/secrets/alipay/alipay_public_key.pem
ALIPAY_APP_CERT_PATH=/etc/secrets/alipay/appCertPublicKey.crt
ALIPAY_ROOT_CERT_PATH=/etc/secrets/alipay/alipayRootCert.crt
ALIPAY_NOTIFY_URL=https://api.smy.app/api/h5/payments/alipay-callback
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
```

### 11.4 支付宝 V3 签名（Node.js SDK）

```typescript
// apps/api/src/modules/payments/alipay-trade.service.ts
import AlipaySdk from 'alipay-sdk';
import fs from 'fs';

@Injectable()
export class AlipayTradeService {
  private sdk: AlipaySdk;

  constructor(private config: ConfigService) {
    this.sdk = new AlipaySdk({
      appId: this.config.get('ALIPAY_MINIPROGRAM_APPID'),
      privateKey: fs.readFileSync(this.config.get('ALIPAY_MINIPROGRAM_PRIVATE_KEY'), 'ascii'),
      alipayPublicKey: fs.readFileSync(this.config.get('ALIPAY_PUBLIC_KEY'), 'ascii'),
      signType: 'RSA2',
      gateway: this.config.get('ALIPAY_GATEWAY'),
      // 证书模式（推荐）
      appCertPath: this.config.get('ALIPAY_APP_CERT_PATH'),
      alipayRootCertPath: this.config.get('ALIPAY_ROOT_CERT_PATH'),
    });
  }

  async createTrade(params: {
    orderId: string;
    amount: number;   // 单位：元
    subject: string;
    userId: string;
    enableHuabei?: boolean;
  }): Promise<AlipayPrecreateResult> {
    const result = await this.sdk.exec('alipay.trade.create', {
      bizContent: {
        out_trade_no: params.orderId,
        total_amount: params.amount,
        subject: params.subject,
        buyer_id: params.userId,  // 支付宝 user_id（来自 AlipayUser.alipayUserId）
        notify_url: this.config.get('ALIPAY_NOTIFY_URL'),
        // 花呗分期（可选）
        extend_params: params.enableHuabei
          ? { hb_fq_num: '3', hb_fq_seller_percent: '0' }  // 3 期，商家承担 0% 手续费
          : undefined,
      },
    });
    return result;
  }

  async verifyCallback(params: Record<string, string>): Promise<AlipayCallback> {
    // SDK 自动验签
    const verified = this.sdk.checkNotifySign(params);
    if (!verified) {
      throw new BusinessException('SIGN_VERIFY_FAILED', '支付宝回调签名验证失败');
    }
    return {
      outTradeNo: params.out_trade_no,
      tradeNo: params.trade_no,
      tradeStatus: params.trade_status,  // TRADE_SUCCESS / TRADE_FINISHED
      totalAmount: params.total_amount,
      gmtPayment: params.gmt_payment,
    };
  }

  async refund(params: { orderId: string; amount: number; reason: string }): Promise<AlipayRefundResult> {
    return this.sdk.exec('alipay.trade.refund', {
      bizContent: {
        out_trade_no: params.orderId,
        refund_amount: params.amount,
        refund_reason: params.reason,
      },
    });
  }
}
```

### 11.5 异步通知处理

```typescript
// apps/api/src/modules/payments/alipay-callback.controller.ts
@Controller('api/h5/payments/alipay-callback')
export class AlipayCallbackController {
  constructor(
    private alipayTrade: AlipayTradeService,
    private orderService: OrderService,
  ) {}

  @Post()
  async handle(@Body() body: any) {
    // 1. 验签
    const verified = await this.alipayTrade.verifyCallback(body);
    if (!verified) {
      // 验签失败必须返回 "fail"，支付宝会重试
      return 'fail';
    }

    // 2. 处理订单
    if (verified.tradeStatus === 'TRADE_SUCCESS' || verified.tradeStatus === 'TRADE_FINISHED') {
      await this.orderService.markPaid(verified.outTradeNo, {
        tradeNo: verified.tradeNo,
        amount: verified.totalAmount,
        paidAt: verified.gmtPayment,
      });
    }

    // 必须返回纯文本 "success"，否则支付宝会重试 8 次
    return 'success';
  }
}
```

**关键点**：
- 验签失败 / 处理失败必须返回 `fail`，支付宝会按 4m / 10m / 10m / 1h / 2h / 6h / 15h 重试 7 次
- 处理成功必须返回 `success`，否则会重复通知
- V3 通知格式是 `application/x-www-form-urlencoded`，**不**是 JSON

---

## 12. 生活号 + 模板消息（替代服务号）

> 支付宝**没有**真正的 Push，必须用**生活号模板消息**（用户关注生活号后可达）。

### 12.1 生活号 vs 服务号对照

| 微信服务号 | **支付宝生活号** | 说明 |
|---|---|---|
| 服务号关注 | **生活号关注** | 等价 |
| 模板消息 | **模板消息** | 语法类似 |
| `mp.template.send` | **`alipay.open.public.message.custom.send`** | API 不同 |
| `touser` | **`toUserId`** | 字段名不同 |
| 服务号二维码 | **生活号关注二维码** | 同等作用 |
| 客服消息 | **生活号 1v1 消息** | 等价 |

### 12.2 模板消息发送

```typescript
// apps/api/src/modules/notifications/alipay-life.service.ts
@Injectable()
export class AlipayLifeService {
  constructor(
    private config: ConfigService,
    private alipaySdk: AlipaySdk,
  ) {}

  async sendTemplateMessage(params: {
    alipayUserId: string;
    templateId: string;
    data: Record<string, string>;
  }): Promise<{ msgId: string }> {
    const result = await this.alipaySdk.exec('alipay.open.public.message.template.send', {
      bizContent: {
        to_user_id: params.alipayUserId,
        template_id: params.templateId,
        // 模板数据，按模板定义传
        template_context: params.data,
        // 业务号（用于查证）
        biz_no: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      },
    });
    return { msgId: result.msg_id };
  }
}
```

### 12.3 模板 ID 申请

在 [支付宝生活号后台](https://life.alipay.com) → 模板消息 → 模板库 申请，每个业务场景单独申请：

| 场景 | 模板标题 | 关键词 |
|---|---|---|
| DLC 升级 | 等级提升通知 | `{{level}}` 等级提升至 `{{newLevel}}` |
| 支付成功 | 订单支付成功 | `{{orderName}}` 已支付 `{{amount}}` 元 |
| 邀请成功 | 好友加入 | `{{nickname}}` 通过你的邀请加入 |
| 凭证签发 | 凭证已签发 | `{{credentialName}}` 凭证已签发，点击查看 |
| 信用提升 | 信用等级变化 | 您的芝麻信用等级已更新 |

### 12.4 用户关注生活号引导

**无**原生 API 检测用户是否关注生活号（不像微信有 `userInfo.subscribe`）。**必须在产品流程中引导**：

```
┌──────────────────────────────────────┐
│ 用户支付完成 → 落地页底部 banner：     │
│   "关注生活号，接收订单通知"           │
│   [立即关注] (跳转生活号)             │
└──────────────────────────────────────┘
```

跳转 API：
```javascript
my.ap.navigateToAlipayPage({
  url: 'alipays://platformapi/startapp?appId=20000067&url=https%3A%2F%2Flife.alipay.com%2F...',
  success: () => { /* 用户到达生活号 */ },
  fail: () => { /* 跳转失败，可能未安装 */ },
});
```

---

## 13. 芝麻信用集成（**独有章节**）

> 芝麻信用是支付宝小程序**最具差异化**的能力。本章是**本端独占**章节，H5 / 微信小程序均无此能力。

### 13.1 业务价值

| 场景 | 信用分阈值 | 业务收益 |
|---|---|---|
| KYC 跳过活体 | ≥ 600 | 提升 KYC 通过率 30% |
| 先享后付 | ≥ 650 | 提升付费转化 25% |
| 风控白名单 | ≥ 700 | 减少人工审核 50% |
| 高端用户标签 | ≥ 700 | DLC 等级 + 1 速 |
| 信用支付 | ≥ 600 | 解锁"信用购" |

### 13.2 接入步骤

#### 步骤 1：申请芝麻信用能力
1. 在 [支付宝开放平台](https://open.alipay.com) → 应用 → 能力列表 → 申请"芝麻信用"
2. 提交"使用场景说明"（KYC / 风控 / 营销）
3. 审核 1-3 工作日，通过后获得 `ZM_SERVICE_ID`（服务 ID）
4. 在生活号后台绑定 `ZM_SERVICE_ID`

#### 步骤 2：前端授权
```xml
<!-- pages/credit/authorize.axml -->
<view class="zmcredit-page">
  <view class="title">授权芝麻信用</view>
  <view class="subtitle">授权后可享受更快 KYC、信用支付等权益</view>

  <button open-type="getAuthorize" scope="zmCredit"
          onTap="onGetZMCreditScore" class="btn-primary">
    立即授权
  </button>
</view>
```

```javascript
// pages/credit/authorize.js
async onGetZMCreditScore() {
  try {
    const res = await new Promise((resolve, reject) => {
      my.getZMCreditScore({
        success: resolve,
        fail: reject,
      });
    });
    // res = { zmScore: 720, zmScoreGrade: 'A', bizNo: '...' }
    await httpRequest({
      url: '/api/h5/credit/zm-authorize',
      method: 'POST',
      data: {
        zmScore: res.zmScore,
        zmScoreGrade: res.zmScoreGrade,
        bizNo: res.bizNo,
      },
    });
    my.showToast({ content: '授权成功', type: 'success' });
  } catch (err) {
    my.showToast({ content: '授权失败', type: 'none' });
  }
}
```

#### 步骤 3：后端保存快照
```typescript
// apps/api/src/modules/credit/zm-credit.service.ts
@Injectable()
export class ZmCreditService {
  async saveSnapshot(alipayUserId: string, params: {
    score: number;
    grade: string;
    bizNo: string;
    scene: string;
  }): Promise<ZmcCreditSnapshot> {
    return this.prisma.zmcCreditSnapshot.create({
      data: {
        alipayUserId,
        score: params.score,
        level: this.determineLevel(params.score),
        zmScoreGrade: params.grade,
        bizNo: params.bizNo,
        identityHash: this.hashIdentity(alipayUserId, params.bizNo),
        scene: params.scene,
        queryReason: '用户主动授权',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),  // 30 天
      },
    });
  }

  async checkScoreForKyc(alipayUserId: string, required: number): Promise<boolean> {
    const snapshot = await this.prisma.zmcCreditSnapshot.findFirst({
      where: {
        alipayUserId,
        score: { gte: required },
        expiresAt: { gt: new Date() },
        // 未消费或消费了但用于相同目的
        OR: [
          { isConsumed: false },
          { consumedFor: 'kyc_basic' },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    return !!snapshot;
  }

  async markConsumed(snapshotId: string, consumedFor: string): Promise<void> {
    await this.prisma.zmcCreditSnapshot.update({
      where: { id: snapshotId },
      data: { isConsumed: true, consumedAt: new Date(), consumedFor },
    });
  }

  private determineLevel(score: number): string {
    if (score >= 950) return 'EXCELLENT';
    if (score >= 700) return 'GREAT';
    if (score >= 650) return 'GOOD';
    if (score >= 600) return 'MEDIUM';
    return 'BAD';
  }
}
```

#### 步骤 4：KYC 流程联动

```typescript
// apps/api/src/modules/auth/realname.service.ts
@Injectable()
export class RealnameService {
  constructor(
    private zmCredit: ZmCreditService,
    private kycService: KycService,
  ) {}

  async processAlipayRealname(alipayUserId: string) {
    // 1. 尝试用芝麻信用跳过活体
    const hasZmCredit = await this.zmCredit.checkScoreForKyc(alipayUserId, 600);
    if (hasZmCredit) {
      // 信用分 ≥ 600，跳过活体，自动通过基础 KYC
      const snapshot = await this.zmCredit.findLatest(alipayUserId);
      await this.zmCredit.markConsumed(snapshot.id, 'kyc_basic');
      return this.kycService.autoApproveZm(alipayUserId, snapshot.score);
    }

    // 2. 走完整 my.userNameAuth 活体
    return this.kycService.startAlipayCertify(alipayUserId);
  }
}
```

### 13.3 反作弊与骚扰控制

| 规则 | 阈值 | 动作 |
|---|---|---|
| 同一用户 7 天内查询次数 | ≤ 1 | 超限拒绝，提示"7 天后再试" |
| 同一业务场景 30 天内未消费快照 | 1 条 | 重复查询**复用**快照，不调支付宝 |
| 同一支付宝 user_id 1 小时查询次数 | ≤ 3 | 超限风控，写 AuditLog |
| 业务侧"消费"信用分后 | 立即 isConsumed=true | 防重复使用 |

### 13.4 隐私与合规

- `my.getZMCreditScore` 返回的**仅是分值**，**不**是用户真实身份
- 后端**不**存用户身份证号、手机号（**仅**存信用分 + bizNo + identityHash）
- `identityHash` 是支付宝返回的"用户标识哈希"（SHA256），用于跨次查询去重
- 业务侧使用信用分**必须**有明确告知（i18n 字典 `credit.zmScore.usageNotice`）
- 用户**可**在支付宝"我的-芝麻信用-授权管理"中**撤回**授权，回调后业务侧必须立即删除 `zmcAuthorized`

---

## 14. i18n 多语言

按 [00-foundation §5.5.1 速查表](../../admin-prd/00-foundation.md) — 支付宝端 namespace 命名严格遵循。**新增 2 个 namespace**：

| 模块 | namespace | 备注 |
|---|---|---|
| 信用 | **`credit`** | **新增**：`credit.zmcScore.*` / `credit.zmLevel.*` |
| 认证 | **`auth`** | **新增**：`auth.alipayLogin.*` / `auth.realname.*` / `auth.zmcredit.*` |

支付宝端 4 语言切换（参考 [01-wechat-mini-program §13](./01-wechat-mini-program.md)），系统语言映射：
- `zh_CN` → `zh-CN`
- `en` → `en-US`
- `ja` → `ja-JP`
- `ko` → `ko-KR`

**新增 i18n key 清单**：

```json
{
  "credit": {
    "zmcScore": {
      "title": "芝麻信用",
      "authorize": "授权芝麻信用",
      "excellent": "信用极好",
      "great": "信用优秀",
      "good": "信用良好",
      "medium": "信用中等",
      "bad": "信用一般",
      "usageNotice": "您的信用分将用于 KYC 与风控判定"
    },
    "zmLevel": {
      "EXCELLENT": "信用极好",
      "GREAT": "信用优秀",
      "GOOD": "信用良好",
      "MEDIUM": "信用中等",
      "BAD": "信用一般"
    },
    "benefit": {
      "kycSkip": "信用分 ≥ 600 可跳过活体 KYC",
      "creditPay": "信用分 ≥ 650 可使用先享后付"
    }
  },
  "auth": {
    "alipayLogin": {
      "title": "支付宝登录",
      "btn": "支付宝一键登录",
      "success": "登录成功",
      "failed": "登录失败"
    },
    "realname": {
      "title": "实名认证",
      "init": "开始认证",
      "polling": "正在认证中",
      "passed": "认证通过",
      "rejected": "认证失败"
    },
    "zmcredit": {
      "title": "芝麻信用授权",
      "authorize": "立即授权",
      "skipOptional": "（可选，得 DVC 奖励）"
    }
  }
}
```

---

## 15. 验收用例

### 15.1 登录流程

| # | 用例 | 期望 |
|---|---|---|
| 1 | 首次 `my.getAuthCode` | 拿到 authCode，调后端拿 token + 跳转首页 |
| 2 | 已登录用户再次进入 | 静默登录（用本地 token） |
| 3 | 拒绝授权手机号 | 仅用 alipayUserId 建账号，profile 显示未绑定手机号 |
| 4 | 拒绝授权芝麻信用 | zmcAuthorized=false，跳过芝麻信用相关功能 |
| 5 | token 过期 | 自动跳登录页，重新 `my.getAuthCode` |
| 6 | 同一支付宝换手机号 | 提示"该支付宝账号已绑定其他手机号" |
| 7 | 未关注生活号 | 模板消息发送失败，后端降级为站内信 |

### 15.2 支付流程

| # | 用例 | 期望 |
|---|---|---|
| 1 | 下单 → `my.tradePay` | 成功，订单状态 `paid` |
| 2 | 支付中途退出 | 订单停在 `alipay_precreated`，5 分钟后过期（close 接口） |
| 3 | 花呗分期 | 收银台显示分期选项，用户选 3 期 / 6 期 / 12 期 |
| 4 | 支付宝异步通知 | 验签成功 + 写 DB + WebSocket 推前端 |
| 5 | 重复通知 | 幂等（订单已是 `paid` 直接返回 success） |
| 6 | 签名错误 | 拒绝 + 写 AuditLog(severity=critical) |
| 7 | 退款 30 天后 | 支付宝拒绝（订单超过 30 天不可退） |
| 8 | 支付时余额不足 | 收银台自动跳转花呗/银行卡，无需手动切换 |

### 15.3 分享裂变

| # | 用例 | 期望 |
|---|---|---|
| 1 | A 分享给 B，B 首次进入 | query 带 `ref=A.id` |
| 2 | A 生成吱口令并复制 | 吱口令文案含"海购星"+ 小程序链接 |
| 3 | B 扫描吱口令 | 进入小程序，识别 A 为邀请人 |
| 4 | B 完成注册 | 写 InvitationLog(source=zhikouling)，B 收 100 DVC，A 收 200 DVC |
| 5 | A 生成小程序码 | 后端调 `alipay.open.app.qrcode.create` 成功 |
| 6 | A 自我邀请 | 拒绝（`inviterId !== inviteeId`） |
| 7 | 同一支付宝 1 分钟分享 100 次 | 防刷，触发黑名单 + 提示 |

### 15.4 实名认证

| # | 用例 | 期望 |
|---|---|---|
| 1 | 信用分 700+ 用户授权芝麻 | 自动通过基础 KYC（跳过活体） |
| 2 | 信用分 550 用户授权芝麻 | 仍需走 my.userNameAuth 活体 |
| 3 | 走 my.userNameAuth 认证 | 调 `alipay.user.certify.open.initialize` 成功 |
| 4 | 用户完成活体 | 后端轮询拿到 PASSED，写 KYC=approved |
| 5 | 用户活体失败 | 后端轮询拿到 FAILED，提示用户重新认证 |
| 6 | 用户撤回芝麻信用授权 | 业务侧立即删 zmcAuthorized，KYC 状态降级 |

### 15.5 芝麻信用

| # | 用例 | 期望 |
|---|---|---|
| 1 | 用户授权，score=720 | 写 ZmcCreditSnapshot，level=GREAT |
| 2 | 7 天内重复查询 | 复用最近未消费快照，不调支付宝 |
| 3 | 7 天后再次查询 | 重新调支付宝，写新快照 |
| 4 | 用于 KYC 后 | isConsumed=true，consumedFor=kyc_basic |
| 5 | 30 天后快照过期 | 提示"请重新授权芝麻信用" |
| 6 | 信用分 < 600 | 不允许跳过活体 |

### 15.6 上线审核

| # | 用例 | 期望 |
|---|---|---|
| 1 | 类目正确 | 商业服务 / 金融（如支付/银行/税务涉及金融） |
| 2 | 用户协议 / 隐私政策 | 必须挂链接（`web-view` 跳 H5，仅同主体） |
| 3 | 备案号 | **不**需 ICP 备案（仅服务白名单） |
| 4 | 测试账号 | 提供给审核员的测试支付宝账号 + 密码 |
| 5 | 关键词过滤 | 政治/色情/暴力/违禁品（金融类审核更严） |
| 6 | 生活号关联 | 必须绑定生活号（用于模板消息） |
| 7 | 芝麻信用能力 | 单独申请，单独审核 |

---

## 16. 性能与优化

### 16.1 包大小控制

- 主包 ≤ 2MB（超出需分包）
- 单个分包 ≤ 2MB
- 图片用 CDN 引用，**不**打入包
- 支付宝自动启用按需加载（`enableAppxNg: true`）

### 16.2 启动性能

- 首屏渲染 < 1.5s
- 启动到可交互 < 3s
- 用 `app.js` 的 `onLaunch` **不**做重操作（仅拉 token 校验）

### 16.3 数据预取

```javascript
// app.js
onLaunch() {
  this.prefetchCriticalData();
},

async prefetchCriticalData() {
  Promise.all([
    httpRequest({ url: '/api/h5/user/me', showLoading: false }).catch(() => null),
    httpRequest({ url: '/api/h5/dlc/level', showLoading: false }).catch(() => null),
    httpRequest({ url: '/api/h5/notifications/unread-count', showLoading: false }).catch(() => null),
    // 支付宝特有：拉芝麻信用状态
    httpRequest({ url: '/api/h5/credit/zm-score', showLoading: false }).catch(() => null),
  ]).then(([user, level, unread, zmScore]) => {
    this.globalData.user = user;
    this.globalData.level = level;
    this.globalData.unread = unread;
    this.globalData.zmScore = zmScore;
  });
},
```

### 16.4 支付性能优化

- **不**预先调 `alipay.trade.create`（等用户点"立即支付"再调）
- `tradeStr` 用完后立即**清除缓存**（防泄漏）
- 花呗分期 `hb_fq_num` 仅在用户主动选分期时传入

---

## 17. 发布流程

### 17.1 提审清单

- [ ] 全局 HTTPS 配置正确
- [ ] 服务器域名白名单已配（request / uploadFile / downloadFile / socket）
- [ ] 业务域名已配（仅同主体，用于 web-view）
- [ ] 用户协议 + 隐私政策链接
- [ ] 类目与代码内容一致
- [ ] 测试账号可正常走通核心流程
- [ ] 关键词过滤（金融类更严）
- [ ] 性能数据达标（首屏 < 1.5s）
- [ ] 兼容性测试（iOS 11+ / Android 7+）
- [ ] 灰度用户白名单（10% → 50% → 100%）
- [ ] **金融类**额外检查：营业执照、经营许可证、KYC 流程
- [ ] **生活号关联**：必须先有已审核通过的生活号

### 17.2 类目选择（金融类必看）

| 业务 | 支付宝类目 | 备注 |
|---|---|---|
| Discover / Services / AI | 商业服务 | 普通类目 |
| 支付 / 充值 / 提现 | 金融 - 支付 | 需金融许可证 |
| 银行贷款 | 金融 - 银行 | 需银行牌照 |
| 保险 | 金融 - 保险 | 需保险牌照 |
| 投资 / 理财 | 金融 - 理财 | 需金融许可证 |
| 税务咨询 | 商业服务 - 咨询 | 普通类目 |
| 公司注册 | 商业服务 - 工商 | 普通类目 |
| 跨境汇款 | 金融 - 跨境 | 需跨境支付牌照 |

### 17.3 灰度发布

```javascript
// app.js - 灰度逻辑
async checkGrayRelease() {
  const res = await httpRequest({
    url: '/api/h5/config/gray',
    method: 'GET',
    showLoading: false,
  });
  if (res.grayVersion && res.grayVersion !== this.globalData.version) {
    my.confirm({
      title: '发现新版本',
      content: '是否立即更新？',
      success: (r) => {
        if (r.confirm) my.updateApp();
      },
    });
  }
}
```

### 17.4 紧急回滚

- 在支付宝开放平台 → 版本管理 → 撤回审核（审核中可撤回）
- 紧急情况联系支付宝客服（已上架的版本不可撤回，但可发"版本更新提示"）

---

## 18. 反作弊

### 18.1 邀请刷量

- 同 IP 1 分钟内 ≥ 3 次邀请绑定 → 标记可疑
- 同一被邀请人 7 天内被多个邀请人绑定 → 取第一个，其余忽略
- 邀请人 / 被邀请人设备指纹（`my.getSystemInfo` 的 `model` + `system` + `platform`）相同 → 拒绝

### 18.2 支付刷单

- 同 alipayUserId 1 分钟内 ≥ 5 笔订单 → 风控
- 退款率 > 30% 的用户 → 标记 + 人工审核
- 同一银行卡号短时间多笔退款 → 报警
- 花呗分期异常高频（> 5 笔/天）→ 标记疑似套现

### 18.3 分享刷量

- 单 alipayUserId 1 分钟分享 ≥ 10 次 → 限速（10s/次）
- 同一吱口令 1 小时被打开 ≥ 1000 次 → 标记 + 限速
- 同一小程序码 1 小时被扫描 ≥ 5000 次 → 标记 + 限速

### 18.4 芝麻信用刷分

- 同一 alipayUserId 7 天内查询 ≥ 1 次 → 限速（防骚扰）
- 异常信用分突增（30 天内 +200）→ 风控标记
- 用户撤回授权后**仍**使用旧快照 → 拒绝

### 18.5 实名认证绕过

- 信用分刷到 ≥ 600 后做违规操作 → **额外**人审
- `realNameStatus=partial` 用户购买金融类服务 → 拒绝

---

## 19. 监控与日志

### 19.1 关键指标

- 日活（DAU）/ 月活（MAU）
- 启动成功率
- API 成功率（按端分 `X-Client: alipay-miniprogram`）
- 支付成功率（支付宝端 vs 微信端）
- 分享转化率（onShareAppMessage 触发 → 实际分享）
- 吱口令分享转化率
- 芝麻信用授权率
- 生活号关注率

### 19.2 上报 SDK

```javascript
// utils/tracker.js
function trackEvent(event, params = {}) {
  httpRequest({
    url: '/api/h5/track',
    method: 'POST',
    data: {
      event,
      params,
      alipayUserId: my.getStorageSync({ key: 'userInfo' }).data?.alipayUserId,
      page: getCurrentPages().pop()?.route,
      ts: Date.now(),
    },
    showLoading: false,
  }).catch(() => null);

  // 上报到支付宝分析（可选）
  if (my.reportEvent) my.reportEvent(event, params);
}

module.exports = { trackEvent };
```

### 19.3 关键业务日志

- **登录**：authCode → userId 映射、首次 / 老用户、芝麻信用授权状态
- **支付**：tradeNo 映射、支付方式（花呗 / 余额 / 余额宝 / 银行卡）、分期数
- **退款**：原 tradeNo、退款金额、退款原因、是否花呗
- **分享**：onShareAppMessage 触发、吱口令生成、小程序码生成
- **实名**：init / query / 成功 / 失败、是否芝麻信用跳过
- **芝麻信用**：query 触发、消费、过期、撤回

---

## 20. 跨文件一致性检查（每个 P0 模块必勾）

> **为什么需要这章**：本文件与微信小程序文件（[01-wechat-mini-program.md](./01-wechat-mini-program.md)）共享 80% 业务逻辑（订单 / 邀请 / DLC），但**支付宝特有部分**（芝麻信用、生活号、V3 支付）必须**独立管理**，避免一方改动影响另一方。

- [ ] 状态枚举值是否在 00-foundation §8.3.1 扩展色彩表里有映射？（支付宝新增 `ALIPAY_PRECREATED` / `ZMC_*`）
- [ ] 状态变更是否走 00-foundation §4.3 独立日志表模式？（`OrderStatusLog` / `AlipayUserStatusLog` / `ZmcCreditSnapshot`）
- [ ] `*UserId` 字段是否按 00-foundation §12 加 `@relation("Name")` + `onDelete: Restrict`？（`AlipayUser.userId` / `ZmcCreditSnapshot.alipayUserId`）
- [ ] i18n namespace 是否在 00-foundation §5.5.1 速查表里？（**新增** `credit` / `auth`，其他复用）
- [ ] 退款是否走 00-foundation §7.5 统一约定？（`Transaction.refundedAmount` + `Refund`）
- [ ] 资源级权限判定是否走 00-foundation §3.5？（accessLevel / DLC 等级 / KYC 状态）
- [ ] 凭证加密是否走 00-foundation §11 KMS？（`AlipayUser.phoneNumber` 强制 KMS 加密）
- [ ] **支付宝特有**：芝麻信用是否走 `ZmcCreditSnapshot` 快照表，不存明文分值？
- [ ] **支付宝特有**：生活号模板消息是否在用户**未关注**时降级为站内信？
- [ ] **支付宝特有**：支付回调是否做幂等（多次通知只处理一次）？
- [ ] **支付宝特有**：V3 公私钥是否走 KMS，**不**直接进 .env？

---

## 21. 未来规划（v2）

- ⏸ 跨境支付：完整支持 `alipay.trade.create` 的 `forex_biz` 字段
- ⏸ 商家入驻：完整 T+0 结算流程
- ⏸ 支付宝国际（alipay+）海外用户支持
- ⏸ 小程序直播（仅特定类目可用）
- ⏸ 信用支付（先享后付）全场景接入
- ⏸ 跨端：迁移到 Taro（如果需要同时支持 H5 / RN / 支付宝 / 微信）
- ⏸ AR 扫描（用于 KYC 活体检测补充）
