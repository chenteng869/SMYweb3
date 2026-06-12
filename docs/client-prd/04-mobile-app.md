# 04 · 移动端 APP（iOS / Android · React Native）

> **对应 H5**：H5 端全部 20 个菜单（**复用 H5 后端 API `/api/h5/*`**，仅前端框架改为 React Native）
> **核心目标**：覆盖 iOS / Android 双端原生体验，重点拿下海外渠道（Apple Store / Google Play / 海外社交裂变），并承载 Web3 钱包、生物识别、IAP 等 H5 没有的能力。
> **后端**：与 H5 / 小程序共用 `apps/api` NestJS + Prisma，**完全复用** `/api/h5/*` 接口
> **前端**：**React Native 0.74+**（启用 Hermes 引擎 / Fabric / TurboModules）——**不**用 Flutter、**不**用 Native
> **读者**：RN 客户端工程师、后端工程师、产品经理、运营、海外渠道 BD

---

## 目录

1. 业务目标
2. 用户故事
3. 与 H5 / 小程序 / 微信小程序的差异（**重点展开**）
4. 技术选型决策（RN vs Flutter vs Native）
5. 业务流程（登录 / 推送 / 支付 / Web3 / 生物识别 / 海外社交 / WhatsApp）
6. 字段定义（MobileDevice / PushToken / AppInstall / BiometricAuth / **OverseasAuthBinding**）
7. 状态机（推送订阅 / IAP 订单 / 海外账号绑定）
8. 后端 API（APP 特有）
9. 前端架构（RN 项目结构 / 导航 / 状态 / 网络 / 离线）
10. UI 组件（StatusBadge + Platform.select）
11. iOS 配置（Info.plist / Capabilities / Provisioning）
12. Android 配置（AndroidManifest / Gradle / ProGuard）
13. 推送集成（APNs / FCM / 极光 / 厂商通道）
14. 支付集成（Apple Pay / Google Pay / IAP / 微信 H5 / 支付宝 H5）
15. Web3 钱包集成（WalletConnect v2 / MetaMask SDK）
16. 生物识别（react-native-biometrics）
17. **海外社交平台集成**（**新增章节**：Facebook / Google / LinkedIn / WhatsApp / TikTok）
18. i18n 多语言
19. 验收用例
20. 性能优化（启动 / 列表 / 内存 / Crash 率）
21. Crash 监控（Sentry / Bugly / Firebase Crashlytics）
22. 版本管理（CodePush 热更新 / TestFlight / 灰度）
23. 商店上架流程
24. 反作弊（设备指纹 / IP 黑名单 / IAP 凭证 / 海外多开检测）
25. 监控
26. 跨文件一致性检查

---

## 1. 业务目标

**为什么需要这章**：移动端 APP 跟 H5 / 小程序是**平行**渠道，不是"升级版 H5"。本章明确移动端的业务定位（海外拉新 + 留存 + Web3 入口）和可量化的北极星指标。

| 目标                 | 指标（Year 1）                              | 数据来源                                |
| -------------------- | ------------------------------------------- | --------------------------------------- |
| **海外用户占比**     | ≥ 60%（vs H5 国内占比 80%+）                | 设备注册时 `deviceRegion` 字段          |
| **海外渠道 CAC**     | Apple Search Ads < $2.5 / Google UAC < $3.0 | AppsFlyer / Adjust                      |
| **30 日留存**        | ≥ 25%（H5 仅 8%）                           | Mixpanel cohort                         |
| **IAP 转化率**       | 付费用户中 IAP 占比 ≥ 35%                   | App Store Connect / Google Play Console |
| **Web3 钱包绑定率**  | DLC 3+ 用户中 ≥ 50% 绑定钱包                | MobileDevice.walletBound                |
| **推送到达率**       | APNs ≥ 95% / FCM ≥ 90% / 厂商通道 ≥ 85%     | 极光统计 / 自建 token 表                |
| **Crash 率**         | Crashlytics < 0.5%                          | Firebase / Bugly                        |
| **App Store 评分**   | iOS 4.7+ / Google Play 4.5+                 | App Store Connect / Play Console        |
| **审核一次过**       | iOS ≥ 90% / Google Play ≥ 95%               | 提审记录                                |
| **海外社交登录占比** | 海外用户中 Facebook + Google 登录 ≥ 70%     | OverseasAuthBinding 表                  |

---

## 2. 用户故事

| #     | 故事                                                                                        |
| ----- | ------------------------------------------------------------------------------------------- |
| US-1  | 作为海外用户，我下载 APP 后用 **Apple ID** 一键登录（iOS），避免输入手机号                  |
| US-2  | 作为海外用户，我用 **Google Sign-In** 登录（Android），同时自动拿到 Gmail 头像              |
| US-3  | 作为萨摩亚华人，我想用**手机号 + OTP** 登录（复用 H5 的短信通道）                           |
| US-4  | 作为 DLC 4 用户，我用 **Face ID** 替代密码登录（生物识别）                                  |
| US-5  | 作为 Web3 用户，我打开 APP 弹出 **WalletConnect** 二维码，扫一下连接 MetaMask               |
| US-6  | 作为商家，我在 APP 内点**WhatsApp**按钮直接联系客服（不用装第三方）                         |
| US-7  | 作为运营，我用**系统推送**提醒用户 DLC 升级（APNs / FCM 双通道）                            |
| US-8  | 作为付费用户，我用 **Apple Pay** 1 秒内完成订阅支付（不用输卡号）                           |
| US-9  | 作为 KOL，我想把"AI 名片"分享到 **Facebook / LinkedIn / WhatsApp**，用 APP 专属分享面板     |
| US-10 | 作为老用户，APP 进入后台后收到**本地通知**（离线 DLC 升级提示）                             |
| US-11 | 作为用户，我在 iOS 锁屏收到 APNs 长按推送 → 直接跳到订单详情（**3D Touch** / Haptic Touch） |
| US-12 | 作为新用户，我用 **Facebook 登录**后自动关注海购星官方主页（Conversion API 上报）           |
| US-13 | 作为海外商家，我**离线**打开 APP 仍能看到缓存的 KYC 资料（MMKV 持久化）                     |

---

## 3. 与 H5 / 小程序 / 微信小程序的差异

> **为什么需要这章**：APP 不是 H5 / 小程序的"另一个壳"——它独有的能力（原生 API、推送通道、海外社交、IAP 抽成、Web3 钱包）必须在文档里独立说清楚。本章是 4 端对比的**唯一权威**，避免后续研发"用 H5 思路做 APP"。

### 3.1 4 端能力对比总表

| 维度          | H5 (Web)                        | 微信小程序           | **APP (RN)**                                                           | APP 独有 / 优势              |
| ------------- | ------------------------------- | -------------------- | ---------------------------------------------------------------------- | ---------------------------- |
| **框架**      | Vite + React 19                 | 微信原生 (WXML/WXSS) | **React Native 0.74+**                                                 | 跨 iOS + Android，单团队维护 |
| **后端 API**  | `/api/h5/*`                     | `/api/h5/*`（同 H5） | `/api/h5/*`（**完全复用**）                                            | 三端共用一套接口             |
| **登录方式**  | 手机号 + 密码 / OTP             | wx.login + unionid   | **手机号 OTP / Apple ID / Google / Facebook / LinkedIn / 钱包签名**    | 多达 7 种登录通道            |
| **支付**      | Stripe / 支付宝 H5 / 微信 H5    | `wx.requestPayment`  | **Apple Pay / Google Pay / IAP / 微信 H5 / 支付宝 H5**                 | IAP 必走（30% 抽成）         |
| **推送**      | Web Push（受限）                | 订阅消息（一次性）   | **APNs / FCM / 极光 / 厂商通道**                                       | 真正的系统级 Push            |
| **Web3 钱包** | window.ethereum（受浏览器限制） | ❌ 不支持            | **WalletConnect v2 / MetaMask SDK**                                    | 钱包即登录，链上签名         |
| **生物识别**  | WebAuthn（兼容性差）            | ❌ 不支持            | **Face ID / Touch ID / 指纹**                                          | 替代密码登录                 |
| **原生能力**  | 受限（getUserMedia 等）         | 有限                 | **相机/相册/通讯录/定位/蓝牙/扫码**                                    | 完整调用                     |
| **离线缓存**  | localStorage（5MB）/ IndexedDB  | Storage（10MB）      | **AsyncStorage / MMKV / SQLite**                                       | 大容量 + 加密                |
| **应用商店**  | ❌ 无                           | ❌ 无                | **App Store / Google Play / 国内安卓 5 大市场**                        | 渠道曝光 + ASO               |
| **裂变分享**  | navigator.share                 | `onShareAppMessage`  | **Facebook SDK / WhatsApp deep link / LinkedIn Share / TikTok Pixels** | 海外社交全打通               |
| **UI 风格**   | 浏览器原生                      | 微信 UI              | **底部 Tab Bar / 抽屉侧边栏 / 3D Touch / 长按菜单**                    | 平台特定 UI                  |
| **链接跳转**  | 普通 URL                        | Scheme URL           | **Universal Link (iOS) / App Link (Android)**                          | 装 APP 后直达                |
| **版本管理**  | 浏览器刷新即可                  | 灰度发布             | **CodePush 热更新 + TestFlight + 商店灰度**                            | 紧急修复不等审核             |
| **审核**      | ❌ 无                           | 微信审核 1-3 天      | **App Store 4.7+ 必过、Play 1-3 天、华为/小米 1-3 天**                 | 需过审 + 内购合规            |
| **包大小**    | 0                               | 主包 2MB             | iOS 4GB / Android 4GB                                                  | 体积大可加视频/资源          |
| **性能**      | 首屏 1.5s                       | 首屏 1.5s            | **iOS 启动 ≤ 1.2s / Android ≤ 1.5s**                                   | 接近原生                     |
| **i18n**      | i18next 4 语言                  | i18next 4 语言       | **i18next 4 语言 + 平台特定文案**                                      | 完全一致                     |

### 3.2 复用部分（**后端 API 不动**）

> **核心原则**：**后端零改动**。H5 / 小程序 / APP 调的是同一套 `/api/h5/*`。

- ✅ 所有 Prisma 数据模型 100% 复用
- ✅ 所有 i18n 字典文件复用（APP 用 i18next + react-native-localize 探测）
- ✅ 业务状态机、权限点（00-foundation §3）、审计日志（§4）、退款（§7.5）、KMS（§11）全部复用
- ✅ Transaction / Refund / KYC / DID 等核心模型不动
- ✅ WebSocket 推送（订单状态、DLC 升级、AI Chat）三端共用同一连接

### 3.3 改造部分（**前端实现差异**）

| 维度       | H5                  | APP（RN）                                             | 改造点                                                        |
| ---------- | ------------------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| 框架       | Vite + React 19     | RN 0.74 + Hermes                                      | 路由、状态、组件 API 全部重写                                 |
| 登录       | 手机号 OTP          | OTP + Apple ID + Google + Facebook + LinkedIn + 钱包  | 7 通道统一抽象 `AuthProvider`                                 |
| 支付       | Stripe / Alipay H5  | Apple Pay / Google Pay / IAP / 微信 H5 / 支付宝 H5    | 走原生 SDK                                                    |
| 推送       | Web Push            | APNs / FCM / 极光 / 厂商通道                          | 走 `PushNotificationIOS` / `@react-native-firebase/messaging` |
| 分享       | `navigator.share`   | Facebook SDK / WhatsApp deep link                     | 走 `react-native-share` + FB / LinkedIn 官方 SDK              |
| 摄像头扫码 | jsQR                | `react-native-vision-camera` + MLKit                  | 性能提升 5x                                                   |
| 文件下载   | `<a download>`      | RNFS + 原生下载                                       | 断点续传                                                      |
| 后台保活   | ❌                  | iOS Background Modes / Android Foreground Service     | 任务类应用需                                                  |
| 域名       | `https://smy.app`   | 不需要域名白名单                                      | 走应用商店审核                                                |
| Web3 钱包  | MetaMask 浏览器扩展 | WalletConnect v2 + MetaMask SDK（**in-app browser**） | APP 内直接连                                                  |
| 离线缓存   | localStorage        | MMKV（10x 快）+ SQLite（结构化）                      | 加密 + 大容量                                                 |

### 3.4 不支持的能力（明确告知产品）

> **为什么需要这章**：APP 不是万能——有些事 H5 能做但 APP 不能（或没必要做），写出来避免产品拍脑袋。

- ❌ **微信小程序码**：APP 调 `wxacode.getUnlimited` 需 openid，但 APP 用户的微信 openid 不一定绑定（海外用户居多）
- ❌ **微信内嵌支付**：APP 内不能调 `wx.requestPayment`（仅小程序原生支持），必须用 IAP 或微信 H5
- ❌ **公众号关注组件**：仅微信内可关注，APP 用户需扫码关注
- ❌ **服务号模板消息**：仅微信生态内触达，APP 用户无 unionid
- ❌ **小程序订阅消息**：APP 用户从未授权过小程序

### 3.5 APP 独有的能力（H5 / 小程序都没有）

| 能力                       | 场景                           | 实现                                                       |
| -------------------------- | ------------------------------ | ---------------------------------------------------------- |
| **APNs / FCM 推送**        | DLC 升级 / 支付成功 / 营销活动 | iOS 直接 APNs，Android 国内用厂商通道，海外用 FCM          |
| **生物识别登录**           | 替代密码登录                   | `react-native-biometrics`                                  |
| **Web3 钱包**              | DID 链上签名 / NFT 凭证        | WalletConnect v2 + MetaMask SDK                            |
| **Apple Pay / Google Pay** | 1 秒内支付                     | `react-native-iap` + `react-native-payments`               |
| **IAP**                    | 数字商品订阅（30% 抽成）       | `react-native-iap`（iOS StoreKit / Android BillingClient） |
| **WhatsApp 客服**          | 海外客服                       | `Linking.openURL('whatsapp://send?phone=...')`             |
| **Facebook 分享 / 登录**   | 海外裂变                       | `react-native-fbsdk-next`                                  |
| **LinkedIn 分享**          | B2B 渠道                       | `react-native-linkedin`                                    |
| **TikTok 像素**            | 海外投放归因                   | `react-native-tiktok-business-sdk`                         |
| **Universal Link**         | 装 APP 后直接跳详情            | apple-app-site-association + Android App Links             |
| **离线 DLC 升级**          | 弱网下提示                     | MMKV 缓存 DLC 阈值 + 本地通知                              |
| **3D Touch / 长按菜单**    | 快捷操作                       | iOS `UIContextMenuInteraction` / Android 长按              |

---

## 4. 技术选型决策（React Native vs Flutter vs Native）

> **为什么需要这章**：技术选型是**不可逆**决策（一旦上线 50w+ 用户，迁移成本极高）。本章用对比表 + 决策树说明为何选 RN。

### 4.1 三方案对比

| 维度                      | **React Native 0.74+**                        | Flutter 3.x                      | Native (Swift + Kotlin)       |
| ------------------------- | --------------------------------------------- | -------------------------------- | ----------------------------- |
| **语言**                  | TypeScript（**复用现有 React 团队**）         | Dart（团队**无**人写过）         | Swift + Kotlin（2 套团队）    |
| **跨端**                  | ✅ 1 套代码 → iOS + Android                   | ✅ 同 RN                         | ❌ 2 套                       |
| **学习成本**              | React 团队 0 成本                             | 需学 Dart + Widget               | 需学 Swift + Kotlin           |
| **生态**                  | npm 海量库（Web3 / FB / LinkedIn 都有 RN 包） | pub.dev 略少                     | 平台原生，库最丰富            |
| **性能**                  | 接近原生（Hermes 引擎 + Fabric 渲染）         | Skia 自绘，略快于 RN             | 最快                          |
| **热更新**                | ✅ **CodePush**（关键！）                     | ❌ 无官方热更                    | ❌ 无                         |
| **Web3 集成**             | ✅ WalletConnect v2 / MetaMask SDK 官方 RN 包 | 需 bridge                        | 平台原生                      |
| **海外社交 SDK**          | ✅ FB / Google / LinkedIn 都有 RN 包          | 需 MethodChannel                 | 平台原生                      |
| **IAP 抽成规避**          | 需 IAP（30%）或外部支付                       | 同 RN                            | 同 RN                         |
| **包大小**                | 30-50MB（含 Hermes）                          | 20-30MB                          | iOS 10-20MB / Android 15-25MB |
| **启动时间**              | iOS 1.2s / Android 1.5s                       | iOS 1.0s / Android 1.3s          | iOS 0.5s / Android 0.8s       |
| **冷启动内存**            | 150-200MB                                     | 120-150MB                        | 80-100MB                      |
| **Crash 率**              | 0.3-0.5%                                      | 0.2-0.4%                         | 0.1-0.2%                      |
| **团队复用**              | ✅ 100%（Vite + React 19 同构）               | ❌ 0%（新语言）                  | ❌ 30%（仅 API 设计）         |
| **人员招聘**              | 容易（RN 开发者多）                           | 中等                             | 难（iOS + Android 分招）      |
| **维护成本**              | 1 个团队                                      | 1 个团队                         | 2 个团队                      |
| **Apple 审核风险**        | 低（RN 是合规框架）                           | 中（Flutter 曾被拒过"赛博还原"） | 无                            |
| **App Store 4.7+ 通过率** | 95%+                                          | 90%+                             | 99%                           |

### 4.2 选型理由

**选 React Native 0.74+，不选 Flutter / Native 的核心理由**：

1. **团队复用 100%**——本项目 H5 已经是 Vite + React 19 + TypeScript，**所有** H5 业务组件（状态机、Hooks、Zustand store）几乎零成本迁移到 RN。
2. **Web3 / 海外社交 SDK 生态成熟**——WalletConnect v2、MetaMask SDK、Facebook SDK、Google Sign-In、LinkedIn SDK、TikTok Business SDK 都有**官方 RN 包**，Flutter 多为社区维护（部分场景无）。
3. **CodePush 热更新**——RN 的杀手锏。生产事故可秒级热修，**不**依赖苹果/谷歌审核。Flutter 至今无官方热更方案。
4. **避免两套团队**——Native 方案需要 iOS 团队 + Android 团队 + JS 团队 = 3 个团队。RN 仅 1 个 JS 团队。
5. **生态丰富**——`react-native-vision-camera`（扫码）、`react-native-mmkv`（存储）、`react-native-biometrics`（生物识别）、`react-native-iap`（内购）、`react-native-permissions`（权限）、`react-native-firebase`（FCM）、`@react-native-community/push-notification-ios`（APNs）都是**事实标准**。
6. **新架构（Fabric + TurboModules）**——RN 0.74+ 启用了新一代渲染器 Fabric + 同步 JSI 桥，性能已接近原生。

### 4.3 关键技术决策

| 决策点     | 选择                                                                  | 理由                                    |
| ---------- | --------------------------------------------------------------------- | --------------------------------------- |
| 渲染引擎   | **Hermes**（默认）                                                    | 启动快 50%，内存小 30%，包小 10MB       |
| 新架构     | **启用 Fabric + TurboModules**                                        | 同步 JSI 调用，性能提升 30%+            |
| 导航       | **React Navigation 7**                                                | 生态最广，H5 团队已用                   |
| 状态管理   | **Zustand 4**                                                         | 比 Redux Toolkit 轻 60%，API 跟 H5 一致 |
| 网络层     | **axios + 自研 retry + offline queue**                                | H5 端已用 axios                         |
| 离线缓存   | **MMKV（KV）+ react-native-sqlite-storage（结构化）**                 | MMKV 比 AsyncStorage 快 **30 倍**       |
| 推送       | **APNs (iOS) / FCM (海外 Android) / 极光 + 厂商通道 (国内 Android)**  | 国内不能用 FCM，必须走厂商通道          |
| 支付       | **react-native-iap (IAP) + react-native-payments (Apple/Google Pay)** | 官方维护                                |
| Web3       | **@walletconnect/react-native-compat + react-native-metamask-sdk**    | 官方 RN 包                              |
| 生物识别   | **react-native-biometrics**                                           | 跨 iOS / Android 一致 API               |
| i18n       | **react-i18next + react-native-localize**                             | H5 端已用 i18next                       |
| Crash 监控 | **Sentry + Firebase Crashlytics + Bugly**                             | 海外 Sentry，国内 Bugly                 |
| 热更新     | **Microsoft CodePush**（iOS 暂不支持，见 §22.2）                      | 紧急修复秒级生效                        |
| 链接       | **Universal Link (iOS) + App Link (Android)**                         | 装 APP 后直跳，免引导页                 |

---

## 5. 业务流程

> **为什么需要这章**：APP 的核心业务场景必须在文档里**逐个**画清楚（用 ASCII 流程图），不能只放代码。流程图是产品 / 运营 / 客服的共同语言。

### 5.1 登录授权流程

**为什么需要这章**：APP 端登录通道多达 7 种（手机号 OTP / Apple ID / Google / Facebook / LinkedIn / 微信扫码 / 钱包签名），每种对应不同海外用户群。必须用**统一抽象** `AuthProvider` 屏蔽差异。

