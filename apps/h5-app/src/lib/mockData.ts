import type {
  User, Agent, AiTodo, Company, PaymentChannel, PaymentTransaction,
  TaxRate, LegalCompliance, Video, MediaPost, MediaDashboard,
  AdminOrder, AdminUser, AdminKpi, Notification, ExchangeRate,
  CompanyDocument, VideoComment, PlatformStat, DlcLevel
} from '@/types';

// ============================
// User Data
// ============================
export const mockUser: User = {
  id: 'usr_001',
  name: '陈董',
  avatar: '',
  email: 'chendong@taichu.com',
  phone: '+86 138****8888',
  dlcLevel: 6,
  dvcBalance: 12580,
  usdtBalance: 45600.50,
  joinDate: '2024-01-15',
  isVerified: true,
  kycStatus: 'verified',
  role: 'user',
};

export const mockAdminUser: User = {
  ...mockUser,
  id: 'adm_001',
  name: '管理员',
  email: 'admin@taichu.com',
  role: 'admin',
};

// ============================
// DLC Level Data
// ============================
export const mockDlcLevels: DlcLevel[] = [
  {
    level: 1,
    name: '青铜',
    color: '#CD7F32',
    minDvc: 0,
    maxDvc: 999,
    benefits: ['基础服务访问', '社区支持', '标准费率'],
    commissionRate: 0.05,
  },
  {
    level: 2,
    name: '白银',
    color: '#C0C0C0',
    minDvc: 1000,
    maxDvc: 4999,
    benefits: ['优先客服响应', '高级分析报告', '费率折扣5%'],
    commissionRate: 0.08,
  },
  {
    level: 3,
    name: '黄金',
    color: '#FFD700',
    minDvc: 5000,
    maxDvc: 19999,
    benefits: ['专属顾问服务', '优先业务处理', '月度财务报告', '费率折扣10%'],
    commissionRate: 0.12,
  },
  {
    level: 4,
    name: '铂金',
    color: '#E5E4E2',
    minDvc: 20000,
    maxDvc: 49999,
    benefits: ['VIP绿色通道', '定制化服务方案', '季度策略会议', '费率折扣15%'],
    commissionRate: 0.15,
  },
  {
    level: 5,
    name: '钻石',
    color: '#B9F2FF',
    minDvc: 50000,
    maxDvc: 999999999,
    benefits: ['全功能无限制', '最高佣金比例', '私人银行服务', '专属活动邀请'],
    commissionRate: 0.20,
  },
];

// ============================
// AI Agents
// ============================
export const mockAgents: Agent[] = [
  {
    id: 'agent_001',
    name: '智财管家',
    role: '财务顾问',
    description: '智能财务分析与税务规划专家',
    icon: 'Calculator',
    color: '#00D4AA',
    status: 'active',
    capabilities: ['财务分析', '税务优化', '报表生成', '预算规划'],
    lastActive: '2024-12-19T10:30:00',
    messageCount: 128,
  },
  {
    id: 'agent_002',
    name: '法务精灵',
    role: '法务顾问',
    description: '合同审查与合规咨询AI专家',
    icon: 'ShieldCheck',
    color: '#3B82F6',
    status: 'active',
    capabilities: ['合同审查', '合规检查', '风险评估', '法规查询'],
    lastActive: '2024-12-19T09:15:00',
    messageCount: 96,
  },
  {
    id: 'agent_003',
    name: '出海助手',
    role: '出海顾问',
    description: '跨境电商全球市场拓展专家',
    icon: 'Globe',
    color: '#F6A623',
    status: 'active',
    capabilities: ['市场分析', '平台对接', '物流优化', '本地化'],
    lastActive: '2024-12-19T11:00:00',
    messageCount: 215,
  },
  {
    id: 'agent_004',
    name: '营销大师',
    role: '营销顾问',
    description: '数字营销与品牌推广策略专家',
    icon: 'TrendingUp',
    color: '#EC4899',
    status: 'busy',
    capabilities: ['营销策略', '广告投放', '社媒运营', '数据分析'],
    lastActive: '2024-12-19T08:45:00',
    messageCount: 178,
  },
  {
    id: 'agent_005',
    name: '注册专员',
    role: '注册顾问',
    description: '全球公司注册与架构设计专家',
    icon: 'Building2',
    color: '#8B5CF6',
    status: 'active',
    capabilities: ['公司注册', '架构设计', '银行开户', '税务登记'],
    lastActive: '2024-12-19T10:00:00',
    messageCount: 312,
  },
  {
    id: 'agent_006',
    name: '支付专家',
    role: '支付顾问',
    description: '全球支付通道与资金管理专家',
    icon: 'CreditCard',
    color: '#10B981',
    status: 'active',
    capabilities: ['支付通道', '汇率优化', '资金管理', '风控审核'],
    lastActive: '2024-12-19T09:30:00',
    messageCount: 89,
  },
  {
    id: 'agent_007',
    name: '内容创客',
    role: '内容顾问',
    description: '自媒体内容创作与运营专家',
    icon: 'PenTool',
    color: '#F59E0B',
    status: 'idle',
    capabilities: ['内容创作', '视频制作', '文案撰写', '多平台发布'],
    lastActive: '2024-12-18T16:20:00',
    messageCount: 145,
  },
  {
    id: 'agent_008',
    name: '数据分析师',
    role: '数据顾问',
    description: '商业智能与数据分析专家',
    icon: 'BarChart3',
    color: '#6366F1',
    status: 'active',
    capabilities: ['数据报表', '趋势分析', '预测模型', '可视化'],
    lastActive: '2024-12-19T11:15:00',
    messageCount: 203,
  },
  {
    id: 'agent_009',
    name: '程序员',
    role: '技术顾问',
    description: '技术开发与系统架构专家',
    icon: 'Code',
    color: '#14B8A6',
    status: 'active',
    capabilities: ['系统架构', 'API开发', '技术咨询', '代码审查'],
    lastActive: '2024-12-19T07:50:00',
    messageCount: 167,
  },
  {
    id: 'agent_010',
    name: '风控卫士',
    role: '风控顾问',
    description: '全方位风险监控与预警系统',
    icon: 'Shield',
    color: '#CE1126',
    status: 'active',
    capabilities: ['风险监控', '欺诈检测', '合规审计', '预警通知'],
    lastActive: '2024-12-19T11:30:00',
    messageCount: 256,
  },
];

