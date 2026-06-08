<template>
  <view class="container">
    <!-- 状态栏占位 -->
    <view class="status-bar safe-area-top"></view>

    <!-- 顶部标题栏 -->
    <view class="header">
      <text class="header-title">WOPC 创业家</text>
      <text class="header-subtitle">萨摩亚国家级数字化服务平台</text>
    </view>

    <!-- 欢迎卡片 -->
    <view class="welcome-card bg-card p-30">
      <view class="flex-row gap-20">
        <view class="avatar">
          <text class="avatar-text">W</text>
        </view>
        <view class="flex-col flex-1">
          <text class="font-32 font-bold text-primary">欢迎回来</text>
          <text class="font-24 text-secondary mt-10">探索萨摩亚数字化未来</text>
        </view>
      </view>
    </view>

    <!-- 快捷功能入口 -->
    <view class="section mt-20">
      <text class="section-title font-28 font-bold text-primary">快捷服务</text>
      <view class="grid mt-20">
        <view class="grid-item bg-card" v-for="(item, index) in quickServices" :key="index">
          <text class="grid-icon">{{ item.icon }}</text>
          <text class="grid-text font-24 text-secondary">{{ item.name }}</text>
        </view>
      </view>
    </view>

    <!-- 数据概览 -->
    <view class="section mt-20">
      <text class="section-title font-28 font-bold text-primary">数据概览</text>
      <view class="stats-row mt-20">
        <view class="stat-card bg-card p-30 flex-col text-center" v-for="(stat, index) in stats" :key="index">
          <text class="stat-value font-bold text-accent">{{ stat.value }}</text>
          <text class="stat-label font-24 text-secondary mt-10">{{ stat.label }}</text>
        </view>
      </view>
    </view>

    <!-- 底部安全区 -->
    <view class="safe-area-bottom mb-20"></view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const quickServices = ref([
  { icon: '📋', name: '政务办理' },
  { icon: '📊', name: '数据看板' },
  { icon: '🔐', name: '身份认证' },
  { icon: '💰', name: '金融服务' },
])

const stats = ref([
  { value: '128', label: '待办事项' },
  { value: '56', label: '已完成' },
  { value: '12', label: '新消息' },
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

.welcome-card {
  margin-top: 20rpx;
}

.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #F59E0B, #D97706);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #FFFFFF;
}

.section {
  padding-bottom: 10rpx;
}

.section-title {
  display: block;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}

.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30rpx 16rpx;
  border-radius: 24rpx;
}

.grid-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
}

.grid-text {
  text-align: center;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.stat-card {
  border-radius: 24rpx;
}

.stat-value {
  font-size: 48rpx;
  color: #F59E0B;
}

.stat-label {
  font-size: 24rpx;
}
</style>
