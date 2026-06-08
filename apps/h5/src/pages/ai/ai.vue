<template>
  <scroll-view scroll-y class="page-container" :style="{ height: windowHeight + 'px' }">
    <!-- 顶部标题区 -->
    <view class="header">
      <view class="header-title">
        <text class="header-icon">🤖</text>
        <text class="header-text">AI 大脑</text>
      </view>
      <view class="header-subtitle">10个专业AI智能助手，全天候为您的全球业务保驾护航</view>

      <!-- 统计条 -->
      <view class="stats-bar">
        <view class="stat-item stat-cyan">
          <text>●</text>
          <text>8/10 在线</text>
        </view>
        <view class="stat-item stat-gray">
          <text>📱</text>
          <text>本月 1,893 次对话</text>
        </view>
      </view>
    </view>

    <!-- 智能助手团队标题 -->
    <text class="section-title">智能助手团队</text>

    <!-- AI助手网格 -->
    <view class="assistant-grid">
      <view
        v-for="(assistant, index) in assistantList"
        :key="index"
        class="assistant-card"
      >
        <view class="card-header">
          <view
            class="avatar"
            :style="{ background: assistant.avatarColor }"
          ></view>
          <view
            class="status-badge"
            :class="{
              'status-online': assistant.status === '在线',
              'status-busy': assistant.status === '忙碌',
              'status-idle': assistant.status === '待机'
            }"
          >{{ assistant.status }}</view>
        </view>
        <text class="assistant-name">{{ assistant.name }}</text>
        <text class="assistant-field">{{ assistant.field }}</text>
        <text class="assistant-desc">{{ assistant.desc }}</text>
        <view class="card-footer">
          <text class="chat-count">💬 {{ assistant.chatCount }} 对话</text>
        </view>
      </view>
    </view>

    <!-- AI待办区 -->
    <view class="todo-section">
      <view class="todo-header">
        <text class="todo-title">⚡ AI 待办</text>
        <text class="todo-count">{{ todoList.length }} 项</text>
      </view>
      <view class="todo-list">
        <view
          v-for="(item, index) in todoList"
          :key="index"
          class="todo-card"
        >
          <view class="todo-left">
            <view
              class="todo-dot"
              :class="{
                'dot-red': item.priority === 'high',
                'dot-orange': item.priority === 'medium',
                'dot-green': item.priority === 'low'
              }"
            ></view>
            <view class="todo-info">
              <text class="todo-text">{{ item.title }}</text>
              <text class="todo-meta">{{ item.assignee }} · {{ item.statusText }}</text>
            </view>
          </view>
          <view
            class="todo-btn"
            :class="{
              'btn-pending': item.statusText === '待处理',
              'btn-progress': item.statusText === '进行中',
              'btn-done': item.statusText === '已完成'
            }"
          >{{ item.statusText }}</view>
        </view>
      </view>
    </view>

    <!-- 底部大按钮 -->
    <view class="bottom-btn-wrapper">
      <view class="bottom-btn">
        <text class="btn-text">🤖 开始AI对话</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
const sysInfo = uni.getSystemInfoSync();
const windowHeight = sysInfo.windowHeight;

// AI助手数据接口
interface Assistant {
  name: string;
  avatarColor: string;
  status: string;
  field: string;
  desc: string;
  chatCount: number;
}

// 10个AI助手数据
const assistantList: Assistant[] = [
  {
    name: '智财管家',
    avatarColor: '#00D4FF',
    status: '在线',
    field: '财务顾问',
    desc: '智能财务分析与税务规划专家',
    chatCount: 128
  },
  {
    name: '法务精灵',
    avatarColor: '#3B82F6',
    status: '在线',
    field: '法务顾问',
    desc: '合同审查与合规咨询AI专家',
    chatCount: 96
  },
  {
    name: '出海助手',
    avatarColor: '#F59E0B',
    status: '在线',
    field: '出海顾问',
    desc: '跨境电商全球市场拓展专家',
    chatCount: 215
  },
  {
    name: '营销大师',
    avatarColor: '#EC4899',
    status: '忙碌',
    field: '营销顾问',
    desc: '数字营销与品牌推广策略专家',
    chatCount: 178
  },
  {
    name: '注册专员',
    avatarColor: '#A855F7',
    status: '在线',
    field: '注册顾问',
    desc: '全球公司注册与架构设计专家',
    chatCount: 312
  },
  {
    name: '支付专家',
    avatarColor: '#3B82F6',
    status: '在线',
    field: '支付顾问',
    desc: '全球支付通道与资金管理专家',
    chatCount: 89
  },
  {
    name: '内容创客',
    avatarColor: '#22C55E',
    status: '待机',
    field: '内容顾问',
    desc: '自媒体内容创作与运营专家',
    chatCount: 145
  },
  {
    name: '数据分析师',
    avatarColor: '#00D4FF',
    status: '在线',
    field: '数据顾问',
    desc: '商业智能与数据分析专家',
    chatCount: 203
  },
  {
    name: '程序员',
    avatarColor: '#64748B',
    status: '待机',
    field: '技术顾问',
    desc: '技术开发与系统架构专家',
    chatCount: 167
  },
  {
    name: '风控卫士',
    avatarColor: '#EF4444',
    status: '在线',
    field: '风控顾问',
    desc: '全方位风险监控与预警系统',
    chatCount: 256
  }
];

