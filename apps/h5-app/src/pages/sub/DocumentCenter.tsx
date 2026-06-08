import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, FileCheck, FileClock, FileWarning, ChevronRight,
  Upload, Download, Search, Sparkles, Filter, X,
  Building2, Receipt, BookOpen, FileSignature, Landmark, ShieldCheck
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/shared/Card';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAppStore } from '@/store';
import StatusBadge from '@/components/shared/StatusBadge';

/* ─── Category Tabs ─── */
const CATEGORIES = [
  { id: 'registration', label: '注册文件', icon: Building2 },
  { id: 'bank', label: '银行文件', icon: Landmark },
  { id: 'tax', label: '税务文件', icon: Receipt },
  { id: 'contract', label: '合同文件', icon: FileSignature },
];

/* ─── Mock Documents with categories and AI generation ─── */
interface DocItem {
  id: string;
  name: string;
  category: string;
  type: string;
  date: string;
  status: 'ready' | 'pending' | 'expired' | 'ai-generating';
  aiGenerated: boolean;
  company: string;
  size: string;
}

const ALL_DOCUMENTS: DocItem[] = [
  // Registration
  { id: 'd1', name: '公司注册证书', category: 'registration', type: 'certificate', date: '2024-01-22', status: 'ready', aiGenerated: false, company: 'TAICHU OPC LTD', size: '1.2MB' },
  { id: 'd2', name: '公司章程', category: 'registration', type: 'articles', date: '2024-01-22', status: 'ready', aiGenerated: true, company: 'TAICHU OPC LTD', size: '856KB' },
  { id: 'd3', name: '董事名册', category: 'registration', type: 'register', date: '2024-01-25', status: 'ready', aiGenerated: false, company: 'TAICHU OPC LTD', size: '320KB' },
  { id: 'd4', name: '股东名册', category: 'registration', type: 'register', date: '2024-01-25', status: 'ready', aiGenerated: false, company: 'TAICHU OPC LTD', size: '280KB' },
  { id: 'd5', name: '营业执照', category: 'registration', type: 'certificate', date: '2024-03-18', status: 'ready', aiGenerated: false, company: 'TAICHU TRADING LTD', size: '2.1MB' },
  { id: 'd6', name: '商业登记证', category: 'registration', type: 'certificate', date: '2024-06-05', status: 'ready', aiGenerated: false, company: 'TAICHU TRADING LTD', size: '1.5MB' },
  { id: 'd7', name: '周年申报表', category: 'registration', type: 'annual_return', date: '2024-12-01', status: 'pending', aiGenerated: true, company: 'TAICHU OPC LTD', size: '--' },

  // Bank
  { id: 'd8', name: '汇丰银行开户确认函', category: 'bank', type: 'bank_doc', date: '2024-02-10', status: 'ready', aiGenerated: false, company: 'TAICHU OPC LTD', size: '450KB' },
  { id: 'd9', name: '星展银行KYC文件', category: 'bank', type: 'bank_doc', date: '2024-03-15', status: 'ready', aiGenerated: false, company: 'TAICHU TRADING LTD', size: '3.2MB' },
  { id: 'd10', name: '银行服务协议', category: 'bank', type: 'contract', date: '2024-02-15', status: 'ready', aiGenerated: true, company: 'TAICHU OPC LTD', size: '1.8MB' },
  { id: 'd11', name: 'Wise账户申请表', category: 'bank', type: 'bank_doc', date: '2024-12-10', status: 'pending', aiGenerated: false, company: 'TAICHU HOLDINGS LTD', size: '--' },

  // Tax
  { id: 'd12', name: '萨摩亚年度税务申报', category: 'tax', type: 'tax_return', date: '2024-12-15', status: 'pending', aiGenerated: true, company: 'TAICHU OPC LTD', size: '--' },
  { id: 'd13', name: 'GST/VAT注册文件', category: 'tax', type: 'tax_cert', date: '2024-04-20', status: 'ready', aiGenerated: false, company: 'TAICHU TRADING LTD', size: '620KB' },
  { id: 'd14', name: '税务居民证明', category: 'tax', type: 'tax_cert', date: '2024-05-01', status: 'ready', aiGenerated: false, company: 'TAICHU OPC LTD', size: '410KB' },
  { id: 'd15', name: '转让定价文档', category: 'tax', type: 'tax_doc', date: '2024-12-20', status: 'ai-generating', aiGenerated: true, company: 'TAICHU OPC LTD', size: '--' },

  // Contracts
  { id: 'd16', name: '服务协议模板', category: 'contract', type: 'contract_template', date: '2024-06-15', status: 'ready', aiGenerated: true, company: '通用', size: '520KB' },
  { id: 'd17', name: '供应商合同', category: 'contract', type: 'contract', date: '2024-07-01', status: 'ready', aiGenerated: true, company: 'TAICHU TRADING LTD', size: '1.2MB' },
  { id: 'd18', name: '雇佣合同模板', category: 'contract', type: 'contract_template', date: '2024-08-01', status: 'ready', aiGenerated: true, company: '通用', size: '680KB' },
  { id: 'd19', name: '保密协议(NDA)', category: 'contract', type: 'contract', date: '2024-09-10', status: 'ready', aiGenerated: true, company: '通用', size: '340KB' },
  { id: 'd20', name: '股东协议', category: 'contract', type: 'contract', date: '2024-10-15', status: 'pending', aiGenerated: true, company: 'TAICHU HOLDINGS LTD', size: '--' },
];

