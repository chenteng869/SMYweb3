# 05 - 钱包签名登录实现

> **来源**: MVP版本-DID制作文档.md (第2593~2884行)
> **包含**: NestJS后端 + Next.js前端完整代码

---

## 一、后端实现 (NestJS)

### 1.1 安装依赖

```bash
npm install ethers @nestjs/jwt
npm install -D @types/ethers
```

### 1.2 Nonce服务 (wallets.service.ts)

```typescript
// src/modules/wallets/wallets.service.ts
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletNonce } from '../entities/wallet-nonce.entity';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(WalletNonce)
    private nonceRepo: Repository<WalletNonce>
  ) {}

  /**
   * 生成登录Nonce
   * 有效期: 5分钟
   * 用途: login / bind / unbind
   */
  async createNonce(params: {
    walletAddress: string;
    purpose?: string;
  }): Promise<{ nonce: string; expiredAt: Date }> {
    const { walletAddress, purpose = 'login' } = params;
    const nonce = `WOPC-${purpose}:${randomBytes(16).toString('hex')}`;
    const expiredAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟

    await this.nonceRepo.save({
      walletAddress: walletAddress.toLowerCase(),
      nonce,
      purpose,
      expiredAt,
      used: false,
    });

    return { nonce, expiredAt };
  }

  /**
   * 验证并消费Nonce
   */
  async consumeNonce(params: {
    walletAddress: string;
    nonce: string;
    purpose?: string;
  }): Promise<boolean> {
    const { walletAddress, nonce, purpose = 'login' } = params;

    const record = await this.nonceRepo.findOne({
      where: {
        walletAddress: walletAddress.toLowerCase(),
        nonce,
        purpose,
        used: false,
      },
    });

    if (!record) return false;
    if (new Date() > record.expiredAt) {
      await this.nonceRepo.delete(record.id);
      return false;
    }

    record.used = true;
    await this.nonceRepo.save(record);
    return true;
  }
}
```

### 1.3 认证服务 (auth.service.ts)

```typescript
// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ethers } from 'ethers';
import { WalletAccount } from '../entities/wallet-account.entity';
import { DidIdentity } from '../entities/did-identity.entity';

export interface WalletLoginResult {
  token: string;
  did: string;
  userId: number;
  kycStatus: string;
  status: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(WalletAccount)
    private walletRepo: Repository<WalletAccount>,
    @InjectRepository(DidIdentity)
    private didRepo: Repository<DidIdentity>
  ) {}

  /**
   * 钱包签名登录核心逻辑
   *
   * 步骤:
   * 1. ethers.verifyMessage 恢复签名者地址
   * 2. 对比地址一致性
   * 3. 查询钱包绑定的用户和DID
   * 4. 检查DID状态
   * 5. 签发JWT
   */
  async walletLogin(params: {
    walletAddress: string;
    nonce: string;
    signature: string;
  }): Promise<WalletLoginResult> {
    const { walletAddress, nonce, signature } = params;

    // Step 1: 验证签名，恢复地址
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(nonce, signature);
    } catch (err) {
      throw new UnauthorizedException('签名格式无效');
    }

    // Step 2: 地址匹配检查
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new UnauthorizedException('钱包签名验证失败：地址不匹配');
    }

    // Step 3: 查询钱包账户
    const wallet = await this.walletRepo.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
      relations: ['user', 'did'],
    });

    if (!wallet) {
      throw new UnauthorizedException('该钱包未绑定任何DID账户');
    }

    // Step 4: 检查DID状态
    const did = wallet.did;
    if (!did) {
      throw new UnauthorizedException('钱包未关联有效DID');
    }

    if (did.status === 'frozen') {
      throw new UnauthorizedException('DID已被冻结，请联系客服');
    }
    if (did.status === 'revoked') {
      throw new UnauthorizedException('DID已被撤销');
    }

    // Step 5: 更新最后登录时间
    wallet.lastLoginAt = new Date();
    await this.walletRepo.save(wallet);

    // Step 6: 签发JWT
    const payload = {
      sub: wallet.user.id,
      did: did.did,
      walletAddress: wallet.walletAddress,
      kycStatus: did.kycStatus,
      memberLevel: did.memberLevel,
    };

    const token = await this.jwtService.signAsync(payload, {
      expiresIn: '24h',
    });

    return {
      token,
      did: did.did,
      userId: wallet.user.id,
      kycStatus: did.kycStatus,
      status: did.status,
    };
  }
}
```

### 1.4 Controller (auth.controller.ts)

```typescript
// src/modules/auth/auth.controller.ts
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { WalletsService } from '../wallets/wallets.service';

@Controller('/api/did/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly walletsService: WalletsService
  ) {}

  /**
   * 获取登录Nonce
   * GET /api/did/auth/nonce?walletAddress=0x...
   */
  @Get('nonce')
  async getNonce(@Query('walletAddress') walletAddress: string) {
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      throw new BadRequestException('无效的钱包地址');
    }
    const result = await this.walletsService.createNonce({
      walletAddress,
      purpose: 'login',
    });
    return { success: true, data: result };
  }

  /**
   * 钱包签名登录
   * POST /api/did/auth/wallet-login
   */
  @Post('wallet-login')
  async walletLogin(@Body() body: { walletAddress: string; nonce: string; signature: string }) {
    const result = await this.authService.walletLogin(body);
    return {
      success: true,
      data: {
        ...result,
        tokenType: 'Bearer',
        expiresIn: 86400,
      },
    };
  }
}
```

