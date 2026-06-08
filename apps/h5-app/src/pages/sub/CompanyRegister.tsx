import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Building2, FileCheck, CreditCard, Landmark, ChevronRight, CheckCircle,
  Clock, Globe, ArrowRight, ArrowLeft, Bot, Upload, File, X,
  Sparkles, ShieldCheck, Package, Star, Loader2
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/shared/Card';
import GradientButton from '@/components/shared/GradientButton';
import StatusBadge from '@/components/shared/StatusBadge';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAppStore } from '@/store';

/* ─── 4 Steps ─── */
const STEPS = [
  { id: 1, label: '选择方案', icon: Package },
  { id: 2, label: 'AI填单', icon: Bot },
  { id: 3, label: '资料上传', icon: Upload },
  { id: 4, label: '确认提交', icon: CheckCircle },
];

/* ─── AI Chat Messages ─── */
interface ChatMsg {
  id: string;
  role: 'ai' | 'user';
  content: string;
  options?: string[];
}

const INITIAL_AI_MSG: ChatMsg = {
  id: 'm0',
  role: 'ai',
  content: '您好，我是太初国链AI注册官。请问您想注册萨摩亚公司的用途是？',
  options: ['投资控股', '跨境电商', '资产保护', '其他'],
};

const FOLLOWUP_MSGS: Record<string, ChatMsg> = {
  '投资控股': {
    id: 'm2',
    role: 'ai',
    content: '了解，用于投资控股架构。您计划控股的公司位于哪个地区？',
    options: ['中国香港', '新加坡', '美国', '其他'],
  },
  '跨境电商': {
    id: 'm2b',
    role: 'ai',
    content: '好的，跨境电商业务。您主要目标销售市场是？',
    options: ['东南亚', '欧美', '中东', '全球'],
  },
  '资产保护': {
    id: 'm2c',
    role: 'ai',
    content: '明白，资产保护目的。您是否需要配套银行账户？',
    options: ['需要', '暂不需要'],
  },
  '其他': {
    id: 'm2d',
    role: 'ai',
    content: '好的，请简要说明您的业务需求，我将为您推荐最佳方案。',
  },
};

const THIRD_MSG: ChatMsg = {
  id: 'm3',
  role: 'ai',
  content: '完美！我已根据您的需求生成初步方案。请确认公司名称（可输入2-3个备选），然后进入下一步上传资料。',
};

/* ─── Packages ─── */
const PACKAGES = [
  { id: 'basic', name: '基础版', price: 2999, features: ['萨摩亚SPV注册', '公司注册证书', '章程文件', '标准注册地址'], color: '#00D4AA' },
  { id: 'pro', name: '专业版', price: 5999, features: ['基础版全部内容', '首年秘书服务', '银行开户协助', '税务咨询1小时'], popular: true, color: '#F6A623' },
  { id: 'elite', name: '旗舰版', price: 9999, features: ['专业版全部内容', '全年合规托管', 'AI管家服务', '优先审核通道', '免费年审1次'], color: '#A78BFA' },
];

