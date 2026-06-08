<script setup lang="ts">
import { ref, computed } from 'vue'

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
  { icon: '🏆', title: 'DLC 等级', value: 'LV.6', path: '/dlc/level' },
  { icon: '⭐', title: 'DVC 积分', value: '12,580', path: '/dvc/points' },
  { icon: '💰', title: '我的钱包', value: '', path: '/wallet/index' }
])

// 服务中心菜单项
const serviceMenuItems = ref([
  { icon: '🆔', title: 'DID 身份', value: '已认证', iconBgClass: 'bg-amber', path: '/did/card' },
  { icon: '🪪', title: 'AI 电子名片', value: '已生成', iconBgClass: 'bg-cyan', path: '/card/ai' },
  { icon: '🏢', title: '我的公司', value: '3 家', iconBgClass: 'bg-blue', path: '/company/list' },
  { icon: '📄', title: '文档中心', value: '', iconBgClass: 'bg-green', path: '/document/center' },
  { icon: '🔔', title: '消息通知', value: '', badge: '3', iconBgClass: 'bg-red', path: '/notification/list' }
])

// 设置与帮助菜单项
const settingsMenuItems = ref([
  { icon: '⚙️', title: '系统设置', isLogout: false, path: '/settings/system' },
  { icon: '❓', title: '帮助中心', isLogout: false, path: '/help/center' },
  { icon: '🚪', title: '退出登录', isLogout: true, iconBgClass: 'bg-red', path: '' }
])

// 菜单点击处理
function handleMenuClick(item: any) {
  if (item.isLogout) {
    // Web端使用 confirm 替代 uni.showModal
    if (confirm('确定要退出登录吗？')) {
      console.log('退出登录')
    }
  } else if (item.path) {
    console.log('导航至:', item.path)
  }
}
</script>

<template>
  <div class="profile-page">
    <!-- 顶部用户信息卡片 -->
    <div class="user-card">
      <div class="avatar-wrapper">
        <div class="avatar">
          <span class="avatar-text">{{ userInfo.avatarText }}</span>
        </div>
      </div>
      <div class="user-info">
        <div class="username">{{ userInfo.name }}</div>
        <div class="email">{{ userInfo.email }}</div>
        <div class="tags-row">
          <span class="level-tag"><span class="level-text">{{ userInfo.level }}</span></span>
          <span class="company-count">{{ userInfo.companyCount }} 家公司</span>
        </div>
      </div>
    </div>

    <!-- 资产双卡片横排 -->
    <div class="assets-row">
      <div class="asset-card">
        <span class="asset-label">DVC 余额</span>
        <span class="asset-value dvc">DVC12,580</span>
      </div>
      <div class="asset-card">
        <span class="asset-label">USDT 余额</span>
        <span class="asset-value usdt">¥45,600.50</span>
      </div>
    </div>

    <!-- DLC升级进度 -->
    <div class="dlc-progress-section">
      <div class="progress-header">
        <span class="progress-title">DLC 升级进度</span>
        <span class="progress-value">{{ dvcBalance }} / {{ upgradeTarget }} DVC</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>

    <!-- 资产管理区块 -->
    <div class="section">
      <div class="section-title">资产管理</div>
      <div class="menu-list">
        <div v-for="(item, index) in assetMenuItems" :key="index" class="menu-item" @click="handleMenuClick(item)">
          <div class="menu-left">
            <span class="menu-icon">{{ item.icon }}</span>
            <span class="menu-text">{{ item.title }}</span>
          </div>
          <div class="menu-right">
            <span v-if="item.value" class="menu-value">{{ item.value }}</span>
            <span class="menu-arrow">></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 服务中心区块 -->
    <div class="section">
      <div class="section-title">服务中心</div>
      <div class="menu-list">
        <div v-for="(item, index) in serviceMenuItems" :key="index" class="menu-item" @click="handleMenuClick(item)">
          <div class="menu-left">
            <div v-if="item.iconBgClass" :class="['icon-circle', item.iconBgClass]">
              <span class="circle-icon">{{ item.icon }}</span>
            </div>
            <span v-else class="menu-icon">{{ item.icon }}</span>
            <span class="menu-text">{{ item.title }}</span>
          </div>
          <div class="menu-right">
            <span v-if="item.value" class="menu-value">{{ item.value }}</span>
            <div v-if="item.badge" class="badge-wrapper">
              <span class="badge">{{ item.badge }}</span>
            </div>
            <span class="menu-arrow">></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 设置与帮助区块 -->
    <div class="section">
      <div class="section-title">设置与帮助</div>
      <div class="menu-list">
        <div
          v-for="(item, index) in settingsMenuItems"
          :key="index"
          :class="['menu-item', { 'logout-item': item.isLogout }]"
          @click="handleMenuClick(item)"
        >
          <div class="menu-left">
            <div v-if="item.iconBgClass" :class="['icon-circle', item.iconBgClass]">
              <span class="circle-icon">{{ item.icon }}</span>
            </div>
            <span v-else class="menu-icon">{{ item.icon }}</span>
            <span :class="['menu-text', { 'logout-text': item.isLogout }]">{{ item.title }}</span>
          </div>
          <div class="menu-right">
            <span class="menu-arrow">></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部版本信息 -->
    <div class="version-info">
      <span class="version-text">WOPC创业家 v1.0.0 · WOPC移动科技</span>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100%;
  padding: 16px;
  background-color: var(--bg-primary, #0F172A);
  color: var(--text-primary, #FFF);
}

/* 顶部用户信息卡片 */
.user-card {
  display: flex;
  align-items: center;
  padding: 20px 16px;
}

.avatar-wrapper { margin-right: 12px; }

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  color: #FFFFFF;
  font-size: 24px;
  font-weight: bold;
}

