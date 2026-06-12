import { create } from 'zustand';

// ============ Types ============
export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  duration?: number;
}
export interface Company {
  id: string;
  nameCn: string;
  nameEn: string;
  name?: string;
  regNo?: string;
  registrationNumber?: string;
  status: string;
  annualDue?: string;
  jurisdiction?: string;
  bankAccounts?: any[];
  documents?: any[];
}
export interface Agent {
  id: string;
  name: string;
  icon: string;
  status: 'active' | 'idle' | 'busy';
  todayCount: number;
  todayLabel: string;
  color: string;
  description?: string;
  capabilities?: string[];
}
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: string;
}

// ============ Mock Data ============
const mockCompanies: Company[] = [
  {
    id: 'c1',
    nameCn: '太初国际（萨摩亚）有限公司',
    nameEn: 'TAICHU OPC LTD',
    name: 'TAICHU OPC LTD',
    regNo: 'IC 2024/00123',
    registrationNumber: 'IC 2024/00123',
    status: 'active',
    annualDue: '2025-03-15',
    jurisdiction: '萨摩亚',
    bankAccounts: [
      {
        bankName: '汇丰银行',
        accountNo: '****4523',
        currency: 'USD',
        balance: 45230.5,
        status: 'active',
      },
    ],
    documents: [
      {
        id: 'd1',
        name: '公司注册证书',
        type: 'certificate',
        status: 'completed',
        date: '2024-01-15',
      },
    ],
  },
  {
    id: 'c2',
    nameCn: '太初贸易（萨摩亚）有限公司',
    nameEn: 'TAICHU TRADING LTD',
    name: 'TAICHU TRADING LTD',
    regNo: 'IC 2024/00456',
    registrationNumber: 'IC 2024/00456',
    status: 'active',
    annualDue: '2025-06-20',
    jurisdiction: '萨摩亚',
    bankAccounts: [],
    documents: [],
  },
  {
    id: 'c3',
    nameCn: '太初数字科技（萨摩亚）有限公司',
    nameEn: 'TAICHU DIGITAL LTD',
    name: 'TAICHU DIGITAL LTD',
    regNo: 'IC 2024/00789',
    registrationNumber: 'IC 2024/00789',
    status: 'pending',
    annualDue: '2025-09-10',
    jurisdiction: '萨摩亚',
    bankAccounts: [],
    documents: [],
  },
];

const mockAgents: Agent[] = [
  {
    id: 'a1',
    name: 'AI选品官',
    icon: 'Flame',
    status: 'active',
    todayCount: 3,
    todayLabel: '个爆品',
    color: '#F6A623',
    description: '智能发现潜力爆款产品，分析市场趋势',
    capabilities: ['爆品发现', '趋势分析', '竞品监控', '定价建议'],
  },
  {
    id: 'a2',
    name: 'AI定价师',
    icon: 'TrendingUp',
    status: 'active',
    todayCount: 50,
    todayLabel: '单已优化',
    color: '#00D4AA',
    description: '自动计算最优定价策略',
    capabilities: ['动态定价', '利润分析', '竞品比价'],
  },
  {
    id: 'a3',
    name: 'AI文案师',
    icon: 'Pen',
    status: 'active',
    todayCount: 12,
    todayLabel: '篇多语言',
    color: '#3B82F6',
    description: '自动生成多语言营销文案',
    capabilities: ['多语言翻译', 'SEO优化', '卖点提炼'],
  },
  {
    id: 'a4',
    name: 'AI客服官',
    icon: 'MessageCircle',
    status: 'active',
    todayCount: 23,
    todayLabel: '单已处理',
    color: '#8B5CF6',
    description: '7×24小时智能客服',
    capabilities: ['自动回复', '工单处理', '情绪识别'],
  },
  {
    id: 'a5',
    name: 'AI合规官',
    icon: 'Shield',
    status: 'busy',
    todayCount: 1,
    todayLabel: '单风险拦截',
    color: '#CE1126',
    description: '实时监控合规风险',
    capabilities: ['法规监控', '风险预警', '合规审查'],
  },
  {
    id: 'a6',
    name: 'AI物流官',
    icon: 'Truck',
    status: 'active',
    todayCount: 200,
    todayLabel: '运费节省$',
    color: '#10B981',
    description: '优化物流成本和时效',
    capabilities: ['路径优化', '运费比价', '时效监控'],
  },
  {
    id: 'a7',
    name: 'AI汇率官',
    icon: 'RefreshCw',
    status: 'active',
    todayCount: 1,
    todayLabel: '换汇提醒',
    color: '#F59E0B',
    description: '实时监控汇率变动',
    capabilities: ['汇率监控', '换汇提醒', '风险对冲'],
  },
  {
    id: 'a8',
    name: 'AI广告官',
    icon: 'Megaphone',
    status: 'idle',
    todayCount: 4.5,
    todayLabel: 'ROI',
    color: '#EC4899',
    description: '优化广告投放策略',
    capabilities: ['投放优化', 'ROI分析', '受众定位'],
  },
  {
    id: 'a9',
    name: 'AI税务师',
    icon: 'Calculator',
    status: 'active',
    todayCount: 12000,
    todayLabel: '本月节税$',
    color: '#6366F1',
    description: '智能税务规划',
    capabilities: ['税务规划', '节税优化', '申报提醒'],
  },
  {
    id: 'a10',
    name: 'AI风控官',
    icon: 'Lock',
    status: 'active',
    todayCount: 3,
    todayLabel: '单欺诈拦截',
    color: '#CE1126',
    description: '全方位风险管控',
    capabilities: ['欺诈检测', '信用评估', '交易监控'],
  },
];

