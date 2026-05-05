<template>
  <view class="safe-page">
    <AppHeader title="后台总览" show-tabbar />
    <view class="content">
      <view class="section-title">数据概览</view>
      <view class="stats-grid">
        <StatCard label="账号总数" :value="overview.accountTotal" icon="▣" type="primary" />
        <StatCard label="即将到期账号" :value="overview.accountExpiring" icon="!" type="warning" />
        <StatCard label="用户总数" :value="overview.userTotal" icon="◉" type="success" />
        <StatCard label="即将到期用户" :value="overview.userExpiring" icon="!" type="danger" />
      </view>

      <view class="section-title">快捷入口</view>
      <view class="quick-card card">
        <view class="quick-item" @click="jump('/pages/account/list/index')">
          <view class="quick-icon primary">▣</view>
          <text>账号</text>
        </view>
        <view class="quick-item" @click="jump('/pages/user/list/index')">
          <view class="quick-icon success">◉</view>
          <text>用户</text>
        </view>
        <view class="quick-item" @click="jump('/pages/relation/list/index')">
          <view class="quick-icon purple">⌘</view>
          <text>关系</text>
        </view>
        <view class="quick-item" @click="jump('/pages/expire/index')">
          <view class="quick-icon warning">⌛</view>
          <text>到期提醒</text>
        </view>
      </view>

      <view class="section-title">最近动态</view>
      <view class="activity-card card">
        <view v-for="item in overview.recentActivities" :key="item.id" class="activity-row row-line">
          <view class="activity-icon" :class="item.tagType">{{ activityIcon(item.type) }}</view>
          <text class="activity-text">{{ item.text }}</text>
          <StatusTag :text="item.tag" :type="item.tagType" />
        </view>
      </view>
    </view>
    <wd-backtop :scroll-top="scrollTop" :top="80" :bottom="96" />
</view>
</template>

<script setup lang="ts">
import { usePageScrollTop } from '@/composables/usePageScrollTop'
import { onMounted, ref } from 'vue'
import { fetchOverview } from '@/api/overview'
import AppHeader from '@/components/AppHeader.vue'
import StatCard from '@/components/StatCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { OverviewData } from '@/types'
const { scrollTop } = usePageScrollTop()

const overview = ref<OverviewData>({
  accountTotal: 0,
  accountExpiring: 0,
  userTotal: 0,
  userExpiring: 0,
  recentActivities: []
})

onMounted(async () => {
  overview.value = await fetchOverview()
})

function jump(url: string) {
  uni.redirectTo({ url })
}

function activityIcon(type: string) {
  if (type === 'account') return '▣'
  if (type === 'user') return '✓'
  return '🔗'
}
</script>

<style scoped lang="scss">
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 22rpx;
}

.quick-card {
  height: 150rpx;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 20rpx 10rpx;
}

.quick-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  color: var(--text);
  font-size: 26rpx;
  border-right: 1rpx solid var(--line);
}

.quick-item:last-child {
  border-right: 0;
}

.quick-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  font-weight: 800;
}

.primary {
  background: var(--primary);
}

.success {
  background: var(--success);
}

.warning {
  background: var(--warning);
}

.purple {
  background: #2563eb;
}

.activity-card {
  padding: 0 28rpx;
}

.activity-row {
  min-height: 96rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.activity-row:last-child {
  border-bottom: 0;
}

.activity-icon {
  width: 54rpx;
  height: 54rpx;
  border-radius: 999rpx;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}

.activity-icon.primary {
  background: var(--primary);
}

.activity-icon.success {
  background: var(--success);
}

.activity-icon.warning {
  background: var(--warning);
}

.activity-icon.danger {
  background: var(--danger);
}

.activity-text {
  flex: 1;
  font-size: 28rpx;
}
</style>