/* ─── Upload Areas ─── */
const UPLOAD_AREAS = [
  { id: 'passport', label: '护照扫描件', desc: '清晰彩色扫描，PDF/JPG', icon: File, required: true },
  { id: 'address', label: '地址证明', desc: '近3个月内水电账单', icon: ShieldCheck, required: true },
  { id: 'bank', label: '银行推荐信', desc: '原件或电子版', icon: Landmark, required: false },
];

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function CompanyRegister() {
  usePageTitle('公司注册');
  const navigate = useNavigate();
  const companies = useAppStore(s => s.companies);

  const [step, setStep] = useState(1);
  const [selectedPkg, setSelectedPkg] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([INITIAL_AI_MSG]);
  const [chatStep, setChatStep] = useState(0);
  const [uploads, setUploads] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const handleOptionClick = (option: string) => {
    setChatMessages(prev => [...prev, { id: `u${Date.now()}`, role: 'user', content: option }]);
    setChatStep(prev => {
      const next = prev + 1;
      setTimeout(() => {
        if (next === 1) {
          const followup = FOLLOWUP_MSGS[option];
          if (followup) setChatMessages(p => [...p, followup]);
        } else if (next === 2) {
          setChatMessages(p => [...p, THIRD_MSG]);
        }
      }, 400);
      return next;
    });
  };

  const handleUpload = (id: string) => {
    setUploads(prev => ({ ...prev, [id]: '已选择: document.pdf' }));
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => { setIsSubmitting(false); setIsSuccess(true); }, 2000);
  };

  const totalPrice = PACKAGES.find(p => p.id === selectedPkg)?.price || 0;

  if (isSuccess) {
    return (
      <div className="min-h-screen">
        <TopBar title="公司注册" showBack />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center px-6 pt-20"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-teal to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-teal/30"
          >
            <CheckCircle size={48} className="text-bg-dark" />
          </motion.div>
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-h1 text-text-primary mb-2 text-center"
          >
            提交成功！
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-body-sm text-text-secondary text-center max-w-[300px]"
          >
            您的公司注册申请已提交，我们将在7-10个工作日内完成审核。AI注册官将持续为您跟进进度。
          </motion.p>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 w-full space-y-3"
          >
            <div className="bg-bg-card rounded-xl p-4 border border-white/[0.08] text-center">
              <p className="text-caption text-text-muted">预计完成时间</p>
              <p className="text-h3 text-teal mt-1">7-10 个工作日</p>
            </div>
            <GradientButton onClick={() => navigate('/profile')} className="w-full">
              返回会员中心
            </GradientButton>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <TopBar title="公司注册" showBack />
      <div className="px-4 pt-4 pb-6 space-y-5">
        {/* ─── Step Progress ─── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between relative">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex flex-col items-center relative z-10 flex-1">
                <motion.div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center',
                    step >= s.id
                      ? 'bg-gradient-to-br from-coral to-orange-500 text-bg-dark'
                      : 'bg-bg-elevated text-text-muted'
                  )}
                  animate={step === s.id ? { boxShadow: ['0 0 0 0 rgba(246,166,35,0.3)', '0 0 0 8px rgba(246,166,35,0)', '0 0 0 0 rgba(246,166,35,0.3)'] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <s.icon size={16} />
                </motion.div>
                <span className={cn('text-[9px] mt-1.5', step >= s.id ? 'text-coral' : 'text-text-muted')}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'absolute top-[18px] left-[calc(50%+20px)] w-[calc(100%-40px)] h-0.5',
                      step > s.id ? 'bg-coral' : 'bg-white/[0.08]'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* ═══════════ STEP 1: SELECT PACKAGE ═══════════ */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-h3 text-text-primary mb-3 flex items-center gap-2">
                <Star size={18} className="text-coral" />
                选择注册方案
              </h2>
              <div className="space-y-3">
                {PACKAGES.map((pkg, i) => (
                  <motion.div
                    key={pkg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedPkg(pkg.id)}
                  >
                    <Card
                      variant={selectedPkg === pkg.id ? 'featured' : 'interactive'}
                      padding="lg"
                      className="relative overflow-hidden"
                    >
                      {pkg.popular && (
                        <div className="absolute top-0 right-0 bg-gradient-to-l from-coral to-orange-500 text-bg-dark text-[9px] font-bold px-3 py-1 rounded-bl-lg">
                          推荐
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${pkg.color}20` }}
                        >
                          <Package size={22} style={{ color: pkg.color }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-body font-semibold text-text-primary">{pkg.name}</h3>
                            {selectedPkg === pkg.id && <CheckCircle size={16} className="text-coral" />}
                          </div>
                          <p className="font-display text-h2 text-gradient-kpi">¥{pkg.price.toLocaleString()}</p>
                          <ul className="mt-2 space-y-1">
                            {pkg.features.map(f => (
                              <li key={f} className="flex items-center gap-1.5 text-caption text-text-secondary">
                                <CheckCircle size={10} className="text-teal shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4">
                <GradientButton
                  onClick={() => selectedPkg && setStep(2)}
                  disabled={!selectedPkg}
                  className="w-full"
                >
                  下一步 <ArrowRight size={16} />
                </GradientButton>
              </div>
            </motion.div>
          )}

          {/* ═══════════ STEP 2: AI CHAT FORM ═══════════ */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-h3 text-text-primary flex items-center gap-2">
                <Bot size={18} className="text-accent" />
                AI智能填单
              </h2>

              {/* Chat Area */}
              <div className="bg-bg-card border border-white/[0.08] rounded-xl p-4 space-y-4 max-h-[360px] overflow-y-auto">
                {chatMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${msg.role === 'ai' ? 'flex gap-2' : ''}`}>
                      {msg.role === 'ai' && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-coral to-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot size={14} className="text-bg-dark" />
                        </div>
                      )}
                      <div>
                        <div
                          className={`rounded-xl px-3.5 py-2.5 text-body-sm ${
                            msg.role === 'user'
                              ? 'bg-coral text-bg-dark rounded-tr-sm'
                              : 'bg-bg-elevated text-text-primary rounded-tl-sm'
                          }`}
                        >
                          {msg.content}
                        </div>
                        {msg.options && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {msg.options.map(opt => (
                              <motion.button
                                key={opt}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleOptionClick(opt)}
                                className="px-3 py-1.5 rounded-lg bg-bg-card border border-white/[0.1] text-body-sm text-text-primary hover:border-coral/40 transition-colors"
                              >
                                {opt}
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Company Name Input */}
              {chatStep >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <label className="text-body-sm text-text-secondary mb-1.5 block">公司名称（首选）</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="如：TAICHU GLOBAL LTD"
                    className="w-full h-12 px-4 rounded-xl bg-bg-input border border-white/[0.1] text-text-primary text-body focus:outline-none focus:border-coral/40"
                  />
                </motion.div>
              )}

              <div className="flex gap-3">
                <GradientButton variant="ghost" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft size={16} /> 上一步
                </GradientButton>
                <GradientButton
                  onClick={() => chatStep >= 2 && companyName && setStep(3)}
                  disabled={chatStep < 2 || !companyName.trim()}
                  className="flex-1"
                >
                  下一步 <ArrowRight size={16} />
                </GradientButton>
              </div>
            </motion.div>
          )}

          {/* ═══════════ STEP 3: DOCUMENT UPLOAD ═══════════ */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-h3 text-text-primary mb-1 flex items-center gap-2">
                <Upload size={18} className="text-teal" />
                资料上传
              </h2>
              <p className="text-caption text-text-muted mb-3">AI将自动审核您上传的文件</p>

              <div className="space-y-3">
                {UPLOAD_AREAS.map((area, i) => (
                  <motion.div
                    key={area.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Card variant="default" padding="lg">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
                          <area.icon size={20} className="text-coral" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-body-sm font-medium text-text-primary">{area.label}</h3>
                            {area.required && <span className="text-[9px] px-1 py-0.5 rounded bg-danger/15 text-danger">必需</span>}
                          </div>
                          <p className="text-caption text-text-muted">{area.desc}</p>

                          {uploads[area.id] ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-teal/10 border border-teal/20"
                            >
                              <CheckCircle size={14} className="text-teal" />
                              <span className="text-caption text-teal flex-1 truncate">{uploads[area.id]}</span>
                              <button onClick={() => setUploads(p => { const n = { ...p }; delete n[area.id]; return n; })}>
                                <X size={14} className="text-text-muted" />
                              </button>
                            </motion.div>
                          ) : (
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleUpload(area.id)}
                              className="mt-2 w-full h-12 rounded-lg border border-dashed border-white/[0.15] flex items-center justify-center gap-2 text-body-sm text-text-muted hover:border-coral/40 hover:text-coral transition-colors"
                            >
                              <Upload size={16} />
                              点击上传
                            </motion.button>
                          )}
                        </div>
                        {/* AI Check Indicator */}
                        {uploads[area.id] && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="shrink-0"
                          >
                            <Sparkles size={18} className="text-teal" />
                          </motion.div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="flex gap-3 mt-4">
                <GradientButton variant="ghost" onClick={() => setStep(2)} className="flex-1">
                  <ArrowLeft size={16} /> 上一步
                </GradientButton>
                <GradientButton
                  onClick={() => setStep(4)}
                  disabled={!uploads['passport'] || !uploads['address']}
                  className="flex-1"
                >
                  下一步 <ArrowRight size={16} />
                </GradientButton>
              </div>
            </motion.div>
          )}

          {/* ═══════════ STEP 4: REVIEW & SUBMIT ═══════════ */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-h3 text-text-primary mb-3 flex items-center gap-2">
                <CheckCircle size={18} className="text-teal" />
                确认提交
              </h2>

              <Card variant="featured" padding="lg" className="space-y-4">
                <div>
                  <p className="text-caption text-text-muted">选择方案</p>
                  <p className="text-body font-medium text-text-primary">
                    {PACKAGES.find(p => p.id === selectedPkg)?.name} — ¥{totalPrice.toLocaleString()}
                  </p>
                </div>
                <div className="border-t border-white/[0.06] pt-3">
                  <p className="text-caption text-text-muted">公司名称</p>
                  <p className="text-body font-medium text-text-primary">{companyName}</p>
                </div>
                <div className="border-t border-white/[0.06] pt-3">
                  <p className="text-caption text-text-muted">注册地区</p>
                  <p className="text-body font-medium text-text-primary">萨摩亚</p>
                </div>
                <div className="border-t border-white/[0.06] pt-3">
                  <p className="text-caption text-text-muted">上传资料</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.keys(uploads).map(k => (
                      <span key={k} className="text-[10px] px-2 py-1 rounded-full bg-teal/15 text-teal">
                        {UPLOAD_AREAS.find(a => a.id === k)?.label} ✓
                      </span>
                    ))}
                  </div>
                </div>

                {/* Timeline Estimate */}
                <div className="bg-bg-card rounded-lg p-3 border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} className="text-coral" />
                    <span className="text-body-sm text-text-primary">预计时间线</span>
                  </div>
                  <div className="space-y-2">
                    {['资料审核: 1-2工作日', '政府审批: 5-7工作日', '证书发放: 1工作日'].map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-coral" />
                        <span className="text-caption text-text-secondary">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-body text-text-muted">合计费用</span>
                  <span className="font-display text-h2 text-gradient-kpi">¥{totalPrice.toLocaleString()}</span>
                </div>
              </Card>

              <div className="flex gap-3 mt-4">
                <GradientButton variant="ghost" onClick={() => setStep(3)} className="flex-1">
                  <ArrowLeft size={16} /> 上一步
                </GradientButton>
                <GradientButton onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> 提交中...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CheckCircle size={16} /> 提交注册
                    </span>
                  )}
                </GradientButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════ MY COMPANIES (always visible) ═══════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-h3 text-text-primary mb-3 flex items-center gap-2">
            <Building2 size={18} className="text-coral" />
            我的公司 ({companies.length})
          </h2>
          <div className="space-y-2.5">
            {companies.map((company, i) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Card variant="interactive" padding="md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-coral/15 flex items-center justify-center">
                        <Building2 size={18} className="text-coral" />
                      </div>
                      <div>
                        <h3 className="text-body-sm font-medium text-text-primary">{company.name}</h3>
                        <p className="text-caption text-text-muted">{company.jurisdiction} · {company.registrationNumber}</p>
                      </div>
                    </div>
                    <StatusBadge status={company.status === 'active' ? 'success' : 'warning'} size="sm">
                      {company.status === 'active' ? '运营中' : '处理中'}
                    </StatusBadge>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