// ============================
// AI Todos
// ============================
export const mockAiTodos: AiTodo[] = [
  {
    id: 'todo_001',
    title: '萨摩亚SPV年审提醒',
    description: '太初国际（萨摩亚）有限公司年度申报将于30天后到期',
    agentId: 'agent_005',
    agentName: '注册专员',
    priority: 'high',
    status: 'pending',
    dueDate: '2025-01-18',
    createdAt: '2024-12-19',
  },
  {
    id: 'todo_002',
    title: '税务优化建议',
    description: '根据Q4财务数据，建议调整新加坡子公司利润分配方案',
    agentId: 'agent_001',
    agentName: '智财管家',
    priority: 'high',
    status: 'in_progress',
    dueDate: '2024-12-25',
    createdAt: '2024-12-17',
  },
  {
    id: 'todo_003',
    title: '合同审查完成',
    description: '与汇丰银行的账户服务协议已审查完毕，发现2条建议修改条款',
    agentId: 'agent_002',
    agentName: '法务精灵',
    priority: 'medium',
    status: 'completed',
    dueDate: '2024-12-20',
    createdAt: '2024-12-15',
  },
  {
    id: 'todo_004',
    title: '亚马逊欧洲站入驻',
    description: '协助准备KYC资料，预计3个工作日内完成审核',
    agentId: 'agent_003',
    agentName: '出海助手',
    priority: 'medium',
    status: 'in_progress',
    dueDate: '2024-12-24',
    createdAt: '2024-12-16',
  },
  {
    id: 'todo_005',
    title: '支付通道费率调整',
    description: 'Stripe欧洲卡组织费率将于明年1月上调0.3%',
    agentId: 'agent_006',
    agentName: '支付专家',
    priority: 'low',
    status: 'pending',
    dueDate: '2025-01-05',
    createdAt: '2024-12-18',
  },
];

// ============================
// Companies
// ============================
export const mockCompanies: Company[] = [
  {
    id: 'comp_001',
    name: '太初国际（萨摩亚）有限公司',
    type: 'samoa_spv',
    jurisdiction: '萨摩亚',
    registrationNumber: 'IC-2024-08921',
    status: 'active',
    incorporationDate: '2024-01-20',
    directors: [
      { id: 'dir_001', name: '陈董', nationality: '中国', appointedDate: '2024-01-20' },
    ],
    shareholders: [
      { id: 'shr_001', name: '陈董', shares: 10000, percentage: 100 },
    ],
    annualReturnDue: '2025-01-20',
    complianceStatus: 'good',
    documents: [
      { id: 'doc_001', name: '公司注册证书', type: 'certificate', status: 'uploaded', uploadDate: '2024-01-22' },
      { id: 'doc_002', name: '公司章程', type: 'articles', status: 'uploaded', uploadDate: '2024-01-22' },
      { id: 'doc_003', name: '董事名册', type: 'register', status: 'uploaded', uploadDate: '2024-01-25' },
    ],
    bankAccounts: [
      { id: 'ba_001', bankName: '汇丰银行', accountNumber: '****4567', currency: 'USD', status: 'active' },
      { id: 'ba_002', bankName: '星展银行', accountNumber: '****8901', currency: 'SGD', status: 'active' },
    ],
  },
  {
    id: 'comp_002',
    name: '太初科技（新加坡）私人有限公司',
    type: 'singapore',
    jurisdiction: '新加坡',
    registrationNumber: '202438912K',
    status: 'active',
    incorporationDate: '2024-03-15',
    directors: [
      { id: 'dir_002', name: '陈董', nationality: '中国', appointedDate: '2024-03-15' },
      { id: 'dir_003', name: '李明', nationality: '新加坡', appointedDate: '2024-03-15' },
    ],
    shareholders: [
      { id: 'shr_002', name: '太初国际（萨摩亚）有限公司', shares: 9000, percentage: 90 },
      { id: 'shr_003', name: '李明', shares: 1000, percentage: 10 },
    ],
    annualReturnDue: '2025-03-15',
    complianceStatus: 'good',
    documents: [
      { id: 'doc_004', name: '营业执照', type: 'certificate', status: 'uploaded', uploadDate: '2024-03-18' },
      { id: 'doc_005', name: '年度审计报告', type: 'audit', status: 'pending', uploadDate: '2024-03-20' },
    ],
    bankAccounts: [
      { id: 'ba_003', bankName: '华侨银行', accountNumber: '****2345', currency: 'SGD', status: 'active' },
    ],
  },
  {
    id: 'comp_003',
    name: '太初贸易（香港）有限公司',
    type: 'hong_kong',
    jurisdiction: '中国香港',
    registrationNumber: '2891234',
    status: 'active',
    incorporationDate: '2024-06-01',
    directors: [
      { id: 'dir_004', name: '陈董', nationality: '中国', appointedDate: '2024-06-01' },
    ],
    shareholders: [
      { id: 'shr_004', name: '太初国际（萨摩亚）有限公司', shares: 10000, percentage: 100 },
    ],
    annualReturnDue: '2025-06-01',
    complianceStatus: 'warning',
    documents: [
      { id: 'doc_006', name: '商业登记证', type: 'certificate', status: 'uploaded', uploadDate: '2024-06-05' },
      { id: 'doc_007', name: '周年申报表', type: 'annual_return', status: 'pending', uploadDate: '' },
    ],
    bankAccounts: [
      { id: 'ba_004', bankName: '汇丰银行', accountNumber: '****6789', currency: 'HKD', status: 'active' },
    ],
  },
];

