# 客户端 PRD 文档集（Client PRD）

> **目标读者**：客户端开发 / 客户端产品 / SRE / 跨端架构师
> **目标效果**：可作为客户端 5 端（小程序 3 + 移动 APP + 官网）+ 5 大海外平台 + H5 优化 + 基础设施 + 开发流程的唯一参考
> **基础规范**：所有客户端文档**严格遵循** [00-foundation 跨文件一致性规则](../admin-prd/00-foundation.md#3-权限与-rbac)
> **文档版本**：v0.5（2026-06-06 Round 4 Reader Testing 通过）

---

## 1. 文档清单

| #        | 文件                                                                     | 行数        | 核心内容                                                         |
| -------- | ------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------- |
| 01       | [01-wechat-mini-program.md](./01-wechat-mini-program.md)                 | ~830        | 微信小程序（拉新裂变主战场，复用 H5 后端 `/api/h5/*`）           |
| 02       | [02-alipay-mini-program.md](./02-alipay-mini-program.md)                 | 1524        | 支付宝小程序（金融/税务/银行专属，含芝麻信用集成）               |
| 03       | [03-douyin-mini-program.md](./03-douyin-mini-program.md)                 | 1977        | 抖音/字节小程序（视频挂载 + 直播小黄车 + AI 审核三层）           |
| 04       | [04-mobile-app.md](./04-mobile-app.md)                                   | 3445        | 移动 APP（React Native，含 5 大海外社交平台集成）                |
| 05       | [05-official-website.md](./05-official-website.md)                       | 2387        | 官网（Next.js 14 + ISR + SEO + GA4 + A/B 测试）                  |
| 06       | [06-overseas-platforms.md](./06-overseas-platforms.md)                   | 2255        | 5 大海外平台（Facebook / LinkedIn / Google / WhatsApp / TikTok） |
| 07       | [07-h5-function-optimization.md](./07-h5-function-optimization.md)       | 2092        | H5 20 菜单逐项打磨（**不改 UI**）                                |
| 08       | [08-infrastructure-architecture.md](./08-infrastructure-architecture.md) | 3000+       | 8 大基础设施（技术/API/数据库/云原生/支付/AI/萨摩亚/VIE+ODI）    |
| 09       | [09-dev-process-toolkit.md](./09-dev-process-toolkit.md)                 | 2023        | Skills / MCPs / 上下文优化 / Token 节省                          |
| **合计** |                                                                          | **~21,500** |                                                                  |

> **配套文档**（不在本目录）：
>
> - [admin-prd/](../admin-prd/README.md) — 后台 21 篇 PRD（基础规范来源）
> - [ops-manual/00-production-readiness.md](../ops-manual/00-production-readiness.md) — 生产标准手册（部署/监控/灾备/应急/合规/性能/成本）

---

## 2. 文档关系图

```
admin-prd/00-foundation.md  ←  跨文件一致性规则（所有 client-prd 文档必须遵循）
        │
        ├─→ client-prd/01-wechat-mini-program.md
        ├─→ client-prd/02-alipay-mini-program.md
        ├─→ client-prd/03-douyin-mini-program.md
        ├─→ client-prd/04-mobile-app.md  ←─ 也调 ops-manual/00-production-readiness.md
        ├─→ client-prd/05-official-website.md
        ├─→ client-prd/06-overseas-platforms.md
        ├─→ client-prd/07-h5-function-optimization.md  ←─ 也调 admin-prd/01~19 各模块 PRD
        ├─→ client-prd/08-infrastructure-architecture.md  ←─ 总体技术决策
        └─→ client-prd/09-dev-process-toolkit.md  ←─ 团队开发流程

admin-prd/01~19 各模块 PRD
        │
        └─→ client-prd/07-h5-function-optimization.md（每个 H5 菜单 link 到对应后台 PRD）
```

---

## 3. 跨文件一致性规则（每个客户端文档必勾）

> **继承自** [00-foundation §6.4 跨文件一致性检查清单](../admin-prd/00-foundation.md)

- [ ] **状态枚举值**是否在 00-foundation §8.3.1 扩展色彩表里有映射？
- [ ] **状态变更**是否走 00-foundation §4.3 独立日志表模式（不是 JSON 内嵌）？
- [ ] **`*UserId` 字段**是否按 00-foundation §12 加 `@relation("Name")` + `onDelete: Restrict`？
- [ ] **i18n namespace** 是否在 00-foundation §5.5.1 速查表里？新增的 namespace 必须在本目录 README §4 登记
- [ ] **退款**是否走 00-foundation §7.5 统一约定（`refundedAmount` + 乐观锁）？
- [ ] **资源级权限判定**是否走 00-foundation §3.5（RBAC + accessLevel + userLevel 三层）？
- [ ] **凭证加密**是否走 00-foundation §11 KMS（**所有** Access Token / Refresh Token / 私钥 / 银行卡号 / 手机号 / 邮箱）？
- [ ] **双身份规则**（00-foundation §13）：一个自然人可有多个 overseas auth binding / WechatUser / AlipayUser / DouyinUser，但 `User.principalId` 唯一
- [ ] **生产部署**是否走 ops-manual §1（CI/CD / K8s / 灰度 / 回滚）？
- [ ] **监控告警**是否走 ops-manual §2（Prometheus / Grafana / SLO / on-call）？

---

## 4. 新增 i18n namespace 登记台账

> **基础速查表见** [00-foundation §5.5.1](../admin-prd/00-foundation.md)。本表记录**新增**的 namespace。

| Namespace   | 引入文档                                          | 用途                      | 状态    |
| ----------- | ------------------------------------------------- | ------------------------- | ------- |
| `credit`    | 02-alipay-mini-program.md                         | 芝麻信用分等级 / 信用授权 | ✅ 已加 |
| `auth`      | 02-alipay-mini-program.md                         | 支付宝账号授权 / 实名认证 | ✅ 已加 |
| `video`     | 03-douyin-mini-program.md                         | 抖音视频状态 / 挂载点     | ✅ 已加 |
| `media`     | 03-douyin-mini-program.md                         | 抖音图文 / 直播           | ✅ 已加 |
| `liveRoom`  | 03-douyin-mini-program.md                         | 直播间状态                | ✅ 已加 |
| `mount`     | 03-douyin-mini-program.md                         | 视频挂载点                | ✅ 已加 |
| `creator`   | 03-douyin-mini-program.md                         | 创作者中心                | ✅ 已加 |
| `marketing` | 05-official-website.md + 06-overseas-platforms.md | 落地页 / CTA / 营销文案   | ✅ 已加 |
| `forms`     | 05-official-website.md                            | 官网表单                  | ✅ 已加 |
| `seo`       | 05-official-website.md                            | 官网 SEO 元数据           | ✅ 已加 |
| `social`    | 06-overseas-platforms.md + 04-mobile-app.md       | 海外社交分享 / 绑定       | ✅ 已加 |
| `oauth`     | 06-overseas-platforms.md                          | OAuth 2.0 通用流程        | ✅ 已加 |

> **新增 namespace 流程**：在文档内提出 → 在本表登记 → 在 admin-prd §5.5.1 速查表登记（提 PR）

---

## 5. 端到端用户旅程示例

### 5.1 拉新转化旅程（FB → H5 → 微信小程序）

```
[FB 广告] → 用户点广告 → 跳 H5 注册页（5-official-website.md）
  ↓ 填写手机号 + OTP
[H5] → 调 /api/h5/auth/otp-login（admin-prd/05-profile.md）
  ↓ 注册成功，强制引导加微信（用 1-wechat-mini-program.md 的 wxLogin）
[H5 → 小程序] → 微信小程序 1-wechat-mini-program.md
  ↓ 绑定 unionid，分享名片给好友
[小程序] → 写 InvitationLog（admin-prd/05-profile.md）
  ↓ 好友扫码
[小程序 → H5] → 好友注册，新用户旅程开始
```

### 5.2 跨境支付旅程（移动 APP → Stripe → 萨摩亚银行）

```
[APP 用户] → 在 4-mobile-app.md 选服务 → Apple Pay / Google Pay
  ↓ 后端调 Stripe（8-infrastructure-architecture.md §5）
[Stripe] → Webhook → /api/h5/payments/stripe-callback
  ↓ 后端写 Transaction.refundedAmount（admin-prd/12-payment-console.md + 00-foundation §7.5）
[对账] → 萨摩亚银行（8-infrastructure-architecture.md §7）
  ↓ T+1 自动入账
[财务] → 自动同步 NetSuite
```

### 5.3 DID 链上签发旅程（移动 APP → MetaMask → Polygon）

```
[APP 用户] → 在 18-did-identity.md 申请 KYC 凭证
  ↓ KYC 通过（admin-prd/05-profile.md）
[后端] → 调 8-infrastructure-architecture.md §6 AI 智能体审核
  ↓ 签发 VC
[后端] → 锚定到 Polygon（8-infrastructure-architecture.md §7 萨摩亚合规）
  ↓ 用 4-mobile-app.md WalletConnect v2 触发用户钱包签名
[用户 MetaMask] → 签名后凭证正式上链
  ↓ 触发 17-notifications.md 推送
[用户] → 在 H5 / 小程序 / APP 任何端查看 VC（admin-prd/18-did-identity.md）
```

---

## 6. 实施依赖图

```
Sprint 1（基础设施）
├── ops-manual/00-production-readiness.md §1 部署架构
├── client-prd/08-infrastructure-architecture.md §1-4 技术选型
└── client-prd/09-dev-process-toolkit.md（团队培训）

Sprint 2（H5 打磨 + 第一个小程序）
├── client-prd/07-h5-function-optimization.md（P0 部分）
├── client-prd/01-wechat-mini-program.md（拉新主战场）
└── admin-prd/00-foundation.md KMS + 状态日志

Sprint 3（其他小程序 + APP）
├── client-prd/02-alipay-mini-program.md
├── client-prd/03-douyin-mini-program.md
└── client-prd/04-mobile-app.md（含 5 大海外社交集成）

Sprint 4（官网 + 海外平台）
├── client-prd/05-official-website.md
├── client-prd/06-overseas-platforms.md
└── client-prd/08-infrastructure-architecture.md §5 全球支付

Sprint 5（合规 + 生产标准化）
├── client-prd/08-infrastructure-architecture.md §7-8（萨摩亚 + VIE + ODI）
├── ops-manual/00-production-readiness.md §3-5（灾备 + 应急 + 合规）
└── admin-prd/00-foundation.md §11 KMS 全量接入
```

---

## 7. Reader Testing 历史

| 轮次 | 日期       | 发现                              | 修复     |
| ---- | ---------- | --------------------------------- | -------- |
| R1   | 2026-06-06 | 5 🔴 关键                         | ✅ 5/5   |
| R2   | 2026-06-06 | 3 🟡 小问题                       | ✅ 3/3   |
| R3   | 2026-06-06 | 10 个新盲点（6 🔴 + 4 🟡）        | ✅ 10/10 |
| R4   | （待跑）   | client-prd 9 篇 + ops-manual 1 篇 | —        |

---

## 8. 文档维护

- **更新频率**：每周一更新版本号
- **变更流程**：提 PR → Cross-file Check 全部勾选 → 至少 1 个 owner 审批
- **回滚**：每个 PR 关联 GitHub Issue 记录决策

---

**下一步**：

- (A) 跑 Round 4 Reader Testing 验证 10 篇新文档
- (B) 补 i18n 字典 4 语言 JSON 样例
- (C) 进入开发（Sprint 1 基础设施 + KMS）
