<template>
  <view class="detail-page">
    <AppHeader title="账号详情" back show-tabbar @left="back" />
    <view class="content">
      <InfoCard title="基础信息" :rows="baseRows">
        <template #actions>
          <view class="section-actions">
            <view class="mini-action" @click="copyDetail">复制详情</view>
            <view class="mini-action" @click="edit">编辑</view>
            <view class="mini-action danger-action" @click="removeAccount">删除</view>
          </view>
        </template>
        <template #status>
          <StatusTag :text="accountStatusTextByDays(account.remainingDays)" :type="accountStatusTypeByDays(account.remainingDays)" />
        </template>
        <template #remainDays>
          <text class="remain-days" :class="remainDaysClass(account.remainingDays)">{{ displayRemainingDays(account.remainingDays) }}</text>
        </template>
        <template #verifyEnabled>
          <StatusTag :text="account.verificationEnabled ? '启用' : '停用'" :type="account.verificationEnabled ? 'success' : 'danger'" />
        </template>
      </InfoCard>

      <InfoCard title="绑定关系" :rows="[]">
        <template #actions>
          <view class="section-actions">
            <view class="mini-action" @click="bindUser">新增绑定</view>
          </view>
        </template>
        <view class="binding-list">
          <view
            v-for="(item, idx) in bindingDisplayList"
            :key="bindingKey(item.userCode, idx)"
            class="binding-item"
          >
            <view class="binding-summary" @click="toggleBinding(bindingKey(item.userCode, idx))">
              <text class="summary-code">{{ item.userCode }}</text>
              <text class="summary-arrow" :class="{ open: isBindingExpanded(bindingKey(item.userCode, idx)) }">⌃</text>
            </view>
            <view v-show="isBindingExpanded(bindingKey(item.userCode, idx))">
              <view class="binding-row row-line">
                <text class="binding-label">用户编号</text>
                <text class="binding-value">{{ item.userCode }}</text>
              </view>
              <view class="binding-row row-line">
                <text class="binding-label">用户昵称</text>
                <text class="binding-value">{{ item.userName }}</text>
              </view>
              <view class="binding-row row-line">
                <text class="binding-label">购买计划</text>
                <text class="binding-value">{{ item.plan }}</text>
              </view>
              <view class="binding-row row-line">
                <text class="binding-label">售后到期日</text>
                <text class="binding-value">{{ item.afterSalesExpireAt }}</text>
              </view>
              <view class="binding-row row-line">
                <text class="binding-label">剩余天数</text>
                <text class="binding-value days" :class="remainDaysClass(item.remainingDays)">{{ displayRemainingDays(item.remainingDays) }}</text>
              </view>
              <view class="binding-row">
                <text class="binding-label">续费状态</text>
                <StatusTag :text="item.renewalStatus" :type="renewalStatusType(item.renewalStatus)" />
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
                <text class="binding-value">{{ item.planName }}</text>
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
    <AccountFormPopup
      v-model="showEditForm"
      mode="edit"
      :account="account"
      @submit="handleEditSubmit"
    />
    <RelationBindPopup
      v-model="showBindForm"
      :preset-account="{
        id: account.id,
        code: account.code,
        name: account.name
      }"
      lock-account
      @submit="handleBindSubmit"
    />
    <RenewalFormPopup
      v-model="showRenewalForm"
      subject-label="账号"
      :previous-expire-at="account.accountExpireAt || account.expireDate"
      @submit="handleRenewSubmit"
    />
    <GlobalConfirmDialog />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { createAccountRenewal, deleteAccount, deleteAccountRenewal, fetchAccountDetail, updateAccount } from '@/api/account'