// 待办事项数据接口
interface TodoItem {
  title: string;
  assignee: string;
  statusText: string;
  priority: 'high' | 'medium' | 'low';
}

// 5条待办数据
const todoList: TodoItem[] = [
  {
    title: '萨摩亚SPV年审提醒',
    assignee: '注册专员',
    statusText: '待处理',
    priority: 'high'
  },
  {
    title: '税务优化建议',
    assignee: '智财管家',
    statusText: '进行中',
    priority: 'high'
  },
  {
    title: '合同审查完成',
    assignee: '法务精灵',
    statusText: '已完成',
    priority: 'medium'
  },
  {
    title: '亚马逊欧洲站入驻',
    assignee: '出海助手',
    statusText: '进行中',
    priority: 'medium'
  },
  {
    title: '支付通道费率调整',
    assignee: '支付专家',
    statusText: '待处理',
    priority: 'low'
  }
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
  margin-bottom: 24rpx;
  margin-left: 64rpx;
}

/* 统计条 */
.stats-bar {
  display: flex;
  justify-content: space-between;
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 24rpx 30rpx;
}

.stat-item {
  display: flex;
  align-items: center;
  font-size: 26rpx;
  font-weight: 500;
}

.stat-cyan {
  color: #00D4FF;
}

.stat-gray {
  color: #94A3B8;
}

.stat-item text:first-child {
  margin-right: 10rpx;
}

/* 智能助手团队标题 */
.section-title {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 24rpx;
}

/* AI助手网格 */
.assistant-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.assistant-card {
  background-color: #1E293B;
  border-radius: 16rpx;
  padding: 24rpx;
  position: relative;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
}

.status-badge {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.status-online {
  color: #22C55E;
  background-color: rgba(34, 197, 94, 0.15);
}

.status-busy {
  color: #F59E0B;
  background-color: rgba(245, 158, 11, 0.15);
}

.status-idle {
  color: #64748B;
  background-color: rgba(100, 116, 139, 0.15);
}

.assistant-name {
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 8rpx;
}

.assistant-field {
  color: #94A3B8;
  font-size: 22rpx;
  display: block;
  margin-bottom: 8rpx;
}

.assistant-desc {
  color: #94A3B8;
  font-size: 24rpx;
  display: block;
  margin-bottom: 16rpx;
  line-height: 1.4;
}

.card-footer {
  padding-top: 12rpx;
  border-top: 1rpx solid #334155;
}

.chat-count {
  color: #64748B;
  font-size: 22rpx;
}

/* AI待办区 */
.todo-section {
  margin-bottom: 40rpx;
}

.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.todo-title {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: bold;
}

.todo-count {
  color: #94A3B8;
  font-size: 26rpx;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.todo-card {
  background-color: #1E293B;
  border-radius: 12rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.todo-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.todo-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.dot-red {
  background-color: #EF4444;
}

.dot-orange {
  background-color: #F59E0B;
}

.dot-green {
  background-color: #22C55E;
}

.todo-info {
  flex: 1;
}

.todo-text {
  color: #FFFFFF;
  font-size: 26rpx;
  display: block;
  margin-bottom: 6rpx;
}

.todo-meta {
  color: #94A3B8;
  font-size: 22rpx;
  display: block;
}

.todo-btn {
  font-size: 22rpx;
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.btn-pending {
  color: #F59E0B;
  background-color: rgba(245, 158, 11, 0.15);
}

.btn-progress {
  color: #F59E0B;
  background-color: rgba(245, 158, 11, 0.15);
}

.btn-done {
  color: #22C55E;
  background-color: rgba(34, 197, 94, 0.15);
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
