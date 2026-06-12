// ============================
// User & Profile Types
// ============================
export interface User {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  dlcLevel: number;
  dvcBalance: number;
  usdtBalance: number;
  joinDate: string;
  isVerified: boolean;
  kycStatus: KycStatus;
  role: 'user' | 'admin' | 'superadmin';
}

export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

// ============================
// DLC Types
// ============================
export interface DlcLevel {
  level: number;
  name: string;
  color: string;
  minDvc: number;
  maxDvc: number;
  benefits: string[];
  commissionRate: number;
}

export interface DvcTransaction {
  id: string;
  type: 'earn' | 'spend' | 'reward' | 'convert';
  amount: number;
  description: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

// ============================
// AI Agent Types
// ============================
export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: string;
  color: string;
  status: 'active' | 'idle' | 'busy' | 'offline';
  capabilities: string[];
  lastActive: string;
  messageCount: number;
}

export interface AiTodo {
  id: string;
  title: string;
  description: string;
  agentId: string;
  agentName: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  createdAt: string;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  agentId?: string;
  agentName?: string;
  timestamp: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  type: 'image' | 'document' | 'link';
  url: string;
  name: string;
}

// ============================
// Company Types
// ============================
export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  jurisdiction: string;
  registrationNumber: string;
  status: CompanyStatus;
  incorporationDate: string;
  directors: Director[];
  shareholders: Shareholder[];
  annualReturnDue: string;
  complianceStatus: ComplianceStatus;
  documents: CompanyDocument[];
  bankAccounts: CompanyBankAccount[];
}

export interface CompanyBankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  currency: string;
  status: 'active' | 'pending' | 'closed';
}

export type CompanyType =
  | 'samoa_spv'
  | 'hong_kong'
  | 'singapore'
  | 'bvi'
  | 'cayman'
  | 'delaware'
  | 'seychelles';

export type CompanyStatus = 'active' | 'pending' | 'suspended' | 'dissolved';

export type ComplianceStatus = 'good' | 'warning' | 'overdue' | 'critical';

export interface Director {
  id: string;
  name: string;
  nationality: string;
  appointedDate: string;
}

export interface Shareholder {
  id: string;
  name: string;
  shares: number;
  percentage: number;
}

export interface CompanyDocument {
  id: string;
  name: string;
  type: string;
  status: 'uploaded' | 'pending' | 'expired';
  uploadDate: string;
  expiryDate?: string;
}

// ============================
// Payment Types
// ============================
export interface PaymentChannel {
  id: string;
  name: string;
  type: 'card' | 'bank_transfer' | 'crypto' | 'ewallet' | 'local';
  icon: string;
  currencies: string[];
  fee: number;
  minAmount: number;
  maxAmount: number;
  processingTime: string;
  isActive: boolean;
  supportedCountries: string[];
  settlementTime: string;
}

export interface PaymentTransaction {
  id: string;
  channelId: string;
  channelName: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  type: 'incoming' | 'outgoing';
  counterparty: string;
  description: string;
  timestamp: string;
  fee: number;
}

export type PaymentStatus = 'completed' | 'pending' | 'processing' | 'failed' | 'refunded';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
  change24h: number;
}

// ============================
// Tax Types
// ============================
export interface TaxRate {
  id: string;
  country: string;
  countryCode: string;
  structureType: string;
  corporateTax: number;
  vatGst: number;
  withholdingTax: number;
  capitalGainsTax: number;
  doubleTaxationTreaties: string[];
  notes: string;
}

export interface TaxCalculation {
  revenue: number;
  margin: number;
  targetMarket: string;
  structureType: string;
  estimatedTax: number;
  effectiveRate: number;
  savings: number;
}

// ============================
// Legal Types
// ============================
export interface LegalCompliance {
  id: string;
  country: string;
  countryCode: string;
  category: string;
  requirement: string;
  description: string;
  penalty: string;
  status: 'required' | 'recommended' | 'optional';
}

export interface Contract {
  id: string;
  name: string;
  type: string;
  parties: string[];
  status: 'draft' | 'reviewing' | 'signed' | 'expired';
  createdDate: string;
  expiryDate?: string;
  aiGenerated: boolean;
}

// ============================
// Video Types
// ============================
export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  views: number;
  likes: number;
  author: string;
  authorAvatar: string;
  category: string;
  tags: string[];
  publishedAt: string;
  videoUrl: string;
}

export interface VideoComment {
  id: string;
  videoId: string;
  userName: string;
  userAvatar: string;
  content: string;
  likes: number;
  timestamp: string;
  replies?: VideoComment[];
}

// ============================
// Media Types
// ============================
export interface MediaPost {
  id: string;
  title: string;
  content: string;
  platform: 'wechat' | 'weibo' | 'tiktok' | 'xiaohongshu' | 'twitter' | 'linkedin';
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledAt?: string;
  publishedAt?: string;
  engagement: MediaEngagement;
  aiGenerated: boolean;
}

export interface MediaEngagement {
  impressions: number;
  clicks: number;
  likes: number;
  shares: number;
  comments: number;
}

export interface MediaDashboard {
  totalPosts: number;
  totalImpressions: number;
  totalFollowers: number;
  growthRate: number;
  platformStats: PlatformStat[];
}

export interface PlatformStat {
  platform: string;
  followers: number;
  posts: number;
  engagement: number;
  growth: number;
}

// ============================
// Admin Types
// ============================
export interface AdminOrder {
  id: string;
  type: 'company_registration' | 'bank_account' | 'payment_setup' | 'compliance';
  customer: string;
  customerId: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  notes?: string;
}

export type OrderStatus = 'new' | 'processing' | 'reviewing' | 'completed' | 'cancelled';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  dlcLevel: number;
  dvcBalance: number;
  status: 'active' | 'inactive' | 'suspended';
  joinDate: string;
  lastActive: string;
  companyCount: number;
  orderCount: number;
}

export interface AdminKpi {
  label: string;
  value: number;
  change: number;
  changeType: 'up' | 'down' | 'neutral';
  prefix?: string;
  suffix?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: string;
  actionUrl?: string;
}

// ============================
// UI Types
// ============================
export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface NavTab {
  id: string;
  label: string;
  icon: string;
  path: string;
}

export interface ServiceShortcut {
  id: string;
  label: string;
  icon: string;
  path: string;
  color: string;
}

export interface ChartData {
  name: string;
  value: number;
  label?: string;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}
