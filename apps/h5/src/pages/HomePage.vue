<script setup lang="ts">
import { ref } from 'vue'

// 用户信息
const userInfo = ref({
  name: '陈董',
  title: 'WOPC创业家 · 萨摩亚SPV × 海购星Dapp',
  verified: true
})

// 数据卡片
const statCards = ref([
  { value: '$45,800', label: '今日收入' },
  { value: '3', label: '活跃公司' },
  { value: '5', label: '待办事项' }
])

// 快捷入口
const quickEntries = ref([
  { icon: '🤖', label: 'AI注册', bg: 'rgba(245,158,11,0.15)' },
  { icon: '🪪', label: 'AI电子名片', bg: 'rgba(0,212,255,0.15)' },
  { icon: '👆', label: 'DID身份', bg: 'rgba(167,139,250,0.15)' },
  { icon: '⚖️', label: '法务中台', bg: 'rgba(99,102,241,0.15)' },
  { icon: '🌐', label: '全球收款', bg: 'rgba(244,114,182,0.15)' },
  { icon: '🛒', label: '海购星Dapp', bg: 'rgba(245,158,11,0.15)' },
  { icon: '💬', label: '客服大脑', bg: 'rgba(20,184,166,0.15)' },
  { icon: '🧮', label: '税务计算', bg: 'rgba(16,185,129,0.15)' }
])

// AI智能推荐
const aiRecommendations = ref([
  {
    title: '萨摩亚SPV年审提醒',
    desc: 'WOPC国际（萨摩亚）有限公司年度申报将于30天后到期...',
    author: '注册专员',
    date: '2024年12月19日',
    dotColor: '#EF4444'
  },
  {
    title: '税务优化建议',
    desc: '根据Q4财务数据分析，您可通过合理规划节省约$8,500税费...',
    author: '智财管家',
    date: '2024年12月17日',
    dotColor: '#EF4444'
  },
  {
    title: '合同审查完成',
    desc: '与汇丰银行的账户管理协议已审查完毕，建议关注第7条...',
    author: '法务精灵',
    date: '2024年12月15日',
    dotColor: '#F59E0B'
  }
])

// 实时汇率
const exchangeRates = ref([
  { pair: 'USD/CNY', rate: '7.2456', change: '+0.12%', isUp: true },
  { pair: 'USD/EUR', rate: '0.9234', change: '-0.08%', isUp: false },
  { pair: 'USD/SGD', rate: '1.3456', change: '+0.03%', isUp: true },
  { pair: 'USD/HKD', rate: '7.7890', change: '+0.01%', isUp: true }
])

// AI智能体在线
const aiAgents = ref([
  { name: '智财管家', avatar: '智', bg: 'rgba(0,212,255,0.2)', color: '#00D4FF' },
  { name: '法务精灵', avatar: '法', bg: 'rgba(59,130,246,0.2)', color: '#3B82F6' },
  { name: '出海助手', avatar: '出', bg: 'rgba(245,158,11,0.2)', color: '#F59E0B' },
  { name: '营销大师', avatar: '营', bg: 'rgba(244,114,182,0.2)', color: '#EC4899' },
  { name: '注册专员', avatar: '注', bg: 'rgba(167,139,250,0.2)', color: '#A78BFA' }
])

// 最近交易
const recentTransactions = ref([
  { merchant: 'Amazon US', type: '销售收入结算', amount: '+$12,500.00', method: 'Visa', isIncome: true },
  { merchant: 'Binance', type: 'OTC兑换', amount: '+₮5,000.00', method: 'USDT', isIncome: true },
  { merchant: 'Shopee SG', type: '平台结算', amount: '+S$3,200.00', method: 'GrabPay', isIncome: true },
  { merchant: 'Mercado Livre', type: '销售回款', amount: '+BRL8,500.00', method: 'Pix', isIncome: true },
  { merchant: '供应商A', type: '货款支付', amount: '-$25,000.00', method: '电汇', isIncome: false }
])
</script>