// ============================
// Payment Channels
// ============================
export const mockPaymentChannels: PaymentChannel[] = [
  {
    id: 'pay_visa',
    name: 'Visa',
    type: 'card',
    icon: 'CreditCard',
    currencies: ['USD', 'EUR', 'GBP', 'HKD', 'SGD'],
    fee: 2.9,
    minAmount: 1,
    maxAmount: 50000,
    processingTime: '即时',
    isActive: true,
    supportedCountries: ['US', 'GB', 'EU', 'HK', 'SG'],
    settlementTime: 'T+2',
  },
  {
    id: 'pay_usdt',
    name: 'USDT',
    type: 'crypto',
    icon: 'Coins',
    currencies: ['USDT'],
    fee: 0.5,
    minAmount: 10,
    maxAmount: 1000000,
    processingTime: '5-30分钟',
    isActive: true,
    supportedCountries: ['GLOBAL'],
    settlementTime: '即时',
  },
  {
    id: 'pay_grab',
    name: 'GrabPay',
    type: 'ewallet',
    icon: 'Wallet',
    currencies: ['SGD', 'MYR', 'THB', 'VND', 'IDR'],
    fee: 1.8,
    minAmount: 1,
    maxAmount: 10000,
    processingTime: '即时',
    isActive: true,
    supportedCountries: ['SG', 'MY', 'TH', 'VN', 'ID'],
    settlementTime: 'T+1',
  },
  {
    id: 'pay_pix',
    name: 'Pix',
    type: 'local',
    icon: 'QrCode',
    currencies: ['BRL'],
    fee: 1.2,
    minAmount: 5,
    maxAmount: 50000,
    processingTime: '即时',
    isActive: true,
    supportedCountries: ['BR'],
    settlementTime: 'T+0',
  },
  {
    id: 'pay_alipay',
    name: 'Alipay',
    type: 'ewallet',
    icon: 'Smartphone',
    currencies: ['CNY', 'HKD'],
    fee: 1.5,
    minAmount: 1,
    maxAmount: 50000,
    processingTime: '即时',
    isActive: true,
    supportedCountries: ['CN', 'HK'],
    settlementTime: 'T+1',
  },
  {
    id: 'pay_mastercard',
    name: 'Mastercard',
    type: 'card',
    icon: 'CreditCard',
    currencies: ['USD', 'EUR', 'GBP', 'JPY', 'AUD'],
    fee: 2.9,
    minAmount: 1,
    maxAmount: 50000,
    processingTime: '即时',
    isActive: true,
    supportedCountries: ['US', 'GB', 'EU', 'JP', 'AU'],
    settlementTime: 'T+2',
  },
  {
    id: 'pay_bank_transfer',
    name: '电汇',
    type: 'bank_transfer',
    icon: 'Landmark',
    currencies: ['USD', 'EUR', 'GBP', 'HKD', 'SGD', 'CNY'],
    fee: 15,
    minAmount: 100,
    maxAmount: 500000,
    processingTime: '1-3工作日',
    isActive: true,
    supportedCountries: ['GLOBAL'],
    settlementTime: 'T+1~3',
  },
  {
    id: 'pay_wechat',
    name: '微信支付',
    type: 'ewallet',
    icon: 'MessageCircle',
    currencies: ['CNY', 'HKD'],
    fee: 1.2,
    minAmount: 1,
    maxAmount: 50000,
    processingTime: '即时',
    isActive: true,
    supportedCountries: ['CN', 'HK'],
    settlementTime: 'T+1',
  },
];

export const mockPaymentTransactions: PaymentTransaction[] = [
  { id: 'txn_001', channelId: 'pay_visa', channelName: 'Visa', amount: 12500, currency: 'USD', status: 'completed', type: 'incoming', counterparty: 'Amazon US', description: '销售收入结算', timestamp: '2024-12-19T09:00:00', fee: 362.5 },
  { id: 'txn_002', channelId: 'pay_usdt', channelName: 'USDT', amount: 5000, currency: 'USDT', status: 'completed', type: 'incoming', counterparty: 'Binance', description: 'OTC兑换', timestamp: '2024-12-18T16:30:00', fee: 25 },
  { id: 'txn_003', channelId: 'pay_grab', channelName: 'GrabPay', amount: 3200, currency: 'SGD', status: 'pending', type: 'incoming', counterparty: 'Shopee SG', description: '平台结算', timestamp: '2024-12-19T08:00:00', fee: 57.6 },
  { id: 'txn_004', channelId: 'pay_pix', channelName: 'Pix', amount: 8500, currency: 'BRL', status: 'completed', type: 'incoming', counterparty: 'Mercado Livre', description: '销售回款', timestamp: '2024-12-17T14:20:00', fee: 102 },
  { id: 'txn_005', channelId: 'pay_bank_transfer', channelName: '电汇', amount: 25000, currency: 'USD', status: 'processing', type: 'outgoing', counterparty: '供应商A', description: '货款支付', timestamp: '2024-12-19T10:00:00', fee: 15 },
  { id: 'txn_006', channelId: 'pay_alipay', channelName: 'Alipay', amount: 18000, currency: 'CNY', status: 'completed', type: 'incoming', counterparty: '天猫国际', description: '月度结算', timestamp: '2024-12-16T11:00:00', fee: 270 },
  { id: 'txn_007', channelId: 'pay_mastercard', channelName: 'Mastercard', amount: 7800, currency: 'EUR', status: 'completed', type: 'incoming', counterparty: 'Zalando', description: '欧洲销售', timestamp: '2024-12-15T09:30:00', fee: 226.2 },
  { id: 'txn_008', channelId: 'pay_usdt', channelName: 'USDT', amount: 3000, currency: 'USDT', status: 'failed', type: 'outgoing', counterparty: 'Wallet A', description: '转账失败-网络拥堵', timestamp: '2024-12-14T20:00:00', fee: 0 },
];

