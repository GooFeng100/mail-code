<template>
  <wd-popup
    v-model="visible"
    position="bottom"
    custom-class="account-form-popup"
    safe-area-inset-bottom
    root-portal
    :z-index="120"
  >
    <view class="account-form-panel">
      <view class="drag-handle"></view>
      <view class="form-head">
        <text class="form-title">{{ mode === 'edit' ? '编辑Adobe账户' : '新增Adobe账户' }}</text>
        <text class="form-subtitle">请填写账户信息</text>
      </view>

      <scroll-view scroll-y class="form-scroll">
        <view class="form-row">
          <text class="form-label">Adobe账户编号</text>
          <text class="plain-code">{{ form.code || '保存后自动生成' }}</text>
        </view>

        <view class="form-row">
          <text class="form-label required">Adobe账户邮箱</text>
          <input v-model="form.accountEmail" class="form-input" placeholder="请输入 Adobe账户邮箱" />
        </view>

        <view class="form-row">
          <text class="form-label">Adobe密码</text>
          <input v-model="form.adobePassword" class="form-input" password placeholder="至少 6 位" />
        </view>

        <view class="form-row">
          <text class="form-label">Adobe邮箱密码</text>
          <input v-model="form.accountEmailPassword" class="form-input" password placeholder="至少 6 位" />
        </view>

        <view class="form-row">
          <text class="form-label">验证码接收邮箱</text>
          <view class="email-row">
            <input v-model="form.verifyPrefix" class="form-input email-prefix" placeholder="请输入邮箱前缀" />
            <picker mode="selector" :range="mailDomains" :value="domainIndex" @change="onDomainChange">
              <view class="picker-input email-domain">{{ form.verifyDomain }}</view>
            </picker>
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">账户计划</text>
          <picker mode="selector" :range="planLabels" :value="planIndex" @change="onPlanChange">
            <view class="picker-input">{{ currentPlan.label }}</view>
          </picker>
        </view>

        <view class="form-row">
          <text class="form-label">付费日期</text>
          <picker mode="date" :value="form.paidAt" @change="onPaidAtChange">
            <view class="picker-input">{{ form.paidAt }}</view>
          </picker>
        </view>

        <view class="form-row">
          <text class="form-label">初始到期日</text>
          <picker mode="date" :value="form.baseExpireAt" @change="onBaseExpireAtChange">
            <view class="picker-input">{{ form.baseExpireAt }}</view>
          </picker>
        </view>

        <view class="form-row">
          <text class="form-label">状态</text>
          <view class="status-row">
            <text class="status-pill" :class="statusClass">{{ statusText }}</text>
            <text class="status-days">{{ Math.max(statusDays, 0) }}天</text>
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">启用</text>
          <view class="switch-row">
            <switch :checked="form.enabled" color="#2f80ff" @change="onEnabledChange" />
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
import type { AccountItem } from '@/types'

interface PlanOption {
  label: string
  days: number
}

interface AccountFormValue {
  code: string
  accountEmail: string
  adobePassword: string
  accountEmailPassword: string
  verifyPrefix: string
  verifyDomain: string
  accountPlan: string
  paidAt: string
  baseExpireAt: string
  enabled: boolean
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
  account?: Partial<AccountItem> | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', value: AccountFormValue, done: (result?: SubmitResult) => void): void
}>()

const planOptions: PlanOption[] = [
  { label: '全家桶月付（30天）', days: 30 },
  { label: '标准版季度付（90天）', days: 90 },
  { label: '全家桶半年付（180天）', days: 180 },
  { label: '全家桶年付（365天）', days: 365 }
]

const mailDomains = ['889100.xyz', 'outlook.com', 'proton.me']

