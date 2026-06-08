import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle, Layers, BarChart3, Users, FileText, Video,
  Radio, Image, PenTool, TrendingUp, ChevronDown, Upload,
  Sparkles, Check, Clock, Save, Send, Globe, Instagram,
  Twitter, Linkedin, Youtube, CheckCircle2, PauseCircle,
  Eye, ThumbsUp, Share2, ArrowUpRight, Download, Tag,
  X, PlayCircle
} from 'lucide-react';
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import TopBar from '@/components/layout/TopBar';
import { usePageTitle } from '@/hooks/usePageTitle';

/* ═══════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════ */

const platformDistribution = [
  { name: '抖音', value: 45, color: '#F6A623' },
  { name: '视频号', value: 25, color: '#00D4AA' },
  { name: 'TikTok', value: 20, color: '#60A5FA' },
  { name: '小红书', value: 7, color: '#F472B6' },
  { name: '其他', value: 3, color: '#6B7280' },
];

const trafficData = [
  { date: '12/12', value: 3200 },
  { date: '12/13', value: 4100 },
  { date: '12/14', value: 3800 },
  { date: '12/15', value: 5200 },
  { date: '12/16', value: 4800 },
  { date: '12/17', value: 6100 },
  { date: '12/18', value: 7500 },
];

const topContent = [
  { rank: 1, title: '萨摩亚注册教程', views: 320000 },
  { rank: 2, title: 'AI选品官演示', views: 280000 },
  { rank: 3, title: '税务计算器使用', views: 150000 },
  { rank: 4, title: '福建老酒出海', views: 120000 },
  { rank: 5, title: '全球支付介绍', views: 80000 },
];

const recentPosts = [
  {
    id: 'rp1',
    title: '萨摩亚SPV注册全流程详解',
    type: 'video',
    platforms: ['抖音', '视频号'],
    views: 12500,
    likes: 892,
    date: '2024-12-18',
    thumbnail: 'gradient-1',
  },
  {
    id: 'rp2',
    title: '2024全球税务优化策略',
    type: 'article',
    platforms: ['小红书', 'TikTok'],
    views: 8900,
    likes: 645,
    date: '2024-12-17',
    thumbnail: 'gradient-2',
  },
  {
    id: 'rp3',
    title: 'AI大脑智能助手实战演示',
    type: 'video',
    platforms: ['抖音', '视频号', 'TikTok'],
    views: 23100,
    likes: 1876,
    date: '2024-12-16',
    thumbnail: 'gradient-3',
  },
];

const platformsList = [
  { name: '抖音', icon: PlayCircle, connected: true },
  { name: '快手', icon: Video, connected: false },
  { name: '视频号', icon: PlayCircle, connected: true },
  { name: '小红书', icon: Instagram, connected: true },
  { name: 'TikTok', icon: Video, connected: true },
  { name: 'YouTube', icon: Youtube, connected: false },
  { name: 'Twitter', icon: Twitter, connected: true },
  { name: 'LinkedIn', icon: Linkedin, connected: true },
];

const tabs = [
  { key: 'home', label: '首页', icon: Layers },
  { key: 'publish', label: '发布', icon: PlusCircle },
  { key: 'data', label: '数据', icon: BarChart3 },
];

const contentTypes = [
  { key: 'video', label: '短视频', icon: Video, desc: '15s-3min视频' },
  { key: 'article', label: '图文文章', icon: FileText, desc: '富文本长文' },
  { key: 'image', label: '图文动态', icon: Image, desc: '朋友圈式短内容' },
  { key: 'live', label: '直播预告', icon: Radio, desc: '预约直播' },
];

const publishPlatforms = [
  { name: '抖音', checked: true },
  { name: '视频号', checked: true },
  { name: 'TikTok', checked: true },
  { name: '快手', checked: false },
  { name: '小红书', checked: true },
  { name: 'YouTube', checked: false },
];

const tagOptions = ['萨摩亚', '跨境电商', 'AI工具', '支付', '税务规划', '公司注册'];

/* ═══════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════ */

