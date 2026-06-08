<template>
  <view class="container">
    <!-- 状态栏占位 -->
    <view class="status-bar safe-area-top"></view>

    <!-- 页面标题 -->
    <view class="header">
      <text class="header-title">发现</text>
      <text class="header-subtitle">探索更多精彩内容</text>
    </view>

    <!-- 搜索框 -->
    <view class="search-box bg-card flex-row px-30 py-20">
      <text class="search-icon">🔍</text>
      <input class="search-input" placeholder="搜索服务、政策、资讯..." placeholder-class="search-placeholder" />
    </view>

    <!-- 轮播/Banner区域 -->
    <view class="banner-section mt-20">
      <swiper class="banner-swiper" :indicator-dots="true" :autoplay="true" :interval="3000" :duration="500" indicator-color="#334155" indicator-active-color="#F59E0B">
        <swiper-item v-for="(item, index) in banners" :key="index">
          <view class="banner-item bg-card flex-col p-30">
            <text class="banner-title font-32 font-bold text-primary">{{ item.title }}</text>
            <text class="banner-desc font-24 text-secondary mt-10">{{ item.desc }}</text>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <!-- 热门推荐 -->
    <view class="section mt-30">
      <view class="flex-row" style="justify-content: space-between;">
        <text class="section-title font-32 font-bold text-primary">热门推荐</text>
        <text class="font-24 text-accent">查看更多 ›</text>
      </view>
      <view class="card-list mt-20">
        <view class="card-item bg-card p-30" v-for="(item, index) in recommendList" :key="index">
          <view class="flex-row gap-20">
            <view class="card-tag">
              <text class="tag-text font-20">{{ item.tag }}</text>
            </view>
            <view class="flex-1 flex-col">
              <text class="card-title font-28 font-bold text-primary">{{ item.title }}</text>
              <text class="card-desc font-24 text-secondary mt-10">{{ item.desc }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部安全区 -->
    <view class="safe-area-bottom mb-20"></view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const banners = ref([
  { title: '萨摩亚数字政府计划', desc: '全面推动数字化转型，打造智慧国家' },
  { title: '创业扶持新政发布', desc: '多项优惠政策助力企业发展' },
])

const recommendList = ref([
  { tag: '政策', title: '2026年税收优惠政策解读', desc: '最新税收减免措施详情' },
  { tag: '服务', title: '企业注册一站式服务', desc: '在线完成企业设立全流程' },
  { tag: '资讯', title: '萨摩亚经济发展报告', desc: 'Q1季度经济数据分析' },
])
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 0 30rpx;
}

.status-bar {
  height: var(--status-bar-height, 44px);
}

.header {
  padding: 30rpx 0;
}

.header-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #FFFFFF;
}

.header-subtitle {
  font-size: 24rpx;
  color: #94A3B8;
  margin-top: 8rpx;
}

.search-box {
  border-radius: 24rpx;
  margin-top: 20rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 26rpx;
  color: #FFFFFF;
}

.search-placeholder {
  color: #64748B;
}

.banner-swiper {
  height: 240rpx;
  border-radius: 24rpx;
  overflow: hidden;
}

.banner-item {
  height: 100%;
  justify-content: center;
}

.banner-desc {
  line-height: 1.4;
}

.section {
  padding-bottom: 10rpx;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.card-tag {
  background-color: rgba(245, 158, 11, 0.15);
  border-radius: 8rpx;
  padding: 8rpx 16rpx;
  align-self: flex-start;
}

.tag-text {
  color: #F59E0B;
}

.card-title {
  line-height: 1.4;
}

.card-desc {
  line-height: 1.4;
}
</style>