```
┌──────────┐                ┌──────────┐                ┌──────────┐
│  APP     │                │  后端    │                │ 平台 SDK │
└────┬─────┘                └────┬─────┘                └────┬─────┘
     │  1. 用户点"Apple 登录"      │                            │
     │ ──────────────────────►   │                            │
     │                           │  2. 调 Apple SDK 拿        │
     │                           │  identityToken (JWT)       │
     │                           │                            │
     │                           │  3. 验签 identityToken    │
     │                           │ ──────────────────────►  │
     │                           │ ◄───── 验签通过 ─────────│
     │                           │                            │
     │  4. POST /api/h5/auth/apple-login                     │
     │    { identityToken, nonce, fullName? }                │
     │ ──────────────────────►   │                            │
     │                           │  5. 查 User 表（按 appleSub）│
     │                           │     没有则自动注册          │
     │                           │  6. 创建/更新 MobileDevice  │
     │                           │  7. 写 OverseasAuthBinding │
     │                           │  8. 签发 JWT               │
     │  9. { token, user, isNew } │                            │
     │ ◄────────────────────────│                            │
     │                           │                            │
```

**关键点**：

- Apple 登录**不**返回手机号（保护隐私），用 `appleSub`（sub claim）做唯一标识
- Android 用 Google Sign-In 时返回 `idToken`（JWT），后端验签 + 查 `sub` 字段
- 海外用户**优先**用 Apple/Google/Facebook（避免海外短信成本）
- 国内/华人用户**优先**用手机号 OTP（复用 H5 通道）
- 钱包签名登录（见 §5.4）：DLC 4+ 用户用 `personal_sign` 验签地址所有权

### 5.2 推送流程（注册 → 接收 → 点击跳转）

```
┌──────────┐        ┌──────────┐        ┌──────────┐        ┌──────────┐
│  APP     │        │  后端    │        │  APNs/   │        │  用户    │
│          │        │          │        │  FCM     │        │          │
└────┬─────┘        └────┬─────┘        └────┬─────┘        └────┬─────┘
     │  1. APP 启动       │                   │                   │
     │  调 PushService     │                   │                   │
     │  .requestPermission()                  │                   │
     │ ─────────────────►│                   │                   │
     │                   │  2. 后端无         │                   │
     │                   │  关联（按 deviceId）                  │
     │  3. APNs/FCM 拿 token                 │                   │
     │ ◄──────────────────────────────────────│                   │
     │                   │                   │                   │
     │  4. POST /api/h5/push/register         │                   │
     │    { deviceId, pushToken, platform, appVersion, locale }   │
     │ ─────────────────►│                   │                   │
     │                   │  5. 写 PushToken 表│                   │
     │                   │  6. 写 MobileDevice│                   │
     │                   │                   │                   │
     │                                          │ 后端定时任务   │
     │                                          │ 触发推送：     │
     │                                          │ "DLC 升级通知" │
     │                                          │                 │
     │  7. APNs 推送到设备  │                   │                 │
     │ ◄──────────────────────────────────────│                 │
     │                                          │                 │
     │  8. 系统通知中心显示（DLC 升级）         │                 │
     │ ──────────────────────────────────────────────────────►│
     │                                          │                 │
     │  9. 用户点推送  │                   │                 │
     │ ──────────────────────────────────────────────────────►│
     │  10. APP 启动 → 解析 payload.deepLink   │                 │
     │     deepLink = "smy://dlc/upgrade?orderId=xxx"           │
     │     ReactNavigation.navigate('DlcUpgrade', {orderId})    │
```

**关键点**：

- iOS 必须先 `requestPermission`（`alert` / `badge` / `sound`），用户拒绝后**不能**再弹（要走设置）
- Android 13+ 必须 POST_NOTIFICATIONS 权限（动态申请）
- 国内 Android **不能**用 FCM，必须走极光 + 厂商通道（华为/小米/OPPO/VIVO/魅族）
- **payload 必带 `deepLink`**（如 `smy://order/123`），点击推送直接跳详情
- iOS 长按推送可触发 `category`（3D Touch）→ 快捷操作（查看 / 关闭）

### 5.3 支付流程（Apple Pay / Google Pay / IAP / 微信 H5 / 支付宝 H5）

> **为什么需要这章**：APP 端支付**远比** H5 复杂——IAP 必须走（30% 抽成给苹果/谷歌），但**部分商品**可用外部支付（订阅读 H5 微信/支付宝）。

```
┌──────────────────────────────────────────────────────────────────┐
│                    支付路由决策树                                  │
├──────────────────────────────────────────────────────────────────┤
│ 商品类型:                                                       │
│  ├─ 数字商品（订阅/虚拟币/会员）→ 强制 IAP（30% 抽成）          │
│  └─ 实体服务（公司注册/银行开户/法律咨询）→ 外部支付             │
│                                                                  │
│ 平台:                                                            │
│  ├─ iOS → Apple Pay（优先）/ IAP / 微信 H5 / 支付宝 H5          │
│  └─ Android → Google Pay（优先）/ IAP / 微信 H5 / 支付宝 H5    │
│                                                                  │
│ 用户地区:                                                        │
│  ├─ 海外 → Apple Pay / Google Pay / Stripe / 信用卡             │
│  └─ 国内 → 微信 H5 / 支付宝 H5 / 银联                           │
└──────────────────────────────────────────────────────────────────┘
```

#### 5.3.1 Apple Pay 流程（iOS）

```
1. APP 调 PaymentService.canMakePayments() → 校验设备 + 卡
2. APP 调 PaymentService.createPaymentRequest({
     merchantId,          // merchant.com.smy.app
     currencyCode,       // 'USD' / 'CNY'
     countryCode,        // 'US' / 'CN'
     items,              // [{ label, amount }]
     requiredShippingContactFields,  // 可选
   })
3. iOS 系统弹窗（Face ID / Touch ID 认证）
4. 认证通过 → APP 拿 PKPayment（包含 paymentData）
5. POST /api/h5/payments/apple-pay-process
   Body: { paymentData: base64, orderId, amount, currency }
6. 后端把 paymentData 转发到支付通道（Stripe / Adyen）
7. 支付通道 → 返回 charge 成功 / 失败
8. 后端写 Transaction.status = 'paid'
9. 后端 WebSocket 推 order.paid
10. APP toast "支付成功" + 跳详情
```

#### 5.3.2 IAP 流程（订阅/虚拟币）

```
1. APP 调 RNIap.requestProducts(['com.smy.subscription.monthly'])
2. iOS 返回 SKProduct 列表
3. APP 显示商品列表
4. 用户点购买 → RNIap.requestPurchase({ sku, quantity })
5. iOS StoreKit 弹窗（Face ID 认证）
6. 认证通过 → APP 拿 transactionReceipt (JWS 字符串)
7. POST /api/h5/payments/iap-verify
   Body: { platform: 'ios' | 'android', receipt, productId, orderId }
8. 后端调苹果 / 谷歌服务器验签 receipt
9. 验签成功 → 后端写 Transaction.status = 'paid'
10. 后端返回验证结果给 APP
11. APP 提示成功 + 发凭证
12. ⚠️ 苹果规定：必须先调 finishTransaction()（防重发）
```

**关键决策**：

- **必须服务端验签** receipt，**不**能信前端
- 订阅类商品（自动续费）必须用 `RNIap.requestSubscription`（**不**是 `requestPurchase`）
- 安卓订阅要用 `RNIap.requestSubscription({ sku, prorationMode })`
- 安卓 IAP 必须用 `BillingClient`（Google Play Billing v6+）

#### 5.3.3 微信 H5 / 支付宝 H5 流程（实体服务）

```
1. APP 调 RNIap.requestPurchase('hm_external', { orderId, amount })
2. 后端判断：实体服务 → 走外部支付
3. 后端生成微信 H5 支付 URL（用户在浏览器内完成支付）
4. APP 调 SFSafariViewController / Chrome Custom Tabs
5. 用户在浏览器内完成支付
6. 支付完成 → 浏览器跳回 APP Universal Link
7. APP 检查订单状态（拉 /api/h5/payments/:id）
```

**关键**：

- **必须用 SFSafariViewController**（iOS）/ Chrome Custom Tabs（Android），**不**用 WebView（苹果拒）
- Universal Link 跳回：`https://smy.app/payment/return?orderId=xxx`
- 安卓需在 `app/build.gradle` 加 `intent-filter` 配 `android:autoVerify="true"`

### 5.4 Web3 钱包连接（WalletConnect v2 / MetaMask SDK）

> **为什么需要这章**：APP 端钱包登录**不**能像 H5 那样跳浏览器（体验割裂）。必须用 **WalletConnect v2**（in-app flow）或 **MetaMask SDK**（in-app browser）。

```
┌──────────┐                ┌──────────┐                ┌──────────┐
│  APP     │                │  后端    │                │  MetaMask│
│ (RN)     │                │          │                │  / 钱包  │
└────┬─────┘                └────┬─────┘                └────┬─────┘
     │  1. 用户点"连接钱包"      │                            │
     │ ──────────────────────►  │                            │
     │  2. APP 调 WalletConnect  │                            │
     │     .connect({            │                            │
     │       requiredNamespaces: {                            │
     │         eip155: { chains: [1, 56, 137] }  // ETH/BSC/Polygon
     │       }                  │                            │
     │     })                   │                            │
     │  3. WalletConnect 生成    │                            │
     │     uri = "wc:xxx@2?..."  │                            │
     │  4. APP 弹 QR 码          │                            │
     │     (或 deep link)        │                            │
     │                            │                            │
     │                            │  5. 钱包扫 QR / 唤起 APP │
     │                            │ ───────────────────────►│
     │                            │                            │
     │                            │  6. 用户在钱包内批准      │
     │                            │ ◄──────────────────────│
     │                            │                            │
     │  7. WalletConnect 回调     │                            │
     │     { accounts, signature }│                            │
     │ ◄─────────────────────────│                            │
     │                            │                            │
     │  8. APP 调钱包签 nonce     │                            │
     │     personal_sign(         │                            │
     │       "Sign in to SMY: nonce=xxx",                      │
     │       account             │                            │
     │     )                     │                            │
     │ ────────────────────────►│                            │
     │                            │                            │
     │  9. POST /api/h5/auth/wallet-login                     │
     │     { address, signature, message, chainId }            │
     │ ────────────────────────►│                            │
     │                            │  10. 验签（ethers.verifyMessage）│
     │                            │  11. 查 User（按 address）  │
     │                            │  12. 签发 JWT              │
     │  13. { token, user }       │                            │
     │ ◄─────────────────────────│                            │
```

**关键点**：

- 验签用 `ethers.verifyMessage(message, signature)` 恢复 `address`，对比是否一致
- nonce 必须**每次**重新生成（防重放攻击），存 Redis 5 分钟
- 一个 address 只能绑一个 userId（**不**允许多个 user 共享钱包）
- MetaMask SDK（`@metamask/sdk-react-native`）走 deep link，更丝滑
- 链支持：Ethereum (1) / BSC (56) / Polygon (137) / Arbitrum (42161)

### 5.5 生物识别登录

> **为什么需要这章**：海外用户**强烈**期望用 Face ID / Touch ID / 指纹替代密码登录。生物识别**不**是密码，而是**解锁**已存储的加密 token。

```
1. APP 首次登录成功 → 询问"启用 Face ID 登录？"
2. 用户同意 → APP 调 BiometricsService.simplePrompt({ reason: '启用 Face ID 登录' })
3. iOS LocalAuthentication / Android BiometricPrompt 弹窗
4. 认证通过 → APP 拿 secureKey (Keychain / Keystore 存储)
5. APP 用 secureKey 加密 refreshToken → 存 MMKV（device-only）
6. 下次启动 → 检测到 MMKV 里有 encryptedRefreshToken
7. APP 调 BiometricsService.simplePrompt({ reason: '使用 Face ID 登录' })
8. 认证通过 → APP 用 secureKey 解密 refreshToken
9. POST /api/h5/auth/refresh-token { refreshToken, deviceId }
10. 后端返回新 accessToken
11. 登录成功
```

**关键点**：

- **不**把 refreshToken 直接存 MMKV（不安全）
- secureKey 用 `react-native-keychain`（iOS Keychain / Android Keystore）
- 用户**拒绝**生物识别 → 降级到密码 / OTP
- **iOS 必须**用 `LAContext`（**不**用旧的 TouchID API）
- Android 必须用 `BiometricPrompt`（**不**用旧的 `FingerprintManager`）
- 关键操作（支付、修改密码）**不**仅用生物识别，要二次 OTP

### 5.6 海外社交登录（Facebook / Google / LinkedIn）

> **为什么需要这章**：海外用户**极度依赖**社交登录。本节把 §17 SDK 集成 + 本节业务流程连起来，详细图解每个社交登录链路。

#### 5.6.1 Facebook 登录

```
1. APP 调 LoginManager.logInWithPermissions(['public_profile', 'email'])
2. Facebook SDK 弹窗（iOS ASWebAuthenticationSession / Android Chrome Custom Tabs）
3. 用户授权 → 返回 accessToken + userId
4. APP 调 GraphRequest('/me', { fields: 'id,name,email,picture' }, accessToken)
5. Facebook 返回用户信息
6. POST /api/h5/auth/facebook-login
   Body: { accessToken, userId, email, name, pictureUrl }
7. 后端调 Facebook Graph API 验签 accessToken
   GET https://graph.facebook.com/debug_token?input_token={accessToken}&access_token={appToken}
8. 验签通过 → 查 User 表（按 facebookUserId）
9. 创建/更新 OverseasAuthBinding（provider='facebook'）
10. 签发 JWT
11. APP 跳首页
```

#### 5.6.2 Google 登录

```
1. APP 调 GoogleSignin.signIn()
2. Google SDK 弹窗
3. 用户授权 → 返回 idToken (JWT) + user (id, email, name, photo)
4. APP 验证 idToken 用 Google API 客户端 ID
5. POST /api/h5/auth/google-login
   Body: { idToken, email, name, pictureUrl }
6. 后端用 google-auth-library 验签 idToken
   const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })
7. 查 User（按 googleSub）
8. 写 OverseasAuthBinding（provider='google'）
9. 返回 JWT
```

#### 5.6.3 LinkedIn 登录

```
1. APP 调 LinkedInMobileSdk.login()
2. LinkedIn SDK 弹窗（OAuth 2.0 Authorization Code）
3. 用户授权 → 返回 authorizationCode
4. APP 用 code 调后端
   POST /api/h5/auth/linkedin-login { code, redirectUri }
5. 后端用 code + clientSecret 调 LinkedIn 换 accessToken
   POST https://www.linkedin.com/oauth/v2/accessToken
6. 后端用 accessToken 拉用户信息
   GET https://api.linkedin.com/v2/userinfo
7. 查 User（按 linkedinSub）
8. 写 OverseasAuthBinding（provider='linkedin'）
9. 返回 JWT
```

**关键决策**：

- Facebook / Google 登录**必**用官方 SDK（**不**用 webview，**不**用 expo-auth-session 等）
- Facebook 申请 review：必须提供测试账号 + 详细业务说明，否则登录权限被吊销
- LinkedIn 登录需申请 Marketing Developer Platform 权限
- 海外社交登录的 `providerAccessToken` **必须**用 KMS 加密后存 DB（见 §6.5）

### 5.7 WhatsApp 分享 / 客服跳转

> **为什么需要这章**：海外用户**只**用 WhatsApp，不用微信。APP 必须深度集成 WhatsApp 分享 + 客服。

#### 5.7.1 WhatsApp 分享（Deep Link）

```
1. 用户点"分享给 WhatsApp 好友"
2. APP 调 Share.share({
     message: '海购星 - 萨摩亚合规出海一站式平台',
     url: 'https://smy.app/invite?ref=user_123',
     social: Whatsapp
   })
3. 调 react-native-share → 自动调系统分享面板（iOS / Android）
4. 用户选 WhatsApp → 调 whatsapp://send?text=...
5. 跳转到 WhatsApp，消息已填好
6. 用户选好友发送
```

**或直接 Deep Link**：

```typescript
import { Linking } from 'react-native';

const shareToWhatsApp = async (text: string) => {
  const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  } else {
    // 降级：跳 WhatsApp Web
    await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }
};
```

#### 5.7.2 WhatsApp 客服（Business Cloud API）

> **为什么需要这章**：海外客服**几乎**全在 WhatsApp（用 Telegram / SMS 极少）。APP 必须支持 WhatsApp 一键唤起客服对话。

```
方式 A（简单）：Deep Link 唤起个人/商业号
  whatsapp://send?phone={phone}&text={prefilledText}
  wa.me/{phone}?text={prefilledText}  (Web 备选)

方式 B（专业）：WhatsApp Business Cloud API
  1. 客户在 APP 内点"联系客服"
  2. APP POST /api/h5/support/whatsapp-session { userId }
  3. 后端调 Meta WhatsApp Business API：
     POST https://graph.facebook.com/v18.0/{phoneNumberId}/messages
     Body: {
       messaging_product: 'whatsapp',
       to: userPhone,
       type: 'template',
       template: { name: 'cs_session', language: { code: 'en' } }
     }
  4. 客户收到 WhatsApp 模板消息（首次需同意）
  5. 客户回复 → 走客服后台（用 Meta Inbox / 第三方如 respond.io）
  6. 24h 窗口期内可自由对话
```

**关键点**：

- 模板消息需 Meta 审核（首次发送需客户在 24h 内回复）
- 客服后台建议接 respond.io / Intercom（带 WhatsApp 集成）
- 客服会话上下文（含历史订单 / KYC）需后端调 WhatsApp API 上传

---

## 6. 字段定义（APP 特有）

> **为什么需要这章**：APP 端有 5 张**全新**数据表（MobileDevice / PushToken / AppInstall / BiometricAuth / OverseasAuthBinding），所有 `*UserId` 都按 00-foundation §12 加外键 + `Restrict`。

### 6.1 MobileDevice（设备注册）

| 字段                            | 类型       | 必填 | 说明                                                                            |
| ------------------------------- | ---------- | ---- | ------------------------------------------------------------------------------- |
| id                              | String     | ✓    | UUID 主键                                                                       |
| userId                          | String     |      | 关联 User.id（00-foundation §13 双身份允许，登录后才填）                        |
| deviceId                        | String(64) | ✓    | iOS `identifierForVendor` / Android `ANDROID_ID`（包装后），**不**存明文原始 ID |
| platform                        | enum       | ✓    | `ios` / `android`                                                               |
| osVersion                       | String     | ✓    | `17.4.1` / `14`                                                                 |
| appVersion                      | String     | ✓    | `1.0.0`                                                                         |
| buildNumber                     | Int        | ✓    | iOS CFBundleVersion / Android versionCode                                       |
| deviceModel                     | String     |      | `iPhone15,2` / `Pixel 8`                                                        |
| manufacturer                    | String     |      | `Apple` / `Samsung`                                                             |
| brand                           | String     |      | `iPhone` / `Galaxy`                                                             |
| locale                          | String     |      | `en-US` / `zh-CN` / `ja-JP` / `ko-KR`                                           |
| timezone                        | String     |      | `Asia/Shanghai`                                                                 |
| region                          | String     |      | ISO 国家码（IP 解析）`WS` / `US` / `CN`                                         |
| appInstallId                    | String     |      | 关联 AppInstall.id（安装来源追踪）                                              |
| walletBound                     | Boolean    |      | 是否绑定了 Web3 钱包（见 §6.5）                                                 |
| walletAddress                   | String(64) |      | 钱包地址（EIP-55 checksum）                                                     |
| walletChainId                   | Int        |      | 链 ID（1=ETH, 56=BSC, 137=Polygon）                                             |
| biometricEnabled                | Boolean    |      | 是否启用了生物识别登录                                                          |
| lastActiveAt                    | DateTime   |      | 最后一次 APP 启动时间                                                           |
| jailbroken                      | Boolean    |      | 是否越狱 / root（安全风险标记）                                                 |
| createdAt, updatedAt, deletedAt |            |      | 通用（按 §6）                                                                   |

```prisma
model MobileDevice {
  id              String   @id @default(uuid())
  userId          String?
  user            User?    @relation("MobileDeviceUser", fields: [userId], references: [id], onDelete: Restrict)
  deviceId        String   // 包装后的 ID
  platform        String   // ios / android
  osVersion       String
  appVersion      String
  buildNumber     Int
  deviceModel     String?
  manufacturer    String?
  brand           String?
  locale          String   @default("en-US")
  timezone        String   @default("UTC")
  region          String?
  appInstallId    String?
  appInstall      AppInstall? @relation("MobileDeviceInstall", fields: [appInstallId], references: [id], onDelete: SetNull)
  walletBound     Boolean  @default(false)
  walletAddress   String?
  walletChainId   Int?
  biometricEnabled Boolean @default(false)
  lastActiveAt    DateTime?
  jailbroken      Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  pushTokens      PushToken[]
  biometricAuths  BiometricAuth[]
  overseasAuths   OverseasAuthBinding[]

  @@unique([platform, deviceId])
  @@index([userId])
  @@index([region])
  @@index([appInstallId])
  @@index([lastActiveAt])
}
```

### 6.2 PushToken（推送 token）

> **为什么需要这章**：推送 token **不是**一次性凭证——一个设备可同时有 iOS APNs token + Android FCM token（极少）+ 极光 registrationId（国内安卓）。需独立表管理 token 生命周期（轮转 / 失效 / 卸载）。

| 字段                            | 类型        | 必填 | 说明                                                                       |
| ------------------------------- | ----------- | ---- | -------------------------------------------------------------------------- |
| id                              | String      | ✓    |                                                                            |
| deviceId                        | String      | ✓    | 关联 MobileDevice.id                                                       |
| channel                         | enum        | ✓    | `apns` / `fcm` / `jpush` / `huawei` / `xiaomi` / `oppo` / `vivo` / `meizu` |
| token                           | String(512) | ✓    | 推送 token（**不**同通道长度不同）                                         |
| appId                           | String      |      | 多 APP 隔离（如 iOS 主 APP + Today Extension）                             |
| isActive                        | Boolean     |      | 是否有效（APNs/FCM 反馈失效时改 false）                                    |
| subscribedTopics                | String      |      | JSON 数组，订阅的主题（`["dlc_upgrade", "payment", "marketing"]`）         |
| lastSeenAt                      | DateTime    |      | 最后一次成功推送时间（用于清理失效 token）                                 |
| failedCount                     | Int         |      | 连续失败次数（≥ 5 次自动停用）                                             |
| createdAt, updatedAt, deletedAt |             |      |                                                                            |

