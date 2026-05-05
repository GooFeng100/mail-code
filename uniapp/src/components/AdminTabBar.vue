<template>
  <view class="tabbar">
    <view
      v-for="item in GLOBAL_NAV_ITEMS"
      :key="item.key"
      class="tab-item"
      :class="{ active: active === item.key }"
      @click="go(item.path)"
    >
      <wd-icon class="tab-icon" :name="item.icon" size="24px" />
      <text class="tab-text">{{ item.label }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { GLOBAL_NAV_ITEMS } from '@/constants/global-nav'
import type { GlobalNavKey } from '@/constants/global-nav'

const active = computed<GlobalNavKey>(() => {
  const pages = getCurrentPages() as Array<{ route?: string }>
  const currentRoute = pages[pages.length - 1]?.route || ''

  if (currentRoute.startsWith('pages/account/')) return 'account'
  if (currentRoute.startsWith('pages/user/')) return 'user'
  if (currentRoute.startsWith('pages/relation/')) return 'relation'
  return 'overview'
})

function go(path: string) {
  const pages = getCurrentPages() as Array<{ route?: string }>
  const currentRoute = pages[pages.length - 1]?.route || ''
  const currentPath = `/${currentRoute}`
  if (currentPath === path) return
  uni.redirectTo({ url: path })
}
</script>

<style scoped lang="scss">
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  height: calc(112rpx + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -8rpx 24rpx rgba(30, 42, 62, 0.08);
  display: flex;
  border-radius: 28rpx 28rpx 0 0;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  color: #8a93a3;
}

.tab-item.active {
  color: var(--primary);
  font-weight: 700;
}

.tab-icon {
  line-height: 1;
  color: currentColor;
}

.tab-text {
  font-size: 24rpx;
}
</style>