<template>
  <div class="home-page">
    <!-- 顶部欢迎区域 -->
    <div class="header-section">
      <div class="welcome-row">
        <span class="welcome-text">欢迎回来</span>
        <span class="verified-badge">✓ 已认证</span>
      </div>
      <div class="user-name">{{ userInfo.name }}</div>
      <div class="user-title">{{ userInfo.title }}</div>
    </div>

    <!-- 三数据卡片 -->
    <div class="stat-cards">
      <div v-for="(card, index) in statCards" :key="index" class="stat-card">
        <div class="stat-value">{{ card.value }}</div>
        <div class="stat-label">{{ card.label }}</div>
      </div>
    </div>

    <!-- 快捷入口网格 -->
    <div class="quick-grid">
      <div v-for="(entry, index) in quickEntries" :key="index" class="quick-entry">
        <div class="quick-icon" :style="{ background: entry.bg }">
          {{ entry.icon }}
        </div>
        <span class="quick-label">{{ entry.label }}</span>
      </div>
    </div>

    <!-- AI智能推荐区 -->
    <div class="ai-recommend-section">
      <div class="section-header">
        <span class="section-title">🤖 AI智能推荐</span>
        <span class="view-all">查看全部 →</span>
      </div>
      <div class="recommend-list">
        <div v-for="(item, index) in aiRecommendations" :key="index" class="recommend-card">
          <div class="dot-indicator" :style="{ background: item.dotColor }"></div>
          <div class="recommend-content">
            <div class="recommend-title">{{ item.title }}</div>
            <div class="recommend-desc">{{ item.desc }}</div>
            <div class="recommend-meta">{{ item.author }} · {{ item.date }}</div>
          </div>
          <span class="arrow-icon">→</span>
        </div>
      </div>
    </div>

    <!-- 实时汇率区 -->
    <div class="exchange-section">
      <div class="section-title">🌐 实时汇率</div>
      <div class="exchange-list">
        <div v-for="(rate, index) in exchangeRates" :key="index" class="exchange-item">
          <span class="exchange-pair">{{ rate.pair }}</span>
          <span class="exchange-rate">{{ rate.rate }}</span>
          <span class="exchange-change" :class="{ up: rate.isUp, down: !rate.isUp }">{{ rate.change }}</span>
        </div>
      </div>
    </div>

    <!-- AI智能体在线 -->
    <div class="agents-section">
      <div class="section-header">
        <span class="section-title">🧠 AI 智能体在线</span>
        <span class="online-count">8/10 在线</span>
      </div>
      <div class="agents-list">
        <div v-for="(agent, index) in aiAgents" :key="index" class="agent-item">
          <div class="agent-avatar" :style="{ background: agent.bg, color: agent.color }">
            {{ agent.avatar }}
          </div>
          <span class="agent-name">{{ agent.name }}</span>
        </div>
      </div>
    </div>

    <!-- 最近交易 -->
    <div class="transactions-section">
      <div class="section-header">
        <span class="section-title">💰 最近交易</span>
        <span class="view-all">查看全部 →</span>
      </div>
      <div class="transaction-list">
        <div v-for="(tx, index) in recentTransactions" :key="index" class="transaction-item">
          <div class="tx-info">
            <div class="tx-merchant">{{ tx.merchant }}</div>
            <div class="tx-type">{{ tx.type }}</div>
          </div>
          <div class="tx-right">
            <div class="tx-amount" :class="{ income: tx.isIncome, expense: !tx.isIncome }">{{ tx.amount }}</div>
            <span class="tx-method">{{ tx.method }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100%;
  padding: 20px 16px;
  background-color: var(--bg-primary, #0F172A);
  color: var(--text-primary, #FFF);
}

/* 顶部区域 */
.header-section {
  padding-top: 20px;
}

.welcome-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-text {
  font-size: 13px;
  color: var(--text-secondary, #94A3B8);
}

.verified-badge {
  background-color: #065F46;
  color: #34D399;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 11px;
}

.user-name {
  margin-top: 8px;
  font-size: 32px;
  font-weight: bold;
  color: var(--text-primary, #FFF);
}

.user-title {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-secondary, #94A3B8);
}

/* 数据卡片 */
.stat-cards {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.stat-card {
  flex: 1;
  background-color: var(--bg-card, #1E293B);
  border-radius: 12px;
  padding: 14px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary, #FFF);
}

.stat-label {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-secondary, #94A3B8);
}

/* 快捷入口 */
.quick-grid {
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.quick-entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.quick-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.quick-label {
  font-size: 12px;
  color: var(--text-primary, #FFF);
}

/* 区块标题 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 17px;
  font-weight: bold;
  color: var(--text-primary, #FFF);
}

.view-all {
  font-size: 13px;
  color: var(--accent, #F59E0B);
  cursor: pointer;
}

/* AI推荐 */
.ai-recommend-section {
  margin-top: 28px;
}

.recommend-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recommend-card {
  background-color: var(--bg-card, #1E293B);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.dot-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.recommend-content {
  flex: 1;
}

.recommend-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #FFF);
}

.recommend-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary, #94A3B8);
}

.recommend-meta {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-muted, #64748B);
}

.arrow-icon {
  font-size: 18px;
  color: var(--text-muted, #64748B);
}

/* 汇率 */
.exchange-section {
  margin-top: 28px;
}

.exchange-section .section-title {
  margin-bottom: 16px;
}

.exchange-list {
  background-color: var(--bg-card, #1E293B);
  border-radius: 12px;
  padding: 16px;
}

.exchange-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}

.exchange-item:last-child {
  border-bottom: none;
}

.exchange-pair {
  font-size: 14px;
  color: var(--text-secondary, #94A3B8);
}

.exchange-rate {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #FFF);
}

.exchange-change {
  font-size: 12px;
}

.exchange-change.up {
  color: #10B981;
}

.exchange-change.down {
  color: #EF4444;
}

/* AI智能体 */
.agents-section {
  margin-top: 28px;
}

.agents-list {
  display: flex;
  gap: 16px;
  justify-content: flex-start;
  margin-top: 16px;
}

.agent-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.agent-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
}

.agent-name {
  text-align: center;
  font-size: 10px;
  color: var(--text-secondary, #94A3B8);
  margin-top: 4px;
}

.online-count {
  font-size: 13px;
  color: var(--cyan, #00D4FF);
}

/* 交易列表 */
.transactions-section {
  margin-top: 28px;
}

.transaction-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.transaction-item {
  background-color: var(--bg-card, #1E293B);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tx-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tx-merchant {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #FFF);
}

.tx-type {
  font-size: 12px;
  color: var(--text-secondary, #94A3B8);
}

.tx-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.tx-amount {
  font-size: 14px;
  font-weight: bold;
}

.tx-amount.income {
  color: #10B981;
}

.tx-amount.expense {
  color: #EF4444;
}

.tx-method {
  font-size: 11px;
  color: var(--text-muted, #64748B);
  background-color: rgba(100, 116, 139, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
