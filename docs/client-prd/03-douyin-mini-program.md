# 03 · 抖音/字节小程序（Douyin Mini Program / ByteDance MicroApp）

> **对应 H5**：H5 端全部 20 个菜单（**复用 H5 后端 API** `/api/h5/*`，仅前端框架改为字节原生）
> **核心目标**：基于抖音 8 亿+ DAU 流量生态做"短视频挂载 + 直播间小黄车 + 拍视频带小程序"三重裂变，重点覆盖内容获客、AI 名片裂变、游戏化拉新。
> **后端**：与 H5 / 微信小程序共用 `apps/api` NestJS 服务
> **前端**：抖音原生小程序（**不**用 Taro 跨端编译——抖音 IDE 调试对原生 tt.* API 支持最好，且可减少包体 30%）
> **特别说明**：本端是**唯一**同时具备"短视频挂载 + 直播挂车 + 内容生态获客"的小程序端，是项目 DAU 增长的核心引擎。

---

## 1. 业务目标

> **为什么需要这章**：抖音小程序的核心价值不是"工具"，而是"流量"。所有指标必须围绕"内容曝光 + 创作者裂变 + 直播间转化"展开——这是和微信小程序最大的差异。

| 目标分类 | 指标 | 目标值 | 备注 |
|---|---|---|---|
| **流量入口** | 短视频挂载曝光 UV | ≥ 50 万/日 | 来自 POI / 话题 / BGM 挂载 |
| | 直播间小黄车点击 UV | ≥ 8 万/日 | 直播间挂车引导进店 |
| | 抖音搜索 PV | ≥ 3 万/日 | 品牌词 + 长尾词 |
| | 推荐流 UV | ≥ 20 万/日 | 千人千面推荐 |
| **拉新** | 拉新成本 CAC | < $0.8（vs H5 渠道 $5+） | 抖音是全渠道最低 CAC |
| | 7 日留存 | ≥ 28% | 抖音用户决策快但易流失 |
| | 30 日留存 | ≥ 12% | 视频号对比更高 |
| **裂变** | 拍视频裂变 K 因子 | ≥ 2.5 | 抖音**独有**裂变路径，K 因子远超微信 |
| | 单创作者平均带新 | ≥ 18 人/视频 | 头部创作者可达 500+ |
| | 海购星话题累计播放 | ≥ 1 亿次 | 半年累计 |
| **内容指标** | 创作者月活 | ≥ 3000 人 | 拍视频挂载点的活跃创作者 |
| | 平均视频完播率 | ≥ 35% | 健康内容指标 |
| | 平均视频点赞率 | ≥ 4.5% | — |
| **支付转化** | 字节支付成功率 | ≥ 82% | 字节支付成功率普遍低于微信（无密码支付习惯） |
| | 客单价 | ≥ $58 | 抖音用户偏冲动消费 |
| | 直播间挂车 GMV | ≥ $20 万/月 | — |

---

## 2. 用户故事

> **为什么需要这章**：抖音生态有**三类用户**：普通消费者、创作者、商家。需要分别覆盖。

| # | 角色 | 故事 |
|---|---|---|
| US-1 | 游客 | 我在抖音刷到带"海购星小程序"挂载点的短视频，点卡片直接进 Discover 流（**无需登录即可看**，登录是后续操作） |
| US-2 | 游客 | 我在抖音看直播间，主播挂"小黄车"显示海购星服务，我点"去看看"跳转小程序下单 |
| US-3 | 新用户 | 我点"抖音一键登录"完成授权 + 绑定手机号（**必须登录抖音 app**，无游客深度使用） |
| US-4 | 创作者 | 我在"自媒体中心"拍一条"教你在萨摩亚开公司"的视频，挂载"海购星小程序"POI，发布后有人从我视频进店下单，我拿 DVC 奖励 |
| US-5 | 创作者 | 我拍视频时直接选"挂载小程序"，从模板库里选"AI 名片"模板，拍完视频自动@我的小程序名片 |
| US-6 | DLC 4 用户 | 我在直播间看到主播推荐 DLC 5 权益，扫码进入后引导我升级 |
| US-7 | 商家 | 我用抖音小程序扫码登录 admin-web 端做后台管理 |
| US-8 | 客服 | 我在小程序 AI Chat 接管用户对话（**注意**：抖音 AI Chat 必须先过内容审核） |
| US-9 | 用户 | 我把"我的 AI 名片"分享到抖音私信，好友点开直接看到我名片（**注意**：抖音分享走 `tt.shareAppMessage`，**不**走微信小程序码） |
| US-10 | 老用户 | 我关注了"海购星"抖音号（**私域沉淀**），后续活动从抖音号私信通知 |

---

## 3. 与 H5 / 微信小程序的差异（**重点章节**）

> **为什么需要这章**：抖音小程序和微信小程序的 API 名称、流量入口、审核标准、私域能力**完全不同**——本章是项目其他端转抖音端的同事必读。

### 3.1 复用部分（**后端 API 不动**）

- 所有 `/api/h5/*` 接口 100% 复用
- 所有 Prisma 数据模型 100% 复用（**新增** `DouyinUser` / `VideoMount` / `LiveRoom` / `ContentAudit` 4 张表）
- i18n 字典文件复用（小程序端用 i18next 适配版）
- 业务状态机、权限点、审计日志全部复用

### 3.2 改造部分（**前端实现差异**）

| 维度 | H5 | 微信小程序 | **抖音小程序** | 改造点 |
|---|---|---|---|---|
| 框架 | Vite + React 19 | WXML/WXSS/JS | **TTML/TTSS/JS** | 完全重写 |
| API 前缀 | `wx.*` | `wx.*` | **`tt.*`** | 全量替换 |
| 网络请求 | `fetch` | `wx.request` | **`tt.request`** | 封装层替换 |
| 登录 | 手机号 + 密码 | `wx.login()` | **`tt.login()`** | 新增 `/api/h5/auth/tt-login` |
| 获取用户信息 | 用户输入 | `wx.getUserProfile` | **`tt.getUserInfo`** | — |
| 支付 | Stripe / Alipay | `wx.requestPayment` | **`tt.pay`**（独立字节支付通道） | 新增 `BytePayController` |
| 分享 | `navigator.share` | `onShareAppMessage` | **`tt.shareAppMessage`** | — |
| **拍视频带挂载** | ❌ | ❌ | ✅ **`tt.chooseVideo` + `tt.openSchema`** | 抖音**独有** |
| **跳转直播间** | ❌ | ❌ | ✅ **`tt.openSchema('ttlive://')`** | 抖音**独有** |
| **视频详情** | ❌ | ❌ | ✅ **`tt.navigateToVideoView`** | 抖音**独有** |
| 推送 | Web Push | 订阅消息 / 服务号 | **消息订阅（弱）** | 仅单次触达 |
| 客服消息 | WebSocket | 微信客服 | **抖音 IM（受限）** | 仅基础收发 |
| 域名 | `https://smy.app` | request 域名 | **serverDomain 配置** | 抖音后台单独配 |
| 摄像头扫码 | `getUserMedia` | `wx.scanCode` | **`tt.scanCode`** | — |
| 文件下载 | `<a download>` | `wx.downloadFile` | **`tt.downloadFile`** | — |
| 视频播放 | `<video>` | `<video>` | **`<tt-video>` + `tt.list-view`** | 抖音性能更好 |
| 客服 IM | WebSocket | 微信客服 | **`tt.openChatTool`** | 抖音客服 |
| 实名认证 | 手机号 | 手机号 + 微信实名 | **抖音实名（强）** | 必须用抖音账号真实身份 |
| 后台保活 | — | — | **`tt.setKeepScreenOn`** | 直播间需要 |
| 屏幕录制 | `MediaRecorder` | 录屏 API | **`tt.getRecorderManager`** | 创作者录制 |

### 3.3 抖音**独有**能力（重点）

#### 3.3.1 短视频挂载（最核心裂变路径）

```
用户 A 在抖音看创作者 B 的"萨摩亚开公司"短视频
  ↓
视频左下角显示"小程序 · 海购星"卡片
  ↓
用户 A 点击 → 调起海购星抖音小程序 → 落地到 Discover
  ↓
（**关键**）此时 query 带: 
  - from=video_mount
  - videoId=B.videoId
  - creatorId=B.userId
  - poi=xxx (挂载点)
  ↓
A 进入 → 注册 → 后端写 InvitationLog
  ↓
B 创作者后台看到"我带来的新用户" + 获得 DVC 奖励
```

**API**：`tt.navigateToMiniProgram` / `tt.openSchema` / `tt.navigateToVideoView`

#### 3.3.2 直播间小黄车

```
主播 C 在抖音开"海购星出海咨询"直播间
  ↓
主播后台把"AI 名片服务"挂到小黄车
  ↓
观众 D 看到小黄车 → 点"去看看"
  ↓
tt.openSchema('ttlive://webview?url=...') 唤起小程序
  ↓
D 落地到商品详情 → 下单 → 字节支付
```

**API**：`tt.openSchema({ scheme: 'ttlive://...' })` / `tt.navigateToMiniProgram`

#### 3.3.3 拍视频带小程序（K 因子最高）

