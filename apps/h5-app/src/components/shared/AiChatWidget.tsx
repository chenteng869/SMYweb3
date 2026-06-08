import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Send, Sparkles, TrendingUp, Shield, Building2, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

const quickActions = [
  { id: 'tax', label: '税务优化', icon: TrendingUp, prompt: '帮我分析税务优化方案' },
  { id: 'legal', label: '合规检查', icon: Shield, prompt: '帮我检查公司合规状态' },
  { id: 'company', label: '注册公司', icon: Building2, prompt: '我想注册一家新公司' },
  { id: 'payment', label: '收款方案', icon: CreditCard, prompt: '推荐适合的收款通道' },
];

const welcomeMessages = [
  { role: 'agent' as const, content: '您好！我是太初AI助手，有什么可以帮您的吗？' },
];

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; content: string }[]>(welcomeMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const userMessage = { role: 'user' as const, content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses: Record<string, string> = {
        '帮我分析税务优化方案': '根据您当前的3家公司架构，我建议将利润通过萨摩亚SPV进行集中管理，预计可节省约15%的税务成本。需要我详细分析吗？',
        '帮我检查公司合规状态': '检测到香港公司的周年申报表将在7天内到期，建议您尽快提交。其他公司合规状态良好。',
        '我想注册一家新公司': '太好了！根据您的业务需求，我建议考虑新加坡或BVI架构。请告诉我您的业务类型和预算范围。',
        '推荐适合的收款通道': '根据您的业务覆盖区域（东南亚+南美），推荐同时接入GrabPay（东南亚）和Pix（巴西），并保留Visa作为全球通用通道。',
      };

      const response = responses[text] || `收到您的请求："${text}"，我正在为您处理，请稍候...`;
      setMessages(prev => [...prev, { role: 'agent' as const, content: response }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        className={cn(
          'fixed z-50 bottom-20 right-4 w-14 h-14 rounded-full gradient-accent',
          'flex items-center justify-center shadow-fab',
          'text-bg-dark'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        animate={!isOpen ? { boxShadow: [
          '0 4px 16px rgba(246,166,35,0.3)',
          '0 4px 24px rgba(246,166,35,0.5)',
          '0 4px 16px rgba(246,166,35,0.3)',
        ]} : {}}
        transition={{ duration: 2, repeat: Infinity }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Brain size={24} />}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'fixed z-[60] bottom-36 right-4 w-[340px] max-w-[calc(100vw-32px)]',
              'bg-bg-card border border-white/[0.08] rounded-lg shadow-card-elevated',
              'flex flex-col overflow-hidden'
            )}
            style={{ height: '480px' }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b border-white/[0.08]">
              <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center">
                <Sparkles size={16} className="text-bg-dark" />
              </div>
              <div>
                <h3 className="text-h4 text-text-primary">太初AI助手</h3>
                <p className="text-caption text-text-muted">智能合伙人</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="ml-auto text-text-muted hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'max-w-[85%]',
                    msg.role === 'user' ? 'ml-auto' : 'mr-auto'
                  )}
                >
                  <div className={cn(
                    'rounded-lg px-3 py-2 text-body-sm',
                    msg.role === 'user'
                      ? 'bg-coral text-bg-dark'
                      : 'bg-bg-elevated text-text-primary'
                  )}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-1 text-text-muted">
                  <span className="w-2 h-2 rounded-full bg-coral animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-coral animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-coral animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              )}
              <div ref={messagesEndRef} />

              {/* Quick Actions */}
              {messages.length <= 1 && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {quickActions.map((action) => (
                    <motion.button
                      key={action.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSend(action.prompt)}
                      className="flex items-center gap-2 p-2.5 rounded-md bg-bg-elevated border border-white/[0.06] text-left"
                    >
                      <action.icon size={16} className="text-coral shrink-0" />
                      <span className="text-caption text-text-primary">{action.label}</span>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/[0.08] bg-bg-dark">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
                  placeholder="输入您的问题..."
                  className={cn(
                    'flex-1 h-10 px-3 rounded-md bg-bg-input border border-white/[0.1]',
                    'text-body-sm text-text-primary placeholder:text-text-muted',
                    'focus:outline-none focus:border-coral/40 focus:ring-2 focus:ring-coral/10',
                    'transition-all'
                  )}
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleSend(inputValue)}
                  disabled={!inputValue.trim()}
                  className={cn(
                    'w-10 h-10 rounded-md gradient-accent flex items-center justify-center',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                >
                  <Send size={16} className="text-bg-dark" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
