<template>
  <view class="detail-page">
    <AppHeader title="用户详情" back show-tabbar @left="back" />
    <view class="content">
      <InfoCard title="基础信息" :rows="baseRows">
        <template #actions>
          <view class="section-actions">
            <view class="mini-action" @click="editUser">编辑</view>
            <view class="mini-action danger-action" @click="removeUser">删除</view>
          </view>
        </template>
        <template #remainDays>
          <text class="remain-days" :class="remainDaysClass(user.remainingDays)">{{ displayRemainingDays(user.remainingDays) }}</text>
        </template>
        <template #renewalStatus>
          <StatusTag :text="displayRenewalStatus(user.renewalStatus)" :type="renewalStatusType(user.renewalStatus)" />
        </template>
      </InfoCard>

      <InfoCard title="绑定关系" :rows="[]">
        <template #actions>
          <view class="section-actions">
            <view class="mini-action" @click="addBinding">新增绑定</view>
          </view>
        </template>
        <view class="binding-list">
          <view
            v-for="(item, idx) in bindingDisplayList"
            :key="bindingKey(item.accountCode, idx)"
            class="binding-item"
          >
            <view class="binding-summary" @click="toggleBinding(bindingKey(item.accountCode, idx))">
              <text class="summary-code">{{ item.accountCode }}</text>
              <text class="summary-arrow" :class="{ open: isBindingExpanded(bindingKey(item.accountCode, idx)) }">⌃</text>
            </view>
            <view v-show="isBindingExpanded(bindingKey(item.accountCode, idx))">
              <view class="binding-row row-line">
                <text class="binding-label">账号编号</text>
                <text class="binding-value">{{ item.accountCode }}</text>
              </view>
              <view class="binding-row row-line">
                <text class="binding-label">Adobe账号</text>
                <text class="binding-value">{{ item.accountName }}</text>
              </view>
              <view class="binding-row row-line">
                <text class="binding-label">账号计划</text>
                <text class="binding-value">{{ item.purchasePlan }}</text>
              </view>
              <view class="binding-row row-line">
                <text class="binding-label">主备</text>
                <view class="primary-switch" @click.stop="togglePrimary(item)">
                  <text class="primary-option" :class="{ active: item.role === 'primary' }">主</text>
                  <text class="primary-option" :class="{ active: item.role === 'backup' }">备</text>
                </view>
              </view>
              <view class="binding-row row-line">
                <text class="binding-label">到期日</text>
                <text class="binding-value">{{ item.afterSalesExpireAt }}</text>
              </view>
              <view class="binding-row row-line">
                <text class="binding-label">剩余天数</text>
                <text class="binding-value days" :class="remainDaysClass(item.remainingDays)">{{ displayRemainingDays(item.remainingDays) }}</text>
              </view>
              <view class="binding-row">
                <text class="binding-label">状态</text>
                <StatusTag :text="displayRenewalStatus(item.status || item.renewalStatus)" :type="renewalStatusType(item.status || item.renewalStatus)" />
              </view>
            </view>
          </view>
        </view>
      </InfoCard>

      <InfoCard title="续费详情" :rows="[]">
        <template #actions>
          <view class="section-actions">
            <view class="mini-action primary-action" @click="renew">续费</view>
          </view>
        </template>
        <view class="binding-list">
          <view
            v-for="(item, idx) in renewalDisplayList"
            :key="renewalKey(item.renewalDate, idx)"
            class="binding-item"
          >
            <view class="binding-summary" @click="toggleRenewal(renewalKey(item.renewalDate, idx))">
              <text class="summary-code">{{ item.renewalDate }}</text>
              <text class="summary-arrow" :class="{ open: isRenewalExpanded(renewalKey(item.renewalDate, idx)) }">⌃</text>
            </view>
            <view v-show="isRenewalExpanded(renewalKey(item.renewalDate, idx))">
              <view class="binding-row row-line">
                <text class="binding-label">续费日期</text>
                <text class="binding-value">{{ item.renewalDate }}</text>
              </view>
              <view class="binding-row row-line">
                <text class="binding-label">续费套餐</text>
                <text class="binding-value">{{ item.packageName }}</text>
              </view>
              <view class="binding-row row-line">
                <text class="binding-label">增加天数</text>
                <text class="binding-value">{{ item.increaseDays }}天</text>
              </view>
              <view class="binding-row row-line">
                <text class="binding-label">续费前到期日</text>
                <text class="binding-value">{{ item.beforeExpireAt }}</text>
              </view>
              <view class="binding-row row-line">
                <text class="binding-label">续费后到期日</text>
                <text class="binding-value">{{ item.afterExpireAt }}</text>
              </view>
              <view class="binding-row row-line">
                <text class="binding-label">备注</text>
                <text class="binding-value">{{ item.remark || '--' }}</text>
              </view>
              <view class="binding-row">
                <text class="binding-label">操作</text>
                <view class="mini-action danger-action" @click="renewAction(item, idx)">{{ item.actionText }}</view>
              </view>
            </view>
          </view>
        </view>
      </InfoCard>
    </view>

    <wd-backtop :scroll-top="scrollTop" :top="80" :bottom="96" />
    <UserFormPopup
      v-model="showUserForm"
      mode="edit"
      :user="user"
      @submit="handleSubmitUser"
    />
    <RelationBindPopup
      v-model="showBindForm"
      :preset-user="{
        id: user.id,
        code: user.code,
        name: user.name
      }"
      lock-user
      @submit="handleBindSubmit"
    />
    <RenewalFormPopup
      v-model="showRenewalForm"
      subject-label="用户"
      :previous-expire-at="user.afterSalesExpireAt || user.expireDate"
      @submit="handleRenewSubmit"
    />
    <GlobalConfirmDialog />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { usePageScrollTop } from '@/composables/usePageScrollTop'
