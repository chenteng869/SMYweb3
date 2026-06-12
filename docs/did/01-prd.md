# 01 - DID产品需求文档 (PRD)

> **来源**: MVP版本-DID制作文档.md (第1406~1895行)
> **状态**: PRD定稿

---

## 一、项目名称

**中萨数字科技 DID 统一身份系统**

- 英文名: ZSDT Digital DID Identity System
- DID命名空间: `did:zsdt:{user_no}`

---

## 二、系统目标

### 2.1 业务目标

1. 建立四个平台统一身份入口
2. 支持钱包签名登录（无密码）
3. 支持KYC状态绑定与跨平台同步
4. 支持SBT身份凭证发放与管理
5. 支持会员等级、风险等级、权限状态跨平台同步
6. 支持电商、交易所、博彩平台统一查询DID状态
7. 支持n8n自动化和BPM审批流
8. 支持链上身份哈希与链下隐私数据分离
9. 支持审计日志不可篡改
10. 支持未来扩展IoT设备DID、商户DID、机构DID

---

## 三、用户角色

| 角色       | 说明                                 |
| ---------- | ------------------------------------ |
| 普通用户   | 注册DID、绑定钱包、完成KYC           |
| 电商会员   | 使用DID享受会员折扣、积分、NFT权益   |
| 交易所用户 | 使用DID完成KYC后进入数字资产平台     |
| 博彩用户   | 使用DID验证年龄、KYC、责任博彩状态   |
| 商户       | 可申请商户DID                        |
| 管理员     | 管理用户DID、状态、风险              |
| KYC审核员  | 审核身份资料                         |
| AML合规员  | 处理高风险身份与可疑活动             |
| 风控人员   | 冻结、解冻、限制DID                  |
| 审计员     | 查看日志和凭证                       |
| 系统服务   | 电商、交易所、博彩通过API查询DID状态 |

---

## 四、DID生命周期

```
待注册 → 已创建 → 待KYC → KYC审核中 → 已认证 → 已激活 → 受限 → 冻结 → 撤销 → 注销
```

### 各状态说明

| 状态        | 说明                 | 可执行操作         |
| ----------- | -------------------- | ------------------ |
| pending     | 待注册/待审核        | 提交资料           |
| created     | 已创建，等待KYC      | 开始KYC流程        |
| kyc_pending | KYC审核中            | 等待审核结果       |
| verified    | 已认证，KYC通过      | 激活DID            |
| active      | 已激活，正常使用     | 全部功能可用       |
| restricted  | 受限（部分功能限制） | 需要补充资料或申诉 |
| frozen      | 冻结（风控触发）     | 需要BPM审批解冻    |
| revoked     | 撤销（SBT标记失效）  | 不可恢复           |
| deactivated | 注销（用户主动）     | 可重新注册新DID    |

---

## 五、DID核心业务流程

### 5.1 用户注册DID流程

```
用户进入萨摩亚官网
  → 点击注册DID
  → 输入邮箱/手机号
  → 连接钱包
  → 钱包签名验证
  → 系统创建User ID
  → 系统生成DID (did:zsdt:U202600000001)
  → 用户进入KYC流程
  → KYC通过
  → DID激活
  → 签发KYC Verified SBT
  → 同步到电商、交易所、博彩
```

### 5.2 钱包登录流程

```
用户点击钱包登录
  → 前端请求nonce
  → 用户钱包签名nonce
  → 后端验证签名 (ethers.verifyMessage)
  → 确认钱包归属
  → 查询钱包绑定DID
  → 检查DID状态
  → 签发JWT Token
  → 返回平台权限
  → 进入系统
```

### 5.3 KYC绑定流程

```
用户提交KYC资料
  → 第三方KYC服务商 或 人工审核
  → 审核通过
  → 系统生成KYC结果Hash (SHA256)
  → 更新DID kyc_status = 'verified'
  → 链上写入KYC Hash (DIDRegistry.updateKycHash)
  → 签发KYC Verified SBT (ZSDTSBT.issueSBT)
  → n8n通知四个平台同步
```

### 5.4 DID冻结流程

```
风控发现异常
  → 创建BPM审批单
  → 风控初审
  → 合规官复审
  → 冻结DID (status = 'frozen')
  → 撤销相关SBT或标记失效
  → 通知电商、交易所、博彩
  → 写入审计日志
```

---

## 六、DID系统功能模块详解

### 6.1 DID注册模块

**功能点**:

- 创建用户记录 (users表)
- 生成唯一DID标识 (did:zsdt:U{序号})
- 绑定邮箱/手机号
- 绑定主钱包地址
- 初始化身份状态为 pending
- 创建审计记录

**输入**: email, phone, walletAddress
**输出**: { did, status, userId }

---

### 6.2 钱包管理模块

**功能点**:

- 绑定钱包（支持多链多钱包）
- 解绑钱包（非主钱包可直接解绑）
- 设置主钱包（需签名验证）
- 多链钱包管理 (Ethereum, BSC, Polygon, etc.)
- 多钱包角色管理 (主/备/支付/交易所/电商/博彩)
- 钱包风险标记
- 钱包登录日志记录

**支持钱包**:
MetaMask, OKX, Bitget, Binance, Trust, WalletConnect, Phantom, Rabby, Coinbase

---

### 6.3 KYC模块

**功能点**:

- KYC申请提交
- 资料上传（证件照/人脸等）
- 第三方KYC回调对接
- 人工审核界面
- 驳回与补充资料
- KYC状态更新
- KYC Hash生成 (SHA256 of encrypted data)
- SBT自动签发（KYC通过后）

**重要原则**: KYC原始资料不允许明文上链，只保存Hash或状态值。

---

### 6.4 SBT凭证模块

**支持的凭证类型**:

| 类型代码              | 名称      | 说明               |
| --------------------- | --------- | ------------------ |
| KYC_VERIFIED          | KYC已认证 | 用户已完成身份验证 |
| MEMBER                | 生态会员  | 普通平台会员       |
| VIP                   | 高级会员  | 高等级付费会员     |
| MERCHANT              | 商户      | 已认证商户身份     |
| AML_CLEARED           | AML合规   | 通过反洗钱审查     |
| RESPONSIBLE_GAMING_OK | 责任博彩  | 博彩合规状态       |
| EXCHANGE_ALLOWED      | 交易许可  | 允许使用交易所     |
| ECOSYSTEM_USER        | 生态用户  | 萨摩亚生态参与者   |

**SBT规则**:

- 基于 ERC721 改造
- 禁止 transferFrom / safeTransferFrom（revert）
- 仅 ISSUER_ROLE 可签发
- 仅 REVOKER_ROLE 可撤销
- 每个凭证记录: did, type, level, issuedAt, revokedAt, revoked

---

### 6.5 跨平台SSO模块

**支持平台**:

- 萨摩亚官网 (portal)
- Web3电商平台 (ecommerce)
- 中萨数字科技交易所 (exchange)
- 博彩网站 (gaming)

**统一返回格式**:

```json
{
  "did": "did:zsdt:U202600000001",
  "userId": 10001,
  "kycStatus": "verified",
  "riskLevel": "low",
  "memberLevel": "gold",
  "platformPermissions": {
    "ecommerce": { "login": true, "discount": true },
    "exchange": { "login": true, "trade": true, "withdraw": true },
    "gaming": { "login": true, "deposit": true, "play": true }
  }
}
```

---

### 6.6 风控与合规模块

**功能点**:

- DID冻结 / 解冻
- 高风险标记
- 黑名单管理
- 地区限制
- 年龄限制
- AML状态同步
- 责任博彩状态同步
- 风控日志

---

### 6.7 审计日志模块

**必须记录的操作**:

- DID创建
- 钱包绑定 / 解绑
- 主钱包变更
- KYC状态变更
- SBT签发 / 撤销
- DID冻结 / 解冻
- 跨平台授权变更
- API调用记录
- 管理员操作

每条日志包含: userId, did, action, module, target, beforeData, afterData, ip, userAgent, timestamp

---

## 七、MVP范围定义

### 第一版必须完成 (P0)

```text
✅ DID注册
✅ 钱包绑定
✅ 钱包签名登录
✅ KYC状态绑定
✅ SBT签发
✅ DID状态查询
✅ 四平台权限查询
✅ 基础后台管理
✅ 审计日志
✅ n8n通知接口
✅ BPM审批接口
```

### 第二版增加 (P1)

```text
多钱包管理
多平台SSO完整实现
BPM审批流前端
n8n自动化工作流
AI辅助风控
DID权限中心
多链支持
SBT撤销流程
合规报表
```

### 第三版增加 (P2)

```text
交易所身份权限细化
博彩责任博彩状态
电商会员权益体系
DAO投票身份
商户DID认证
IoT设备DID支持
链上审计Hash存证
监管报表输出
```

---

_下一节_: [02-database.md](./02-database.md) — 数据库设计