export const mockExchangeRates: ExchangeRate[] = [
  { from: 'USD', to: 'CNY', rate: 7.2456, timestamp: '2024-12-19T12:00:00', change24h: 0.12 },
  { from: 'USD', to: 'EUR', rate: 0.9234, timestamp: '2024-12-19T12:00:00', change24h: -0.08 },
  { from: 'USD', to: 'SGD', rate: 1.3456, timestamp: '2024-12-19T12:00:00', change24h: 0.03 },
  { from: 'USD', to: 'HKD', rate: 7.7890, timestamp: '2024-12-19T12:00:00', change24h: 0.01 },
  { from: 'USD', to: 'JPY', rate: 149.50, timestamp: '2024-12-19T12:00:00', change24h: -0.45 },
  { from: 'USDT', to: 'USD', rate: 0.9998, timestamp: '2024-12-19T12:00:00', change24h: -0.02 },
];

// ============================
// Tax Rates
// ============================
export const mockTaxRates: TaxRate[] = [
  { id: 'tax_001', country: '萨摩亚', countryCode: 'WS', structureType: '国际公司', corporateTax: 0, vatGst: 0, withholdingTax: 0, capitalGainsTax: 0, doubleTaxationTreaties: [], notes: '无所得税、无资本利得税、无印花税' },
  { id: 'tax_002', country: '中国香港', countryCode: 'HK', structureType: '有限公司', corporateTax: 16.5, vatGst: 0, withholdingTax: 0, capitalGainsTax: 0, doubleTaxationTreaties: ['CN', 'GB', 'DE', 'FR', 'SG'], notes: '属地征税，离岸收入免税' },
  { id: 'tax_003', country: '新加坡', countryCode: 'SG', structureType: '私人有限公司', corporateTax: 17, vatGst: 9, withholdingTax: 15, capitalGainsTax: 0, doubleTaxationTreaties: ['CN', 'HK', 'GB', 'DE', 'AU', 'IN'], notes: '首30万新币利润有税务优惠' },
  { id: 'tax_004', country: '美国', countryCode: 'US', structureType: 'C-Corp', corporateTax: 21, vatGst: 0, withholdingTax: 30, capitalGainsTax: 21, doubleTaxationTreaties: ['CN', 'GB', 'DE', 'JP', 'CA'], notes: '联邦税+州税，总税率约25-30%' },
  { id: 'tax_005', country: '英国', countryCode: 'GB', structureType: 'Limited Company', corporateTax: 25, vatGst: 20, withholdingTax: 0, capitalGainsTax: 25, doubleTaxationTreaties: ['CN', 'US', 'DE', 'FR', 'SG', 'HK'], notes: '利润超过25万英镑适用25%税率' },
  { id: 'tax_006', country: '日本', countryCode: 'JP', structureType: '株式会社', corporateTax: 23.2, vatGst: 10, withholdingTax: 20, capitalGainsTax: 15, doubleTaxationTreaties: ['CN', 'US', 'GB', 'DE', 'SG', 'HK'], notes: '法人税+住民税+事业税，实际约30%' },
  { id: 'tax_007', country: '德国', countryCode: 'DE', structureType: 'GmbH', corporateTax: 15, vatGst: 19, withholdingTax: 25, capitalGainsTax: 25, doubleTaxationTreaties: ['CN', 'US', 'GB', 'FR', 'JP', 'SG'], notes: '加上团结附加税和贸易税，实际约30-33%' },
  { id: 'tax_008', country: '阿联酋', countryCode: 'AE', structureType: ' mainland', corporateTax: 9, vatGst: 5, withholdingTax: 0, capitalGainsTax: 0, doubleTaxationTreaties: ['CN', 'IN', 'GB', 'DE'], notes: '2023年起超过37.5万迪拉姆利润征9%企业税' },
  { id: 'tax_009', country: '澳大利亚', countryCode: 'AU', structureType: 'Pty Ltd', corporateTax: 25, vatGst: 10, withholdingTax: 30, capitalGainsTax: 25, doubleTaxationTreaties: ['CN', 'US', 'GB', 'JP', 'SG'], notes: '基准企业税率25%' },
  { id: 'tax_010', country: '加拿大', countryCode: 'CA', structureType: 'Corporation', corporateTax: 15, vatGst: 5, withholdingTax: 25, capitalGainsTax: 25, doubleTaxationTreaties: ['CN', 'US', 'GB', 'DE', 'JP'], notes: '联邦税15%+省税，实际约25-31%' },
  { id: 'tax_011', country: 'BVI', countryCode: 'VG', structureType: '商业公司', corporateTax: 0, vatGst: 0, withholdingTax: 0, capitalGainsTax: 0, doubleTaxationTreaties: [], notes: '零税率，无审计要求' },
  { id: 'tax_012', country: '开曼群岛', countryCode: 'KY', structureType: '豁免公司', corporateTax: 0, vatGst: 0, withholdingTax: 0, capitalGainsTax: 0, doubleTaxationTreaties: [], notes: '无直接税，无外汇管制' },
  { id: 'tax_013', country: '中国', countryCode: 'CN', structureType: '有限公司', corporateTax: 25, vatGst: 13, withholdingTax: 10, capitalGainsTax: 20, doubleTaxationTreaties: ['HK', 'SG', 'US', 'GB', 'DE', 'JP'], notes: '高新技术企业15%优惠税率' },
  { id: 'tax_014', country: '越南', countryCode: 'VN', structureType: '有限责任公司', corporateTax: 20, vatGst: 10, withholdingTax: 10, capitalGainsTax: 20, doubleTaxationTreaties: ['CN', 'SG', 'JP', 'DE'], notes: '经济区企业可享10-17%优惠' },
  { id: 'tax_015', country: '泰国', countryCode: 'TH', structureType: '有限公司', corporateTax: 20, vatGst: 7, withholdingTax: 15, capitalGainsTax: 15, doubleTaxationTreaties: ['CN', 'SG', 'JP', 'DE', 'AU'], notes: 'BOI促进项目可享免税期' },
  { id: 'tax_016', country: '马来西亚', countryCode: 'MY', structureType: '私人有限公司', corporateTax: 24, vatGst: 8, withholdingTax: 10, capitalGainsTax: 24, doubleTaxationTreaties: ['CN', 'SG', 'JP', 'GB', 'DE', 'AU'], notes: '中小企业首60万马币可享15-17%' },
  { id: 'tax_017', country: '印尼', countryCode: 'ID', structureType: 'PT公司', corporateTax: 22, vatGst: 11, withholdingTax: 20, capitalGainsTax: 25, doubleTaxationTreaties: ['CN', 'SG', 'JP', 'AU', 'DE'], notes: '上市企业可降至19%' },
  { id: 'tax_018', country: '印度', countryCode: 'IN', structureType: '私人有限公司', corporateTax: 25, vatGst: 18, withholdingTax: 10, capitalGainsTax: 20, doubleTaxationTreaties: ['CN', 'SG', 'JP', 'GB', 'DE', 'AU'], notes: '制造业新公司可享15%优惠' },
  { id: 'tax_019', country: '菲律宾', countryCode: 'PH', structureType: '公司', corporateTax: 25, vatGst: 12, withholdingTax: 30, capitalGainsTax: 15, doubleTaxationTreaties: ['CN', 'JP', 'SG', 'DE'], notes: 'PEZA经济区企业可享4-17%' },
  { id: 'tax_020', country: '瑞士', countryCode: 'CH', structureType: 'AG/SA', corporateTax: 8.5, vatGst: 8.1, withholdingTax: 35, capitalGainsTax: 0, doubleTaxationTreaties: ['CN', 'US', 'GB', 'DE', 'JP', 'SG'], notes: '联邦+州+市镇税，实际约12-21%' },
  { id: 'tax_021', country: '荷兰', countryCode: 'NL', structureType: 'BV', corporateTax: 25.8, vatGst: 21, withholdingTax: 15, capitalGainsTax: 25.8, doubleTaxationTreaties: ['CN', 'US', 'GB', 'DE', 'JP', 'SG', 'HK'], notes: '创新盒子制度可享有效7%税率' },
];

