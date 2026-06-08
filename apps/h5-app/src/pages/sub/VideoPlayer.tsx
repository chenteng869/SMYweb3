import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, Pause, Heart, MessageCircle, Share2,
  Bookmark, Star, Send, Maximize2, Gauge, Subtitles,
  Eye, Clock, ThumbsUp, ChevronRight, CheckCircle2, Volume2
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

/* ── mock data ────────────────────────────────────── */

interface VideoData {
  id: string;
  title: string;
  author: string;
  authorVerified: boolean;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  bookmarks: number;
  duration: string;
  durationSeconds: number;
  description: string;
  tags: string[];
  publishedAt: string;
  category: string;
}

interface Comment {
  id: string;
  userName: string;
  userAvatar: string;
  content: string;
  likes: number;
  timeAgo: string;
}

interface RelatedVideo {
  id: string;
  title: string;
  duration: string;
  views: number;
  author: string;
  timeAgo: string;
}

const videoDataMap: Record<string, VideoData> = {
  featured_001: {
    id: 'featured_001',
    title: '萨摩亚公司注册全流程演示',
    author: '太初国链官方',
    authorVerified: true,
    views: 32000,
    likes: 1280,
    comments: 356,
    shares: 890,
    bookmarks: 520,
    duration: '12:35',
    durationSeconds: 755,
    description: '本视频详细演示如何通过太初国链APP，在3分钟内完成萨摩亚公司注册的AI填单流程。从资料准备到提交审核，全流程可视化操作指导，新手也能轻松上手。',
    tags: ['萨摩亚注册', 'AI工具', '跨境电商'],
    publishedAt: '2024-12-18',
    category: '萨摩亚',
  },
};

const defaultVideo: VideoData = {
  id: 'v1',
  title: '3分钟AI填单教程',
  author: '太初国链官方',
  authorVerified: true,
  views: 21000,
  likes: 890,
  comments: 120,
  shares: 340,
  bookmarks: 230,
  duration: '08:20',
  durationSeconds: 500,
  description: '使用AI填单助手，3分钟内完成萨摩亚公司注册的所有表单填写。智能识别、自动填充、一键提交，让跨境注册变得简单高效。',
  tags: ['AI填单', '萨摩亚', '教程'],
  publishedAt: '2024-12-17',
  category: 'AI工具',
};

const commentsData: Comment[] = [
  { id: 'c1', userName: '用户A', userAvatar: '', content: '太方便了，已经注册成功！', likes: 23, timeAgo: '2小时前' },
  { id: 'c2', userName: '用户B', userAvatar: '', content: 'AI填单真的省了很多时间', likes: 15, timeAgo: '5小时前' },
  { id: 'c3', userName: '用户C', userAvatar: '', content: '请问年审费用是多少？', likes: 8, timeAgo: '1天前' },
];

const relatedVideos: RelatedVideo[] = [
  { id: 'v2', title: '税务计算器使用指南', duration: '15:45', views: 15000, author: '智财管家AI', timeAgo: '4天前' },
  { id: 'v3', title: '福建老酒出海案例', duration: '22:10', views: 8900, author: '出海助手AI', timeAgo: '5天前' },
  { id: 'v4', title: '泰国市场爆品分析', duration: '05:30', views: 12000, author: '市场洞察AI', timeAgo: '1周前' },
  { id: 'v5', title: 'AI选品官实战演示', duration: '18:15', views: 6700, author: '太初国链官方', timeAgo: '1周前' },
];

/* ── utilities ────────────────────────────────────── */

