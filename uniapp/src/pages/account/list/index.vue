<template>
  <view class="safe-page">
    <AppHeader title="账号列表" right-icon="+" show-tabbar @right="addAccount" />
    <ListToolbar
      v-model="keyword"
      placeholder="搜索账号 / 账号编号"
      :chips="chips"
      @search="refreshList"
      @filter="showFilter = true"
    />

    <view class="list-wrap">
      <view v-for="item in list" :key="item.id" class="list-card card" @click="openDetail(item.id)">
        <view class="card-main">
          <view class="info-row">
            <text class="info-label">账号编号</text>
            <text class="info-value info-code">{{ item.code }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">Adobe账号</text>
            <text class="info-value">{{ item.name }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">售后到期日</text>
            <text class="info-value">{{ item.expireDate }}</text>
          </view>
        </view>
        <view class="card-right">
          <view class="remain-badge" :class="remainBadgeType(item.expireDate)">
            <text class="remain-text">{{ remainText(item.expireDate) }}</text>
          </view>
          <text class="detail-link">详情 ></text>
        </view>
      </view>
      <view v-if="!list.length" class="empty-tip">暂无账号数据</view>
      <view v-else-if="loadingMore" class="list-tip">加载中...</view>
      <view v-else-if="!hasMore" class="list-tip">没有更多数据了</view>
    </view>

    <wd-popup v-model="showFilter" position="bottom" custom-class="filter-popup" safe-area-inset-bottom>
      <view class="filter-panel">
        <view class="filter-title">筛选账号</view>
        <wd-cell title="状态" :value="statusLabel" is-link @click="toggleStatus" />
        <wd-cell title="到期范围" value="最近30天" is-link />
        <view class="filter-actions">
          <wd-button custom-class="filter-action" plain @click="reset">重置</wd-button>
          <wd-button custom-class="filter-action" type="primary" @click="confirmFilter">确认</wd-button>
        </view>
      </view>
    </wd-popup>

    <AccountFormPopup
      v-model="showAccountForm"
      mode="add"
      @submit="handleSubmitAccount"
    />

    <wd-backtop :scroll-top="scrollTop" :top="80" :bottom="96" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import { usePageScrollTop } from '@/composables/usePageScrollTop'
import { createAccount, fetchAccounts } from '@/api/account'
import AccountFormPopup from '@/components/AccountFormPopup.vue'
import AppHeader from '@/components/AppHeader.vue'
import ListToolbar from '@/components/ListToolbar.vue'
import type { AccountItem, AccountStatus } from '@/types'
import { accountStatusText } from '@/utils/status'

const keyword = ref('')
const status = ref<'all' | AccountStatus>('all')
const showFilter = ref(false)
const showAccountForm = ref(false)
const list = ref<AccountItem[]>([])
const currentPage = ref(1)
const pageSize = 10
const hasMore = ref(true)
const loading = ref(false)
const loadingMore = ref(false)

const { scrollTop } = usePageScrollTop()

const statusLabel = computed(() => (status.value === 'all' ? '全部' : accountStatusText(status.value)))
const chips = computed(() => [
  { label: `状态：${statusLabel.value}` },
  { label: '到期：最近30天' }
])

onShow(refreshList)
onMounted(refreshList)
onReachBottom(loadMore)

async function load(reset = false) {
  if (reset) {
    currentPage.value = 1
    hasMore.value = true
  }
  if (reset && loading.value) return
  if (!reset && (loadingMore.value || !hasMore.value)) return

  reset ? (loading.value = true) : (loadingMore.value = true)
  try {
    const items = await fetchAccounts({
      keyword: keyword.value,
      status: status.value,
      page: currentPage.value,
      pageSize
    })
    list.value = reset ? items : [...list.value, ...items]
    hasMore.value = items.length === pageSize
    if (items.length > 0) {
      currentPage.value += 1
    }
  } catch (error: any) {
    if (reset) {
      list.value = []
    }
    uni.showToast({ title: error?.message || '加载账号失败', icon: 'none' })
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function refreshList() {
  return load(true)
}

function loadMore() {
  return load(false)
}

function openDetail(id: string) {
  uni.navigateTo({ url: `/pages/account/detail/index?id=${id}` })
}

function addAccount() {
  showAccountForm.value = true
}

async function handleSubmitAccount(
  value: any,
  done: (result?: { success?: boolean; message?: string; error?: string }) => void
) {
  try {
    await createAccount(value)
    await refreshList()
    showAccountForm.value = false
    done({ success: true, message: '新增成功' })
  } catch (error: any) {
    done({ success: false, error: error?.message || '新增失败，请稍后重试' })
  }
}

function toggleStatus() {
  const order: Array<'all' | AccountStatus> = ['all', 'normal', 'expiring', 'disabled']
  const current = order.indexOf(status.value)
  status.value = order[(current + 1) % order.length]
}

function reset() {
  keyword.value = ''
  status.value = 'all'
  refreshList()
}

function confirmFilter() {
  showFilter.value = false
  refreshList()
}

function remainText(expireDate: string) {
  const days = remainDays(expireDate)
  return `剩余${days}天`
}

function remainDays(expireDate: string) {
  const today = new Date()
  const expire = new Date(`${expireDate}T00:00:00`)
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = Math.ceil((expire.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))

  return diffDays < 0 ? 0 : diffDays
}

function remainBadgeType(expireDate: string) {
  const today = new Date()
  const expire = new Date(`${expireDate}T00:00:00`)
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = Math.ceil((expire.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays > 30) return 'success'
  if (diffDays >= 0) return 'warning'
  return 'danger'
}

</script>

<style scoped lang="scss">
.list-wrap {
  padding: 16rpx 24rpx 24rpx;
}

.list-tip {
  text-align: center;
  color: #98a2b3;
  font-size: 24rpx;
  padding: 8rpx 0 20rpx;
}

.list-card {
  min-height: 188rpx;
  padding: 28rpx;
  margin-bottom: 22rpx;
  display: flex;
  align-items: flex-start;
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
  padding-top: 2rpx;
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
