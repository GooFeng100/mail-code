<template>
  <text class="status-tag" :class="type || 'default'">{{ text }}</text>
</template>

<script setup lang="ts">
defineProps<{
  text: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'default'
}>()
</script>

<style scoped lang="scss">
.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 104rpx;
  height: 46rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 700;
  background: #eef1f6;
  color: #667085;
}

.primary {
  background: #e8f2ff;
  color: #1677ff;
}

.success {
  background: #e9f9f1;
  color: #10a55a;
}

.warning {
  background: #fff3e2;
  color: #f97316;
}

.danger {
  background: #ffecec;
  color: #ef4444;
}

.default {
  background: #eef1f6;
  color: #667085;
}
</style>
