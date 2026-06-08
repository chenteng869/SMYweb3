<template>
  <scroll-view scroll-y class="page-container" :style="{height: windowHeight + 'px'}">
    <view class="container">
      <!-- 顶部搜索栏 -->
      <view class="search-section">
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input class="search-input" type="text" placeholder="搜索 无限可能" placeholder-class="search-placeholder" />
        </view>
        <text class="explore-text">🔥 探索无界可能</text>
      </view>

      <!-- 搜索推荐标签 -->
      <scroll-view scroll-x class="tag-scroll" :show-scrollbar="false">
        <view class="tag-list">
          <view v-for="(tag, index) in searchTags" :key="index" class="tag-item">
            <text class="tag-text">{{ tag }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 视频中心 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">📺</text>
            <text class="title-text">视频中心</text>
          </view>
          <text class="view-all">查看全部 →</text>
        </view>

        <!-- Tabs -->
        <scroll-view scroll-x class="video-tabs" :show-scrollbar="false">
          <view class="tabs-list">
            <view
              v-for="(tab, index) in videoTabs"
              :key="index"
              :class="['tab-item', { active: currentVideoTab === index }]"
              @click="currentVideoTab = index"
            >
              <text :class="['tab-text', { active: currentVideoTab === index }]">{{ tab }}</text>
            </view>
          </view>
        </scroll-view>

        <!-- 视频网格 -->
        <view class="video-grid">
          <view v-for="(video, index) in videoList" :key="index" class="video-card">
            <view class="video-thumbnail">
              <view class="play-button">▶️</view>
              <view class="duration-badge">
                <text class="duration-text">{{ video.duration }}</text>
              </view>
            </view>
            <text class="video-title">{{ video.title }}</text>
            <view class="video-meta">
              <text class="view-count">👁 {{ video.views }}观看</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 直播中心 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon live-icon">🔴</text>
            <text class="title-text">直播中心</text>
            <view class="live-dot"></view>
            <text class="live-text">LIVE</text>
          </view>
          <text class="view-all">全部直播 →</text>
        </view>

        <view class="live-grid">
          <view v-for="(live, index) in liveList" :key="index" class="live-card">
            <view class="live-thumbnail">
              <view class="live-status-badge">
                <text class="live-status-text">{{ live.status }}</text>
              </view>
            </view>
            <view class="live-info">
              <text class="live-title">{{ live.title }}</text>
              <view class="live-meta">
                <text v-if="live.viewers" class="live-viewers">👁 {{ live.viewers }}人</text>
                <text v-if="live.statusText" class="live-status-tag">{{ live.statusText }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 音频节目 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">🎙️</text>
            <text class="title-text">音频节目</text>
          </view>
        </view>

        <view class="audio-list">
          <view v-for="(audio, index) in audioList" :key="index" class="audio-item">
            <view class="audio-info">
              <text class="audio-title">{{ audio.title }}</text>
              <text class="audio-source">{{ audio.source }}</text>
              <view class="audio-meta-row">
                <text class="audio-duration">⏱ {{ audio.duration }}</text>
                <text class="audio-plays">▶️ {{ audio.plays }}次</text>
              </view>
            </view>
            <view class="play-btn">
              <text class="play-icon">▶️</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 自媒体文章 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">📝</text>
            <text class="title-text">自媒体文章</text>
          </view>
        </view>

        <view class="article-list">
          <view v-for="(article, index) in articleList" :key="index" class="article-item">
            <view class="article-content">
              <text class="article-title">{{ article.title }}</text>
              <view class="article-meta">
                <text class="article-tag">{{ article.tag }}</text>
                <text class="article-time">{{ article.time }}</text>
              </view>
            </view>
            <text class="article-arrow">→</text>
          </view>
        </view>
      </view>

      <!-- 自媒体中心统计卡 -->
      <view class="media-center-card">
        <view class="media-center-header">
          <view class="media-center-title">
            <text class="title-icon">📊</text>
            <text class="title-text">自媒体中心</text>
          </view>
          <text class="enter-text">进入 →</text>
        </view>
        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-value">12.8万</text>
            <text class="stat-label">粉丝</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value">245篇</text>
            <text class="stat-label">内容</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value positive">+12.5%</text>
            <text class="stat-label">增长</text>
          </view>
        </view>
      </view>

      <!-- 全球商务目的地 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">🌍</text>
            <text class="title-text">全球商务目的地</text>
          </view>
        </view>
        <view class="destination-grid">
          <view v-for="(dest, index) in destinations" :key="index" class="destination-card">
            <text class="dest-flag">{{ dest.flag }}</text>
            <text class="dest-name">{{ dest.name }}</text>
            <text class="dest-desc">{{ dest.desc }}</text>
          </view>
        </view>
      </view>

      <!-- DAO社区 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">🏛️</text>
            <text class="title-text">DAO社区</text>
          </view>
        </view>
        <view class="dao-list">
          <view v-for="(dao, index) in daoList" :key="index" class="dao-item">
            <view :class="['rank-badge', dao.rank <= 3 ? 'top-rank' : '']">
              <text class="rank-number">{{ dao.rank }}</text>
            </view>
            <view class="dao-info">
              <text class="dao-name">{{ dao.name }}</text>
              <text class="dao-members">{{ dao.members }} 成员</text>
            </view>
            <text class="dao-arrow">→</text>
          </view>
        </view>
      </view>

      <!-- 萨摩亚深度指南 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">📖</text>
            <text class="title-text">萨摩亚深度指南</text>
          </view>
        </view>
        <view class="guide-list">
          <view v-for="(guide, index) in guideList" :key="index" class="guide-item">
            <view class="guide-left">
              <text class="guide-icon">{{ guide.icon }}</text>
              <text class="guide-title">{{ guide.title }}</text>
            </view>
            <text class="guide-arrow">→</text>
          </view>
        </view>
      </view>

      <!-- 生态服务 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">⚡</text>
            <text class="title-text">生态服务</text>
          </view>
        </view>
        <view class="service-list">
          <view v-for="(service, index) in serviceList" :key="index" class="service-item">
            <text class="service-name">{{ service }}</text>
            <text class="service-arrow">→</text>
          </view>
        </view>
      </view>

      <!-- 底部CTA按钮 -->
      <view class="cta-section">
        <button class="cta-button">🚀 立即注册萨摩亚公司</button>
      </view>

      <!-- 底部安全区域占位 -->
      <view class="bottom-safe-area"></view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 窗口高度
const windowHeight = ref(0)

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  windowHeight.value = systemInfo.windowHeight
})

