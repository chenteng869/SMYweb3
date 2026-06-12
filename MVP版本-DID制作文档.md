# MVP版本\-DID制作文档

可以，**DID系统可以开发出来**。

但要先明确：DID不是一个单独页面，而是一整套**身份协议 \+ 钱包绑定 \+ KYC状态 \+ 凭证签发 \+ 链上/链下数据存证 \+ 多平台统一登录**系统。

你这个生态里，DID应该作为四个平台的统一身份底座：

1. DApp \+ Web3电商平台；

2. 中萨数字科技交易所；

3. 博彩网站；

4. 萨摩亚官网。

也就是说，用户只需要完成一次身份注册、钱包绑定、KYC认证，就可以在四个平台中被统一识别和授权。

---

# 一、结论：可以开发，建议先做MVP版本

## DID MVP可以先实现这些功能

```Plain Text
1. 用户注册DID
2. 钱包绑定
3. 钱包签名登录
4. KYC状态绑定
5. 发放SBT身份凭证
6. DID身份查询
7. 跨平台统一登录
8. 权限与会员等级同步
9. DID资料更新
10. 审计日志记录
```

第一版不要做太复杂，先做：

> **DID身份 \+ 钱包登录 \+ KYC状态 \+ SBT凭证 \+ 四个平台统一识别**

---

# 二、你们的DID系统应该长什么样？

## 2\.1 DID核心结构

每个用户对应一个 DID，例如：

```Plain Text
did:samoa:8f3a91b7c2e944a9
```

或者：

```Plain Text
did:zsdigital:0xAbc123...
```

也可以直接基于钱包地址：

```Plain Text
did:wallet:0xAbc123456789
```

但我更建议你们用自有命名空间：

```Plain Text
did:zsdt:{unique_id}
```

例如：

```Plain Text
did:zsdt:U202600000001
```

---

# 三、DID系统核心模块

## 3\.1 DID注册模块

用户通过萨摩亚官网注册身份。

流程：

```Plain Text
用户进入官网
→ 输入邮箱/手机号
→ 绑定钱包
→ 钱包签名验证
→ 创建用户ID
→ 生成DID
→ 进入KYC流程
→ KYC通过后激活DID
```

---

## 3\.2 钱包绑定模块

支持用户绑定多个钱包：

```Plain Text
MetaMask
OKX Wallet
Bitget Wallet
Binance Web3 Wallet
Trust Wallet
WalletConnect
Phantom
Rabby
Coinbase Wallet
```

每个用户可以有：

```Plain Text
主钱包
备用钱包
支付钱包
交易所钱包
电商钱包
博彩钱包，需隔离
```

---

## 3\.3 钱包签名登录

登录不靠密码，靠钱包签名。

流程：

```Plain Text
前端生成nonce
→ 用户钱包签名nonce
→ 后端验证签名
→ 确认钱包归属
→ 签发登录Token
→ 进入系统
```

这样可以实现：

```Plain Text
一个钱包
→ 登录官网
→ 登录电商
→ 登录交易所
→ 登录博彩平台
```

但要注意博彩和交易所仍然需要KYC和风控权限判断。

---

## 3\.4 KYC状态绑定

KYC资料不要上链，只把状态或哈希上链。

链下保存：

```Plain Text
姓名
证件号
护照
地址
出生日期
KYC图片
人脸识别结果
```

链上只保存：

```Plain Text
DID
KYC状态
KYC结果哈希
认证时间
认证机构
凭证ID
```

例如：

```JSON
{
  "did": "did:zsdt:U202600000001",
  "kyc_status": "verified",
  "kyc_hash": "0x9a8b7c...",
  "verified_at": "2026-01-01",
  "issuer": "ZSDT Compliance"
}
```

---

## 3\.5 SBT身份凭证

SBT是不可转让的身份凭证，适合你们这个生态。

可以发放这些SBT：

| SBT类型                | 用途                     |
| ---------------------- | ------------------------ |
| KYC Verified SBT       | 表示用户已完成KYC        |
| Member SBT             | 表示平台会员身份         |
| Merchant SBT           | 表示商户身份             |
| VIP SBT                | 表示高等级会员           |
| AML Cleared SBT        | 表示通过合规审查         |
| Samoa Ecosystem SBT    | 表示生态用户             |
| Responsible Gaming SBT | 博彩合规状态凭证，内部用 |

注意：

- SBT不可转让；

- SBT不应暴露隐私；

- SBT只表示状态，不显示证件信息。

---

# 四、DID怎么打通四个平台？

## 4\.1 萨摩亚官网

作为统一入口。

```Plain Text
官网
→ DID注册
→ 钱包绑定
→ KYC认证
→ SBT发放
→ 生态入口分发
```

官网是：

```Plain Text
身份入口
合规入口
执照展示入口
用户协议入口
隐私政策入口
DID查询入口
```

---

## 4\.2 Web3电商平台

电商使用DID判断：

```Plain Text
用户身份
会员等级
NFT会员权益
Token积分
订单归属
钱包支付权限
优惠权益
```

流程：

```Plain Text
用户用DID登录电商
→ 系统读取会员等级
→ 读取NFT/SBT
→ 展示专属价格
→ 下单
→ 订单哈希绑定DID
→ 支付成功
→ 增加成长值和积分
```

---

## 4\.3 中萨数字科技交易所

交易所使用DID判断：

```Plain Text
是否完成KYC
是否允许交易
是否高风险
是否可提现
是否通过AML
是否绑定主钱包
```

流程：

```Plain Text
用户用DID登录交易所
→ 检查KYC
→ 检查AML
→ 检查地区
→ 检查风险等级
→ 允许资产查看/交易/提现
```

---

## 4\.4 博彩网站

博彩系统使用DID判断：

```Plain Text
是否成年
是否完成KYC
是否自我排除
是否处于冷静期
是否允许充值
是否允许提现
是否命中AML风险
是否允许营销触达
```

流程：

