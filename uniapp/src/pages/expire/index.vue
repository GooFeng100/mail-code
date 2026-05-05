<template>
  <view class="safe-page">
    <AppHeader title="到期提醒" back show-tabbar @left="back" />
    <view class="content">
      <view class="section-title">即将到期账号</view>
      <view v-for="item in accounts" :key="item.id" class="expire-row card">
        <view>
          <text class="expire-title">{{ item.name }}</text>
          <text class="expire-sub">到期时间：{{ item.expireDate }}</text>
        </view>
        <StatusTag text="即将到期" type="warning" />
      </view>

      <view class="section-title">即将到期用户</view>
      <view v-for="item in users" :key="item.id" class="expire-row card">
        <view>
          <text class="expire-title">用户 {{ item.code }}</text>
          <text class="expire-sub">到期时间：{{ item.expireDate }}</text>
        </view>
        <StatusTag text="即将到期" type="warning" />
      </view>
    </view>
    <wd-backtop :scroll-top="scrollTop" :top="80" :bottom="96" />
</view>
</template>

<script setup lang="ts">
import { usePageScrollTop } from '@/composables/usePageScrollTop'
import { computed } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { mockAccounts, mockUsers } from '@/mock/data'
import { back } from '@/utils/nav'
const { scrollTop } = usePageScrollTop()

const accounts = computed(() => mockAccounts.filter((item) => item.status === 'expiring'))
const users = computed(() => mockUsers.filter((item) => item.status === 'expiring'))
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
  font-weight: 800;
  margin-bottom: 10rpx;
}

.expire-sub {
  display: block;
  color: #667085;
  font-size: 26rpx;
}
</style>