// 搜索标签
const searchTags = ref([
  '萨摩亚',
  '全球合规',
  '区块链',
  '税务优化',
  'AI助手',
  '海外开户',
  '更多 →'
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
  {
    title: '萨摩亚SPV注册直播答疑解惑',
    status: 'LIVE',
    viewers: '1.2K',
    statusText: '正在进行'
  },
  {
    title: '2025全球税务优化策略',
    status: 'LIVE',
    statusText: '即将开始'
  }
])

// 音频列表
const audioList = ref([
  {
    title: 'AI技术揭秘与实战分享',
    source: 'WOPC商学院',
    duration: '32:00',
    plays: '890'
  },
  {
    title: '跨境电商东南亚市场分析',
    source: '财经观察',
    duration: '45:00',
    plays: '1.2K'
  }
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
  { flag: '🇺🇸', name: '美国', desc: ' Delaware 公司' }
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
  'AI智能注册服务',
  '全球合规咨询',
  '税务优化方案',
  '法务合同审查',
  '品牌营销推广',
  '技术支持服务'
])
</script>

<style scoped>
.page-container {
  background-color: #0F172A;
}

.container {
  padding: 32rpx;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

/* 搜索区域 */
.search-section {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 28rpx;
}

.search-box {
  flex: 1;
  background-color: #1E293B;
  border-radius: 999rpx;
  padding: 20rpx 28rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  border: 1px solid #334155;
}

.search-icon {
  font-size: 28rpx;
}

.search-input {
  flex: 1;
  font-size: 26rpx;
  color: #FFFFFF;
}

.search-placeholder {
  color: #64748B;
}

.explore-text {
  font-size: 24rpx;
  color: #F59E0B;
  white-space: nowrap;
}

/* 标签横向滚动 */
.tag-scroll {
  margin-bottom: 36rpx;
  white-space: nowrap;
}

.tag-list {
  display: inline-flex;
  gap: 16rpx;
}

.tag-item {
  display: inline-block;
  background-color: #1E293B;
  border-radius: 999rpx;
  padding: 14rpx 28rpx;
  border: 1px solid #334155;
}

.tag-text {
  font-size: 24rpx;
  color: #94A3B8;
}

/* 通用区块样式 */
.section {
  margin-bottom: 40rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.live-icon {
  position: relative;
}

.live-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: #EF4444;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.live-text {
  font-size: 22rpx;
  color: #EF4444;
  font-weight: 600;
}

.title-icon {
  font-size: 32rpx;
}

.title-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.view-all {
  font-size: 26rpx;
  color: #F59E0B;
}

/* 视频Tabs */
.video-tabs {
  margin-bottom: 24rpx;
  white-space: nowrap;
}

.tabs-list {
  display: inline-flex;
  gap: 32rpx;
}

.tab-item {
  padding-bottom: 12rpx;
}

.tab-text {
  font-size: 26rpx;
  color: #94A3B8;
}

.tab-text.active {
  color: #F59E0B;
  font-weight: 600;
}

.tab-item.active {
  border-bottom: 3rpx solid #F59E0B;
}

/* 视频网格 */
.video-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.video-card {
  background-color: #1E293B;
  border-radius: 16rpx;
  overflow: hidden;
  border: 1px solid #334155;
}

.video-thumbnail {
  width: 100%;
  height: 220rpx;
  background-color: #334155;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-button {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}

.duration-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 8rpx;
  padding: 4rpx 12rpx;
}

.duration-text {
  font-size: 20rpx;
  color: #FFFFFF;
}

.video-title {
  display: block;
  padding: 16rpx 16rpx 8rpx;
  font-size: 26rpx;
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
  padding: 0 16rpx 16rpx;
}

.view-count {
  font-size: 22rpx;
  color: #64748B;
}

/* 直播中心 */
.live-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.live-card {
  background-color: #1E293B;
  border-radius: 16rpx;
  overflow: hidden;
  border: 1px solid #334155;
}

.live-thumbnail {
  width: 100%;
  height: 200rpx;
  background: linear-gradient(135deg, #1E293B 0%, #334155 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.live-status-badge {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  background-color: #EF4444;
  border-radius: 8rpx;
  padding: 6rpx 14rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.live-status-text {
  font-size: 20rpx;
  color: #FFFFFF;
  font-weight: 600;
}

.live-info {
  padding: 16rpx;
}

.live-title {
  display: block;
  font-size: 26rpx;
  color: #FFFFFF;
  font-weight: 500;
  margin-bottom: 10rpx;
  line-height: 1.4;
}

.live-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.live-viewers,
.live-status-tag {
  font-size: 22rpx;
  color: #94A3B8;
}

/* 音频节目 */
.audio-list {
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
  border: 1px solid #334155;
}

.audio-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1px solid #334155;
}

.audio-item:last-child {
  border-bottom: none;
}

.audio-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.audio-title {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 500;
}

.audio-source {
  font-size: 24rpx;
  color: #94A3B8;
}

.audio-meta-row {
  display: flex;
  gap: 20rpx;
}

.audio-duration,
.audio-plays {
  font-size: 22rpx;
  color: #64748B;
}

.play-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background-color: #F59E0B;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 20rpx;
}

.play-icon {
  font-size: 24rpx;
}

/* 文章列表 */
.article-list {
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
  border: 1px solid #334155;
}

.article-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1px solid #334155;
}

