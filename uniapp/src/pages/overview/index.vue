<template>
  <view class="safe-page">
    <AppHeader title="后台总览" show-tabbar />
    <view class="content">
      <view class="section-title">数据概览</view>
      <view class="stats-grid">
        <StatCard label="账号总数" :value="overview.accountTotal" icon="" :icon-name="navIcon('account')" type="primary" />
        <StatCard label="即将到期账号" :value="overview.accountExpiring" icon="!" type="warning" />
        <StatCard label="用户总数" :value="overview.userTotal" icon="" :icon-name="navIcon('user')" type="success" />
        <StatCard label="即将到期用户" :value="overview.userExpiring" icon="!" type="danger" />
      </view>

      <view class="section-title">最近动态</view>

      <view class="sub-title">即将到期账号</view>
      <view class="activity-group">
        <view v-for="item in accountActivities" :key="item.id" class="activity-row card">
          <view class="activity-main">
            <view class="activity-icon account">
              <wd-icon :name="navIcon('account')" size="18px" color="#ffffff" />
            </view>
            <view class="activity-body">
              <text class="activity-text">{{ item.text }}</text>
              <text class="activity-sub">到期时间：{{ item.expireDate || '--' }}</text>
            </view>
          </view>
          <StatusTag class="activity-pill" :text="item.tag" type="warning" />
        </view>
        <view v-if="!accountActivities.length" class="empty-tip">暂无即将到期账号</view>
      </view>

      <view class="sub-title">即将到期用户</view>
      <view class="activity-group">
        <view v-for="item in userActivities" :key="item.id" class="activity-row card">
          <view class="activity-main">
            <view class="activity-icon user">
              <wd-icon :name="navIcon('user')" size="18px" color="#ffffff" />
            </view>
            <view class="activity-body">
              <text class="activity-text">{{ item.text }}</text>
              <text class="activity-sub">到期时间：{{ item.expireDate || '--' }}</text>
            </view>
          </view>
          <StatusTag class="activity-pill" :text="item.tag" type="warning" />
        </view>
        <view v-if="!userActivities.length" class="empty-tip">暂无即将到期用户</view>
      </view>
    </view>
    <wd-backtop :scroll-top="scrollTop" :top="80" :bottom="96" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { usePageScrollTop } from '@/composables/usePageScrollTop'
import { GLOBAL_NAV_ITEMS, type GlobalNavKey } from '@/constants/global-nav'
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

const accountActivities = computed(() =>
  overview.value.recentActivities.filter((item) => item.type === 'account')
)

const userActivities = computed(() =>
  overview.value.recentActivities.filter((item) => item.type === 'user')
)

onMounted(loadOverview)
onShow(loadOverview)

async function loadOverview() {
  try {
    overview.value = await fetchOverview()
  } catch (error: any) {
    uni.showToast({ title: error?.message || '加载总览失败', icon: 'none' })
  }
}

function navIcon(key: GlobalNavKey) {
  return GLOBAL_NAV_ITEMS.find((item) => item.key === key)?.icon || 'home'
}
</script>

<style scoped lang="scss">
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 22rpx;
}

.sub-title {
  margin: 14rpx 0 12rpx;
  padding-left: 10rpx;
  border-left: 8rpx solid var(--primary);
  color: #102b56;
  font-size: 30rpx;
  font-weight: 700;
}

.activity-group {
  margin-bottom: 20rpx;
}

.activity-row {
  min-height: 112rpx;
  padding: 18rpx 24rpx;
  margin-bottom: 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.activity-main {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.activity-icon {
  width: 54rpx;
  height: 54rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-icon.account {
  background: #1677ff;
}

.activity-icon.user {
  background: #10a55a;
}

.activity-body {
  min-width: 0;
  flex: 1;
}

.activity-text {
  display: block;
  color: #0f2750;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.35;
  word-break: break-all;
}

.activity-sub {
  display: block;
  margin-top: 6rpx;
  color: #667085;
  font-size: 26rpx;
  line-height: 1.3;
}

:deep(.activity-pill.status-tag) {
  color: #ffffff !important;
  background: #f97316 !important;
  min-width: 128rpx;
  height: 48rpx;
  font-size: 24rpx;
  font-weight: 700;
}
</style>
