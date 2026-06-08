// 基础响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 管理员用户
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  roleId: string;
  roleName?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 管理员角色
export interface AdminRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  createdAt: string;
}

// 登录请求
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应
export interface LoginResponse {
  token: string;
  user: AdminUser;
}

// 用户信息
export interface User {
  id: string;
  username?: string;
  email?: string;
  walletAddress?: string;
  did?: string;
  kycStatus: 'not_started' | 'pending' | 'approved' | 'rejected';
  userLevel: 1 | 2 | 3 | 4;
  isActive: boolean;
  createdAt: string;
}

// 内容类型
export interface Content {
  id: string;
  title: string;
  type: 'animation' | 'drama' | 'heritage';
  status: 'draft' | 'pending' | 'published' | 'offline';
  description?: string;
  coverUrl?: string;
  creatorId: string;
  oid?: string;
  createdAt: string;
  updatedAt: string;
}

// NFT类型
export interface NFT {
  id: string;
  tokenId?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  metadataUrl?: string;
  status: 'minting' | 'minted' | 'traded' | 'offline';
  ownerId: string;
  creatorId: string;
  oid?: string;
  createdAt: string;
}

// 交易类型
export interface Transaction {
  id: string;
  type: 'nft_trade' | 'content_purchase' | 'deposit' | 'withdraw';
  status: 'success' | 'failed' | 'pending';
  amount: number;
  currency: string;
  fromUserId?: string;
  toUserId?: string;
  nftId?: string;
  contentId?: string;
  txHash?: string;
  createdAt: string;
}

// 操作日志
export interface AuditLog {
  id: string;
  adminUserId: string;
  adminUsername?: string;
  action: string;
  module: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
