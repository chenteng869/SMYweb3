<template>
  <scroll-view scroll-y class="page-container" :style="{ height: windowHeight + 'px' }">
    <!-- 顶部用户信息卡片 -->
    <view class="user-card">
      <view class="avatar-wrapper">
        <view class="avatar">
          <text class="avatar-text">陈</text>
        </view>
      </view>
      <view class="user-info">
        <text class="username">陈董</text>
        <text class="email">chendong@taichu.com</text>
        <view class="tags-row">
          <view class="level-tag">
            <text class="level-text">青铜 LV.6</text>
          </view>
          <text class="company-count">3 家公司</text>
        </view>
      </view>
    </view>

    <!-- 资产双卡片横排 -->
    <view class="assets-row">
      <view class="asset-card">
        <text class="asset-label">DVC 余额</text>
        <text class="asset-value dvc">DVC12,580</text>
      </view>
      <view class="asset-card">
        <text class="asset-label">USDT 余额</text>
        <text class="asset-value usdt">¥45,600.50</text>
      </view>
    </view>

    <!-- DLC升级进度 -->
    <view class="dlc-progress-section">
      <view class="progress-header">
        <text class="progress-title">DLC 升级进度</text>
        <text class="progress-value">{{ dvcBalance }} / {{ upgradeTarget }} DVC</text>
      </view>
      <view class="progress-bar-bg">
        <view
          class="progress-bar-fill"
          :style="{ width: progressPercent + '%' }"
        ></view>
      </view>
    </view>

    <!-- 资产管理区块 -->
    <view class="section">
      <text class="section-title">资产管理</text>
      <view class="menu-list">
        <view
          v-for="(item, index) in assetMenuItems"
          :key="index"
          class="menu-item"
          @click="handleMenuClick(item)"
        >
          <view class="menu-left">
            <text class="menu-icon">{{ item.icon }}</text>
            <text class="menu-text">{{ item.title }}</text>
          </view>
          <view class="menu-right">
            <text v-if="item.value" class="menu-value">{{ item.value }}</text>
            <text class="menu-arrow">></text>
          </view>
        </view>
      </view>
    </view>

    <!-- 服务中心区块 -->
    <view class="section">
      <text class="section-title">服务中心</text>
      <view class="menu-list">
        <view
          v-for="(item, index) in serviceMenuItems"
          :key="index"
          class="menu-item"
          @click="handleMenuClick(item)"
        >
          <view class="menu-left">
            <view class="icon-circle" :class="item.iconBgClass">
              <text class="circle-icon">{{ item.icon }}</text>
            </view>
            <text class="menu-text">{{ item.title }}</text>
          </view>
          <view class="menu-right">
            <text v-if="item.value" class="menu-value">{{ item.value }}</text>
            <view v-if="item.badge" class="badge-wrapper">
              <text class="badge">{{ item.badge }}</text>
            </view>
            <text class="menu-arrow">></text>
          </view>
        </view>
      </view>
    </view>

    <!-- 设置与帮助区块 -->
    <view class="section">
      <text class="section-title">设置与帮助</text>
      <view class="menu-list">
        <view
          v-for="(item, index) in settingsMenuItems"
          :key="index"
          class="menu-item"
          :class="{ 'logout-item': item.isLogout }"
          @click="handleMenuClick(item)"
        >
          <view class="menu-left">
            <view v-if="item.iconBgClass" class="icon-circle" :class="item.iconBgClass">
              <text class="circle-icon">{{ item.icon }}</text>
            </view>
            <text v-else class="menu-icon">{{ item.icon }}</text>
            <text class="menu-text" :class="{ 'logout-text': item.isLogout }">{{ item.title }}</text>
          </view>
          <view class="menu-right">
            <text class="menu-arrow">></text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部版本信息 -->
    <view class="version-info">
      <text class="version-text">WOPC创业家 v1.0.0 · WOPC移动科技</text>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// 获取窗口高度
const sysInfo = uni.getSystemInfoSync()
const windowHeight = ref(sysInfo.windowHeight)

// Mock 数据
const userInfo = ref({
  name: '陈董',
  email: 'chendong@taichu.com',
  avatarText: '陈',
  level: '青铜 LV.6',
  companyCount: 3
})

const dvcBalance = ref(12580)
const usdtBalance = ref(45600.50)
const upgradeTarget = ref(999)

// 计算进度百分比（限制最大100%）
const progressPercent = computed(() => {
  const percent = (dvcBalance.value / upgradeTarget.value) * 100
  return Math.min(percent, 100)
})

// 资产管理菜单项
const assetMenuItems = ref([
  {
    icon: '🏆',
    title: 'DLC 等级',
    value: 'LV.6',
    path: '/pages/dlc/level'
  },
  {
    icon: '⭐',
    title: 'DVC 积分',
    value: '12,580',
    path: '/pages/dvc/points'
  },
  {
    icon: '💰',
    title: '我的钱包',
    value: '',
    path: '/pages/wallet/index'
  }
])