const mockNotifications: Notification[] = [
  {
    id: 'n1',
    title: '年审提醒',
    message: '太初国际（萨摩亚）有限公司年度申报将于30天后到期',
    type: 'warning',
    read: false,
    timestamp: '2024-12-19T09:00:00',
  },
  {
    id: 'n2',
    title: '支付成功',
    message: 'Visa通道收款 $12,500.00 已到账',
    type: 'success',
    read: false,
    timestamp: '2024-12-19T08:30:00',
  },
  {
    id: 'n3',
    title: 'AI建议',
    message: 'AI税务师建议调整新加坡子公司利润分配方案',
    type: 'info',
    read: false,
    timestamp: '2024-12-18T16:00:00',
  },
  {
    id: 'n4',
    title: '新功能上线',
    message: 'AI大脑新增「合同审查」功能',
    type: 'info',
    read: true,
    timestamp: '2024-12-17T10:00:00',
  },
  {
    id: 'n5',
    title: '合规警报',
    message: '香港公司周年申报表即将到期，请于7天内提交',
    type: 'warning',
    read: false,
    timestamp: '2024-12-16T14:00:00',
  },
  {
    id: 'n6',
    title: 'DLC升级',
    message: '恭喜！您的DLC等级已提升至「黄金L6」',
    type: 'success',
    read: true,
    timestamp: '2024-12-15T09:00:00',
  },
  {
    id: 'n7',
    title: '汇率变动',
    message: 'USD/CNY 汇率上涨0.12%',
    type: 'info',
    read: true,
    timestamp: '2024-12-14T11:00:00',
  },
  {
    id: 'n8',
    title: '系统维护',
    message: '系统将于12月22日凌晨2:00-4:00进行维护',
    type: 'warning',
    read: true,
    timestamp: '2024-12-13T18:00:00',
  },
];

// ============ Store Interface ============
interface AppStore {
  // Navigation
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  showBottomNav: boolean;
  setShowBottomNav: (show: boolean) => void;

  // User
  user: {
    name: string;
    avatar: string;
    dlcLevel: number;
    dlcLabel: string;
    dvcBalance: number;
    email?: string;
    phone?: string;
  };

  // AI Brain
  agents: Agent[];
  activeAgents: Agent[];
  aiMessages: Record<
    string,
    Array<{ id: string; role: 'user' | 'ai'; content: string; timestamp: string }>
  >;
  addAiMessage: (agentId: string, message: { role: 'user' | 'ai'; content: string }) => void;
  unreadAiCount: number;

  // Companies
  companies: Company[];
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;

  // Payments
  todayRevenue: number;
  paymentChannels: Array<{ id: string; name: string; enabled: boolean; amount: number }>;
  paymentTransactions: any[];
  exchangeRates: any[];

