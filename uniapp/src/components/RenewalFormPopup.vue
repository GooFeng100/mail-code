<template>
  <wd-popup
    v-model="visible"
    position="bottom"
    custom-class="renewal-form-popup"
    safe-area-inset-bottom
    root-portal
    :z-index="120"
  >
    <view class="renewal-form-panel">
      <view class="drag-handle"></view>
      <view class="form-head">
        <text class="form-title">新增续费记录</text>
        <text class="form-subtitle">为当前{{ subjectLabel }}新增续费记录</text>
      </view>

      <scroll-view scroll-y class="form-scroll">
        <view class="form-row">
          <text class="form-label">续费日期</text>
          <picker mode="date" :value="form.renewalDate" @change="onRenewalDateChange">
            <view class="picker-input">{{ form.renewalDate }}</view>
          </picker>
        </view>

        <view class="form-row">
          <text class="form-label">续费套餐</text>
          <picker mode="selector" :range="planLabels" :value="planIndex" @change="onPlanChange">
            <view class="picker-input">{{ currentPlanName }}</view>
          </picker>
        </view>

        <view class="form-row">
          <text class="form-label">增加天数</text>
          <view class="picker-input readonly-input">{{ form.days }}天</view>
        </view>

        <view class="form-row">
          <text class="form-label">续费前到期日</text>
          <view class="picker-input readonly-input">{{ form.beforeExpireAt || '--' }}</view>
        </view>

        <view class="form-row">
          <text class="form-label">续费后到期日</text>
          <view class="picker-input readonly-input">{{ form.afterExpireAt || '--' }}</view>
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
          <wd-button
            custom-class="footer-btn submit-btn"
            type="primary"
            :loading="submitting"
            :disabled="submitting || !canSubmit"
            @click="submit"
          >
            {{ submitting ? '处理中' : '确认' }}
          </wd-button>
        </view>
      </scroll-view>
    </view>
  </wd-popup>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { fetchRenewalPlans, type RenewalPlanOption } from '@/api/admin-config'

interface RenewalSubmitValue {
  planId: string
  renewalDate: string
  remark: string
}

interface SubmitResult {
  success?: boolean
  message?: string
  error?: string
}

const props = defineProps<{
  modelValue: boolean
  subjectLabel: string
  previousExpireAt?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', value: RenewalSubmitValue, done: (result?: SubmitResult) => void): void
}>()

const plans = ref<RenewalPlanOption[]>([])
const submitting = ref(false)

const form = reactive({
  renewalDate: todayText(),
  planId: '',
  days: 0,
  beforeExpireAt: '',
  afterExpireAt: '',
  remark: ''
})

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const planLabels = computed(() => plans.value.map((item) => item.name))
const planIndex = computed(() => Math.max(0, plans.value.findIndex((item) => item.id === form.planId)))
const currentPlan = computed(() => plans.value[planIndex.value])
const currentPlanName = computed(() => currentPlan.value?.name || '--')
const canSubmit = computed(() => Boolean(form.planId && form.renewalDate))

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    await ensurePlans()
    resetForm()
  }
)

watch(
  () => props.previousExpireAt,
  () => {
    if (!props.modelValue) return
    form.beforeExpireAt = normalizeDate(props.previousExpireAt) || ''
    syncDerived()
  }
)

function close() {
  if (submitting.value) return
  visible.value = false
}

async function ensurePlans() {
  plans.value = await fetchRenewalPlans()
  if (!plans.value.length) {
    form.planId = ''
    form.days = 0
    form.afterExpireAt = ''
    return
  }
  if (!plans.value.find((item) => item.id === form.planId)) {
    form.planId = plans.value[0].id
  }
}

function resetForm() {
  form.renewalDate = todayText()
  form.beforeExpireAt = normalizeDate(props.previousExpireAt) || ''
  form.remark = ''
  if (!plans.value.find((item) => item.id === form.planId)) {
    form.planId = plans.value[0]?.id || ''
  }
  syncDerived()
}

function onPlanChange(event: any) {
  const index = Number(event.detail.value || 0)
  form.planId = plans.value[index]?.id || plans.value[0]?.id || ''
  syncDerived()
}

function onRenewalDateChange(event: any) {
  form.renewalDate = event.detail.value
  syncDerived()
}

function syncDerived() {
  const selected = plans.value.find((item) => item.id === form.planId)
  form.days = Number(selected?.days || 0)

  const baseDate = renewalBaseDate()
  form.afterExpireAt = baseDate ? addDays(baseDate, form.days) : ''
}

function renewalBaseDate() {
  const renewalDate = normalizeDate(form.renewalDate)
  const beforeExpireAt = normalizeDate(form.beforeExpireAt)
  if (renewalDate && beforeExpireAt && renewalDate > beforeExpireAt) {
    return renewalDate
  }
  return beforeExpireAt || renewalDate
}

function submit() {
  if (submitting.value) return
  if (!canSubmit.value) {
    uni.showToast({ title: '请补全续费信息', icon: 'none' })
    return
  }
  submitting.value = true
  emit(
    'submit',
    {
      planId: form.planId,
      renewalDate: form.renewalDate,
      remark: form.remark
    },
    (result) => {
      submitting.value = false
      if (result?.success === false) {
        uni.showToast({ title: result.error || '续费失败', icon: 'none' })
        return
      }
      uni.showToast({ title: result?.message || '续费成功', icon: 'none' })
      close()
    }
  )
}

function normalizeDate(value?: string) {
  if (!value) return ''
  const date = new Date(String(value).replace(/\//g, '-'))
  if (Number.isNaN(date.getTime())) return ''
  return dateText(date)
}

function todayText() {
  return dateText(new Date())
}

function dateText(date: Date) {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(dateTextValue: string, days: number) {
  const date = new Date(`${dateTextValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  date.setDate(date.getDate() + Number(days || 0))
  return dateText(date)
}
</script>

<style scoped lang="scss">
:deep(.renewal-form-popup) {
  z-index: 120 !important;
}

.renewal-form-panel {
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

.readonly-input {
  background: #f8fafc;
  color: #475569;
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

