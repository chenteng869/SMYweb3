import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Sparkles, User, Paperclip, Image, FileText,
  TrendingUp, Shield, Building2, CreditCard, Package, DollarSign,
  Scale, Receipt, Clock, ChevronRight, Zap, X
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

// ============================
// Types
// ============================
interface Message {
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
  productCard?: ProductCard;
}

interface ProductCard {
  name: string;
  image?: string;
  profit: string;
  competition: string;
  trend: string;
}

// ============================
// Mock Quick Replies by Agent
// ============================
const quickRepliesByAgent: Record<string, string[]> = {
  'agent_003': ['东南亚', '中东', '拉美', '欧美'],
  'agent_001': ['税务优化', '利润规划', '报表分析'],
  'agent_002': ['合同审查', '合规检查', '风险评估'],
  'agent_005': ['萨摩亚SPV', '新加坡公司', '香港公司'],
  'agent_006': ['收款通道', '汇率优化', '资金管理'],
  'default': ['帮我分析一下', '推荐方案', '具体操作'],

  'product': ['泰国市场', '中东市场', '拉美市场', '帮我选品'],
  'pricing': ['自动定价', '竞品分析', '利润优化'],
  'copy': ['产品文案', '多语言翻译', 'SEO优化'],
  'service': ['自动回复', '工单处理', '客户分析'],
  'compliance': ['法规检查', '合同审查', '风险评估'],
  'logistics': ['运费优化', '仓储方案', '路径规划'],
  'forex': ['汇率监控', '换汇提醒', '对冲策略'],
  'ads': ['投放优化', 'ROI分析', '受众定位'],
  'tax': ['税务规划', '节税方案', '申报提醒'],
  'risk': ['欺诈检测', '信用评估', '交易监控'],
};
// New agent ID mapping
const agentNameMap: Record<string, string> = {
  'product': 'AI选品官', 'pricing': 'AI定价师', 'copy': 'AI文案师',
  'service': 'AI客服官', 'compliance': 'AI合规官', 'logistics': 'AI物流官',
  'forex': 'AI汇率官', 'ads': 'AI广告官', 'tax': 'AI税务师', 'risk': 'AI风控官',
};

const agentRoleMap: Record<string, string> = {
  'product': '智能选品与市场分析', 'pricing': '智能定价与竞品分析', 'copy': '多语言文案与SEO',
  'service': '智能客服与工单处理', 'compliance': '法规合规与合同审查', 'logistics': '物流优化与仓储规划',
  'forex': '汇率监控与对冲策略', 'ads': '广告投放与ROI优化', 'tax': '税务规划与节税方案', 'risk': '风控监测与欺诈检测',
};


// ============================
// Mock Responses
// ============================
const mockResponses: Record<string, { content: string; productCard?: ProductCard }> = {
  '帮我看看泰国市场有什么好卖的产品': {
    content: '根据最新数据分析，泰国市场以下品类增长迅速：\n\n1. 🍵 中国茶叶（+180% YoY）\n2. 🍶 老酒/白酒（+150%）\n3. 🏠 智能家居小件（+120%）\n\n建议您考虑福建老酒，当前搜索量暴涨300%，竞争度低，预估利润率45%。',
    productCard: {
      name: '福建老酒',
      profit: '45%',
      competition: '低',
      trend: '+300%',
    },
  },
  '东南亚': {
    content: '东南亚市场目前是中国出海最热门的目的地。2024年Q3数据：\n\n🇹🇭 泰国：白酒/茶叶增长最快\n🇻🇳 越南：智能家居需求旺盛\n🇮🇩 印尼：美妆护肤品类爆发\n🇲🇾 马来西亚：清真食品市场大\n\n您想深入了解哪个国家？',
  },
  '中东': {
    content: '中东市场（特别是阿联酋和沙特）消费能力强，客单价高：\n\n🎯 高潜力品类：\n• 智能家居（+200%）\n• 高端茶叶（+160%）\n• 健康食品（+140%）\n• 母婴用品（+120%）\n\n建议优先考虑迪拜自贸区注册，享0%个人所得税。',
  },
  '拉美': {
    content: '拉美市场正在快速数字化，巴西和墨西哥领跑：\n\n📈 巴西（+85%电商增长）\n• 美妆护肤、消费电子最热\n• 本地支付方式Pix普及率90%\n\n📈 墨西哥（+70%）\n• 汽配、家居用品需求大\n\n需要我分析具体的入驻方案吗？',
  },
  '欧美': {
    content: '欧美市场成熟稳定，合规要求高但利润空间大：\n\n🇪🇺 欧洲：\n• 德国/法国：高品质消费品\n• 需VAT注册，GDPR合规\n\n🇺🇸 美国：\n• 最大电商市场\n• 需关注BOI报告义务\n\n建议先注册香港或新加坡公司作为控股主体。',
  },
};