  // Notifications
  notifications: Notification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  setNotifications: (n: Notification[]) => void;

  // Admin
  isAdmin: boolean;
  setAuthenticated?: (v: boolean) => void;

  // UI
  toasts: ToastItem[];
  addToast: (t: any) => void;
  removeToast: (id: string) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

// ============ Create Store ============
export const useAppStore = create<AppStore>((set, get) => ({
  // Navigation
  currentTab: 'home',
  setCurrentTab: (tab) => set({ currentTab: tab }),
  showBottomNav: true,
  setShowBottomNav: (show) => set({ showBottomNav: show }),

  // User
  user: {
    name: '陈董',
    avatar: '',
    dlcLevel: 6,
    dlcLabel: 'L6 大师',
    dvcBalance: 12580,
    email: 'chendong@taichu.com',
    phone: '+86 138****8888',
  },

  // AI Brain
  agents: mockAgents,
  activeAgents: mockAgents.filter((a) => a.status === 'active'),
  aiMessages: {
    a1: [
      {
        id: 'm1',
        role: 'ai',
        content:
          '您好！我是AI选品官。我可以帮您发现潜力爆款产品，分析市场趋势。请问您想了解哪个市场？',
        timestamp: '2024-12-19T10:00:00',
      },
    ],
  },
  addAiMessage: (agentId, msg) =>
    set((s) => {
      const msgs = s.aiMessages[agentId] || [];
      return {
        aiMessages: {
          ...s.aiMessages,
          [agentId]: [
            ...msgs,
            { ...msg, id: Date.now().toString(), timestamp: new Date().toISOString() },
          ],
        },
      };
    }),
  unreadAiCount: 3,

  // Companies
  companies: mockCompanies,
  selectedCompanyId: null,
  setSelectedCompanyId: (id) => set({ selectedCompanyId: id }),

  // Payments
  todayRevenue: 12580,
  paymentChannels: [
    { id: 'visa', name: 'Visa', enabled: true, amount: 8000 },
    { id: 'usdt', name: 'USDT-TRC20', enabled: true, amount: 3000 },
    { id: 'grab', name: 'GrabPay', enabled: true, amount: 1580 },
  ],
  paymentTransactions: [
    {
      id: 't1',
      description: 'Visa收款 - 泰国客户',
      amount: 5230.0,
      currency: 'USD',
      type: 'incoming',
      status: 'completed',
      channel: 'Visa',
      date: '2024-12-19T08:30:00',
    },
    {
      id: 't2',
      description: 'USDT收款 - 新加坡客户',
      amount: 3150.0,
      currency: 'USDT',
      type: 'incoming',
      status: 'completed',
      channel: 'USDT-TRC20',
      date: '2024-12-19T07:15:00',
    },
    {
      id: 't3',
      description: 'GrabPay收款 - 马来西亚客户',
      amount: 1200.5,
      currency: 'USD',
      type: 'incoming',
      status: 'completed',
      channel: 'GrabPay',
      date: '2024-12-18T22:00:00',
    },
    {
      id: 't4',
      description: '电汇至香港账户',
      amount: -8000.0,
      currency: 'USD',
      type: 'outgoing',
      status: 'completed',
      channel: 'Wire',
      date: '2024-12-18T14:30:00',
    },
    {
      id: 't5',
      description: 'Pix收款 - 巴西客户',
      amount: 890.0,
      currency: 'USD',
      type: 'incoming',
      status: 'pending',
      channel: 'Pix',
      date: '2024-12-18T11:20:00',
    },
  ],
  exchangeRates: [
    { currency: 'USD', rate: 1, change: 0 },
    { currency: 'CNY', rate: 7.25, change: 0.12 },
    { currency: 'HKD', rate: 7.8, change: -0.05 },
    { currency: 'EUR', rate: 0.92, change: -0.03 },
  ],

  // Notifications
  notifications: mockNotifications,
  unreadNotificationCount: 5,
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  setNotifications: (n) => set({ notifications: n }),

  // Admin
  isAdmin: true,
  setAuthenticated: () => {},

  // UI
  toasts: [],
  addToast: (toast) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, toast?.duration || 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  isLoading: false,
  setIsLoading: (v) => set({ isLoading: v }),
}));

export default useAppStore;
