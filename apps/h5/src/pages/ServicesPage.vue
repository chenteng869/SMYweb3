<script setup lang="ts">
import { ref } from 'vue'

// 服务列表数据
interface ServiceItem {
  icon: string
  iconBg: string
  title: string
  desc: string
  tags: string[]
}

const serviceList = ref<ServiceItem[]>([
  {
    icon: '📋',
    iconBg: 'rgba(245, 158, 11, 0.2)',
    title: '公司注册',
    desc: '萨摩亚SPV、香港、新加坡、BVI等全球公司注册',
    tags: ['7-10天快速注册', '全套文件代办', '银行开户协助']
  },
  {
    icon: '💳',
    iconBg: 'rgba(0, 212, 255, 0.2)',
    title: '全球收款',
    desc: 'Visa、USDT、本地支付，覆盖全球150+国家',
    tags: ['多通道聚合', '实时结算', '汇率优化']
  },
  {
    icon: '🏛️',
    iconBg: 'rgba(59, 130, 246, 0.2)',
    title: '银行开户',
    desc: '汇丰、星展、华侨等全球主流银行',
    tags: ['远程开户', '多币种账户', '网银配置']
  },
  {
    icon: '🛡️',
    iconBg: 'rgba(168, 85, 247, 0.2)',
    title: '法务合规',
    desc: '合同审查、合规咨询、风险评估',
    tags: ['AI合同审查', '全球合规库', '实时预警']
  },
  {
    icon: '🧾',
    iconBg: 'rgba(236, 72, 153, 0.2)',
    title: '税务计算',
    desc: '全球20+国家税率对比与优化方案',
    tags: ['4方案对比', '实时税率', '节税建议']
  },
  {
    icon: '🌐',
    iconBg: 'rgba(34, 197, 94, 0.2)',
    title: '自媒体中心',
    desc: 'AI内容创作、多平台发布、数据分析',
    tags: ['AI创作', '一键分发', '数据追踪']
  }
])

// 支付方式数据
interface PaymentMethod {
  icon: string
  name: string
}

const paymentMethods = ref<PaymentMethod[]>([
  { icon: '💳', name: 'Visa' },
  { icon: '₿', name: 'USDT' },
  { icon: '🛵', name: 'GrabPay' },
  { icon: '📱', name: 'Pix' },
  { icon: '💰', name: 'Alipay' },
  { icon: '💳', name: 'Mastercard' },
  { icon: '🏦', name: '电汇' },
  { icon: '💚', name: '微信支付' }
])
</script>

<template>
  <div class="services-page">
    <!-- 顶部标题区 -->
    <div class="header">
      <div class="header-title">
        <span class="header-icon">🧳</span>
        <span class="header-text">一站式服务</span>
      </div>
      <div class="header-subtitle">从公司注册到全球收款，从法务合规到AI赋能</div>
    </div>

    <!-- 统计条 -->
    <div class="stats-bar">
      <div class="stat-item stat-amber">
        <span>⚡</span><span>8 收款通道</span>
      </div>
      <div class="stat-item stat-cyan">
        <span>🌐</span><span>150+ 覆盖国家</span>
      </div>
    </div>

    <!-- 6大服务卡片 -->
    <div class="services-list">
      <div v-for="(item, index) in serviceList" :key="index" class="service-card">
        <div class="card-left">
          <div class="card-icon" :style="{ background: item.iconBg }">
            <span>{{ item.icon }}</span>
          </div>
          <div class="card-info">
            <div class="card-title">{{ item.title }}</div>
            <div class="card-desc">{{ item.desc }}</div>
            <div class="card-tags">
              <span v-for="(tag, tagIndex) in item.tags" :key="tagIndex" class="tag">{{ tag }}</span>
            </div>
          </div>
        </div>
        <span class="card-arrow">></span>
      </div>
    </div>

    <!-- 全球支付通道区 -->
    <div class="payment-section">
      <div class="section-title">全球支付通道</div>
      <div class="payment-grid">
        <div v-for="(payment, index) in paymentMethods" :key="index" class="payment-card">
          <span class="payment-icon">{{ payment.icon }}</span>
          <span class="payment-name">{{ payment.name }}</span>
        </div>
      </div>
    </div>

    <!-- 底部大按钮 -->
    <div class="bottom-btn-wrapper">
      <button class="bottom-btn">💬 免费咨询出海方案</button>
    </div>
  </div>
</template>

<style scoped>
.services-page {
  min-height: 100%;
  padding: 16px;
  background-color: var(--bg-primary, #0F172A);
  color: var(--text-primary, #FFF);
}

/* 顶部标题区 */
.header { margin-bottom: 16px; }

.header-title {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.header-icon { font-size: 24px; margin-right: 8px; }

.header-text {
  color: #FFFFFF;
  font-size: 18px;
  font-weight: bold;
}

.header-subtitle {
  color: var(--text-secondary, #94A3B8);
  font-size: 12px;
  margin-left: 32px;
}

/* 统计条 */
.stats-bar {
  display: flex;
  justify-content: space-between;
  background-color: var(--bg-card, #1E293B);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  gap: 5px;
}

.stat-amber { color: var(--accent, #F59E0B); }

.stat-cyan { color: var(--cyan, #00D4FF); }

/* 服务卡片列表 */
.services-list { margin-bottom: 20px; }

.service-card {
  background-color: var(--bg-card, #1E293B);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-left {
  display: flex;
  align-items: flex-start;
  flex: 1;
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-right: 12px;
  flex-shrink: 0;
}

.card-info { flex: 1; }

.card-title {
  color: #FFFFFF;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 6px;
}

.card-desc {
  color: var(--text-secondary, #94A3B8);
  font-size: 12px;
  margin-bottom: 8px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  background-color: rgba(245, 158, 11, 0.15);
  color: var(--accent, #F59E0B);
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
}

.card-arrow {
  color: var(--text-muted, #64748B);
  font-size: 16px;
  margin-left: 10px;
  flex-shrink: 0;
}

/* 全球支付通道区 */
.payment-section { margin-bottom: 20px; }

.section-title {
  color: #FFFFFF;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
}

.payment-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.payment-card {
  background-color: var(--bg-card, #1E293B);
  border-radius: 8px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.payment-icon { font-size: 22px; margin-bottom: 6px; }

.payment-name {
  color: #FFFFFF;
  font-size: 11px;
  text-align: center;
}

/* 底部大按钮 */
.bottom-btn-wrapper { padding: 10px 0 20px; }

.bottom-btn {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
  border-radius: 24px;
  border: none;
  font-size: 16px;
  font-weight: bold;
  color: #FFFFFF;
  cursor: pointer;
}
</style>
