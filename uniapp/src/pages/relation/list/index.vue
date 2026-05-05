<template>
  <view class="safe-page">
    <AppHeader title="关系列表" right-icon="+" show-tabbar @right="addRelation" />
    <ListToolbar
      v-model="keyword"
      placeholder="搜索账号 / 用户"
      :chips="chips"
      @search="load"
      @filter="showFilter = true"
    />

    <view class="list-wrap">
      <view v-for="item in list" :key="item.id" class="relation-card card">
        <view class="relation-top">
          <view class="entity account">
            <text class="entity-icon">■</text>
            <text class="entity-name">{{ item.accountName }}</text>
          </view>
          <view class="link-area" :class="statusType(currentStatus(item))">
            <view class="dash"></view>
            <text class="link-icon">⟷</text>
            <view class="dash"></view>
          </view>
          <view class="entity user">
            <text class="entity-icon">●</text>
            <text class="entity-name">{{ currentStatus(item) === 'bound' ? (item.userName || '未绑定') : '未绑定' }}</text>
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
import { fetchRelations } from '@/api/relation'
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

const { scrollTop } = usePageScrollTop()

const statusLabel = computed(() => (status.value === 'all' ? '全部' : relationStatusText(status.value)))
const chips = computed(() => [{ label: '关系：全部' }, { label: `状态：${statusLabel.value}` }])

onMounted(load)

async function load() {
  list.value = await fetchRelations({ keyword: keyword.value, status: status.value })
  const roleNext: Record<string, 'primary' | 'backup'> = {}
  const stateNext: Record<string, RelationStatus> = {}
  list.value.forEach((item, index) => {
    roleNext[item.id] = roleState.value[item.id] || (index === 0 ? 'primary' : 'backup')
    stateNext[item.id] = relationState.value[item.id] || item.status
  })
  roleState.value = roleNext
  relationState.value = stateNext
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
  load()
}

function confirmFilter() {
  showFilter.value = false
  load()
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

function togglePrimary(id: string) {
  roleState.value[id] = currentRole(id) === 'primary' ? 'backup' : 'primary'
}

function toggleRelation(id: string) {
  const next: RelationStatus = (relationState.value[id] || 'bound') === 'bound' ? 'unbound' : 'bound'
  relationState.value[id] = next
}

function removeRelation(id: string) {
  confirmDanger('确认删除这条绑定关系吗？', '危险操作', async () => {
    await simulateDbDelay()
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
    await simulateDbDelay()
    const id = `r_${Date.now()}`
    const nextItem: RelationItem = {
      id,
      accountId: value.accountId,
      accountName: value.accountName || value.accountCode,
      userId: value.userId,
      userName: `${value.userCode} ${value.userName}`,
      status: 'bound',
      updatedAt: value.bindDate
    }
    list.value = [nextItem, ...list.value]
    roleState.value[id] = value.role
    relationState.value[id] = 'bound'
    showBindForm.value = false
    done({ success: true, message: '新增绑定成功' })
  } catch (error: any) {
    done({ success: false, error: error?.message || '新增绑定失败，请重试' })
  }
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
  font-size: 34rpx;
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