```Plain Text
用户用DID登录博彩
→ 检查年龄
→ 检查KYC
→ 检查责任博彩状态
→ 检查AML
→ 允许进入游戏
```

---

# 五、DID系统技术架构

## 5\.1 推荐技术栈

| 层级     | 技术                     |
| -------- | ------------------------ |
| 前端     | Next\.js / React         |
| 钱包连接 | Wagmi \+ RainbowKit      |
| 后端     | NestJS                   |
| 数据库   | PostgreSQL               |
| 缓存     | Redis                    |
| 区块链   | 私有链 / EVM兼容链       |
| 合约     | Solidity \+ OpenZeppelin |
| 合约开发 | Hardhat / Foundry        |
| 凭证     | Verifiable Credentials   |
| SBT      | ERC721改造 / ERC1155改造 |
| 自动化   | n8n                      |
| 审批     | BPM                      |
| AI       | 大模型 \+ RAG            |
| 审计日志 | OpenSearch               |

---

# 六、DID系统架构图

```Plain Text
用户浏览器
  ↓
萨摩亚官网 DID Portal
  ↓
钱包连接 Wagmi / RainbowKit
  ↓
DID Backend API
  ├── 用户服务
  ├── 钱包服务
  ├── KYC服务
  ├── 凭证服务
  ├── SBT服务
  ├── 权限服务
  ├── 审计日志服务
  └── 跨平台SSO服务
  ↓
数据库 PostgreSQL
  ↓
私有链 / 联盟链
  ├── DID Registry Contract
  ├── SBT Identity Contract
  ├── Credential Hash Contract
  └── Audit Hash Contract
  ↓
业务平台
  ├── Web3电商
  ├── 数字科技交易所
  ├── 博彩网站
  └── 管理后台
```

---

# 七、DID数据库设计

## 7\.1 users 用户表