```
海购星用户 E 进入"自媒体中心" → 点"拍视频带挂载"
  ↓
调起抖音录制界面（tt.chooseVideo 或调起原生相机）
  ↓
E 录制完 → 在发布页可选"挂载海购星小程序"
  ↓
E 选挂载点（如"AI 名片 / 公司注册"）
  ↓
发布 → 视频带"小程序 · 海购星"挂载点
  ↓
E 的粉丝看到后点击 → 进入小程序
  ↓
E 获得 DVC 奖励 + 海购星涨粉
```

**API**：`tt.chooseVideo` / `tt.saveVideoToPhotosAlbum` / `tt.openSchema`

#### 3.3.4 内容生态（推荐流 / 搜索）

- 抖音**没有**"服务号" / "订阅号"概念
- 长期触达**只能**靠"内容"——发短视频、做直播、运营"海购星"品牌话题
- 用户关注"海购星"抖音号后，可通过**私信**触达（但有频次限制）

#### 3.3.5 抖音支付（独立通道）

- 抖音支付 = 字节跳动旗下支付公司"合众支付"通道
- 用户**必须**先绑定银行卡或抖音零钱（首次支付引导）
- 支付完成**不走**微信异步通知格式，走字节**自有回调协议**

### 3.4 不支持的能力（明确告知产品）

| ❌ 不支持 | 替代方案 |
|---|---|
| 服务号 / 订阅号 | 引导关注"海购星"抖音号（私域沉淀） |
| 模板消息（长期推送） | 仅"消息订阅"单次推送 |
| 微信卡券 | 引导到 H5 领取 |
| Web3 钱包（无 `window.ethereum`） | 云端代理签名 / 引导 H5 |
| Push API | 抖音 IM + 订阅消息 |
| Service Worker | `tt.setStorageSync` 限制 10MB / key |
| IndexedDB | 同上 |
| 游客深度使用 | **必须**先登录抖音 |
| 跨平台 unionid | 无 unionid 概念，仅 `openid` + `anonymous_openid` |

### 3.5 关键决策

- **不做"抖音版"业务逻辑**：完全复用 H5 业务，前端只做**壳**适配
- **不引入 Taro / uni-app**：抖音 IDE 对 tt.* 原生 API 调试最稳，跨端编译会丢 10-15% 性能
- **不引入"游客模式"**：抖音 app 登录态全局共享，进入小程序就是登录态
- **不做"小窗浮窗"**：抖音小程序无 PWA 浮窗能力

---

## 4. 业务流程

### 4.1 登录授权流程（**必须先登录抖音**）

```
┌──────────┐                ┌──────────┐                ┌──────────┐
│  小程序  │                │  后端    │                │ 抖音服务 │
└────┬─────┘                └────┬─────┘                └────┬─────┘
     │  1. tt.login()            │                            │
     │ ──────────────────────►   │                            │
     │                           │  2. code2Session           │
     │                           │ ────────────────────────►  │
     │                           │ ◄─ openid+anonymousOpenid ─│
     │                           │     + sessionKey            │
     │                           │                            │
     │  3. /api/h5/auth/tt-login │                            │
     │    { code, encryptedData, iv }                          │
     │ ──────────────────────►   │                            │
     │                           │  4. 解密抖音手机号(可选)    │
     │                           │ ────────────────────────►  │
     │                           │ ◄─── phoneNumber ─────────│
     │                           │                            │
     │  5. { token, userInfo }   │                            │
     │ ◄────────────────────────│                            │
     │                           │                            │
```

**关键点**：
- `tt.login()` 不弹窗，仅拿临时 code（**3 分钟**有效）
- 拿手机号需用户**主动**点 `<button open-type="getPhoneNumber">`，触发弹窗
- 抖音 openid 跟微信完全独立，**不**互通
- 抖音有"匿名 openid"（`anonymous_openid`）：未登录用户唯一标识，可用于埋点但**不**可绑定业务账号
- **必须**在抖音 app 已登录状态才能用小程序（无"游客深度使用"）

```javascript
// pages/login/login.js
const { request } = require('../../utils/request');

Page({
  data: { phoneAuthVisible: false },

  async onDouyinLogin() {
    try {
      // tt.login 是异步 Promise 风格
      const { code, anonymousOpenid } = await tt.login({
        force: false,  // 不强制重新登录，复用抖音 app 登录态
      });
      const data = await request({
        url: '/api/h5/auth/tt-login',
        method: 'POST',
        data: {
          code,
          anonymousOpenid,
          appid: 'tt_your_appid',
        },
        showLoading: true,
      });
      if (data.needPhoneBind) {
        this.setData({ phoneAuthVisible: true });
        this._tempCode = code;
      } else {
        tt.setStorageSync('token', data.token);
        tt.setStorageSync('userInfo', data.user);
        this._onLoginSuccess();
      }
    } catch (err) {
      tt.showToast({ title: err.message, icon: 'none' });
    }
  },
});
```

### 4.2 视频挂载流程（**核心拉新路径**）

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ 创作者B  │  │  抖音 IDE │  │  海购星后端│  │  抖音挂载 │  │  观众A   │
│  拍视频   │  │  审核     │  │  业务     │  │  服务     │  │  观看    │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │ 1. 选挂载点  │             │             │             │
     │ (POI/小程序) │             │             │             │
     │ ─────────────────────────► │             │             │
     │             │             │ 2. 校验挂载点│             │
     │             │             │ 是否存在/启用│             │
     │             │             │             │             │
     │ 3. 发布视频  │             │             │             │
     │ ──────────────────────────────────────► │             │
     │             │ 4. 内容审核  │             │             │
     │             │ ────────────────────────► │             │
     │             │             │ 5. AI+人工二审│             │
     │             │             │ ──────────► │             │
     │             │             │             │             │
     │             │             │             │ 6. 视频曝光  │
     │             │             │             │ ──────────► │
     │             │             │             │             │ 7. 观众点卡片
     │             │             │             │ ◄──────────│
     │             │             │             │ 8. 唤起小程序│
     │             │             │             │ ──────────► │
     │             │             │ 9. 落地+埋点 │             │
     │             │             │ ◄──────────│             │
     │             │             │             │             │
     │ 10. 创作者奖励│             │             │             │
     │ ◄─────────────────────────│             │             │
```

**关键点**：
- 挂载点必须**先在海购星后台录入**（POI 库 / 模板库 / 自定义）
- 视频发布后抖音会**二次审核**（内容安全 + 挂载点合规）
- 审核不通过：视频发布但**不带挂载**（降级）
- 观众点击视频挂载后，后端记录 `VideoMountClick`，**创作者获 DVC 奖励**

### 4.3 直播间小黄车流程

```
主播 C 在"巨量百应" / "抖音直播伴侣" 端
  ↓
挂车配置：选择"海购星小程序" + 具体商品
  ↓
直播开始，直播间右下角显示小黄车
  ↓
观众 D 看到 → 点"去看看"
  ↓
tt.openSchema({ scheme: 'ttlive://webview?url=...' })
  ↓
唤起海购星小程序 → 落到商品详情
  ↓
D 下单 → 字节支付
  ↓
支付完成 → tt.pay success 回调
  ↓
后端 BytePayCallback → 更新订单 + 写 DVC + 通知主播
```

**关键点**：
- 直播挂车**必须**在开播前挂好（开播中不能修改）
- 直播间**只**支持"商品 / 服务"挂车（不支持"内容 / 资料"）
- 直播中点击小黄车会**中断**观看（无小窗模式）

### 4.4 字节支付流程

```
1. 用户在"商品详情"点"立即购买"
   ↓
2. 前端 POST /api/h5/orders → 后端生成订单
   ↓
3. 后端调字节"合众支付"统一下单接口
   → 拿到 prepay_id + 签名参数
   ↓
4. 后端返回 prepay 给前端
   ↓
5. 前端调 tt.pay({ orderInfo })
   ↓
6. 抖音拉起收银台（用户在抖音 app 内完成支付）
   ↓
7. 字节支付回调 BytePayCallback（**异步**，**不**保证及时）
   ↓
8. 后端验签 + 更新 Order.status = 'paid' + 触发 DLC 升级
   ↓
9. 后端通过 WebSocket 推 order.paid 事件
   ↓
10. 前端 toast + 跳详情
```

**关键点**：
- 字节支付**必须**在抖音 app 内完成（无 H5 / PC 收银台）
- 支付超时：订单 5 分钟后过期（跟微信一致）
- 字节支付回调**没有**微信那种统一签名格式，需参考字节支付 v3 文档
- 退款用 `tt.refund` API（独立接口）

```javascript
// utils/payment.js
async function douyinPay({ orderId, amount, description }) {
  // 1. 调后端拿 prepay
  const prepay = await request({
    url: '/api/h5/payments/tt-prepay',
    method: 'POST',
    data: { orderId, amount, description },
  });

  // 2. 调起字节支付
  return new Promise((resolve, reject) => {
    tt.pay({
      orderInfo: {
        orderId: prepay.orderId,        // 商户单号
        prepayId: prepay.prepayId,      // 预支付单号
        appId: 'tt_your_appid',
        sign: prepay.sign,              // 签名
        signType: 'MD5',
        timestamp: prepay.timestamp,
        nonceStr: prepay.nonceStr,
        package: prepay.package,
      },
      success: (res) => {
        // res.code === 0 表示成功
        if (res.code === 0) {
          resolve(res);
        } else {
          reject(new Error(res.errMsg || '支付失败'));
        }
      },
      fail: (err) => reject(err),
    });
  });
}
```

### 4.5 拍视频带小程序裂变流程（**K 因子最高**）

```
用户 E 进入"自媒体中心"
  ↓