function formatViews(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}千`;
  return n.toString();
}

function getThumbnailGradient(type: string) {
  const map: Record<string, string> = {
    'gradient-1': 'from-[#0A2540] to-[#1A1035]',
    'gradient-2': 'from-[#1A1035] to-[#0A2540]',
    'gradient-3': 'from-[#0A2E2E] to-[#0A2540]',
    'video': 'from-[#2E0A1A] to-[#1A1035]',
    'article': 'from-[#25400A] to-[#0A2E2E]',
  };
  return map[type] || map['gradient-1'];
}

/* ═══════════════════════════════════════════════════
   COMPONENT: MediaCenter
   ═══════════════════════════════════════════════════ */

export default function MediaCenter() {
  usePageTitle('自媒体中心');
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="min-h-screen bg-bg-dark">
      <TopBar title="自媒体中心" showBack />

      {/* Tab Navigation - Sticky */}
      <div className="sticky top-12 z-40 glass border-b border-white/[0.06]">
        <div className="flex">
          {tabs.map((tab) => (
            <motion.button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-medium transition-colors ${
                activeTab === tab.key ? 'text-coral' : 'text-text-muted'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <tab.icon size={16} />
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="mediaActiveTab"
                  className="absolute bottom-0 left-4 right-4 h-0.5 bg-coral rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="pb-8"
        >
          {activeTab === 'home' && <MediaHomeTab />}
          {activeTab === 'publish' && <MediaPublishTab />}
          {activeTab === 'data' && <MediaDataTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB 1: 自媒体首页
   ═══════════════════════════════════════════════════ */

function MediaHomeTab() {
  return (
    <div className="px-4 pt-4 space-y-5">
      {/* Account Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-lg overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A2540] via-[#111827] to-[#1A1035]" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 to-transparent" />
        <div className="relative p-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-coral/40 to-coral/20 flex items-center justify-center border-2 border-coral/30">
              <PenTool size={24} className="text-coral" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-h3 font-semibold text-text-primary">太初国链官方</h2>
                <CheckCircle2 size={14} className="text-coral" />
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">内容创作 × 数据分析 × 多渠道变现</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              { label: '粉丝', value: '12.8万' },
              { label: '内容', value: '156篇' },
              { label: '获赞', value: '45.2万' },
              { label: '转发', value: '8.9万' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-[14px] font-bold text-text-primary">{stat.value}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4">
            {['发布内容', '数据看板', '账号管理'].map((action) => (
              <button
                key={action}
                className="flex-1 h-8 rounded-full bg-white/[0.08] text-[11px] text-text-secondary hover:bg-coral/20 hover:text-coral transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Content Management Grid */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-h4 font-semibold text-text-primary mb-3">内容管理</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Video, label: '视频', count: '42篇', color: 'text-coral', bg: 'bg-coral/10' },
            { icon: FileText, label: '文章', count: '89篇', color: 'text-teal', bg: 'bg-teal/10' },
            { icon: Radio, label: '直播', count: '25场', color: 'text-blue-400', bg: 'bg-blue-400/10' },
          ].map((item) => (
            <motion.div
              key={item.label}
              whileTap={{ scale: 0.96 }}
              className="bg-bg-card border border-white/[0.06] rounded-lg p-3 flex flex-col items-center cursor-pointer active:border-coral/30 transition-colors"
            >
              <div className={`w-10 h-10 rounded-full ${item.bg} flex items-center justify-center`}>
                <item.icon size={18} className={item.color} />
              </div>
              <p className="text-[12px] font-medium text-text-primary mt-2">{item.label}</p>
              <p className="text-[10px] text-text-muted">{item.count}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Platform Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-h4 font-semibold text-text-primary mb-3">平台分布</h3>
        <div className="grid grid-cols-4 gap-2">
          {platformsList.map((p) => (
            <div
              key={p.name}
              className="bg-bg-card border border-white/[0.06] rounded-lg p-2.5 flex flex-col items-center"
            >
              <div className="relative">
                <div className={`w-9 h-9 rounded-full ${p.connected ? 'bg-coral/10' : 'bg-bg-elevated'} flex items-center justify-center`}>
                  <p.icon size={16} className={p.connected ? 'text-coral' : 'text-text-muted'} />
                </div>
                {p.connected && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-teal flex items-center justify-center">
                    <Check size={8} className="text-bg-dark" />
                  </div>
                )}
                {!p.connected && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-bg-elevated border border-white/[0.1] flex items-center justify-center">
                    <PauseCircle size={8} className="text-text-muted" />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-text-muted mt-1.5">{p.name}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Posts */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-h4 font-semibold text-text-primary mb-3">最近发布</h3>
        <div className="space-y-3">
          {recentPosts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className="bg-bg-card border border-white/[0.06] rounded-lg p-3 flex gap-3"
            >
              <div className={`w-20 h-14 rounded bg-gradient-to-br ${getThumbnailGradient(post.thumbnail)} shrink-0 flex items-center justify-center`}>
                {post.type === 'video' ? (
                  <PlayCircle size={20} className="text-white/60" />
                ) : (
                  <FileText size={20} className="text-white/60" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[12px] font-medium text-text-primary line-clamp-1">{post.title}</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {post.platforms.map((pl) => (
                    <span key={pl} className="text-[9px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-text-muted">
                      {pl}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                    <Eye size={10} /> {formatViews(post.views)}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                    <ThumbsUp size={10} /> {post.likes}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB 2: 发布内容
   ═══════════════════════════════════════════════════ */

function MediaPublishTab() {
  const [selectedType, setSelectedType] = useState('video');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['萨摩亚', '跨境电商']);
  const [platforms, setPlatforms] = useState(publishPlatforms);
  const [showTagMenu, setShowTagMenu] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const togglePlatform = (name: string) => {
    setPlatforms((prev) =>
      prev.map((p) => (p.name === name ? { ...p, checked: !p.checked } : p))
    );
  };

  return (
    <div className="px-4 pt-4 space-y-5">
      {/* Content Type Selector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="text-h4 font-semibold text-text-primary mb-3">选择发布类型</h3>
        <div className="grid grid-cols-2 gap-3">
          {contentTypes.map((ct, i) => (
            <motion.button
              key={ct.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedType(ct.key)}
              className={`bg-bg-card border rounded-lg p-4 flex flex-col items-center transition-colors ${
                selectedType === ct.key
                  ? 'border-coral/50 bg-coral/5'
                  : 'border-white/[0.06]'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedType === ct.key ? 'bg-coral/20' : 'bg-bg-elevated'
              }`}>
                <ct.icon size={18} className={selectedType === ct.key ? 'text-coral' : 'text-text-muted'} />
              </div>
              <p className={`text-[13px] font-medium mt-2 ${selectedType === ct.key ? 'text-coral' : 'text-text-primary'}`}>
                {ct.label}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">{ct.desc}</p>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-bg-card border border-white/[0.06] rounded-lg p-4 space-y-4"
      >
        {/* Title */}
        <div>
          <label className="text-[12px] text-text-muted mb-1.5 block">标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入内容标题..."
            className="w-full h-11 px-4 rounded-lg bg-bg-input border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-coral/40"
          />
        </div>

        {/* Cover Upload */}
        <div>
          <label className="text-[12px] text-text-muted mb-1.5 block">封面</label>
          <motion.div
            whileTap={{ scale: 0.98 }}
            className="h-[120px] rounded-lg border-2 border-dashed border-white/[0.1] bg-bg-input flex flex-col items-center justify-center cursor-pointer hover:border-coral/30 transition-colors"
          >
            <Upload size={24} className="text-text-muted" />
            <p className="text-[11px] text-text-muted mt-2">上传图片或选择视频帧</p>
          </motion.div>
        </div>

        {/* Content */}
        <div>
          <label className="text-[12px] text-text-muted mb-1.5 block">正文</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="输入正文内容..."
            rows={6}
            className="w-full px-4 py-3 rounded-lg bg-bg-input border border-white/[0.08] text-[12px] text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-coral/40 resize-none"
          />
        </div>

        {/* AI Assist Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          className="w-full h-10 rounded-lg bg-coral/10 border border-coral/30 flex items-center justify-center gap-2 text-[12px] text-coral hover:bg-coral/20 transition-colors"
        >
          <Sparkles size={14} />
          AI辅助生成文案
        </motion.button>

        {/* Tags */}
        <div>
          <label className="text-[12px] text-text-muted mb-1.5 block">标签</label>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-coral/10 text-coral"
              >
                #{tag}
                <button onClick={() => toggleTag(tag)} className="hover:opacity-70">
                  <X size={10} />
                </button>
              </span>
            ))}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowTagMenu(!showTagMenu)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-bg-elevated text-text-muted hover:text-coral transition-colors"
              >
                + 添加标签
              </motion.button>
              <AnimatePresence>
                {showTagMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute top-full mt-1 left-0 bg-bg-card border border-white/[0.1] rounded-lg shadow-xl p-2 z-10 min-w-[140px]"
                  >
                    {tagOptions.filter((t) => !selectedTags.includes(t)).map((t) => (
                      <button
                        key={t}
                        onClick={() => { toggleTag(t); setShowTagMenu(false); }}
                        className="block w-full text-left px-3 py-1.5 text-[11px] text-text-secondary hover:text-coral hover:bg-bg-elevated rounded transition-colors"
                      >
                        #{t}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Platform Selection */}
        <div>
          <label className="text-[12px] text-text-muted mb-1.5 block">发布平台</label>
          <div className="grid grid-cols-3 gap-2">
            {platforms.map((p) => (
              <motion.button
                key={p.name}
                whileTap={{ scale: 0.95 }}
                onClick={() => togglePlatform(p.name)}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg border text-[11px] transition-colors ${
                  p.checked
                    ? 'border-coral/40 bg-coral/10 text-coral'
                    : 'border-white/[0.06] bg-bg-elevated text-text-muted'
                }`}
              >
                {p.checked ? <CheckCircle2 size={13} /> : <div className="w-3.5 h-3.5 rounded-full border border-text-muted" />}
                {p.name}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-3"
      >
        <button className="flex-1 h-11 rounded-lg bg-coral text-bg-dark font-semibold text-[13px] flex items-center justify-center gap-1.5 hover:brightness-110 transition-all">
          <Send size={14} />
          立即发布
        </button>
        <button className="h-11 px-4 rounded-lg bg-bg-card border border-white/[0.08] text-[12px] text-text-secondary flex items-center gap-1.5 hover:border-coral/30 transition-colors">
          <Clock size={14} />
          定时
        </button>
        <button className="h-11 px-4 rounded-lg bg-bg-card border border-white/[0.08] text-[12px] text-text-secondary flex items-center gap-1.5 hover:border-coral/30 transition-colors">
          <Save size={14} />
          草稿
        </button>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB 3: 数据看板
   ═══════════════════════════════════════════════════ */