// ============================
// Legal Compliance Data
// ============================
export const mockLegalCompliance: LegalCompliance[] = [
  { id: 'leg_001', country: '萨摩亚', countryCode: 'WS', category: '公司注册', requirement: '至少一名董事和一名股东', description: '可以是自然人或法人，无国籍限制', penalty: '公司注册申请被拒绝', status: 'required' },
  { id: 'leg_002', country: '萨摩亚', countryCode: 'WS', category: '年度合规', requirement: '年度申报和牌照费', description: '每年需提交年度申报并缴纳牌照费', penalty: '罚款及可能的除名', status: 'required' },
  { id: 'leg_003', country: '萨摩亚', countryCode: 'WS', category: '经济实质', requirement: '经济实质法案', description: '从事相关活动的公司需证明在萨摩亚有足够经济实质', penalty: '罚款最高10万美元', status: 'required' },
  { id: 'leg_004', country: '萨摩亚', countryCode: 'WS', category: '反洗钱', requirement: 'KYC/AML程序', description: '需维持有效的了解客户和反洗钱程序', penalty: '刑事责任及高额罚款', status: 'required' },
  { id: 'leg_005', country: '中国香港', countryCode: 'HK', category: '公司注册', requirement: '公司注册处登记', description: '所有公司必须在公司注册处登记', penalty: '每日罚款', status: 'required' },
  { id: 'leg_006', country: '中国香港', countryCode: 'HK', category: '税务', requirement: '商业登记证', description: '每年需更新商业登记证', penalty: '罚款300港币', status: 'required' },
  { id: 'leg_007', country: '中国香港', countryCode: 'HK', category: '审计', requirement: '年度审计', description: '有限公司需每年进行审计', penalty: '税务处罚', status: 'required' },
  { id: 'leg_008', country: '新加坡', countryCode: 'SG', category: '公司注册', requirement: '至少一名本地董事', description: '至少一名董事需为新加坡居民', penalty: '注册被拒绝', status: 'required' },
  { id: 'leg_009', country: '新加坡', countryCode: 'SG', category: '税务', requirement: 'GST注册', description: '年营业额超过100万新币需注册GST', penalty: '罚款最高1万新币', status: 'required' },
  { id: 'leg_010', country: '新加坡', countryCode: 'SG', category: '合规', requirement: '公司秘书', description: '必须在成立后6个月内任命公司秘书', penalty: '罚款', status: 'required' },
  { id: 'leg_011', country: '美国', countryCode: 'US', category: '税务', requirement: 'EIN税号', description: '必须申请雇主识别号码', penalty: '无法开设银行账户', status: 'required' },
  { id: 'leg_012', country: '美国', countryCode: 'US', category: '合规', requirement: 'BOI报告', description: '2024年起需向FinCEN报告受益所有人信息', penalty: '每日500美元罚款', status: 'required' },
  { id: 'leg_013', country: '英国', countryCode: 'GB', category: '公司注册', requirement: 'Companies House注册', description: '必须在Companies House注册', penalty: '无法合法经营', status: 'required' },
  { id: 'leg_014', country: '英国', countryCode: 'GB', category: '税务', requirement: 'Corporation Tax', description: '必须注册并缴纳公司税', penalty: '罚款及利息', status: 'required' },
  { id: 'leg_015', country: '阿联酋', countryCode: 'AE', category: '税务', requirement: '企业税注册', description: '2023年起需注册并缴纳企业税', penalty: '罚款1万迪拉姆', status: 'required' },
  { id: 'leg_016', country: 'BVI', countryCode: 'VG', category: '经济实质', requirement: '经济实质法', description: '从事相关活动的公司需证明有足够经济实质', penalty: '罚款及可能的注销', status: 'required' },
];