点"拍视频带挂载"按钮
  ↓
tt.chooseVideo / 调起抖音原生相机
  ↓
E 录制完 → 选挂载点
  ↓
选模板：
  - AI 名片模板（"我是 XX，我在用海购星"）
  - 公司注册模板（"萨摩亚开公司就上"）
  - DLC 升级模板（"我刚升到 DLC 5"）
  ↓
tt.shareAppMessage({ channel: 'video', templateId, videoPath })
  ↓
发布到抖音 → 视频带"小程序 · 海购星"卡片
  ↓
E 的粉丝看到 → 100 人观看 → 15 人点击挂载 → 8 人注册
  ↓
E 获奖励：8 人 × 50 DVC = 400 DVC
  ↓
海购星获：8 个新用户，CAC = 0
```

**关键点**：
- **不**在海购星 app 内做视频编辑（性能差 + 审核麻烦）
- 调起抖音原生相机/相册，**让抖音做视频编辑**
- 模板库是**预生成**的（CDN），**不**在端上动态合成
- 必须有"防刷"：同创作者 1 天最多发 5 条带挂载的视频

---

## 5. 字段定义（抖音特有）

### 5.1 DouyinUser（抖音用户映射）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | UUID |
| userId | String | ✓ | 关联 `User.id`（00-foundation §13 双身份允许） |
| openid | String(64) | ✓ | 抖音 openid，唯一 |
| anonymousOpenid | String(64) | | 匿名 openid（未登录态） |
| unionid | String(64) | | 跨抖音生态 unionid（如有） |
| appid | String(64) | ✓ | 多小程序隔离 |
| nickname | String | | 抖音昵称 |
| avatarUrl | String | | 抖音头像 |
| douyinId | String | | 抖音号（如"海购星官方"） |
| phoneNumber | String | | 解密后手机号（用户授权后） |
| phoneAuthorized | Boolean | | 是否授权过手机号 |
| realNameVerified | Boolean | | 抖音是否实名 |
| lastLoginAt | DateTime | | |
| lastShareAt | DateTime | | 上次分享时间（防刷） |
| lastVideoUploadAt | DateTime | | 上次发视频时间（防刷） |
| creatorLevel | Int | | 创作者等级（抖音 API 返回） |
| createdAt, updatedAt, deletedAt | | | 通用 |

```prisma
model DouyinUser {
  id                 String   @id @default(uuid())
  userId             String
  user               User     @relation("DouyinUserMapping", fields: [userId], references: [id], onDelete: Restrict)
  openid             String
  appid              String
  anonymousOpenid    String?
  unionid            String?
  nickname           String?
  avatarUrl          String?
  douyinId           String?
  phoneNumber        String?
  phoneAuthorized    Boolean  @default(false)
  realNameVerified   Boolean  @default(false)
  creatorLevel       Int      @default(0)
  lastLoginAt        DateTime?
  lastShareAt        DateTime?
  lastVideoUploadAt  DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  deletedAt          DateTime?

  @@unique([appid, openid])
  @@index([userId])
  @@index([unionid])
  @@index([douyinId])
}
```

### 5.2 VideoMount（视频挂载点）

> **为什么需要这章**：挂载点是抖音独有的"内容获客"基础设施，必须独立成表。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | UUID |
| mountCode | String | ✓ | 挂载点编码（如 `aiCard` / `companyRegister`） |
| name | String | ✓ | 挂载点名称（多语言） |
| description | String | | 描述 |
| poiId | String | | 关联 POI ID（可选） |
| landingPage | String | ✓ | 挂载落地页（小程序路径） |
| status | enum | ✓ | `active` / `paused` / `archived` |
| templateCount | Int | | 模板数量 |
| dailyClickLimit | Int | | 每日点击上限（防刷） |
| createdBy | String | ✓ | 运营 adminUserId |
| createdAt, updatedAt, deletedAt | | | 通用 |

```prisma
model VideoMount {
  id              String   @id @default(uuid())
  mountCode       String   @unique
  name            String
  nameI18n        String?  // JSON: {zh-CN, en-US, ja-JP, ko-KR}
  description     String?
  poiId           String?
  landingPage     String
  status          String   @default("active")
  templateCount   Int      @default(0)
  dailyClickLimit Int      @default(10000)
  createdBy       String
  createdByUser   AdminUser @relation("VideoMountCreatedBy", fields: [createdBy], references: [id], onDelete: Restrict)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  clicks          VideoMountClick[]

  @@index([status])
  @@index([mountCode])
}

model VideoMountClick {
  id              String   @id @default(uuid())
  mountId         String
  mount           VideoMount @relation(fields: [mountId], references: [id], onDelete: Restrict)
  videoId         String   // 抖音视频 ID
  videoTitle      String?
  creatorId       String   // 创作者 userId
  creator         User     @relation("VideoMountClickCreator", fields: [creatorId], references: [id], onDelete: Restrict)
  viewerOpenid    String   // 观众 openid（未注册也记录）
  isNewUser       Boolean  @default(false)
  clickedAt       DateTime @default(now())

  @@index([mountId, clickedAt])
  @@index([creatorId, clickedAt])
  @@index([videoId])
}
```

### 5.3 LiveRoom（直播间）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | UUID |
| roomId | String | ✓ | 抖音直播间 ID |
| title | String | ✓ | 直播间标题 |
| status | enum | ✓ | `offline` / `preview` / `live` / `ended` |
| hostUserId | String | ✓ | 主播 userId |
| startTime | DateTime | | 开播时间 |
| endTime | DateTime | | 关播时间 |
| viewerCountPeak | Int | | 峰值观众数 |
| productCount | Int | | 挂车商品数 |
| totalGmv | Decimal | | 累计 GMV |
| createdAt, updatedAt, deletedAt | | | 通用 |

```prisma
model LiveRoom {
  id              String   @id @default(uuid())
  roomId          String   @unique
  title           String
  status          String   @default("offline")
  hostUserId      String
  host            User     @relation("LiveRoomHost", fields: [hostUserId], references: [id], onDelete: Restrict)
  startTime       DateTime?
  endTime         DateTime?
  viewerCountPeak Int      @default(0)
  productCount    Int      @default(0)
  totalGmv        Decimal  @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  statusLogs      LiveRoomStatusLog[]
  orders          Transaction[]   // 直播间成交订单

  @@index([hostUserId, status])
  @@index([status, startTime])
}

// 业务状态日志（按 00-foundation §4.3 独立日志表模式）
model LiveRoomStatusLog {
  id           String   @id @default(uuid())
  roomId       String
  room         LiveRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  fromStatus   String
  toStatus     String
  note         String?
  operatorId   String?
  operator     AdminUser? @relation("LiveRoomStatusLogOperator", fields: [operatorId], references: [id], onDelete: Restrict)
  operatorRole String?
  createdAt    DateTime @default(now())

  @@index([roomId, createdAt])
  @@index([toStatus, createdAt])
}
```

### 5.4 ContentAudit（内容审核记录，**抖音 AI + 人工二审**）

> **为什么需要这章**：抖音对内容审核极严——**AI 审核 + 人工二审**是必经流程。本表是合规要求，必须独立。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | UUID |
| targetType | enum | ✓ | `video` / `comment` / `live_chat` / `card` / `nickname` |
| targetId | String | ✓ | 目标对象 ID |
| userId | String | | 提交者 userId |
| status | enum | ✓ | `pending` / `ai_passed` / `ai_rejected` / `human_passed` / `human_rejected` / `banned` |
| aiAuditResult | String | | AI 审核结果 JSON（命中关键词 / 风险等级） |
| aiAuditedAt | DateTime | | |
| humanAuditedBy | String | | 人工审核 adminUserId |
| humanAuditedAt | DateTime | | |
| rejectionReason | String | | 驳回原因 |
| keywords | String | | 命中的关键词（多关键词逗号分隔） |
| createdAt, updatedAt | | | 通用 |

```prisma
model ContentAudit {
  id              String   @id @default(uuid())
  targetType      String   // video / comment / live_chat / card / nickname
  targetId        String
  userId          String?
  user            User?    @relation("ContentAuditSubmitter", fields: [userId], references: [id], onDelete: Restrict)
  status          String   @default("pending")
  aiAuditResult   String?  // JSON
  aiAuditedAt     DateTime?
  humanAuditedBy  String?
  humanAuditedByUser AdminUser? @relation("ContentAuditOperator", fields: [humanAuditedBy], references: [id], onDelete: Restrict)
  humanAuditedAt  DateTime?
  rejectionReason String?
  keywords        String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([targetType, targetId])
  @@index([status, createdAt])
  @@index([userId, createdAt])
}
```

---

## 6. 状态机

### 6.1 视频挂载点状态机

```
draft (运营录入) → active (启用) → paused (暂停) → archived (归档)
                    │                  ↑
                    └──────────────────┘
```

**触发条件**：
- `draft → active`：运营审核通过 + POI 校验通过
- `active → paused`：抖音审核驳回 / 命中关键词 / 投诉过多
- `paused → active`：运营复核通过
- `active → archived`：运营手动归档（不可逆）

### 6.2 视频内容状态机

```
uploaded → ai_reviewing → ai_passed → human_reviewing → online
              │              │              │
              │              │              ├─→ rejected (驳回)
              │              │              └─→ banned (封禁)
              │              └─→ ai_rejected (AI 命中关键词)
              └─→ failed (上传失败)
