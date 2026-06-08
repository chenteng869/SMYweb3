<script setup lang="ts">
import { ref, computed, defineComponent, markRaw } from 'vue'
import HomePage from './pages/HomePage.vue'
import DiscoverPage from './pages/DiscoverPage.vue'
import ServicesPage from './pages/ServicesPage.vue'
import AiPage from './pages/AiPage.vue'
import ProfilePage from './pages/ProfilePage.vue'

const tabs = [
  { key: 'home', label: '首页', icon: '🏠' },
  { key: 'discover', label: '发现', icon: '🧭' },
  { key: 'services', label: '服务', icon: '💼' },
  { key: 'ai', label: 'AI', icon: '🤖', badge: true },
  { key: 'profile', label: '我的', icon: '👤' },
]

const activeTab = ref('home')

const pageMap: Record<string, ReturnType<typeof defineComponent>> = {
  home: markRaw(HomePage),
  discover: markRaw(DiscoverPage),
  services: markRaw(ServicesPage),
  ai: markRaw(AiPage),
  profile: markRaw(ProfilePage),
}

const currentPage = computed(() => pageMap[activeTab.value] || markRaw(HomePage))

function switchTab(key: string) {
  activeTab.value = key
}
</script>

<template>
  <div class="h5-app">
    <!-- 页面内容区 -->
    <div class="page-wrapper">
      <component :is="currentPage" />
    </div>

    <!-- 底部 TabBar -->
    <nav class="tabbar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
        <span v-if="tab.badge && tab.key === 'ai'" class="tab-badge"></span>
      </button>
    </nav>
  </div>
</template>

<style>
/* ===== 全局样式 ===== */
:root {
  --bg-primary: #0F172A;
  --bg-card: #1E293B;
  --bg-card-hover: #263348;
  --border-color: #334155;
  --text-primary: #FFFFFF;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
  --accent: #F59E0B;
  --accent-hover: #D97706;
  --cyan: #00D4FF;
  --green: #10B981;
  --red: #EF4444;
  --purple: #A78BFA;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.h5-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  max-width: 430px; /* 模拟手机宽度 */
  margin: 0 auto;
  background: var(--bg-primary);
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 60px rgba(0,0,0,0.5);
}

.page-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* 隐藏滚动条 */
.page-wrapper::-webkit-scrollbar { display: none; }

/* ===== TabBar ===== */
.tabbar {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 56px;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  position: relative;
  z-index: 100;
  flex-shrink: 0;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  height: 100%;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 10px;
  cursor: pointer;
  transition: color 0.2s;
  position: relative;
  padding: 0;
}

.tab-item.active {
  color: var(--accent);
}

.tab-icon {
  font-size: 22px;
  line-height: 1;
}

.tab-label {
  font-size: 10px;
  line-height: 1;
  white-space: nowrap;
}

.tab-badge {
  position: absolute;
  top: 4px;
  right: calc(50% - 16px);
  width: 8px;
  height: 8px;
  background: var(--red);
  border-radius: 50%;
  animation: pulse-badge 2s infinite;
}

@keyframes pulse-badge {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

/* ===== 工具类 ===== */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
}

.text-accent { color: var(--accent); }
.text-cyan { color: var(--cyan); }
.text-green { color: var(--green); }
.text-red { color: var(--red); }
.text-secondary { color: var(--text-secondary); }
.text-muted { color: var(--text-muted); }
.font-bold { font-weight: 600; }
.flex-row { display: flex; align-items: center; }
.flex-col { display: flex; flex-direction: column; }
.flex-1 { flex: 1; }
.gap-8 { gap: 8px; }
.gap-12 { gap: 12px; }
.gap-16 { gap: 16px; }
.mt-12 { margin-top: 12px; }
.mt-16 { margin-top: 16px; }
.mt-20 { margin-top: 20px; }
.mb-12 { margin-bottom: 12px; }
.mb-16 { margin-bottom: 16px; }
.p-16 { padding: 16px; }
.p-20 { padding: 20px; }
.px-16 { padding-left: 16px; padding-right: 16px; }
.py-12 { padding-top: 12px; padding-bottom: 12px; }
.text-center { text-align: center; }
.rounded-full { border-radius: 9999px; }
</style>
