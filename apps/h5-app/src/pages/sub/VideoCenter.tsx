import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Clock, Eye, Heart, MessageCircle, Bookmark,
  Search, ArrowLeft, TrendingUp, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import TopBar from '@/components/layout/TopBar';

/* ── mock data ────────────────────────────────────── */

interface VideoItem {
  id: string;
  title: string;
  duration: string;
  views: number;
  comments: number;
  likes: number;
  bookmarks: number;
  author: string;
  timeAgo: string;
  category: string;
}

const categories = ['全部', '萨摩亚', '出海教程', '案例', 'AI工具', '直播回放'];

const featuredVideo: VideoItem = {
  id: 'featured_001',
  title: '萨摩亚公司注册全流程演示',
  duration: '12:35',
  views: 32000,
  comments: 356,
  likes: 1280,
  bookmarks: 520,
  author: '太初国链官方',
  timeAgo: '2天前',
  category: '萨摩亚',
};

const videos: VideoItem[] = [
  { id: 'v1', title: '3分钟AI填单教程', duration: '08:20', views: 21000, comments: 120, likes: 890, bookmarks: 230, author: '太初国链官方', timeAgo: '3天前', category: 'AI工具' },
  { id: 'v2', title: '税务计算器使用指南', duration: '15:45', views: 15000, comments: 85, likes: 620, bookmarks: 180, author: '智财管家AI', timeAgo: '4天前', category: '萨摩亚' },
  { id: 'v3', title: '福建老酒出海案例', duration: '22:10', views: 8900, comments: 200, likes: 1500, bookmarks: 340, author: '出海助手AI', timeAgo: '5天前', category: '案例' },
  { id: 'v4', title: '泰国市场爆品分析', duration: '05:30', views: 12000, comments: 95, likes: 540, bookmarks: 150, author: '市场洞察AI', timeAgo: '1周前', category: '出海教程' },
  { id: 'v5', title: 'AI选品官实战演示', duration: '18:15', views: 6700, comments: 70, likes: 430, bookmarks: 120, author: '太初国链官方', timeAgo: '1周前', category: 'AI工具' },
  { id: 'v6', title: '全球支付通道介绍', duration: '10:00', views: 4500, comments: 45, likes: 320, bookmarks: 95, author: '支付专家AI', timeAgo: '2周前', category: '出海教程' },
  { id: 'v7', title: '月度卖家大会回放', duration: '45:00', views: 3200, comments: 180, likes: 780, bookmarks: 200, author: '太初国链官方', timeAgo: '2周前', category: '直播回放' },
  { id: 'v8', title: '萨摩亚经济实质法解读', duration: '12:45', views: 2800, comments: 60, likes: 280, bookmarks: 80, author: '法务精灵AI', timeAgo: '3周前', category: '萨摩亚' },
];

/* ── utilities ────────────────────────────────────── */