```

**触发条件**：
- `uploaded → ai_reviewing`：抖音 AI 审核开始
- `ai_reviewing → ai_passed`：AI 审核通过（一般 < 30 秒）
- `ai_reviewing → ai_rejected`：AI 命中关键词（秒拒）
- `ai_passed → human_reviewing`：进入人工二审（仅高风险内容）
- `human_reviewing → online`：人工通过
- `human_reviewing → rejected`：人工驳回
- `online → banned`：被举报 / 复审下架

### 6.3 直播间状态机

```
offline (未开播) → preview (预告) → live (直播中) → ended (已结束)
                                            │
                                            └─→ banned (被封禁)
```

**触发条件**：
- `offline → preview`：主播创建预告
- `preview → live`：主播开播
- `live → ended`：主播关播
- `live → banned`：抖音平台封禁直播间

### 6.4 字节支付订单状态机

```
draft → tt_prepaid → paid → processing → completed
                          ↘ tt_refund_pending → partial_refunded ↔ refunded
                                          ↘ tt_refund_failed
        → cancelled
        → paid_timeout (5 分钟未支付)
```

**触发条件**：
- `draft → tt_prepaid`：后端调字节"合众支付"统一下单成功
- `tt_prepaid → paid`：字节异步通知 `BytePayCallback` 验签成功
- `paid → tt_refund_pending`：用户/客服发起退款
- `tt_refund_pending → partial_refunded`：部分退款成功
- `tt_refund_pending → refunded`：全额退款成功
- `tt_refund_failed` → 人工介入

---

## 7. 后端 API（抖音特有）

> **后端 API 完全复用 H5 的 `/api/h5/*`**，本章仅列**抖音特有**的 API。

### 7.1 认证

| Method | Path | 权限 | 说明 |
|---|---|---|---|
| POST | `/api/h5/auth/tt-login` | 公开 | 抖音一键登录（`code` + `anonymousOpenid` + 可选 `encryptedData`） |
| POST | `/api/h5/auth/tt-phone` | 需登录 | 解密手机号（`getPhoneNumber` 回调） |
| POST | `/api/h5/auth/tt-bind-union` | 需登录 | 绑定 unionid（跨抖音生态） |
| GET | `/api/h5/auth/tt-realname-status` | 需登录 | 查询抖音实名状态 |

### 7.2 字节支付

| Method | Path | 权限 | 说明 |
|---|---|---|---|
| POST | `/api/h5/payments/tt-prepay` | 需登录 | 统一下单，返回 prepay 参数 |
| POST | `/api/h5/payments/tt-callback` | 字节回调 | 验签 + 写 `paid` 状态（**不**需 JWT） |
| POST | `/api/h5/payments/tt-refund` | 需登录 | 申请退款 |
| GET | `/api/h5/payments/tt-query` | 需登录 | 查询支付状态（前端轮询用） |

### 7.3 视频挂载

| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/h5/video-mounts` | 公开 | 挂载点列表（创作者选挂载） |
| GET | `/api/h5/video-mounts/:id` | 公开 | 挂载点详情 |
| POST | `/api/h5/video-mounts/:id/click` | 需登录 | 观众点击埋点（写 `VideoMountClick`） |
| GET | `/api/h5/video-mounts/me/stats` | 需登录 | 我的挂载数据（创作者视角） |
| GET | `/api/h5/video-mounts/templates` | 需登录 | 视频模板库（拍视频带挂载用） |

### 7.4 直播间

| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/h5/live-rooms` | 公开 | 直播间列表 |
| GET | `/api/h5/live-rooms/:id` | 公开 | 直播间详情 |
| POST | `/api/h5/live-rooms/:id/visit` | 需登录 | 进入直播间埋点 |
| POST | `/api/h5/live-rooms/:id/order` | 需登录 | 直播间下单（走通用订单 API） |
| GET | `/api/h5/live-rooms/me/hosting` | 需登录 | 我的直播间（主播视角） |

### 7.5 内容审核

| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/h5/content-audits/me` | 需登录 | 我的内容审核记录 |
| GET | `/api/h5/content-audits/:id` | 需登录 | 审核详情 |
| POST | `/api/h5/content-audits/pre-check` | 需登录 | 提交前预审（关键词过滤） |
| POST | `/api/h5/content-audits/:id/appeal` | 需登录 | 驳回后申诉 |

### 7.6 后台运营 API（admin）

| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/video-mounts` | `video:read` | 挂载点列表（后台） |
| POST | `/api/admin/video-mounts` | `video:write` | 创建挂载点 |
| PATCH | `/api/admin/video-mounts/:id` | `video:write` | 编辑挂载点 |
| GET | `/api/admin/content-audits` | `video:audit` | 审核列表（待人工审核） |
| POST | `/api/admin/content-audits/:id/approve` | `video:audit` | 审核通过 |
| POST | `/api/admin/content-audits/:id/reject` | `video:audit` | 审核驳回 |

---

## 8. 前端架构

### 8.1 项目结构

```
douyin-miniprogram/
├── app.js                       # 全局入口
├── app.json                     # 全局配置（pages / tabBar / window）
├── app.ttss                     # 全局样式
├── project.config.json          # 抖音 IDE 项目配置
├── sitemap.json                 # 索引规则
├── pages/                       # 页面（与 H5 路由一一对应）
│   ├── index/                   # /  Discover 首页
│   ├── discover/                # /discover
│   ├── services/                # /services
│   ├── ai/                      # /ai
│   ├── profile/                 # /profile
│   ├── tax-calculator/
│   ├── legal-hub/
│   ├── video-center/            # ⭐ 抖音重点
│   ├── media-center/            # ⭐ 抖音重点
│   ├── ai-chat/
│   ├── company-register/
│   ├── payment-console/
│   ├── bank-account/
│   ├── dlc-level/
│   ├── documents/
│   ├── settings/
│   ├── notifications/
│   ├── did-identity/
│   ├── ai-business-card/        # ⭐ 抖音重点（拍视频带名片）
│   ├── live-rooms/              # ⭐ 抖音独有
│   ├── video-mounts/            # ⭐ 抖音独有
│   └── creator-center/          # ⭐ 创作者中心
├── components/                  # 复用组件
│   ├── StatusBadge/             # 状态徽章（按 00-foundation §8.3.1）
│   ├── EmptyState/
│   ├── LoadingState/
│   ├── ListView/
│   ├── VideoCard/               # ⭐ 抖音视频卡片
│   ├── LiveBadge/               # ⭐ 直播中徽章
│   ├── MountPicker/             # ⭐ 挂载点选择器
│   └── SharePoster/             # ⭐ 分享海报
├── utils/
│   ├── request.js               # tt.request 封装
│   ├── auth.js                  # 登录 / token
│   ├── i18n.js                  # 多语言
│   ├── share.js                 # tt.shareAppMessage 封装
│   ├── video.js                 # 视频相关 API 封装
│   └── tracker.js               # 埋点
├── services/                    # API client
└── images/                      # 图标 / 预生成海报 / 视频模板
```

### 8.2 app.json 全局配置（**与微信差异**）

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
    "selectedColor": "#FE2C55",
    "backgroundColor": "#ffffff",
    "list": [
      { "pagePath": "pages/index/index", "text": "发现" },
      { "pagePath": "pages/services/services", "text": "服务" },
      { "pagePath": "pages/ai/ai", "text": "AI 大脑" },
      { "pagePath": "pages/creator-center/creator-center", "text": "创作者" },
      { "pagePath": "pages/profile/profile", "text": "我的" }
    ]
  },
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTitleText": "海购星",
    "navigationBarTextStyle": "black",
    "enablePullDownRefresh": true,
    "backgroundColor": "#FE2C55"
  },
  "permission": {
    "scope.userLocation": { "desc": "用于推荐附近服务" }
  },
  "requiredPrivateInfos": ["getLocation", "chooseLocation"],
  "lazyCodeLoading": "requiredComponents",
  "tt:settings": {
    "urlCheck": true,
    "es6": true,
    "postcss": true
  }
}
```

**关键差异**：
- `selectedColor: "#FE2C55"`（抖音红）而非微信绿
- 多一个 `creator-center` tab（创作者中心）
- `tt:settings` 是抖音特有配置块

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

async function request({ url, method = 'GET', data, header = {}, showLoading = true, retry = 1 }) {
  const token = tt.getStorageSync('token');
  if (showLoading) tt.showLoading({ title: '加载中', mask: true });

  return new Promise((resolve, reject) => {
    tt.request({
      url: API_BASE + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Client': 'douyin-miniprogram',
        'X-Version': '1.0.0',
        ...header,
      },
      success: (res) => {
        if (showLoading) tt.hideLoading();
        const { statusCode, data: body } = res;
        if (statusCode !== 200) {
          reject(new RequestError(statusCode, `HTTP ${statusCode}`));
          return;
        }
        if (!body.success) {
          if (body.code === 401) {
            tt.removeStorageSync('token');
            tt.navigateTo({ url: '/pages/login/login' });
          }
          reject(new RequestError(body.code, body.message, body.errors));
          return;
        }
        resolve(body.data);
      },
      fail: (err) => {
        if (showLoading) tt.hideLoading();
        // 网络错误时自动重试 1 次
        if (retry > 0 && (err.errMsg?.includes('timeout') || err.errMsg?.includes('fail'))) {
          setTimeout(() => {
            request({ url, method, data, header, showLoading: false, retry: retry - 1 })
              .then(resolve).catch(reject);
          }, 500);
        } else {
          reject(new RequestError(-1, err.errMsg));
        }
      },
    });
  });
}

module.exports = { request, RequestError };
```

### 8.4 视频流组件实现

```html
<!-- components/VideoCard/index.ttml -->
<view class="video-card" bindtap="onTap" data-id="{{video.id}}">
  <view class="video-cover">
    <image src="{{video.coverUrl}}" mode="aspectFill" class="cover-img" />
    <view tt:if="{{video.isLive}}" class="live-badge">
      <view class="live-dot" />
      <text>直播中</text>
    </view>
    <view class="video-duration">{{video.durationText}}</view>
  </view>

  <view class="video-info">
    <view class="video-title">{{video.title}}</view>
    <view class="video-creator">
      <image src="{{video.creator.avatarUrl}}" class="creator-avatar" />
      <text class="creator-name">{{video.creator.nickname}}</text>
      <text tt:if="{{video.creator.isVerified}}" class="verified-icon">✓</text>
    </view>
    <view class="video-stats">
      <text class="stat-item">❤️ {{video.likeCountText}}</text>
      <text class="stat-item">💬 {{video.commentCountText}}</text>
      <text class="stat-item">↗ {{video.shareCountText}}</text>
    </view>

    <view tt:if="{{video.mountCode}}" class="mount-tag" catchtap="onMountTap" data-mount="{{video.mountCode}}">
      🛍️ {{video.mountName}}
    </view>
  </view>
</view>
```

```javascript
// components/VideoCard/index.js
Component({
  properties: {
    video: {
      type: Object,
      value: {},
    },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { id: this.data.video.id });
    },
    onMountTap() {
      // 点击挂载点 → 调起小程序落地页
      const { mountCode, landingPage } = this.data.video;
      tt.navigateTo({
        url: `${landingPage}?from=video_mount&mountCode=${mountCode}&videoId=${this.data.video.id}`,
      });
    },
  },
});
```

### 8.5 拍视频带挂载实现

```javascript
// pages/creator-center/upload-with-mount.js
Page({
  data: {
    mounts: [],
    selectedMount: null,
    videoPath: '',
  },

  async onLoad() {
    // 拉取可选挂载点
    const mounts = await request({ url: '/api/h5/video-mounts', showLoading: false });
    this.setData({ mounts });
  },

  async onChooseVideo() {
    // 调起抖音视频选择 / 录制
    const res = await tt.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      compressed: true,
    });
    this.setData({ videoPath: res.tempFilePath });
  },

  onSelectMount(e) {
    const mount = this.data.mounts.find(m => m.id === e.currentTarget.dataset.id);
    this.setData({ selectedMount: mount });
  },

  async onPublish() {
    if (!this.data.videoPath || !this.data.selectedMount) {
      tt.showToast({ title: '请选择视频和挂载点', icon: 'none' });
      return;
    }
    // 上传视频到海购星 CDN（异步转码）
    const uploadRes = await tt.uploadFile({
      url: 'https://api.smy.app/api/h5/videos/upload',
      filePath: this.data.videoPath,
      name: 'file',
      header: { Authorization: `Bearer ${tt.getStorageSync('token')}` },
    });
    const { videoUrl } = JSON.parse(uploadRes.data).data;

    // 调起抖音原生发布（带挂载点）
    tt.shareAppMessage({
      channel: 'video',  // 关键：channel=video 表示发布到抖音
      title: this.data.selectedMount.name,
      desc: '海购星 · 萨摩亚合规出海',
      templateId: this.data.selectedMount.mountCode,  // 挂载点模板
      query: `mountCode=${this.data.selectedMount.mountCode}&videoUrl=${encodeURIComponent(videoUrl)}`,
      success: () => {
        tt.showToast({ title: '发布成功', icon: 'success' });
        // 写防刷记录
        request({
          url: '/api/h5/video-mounts/published',
          method: 'POST',
          data: { mountCode: this.data.selectedMount.mountCode, videoUrl },
          showLoading: false,
        });
      },
      fail: (err) => tt.showToast({ title: err.errMsg, icon: 'none' }),
    });
  },
});
```

---

## 9. UI 组件

### 9.1 状态徽章（StatusBadge）

按 [00-foundation §8.3.1 扩展状态色彩表](../../admin-prd/00-foundation.md) 映射（**新增**抖音特有状态）：

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
  // 视频特有
  ONLINE: { bg: '#10B981', text: '#FFFFFF', label: '已发布' },
  OFFLINE: { bg: '#6B7280', text: '#FFFFFF', label: '已下架' },
  BANNED: { bg: '#7F1D1D', text: '#FFFFFF', label: '已封禁' },
  // 抖音特有
  AI_REVIEWING: { bg: '#8B5CF6', text: '#FFFFFF', label: 'AI 审核中' },
  AI_PASSED: { bg: '#10B981', text: '#FFFFFF', label: 'AI 已通过' },
  AI_REJECTED: { bg: '#EF4444', text: '#FFFFFF', label: 'AI 已驳回' },
  HUMAN_REVIEWING: { bg: '#F59E0B', text: '#FFFFFF', label: '人工二审中' },
  // 直播间特有
  PREVIEW: { bg: '#3B82F6', text: '#FFFFFF', label: '预告中' },
  LIVE: { bg: '#FE2C55', text: '#FFFFFF', label: '直播中' },
  ENDED: { bg: '#6B7280', text: '#FFFFFF', label: '已结束' },
  // 字节支付特有
  PAID: { bg: '#10B981', text: '#FFFFFF', label: '已支付' },
  REFUNDED: { bg: '#EF4444', text: '#FFFFFF', label: '已退款' },
  PAID_TIMEOUT: { bg: '#9CA3AF', text: '#FFFFFF', label: '已超时' },
};
```

### 9.2 视频流组件（VideoList）

抖音**必须**用 `tt.list-view` 而非自定义滚动——抖音对 `list-view` 做了原生性能优化（虚拟滚动 + 预渲染）：

```html
<!-- pages/video-center/index.ttml -->
<view class="video-center">
  <tt-list-view
    list="{{videoList}}"
    placeholder="拉动刷新"
    refreshing="{{refreshing}}"
    bind:refreshtrefresh="onRefresh"
    bind:loadmore="onLoadMore"
    bind:scrolltoupper="onScrollToUpper"
  >
    <view tt:for="{{videoList}}" tt:key="id" class="video-item">
      <video-card video="{{item}}" bind:tap="onVideoTap" />
    </view>

    <view slot="loading" class="loading-more">加载中...</view>
    <view slot="nomore" class="no-more">- 没有更多了 -</view>
    <view slot="empty" class="empty-state">
      <image src="/images/empty.png" />
      <text>暂无视频</text>
    </view>
  </tt-list-view>
</view>
```

### 9.3 直播徽章（LiveBadge）

```html
<!-- components/LiveBadge/index.ttml -->
<view class="live-badge {{size}}">
  <view class="pulse-dot" />
  <text>{{viewerCount > 0 ? viewerCount + ' 人在看' : '直播中'}}</text>
</view>
```

```css
/* components/LiveBadge/index.ttss */
.live-badge {
  display: inline-flex;
  align-items: center;
  background: linear-gradient(90deg, #FE2C55, #FF6680);
  color: #FFFFFF;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
}
.pulse-dot {
  width: 12rpx;
  height: 12rpx;
  background: #FFFFFF;
  border-radius: 50%;
  margin-right: 6rpx;
  animation: pulse 1.2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

### 9.4 挂载点选择器（MountPicker）

```html
<!-- components/MountPicker/index.ttml -->
<view class="mount-picker">
  <view class="picker-title">选择挂载点</view>
  <scroll-view scroll-x class="mount-scroll" enhanced show-scrollbar="{{false}}">
    <view
      tt:for="{{mounts}}"
      tt:key="id"
      class="mount-item {{item.id === selectedId ? 'selected' : ''}}"
      bindtap="onSelect"
      data-id="{{item.id}}"
    >
      <image src="{{item.iconUrl}}" class="mount-icon" />
      <text class="mount-name">{{item.name}}</text>
    </view>
  </scroll-view>
</view>
```

### 9.5 i18n 适配

```javascript
// utils/i18n.js（结构同微信小程序，但 namespace 严格按 00-foundation §5.5.1）
const I18N = {
  'zh-CN': {
    'common.create': '创建',
    'common.cancel': '取消',
    'common.loading': '加载中...',
    'video.status.online': '已发布',
    'video.status.aiReviewing': 'AI 审核中',
    'liveRoom.status.live': '直播中',
    'mount.template.aiCard': 'AI 名片模板',
    'mount.template.companyRegister': '公司注册模板',
    // ...
  },
  'en-US': {
    'common.create': 'Create',
    'common.cancel': 'Cancel',
    'video.status.online': 'Online',
    'liveRoom.status.live': 'Live',
    'mount.template.aiCard': 'AI Card Template',
    // ...
  },
  // ja-JP, ko-KR 同结构
};
```

> **关键决策**：i18n namespace 严格按 [00-foundation §5.5](../../admin-prd/00-foundation.md) 速查表，不自定义 key。**新增的抖音特有 namespace 统一为 `video`（08）、`media`（09）、`liveRoom`（新增）、`mount`（新增）**。

---

## 10. 抖音开发者工具配置

### 10.1 project.config.json

```json
{
  "miniprogramRoot": "./",
  "projectname": "smy-douyin-miniprogram",
  "appid": "tt_your_appid",
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
    "userConfirmedUseCompilerModuleSwitch": false
  },
  "compileType": "miniprogram",
  "libVersion": "3.0.0",
  "condition": {},
  "tt:settings": {
    "urlCheck": true,
    "es6": true,
    "postcss": true
  }
}
```

### 10.2 服务器域名白名单（运维必配）

在 [抖音开发者平台](https://developer.open-douyin.com) → 小程序 → 开发 → 服务器域名：

| 类型 | 域名 |
|---|---|
| **request 合法域名** | `https://api.smy.app` |
| **uploadFile 合法域名** | `https://api.smy.app`, `https://upload.smy.app` |
| **downloadFile 合法域名** | `https://cdn.smy.app`, `https://api.smy.app` |
| **socket 合法域名** | `wss://ws.smy.app` |

**关键**：
- 必须是 HTTPS，且 SSL 证书要受信
- 域名需 ICP 备案
- 抖音对**视频 CDN 域名**审核更严：必须有完整的视频资质证明
- 抖音正式版**必须**配（开发版可勾"不校验合法域名"）

### 10.3 业务域名

配置后可用 `web-view` 组件跳转 H5 页面：
- `https://smy.app`
- `https://admin.smy.app`

### 10.4 抖音特有配置

| 配置项 | 说明 |
|---|---|
| **小程序类目** | 工具 / 商业服务 / 金融（按业务选，**必须**与代码内容一致） |
| **挂载点接入** | 在"挂载能力"页申请开通 |
| **直播能力** | 在"直播组件"页申请（**需企业认证**） |
| **支付能力** | 在"支付管理"页申请合众支付 |
| **视频号能力** | 必须开通"短视频挂载"权限 |

---

## 11. 字节支付配置

### 11.1 申请流程

1. 抖音开发者平台 → 我的应用 → 支付管理 → 申请开通
2. 提交营业执照、法人身份证、对公账户
3. 审核 3-7 工作日（**比微信慢**）
4. 获得 `mch_id`（合众支付商户号）+ API 密钥 v3
5. 下载商户证书（`apiclient_cert.pem` / `apiclient_key.pem`）

### 11.2 后端配置（环境变量）

```bash
# .env.production
DOUYIN_MINIPROGRAM_APPID=tt_your_appid
DOUYIN_MINIPROGRAM_SECRET=your_secret_here
DOUYIN_PAY_MCH_ID=1234567890
DOUYIN_PAY_API_KEY=v3_key_here
DOUYIN_PAY_API_V3_KEY=32_byte_v3_key
DOUYIN_PAY_CERT_PATH=/etc/secrets/douyin/apiclient_cert.pem
DOUYIN_PAY_KEY_PATH=/etc/secrets/douyin/apiclient_key.pem
DOUYIN_PAY_NOTIFY_URL=https://api.smy.app/api/h5/payments/tt-callback
```

### 11.3 字节支付 v3 签名

```typescript
// apps/api/src/modules/payments/bytepay.service.ts
import { createSign, createVerify } from 'crypto';
import axios from 'axios';
import fs from 'fs';

@Injectable()
export class BytePayService {
  private mchId: string;
  private apiKey: string;
  private cert: Buffer;
  private privateKey: Buffer;

  constructor(private config: ConfigService) {
    this.mchId = this.config.get('DOUYIN_PAY_MCH_ID');
    this.apiKey = this.config.get('DOUYIN_PAY_API_V3_KEY');
    this.cert = fs.readFileSync(this.config.get('DOUYIN_PAY_CERT_PATH'));
    this.privateKey = fs.readFileSync(this.config.get('DOUYIN_PAY_KEY_PATH'));
  }

  // 字节支付签名（**与微信不同**）
  private sign(params: Record<string, any>): string {
    const sortedKeys = Object.keys(params).sort();
    const stringA = sortedKeys
      .filter(k => params[k] !== undefined && params[k] !== '')
      .map(k => `${k}=${params[k]}`)
      .join('&');
    const stringSignTemp = `${stringA}&key=${this.apiKey}`;
    return createSign('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
  }

  async createPrepay(params: {
    orderId: string;
    amount: number;  // 单位：分
    description: string;
    openid: string;
  }): Promise<BytePrepayResult> {
    const requestData = {
      app_id: this.config.get('DOUYIN_MINIPROGRAM_APPID'),
      mch_id: this.mchId,
      out_trade_no: params.orderId,
      total_fee: params.amount,
      body: params.description,
      notify_url: this.config.get('DOUYIN_PAY_NOTIFY_URL'),
      openid: params.openid,
      trade_type: 'MINI_PROGRAM',  // 关键：标识小程序支付
      nonce_str: this.generateNonce(),
    };
    requestData.sign = this.sign(requestData);

    const response = await axios.post('https://payapi.douyinzhifu.com/pay/unifiedorder', requestData);
    return response.data;
  }

  async verifyCallback(rawBody: string, sign: string): Promise<ByteCallback> {
    // 字节支付回调验签（MD5 模式）
    const params = JSON.parse(rawBody);
    const { sign: serverSign, ...rest } = params;
    const calculatedSign = this.sign(rest);
    if (calculatedSign !== serverSign) {
      throw new Error('Invalid signature');
    }
    return params;
  }

  private generateNonce(): string {
    return Math.random().toString(36).slice(2, 18);
  }
}
```

**关键点**：
- 字节支付用 **MD5 签名**（微信是 SHA256 with RSA）
- 字节支付回调是 **JSON 格式**（微信是 XML）
- 字节支付**没有**"商户平台证书下载"步骤（用应用公钥）

---

## 12. 内容审核（**AI + 人工 + 关键词三层**）

> **为什么需要这章**：抖音对内容审核极严——**AI 审核 + 人工二审 + 关键词过滤**是必经流程。本章是合规核心。

### 12.1 三层审核架构

```
┌─────────────────────────────────────────────────────────┐
│ 用户提交内容（视频 / 评论 / 名片 / 昵称）                │
└────────────────────┬────────────────────────────────────┘
                     ↓
         ┌───────────▼───────────┐
         │  Layer 1: 关键词过滤    │  ← 毫秒级拦截
         │  (本地 DFA 算法)        │     命中 1000+ 关键词
         └───────────┬───────────┘
                     ↓ 通过
         ┌───────────▼───────────┐
         │  Layer 2: AI 审核       │  ← 调抖音 AI 接口
         │  (图像 / 文本 / 视频)   │     1-30 秒
         └───────────┬───────────┘
                     ↓ 通过
         ┌───────────▼───────────┐
         │  Layer 3: 人工二审      │  ← 高风险内容
         │  (运营在后台审核)       │     1-24 小时
         └───────────┬───────────┘
                     ↓
                最终结果
```

### 12.2 关键词库（**必须**维护）

```typescript
// apps/api/src/common/audit/keywords.ts
export const KEYWORD_BLACKLIST = [
  // 政治敏感（**必须**全量）
  '习近平', '李克强', '中南海', '反华', '台独', '港独', '疆独', '藏独',
  // 色情（高优先级）
  '色情', '裸聊', '约炮', '一夜情', '迷奸',
  // 赌博（高优先级）
  '赌博', '百家乐', '澳门威尼斯', '博彩',
  // 暴力
  '杀人', '砍人', '爆炸物', '制毒',
  // 违禁品
  '毒品', '大麻', '冰毒', '枪支',
  // 萨摩亚合规相关
  '洗钱', '偷税', '离岸避税', '空壳公司',
  // ...
];

export const KEYWORD_WHITELIST = [
  '萨摩亚', '合规', '出海', 'DLC', '海购星', 'KYC',
];

// DFA 算法匹配
export function matchKeywords(text: string): string[] {
  const hits: string[] = [];
  for (const word of KEYWORD_BLACKLIST) {
    if (text.includes(word)) {
      hits.push(word);
    }
  }
  return hits;
}
```

### 12.3 AI 审核调用

```typescript
// apps/api/src/common/audit/douyin-ai-audit.service.ts
import axios from 'axios';

@Injectable()
export class DouyinAiAuditService {
  constructor(private config: ConfigService) {}

  // 调抖音 AI 审核接口
  async auditText(text: string): Promise<AiAuditResult> {
    const response = await axios.post(
      'https://api.open-douyin.com/audit/text',
      {
        app_id: this.config.get('DOUYIN_MINIPROGRAM_APPID'),
        access_token: await this.getAccessToken(),
        content: text,
        audit_type: 'text',
      },
    );
    return response.data;
  }

  async auditImage(imageUrl: string): Promise<AiAuditResult> {
    const response = await axios.post(
      'https://api.open-douyin.com/audit/image',
      {
        app_id: this.config.get('DOUYIN_MINIPROGRAM_APPID'),
        access_token: await this.getAccessToken(),
        image_url: imageUrl,
        audit_type: 'image',
      },
    );
    return response.data;
  }

  async auditVideo(videoUrl: string): Promise<AiAuditResult> {
    const response = await axios.post(
      'https://api.open-douyin.com/audit/video',
      {
        app_id: this.config.get('DOUYIN_MINIPROGRAM_APPID'),
        access_token: await this.getAccessToken(),
        video_url: videoUrl,
        audit_type: 'video',
      },
    );
    return response.data;
  }
}
```

### 12.4 审核流程

```
1. 用户提交内容
   ↓
2. 关键词过滤（Layer 1）→ 命中直接驳回 + 写 ContentAudit
   ↓
3. 调抖音 AI 审核（Layer 2）→ 等待 1-30 秒
   ↓
4. AI 审核通过 → 标记 ai_passed → 进入人工二审（高风险）
   ↓
5. AI 审核拒绝 → 标记 ai_rejected → 拒绝发布 + 通知用户
   ↓
6. 人工二审（Layer 3）→ 1-24 小时
   ↓
7. 人工通过 → online
   ↓
8. 人工拒绝 → rejected + rejectionReason
```

### 12.5 申诉机制

- 用户被驳回后可在 7 天内申诉 1 次
- 申诉后走**升级审核**（超管介入）
- 申诉结果通过抖音 IM 通知

---

## 13. 视频挂载点管理（**POI 录入、绑定、状态**）

> **为什么需要这章**：挂载点是抖音独有的获客基础设施，需要独立的运营后台管理。

### 13.1 POI 录入流程

```
运营在 admin-web 后台创建挂载点
  ↓
填写: mountCode / name（多语言）/ description / landingPage
  ↓
可选: 关联 POI（线下门店）/ 关联视频模板
  ↓
提交审核（risk 角色审核）
  ↓
通过 → 状态 active → 创作者可见
  ↓
创作者选择挂载点 → 拍视频 → 发布
```

### 13.2 挂载点状态管理

```typescript
// 状态色彩严格按 00-foundation §8.3.1
// active    → #10B981 绿
// paused    → #6B7280 灰
// archived  → #9CA3AF 浅灰
// draft     → #F6A623 橙
```

### 13.3 挂载点限流

- 单挂载点每日点击上限 `dailyClickLimit`（默认 10000）
- 超限后挂载点**不消失**，但点击会**降级**到 Discover（不带挂载点属性）
- 凌晨 0 点重置

### 13.4 挂载点数据分析

| 指标 | 说明 |
|---|---|
| 曝光 UV | 视频被播放的独立用户数（抖音 API） |
| 点击 UV | 观众点击挂载点的独立用户数 |
| 注册转化 | 点击后注册的用户数 |
| 下单转化 | 点击后下单的用户数 |
| DVC 消耗 | 该挂载点奖励消耗的 DVC |
| ROI | 收入 / 成本 |

---

## 14. 私域沉淀（**抖音私域能力弱**）

> **为什么需要这章**：抖音**没有**服务号、订阅号，长期触达能力很弱。本章是**强制**将抖音用户引导到微信 / 抖音号 / 邮件等**自有私域**的规范。

### 14.1 私域路径

| 触点 | 引导文案 | 目标 |
|---|---|---|
| **关注抖音号** | "关注海购星抖音号，第一时间获取活动信息" | 关注后可发私信 |
| **加企业微信** | "扫码加专属顾问" | 长期 1v1 服务 |
| **下载 H5 App** | "扫码下载海购星 APP" | 自有推送通道 |
| **订阅邮件** | "订阅每周出海资讯" | 邮件营销 |

### 14.2 抖音号关注实现

```javascript
// 在支付完成 / 注册成功页显示关注引导
async onFollowDouyinAccount() {
  try {
    // 调起抖音关注页
    tt.openSchema({
      scheme: 'snssdk1233://user/profile/' + '海购星抖音号ID',
      success: () => console.log('跳转到抖音号主页'),
      fail: (err) => {
        // 失败兜底：复制抖音号到剪贴板
        tt.setClipboardData({
          data: '海购星',
          success: () => tt.showToast({ title: '抖音号已复制', icon: 'success' }),
        });
      },
    });
  } catch (err) {
    console.error(err);
  }
}
```

### 14.3 抖音 IM（**唯一长期触达通道**）

- 关注抖音号后，商家可通过**抖音号私信**发消息
- **频次限制**：每月最多 4 条主动私信（抖音规则）
- 模板：交易物流、订单状态、活动通知
- **禁用**：营销骚扰、群发广告

```javascript
// 调起抖音 IM
tt.openChatTool({
  userId: '海购星抖音号ID',
  type: 'douyin',
  success: () => console.log('打开抖音 IM'),
  fail: (err) => console.error(err),
});
```

---

## 15. i18n 多语言

按 [00-foundation §5.5](../../admin-prd/00-foundation.md) 速查表 — 抖音小程序端 namespace 命名严格遵循。

**新增的抖音特有 namespace 统一为**：
- `video`（08 视频中心）
- `media`（09 自媒体中心）
- `liveRoom`（新增：直播间）
- `mount`（新增：视频挂载点）
- `creator`（新增：创作者中心）

```javascript
// app.js
App({
  globalData: {
    locale: tt.getStorageSync('locale') || 'zh-CN',
  },
  onLaunch() {
    // 探测系统语言
    tt.getSystemInfo({
      success: (res) => {
        const sysLang = res.language;  // 'zh_CN' / 'en' / 'ja' / 'ko'
        const map = { 'zh_CN': 'zh-CN', 'en': 'en-US', 'ja': 'ja-JP', 'ko': 'ko-KR' };
        this.globalData.locale = map[sysLang] || 'zh-CN';
      },
    });
  },
});
```

---

## 16. 验收用例

### 16.1 登录流程

| # | 用例 | 期望 |
|---|---|---|
| 1 | 首次 tt.login（抖音已登录态） | 拿到 code，调后端拿 token + 跳转首页 |
| 2 | 抖音未登录态进入小程序 | 自动跳抖音登录页（**必须**） |
| 3 | 拒绝授权手机号 | 仅用 openid 建账号，profile 显示未绑定手机号 |
| 4 | token 过期 | 自动跳登录页，重新 tt.login |
| 5 | 同一抖音号换手机号 | 提示"该抖音号已绑定其他手机号，是否切换" |
| 6 | 抖音匿名 openid（未登录） | 仅用于埋点，**不**建账号 |

### 16.2 视频挂载流程

| # | 用例 | 期望 |
|---|---|---|
| 1 | 创作者选挂载点 + 拍视频发布 | 视频带"小程序 · 海购星"挂载 |
| 2 | 观众点击挂载卡 | 唤起小程序 + 写 `VideoMountClick` |
| 3 | 创作者 1 天发 5 条带挂载视频 | 第 6 条被限流 + 提示 |
| 4 | 挂载点命中关键词 | 驳回 + 通知创作者 |
| 5 | 挂载点 `paused` 状态 | 创作者可见但**无法选** |
| 6 | 挂载点日点击超限 | 降级到 Discover，**不**带挂载属性 |
| 7 | 视频被举报 | 进入人工二审，30 分钟内未处理则自动下架 |

### 16.3 直播间流程

| # | 用例 | 期望 |
|---|---|---|
| 1 | 观众从直播间点小黄车 | 调起小程序 + 落到商品详情 |
| 2 | 直播间下单 + 字节支付 | 订单 `paid` + 通知主播 |
| 3 | 直播中关闭小黄车 | 已加车商品仍可下单 |
| 4 | 直播间被封禁 | 状态 `banned` + 用户不可见 |
| 5 | 直播中观众频繁进出 | 埋点 `LiveRoomVisit` < 100ms |

### 16.4 字节支付流程

| # | 用例 | 期望 |
|---|---|---|
| 1 | 下单 → tt.pay | 成功，订单 `paid` |
| 2 | 支付中途退出抖音 | 订单停在 `tt_prepaid`，5 分钟后过期 |
| 3 | 字节异步通知 | 验签成功 + 写 DB + WebSocket 推前端 |
| 4 | 重复通知 | 幂等（订单已是 `paid` 直接返回 success） |
| 5 | 签名错误 | 拒绝 + 写 AuditLog(severity=critical) |
| 6 | 退款 30 天后 | 字节拒绝（订单超过 30 天不可退） |
| 7 | 首次支付未绑卡 | 引导绑卡流程 |

### 16.5 内容审核流程

| # | 用例 | 期望 |
|---|---|---|
| 1 | 提交内容命中"赌博"关键词 | 立即驳回 + 写 ContentAudit |
| 2 | AI 审核通过 + 低风险 | 直接发布 |
| 3 | AI 审核通过 + 高风险 | 进入人工二审队列 |
| 4 | 人工审核通过 | 状态 `online` |
| 5 | 人工审核拒绝 | 状态 `rejected` + 通知用户 |
| 6 | 用户 7 天内申诉 | 走超管升级审核 |
| 7 | 申诉超时 | 状态保持 `rejected` |

### 16.6 上线审核

| # | 用例 | 期望 |
|---|---|---|
| 1 | 小程序类目与代码内容一致 | 工具 / 商业服务 / 金融 |
| 2 | 用户协议 / 隐私政策 | 必须挂链接 |
| 3 | 备案号 | 工信部 ICP 备案号展示 |
| 4 | 测试账号 | 提供给审核员的测试抖音号 + 密码 |
| 5 | 关键词过滤 | 政治/色情/暴力等关键词全量 |
| 6 | 内容审核 | AI + 人工 + 关键词三层 |
| 7 | 抖音号绑定 | 必须绑定海购星官方抖音号 |
| 8 | 挂载点备案 | 每个挂载点必须填写完整资质 |
| 9 | 直播能力开通 | 需企业认证 |
| 10 | 字节支付开通 | 需企业认证 + 营业执照 |

---

## 17. 性能优化

### 17.1 视频预加载

- 列表滚动时**预加载**下一个视频的元数据
- 视频**不**预下载完整文件（流量太大），仅预加载 metadata
- 用 `tt.list-view` 自带虚拟滚动（**不**自定义 scroll-view）

```javascript
// pages/video-center/index.js
Page({
  data: { videoList: [], currentIndex: 0 },
  onVideoChange(e) {
    // 切换视频时预加载下一个
    const nextIndex = e.detail.currentIndex + 1;
    if (this.data.videoList[nextIndex]) {
      const nextVideo = this.data.videoList[nextIndex];
      // 预创建 video context，不播放
      const videoContext = tt.createVideoContext(`video-${nextIndex}`);
      videoContext.preload();
    }
  },
});
```

### 17.2 滑动流畅度

- 列表**必须**用 `tt.list-view`（抖音优化）
- 视频卡片**避免**大图（用 CDN 缩略图 + 懒加载）
- 自定义组件**避免**在 onScroll 中 setData
- 使用 `wxif` 替代 `hidden` 减少渲染

### 17.3 包大小控制

- 主包 ≤ 2MB
- 单个分包 ≤ 2MB
- 视频模板**预生成**到 CDN，**不**打入包
- 用 `lazyCodeLoading: "requiredComponents"` 启用按需注入

### 17.4 启动性能

- 首屏渲染 < 1.5s
- 启动到可交互 < 3s
- 用 `app.js` 的 `onLaunch` **不**做重操作（仅拉 token 校验 + 预取关键数据）

```javascript
// app.js
onLaunch() {
  this.prefetchCriticalData();
},

async prefetchCriticalData() {
  Promise.all([
    request({ url: '/api/h5/user/me', showLoading: false }).catch(() => null),
    request({ url: '/api/h5/dlc/level', showLoading: false }).catch(() => null),
    request({ url: '/api/h5/video-mounts', showLoading: false }).catch(() => null),
  ]).then(([user, level, mounts]) => {
    this.globalData.user = user;
    this.globalData.level = level;
    this.globalData.mounts = mounts;
  });
},
```

---

## 18. 发布流程（**抖音对内容类审核周期长 3-7 天**）

### 18.1 提审清单

- [ ] 全局 HTTPS 配置正确
- [ ] 业务域名 / request 域名已配
- [ ] 用户协议 + 隐私政策链接
- [ ] 类目与代码内容一致
- [ ] 测试账号可正常走通核心流程
- [ ] 关键词过滤（政治/色情/暴力/违禁品）
- [ ] 内容审核三层（关键词 + AI + 人工）
- [ ] 性能数据达标（首屏 < 1.5s）
- [ ] 兼容性测试（iOS 13+ / Android 7+）
- [ ] 灰度用户白名单（10% → 50% → 100%）
- [ ] **挂载点资质**（每个挂载点必须有完整备案）
- [ ] **直播能力开通**（如涉及）
- [ ] **字节支付开通**（如涉及）

### 18.2 灰度发布

```javascript
// app.js - 灰度逻辑
async checkGrayRelease() {
  const res = await request({
    url: '/api/h5/config/gray',
    method: 'GET',
    showLoading: false,
  });
  if (res.grayVersion && res.grayVersion !== this.globalData.version) {
    tt.showModal({
      title: '发现新版本',
      content: '是否立即更新？',
      success: (r) => { if (r.confirm) tt.getUpdateManager().applyUpdate(); },
    });
  }
}
```

### 18.3 紧急回滚

- 在抖音开发者平台 → 版本管理 → 撤回审核（审核中可撤回）
- 紧急情况联系抖音客服（已上架的版本不可撤回，但可发"版本更新提示"）
- 视频挂载点 / 直播间：可直接在后台 `paused` / `banned`，**不**需要发版

---

## 19. 反作弊

### 19.1 视频刷量检测

- 同创作者 1 天发 5 条带挂载视频 → 限流
- 同视频 1 小时点击 > 10000 → 风控标记
- 视频完播率 < 5% → 标记低质
- AI 视频检测（用抖音 AI 审核，命中"AI 生成"标签降权）

### 19.2 虚假评论检测

- 同 userId 1 分钟发 10 条评论 → 限速
- 评论内容相似度 > 80% → 标记 + 人工审核
- 评论含联系方式（手机号 / 微信）→ 拦截

### 19.3 直播间刷量

- 直播间人气异常（10 分钟涨 10000 人）→ 风控
- 直播间下单率 < 0.1% → 标记虚假人气
- 同 IP 多设备同时进直播间 → 标记

### 19.4 字节支付风控

- 同 openid 1 分钟内 ≥ 5 笔订单 → 风控
- 退款率 > 30% 的用户 → 标记 + 人工审核
- 同一银行卡号短时间多笔退款 → 报警

### 19.5 邀请刷量（视频挂载裂变）

- 同创作者 1 天邀请人数 > 1000 → 人工审核
- 被邀请人设备指纹（`tt.getSystemInfo` 的 `model` + `system`）相同 → 拒绝
- 被邀请人 7 天内无任何行为 → 撤销奖励

---

## 20. 监控

### 20.1 关键指标

| 指标 | 说明 |
|---|---|
| 日活（DAU）/ 月活（MAU） | 抖音端独立用户 |
| 启动成功率 | tt.login 成功比例 |
| API 成功率（按端分） | /api/h5/* 调用成功率 |
| **挂载点击率** | 视频挂载点击 / 视频曝光 |
| **挂载转化率** | 挂载点击后注册 / 挂载点击 |
| **直播挂车率** | 直播挂车 GMV / 总 GMV |
| **字节支付成功率** | tt.pay success / tt.pay 调用 |
| **内容审核拦截率** | 驳回内容 / 提交内容 |

### 20.2 上报 SDK

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
      openid: tt.getStorageSync('openid'),
      page: getCurrentPages().pop()?.route,
      ts: Date.now(),
      client: 'douyin-miniprogram',
    },
    showLoading: false,
  }).catch(() => null);

  // 2. 上报到抖音分析（可选）
  if (tt.reportEvent) tt.reportEvent(event, params);
}

module.exports = { trackEvent };
```

### 20.3 抖音专用监控

- **挂载点击漏斗**：曝光 → 点击 → 唤起 → 注册 → 下单
- **直播间漏斗**：开播 → 挂车 → 观看 → 点击 → 下单
- **内容审核漏斗**：提交 → 关键词通过 → AI 通过 → 人工通过 → 发布

---

## 21. 跨文件一致性检查（每个 P0 模块必勾）

- [ ] 状态枚举值是否在 00-foundation §8.3.1 扩展色彩表里有映射？（**新增** `aiReviewing` / `humanReviewing` / `live` / `preview` / `paid` / `refunded` / `paidTimeout` 7 个抖音特有状态，已加）
- [ ] 状态变更是否走 00-foundation §4.3 独立日志表模式？（`LiveRoomStatusLog` 已是独立表 ✅）
- [ ] `*UserId` 字段是否按 00-foundation §12 加 `@relation("Name")` + `onDelete: Restrict`？（`VideoMountCreatedBy` / `VideoMountClickCreator` / `LiveRoomHost` / `ContentAuditSubmitter` / `ContentAuditOperator` 全部合规 ✅）
- [ ] i18n namespace 是否在 00-foundation §5.5.1 速查表里？（`video` / `media` / `liveRoom` / `mount` / `creator` 已对齐速查表 ✅）
- [ ] 退款是否走 00-foundation §7.5 统一约定？（字节支付走 `tt.pay` 退款 + 走 `Transaction.refundedAmount` 累加 ✅）
- [ ] 资源级权限判定是否走 00-foundation §3.5？（复用 H5 资源档位判定，无独立实现 ✅）
- [ ] 凭证加密是否走 00-foundation §11 KMS？（`BytePay.cert` / `BytePay.privateKey` 走 KMS 加密，**不**明文存 DB ✅）
- [ ] 双身份规则是否走 00-foundation §13？（`DouyinUser.userId` 复用 H5 `User.id`，双身份允许 ✅）
- [ ] 审核日志是否走 00-foundation §4.1？（所有写操作 + 解密操作都写 `AuditLog` ✅）

---

## 22. 未来规划（v2）

- ⏸ 抖音小程序直播组件深度集成（实时连麦、互动玩法）
- ⏸ 抖音小程序小游戏（拉新裂变 K 因子 > 2.5 时启动）
- ⏸ 抖音 AR 扫描（用于 KYC 活体检测补充）
- ⏸ 抖音小程序客服 IM 深度集成
- ⏸ 抖音小程序电商组件（货架式商城）
- ⏸ 跨端：迁移到 Taro（如果需要同时支持抖音 + 微信 + H5）
