# 04 - RESTful API 接口设计

> **来源**: MVP版本-DID制作文档.md (第859~1060行)
> **Base Path**: `/api/did`
> **认证方式**: JWT Bearer Token / 钱包签名
> **格式**: JSON

---

## 接口总览

| 方法   | 路径                         | 说明          | 认证        |
| ------ | ---------------------------- | ------------- | ----------- |
| POST   | `/api/did/register`          | 注册DID       | None        |
| POST   | `/api/did/auth/wallet-login` | 钱包签名登录  | None        |
| GET    | `/api/did/auth/nonce`        | 获取登录Nonce | None        |
| POST   | `/api/did/wallets/bind`      | 绑定钱包      | JWT         |
| DELETE | `/api/did/wallets/:address`  | 解绑钱包      | JWT         |
| GET    | `/api/did/:did`              | 查询DID状态   | JWT/API Key |
| PUT    | `/api/did/:did/profile`      | 更新DID资料   | JWT         |
| POST   | `/api/did/kyc/submit`        | 提交KYC申请   | JWT         |
| GET    | `/api/did/kyc/status`        | 查询KYC状态   | JWT         |
| POST   | `/api/did/sbt/issue`         | 签发SBT       | Admin       |
| POST   | `/api/did/sbt/revoke`        | 撤销SBT       | Admin       |
| GET    | `/api/did/sbt/list`          | 查询SBT列表   | JWT         |
| GET    | `/api/did/platform-access`   | 平台权限查询  | API Key     |
| GET    | `/api/did/audit/logs`        | 审计日志查询  | Admin       |
| POST   | `/api/did/admin/freeze`      | 冻结DID       | Admin       |
| POST   | `/api/did/admin/unfreeze`    | 解冻DID       | Admin       |

---

## 1. 注册DID

**POST** `/api/did/register`

### 请求

```json
{
  "email": "user@example.com",
  "phone": "+685xxxx",
  "walletAddress": "0xabc123..."
}
```

### 响应 (201 Created)

```json
{
  "success": true,
  "data": {
    "did": "did:zsdt:U202600000001",
    "status": "pending",
    "userId": 10001,
    "message": "DID已创建，请完成KYC认证以激活"
  }
}
```

### 错误码

| HTTP Code | 错误                 | 说明                |
| --------- | -------------------- | ------------------- |
| 400       | WALLET_ALREADY_BOUND | 该钱包已绑定其他DID |
| 409       | EMAIL_EXISTS         | 邮箱已被注册        |
| 500       | INTERNAL_ERROR       | 服务端错误          |

---

## 2. 获取Nonce

**GET** `/api/did/auth/nonce?walletAddress=0xabc...`

### 响应 (200 OK)

```json
{
  "success": true,
  "data": {
    "walletAddress": "0xabc123...",
    "nonce": "Login nonce: a1b2c3d4e5f6...",
    "expiredAt": "2026-06-09T18:35:00Z"
  }
}
```

**注意**: Nonce 有效期 5 分钟，一次性使用。

---

## 3. 钱包签名登录

**POST** `/api/did/auth/wallet-login`

### 请求

```json
{
  "walletAddress": "0xabc123...",
  "nonce": "Login nonce: a1b2c3d4e5f6...",
  "signature": "0xabcdef1234567890..."
}
```