function formatViews(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}千`;
  return n.toString();
}

function getGradientForIndex(i: number): string {
  const gradients = [
    'from-[#0A2540] to-[#1A1035]',
    'from-[#1A1035] to-[#0A2540]',
    'from-[#0A2E2E] to-[#0A2540]',
    'from-[#25400A] to-[#0A2E2E]',
    'from-[#2E0A1A] to-[#1A1035]',
    'from-[#0A2540] to-[#2E1A0A]',
    'from-[#1A2E1A] to-[#0A2540]',
    'from-[#2E2E0A] to-[#1A1035]',
  ];
  return gradients[i % gradients.length];
}

/* ── component ────────────────────────────────────── */

export default function VideoCenter() {
  usePageTitle('太初视频');
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('全部');
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredVideos = activeCategory === '全部'
    ? videos
    : videos.filter(v => v.category === activeCategory);

  const searchedVideos = searchQuery.trim()
    ? filteredVideos.filter(v => v.title.includes(searchQuery))
    : filteredVideos;

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Header */}
      <TopBar title="太初视频" showBack rightAction={
        <div className="flex items-center justify-end gap-1 w-20">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setSearchMode(!searchMode)}
            className="w-10 h-10 flex items-center justify-center text-text-primary"
          >
            <Search size={22} strokeWidth={1.5} />
          </motion.button>
        </div>
      } />

      {/* Search Bar */}
      <AnimatePresence>
        {searchMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-white/[0.06]"
          >
            <div className="px-4 py-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索视频..."
                  className="w-full h-10 pl-9 pr-4 rounded-full bg-bg-input border border-white/[0.08] text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coral/40"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Tabs - Sticky */}
      <div className="sticky top-12 z-40 glass border-b border-white/[0.06]">
        <div
          ref={scrollRef}
          className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar"
        >
          {categories.map((cat) => (
            <motion.button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`relative shrink-0 px-4 py-1.5 text-caption font-medium transition-colors rounded-full ${
                activeCategory === cat
                  ? 'text-coral font-semibold'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {cat}
              {activeCategory === cat && (
                <motion.div
                  layoutId="activeVideoTab"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-coral rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="pb-8">
        {/* Featured Video Card */}
        <AnimatePresence mode="wait">
          {!searchQuery && activeCategory === '全部' && (
            <motion.div
              key="featured"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="px-4 pt-4"
            >
              <motion.div
                className="relative h-[220px] rounded-lg overflow-hidden cursor-pointer"
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/video/${featuredVideo.id}`)}
              >
                {/* Thumbnail Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${getGradientForIndex(0)}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="w-16 h-16 rounded-full bg-coral flex items-center justify-center shadow-lg shadow-coral/30"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Play size={28} className="text-bg-dark ml-1" />
                  </motion.div>
                </div>

                {/* Duration Badge */}
                <div className="absolute top-3 right-3 bg-black/70 text-white text-[11px] px-2 py-0.5 rounded flex items-center gap-1">
                  <Clock size={10} />
                  {featuredVideo.duration}
                </div>

                {/* HOT Badge */}
                <div className="absolute top-3 left-3 bg-danger text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <TrendingUp size={10} />
                  热门
                </div>

                {/* Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-h4 font-semibold text-white line-clamp-1">
                    {featuredVideo.title}
                  </h3>
                  <p className="text-[11px] text-white/60 mt-1">
                    {featuredVideo.author} · {formatViews(featuredVideo.views)}次观看 · {featuredVideo.timeAgo}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-[11px] text-white/60">
                      <Heart size={12} /> {featuredVideo.likes}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-white/60">
                      <MessageCircle size={12} /> {featuredVideo.comments}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-white/60">
                      <Bookmark size={12} /> 收藏
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Grid - 2 columns */}
        <div className="px-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence mode="wait">
              {searchedVideos.map((video, i) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate(`/video/${video.id}`)}
                  className="cursor-pointer"
                >
                  <div className="bg-bg-card rounded-lg overflow-hidden border border-white/[0.06] active:border-coral/30 transition-colors">
                    {/* Thumbnail */}
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${getGradientForIndex(i + 1)}`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                      {/* Play Icon */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-80">
                        <div className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center">
                          <Play size={16} className="text-white ml-0.5" />
                        </div>
                      </div>

                      {/* Duration */}
                      <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                        {video.duration}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-2.5">
                      <h4 className="text-[12px] font-medium text-text-primary line-clamp-2 leading-4">
                        {video.title}
                      </h4>
                      <p className="text-[10px] text-text-muted mt-1 truncate">
                        {video.author}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                          <Eye size={10} /> {formatViews(video.views)}
                        </span>
                        <span className="text-[10px] text-text-muted">· {video.timeAgo}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {searchedVideos.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-text-muted"
            >
              <Search size={40} className="mb-3 opacity-30" />
              <p className="text-body-sm">暂无相关视频</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