```SQL
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  user_no VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(128),
  phone VARCHAR(32),
  status VARCHAR(32) DEFAULT 'active',
  risk_level VARCHAR(32) DEFAULT 'low',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7\.2 did_identities DID身份表

```SQL
CREATE TABLE did_identities (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  did VARCHAR(128) UNIQUE NOT NULL,
  did_method VARCHAR(64) NOT NULL,
  status VARCHAR(32) DEFAULT 'pending',
  kyc_status VARCHAR(32) DEFAULT 'unverified',
  primary_wallet VARCHAR(128),
  credential_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7\.3 wallet_accounts 钱包账户表

```SQL
CREATE TABLE wallet_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  did VARCHAR(128),
  wallet_address VARCHAR(128) NOT NULL,
  chain_id VARCHAR(32) NOT NULL,
  wallet_type VARCHAR(64),
  is_primary BOOLEAN DEFAULT FALSE,
  signature_nonce VARCHAR(255),
  linked_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);
```

---

## 7\.4 kyc_records KYC记录表

```SQL
CREATE TABLE kyc_records (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  did VARCHAR(128),
  provider VARCHAR(64),
  kyc_status VARCHAR(32) DEFAULT 'pending',
  full_name_encrypted TEXT,
  document_type VARCHAR(64),
  document_no_encrypted TEXT,
  birth_date_encrypted TEXT,
  country VARCHAR(64),
  verification_result JSONB,
  result_hash VARCHAR(255),
  reviewed_by BIGINT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7\.5 sbt_credentials SBT凭证表

```SQL
CREATE TABLE sbt_credentials (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  did VARCHAR(128) NOT NULL,
  wallet_address VARCHAR(128) NOT NULL,
  contract_address VARCHAR(128),
  token_id VARCHAR(128),
  credential_type VARCHAR(64),
  credential_level VARCHAR(64),
  chain_id VARCHAR(32),
  status VARCHAR(32) DEFAULT 'active',
  issued_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);
```

---

## 7\.6 did_audit_logs DID审计日志

```SQL
CREATE TABLE did_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  did VARCHAR(128),
  action VARCHAR(128) NOT NULL,
  target_type VARCHAR(64),
  target_id VARCHAR(128),
  before_data JSONB,
  after_data JSONB,
  ip VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 八、DID智能合约设计

## 8\.1 DIDRegistry 合约

功能：

```Plain Text
注册DID
绑定钱包
更新状态
查询DID
冻结DID
注销DID
记录KYC哈希
```

核心字段：

```Solidity
struct DIDRecord {
    string did;
    address owner;
    string status;
    string kycHash;
    uint256 createdAt;
    uint256 updatedAt;
}
```

---

## 8\.2 SBTIdentity 合约

基于 ERC721 改造为不可转让。

功能：

```Plain Text
mintSBT
revokeSBT
getCredential
checkCredential
```

限制：

```Plain Text
禁止transfer
禁止approve
仅管理员/合规角色可签发
```

---

## 8\.3 AuditHash 合约

只保存审计日志哈希。

```Plain Text
event AuditHashRecorded(
  string did,
  string action,
  bytes32 dataHash,
  uint256 timestamp
);
```

作用：

- 防篡改；

- 可验证；

- 不暴露隐私。

---

# 九、DID API接口设计

## 9\.1 注册DID

```HTTP
POST /api/did/register
```

请求：

```JSON
{
  "email": "user@example.com",
  "phone": "+685xxxx",
  "walletAddress": "0xabc..."
}
```

返回：

```JSON
{
  "did": "did:zsdt:U202600000001",
  "status": "pending"
}
```

---

## 9\.2 钱包签名登录

```HTTP
POST /api/did/wallet-login
```

请求：

```JSON
{
  "walletAddress": "0xabc...",
  "nonce": "random_nonce",
  "signature": "0xsignature"
}
```

返回：

```JSON
{
  "token": "jwt",
  "did": "did:zsdt:U202600000001",
  "userId": "10001"
}
```

---

## 9\.3 绑定钱包

```HTTP
POST /api/did/wallets/bind
```

请求：

```JSON
{
  "did": "did:zsdt:U202600000001",
  "walletAddress": "0xabc...",
  "chainId": "1",
  "signature": "0xsignature"
}
```

---

## 9\.4 查询DID状态

```HTTP
GET /api/did/{did}
```

返回：

```JSON
{
  "did": "did:zsdt:U202600000001",
  "status": "active",
  "kycStatus": "verified",
  "primaryWallet": "0xabc...",
  "memberLevel": "gold"
}
```

---

## 9\.5 签发SBT

```HTTP
POST /api/did/sbt/issue
```

请求：

```JSON
{
  "did": "did:zsdt:U202600000001",
  "walletAddress": "0xabc...",
  "credentialType": "KYC_VERIFIED",
  "credentialLevel": "standard"
}
```

---

## 9\.6 撤销SBT

```HTTP
POST /api/did/sbt/revoke
```

请求：

```JSON
{
  "did": "did:zsdt:U202600000001",
  "tokenId": "123",
  "reason": "KYC revoked"
}
```

---

# 十、DID和n8n怎么配合？

## 10\.1 DID注册自动化

```Plain Text
用户注册DID
→ n8n触发KYC任务
→ KYC通过
→ n8n调用DID API激活身份
→ 调用SBT接口发放KYC凭证
→ 通知用户
→ 同步到电商/交易所/博彩
```

---

## 10\.2 DID风险变化自动化

```Plain Text
AML系统标记高风险
→ n8n接收Webhook
→ 更新DID风险等级
→ 限制交易所提现
→ 限制博彩提现
→ 通知合规人员
→ BPM创建复核任务
```

---

# 十一、DID和BPM怎么配合？

DID相关需要审批的流程：

```Plain Text
KYC人工复核
DID冻结
DID解冻
SBT撤销
高风险用户复核
商户DID认证
交易所大额提现
博彩高风险提现
数据导出
```

示例：

```Plain Text
用户KYC异常
→ BPM创建复核流程
→ KYC审核员初审
→ 合规官复审
→ 更新DID状态
→ 写入审计日志
```

---

# 十二、DID和AI大模型怎么配合？

AI可以做辅助：

```Plain Text
KYC资料摘要
风险用户画像
AML案件摘要
跨平台行为分析
客服问答
DID身份异常分析
用户权益推荐
自动生成合规报告草稿
```

但AI不能直接做最终决定：

```Plain Text
不能自动封禁DID
不能自动拒绝KYC
不能自动批准提现
不能自动删除身份
```

---

# 十三、DID开发周期估算

## MVP版本：4到6周

包含：

```Plain Text
DID注册
钱包绑定
钱包签名登录
KYC状态绑定
SBT签发
DID查询
基础后台
审计日志
```

## 标准版本：8到12周

增加：

```Plain Text
多钱包
多平台SSO
BPM审批
n8n自动化
AI辅助风控
DID权限中心
多链支持
SBT撤销
合规报表
```

## 完整生态版：3到6个月

增加：

```Plain Text
交易所身份权限
博彩责任博彩状态
电商会员权益
DAO投票身份
商户DID
IoT设备DID
链上审计
监管报表
```

---

# 十四、我能帮你做到什么程度？

我可以继续帮你输出：

1. **DID系统完整PRD**

2. **DID数据库SQL**

3. **DID智能合约代码**

4. **NestJS后端项目结构**

5. **Next\.js前端页面结构**

6. **钱包签名登录代码**

7. **SBT合约代码**

8. **n8n工作流设计**

9. **BPM审批流程**

10. **DID与电商/交易所/博彩打通接口文档**

也就是说，我可以把开发文档、架构、接口、数据库、合约、代码提示词都给你整理出来。

---

# 十五、最终答案

**DID可以开发出来。**

你们这个项目最适合的DID模式是：

```Plain Text
萨摩亚官网作为DID入口
+
钱包签名登录
+
KYC状态绑定
+
SBT身份凭证
+
私有链记录身份哈希
+
四个平台统一识别
```

第一版先做：

```Plain Text
DID注册
钱包绑定
KYC绑定
SBT凭证
统一登录
跨平台身份查询
```

这就是最小可行版本，能真正支撑你后面的：

- Web3电商；

- 中萨数字科技交易所；

- 博彩网站；

- 萨摩亚官网；

- Token；

- 私有链；

- AI自动化；

- n8n；

- BPM；

- IoT。

---

# DID统一身份系统开发文档包 V1\.0

## 覆盖：PRD / 数据库SQL / 智能合约 / NestJS结构 / Next\.js结构 / 钱包签名登录 / SBT合约 / n8n / BPM / 四平台接口

---

## 一、DID系统定位

本DID系统用于打通以下四个平台：

1. **DApp \+ Web3\.0 电商平台**

2. **中萨数字科技交易所**

3. **持牌博彩网站**

4. **萨摩亚官网 / DID门户**

核心目标是：

> 用户通过一次注册、一次钱包绑定、一次KYC认证，获得统一DID身份，并在电商、交易所、博彩、官网之间实现统一识别、权限控制、会员权益、风控联动和审计追踪。

---

# 第一部分：DID系统完整PRD

---

## 1\. 项目名称

**中萨数字科技 DID统一身份系统**

建议英文名：

```Plain Text
ZS Digital DID Identity System
```

建议DID命名空间：

```Plain Text
did:zsdt:{user_no}
```

示例：

```Plain Text
did:zsdt:U202600000001
```

---

## 2\. 系统目标

### 2\.1 业务目标

1. 建立四个平台统一身份入口；

2. 支持钱包签名登录；

3. 支持KYC状态绑定；

4. 支持SBT身份凭证；

5. 支持会员等级、风险等级、权限状态跨平台同步；

6. 支持电商、交易所、博彩平台统一查询DID状态；

7. 支持n8n自动化和BPM审批流；

8. 支持链上身份哈希与链下隐私数据分离；

9. 支持审计日志不可篡改；

10. 支持未来扩展IoT设备DID、商户DID、机构DID。

---

## 3\. 用户角色

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

## 4\. DID生命周期

```Plain Text
待注册
→ 已创建
→ 待KYC
→ KYC审核中
→ 已认证
→ 已激活
→ 受限
→ 冻结
→ 撤销
→ 注销
```

---

## 5\. DID核心流程

### 5\.1 用户注册DID流程

```Plain Text
用户进入萨摩亚官网
→ 点击注册DID
→ 输入邮箱/手机号
→ 连接钱包
→ 钱包签名验证
→ 系统创建User ID
→ 系统生成DID
→ 用户进入KYC流程
→ KYC通过
→ DID激活
→ 签发KYC Verified SBT
→ 同步到电商、交易所、博彩
```

---

### 5\.2 钱包登录流程

```Plain Text
用户点击钱包登录
→ 前端请求nonce
→ 用户钱包签名nonce
→ 后端验证签名
→ 查询钱包绑定DID
→ 检查DID状态
→ 签发JWT
→ 返回平台权限
```

---

### 5\.3 KYC绑定流程

```Plain Text
用户提交KYC
→ 第三方KYC或人工审核
→ 审核通过
→ 系统生成KYC结果Hash
→ 更新DID kyc_status
→ 链上写入KYC Hash
→ 签发KYC SBT
→ n8n通知四个平台
```

---

### 5\.4 DID冻结流程

```Plain Text
风控发现异常
→ 创建BPM审批
→ 风控初审
→ 合规复审
→ 冻结DID
→ 撤销相关SBT或标记失效
→ 通知电商、交易所、博彩
→ 写入审计日志
```

---

## 6\. DID系统功能模块

### 6\.1 DID注册模块

功能：

- 创建用户；

- 生成DID；

- 绑定邮箱/手机号；

- 绑定钱包；

- 生成身份状态；

- 创建审计记录。

---

### 6\.2 钱包管理模块

功能：

- 绑定钱包；

- 解绑钱包；

- 设置主钱包；

- 钱包签名登录；

- 多链钱包管理；

- 多钱包管理；

- 钱包风险标记；

- 钱包登录日志。

支持钱包：

```Plain Text
MetaMask
OKX Wallet
Bitget Wallet
Binance Web3 Wallet
Trust Wallet
WalletConnect
Rabby
Coinbase Wallet
Phantom
```

---

### 6\.3 KYC模块

功能：

- KYC申请；

- 资料上传；

- 第三方KYC回调；

- 人工审核；

- 驳回；

- 补充资料；

- KYC状态更新；

- KYC Hash生成；

- SBT签发。

注意：

> KYC原始资料不允许明文上链，只允许保存Hash或状态。

---

### 6\.4 SBT凭证模块

支持凭证：

| SBT类型               | 用途                 |
| --------------------- | -------------------- |
| KYC_VERIFIED          | 已完成KYC            |
| MEMBER                | 普通生态会员         |
| VIP                   | 高等级会员           |
| MERCHANT              | 商户身份             |
| AML_CLEARED           | AML通过              |
| RESPONSIBLE_GAMING_OK | 博彩责任博彩状态合规 |
| EXCHANGE_ALLOWED      | 允许进入交易所       |
| ECOSYSTEM_USER        | 生态用户凭证         |

---

### 6\.5 跨平台SSO模块

支持四个平台登录：

```Plain Text
萨摩亚官网
Web3电商
中萨数字科技交易所
博彩网站
```

统一返回：

```JSON
{
  "did": "did:zsdt:U202600000001",
  "userId": 10001,
  "kycStatus": "verified",
  "riskLevel": "low",
  "memberLevel": "gold",
  "platformPermissions": {
    "ecommerce": true,
    "exchange": true,
    "gaming": true
  }
}
```

---

### 6\.6 风控与合规模块

功能：

- DID冻结；

- DID解冻；

- 高风险标记；

- 黑名单；

- 地区限制；

- 年龄限制；

- AML状态同步；

- 责任博彩状态同步；

- 风控日志。

---

### 6\.7 审计日志模块

必须记录：

- DID创建；

- 钱包绑定；

- 钱包解绑；

- 主钱包变更；

- KYC状态变更；

- SBT签发；

- SBT撤销；

- DID冻结；

- DID解冻；

- 跨平台授权；

- API调用；

- 管理员操作。

---

## 7\. MVP范围

第一版必须完成：

```Plain Text
DID注册
钱包绑定
钱包签名登录
KYC状态绑定
SBT签发
DID状态查询
四平台权限查询
基础后台
审计日志
n8n通知
BPM审批接口
```

---

# 第二部分：DID数据库SQL

以下使用 PostgreSQL。

---

## 1\. 用户表 users

```SQL
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    user_no VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(128),
    phone VARCHAR(32),
    password_hash VARCHAR(255),
    status VARCHAR(32) DEFAULT 'active',
    risk_level VARCHAR(32) DEFAULT 'low',
    country VARCHAR(64),
    source_platform VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);
```

---

## 2\. DID身份表 did_identities

```SQL
CREATE TABLE did_identities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    did VARCHAR(128) UNIQUE NOT NULL,
    did_method VARCHAR(64) NOT NULL DEFAULT 'zsdt',
    status VARCHAR(32) DEFAULT 'pending',
    kyc_status VARCHAR(32) DEFAULT 'unverified',
    aml_status VARCHAR(32) DEFAULT 'unchecked',
    risk_level VARCHAR(32) DEFAULT 'low',
    member_level VARCHAR(32) DEFAULT 'standard',
    primary_wallet VARCHAR(128),
    credential_hash VARCHAR(255),
    chain_tx_hash VARCHAR(255),
    activated_at TIMESTAMP,
    frozen_at TIMESTAMP,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_did_user_id ON did_identities(user_id);
CREATE INDEX idx_did_status ON did_identities(status);
CREATE INDEX idx_did_kyc_status ON did_identities(kyc_status);
CREATE INDEX idx_did_primary_wallet ON did_identities(primary_wallet);
```

---

## 3\. 钱包账户表 wallet_accounts

```SQL
CREATE TABLE wallet_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    did VARCHAR(128),
    wallet_address VARCHAR(128) NOT NULL,
    chain_id VARCHAR(32) NOT NULL,
    wallet_type VARCHAR(64),
    is_primary BOOLEAN DEFAULT FALSE,
    risk_status VARCHAR(32) DEFAULT 'normal',
    signature_nonce VARCHAR(255),
    linked_at TIMESTAMP DEFAULT NOW(),
    unlinked_at TIMESTAMP,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(wallet_address, chain_id)
);

CREATE INDEX idx_wallet_user_id ON wallet_accounts(user_id);
CREATE INDEX idx_wallet_did ON wallet_accounts(did);
CREATE INDEX idx_wallet_address ON wallet_accounts(wallet_address);
```

---

## 4\. 钱包登录Nonce表 wallet_nonces

```SQL
CREATE TABLE wallet_nonces (
    id BIGSERIAL PRIMARY KEY,
    wallet_address VARCHAR(128) NOT NULL,
    nonce VARCHAR(255) NOT NULL,
    purpose VARCHAR(64) DEFAULT 'login',
    expired_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wallet_nonces_address ON wallet_nonces(wallet_address);
CREATE INDEX idx_wallet_nonces_nonce ON wallet_nonces(nonce);
```

---

## 5\. KYC记录表 kyc_records

```SQL
CREATE TABLE kyc_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    did VARCHAR(128),
    provider VARCHAR(64),
    kyc_status VARCHAR(32) DEFAULT 'pending',
    full_name_encrypted TEXT,
    document_type VARCHAR(64),
    document_no_encrypted TEXT,
    birth_date_encrypted TEXT,
    country VARCHAR(64),
    address_encrypted TEXT,
    verification_result JSONB,
    result_hash VARCHAR(255),
    rejection_reason TEXT,
    reviewed_by BIGINT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kyc_user_id ON kyc_records(user_id);
CREATE INDEX idx_kyc_did ON kyc_records(did);
CREATE INDEX idx_kyc_status ON kyc_records(kyc_status);
```

---

## 6\. SBT凭证表 sbt_credentials

```SQL
CREATE TABLE sbt_credentials (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    did VARCHAR(128) NOT NULL,
    wallet_address VARCHAR(128) NOT NULL,
    contract_address VARCHAR(128),
    token_id VARCHAR(128),
    credential_type VARCHAR(64) NOT NULL,
    credential_level VARCHAR(64),
    chain_id VARCHAR(32),
    status VARCHAR(32) DEFAULT 'active',
    tx_hash VARCHAR(255),
    metadata_uri TEXT,
    issued_by BIGINT,
    issued_at TIMESTAMP DEFAULT NOW(),
    revoked_by BIGINT,
    revoked_at TIMESTAMP,
    revoke_reason TEXT
);

CREATE INDEX idx_sbt_user_id ON sbt_credentials(user_id);
CREATE INDEX idx_sbt_did ON sbt_credentials(did);
CREATE INDEX idx_sbt_wallet ON sbt_credentials(wallet_address);
CREATE INDEX idx_sbt_type ON sbt_credentials(credential_type);
```

---

## 7\. 平台权限表 did_platform_permissions

```SQL
CREATE TABLE did_platform_permissions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    did VARCHAR(128) NOT NULL,
    platform VARCHAR(64) NOT NULL,
    allowed BOOLEAN DEFAULT FALSE,
    permission_status VARCHAR(32) DEFAULT 'pending',
    reason TEXT,
    updated_by BIGINT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(did, platform)
);

CREATE INDEX idx_platform_permissions_did ON did_platform_permissions(did);
CREATE INDEX idx_platform_permissions_platform ON did_platform_permissions(platform);
```

---

## 8\. DID审计日志 did_audit_logs

```SQL
CREATE TABLE did_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    did VARCHAR(128),
    admin_id BIGINT,
    action VARCHAR(128) NOT NULL,
    module VARCHAR(64),
    target_type VARCHAR(64),
    target_id VARCHAR(128),
    before_data JSONB,
    after_data JSONB,
    reason TEXT,
    ip VARCHAR(64),
    user_agent TEXT,
    data_hash VARCHAR(255),
    chain_tx_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_did_audit_did ON did_audit_logs(did);
CREATE INDEX idx_did_audit_action ON did_audit_logs(action);
CREATE INDEX idx_did_audit_created ON did_audit_logs(created_at);
```

---

# 第三部分：DID智能合约代码

以下合约适用于 EVM 私有链 / 联盟链。

---

## 1\. DIDRegistry\.sol

```Solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DIDRegistry {
    address public owner;

    struct DIDRecord {
        string did;
        address wallet;
        string status;
        string kycHash;
        string metadataHash;
        uint256 createdAt;
        uint256 updatedAt;
    }

    mapping(string => DIDRecord) private didRecords;
    mapping(address => string) private walletToDid;
    mapping(address => bool) public operators;

    event DIDRegistered(string indexed did, address indexed wallet, uint256 timestamp);
    event DIDUpdated(string indexed did, string status, uint256 timestamp);
    event WalletBound(string indexed did, address indexed wallet, uint256 timestamp);
    event KycHashUpdated(string indexed did, string kycHash, uint256 timestamp);
    event DIDFrozen(string indexed did, uint256 timestamp);
    event DIDRevoked(string indexed did, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == owner || operators[msg.sender], "NOT_OPERATOR");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setOperator(address operator, bool allowed) external onlyOwner {
        operators[operator] = allowed;
    }

    function registerDID(
        string calldata did,
        address wallet,
        string calldata metadataHash
    ) external onlyOperator {
        require(bytes(didRecords[did].did).length == 0, "DID_EXISTS");
        require(bytes(walletToDid[wallet]).length == 0, "WALLET_BOUND");

        didRecords[did] = DIDRecord({
            did: did,
            wallet: wallet,
            status: "pending",
            kycHash: "",
            metadataHash: metadataHash,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        walletToDid[wallet] = did;

        emit DIDRegistered(did, wallet, block.timestamp);
    }

    function bindWallet(string calldata did, address wallet) external onlyOperator {
        require(bytes(didRecords[did].did).length > 0, "DID_NOT_FOUND");
        require(bytes(walletToDid[wallet]).length == 0, "WALLET_ALREADY_BOUND");

        didRecords[did].wallet = wallet;
        didRecords[did].updatedAt = block.timestamp;
        walletToDid[wallet] = did;

        emit WalletBound(did, wallet, block.timestamp);
    }

    function updateKycHash(string calldata did, string calldata kycHash) external onlyOperator {
        require(bytes(didRecords[did].did).length > 0, "DID_NOT_FOUND");

        didRecords[did].kycHash = kycHash;
        didRecords[did].status = "active";
        didRecords[did].updatedAt = block.timestamp;

        emit KycHashUpdated(did, kycHash, block.timestamp);
        emit DIDUpdated(did, "active", block.timestamp);
    }

    function freezeDID(string calldata did) external onlyOperator {
        require(bytes(didRecords[did].did).length > 0, "DID_NOT_FOUND");

        didRecords[did].status = "frozen";
        didRecords[did].updatedAt = block.timestamp;

        emit DIDFrozen(did, block.timestamp);
    }

    function revokeDID(string calldata did) external onlyOperator {
        require(bytes(didRecords[did].did).length > 0, "DID_NOT_FOUND");

        didRecords[did].status = "revoked";
        didRecords[did].updatedAt = block.timestamp;

        emit DIDRevoked(did, block.timestamp);
    }

    function getDID(string calldata did) external view returns (DIDRecord memory) {
        require(bytes(didRecords[did].did).length > 0, "DID_NOT_FOUND");
        return didRecords[did];
    }

    function getDIDByWallet(address wallet) external view returns (string memory) {
        return walletToDid[wallet];
    }
}
```

---

# 第四部分：SBT合约代码

---

## 1\. ZSDTSBT\.sol

```Solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ZSDTSBT is ERC721, AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");

    uint256 private _tokenIdCounter;

    struct Credential {
        string did;
        string credentialType;
        string credentialLevel;
        bool revoked;
        uint256 issuedAt;
        uint256 revokedAt;
    }

    mapping(uint256 => Credential) public credentials;
    mapping(string => uint256[]) private didToTokens;

    event SBTIssued(
        uint256 indexed tokenId,
        address indexed to,
        string did,
        string credentialType,
        uint256 timestamp
    );

    event SBTRevoked(
        uint256 indexed tokenId,
        string reason,
        uint256 timestamp
    );

    constructor() ERC721("ZSDT Identity SBT", "ZID") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
        _grantRole(REVOKER_ROLE, msg.sender);
    }

    function issueSBT(
        address to,
        string calldata did,
        string calldata credentialType,
        string calldata credentialLevel
    ) external onlyRole(ISSUER_ROLE) returns (uint256) {
        require(to != address(0), "INVALID_TO");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _safeMint(to, tokenId);

        credentials[tokenId] = Credential({
            did: did,
            credentialType: credentialType,
            credentialLevel: credentialLevel,
            revoked: false,
            issuedAt: block.timestamp,
            revokedAt: 0
        });

        didToTokens[did].push(tokenId);

        emit SBTIssued(tokenId, to, did, credentialType, block.timestamp);

        return tokenId;
    }

    function revokeSBT(uint256 tokenId, string calldata reason) external onlyRole(REVOKER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "TOKEN_NOT_FOUND");
        require(!credentials[tokenId].revoked, "ALREADY_REVOKED");

        credentials[tokenId].revoked = true;
        credentials[tokenId].revokedAt = block.timestamp;

        emit SBTRevoked(tokenId, reason, block.timestamp);
    }

    function getTokensByDID(string calldata did) external view returns (uint256[] memory) {
        return didToTokens[did];
    }

    function isValid(uint256 tokenId) external view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "TOKEN_NOT_FOUND");
        return !credentials[tokenId].revoked;
    }

    /**
     * @dev 禁止SBT转让
     */
    function transferFrom(address, address, uint256) public pure override {
        revert("SBT_NON_TRANSFERABLE");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("SBT_NON_TRANSFERABLE");
    }

    function safeTransferFrom(address, address, uint256) public pure override {
        revert("SBT_NON_TRANSFERABLE");
    }
}
```

---

# 第五部分：NestJS后端项目结构

---

## 1\. 项目结构

```Plain Text
did-backend/
  src/
    main.ts
    app.module.ts

    common/
      decorators/
        current-user.decorator.ts
        permissions.decorator.ts
      guards/
        jwt-auth.guard.ts
        permission.guard.ts
      interceptors/
        audit-log.interceptor.ts
      filters/
        http-exception.filter.ts
      utils/
        crypto.util.ts
        hash.util.ts
        did.util.ts

    modules/
      auth/
        auth.module.ts
        auth.controller.ts
        auth.service.ts
        jwt.strategy.ts
        dto/

      users/
        users.module.ts
        users.controller.ts
        users.service.ts
        dto/

      did/
        did.module.ts
        did.controller.ts
        did.service.ts
        did.repository.ts
        dto/

      wallets/
        wallets.module.ts
        wallets.controller.ts
        wallets.service.ts
        dto/

      kyc/
        kyc.module.ts
        kyc.controller.ts
        kyc.service.ts
        dto/

      sbt/
        sbt.module.ts
        sbt.controller.ts
        sbt.service.ts
        dto/

      platform-access/
        platform-access.module.ts
        platform-access.controller.ts
        platform-access.service.ts

      audit/
        audit.module.ts
        audit.service.ts
        audit.controller.ts

      bpm/
        bpm.module.ts
        bpm.service.ts
        bpm.controller.ts

      n8n/
        n8n.module.ts
        n8n.service.ts

      blockchain/
        blockchain.module.ts
        blockchain.service.ts
        contracts/
          did-registry.abi.json
          sbt.abi.json

    prisma/
      prisma.module.ts
      prisma.service.ts
```

---

## 2\. 核心接口模块

| 模块             | 职责                      |
| ---------------- | ------------------------- |
| auth             | JWT登录、钱包登录         |
| did              | DID注册、查询、激活、冻结 |
| wallets          | 钱包绑定、解绑、nonce     |
| kyc              | KYC状态、KYC回调          |
| sbt              | SBT签发、撤销、查询       |
| platform\-access | 电商/交易所/博彩权限查询  |
| audit            | 审计日志                  |
| bpm              | 审批流程对接              |
| n8n              | 自动化Webhook             |
| blockchain       | 合约交互                  |

---

# 第六部分：钱包签名登录代码

---

## 1\. 安装依赖

```Bash
npm install ethers @nestjs/jwt
```

---

## 2\. 生成Nonce接口

```TypeScript
// wallets.service.ts
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

@Injectable()
export class WalletsService {
  async createNonce(walletAddress: string) {
    const nonce = `Login nonce: ${randomBytes(16).toString('hex')}`;

    // TODO: 保存到 wallet_nonces 表，设置5分钟过期
    return {
      walletAddress,
      nonce,
      expiredAt: new Date(Date.now() + 5 * 60 * 1000),
    };
  }
}
```

---

## 3\. 验证签名登录

```TypeScript
// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ethers } from 'ethers';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async walletLogin(params: {
    walletAddress: string;
    nonce: string;
    signature: string;
  }) {
    const { walletAddress, nonce, signature } = params;

    const recoveredAddress = ethers.verifyMessage(nonce, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new UnauthorizedException('Invalid wallet signature');
    }

    // TODO:
    // 1. 查询nonce是否存在
    // 2. 检查nonce是否过期
    // 3. 检查nonce是否已使用
    // 4. 查询wallet_accounts
    // 5. 查询did_identities

    const user = {
      id: 10001,
      did: 'did:zsdt:U202600000001',
      walletAddress,
    };

    const token = this.jwtService.sign({
      sub: user.id,
      did: user.did,
      walletAddress,
    });

    return {
      token,
      user,
    };
  }
}
```

---

## 4\. Controller示例

```TypeScript
// auth.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('/api/did/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/wallet-login')
  async walletLogin(
    @Body()
    body: {
      walletAddress: string;
      nonce: string;
      signature: string;
    },
  ) {
    return this.authService.walletLogin(body);
  }
}
```

---

# 第七部分：Next\.js前端页面结构

---

## 1\. 项目结构

```Plain Text
did-portal/
  app/
    page.tsx
    register/
      page.tsx
    login/
      page.tsx
    dashboard/
      page.tsx
    wallets/
      page.tsx
    kyc/
      page.tsx
    credentials/
      page.tsx
    ecosystem/
      page.tsx
    admin/
      did/
      kyc/
      sbt/
      audit/

  components/
    WalletConnectButton.tsx
    DIDCard.tsx
    KYCStatusCard.tsx
    SBTList.tsx
    PlatformAccessCard.tsx

  lib/
    wagmi.ts
    api.ts
    auth.ts

  hooks/
    useDID.ts
    useWalletLogin.ts
```

---

## 2\. 页面说明

| 页面         | 功能         |
| ------------ | ------------ |
| /            | DID官网首页  |
| /register    | 注册DID      |
| /login       | 钱包签名登录 |
| /dashboard   | DID身份首页  |
| /wallets     | 钱包管理     |
| /kyc         | KYC认证      |
| /credentials | SBT凭证      |
| /ecosystem   | 四个平台入口 |
| /admin/did   | DID管理      |
| /admin/kyc   | KYC审核      |
| /admin/sbt   | SBT签发      |
| /admin/audit | 审计日志     |

---

## 3\. 钱包登录前端代码

```TypeScript
'use client';

import { useAccount, useSignMessage } from 'wagmi';
import { useState } from 'react';

export default function WalletLoginButton() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!address) return;

    setLoading(true);

    try {
      const nonceRes = await fetch('/api/proxy/wallets/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });

      const { nonce } = await nonceRes.json();

      const signature = await signMessageAsync({
        message: nonce,
      });

      const loginRes = await fetch('/api/proxy/auth/wallet-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, nonce, signature }),
      });

      const data = await loginRes.json();

      localStorage.setItem('did_token', data.token);

      window.location.href = '/dashboard';
    } catch (err) {
      console.error(err);
      alert('Wallet login failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return Please connect wallet first;
  }

  return (

      {loading ? 'Signing...' : 'Sign in with Wallet'}

  );
}
```

---

# 第八部分：n8n工作流设计

---

## 1\. DID注册自动化

### 流程

```Plain Text
Webhook: DID Created
→ 查询用户资料
→ 创建KYC任务
→ 发送邮件/短信通知
→ 写入CRM
→ 通知管理员
```

### 节点

```Plain Text
Webhook
HTTP Request
PostgreSQL
IF
Email
Slack/Feishu
```

---

## 2\. KYC通过自动化

```Plain Text
KYC Provider Webhook
→ 更新KYC状态
→ 调用DID激活接口
→ 调用SBT签发接口
→ 同步电商权限
→ 同步交易所权限
→ 同步博彩权限
→ 通知用户
```

---

## 3\. DID冻结自动化

```Plain Text
风控系统触发
→ n8n接收Webhook
→ 调用DID冻结接口
→ 通知电商禁止下单
→ 通知交易所禁止交易/提现
→ 通知博彩禁止充值/提现/游戏
→ 创建BPM复核流程
→ 写入审计日志
```

---

## 4\. SBT签发自动化

```Plain Text
KYC Verified
→ 调用SBT合约mint
→ 保存token_id
→ 更新sbt_credentials
→ 通知用户
```

---

# 第九部分：BPM审批流程

---

## 1\. KYC人工复核

```Plain Text
用户提交KYC
→ 系统初筛异常
→ KYC审核员初审
→ 合规官复审
→ 通过/驳回/补充资料
→ 更新DID状态
→ 审计归档
```

---

## 2\. DID冻结审批

```Plain Text
风控发起冻结
→ 风控主管审批
→ 合规官复核
→ 执行冻结
→ 通知四个平台
→ 写入审计日志
```

---

## 3\. DID解冻审批

```Plain Text
用户申诉
→ 客服提交
→ 风控复核
→ 合规审批
→ 解冻DID
→ 恢复平台权限
→ 写入审计日志
```

---

## 4\. SBT撤销审批

```Plain Text
发现凭证异常
→ 管理员发起撤销
→ 合规审批
→ 调用SBT revoke
→ 更新数据库
→ 通知平台
```

---

# 第十部分：DID与电商/交易所/博彩打通接口文档

---

## 1\. 通用身份查询接口

### GET /api/did/identity/\{did\}

返回：

```JSON
{
  "did": "did:zsdt:U202600000001",
  "userId": 10001,
  "status": "active",
  "kycStatus": "verified",
  "amlStatus": "cleared",
  "riskLevel": "low",
  "memberLevel": "gold",
  "primaryWallet": "0xabc...",
  "sbtCredentials": [
    {
      "type": "KYC_VERIFIED",
      "status": "active"
    }
  ]
}
```

---

## 2\. 平台权限查询接口

### GET /api/did/platform\-access

请求参数：

```Plain Text
did=did:zsdt:U202600000001
platform=ecommerce / exchange / gaming
```

返回：

```JSON
{
  "did": "did:zsdt:U202600000001",
  "platform": "gaming",
  "allowed": true,
  "reason": "KYC verified and risk level low",
  "permissions": {
    "login": true,
    "deposit": true,
    "withdraw": true,
    "trade": false,
    "play": true
  }
}
```

---

# 3\. 电商平台接入

## 3\.1 电商登录检查

```HTTP
GET /api/did/platform-access?did={did}&platform=ecommerce
```

电商使用DID判断：

```Plain Text
是否可登录
会员等级
NFT/SBT权益
优惠折扣
钱包地址
积分等级
```

---

## 3\.2 电商下单时调用

```HTTP
POST /api/did/ecommerce/order-proof
```

请求：

```JSON
{
  "did": "did:zsdt:U202600000001",
  "orderId": "EC202600001",
  "orderHash": "0xorderhash",
  "walletAddress": "0xabc..."
}
```

用途：

```Plain Text
订单哈希绑定DID
未来可写入私有链
```

---

# 4\. 交易所接入

## 4\.1 交易所登录检查

```HTTP
GET /api/did/platform-access?did={did}&platform=exchange
```

交易所判断：

```Plain Text
KYC是否通过
AML是否通过
风险等级
是否允许交易
是否允许提现
是否命中制裁名单
```

---

## 4\.2 交易所提现前检查

```HTTP
POST /api/did/exchange/withdraw-check
```

请求：

```JSON
{
  "did": "did:zsdt:U202600000001",
  "asset": "USDT",
  "amount": "1000",
  "toAddress": "0xdef..."
}
```

返回：

```JSON
{
  "allowed": true,
  "riskLevel": "low",
  "needManualReview": false
}
```

---

# 5\. 博彩平台接入

## 5\.1 博彩登录检查

```HTTP
GET /api/did/platform-access?did={did}&platform=gaming
```

博彩判断：

```Plain Text
是否成年
KYC是否通过
AML是否通过
是否自我排除
是否冷静期
是否允许充值
是否允许提现
是否允许游戏
```

---

## 5\.2 博彩充值前检查

```HTTP
POST /api/did/gaming/deposit-check
```

请求：

```JSON
{
  "did": "did:zsdt:U202600000001",
  "amount": "100",
  "currency": "USD"
}
```

返回：

```JSON
{
  "allowed": true,
  "reason": "User eligible for deposit"
}
```

---

## 5\.3 博彩提现前检查

```HTTP
POST /api/did/gaming/withdraw-check
```

请求：

```JSON
{
  "did": "did:zsdt:U202600000001",
  "amount": "500",
  "currency": "USD"
}
```

返回：

```JSON
{
  "allowed": false,
  "needManualReview": true,
  "reason": "AML review required"
}
```

---

# 第十一部分：开发优先级

---

## P0：第一阶段，4到6周

```Plain Text
DID注册
钱包绑定
钱包签名登录
KYC状态绑定
SBT签发
DID查询
平台权限查询
基础审计日志
```

---

## P1：第二阶段，6到10周

```Plain Text
BPM审批
n8n自动化
四平台权限同步
SBT撤销
DID冻结/解冻
KYC人工审核后台
```

---

## P2：第三阶段，10到16周

```Plain Text
私有链完整接入
审计日志上链Hash
交易所风控接口
博彩责任博彩接口
电商NFT会员权益
AI风控摘要
```

---

# 第十二部分：最终架构总结

你的DID系统最终应成为整个生态的身份底座：

```Plain Text
萨摩亚官网
  ↓
DID注册 + 钱包绑定 + KYC
  ↓
DID统一身份中台
  ↓
SBT身份凭证 + 私有链Hash
  ↓
四个平台统一使用
  ├── Web3电商
  ├── 中萨数字科技交易所
  ├── 持牌博彩网站
  └── 管理后台
  ↓
n8n自动化 + BPM审批 + AI风控 + 审计日志
```

第一版先做：

```Plain Text
DID
+
钱包签名登录
+
KYC状态
+
SBT凭证
+
平台权限查询
```

这就是最小可行闭环。
