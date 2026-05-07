<template>
  <view class="safe-page">
    <AppHeader title="用户列表" right-icon="+" show-tabbar @right="addUser" />
    <ListToolbar
      v-model="keyword"
      placeholder="搜索用户 / 联系方式"
      :chips="chips"
      @search="refreshList"
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
          <view class="remain-badge" :class="remainBadgeType(item)">
            <text class="remain-text">{{ remainText(item) }}</text>
          </view>
          <text class="detail-link">详情 ></text>
        </view>
      </view>
      <view v-if="!list.length" class="empty-tip">暂无用户数据</view>
      <view v-else-if="loadingMore" class="list-tip">加载中...</view>
      <view v-else-if="!hasMore" class="list-tip">没有更多数据了</view>
    </view>

    <wd-popup v-model="showFilter" position="bottom" safe-area-inset-bottom>
      <view class="filter-panel">
        <view class="filter-title">筛选用户</view>
        <wd-cell title="筛选条件" :value="filterLabel" is-link @click="toggleFilterType" />
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
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import { createUser, fetchUsers } from '@/api/user'
import AppHeader from '@/components/AppHeader.vue'
import ListToolbar from '@/components/ListToolbar.vue'
import UserFormPopup from '@/components/UserFormPopup.vue'
import type { UserItem } from '@/types'

const keyword = ref('')
type UserFilterType = 'recent30' | 'normal' | 'expired'
type UserFilterState = 'all' | UserFilterType
const filterType = ref<UserFilterState>('all')
const showFilter = ref(false)
const showUserForm = ref(false)
const list = ref<UserItem[]>([])
const currentPage = ref(1)
const pageSize = 10
const hasMore = ref(true)
const serverHasMore = ref(true)
const pendingItems = ref<UserItem[]>([])
const loading = ref(false)
const loadingMore = ref(false)

const { scrollTop } = usePageScrollTop()

const filterLabel = computed(() => {
  if (filterType.value === 'all') return '全部'
  if (filterType.value === 'recent30') return '最近30天到期'
  if (filterType.value === 'normal') return '正常'
  return '过期'
})
const chips = computed(() => {
  if (filterType.value === 'all') return []
  return [
    {
      label: `筛选：${filterLabel.value}`,
      removable: true,
      onRemove: clearFilter
    }
  ]
})

onShow(refreshList)
onMounted(refreshList)
onReachBottom(loadMore)

async function load(reset = false) {
  if (reset) {
    currentPage.value = 1
    hasMore.value = true
    serverHasMore.value = true
    pendingItems.value = []
  }
  if (reset && loading.value) return
  if (!reset && (loadingMore.value || !hasMore.value)) return

  reset ? (loading.value = true) : (loadingMore.value = true)
  try {
    const pageItems: UserItem[] = []

    while (pageItems.length < pageSize && pendingItems.value.length > 0) {
      pageItems.push(pendingItems.value.shift() as UserItem)
    }

    while (pageItems.length < pageSize && serverHasMore.value) {
      const remoteItems = await fetchUsers({
        keyword: keyword.value,
        status: 'all',
        page: currentPage.value,
        pageSize
      })
      currentPage.value += 1
      if (remoteItems.length < pageSize) {
        serverHasMore.value = false
      }

      const filtered = remoteItems.filter(matchFilter)
      while (pageItems.length < pageSize && filtered.length > 0) {
        pageItems.push(filtered.shift() as UserItem)
      }
      if (filtered.length > 0) {
        pendingItems.value.push(...filtered)
      }
    }

    list.value = reset ? pageItems : [...list.value, ...pageItems]
    hasMore.value = pendingItems.value.length > 0 || serverHasMore.value
  } catch (error: any) {
    if (reset) {
      list.value = []
    }
    uni.showToast({ title: error?.message || '加载用户失败', icon: 'none' })
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
    await createUser(value)
    await refreshList()
    showUserForm.value = false
    done({ success: true, message: '新增成功' })
  } catch (error: any) {
    done({ success: false, error: error?.message || '新增失败，请稍后重试' })
  }
}

function toggleFilterType() {
  const order: UserFilterType[] = ['recent30', 'normal', 'expired']
  if (filterType.value === 'all') {
    filterType.value = order[0]
    return
  }
  const current = order.indexOf(filterType.value as UserFilterType)
  filterType.value = order[(current + 1) % order.length]
}

function reset() {
  keyword.value = ''
  filterType.value = 'all'
  refreshList()
}

function clearFilter() {
  filterType.value = 'all'
  refreshList()
}

function confirmFilter() {
  showFilter.value = false
  refreshList()
}

function remainText(item: UserItem) {
  const days = Math.max(0, getRemainingDays(item))
  return `剩余${days}天`
}

function calcDaysByDate(expireDate: string) {
  if (!expireDate) return 0
  const today = new Date()
  const expire = new Date(`${expireDate}T00:00:00`)
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = Math.ceil((expire.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))
  return Number.isFinite(diffDays) ? diffDays : 0
}

function getRemainingDays(item: UserItem) {
  if (Number.isFinite(Number(item.remainingDays))) return Number(item.remainingDays)
  return calcDaysByDate(item.afterSalesExpireAt || item.expireDate)
}

function matchFilter(item: UserItem) {
  if (filterType.value === 'all') return true
  const days = getRemainingDays(item)
  if (filterType.value === 'recent30') return days >= 0 && days <= 30
  if (filterType.value === 'normal') return days >= 0
  return days < 0
}

function remainBadgeType(item: UserItem) {
  const diffDays = getRemainingDays(item)
  if (diffDays > 30) return 'success'
  if (diffDays >= 0) return 'warning'
  return 'danger'
}

</script>

<style scoped lang="scss">
.list-wrap {
  padding: 0 24rpx 24rpx;
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
  padding: 28rpx 28rpx calc(220rpx + env(safe-area-inset-bottom));
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