import { createUserRenewal, deleteUser, deleteUserRenewal, fetchUserDetail, updateUser } from '@/api/user'
import { createRelation, updateRelationRole } from '@/api/relation'
import AppHeader from '@/components/AppHeader.vue'
import GlobalConfirmDialog from '@/components/GlobalConfirmDialog.vue'
import InfoCard from '@/components/InfoCard.vue'
import RelationBindPopup from '@/components/RelationBindPopup.vue'
import RenewalFormPopup from '@/components/RenewalFormPopup.vue'
import StatusTag from '@/components/StatusTag.vue'
import UserFormPopup from '@/components/UserFormPopup.vue'
import type { UserItem } from '@/types'
import { back } from '@/utils/nav'
import { confirmDanger } from '@/utils/confirm'

const { scrollTop } = usePageScrollTop()
const bindingExpanded = ref<Record<string, boolean>>({})
const renewalExpanded = ref<Record<string, boolean>>({})
const showUserForm = ref(false)
const showBindForm = ref(false)
const showRenewalForm = ref(false)
const userId = ref('')

const user = ref<UserItem>({
  id: '',
  code: '',
  name: '',
  phone: '',
  region: '',
  status: 'normal',
  expireDate: '',
  createdAt: '',
  availableAccounts: []
})

function readUserIdFromCurrentPages() {
  const pages = getCurrentPages() as Array<{ options?: { id?: string; userId?: string } }>
  const current = pages[pages.length - 1]?.options || {}
  return String(current.id || current.userId || '')
}

onLoad(async (options) => {
  userId.value = String((options?.id || options?.userId || '') as string)
  if (!userId.value) {
    userId.value = readUserIdFromCurrentPages()
  }
  if (!userId.value) {
    uni.showToast({ title: '缺少用户ID', icon: 'none' })
    return
  }
  await loadDetail()
})

async function loadDetail() {
  if (!userId.value) return
  user.value = await fetchUserDetail(userId.value)
}

const baseRows = computed(() => [
  { label: '用户编号：', value: user.value.code || '--' },
  { label: '用户昵称：', value: user.value.name || '--' },
  { label: '联系方式：', value: user.value.phone || '--' },
  { label: '首付日期：', value: user.value.paidAt || user.value.createdAt || '--' },
  { label: '购买计划：', value: user.value.purchasePlan || '--' },
  { label: '售后日期：', value: user.value.afterSalesExpireAt || user.value.expireDate || '--' },
  { label: '剩余天数：', slot: 'remainDays' },
  { label: '续费状态：', slot: 'renewalStatus' },
  { label: '备注：', value: user.value.remark || '--' }
])

