<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('App Launch')
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style>
/* 全局重置 */
page {
  background-color: #0F172A;
  color: #FFFFFF;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 28rpx;
  line-height: 1.5;
}

/* 安全区域适配 */
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
.safe-area-top {
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}

/* 工具类 */
.text-primary { color: #FFFFFF; }
.text-secondary { color: #94A3B8; }
.text-accent { color: #F59E0B; }
.text-cyan { color: #00D4FF; }
.text-red { color: #EF4444; }
.text-green { color: #10B981; }

.bg-card { background-color: #1E293B; border-radius: 24rpx; border: 1px solid #334155; }
.bg-dark { background-color: #0F172A; }

.flex-row { display: flex; flex-direction: row; align-items: center; }
.flex-col { display: flex; flex-direction: column; }
.flex-1 { flex: 1; }

.text-center { text-align: center; }
.font-bold { font-weight: bold; }

.font-32 { font-size: 32rpx; }
.font-28 { font-size: 28rpx; }
.font-24 { font-size: 24rpx; }
.font-20 { font-size: 20rpx; }

.mt-10 { margin-top: 10rpx; }
.mt-20 { margin-top: 20rpx; }
.mb-10 { margin-bottom: 10rpx; }
.mb-20 { margin-bottom: 20rpx; }

.p-20 { padding: 20rpx; }
.p-30 { padding: 30rpx; }
.px-30 { padding-left: 30rpx; padding-right: 30rpx; }
.py-20 { padding-top: 20rpx; padding-bottom: 20rpx; }

.gap-15 { gap: 15rpx; }
.gap-20 { gap: 20rpx; }
</style>
