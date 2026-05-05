<template>
  <view class="info-card card">
    <view class="info-head">
      <view class="info-title">{{ title }}</view>
      <view v-if="$slots.actions" class="info-actions">
        <slot name="actions"></slot>
      </view>
    </view>
    <view v-for="row in rows" :key="row.label" class="info-row row-line">
      <text class="label">{{ row.label }}</text>
      <template v-if="row.slot">
        <slot :name="row.slot" :row="row"></slot>
      </template>
      <template v-else>
        <text class="value">{{ row.value }}</text>
      </template>
    </view>
    <slot></slot>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  rows: Array<{ label: string; value?: string; slot?: string }>
}>()
</script>

<style scoped lang="scss">
.info-card {
  padding: 28rpx;
  margin-bottom: 22rpx;
}

.info-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.info-title {
  display: flex;
  align-items: center;
  gap: 14rpx;
  font-size: 32rpx;
  font-weight: 800;
  margin-bottom: 0;
}

.info-title::before {
  content: '';
  width: 8rpx;
  height: 34rpx;
  border-radius: 999rpx;
  background: var(--primary);
}

.info-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}

.info-row {
  min-height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30rpx;
}

.info-row:last-child {
  border-bottom: 0;
}

.label {
  color: #667085;
  font-size: 27rpx;
}

.value {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: var(--text);
}
</style>