```prisma
model PushToken {
  id              String   @id @default(uuid())
  deviceId        String
  device          MobileDevice @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  channel         String   // apns / fcm / jpush / huawei / xiaomi / oppo / vivo / meizu
  token           String
  appId           String?
  isActive        Boolean  @default(true)
  subscribedTopics String  @default("[]")  // JSON
  lastSeenAt      DateTime?
  failedCount     Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  @@unique([channel, token])
  @@index([deviceId, isActive])
  @@index([channel, isActive])
  @@index([isActive, lastSeenAt])
}
```

**Token 轮转策略**：

- iOS APNs token 在系统升级 / APP 重装后会变，APP 启动时**每次**调 `PushNotificationIOS.getInitialNotificationToken()` + `onRegister` 回调
- 同一 deviceId + 同一 channel 下，新 token 覆盖旧 token（`upsert`）
- 后端定时任务：每天清理 `isActive=false` 且 `lastSeenAt < 30 days ago` 的 token

### 6.3 AppInstall（安装来源追踪）

> **为什么需要这章**：海外渠道（Apple Search Ads / Google UAC / Facebook Ads / TikTok Ads）的**归因**必须**有据可查**。所有安装必须带 `installReferrer` / `adToken` / `adGroupId` 落库。

| 字段                 | 类型     | 必填 | 说明                                                                                                  |
| -------------------- | -------- | ---- | ----------------------------------------------------------------------------------------------------- |
| id                   | String   | ✓    |                                                                                                       |
| deviceId             | String   | ✓    | 关联 MobileDevice.id                                                                                  |
| installId            | String   |      | 一次性唯一 ID（生成后存 Keychain / Keystore）                                                         |
| source               | enum     | ✓    | `organic` / `apple_search_ads` / `google_uac` / `facebook_ads` / `tiktok_ads` / `referral` / `qrcode` |
| campaignId           | String   |      | 广告 campaign ID                                                                                      |
| adGroupId            | String   |      | 广告组 ID                                                                                             |
| creativeId           | String   |      | 创意 ID                                                                                               |
| adToken              | String   |      | 广告 click token（iOS `iAd` / Google `referrer`）                                                     |
| clickId              | String   |      | Facebook `fbclid` / TikTok `ttclid`                                                                   |
| attributionPlatform  | String   |      | `appsflyer` / `adjust` / `branch`                                                                     |
| attributionJson      | String   |      | 原始归因数据（JSON，用于审计）                                                                        |
| installAt            | DateTime | ✓    | 安装时间                                                                                              |
| firstOpenAt          | DateTime |      | 首次打开时间                                                                                          |
| createdAt, updatedAt |          |      |                                                                                                       |

```prisma
model AppInstall {
  id                  String   @id @default(uuid())
  deviceId            String
  installId           String   @unique
  source              String   // organic / apple_search_ads / google_uac / facebook_ads / tiktok_ads / referral / qrcode
  campaignId          String?
  adGroupId           String?
  creativeId          String?
  adToken             String?
  clickId             String?
  attributionPlatform String?  // appsflyer / adjust / branch
  attributionJson     String?  // 原始归因数据
  installAt           DateTime
  firstOpenAt         DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  devices             MobileDevice[]

  @@index([source, installAt])
  @@index([campaignId])
  @@index([clickId])
}
```

**关键**：

- 归因平台用 AppsFlyer（海外主流）或 Adjust
- ATT（App Tracking Transparency）：iOS 14.5+ 必须先弹 ATT 弹窗，**不**能默认同意
- SKAdNetwork：iOS 14+ 必配（即使不投苹果广告也要配，否则苹果会拒）

### 6.4 BiometricAuth（生物识别记录）

> **为什么需要这章**：生物识别**不**是密码，而是"解锁"已存储的 refreshToken。需独立表记录"何时 / 哪台设备 / 哪种生物识别"。

| 字段                 | 类型     | 必填 | 说明                                                            |
| -------------------- | -------- | ---- | --------------------------------------------------------------- |
| id                   | String   | ✓    |                                                                 |
| deviceId             | String   | ✓    | 关联 MobileDevice.id                                            |
| userId               | String   | ✓    | 关联 User.id                                                    |
| biometricType        | enum     | ✓    | `face_id` / `touch_id` / `fingerprint` / `face_unlock` / `iris` |
| enrolledAt           | DateTime | ✓    | 启用时间                                                        |
| lastUsedAt           | DateTime |      | 最后一次使用                                                    |
| useCount             | Int      |      | 使用次数                                                        |
| isActive             | Boolean  |      | 是否启用（用户可关闭）                                          |
| publicKey            | String   |      | 设备公钥（iOS Secure Enclave / Android StrongBox）              |
| revokedAt            | DateTime |      | 撤销时间                                                        |
| createdAt, updatedAt |          |      |                                                                 |

```prisma
model BiometricAuth {
  id            String   @id @default(uuid())
  deviceId      String
  device        MobileDevice @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  userId        String
  user          User     @relation("BiometricAuthUser", fields: [userId], references: [id], onDelete: Restrict)
  biometricType String   // face_id / touch_id / fingerprint / face_unlock / iris
  enrolledAt    DateTime
  lastUsedAt    DateTime?
  useCount      Int      @default(0)
  isActive      Boolean  @default(true)
  publicKey     String?  // 设备公钥
  revokedAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([deviceId, userId])
  @@index([userId, isActive])
  @@index([lastUsedAt])
}
```

### 6.5 OverseasAuthBinding（海外社交账号绑定）**— 本轮新增**

> **为什么需要这章**：海外用户**有多个社交身份**（Facebook + Google + LinkedIn + WhatsApp），必须按 00-foundation §13 双身份规则支持**一自然人 → 多 overseas auth binding**。这张表是 §17 社交集成的**核心数据**。

| 字段                            | 类型        | 必填 | 说明                                                                           |
| ------------------------------- | ----------- | ---- | ------------------------------------------------------------------------------ |
| id                              | String      | ✓    |                                                                                |
| userId                          | String      | ✓    | 关联 User.id（**不**唯一——一个 user 可有多个 binding）                         |
| provider                        | enum        | ✓    | `facebook` / `google` / `linkedin` / `twitter` / `apple` / `wechat` / `wallet` |
| providerUserId                  | String(128) | ✓    | 各平台 userId（Facebook `me.id` / Google `sub` / LinkedIn `sub`）              |
| providerEmail                   | String      |      | 平台返回的 email（**不**一定给）                                               |
| providerName                    | String      |      | 平台显示名                                                                     |
| providerAvatarUrl               | String      |      | 头像 URL（**不**存 CDN，需时调平台 API）                                       |
| providerAccessToken             | String      |      | **KMS 加密**后存（用于调平台 API，如 Facebook 发帖）                           |
| providerRefreshToken            | String      |      | **KMS 加密**后存                                                               |
| accessTokenExpiresAt            | DateTime    |      | accessToken 过期时间                                                           |
| scope                           | String      |      | 授权 scope（逗号分隔）                                                         |
| rawProfile                      | String      |      | 原始 profile JSON（**KMS 加密**）                                              |
| lastLoginAt                     | DateTime    |      | 最后一次用该 provider 登录                                                     |
| isPrimary                       | Boolean     |      | 是否为该 provider 的主账号（一 provider 唯一）                                 |
| isActive                        | Boolean     |      | 是否启用（用户可解绑）                                                         |
| unbindedAt                      | DateTime    |      | 解绑时间                                                                       |
| createdAt, updatedAt, deletedAt |             |      |                                                                                |

```prisma
model OverseasAuthBinding {
  id                    String   @id @default(uuid())
  userId                String
  user                  User     @relation("OverseasAuthBindingUser", fields: [userId], references: [id], onDelete: Restrict)
  deviceId              String?  // 注册时的设备
  device                MobileDevice? @relation(fields: [deviceId], references: [id], onDelete: SetNull)
  provider              String   // facebook / google / linkedin / twitter / apple / wechat / wallet
  providerUserId        String
  providerEmail         String?
  providerName          String?
  providerAvatarUrl     String?
  providerAccessToken   String?  // KMS 加密
  providerRefreshToken  String?  // KMS 加密
  accessTokenExpiresAt  DateTime?
  scope                 String?
  rawProfile            String?  // KMS 加密
  lastLoginAt           DateTime?
  isPrimary             Boolean  @default(false)
  isActive              Boolean  @default(true)
  unbindedAt            DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  deletedAt             DateTime?

  @@unique([provider, providerUserId])
  @@index([userId, provider])
  @@index([userId, isActive])
  @@index([provider, isActive])
  @@index([accessTokenExpiresAt])
}
```

**关键决策**：

- 同一 provider + 同一 providerUserId **唯一**（防重复绑定）
- 同一 user 可有多个 provider 的 binding（如 user_123 同时绑 Facebook + Google + LinkedIn）
- `providerAccessToken` / `providerRefreshToken` **必须**用 00-foundation §11 KMS 加密
- 用户解绑后**软删**（`isActive=false` + `unbindedAt`），便于重新绑定
- `isPrimary` 用于支持"一个 provider 多账号"场景（罕见，但海外用户会有 2 个 Facebook 账号）

---

## 7. 状态机

### 7.1 推送订阅状态

```
┌─────────┐   用户拒绝/未授权    ┌──────────┐
│  unknown │ ─────────────────►  │ disabled │
└────┬────┘                      └──────────┘
     │ 用户授权
     ▼
┌─────────┐   APP 重装/系统升级  ┌─────────┐
│ enabled │ ◄─────────────────  │ rotated │
└────┬────┘   重新拿 token       └─────────┘
     │ 连续失败 ≥ 5 次
     ▼
┌─────────┐   30 天未推送成功    ┌──────────┐
│ failed  │ ─────────────────►  │ expired  │
└─────────┘                      └──────────┘
     │ 重新授权
     ▼
   enabled
```

**触发条件**：

- `unknown`：APP 安装后**未**触发 `requestPermission`
- `unknown → enabled`：用户授权 + 拿 token 成功
- `unknown → disabled`：用户拒绝（iOS 不能再次弹，需引导到设置）
- `enabled → rotated`：token 变化（系统升级 / APP 重装）
- `enabled → failed`：连续推送失败 ≥ 5 次（APNs/FCM 反馈 `Unregistered`）
- `enabled → expired`：30 天未成功推送（自动清理）

### 7.2 IAP 订单状态

> **为什么需要这章**：IAP 订单状态机**比**微信小程序支付复杂——IAP 必须**先**发凭证到苹果/谷歌验签，再写 DB，期间可能断网、重复通知、跨账号。

```
draft → iap_pending → iap_verifying → paid → fulfilled
              │              │           │
              │              │           ├─► refund_pending → refunded
              │              │           │            ↘ refund_failed
              │              │           └─► partial_refunded
              │              │
              │              ├─► iap_invalid（receipt 验签失败）
              │              └─► iap_replay（重复 receipt，防重放）
              │
              └─► iap_cancelled（用户在苹果/谷歌取消）
              └─► iap_timeout（24h 内未完成验签）
```

**关键**：

- `iap_verifying` 是**必须**有的中间状态（防用户在前端提前跳成功页）
- 验签失败**不**直接关单，写 `iap_invalid` 让人工介入（可能是沙盒 receipt 误传）
- 防重放：每条 receipt 后端**只**处理一次（`@@unique([platform, transactionId])`）
- 退款状态机**完全复用** 00-foundation §7.5 统一退款状态机

### 7.3 海外账号绑定状态

```
unbound → bound → active
              │
              ├─► token_expired → refreshed → active
              │                  ↘ unbound（refresh 失败）
              ├─► user_unbinded（用户主动解绑）→ 软删
              └─► platform_revoked（Facebook 撤销授权）→ unbound
```

**关键**：

- `token_expired`：调平台 API 时 `401` / token 过期
- 自动 refresh 用 `providerRefreshToken`（**必须** KMS 加密）
- `platform_revoked`：用户去 Facebook "应用设置" 撤销 → 回调 webhook（**必须**接）
- `user_unbinded` 后**软删**（`isActive=false` + `unbindedAt`），保留关联信息

---

## 8. 后端 API（APP 特有）

> **核心原则**：**复用 `/api/h5/*`** 是首要原则；本节仅列出**新增**的 APP 特有接口。

### 8.1 设备与推送

| Method | Path                              | 权限   | 说明                                             |
| ------ | --------------------------------- | ------ | ------------------------------------------------ |
| POST   | `/api/h5/devices/register`        | 公开   | 注册设备（首次启动）                             |
| PUT    | `/api/h5/devices/:id`             | 需登录 | 更新设备信息（locale / 钱包地址 / 生物识别状态） |
| POST   | `/api/h5/devices/:id/push-tokens` | 需登录 | 注册 / 更新 push token                           |
| DELETE | `/api/h5/push-tokens/:id`         | 需登录 | 注销 push token（用户登出）                      |
| POST   | `/api/h5/push-tokens/feedback`    | 内部   | APNs/FCM 反馈的失效 token 处理                   |
| POST   | `/api/h5/devices/:id/biometric`   | 需登录 | 启用生物识别登录                                 |
| DELETE | `/api/h5/devices/:id/biometric`   | 需登录 | 关闭生物识别登录                                 |

### 8.2 APP 特有登录

| Method | Path                          | 权限   | 说明                                        |
| ------ | ----------------------------- | ------ | ------------------------------------------- |
| POST   | `/api/h5/auth/apple-login`    | 公开   | Apple ID 登录（identityToken 验签）         |
| POST   | `/api/h5/auth/google-login`   | 公开   | Google 登录（idToken 验签）                 |
| POST   | `/api/h5/auth/facebook-login` | 公开   | Facebook 登录（accessToken 验签）           |
| POST   | `/api/h5/auth/linkedin-login` | 公开   | LinkedIn 登录（authorizationCode 换 token） |
| POST   | `/api/h5/auth/wallet-login`   | 公开   | 钱包签名登录（personalSign 验签）           |
| POST   | `/api/h5/auth/refresh-token`  | 需设备 | 用设备存储的 refreshToken 换新 accessToken  |

### 8.3 IAP 支付

| Method | Path                                  | 权限         | 说明                                   |
| ------ | ------------------------------------- | ------------ | -------------------------------------- |
| POST   | `/api/h5/payments/iap-products`       | 需登录       | 拉商品列表（同步苹果/谷歌）            |
| POST   | `/api/h5/payments/iap-verify`         | 需登录       | 验签 receipt（iOS / Android）          |
| POST   | `/api/h5/payments/iap-webhook`        | Apple/Google | 服务器异步通知（订阅续费 / 退款）      |
| GET    | `/api/h5/payments/iap-orders/:id`     | 需登录       | 查询订单状态                           |
| POST   | `/api/h5/payments/apple-pay-process`  | 需登录       | Apple Pay 支付处理（PKPayment → 通道） |
| POST   | `/api/h5/payments/google-pay-process` | 需登录       | Google Pay 支付处理                    |

### 8.4 海外社交账号绑定管理

| Method | Path                                         | 权限   | 说明                           |
| ------ | -------------------------------------------- | ------ | ------------------------------ |
| GET    | `/api/h5/auth/overseas-bindings`             | 需登录 | 当前用户所有海外账号绑定       |
| POST   | `/api/h5/auth/overseas-bindings/:id/refresh` | 内部   | 刷新 accessToken（定时任务调） |
| DELETE | `/api/h5/auth/overseas-bindings/:id`         | 需登录 | 解绑海外账号                   |
| POST   | `/api/h5/auth/overseas-bindings/:id/primary` | 需登录 | 设为主账号                     |

### 8.5 Web3 钱包

| Method | Path                        | 权限   | 说明                              |
| ------ | --------------------------- | ------ | --------------------------------- |
| GET    | `/api/h5/auth/wallet-nonce` | 公开   | 拉 nonce（5 分钟有效）            |
| POST   | `/api/h5/auth/wallet-login` | 公开   | 钱包签名登录                      |
| POST   | `/api/h5/wallet/bind`       | 需登录 | 绑定钱包地址到当前账号            |
| DELETE | `/api/h5/wallet/unbind`     | 需登录 | 解绑                              |
| POST   | `/api/h5/wallet/sign`       | 需登录 | 链上签名代理（用于 DID 凭证签发） |

### 8.6 WhatsApp 客服

| Method | Path                                 | 权限      | 说明                   |
| ------ | ------------------------------------ | --------- | ---------------------- |
| POST   | `/api/h5/support/whatsapp-session`   | 需登录    | 启动 WhatsApp 客服会话 |
| GET    | `/api/h5/support/whatsapp-templates` | 需登录    | 拉可用模板消息列表     |
| POST   | `/api/h5/support/whatsapp-webhook`   | Meta 回调 | 客户消息回调（内部）   |

### 8.7 归因与统计

| Method | Path                       | 权限 | 说明                               |
| ------ | -------------------------- | ---- | ---------------------------------- |
| POST   | `/api/h5/install/track`    | 公开 | 上报安装来源（appsflyer / adjust） |
| POST   | `/api/h5/install/deeplink` | 公开 | Universal Link / App Link 解析     |

---

## 9. 前端架构

> **为什么需要这章**：RN 项目结构**直接影响**业务拆分、双端兼容、CI/CD、可维护性。本节固定项目目录、导航方案、状态管理、网络层、离线策略——后续业务功能**必须**按此落地。

### 9.1 技术栈

| 类别       | 选型                        | 版本        | 理由                                      |
| ---------- | --------------------------- | ----------- | ----------------------------------------- |
| 框架       | React Native                | 0.74+       | 双端复用；Hermes 引擎性能优于 JSC         |
| 语言       | TypeScript                  | 5.0+        | 类型安全；与后端共享 DTO 类型             |
| 导航       | React Navigation            | 7.x         | 社区标准；支持 deep link 深度集成         |
| 状态       | Zustand                     | 4.x         | 轻量（< 1KB），无 boilerplate；替代 Redux |
| 持久化     | MMKV                        | 1.x         | 同步 KV，**比** AsyncStorage 快 30 倍     |
| 结构化存储 | react-native-sqlite-storage | 6.x         | 离线订单 / 草稿 / 缓存                    |
| 网络       | axios                       | 1.x         | interceptor 机制；与 H5 一致              |
| 表单       | React Hook Form             | 7.x         | 非受控，性能好                            |
| 国际化     | i18next + react-i18next     | 23.x + 14.x | 与 H5/小程序共享翻译文件                  |
| 监控       | Sentry                      | 0.10+       | 跨端错误聚合                              |
| 打包       | Metro + Hermes              | 0.80+       | Hermes 预编译字节码，体积 -30%            |

### 9.2 目录结构

```
src/
├── api/                        # 所有 API 调用（axios instance）
│   ├── client.ts               # axios 实例 + interceptor
│   ├── endpoints/              # 按业务域拆分（auth/orders/...
│   └── types/                  # 与后端共享的 DTO 类型
├── app/                        # 应用入口
│   ├── App.tsx                 # 根组件
│   └── Navigator.tsx           # 根导航器
├── components/                 # 通用 UI 组件
│   ├── StatusBadge/            # 状态徽章（复用 00-foundation §8.3.1 颜色）
│   ├── Button/
│   ├── Form/
│   └── ...
├── screens/                    # 业务页面（按业务域拆分）
│   ├── auth/
│   ├── home/
│   ├── orders/
│   ├── wallet/
│   └── social/                 # §17 海外社交
├── navigation/                 # 导航配置
│   ├── AuthStack.tsx
│   ├── MainTab.tsx
│   └── Linking.ts              # Universal Link / App Link
├── store/                      # Zustand store
│   ├── authStore.ts
│   ├── deviceStore.ts
│   ├── cartStore.ts
│   └── ...
├── services/                   # 系统服务封装
│   ├── push/                   # APNs / FCM / 极光
│   ├── payment/                # IAP / Apple Pay / Google Pay
│   ├── biometric/              # 生物识别
│   ├── social/                 # FB / Google / LinkedIn / WhatsApp / TikTok
│   ├── wallet/                 # WalletConnect / MetaMask
│   └── analytics/              # 埋点
├── hooks/                      # 自定义 hooks
├── i18n/                       # 翻译文件（复用 H5/小程序）
│   ├── en-US/
│   ├── zh-CN/
│   └── ...
├── utils/                      # 工具函数
├── constants/                  # 常量
└── types/                      # 全局类型
```

### 9.3 导航方案

**双层导航**：

- **根导航器**：Stack 模式，根据登录态切换 `AuthStack` ↔ `MainStack`
- **MainStack**：底部 Tab（Home / Market / Orders / Mine）+ 业务 Stack

```typescript
// src/navigation/RootNavigator.tsx
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '@/store/authStore';
import { navigationRef } from './linking';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export const RootNavigator = () => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return (
    <NavigationContainer ref={navigationRef} linking={linkingConfig}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainTab} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthStack} />
        )}
        <RootStack.Screen name="Modal" component={ModalScreen} options={{ presentation: 'modal' }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
```