.article-item:last-child {
  border-bottom: none;
}

.article-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.article-title {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 500;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.article-tag {
  font-size: 22rpx;
  color: #F59E0B;
  background-color: rgba(245, 158, 11, 0.15);
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.article-time {
  font-size: 22rpx;
  color: #64748B;
}

.article-arrow {
  font-size: 28rpx;
  color: #64748B;
  margin-left: 20rpx;
}

/* 自媒体中心统计卡 */
.media-center-card {
  background: linear-gradient(135deg, #1E293B 0%, #334155 100%);
  border-radius: 16rpx;
  padding: 28rpx;
  border: 1px solid #334155;
  margin-bottom: 40rpx;
}

.media-center-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.enter-text {
  font-size: 26rpx;
  color: #F59E0B;
}

.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #FFFFFF;
  margin-bottom: 6rpx;
}

.stat-value.positive {
  color: #10B981;
}

.stat-label {
  font-size: 22rpx;
  color: #94A3B8;
}

.stat-divider {
  width: 1px;
  height: 60rpx;
  background-color: #334155;
}

/* 目的地网格 */
.destination-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.destination-card {
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 24rpx;
  border: 1px solid #334155;
  text-align: center;
}

.dest-flag {
  font-size: 48rpx;
  display: block;
  margin-bottom: 12rpx;
}

.dest-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 6rpx;
}

.dest-desc {
  font-size: 22rpx;
  color: #94A3B8;
}

/* DAO社区列表 */
.dao-list {
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
  border: 1px solid #334155;
}

.dao-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1px solid #334155;
}

.dao-item:last-child {
  border-bottom: none;
}

.rank-badge {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background-color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.rank-badge.top-rank {
  background-color: #F59E0B;
}

.rank-number {
  font-size: 24rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.dao-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.dao-name {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 500;
}

.dao-members {
  font-size: 22rpx;
  color: #94A3B8;
}

.dao-arrow {
  font-size: 28rpx;
  color: #64748B;
  margin-left: 16rpx;
}

/* 指南列表 */
.guide-list {
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
  border: 1px solid #334155;
}

.guide-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22rpx 0;
  border-bottom: 1px solid #334155;
}

.guide-item:last-child {
  border-bottom: none;
}

.guide-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}

.guide-icon {
  font-size: 32rpx;
}

.guide-title {
  font-size: 28rpx;
  color: #FFFFFF;
}

.guide-arrow {
  font-size: 28rpx;
  color: #64748B;
}

/* 服务列表 */
.service-list {
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
  border: 1px solid #334155;
}

.service-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22rpx 0;
  border-bottom: 1px solid #334155;
}

.service-item:last-child {
  border-bottom: none;
}

.service-name {
  font-size: 28rpx;
  color: #FFFFFF;
}

.service-arrow {
  font-size: 28rpx;
  color: #64748B;
}

/* CTA按钮 */
.cta-section {
  margin: 40rpx 0;
}

.cta-button {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
  border-radius: 16rpx;
  border: none;
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(245, 158, 11, 0.3);
}

.cta-button::after {
  border: none;
}

/* 底部安全区域 */
.bottom-safe-area {
  height: 40rpx;
}
</style>
