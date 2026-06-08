<template>
  <view class="container">
    <!-- 状态栏占位 -->
    <view class="status-bar safe-area-top"></view>

    <!-- 页面标题 -->
    <view class="header">
      <view class="flex-row" style="justify-content: space-between;">
        <view>
          <text class="header-title">AI 助手</text>
          <text class="header-subtitle">智能政务顾问</text>
        </view>
        <view class="ai-badge bg-card px-20 py-10 flex-row">
          <view class="ai-dot"></view>
          <text class="badge-text font-24 text-cyan">在线</text>
        </view>
      </view>
    </view>

    <!-- AI 对话区域 -->
    <view class="chat-container bg-card mt-20">
      <!-- 对话消息列表 -->
      <scroll-view class="chat-messages" scroll-y :scroll-top="scrollTop">
        <view class="message-wrapper" v-for="(msg, index) in messages" :key="index" :class="msg.role">
          <view class="message-avatar" v-if="msg.role === 'ai'">
            <text class="avatar-icon">🤖</text>
          </view>
          <view class="message-bubble" :class="msg.role">
            <text class="message-text font-28">{{ msg.content }}</text>
          </view>
          <view class="message-avatar user-avatar" v-if="msg.role === 'user'">
            <text class="avatar-icon">👤</text>
          </view>
        </view>

        <!-- AI 正在输入指示器 -->
        <view class="message-wrapper ai" v-if="isTyping">
          <view class="message-avatar"><text class="avatar-icon">🤖</text></view>
          <view class="message-bubble ai typing">
            <view class="typing-dots">
              <view class="dot"></view>
              <view class="dot"></view>
              <view class="dot"></view>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 快捷提问 -->
      <view class="quick-questions flex-row gap-15 mt-20">
        <view
          class="quick-btn"
          v-for="(q, index) in quickQuestions"
          :key="index"
          @click="sendQuickQuestion(q)"
        >
          <text class="quick-text font-24 text-secondary">{{ q }}</text>
        </view>
      </view>

      <!-- 输入区域 -->
      <view class="input-area flex-row gap-15 mt-20">
        <input
          class="input-field flex-1"
          v-model="inputText"
          placeholder="输入您的问题..."
          placeholder-class="input-placeholder"
          confirm-type="send"
          @confirm="sendMessage"
        />
        <view class="send-btn" @click="sendMessage" :class="{ active: inputText.trim() }">
          <text class="send-text font-28 text-primary">发送</text>
        </view>
      </view>
    </view>

    <!-- 功能入口 -->
    <view class="features mt-30">
      <text class="section-title font-28 font-bold text-primary">AI 能力</text>
      <view class="feature-grid mt-20">
        <view class="feature-item bg-card flex-col p-30 text-center" v-for="(f, index) in features" :key="index">
          <text class="feature-icon">{{ f.icon }}</text>
          <text class="feature-name font-24 text-primary mt-10">{{ f.name }}</text>
          <text class="feature-desc font-20 text-secondary mt-6">{{ f.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 底部安全区 -->
    <view class="safe-area-bottom mb-20"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

const inputText = ref('')
const scrollTop = ref(0)
const isTyping = ref(false)

const messages = ref([
  { role: 'ai', content: '您好！我是 WOPC AI 智能助手，可以为您解答政务办理、政策法规、商业注册等问题。请问有什么可以帮您的？' },
])

const quickQuestions = ref(['如何注册公司？', '最新税收政策？', '签证如何办理？'])

const features = ref([
  { icon: '📝', name: '智能填表', desc: '自动填写表单' },
  { icon: '📋', name: '政策解读', desc: '智能分析政策' },
  { icon: '🌐', name: '多语言', desc: '中英萨语互译' },
  { icon: '📊', name: '数据分析', desc: '智能数据报表' },
])

function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return

  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  scrollToBottom()

  // 模拟AI回复
  isTyping.value = true
  setTimeout(() => {
    isTyping.value = false
    messages.value.push({
      role: 'ai',
      content: `关于"${text}"的问题，我已为您查询到相关信息。建议您前往【服务】页面查看详细操作指南，或联系人工客服获取进一步帮助。`,
    })
    scrollToBottom()
  }, 1500)
}

function sendQuickQuestion(q: string) {
  inputText.value = q
  sendMessage()
}

function scrollToBottom() {
  nextTick(() => {
    scrollTop.value = Math.random() * 1000 // 触发滚动到底部
  })
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 0 30rpx;
  display: flex;
  flex-direction: column;
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
  display: block;
}

.ai-badge {
  border-radius: 30rpx;
  align-self: flex-start;
}

.ai-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: #00D4FF;
  margin-right: 8rpx;
}

.badge-text {}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: 24rpx;
  padding: 24rpx;
  min-height: 600rpx;
}

.chat-messages {
  flex: 1;
  max-height: 480rpx;
  padding: 10rpx 0;
}

.message-wrapper {
  display: flex;
  align-items: flex-start;
  margin-bottom: 24rpx;
  gap: 16rpx;
}

.message-wrapper.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background-color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-avatar {
  background-color: #F59E0B;
}

.avatar-icon {
  font-size: 28rpx;
}

.message-bubble {
  max-width: 70%;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  word-break: break-all;
}

.message-bubble.ai {
  background-color: #334155;
  border-top-left-radius: 4rpx;
}

.message-bubble.user {
  background-color: #F59E0B;
  border-top-right-radius: 4rpx;
}

.message-text {
  line-height: 1.6;
  color: #FFFFFF;
}

.typing-dots {
  display: flex;
  gap: 8rpx;
  padding: 8rpx 0;
}

.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: #94A3B8;
  animation: typing 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.quick-questions {
  flex-wrap: wrap;
}

.quick-btn {
  background-color: #334155;
  border-radius: 30rpx;
  padding: 12rpx 24rpx;
}

.input-area {
  align-items: stretch;
}

.input-field {
  background-color: #334155;
  border-radius: 40rpx;
  padding: 18rpx 28rpx;
  font-size: 28rpx;
  color: #FFFFFF;
}

.input-placeholder {
  color: #64748B;
}

.send-btn {
  background-color: #334155;
  border-radius: 40rpx;
  padding: 18rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn.active {
  background-color: #F59E0B;
}

.features {
  padding-bottom: 10rpx;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.feature-icon {
  font-size: 40rpx;
}

.feature-name {
  line-height: 1.4;
}

.feature-desc {
  line-height: 1.3;
}
</style>
