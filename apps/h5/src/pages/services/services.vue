<template>
  <scroll-view scroll-y class="page-container" :style="{ height: windowHeight + 'px' }">
    <!-- 顶部标题区 -->
    <view class="header">
      <view class="header-title">
        <text class="header-icon">🧳</text>
        <text class="header-text">一站式服务</text>
      </view>
      <view class="header-subtitle">从公司注册到全球收款，从法务合规到AI赋能</view>
    </view>

    <!-- 统计条 -->
    <view class="stats-bar">
      <view class="stat-item stat-amber">
        <text>⚡</text>
        <text>8 收款通道</text>
      </view>
      <view class="stat-item stat-cyan">
        <text>🌐</text>
        <text>150+ 覆盖国家</text>
      </view>
    </view>

    <!-- 6大服务卡片 -->
    <view class="services-list">
      <!-- 卡片1: 公司注册 -->
      <view class="service-card" v-for="(item, index) in serviceList" :key="index">
        <view class="card-left">
          <view class="card-icon" :style="{ background: item.iconBg }">
            <text>{{ item.icon }}</text>
          </view>
          <view class="card-info">
            <text class="card-title">{{ item.title }}</text>
            <text class="card-desc">{{ item.desc }}</text>
            <view class="card-tags">
              <text
                v-for="(tag, tagIndex) in item.tags"
                :key="tagIndex"
                class="tag"
              >{{ tag }}</text>
            </view>
          </view>
        </view>
        <text class="card-arrow">></text>
      </view>
    </view>

    <!-- 全球支付通道区 -->
    <view class="payment-section">
      <text class="section-title">全球支付通道</text>
      <view class="payment-grid">
        <view
          v-for="(payment, index) in paymentMethods"
          :key="index"
          class="payment-card"
        >
          <text class="payment-icon">{{ payment.icon }}</text>
          <text class="payment-name">{{ payment.name }}</text>
        </view>
      </view>
    </view>

    <!-- 底部大按钮 -->
    <view class="bottom-btn-wrapper">
      <view class="bottom-btn">
        <text class="btn-text">💬 免费咨询出海方案</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
const sysInfo = uni.getSystemInfoSync();
const windowHeight = sysInfo.windowHeight;

// 服务列表数据
interface ServiceItem {
  icon: string;
  iconBg: string;
  title: string;
  desc: string;
  tags: string[];
}

const serviceList: ServiceItem[] = [
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
];

// 支付方式数据
interface PaymentMethod {
  icon: string;
  name: string;
}

const paymentMethods: PaymentMethod[] = [
  { icon: '💳', name: 'Visa' },
  { icon: '₿', name: 'USDT' },
  { icon: '🛵', name: 'GrabPay' },
  { icon: '📱', name: 'Pix' },
  { icon: '💰', name: 'Alipay' },
  { icon: '💳', name: 'Mastercard' },
  { icon: '🏦', name: '电汇' },
  { icon: '💚', name: '微信支付' }
];
</script>

<style scoped>
.page-container {
  background-color: #0F172A;
  padding: 30rpx;
  box-sizing: border-box;
}

/* 顶部标题区 */
.header {
  margin-bottom: 30rpx;
}

.header-title {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.header-icon {
  font-size: 48rpx;
  margin-right: 16rpx;
}

.header-text {
  color: #FFFFFF;
  font-size: 36rpx;
  font-weight: bold;
}

.header-subtitle {
  color: #94A3B8;
  font-size: 24rpx;
  margin-left: 64rpx;
}

/* 统计条 */
.stats-bar {
  display: flex;
  justify-content: space-between;
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 24rpx 30rpx;
  margin-bottom: 30rpx;
}

.stat-item {
  display: flex;
  align-items: center;
  font-size: 26rpx;
  font-weight: 500;
}

.stat-amber {
  color: #F59E0B;
}

.stat-cyan {
  color: #00D4FF;
}

.stat-item text:first-child {
  margin-right: 10rpx;
}

/* 服务卡片列表 */
.services-list {
  margin-bottom: 40rpx;
}

.service-card {
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
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
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.card-info {
  flex: 1;
}

.card-title {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 12rpx;
}

.card-desc {
  color: #94A3B8;
  font-size: 24rpx;
  display: block;
  margin-bottom: 16rpx;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag {
  background-color: rgba(245, 158, 11, 0.15);
  color: #F59E0B;
  font-size: 22rpx;
  padding: 10rpx 20rpx;
  border-radius: 8rpx;
}

.card-arrow {
  color: #64748B;
  font-size: 32rpx;
  margin-left: 20rpx;
  flex-shrink: 0;
}

/* 全球支付通道区 */
.payment-section {
  margin-bottom: 40rpx;
}

.section-title {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 24rpx;
}

.payment-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}

.payment-card {
  background-color: #1E293B;
  border-radius: 12rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.payment-icon {
  font-size: 44rpx;
  margin-bottom: 12rpx;
}

.payment-name {
  color: #FFFFFF;
  font-size: 22rpx;
  text-align: center;
}

/* 底部大按钮 */
.bottom-btn-wrapper {
  padding: 20rpx 0 40rpx;
}

.bottom-btn {
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
  border-radius: 48rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-text {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: bold;
}
</style>