### 9.4 状态管理（Zustand）

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKVStorage } from '@/utils/mmkv';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  refreshAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      login: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },
      logout: async () => {
        // 1. 注销 push token
        // 2. 清 MMKV
        // 3. 重置 store
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
      refreshAccessToken: (token) => set({ accessToken: token }),
    }),
    { name: 'auth', storage: createJSONStorage(() => MMKVStorage) }
  )
);
```

### 9.5 网络层（axios + retry + offline queue）

```typescript
// src/api/client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { MMKV } from '@/utils/mmkv';

const STORAGE_KEY_ACCESS = 'access_token';
const STORAGE_KEY_REFRESH = 'refresh_token';

export const api = axios.create({
  baseURL: __DEV__ ? 'http://localhost:3000' : 'https://api.samoadao.com',
  timeout: 15000,
});

// 请求拦截：自动加 Authorization
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = MMKV.getString(STORAGE_KEY_ACCESS);
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  config.headers['X-App-Platform'] = Platform.OS; // ios / android
  config.headers['X-App-Version'] = DeviceInfo.getVersion();
  config.headers['X-Device-Id'] = MMKV.getString('device_id');
  return config;
});

// 响应拦截：401 自动 refresh
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (!isRefreshing) {
        isRefreshing = true;
        originalRequest._retry = true;
        try {
          const refreshToken = MMKV.getString(STORAGE_KEY_REFRESH);
          const { data } = await axios.post('/api/h5/auth/refresh-token', { refreshToken });
          MMKV.set(STORAGE_KEY_ACCESS, data.accessToken);
          useAuthStore.getState().refreshAccessToken(data.accessToken);
          isRefreshing = false;
          refreshSubscribers.forEach((cb) => cb(data.accessToken));
          refreshSubscribers = [];
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch (e) {
          isRefreshing = false;
          useAuthStore.getState().logout();
          return Promise.reject(e);
        }
      } else {
        return new Promise((resolve) => {
          refreshSubscribers.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }
    }
    return Promise.reject(error);
  }
);
```

### 9.6 离线策略

| 场景         | 策略                             | 存储                     |
| ------------ | -------------------------------- | ------------------------ |
| 订单草稿     | 离线时写入本地，恢复网络后同步   | SQLite（`draft_orders`） |
| 购物车       | 始终本地（**不**依赖服务端）     | MMKV                     |
| 浏览历史     | 本地 + 登录后同步                | SQLite → 服务端          |
| 钱包交易签名 | 必须在线（链上操作**不能**离线） | —                        |
| 推送历史     | 本地缓存最近 100 条              | SQLite                   |
| 语言包       | 打包内置 + 增量下载              | MMKV + 远程 CDN          |

**冲突解决**：以**服务端为准**，本地数据**只**作为缓存。订单草稿在用户主动提交时才上传。

### 9.7 热更新（CodePush）

- 平台：AppCenter CodePush（微软）
- **限制**：iOS 苹果**禁止**热更新可执行代码，但**允许**更新 JS / 资源
- **禁止**热更新：登录页、支付页、合规文案、隐私政策
- 灰度策略：内部 → 1% → 10% → 50% → 100%（按 deviceId hash 分桶）

```bash
appcenter codepush release-react -a SamoaDAO/SamoaApp-iOS -d Production --target-binary-version 1.0.0 -r 1.0
```

---

## 10. UI 组件

> **为什么需要这章**：APP **必须**与 H5/小程序保持视觉一致（品牌、状态色、间距、字体），但**原生能力**（Platform.select）必须保留。本节规定通用组件的设计与跨端差异。

### 10.1 状态徽章（StatusBadge）

**完全复用** 00-foundation §8.3.1 状态色：

| 业务状态               | 颜色 | hex     | 文案（i18n key）    |
| ---------------------- | ---- | ------- | ------------------- |
| 成功 / 已完成 / 已支付 | 绿色 | #52C41A | `status.success`    |
| 进行中 / 处理中        | 蓝色 | #1890FF | `status.processing` |
| 警告 / 待处理          | 橙色 | #FAAD14 | `status.warning`    |
| 失败 / 已取消 / 退款   | 红色 | #FF4D4F | `status.error`      |
| 中性 / 默认            | 灰色 | #8C8C8C | `status.default`    |

```typescript
// src/components/StatusBadge/StatusBadge.tsx
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

type StatusKey = 'success' | 'processing' | 'warning' | 'error' | 'default';

const COLORS: Record<StatusKey, { bg: string; text: string }> = {
  success:   { bg: '#E6F7E6', text: '#52C41A' },
  processing:{ bg: '#E6F4FF', text: '#1890FF' },
  warning:   { bg: '#FFF7E6', text: '#FAAD14' },
  error:     { bg: '#FFE6E6', text: '#FF4D4F' },
  default:   { bg: '#F5F5F5', text: '#8C8C8C' },
};

export const StatusBadge: React.FC<{ status: StatusKey; label?: string }> = ({ status, label }) => {
  const { t } = useTranslation();
  const c = COLORS[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, Platform.select({ ios: styles.ios, android: styles.android })]}>
      <Text style={[styles.text, { color: c.text }]}>{label ?? t(`status.${status}`)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  ios:   { fontVariant: ['tabular-nums'] } as any,
  android: { elevation: 0 },
  text:  { fontSize: 12, fontWeight: '500' },
});
```

### 10.2 跨端差异（Platform.select）

| 行为          | iOS                                    | Android                              |
| ------------- | -------------------------------------- | ------------------------------------ |
| 顶部状态栏    | SafeAreaView only                      | StatusBar + SafeAreaView             |
| 底部 Tab 高度 | 49pt + safe area                       | 56dp                                 |
| 字体          | San Francisco（系统）                  | Roboto（系统）                       |
| 按下反馈      | opacity 0.6                            | ripple（Pressable `android_ripple`） |
| 键盘          | `keyboardAppearance="dark"` 默认深色   | 系统默认                             |
| 滚动条        | `showsVerticalScrollIndicator={false}` | 始终显示                             |
| 分享          | UIActivityViewController               | Intent.ACTION_SEND                   |
| 支付          | StoreKit (IAP) / PassKit (Apple Pay)   | BillingClient (IAP) / Google Pay API |

```typescript
// 跨端统一按钮
import { Pressable, Platform } from 'react-native';

<Pressable
  onPress={onPress}
  android_ripple={{ color: '#0001' }}
  style={({ pressed }) => [styles.btn, pressed && Platform.select({ ios: { opacity: 0.6 }, android: {} })]}
>
  <Text>{title}</Text>
</Pressable>
```

### 10.3 设计 Token

```typescript
// src/constants/design.ts
export const DESIGN_TOKENS = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 4, md: 8, lg: 12, xl: 16 },
  fontSize: { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24 },
  fontWeight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
  color: {
    primary: '#1890FF',
    success: '#52C41A',
    warning: '#FAAD14',
    error: '#FF4D4F',
    text: '#000000D9',
    textSecondary: '#00000073',
    border: '#D9D9D9',
    bg: '#F5F5F5',
  },
} as const;
```

---

## 11. iOS 配置

> **为什么需要这章**：iOS 上架审核**最严**——Info.plist、Capabilities、Provisioning Profile、签名、Privacy Manifest 任何一个错就拒。本节列出**必须**配置项。

### 11.1 Info.plist 关键项

```xml
<dict>
  <!-- 应用名（海外显示英文） -->
  <key>CFBundleDisplayName</key>
  <string>SamoaDAO</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>

  <!-- 国际化（与 00-foundation §5.5.1 一致） -->
  <key>CFBundleLocalizations</key>
  <array>
    <string>en</string><string>zh-Hans</string><string>ja</string>
    <string>ko</string><string>es</string><string>de</string>
    <string>fr</string><string>ru</string><string>ar</string>
  </array>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>

  <!-- 隐私用途描述（**必须**逐项写清） -->
  <key>NSCameraUsageDescription</key>
  <string>用于拍摄身份证 / 商品照片 / KYC 认证</string>
  <key>NSPhotoLibraryUsageDescription</key>
  <string>用于选择商品图片 / 上传凭证</string>
  <key>NSPhotoLibraryAddUsageDescription</key>
  <string>用于保存订单截图 / 分享图</string>
  <key>NSMicrophoneUsageDescription</key>
  <string>用于视频客服通话</string>
  <key>NSLocationWhenInUseUsageDescription</key>
  <string>用于附近门店推荐 / 本地化商品</string>
  <key>NSFaceIDUsageDescription</key>
  <string>用于快速登录与支付确认</string>
  <key>NSContactsUsageDescription</key>
  <string>用于邀请好友 / 通讯录匹配</string>
  <key>NSUserTrackingUsageDescription</key>
  <string>用于提供更精准的商品推荐与广告归因（您可随时在设置中关闭）</string>
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
      <key>localhost</key>
      <dict>
        <key>NSExceptionAllowsInsecureHTTPLoads</key>
        <true/>
      </dict>
    </dict>
  </dict>

  <!-- URL Scheme（用于 Universal Link 回调） -->
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key>
      <string>com.samoadao.app</string>
      <key>CFBundleURLSchemes</key>
      <array><string>samoadao</string></array>
    </dict>
  </array>
</dict>
```

### 11.2 Capabilities

| Capability         | 说明                    | 必要性         |
| ------------------ | ----------------------- | -------------- |
| Push Notifications | APNs（推送）            | **必**         |
| Sign in with Apple | Apple ID 登录           | **必**（海外） |
| Apple Pay          | Apple Pay 支付          | **必**         |
| In-App Purchase    | IAP 内购                | **必**         |
| Associated Domains | Universal Link          | **必**         |
| Keychain Sharing   | 多 APP Keychain 共享    | 可选           |
| App Groups         | Widget / Extension 共享 | 可选           |
| Background Modes   | 远程推送 / 后台下载     | 可选           |

### 11.3 Universal Link 配置

**`apple-app-site-association`** 部署在 `https://samoadao.com/.well-known/`：

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appIDs": ["ABCDE12345.com.samoadao.app"],
        "components": [
          { "/": "/order/*", "comment": "订单详情" },
          { "/": "/product/*", "comment": "商品详情" },
          { "/": "/promo/*", "comment": "活动页" },
          { "/": "/wallet/*", "comment": "钱包" }
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": ["ABCDE12345.com.samoadao.app"]
  }
}
```

### 11.4 Provisioning Profile & 签名

- **开发**：Ad Hoc + Development certificate（内部测试 100 台设备上限）
- **生产**：App Store + Distribution certificate
- **多 Bundle ID**：com.samoadao.app（生产）、com.samoadao.app.staging（staging）、com.samoadao.app.dev（dev）
- **Capabilities 同步**：每个 Provisioning Profile **必须**勾选所有使用的 Capability

### 11.5 Privacy Manifest（iOS 17+ 必填）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key>
  <true/>
  <key>NSPrivacyTrackingDomains</key>
  <array>
    <string>graph.facebook.com</string>
    <string>www.facebook.com</string>
    <string>connect.facebook.net</string>
    <string>analytics.google.com</string>
    <string>www.googletagmanager.com</string>
  </array>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeUserID</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <true/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array><string>NSPrivacyCollectedDataTypePurposeAnalytics</string></array>
    </dict>
  </array>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>CA92.1</string></array>
    </dict>
  </array>
</dict>
</plist>
```

### 11.6 常见审核被拒场景

| 问题                  | 原因                      | 解决                       |
| --------------------- | ------------------------- | -------------------------- |
| 5.1.1 隐私 - 数据收集 | 缺 Privacy Manifest       | 补 `PrivacyInfo.xcprivacy` |
| 4.0 设计 - 抄袭       | 与某 APP 高度相似         | 重做 UI                    |
| 2.1 性能 - APP 完整性 | 登录崩溃 / 支付失败       | 修复 + 录屏                |
| 1.4.1 安全 - 人身伤害 | 不当内容                  | 删除 / 改文案              |
| 3.1.1 付款 - IAP 绕过 | 提供支付宝 / 微信绕过 IAP | 走 IAP                     |

---

## 12. Android 配置

> **为什么需要这章**：Android 碎片化严重——AndroidManifest 权限、Gradle 配置、ProGuard、多渠道包、签名、64 位**全部**要管。

### 12.1 AndroidManifest.xml 关键项

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
          xmlns:tools="http://schemas.android.com/tools"
          package="com.samoadao.app">

  <!-- 权限：分国内 / 海外两套（与 §13 推送配合） -->
  <!-- 基础 -->
  <uses-permission android:name="android.permission.INTERNET"/>
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
  <uses-permission android:name="android.permission.WAKE_LOCK"/>
  <uses-permission android:name="android.permission.VIBRATE"/>

  <!-- 推送 -->
  <uses-permission android:name="com.google.android.c2dm.permission.RECEIVE"/> <!-- FCM -->
  <uses-permission android:name="com.huawei.android.launcher.permission.CHANGE_BADGE"/>
  <uses-permission android:name="com.xiaomi.permission.AD_ID"/>
  <!-- 极光自动合并其他厂商 -->

  <!-- 相机 / 存储 / 定位 -->
  <uses-permission android:name="android.permission.CAMERA"/>
  <uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>  <!-- API 33+ -->
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
  <uses-permission android:name="android.permission.USE_BIOMETRIC"/>
  <uses-permission android:name="android.permission.USE_FINGERPRINT"/>

  <!-- 应用链接（App Link） -->
  <uses-permission android:name="android.permission.READ_CONTACTS"/>

  <application
    android:name=".MainApplication"
    android:label="@string/app_name"
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:theme="@style/AppTheme"
    android:allowBackup="false"
    android:fullBackupContent="false"
    android:dataExtractionRules="@xml/data_extraction_rules"
    android:usesCleartextTraffic="false"
    android:networkSecurityConfig="@xml/network_security_config">

    <!-- Universal Link / App Link -->
    <intent-filter android:autoVerify="true">
      <action android:name="android.intent.action.VIEW"/>
      <category android:name="android.intent.category.DEFAULT"/>
      <category android:name="android.intent.category.BROWSABLE"/>
      <data android:scheme="https"/>
      <data android:host="samoadao.com"/>
    </intent-filter>

    <!-- URL Scheme 回调 -->
    <intent-filter>
      <action android:name="android.intent.action.VIEW"/>
      <category android:name="android.intent.category.DEFAULT"/>
      <category android:name="android.intent.category.BROWSABLE"/>
      <data android:scheme="samoadao"/>
    </intent-filter>

    <!-- 推送 receiver（极光/厂商） -->
    <receiver
      android:name="com.samoadao.push.PushReceiver"
      android:exported="false">
      <intent-filter>
        <action android:name="com.samoadao.PUSH_RECEIVED"/>
      </intent-filter>
    </receiver>
  </application>
</manifest>
```

### 12.2 Gradle 配置

```groovy
// android/app/build.gradle
android {
    compileSdkVersion 34
    buildToolsVersion "34.0.0"
    ndkVersion "26.1.10909125"

    defaultConfig {
        applicationId "com.samoadao.app"
        minSdkVersion 24                  // Android 7.0
        targetSdkVersion 34               // Android 14
        versionCode 100                  // 内部版本号
        versionName "1.0.0"
        // 多 ABI：armeabi-v7a(32位) / arm64-v8a(64位) / x86 / x86_64
        ndk {
            abiFilters "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
        }
        // 谷歌要求 64 位（2019.8 起）
    }

    buildTypes {
        debug {
            applicationIdSuffix ".debug"
            signingConfig signingConfigs.debug
        }
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }

    // 多渠道
    flavorDimensions "channel"
    productFlavors {
        google { dimension "channel"; manifestPlaceholders = [appName: "SamoaDAO"] }
        huawei { dimension "channel"; manifestPlaceholders = [appName: "SamoaDAO HW"] }
        xiaomi { dimension "channel"; manifestPlaceholders = [appName: "SamoaDAO MI"] }
        oppo   { dimension "channel"; manifestPlaceholders = [appName: "SamoaDAO OPPO"] }
        vivo   { dimension "channel"; manifestPlaceholders = [appName: "SamoaDAO VIVO"] }
    }
}
```

### 12.3 ProGuard / R8 规则

```pro
# android/app/proguard-rules.pro

# React Native
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# 推送（极光/华为/小米...）
-keep class cn.jpush.** { *; }
-keep class com.huawei.hms.** { *; }
-keep class com.xiaomi.push.** { *; }
-keep class com.vivo.push.** { *; }
-keep class com.heytap.msp.** { *; }
-keep class com.meizu.cloud.pushsdk.** { *; }

# 生物识别
-keep class androidx.biometric.** { *; }

# 钱包
-keep class com.walletconnect.** { *; }
-keep class com.metamask.** { *; }

# 微信
-keep class com.tencent.mm.** { *; }
```

### 12.4 签名

- **上传签名**：用 Google Play App Signing（推荐），上传 AAB 时给一个 upload key，**真正**签名 key 由 Google 管理
- **多渠道签名**：每个 channel **可以**用不同签名（用于多市场发布）
- **签名密码**：用 `~/.gradle/gradle.properties` 加密存储，**不**入库

### 12.5 国内安卓多渠道包

| 渠道   | 包名                             | 签名        | 上架          |
| ------ | -------------------------------- | ----------- | ------------- |
| 华为   | com.huawei.appgallery            | 华为签名    | 华为应用市场  |
| 小米   | com.xiaomi.market                | 小米签名    | 小米应用商店  |
| OPPO   | com.oppo.market                  | OPPO 签名   | OPPO 软件商店 |
| VIVO   | com.vivo.appstore                | VIVO 签名   | VIVO 应用商店 |
| 应用宝 | com.tencent.android.qqdownloader | 通用        | 腾讯应用宝    |
| Google | com.android.vending              | Google 签名 | Google Play   |

**国内 APK 必须**有 ICP 备案 + 网络文化经营许可证 + ICP 证

---

## 13. 推送集成

> **为什么需要这章**：海外 / 国内推送通道**完全不同**——海外用 APNs（iOS）+ FCM（Android）；国内安卓不能直接用 GMS，必须走**厂商通道**+ 极光统一接入。本节固定多通道接入方案。

### 13.1 通道选型

| 平台         | 通道           | SDK                                             | 适用                        |
| ------------ | -------------- | ----------------------------------------------- | --------------------------- |
| iOS          | APNs           | `@react-native-community/push-notification-ios` | 全球（**不**区分国内/海外） |
| Android 海外 | FCM            | `@react-native-firebase/messaging`              | 海外（已装 GMS）            |
| Android 国内 | 极光 JPush     | `jpush-react-native`                            | 国内（多厂商统一）          |
| Android 厂商 | 华为 HMS Push  | `jpush` 集成                                    | 国内华为                    |
| Android 厂商 | 小米 Mi Push   | `jpush` 集成                                    | 国内小米                    |
| Android 厂商 | OPPO Push      | `jpush` 集成                                    | 国内 OPPO                   |
| Android 厂商 | VIVO Push      | `jpush` 集成                                    | 国内 VIVO                   |
| Android 厂商 | 魅族 FlymePush | `jpush` 集成                                    | 国内魅族                    |

**极光 Push 同时下发到所有厂商**，APP 集成 `jpush-react-native` 后自动走最优通道。

### 13.2 iOS APNs 集成

```typescript
// src/services/push/ios.ts
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform, PermissionsAndroid } from 'react-native';
import { api } from '@/api/client';
import { MMKV } from '@/utils/mmkv';

export const initIOSPush = async (deviceId: string) => {
  // 1. 请求权限
  await PushNotificationIOS.requestPermissions({
    alert: true,
    badge: true,
    sound: true,
    critical: false,
  });

  // 2. 监听 token 注册
  PushNotificationIOS.addEventListener('register', async (token) => {
    // token 是 hex 字符串，APNs server 要 base64
    await api.post(`/api/h5/devices/${deviceId}/push-tokens`, {
      channel: 'apns',
      token: token,
      appId: 'main',
    });
  });

  // 3. 监听 token 失效（APNs Unregistered 回调）
  PushNotificationIOS.addEventListener('registrationError', (err) => {
    console.warn('[Push iOS] registration error', err);
  });

  // 4. 监听通知点击
  PushNotificationIOS.addEventListener('localNotification', (notification) => {
    // 处理 deep link
    handleNotificationTap(notification.userInfo);
  });

  // 5. 拿当前 token
  const initialToken = await PushNotificationIOS.getInitialNotificationToken();
  if (initialToken) {
    await api.post(`/api/h5/devices/${deviceId}/push-tokens`, {
      channel: 'apns',
      token: initialToken,
    });
  }
};
```

### 13.3 Android FCM 集成（海外）

```typescript
// src/services/push/android-fcm.ts
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { api } from '@/api/client';

export const initAndroidFCM = async (deviceId: string) => {
  // 1. 请求权限（Android 13+ 必须）
  await messaging().requestPermission();

  // 2. 拿 FCM token
  const fcmToken = await messaging().getToken();
  if (fcmToken) {
    await api.post(`/api/h5/devices/${deviceId}/push-tokens`, {
      channel: 'fcm',
      token: fcmToken,
    });
  }

  // 3. 监听 token 轮转
  messaging().onTokenRefresh(async (newToken) => {
    await api.post(`/api/h5/devices/${deviceId}/push-tokens`, { channel: 'fcm', token: newToken });
  });

  // 4. 前台消息
  messaging().onMessage(async (remoteMessage) => {
    console.log('[FCM] foreground message', remoteMessage);
    // 显示本地通知
  });

  // 5. 后台消息（必须在 index.js 注册 setBackgroundMessageHandler）
  // 见 AppDelegate / MainApplication
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[FCM] background message', remoteMessage);
  });
};
```

### 13.4 Android 极光 Push 集成（国内）

```typescript
// src/services/push/android-jpush.ts
import JPush from 'jpush-react-native';
import { Platform, NativeModules } from 'react-native';
import { api } from '@/api/client';