function formatViews(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}千`;
  return n.toString();
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getGradientForId(id: string): string {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const gradients = [
    'from-[#0A2540] to-[#1A1035]',
    'from-[#1A1035] to-[#0A2540]',
    'from-[#0A2E2E] to-[#0A2540]',
    'from-[#25400A] to-[#0A2E2E]',
    'from-[#2E0A1A] to-[#1A1035]',
  ];
  return gradients[hash % gradients.length];
}

/* ── component ────────────────────────────────────── */

export default function VideoPlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const video = id ? (videoDataMap[id] || { ...defaultVideo, id }) : defaultVideo;
  usePageTitle(video.title);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [speed, setSpeed] = useState('1x');
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const displayedComments = showAllComments ? commentsData : commentsData.slice(0, 3);

  // Simulate progress
  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return p + 0.2;
        });
      }, 100);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPlaying]);

  const currentSeconds = Math.floor((progress / 100) * video.durationSeconds);

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Video Player - Sticky top */}
      <div className="sticky top-0 z-50">
        <div className="relative h-[240px] bg-black flex items-center justify-center overflow-hidden">
          {/* Gradient Background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${getGradientForId(video.id)}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

          {/* Back Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="absolute top-3 left-3 z-10 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white"
          >
            <ArrowLeft size={20} />
          </motion.button>

          {/* Play/Pause Button */}
          <AnimatePresence mode="wait">
            {!isPlaying ? (
              <motion.button
                key="play"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsPlaying(true)}
                className="relative z-10 w-16 h-16 rounded-full bg-coral flex items-center justify-center shadow-lg shadow-coral/30"
              >
                <Play size={30} className="text-bg-dark ml-1" />
              </motion.button>
            ) : (
              <motion.button
                key="pause"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsPlaying(false)}
                className="relative z-10 w-16 h-16 rounded-full bg-white/20 flex items-center justify-center"
              >
                <Pause size={28} className="text-white" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            {/* Progress Bar */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-white/80 font-mono">{formatTime(currentSeconds)}</span>
              <div
                className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden cursor-pointer relative"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = ((e.clientX - rect.left) / rect.width) * 100;
                  setProgress(pct);
                }}
              >
                <motion.div
                  className="h-full bg-coral rounded-full relative"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-coral shadow" />
                </motion.div>
              </div>
              <span className="text-[10px] text-white/80 font-mono">{video.duration}</span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsPlaying(!isPlaying)} className="text-white/80">
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} className="text-white/60">
                  <Volume2 size={16} />
                </motion.button>
              </div>
              <div className="flex items-center gap-3">
                {/* Speed */}
                <div className="relative">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="text-[11px] text-white/80 bg-white/10 px-2 py-0.5 rounded"
                  >
                    {speed}
                  </motion.button>
                  <AnimatePresence>
                    {showSpeedMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-bg-card border border-white/[0.1] rounded-lg overflow-hidden shadow-xl"
                      >
                        {['0.5x', '1x', '1.5x', '2x'].map((s) => (
                          <button
                            key={s}
                            onClick={() => { setSpeed(s); setShowSpeedMenu(false); }}
                            className={`block w-full px-4 py-1.5 text-[11px] text-center ${speed === s ? 'text-coral bg-coral/10' : 'text-text-secondary hover:bg-bg-elevated'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} className="text-white/60">
                  <Subtitles size={16} />
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} className="text-white/60">
                  <Maximize2 size={16} />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 pt-4 pb-2"
      >
        <h1 className="text-h2 font-semibold text-text-primary">{video.title}</h1>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="flex items-center gap-1 text-[12px] text-coral font-medium">
            {video.author}
            {video.authorVerified && <CheckCircle2 size={12} className="text-coral" />}
          </span>
          <span className="text-[11px] text-text-muted flex items-center gap-1">
            <Eye size={11} /> {formatViews(video.views)}次观看
          </span>
          <span className="text-[11px] text-text-muted">· {video.publishedAt}</span>
        </div>

        {/* Description */}
        <p className="text-[12px] text-text-secondary mt-3 leading-5">{video.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-3">
          {video.tags.map((tag) => (
            <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-coral/10 text-coral">
              #{tag}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Engagement Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-around py-3 mt-2 border-y border-white/[0.06] mx-4"
      >
        {[
          { icon: Heart, count: video.likes, label: '点赞', active: liked, onClick: () => setLiked(!liked) },
          { icon: MessageCircle, count: video.comments, label: '评论', active: false, onClick: () => { } },
          { icon: Share2, count: video.shares, label: '分享', active: false, onClick: () => { } },
          { icon: Bookmark, count: video.bookmarks, label: '收藏', active: bookmarked, onClick: () => setBookmarked(!bookmarked) },
        ].map((action) => (
          <motion.button
            key={action.label}
            whileTap={{ scale: 1.2 }}
            onClick={action.onClick}
            className={`flex flex-col items-center gap-1 ${
              action.active ? 'text-coral' : 'text-text-muted'
            }`}
          >
            <action.icon size={20} className={action.active ? 'fill-coral' : ''} />
            <span className="text-[10px]">
              {action.count >= 1000 ? formatViews(action.count) : action.count}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* Comments Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-4 pt-4"
      >
        <h3 className="text-h4 font-semibold text-text-primary">
          评论（{video.comments}）
        </h3>

        {/* Comment Input */}
        <div className="flex items-center gap-3 mt-3 pb-4 border-b border-white/[0.04]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-coral/30 to-coral/10 flex items-center justify-center text-coral text-xs font-bold shrink-0">
            我
          </div>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="写评论..."
              className="flex-1 h-9 px-3 rounded-full bg-bg-input border border-white/[0.08] text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coral/40"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (commentText.trim()) {
                  setCommentText('');
                }
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                commentText.trim() ? 'bg-coral text-bg-dark' : 'bg-bg-elevated text-text-muted'
              }`}
            >
              <Send size={15} />
            </motion.button>
          </div>
        </div>

        {/* Comment List */}
        <div className="mt-2">
          {displayedComments.map((comment, i) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="flex items-start gap-3 py-3 border-b border-white/[0.04]"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal/30 to-teal/10 flex items-center justify-center text-teal text-xs font-bold shrink-0">
                {comment.userName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-coral">{comment.userName}</span>
                  <span className="text-[10px] text-text-muted">{comment.timeAgo}</span>
                </div>
                <p className="text-[12px] text-text-primary mt-0.5 leading-4">{comment.content}</p>
                <motion.button
                  whileTap={{ scale: 1.2 }}
                  className="flex items-center gap-1 mt-1 text-text-muted"
                >
                  <ThumbsUp size={11} />
                  <span className="text-[10px]">{comment.likes}</span>
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View More Comments */}
        {!showAllComments && commentsData.length > 3 && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAllComments(true)}
            className="w-full py-3 text-center text-[12px] text-text-muted flex items-center justify-center gap-1 hover:text-coral transition-colors"
          >
            查看更多评论 <ChevronRight size={12} />
          </motion.button>
        )}
      </motion.div>

      {/* Related Videos - Horizontal Scroll */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4 pb-8"
      >
        <div className="px-4 mb-3">
          <h3 className="text-h4 font-semibold text-text-primary flex items-center gap-1.5">
            <Play size={16} className="text-coral" />
            相关推荐
          </h3>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          {relatedVideos.map((rv, i) => (
            <motion.div
              key={rv.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * i }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(`/video/${rv.id}`)}
              className="snap-start shrink-0 w-[260px] cursor-pointer"
            >
              <div className="relative h-[145px] rounded-lg overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${getGradientForId(rv.id)}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
                    <Play size={16} className="text-white ml-0.5" />
                  </div>
                </div>
                <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                  {rv.duration}
                </span>
              </div>
              <h4 className="text-[12px] font-medium text-text-primary mt-1.5 line-clamp-2 leading-4">
                {rv.title}
              </h4>
              <p className="text-[10px] text-text-muted mt-0.5">
                {rv.author} · {formatViews(rv.views)}次观看
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
