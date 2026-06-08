<script setup lang="ts">
import { ref } from 'vue'

// 搜索标签
const searchTags = ref([
  '萨摩亚', '全球合规', '区块链', '税务优化', 'AI助手', '海外开户', '更多 →'
])

// 视频Tabs
const videoTabs = ref(['推荐', '注册流程', '税务合规', 'AI产品', '团队'])
const currentVideoTab = ref(0)

// 视频列表
const videoList = ref([
  { title: '萨摩亚SPV注册全流程详解', duration: '10:20', views: '1.2K' },
  { title: '2024年财税优惠政策解读', duration: '25:35', views: '894' },
  { title: 'AI大咖：如何看懂区块链', duration: '01:08', views: '2.1K' },
  { title: '全球收款通道对比评测', duration: '56:45', views: '1.5K' }
])

// 直播列表
const liveList = ref([
  { title: '萨摩亚SPV注册直播答疑解惑', status: 'LIVE', viewers: '1.2K', statusText: '正在进行' },
  { title: '2025全球税务优化策略', status: 'LIVE', statusText: '即将开始' }
])

// 音频列表
const audioList = ref([
  { title: 'AI技术揭秘与实战分享', source: 'WOPC商学院', duration: '32:00', plays: '890' },
  { title: '跨境电商东南亚市场分析', source: '财经观察', duration: '45:00', plays: '1.2K' }
])

// 文章列表
const articleList = ref([
  { title: '全球税收政策最新变化速览', tag: '精选', time: '5分钟前' },
  { title: '萨摩亚银行开户实操指南', tag: '操作指南', time: '1小时前' }
])

// 目的地列表
const destinations = ref([
  { flag: '🇼🇸', name: '萨摩亚', desc: 'SPV注册天堂' },
  { flag: '🇸🇬', name: '新加坡', desc: '亚洲金融中心' },
  { flag: '🇭🇰', name: '香港', desc: '国际商贸枢纽' },
  { flag: '🇺🇸', name: '美国', desc: 'Delaware 公司' }
])

// DAO社区列表
const daoList = ref([
  { rank: 1, name: 'WOPC 创业家联盟', members: '2,450' },
  { rank: 2, name: '萨摩亚SPV持有者公会', members: '1,890' },
  { rank: 3, name: '全球合规研究组', members: '1,234' },
  { rank: 4, name: '区块链技术社区', members: '987' },
  { rank: 5, name: '跨境财税交流群', members: '756' }
])

// 指南列表
const guideList = ref([
  { icon: '📋', title: '公司注册流程详解' },
  { icon: '💳', title: '银行开户全攻略' },
  { icon: '📊', title: '税务申报指南' },
  { icon: '🔐', title: 'DID身份认证说明' },
  { icon: '⚖️', title: '法律法规汇编' }
])

// 服务列表
const serviceList = ref([
  'AI智能注册服务', '全球合规咨询', '税务优化方案',
  '法务合同审查', '品牌营销推广', '技术支持服务'
])
</script>

