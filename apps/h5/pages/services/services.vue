<template>
  <view class="container">
    <!-- 状态栏占位 -->
    <view class="status-bar safe-area-top"></view>

    <!-- 页面标题 -->
    <view class="header">
      <text class="header-title">服务中心</text>
      <text class="header-subtitle">一站式政府服务平台</text>
    </view>

    <!-- 服务分类 -->
    <view class="category-tabs flex-row mt-20">
      <view
        class="tab-item"
        :class="{ active: currentTab === index }"
        v-for="(tab, index) in categories"
        :key="index"
        @click="currentTab = index"
      >
        <text class="tab-text font-26" :class="currentTab === index ? 'text-accent' : 'text-secondary'">{{ tab }}</text>
      </view>
    </view>

    <!-- 服务列表 -->
    <view class="service-list mt-20">
      <view class="service-card bg-card p-30" v-for="(service, index) in services" :key="index">
        <view class="flex-row gap-20">
          <view class="service-icon">
            <text class="icon-text">{{ service.icon }}</text>
          </view>
          <view class="flex-1 flex-col">
            <view class="flex-row" style="justify-content: space-between;">
              <text class="service-name font-28 font-bold text-primary">{{ service.name }}</text>
              <text class="service-status font-24" :class="service.online ? 'text-cyan' : 'text-secondary'">
                {{ service.online ? '● 在线' : '○ 离线' }}
              </text>
            </view>
            <text class="service-desc font-24 text-secondary mt-10">{{ service.desc }}</text>
            <view class="service-tags flex-row mt-10 gap-15">
              <text class="tag font-20 text-secondary" v-for="(tag, i) in service.tags" :key="i">{{ tag }}</text>
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

const currentTab = ref(0)
const categories = ref(['全部', '政务服务', '金融服务', '企业服务', '公共服务'])

const services = ref([
  { icon: '🏛️', name: '营业执照办理', desc: '在线申请、审核、领取营业执照', online: true, tags: ['热门', '快速'] },
  { icon: '📄', name: '税务申报', desc: '月度/季度税务申报与缴纳', online: true, tags: ['常用'] },
  { icon: '💳', name: '银行开户', desc: '企业银行账户在线预约开通', online: true, tags: ['推荐'] },
  { icon: '📊', name: '统计报表', desc: '企业经营数据统计与上报', online: false, tags: [] },
  { icon: '⚖️', name: '法律咨询', desc: '专业法律顾问在线咨询服务', online: true, tags: ['VIP'] },
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

.category-tabs {
  overflow-x: auto;
  white-space: nowrap;
  gap: 30rpx;
  padding-bottom: 10rpx;
}

.tab-item {
  position: relative;
  padding-bottom: 10rpx;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background-color: #F59E0B;
  border-radius: 2rpx;
}

.service-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.service-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  background-color: rgba(245, 158, 11, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-text {
  font-size: 36rpx;
}

.service-name {
  line-height: 1.4;
}

.service-desc {
  line-height: 1.4;
}

.service-tags {
  flex-wrap: wrap;
}

.tag {
  background-color: #334155;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}
</style>