import { fetchMailDomainConfigs } from '@/api/admin-config'
import { createRelation } from '@/api/relation'
import { usePageScrollTop } from '@/composables/usePageScrollTop'
import AccountFormPopup from '@/components/AccountFormPopup.vue'
import AppHeader from '@/components/AppHeader.vue'
import GlobalConfirmDialog from '@/components/GlobalConfirmDialog.vue'
import InfoCard from '@/components/InfoCard.vue'
import RelationBindPopup from '@/components/RelationBindPopup.vue'
import RenewalFormPopup from '@/components/RenewalFormPopup.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { AccountItem } from '@/types'
import { back } from '@/utils/nav'
import { confirmDanger } from '@/utils/confirm'

const { scrollTop } = usePageScrollTop()
const bindingExpanded = ref<Record<string, boolean>>({})
const renewalExpanded = ref<Record<string, boolean>>({})
const showEditForm = ref(false)
const showBindForm = ref(false)
const showRenewalForm = ref(false)
const accountId = ref('')
const mailDomainConfigs = ref<Array<{ domain: string; verificationCodeUrl: string }>>([])

const account = ref<AccountItem>({
  id: '',
  name: '',
  code: '',
  businessName: '',
  status: 'normal',
  expireDate: '',
  createdAt: '',
  updatedAt: ''
})

onMounted(async () => {
  const pages = getCurrentPages() as Array<{ options?: { id?: string } }>
  accountId.value = String(pages[pages.length - 1]?.options?.id || '')
  if (!accountId.value) {
    uni.showToast({ title: '缺少账号ID', icon: 'none' })
    return
  }
  await Promise.all([loadDetail(), loadMailDomainConfigs()])
})

async function loadDetail() {
  if (!accountId.value) return
  account.value = await fetchAccountDetail(accountId.value)
}

async function loadMailDomainConfigs() {
  mailDomainConfigs.value = await fetchMailDomainConfigs()
}

const baseRows = computed(() => [
  { label: 'Adobe账户：', value: account.value.accountEmail || account.value.name || '--' },
  { label: 'Adobe密码：', value: account.value.adobePassword || '--' },
  { label: '邮箱密码：', value: account.value.accountEmailPassword || '--' },
  { label: '验证码邮箱：', value: account.value.verificationEmail || '--' },
  { label: '首付日期：', value: account.value.paidAt || '--' },
  { label: '账户计划：', value: account.value.accountPlan || account.value.businessName || '--' },
  { label: '账户到期日：', value: account.value.accountExpireAt || account.value.expireDate || '--' },
  { label: '剩余天数：', slot: 'remainDays' },
  { label: '状态：', slot: 'status' },
  { label: '验证码启用状态：', slot: 'verifyEnabled' },
  { label: '备注：', value: account.value.remark || '--' }
])

const bindingList = computed(() => account.value.bindings || [])
const bindingDisplayList = computed(() => {
  if (bindingList.value.length) return bindingList.value
  return [
    {
      userCode: '--',
      userName: '未绑定用户',
      plan: account.value.accountPlan || '--',
      afterSalesExpireAt: account.value.accountExpireAt || account.value.expireDate || '--',
      remainingDays: Number(account.value.remainingDays ?? 0),
      renewalStatus: '未绑定'
    }
  ]
})