const form = reactive<AccountFormValue>({
  code: '',
  accountEmail: '',
  adobePassword: '',
  accountEmailPassword: '',
  verifyPrefix: '',
  verifyDomain: mailDomains[0],
  accountPlan: planOptions[0].label,
  paidAt: dateText(new Date()),
  baseExpireAt: dateText(addDays(new Date(), planOptions[0].days)),
  enabled: true,
  remark: ''
})
const submitting = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const planLabels = computed(() => planOptions.map((item) => item.label))
const planIndex = computed(() => Math.max(0, planOptions.findIndex((item) => item.label === form.accountPlan)))
const currentPlan = computed(() => planOptions[planIndex.value] || planOptions[0])
const domainIndex = computed(() => Math.max(0, mailDomains.indexOf(form.verifyDomain)))

const statusDays = computed(() => {
  const today = new Date()
  const end = new Date(`${form.baseExpireAt}T00:00:00`)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
})

const statusText = computed(() => {
  if (statusDays.value < 0) return '已到期'
  if (statusDays.value <= 30) return '即将到期'
  return '正常'
})

const statusClass = computed(() => {
  if (statusDays.value < 0) return 'danger'
  if (statusDays.value <= 30) return 'warning'
  return 'success'
})

watch(
  () => [props.modelValue, props.mode, props.account] as const,
  () => {
    if (!props.modelValue) return
    syncFormFromAccount()
  },
  { immediate: true }
)

function syncFormFromAccount() {
  const item = props.account || {}
  const plan = String(item.accountPlan || planOptions[0].label)
  const domainFromEmail = String(item.verificationEmail || '').split('@')[1]
  const prefixFromEmail = String(item.verificationEmail || '').split('@')[0]
  const paid = normalizeDate(item.paidAt) || dateText(new Date())
  const planDays = planOptions.find((p) => p.label === plan)?.days || planOptions[0].days

  form.code = String(item.code || '')
  form.accountEmail = String(item.accountEmail || item.name || '')
  form.adobePassword = String(item.adobePassword || '')
  form.accountEmailPassword = String(item.accountEmailPassword || '')
  form.verifyPrefix = prefixFromEmail || ''
  form.verifyDomain = mailDomains.includes(domainFromEmail) ? domainFromEmail : mailDomains[0]
  form.accountPlan = plan
  form.paidAt = paid
  form.baseExpireAt = normalizeDate(item.accountExpireAt) || normalizeDate(item.expireDate) || dateText(addDays(new Date(paid), planDays))
  form.enabled = item.status !== 'disabled'
  form.remark = String(item.remark || '')
}

function onDomainChange(event: any) {
  const index = Number(event.detail.value || 0)
  form.verifyDomain = mailDomains[index] || mailDomains[0]
}

function onPlanChange(event: any) {
  const index = Number(event.detail.value || 0)
  const selected = planOptions[index] || planOptions[0]
  form.accountPlan = selected.label
  form.baseExpireAt = dateText(addDays(new Date(form.paidAt), selected.days))
}

function onPaidAtChange(event: any) {
  form.paidAt = event.detail.value
  const selected = currentPlan.value
  form.baseExpireAt = dateText(addDays(new Date(form.paidAt), selected.days))
}

function onBaseExpireAtChange(event: any) {
  form.baseExpireAt = event.detail.value
}

function onEnabledChange(event: any) {
  form.enabled = !!event.detail.value
}

function submit() {
  if (submitting.value) return
  if (!form.accountEmail.trim()) {
    uni.showToast({ title: '请填写 Adobe账户邮箱', icon: 'none' })
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
:deep(.account-form-popup) {
  z-index: 120 !important;
}

.account-form-panel {
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

.email-row {
  width: 100%;
  display: flex;
  gap: 12rpx;
}

.email-prefix {
  flex: 1;
  min-width: 0;
}

.email-row picker {
  flex: 0 0 34%;
  min-width: 170rpx;
}

.email-domain {
  width: 100%;
  justify-content: space-between;
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
  color: #f97316;
  font-weight: 800;
}

.switch-row {
  width: 100%;
  display: flex;
  justify-content: flex-start;
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
