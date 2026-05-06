<template>
  <view class="stat-card card">
    <view>
      <text class="label">{{ label }}</text>
      <text class="value" :class="type">{{ value }}</text>
    </view>
    <view class="icon-wrap" :class="type">
      <wd-icon v-if="iconName" :name="iconName" size="24px" />
      <text v-else class="icon">{{ icon }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: number | string
  icon: string
  iconName?: string
  type: 'primary' | 'success' | 'warning' | 'danger'
}>()
</script>

<style scoped lang="scss">
.stat-card {
  height: 168rpx;
  padding: 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label {
  display: block;
  color: #667085;
  font-size: 28rpx;
  margin-bottom: 20rpx;
}

.value {
  display: block;
  font-size: 56rpx;
  line-height: 1;
  font-weight: 800;
}

.icon-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon {
  font-size: 46rpx;
}

.primary {
  color: #1677ff;
  background: #e8f2ff;
}

.success {
  color: #10a55a;
  background: #e9f9f1;
}

.warning {
  color: #f97316;
  background: #fff3e2;
}

.danger {
  color: #ef4444;
  background: #ffecec;
}

.value.primary,
.value.success,
.value.warning,
.value.danger {
  background: transparent;
}
</style>
