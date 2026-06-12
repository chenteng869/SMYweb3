# SMYWeb3 API 文档补充说明

> **API版本**: v1.0  
> **Base URL**: `https://admin.smyweb3.com/api/v1`  
> **协议**: HTTPS (TLS 1.2+)  
> **数据格式**: JSON (Content-Type: application/json)  
> **字符编码**: UTF-8  
> **最后更新**: 2026-06-11

---

## 目录

- [基础信息](#基础信息)
- [认证机制](#认证机制)
- [统一错误响应格式](#统一错误响应格式)
- [DID身份管理模块](#module-did-identity)
- [区块链存证模块](#module-blockchain-evidence)
- [电子签名模块](#module-e-signature)
- [AI模型服务模块](#module-ai-models)
- [OpenClaw智能体模块](#module-openclaw-agents)
- [全球获客系统模块](#module-acquisition)
- [n8n工作流集成模块](#module-n8n-integration)
- [WebSocket事件协议](#websocket-events)

---

## 基础信息

### Base URL

```
生产环境: https://admin.smyweb3.com/api/v1
预发布:   https://staging-admin.smyweb3.com/api/v1
开发环境: http://localhost:3001/api/v1
```

### 通用请求头

| Header            | 必填               | 说明                           | 示例                 |
| ----------------- | ------------------ | ------------------------------ | -------------------- |
| `Content-Type`    | POST/PUT/PATCH必填 | 请求体类型                     | `application/json`   |
| `Authorization`   | 除公开接口外必填   | Bearer JWT Token               | `Bearer eyJhbGci...` |
| `X-Request-ID`    | 可选               | 请求追踪ID（如不传则自动生成） | `uuid-v4-string`     |
| `Accept-Language` | 可选               | 响应语言偏好                   | `zh-CN`, `en-US`     |
| `X-API-Version`   | 可选               | API版本覆盖                    | `v1`                 |

### 通用响应头

| Header                  | 说明                        |
| ----------------------- | --------------------------- |
| `X-Request-ID`          | 请求唯一标识，用于问题追踪  |
| `X-RateLimit-Limit`     | 该接口的速率限制（次/分钟） |
| `X-RateLimit-Remaining` | 剩余可用次数                |
| `X-RateLimit-Reset`     | 限制重置时间（Unix时间戳）  |

---

## 认证机制

### JWT Token 认证

所有需要认证的接口（除 `/health`, `/metrics` 外）均使用 **Bearer Token** 方式认证。

#### 获取Token

**POST** `/auth/login`

```json
// Request
{
    "username": "operator@smyweb3.com",
    "password": "your_password",
    "captcha_key": "session_captcha_key",   // 验证码key（登录失败3次后要求）
    "captcha_code": "ABCD"                   // 验证码值
}

// Response 200
{
    "success": true,
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
        "token_type": "Bearer",
        "expires_in": 86400,           // access_token有效期：24小时
        "refresh_expires_in": 604800   // refresh_token有效期：7天
    }
}
```

#### 使用Token

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 刷新Token

**POST** `/auth/refresh`

```json
// Request
{
    "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}

// Response 200
{
    "success": true,
    "data": {
        "access_token": "new_access_token...",
        "expires_in": 86400
    }
}
```

#### Token权限级别

| 角色        | 权限范围      | Token前缀 |
| ----------- | ------------- | --------- |
| super_admin | 全部权限      | -         |
| admin       | 业务操作权限  | -         |
| operator    | 只读+基础操作 | -         |
| viewer      | 只读权限      | -         |

---

## 统一错误响应格式

所有API错误均遵循以下统一格式：

```json
{
  "success": false,
  "statusCode": 401,
  "error": "UNAUTHORIZED",
  "message": "未授权或Token已过期",
  "timestamp": "2026-06-11T10:00:00.000Z",
  "path": "/api/v1/auth/profile",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "details": []
}
```

### HTTP状态码说明

| 状态码 | 含义           | 触发场景                     |
| ------ | -------------- | ---------------------------- |
| 200    | 成功           | 请求正常处理完成             |
| 201    | 创建成功       | 资源创建成功（POST）         |
| 204    | 无内容         | 删除成功或无返回数据         |
| 400    | 请求参数错误   | 参数缺失、格式错误、校验失败 |
| 401    | 未认证         | 缺少Token、Token无效/过期    |
| 403    | 权限不足       | 有Token但无权访问该资源      |
| 404    | 资源不存在     | URL路径或资源ID无效          |
| 409    | 资源冲突       | 唯一约束冲突、状态冲突       |
| 422    | 实体验证失败   | 业务规则校验未通过           |
| 429    | 请求过于频繁   | 触发速率限制                 |
| 500    | 服务器内部错误 | 未预期的异常                 |
| 502    | 上游服务不可用 | 依赖的外部服务异常           |
| 503    | 服务暂不可用   | 维护中或过载                 |

### 错误码枚举

| error字段             | statusCode | 说明                   |
| --------------------- | ---------- | ---------------------- |
| `INVALID_PARAMS`      | 400        | 请求参数格式错误       |
| `VALIDATION_FAILED`   | 422        | 数据验证失败           |
| `UNAUTHORIZED`        | 401        | 未提供有效凭据         |
| `TOKEN_EXPIRED`       | 401        | Token已过期            |
| `FORBIDDEN`           | 403        | 无权限访问             |
| `NOT_FOUND`           | 404        | 资源不存在             |
| `CONFLICT`            | 409        | 资源冲突（如重复创建） |
| `RATE_LIMITED`        | 429        | 请求频率超限           |
| `INTERNAL_ERROR`      | 500        | 服务器内部错误         |
| `SERVICE_UNAVAILABLE` | 503        | 依赖服务不可用         |

---

## Module: DID Identity (`/did/*`)

DID（去中心化身份）管理模块，支持基于ERC-721标准的数字身份注册、查询和管理。

### DID身份列表

**GET** `/did/identities`

获取当前用户可管理的DID身份列表。

| 参数      | 类型    | 位置  | 必填 | 说明                                      |
| --------- | ------- | ----- | ---- | ----------------------------------------- |
| page      | integer | query | 否   | 页码，默认1                               |
| pageSize  | integer | query | 否   | 每页数量，默认20，最大100                 |
| status    | string  | query | 否   | 筛选状态：active/inactive/pending/revoked |
| keyword   | string  | query | 否   | 关键词搜索（名称/DID）                    |
| sortBy    | string  | query | 否   | 排序字段：createdAt/updatedAt/name        |
| sortOrder | string  | query | 否   | 排序方向：asc/desc                        |

**Auth**: ✅ Required (`Bearer token`)

**Rate Limit**: 60次/分钟

**Response 200**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "did_smy_001",
        "did": "did:smy:0x1234567890abcdef...abc",
        "name": "张三的DID身份",
        "type": "individual", // individual / organization
        "status": "active",
        "chainId": 1, // 以太坊主网
        "contractAddress": "0xAbC...xYz",
        "tokenId": "12345",
        "createdAt": "2026-05-15T08:30:00Z",
        "updatedAt": "2026-06-10T14:22:00Z"
      },
      {
        "id": "did_smy_002",
        "did": "did:smy:0xfedcba9876543210...fed",
        "name": "SMYWeb3企业身份",
        "type": "organization",
        "status": "active",
        "chainId": 1,
        "contractAddress": "0xAbC...xYz",
        "tokenId": "12346",
        "createdAt": "2026-06-01T10:00:00Z",
        "updatedAt": "2026-06-11T09:15:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 156,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**Error Codes**: 401, 403, 429

---

### 注册新DID身份

**POST** `/did/identities`

创建新的去中心化身份。

**Request Body**:

```json
{
  "name": "我的DID身份",
  "type": "individual",
  "metadata": {
    "description": "用于业务场景的去中心化身份",
    "tags": ["personal", "primary"]
  }
}
```

| 字段     | 类型   | 必填 | 说明         | 约束                          |
| -------- | ------ | ---- | ------------ | ----------------------------- |
| name     | string | ✅   | 身份显示名称 | 2-50字符                      |
| type     | string | ✅   | 身份类型     | 枚举: individual/organization |
| metadata | object | ❌   | 扩展元数据   | 最大2KB                       |

**Response 201**:

```json
{
  "success": true,
  "message": "DID身份创建成功，请等待链上确认",
  "data": {
    "id": "did_smy_003",
    "did": "did:smy:0xNewGeneratedAddress...",
    "name": "我的DID身份",
    "type": "individual",
    "status": "pending", // 待链上确认
    "txHash": "0xtxhash...", // 链上交易哈希
    "estimatedConfirmTime": 180, // 预计确认时间(秒)
    "createdAt": "2026-06-11T10:30:00Z"
  }
}
```

**Error Codes**: 400 (参数错误), 401, 409 (同名冲突), 422 (类型无效), 429

**Rate Limit**: 10次/分钟

---

### 查看DID详情

**GET** `/did/identities/:id`

获取指定DID身份的完整信息。

**Path Parameters**:

| 参数 | 类型   | 必填 | 说明                        |
| ---- | ------ | ---- | --------------------------- |
| id   | string | ✅   | DID身份ID（如 did_smy_001） |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "id": "did_smy_001",
    "did": "did:smy:0x1234...abc",
    "name": "张三的DID身份",
    "type": "individual",
    "status": "active",
    "chainInfo": {
      "chainId": 1,
      "networkName": "Ethereum Mainnet",
      "contractAddress": "0xAbC...xYz",
      "tokenId": "12345",
      "tokenURI": "ipfs://QmHash...",
      "mintedAt": "2026-05-15T08:35:12Z",
      "blockNumber": 18543210,
      "txHash": "0xMintTx..."
    },
    "credentials": [], // 关联凭证列表
    "evidenceCount": 23, // 关联存证数量
    "signatureCount": 5, // 电子签名数量
    "createdAt": "2026-05-15T08:30:00Z",
    "updatedAt": "2026-06-10T14:22:00Z"
  }
}
```

**Error Codes**: 401, 403, 404 (DID不存在)

---

### 更新DID信息

**PUT** `/did/identities/:id`

更新DID身份的基本信息（仅限名称和元数据）。

**Request Body**:

```json
{
  "name": "更新的DID名称",
  "metadata": {
    "description": "更新后的描述",
    "tags": ["updated"]
  }
}
```

**Response 200**:

```json
{
  "success": true,
  "message": "DID信息更新成功",
  "data": {
    /* 同GET详情接口 */
  }
}
```

**Error Codes**: 400, 401, 403, 404, 409

---

### 吊销DID身份

**POST** `/did/identities/:id/revoke`

吊销（停用）指定的DID身份。此操作不可逆，需二次确认。

**Request Body**:

```json
{
  "reason": "不再使用此身份",
  "confirmPhrase": "我确认要吊销此DID身份" // 安全确认短语
}
```

**Response 200**:

```json
{
  "success": true,
  "message": "DID身份已提交吊销，链上确认后生效",
  "data": {
    "id": "did_smy_001",
    "status": "revoking",
    "revocationTxHash": "0xRevokeTx..."
  }
}
```

**Error Codes**: 400 (确认短语不匹配), 401, 403, 404, 409 (已在吊销中)

**⚠️ 重要**: 此操作会级联影响关联的存证和签名记录，请谨慎执行。

---

## Module: Blockchain Evidence (`/evidence/*`)

区块链存证模块，提供文件上链存证、哈希验证、存证明书生成等功能。

### 创建存证记录

**POST** `/evidence`

上传文件并生成区块链存证记录。

**Content-Type**: `multipart/form-data`

| 字段        | 类型     | 必填 | 说明                    |
| ----------- | -------- | ---- | ----------------------- |
| file        | File     | ✅   | 待存证文件（最大100MB） |
| title       | string   | ✅   | 存证标题                |
| description | string   | ❌   | 存证描述                |
| categoryId  | string   | ❌   | 分类ID                  |
| didId       | string   | ❌   | 关联DID身份ID           |
| tags        | string[] | ❌   | 标签数组                |
| isPublic    | boolean  | ❌   | 是否公开（默认false）   |

**Auth**: ✅ Required

**Rate Limit**: 30次/分钟

**Response 201**:

```json
{
  "success": true,
  "message": "文件上传成功，存证处理中",
  "data": {
    "id": "ev_20260611_001",
    "title": "合同文件存证",
    "fileInfo": {
      "originalName": "contract_2026Q2.pdf",
      "storedName": "ev_20260611_001_contract.pdf",
      "size": 2048576,
      "mimeType": "application/pdf",
      "hashSha256": "e3b0c44298fc1c149afbf4c8996fb924...",
      "storageUrl": "https://minio.smyweb3.com/smyweb3-uploads/evidence/ev_20260611_001_contract.pdf"
    },
    "didId": "did_smy_001",
    "status": "processing", // processing → confirmed → verified
    "txHash": null, // 链上确认后填充
    "blockNumber": null,
    "timestamp": "2026-06-11T11:00:00Z",
    "publicUrl": null // 公开后生成
  }
}
```

**Error Codes**: 400 (文件过大/格式不支持), 401, 413 (Payload Too Large), 429

---

### 存证列表查询

**GET** `/evidence`

| 参数     | 类型    | 位置  | 必填 | 说明                  |
| -------- | ------- | ----- | ---- | --------------------- |
| page     | integer | query | 否   | 页码                  |
| pageSize | integer | query | 否   | 每页数量              |
| status   | string  | query | 否   | 状态筛选              |
| didId    | string  | query | 否   | 按DID筛选             |
| keyword  | string  | query | 否   | 标题搜索              |
| dateFrom | string  | query | 否   | 开始日期 (YYYY-MM-DD) |
| dateTo   | string  | query | 否   | 结束日期 (YYYY-MM-DD) |
| isPublic | boolean | query | 否   | 是否公开              |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "ev_20260611_001",
        "title": "合同文件存证",
        "fileName": "contract_2026Q2.pdf",
        "fileSize": 2048576,
        "hashSha256": "e3b0c44298fc1c149afbf4c8996fb924...",
        "status": "confirmed",
        "didId": "did_smy_001",
        "didName": "张三的DID身份",
        "txHash": "0xEvidenceTx...",
        "blockNumber": 18545000,
        "isPublic": false,
        "createdAt": "2026-06-11T11:00:00Z",
        "verifiedAt": "2026-06-11T11:02:33Z"
      }
    ],
    "pagination": {
      /* ... */
    }
  }
}
```

---

### 存证详情

**GET** `/evidence/:id`

**Response 200**:

```json
{
  "success": true,
  "data": {
    "id": "ev_20260611_001",
    "title": "合同文件存证",
    "description": "2026年Q2业务合同",
    "fileInfo": {
      "originalName": "contract_2026Q2.pdf",
      "hashSha256": "e3b0c44298fc1c149afbf4c8996fb924...",
      "hashMd5": "d41d8cd98f00b204e9800998ecf8427e",
      "size": 2048576,
      "mimeType": "application/pdf",
      "storageUrl": "https://minio.smyweb3.com/..."
    },
    "blockchain": {
      "network": "Ethereum Mainnet",
      "txHash": "0xEvidenceTx...",
      "blockNumber": 18545000,
      "confirmedAt": "2026-06-11T11:02:33Z",
      "gasUsed": 65000,
      "explorerUrl": "https://etherscan.io/tx/0xEvidenceTx..."
    },
    "didInfo": {
      "id": "did_smy_001",
      "name": "张三的DID身份",
      "did": "did:smy:0x1234...abc"
    },
    "certificate": {
      "url": "/api/v1/evidence/ev_20260611_001/certificate",
      "issuedAt": "2026-06-11T11:03:00Z"
    },
    "isPublic": true,
    "publicUrl": "https://verify.smyweb3.com/e/ev_20260611_001",
    "createdAt": "2026-06-11T11:00:00Z",
    "updatedAt": "2026-06-11T11:03:00Z"
  }
}
```

---

### 验证存证有效性

**POST** `/evidence/:id/verify`

对已有存证进行有效性验证（重新计算文件哈希并与链上记录比对）。

**Response 200**:

```json
{
  "success": true,
  "data": {
    "evidenceId": "ev_20260611_001",
    "isValid": true,
    "verificationResult": {
      "fileHashMatched": true,
      "onChainRecordFound": true,
      "chainDataIntact": true,
      "timestampValid": true,
      "verifiedAt": "2026-06-11T15:00:00Z"
    },
    "message": "✅ 存证验证通过，文件完整且未被篡改"
  }
}
```

**Error Codes**: 401, 404, 422 (存证尚未确认)

---

### 下载存证证书

**GET** `/evidence/:id/certificate`

下载PDF格式的存证电子证书。

**Response**: PDF文件流 (`application/pdf`)

**Error Codes**: 401, 403, 404 (存证不存在或未确认)

---

## Module: E-Signature (`/signature/*`)

电子签名模块，支持多种签名算法的文档签署、签名验证和签名撤销。

### 发起签名请求

**POST** `/signature/sign`

**Request Body**:

```json
{
  "documentId": "ev_20260611_001",
  "algorithm": "SM2", // SM2 / ECDSA / Ed25519
  "signerDid": "did_smy_001",
  "title": "签署《2026年Q2业务合同》",
  "description": "请审阅并签署此文档",
  "expiresAt": "2026-06-18T11:00:00Z", // 签名截止时间
  "callbackUrl": "https://your-app.com/callback/sign-complete"
}
```

| 字段        | 类型     | 必填 | 说明                   |
| ----------- | -------- | ---- | ---------------------- |
| documentId  | string   | ✅   | 已存证的文档ID         |
| algorithm   | string   | ✅   | 签名算法               |
| signerDid   | string   | ✅   | 签署者DID ID           |
| title       | string   | ✅   | 签署标题               |
| description | string   | ❌   | 描述                   |
| expiresAt   | datetime | ❌   | 过期时间（默认72小时） |
| callbackUrl | string   | ❌   | 签署完成回调地址       |

**Response 201**:

```json
{
  "success": true,
  "data": {
    "signatureId": "sig_20260611_001",
    "status": "pending_signer_action",
    "signUrl": "https://admin.smyweb3.com/sign/sig_20260611_001",
    "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?data=...",
    "expiresAt": "2026-06-18T11:00:00Z"
  }
}
```

**Error Codes**: 400, 401, 404 (文档不存在), 409 (文档已被签名), 422

**Rate Limit**: 20次/分钟

---

### 执行签名

**POST** `/signature/:id/execute`

执行实际的签名操作（需在签名页面调用）。

**Request Body**:

```json
{
  "password": "user_encrypted_password_or_biometric_token"
}
```

**Response 200**:

```json
{
  "success": true,
  "message": "签名成功",
  "data": {
    "signatureId": "sig_20260611_001",
    "status": "completed",
    "signatureValue": "MEUCIQD...base64_signature_data...",
    "algorithm": "SM2",
    "publicKey": "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoEcz1UBgi0DgA0...-----END PUBLIC KEY-----",
    "signedAt": "2026-06-11T12:00:00Z",
    "txHash": "0xSignatureTx...",
    "certificateUrl": "/api/v1/signature/sig_20260611_001/certificate"
  }
}
```

---

### 验证签名

**POST** `/signature/:id/verify`

**Response 200**:

```json
{
  "success": true,
  "data": {
    "signatureId": "sig_20260611_001",
    "isValid": true,
    "details": {
      "signatureAlgorithm": "SM2",
      "signerDid": "did:smy:0x1234...abc",
      "signerVerified": true,
      "documentHashMatched": true,
      "signatureNotRevoked": true,
      "withinValidityPeriod": true,
      "verifiedAt": "2026-06-11T15:30:00Z"
    }
  }
}
```

---

### 撤销签名

**POST** `/signature/:id/revoke`

**Request Body**:

```json
{
  "reason": "签署内容有误，需要重新签署",
  "confirmPhrase": "我确认撤销此签名"
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "signatureId": "sig_20260611_001",
    "previousStatus": "completed",
    "currentStatus": "revoked",
    "revokedAt": "2026-06-11T16:00:00Z",
    "revokeReason": "签署内容有误，需要重新签署",
    "revocationTxHash": "0xRevokeSigTx..."
  }
}
```

**Error Codes**: 400, 401, 403, 404, 409 (已撤销)

---

## Module: AI Models (`/ai/*`)

AI模型服务模块，集成多LLM Provider，支持流式SSE输出。

### 模型列表

**GET** `/ai/models`

**Response 200**:

```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "provider": "openai",
        "displayName": "OpenAI",
        "models": [
          {
            "id": "gpt-4o",
            "name": "GPT-4o",
            "maxTokens": 128000,
            "inputPrice": 2.5,
            "outputPrice": 10.0
          },
          {
            "id": "gpt-4o-mini",
            "name": "GPT-4o Mini",
            "maxTokens": 128000,
            "inputPrice": 0.15,
            "outputPrice": 0.6
          }
        ]
      },
      {
        "provider": "anthropic",
        "displayName": "Anthropic Claude",
        "models": [
          {
            "id": "claude-sonnet-4-20250514",
            "name": "Claude Sonnet 4",
            "maxTokens": 200000,
            "inputPrice": 3.0,
            "outputPrice": 15.0
          },
          {
            "id": "claude-haiku-3-5-20241022",
            "name": "Claude Haiku 3.5",
            "maxTokens": 200000,
            "inputPrice": 0.25,
            "outputPrice": 1.25
          }
        ]
      }
    ]
  }
}
```

---

### 对话补全（非流式）

**POST** `/ai/chat/completions`

兼容 OpenAI Chat Completions API 格式。

**Request Body**:

```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "你是一个专业的AI助手" },
    { "role": "user", "content": "分析这份合同的条款风险" }
  ],
  "temperature": 0.7,
  "max_tokens": 4096,
  "stream": false
}
```

**Response 200**:

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1718123456,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "根据对合同的分析，主要风险点包括...\n\n1. **付款条款风险**\n2. **违约责任不明确**\n..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 1500,
    "completion_tokens": 800,
    "total_tokens": 2300
  }
}
```

**Error Codes**: 400, 401, 422 (模型不可用), 429, 500, 502 (Provider超时)

---

### 对话补全（流式 SSE）

**POST** `/ai/chat/completions`

设置 `"stream": true` 即启用 Server-Sent Events 流式输出。

**SSE事件格式**:

```
data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","created":1718123456,"model":"gpt-4o","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","created":1718123456,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"根据"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","created":1718123456,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"对"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","created":1718123456,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"合同"},"finish_reason":null}]}

...

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","created":1718123456,"model":"gpt-4o","choices":[{"index":0":{},"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

**客户端示例 (JavaScript)**:

```javascript
const response = await fetch('/api/v1/ai/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: '你好' }],
    stream: true,
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  const lines = text.split('\n').filter((line) => line.startsWith('data: '));

  for (const line of lines) {
    const data = line.slice(6); // Remove 'data: '
    if (data === '[DONE]') return;

    const parsed = JSON.parse(data);
    const content = parsed.choices[0]?.delta?.content || '';
    process.stdout.write(content); // 流式输出
  }
}
```

**Error Codes**: 同非流式接口

**Rate Limit**: 按Token计费 + 频率限制 60次/分钟

---

### Token用量统计

**GET** `/ai/usage`

| 参数        | 类型   | 位置  | 必填 | 说明           |
| ----------- | ------ | ----- | ---- | -------------- |
| from        | date   | query | 否   | 开始日期       |
| to          | date   | query | 否   | 结束日期       |
| granularity | string | query | 否   | day/hour/month |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "period": { "from": "2026-06-01", "to": "2026-06-11" },
    "summary": {
      "totalTokens": 1250000,
      "totalCost": 45.67,
      "totalRequests": 3200
    },
    "byModel": [
      { "model": "gpt-4o", "tokens": 800000, "cost": 38.5, "requests": 1800 },
      { "model": "gpt-4o-mini", "tokens": 450000, "cost": 7.17, "requests": 1400 }
    ],
    "dailyUsage": [
      { "date": "2026-06-01", "tokens": 120000, "cost": 4.32 },
      { "date": "2026-06-02", "tokens": 98000, "cost": 3.52 },
      "..."
    ]
  }
}
```

---

## Module: OpenClaw Agents (`/openclaw/*`)

AI智能体管理模块，支持智能体的创建、配置、启停和监控。

### 智能体列表

**GET** `/openclaw/agents`

**Response 200**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "agent_kyc_reviewer",
        "name": "KYC审核智能体",
        "type": "kyc-reviewer",
        "status": "running",
        "config": {
          "model": "gpt-4o",
          "temperature": 0.3,
          "maxConcurrentTasks": 5
        },
        "metrics": {
          "tasksCompleted": 1523,
          "avgProcessingTime": "45s",
          "successRate": 98.5,
          "uptimeHours": 720
        },
        "lastActivity": "2026-06-11T14:30:00Z",
        "createdAt": "2026-04-01T10:00:00Z"
      }
    ],
    "pagination": {
      /* ... */
    }
  }
}
```

---

### 创建智能体

**POST** `/openclaw/agents`

**Request Body**:

```json
{
  "name": "合同审查智能体",
  "type": "custom",
  "model": "gpt-4o",
  "systemPrompt": "你是一个专业的法律合同审查AI助手...",
  "tools": ["web_search", "document_analysis", "code_interpreter"],
  "config": {
    "temperature": 0.2,
    "maxTokens": 16000,
    "maxConcurrentTasks": 3,
    "autoRetry": true,
    "retryCount": 3
  }
}
```

**Response 201**:

```json
{
  "success": true,
  "data": {
    "id": "agent_contract_reviewer_v2",
    "name": "合同审查智能体",
    "status": "stopped",
    "apiKey": "oc_sk_live_xxxxxxxxxxxx", // 用于API调用
    "createdAt": "2026-06-11T16:00:00Z"
  }
}
```

---

### 启动/停止智能体

**POST** `/openclaw/agents/:id/start`
**POST** `/openclaw/agents/:id/stop`

**Response 200**:

```json
{
  "success": true,
  "data": {
    "id": "agent_kyc_reviewer",
    "previousStatus": "stopped",
    "currentStatus": "running",
    "transitionAt": "2026-06-11T17:00:00Z"
  }
}
```

---

### 智能体健康检查

**GET** `/openclaw/agents/:id/health`

**Response 200**:

```json
{
  "success": true,
  "data": {
    "agentId": "agent_kyc_reviewer",
    "overallStatus": "healthy",
    "checks": {
      "process": { "status": "up", "cpuUsage": 12.5, "memoryMB": 512 },
      "llmConnection": { "status": "up", "latencyMs": 230, "provider": "openai" },
      "taskQueue": { "status": "up", "pendingTasks": 3, "queueDepth": "normal" },
      "database": { "status": "up", "queryTimeMs": 15 }
    },
    "lastCheck": "2026-06-11T17:05:00Z"
  }
}
```

---

## Module: Acquisition (`/acquisition/*`)

全球获客系统模块，管理达人库、AI策略、平台适配器等。

### 获客数据概览

**GET** `/acquisition/dashboard`

**Response 200**:

```json
{
  "success": true,
  "data": {
    "kpiCards": {
      "totalInfluencers": 158000,
      "newThisMonth": 12450,
      "activeCampaigns": 36,
      "monthlySpend": 285000
    },
    "trendChart": {
      "labels": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
      "datasets": [
        { "label": "新增达人", "data": [1200, 1450, 1380, 1620, 1510, 980, 850] },
        { "label": "触达次数", "data": [45000, 52000, 48000, 55000, 51000, 38000, 32000] }
      ]
    },
    "syncStatus": {
      "lastSync": "2026-06-11T17:30:00Z",
      "nextSync": "2026-06-11T18:30:00Z",
      "platforms": {
        "tiktok": { "status": "synced", "recordsUpdated": 5200 },
        "instagram": { "status": "syncing", "progress": 67 },
        "youtube": { "status": "pending", "scheduledAt": "2026-06-11T19:00:00Z" }
      }
    }
  }
}
```

---

### 达人库搜索

**GET** `/acquisition/influencers`

| 参数              | 类型    | 必填 | 说明                                           |
| ----------------- | ------- | ---- | ---------------------------------------------- |
| keyword           | string  | 否   | 搜索关键词                                     |
| platform          | string  | 否   | 平台筛选: tiktok/instagram/youtube/xiaohongshu |
| followersMin      | integer | 否   | 最小粉丝数                                     |
| followersMax      | integer | 否   | 最大粉丝数                                     |
| category          | string  | 否   | 类别                                           |
| country           | string  | 否   | 国家/地区                                      |
| engagementRateMin | float   | 否   | 最小互动率                                     |
| isVerified        | boolean | 否   | 是否认证                                       |
| page              | integer | 否   | 页码                                           |
| pageSize          | integer | 否   | 每页数量                                       |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "inf_tk_001234",
        "platform": "tiktok",
        "username": "@techreviewer_cn",
        "displayName": "科技评测君",
        "avatarUrl": "https://...",
        "followers": 2500000,
        "following": 1200,
        "engagementRate": 4.8,
        "category": "Technology",
        "country": "CN",
        "isVerified": true,
        "aiScore": 87, // AI推荐评分 (0-100)
        "estimatedCPM": 120,
        "lastSynced": "2026-06-11T16:00:00Z"
      }
    ],
    "pagination": {
      /* ... */
    }
  }
}
```

**Rate Limit**: 120次/分钟

---

### AI策略面板

**GET** `/acquisition/ai-strategies`

**Response 200**:

```json
{
  "success": true,
  "data": {
    "activeCampaigns": [
      {
        "id": "camp_q3_2026",
        "name": "Q3品牌推广计划",
        "budget": { "total": 500000, "spent": 185000, "remaining": 315000 },
        "targetKPI": { "impressions": 10000000, "achieved": 4200000 },
        "aiRecommendations": [
          {
            "id": "rec_001",
            "type": "influencer_match",
            "priority": "high",
            "title": "推荐 @techreviewer_cn 合作",
            "reason": "粉丝画像匹配度95%，历史ROI达3.2x",
            "estimatedBudget": 35000,
            "expectedROI": "3.5x",
            "confidence": 0.89
          }
        ],
        "optimizationSuggestions": [
          "建议将Instagram投放比例从20%提升至35%",
          "当前YouTube视频长度分布偏长，建议增加60秒短视频测试"
        ]
      }
    ]
  }
}
```

---

### 一键采纳AI推荐

**POST** `/acquisition/ai-strategies/:campaignId/adopt/:recommendationId`

**Response 200**:

```json
{
  "success": true,
  "message": "AI推荐已采纳，正在创建合作任务",
  "data": {
    "taskId": "task_auto_created_001",
    "recommendationId": "rec_001",
    "status": "created",
    "autoActions": [
      "已向 @techreviewer_cn 发送合作邀请",
      "已创建预算分配记录 ($35,000)",
      "已设置KPI跟踪目标"
    ]
  }
}
```

---

## Module: n8n Integration (`/n8n-integration/*`)

n8n工作流引擎集成模块。

### 工作流模板列表

**GET** `/n8n-integration/templates`

**Response 200**:

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "name": "数据处理",
        "templates": [
          { "id": "tpl_data_sync", "name": "跨平台数据同步", "description": "..." },
          { "id": "tpl_etl_pipeline", "name": "ETL数据清洗管道", "description": "..." }
        ]
      },
      {
        "name": "通知告警",
        "templates": [
          { "id": "tpl_alert_dingtalk", "name": "钉钉告警通知", "description": "..." },
          { "id": "tpl_report_daily", "name": "每日运营报告推送", "description": "..." }
        ]
      }
    ]
  }
}
```

---

### 执行工作流

**POST** `/n8n-integration/workflows/:workflowId/execute`

**Request Body**:

```json
{
  "triggerData": {
    "source": "manual",
    "userId": "user_001",
    "params": { "dateRange": "last_7_days" }
  }
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "executionId": "exec_abc123",
    "status": "running",
    "startedAt": "2026-06-11T18:00:00Z",
    "estimatedDuration": 120,
    "webhookUrl": "/api/v1/n8n-integration/executions/exec_abc123/status"
  }
}
```

---

### 执行历史

**GET** `/n8n-integration/executions`

**Response 200**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "executionId": "exec_abc123",
        "workflowId": "wf_daily_report",
        "workflowName": "每日运营报告",
        "status": "success",
        "startedAt": "2026-06-11T08:00:00Z",
        "finishedAt": "2026-06-11T08:02:15Z",
        "durationSeconds": 135,
        "output": { "reportUrl": "https://...", "recipients": 12 }
      }
    ],
    "pagination": {
      /* ... */
    }
  }
}
```

---

## WebSocket Events (`/acquisition` namespace)

实时数据推送协议，基于 Socket.IO 实现。

### 连接认证

```javascript
import { io } from 'socket.io-client';