<template>
  <div class="discover-page">
    <!-- 顶部搜索栏 -->
    <div class="search-section">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input class="search-input" type="text" placeholder="搜索 无限可能" />
      </div>
      <span class="explore-text">🔥 探索无界可能</span>
    </div>

    <!-- 搜索推荐标签 -->
    <div class="tag-scroll">
      <div class="tag-list">
        <span v-for="(tag, index) in searchTags" :key="index" class="tag-item">{{ tag }}</span>
      </div>
    </div>

    <!-- 视频中心 -->
    <div class="section">
      <div class="section-header">
        <span class="section-title"><span class="title-icon">📺</span>视频中心</span>
        <span class="view-all">查看全部 →</span>
      </div>
      <div class="video-tabs">
        <span
          v-for="(tab, index) in videoTabs"
          :key="index"
          :class="['tab-item', { active: currentVideoTab === index }]"
          @click="currentVideoTab = index"
        >{{ tab }}</span>
      </div>
      <div class="video-grid">
        <div v-for="(video, index) in videoList" :key="index" class="video-card">
          <div class="video-thumbnail">
            <div class="play-button">▶️</div>
            <div class="duration-badge">{{ video.duration }}</div>
          </div>
          <div class="video-title">{{ video.title }}</div>
          <div class="video-meta">👁 {{ video.views }}观看</div>
        </div>
      </div>
    </div>

    <!-- 直播中心 -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">
          <span class="title-icon live-icon">🔴</span>直播中心
          <span class="live-dot"></span><span class="live-text">LIVE</span>
        </span>
        <span class="view-all">全部直播 →</span>
      </div>
      <div class="live-grid">
        <div v-for="(live, index) in liveList" :key="index" class="live-card">
          <div class="live-thumbnail">
            <div class="live-status-badge">{{ live.status }}</div>
          </div>
          <div class="live-info">
            <div class="live-title">{{ live.title }}</div>
            <div class="live-meta">
              <span v-if="live.viewers">👁 {{ live.viewers }}人</span>
              <span v-if="live.statusText" class="live-status-tag">{{ live.statusText }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 音频节目 -->
    <div class="section">
      <div class="section-header">
        <span class="section-title"><span class="title-icon">🎙️</span>音频节目</span>
      </div>
      <div class="audio-list">
        <div v-for="(audio, index) in audioList" :key="index" class="audio-item">
          <div class="audio-info">
            <div class="audio-title">{{ audio.title }}</div>
            <div class="audio-source">{{ audio.source }}</div>
            <div class="audio-meta-row">
              <span class="audio-duration">⏱ {{ audio.duration }}</span>
              <span class="audio-plays">▶️ {{ audio.plays }}次</span>
            </div>
          </div>
          <div class="play-btn">▶️</div>
        </div>
      </div>
    </div>

    <!-- 自媒体文章 -->
    <div class="section">
      <div class="section-header">
        <span class="section-title"><span class="title-icon">📝</span>自媒体文章</span>
      </div>
      <div class="article-list">
        <div v-for="(article, index) in articleList" :key="index" class="article-item">
          <div class="article-content">
            <div class="article-title">{{ article.title }}</div>
            <div class="article-meta">
              <span class="article-tag">{{ article.tag }}</span>
              <span class="article-time">{{ article.time }}</span>
            </div>
          </div>
          <span class="article-arrow">→</span>
        </div>
      </div>
    </div>

    <!-- 自媒体中心统计卡 -->
    <div class="media-center-card">
      <div class="media-center-header">
        <span class="section-title"><span class="title-icon">📊</span>自媒体中心</span>
        <span class="enter-text">进入 →</span>
      </div>
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">12.8万</span>
          <span class="stat-label">粉丝</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">245篇</span>
          <span class="stat-label">内容</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value positive">+12.5%</span>
          <span class="stat-label">增长</span>
        </div>
      </div>
    </div>

    <!-- 全球商务目的地 -->
    <div class="section">
      <div class="section-header">
        <span class="section-title"><span class="title-icon">🌍</span>全球商务目的地</span>
      </div>
      <div class="destination-grid">
        <div v-for="(dest, index) in destinations" :key="index" class="destination-card">
          <span class="dest-flag">{{ dest.flag }}</span>
          <span class="dest-name">{{ dest.name }}</span>
          <span class="dest-desc">{{ dest.desc }}</span>
        </div>
      </div>
    </div>

    <!-- DAO社区 -->
    <div class="section">
      <div class="section-header">
        <span class="section-title"><span class="title-icon">🏛️</span>DAO社区</span>
      </div>
      <div class="dao-list">
        <div v-for="(dao, index) in daoList" :key="index" class="dao-item">
          <div :class="['rank-badge', dao.rank <= 3 ? 'top-rank' : '']">{{ dao.rank }}</div>
          <div class="dao-info">
            <span class="dao-name">{{ dao.name }}</span>
            <span class="dao-members">{{ dao.members }} 成员</span>
          </div>
          <span class="dao-arrow">→</span>
        </div>
      </div>
    </div>

    <!-- 萨摩亚深度指南 -->
    <div class="section">
      <div class="section-header">
        <span class="section-title"><span class="title-icon">📖</span>萨摩亚深度指南</span>
      </div>
      <div class="guide-list">
        <div v-for="(guide, index) in guideList" :key="index" class="guide-item">
          <div class="guide-left">
            <span class="guide-icon">{{ guide.icon }}</span>
            <span class="guide-title">{{ guide.title }}</span>
          </div>
          <span class="guide-arrow">→</span>
        </div>
      </div>
    </div>

    <!-- 生态服务 -->
    <div class="section">
      <div class="section-header">
        <span class="section-title"><span class="title-icon">⚡</span>生态服务</span>
      </div>
      <div class="service-list">
        <div v-for="(service, index) in serviceList" :key="index" class="service-item">
          <span class="service-name">{{ service }}</span>
          <span class="service-arrow">→</span>
        </div>
      </div>
    </div>

    <!-- 底部CTA按钮 -->
    <div class="cta-section">
      <button class="cta-button">🚀 立即注册萨摩亚公司</button>
    </div>

    <!-- 底部安全区域占位 -->
    <div class="bottom-safe-area"></div>
  </div>
</template>

<style scoped>
.discover-page {
  min-height: 100%;
  padding: 16px;
  background-color: var(--bg-primary, #0F172A);
  color: var(--text-primary, #FFF);
}

/* 搜索区域 */
.search-section {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.search-box {
  flex: 1;
  background-color: var(--bg-card, #1E293B);
  border-radius: 999px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-color, #334155);
}

.search-icon { font-size: 14px; }

.search-input {
  flex: 1;
  font-size: 13px;
  color: #FFFFFF;
  background: none;
  border: none;
  outline: none;
}

.search-input::placeholder { color: var(--text-muted, #64748B); }

.explore-text {
  font-size: 12px;
  color: var(--accent, #F59E0B);
  white-space: nowrap;
}

/* 标签横向滚动 */
.tag-scroll {
  margin-bottom: 18px;
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}
.tag-scroll::-webkit-scrollbar { display: none; }

.tag-list { display: inline-flex; gap: 8px; }

.tag-item {
  display: inline-block;
  background-color: var(--bg-card, #1E293B);
  border-radius: 999px;
  padding: 7px 14px;
  border: 1px solid var(--border-color, #334155);
  font-size: 12px;
  color: var(--text-secondary, #94A3B8);
}

/* 通用区块样式 */
.section { margin-bottom: 20px; }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #FFFFFF;
}

.title-icon { font-size: 16px; }

.live-icon { position: relative; }

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #EF4444;
  animation: pulse-live 2s infinite;
  display: inline-block;
  margin-left: 4px;
}

@keyframes pulse-live {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.live-text {
  font-size: 11px;
  color: #EF4444;
  font-weight: 600;
  margin-left: 4px;
}

.view-all { font-size: 13px; color: var(--accent, #F59E0B); }

/* 视频Tabs */
.video-tabs {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.video-tabs::-webkit-scrollbar { display: none; }

.tab-item {
  font-size: 13px;
  color: var(--text-secondary, #94A3B8);
  padding-bottom: 6px;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-item.active {
  color: var(--accent, #F59E0B);
  font-weight: 600;
  border-bottom-color: var(--accent, #F59E0B);
}

/* 视频网格 */
.video-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.video-card {
  background-color: var(--bg-card, #1E293B);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border-color, #334155);
}

.video-thumbnail {
  width: 100%;
  height: 110px;
  background-color: #334155;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.duration-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 10px;
  color: #FFFFFF;
}

.video-title {
  padding: 8px 8px 4px;
  font-size: 13px;
  color: #FFFFFF;
  font-weight: 500;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.video-meta {
  padding: 0 8px 8px;
  font-size: 11px;
  color: var(--text-muted, #64748B);
}

/* 直播中心 */
.live-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.live-card {
  background-color: var(--bg-card, #1E293B);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border-color, #334155);
}

.live-thumbnail {
  width: 100%;
  height: 100px;
  background: linear-gradient(135deg, #1E293B 0%, #334155 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.live-status-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  background-color: #EF4444;
  border-radius: 4px;
  padding: 3px 7px;
  font-size: 10px;
  color: #FFFFFF;
  font-weight: 600;
}

.live-info { padding: 8px; }

.live-title {
  font-size: 13px;
  color: #FFFFFF;
  font-weight: 500;
  margin-bottom: 5px;
  line-height: 1.4;
}

.live-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-secondary, #94A3B8);
}

.live-status-tag { color: var(--text-secondary, #94A3B8); }

/* 音频节目 */
.audio-list {
  background-color: var(--bg-card, #1E293B);
  border-radius: 10px;
  padding: 4px 12px;
  border: 1px solid var(--border-color, #334155);
}

.audio-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color, #334155);
}
.audio-item:last-child { border-bottom: none; }

.audio-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }

.audio-title { font-size: 14px; color: #FFFFFF; font-weight: 500; }

.audio-source { font-size: 12px; color: var(--text-secondary, #94A3B8); }

.audio-meta-row { display: flex; gap: 10px; }

.audio-duration,
.audio-plays { font-size: 11px; color: var(--text-muted, #64748B); }

.play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--accent, #F59E0B);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 10px;
  font-size: 12px;
  flex-shrink: 0;
}

/* 文章列表 */
.article-list {
  background-color: var(--bg-card, #1E293B);
  border-radius: 10px;
  padding: 4px 12px;
  border: 1px solid var(--border-color, #334155);
}

.article-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color, #334155);
}
.article-item:last-child { border-bottom: none; }

.article-content { flex: 1; display: flex; flex-direction: column; gap: 4px; }

.article-title { font-size: 14px; color: #FFFFFF; font-weight: 500; }

.article-meta { display: flex; align-items: center; gap: 8px; }

.article-tag {
  font-size: 11px;
  color: var(--accent, #F59E0B);
  background-color: rgba(245, 158, 11, 0.15);
  padding: 2px 6px;
  border-radius: 3px;
}

.article-time { font-size: 11px; color: var(--text-muted, #64748B); }

.article-arrow { font-size: 14px; color: var(--text-muted, #64748B); margin-left: 10px; }

/* 自媒体中心统计卡 */
.media-center-card {
  background: linear-gradient(135deg, #1E293B 0%, #334155 100%);
  border-radius: 10px;
  padding: 14px;
  border: 1px solid var(--border-color, #334155);
  margin-bottom: 20px;
}

.media-center-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.enter-text { font-size: 13px; color: var(--accent, #F59E0B); }

.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.stat-item { text-align: center; }

.stat-value {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #FFFFFF;
  margin-bottom: 3px;
}

.stat-value.positive { color: #10B981; }

.stat-label { font-size: 11px; color: var(--text-secondary, #94A3B8); }

.stat-divider { width: 1px; height: 30px; background-color: var(--border-color, #334155); }

/* 目的地网格 */
.destination-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.destination-card {
  background-color: var(--bg-card, #1E293B);
  border-radius: 10px;
  padding: 12px;
  border: 1px solid var(--border-color, #334155);
  text-align: center;
}

.dest-flag { font-size: 24px; display: block; margin-bottom: 6px; }

.dest-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 3px;
}

.dest-desc { font-size: 11px; color: var(--text-secondary, #94A3B8); }

/* DAO社区列表 */
.dao-list {
  background-color: var(--bg-card, #1E293B);
  border-radius: 10px;
  padding: 4px 12px;
  border: 1px solid var(--border-color, #334155);
}

.dao-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color, #334155);
}
.dao-item:last-child { border-bottom: none; }

.rank-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: #FFFFFF;
}

.rank-badge.top-rank { background-color: var(--accent, #F59E0B); }

.dao-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }

.dao-name { font-size: 14px; color: #FFFFFF; font-weight: 500; }

.dao-members { font-size: 11px; color: var(--text-secondary, #94A3B8); }

.dao-arrow { font-size: 14px; color: var(--text-muted, #64748B); margin-left: 8px; }

/* 指南列表 */
.guide-list {
  background-color: var(--bg-card, #1E293B);
  border-radius: 10px;
  padding: 4px 12px;
  border: 1px solid var(--border-color, #334155);
}

.guide-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 0;
  border-bottom: 1px solid var(--border-color, #334155);
}
.guide-item:last-child { border-bottom: none; }

.guide-left { display: flex; align-items: center; gap: 8px; flex: 1; }

.guide-icon { font-size: 16px; }

.guide-title { font-size: 14px; color: #FFFFFF; }

.guide-arrow { font-size: 14px; color: var(--text-muted, #64748B); }

/* 服务列表 */
.service-list {
  background-color: var(--bg-card, #1E293B);
  border-radius: 10px;
  padding: 4px 12px;
  border: 1px solid var(--border-color, #334155);
}

.service-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 0;
  border-bottom: 1px solid var(--border-color, #334155);
}
.service-item:last-child { border-bottom: none; }

.service-name { font-size: 14px; color: #FFFFFF; }

.service-arrow { font-size: 14px; color: var(--text-muted, #64748B); }

/* CTA按钮 */
.cta-section { margin: 20px 0; }

.cta-button {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
  border-radius: 10px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

/* 底部安全区域 */
.bottom-safe-area { height: 20px; }
</style>
