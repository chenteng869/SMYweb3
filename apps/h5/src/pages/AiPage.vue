<script setup lang="ts">
import { ref } from 'vue'

// AI助手数据接口
interface Assistant {
  name: string
  avatarColor: string
  status: string
  field: string
  desc: string
  chatCount: number
}

// 10个AI助手数据
const assistantList = ref<Assistant[]>([
  { name: '智财管家', avatarColor: '#00D4FF', status: '在线', field: '财务顾问', desc: '智能财务分析与税务规划专家', chatCount: 128 },
  { name: '法务精灵', avatarColor: '#3B82F6', status: '在线', field: '法务顾问', desc: '合同审查与合规咨询AI专家', chatCount: 96 },
  { name: '出海助手', avatarColor: '#F59E0B', status: '在线', field: '出海顾问', desc: '跨境电商全球市场拓展专家', chatCount: 215 },
  { name: '营销大师', avatarColor: '#EC4899', status: '忙碌', field: '营销顾问', desc: '数字营销与品牌推广策略专家', chatCount: 178 },
  { name: '注册专员', avatarColor: '#A855F7', status: '在线', field: '注册顾问', desc: '全球公司注册与架构设计专家', chatCount: 312 },
  { name: '支付专家', avatarColor: '#3B82F6', status: '在线', field: '支付顾问', desc: '全球支付通道与资金管理专家', chatCount: 89 },
  { name: '内容创客', avatarColor: '#22C55E', status: '待机', field: '内容顾问', desc: '自媒体内容创作与运营专家', chatCount: 145 },
  { name: '数据分析师', avatarColor: '#00D4FF', status: '在线', field: '数据顾问', desc: '商业智能与数据分析专家', chatCount: 203 },
  { name: '程序员', avatarColor: '#64748B', status: '待机', field: '技术顾问', desc: '技术开发与系统架构专家', chatCount: 167 },
  { name: '风控卫士', avatarColor: '#EF4444', status: '在线', field: '风控顾问', desc: '全方位风险监控与预警系统', chatCount: 256 }
])

// 待办事项数据接口
interface TodoItem {
  title: string
  assignee: string
  statusText: string
  priority: 'high' | 'medium' | 'low'
}

// 5条待办数据
const todoList = ref<TodoItem[]>([
  { title: '萨摩亚SPV年审提醒', assignee: '注册专员', statusText: '待处理', priority: 'high' },
  { title: '税务优化建议', assignee: '智财管家', statusText: '进行中', priority: 'high' },
  { title: '合同审查完成', assignee: '法务精灵', statusText: '已完成', priority: 'medium' },
  { title: '亚马逊欧洲站入驻', assignee: '出海助手', statusText: '进行中', priority: 'medium' },
  { title: '支付通道费率调整', assignee: '支付专家', statusText: '待处理', priority: 'low' }
])
</script>