const bindingList = computed(() => user.value.bindings || [])
const bindingDisplayList = computed(() => {
  if (bindingList.value.length) return bindingList.value

  return [
    {
      accountCode: '--',
      accountName: '未绑定账号',
      purchasePlan: user.value.purchasePlan || '--',
      afterSalesExpireAt: user.value.afterSalesExpireAt || user.value.expireDate || '--',
      remainingDays: Number(user.value.remainingDays ?? remainDaysFromDate(user.value.afterSalesExpireAt || user.value.expireDate)),
      renewalStatus: '未绑定',
      status: '未绑定',
      role: 'backup'
    }
  ]
})

const renewals = computed(() => user.value.renewals || [])
const renewalDisplayList = computed(() => {
  if (renewals.value.length) return renewals.value

  return [
    {
      renewalDate: '--',
      packageName: '--',
      increaseDays: 0,
      beforeExpireAt: '--',
      afterExpireAt: '--',
      remark: '暂无续费记录',
      actionText: '删除'
    }
  ]
})

watch(
  bindingDisplayList,
  (list) => {
    const next: Record<string, boolean> = {}
    list.forEach((item, idx) => {
      const key = bindingKey(item.accountCode, idx)
      next[key] = bindingExpanded.value[key] ?? false
    })
    bindingExpanded.value = next
  },
  { immediate: true }
)

watch(
  renewalDisplayList,
  (list) => {
    const next: Record<string, boolean> = {}
    list.forEach((item, idx) => {
      const key = renewalKey(item.renewalDate, idx)
      next[key] = renewalExpanded.value[key] ?? false
    })
    renewalExpanded.value = next
  },
  { immediate: true }
)

function bindingKey(accountCode: string, idx: number) {
  return `${accountCode}-${idx}`
}

function renewalKey(renewalDate: string, idx: number) {
  return `${renewalDate}-${idx}`
}

function isBindingExpanded(key: string) {
  return bindingExpanded.value[key] !== false
}

function isRenewalExpanded(key: string) {
  return renewalExpanded.value[key] !== false
}

function toggleBinding(key: string) {
  bindingExpanded.value[key] = !isBindingExpanded(key)
}

function toggleRenewal(key: string) {
  renewalExpanded.value[key] = !isRenewalExpanded(key)
}

function renewAction(item: { id?: string; initial?: boolean; actionText: string; renewalDate: string }) {
  if (item.actionText !== '删除') {
    uni.showToast({ title: item.actionText || '不可操作', icon: 'none' })
    return
  }
  if (!item.id) {
    uni.showToast({ title: '暂无可删除记录', icon: 'none' })
    return
  }
  if (item.initial) {
    uni.showToast({ title: '基准记录不支持删除', icon: 'none' })
    return
  }
  confirmDanger('确认删除这条续费记录吗？', '危险操作', async () => {
    await deleteUserRenewal(user.value.id, item.id as string)
    await loadDetail()
    return { success: true, message: '删除成功' }
  })
}

function editUser() {
  showUserForm.value = true
}

function removeUser() {
  confirmDanger('确认删除当前用户吗？', '危险操作', async () => {
    await deleteUser(user.value.id)
    setTimeout(() => {
      back()
    }, 150)
    return { success: true, message: '删除成功' }
  })
}

function addBinding() {
  showBindForm.value = true
}

function renew() {
  showRenewalForm.value = true
}

async function handleRenewSubmit(
  value: { planId: string; renewalDate: string; remark: string },
  done: (result?: { success?: boolean; message?: string; error?: string }) => void
) {
  try {
    await createUserRenewal(user.value.id, value)
    await loadDetail()
    showRenewalForm.value = false
    done({ success: true, message: '续费成功' })
  } catch (error: any) {
    done({ success: false, error: error?.message || '续费失败，请稍后重试' })
  }
}

async function handleSubmitUser(
  value: any,
  done: (result?: { success?: boolean; message?: string; error?: string }) => void
) {
  try {
    await updateUser(user.value.id, value)
    await loadDetail()
    showUserForm.value = false
    showBindForm.value = false
    done({ success: true, message: '保存成功' })
  } catch (error: any) {
    done({ success: false, error: error?.message || '保存失败，请稍后重试' })
  }
}