const STATUS_CONFIG: Record<string, { label: string; status: 'success' | 'warning' | 'danger' | 'accent' }> = {
  ready: { label: '已完成', status: 'success' },
  pending: { label: '待处理', status: 'warning' },
  expired: { label: '已过期', status: 'danger' },
  'ai-generating': { label: 'AI生成中', status: 'accent' },
};

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  certificate: FileCheck,
  articles: FileText,
  register: FileText,
  annual_return: FileClock,
  bank_doc: Landmark,
  contract: FileSignature,
  contract_template: BookOpen,
  tax_return: Receipt,
  tax_cert: ShieldCheck,
  tax_doc: Receipt,
};

export default function DocumentCenter() {
  usePageTitle('文档中心');
  const companies = useAppStore(s => s.companies);

  const [activeCategory, setActiveCategory] = useState('registration');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const filteredDocs = ALL_DOCUMENTS.filter(doc => {
    const matchesCategory = doc.category === activeCategory;
    const matchesSearch = !searchQuery ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.company.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const stats = {
    total: ALL_DOCUMENTS.length,
    ready: ALL_DOCUMENTS.filter(d => d.status === 'ready').length,
    pending: ALL_DOCUMENTS.filter(d => d.status === 'pending').length,
    aiGenerated: ALL_DOCUMENTS.filter(d => d.aiGenerated).length,
  };

  return (
    <div className="min-h-screen pb-8">
      <TopBar title="文档中心" showBack />

      <div className="px-4 pt-4 pb-6 space-y-5">
        {/* ═══════════ STATS ═══════════ */}
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.06 } },
          }}
          initial="hidden"
          animate="show"
          className="grid grid-cols-4 gap-2.5"
        >
          {[
            { label: '全部', value: stats.total, color: 'text-text-primary' },
            { label: '已完成', value: stats.ready, color: 'text-teal' },
            { label: '待处理', value: stats.pending, color: 'text-warning' },
            { label: 'AI生成', value: stats.aiGenerated, color: 'text-accent' },
          ].map(s => (
            <motion.div
              key={s.label}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              className="bg-bg-card border border-white/[0.08] rounded-xl p-2.5 text-center"
            >
              <p className={`font-display text-h3 ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-text-muted">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ═══════════ SEARCH BAR ═══════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文档名称、公司..."
              className="w-full h-11 pl-9 pr-4 rounded-xl bg-bg-card border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coral/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X size={14} className="text-text-muted" />
              </button>
            )}
          </div>
        </motion.div>

        {/* ═══════════ UPLOAD CTA ═══════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card variant="interactive" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-coral/15 flex items-center justify-center">
                <Upload size={20} className="text-coral" />
              </div>
              <div className="flex-1">
                <h3 className="text-body-sm font-medium text-text-primary">上传新文档</h3>
                <p className="text-caption text-text-muted">支持 PDF, DOC, JPG 格式，最大 20MB</p>
              </div>
              <ChevronRight size={18} className="text-text-muted" />
            </div>
          </Card>
        </motion.div>

        {/* ═══════════ CATEGORY TABS ═══════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        >
          {CATEGORIES.map(cat => {
            const count = ALL_DOCUMENTS.filter(d => d.category === cat.id).length;
            return (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-body-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-accent text-bg-dark'
                    : 'bg-bg-card text-text-muted border border-white/[0.08]'
                }`}
              >
                <cat.icon size={14} />
                {cat.label}
                <span className={`text-[10px] ${activeCategory === cat.id ? 'text-bg-dark/60' : 'text-text-muted'}`}>
                  {count}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* ═══════════ DOCUMENT LIST ═══════════ */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory + searchQuery}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {filteredDocs.length === 0 && (
              <div className="text-center py-12">
                <FileText size={40} className="text-text-muted mx-auto mb-3 opacity-30" />
                <p className="text-body-sm text-text-muted">暂无文档</p>
              </div>
            )}
            {filteredDocs.map((doc, i) => {
              const Icon = TYPE_ICONS[doc.type] || FileText;
              const statusConfig = STATUS_CONFIG[doc.status];
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * i }}
                >
                  <Card variant="interactive" padding="md">
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0 relative">
                        <Icon size={18} className="text-coral" />
                        {doc.aiGenerated && doc.status === 'ai-generating' && (
                          <motion.div
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          >
                            <Sparkles size={8} className="text-bg-dark" />
                          </motion.div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-body-sm text-text-primary truncate">{doc.name}</p>
                          {doc.aiGenerated && (
                            <span className="shrink-0 text-[8px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-medium flex items-center gap-0.5">
                              <Sparkles size={8} />
                              AI生成
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-text-muted">{doc.company}</span>
                          <span className="text-[10px] text-text-muted">·</span>
                          <span className="text-[10px] text-text-muted">{doc.date}</span>
                          <span className="text-[10px] text-text-muted">·</span>
                          <span className="text-[10px] text-text-muted">{doc.size}</span>
                        </div>
                      </div>

                      {/* Status + Download */}
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={statusConfig.status} size="sm">
                          {statusConfig.label}
                        </StatusBadge>
                        {doc.status === 'ready' && (
                          <motion.button whileTap={{ scale: 0.9 }} className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center">
                            <Download size={14} className="text-text-muted" />
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* ═══════════ COMPANIES' DOCS (from store) ═══════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-body font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Building2 size={16} className="text-coral" />
            按公司查看
          </h2>
          <div className="space-y-2">
            {companies.map((company, ci) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * ci }}
              >
                <Card variant="interactive" padding="md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-coral/15 flex items-center justify-center">
                        <Building2 size={18} className="text-coral" />
                      </div>
                      <div>
                        <p className="text-body-sm font-medium text-text-primary">{company.name}</p>
                        <p className="text-caption text-text-muted">
                          {(company.documents || []).length} 个文档
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-text-muted" />
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