export const initAndroidJPush = async (deviceId: string) => {
  // 1. 初始化
  JPush.init({
    appKey: 'YOUR_JPUSH_APPKEY',
    channel: 'developer-default',
    production: true, // 生产环境
  });

  // 2. 拿 registrationId
  const { registerID } = await new Promise<{ registerID: string }>((resolve) => {
    const listener = (event: any) => {
      NativeModules.JPush.removeListener('onGetRegistrationId', listener);
      resolve(event);
    };
    JPush.addListener('onGetRegistrationId', listener);
    setTimeout(() => resolve({ registerID: '' }), 5000);
  });

  if (registerID) {
    await api.post(`/api/h5/devices/${deviceId}/push-tokens`, {
      channel: 'jpush',
      token: registerID,
    });
  }

  // 3. 设置别名（用 userId）
  JPush.setAlias({ alias: `user_${userId}`, sequence: 1 });

  // 4. 监听通知到达
  JPush.addListener('onNotifyMessageArrived', (event) => {
    console.log('[JPush] message arrived', event);
  });

  // 5. 监听通知点击
  JPush.addListener('onOpenNotification', (event) => {
    handleNotificationTap(event.notificationEvent?.extras);
  });
};
```

### 13.5 推送路由

后端按 device.region 决定通道：

- `region ∈ {CN, HK, MO, TW}` → JPush（iOS 仍用 APNs）
- 其他 → FCM（Android）/ APNs（iOS）

```typescript
// 后端推送服务伪代码
async sendPush(userId: string, payload: PushPayload) {
  const tokens = await db.pushToken.findMany({
    where: { device: { userId, isActive: true }, isActive: true },
    include: { device: true },
  });
  for (const t of tokens) {
    if (t.channel === 'apns') apnsProvider.send(t.token, payload);
    else if (t.channel === 'fcm') fcmProvider.send(t.token, payload);
    else if (['jpush','huawei','xiaomi','oppo','vivo','meizu'].includes(t.channel)) jpushProvider.send(t.token, payload);
  }
}
```

### 13.6 推送主题订阅

```typescript
// 订阅 / 退订
await api.post('/api/h5/push-tokens/subscribe', {
  topics: ['dlc_upgrade', 'payment', 'marketing'],
});
await api.post('/api/h5/push-tokens/unsubscribe', { topics: ['marketing'] });
```

**默认主题**（必订）：`system`、`payment`、`security`
**可选主题**（用户自选）：`marketing`、`dlc_upgrade`、`order_status`、`social_message`

---

## 14. 支付集成

> **为什么需要这章**：APP 支付**不**能用小程序 / H5 那套——苹果强制 IAP（数字商品）、安卓 IAP 同样适用、各国法规**完全**不同。本节固定多支付通道方案。

### 14.1 支付通道选型

| 支付方式       | 通道                   | 适用                                 | 手续费                |
| -------------- | ---------------------- | ------------------------------------ | --------------------- |
| Apple Pay      | PassKit                | 全球 iOS（**不**限商品类型）         | 0%                    |
| Google Pay     | Google Pay API         | 全球 Android                         | 0%                    |
| IAP（iOS）     | StoreKit 2             | iOS 数字商品 / 订阅                  | 30% / 15%（小开发者） |
| IAP（Android） | Google Play Billing v6 | Android 数字商品                     | 30% / 15%             |
| 微信 H5        | 微信 H5 支付           | 国内安卓（用户**没**装微信时的回退） | 1%                    |
| 支付宝 H5      | 支付宝 WAP 支付        | 国内安卓                             | 1%                    |
| Web3 钱包      | WalletConnect v2       | 全球加密货币                         | gas fee               |

**关键规则**（苹果）：

- 数字内容（会员 / 课程 / 虚拟商品 / 数字订阅）→ **必须** IAP
- 实体商品 / 服务（出海仓实物 / 物流服务）→ 可用 Apple Pay
- **禁止**用第三方支付绕过 IAP

### 14.2 Apple Pay

```typescript
// src/services/payment/apple-pay.ts
import PassKit from 'react-native-passkit';
import { Platform } from 'react-native';
import { api } from '@/api/client';

export const isApplePayAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;
  return await PassKit.canMakePayments(['visa', 'mastercard', 'amex']);
};

export const payWithApplePay = async (order: Order) => {
  const paymentRequest = {
    merchantIdentifier: 'merchant.com.samoadao.app',
    supportedNetworks: ['visa', 'mastercard', 'amex'],
    merchantCapabilities: ['threeDSecure'],
    countryCode: 'WS', // 萨摩亚
    currencyCode: order.currency, // USD / CNY
    paymentItems: [
      {
        label: order.productName,
        amount: order.amount.toFixed(2),
      },
    ],
  };

  const payment = await PassKit.presentPaymentSheet(paymentRequest);
  // payment.paymentData 是加密的 token，发到后端
  const { data } = await api.post('/api/h5/payments/apple-pay-process', {
    orderId: order.id,
    paymentToken: payment.paymentData,
  });
  return data;
};
```

### 14.3 Google Pay

```typescript
// src/services/payment/google-pay.ts
import { GooglePay, Environment } from 'react-native-google-pay';
import { Platform } from 'react-native';

export const initGooglePay = async () => {
  await GooglePay.setEnvironment(Environment.PRODUCTION);
  const { isReady } = await GooglePay.isReadyToPay({
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: [
      {
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
        },
      },
    ],
  });
  return isReady;
};

export const payWithGooglePay = async (order: Order) => {
  const token = await GooglePay.requestPayment({
    apiVersion: 2,
    apiVersionMinor: 0,
    paymentMethodTokenizationParameters: {
      tokenizationType: 'PAYMENT_GATEWAY',
      parameters: {
        gateway: 'stripe', // 或 adyen / braintree
        'stripe:publishableKey': 'pk_live_xxx',
        'stripe:version': '2020-08-27',
      },
    },
    transactionInfo: {
      totalPriceStatus: 'FINAL',
      totalPrice: order.amount.toFixed(2),
      currencyCode: order.currency,
      countryCode: 'WS',
    },
    merchantInfo: {
      merchantName: 'SamoaDAO',
      merchantId: 'BCR2DN6TWR5V4Y4K',
    },
  });
  const { data } = await api.post('/api/h5/payments/google-pay-process', {
    orderId: order.id,
    paymentToken: token.paymentMethodToken,
  });
  return data;
};
```

### 14.4 iOS IAP（StoreKit 2）

```typescript
// src/services/payment/ios-iap.ts
import { Platform } from 'react-native';
import RNIap, { Product, Purchase, PurchaseError } from 'react-native-iap';
import { api } from '@/api/client';

const PRODUCT_IDS = ['com.samoadao.membership.monthly', 'com.samoadao.coins.100'];

export const initIOSIap = async () => {
  if (Platform.OS !== 'ios') return;
  await RNIap.initConnection();
  await RNIap.clearTransactionIOS(); // 清未完成交易
};

export const getIOSProducts = async (): Promise<Product[]> => {
  return await RNIap.getProducts(PRODUCT_IDS);
};

export const purchaseIOS = async (productId: string) => {
  try {
    const purchase: Purchase = await RNIap.requestPurchase({ sku: productId });
    // 立刻发到后端验签（**不**在客户端验签）
    const { data } = await api.post('/api/h5/payments/iap-verify', {
      platform: 'ios',
      productId,
      transactionId: purchase.transactionId,
      receipt: purchase.transactionReceipt, // base64
    });
    await RNIap.finishTransactionIOS(purchase.transactionId);
    return data;
  } catch (err) {
    if (err instanceof PurchaseError) {
      if (err.code === 'E_USER_CANCELLED') return { cancelled: true };
      throw err;
    }
  }
};

// 监听 App Store 推送的更新（订阅续费 / 退款）
RNIap.purchaseUpdatedListener(async (purchase) => {
  await api.post('/api/h5/payments/iap-webhook', { platform: 'ios', purchase });
  await RNIap.finishTransactionIOS(purchase.transactionId);
});
```

### 14.5 Android IAP（Google Play Billing v6）

```typescript
// src/services/payment/android-iap.ts
import RNIap, { Product, ProductPurchase } from 'react-native-iap';
import { api } from '@/api/client';

const PRODUCT_IDS = ['com.samoadao.membership.monthly', 'com.samoadao.coins.100'];

export const initAndroidIap = async () => {
  await RNIap.initConnection();
};

export const getAndroidProducts = async (): Promise<Product[]> => {
  return await RNIap.getProducts(PRODUCT_IDS);
};

export const purchaseAndroid = async (productId: string) => {
  try {
    const purchase: ProductPurchase = await RNIap.requestPurchase({
      skus: [productId],
      obfuscatedAccountId: userId, // 防滥用
      obfuscatedProfileId: deviceId,
    });
    // 必须立即 ack，否则 3 天后自动退款
    await RNIap.acknowledgePurchaseAndroid(purchase.purchaseToken);
    const { data } = await api.post('/api/h5/payments/iap-verify', {
      platform: 'android',
      productId,
      purchaseToken: purchase.purchaseToken,
    });
    await RNIap.finishTransaction(purchase);
    return data;
  } catch (err) {
    if (err.code === 'E_USER_CANCELLED') return { cancelled: true };
    throw err;
  }
};
```

### 14.6 微信 H5 / 支付宝 H5（国内安卓）

```typescript
// src/services/payment/webview-h5.ts
import { Linking } from 'react-native';
import WebView from 'react-native-webview';

export const payWithWechatH5 = async (order: Order) => {
  // 1. 拉微信 H5 支付 URL
  const { data } = await api.post('/api/h5/payments/wechat-h5', { orderId: order.id });
  // data.mwebUrl
  // 2. 在 WebView 中打开
  return new Promise((resolve, reject) => {
    const ref = useRef<WebView>(null);
    const onShouldStart = (req: any) => {
      if (req.url.startsWith('samoadao://payment/')) {
        const code = new URL(req.url).searchParams.get('code');
        if (code === '0') resolve({ success: true });
        else reject(new Error('PAY_FAILED'));
        return false;
      }
      return true;
    };
    return <WebView ref={ref} source={{ uri: data.mwebUrl }} onShouldStartLoadWithRequest={onShouldStart} />;
  });
};
```

### 14.7 退款（复用 00-foundation §7.5）

**完全复用** 00-foundation §7.5 统一退款状态机。IAP 退款通过 `iap-webhook` 接收苹果/谷歌通知，状态变更统一写入订单表。

---

## 15. Web3 钱包集成

> **为什么需要这章**：Web3 用户是 Samoa DAO 的**核心用户**——DID 凭证签发、NFT 会员、链上订单结算都需钱包签名。RN 上 Web3 有**特殊性**：钱包是**独立 APP**（MetaMask / Trust / Rainbow），**不**像 H5 那样有内置 `window.ethereum`。

### 15.1 钱包选型

| 钱包             | 库                                   | 适用                 |
| ---------------- | ------------------------------------ | -------------------- |
| MetaMask         | `@metamask/sdk`                      | 全球最广             |
| WalletConnect v2 | `@walletconnect/react-native-compat` | 通用，连接 300+ 钱包 |
| Trust Wallet     | WalletConnect                        | 海外                 |
| Rainbow          | WalletConnect                        | 海外                 |
| Coinbase Wallet  | WalletConnect                        | 海外                 |
| imToken          | WalletConnect                        | 国内                 |
| TokenPocket      | WalletConnect                        | 国内                 |

**首选方案**：**WalletConnect v2**（覆盖 95% 钱包）；MetaMask 用专用 SDK 增强 Deep Link 体验。

### 15.2 WalletConnect v2 集成

```typescript
// src/services/wallet/walletconnect.ts
import { Core } from '@walletconnect/core';
import { Web3Wallet, IWeb3Wallet } from '@walletconnect/web3wallet';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { Linking, Platform } from 'react-native';

const PROJECT_ID = 'YOUR_WC_PROJECT_ID'; // cloud.walletconnect.com 申请

let web3wallet: IWeb3Wallet | null = null;

export const initWalletConnect = async () => {
  const core = new Core({ projectId: PROJECT_ID });
  web3wallet = await Web3Wallet.init({
    core,
    metadata: {
      name: 'SamoaDAO',
      description: '萨摩亚合规出海一站式平台',
      url: 'https://samoadao.com',
      icons: ['https://samoadao.com/icon-512.png'],
      redirect: { native: 'samoadao://', universal: 'https://samoadao.com' },
    },
  });
  // 监听 session 提议
  web3wallet.on('session_proposal', async (proposal) => {
    const approvedNamespaces = buildApprovedNamespaces({
      proposal: proposal.params,
      supportedNamespaces: {
        eip155: {
          chains: ['eip155:1', 'eip155:137', 'eip155:42161', 'eip155:56'],
          methods: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData_v4'],
          events: ['chainChanged', 'accountsChanged'],
          accounts: [], // 实际账号来自用户选择的 wallet
        },
      },
    });
    await web3wallet.approveSession({ id: proposal.id, namespaces: approvedNamespaces });
  });
  return web3wallet;
};

export const connectWallet = async (uri: string) => {
  if (!web3wallet) await initWalletConnect();
  await web3wallet!.pair({ uri });
};
```

### 15.3 钱包连接（Deep Link）

```typescript
// 用户点击"连接钱包"按钮
import { Linking } from 'react-native';

export const onConnectWallet = async () => {
  // 1. 拿后端 nonce
  const {
    data: { nonce, message },
  } = await api.get('/api/h5/auth/wallet-nonce');
  // 2. 拼 WalletConnect URI
  const uri = await web3wallet.core.pairing.create({});
  // 3. 拉起钱包（按钱包排序：MetaMask > imToken > WalletConnect 二维码）
  const metamaskUrl = `metamask://wc?uri=${encodeURIComponent(uri)}`;
  await Linking.openURL(metamaskUrl);
  // 4. 等待 session_proposal 事件
  // 5. 签名 nonce 验签
  // 6. 调 wallet-login API
};
```

### 15.4 链上签名（personalSign）

```typescript
// 签名登录
export const signLoginMessage = async (address: string, message: string) => {
  const session = web3wallet!.getActiveSessions()[0];
  if (!session) throw new Error('NO_ACTIVE_SESSION');
  const result = await web3wallet!.request({
    topic: session.topic,
    chainId: 'eip155:1',
    request: { method: 'personal_sign', params: [message, address] },
  });
  return result as string; // 0x...
};
```

### 15.5 DID 凭证签发

```typescript
// 签发链上 DID 凭证（如 KYC 完成证明）
export const issueDIDCredential = async (vcData: {
  subject: string;
  type: string;
  claims: any;
}) => {
  const session = web3wallet!.getActiveSessions()[0];
  // 1. 构造 EIP-712 typed data
  const typedData = {
    domain: { name: 'SamoaDAO', version: '1', chainId: 1, verifyingContract: '0x...' },
    types: {
      Credential: [
        { name: 'subject', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'claims', type: 'string' },
        { name: 'issuedAt', type: 'uint256' },
      ],
    },
    primaryType: 'Credential',
    message: { ...vcData, issuedAt: Math.floor(Date.now() / 1000) },
  };
  // 2. 用户签名（**必须**用户主动确认）
  const signature = await web3wallet!.request({
    topic: session.topic,
    chainId: 'eip155:1',
    request: {
      method: 'eth_signTypedData_v4',
      params: [session.namespaces.eip155.accounts[0].split(':')[2], JSON.stringify(typedData)],
    },
  });
  // 3. 上链（通过后端代理）
  return await api.post('/api/h5/wallet/sign', { typedData, signature });
};
```

### 15.6 链 ID 与多链支持

| 链        | chainId | 用途               |
| --------- | ------- | ------------------ |
| Ethereum  | 1       | DID / NFT          |
| Polygon   | 137     | NFT 会员（低 gas） |
| Arbitrum  | 42161   | 结算               |
| BNB Chain | 56      | 出海仓结算         |
| Solana    | ...     | Solana NFT（v2）   |

---

## 16. 生物识别

> **为什么需要这章**：生物识别**不**是"生物识别登录"——它是"用指纹 / Face ID 快速解锁已存储的 refreshToken"。**不是**密码替代品。

### 16.1 双层安全模型

```
┌─────────────────────────────────────────┐
│           生物识别 = 钥匙                 │
│  ┌──────────────┐   ┌──────────────┐    │
│  │ Touch / Face │ → │ Secure       │    │
│  │ ID / 指 纹   │   │ Enclave /    │    │
│  └──────────────┘   │ StrongBox    │    │
│                     └──────┬───────┘    │
│                            │ 私钥（**不**出硬件）│
│                            ▼             │
│                     ┌──────────────┐    │
│                     │ 解密存储的   │    │
│                     │ refreshToken │    │
│                     └──────┬───────┘    │
│                            ▼             │
│                     ┌──────────────┐    │
│                     │ 调 /refresh  │    │
│                     │ 拿 access    │    │
│                     └──────────────┘    │
└─────────────────────────────────────────┘
```

### 16.2 iOS LAContext

```typescript
// src/services/biometric/ios.ts
import LAContext from 'react-native-la-context';
import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.samoadao.app.refreshToken';

export const enableIOSBiometric = async (userId: string, refreshToken: string) => {
  // 1. 检查可用
  const laContext = new LAContext();
  const canEvaluate = await laContext.canEvaluatePolicy('deviceOwnerAuthenticationWithBiometrics');
  if (!canEvaluate) throw new Error('BIOMETRIC_NOT_AVAILABLE');
  // 2. 弹出生物识别
  await laContext.evaluatePolicy({
    policy: 'deviceOwnerAuthenticationWithBiometrics',
    reason: '启用 Face ID / Touch ID 快速登录',
    fallback: { title: '使用密码' },
  });
  // 3. 存储到 Keychain（与生物识别绑定）
  await Keychain.setGenericPassword(userId, refreshToken, {
    service: SERVICE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
};

export const unlockWithIOSBiometric = async (): Promise<{
  userId: string;
  refreshToken: string;
}> => {
  const credentials = await Keychain.getGenericPassword({
    service: SERVICE,
    authenticationPrompt: { title: '使用 Face ID 登录 SamoaDAO' },
  });
  if (!credentials) throw new Error('NO_BIOMETRIC_BINDING');
  return { userId: credentials.username, refreshToken: credentials.password };
};
```

### 16.3 Android BiometricPrompt

```typescript
// src/services/biometric/android.ts
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import EncryptedStorage from 'react-native-encrypted-storage';

const rnb = new ReactNativeBiometrics({ allowDeviceCredentials: true });
const STORAGE_KEY = 'samoadao_refresh_token';

export const enableAndroidBiometric = async (userId: string, refreshToken: string) => {
  // 1. 检查传感器
  const { available, biometryType } = await rnb.isSensorAvailable();
  if (!available) throw new Error('BIOMETRIC_NOT_AVAILABLE');
  if (
    biometryType !== BiometryTypes.Biometrics &&
    biometryType !== BiometryTypes.TouchID &&
    biometryType !== BiometryTypes.FaceID
  ) {
    throw new Error('UNSUPPORTED_BIOMETRIC');
  }
  // 2. 提示
  const { success } = await rnb.simplePrompt({ promptMessage: '启用指纹 / 面容快速登录' });
  if (!success) throw new Error('USER_CANCELLED');
  // 3. 生成密钥对（用 StrongBox / TEE）
  const { publicKey } = await rnb.createKeys();
  // 4. 用公钥加密 refreshToken 后存储
  const encrypted = await rnb.encryptData(refreshToken, publicKey);
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, publicKey, encrypted }));
};

export const unlockWithAndroidBiometric = async (): Promise<{
  userId: string;
  refreshToken: string;
}> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error('NO_BIOMETRIC_BINDING');
  const { userId, publicKey, encrypted } = JSON.parse(raw);
  // 1. 提示生物识别
  const { success } = await rnb.simplePrompt({ promptMessage: '使用指纹 / 面容登录' });
  if (!success) throw new Error('USER_CANCELLED');
  // 2. 用私钥解密（**私钥在 TEE 内**）
  const { decrypted } = await rnb.decryptData(encrypted, publicKey);
  return { userId, refreshToken: decrypted };
};
```

### 16.4 跨端封装

```typescript
// src/services/biometric/index.ts
import { Platform } from 'react-native';
import { enableIOSBiometric, unlockWithIOSBiometric } from './ios';
import { enableAndroidBiometric, unlockWithAndroidBiometric } from './android';

export const enableBiometric = async (userId: string, refreshToken: string) => {
  if (Platform.OS === 'ios') return await enableIOSBiometric(userId, refreshToken);
  if (Platform.OS === 'android') return await enableAndroidBiometric(userId, refreshToken);
  throw new Error('UNSUPPORTED_PLATFORM');
};