// 服务中心菜单项
const serviceMenuItems = ref([
  {
    icon: '🆔',
    title: 'DID 身份',
    value: '已认证',
    iconBgClass: 'bg-amber',
    path: '/pages/did/card'
  },
  {
    icon: '🪪',
    title: 'AI 电子名片',
    value: '已生成',
    iconBgClass: 'bg-cyan',
    path: '/pages/card/ai'
  },
  {
    icon: '🏢',
    title: '我的公司',
    value: '3 家',
    iconBgClass: 'bg-blue',
    path: '/pages/company/list'
  },
  {
    icon: '📄',
    title: '文档中心',
    value: '',
    iconBgClass: 'bg-green',
    path: '/pages/document/center'
  },
  {
    icon: '🔔',
    title: '消息通知',
    value: '',
    badge: '3',
    iconBgClass: 'bg-red',
    path: '/pages/notification/list'
  }
])

// 设置与帮助菜单项
const settingsMenuItems = ref([
  {
    icon: '⚙️',
    title: '系统设置',
    isLogout: false,
    path: '/pages/settings/system'
  },
  {
    icon: '❓',
    title: '帮助中心',
    isLogout: false,
    path: '/pages/help/center'
  },
  {
    icon: '🚪',
    title: '退出登录',
    isLogout: true,
    iconBgClass: 'bg-red',
    path: ''
  }
])

// 菜单点击处理
const handleMenuClick = (item: any) => {
  if (item.isLogout) {
    uni.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 执行退出登录逻辑
          console.log('退出登录')
          // 可以跳转到登录页
          // uni.reLaunch({ url: '/pages/login/index' })
        }
      }
    })
  } else if (item.path) {
    uni.navigateTo({
      url: item.path,
      fail: () => {
        uni.showToast({
          title: '页面开发中',
          icon: 'none'
        })
      }
    })
  }
}
</script>

<style scoped>
.page-container {
  background-color: #0F172A;
}

/* 顶部用户信息卡片 */
.user-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 40rpx 30rpx;
  background-color: #0F172A;
}

.avatar-wrapper {
  margin-right: 24rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  color: #FFFFFF;
  font-size: 48rpx;
  font-weight: bold;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.username {
  color: #FFFFFF;
  font-size: 40rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.email {
  color: #94A3B8;
  font-size: 24rpx;
  margin-bottom: 12rpx;
}

.tags-row {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.level-tag {
  background-color: rgba(245, 158, 11, 0.2);
  border-radius: 8rpx;
  padding: 4rpx 16rpx;
  margin-right: 16rpx;
}

.level-text {
  color: #F59E0B;
  font-size: 22rpx;
  font-weight: 500;
}

.company-count {
  color: #94A3B8;
  font-size: 24rpx;
}

/* 资产双卡片横排 */
.assets-row {
  display: flex;
  flex-direction: row;
  padding: 0 30rpx;
  gap: 20rpx;
  margin-top: 20rpx;
}

.asset-card {
  flex: 1;
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
}

.asset-label {
  color: #94A3B8;
  font-size: 24rpx;
  margin-bottom: 12rpx;
}

.asset-value {
  font-size: 36rpx;
  font-weight: bold;
}

.asset-value.dvc {
  color: #F59E0B;
}

.asset-value.usdt {
  color: #FFFFFF;
}

/* DLC升级进度 */
.dlc-progress-section {
  margin: 30rpx 30rpx 20rpx;
  padding: 24rpx;
  background-color: #1E293B;
  border-radius: 16rpx;
}

.progress-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.progress-title {
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: bold;
}

.progress-value {
  color: #F59E0B;
  font-size: 26rpx;
  font-weight: 500;
}

.progress-bar-bg {
  width: 100%;
  height: 12rpx;
  background-color: #334155;
  border-radius: 999rpx;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #F59E0B 0%, #D97706 100%);
  border-radius: 999rpx;
  transition: width 0.3s ease;
}

/* 区块通用样式 */
.section {
  margin-top: 40rpx;
}

.section-title {
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: bold;
  margin-left: 30rpx;
  margin-bottom: 20rpx;
  display: block;
}

.menu-list {
  padding: 0 30rpx;
}

.menu-item {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.menu-item:last-child {
  margin-bottom: 0;
}

.menu-left {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.menu-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
}

.menu-text {
  color: #FFFFFF;
  font-size: 28rpx;
}

.logout-text {
  color: #EF4444;
}

.menu-right {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.menu-value {
  color: #94A3B8;
  font-size: 26rpx;
  margin-right: 12rpx;
}

.menu-arrow {
  color: #64748B;
  font-size: 28rpx;
}

/* 图标圆形背景 */
.icon-circle {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.circle-icon {
  font-size: 28rpx;
}

.bg-amber {
  background-color: rgba(245, 158, 11, 0.2);
}

.bg-cyan {
  background-color: rgba(0, 212, 255, 0.2);
}

.bg-blue {
  background-color: rgba(59, 130, 246, 0.2);
}

.bg-green {
  background-color: rgba(34, 197, 94, 0.2);
}

.bg-red {
  background-color: rgba(239, 68, 68, 0.2);
}

/* 徽章样式 */
.badge-wrapper {
  margin-right: 12rpx;
}

.badge {
  background-color: #EF4444;
  color: #FFFFFF;
  font-size: 20rpx;
  font-weight: bold;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  min-width: 32rpx;
  text-align: center;
}

/* 退出登录特殊样式 */
.logout-item {
  background-color: transparent;
  border: 2rpx solid #334155;
}

/* 底部版本信息 */
.version-info {
  text-align: center;
  padding: 60rpx 0 40rpx;
}

.version-text {
  color: #475569;
  font-size: 22rpx;
}
</style>
