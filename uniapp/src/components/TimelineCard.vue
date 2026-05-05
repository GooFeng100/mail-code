<template>
  <view class="timeline card">
    <view class="timeline-title">{{ title }}</view>
    <view v-for="item in items" :key="item.time + item.text" class="timeline-row">
      <view class="line-wrap">
        <view class="dot"></view>
        <view class="line"></view>
      </view>
      <text class="time">{{ item.time }}</text>
      <view class="timeline-content">
        <text class="action">{{ item.text }}</text>
        <text class="operator">{{ item.operator || '管理员' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  items: Array<{ time: string; text: string; operator?: string }>
}>()
</script>

<style scoped lang="scss">
.timeline {
  padding: 28rpx;
  margin-bottom: 22rpx;
}

.timeline-title {
  display: flex;
  align-items: center;
  gap: 14rpx;
  font-size: 32rpx;
  font-weight: 800;
  margin-bottom: 20rpx;
}

.timeline-title::before {
  content: '';
  width: 8rpx;
  height: 34rpx;
  border-radius: 999rpx;
  background: var(--primary);
}

.timeline-row {
  display: flex;
  min-height: 88rpx;
  position: relative;
}

.line-wrap {
  width: 40rpx;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  position: relative;
}

.dot {
  margin-top: 12rpx;
  width: 18rpx;
  height: 18rpx;
  background: var(--primary);
  border-radius: 50%;
  z-index: 1;
}

.line {
  position: absolute;
  top: 30rpx;
  bottom: -2rpx;
  width: 2rpx;
  background: #cfe0ff;
}

.timeline-row:last-child .line {
  display: none;
}

.time {
  width: 100rpx;
  color: var(--primary);
  font-size: 28rpx;
  padding-top: 2rpx;
}

.timeline-content {
  flex: 1;
  border-bottom: 1rpx solid var(--line);
  padding-bottom: 18rpx;
}

.timeline-row:last-child .timeline-content {
  border-bottom: 0;
}

.action {
  display: block;
  font-size: 28rpx;
  color: var(--text);
  margin-bottom: 6rpx;
}

.operator {
  display: block;
  font-size: 24rpx;
  color: #8a93a3;
}
</style>