// ============================
// Videos
// ============================
export const mockVideos: Video[] = [
  {
    id: 'vid_001',
    title: '萨摩亚SPV注册全流程详解',
    description: '从准备材料到拿到注册证书，完整解析萨摩亚SPV的注册流程',
    thumbnail: '',
    duration: '18:32',
    views: 12580,
    likes: 892,
    author: '太初国链官方',
    authorAvatar: '',
    category: '公司注册',
    tags: ['萨摩亚', 'SPV', '注册流程'],
    publishedAt: '2024-11-15',
    videoUrl: '',
  },
  {
    id: 'vid_002',
    title: '2024全球税务优化策略',
    description: '如何利用萨摩亚SPV进行全球税务优化，合法降低税负',
    thumbnail: '',
    duration: '25:15',
    views: 8920,
    likes: 645,
    author: '智财管家AI',
    authorAvatar: '',
    category: '税务规划',
    tags: ['税务优化', '全球布局', 'SPV'],
    publishedAt: '2024-11-20',
    videoUrl: '',
  },
  {
    id: 'vid_003',
    title: 'AI大脑：10个智能助手实战演示',
    description: '深入了解太初国链AI大脑的10个专业AI助手',
    thumbnail: '',
    duration: '32:08',
    views: 23100,
    likes: 1876,
    author: '太初国链官方',
    authorAvatar: '',
    category: 'AI产品',
    tags: ['AI', '智能助手', '产品演示'],
    publishedAt: '2024-12-01',
    videoUrl: '',
  },
  {
    id: 'vid_004',
    title: '全球收款通道对比评测',
    description: 'Visa、USDT、GrabPay、Pix等主流通道对比',
    thumbnail: '',
    duration: '15:45',
    views: 6780,
    likes: 423,
    author: '支付专家AI',
    authorAvatar: '',
    category: '支付',
    tags: ['收款', '支付通道', '对比'],
    publishedAt: '2024-12-05',
    videoUrl: '',
  },
  {
    id: 'vid_005',
    title: '跨境电商出海：东南亚市场攻略',
    description: '东南亚六国市场分析、平台选择、运营策略',
    thumbnail: '',
    duration: '28:20',
    views: 15670,
    likes: 1234,
    author: '出海助手AI',
    authorAvatar: '',
    category: '跨境电商',
    tags: ['出海', '东南亚', '电商'],
    publishedAt: '2024-12-08',
    videoUrl: '',
  },
  {
    id: 'vid_006',
    title: 'DLC等级体系与DVC积分详解',
    description: '了解太初国链DLC等级体系和DVC积分的获取与使用',
    thumbnail: '',
    duration: '12:50',
    views: 9870,
    likes: 756,
    author: '太初国链官方',
    authorAvatar: '',
    category: '平台介绍',
    tags: ['DLC', 'DVC', '积分'],
    publishedAt: '2024-12-10',
    videoUrl: '',
  },
  {
    id: 'vid_007',
    title: '自媒体内容创作AI工作流',
    description: '使用AI助手实现内容创作、分发、数据分析全自动化',
    thumbnail: '',
    duration: '22:18',
    views: 11200,
    likes: 945,
    author: '内容创客AI',
    authorAvatar: '',
    category: '自媒体',
    tags: ['自媒体', 'AI创作', '工作流'],
    publishedAt: '2024-12-12',
    videoUrl: '',
  },
  {
    id: 'vid_008',
    title: '2025年全球合规趋势预测',
    description: '解析即将到来的合规变化，提前布局',
    thumbnail: '',
    duration: '19:40',
    views: 7650,
    likes: 567,
    author: '法务精灵AI',
    authorAvatar: '',
    category: '合规',
    tags: ['合规', '趋势', '2025'],
    publishedAt: '2024-12-15',
    videoUrl: '',
  },
];

export const mockVideoComments: VideoComment[] = [
  { id: 'cmt_001', videoId: 'vid_001', userName: '张总', userAvatar: '', content: '非常详细的讲解，已经注册了萨摩亚公司，流程确实很快！', likes: 45, timestamp: '2024-11-16T10:00:00' },
  { id: 'cmt_002', videoId: 'vid_001', userName: '李经理', userAvatar: '', content: '请问注册费用大概是多少？', likes: 12, timestamp: '2024-11-16T14:30:00' },
  { id: 'cmt_003', videoId: 'vid_003', userName: '王老板', userAvatar: '', content: 'AI大脑功能太强大了，特别是风控卫士！', likes: 89, timestamp: '2024-12-02T09:00:00' },
];

// ============================
// Media Dashboard
// ============================
export const mockMediaDashboard: MediaDashboard = {
  totalPosts: 156,
  totalImpressions: 2450000,
  totalFollowers: 128000,
  growthRate: 12.5,
  platformStats: [
    { platform: '微信公众号', followers: 45000, posts: 52, engagement: 4.2, growth: 8.5 },
    { platform: '抖音', followers: 38000, posts: 48, engagement: 6.8, growth: 15.2 },
    { platform: '小红书', followers: 22000, posts: 32, engagement: 5.5, growth: 22.1 },
    { platform: '微博', followers: 15000, posts: 18, engagement: 3.1, growth: 5.8 },
    { platform: 'Twitter', followers: 5000, posts: 4, engagement: 2.8, growth: -2.1 },
    { platform: 'LinkedIn', followers: 3000, posts: 2, engagement: 4.5, growth: 18.3 },
  ],
};

export const mockMediaPosts: MediaPost[] = [
  { id: 'post_001', title: '萨摩亚SPV注册指南2024版', content: '详细解析萨摩亚SPV的优势与注册流程...', platform: 'wechat', status: 'published', publishedAt: '2024-12-18', aiGenerated: true, engagement: { impressions: 12500, clicks: 890, likes: 456, shares: 234, comments: 67 } },
  { id: 'post_002', title: '全球税务优化五大策略', content: '企业出海必知的税务优化方法...', platform: 'tiktok', status: 'published', publishedAt: '2024-12-17', aiGenerated: false, engagement: { impressions: 8900, clicks: 1200, likes: 678, shares: 345, comments: 89 } },
  { id: 'post_003', title: 'AI大脑：你的智能出海合伙人', content: '太初国链AI大脑功能全面解析...', platform: 'xiaohongshu', status: 'scheduled', scheduledAt: '2024-12-20T10:00:00', aiGenerated: true, engagement: { impressions: 0, clicks: 0, likes: 0, shares: 0, comments: 0 } },
  { id: 'post_004', title: '东南亚电商市场Q4报告', content: '2024年Q4东南亚六国电商数据...', platform: 'weibo', status: 'draft', aiGenerated: false, engagement: { impressions: 0, clicks: 0, likes: 0, shares: 0, comments: 0 } },
  { id: 'post_005', title: '跨境收款通道对比', content: 'Visa、USDT、本地支付全面对比...', platform: 'wechat', status: 'published', publishedAt: '2024-12-15', aiGenerated: true, engagement: { impressions: 15600, clicks: 1100, likes: 567, shares: 289, comments: 78 } },
];

