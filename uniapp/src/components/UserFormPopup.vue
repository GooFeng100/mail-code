<template>
  <wd-popup
    v-model="visible"
    position="bottom"
    custom-class="user-form-popup"
    safe-area-inset-bottom
    root-portal
    :z-index="120"
  >
    <view class="user-form-panel">
      <view class="drag-handle"></view>
      <view class="form-head">
        <text class="form-title">{{ mode === 'edit' ? '编辑用户' : '新增用户' }}</text>
        <text class="form-subtitle">请填写用户信息</text>
      </view>

      <scroll-view scroll-y class="form-scroll">
        <view class="form-row">
          <text class="form-label">用户编号</text>
          <text class="plain-code">{{ form.code || '保存后自动生成' }}</text>
        </view>

        <view class="form-row">
          <text class="form-label required">用户昵称</text>
          <input v-model="form.name" class="form-input" placeholder="请输入用户昵称" />
        </view>

        <view class="form-row">
          <text class="form-label required">联系方式</text>
          <input v-model="form.phone" class="form-input" placeholder="请输入联系方式" />
        </view>

        <view class="form-row">
          <text class="form-label">首付日期</text>
          <picker mode="date" :value="form.paidAt" @change="onPaidAtChange">
            <view class="picker-input">{{ form.paidAt }}</view>
          </picker>
        </view>

        <view class="form-row">
          <text class="form-label">购买计划</text>
          <picker mode="selector" :range="planLabels" :value="planIndex" @change="onPlanChange">
            <view class="picker-input">{{ currentPlan.label }}</view>
          </picker>
        </view>

        <view class="form-row">
          <text class="form-label">售后日期</text>
          <picker mode="date" :value="form.afterSalesExpireAt" @change="onAfterSalesDateChange">
            <view class="picker-input">{{ form.afterSalesExpireAt }}</view>
          </picker>
        </view>

        <view class="form-row">
          <text class="form-label">状态</text>
          <view class="status-row">
            <text class="status-pill" :class="statusClass">{{ statusText }}</text>
            <text class="status-days" :class="statusClass">{{ Math.max(statusDays, 0) }}天</text>
          </view>
        </view>

        <view class="form-row form-row-column">
          <text class="form-label">备注</text>
          <textarea
            v-model="form.remark"
            class="remark-input"
            maxlength="200"
            placeholder="请输入备注（可选）"
          />
          <text class="remark-count">{{ form.remark.length }}/200</text>
        </view>

        <view class="form-footer">
          <wd-button custom-class="footer-btn cancel-btn" plain :disabled="submitting" @click="close">取消</wd-button>
          <wd-button custom-class="footer-btn submit-btn" type="primary" :loading="submitting" :disabled="submitting" @click="submit">
            {{ submitting ? '处理中' : '确认' }}
          </wd-button>
        </view>
      </scroll-view>
    </view>
  </wd-popup>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { UserItem } from '@/types'

interface PlanOption {
  label: string
  days: number
}

interface UserFormValue {
  code: string
  name: string
  phone: string
  paidAt: string
  purchasePlan: string
  afterSalesExpireAt: string
  remainingDays: number
  renewalStatus: string
  remark: string
}

interface SubmitResult {
  success?: boolean
  message?: string
  error?: string
}

const props = defineProps<{
  modelValue: boolean
  mode: 'add' | 'edit'
  user?: Partial<UserItem> | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', value: UserFormValue, done: (result?: SubmitResult) => void): void
}>()

const planOptions: PlanOption[] = [
  { label: '全家桶月付（30天）', days: 30 },
  { label: '标准版季度付（90天）', days: 90 },
  { label: '全家桶半年付（180天）', days: 180 },
  { label: '全家桶年付（365天）', days: 365 }
]

const form = reactive<UserFormValue>({
  code: '',
  name: '',
  phone: '',
  paidAt: dateText(new Date()),
  purchasePlan: planOptions[0].label,
  afterSalesExpireAt: dateText(addDays(new Date(), planOptions[0].days)),
  remainingDays: planOptions[0].days,
  renewalStatus: '正常',
  remark: ''
})
const submitting = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const planLabels = computed(() => planOptions.map((item) => item.label))
const planIndex = computed(() => Math.max(0, planOptions.findIndex((item) => item.label === form.purchasePlan)))
const currentPlan = computed(() => planOptions[planIndex.value] || planOptions[0])
const statusDays = computed(() => daysBetweenToday(form.afterSalesExpireAt))
const statusText = computed(() => (statusDays.value < 0 ? '已过期' : '正常'))
const statusClass = computed(() => {
  if (statusDays.value > 30) return 'success'
  if (statusDays.value >= 0) return 'warning'
  return 'danger'
})

watch(
  () => [props.modelValue, props.mode, props.user] as const,
  () => {
    if (!props.modelValue) return
    syncFormFromUser()
  },
  { immediate: true }
)

function syncFormFromUser() {
  const item = props.user || {}
  const plan = String(item.purchasePlan || planOptions[0].label)
  const paidAt = normalizeDate(item.paidAt) || normalizeDate(item.createdAt) || dateText(new Date())
  const planDays = planOptions.find((p) => p.label === plan)?.days || planOptions[0].days
  const afterSalesDate = normalizeDate(item.afterSalesExpireAt) || normalizeDate(item.expireDate) || dateText(addDays(new Date(paidAt), planDays))

  form.code = String(item.code || '')
  form.name = String(item.name || '')
  form.phone = String(item.phone || '')
  form.paidAt = paidAt
  form.purchasePlan = plan
  form.afterSalesExpireAt = afterSalesDate
  form.remainingDays = Number(item.remainingDays ?? daysBetweenToday(afterSalesDate))
  updateDerivedStatus()
  form.remark = String(item.remark || '')
}