export const unlockWithBiometric = async () => {
  if (Platform.OS === 'ios') return await unlockWithIOSBiometric();
  if (Platform.OS === 'android') return await unlockWithAndroidBiometric();
  throw new Error('UNSUPPORTED_PLATFORM');
};
```

### 16.5 失败回退

- 生物识别**失败 3 次** → 自动回退密码
- 生物识别**不可用**（如设备没设置指纹）→ 隐藏"生物识别登录"入口
- Keychain / EncryptedStorage **数据被清** → 用户须重新登录
- 设备**越狱 / root** → 强制关闭生物识别（已在 §6.1 jailbroken 标记）

---

## 17. 海外社交平台集成（本轮新增）

> **为什么需要这章**：海外用户**首要身份**是社交账号（Facebook / Google / LinkedIn / WhatsApp），**不**是手机号。集成 5 大平台，覆盖海外 80% 用户场景。**全部**遵循 00-foundation §13 双身份规则——一自然人可绑多账号。

### 17.1 平台总览

| 平台     | 库                                          | 主要用途                | 关键 SDK                           |
| -------- | ------------------------------------------- | ----------------------- | ---------------------------------- |
| Facebook | `react-native-fbsdk-next`                   | 登录 / 分享 / 归因      | FB SDK + Conversions API（服务端） |
| Google   | `@react-native-google-signin/google-signin` | 登录 / 定位 / 推送主题  | Google Sign-In + Identity Services |
| LinkedIn | `react-native-linkedin`（社区）             | 登录 / B2B 客户引入     | LinkedIn Sign-In + Marketing API   |
| WhatsApp | 官方 Cloud API（无 RN SDK）                 | 客服 / 通知 / 订单状态  | Meta WhatsApp Business Cloud API   |
| TikTok   | `react-native-tiktok-business-sdk`          | 海外用户增长 / 广告归因 | TikTok SDK + Events API            |

### 17.2 Facebook 集成

#### 17.2.1 SDK 配置

**iOS Info.plist**：

```xml
<key>FacebookAppID</key>
<string>1234567890</string>
<key>FacebookDisplayName</key>
<string>SamoaDAO</string>
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>fbapi</string>
  <string>fb-messenger-share-api</string>
  <string>fbauth2</string>
  <string>fbshareextension</string>
</array>
```

**Android Manifest**：

```xml
<meta-data android:name="com.facebook.sdk.ApplicationId" android:value="@string/facebook_app_id"/>
<meta-data android:name="com.facebook.sdk.ClientToken" android:value="@string/facebook_client_token"/>
<activity android:name="com.facebook.FacebookActivity" android:configChanges="keyboard|keyboardHidden|screenLayout|screenSize|orientation" android:label="@string/app_name"/>
```

#### 17.2.2 登录

```typescript
// src/services/social/facebook.ts
import {
  LoginManager,
  AccessToken,
  GraphRequest,
  GraphRequestManager,
  Settings,
} from 'react-native-fbsdk-next';
import { api } from '@/api/client';
import { Platform } from 'react-native';

Settings.setAppID('1234567890');
Settings.initializeSDK();

export const loginWithFacebook = async () => {
  // 1. 登录
  const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
  if (result.isCancelled) return { cancelled: true };
  // 2. 拿 accessToken
  const accessToken = await AccessToken.getCurrentAccessToken();
  if (!accessToken) throw new Error('NO_ACCESS_TOKEN');
  // 3. 拿 profile（**不**用 GraphRequestManager 异步回调）
  const profile = await new Promise<any>((resolve, reject) => {
    const req = new GraphRequest(
      '/me',
      {
        accessToken: accessToken.accessToken,
        parameters: { fields: { string: 'id,name,email,picture.type(large)' } },
      },
      (err, res) => {
        if (err) reject(err);
        else resolve(res);
      }
    );
    new GraphRequestManager().addRequest(req).start();
  });
  // 4. 调后端（**不**在客户端验签 Facebook token）
  const { data } = await api.post('/api/h5/auth/facebook-login', {
    accessToken: accessToken.accessToken,
    userId: profile.id,
    email: profile.email,
    name: profile.name,
    avatar: profile.picture?.data?.url,
    platform: Platform.OS,
  });
  return data;
};
```

#### 17.2.3 服务端验签

```typescript
// 后端
// GET https://graph.facebook.com/v18.0/me?access_token=xxx&appsecret_proof=xxx
// appsecret_proof = HMAC-SHA256(access_token, APP_SECRET)，**必须**验证防伪造
async function verifyFacebookToken(accessToken: string): Promise<FacebookProfile> {
  const appSecret = await kms.getSecret('FACEBOOK_APP_SECRET');
  const proof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
  const url = `https://graph.facebook.com/v18.0/me?access_token=${accessToken}&appsecret_proof=${proof}&fields=id,name,email,picture.type(large)`;
  const { data } = await axios.get(url);
  if (data.error) throw new Error('FB_TOKEN_INVALID');
  return data;
}
```

#### 17.2.4 Facebook Conversions API（服务端事件）

```typescript
// 关键事件（如注册、购买）**必须**发到 CAPI 用于广告归因优化
import bizSdk from 'facebook-nodejs-business-sdk';

const access_token = await kms.getSecret('FACEBOOK_SYSTEM_USER_TOKEN');
const pixel_id = 'FB_PIXEL_ID';
const api = bizSdk.FacebookAdsApi.init(access_token);

export const trackFBCAPI = async (
  eventName: string,
  userData: { email: string; externalId: string },
  customData: any
) => {
  const event = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'app',
    user_data: {
      em: [crypto.createHash('sha256').update(userData.email).digest('hex')],
      external_id: [crypto.createHash('sha256').update(userData.externalId).digest('hex')],
      client_ip_address: req.ip,
      client_user_agent: req.headers['user-agent'],
    },
    custom_data: customData,
  };
  const payload = { data: [event], access_token, pixel_id };
  await axios.post(`https://graph.facebook.com/v18.0/${pixel_id}/events`, payload);
};
```

#### 17.2.5 ATT 弹窗

```typescript
// iOS 14.5+ 必须先弹 ATT
import { requestTrackingPermission } from 'react-native-tracking-transparency';

const trackingStatus = await requestTrackingPermission();
// 'authorized' / 'denied' / 'unavailable' / 'not-determined'
```

### 17.3 Google 集成

#### 17.3.1 SDK 配置

**iOS Info.plist**：

```xml
<key>GIDClientID</key>
<string>YOUR_CLIENT_ID.apps.googleusercontent.com</string>
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>com.googleusercontent.apps.YOUR_CLIENT_ID</string></array>
  </dict>
</array>
```

**Android 自动**：通过 `google-services.json` 自动配置。

#### 17.3.2 登录

```typescript
// src/services/social/google.ts
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { api } from '@/api/client';

GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // 用于后端 idToken 验签
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
  offlineAccess: true, // 拿 refreshToken
});

export const loginWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const userInfo = await GoogleSignin.signIn();
    const { idToken, serverAuthCode, user } = userInfo;
    if (!idToken) throw new Error('NO_ID_TOKEN');
    const { data } = await api.post('/api/h5/auth/google-login', {
      idToken,
      serverAuthCode,
      userId: user.id,
      email: user.email,
      name: user.name,
      avatar: user.photo,
      platform: Platform.OS,
    });
    return data;
  } catch (err: any) {
    if (err.code === statusCodes.SIGN_IN_CANCELLED) return { cancelled: true };
    if (err.code === statusCodes.IN_PROGRESS) return { inProgress: true };
    throw err;
  }
};
```

#### 17.3.3 服务端验签

```typescript
// 后端
// 用 Google API Client Library
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(await kms.getSecret('GOOGLE_WEB_CLIENT_ID'));

async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: await kms.getSecret('GOOGLE_WEB_CLIENT_ID'),
  });
  const payload = ticket.getPayload();
  if (!payload.email_verified) throw new Error('EMAIL_NOT_VERIFIED');
  return payload as any; // sub, email, name, picture
}
```

### 17.4 LinkedIn 集成

#### 17.4.1 配置

- 在 [LinkedIn Developers](https://www.linkedin.com/developers/) 创建 App
- 申请 `Sign In with LinkedIn using OpenID Connect` 产品
- 重定向 URL：`https://samoadao.com/auth/linkedin/callback`

#### 17.4.2 登录（OAuth 2.0 + PKCE）

```typescript
// src/services/social/linkedin.ts
import * as AuthSession from 'expo-auth-session'; // 或 react-native-app-auth
import { api } from '@/api/client';

const CLIENT_ID = 'YOUR_LINKEDIN_CLIENT_ID';
const REDIRECT_URI = 'samoadao://auth/linkedin';
const SCOPES = ['openid', 'profile', 'email'];

export const loginWithLinkedIn = async () => {
  // 1. 生成 PKCE code_verifier / code_challenge
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await sha256(codeVerifier); // base64url
  // 2. 打开 WebView / 系统浏览器走 OAuth
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES.join(' '))}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
  const result = await AuthSession.openAuthSessionAsync(authUrl, REDIRECT_URI);
  if (result.type !== 'success') return { cancelled: true };
  const { code } = result.params;
  // 3. 调后端换 token（**不**在客户端）
  const { data } = await api.post('/api/h5/auth/linkedin-login', { code, codeVerifier });
  return data;
};
```

#### 17.4.3 服务端换 token

```typescript
// 后端
async function exchangeLinkedInCode(code: string, codeVerifier: string) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: await kms.getSecret('LINKEDIN_CLIENT_ID'),
    client_secret: await kms.getSecret('LINKEDIN_CLIENT_SECRET'),
    redirect_uri: 'samoadao://auth/linkedin',
    code_verifier: codeVerifier,
  });
  const { data } = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params);
  // data.access_token, data.id_token, data.refresh_token, data.expires_in
  // 验签 id_token（用 JWKS）
  const profile = await verifyJWT(data.id_token, 'https://www.linkedin.com/oauth/openid/jwks');
  return { accessToken: data.access_token, refreshToken: data.refresh_token, profile };
}
```

### 17.5 WhatsApp Business Cloud API

**WhatsApp Business API 客户端**（**不**在 APP 端直接调，**全部**走后端）：

- 客户端只做**启动客服会话**（拉起 WhatsApp APP 或 Web）
- 通知消息**只**走后端用 Meta Cloud API 发送

#### 17.5.1 启动客服会话

```typescript
// src/services/social/whatsapp.ts
import { Linking, Platform } from 'react-native';

const WHATSAPP_BUSINESS_PHONE = '68572199'; // 萨摩亚国际区号 + 电话

export const startWhatsAppChat = async (templateMessage?: string) => {
  // 1. 拉预填消息（后端生成）
  const { data } = await api.post('/api/h5/support/whatsapp-session', {
    templateName: templateMessage ?? 'customer_service_greeting',
    language: 'en',
  });
  // data.message / data.phoneNumber
  // 2. 拉起 WhatsApp
  const phone = data.phoneNumber ?? WHATSAPP_BUSINESS_PHONE;
  const text = encodeURIComponent(data.message);
  const url = Platform.select({
    ios: `whatsapp://send?phone=${phone}&text=${text}`,
    android: `whatsapp://send?phone=${phone}&text=${text}`,
  })!;
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  } else {
    // 回退到 wa.me（Web 跳转）
    await Linking.openURL(`https://wa.me/${phone}?text=${text}`);
  }
};
```

#### 17.5.2 后端 Cloud API

```typescript
// 后端
// POST https://graph.facebook.com/v18.0/{phone-number-id}/messages
async function sendWhatsAppMessage(
  to: string,
  templateName: string,
  languageCode: string,
  params: string[]
) {
  const accessToken = await kms.getSecret('WHATSAPP_BUSINESS_TOKEN');
  const phoneNumberId = await kms.getSecret('WHATSAPP_PHONE_NUMBER_ID');
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
    },
  };
  await axios.post(url, body, { headers: { Authorization: `Bearer ${accessToken}` } });
}
```

#### 17.5.3 客户消息回调

```typescript
// Webhook（Meta 主动推）
// POST /api/h5/support/whatsapp-webhook
// 验签 X-Hub-Signature-256
// 处理 inbound message → 推客服后台 → 客服回复
```

### 17.6 TikTok SDK

#### 17.6.1 配置

- 在 [TikTok for Business](https://ads.tiktok.com/) 创建 APP
- 拿到 `TIKTOK_APP_ID` + `TIKTOK_SDK_SECRET`
- iOS：配置 URL Scheme `tiktok<APP_ID>://`
- Android：Manifest 加 `tiktok_schema` 活动

#### 17.6.2 事件追踪（广告归因）

```typescript
// src/services/social/tiktok.ts
import TikTokBusiness from 'react-native-tiktok-business-sdk';

await TikTokBusiness.initializeSdk('TIKTOK_APP_ID', 'TIKTOK_SDK_SECRET');

// 用户注册
await TikTokBusiness.trackEvent('CompleteRegistration', {
  content_id: userId,
  content_type: 'user',
});

// 下单
await TikTokBusiness.trackEvent('Purchase', {
  content_id: orderId,
  content_type: 'product',
  value: amount,
  currency: 'USD',
});

// 登录
await TikTokBusiness.trackEvent('Login', {});

// 分享
await TikTokBusiness.trackEvent('Share', { content_id: productId });
```

#### 17.6.3 服务端 Events API

```typescript
// 后端 - 关键事件双发
// POST https://business-api.tiktok.com/open_api/v1.3/event/track/
async function trackTikTokEvent(
  eventName: string,
  user: { email: string; externalId: string },
  props: any
) {
  const accessToken = await kms.getSecret('TIKTOK_ACCESS_TOKEN');
  const pixelId = await kms.getSecret('TIKTOK_PIXEL_ID');
  const body = {
    pixel_id: pixelId,
    event: eventName,
    event_id: uuid(), // 防重
    timestamp: new Date().toISOString(),
    context: {
      user: {
        email: crypto.createHash('sha256').update(user.email).digest('hex'),
        external_id: crypto.createHash('sha256').update(user.externalId).digest('hex'),
      },
      ip: req.ip,
      user_agent: req.headers['user-agent'],
    },
    properties: props,
  };
  await axios.post('https://business-api.tiktok.com/open_api/v1.3/event/track/', body, {
    headers: { 'Access-Token': accessToken },
  });
}
```

### 17.7 多平台绑定管理

```typescript
// 显示已绑定的所有海外账号
export const getOverseasBindings = async () => {
  const { data } = await api.get('/api/h5/auth/overseas-bindings');
  return data.bindings as OverseasAuthBinding[];
};

// 绑定新平台（在已登录状态下）
export const bindOverseasAccount = async (provider: 'facebook' | 'google' | 'linkedin') => {
  let result;
  if (provider === 'facebook') result = await loginWithFacebook();
  if (provider === 'google') result = await loginWithGoogle();
  if (provider === 'linkedin') result = await loginWithLinkedIn();
  if (result.cancelled) return;
  // 后端自动判断：是否已存在 providerUserId？
  // 存在 → 合并账号（**必须**二次确认）
  // 不存在 → 新建 binding
  return result;
};

// 解绑
export const unbindOverseasAccount = async (bindingId: string) => {
  await api.delete(`/api/h5/auth/overseas-bindings/${bindingId}`);
  // 后端软删：isActive=false, unbindedAt=now()
};
```

### 17.8 账号合并（防撞库 + 提升体验）

**场景**：用户先用 Facebook 注册，后用 Google 登录，且 Google 邮箱**相同**。

**处理**：

1. 后端检测到 `providerUserId` 已存在 → 提示用户
2. 用户确认合并 → 把新 provider 绑定追加到 `OverseasAuthBinding`
3. **不**合并 `User.id`（00-foundation §13 双身份规则：**一自然人可有多个 user**）
4. 但**可以**在 `OverseasAuthBinding` 层加 `mergeFromUserId` 字段记录"曾经合并的来源"

**反之**：用户**拒绝**合并 → 新建 user，但 `email` 相同，提示"该邮箱已注册"

### 17.9 海外社交集成清单

| 平台     | 后端验签                  | 服务端事件                   | iOS ATT  | Android 厂商适配 |
| -------- | ------------------------- | ---------------------------- | -------- | ---------------- |
| Facebook | ✓ (`/me?appsecret_proof`) | ✓ (CAPI)                     | ✓ (必需) | —                |
| Google   | ✓ (OAuth2Client)          | ✓ (GA4 Measurement Protocol) | ✓ (可选) | —                |
| LinkedIn | ✓ (id_token + JWKS)       | — (无 Conversions API)       | —        | —                |
| WhatsApp | ✓ (X-Hub-Signature-256)   | — (无 events)                | —        | —                |
| TikTok   | ✓ (OAuth 2.0)             | ✓ (Events API)               | —        | —                |

---

## 18. 国际化（i18n）

> **为什么需要这章**：APP 是**海外**用户的主入口，**必须**支持多语言——英语 + 9 国语言。**完全复用** 00-foundation §5.5.1 翻译规范 + 命名空间（**不**重新设计）。

### 18.1 命名空间（与 00-foundation §5.5.1 一致）

```
src/i18n/
├── en-US/
│   ├── common.json        # 通用
│   ├── auth.json          # 登录 / 注册
│   ├── order.json         # 订单
│   ├── wallet.json        # 钱包
│   ├── social.json        # §17 海外社交
│   ├── push.json          # 推送
│   ├── payment.json       # 支付
│   ├── biometric.json     # 生物识别
│   └── error.json         # 错误
├── zh-CN/
├── ja-JP/
├── ko-KR/
├── es-ES/
├── de-DE/
├── fr-FR/
├── ru-RU/
├── ar-SA/                 # 阿拉伯语（RTL）
└── ...
```

### 18.2 翻译示例（en-US/social.json）

```json
{
  "facebook": {
    "loginButton": "Continue with Facebook",
    "loginSuccess": "Logged in with Facebook",
    "permissionDenied": "Facebook login was denied",
    "binding": {
      "title": "Facebook Account",
      "bound": "Linked to {{name}}",
      "unbind": "Unlink Account",
      "unbindConfirm": "Are you sure you want to unlink your Facebook account?",
      "unbindSuccess": "Facebook account unlinked"
    },
    "share": {
      "to": "Share to Facebook",
      "success": "Shared to Facebook",
      "failed": "Share failed"
    }
  },
  "google": {
    "loginButton": "Continue with Google",
    "playServicesUpdate": "Please update Google Play Services"
  },
  "linkedin": {
    "loginButton": "Continue with LinkedIn"
  },
  "whatsapp": {
    "chatButton": "Chat on WhatsApp",
    "chatUnavailable": "WhatsApp is not installed. Open in browser?"
  },
  "tiktok": {
    "shareButton": "Share to TikTok"
  }
}
```

### 18.3 RTL 支持（阿拉伯语 / 希伯来语）

```typescript
// src/i18n/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import { I18nManager } from 'react-native';

const RTL_LANGS = ['ar', 'he', 'fa', 'ur'];

const detectLanguage = (): string => {
  const best = RNLocalize.findBestLanguageTag([
    'en',
    'zh',
    'ja',
    'ko',
    'es',
    'de',
    'fr',
    'ru',
    'ar',
  ]);
  return best?.languageTag ?? 'en-US';
};

export const setupI18n = async () => {
  const lng = detectLanguage();
  await i18n.use(initReactI18next).init({
    compatibilityJSON: 'v3',
    lng,
    fallbackLng: 'en-US',
    interpolation: { escapeValue: false },
    resources: {
      /* ... */
    },
  });
  // RTL 切换（**必须**在所有 UI 渲染前）
  const shouldBeRTL = RTL_LANGS.includes(i18n.language.split('-')[0]);
  if (shouldBeRTL !== I18nManager.isRTL) {
    I18nManager.forceRTL(shouldBeRTL);
    // 需要重启 APP
  }
  return i18n;
};
```

**样式规则**：

- 横向间距用 `marginStart` / `marginEnd`（**不**用 left/right）
- 图标用 `transform: [{ scaleX: isRTL ? -1 : 1 }]`
- 文本对齐用 `textAlign: 'left' | 'right'`（**不**用 logical alignment）
- 数字、金额、币种**保持 LTR**（包在 `<View style={{ direction: 'ltr' }}>`）

### 18.4 多语言切换

```typescript
// 用户在"设置 > 语言"切换
export const changeLanguage = async (lng: string) => {
  await i18n.changeLanguage(lng);
  await MMKV.set('user_language', lng);
  // RTL 重启
  const shouldBeRTL = RTL_LANGS.includes(lng.split('-')[0]);
  if (shouldBeRTL !== I18nManager.isRTL) {
    I18nManager.forceRTL(shouldBeRTL);
    // 提示用户重启 APP
    Alert.alert(t('common:languageChanged'), t('common:pleaseRestartApp'));
  }
};
```

### 18.5 翻译同步

| 来源   | 平台                | 流程                    |
| ------ | ------------------- | ----------------------- |
| 业务方 | Crowdin / Phrase    | 上传源语言 (en-US)      |
| 翻译   | Crowdin / 本地译员  | 下载 → 翻译 → 上传      |
| 客户端 | 打包内置 + 增量更新 | `npm run i18n:download` |

**强制规则**：未翻译的 key **必须** fallback 到 en-US（**不**显示 key 名）。

---

## 19. 验收用例

> **为什么需要这章**：移动端涉及双端、推送、支付、IAP、海外社交、生物识别等**多通道**，必须给出**可执行**的验收用例，**不**是笼统的"功能正常"。

### 19.1 设备注册与推送

| #     | 场景               | 步骤                              | 预期                                                       | 优先级 |
| ----- | ------------------ | --------------------------------- | ---------------------------------------------------------- | ------ |
| TC-01 | iOS 首次启动注册   | 全新设备、首次安装、允许通知      | `MobileDevice` 创建 + `PushToken` 创建 + 1 条 token (apns) | P0     |
| TC-02 | Android 海外注册   | 海外 GMS 设备、首次安装、允许通知 | `MobileDevice` + `PushToken` (fcm)                         | P0     |
| TC-03 | Android 国内注册   | 国内小米设备、首次安装、允许通知  | `MobileDevice` + `PushToken` (xiaomi / jpush)              | P0     |
| TC-04 | 用户拒绝通知       | iOS 启动时拒绝                    | `isActive=false` + `subscribedTopics=[]`                   | P0     |
| TC-05 | 推送 token 轮转    | 系统升级后重启                    | 新 token 上传，旧 token 软删                               | P1     |
| TC-06 | 推送主题订阅       | 订阅 `marketing`                  | 推送列表收到该主题消息                                     | P1     |
| TC-07 | 通知点击 deep link | 点击带 `orderId=123` 的通知       | APP 跳到订单详情                                           | P0     |

