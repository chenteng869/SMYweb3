# 08-11 - 集成、自动化与路线图

> **来源**: MVP版本-DID制作文档.md (第2893~3553行)

---

## 八、n8n自动化工作流

### 8.1 工作流1: DID注册自动化

**触发条件**: Webhook `DID_CREATED`

**流程节点**:

```
Webhook (DID Created)
  ↓
HTTP Request (查询用户完整资料)
  ↓
IF (用户来源 = portal)
  ↓  YES
PostgreSQL (写入CRM表)
  ↓
Email (发送欢迎邮件 + KYC引导)
  ↓
Slack/Feishu (通知管理员: 新用户注册)
  ↓
END

  ↓ NO (用户来自其他平台)
HTTP Request (查询该平台特有权限模板)
  ↓
PostgreSQL (初始化平台权限记录)
  ↓
END
```

### 8.2 工作流2: KYC通过自动化

**触发条件**: Webhook `KYC_VERIFIED` (来自KYC服务商回调或人工审核通过)

**流程节点**:

```
Webhook (KYC Verified - provider_callback or manual_review)
  ↓
HTTP Request (更新KYC状态 → verified)
  ↓
HTTP Request (生成KYC Result Hash - SHA256)
  ↓
HTTP Request (调用DID API → updateKycHash + 激活DID)
  ↓
HTTP Request (调用SBT API → issueSBT type=KYC_VERIFIED)
  ↓
IF (SBT签发成功)
  ↓
Parallel (并行):
  ├─→ HTTP Request (同步电商权限 → platform=ecommerce, allowed=true)
  ├─→ HTTP Request (同步交易所权限 → platform=exchange, allowed=true)
  └─→ HTTP Request (同步博彩权限 → platform=gaming, allowed=true)
  ↓
Email (通知用户: KYC已通过，DID已激活)
  ↓
END

  ↓ (SBT签发失败)
Slack/Feishu (告警: SBT签发失败，需人工处理)
  ↓
HTTP Request (创建BPM任务: SBT签发失败复核)
  ↓
END
```

### 8.3 工作流3: DID冻结自动化

**触发条件**: Webhook `RISK_ALERT` (风控系统触发)

**流程节点**:

```
Webhook (Risk Alert - 风控系统触发)
  ↓
HTTP Request (查询当前DID状态和历史)
  ↓
IF (riskLevel >= high)
  ↓
HTTP Request (调用DID API → freezeDID)
  ↓
HTTP Request (标记相关SBT为失效)
  ↓
Parallel:
  ├─→ HTTP Request (通知电商: 禁止下单 → platform=ecommerce, allowed=false)
  ├─→ HTTP Request (通知交易所: 禁止交易/提现 → platform=exchange)
  └─→ HTTP Request (通知博彩: 禁止充值/提现/游戏 → platform=gaming)
  ↓
HTTP Request (创建BPM审批单: DID冻结复核)
  ↓
Email (通知用户: 您的账户已被临时限制)
  ↓
Slack/Feishu (通知合规团队: 高风险DID已冻结)
  ↓
HTTP Request (写入审计日志)
  ↓
END
```

### 8.4 工作流4: SBT签发自动化

**触发条件**: Webhook `SHOULD_ISSUE_SBT` (内部事件)

**流程节点**:

```
Webhook (Should Issue SBT)
  ↓
HTTP Request (查询DID当前凭证列表)
  ↓
IF (该类型SBT不存在 或 已撤销)
  ↓
HTTP Request (调用区块链合约 mintSBT)
  ↓
IF (链上mint成功)
  ↓
HTTP Request (保存token_id到数据库 sbt_credentials)
  ↓
HTTP Request (更新tx_hash)
  ↓
Email (通知用户新凭证已发放)
  ↓
END

  ↓ (链上mint失败)
Slack/Feishu (告警: 链上SBT mint失败)
  ↓
HTTP Request (创建重试任务，最多3次)
  ↓
END
```

---

## 九、BPM审批流程