.user-info { flex: 1; display: flex; flex-direction: column; }

.username {
  color: #FFFFFF;
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 4px;
}

.email { color: var(--text-secondary, #94A3B8); font-size: 12px; margin-bottom: 6px; }

.tags-row { display: flex; align-items: center; }

.level-tag {
  background-color: rgba(245, 158, 11, 0.2);
  border-radius: 4px;
  padding: 2px 8px;
  margin-right: 8px;
}

.level-text { color: var(--accent, #F59E0B); font-size: 11px; font-weight: 500; }

.company-count { color: var(--text-secondary, #94A3B8); font-size: 12px; }

/* 资产双卡片横排 */
.assets-row {
  display: flex;
  padding: 0 0;
  gap: 10px;
  margin-top: 10px;
}

.asset-card {
  flex: 1;
  background-color: var(--bg-card, #1E293B);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.asset-label { color: var(--text-secondary, #94A3B8); font-size: 12px; margin-bottom: 6px; }

.asset-value { font-size: 18px; font-weight: bold; }

.asset-value.dvc { color: var(--accent, #F59E0B); }

.asset-value.usdt { color: #FFFFFF; }

/* DLC升级进度 */
.dlc-progress-section {
  margin: 16px 0 10px;
  padding: 12px;
  background-color: var(--bg-card, #1E293B);
  border-radius: 10px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-title { color: #FFFFFF; font-size: 14px; font-weight: bold; }

.progress-value { color: var(--accent, #F59E0B); font-size: 13px; font-weight: 500; }

.progress-bar-bg {
  width: 100%;
  height: 6px;
  background-color: #334155;
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #F59E0B 0%, #D97706 100%);
  border-radius: 999px;
  transition: width 0.3s ease;
}

/* 区块通用样式 */
.section { margin-top: 20px; }

.section-title {
  color: #FFFFFF;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 10px;
}

.menu-list { /* no extra padding, items handle it */ }

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--bg-card, #1E293B);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
}
.menu-item:last-child { margin-bottom: 0; }

.menu-left { display: flex; align-items: center; }

.menu-icon { font-size: 18px; margin-right: 10px; }

.menu-text { color: #FFFFFF; font-size: 14px; }

.logout-text { color: #EF4444; }

.menu-right { display: flex; align-items: center; }

.menu-value { color: var(--text-secondary, #94A3B8); font-size: 13px; margin-right: 6px; }

.menu-arrow { color: var(--text-muted, #64748B); font-size: 14px; }

/* 图标圆形背景 */
.icon-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
}

.circle-icon { font-size: 14px; }

.bg-amber { background-color: rgba(245, 158, 11, 0.2); }

.bg-cyan { background-color: rgba(0, 212, 255, 0.2); }

.bg-blue { background-color: rgba(59, 130, 246, 0.2); }

.bg-green { background-color: rgba(34, 197, 94, 0.2); }

.bg-red { background-color: rgba(239, 68, 68, 0.2); }

/* 徽章样式 */
.badge-wrapper { margin-right: 6px; }

.badge {
  background-color: #EF4444;
  color: #FFFFFF;
  font-size: 10px;
  font-weight: bold;
  padding: 1px 6px;
  border-radius: 999px;
  min-width: 16px;
  text-align: center;
}

/* 退出登录特殊样式 */
.logout-item {
  background-color: transparent;
  border: 1px solid #334155;
}

/* 底部版本信息 */
.version-info { text-align: center; padding: 30px 0 20px; }

.version-text { color: #475569; font-size: 11px; }
</style>