async function handleBindSubmit(
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
    await createRelation({
      accountId: value.accountId,
      accountCode: value.accountCode,
      accountName: value.accountName,
      userId: user.value.id || value.userId,
      userCode: user.value.code || value.userCode,
      userName: user.value.name || value.userName,
      bindDate: value.bindDate,
      role: value.role
    })
    await loadDetail()
    showBindForm.value = false
    showUserForm.value = false
    done({ success: true, message: '新增绑定成功' })
  } catch (error: any) {
    done({ success: false, error: error?.message || '新增绑定失败，请重试' })
  }
}

async function togglePrimary(item: { role?: string; assignmentId?: string }) {
  if (!item.assignmentId) {
    uni.showToast({ title: '该绑定不支持切换主备', icon: 'none' })
    return
  }
  try {
    const nextRole: 'primary' | 'backup' = item.role === 'primary' ? 'backup' : 'primary'
    await updateRelationRole(item.assignmentId, nextRole)
    item.role = nextRole
    uni.showToast({ title: '切换成功', icon: 'none' })
  } catch (error: any) {
    uni.showToast({ title: error?.message || '切换失败', icon: 'none' })
  }
}

function displayRemainingDays(days?: number) {
  const value = Number.isFinite(Number(days))
    ? Math.max(0, Number(days))
    : remainDaysFromDate(user.value.afterSalesExpireAt || user.value.expireDate)
  return `${value}天`
}

function remainDaysClass(days?: number) {
  const value = Number.isFinite(Number(days))
    ? Number(days)
    : remainDaysFromDate(user.value.afterSalesExpireAt || user.value.expireDate)

  if (value <= 7) return 'warning'
  if (value <= 30) return 'success'
  return 'normal'
}

function remainDaysFromDate(dateText: string) {
  if (!dateText || dateText === '--') return 0
  const today = new Date()
  const end = new Date(`${dateText}T00:00:00`)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

function displayRenewalStatus(status?: string) {
  return status || '正常'
}

function renewalStatusType(status?: string): 'success' | 'warning' | 'danger' | 'default' {
  if (status === '正常') return 'success'
  if (status === '即将到期') return 'warning'
  if (status === '停用') return 'danger'
  return 'default'
}

</script>

<style scoped lang="scss">
.section-actions {
  display: flex;
  gap: 12rpx;
}

.mini-action {
  min-width: 104rpx;
  height: 52rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  border: 1rpx solid #cfe0ff;
  background: #f8fbff;
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}

.primary-action {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
}

.danger-action {
  background: #ef4444;
  border-color: #ef4444;
  color: #ffffff;
}

.remain-days {
  font-size: 28rpx;
  font-weight: 800;
}

.remain-days.warning {
  color: #f97316;
}

.remain-days.success {
  color: #10a55a;
}

.remain-days.normal {
  color: var(--text);
}

.binding-list {
  margin-top: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.binding-item {
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
  overflow: hidden;
  background: #ffffff;
}

.binding-summary {
  min-height: 84rpx;
  padding: 0 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  background: #f8fbff;
}

.summary-code {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--text);
}

.summary-arrow {
  font-size: 28rpx;
  color: var(--primary);
  transform: rotate(180deg);
  transition: transform 0.2s ease;
}

.summary-arrow.open {
  transform: rotate(0deg);
}

.binding-row {
  min-height: 74rpx;
  padding: 0 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.binding-label {
  color: #667085;
  font-size: 26rpx;
}

.binding-value {
  flex: 1;
  text-align: right;
  color: var(--text);
  font-size: 27rpx;
}

.binding-value.days.warning {
  color: #f97316;
  font-weight: 800;
}

.binding-value.days.success {
  color: #10a55a;
  font-weight: 800;
}

.binding-value.days.normal {
  color: var(--text);
  font-weight: 800;
}

.primary-switch {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 4rpx;
  border: 1rpx solid #cfe0ff;
  border-radius: 999rpx;
  background: #f8fbff;
}

.primary-option {
  min-width: 50rpx;
  height: 40rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 23rpx;
  font-weight: 700;
}

.primary-option.active {
  background: var(--primary);
  color: #ffffff;
}
</style>