### 9.1 KYC人工复核流程

```
用户提交KYC
  ↓
系统自动初筛 (OCR/人脸比对/名单匹配)
  ↓
IF (初筛通过)
  ↓
  自动通过 → 跳到 8.2 工作流2
  ↓
IF (初筛异常/分数低于阈值)
  ↓
BPM创建任务: KYC人工复核
  ↓
KYC审核员初审
  ├─→ 通过 → 合规官复审 → 通过 → 更新DID状态 → 审计归档
  ├─→ 驳回 → 通知用户补充资料 → 回到等待状态
  └─→ 转高风险 → 转AML流程
```

**BPM表单字段**:

- 申请ID / DID / 用户邮箱
- KYC提供商 / 提交时间
- 初筛分数 / 异常项列表
- 证件类型 / 国籍 / 年龄
- 审核意见 (通过/驳回/转AML)
- 驳回原因 (可选)
- 补充资料要求 (可选)

### 9.2 DID冻结审批流程

```
风控发起冻结请求
  ↓
填写冻结原因 + 风险等级 + 证据附件
  ↓
BPM创建任务: DID冻结审批 (优先级: HIGH)
  ↓
风控主管初审 (30分钟内)
  ├─→ 驳回 (理由不足) → 取消冻结 → 通知风控
  └→ 同意 → 转合规官复审
       ↓
       合规官复审 (2小时内)
       ├─→ 驳回 → 取消冻结
       └→ 同意 → 执行冻结
            ↓
            调用DID.freezeDID()
            → 撤销或标记SBT失效
            → 通知四个平台
            → 写入审计日志
            → 通知用户
```

### 9.3 DID解冻审批流程

```
用户申诉 / 客服提交解冻请求
  ↓
填写申诉理由 + 证明材料
  ↓
BPM创建任务: DID解冻审批
  ↓
客服初审 (材料完整性检查)
  ↓
风控复核 (风险评估)
  ↓
合规官最终审批
  ↓
同意 → 解冻DID → 恢复平台权限 → 写入审计日志 → 通知用户
驳回 → 维持冻结 → 通知用户原因
```

### 9.4 SBT撤销审批流程

```
发现凭证异常 (系统检测/人工发现/用户举报)
  ↓
管理员发起撤销请求
  ↓
填写撤销原因 + 凭证类型 + 证据
  ↓
BPM创建任务: SBT撤销审批
  ↓
合规官审批
  ↓
同意 → 调用SBT.revokeSBT() → 更新数据库 → 通知平台 → 审计归档
驳回 → 维持现状 → 记录审批结果
```

---

## 十、四平台打通接口文档

### 10.1 通用身份查询

**GET** `/api/did/identity/{did}`

返回完整的DID身份信息（供任意平台调用）:

```json
{
  "did": "did:zsdt:U202600000001",
  "userId": 10001,
  "status": "active",
  "kycStatus": "verified",
  "amlStatus": "cleared",
  "riskLevel": "low",
  "memberLevel": "gold",
  "primaryWallet": "0xabc123...",
  "activatedAt": "2026-06-01T00:00:00Z",
  "sbtCredentials": [...]
}
```

### 10.2 电商平台接入

#### 10.2.1 登录检查

```
GET /api/did/platform-access?did={did}&platform=ecommerce
```

电商判断维度: 是否可登录 / 会员等级 / NFT/SBT权益 / 优惠折扣 / 钱包地址 / 积分等级

#### 10.2.2 下单时订单绑定

```
POST /api/did/ecommerce/order-proof
Body: { did, orderId, orderHash, walletAddress }
用途: 订单哈希绑定DID，未来可写入私有链
```

### 10.3 交易所接入

#### 10.3.1 登录检查

```
GET /api/did/platform-access?did={did}&platform=exchange
```

交易所判断维度: KYC / AML / 风险等级 / 交易许可 / 提现许可 / 制裁名单

#### 10.3.2 提现前检查

