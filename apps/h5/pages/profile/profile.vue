<template>
  <view class="container">
    <!-- 状态栏占位 -->
    <view class="status-bar safe-area-top"></view>

    <!-- 用户信息头部 -->
    <view class="profile-header">
      <view class="profile-info flex-row gap-25">
        <view class="avatar-large">
          <text class="avatar-text font-40 font-bold">W</text>
        </view>
        <view class="flex-col flex-1">
          <view class="flex-row gap-15">
            <text class="username font-36 font-bold text-primary">WOPC 用户</text>
            <view class="vip-tag">
              <text class="vip-text font-20">VIP</text>
            </view>
          </view>
          <text class="user-id font-24 text-secondary mt-10">ID: SMY20260608001</text>
          <text class="user-org font-24 text-cyan mt-6">萨摩亚 SPV 政府机构</text>
        </view>
      </view>
    </view>

    <!-- 数据统计卡片 -->
    <view class="stats-card bg-card p-30 mt-30">
      <view class="stats-grid">
        <view class="stat-item flex-col text-center" v-for="(item, index) in statsData" :key="index">
          <text class="stat-num font-bold" :class="item.colorClass">{{ item.value }}</text>
          <text class="stat-label font-22 text-secondary mt-8">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- 功能菜单列表 -->
    <view class="menu-section mt-30">
      <view class="menu-group bg-card">
        <view class="menu-item flex-row px-30 py-25" v-for="(menu, index) in menuList" :key="index" @click="handleMenu(menu)">
          <text class="menu-icon">{{ menu.icon }}</text>
          <text class="menu-name font-28 text-primary flex-1">{{ menu.name }}</text>
          <view class="menu-extra" v-if="menu.badge">
            <text class="badge-num font-20 text-white">{{ menu.badge }}</text>
          </view>
          <text class="menu-arrow text-secondary">›</text>
        </view>
        <view class="menu-divider" v-for="(_, idx) in menuList.length - 1" :key="'d' + idx"></view>
      </view>
    </view>

    <!-- 设置选项 -->
    <view class="settings-section mt-20">
      <view class="menu-group bg-card">
        <view class="menu-item flex-row px-30 py-25" v-for="(item, index) in settingsList" :key="index">
          <text class="menu-icon">{{ item.icon }}</text>
          <text class="menu-name font-28 text-primary flex-1">{{ item.name }}</text>
          <text class="menu-arrow text-secondary">›</text>
        </view>
        <view class="menu-divider" v-for="(_, idx) in settingsList.length - 1" :key="'sd' + idx"></view>
      </view>
    </view>

    <!-- 版本信息 -->
    <view class="version-info mt-40 text-center">
      <text class="font-24 text-secondary">WOPC 创业家 v1.0.0</text>
      <text class="font-20 text-secondary block mt-10">Powered by WOPC Technology</text>
    </view>

    <!-- 底部安全区 -->
    <view class="safe-area-bottom mb-20"></view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const statsData = ref([
  { value: '23', label: '待办事项', colorClass: 'text-accent' },
  { value: '156', label: '已完成', colorClass: 'text-green' },
  { value: '8', label: '收藏服务', colorClass: 'text-cyan' },
  { value: '99+', label: '积分', colorClass: 'text-primary' },
])

const menuList = ref([
  { icon: '📋', name: '我的待办', badge: '5', path: '/pages/todo/todo' },
  { icon: '✅', name: '已办事项', badge: '', path: '/pages/done/done' },
  { icon: '⭐', name: '我的收藏', badge: '', path: '/pages/favorite/favorite' },
  { icon: '📜', name: '办理记录', badge: '', path: '/pages/history/history' },
  { icon: '💬', name: '意见反馈', badge: '', path: '/pages/feedback/feedback' },
])

const settingsList = ref([
  { icon: '🔔', name: '消息通知', path: '' },
  { icon: '🔒', name: '账号安全', path: '' },
  { icon: '🌙', name: '深色模式', path: '' },
  { icon: 'ℹ️', name: '关于我们', path: '' },
])

function handleMenu(menu: { name: string; path: string }) {
  console.log('点击菜单:', menu.name)
  uni.showToast({ title: `${menu.name} 开发中`, icon: 'none' })
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 0 30rpx;
}

.status-bar {
  height: var(--status-bar-height, 44px);
}

.profile-header {
  padding: 30rpx 0;
}

.avatar-large {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #F59E0B, #D97706);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  color: #FFFFFF;
}

.username {
  line-height: 1.3;
}

.vip-tag {
  background: linear-gradient(135deg, #F59E0B, #D97706);
  border-radius: 6rpx;
  padding: 4rpx 12rpx;
  align-self: flex-start;
}

.vip-text {
  color: #FFFFFF;
  font-weight: bold;
}

.stats-card {
  border-radius: 24rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.stat-num {
  font-size: 40rpx;
}

.stat-label {
  line-height: 1.3;
}

.menu-section, .settings-section {
  padding-bottom: 10rpx;
}

.menu-group {
  border-radius: 24rpx;
  overflow: hidden;
}

.menu-item {
  position: relative;
  align-items: center;
}

.menu-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
}

.menu-name {
  line-height: 1.4;
}

.menu-extra {
  background-color: #EF4444;
  border-radius: 20rpx;
  padding: 2rpx 14rpx;
  margin-right: 12rpx;
}

.badge-num {
  color: #FFFFFF;
}

.menu-arrow {
  font-size: 32rpx;
  font-weight: bold;
}

.menu-divider {
  height: 1px;
  background-color: #334155;
  margin-left: 86rpx;
}

.version-info {
  padding-bottom: 20rpx;
}

.block {
  display: block;
}
</style>
