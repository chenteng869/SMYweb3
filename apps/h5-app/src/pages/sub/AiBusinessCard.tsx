import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Share2, QrCode, Edit3, Download, Sparkles, Search,
  Shield, X, ChevronRight, User, Building2, Mail, Phone,
  Star, Users, Zap, Copy, Smartphone, Globe, Palette, FileText, Wand2,
  MessageSquare
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// ─── Mock Data ────────────────────────────────────────────

interface BizCard {
  id: string; name: string; title: string; company: string;
  industry: string; color: string; exchangedAt: string;
}

const MY_CARD = {
  name: '陈董', title: '跨境出海顾问',
  company: '太初国际（萨摩亚）有限公司',
  phone: '+852 9123 4567', email: 'ceo@taichu.com', wechat: 'taichu_ceo',
  stats: { views: 128, favorites: 23, exchanges: 15 }
};

const CARD_COLLECTION: BizCard[] = [
  { id: '1', name: '李明', title: '物流总监', company: '亚太速运', industry: '物流', color: '#00D4AA', exchangedAt: '2小时前' },
  { id: '2', name: 'Sarah Chen', title: '支付产品经理', company: 'OceanPay', industry: '支付', color: '#F6A623', exchangedAt: '昨天' },
  { id: '3', name: '王律师', title: '合规顾问', company: '跨境法务所', industry: '法务', color: '#CE1126', exchangedAt: '3天前' },
  { id: '4', name: 'Alex Zhang', title: 'AI技术总监', company: 'OpenClaw AI', industry: 'AI', color: '#60A5FA', exchangedAt: '1周前' },
  { id: '5', name: '赵税官', title: '税务合伙人', company: 'TaxMax', industry: '税务', color: '#A78BFA', exchangedAt: '2周前' },
  { id: '6', name: 'Emma Liu', title: '广告优化师', company: 'AdScale', industry: '广告', color: '#34D399', exchangedAt: '1月前' },
];

const INDUSTRIES = ['全部', '物流', '支付', '法务', 'AI', '税务', '广告'];

const AI_STYLES = [
  { id: 'tech', label: '科技商务', desc: '专业、前沿' },
  { id: 'minimal', label: '极简优雅', desc: '简约、高端' },
  { id: 'fresh', label: '清新活力', desc: '亲和、创新' },
  { id: 'luxury', label: '奢华尊享', desc: '尊贵、独特' },
];

// ─── Component ────────────────────────────────────────────

