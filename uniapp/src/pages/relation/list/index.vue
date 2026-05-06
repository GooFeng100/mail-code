<template>
  <view class="safe-page">
    <AppHeader title="关系列表" right-icon="+" show-tabbar @right="addRelation" />
    <ListToolbar
      v-model="keyword"
      placeholder="搜索账号 / 用户"
      :chips="chips"
      @search="refreshList"
      @filter="showFilter = true"
    />

    <view class="list-wrap">
      <view v-for="item in list" :key="item.id" class="relation-card card">
        <view class="relation-top">
          <view class="entity account">
            <wd-icon class="entity-icon" name="books" size="18px" color="#1155d9" />
            <text class="entity-name">{{ accountAlias(item.accountName) }}</text>
          </view>
          <view class="link-area" :class="statusType(currentStatus(item))">
            <view class="dash"></view>
            <text class="link-icon">⟷</text>
            <view class="dash"></view>
          </view>
          <view class="entity user">
            <wd-icon class="entity-icon" name="user" size="18px" color="#079455" />
            <text class="entity-name">{{ displayUserName(item) }}</text>
          </view>
        </view>
        <view class="relation-bottom">
          <StatusTag :text="relationStatusText(currentStatus(item))" :type="relationTagType(currentStatus(item))" />
          <view class="valid-pill" :class="{ invalid: currentStatus(item) !== 'bound' }">
            {{ currentStatus(item) === 'bound' ? '有效' : '无效' }}
          </view>
          <text class="time">绑定日期：{{ item.updatedAt }}</text>
        </view>
        <view class="relation-actions">
          <view class="role-switch" @click="togglePrimary(item.id)">
            <text class="role-option" :class="{ active: currentRole(item.id) === 'primary' }">主</text>
            <text class="role-option" :class="{ active: currentRole(item.id) === 'backup' }">备</text>
          </view>
          <view class="mini-action" @click="toggleRelation(item.id)">
            {{ currentStatus(item) === 'bound' ? '解绑' : '恢复' }}
          </view>
          <view class="mini-action danger-action" @click="removeRelation(item.id)">删除</view>
        </view>
      </view>
      <view v-if="!list.length" class="empty-tip">暂无关系数据</view>
      <view v-else-if="loadingMore" class="list-tip">加载中...</view>
      <view v-else-if="!hasMore" class="list-tip">没有更多数据了</view>
    </view>

    <wd-popup v-model="showFilter" position="bottom" safe-area-inset-bottom>
      <view class="filter-panel">
        <view class="filter-title">筛选关系</view>
        <wd-cell title="关系" value="全部" is-link />
        <wd-cell title="状态" :value="statusLabel" is-link @click="toggleStatus" />
        <view class="filter-actions">
          <wd-button custom-class="filter-action" plain @click="reset">重置</wd-button>
          <wd-button custom-class="filter-action" type="primary" @click="confirmFilter">确认</wd-button>
        </view>
      </view>
    </wd-popup>

    <RelationBindPopup
      v-model="showBindForm"
      @submit="handleCreateBind"
    />
    <GlobalConfirmDialog />

    <wd-backtop :scroll-top="scrollTop" :top="80" :bottom="96" />
  </view>
</template>

<script setup lang="ts">
import { usePageScrollTop } from '@/composables/usePageScrollTop'
import { computed, onMounted, ref } from 'vue'
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import { createRelation, deleteRelation, fetchRelations, updateRelationActive, updateRelationRole } from '@/api/relation'
import AppHeader from '@/components/AppHeader.vue'
import GlobalConfirmDialog from '@/components/GlobalConfirmDialog.vue'
import ListToolbar from '@/components/ListToolbar.vue'
import RelationBindPopup from '@/components/RelationBindPopup.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { RelationItem, RelationStatus } from '@/types'
import { relationStatusText, statusType } from '@/utils/status'
import { confirmDanger } from '@/utils/confirm'

const keyword = ref('')
const status = ref<'all' | RelationStatus>('all')
const showFilter = ref(false)
const showBindForm = ref(false)
const list = ref<RelationItem[]>([])
const roleState = ref<Record<string, 'primary' | 'backup'>>({})
const relationState = ref<Record<string, RelationStatus>>({})
const currentPage = ref(1)
const pageSize = 10
const hasMore = ref(true)
const loading = ref(false)
const loadingMore = ref(false)

const { scrollTop } = usePageScrollTop()