```
POST /api/did/exchange/withdraw-check
Body: { did, asset, amount, toAddress }
Response: { allowed, riskLevel, needManualReview }
```

### 10.4 博彩平台接入

#### 10.4.1 登录检查

```
GET /api/did/platform-access?did={did}&platform=gaming
```

博彩判断维度: 成年 / KYC / 自我排除 / 冷静期 / 充值许可 / 提现许可 / 游戏许可 / AML / 营销触达

#### 10.4.2 充值前检查

```
POST /api/did/gaming/deposit-check
Body: { did, amount, currency }
Response: { allowed, reason }
```

#### 10.4.3 提现前检查

```
POST /api/did/gaming/withdraw-check
Body: { did, amount, currency }
Response: { allowed, needManualReview, reason }
```

---

## 十一、开发路线图

### P0: 第一阶段 (4-6周) — MVP

```
Week 1-2:
  ✅ 数据库设计与建表 (8张表)
  ✅ NestJS项目搭建 + 模块骨架
  ✅ DID注册API (/api/did/register)
  ✅ 钱包绑定API (/api/did/wallets/bind)

Week 3-4:
  ✅ Nonce生成与验证
  ✅ 钱包签名登录 (ethers.verifyMessage)
  ✅ JWT签发与中间件
  ✅ DID查询API (/api/did/:did)
  ✅ KYC状态绑定 (手动审核模式)

Week 5-6:
  ✅ SBT签发API (含合约交互)
  ✅ 平台权限查询API
  ✅ 审计日志记录 (拦截器自动记录)
  ✅ 基础管理后台 (DID列表/KYC审核/SBT管理)
  ✅ H5/小程序 DID页面 (ProfilePage扩展)
```

**交付物**: 可运行的DID MVP系统，支持注册/登录/KYC/SBT/查询

### P1: 第二阶段 (6-10周) — 增强

```
Week 7-8:
  ✅ 多钱包管理 (角色分离)
  ✅ BPM审批流集成 (4个审批流程)
  ✅ n8n自动化 (4个工作流)
  ✅ 四平台权限同步 (实时推送)

Week 9-10:
  ✅ SBT撤销流程
  ✅ DID冻结/解冻 (含审批)
  ✅ KYC人工审核后台 (完整UI)
  ✅ 合规报表 (基础统计)
```

**交付物**: 完整的DID运营系统，支持自动化和审批

### P2: 第三阶段 (10-16周) — 生态完善

```
Week 11-13:
  ✅ 私有链完整接入 (合约部署/监听/确认)
  ✅ 审计日志上链Hash (AuditHash合约)
  ✅ 交易所风控接口 (提现实时检查)

Week 14-15:
  ✅ 博彩责任博彩接口 (冷静期/自我排除/年龄验证)
  ✅ 电商NFT会员权益 (SBT权益查询)
  ✅ AI风控摘要 (大模型分析)

Week 16:
  ✅ 监管报表输出 (CSV/PDF)
  ✅ 性能优化 + 压力测试
  ✅ 安全审计 + 渗透测试
```

**交付物**: 生产级DID系统，满足合规要求

---

## 十二、最终架构总结

```
萨摩亚官网
  ↓
DID注册 + 钱包绑定 + KYC
  ↓
DID统一身份中台 (NestJS)
  ↓
SBT身份凭证 + 私有链Hash
  ↓
四个平台统一使用
  ├── Web3电商 (ecommerce)
  ├── 中萨数字科技交易所 (exchange)
  ├── 博彩网站 (gaming)
  └── 管理后台 (admin-web)
  ↓
n8n自动化 + BPM审批 + AI风控 + 审计日志
```

**第一版先做的最小可行闭环**:

```
DID注册 + 钱包签名登录 + KYC状态 + SBT凭证 + 平台权限查询
```

这就是支撑整个生态的最小可行DID系统。

---

_文档结束_
_原始文档: [MVP版本-DID制作文档.md](../../MVP版本-DID制作文档.md)_
_拆分完成时间: 2026-06-09_