// ============================
// Admin Dashboard Data
// ============================
export const mockAdminKpis: AdminKpi[] = [
  { label: '注册用户', value: 12856, change: 12.5, changeType: 'up', suffix: '人' },
  { label: '活跃公司', value: 3420, change: 8.3, changeType: 'up', suffix: '家' },
  { label: '今日收入', value: 45800, change: 23.1, changeType: 'up', prefix: '$' },
  { label: 'AI对话量', value: 89200, change: 45.2, changeType: 'up', suffix: '次' },
  { label: '待处理订单', value: 156, change: -5.2, changeType: 'down', suffix: '单' },
  { label: '合规风险', value: 12, change: -2.1, changeType: 'down', suffix: '项' },
];

export const mockAdminOrders: AdminOrder[] = [
  { id: 'ord_001', type: 'company_registration', customer: '陈董', customerId: 'usr_001', status: 'processing', amount: 2800, currency: 'USD', createdAt: '2024-12-18', updatedAt: '2024-12-19', assignedTo: '张经理', notes: '萨摩亚SPV注册' },
  { id: 'ord_002', type: 'bank_account', customer: '李总', customerId: 'usr_002', status: 'reviewing', amount: 1500, currency: 'USD', createdAt: '2024-12-17', updatedAt: '2024-12-19', assignedTo: '王经理', notes: '汇丰银行开户' },
  { id: 'ord_003', type: 'payment_setup', customer: '王经理', customerId: 'usr_003', status: 'completed', amount: 500, currency: 'USD', createdAt: '2024-12-15', updatedAt: '2024-12-17', assignedTo: '李经理', notes: 'Stripe接入' },
  { id: 'ord_004', type: 'company_registration', customer: '张总', customerId: 'usr_004', status: 'new', amount: 3200, currency: 'USD', createdAt: '2024-12-19', updatedAt: '2024-12-19', notes: '新加坡公司+BVI架构' },
  { id: 'ord_005', type: 'compliance', customer: '赵总', customerId: 'usr_005', status: 'processing', amount: 800, currency: 'USD', createdAt: '2024-12-16', updatedAt: '2024-12-18', assignedTo: '刘经理', notes: '年度合规审查' },
  { id: 'ord_006', type: 'bank_account', customer: '陈董', customerId: 'usr_001', status: 'completed', amount: 2000, currency: 'USD', createdAt: '2024-12-10', updatedAt: '2024-12-14', assignedTo: '张经理', notes: '星展银行开户' },
  { id: 'ord_007', type: 'payment_setup', customer: '李总', customerId: 'usr_002', status: 'processing', amount: 1200, currency: 'USD', createdAt: '2024-12-14', updatedAt: '2024-12-19', assignedTo: '王经理', notes: 'GrabPay+Pix接入' },
  { id: 'ord_008', type: 'company_registration', customer: '孙总', customerId: 'usr_006', status: 'reviewing', amount: 4500, currency: 'USD', createdAt: '2024-12-13', updatedAt: '2024-12-18', assignedTo: '张经理', notes: '香港+新加坡双架构' },
];

export const mockAdminUsers: AdminUser[] = [
  { id: 'usr_001', name: '陈董', email: 'chendong@taichu.com', phone: '+86 138****8888', dlcLevel: 6, dvcBalance: 12580, status: 'active', joinDate: '2024-01-15', lastActive: '2024-12-19', companyCount: 3, orderCount: 8 },
  { id: 'usr_002', name: '李总', email: 'li@example.com', phone: '+86 139****6666', dlcLevel: 4, dvcBalance: 5200, status: 'active', joinDate: '2024-02-20', lastActive: '2024-12-18', companyCount: 2, orderCount: 5 },
  { id: 'usr_003', name: '王经理', email: 'wang@example.com', phone: '+86 137****5555', dlcLevel: 3, dvcBalance: 3100, status: 'active', joinDate: '2024-03-10', lastActive: '2024-12-19', companyCount: 1, orderCount: 3 },
  { id: 'usr_004', name: '张总', email: 'zhang@example.com', phone: '+86 136****4444', dlcLevel: 5, dvcBalance: 28500, status: 'active', joinDate: '2023-11-05', lastActive: '2024-12-17', companyCount: 5, orderCount: 12 },
  { id: 'usr_005', name: '赵总', email: 'zhao@example.com', phone: '+86 135****3333', dlcLevel: 2, dvcBalance: 800, status: 'active', joinDate: '2024-06-01', lastActive: '2024-12-16', companyCount: 1, orderCount: 2 },
  { id: 'usr_006', name: '孙总', email: 'sun@example.com', phone: '+86 134****2222', dlcLevel: 4, dvcBalance: 12800, status: 'inactive', joinDate: '2024-04-15', lastActive: '2024-11-30', companyCount: 2, orderCount: 4 },
  { id: 'usr_007', name: '周总', email: 'zhou@example.com', phone: '+86 133****1111', dlcLevel: 1, dvcBalance: 100, status: 'active', joinDate: '2024-12-01', lastActive: '2024-12-18', companyCount: 0, orderCount: 0 },
  { id: 'usr_008', name: '吴总', email: 'wu@example.com', phone: '+86 132****0000', dlcLevel: 3, dvcBalance: 4500, status: 'suspended', joinDate: '2024-05-20', lastActive: '2024-10-15', companyCount: 1, orderCount: 1 },
];