const statusLabel = computed(() => (status.value === 'all' ? '全部' : relationStatusText(status.value)))
const chips = computed(() => [{ label: '关系：全部' }, { label: `状态：${statusLabel.value}` }])

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
    const items = await fetchRelations({
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
    syncRelationState(items, reset)
  } catch (error: any) {
    if (reset) {
      list.value = []
      roleState.value = {}
      relationState.value = {}
    }
    uni.showToast({ title: error?.message || '加载关系失败', icon: 'none' })
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function syncRelationState(items: RelationItem[], reset: boolean) {
  const roleNext: Record<string, 'primary' | 'backup'> = reset ? {} : { ...roleState.value }
  const stateNext: Record<string, RelationStatus> = reset ? {} : { ...relationState.value }

  items.forEach((item) => {
    if (reset || !roleNext[item.id]) {
      roleNext[item.id] = item.assignmentRole || 'backup'
    }
    if (reset || !stateNext[item.id]) {
      stateNext[item.id] = item.status
    }
  })

  roleState.value = roleNext
  relationState.value = stateNext
}

function refreshList() {
  return load(true)
}

function loadMore() {
  return load(false)
}

function addRelation() {
  showBindForm.value = true
}

function toggleStatus() {
  const order: Array<'all' | RelationStatus> = ['all', 'bound', 'unbound']
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

function relationTagType(status: RelationStatus): 'success' | 'danger' {
  if (status === 'bound') return 'success'
  return 'danger'
}

function currentRole(id: string) {
  return roleState.value[id] || 'backup'
}

function currentStatus(item: RelationItem) {
  return relationState.value[item.id] || item.status
}

function accountAlias(accountName?: string) {
  const value = String(accountName || '').trim()
  if (!value) return '--'
  const atIndex = value.indexOf('@')
  return atIndex > 0 ? value.slice(0, atIndex) : value
}

function displayUserName(item: RelationItem) {
  return String(item.userName || '').trim() || '未绑定'
}

async function togglePrimary(id: string) {
  try {
    const nextRole: 'primary' | 'backup' = currentRole(id) === 'primary' ? 'backup' : 'primary'
    await updateRelationRole(id, nextRole)
    roleState.value[id] = nextRole
    const target = list.value.find((item) => item.id === id)
    if (target) {
      target.assignmentRole = nextRole
    }
    uni.showToast({ title: '切换成功', icon: 'none' })
  } catch (error: any) {
    uni.showToast({ title: error?.message || '切换失败', icon: 'none' })
  }
}

async function toggleRelation(id: string) {
  try {
    const target = list.value.find((item) => item.id === id)
    if (!target) return

    const current = currentStatus(target)
    const nextActive = current !== 'bound'
    if (nextActive && target.canRestore === false) {
      uni.showToast({ title: '该关系不可恢复', icon: 'none' })
      return
    }

    await updateRelationActive(id, nextActive)
    const next: RelationStatus = nextActive ? 'bound' : 'unbound'
    relationState.value[id] = next
    target.status = next
    target.active = nextActive
    uni.showToast({ title: nextActive ? '恢复成功' : '解绑成功', icon: 'none' })
  } catch (error: any) {
    uni.showToast({ title: error?.message || '操作失败', icon: 'none' })
  }
}

function removeRelation(id: string) {
  confirmDanger('确认删除这条绑定关系吗？', '危险操作', async () => {
    await deleteRelation(id)
    list.value = list.value.filter((item) => item.id !== id)
    delete roleState.value[id]
    delete relationState.value[id]
    return { success: true, message: '删除成功' }
  })
}

async function handleCreateBind(
  value: {
  bindDate: string
  role: 'primary' | 'backup'
  accountId: string
  accountCode: string
  accountName: string
  userId: string
  userCode: string
  userName: string
  },
  done: (result?: { success?: boolean; message?: string; error?: string }) => void
) {
  try {
    await createRelation(value)
    await refreshList()
    showBindForm.value = false
    done({ success: true, message: '新增绑定成功' })
  } catch (error: any) {
    done({ success: false, error: error?.message || '新增绑定失败，请重试' })
  }
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

.relation-card {
  padding: 28rpx;
  margin-bottom: 22rpx;
}

.relation-top {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.entity {
  flex: 1;
  height: 76rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.account {
  background: #edf5ff;
  color: #1155d9;
}

.user {
  background: #ecfbf4;
  color: #079455;
}

.entity-icon {
  flex: 0 0 auto;
}

.entity-name {
  max-width: 160rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.link-area {
  flex: 0 0 136rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
}

.link-icon {
  font-size: 36rpx;
  margin: 0 10rpx;
}

.dash {
  flex: 1;
  border-top: 2rpx dashed #c4d7f7;
}

.link-area.danger,
.link-area.default {
  color: #98a2b3;
}

.link-area.warning {
  color: #f97316;
}

.relation-bottom {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  flex-wrap: wrap;
  margin-top: 20rpx;
}

.time {
  color: #8a93a3;
  font-size: 24rpx;
}

.relation-actions {
  margin-top: 18rpx;
  display: flex;
  gap: 12rpx;
  align-items: center;
}

.mini-action {
  min-width: 88rpx;
  height: 48rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  border: 1rpx solid #cfe0ff;
  background: #f8fbff;
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 23rpx;
  font-weight: 700;
}

.role-switch {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 4rpx;
  border: 1rpx solid #cfe0ff;
  border-radius: 999rpx;
  background: #f8fbff;
}

.role-option {
  min-width: 44rpx;
  height: 40rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 22rpx;
  font-weight: 700;
}

.role-option.active {
  background: var(--primary);
  color: #ffffff;
}

.valid-pill {
  min-width: 86rpx;
  height: 42rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  background: #e9f9f1;
  color: #10a55a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
}

.valid-pill.invalid {
  background: #ffecec;
  color: #ef4444;
}

.danger-action {
  border-color: #ef4444;
  background: #ef4444;
  color: #ffffff;
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