function MediaDataTab() {
  const [timeRange, setTimeRange] = useState('近7日');
  const timeOptions = ['近7日', '近30日', '近90日'];
  const [showTimeMenu, setShowTimeMenu] = useState(false);

  return (
    <div className="px-4 pt-4 space-y-5">
      {/* Time Range Selector */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h3 className="text-h4 font-semibold text-text-primary">数据概览</h3>
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTimeMenu(!showTimeMenu)}
            className="flex items-center gap-1 text-[11px] text-text-muted bg-bg-card border border-white/[0.06] px-3 py-1.5 rounded-full"
          >
            {timeRange} <ChevronDown size={12} />
          </motion.button>
          <AnimatePresence>
            {showTimeMenu && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute right-0 top-full mt-1 bg-bg-card border border-white/[0.1] rounded-lg shadow-xl overflow-hidden z-10"
              >
                {timeOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setTimeRange(opt); setShowTimeMenu(false); }}
                    className={`block w-full text-left px-4 py-2 text-[11px] whitespace-nowrap ${
                      timeRange === opt ? 'text-coral bg-coral/10' : 'text-text-secondary hover:bg-bg-elevated'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Core Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { label: '总粉丝', value: '12.8万', change: '↑2,300', color: 'text-coral' },
          { label: '总获赞', value: '45.2万', change: '↑8,500', color: 'text-teal' },
          { label: '总转发', value: '8.9万', change: '↑1,200', color: 'text-blue-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-bg-card border border-white/[0.06] rounded-lg p-3">
            <p className="text-[10px] text-text-muted">{stat.label}</p>
            <p className="text-[16px] font-bold text-text-primary mt-1 font-display">{stat.value}</p>
            <p className={`text-[10px] ${stat.color} mt-0.5`}>{stat.change}</p>
          </div>
        ))}
      </motion.div>

      {/* Traffic Trend Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-bg-card border border-white/[0.06] rounded-lg p-4"
      >
        <h3 className="text-[13px] font-semibold text-text-primary mb-3">流量趋势</h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={trafficData}>
            <defs>
              <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F6A623" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#F6A623" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6B7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                fontSize: 11,
                color: '#F9FAFB',
              }}
              itemStyle={{ color: '#F6A623' }}
              labelStyle={{ color: '#6B7280' }}
              formatter={(value: number) => [value.toLocaleString(), '流量']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#F6A623"
              strokeWidth={2}
              fill="url(#trafficFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Platform Pie Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-bg-card border border-white/[0.06] rounded-lg p-4"
      >
        <h3 className="text-[13px] font-semibold text-text-primary mb-3">平台分布</h3>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie
                data={platformDistribution}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {platformDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2">
            {platformDistribution.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-[11px] text-text-secondary flex-1">{p.name}</span>
                <span className="text-[11px] font-medium text-text-primary">{p.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Content Performance TOP5 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-bg-card border border-white/[0.06] rounded-lg p-4"
      >
        <h3 className="text-[13px] font-semibold text-text-primary mb-3">内容表现 TOP5</h3>
        <div className="space-y-2">
          {topContent.map((item) => (
            <div
              key={item.rank}
              className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0"
            >
              <span className={`text-[14px] font-bold w-5 text-center ${
                item.rank <= 3 ? 'text-coral' : 'text-text-muted'
              }`}>
                {item.rank}
              </span>
              <p className="flex-1 text-[12px] text-text-primary truncate">{item.title}</p>
              <span className="text-[11px] text-text-muted">{formatViews(item.views)}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Export Button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileTap={{ scale: 0.98 }}
        className="w-full h-11 rounded-lg bg-bg-card border border-white/[0.08] text-[12px] text-text-secondary flex items-center justify-center gap-2 hover:border-coral/30 transition-colors"
      >
        <Download size={14} />
        导出详细报告
      </motion.button>
    </div>
  );
}
