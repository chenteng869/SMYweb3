import axios from 'axios';
import type {
  ApiResponse,
  PaginatedResponse,
  LoginRequest,
  LoginResponse,
  AdminUser,
  User,
  Content,
  NFT,
  Transaction,
  AuditLog,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证相关API
export const authApi = {
  login: (data: LoginRequest): Promise<ApiResponse<LoginResponse>> =>
    api.post('/admin/auth/login', data).then((res) => res.data),
  logout: (): Promise<ApiResponse> => api.post('/admin/auth/logout').then((res) => res.data),
  getProfile: (): Promise<ApiResponse<AdminUser>> =>
    api.get('/admin/auth/profile').then((res) => res.data),
};

// 用户管理API
export const userApi = {
  getUsers: (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    userLevel?: number;
    kycStatus?: string;
  }): Promise<ApiResponse<PaginatedResponse<User>>> =>
    api.get('/admin/users', { params }).then((res) => res.data),
  getUser: (id: string): Promise<ApiResponse<User>> =>
    api.get(`/admin/users/${id}`).then((res) => res.data),
  updateUserStatus: (id: string, isActive: boolean): Promise<ApiResponse> =>
    api.put(`/admin/users/${id}/status`, { isActive }).then((res) => res.data),
  updateUserLevel: (id: string, userLevel: number): Promise<ApiResponse> =>
    api.put(`/admin/users/${id}/level`, { userLevel }).then((res) => res.data),
};

// 内容管理API
export const contentApi = {
  getContents: (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    type?: string;
    status?: string;
  }): Promise<ApiResponse<PaginatedResponse<Content>>> =>
    api.get('/admin/content', { params }).then((res) => res.data),
  getContent: (id: string): Promise<ApiResponse<Content>> =>
    api.get(`/admin/content/${id}`).then((res) => res.data),
  updateContentStatus: (id: string, status: string): Promise<ApiResponse> =>
    api.put(`/admin/content/${id}/status`, { status }).then((res) => res.data),
};

// NFT管理API
export const nftApi = {
  getNFTs: (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: string;
  }): Promise<ApiResponse<PaginatedResponse<NFT>>> =>
    api.get('/admin/nfts', { params }).then((res) => res.data),
  getNFT: (id: string): Promise<ApiResponse<NFT>> =>
    api.get(`/admin/nfts/${id}`).then((res) => res.data),
  updateNFTStatus: (id: string, status: string): Promise<ApiResponse> =>
    api.put(`/admin/nfts/${id}/status`, { status }).then((res) => res.data),
};

// 交易管理API
export const transactionApi = {
  getTransactions: (params?: {
    page?: number;
    pageSize?: number;
    type?: string;
    status?: string;
  }): Promise<ApiResponse<PaginatedResponse<Transaction>>> =>
    api.get('/admin/transactions', { params }).then((res) => res.data),
  getTransaction: (id: string): Promise<ApiResponse<Transaction>> =>
    api.get(`/admin/transactions/${id}`).then((res) => res.data),
};

// 操作日志API
export const auditLogApi = {
  getAuditLogs: (params?: {
    page?: number;
    pageSize?: number;
    module?: string;
    action?: string;
  }): Promise<ApiResponse<PaginatedResponse<AuditLog>>> =>
    api.get('/admin/audit-logs', { params }).then((res) => res.data),
};

// 仪表盘API
export const dashboardApi = {
  getStats: (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> =>
    api.get('/admin/dashboard/stats', { params }).then((res) => res.data),
  getRecentActivities: (params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ApiResponse<any[]>> =>
    api.get('/admin/dashboard/recent-activities', { params }).then((res) => res.data),
  getChartData: (params?: {
    startDate?: string;
    endDate?: string;
    type?: 'user-growth' | 'transactions' | 'revenue';
  }): Promise<ApiResponse<any>> =>
    api.get('/admin/dashboard/chart-data', { params }).then((res) => res.data),
};

export default api;