---

## 二、前端实现 (Next.js / React)

### 2.1 项目依赖

```bash
npm install wagmi viem @rainbow-me/rainbowkit
```

### 2.2 Wagmi 配置 (lib/wagmi.ts)

```typescript
// lib/wagmi.ts
import { createConfig, http } from 'wagmi';
import { mainnet, polygon, bsc } from 'wagmi/chains';
import { rainbowWallet, metaMaskWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';

export const wagmiConfig = createConfig({
  chains: [mainnet, polygon, bsc],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
  },
});

// 支持的钱包
const wallets = [
  metaMaskWallet(),
  rainbowWallet(),
  walletConnectWallet({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID }),
];
```

### 2.3 钱包登录组件 (components/WalletConnectButton.tsx)

```tsx
'use client';

import { useAccount, useSignMessage } from 'wagmi';
import { useState } from 'react';

interface LoginResponse {
  token: string;
  did: string;
  userId: number;
  kycStatus: string;
  status: string;
}

export default function WalletLoginButton() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!address) return;
    setLoading(true);

    try {
      // Step 1: 从后端获取Nonce
      const nonceRes = await fetch('/api/proxy/wallets/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      const { data: nonceData } = await nonceRes.json();
      const { nonce } = nonceData;

      // Step 2: 用户用钱包签名Nonce
      const signature = await signMessageAsync({ message: nonce });

      // Step 3: 发送签名到后端验证并获取JWT
      const loginRes = await fetch('/api/proxy/auth/wallet-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          nonce,
          signature,
        }),
      });

      const result: { success: boolean; data: LoginResponse } = await loginRes.json();

      if (result.success) {
        // Step 4: 存储Token，跳转Dashboard
        localStorage.setItem('did_token', result.data.token);
        localStorage.setItem('did_info', JSON.stringify(result.data));
        window.location.href = '/dashboard';
      } else {
        alert('登录失败: ' + (result as any).error?.message);
      }
    } catch (err: any) {
      console.error('[WalletLogin]', err);
      alert(err.message || '钱包登录失败');
    } finally {
      setLoading(false);
    }
  };

  // 未连接钱包时显示连接按钮
  if (!isConnected) {
    return <button onClick={() => open()}>连接钱包</button>;
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading || isSigning}
      style={{
        padding: '12px 24px',
        borderRadius: '8px',
        border: 'none',
        background: '#F59E0B',
        color: '#fff',
        fontWeight: 600,
        cursor: loading || isSigning ? 'not-allowed' : 'pointer',
        opacity: loading || isSigning ? 0.6 : 1,
      }}
    >
      {loading ? '验证中...' : isSigning ? '请确认签名...' : '使用钱包登录'}
    </button>
  );
}
```

### 2.4 API代理层 (lib/api.ts)

```typescript
// lib/api.ts

const API_BASE = '/api/proxy';

/** DID API 客户端 */
export const didApi = {
  /** 获取当前DID信息 */
  async getMyDID(): Promise<any> {
    return authFetch(`${API_BASE}/did/me`);
  },

  /** 查询指定DID */
  async getDID(did: string): Promise<any> {
    return authFetch(`${API_BASE}/did/${did}`);
  },

  /** 绑定钱包 */
  async bindWallet(data: {
    walletAddress: string;
    chainId: string;
    walletType: string;
    signature: string;
  }): Promise<any> {
    return authFetch(`${API_BASE}/did/wallets/bind`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** 获取我的SBT凭证列表 */
  async getMyCredentials(): Promise<any> {
    return authFetch(`${API_BASE}/did/sbt/list`);
  },

  /** 查询平台权限 */
  async checkPlatformAccess(platform: string): Promise<any> {
    return authFetch(`${API_BASE}/did/platform-access?platform=${platform}`);
  },
};

/** 带JWT认证的fetch封装 */
async function authFetch(url: string, options?: RequestInit) {
  const token = localStorage.getItem('did_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok && res.status === 401) {
    // Token过期，清除并跳转登录
    localStorage.removeItem('did_token');
    localStorage.removeItem('did_info');
    window.location.href = '/login';
  }

  return data;
}
```

---

## 三、安全注意事项

### 3.1 Nonce防重放

- 每个 Nonce 只能使用一次（used 字段标记）
- Nonce 5 分钟自动过期
- Nonce 与 walletAddress 绑定，防止跨钱包攻击

### 3.2 签名消息规范

```
推荐格式: WOPC-{purpose}:{random_hex}
示例:     WOPC-login:a1b2c3d4e5f67890abcdef1234567890

避免: 不要使用纯随机字符串作为消息内容
原因: 用户需要知道自己在签名什么
```

### 3.3 JWT安全

- 有效期建议 24h（生产环境可缩短至 1h + refresh token）
- Payload 中不存放敏感信息（密码/私钥等）
- 建议使用 RS256（非对称加密）而非 HS256（对称加密）
- 生产环境必须使用 HTTPS

### 3.4 链ID校验

绑定钱包时必须校验 chainId，防止跨链重放攻击：

```typescript
const validChainIds = ['1', '56', '137', '31337']; // ETH/BSC/POL/Localhost
if (!validChainIds.includes(chainId)) {
  throw new BadRequestException('不支持的网络');
}
```

---

_下一节_: [06-backend-structure.md](./06-backend-structure.md) — NestJS后端项目结构