const renewals = computed(() => account.value.renewals || [])
const renewalDisplayList = computed(() => {
  if (renewals.value.length) return renewals.value
  return [
    {
      renewalDate: '--',
      planName: '--',
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
      const key = bindingKey(item.userCode, idx)
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

function bindingKey(userCode: string, idx: number) {
  return `${userCode}-${idx}`
}

function isBindingExpanded(key: string) {
  return bindingExpanded.value[key] !== false
}

function toggleBinding(key: string) {
  bindingExpanded.value[key] = !isBindingExpanded(key)
}

function renewalKey(renewalDate: string, idx: number) {
  return `${renewalDate}-${idx}`
}

function isRenewalExpanded(key: string) {
  return renewalExpanded.value[key] !== false
}

function toggleRenewal(key: string) {
  renewalExpanded.value[key] = !isRenewalExpanded(key)
}

function copyDetail() {
  const lines = [
    `Adobe账户邮箱：${account.value.accountEmail || account.value.name || ''}`,
    `Adobe密码：${account.value.adobePassword || ''}`,
    `验证码接收网址：${verificationCodeUrl()}`
  ]

  uni.setClipboardData({
    data: lines.join('\n'),
    success: () => {
      uni.showToast({ title: '详情已复制', icon: 'none' })
    }
  })
}

function verificationCodeUrl() {
  const domain = String(account.value.verificationEmail || '').split('@')[1] || ''
  const config = mailDomainConfigs.value.find((item) => item.domain === domain)
  return config?.verificationCodeUrl || 'mail.889100.xyz'
}

function displayRemainingDays(days?: number) {
  const value = Math.max(0, Number(days ?? 0))
  return `${value}天`
}

function remainDaysClass(days?: number) {
  const value = Number(days ?? 0)
  if (value <= 7) return 'warning'
  if (value <= 30) return 'success'
  return 'normal'
}

function accountStatusTextByDays(days?: number) {
  const value = Number(days ?? 0)
  if (value < 0) return '已过期'
  return '正常'
}

function accountStatusTypeByDays(days?: number): 'success' | 'warning' | 'danger' {
  const value = Number(days ?? 0)
  if (value > 30) return 'success'
  if (value >= 0) return 'warning'
  return 'danger'
}

function renewalStatusType(status: string): 'success' | 'warning' | 'danger' | 'default' {
  if (status === '正常') return 'success'
  if (status === '即将到期') return 'warning'
  if (status === '停用') return 'danger'
  return 'default'
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
    await deleteAccountRenewal(account.value.id, item.id as string)
    await loadDetail()
    return { success: true, message: '删除成功' }
  })
}

function edit() {
  showEditForm.value = true
}

async function handleEditSubmit(
  value: any,
  done: (result?: { success?: boolean; message?: string; error?: string }) => void
) {
  try {
    await updateAccount(account.value.id, value)
    await loadDetail()
    showEditForm.value = false
    showBindForm.value = false
    done({ success: true, message: '保存成功' })
  } catch (error: any) {
    done({ success: false, error: error?.message || '保存失败，请稍后重试' })
  }
}

function bindUser() {
  showBindForm.value = true
}

async function handleBindSubmit(
  value: {
  accountId: string
  accountCode: string
  accountName: string
  userId: string
  userCode: string
  userName: string
  bindDate: string
  role: 'primary' | 'backup'
  },
  done: (result?: { success?: boolean; message?: string; error?: string }) => void
) {
  try {
    await createRelation({
      accountId: account.value.id || value.accountId,
      accountCode: account.value.code || value.accountCode,
      accountName: account.value.name || value.accountName,
      userId: value.userId,
      userCode: value.userCode,
      userName: value.userName,
      bindDate: value.bindDate,
      role: value.role
    })
    await loadDetail()
    showBindForm.value = false
    showEditForm.value = false
    done({ success: true, message: '新增绑定成功' })
  } catch (error: any) {
    done({ success: false, error: error?.message || '新增绑定失败，请重试' })
  }
}

function renew() {
  showRenewalForm.value = true
}

async function handleRenewSubmit(
  value: { planId: string; renewalDate: string; remark: string },
  done: (result?: { success?: boolean; message?: string; error?: string }) => void
) {
  try {
    await createAccountRenewal(account.value.id, value)
    await loadDetail()
    showRenewalForm.value = false
    done({ success: true, message: '续费成功' })
  } catch (error: any) {
    done({ success: false, error: error?.message || '续费失败，请稍后重试' })
  }
}

function removeAccount() {
  confirmDanger('确认删除当前账号吗？', '危险操作', async () => {
    await deleteAccount(account.value.id)
    setTimeout(() => {
      back()
    }, 150)
    return { success: true, message: '删除成功' }
  })
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
</style>

