<template>
  <view class="app-header">
    <view class="status-space"></view>
    <view class="nav-row">
      <view class="nav-side" @click="handleLeft">
        <text v-if="back" class="nav-icon">‹</text>
      </view>
      <text class="title">{{ title }}</text>
      <view class="nav-side nav-right" @click="handleRight">
        <text v-if="rightIcon" class="right-icon">{{ rightIcon }}</text>
      </view>
    </view>
    <AdminTabBar v-if="showTabbar" />
  </view>
</template>

<script setup lang="ts">
import AdminTabBar from '@/components/AdminTabBar.vue'

const props = defineProps<{
  title: string
  back?: boolean
  rightIcon?: string
  showTabbar?: boolean
}>()

const emit = defineEmits<{
  (e: 'left'): void
  (e: 'right'): void
}>()

function handleLeft() {
  if (props.back) emit('left')
}

function handleRight() {
  if (props.rightIcon) emit('right')
}
</script>

<style scoped lang="scss">
.app-header {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 120;
  color: #fff;
  background: linear-gradient(135deg, #0a7bff 0%, #0064e8 100%);
  box-shadow: 0 8rpx 24rpx rgba(22, 119, 255, 0.18);
}

.status-space {
  height: calc(44rpx + env(safe-area-inset-top));
}

.nav-row {
  height: 118rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28rpx;
}

.nav-side {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
}

.nav-right {
  justify-content: flex-end;
}

.nav-icon {
  font-size: 72rpx;
  line-height: 1;
  font-weight: 300;
}

.right-icon {
  width: 58rpx;
  height: 58rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 46rpx;
  font-weight: 600;
}

.title {
  flex: 1;
  text-align: center;
  font-size: 40rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}
</style>
