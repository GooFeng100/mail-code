<template>
  <view class="safe-page">
    <AppHeader title="到期提醒" back show-tabbar @left="back" />
    <view class="content">
      <view class="section-title">即将到期账号</view>
      <view v-for="item in accounts" :key="item.id" class="expire-row card">
        <view>
          <text class="expire-title">{{ accountDisplayName(item) }}</text>
          <text class="expire-sub">到期时间：{{ item.accountExpireAt || item.expireDate || '--' }}</text>
        </view>
        <StatusTag class="expire-pill" :text="remainTag(item.remainingDays)" type="warning" />
      </view>

      <view class="section-title">即将到期用户</view>
      <view v-for="item in users" :key="item.id" class="expire-row card">
        <view>
          <text class="expire-title">用户 {{ userDisplayName(item) }}</text>
          <text class="expire-sub">到期时间：{{ item.afterSalesExpireAt || item.expireDate || '--' }}</text>
        </view>
        <StatusTag class="expire-pill" :text="remainTag(item.remainingDays)" type="warning" />
      </view>
    </view>
    <wd-backtop :scroll-top="scrollTop" :top="80" :bottom="96" />
  </view>
</template>

<script setup lang="ts">
import { usePageScrollTop } from '@/composables/usePageScrollTop'
import { computed, onMounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { fetchAccountListResult } from '@/api/account'
import { fetchUserListResult } from '@/api/user'
import { back } from '@/utils/nav'

const { scrollTop } = usePageScrollTop()
const accountList = ref<any[]>([])
const userList = ref<any[]>([])

onMounted(load)

async function load() {
  const [accountResult, userResult] = await Promise.all([
    fetchAccountListResult({ page: 1, pageSize: 100 }),
    fetchUserListResult({ page: 1, pageSize: 100 })
  ])
  accountList.value = accountResult.items
  userList.value = userResult.items
}

function toDateValue(dateText?: string) {
  if (!dateText) return Number.POSITIVE_INFINITY
  const value = new Date(`${dateText}T00:00:00`).getTime()
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
}

function inOneWeek(days?: number) {
  const remaining = Number(days ?? Number.POSITIVE_INFINITY)
  return remaining >= 0 && remaining <= 7
}

const accounts = computed(() =>
  accountList.value
    .filter((item) => item.status !== 'disabled' && inOneWeek(item.remainingDays))
    .sort((a, b) => toDateValue(a.accountExpireAt || a.expireDate) - toDateValue(b.accountExpireAt || b.expireDate))
)

const users = computed(() =>
  userList.value
    .filter((item) => inOneWeek(item.remainingDays))
    .sort((a, b) => toDateValue(a.afterSalesExpireAt || a.expireDate) - toDateValue(b.afterSalesExpireAt || b.expireDate))
)

function remainTag(days?: number) {
  return `剩余${Math.max(0, Number(days || 0))}天`
}

function accountDisplayName(item: any) {
  return String(item.name || item.accountEmail || item.code || '--')
}

function userDisplayName(item: any) {
  return String(item.name || item.code || '--')
}
</script>

<style scoped lang="scss">
.expire-row {
  padding: 28rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.expire-title {
  display: block;
  font-size: 32rpx;
  font-weight: 400;
  margin-bottom: 10rpx;
}

.expire-sub {
  display: block;
  color: #667085;
  font-size: 26rpx;
}

:deep(.expire-pill.status-tag) {
  color: #ffffff !important;
  background: #f97316 !important;
}
</style>