### 19.2 登录与认证

| #     | 场景                  | 步骤                    | 预期                               | 优先级 |
| ----- | --------------------- | ----------------------- | ---------------------------------- | ------ |
| TC-08 | 邮箱 + 密码登录       | 输入正确                | 拿到 access + refresh              | P0     |
| TC-09 | 手机号 + 验证码登录   | 收 6 位验证码           | 同上                               | P0     |
| TC-10 | Apple ID 登录（海外） | iOS 选 Apple            | 拿到 idToken → 后端验签 → 登录     | P0     |
| TC-11 | Google 登录（海外）   | 选 Google               | 拿到 idToken → 后端验签 → 登录     | P0     |
| TC-12 | Facebook 登录         | 选 Facebook             | 拿到 accessToken → 后端验签 → 登录 | P0     |
| TC-13 | LinkedIn 登录         | 选 LinkedIn             | OAuth 2.0 PKCE 走通                | P1     |
| TC-14 | 钱包签名登录          | MetaMask 签名           | SIWE 验签 → 登录                   | P1     |
| TC-15 | refreshToken 自动续期 | accessToken 过期 + 401  | 自动 refresh + 重发原请求          | P0     |
| TC-16 | 生物识别快速登录      | 已启用 Face ID + 启 APP | 解密 refreshToken → 自动登录       | P1     |
| TC-17 | 生物识别失败 3 次     | 模拟失败                | 回退密码登录                       | P1     |

### 19.3 支付

| #     | 场景                   | 步骤                       | 预期                                             | 优先级 |
| ----- | ---------------------- | -------------------------- | ------------------------------------------------ | ------ |
| TC-18 | iOS IAP 订阅           | 选月度会员 → StoreKit 支付 | receipt 上传 → 后端验签 → 开通会员               | P0     |
| TC-19 | iOS IAP 重复购买       | 同账号 + 同商品            | 防重：`@@unique([platform, transactionId])` 生效 | P0     |
| TC-20 | iOS IAP 退款           | 苹果后台退款               | iap-webhook 收到 → 状态变更 → 关闭会员           | P0     |
| TC-21 | Android IAP 订阅       | 选月度会员 → Billing       | purchaseToken 上传 → 验签 → 开通                 | P0     |
| TC-22 | Android IAP 3 天未 ack | 模拟                       | 谷歌自动退款                                     | P0     |
| TC-23 | Apple Pay 实体商品     | iOS 选 Apple Pay           | PassKit 弹窗 → 支付成功                          | P0     |
| TC-24 | Google Pay 实体商品    | Android 选 Google Pay      | GooglePay 弹窗 → 支付成功                        | P0     |
| TC-25 | 微信 H5 支付           | 国内安卓 + 微信未装        | WebView 打开 → 完成支付                          | P1     |
| TC-26 | 支付宝 H5 支付         | 国内安卓                   | WebView 打开 → 完成支付                          | P1     |

### 19.4 海外社交

| #     | 场景                            | 步骤                          | 预期                                  | 优先级 |
| ----- | ------------------------------- | ----------------------------- | ------------------------------------- | ------ |
| TC-27 | Facebook 登录（iOS ATT）        | 弹 ATT → 同意 → 登录          | 拿到 id + email                       | P0     |
| TC-28 | Facebook 登录（ATT 拒绝）       | 弹 ATT → 拒绝                 | FB SDK limited login → 只能拿 id      | P0     |
| TC-29 | Google 登录（无 Play Services） | 模拟                          | 报 `PLAY_SERVICES_NOT_AVAILABLE` 错误 | P1     |
| TC-30 | LinkedIn PKCE 登录              | 选 LinkedIn                   | OAuth 走通 → 拿 profile               | P1     |
| TC-31 | WhatsApp 启动客服               | 点"WhatsApp 客服"             | 拉起 WhatsApp APP（含预填消息）       | P0     |
| TC-32 | TikTok 事件追踪                 | 注册/下单                     | 客户端事件 + 服务端 Events API 收到   | P0     |
| TC-33 | 账号合并                        | FB 登录后用同邮箱 Google 登录 | 提示合并 → 合并成功                   | P1     |
| TC-34 | 解绑 Facebook                   | 取消绑定                      | `isActive=false`，FB token 在本地清理 | P0     |
| TC-35 | Facebook CAPI 服务端事件        | 下单                          | 后端 CAPI 调用成功                    | P0     |

### 19.5 Web3

| #     | 场景               | 步骤                         | 预期                                    | 优先级 |
| ----- | ------------------ | ---------------------------- | --------------------------------------- | ------ |
| TC-36 | WalletConnect 连接 | 选 MetaMask                  | URI 拉起 MetaMask → 用户批准 → 拿到地址 | P0     |
| TC-37 | 链上签名登录       | 钱包签名 nonce               | 验签通过 → 登录                         | P0     |
| TC-38 | 签发 DID 凭证      | EIP-712 typed data 签名      | 拿到凭证 → 写 DB                        | P1     |
| TC-39 | 切链               | 钱包从 Ethereum 切到 Polygon | session.update 触发 chainChanged 事件   | P1     |

### 19.6 设备兼容

| #     | 场景                     | 步骤                | 预期                            | 优先级 |
| ----- | ------------------------ | ------------------- | ------------------------------- | ------ |
| TC-40 | iOS 17+ Privacy Manifest | iOS 17 设备首次启动 | 苹果 Privacy 报告正确显示收集项 | P0     |
| TC-41 | iPad 横屏                | iPad 横屏           | UI 适配（**不**拉伸）           | P1     |
| TC-42 | Android 14 通知权限      | API 34 设备首次启动 | 弹通知权限                      | P0     |
| TC-43 | Android 13+ 图片选择     | API 33+ 选图        | READ_MEDIA_IMAGES 权限申请      | P0     |
| TC-44 | iPhone 14 Pro 灵动岛     | iPhone 14 Pro 启动  | Live Activity（如有）正常       | P2     |
| TC-45 | 折叠屏                   | Samsung Fold        | UI 适配大屏                     | P2     |

### 19.7 性能

| #     | 场景     | 步骤                | 预期                          | 优先级 |
| ----- | -------- | ------------------- | ----------------------------- | ------ |
| TC-46 | 冷启动   | 杀进程后冷启        | < 2.5s（**不**含 SDK 初始化） | P0     |
| TC-47 | 热启动   | 切后台 30s 后回前台 | < 0.5s                        | P0     |
| TC-48 | 滑动帧率 | 滚动首页 1 分钟     | ≥ 55 FPS                      | P0     |
| TC-49 | 内存占用 | 正常使用 30 分钟    | < 250 MB                      | P1     |
| TC-50 | 包体积   | Release 包          | iOS < 80MB / Android < 50MB   | P0     |

### 19.8 离线

| #     | 场景             | 步骤            | 预期                         | 优先级 |
| ----- | ---------------- | --------------- | ---------------------------- | ------ |
| TC-51 | 离线查看订单列表 | 断网 → 打开订单 | 显示本地缓存（带"离线"角标） | P1     |
| TC-52 | 离线创建草稿订单 | 断网 → 提交订单 | 存本地 + 恢复后自动同步      | P1     |
| TC-53 | 离线时钱包操作   | 断网 → 钱包签名 | **拒绝**操作（链上不能离线） | P0     |

### 19.9 国际化

| #     | 场景             | 步骤                     | 预期                       | 优先级 |
| ----- | ---------------- | ------------------------ | -------------------------- | ------ |
| TC-54 | RTL 显示（阿语） | 切到阿拉伯语             | UI 镜像、文本从右到左      | P0     |
| TC-55 | 数字 LTR         | 阿语下显示金额 `100 USD` | 数字保持 LTR               | P0     |
| TC-56 | 翻译完整性       | 切到所有 9 种语言        | 未翻译 key fallback 到英文 | P0     |

### 19.10 上架审核

| #     | 场景                  | 步骤               | 预期                     | 优先级 |
| ----- | --------------------- | ------------------ | ------------------------ | ------ |
| TC-57 | 苹果 ATT              | iOS 14.5+ 首次启动 | ATT 弹窗正确弹出         | P0     |
| TC-58 | 苹果 IAP 强制         | 数字商品走 IAP     | **不**提供第三方支付入口 | P0     |
| TC-59 | 苹果 Privacy Manifest | iOS 17 提交审核    | 审核通过                 | P0     |
| TC-60 | Google 数据安全       | 提交 Play Console  | 表单填写正确             | P0     |

### 19.11 验收通过标准

- **P0** 用例**必须 100% 通过**
- **P1** 用例通过率 ≥ 95%
- **P2** 用例通过率 ≥ 80%
- **0** 个 P0 崩溃 / ANR
- **0** 个 P0 支付失败

---

## 20. 性能优化

> **为什么需要这章**：移动端**性能**是留存率的关键——启动慢、滑动卡、内存大、电量高，**每个**都会让用户卸载。**不**是"做完功能"就行。

### 20.1 启动性能

| 指标             | 目标   | 测量方法                                  |
| ---------------- | ------ | ----------------------------------------- |
| 冷启动 (iOS)     | ≤ 2.0s | `AppDelegate.didFinishLaunching` 到第一帧 |
| 冷启动 (Android) | ≤ 2.5s | `Application.onCreate` 到第一帧           |
| 首屏可交互       | ≤ 1.5s | Splash 消失 → 用户可点击                  |
| 关键 SDK 初始化  | ≤ 1.0s | APNs / FCM / Bugly / Sentry 启动耗时      |

**优化手段**：

- Hermes 预编译（**不**用 JSC）
- 启动期**不**初始化所有 SDK（按需懒加载）
- 用 `InteractionManager.runAfterInteractions` 推迟非关键操作
- 启动屏用 Storyboard / XML（**不**用 RN Splash）

```typescript
// iOS AppDelegate.m 启动期任务分发
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  // T+0ms: 启动 RN
  self.bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  // T+100ms: 启动期**关键**任务（推送注册）
  [self registerPush];
  // T+500ms: 启动期**非关键**任务（埋点 / Bugly / Sentry）
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 0.5 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{
    [SentrySDK startWithOptions:...];
    [Bugly startWithAppId:...];
  });
  return YES;
}
```

### 20.2 运行时性能

| 指标       | 目标                | 优化手段                                |
| ---------- | ------------------- | --------------------------------------- |
| 滑动 FPS   | ≥ 55                | FlashList（**不**用 FlatList）          |
| 长列表内存 | < 200 MB            | `windowSize=5`、`removeClippedSubviews` |
| 图片加载   | < 100ms（缓存命中） | FastImage + SDWebImage + Glide          |
| 路由切换   | < 300ms             | `react-native-screens`（原生容器）      |
| 网络请求   | < 1.5s（P95）       | axios + 缓存 + 预加载                   |

```typescript
// FlashList 替代 FlatList（性能 5x）
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={orders}
  estimatedItemSize={100}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <OrderRow order={item} />}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
/>
```

### 20.3 包体积

| 平台    | 目标    | 当前措施                                            |
| ------- | ------- | --------------------------------------------------- |
| iOS     | < 80 MB | ProGuard / R8 + 资源压缩 + 按需加载                 |
| Android | < 50 MB | ABI splits（按设备分 ABI）+ 资源压缩 + 移除未用代码 |

**Android ABI splits**：

```groovy
android {
  splits {
    abi {
      enable true
      reset()
      include 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
      universalApk true
    }
  }
}
```

**未用代码检测**：

```bash
# 找未用第三方库
npx depcheck

# 找未用导出
npx ts-prune
```

### 20.4 内存

| 指标       | 目标     | 监控                              |
| ---------- | -------- | --------------------------------- |
| 普通使用   | < 250 MB | Sentry / Bugly                    |
| 大图浏览   | < 400 MB | 需手动释放                        |
| 长列表滚动 | < 300 MB | FlashList + removeClippedSubviews |

**优化**：

- 图片用 `FastImage.resizeMode='contain'`，**不**加载原图到内存
- WebView 用完即销毁（**不**长存）
- 大 JSON 解析用 `JSONStream`（**不**一次解析）

### 20.5 电量

| 指标            | 目标                           |
| --------------- | ------------------------------ |
| 待机 8 小时     | < 5% 电量                      |
| 普通使用 1 小时 | < 15% 电量                     |
| 推送 1 小时     | < 2% 电量（APNs 是**低功耗**） |

**优化**：

- 后台**不**做轮询（用推送）
- GPS 用完后立即停止更新
- 网络请求用 `shouldBatch` 合并

### 20.6 性能监控

```typescript
// Sentry performance
import * as Sentry from '@sentry/react-native';

Sentry.startTransaction({ name: 'OrderList.Load' });
const data = await api.get('/api/h5/orders');
Sentry.getCurrentHub().getScope().getTransaction()?.finish();
```

```typescript
// Bugly 自定义指标
Bugly.setUserSceneTag(12345, 'order_list');
```

### 20.7 Hermes 启用

**iOS Podfile**：

```ruby
use_react_native!(
  :hermes_enabled => true
)
```

**Android gradle.properties**：

```
hermesEnabled=true
```

**效果**：启动 -30%、包体积 -20MB、内存 -15%。

---

## 21. Crash 监控

> **为什么需要这章**：APP 崩溃是**不可见**的——用户卸载了都不告诉你。三套监控**互补**：Sentry（跨端） + Firebase Crashlytics（iOS/Android 原生） + 腾讯 Bugly（国内安卓）。

### 21.1 多通道崩溃上报

| 通道                 | 适用                   | 重要性               |
| -------------------- | ---------------------- | -------------------- |
| Sentry               | 全球（跨端）           | **必**               |
| Firebase Crashlytics | iOS / 海外 Android     | **必**               |
| 腾讯 Bugly           | 国内 Android（含厂商） | **必**（国内稳定性） |
| 自建日志             | 服务端兜底             | **必**（最后防线）   |

### 21.2 Sentry 集成

```typescript
// src/app/App.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://xxx@sentry.io/123',
  environment: __DEV__ ? 'development' : 'production',
  release: `com.samoadao.app@${DeviceInfo.getVersion()}+${DeviceInfo.getBuildNumber()}`,
  dist: DeviceInfo.getBuildNumber().toString(),
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  enableAutoSessionTracking: true,
  // 屏蔽 PII
  beforeSendTransaction: (event) => {
    delete event.user?.email;
    delete event.user?.ip_address;
    return event;
  },
});

const App = Sentry.wrap(RootApp);
```

### 21.3 Crashlytics 集成

**iOS Podfile**：

```ruby
pod 'Firebase/Crashlytics'
```

**Android gradle**：

```groovy
apply plugin: 'com.google.firebase.crashlytics'

android {
  defaultConfig {
    ...
  }
  // 自动上传 mapping
  firebaseCrashlytics {
    mappingFileUploadEnabled true
  }
}
```

### 21.4 腾讯 Bugly 集成（国内 Android）

```groovy
// android/app/build.gradle
dependencies {
  implementation 'com.tencent.bugly:crashreport:5.4.6'
  implementation 'com.tencent.bugly:nativecrashreport:3.9.1'
}
```

```typescript
// 初始化（App 启动时）
import Bugly from 'react-native-bugly';

await Bugly.init({
  iosAppId: 'IOS_BUGLY_APP_ID',
  androidAppId: 'ANDROID_BUGLY_APP_ID',
  debug: __DEV__,
  channel: 'default',
  autoInit: true,
});
```

### 21.5 自定义日志

```typescript
// Sentry 自定义错误
Sentry.captureException(new Error('payment_verify_failed'), {
  tags: { paymentChannel: 'iap', platform: 'ios' },
  extra: { orderId, transactionId, receipt },
  user: { id: userId, ip_address: null },
});

// Bugly 自定义日志
Bugly.reportError('payment_verify_failed', 'orderId=123 transactionId=xxx');
```

### 21.6 Source Map 上传

**iOS**：Xcode build phase 自动上传 Sentry
**Android**：gradle plugin `sentry-android-gradle-plugin` 自动上传
**CodePush**：**必须**配置 source map 上传

```bash
appcenter codepush release-react \
  -a SamoaDAO/SamoaApp-iOS \
  -d Production \
  --target-binary-version 1.0.0 \
  --sourcemap-output \
  && npx sentry-cli releases files com.samoadao.app@1.0.0+100 upload-sourcemaps ./main.jsbundle.map
```

### 21.7 ANR / 卡顿监控

| 类型                             | 平台    | 监控                     |
| -------------------------------- | ------- | ------------------------ |
| ANR (Application Not Responding) | Android | Bugly / Crashlytics 自动 |
| 卡顿 (FPS < 30)                  | 双端    | Sentry performance       |
| Watchdog Timeout                 | iOS     | 自建埋点                 |

### 21.8 崩溃修复流程

1. **P0 崩溃**（影响登录 / 支付 / 启动）→ **立刻** 修 + CodePush 热更新 + 商店紧急发版
2. **P1 崩溃**（影响某功能）→ 24h 内修
3. **P2 崩溃**（边缘场景）→ 1 周内修

---

## 22. 版本管理

> **为什么需要这章**：APP **必须**严格区分 versionName（用户可见） / versionCode（内部） / buildNumber（CFBundleVersion）；多渠道还要分 channel；CodePush 还要分 deployment key。

### 22.1 版本号规范

**语义化版本（SemVer）**：

```
MAJOR.MINOR.PATCH
  │    │     │
  │    │     └─ 修复：1.0.0 → 1.0.1
  │    └─ 新功能：1.0.0 → 1.1.0
  └─ 不兼容：1.0.0 → 2.0.0
```

**iOS**：

- `CFBundleShortVersionString`：1.0.0
- `CFBundleVersion` (buildNumber)：100

**Android**：

- `versionName`：1.0.0
- `versionCode`：100

**版本号映射**：

```
versionName 1.0.0  → versionCode 100
versionName 1.0.1  → versionCode 101
versionName 1.1.0  → versionCode 110
versionName 2.0.0  → versionCode 200
```

### 22.2 强制更新 vs 建议更新

| 模式     | 触发                                   | 处理                        |
| -------- | -------------------------------------- | --------------------------- |
| 强制更新 | `versionCode < minVersionCode`         | 启动时**只**显示更新页      |
| 建议更新 | `versionCode < latestVersionCode`      | 弹窗提示"立即更新" / "稍后" |
| 静默更新 | `versionCode < recommendedVersionCode` | 后台下载，提示"夜间更新"    |

```typescript
// 启动时检查
export const checkAppUpdate = async () => {
  const { data } = await api.get('/api/h5/app-version', {
    params: { platform: Platform.OS, versionCode: DeviceInfo.getBuildNumber() },
  });
  if (data.forceUpdate) {
    navigationRef.reset({ index: 0, routes: [{ name: 'ForceUpdate', params: data }] });
  } else if (data.softUpdate) {
    Alert.alert(t('update:newVersion'), data.releaseNotes, [
      { text: t('common:cancel'), style: 'cancel' },
      { text: t('update:update'), onPress: () => Linking.openURL(data.storeUrl) },
    ]);
  }
};
```

### 22.3 多渠道版本

| 渠道                      | versionName       | 备注         |
| ------------------------- | ----------------- | ------------ |
| iOS App Store             | 1.0.0             | 唯一         |
| iOS TestFlight            | 1.0.0 (build 100) | 内部 + 外测  |
| Google Play               | 1.0.0 (100)       | 唯一         |
| Google Play 内部测试      | 1.0.0 (100)       | 内部 100 人  |
| Google Play 封闭测试      | 1.0.0 (100)       | 特定用户群   |
| 华为 / 小米 / OPPO / VIVO | 1.0.0.100         | 国内应用市场 |

### 22.4 CodePush 版本

- **Production**：正式版（用户能拉到）
- **Staging**：内部测试版（仅员工）
- **版本号**：用 CodePush label（1.0.0 → 1.0 → 1.1 ...）

### 22.5 包大小监控

```yaml
# CI 配置
- name: Bundle size check
  run: |
    npx react-native-bundle-visualizer
    SIZE=$(stat -f%z ios/build/Build/Products/Release-iphoneos/SamoaDAO.app/main.jsbundle)
    if [ $SIZE -gt 5000000 ]; then
      echo "Bundle too large: ${SIZE} bytes"
      exit 1
    fi
```

---

## 23. 商店上架流程

> **为什么需要这章**：双端上架**完全不同**——苹果人工审核（24-48h），谷歌自动审核（1-7 天），国内应用市场**最复杂**（多厂商 + 资质 + 备案）。本节固定流程。

### 23.1 iOS App Store 上架

| 步骤                         | 工具              | 耗时    |
| ---------------------------- | ----------------- | ------- |
| 1. 准备证书                  | Apple Developer   | 1 天    |
| 2. 创建 APP ID               | Apple Developer   | 1h      |
| 3. 创建 Provisioning Profile | Xcode 自动        | 1h      |
| 4. TestFlight 内测           | TestFlight        | 1-7 天  |
| 5. TestFlight 外测           | TestFlight        | 1-30 天 |
| 6. App Store Connect 提交    | App Store Connect | 1h      |
| 7. 苹果审核                  | 人工              | 24-48h  |
| 8. 发布                      | App Store         | 即时    |

**必备资料**：

