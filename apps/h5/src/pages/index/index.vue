<template>
  <scroll-view scroll-y class="page-container" :style="{height: windowHeight + 'px'}">
    <view class="container">
      <!-- 顶部用户信息区 -->
      <view class="user-info-section">
        <view class="welcome-row">
          <text class="welcome-text">欢迎回来</text>
          <view class="verified-badge">
            <text class="verified-text">✓ 已认证</text>
          </view>
        </view>
        <text class="username">陈董</text>
        <text class="subtitle">WOPC创业家 · 萨摩亚SPV × 海购星Dapp</text>
      </view>

      <!-- 三数据卡片横排 -->
      <view class="data-cards">
        <view class="data-card">
          <text class="data-value">${{ todayIncome.toLocaleString() }}</text>
          <text class="data-label">今日收入</text>
        </view>
        <view class="data-card">
          <text class="data-value">{{ activeCompanies }}</text>
          <text class="data-label">活跃公司</text>
        </view>
        <view class="data-card">
          <text class="data-value">{{ pendingTasks }}</text>
          <text class="data-label">待办事项</text>
        </view>
      </view>

      <!-- 快捷入口网格 -->
      <view class="quick-entry-grid">
        <view v-for="(item, index) in quickEntries" :key="index" class="quick-entry-item">
          <view :class="['entry-icon', item.bgClass]">
            <text class="icon-emoji">{{ item.icon }}</text>
          </view>
          <text class="entry-label">{{ item.label }}</text>
        </view>
      </view>

      <!-- AI智能推荐区 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">🤖</text>
            <text class="title-text">AI智能推荐</text>
          </view>
          <text class="view-all">查看全部 →</text>
        </view>
        <view class="recommend-list">
          <view v-for="(item, index) in aiRecommendations" :key="index" class="recommend-card">
            <view :class="['dot-indicator', item.dotColor]"></view>
            <view class="recommend-content">
              <text class="recommend-title">{{ item.title }}</text>
              <text class="recommend-desc">{{ item.description }}</text>
              <text class="recommend-meta">{{ item.source }} · {{ item.date }}</text>
            </view>
            <text class="arrow">→</text>
          </view>
        </view>
      </view>

      <!-- 实时汇率区 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">🌐</text>
            <text class="title-text">实时汇率</text>
          </view>
        </view>
        <view class="exchange-rate-list">
          <view v-for="(rate, index) in exchangeRates" :key="index" class="rate-item">
            <text class="rate-pair">{{ rate.pair }}</text>
            <text class="rate-value">{{ rate.value }}</text>
            <text :class="['rate-change', rate.change >= 0 ? 'positive' : 'negative']">
              {{ rate.change >= 0 ? '+' : '' }}{{ rate.change.toFixed(2) }}%
            </text>
          </view>
        </view>
      </view>

      <!-- AI智能体在线 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">🧠</text>
            <text class="title-text">AI 智能体在线</text>
          </view>
          <text class="online-count">{{ onlineAgents }}/{{ totalAgents }} 在线</text>
        </view>
        <view class="agents-list">
          <view v-for="(agent, index) in aiAgents" :key="index" class="agent-item">
            <view :class="['agent-avatar', agent.colorClass]">
              <text class="avatar-initial">{{ agent.name.charAt(0) }}</text>
            </view>
            <text class="agent-name">{{ agent.name }}</text>
          </view>
        </view>
      </view>

      <!-- 最近交易 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">💰</text>
            <text class="title-text">最近交易</text>
          </view>
          <text class="view-all">查看全部 →</text>
        </view>
        <view class="transaction-list">
          <view v-for="(tx, index) in recentTransactions" :key="index" class="transaction-item">
            <view class="tx-left">
              <view class="tx-icon-wrapper">
                <text class="tx-icon">{{ tx.platformIcon }}</text>
              </view>
              <view class="tx-info">
                <text class="tx-platform">{{ tx.platform }}</text>
                <text class="tx-type">{{ tx.type }}</text>
              </view>
            </view>
            <view class="tx-right">
              <text :class="['tx-amount', tx.amount > 0 ? 'positive' : 'negative']">
                {{ tx.amount > 0 ? '+' : '' }}${{ Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </text>
              <text class="tx-method">{{ tx.method }}</text>
            </view>
          </view>
        </view>
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

// 用户数据
const todayIncome = ref(45800)
const activeCompanies = ref(3)
const pendingTasks = ref(5)

// 快捷入口数据
const quickEntries = ref([
  { icon: '🤖', label: 'AI注册', bgClass: 'bg-amber' },
  { icon: '🪪', label: 'AI电子名片', bgClass: 'bg-cyan' },
  { icon: '👆', label: 'DID身份', bgClass: 'bg-purple' },
  { icon: '⚖️', label: '法务中台', bgClass: 'bg-indigo' },
  { icon: '🌐', label: '全球收款', bgClass: 'bg-pink' },
  { icon: '🛒', label: '海购星Dapp', bgClass: 'bg-orange' },
  { icon: '💬', label: '客服大脑', bgClass: 'bg-teal' },
  { icon: '🧮', label: '税务计算', bgClass: 'bg-emerald' }
])

// AI推荐数据
const aiRecommendations = ref([
  {
    title: '萨摩亚SPV年审提醒',
    description: '您的萨摩亚SPV公司即将到期，请及时完成年度审查',
    source: '注册专员',
    date: '2024年12月19日',
    dotColor: 'red'
  },
  {
    title: '税务优化建议',
    description: '根据最新政策，建议调整税务结构以优化税负',
    source: '智财管家',
    date: '2024年12月17日',
    dotColor: 'red'
  },
  {
    title: '合同审查完成',
    description: '供应商合同已通过AI审查，未发现重大风险条款',
    source: '法务精灵',
    date: '2024年12月15日',
    dotColor: 'orange'
  }
])

// 汇率数据
const exchangeRates = ref([
  { pair: 'USD/CNY', value: '7.2456', change: 0.12 },
  { pair: 'USD/EUR', value: '0.9234', change: -0.08 },
  { pair: 'USD/SGD', value: '1.3456', change: 0.03 },
  { pair: 'USD/HKD', value: '7.7890', change: 0.01 }
])

// AI智能体数据
const onlineAgents = ref(8)
const totalAgents = ref(10)
const aiAgents = ref([
  { name: '智财管家', colorClass: 'cyan' },
  { name: '法务精灵', colorClass: 'blue' },
  { name: '出海助手', colorClass: 'orange' },
  { name: '营销大师', colorClass: 'pink' },
  { name: '注册专员', colorClass: 'purple' }
])

// 最近交易数据
const recentTransactions = ref([
  { platform: 'Amazon US', type: '销售收入结算', amount: 12500.00, method: 'Visa', platformIcon: '🛒' },
  { platform: 'Binance', type: 'OTC兑换', amount: 5000.00, method: 'USDT', platformIcon: '💱' },
  { platform: 'Shopee SG', type: '平台结算', amount: 3200.00, method: 'GrabPay', platformIcon: '🛍️' },
  { platform: 'Mercado Livre', type: '销售回款', amount: 8500.00, method: 'Pix', platformIcon: '📦' },
  { platform: '供应商A', type: '货款支付', amount: -25000.00, method: '电汇', platformIcon: '🏭' }
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

/* 用户信息区 */
.user-info-section {
  margin-bottom: 40rpx;
}

.welcome-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.welcome-text {
  font-size: 26rpx;
  color: #94A3B8;
}

.verified-badge {
  background-color: #065F46;
  border-radius: 999rpx;
  padding: 6rpx 16rpx;
}

.verified-text {
  font-size: 22rpx;
  color: #34D399;
  font-weight: 500;
}

.username {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #FFFFFF;
  margin-bottom: 12rpx;
}

.subtitle {
  font-size: 24rpx;
  color: #94A3B8;
}

/* 数据卡片 */
.data-cards {
  display: flex;
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.data-card {
  flex: 1;
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 28rpx 20rpx;
  border: 1px solid #334155;
  text-align: center;
}

.data-value {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #FFFFFF;
  margin-bottom: 8rpx;
}

.data-label {
  font-size: 22rpx;
  color: #94A3B8;
}

/* 快捷入口网格 */
.quick-entry-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32rpx 16rpx;
  margin-bottom: 40rpx;
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 36rpx 20rpx;
  border: 1px solid #334155;
}

.quick-entry-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.entry-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.entry-icon.bg-amber { background-color: rgba(245, 158, 11, 0.2); }
.entry-icon.bg-cyan { background-color: rgba(0, 212, 255, 0.2); }
.entry-icon.bg-purple { background-color: rgba(168, 85, 247, 0.2); }
.entry-icon.bg-indigo { background-color: rgba(99, 102, 241, 0.2); }
.entry-icon.bg-pink { background-color: rgba(236, 72, 153, 0.2); }
.entry-icon.bg-orange { background-color: rgba(249, 115, 22, 0.2); }
.entry-icon.bg-teal { background-color: rgba(20, 184, 166, 0.2); }
.entry-icon.bg-emerald { background-color: rgba(16, 185, 129, 0.2); }

.icon-emoji {
  font-size: 40rpx;
}

.entry-label {
  font-size: 22rpx;
  color: #FFFFFF;
  text-align: center;
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

.online-count {
  font-size: 26rpx;
  color: #00D4FF;
}

/* AI推荐列表 */
.recommend-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.recommend-card {
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 24rpx;
  border: 1px solid #334155;
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.dot-indicator {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-top: 10rpx;
  flex-shrink: 0;
}

.dot-indicator.red { background-color: #EF4444; }
.dot-indicator.orange { background-color: #F59E0B; }

.recommend-content {
  flex: 1;
}

.recommend-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 8rpx;
}

.recommend-desc {
  display: block;
  font-size: 24rpx;
  color: #94A3B8;
  margin-bottom: 8rpx;
  line-height: 1.5;
}

.recommend-meta {
  font-size: 22rpx;
  color: #64748B;
}

.arrow {
  font-size: 28rpx;
  color: #64748B;
  margin-top: 4rpx;
}

/* 汇率列表 */
.exchange-rate-list {
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
  border: 1px solid #334155;
}

.rate-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1px solid #334155;
}

.rate-item:last-child {
  border-bottom: none;
}

.rate-pair {
  font-size: 28rpx;
  font-weight: 500;
  color: #FFFFFF;
  flex: 1;
}

.rate-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #FFFFFF;
  margin-right: 24rpx;
}

.rate-change {
  font-size: 24rpx;
  font-weight: 500;
  min-width: 120rpx;
  text-align: right;
}

.rate-change.positive { color: #10B981; }
.rate-change.negative { color: #EF4444; }

/* AI智能体列表 */
.agents-list {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.agent-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}

.agent-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.agent-avatar.cyan { background-color: rgba(0, 212, 255, 0.2); }
.agent-avatar.blue { background-color: rgba(59, 130, 246, 0.2); }
.agent-avatar.orange { background-color: rgba(249, 115, 22, 0.2); }
.agent-avatar.pink { background-color: rgba(236, 72, 153, 0.2); }
.agent-avatar.purple { background-color: rgba(168, 85, 247, 0.2); }

.avatar-initial {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.agent-name {
  font-size: 22rpx;
  color: #94A3B8;
  text-align: center;
}

/* 交易列表 */
.transaction-list {
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
  border: 1px solid #334155;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1px solid #334155;
}

.transaction-item:last-child {
  border-bottom: none;
}

.tx-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
}

.tx-icon-wrapper {
  width: 72rpx;
  height: 72rpx;
  border-radius: 12rpx;
  background-color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tx-icon {
  font-size: 32rpx;
}

.tx-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.tx-platform {
  font-size: 28rpx;
  font-weight: 500;
  color: #FFFFFF;
}

.tx-type {
  font-size: 22rpx;
  color: #94A3B8;
}

.tx-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
}

.tx-amount {
  font-size: 28rpx;
  font-weight: 600;
}

.tx-amount.positive { color: #10B981; }
.tx-amount.negative { color: #EF4444; }

.tx-method {
  font-size: 22rpx;
  color: #64748B;
}

/* 底部安全区域 */
.bottom-safe-area {
  height: 40rpx;
}
</style>
