<template>
  <wd-popup
    v-model="confirmState.show"
    transition="zoom-in"
    custom-class="global-confirm-popup"
    :z-index="160"
    root-portal
    :close-on-click-modal="false"
  >
    <view class="confirm-card">
      <view class="confirm-icon" :class="`is-${confirmState.icon}`">
        <text class="icon-text">{{ iconText }}</text>
      </view>
      <text class="confirm-title">{{ confirmState.title }}</text>
      <text class="confirm-content">{{ confirmState.content }}</text>

      <view class="confirm-actions">
        <wd-button custom-class="confirm-btn cancel-btn" plain :disabled="confirmState.loading" @click="onCancel">
          {{ confirmState.cancelText }}
        </wd-button>
        <wd-button
          custom-class="confirm-btn submit-btn"
          type="primary"
          :loading="confirmState.loading"
          :disabled="confirmState.loading"
          @click="onConfirm"
        >
          {{ confirmState.loading ? '处理中' : confirmState.confirmText }}
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { closeConfirm, confirmState, runConfirm } from '@/utils/confirm'

const iconText = computed(() => {
  if (confirmState.icon === 'warning') return '!'
  if (confirmState.icon === 'info') return 'i'
  return 'X'
})

function onCancel() {
  if (confirmState.loading) return
  closeConfirm(false)
}

function onConfirm() {
  runConfirm()
}
</script>

<style scoped lang="scss">
.confirm-card {
  width: calc(100vw - 56rpx);
  max-width: 620rpx;
  background: #ffffff;
  border-radius: 32rpx;
  padding: 42rpx 32rpx 32rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.confirm-icon {
  width: 108rpx;
  height: 108rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-icon.is-danger {
  background: #f54b4b;
}

.confirm-icon.is-warning {
  background: #f59e0b;
}

.confirm-icon.is-info {
  background: #2f80ff;
}

.icon-text {
  color: #ffffff;
  font-size: 64rpx;
  line-height: 1;
  font-weight: 700;
}

.confirm-title {
  margin-top: 28rpx;
  font-size: 44rpx;
  color: #111827;
  font-weight: 800;
}

.confirm-content {
  margin-top: 20rpx;
  text-align: center;
  color: #4b5563;
  font-size: 33rpx;
  line-height: 1.55;
}

.confirm-actions {
  margin-top: 30rpx;
  width: 100%;
  display: flex;
  gap: 18rpx;
}

:deep(.confirm-btn) {
  flex: 1;
  height: 84rpx !important;
  border-radius: 16rpx !important;
  font-size: 36rpx !important;
  font-weight: 700 !important;
}

:deep(.cancel-btn) {
  border-color: #d1d5db !important;
  color: #111827 !important;
  background: #ffffff !important;
}

:deep(.submit-btn) {
  border: 0 !important;
  background: #2f69e8 !important;
  color: #ffffff !important;
}
</style>