<template>
  <div class="ai-page">
    <!-- 顶部标题区 -->
    <div class="header">
      <div class="header-title">
        <span class="header-icon">🤖</span>
        <span class="header-text">AI 大脑</span>
      </div>
      <div class="header-subtitle">10个专业AI智能助手，全天候为您的全球业务保驾护航</div>

      <!-- 统计条 -->
      <div class="stats-bar">
        <div class="stat-item stat-cyan">
          <span>●</span><span>8/10 在线</span>
        </div>
        <div class="stat-item stat-gray">
          <span>📱</span><span>本月 1,893 次对话</span>
        </div>
      </div>
    </div>

    <!-- 智能助手团队标题 -->
    <div class="section-title">智能助手团队</div>

    <!-- AI助手网格 -->
    <div class="assistant-grid">
      <div v-for="(assistant, index) in assistantList" :key="index" class="assistant-card">
        <div class="card-header">
          <div class="avatar" :style="{ background: assistant.avatarColor }"></div>
          <div
            :class="['status-badge',
              assistant.status === '在线' ? 'status-online' :
              assistant.status === '忙碌' ? 'status-busy' : 'status-idle']"
          >{{ assistant.status }}</div>
        </div>
        <div class="assistant-name">{{ assistant.name }}</div>
        <div class="assistant-field">{{ assistant.field }}</div>
        <div class="assistant-desc">{{ assistant.desc }}</div>
        <div class="card-footer">
          <span class="chat-count">💬 {{ assistant.chatCount }} 对话</span>
        </div>
      </div>
    </div>

    <!-- AI待办区 -->
    <div class="todo-section">
      <div class="todo-header">
        <span class="todo-title">⚡ AI 待办</span>
        <span class="todo-count">{{ todoList.length }} 项</span>
      </div>
      <div class="todo-list">
        <div v-for="(item, index) in todoList" :key="index" class="todo-card">
          <div class="todo-left">
            <div :class="['todo-dot',
              item.priority === 'high' ? 'dot-red' :
              item.priority === 'medium' ? 'dot-orange' : 'dot-green']"></div>
            <div class="todo-info">
              <div class="todo-text">{{ item.title }}</div>
              <div class="todo-meta">{{ item.assignee }} · {{ item.statusText }}</div>
            </div>
          </div>
          <div :class="['todo-btn',
            item.statusText === '已完成' ? 'btn-done' : 'btn-pending']">{{ item.statusText }}</div>
        </div>
      </div>
    </div>

    <!-- 底部大按钮 -->
    <div class="bottom-btn-wrapper">
      <button class="bottom-btn">🤖 开始AI对话</button>
    </div>
  </div>
</template>

<style scoped>
.ai-page {
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
  margin-bottom: 12px;
  margin-left: 32px;
}

/* 统计条 */
.stats-bar {
  display: flex;
  justify-content: space-between;
  background-color: var(--bg-card, #1E293B);
  border-radius: 10px;
  padding: 12px 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  gap: 5px;
}

.stat-cyan { color: var(--cyan, #00D4FF); }

.stat-gray { color: var(--text-secondary, #94A3B8); }

/* 智能助手团队标题 */
.section-title {
  color: #FFFFFF;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
}

/* AI助手网格 */
.assistant-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.assistant-card {
  background-color: var(--bg-card, #1E293B);
  border-radius: 10px;
  padding: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
}

.status-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-online { color: #22C55E; background-color: rgba(34, 197, 94, 0.15); }

.status-busy { color: #F59E0B; background-color: rgba(245, 158, 11, 0.15); }

.status-idle { color: #64748B; background-color: rgba(100, 116, 139, 0.15); }

.assistant-name {
  color: #FFFFFF;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 4px;
}

.assistant-field { color: var(--text-secondary, #94A3B8); font-size: 11px; margin-bottom: 4px; }

.assistant-desc {
  color: var(--text-secondary, #94A3B8);
  font-size: 12px;
  margin-bottom: 8px;
  line-height: 1.4;
}

.card-footer {
  padding-top: 6px;
  border-top: 1px solid var(--border-color, #334155);
}

.chat-count { color: var(--text-muted, #64748B); font-size: 11px; }

/* AI待办区 */
.todo-section { margin-bottom: 20px; }

.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.todo-title {
  color: #FFFFFF;
  font-size: 16px;
  font-weight: bold;
}

.todo-count { color: var(--text-secondary, #94A3B8); font-size: 13px; }

.todo-list { display: flex; flex-direction: column; gap: 8px; }

.todo-card {
  background-color: var(--bg-card, #1E293B);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.todo-left { display: flex; align-items: center; flex: 1; }

.todo-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
}

.dot-red { background-color: #EF4444; }

.dot-orange { background-color: #F59E0B; }

.dot-green { background-color: #22C55E; }

.todo-info { flex: 1; }

.todo-text { color: #FFFFFF; font-size: 13px; margin-bottom: 3px; }

.todo-meta { color: var(--text-secondary, #94A3B8); font-size: 11px; }

.todo-btn {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 4px;
  flex-shrink: 0;
  margin-left: 8px;
}

.btn-pending { color: #F59E0B; background-color: rgba(245, 158, 11, 0.15); }

.btn-done { color: #22C55E; background-color: rgba(34, 197, 94, 0.15); }

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