// ============================
// Notifications
// ============================
export const mockNotifications: Notification[] = [
  { id: 'notif_001', title: '年审提醒', message: '太初国际（萨摩亚）有限公司年度申报将于30天后到期，请及时处理。', type: 'warning', read: false, timestamp: '2024-12-19T09:00:00', actionUrl: '/documents' },
  { id: 'notif_002', title: '支付成功', message: 'Visa通道收款 $12,500.00 已到账。', type: 'success', read: false, timestamp: '2024-12-19T08:30:00' },
  { id: 'notif_003', title: 'AI建议', message: '智财管家建议调整新加坡子公司利润分配方案，预计可节省税费15%。', type: 'info', read: false, timestamp: '2024-12-18T16:00:00', actionUrl: '/ai-chat/agent_001' },
  { id: 'notif_004', title: '新功能上线', message: 'AI大脑新增「合同审查」功能，可自动识别合同风险条款。', type: 'info', read: true, timestamp: '2024-12-17T10:00:00', actionUrl: '/ai' },
  { id: 'notif_005', title: '合规警报', message: '香港公司周年申报表即将到期，请于7天内提交。', type: 'warning', read: false, timestamp: '2024-12-16T14:00:00', actionUrl: '/legal-hub' },
  { id: 'notif_006', title: 'DLC升级', message: '恭喜！您的DLC等级已提升至「黄金LV.6」，解锁更多专属权益。', type: 'success', read: true, timestamp: '2024-12-15T09:00:00', actionUrl: '/dlc-level' },
  { id: 'notif_007', title: '汇率变动', message: 'USD/CNY 汇率上涨0.12%，建议关注换汇时机。', type: 'info', read: true, timestamp: '2024-12-14T11:00:00' },
  { id: 'notif_008', title: '系统维护', message: '系统将于12月22日凌晨2:00-4:00进行维护，部分功能可能受影响。', type: 'warning', read: true, timestamp: '2024-12-13T18:00:00' },
];

// ============================
// Chart Data
// ============================
export const mockRevenueChartData = [
  { name: '1月', value: 32000 },
  { name: '2月', value: 28000 },
  { name: '3月', value: 35000 },
  { name: '4月', value: 42000 },
  { name: '5月', value: 38000 },
  { name: '6月', value: 45000 },
  { name: '7月', value: 52000 },
  { name: '8月', value: 48000 },
  { name: '9月', value: 55000 },
  { name: '10月', value: 62000 },
  { name: '11月', value: 58000 },
  { name: '12月', value: 45800 },
];

export const mockPaymentChannelChartData = [
  { name: 'Visa', value: 35 },
  { name: 'USDT', value: 25 },
  { name: '电汇', value: 20 },
  { name: 'GrabPay', value: 8 },
  { name: 'Pix', value: 7 },
  { name: '其他', value: 5 },
];

export const mockUserGrowthChartData = [
  { name: '1月', value: 4200 },
  { name: '2月', value: 5100 },
  { name: '3月', value: 5800 },
  { name: '4月', value: 6400 },
  { name: '5月', value: 7200 },
  { name: '6月', value: 8100 },
  { name: '7月', value: 8900 },
  { name: '8月', value: 9600 },
  { name: '9月', value: 10500 },
  { name: '10月', value: 11200 },
  { name: '11月', value: 12100 },
  { name: '12月', value: 12856 },
];

export const mockAiUsageChartData = [
  { name: '智财管家', value: 12500 },
  { name: '法务精灵', value: 8900 },
  { name: '出海助手', value: 15600 },
  { name: '营销大师', value: 11200 },
  { name: '注册专员', value: 18900 },
  { name: '支付专家', value: 7800 },
  { name: '内容创客', value: 9800 },
  { name: '数据分析师', value: 13400 },
  { name: '程序员', value: 10200 },
  { name: '风控卫士', value: 16700 },
];

// ============================
// Service Shortcuts (Home Page 8-Grid)
// ============================
export const mockServiceShortcuts = [
  { id: 'svc_001', label: '税务计算', icon: 'Calculator', path: '/tax-calculator', color: '#F6A623' },
  { id: 'svc_002', label: '法务中台', icon: 'Shield', path: '/legal-hub', color: '#3B82F6' },
  { id: 'svc_003', label: '视频中心', icon: 'Play', path: '/video-center', color: '#EC4899' },
  { id: 'svc_004', label: '公司注册', icon: 'Building2', path: '/company-register', color: '#8B5CF6' },
  { id: 'svc_005', label: '全球收款', icon: 'CreditCard', path: '/payment-console', color: '#10B981' },
  { id: 'svc_006', label: '银行开户', icon: 'Landmark', path: '/bank-account', color: '#14B8A6' },
  { id: 'svc_007', label: 'DLC等级', icon: 'Award', path: '/dlc-level', color: '#F59E0B' },
  { id: 'svc_008', label: '文档中心', icon: 'FileText', path: '/documents', color: '#6B7280' },
];

// ============================
// Home Dashboard Data
// ============================
export const mockHomeDashboard = {
  todayRevenue: 45800,
  revenueChange: 23.5,
  activeCompanies: 3,
  pendingTodos: 5,
  unreadNotifications: 3,
  aiRecommendations: 4,
  exchangeRates: mockExchangeRates,
  recentTransactions: mockPaymentTransactions.slice(0, 5),
};

// ============================
// Admin Sidebar Navigation
// ============================
export const mockAdminSidebarItems = [
  { id: 'dashboard', label: '仪表盘', icon: 'LayoutDashboard', path: '/admin/dashboard' },
  { id: 'users', label: '用户管理', icon: 'Users', path: '/admin/users' },
  { id: 'companies', label: '公司订单', icon: 'Building', path: '/admin/companies' },
  { id: 'banks', label: '银行开户', icon: 'Landmark', path: '/admin/banks' },
  { id: 'payments', label: '全球支付', icon: 'CreditCard', path: '/admin/payments' },
  { id: 'ai-knowledge', label: 'AI知识库', icon: 'Brain', path: '/admin/ai-knowledge' },
  { id: 'tax-rates', label: '税率数据库', icon: 'Database', path: '/admin/tax-rates' },
  { id: 'dlc', label: 'DLC配置', icon: 'Award', path: '/admin/dlc' },
  { id: 'dvsf', label: 'DVSF分红池', icon: 'PieChart', path: '/admin/dvsf' },
  { id: 'settings', label: '系统设置', icon: 'Settings', path: '/admin/settings' },
];