- 应用图标（1024×1024 PNG）
- 启动图（6.5" / 5.5" / 4.7" / iPad）
- 应用截图（6.5" / 5.5" / iPad 各 1-10 张）
- 应用描述（中英双语）
- 关键词（100 字符）
- 隐私政策 URL
- 支持 URL
- 营销 URL（可选）
- 分类（主类 + 副类）
- 版权
- 联系人信息

### 23.2 Google Play 上架

| 步骤                | 工具                | 耗时               |
| ------------------- | ------------------- | ------------------ |
| 1. 创建开发者账号   | Google Play Console | 1 天（$25 一次性） |
| 2. 创建 APP         | Google Play Console | 1h                 |
| 3. 上传 AAB         | Google Play Console | 1h                 |
| 4. 内部测试         | 自动                | 即时               |
| 5. 封闭测试         | 自动                | 1-7 天             |
| 6. 开放测试（可选） | 自动                | 1-7 天             |
| 7. 正式发布         | 自动                | 1-7 天             |

**必备资料**：

- AAB 文件
- 应用图标（512×512 PNG）
- Feature Graphic（1024×500）
- 应用截图（手机 + 平板）
- 应用描述
- 数据安全表单（**必**填）
- 内容分级
- 目标受众
- 隐私政策 URL
- Ads Disclosure

### 23.3 国内应用市场

| 市场   | 资质                                                  |
| ------ | ----------------------------------------------------- |
| 华为   | 公司营业执照 + 软件著作权 + ICP 备案 + 华为开发者实名 |
| 小米   | 同上 + 小米开发者实名                                 |
| OPPO   | 同上 + OPPO 开发者实名                                |
| VIVO   | 同上 + VIVO 开发者实名                                |
| 应用宝 | 同上 + 腾讯开放平台实名                               |
| 百度   | 同上 + 百度开发者实名                                 |
| 阿里   | 同上 + 阿里开发者实名                                 |
| 360    | 同上 + 360 开发者实名                                 |

**国内 APK 必须**有：

- 营业执照
- 软件著作权（**软著**）
- ICP 备案（域名）
- ICP 许可证（经营性）
- 网络文化经营许可证（如涉及文化内容）
- 公安备案（30 天内）
- 应用程序电子版权认证（可选）

### 23.4 上架时间表

| 阶段             | 耗时                     |
| ---------------- | ------------------------ |
| 准备资料         | 1-2 周                   |
| 软著申请         | 1-3 个月（**提前**准备） |
| 苹果 / 谷歌审核  | 1-7 天                   |
| 国内应用市场审核 | 1-7 天/家                |
| **总计**         | 1-3 个月                 |

### 23.5 版本回滚

| 情况             | 措施                                        |
| ---------------- | ------------------------------------------- |
| iOS 紧急崩溃     | CodePush 热修 + 苹果紧急发版（24h）         |
| Android 紧急崩溃 | 谷歌 Play Console 暂停发布 + 修复后重新发布 |
| 国内安卓         | 极光热更新（**不**影响应用市场审核）        |

---

## 24. 反作弊

> **为什么需要这章**：APP 是**黑产重灾区**——注册优惠、刷单、IAP 退款欺诈、虚假 KYC、海外黑卡支付。本节固定**多维度**反作弊。

### 24.1 风险等级

| 风险             | 场景                | 检测                              |
| ---------------- | ------------------- | --------------------------------- |
| **刷注册**       | 批量注册薅羊毛      | 设备指纹 + 手机号三要素 + IP 频率 |
| **刷单**         | 虚假交易            | 行为分析（IP / 设备 / 时间）      |
| **IAP 退款欺诈** | 用户充值后立即退款  | 苹果 / 谷歌退款率监控             |
| **黑卡支付**     | 盗刷信用卡          | 3DS 验证 + 风控引擎               |
| **虚假 KYC**     | 用假证 / 别人身份证 | OCR + 活体检测 + 公安联网         |
| **设备篡改**     | 改机 / 越狱 / Hook  | 设备指纹 + 越狱检测 + SafetyNet   |

### 24.2 设备指纹

```typescript
// src/services/security/device-fingerprint.ts
import DeviceInfo from 'react-native-device-info';
import FingerprintJS from '@fingerprintjs/fingerprintjs-pro-react-native';

export const getDeviceFingerprint = async (): Promise<string> => {
  const base = {
    deviceId: await DeviceInfo.getUniqueId(),
    brand: DeviceInfo.getBrand(),
    model: DeviceInfo.getModel(),
    systemName: DeviceInfo.getSystemName(),
    systemVersion: DeviceInfo.getSystemVersion(),
    appVersion: DeviceInfo.getVersion(),
    buildNumber: DeviceInfo.getBuildNumber(),
    carrier: await DeviceInfo.getCarrier(),
    abi: DeviceInfo.supportedAbisSync(),
    totalMemory: await DeviceInfo.getTotalMemory(),
    usedMemory: await DeviceInfo.getUsedMemory(),
  };
  // 哈希后作为指纹
  return sha256(JSON.stringify(base));
};
```

### 24.3 越狱 / Root 检测

```typescript
import JailbreakMonkey from 'react-native-jailbreak-monkey';
import DeviceInfo from 'react-native-device-info';

export const isDeviceCompromised = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    return await JailbreakMonkey.isJailBroken();
  }
  if (Platform.OS === 'android') {
    return await DeviceInfo.isRooted(); // 简化检测
  }
  return false;
};

// 检测到越狱 → 强制关闭生物识别 / 钱包 / 支付
if (await isDeviceCompromised()) {
  Alert.alert(t('security:deviceCompromised'), t('security:deviceCompromisedDesc'));
  // 隐藏生物识别、IAP、钱包入口
}
```

### 24.4 SafetyNet / DeviceCheck（Android / iOS）

```typescript
// Android - Play Integrity API
import { getIntegrityToken } from 'react-native-play-integrity';

const result = await getIntegrityToken({
  cloudProjectNumber: 'YOUR_CLOUD_PROJECT_NUMBER',
});
// 发到后端 → 调 Google API → 拿到 verdict（MEETS_DEVICE_INTEGRITY / MEETS_BASIC_INTEGRITY 等）

// iOS - DeviceCheck
import DeviceCheck from 'react-native-device-check';

const token = await DeviceCheck.getToken();
// 发到后端 → 调苹果 API → 验证该设备是否被标记为有风险
```

### 24.5 IAP 退款欺诈防御

```typescript
// 后端策略
const fraudScore = await getFraudScore({
  userId,
  deviceFingerprint,
  ipAddress,
  orderHistory,
  iapHistory,
});
if (fraudScore > 0.8) {
  // 拒绝发货 / 暂停账号
  await blockUser(userId, 'HIGH_FRAUD_RISK');
}
```

### 24.6 黑卡检测

- **3DS 验证**：欧洲强制（PSD2）
- **AVS / CVV**：地址 / CVV 校验
- **风控引擎**：实时风控（用 Stripe Radar / Adyen Risk）
- **黑名单库**：IP / 卡 BIN / 邮箱

### 24.7 异常行为检测

| 行为                      | 阈值 | 处理           |
| ------------------------- | ---- | -------------- |
| 同设备 1h 注册 > 3 次     | 是   | 触发图形验证码 |
| 同 IP 24h 登录 > 50 次    | 是   | IP 临时封禁    |
| 1 个用户 24h 下单 > 10 单 | 是   | 人工审核       |
| 钱包操作 1h > 5 次        | 是   | 强制 KYC       |
| 退款率 > 30%              | 是   | 暂停账号       |

---

## 25. 监控与埋点

> **为什么需要这章**：APP 监控是**数据驱动**的基础——功能上线后**必须**能回答"用得怎么样 / 卡不卡 / 错没错"。

### 25.1 监控体系

| 类型     | 工具                         | 指标               |
| -------- | ---------------------------- | ------------------ |
| 崩溃     | Sentry + Crashlytics + Bugly | 崩溃率 / ANR       |
| 性能     | Sentry Performance + Bugly   | 启动 / FPS / 内存  |
| 业务埋点 | 神策 / GrowingIO / Mixpanel  | 转化 / 留存 / 漏斗 |
| 行为埋点 | 客户端上报                   | 点击 / 浏览 / 滑动 |
| 网络     | axios interceptor            | 接口耗时 / 错误率  |
| 用户反馈 | 应用商店评论 + 站内反馈      | NPS / 评分         |

### 25.2 业务埋点

```typescript
// src/services/analytics/track.ts
import analytics from '@react-native-firebase/analytics'; // GA4
import Sensors from 'react-native-sensors-analytics'; // 神策

export const trackEvent = async (eventName: string, properties?: Record<string, any>) => {
  // GA4
  await analytics().logEvent(eventName, properties);
  // 神策
  Sensors.track(eventName, properties);
};

// 预定义事件
export const trackSignUp = (provider: string) => trackEvent('sign_up', { method: provider });
export const trackLogin = (provider: string) => trackEvent('login', { method: provider });
export const trackPurchase = (orderId: string, amount: number, currency: string) =>
  trackEvent('purchase', { transaction_id: orderId, value: amount, currency });
export const trackShare = (provider: string, contentType: string, itemId: string) =>
  trackEvent('share', { method: provider, content_type: contentType, item_id: itemId });
```

### 25.3 用户属性

```typescript
export const setUserProperties = async (user: User) => {
  await analytics().setUserId(user.id);
  await analytics().setUserProperty('user_type', user.type); // individual / business
  await analytics().setUserProperty('region', user.region);
  await analytics().setUserProperty('kyc_status', user.kycStatus);
  await analytics().setUserProperty('wallet_bound', user.walletBound ? 'true' : 'false');
  await analytics().setUserProperty('membership_tier', user.membershipTier);
};
```

### 25.4 漏斗分析

| 漏斗         | 步骤                                                                  |
| ------------ | --------------------------------------------------------------------- |
| 注册转化     | 启动 → 引导 → 选注册方式 → 输入手机号 → 收验证码 → 注册成功           |
| 首次下单     | 启动 → 选商品 → 加购 → 提交订单 → 选支付 → 支付成功                   |
| 海外社交登录 | 启动 → 登录页 → 选 FB → ATT 弹窗 → FB 授权 → 拿 profile → 登录成功    |
| 钱包绑定     | 我的 → 钱包 → 连接钱包 → 选 MetaMask → URI 拉起 → 用户签名 → 绑定成功 |

### 25.5 A/B 测试

- 工具：Firebase Remote Config / 自建
- 场景：登录页 UI、新功能开关、价格策略

```typescript
import remoteConfig from '@react-native-firebase/remote-config';

await remoteConfig().setConfigSettings({ minimumFetchIntervalMillis: 3600000 });
await remoteConfig().fetchAndActivate();
const variant = remoteConfig().getString('login_button_variant'); // 'a' / 'b'
```

### 25.6 监控大盘

| 维度   | 关键指标      | 阈值         |
| ------ | ------------- | ------------ |
| 稳定性 | 崩溃率        | < 0.1% (P95) |
| 性能   | 冷启动        | < 2.5s (P95) |
| 性能   | FPS           | > 55 (P50)   |
| 网络   | 接口 P95 耗时 | < 1.5s       |
| 业务   | DAU / MAU     | 持续增长     |
| 业务   | 7 日留存      | > 30%        |
| 业务   | 漏斗转化率    | 持续增长     |

---

## 26. 跨文件一致性检查

> **为什么需要这章**：本文件涉及 H5 / 小程序 / 后端多处交叉，**必须**与 00-foundation 等其他文档保持一致。本节列出**所有**交叉引用点。

### 26.1 与 00-foundation.md 一致性

| 主题                                          | 引用点               | 本文档落实章节                                                                         |
| --------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------- |
| i18n 命名空间规范                             | 00-foundation §5.5.1 | §18 i18n                                                                               |
| 状态色规范                                    | 00-foundation §8.3.1 | §10.1 StatusBadge                                                                      |
| KMS 凭据加密                                  | 00-foundation §11    | §17.2.3 (FB)、§17.3.3 (Google)、§17.5.2 (WhatsApp)、§17.6.3 (TikTok)                   |
| User 外键约束                                 | 00-foundation §12    | §6.1 MobileDevice.userId / §6.4 BiometricAuth.userId / §6.5 OverseasAuthBinding.userId |
| 统一退款状态机                                | 00-foundation §7.5   | §7.2 IAP / §14.7                                                                       |
| 双身份规则                                    | 00-foundation §13    | §6.5 OverseasAuthBinding（**不**用 `@@unique([userId, provider])`）                    |
| 通用字段（createdAt / updatedAt / deletedAt） | 00-foundation §6     | §6.1-6.5 **全部** model                                                                |
| 软删规范                                      | 00-foundation §6     | §6.1 / §6.4 / §6.5                                                                     |
| 错误码规范                                    | 00-foundation §10    | §14 / §15 / §17 全部错误码                                                             |

### 26.2 与 01-wechat-mini-program.md 一致性

| 主题          | 引用点          | 本文档差异点                                                                                                |
| ------------- | --------------- | ----------------------------------------------------------------------------------------------------------- |
| 业务域        | 01-小程序 §1-§5 | **相同**（订单 / 钱包 / 会员 / 客服）                                                                       |
| i18n 命名空间 | 01-小程序 §4    | **相同**（en-US / zh-CN / ja-JP ...）                                                                       |
| 状态色        | 01-小程序 §6    | **相同**（success / processing / warning / error / default）                                                |
| 退款状态机    | 01-小程序 §5    | **相同**（**完全**复用 00-foundation §7.5）                                                                 |
| 字段定义      | 01-小程序 §7    | **新增** 5 个 APP 特有 model（MobileDevice / PushToken / AppInstall / BiometricAuth / OverseasAuthBinding） |
| API           | 01-小程序 §8    | **复用** `/api/h5/*`；**新增** `/api/h5/auth/apple-login` 等 6 个                                           |
| 用户故事      | 01-小程序 §3    | **新增** 推送 / IAP / 钱包 / 生物识别 / 海外社交                                                            |
| 验收用例      | 01-小程序 §19   | **新增** 推送 / IAP / 生物识别 / 海外社交 / Web3                                                            |

### 26.3 与 02-h5-web.md 一致性

| 主题          | 引用点    | 本文档差异点                                              |
| ------------- | --------- | --------------------------------------------------------- |
| 路由          | 02-H5 §4  | H5 用 react-router，APP 用 React Navigation               |
| API client    | 02-H5 §5  | **统一** axios + interceptor（refreshToken 逻辑**相同**） |
| 错误处理      | 02-H5 §6  | **统一** 全局错误拦截器（**不**区分平台）                 |
| i18n 翻译文件 | 02-H5 §18 | **共享** 翻译资源（`/i18n/*` 集中仓库）                   |

### 26.4 与 03-admin-web.md / 00-foundation.md 业务域一致性

| 业务域       | 引用点             | 本文档                       |
| ------------ | ------------------ | ---------------------------- |
| 订单状态机   | 00-foundation §7.1 | **完全**一致                 |
| 退款状态机   | 00-foundation §7.5 | **完全**一致                 |
| 钱包交易状态 | 00-foundation §7.6 | **完全**一致（链上交易状态） |
| KYC 状态     | 00-foundation §7.7 | **完全**一致                 |
| 会员等级     | 00-foundation §7.8 | **完全**一致                 |

### 26.5 与 后端 API 一致性

| API 路径                          | 引用                 | 落实                             |
| --------------------------------- | -------------------- | -------------------------------- |
| `/api/h5/*`                       | H5 共享 API 命名空间 | §8 **全部**接口均挂在 `/api/h5/` |
| `/api/h5/auth/apple-login`        | 本轮新增             | §8.2                             |
| `/api/h5/auth/google-login`       | 本轮新增             | §8.2                             |
| `/api/h5/auth/facebook-login`     | 本轮新增             | §8.2                             |
| `/api/h5/auth/linkedin-login`     | 本轮新增             | §8.2                             |
| `/api/h5/auth/wallet-login`       | 本轮新增             | §8.2 / §15                       |
| `/api/h5/devices/register`        | 本轮新增             | §8.1                             |
| `/api/h5/devices/:id/push-tokens` | 本轮新增             | §8.1 / §13                       |
| `/api/h5/payments/iap-*`          | 本轮新增             | §8.3 / §14.4 / §14.5             |
| `/api/h5/auth/overseas-bindings*` | 本轮新增             | §8.4 / §17                       |
| `/api/h5/support/whatsapp-*`      | 本轮新增             | §8.6 / §17.5                     |
| `/api/h5/install/track`           | 本轮新增             | §8.7 / §17.6                     |

### 26.6 数据模型一致性

| Model               | 引用             | 字段一致性                                                |
| ------------------- | ---------------- | --------------------------------------------------------- |
| MobileDevice        | 本文件 §6.1      | **新增**（与 User FK）                                    |
| PushToken           | 本文件 §6.2      | **新增**（与 MobileDevice FK）                            |
| AppInstall          | 本文件 §6.3      | **新增**（与 MobileDevice FK）                            |
| BiometricAuth       | 本文件 §6.4      | **新增**（与 MobileDevice + User FK）                     |
| OverseasAuthBinding | 本文件 §6.5      | **新增**（与 User + MobileDevice FK）                     |
| User                | 00-foundation §6 | **复用**（**不**改字段）                                  |
| Order               | 00-foundation §6 | **复用**（APP 端只新增 `iapReceipt`、`iapTransactionId`） |
| Wallet              | 00-foundation §6 | **复用**（APP 端通过 `MobileDevice.walletAddress` 关联）  |
| KYC                 | 00-foundation §6 | **复用**                                                  |
| Membership          | 00-foundation §6 | **复用**                                                  |

### 26.7 合规一致性

| 主题            | 引用               | 落实                                                 |
| --------------- | ------------------ | ---------------------------------------------------- |
| 萨摩亚 FSA 合规 | 00-foundation §3   | §1.3 业务目标                                        |
| 跨境数据        | 00-foundation §3.4 | §18.3 RTL 翻译需明确"未翻译 fallback"                |
| 反洗钱 AML      | 00-foundation §3.5 | §24 反作弊 / §7.3 状态机                             |
| 隐私政策        | 00-foundation §4   | §11.5 Privacy Manifest / §12.1 data_extraction_rules |
| KYC / KYB       | 00-foundation §7.7 | §19.5 验收用例                                       |
| 数据保留        | 00-foundation §3.6 | §6.1 `deletedAt` 软删                                |

### 26.8 i18n 翻译资源一致性

- **统一仓库**：`/i18n/{lng}/{namespace}.json`
- **APP / H5 / 小程序** 共享同一份翻译
- **强制规则**：未翻译的 key **必须** fallback 到 en-US
- **禁止**：每端各维护一份（会导致体验不一致）

### 26.9 设计 token 一致性

| Token  | 引用                 | 本文件                       |
| ------ | -------------------- | ---------------------------- |
| 状态色 | 00-foundation §8.3.1 | §10.1 / §10.3                |
| 间距   | 00-foundation §8.3.2 | §10.3 DESIGN_TOKENS.spacing  |
| 圆角   | 00-foundation §8.3.3 | §10.3 DESIGN_TOKENS.radius   |
| 字号   | 00-foundation §8.3.4 | §10.3 DESIGN_TOKENS.fontSize |
| 字体   | 00-foundation §8.3.5 | §10.2 Platform.select        |

### 26.10 一致性检查 Checklist

在 PR 合入前**必须**勾选：

- [ ] 新增/修改字段在所有引用文档中保持一致
- [ ] 新增 API 路径**不**与现有冲突
- [ ] 新增状态机**不**绕过 00-foundation 状态机
- [ ] i18n key 与 00-foundation §5.5.1 一致
- [ ] 状态色用 00-foundation §8.3.1 的 5 种（**不**新增）
- [ ] 凭据（OAuth client_secret 等）**必须**用 KMS
- [ ] userId FK 用 `onDelete: Restrict`（**不**用 Cascade）
- [ ] 通用字段 `createdAt` / `updatedAt` / `deletedAt` **不**漏
- [ ] 软删用 `isActive=false` + `deletedAt`，**不**硬删
- [ ] 海外平台 token 用 KMS 加密
- [ ] 反作弊策略**复用** 00-foundation §11（KMS）+ §12（FK）
- [ ] 错误码**复用** 00-foundation §10
- [ ] 监控事件**复用** 00-foundation §13

---

## 附录 A：术语表

| 术语           | 英文                            | 释义                                  |
| -------------- | ------------------------------- | ------------------------------------- |
| 通用链接       | Universal Link                  | iOS 平台**安全**的 Deep Link 方案     |
| 应用链接       | App Link                        | Android 平台**安全**的 Deep Link 方案 |
| 推送服务       | APNs / FCM                      | 苹果 / 谷歌推送服务                   |
| 内购           | IAP (In-App Purchase)           | 应用内购买                            |
| 生物识别       | Biometric Authentication        | 指纹 / Face ID / 面容                 |
| 签名钱包       | WalletConnect                   | 链上钱包标准协议                      |
| 跟踪透明度     | ATT (App Tracking Transparency) | iOS 14.5+ 隐私框架                    |
| 应用追踪透明度 | ATT                             | 同上                                  |
| 私钥保险箱     | Secure Enclave / StrongBox      | 设备级密钥存储                        |
| 转化 API       | CAPI (Conversions API)          | Facebook 服务端事件 API               |
| 客户关系管理   | CRM                             | —                                     |
| 健康管理       | Health Kit                      | iOS 健身（**本项目不涉及**）          |

---

## 附录 B：变更记录

| 版本 | 日期       | 作者     | 变更 |
| ---- | ---------- | -------- | ---- |
| 1.0  | 2026-06-06 | PRD Team | 初稿 |

---

**文档结束**