const socket = io('wss://admin.smyweb3.com', {
  path: '/socket.io/',
  auth: {
    token: 'Bearer eyJhbGci...', // JWT Token
  },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('Connection failed:', err.message);
});
```

### 事件列表

#### 客户端 → 服务端

| 事件名                    | Payload                                               | 说明         |
| ------------------------- | ----------------------------------------------------- | ------------ |
| `acquisition:subscribe`   | `{ platforms: ['tiktok'], types: ['sync_progress'] }` | 订阅特定事件 |
| `acquisition:unsubscribe` | `{ subscriptionId: 'sub_001' }`                       | 取消订阅     |
| `acquisition:ping`        | `{ timestamp }`                                       | 心跳保活     |

#### 服务端 → 客户端

| 事件名                       | Payload Schema                                         | 说明        | 频率    |
| ---------------------------- | ------------------------------------------------------ | ----------- | ------- |
| `acquisition:sync:started`   | `{ platform, totalRecords, estimatedTime }`            | 同步开始    | 按触发  |
| `acquisition:sync:progress`  | `{ platform, processed, total, percent, currentItem }` | 进度更新    | 每1-5秒 |
| `acquisition:sync:completed` | `{ platform, duration, recordsProcessed, errors }`     | 同步完成    | 按触发  |
| `acquisition:sync:error`     | `{ platform, stage, errorCode, message }`              | 同步出错    | 按触发  |
| `acquisition:alert:kpi`      | `{ metric, value, threshold, severity }`               | KPI阈值告警 | 按触发  |
| `acquisition:ai:ready`       | `{ recommendationId, campaignId, summary }`            | AI推荐就绪  | 按触发  |

**事件示例 - 同步进度**:

```json
{
  "event": "acquisition:sync:progress",
  "data": {
    "platform": "instagram",
    "processed": 3420,
    "total": 5200,
    "percent": 65.77,
    "currentItem": {
      "influencerId": "inf_ig_5678",
      "username": "@lifestyle_blogger",
      "action": "updating_profile"
    },
    "timestamp": "2026-06-11T17:32:15Z"
  }
}
```

**重连策略**:

- 断线后自动重连（指数退避: 1s, 2s, 4s, ..., 最大30s）
- 重连成功后自动恢复之前的订阅
- 服务端维护断线期间的事件缓存（最多保留5分钟）

---

## 附录

### 通用分页响应格式

```json
{
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Rate Limit 全局规则

| 用户角色    | 全局限制 | 写操作限制 | AI接口限制 |
| ----------- | -------- | ---------- | ---------- |
| anonymous   | 30/min   | -          | -          |
| viewer      | 120/min  | 30/min     | 30/min     |
| operator    | 240/min  | 60/min     | 60/min     |
| admin       | 600/min  | 120/min    | 120/min    |
| super_admin | 1200/min | 240/min    | 240/min    |

### SDK与代码示例

详见各语言的官方SDK仓库：

- JavaScript/TypeScript: `@smyweb3/api-sdk`
- Python: `smyweb3-api-python`
- Go: `github.com/smyweb3/api-sdk-go`

---

> **文档结束** | 版本 v1.0 | 最后更新: 2026-06-11