function onPlanChange(event: any) {
  const index = Number(event.detail.value || 0)
  const selected = planOptions[index] || planOptions[0]
  form.purchasePlan = selected.label
  form.afterSalesExpireAt = dateText(addDays(new Date(form.paidAt), selected.days))
  updateDerivedStatus()
}

function onPaidAtChange(event: any) {
  form.paidAt = event.detail.value
  const selected = currentPlan.value
  form.afterSalesExpireAt = dateText(addDays(new Date(form.paidAt), selected.days))
  updateDerivedStatus()
}

function onAfterSalesDateChange(event: any) {
  form.afterSalesExpireAt = event.detail.value
  updateDerivedStatus()
}

function submit() {
  if (submitting.value) return
  if (!form.name.trim()) {
    uni.showToast({ title: '请填写用户昵称', icon: 'none' })
    return
  }
  if (!form.phone.trim()) {
    uni.showToast({ title: '请填写联系方式', icon: 'none' })
    return
  }

  submitting.value = true
  emit('submit', { ...form }, (result) => {
    submitting.value = false
    if (result && result.success === false) {
      uni.showToast({ title: result.error || '提交失败', icon: 'none' })
      return
    }
    uni.showToast({ title: result?.message || '提交成功', icon: 'none' })
    close()
  })
}

function close() {
  if (submitting.value) return
  visible.value = false
}

function updateDerivedStatus() {
  const days = statusDays.value
  form.remainingDays = days
  form.renewalStatus = days < 0 ? '已过期' : '正常'
}

function daysBetweenToday(targetDate: string) {
  if (!targetDate) return 0
  const today = new Date()
  const end = new Date(`${targetDate}T00:00:00`)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

function normalizeDate(value?: string) {
  if (!value) return ''
  const date = new Date(String(value).replace(/\//g, '-'))
  if (Number.isNaN(date.getTime())) return ''
  return dateText(date)
}

function dateText(date: Date) {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

</script>

<style scoped lang="scss">
:deep(.user-form-popup) {
  z-index: 120 !important;
}

.user-form-panel {
  background: #fff;
  border-radius: 36rpx 36rpx 0 0;
  max-height: 88vh;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

.drag-handle {
  width: 92rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: #d5dbe7;
  margin: 16rpx auto 10rpx;
}

.form-head {
  padding: 0 24rpx 12rpx;
}

.form-title {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: #0f172a;
}

.form-subtitle {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #64748b;
}

.form-scroll {
  flex: 1;
  padding: 8rpx 24rpx 16rpx;
  box-sizing: border-box;
  min-height: 0;
}

.form-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10rpx;
  margin-bottom: 14rpx;
}

.form-row-column {
  align-items: flex-start;
  flex-direction: column;
}

.form-label {
  width: auto;
  flex: none;
  font-size: 28rpx;
  color: #334155;
  font-weight: 600;
}

.form-label.required::before {
  content: '*';
  color: #ef4444;
  margin-right: 6rpx;
}

.form-input,
.picker-input {
  width: 100%;
  height: 72rpx;
  border: 1rpx solid #d3dbea;
  border-radius: 18rpx;
  padding: 0 18rpx;
  font-size: 28rpx;
  color: #0f172a;
  background: #fff;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.plain-code {
  font-size: 28rpx;
  color: #475569;
  font-weight: 700;
  line-height: 1.6;
}

.status-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.status-pill {
  min-width: 104rpx;
  height: 52rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: #eef2ff;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}

.status-pill.success {
  background: #e9f9f1;
  color: #10a55a;
}

.status-pill.warning {
  background: #fff3e2;
  color: #f97316;
}

.status-pill.danger {
  background: #ffecec;
  color: #ef4444;
}

.status-days {
  font-size: 30rpx;
  font-weight: 800;
}

.status-days.success {
  color: #10a55a;
}

.status-days.warning {
  color: #f97316;
}

.status-days.danger {
  color: #ef4444;
}

.remark-input {
  width: 100%;
  min-height: 150rpx;
  border: 1rpx solid #d3dbea;
  border-radius: 18rpx;
  padding: 16rpx 18rpx;
  font-size: 26rpx;
  color: #0f172a;
  box-sizing: border-box;
}

.remark-count {
  width: 100%;
  text-align: right;
  margin-top: 8rpx;
  color: #94a3b8;
  font-size: 24rpx;
}

.form-footer {
  display: flex;
  gap: 20rpx;
  margin-top: 8rpx;
  padding: 18rpx 0 calc(18rpx + env(safe-area-inset-bottom));
  background: #fff;
}

:deep(.footer-btn) {
  flex: 1;
  height: 72rpx !important;
  border-radius: 999rpx !important;
  font-size: 28rpx !important;
  font-weight: 700 !important;
}

:deep(.cancel-btn) {
  border-color: #cdd6e6 !important;
  color: #334155 !important;
  background: #ffffff !important;
}

:deep(.submit-btn) {
  background: linear-gradient(135deg, #2f80ff 0%, #1f6de8 100%) !important;
  border: 0 !important;
  color: #ffffff !important;
}
</style>