// ============================
// Sample conversation initializer
// ============================
function getInitialMessages(agentId: string, agentName: string): Message[] {
  const mappedName = agentNameMap[agentId] || agentName;
  if (agentId === 'agent_003' || agentId === 'product') {
    return [
      {
        role: 'ai',
        content: `您好！我是${mappedName}。我可以帮您发现潜力爆款产品，分析市场趋势。请问您想了解哪个市场？`,
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      },
    ];
  }
  return [];
}

// ============================
// Typing Indicator Component
// ============================
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="flex items-end gap-3"
    >
      <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
        <Sparkles size={14} className="text-coral" />
      </div>
      <div className="bg-bg-elevated rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          <motion.span
            className="w-2 h-2 rounded-full bg-text-muted"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="w-2 h-2 rounded-full bg-text-muted"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className="w-2 h-2 rounded-full bg-text-muted"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ============================
// Product Card Component
// ============================
function ProductCardView({ card }: { card: ProductCard }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
      className="mt-2 rounded-lg bg-bg-dark border border-coral/20 overflow-hidden"
    >
      <div className="h-24 bg-gradient-to-r from-ocean/60 to-bg-elevated flex items-center justify-center">
        <Package size={36} className="text-coral/60" />
      </div>
      <div className="p-3">
        <h4 className="text-body-sm font-medium text-text-primary">{card.name}</h4>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-caption text-teal flex items-center gap-1">
            <TrendingUp size={12} />
            利润{card.profit}
          </span>
          <span className="text-caption text-text-secondary">
            竞争度: {card.competition}
          </span>
          <span className="text-caption text-coral">{card.trend}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================
// Main Component
// ============================
export default function AiChatDetail() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const agents = useAppStore(s => s.activeAgents);
  const aiMessages = useAppStore(s => s.aiMessages);
  const addAiMessage = useAppStore(s => s.addAiMessage);
  const setShowBottomNav = useAppStore(s => s.setShowBottomNav);

  let agent = agents.find(a => a.id === agentId);

  // Fallback for new agent IDs not in store
  if (!agent && agentId && agentNameMap[agentId]) {
    agent = {
      id: agentId,
      name: agentNameMap[agentId],
      icon: 'Sparkles',
      status: 'active' as const,
      todayCount: 0,
      todayLabel: '在线',
      color: '#F6A623',
      description: agentRoleMap[agentId] || 'AI智能助手',
      capabilities: quickRepliesByAgent[agentId] || ['智能分析', '专业建议'],
    };
  }

  // Combine store messages with initial sample messages
  const storeMessages = (agentId && aiMessages[agentId]) || [];
  const initialMessages = agentId ? getInitialMessages(agentId, agent?.name || 'AI助手') : [];

  // Merge: show initial messages only if store is empty
  const messages: Message[] = storeMessages.length === 0 && agentId && initialMessages.length > 0
    ? initialMessages
    : storeMessages;

  usePageTitle(agent?.name || 'AI对话');

  useEffect(() => {
    setShowBottomNav(false);
    return () => setShowBottomNav(true);
  }, [setShowBottomNav]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const quickReplies = agentId ? (quickRepliesByAgent[agentId] !== undefined ? quickRepliesByAgent[agentId] : quickRepliesByAgent.default) : [];

  const handleSend = useCallback((text: string) => {
    if (!text.trim() || !agentId) return;

    // Add user message
    addAiMessage(agentId, { role: 'user', content: text });
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const mockResponse = mockResponses[text];
      if (mockResponse) {
        addAiMessage(agentId, { role: 'ai', content: mockResponse.content });
      } else {
        // Default agent-specific responses
        const defaultResponses: Record<string, string> = {
          'agent_001': `我是${agent?.name || '智财管家'}。根据您的财务数据，我建议将新加坡子公司的利润通过股息分配至萨摩亚SPV，这样可以利用萨摩亚的零税率优势。预计年度节税约$45,000。`,
          'agent_002': `我是${agent?.name || '法务精灵'}，已完成对您的合同审查，发现2个风险条款：第3.2条的管辖权约定不明确，第5.1条的违约责任过轻。建议修改后再签署。`,
          'agent_005': `我是${agent?.name || '注册专员'}。萨摩亚SPV注册需要以下材料：\n\n1. 董事/股东护照复印件\n2. 地址证明\n3. 银行推荐信\n\n处理时间约7-10个工作日。`,
          'agent_006': `我是${agent?.name || '支付专家'}。根据您的业务覆盖区域，推荐同时接入GrabPay（东南亚）和Pix（巴西），并保留Visa作为全球通用通道。`,
          'default': `收到您的消息："${text}"\n\n我是${agent?.name || 'AI助手'}，正在为您分析处理。如果需要更详细的方案，请告诉我您的具体需求。`,
        };
        const response = defaultResponses[agentId] || defaultResponses.default;
        addAiMessage(agentId, { role: 'ai', content: response });
      }
      setIsTyping(false);
    }, 1200 + Math.random() * 800);
  }, [agentId, agent, addAiMessage]);

  const handleQuickReply = (reply: string) => {
    handleSend(reply);
  };

  const handleQuickAction = (action: string) => {
    const prompts: Record<string, string> = {
      '选品': '帮我选品分析',
      '定价': '帮我定价分析',
      '合规': '帮我查合规',
      '税务': '帮我算税负',
    };
    handleSend(prompts[action] || action);
  };

  if (!agent) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-bg-elevated flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-text-muted" />
          </div>
          <p className="text-text-muted text-body-sm">智能体未找到</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-coral text-caption"
          >
            返回上一页
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen flex flex-col bg-bg-dark"
    >
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-12 border-b border-white/[0.08] bg-bg-card/80 backdrop-blur">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center -ml-2 text-text-primary"
        >
          <ArrowLeft size={22} />
        </motion.button>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${agent.color}25` }}
        >
          <Sparkles size={16} style={{ color: agent.color }} />
        </motion.div>
        <div className="flex-1 min-w-0">
          <h1 className="text-body-sm font-medium text-text-primary truncate">{agent.name}</h1>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              agent.status === 'active' ? 'bg-teal' : agent.status === 'busy' ? 'bg-warning' : 'bg-text-muted'
            )} />
            <p className="text-[10px] text-text-muted">{agent.description || 'AI助手'} · {agent.status === 'active' ? '在线' : agent.status === 'busy' ? '忙碌' : '离线'}</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        <AnimatePresence>
          {/* Empty State / Welcome */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${agent.color}20` }}
              >
                <Sparkles size={28} style={{ color: agent.color }} />
              </motion.div>
              <h2 className="text-h3 text-text-primary mb-2">{agent.name}</h2>
              <p className="text-body-sm text-text-secondary max-w-[260px] mx-auto">{agent.description}</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-[320px] mx-auto">
                {(agent.capabilities || []).slice(0, 3).map(cap => (
                  <motion.span
                    key={cap}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-bg-elevated text-text-muted border border-white/[0.06]"
                  >
                    {cap}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <motion.div
              key={`${msg.timestamp}-${i}`}
              initial={{
                opacity: 0,
                x: msg.role === 'user' ? 30 : -30,
                y: 10,
              }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'flex gap-3',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', damping: 15 }}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 self-end',
                  msg.role === 'user' ? 'bg-coral/20' : 'bg-bg-elevated'
                )}
              >
                {msg.role === 'user' ? (
                  <User size={14} className="text-coral" />
                ) : (
                  <Sparkles size={14} style={{ color: agent.color }} />
                )}
              </motion.div>

              {/* Bubble */}
              <div className={cn(
                'max-w-[78%]',
                msg.role === 'user' ? 'items-end' : 'items-start'
              )}>
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2.5',
                    msg.role === 'user'
                      ? 'bg-coral text-bg-dark rounded-br-sm'
                      : 'bg-bg-elevated text-text-primary rounded-bl-sm'
                  )}
                >
                  <p className={cn(
                    'text-body-sm whitespace-pre-wrap leading-relaxed',
                    msg.role === 'user' ? 'text-bg-dark' : 'text-text-primary'
                  )}>
                    {msg.content}
                  </p>
                </div>
                {/* Product Card (if any) */}
                {(msg as Message).productCard && (
                  <ProductCardView card={(msg as Message).productCard!} />
                )}
                {/* Timestamp */}
                <p className="text-[10px] text-text-muted mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}

          {/* Quick Reply Chips */}
          {messages.length > 0 && messages.length <= 2 && !isTyping && messages[messages.length - 1].role === 'ai' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-2 pl-11"
            >
              {quickReplies.map((reply, ri) => (
                <motion.button
                  key={reply}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + ri * 0.08 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleQuickReply(reply)}
                  className={cn(
                    'px-3.5 py-2 rounded-full text-body-sm border',
                    'bg-bg-elevated/60 border-coral/20 text-text-secondary',
                    'hover:bg-coral/10 hover:border-coral/40 hover:text-text-primary',
                    'transition-colors duration-200'
                  )}
                >
                  {reply}
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* Typing Indicator */}
          {isTyping && <TypingIndicator />}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Row */}
      <div className="shrink-0 px-4 py-2 border-t border-white/[0.06] bg-bg-card/50">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(['选品', '定价', '合规', '税务'] as const).map((action, ai) => (
            <motion.button
              key={action}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleQuickAction(action)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                'bg-bg-elevated border border-white/[0.06]',
                'text-caption text-text-secondary hover:text-text-primary hover:border-coral/30',
                'transition-colors duration-200 shrink-0'
              )}
            >
              {action === '选品' && <Package size={12} className="text-coral" />}
              {action === '定价' && <DollarSign size={12} className="text-teal" />}
              {action === '合规' && <Scale size={12} className="text-warning" />}
              {action === '税务' && <Receipt size={12} className="text-secondary" />}
              {action}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-3 border-t border-white/[0.08] bg-bg-card">
        {/* Attachment Menu */}
        <AnimatePresence>
          {showAttachMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-4 px-2 pb-3 overflow-hidden"
            >
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-1 text-text-muted hover:text-text-primary"
              >
                <div className="w-10 h-10 rounded-full bg-bg-elevated flex items-center justify-center">
                  <Image size={18} />
                </div>
                <span className="text-[10px]">图片</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-1 text-text-muted hover:text-text-primary"
              >
                <div className="w-10 h-10 rounded-full bg-bg-elevated flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <span className="text-[10px]">文档</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-1 text-text-muted hover:text-text-primary"
              >
                <div className="w-10 h-10 rounded-full bg-bg-elevated flex items-center justify-center">
                  <Zap size={18} />
                </div>
                <span className="text-[10px]">快捷指令</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded-lg shrink-0',
              showAttachMenu ? 'bg-coral/20 text-coral' : 'text-text-muted hover:text-text-primary'
            )}
          >
            <Paperclip size={20} />
          </motion.button>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
            placeholder={`向${agent.name}提问...`}
            className={cn(
              'flex-1 h-11 px-4 rounded-lg bg-bg-input border border-white/[0.1]',
              'text-body-sm text-text-primary placeholder:text-text-muted',
              'focus:outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/10',
              'transition-all'
            )}
          />

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => handleSend(inputValue)}
            disabled={!inputValue.trim()}
            className={cn(
              'flex items-center justify-center shrink-0 transition-all duration-200',
              inputValue.trim()
                ? 'w-11 h-11 rounded-full gradient-accent'
                : 'w-11 h-11 rounded-lg bg-bg-elevated',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            <Send size={18} className={inputValue.trim() ? 'text-bg-dark' : 'text-text-muted'} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