### 响应 (200 OK)

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 86400,
    "did": "did:zsdt:U202600000001",
    "userId": 10001,
    "kycStatus": "verified",
    "status": "active"
  }
}
```

### 流程说明

```
1. 前端调用 GET /auth/nonce?walletAddress=0x... 获取随机Nonce
2. 前端调用 eth_sign / personalSign 让用户对Nonce签名
3. 前端将 walletAddress + nonce + signature 发送到此接口
4. 后端使用 ethers.verifyMessage(nonce, signature) 恢复地址
5. 对比恢复地址与请求地址是否一致
6. 查询 wallet_accounts 表找到对应的 user 和 did
7. 检查 did 状态（非 frozen / revoked）
8. 签发 JWT Token 返回
```

---

## 4. 绑定钱包

**POST** `/api/did/wallets/bind`

### Headers

```
Authorization: Bearer <JWT_TOKEN>
```

### 请求

```json
{
  "walletAddress": "0xdef456...",
  "chainId": "56",
  "walletType": "metamask",
  "role": "payment",
  "signature": "0xsignature..."
}
```

### 响应 (201 Created)

```json
{
  "success": true,
  "data": {
    "id": 2001,
    "walletAddress": "0xdef456...",
    "chainId": "56",
    "role": "payment",
    "isPrimary": false,
    "linkedAt": "2026-06-09T18:36:00Z"
  }
}
```

---

## 5. 查询DID状态

**GET** `/api/did/{did}`

示例: `GET /api/did/did:zsdt:U202600000001`

### 响应 (200 OK)

```json
{
  "success": true,
  "data": {
    "did": "did:zsdt:U202600000001",
    "userId": 10001,
    "status": "active",
    "kycStatus": "verified",
    "amlStatus": "cleared",
    "riskLevel": "low",
    "memberLevel": "gold",
    "primaryWallet": "0xabc123...",
    "activatedAt": "2026-06-01T00:00:00Z",
    "sbtCredentials": [
      {
        "type": "KYC_VERIFIED",
        "level": "standard",
        "status": "active",
        "issuedAt": "2026-06-01T00:00:00Z"
      },
      {
        "type": "MEMBER",
        "level": "gold",
        "status": "active",
        "issuedAt": "2026-06-01T00:00:00Z"
      }
    ]
  }
}
```

---

## 6. 签发SBT

**POST** `/api/did/sbt/issue`

### Headers

```
Authorization: Bearer <ADMIN_JWT_TOKEN>
X-Admin-Role: issuer
```

### 请求

```json
{
  "did": "did:zsdt:U202600000001",
  "walletAddress": "0xabc123...",
  "credentialType": "KYC_VERIFIED",
  "credentialLevel": "standard"
}
```

### 响应 (201 Created)

```json
{
  "success": true,
  "data": {
    "tokenId": "42",
    "contractAddress": "0xContractAddr...",
    "txHash": "0xTxHash...",
    "type": "KYC_VERIFIED",
    "level": "standard",
    "status": "active",
    "issuedAt": "2026-06-09T18:37:00Z"
  }
}
```

### 支持的 credentialType 枚举

```
KYC_VERIFIED
MEMBER
VIP
MERCHANT
AML_CLEARED
RESPONSIBLE_GAMING_OK
EXCHANGE_ALLOWED
ECOSYSTEM_USER
```

---

## 7. 撤销SBT

**POST** `/api/did/sbt/revoke`

### 请求

```json
{
  "did": "did:zsdt:U202600000001",
  "tokenId": "42",
  "reason": "KYC revoked due to policy violation"
}
```

### 响应 (200 OK)

```json
{
  "success": true,
  "data": {
    "tokenId": "42",
    "status": "revoked",
    "revokedAt": "2026-06-09T18:38:00Z",
    "reason": "KYC revoked due to policy violation"
  }
}
```

---

## 8. 平台权限查询

**GET** `/api/did/platform-access`

### Query Parameters

| 参数     | 必填 | 说明                                   |
| -------- | ---- | -------------------------------------- |
| did      | 是   | DID标识符                              |
| platform | 是   | portal / ecommerce / exchange / gaming |

### 示例请求

```
GET /api/did/platform-access?did=did:zsdt:U202600000001&platform=gaming
```

### 响应 (200 OK)

```json
{
  "success": true,
  "data": {
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
    },
    "kycStatus": "verified",
    "amlStatus": "cleared",
    "riskLevel": "low",
    "ageVerified": true,
    "responsibleGamingStatus": "ok",
    "checkedAt": "2026-06-09T18:39:00Z"
  }
}
```

### 各平台权限差异

| 权限     | Portal | Ecommerce | Exchange | Gaming |
| -------- | ------ | --------- | -------- | ------ |
| login    | ✓      | ✓         | ✓        | ✓      |
| deposit  | -      | -         | ✓        | ✓      |
| withdraw | -      | ✓         | ✓        | ✓      |
| trade    | -      | -         | ✓        | -      |
| play     | -      | -         | -        | ✓      |
| discount | -      | ✓         | -        | -      |

---

## 9. 审计日志查询

**GET** `/api/did/audit/logs`

### Query Parameters

| 参数      | 必填 | 默认值 | 说明           |
| --------- | ---- | ------ | -------------- |
| did       | 否   | -      | 按DID筛选      |
| action    | 否   | -      | 按操作类型筛选 |
| module    | 否   | -      | 按模块筛选     |
| page      | 否   | 1      | 页码           |
| pageSize  | 否   | 20     | 每页条数       |
| startDate | 否   | -      | 开始日期       |
| endDate   | 否   | -      | 结束日期       |

### 响应 (200 OK)

```json
{
  "success": true,
  "data": {
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "items": [
      {
        "id": 9001,
        "did": "did:zsdt:U202600000001",
        "action": "kyc:verified",
        "module": "kyc",
        "targetType": "kyc_record",
        "targetId": "101",
        "adminId": null,
        "ip": "203.0.113.1",
        "createdAt": "2026-06-09T17:00:00Z"
      }
    ]
  }
}
```

---

## 10. DID管理接口（管理员）

### 10.1 冻结DID

**POST** `/api/did/admin/freeze`

```json
{
  "did": "did:zsdt:U202600000001",
  "reason": "Suspicious activity detected - AML alert triggered"
}
```

### 10.2 解冻DID

**POST** `/api/did/admin/unfreeze`

```json
{
  "did": "did:zsdt:U202600000001",
  "reason": "Review completed - no violation found"
}
```

---

## 错误响应格式

所有接口的错误响应统一格式：

```json
{
  "success": false,
  "error": {
    "code": "DID_NOT_FOUND",
    "message": "指定的DID不存在",
    "details": null
  },
  "timestamp": "2026-06-09T18:40:00Z"
}
```

### 错误码枚举

| 错误码                  | HTTP | 说明             |
| ----------------------- | ---- | ---------------- |
| DID_NOT_FOUND           | 404  | DID不存在        |
| DID_ALREADY_EXISTS      | 409  | DID已存在        |
| WALLET_ALREADY_BOUND    | 400  | 钱包已绑定       |
| INVALID_SIGNATURE       | 401  | 签名验证失败     |
| NONCE_EXPIRED           | 401  | Nonce已过期      |
| NONCE_USED              | 401  | Nonce已使用      |
| DID_FROZEN              | 403  | DID已被冻结      |
| DID_REVOKED             | 403  | DID已撤销        |
| KYC_REQUIRED            | 403  | 需要先完成KYC    |
| PERMISSION_DENIED       | 403  | 无权限           |
| INVALID_CREDENTIAL_TYPE | 400  | 不合法的凭证类型 |
| PLATFORM_NOT_ALLOWED    | 403  | 该平台不允许访问 |
| RATE_LIMITED            | 429  | 请求过于频繁     |

---

_下一节_: [05-wallet-login.md](./05-wallet-login.md) — 钱包签名登录完整代码
