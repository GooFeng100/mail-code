<template>
  <view class="safe-page">
    <AppHeader title="用户列表" right-icon="+" show-tabbar @right="addUser" />
    <ListToolbar
      v-model="keyword"
      placeholder="搜索用户 / 联系方式"
      :chips="chips"
      @search="load"
      @filter="showFilter = true"
    />

    <view class="list-wrap">
      <view v-for="item in list" :key="item.id" class="list-card card" @click="openDetail(item.id)">
        <view class="card-main">
          <view class="info-row">
            <text class="info-label">用户编号</text>
            <text class="info-value info-code">{{ item.code }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">用户昵称</text>
            <text class="info-value">{{ item.name }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">售后到期日</text>
            <text class="info-value">{{ item.afterSalesExpireAt || item.expireDate }}</text>
          </view>
        </view>
        <view class="card-right">
          <view class="remain-badge" :class="remainBadgeType(item.afterSalesExpireAt || item.expireDate)">
            <text class="remain-text">{{ remainText(item.afterSalesExpireAt || item.expireDate) }}</text>
          </view>
          <text class="detail-link">详情 ></text>
        </view>
      </view>
      <view v-if="!list.length" class="empty-tip">暂无用户数据</view>
    </view>

    <wd-popup v-model="showFilter" position="bottom" safe-area-inset-bottom>
      <view class="filter-panel">
        <view class="filter-title">筛选用户</view>
        <wd-cell title="状态" :value="statusLabel" is-link @click="toggleStatus" />
        <wd-cell title="到期范围" value="最近30天" is-link />
        <view class="filter-actions">
          <wd-button custom-class="filter-action" plain @click="reset">重置</wd-button>
          <wd-button custom-class="filter-action" type="primary" @click="confirmFilter">确认</wd-button>
        </view>
      </view>
    </wd-popup>

    <UserFormPopup
      v-model="showUserForm"
      mode="add"
      @submit="handleSubmitUser"
    />

    <wd-backtop :scroll-top="scrollTop" :top="80" :bottom="96" />
  </view>
</template>

<script setup lang="ts">
import { usePageScrollTop } from '@/composables/usePageScrollTop'
import { computed, onMounted, ref } from 'vue'
import { fetchUsers } from '@/api/user'
import AppHeader from '@/components/AppHeader.vue'
import ListToolbar from '@/components/ListToolbar.vue'
import UserFormPopup from '@/components/UserFormPopup.vue'
import type { UserItem, UserStatus } from '@/types'
import { userStatusText } from '@/utils/status'

const keyword = ref('')
const status = ref<'all' | UserStatus>('all')
const showFilter = ref(false)
const showUserForm = ref(false)
const list = ref<UserItem[]>([])

const { scrollTop } = usePageScrollTop()

const statusLabel = computed(() => (status.value === 'all' ? '全部' : userStatusText(status.value)))
const chips = computed(() => [{ label: `状态：${statusLabel.value}` }, { label: '到期：最近30天' }])

onMounted(load)

async function load() {
  list.value = await fetchUsers({ keyword: keyword.value, status: status.value })
}

function openDetail(id: string) {
  uni.navigateTo({ url: `/pages/user/detail/index?id=${id}` })
}

function addUser() {
  showUserForm.value = true
}

async function handleSubmitUser(
  value: any,
  done: (result?: { success?: boolean; message?: string; error?: string }) => void
) {
  try {
    await simulateDbDelay()
    const id = `u_${Date.now()}`
    list.value = [
      {
        id,
        code: value.code || `U${String(Date.now()).slice(-6)}`,
        name: value.name || '--',
        phone: value.phone || '--',
        region: '',
        status: value.renewalStatus === '停用' ? 'frozen' : value.renewalStatus === '即将到期' ? 'expiring' : 'normal',
        expireDate: value.afterSalesExpireAt || '',
        createdAt: value.paidAt || '',
        availableAccounts: []
      },
      ...list.value
    ]
    showUserForm.value = false
    done({ success: true, message: '新增成功' })
  } catch (error: any) {
    done({ success: false, error: error?.message || '新增失败，请稍后重试' })
  }
}

function toggleStatus() {
  const order: Array<'all' | UserStatus> = ['all', 'normal', 'expiring', 'frozen']
  const current = order.indexOf(status.value)
  status.value = order[(current + 1) % order.length]
}

function reset() {
  keyword.value = ''
  status.value = 'all'
  load()
}

function confirmFilter() {
  showFilter.value = false
  load()
}

function remainText(expireDate: string) {
  const days = remainDays(expireDate)
  return `剩余${days}天`
}

function remainDays(expireDate: string) {
  if (!expireDate) return 0
  const today = new Date()
  const expire = new Date(`${expireDate}T00:00:00`)
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = Math.ceil((expire.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))

  return diffDays < 0 ? 0 : diffDays
}

function remainBadgeType(expireDate: string) {
  if (!expireDate) return 'default'
  const today = new Date()
  const expire = new Date(`${expireDate}T00:00:00`)
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = Math.ceil((expire.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays > 30) return 'success'
  if (diffDays >= 0) return 'warning'
  return 'danger'
}

function simulateDbDelay() {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 900)
  })
}
</script>

<style scoped lang="scss">
.list-wrap {
  padding: 16rpx 24rpx 24rpx;
}

.list-card {
  min-height: 188rpx;
  padding: 28rpx;
  margin-bottom: 22rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.card-main {
  flex: 1;
  min-width: 0;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 14rpx;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  flex: 0 0 132rpx;
  font-size: 26rpx;
  color: #667085;
}

.info-value {
  flex: 1;
  text-align: left;
  font-size: 28rpx;
  color: var(--text);
  font-weight: 600;
}

.info-code {
  letter-spacing: 1rpx;
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 24rpx;
}

.remain-badge {
  min-width: 128rpx;
  padding: 14rpx 18rpx;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}

.remain-badge.success {
  background: #e9f9f1;
  color: #10a55a;
}

.remain-badge.warning {
  background: #fff3e2;
  color: #f97316;
}

.remain-badge.danger {
  background: #ffecec;
  color: #ef4444;
}

.remain-badge.default {
  background: #eef1f6;
  color: #667085;
}

.remain-text {
  font-size: 24rpx;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
}

.detail-link {
  color: var(--primary);
  font-size: 28rpx;
  font-weight: 700;
}

.filter-panel {
  padding: 28rpx 28rpx 36rpx;
}

.filter-title {
  font-size: 34rpx;
  font-weight: 800;
  margin-bottom: 18rpx;
}

.filter-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 28rpx;
}

.filter-action {
  flex: 1;
  height: 80rpx !important;
  border-radius: 18rpx !important;
}
</style>