export default function AiBusinessCard() {
  usePageTitle(undefined, '/ai-business-card');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('全部');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [aiForm, setAiForm] = useState({ name: '', title: '', company: '', industry: '', skills: '' });
  const [aiStyle, setAiStyle] = useState('tech');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const tabs = ['我的名片', '名片夹', 'AI生成'];

  const filteredCards = CARD_COLLECTION.filter(c => {
    const matchSearch = !searchQuery || c.name.includes(searchQuery) || c.company.includes(searchQuery) || c.title.includes(searchQuery);
    const matchIndustry = selectedIndustry === '全部' || c.industry === selectedIndustry;
    return matchSearch && matchIndustry;
  });

  function handleAiGenerate() {
    if (!aiForm.name) return;
    setAiGenerating(true);
    setTimeout(() => {
      const styleMap: Record<string, string> = {
        tech: `用科技赋能商业，以创新驱动增长。专注${aiForm.industry || '跨境'}领域，为您提供智能化解决方案。`,
        minimal: `简而不凡，精于细节。${aiForm.skills || '专业服务'}，让每一次合作都值得信赖。`,
        fresh: `满怀热情，勇于创新。致力于打造${aiForm.industry || '行业'}新标杆，与您共同成长。`,
        luxury: `臻选品质，尊享服务。${aiForm.skills || '顶级资源'}，成就非凡商业格局。`,
      };
      setAiResult(styleMap[aiStyle] || styleMap.tech);
      setAiGenerating(false);
    }, 2000);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-bg-dark text-text-primary">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-bg-dark/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-4 h-12">
          <button onClick={() => navigate('/profile')} className="w-9 h-9 flex items-center justify-center rounded-lg active:bg-white/5">
            <ArrowLeft size={20} className="text-text-secondary" />
          </button>
          <h1 className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-h3 font-semibold">AI智能名片</span>
          </h1>
          <button onClick={() => setShowShareModal(true)} className="w-9 h-9 flex items-center justify-center rounded-lg active:bg-white/5">
            <Share2 size={18} className="text-text-secondary" />
          </button>
        </div>
        {/* Tabs */}
        <div className="flex px-4 border-b border-white/[0.06]">
          {tabs.map((tab, i) => (
            <button key={i} onClick={() => setActiveTab(i)}
              className={cn('flex-1 py-3 text-[13px] font-medium transition-colors relative', activeTab === i ? 'text-coral' : 'text-text-muted')}>
              {tab}
              {activeTab === i && (
                <motion.div layoutId="aiCardTab" className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-coral rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ─── Tab 0: My Card ─── */}
        {activeTab === 0 && (
          <motion.div key="my-card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="p-4 space-y-4 pb-24">
            {/* Card Preview */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-2xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A2540 0%, #1a1a2e 50%, #0A0E1A 100%)', border: '1px solid rgba(246,166,35,0.15)' }}>
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #F6A623 0%, transparent 70%)' }} />
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #F6A623, #CE1126)', padding: '2px' }}>
                  <div className="w-full h-full rounded-full bg-bg-dark flex items-center justify-center">
                    <User size={28} className="text-coral" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{MY_CARD.name}</h2>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-coral/15">
                      <Shield size={10} className="text-coral" />
                      <span className="text-[10px] text-coral font-medium">SPV认证</span>
                    </div>
                  </div>
                  <p className="text-sm text-coral mt-1">{MY_CARD.title}</p>
                  <p className="text-xs text-text-muted mt-1">{MY_CARD.company}</p>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                      <Phone size={11} /> {MY_CARD.phone}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                      <Mail size={11} /> {MY_CARD.email}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="grid grid-cols-3 gap-3">
              {[
                { icon: Eye2, label: '被查看', value: MY_CARD.stats.views },
                { icon: Star, label: '被收藏', value: MY_CARD.stats.favorites },
                { icon: Users, label: '已交换', value: MY_CARD.stats.exchanges },
              ].map((s, i) => (
                <div key={i} className="bg-bg-card rounded-xl p-3 text-center border border-white/[0.06]">
                  <s.icon size={18} className="mx-auto mb-1.5 text-coral" />
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-[10px] text-text-muted">{s.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Action Buttons */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="flex gap-3">
              {[
                { icon: Edit3, label: '编辑' },
                { icon: Share2, label: '分享', action: () => setShowShareModal(true) },
                { icon: Download, label: '保存' },
              ].map((btn, i) => (
                <button key={i} onClick={btn.action}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 bg-bg-card rounded-xl border border-white/[0.06] active:bg-bg-card-hover transition-colors">
                  <btn.icon size={18} className="text-coral" />
                  <span className="text-[11px] text-text-secondary">{btn.label}</span>
                </button>
              ))}
            </motion.div>

            {/* Quick Share */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-bg-card rounded-xl p-4 border border-white/[0.06]">
              <h3 className="text-body-sm font-semibold mb-3">快捷分享</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: MessageSquare, label: '微信', color: '#34D399' },
                  { icon: QrCode, label: '二维码', color: '#F6A623', action: () => setShowQrModal(true) },
                  { icon: Smartphone, label: 'NFC', color: '#00D4AA' },
                  { icon: Copy, label: '链接', color: '#60A5FA', action: () => copyToClipboard('https://taichu.com/card/ceo') },
                ].map((item, i) => (
                  <button key={i} onClick={item.action}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-lg bg-bg-elevated active:bg-white/5 transition-colors">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${item.color}18` }}>
                      <item.icon size={18} style={{ color: item.color }} />
                    </div>
                    <span className="text-[10px] text-text-secondary">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* AI Assistant */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-coral/10 to-teal/10 rounded-xl p-4 border border-coral/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-coral/20 flex items-center justify-center">
                  <Wand2 size={18} className="text-coral" />
                </div>
                <div className="flex-1">
                  <p className="text-body-sm font-medium">AI名片助手</p>
                  <p className="text-[11px] text-text-muted">一键优化名片文案，提升专业形象</p>
                </div>
                <Sparkles size={16} className="text-coral" />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ─── Tab 1: Card Collection ─── */}
        {activeTab === 1 && (
          <motion.div key="collection" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 space-y-4 pb-24">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="text" placeholder="搜索姓名、公司、职位..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 bg-bg-card rounded-xl text-body-sm border border-white/[0.06] focus:border-coral/50 outline-none placeholder:text-text-muted" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X size={14} className="text-text-muted" />
                </button>
              )}
            </div>
            {/* Industry Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {INDUSTRIES.map(ind => (
                <button key={ind} onClick={() => setSelectedIndustry(ind)}
                  className={cn('px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors',
                    selectedIndustry === ind ? 'bg-coral text-bg-dark' : 'bg-bg-card text-text-secondary border border-white/[0.06]')}>
                  {ind}
                </button>
              ))}
            </div>
            {/* Card List */}
            <div className="space-y-3">
              {filteredCards.map((card, i) => (
                <motion.div key={card.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-bg-card rounded-xl border border-white/[0.06]">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${card.color}20` }}>
                    <User size={20} style={{ color: card.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-body-sm font-medium truncate">{card.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${card.color}15`, color: card.color }}>{card.industry}</span>
                    </div>
                    <p className="text-[11px] text-text-muted">{card.title} · {card.company}</p>
                  </div>
                  <span className="text-[10px] text-text-muted shrink-0">{card.exchangedAt}</span>
                </motion.div>
              ))}
              {filteredCards.length === 0 && (
                <div className="text-center py-12 text-text-muted text-body-sm">未找到匹配的名片</div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── Tab 2: AI Generate ─── */}
        {activeTab === 2 && (
          <motion.div key="ai-gen" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 space-y-4 pb-24">
            {/* Form */}
            <div className="bg-bg-card rounded-xl p-4 border border-white/[0.06] space-y-3">
              {[
                { key: 'name', label: '姓名', placeholder: '您的姓名' },
                { key: 'title', label: '职位', placeholder: '如：跨境出海顾问' },
                { key: 'company', label: '公司', placeholder: '如：太初国际有限公司' },
                { key: 'industry', label: '行业', placeholder: '如：跨境电商' },
                { key: 'skills', label: '擅长领域', placeholder: '如：海外市场拓展、税务规划' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-[11px] text-text-muted mb-1 block">{field.label}</label>
                  <input type="text" placeholder={field.placeholder}
                    value={aiForm[field.key as keyof typeof aiForm]}
                    onChange={e => setAiForm(p => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full h-10 px-3 bg-bg-elevated rounded-lg text-body-sm border border-white/[0.06] focus:border-coral/50 outline-none placeholder:text-text-muted" />
                </div>
              ))}
            </div>

            {/* Style Selection */}
            <div>
              <p className="text-body-sm font-semibold mb-3">选择风格</p>
              <div className="grid grid-cols-2 gap-3">
                {AI_STYLES.map(style => (
                  <button key={style.id} onClick={() => setAiStyle(style.id)}
                    className={cn('p-3 rounded-xl border text-left transition-all',
                      aiStyle === style.id ? 'border-coral bg-coral/10' : 'border-white/[0.06] bg-bg-card')}>
                    <p className={cn('text-[13px] font-medium', aiStyle === style.id ? 'text-coral' : 'text-text-primary')}>{style.label}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{style.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button onClick={handleAiGenerate} disabled={aiGenerating || !aiForm.name}
              className={cn('w-full h-12 rounded-xl font-semibold text-body-sm transition-all',
                aiForm.name ? 'gradient-accent text-bg-dark' : 'bg-bg-card text-text-muted')}>
              {aiGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Sparkles size={18} />
                  </motion.div>
                  AI生成中...
                </span>
              ) : 'AI生成名片'}
            </button>

            {/* Result */}
            <AnimatePresence>
              {aiResult && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-bg-card rounded-xl p-4 border border-coral/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-coral" />
                    <p className="text-body-sm font-semibold">AI生成结果</p>
                  </div>
                  {/* Preview Card */}
                  <div className="rounded-xl p-4 mb-3" style={{ background: 'linear-gradient(135deg, #0A2540, #1a1a2e)', border: '1px solid rgba(246,166,35,0.15)' }}>
                    <p className="text-lg font-bold">{aiForm.name || '您的姓名'}</p>
                    <p className="text-sm text-coral">{aiForm.title || '职位'}</p>
                    <p className="text-xs text-text-muted mt-1">{aiForm.company || '公司'}</p>
                    <p className="text-[11px] text-text-secondary mt-3 leading-relaxed">{aiResult}</p>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => copyToClipboard(aiResult)}
                      className="flex-1 h-10 rounded-lg bg-coral/10 text-coral text-[13px] font-medium flex items-center justify-center gap-1.5">
                      {copied ? <Check2 size={14} /> : <Copy size={14} />}
                      {copied ? '已复制' : '复制文案'}
                    </button>
                    <button onClick={() => { setActiveTab(0); }}
                      className="flex-1 h-10 rounded-lg gradient-accent text-bg-dark text-[13px] font-semibold">
                      设为名片
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-bg-dark via-bg-dark to-transparent z-30">
        <button className="w-full h-12 gradient-accent rounded-xl font-semibold text-body-sm text-bg-dark shadow-lg shadow-coral/20">
          一键交换名片
        </button>
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {showQrModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-8" onClick={() => setShowQrModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card rounded-2xl p-6 w-full max-w-[280px] text-center border border-white/[0.06]" onClick={e => e.stopPropagation()}>
              <div className="w-40 h-40 mx-auto bg-white rounded-xl flex items-center justify-center mb-4">
                <QrCode size={80} className="text-bg-dark" />
              </div>
              <p className="text-body-sm font-medium">{MY_CARD.name}的名片二维码</p>
              <p className="text-[11px] text-text-muted mt-1">扫码即可交换名片</p>
              <button onClick={() => setShowQrModal(false)} className="mt-4 px-6 py-2 bg-bg-elevated rounded-lg text-[13px] text-text-secondary">关闭</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={() => setShowShareModal(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
              className="w-full bg-bg-card rounded-t-2xl p-6 border-t border-white/[0.06]" onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-4" />
              <p className="text-h3 font-semibold text-center mb-4">分享名片</p>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { icon: MessageSquare, label: '微信', color: '#34D399' },
                  { icon: QrCode, label: '二维码', color: '#F6A623', action: () => { setShowShareModal(false); setShowQrModal(true); } },
                  { icon: Copy, label: '复制链接', color: '#60A5FA', action: () => copyToClipboard('https://taichu.com/card/ceo') },
                  { icon: Mail, label: '邮件', color: '#A78BFA' },
                ].map((item, i) => (
                  <button key={i} onClick={item.action}
                    className="flex flex-col items-center gap-2 py-3 rounded-xl bg-bg-elevated active:bg-white/5">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${item.color}18` }}>
                      <item.icon size={20} style={{ color: item.color }} />
                    </div>
                    <span className="text-[11px] text-text-secondary">{item.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowShareModal(false)} className="w-full h-12 mt-4 bg-bg-elevated rounded-xl text-body-sm text-text-secondary">取消</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Generating Modal */}
      <AnimatePresence>
        {aiGenerating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card rounded-2xl p-8 text-center border border-coral/20">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-coral border-t-transparent" />
              <p className="text-body font-semibold">AI生成中</p>
              <p className="text-[12px] text-text-muted mt-2">正在为您打造专属名片...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Eye icon component
function Eye2({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Check2({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
