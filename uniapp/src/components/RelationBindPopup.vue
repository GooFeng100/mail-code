<template>
  <wd-popup
    v-model="visible"
    position="bottom"
    custom-class="relation-bind-popup"
    safe-area-inset-bottom
    root-portal
    :z-index="120"
  >
    <view class="bind-form-panel">
      <view class="drag-handle"></view>
      <view class="form-head">
        <text class="form-title">新增绑定</text>
        <text class="form-subtitle">请选择账号与用户关系</text>
      </view>

      <scroll-view scroll-y class="form-scroll">
        <view class="form-row">
          <text class="form-label">绑定日期</text>
          <picker mode="date" :value="form.bindDate" @change="onBindDateChange">
            <view class="picker-input">{{ form.bindDate }}</view>
          </picker>
        </view>

        <view class="form-row">
          <text class="form-label">主备</text>
          <view class="role-switch" @click="toggleRole">
            <text class="role-option" :class="{ active: form.role === 'primary' }">主</text>
            <text class="role-option" :class="{ active: form.role === 'backup' }">备</text>
          </view>
        </view>

        <view class="form-row form-row-column">
          <text class="form-label required">账号</text>
          <view class="search-box" :class="{ locked: !!lockAccount }">
            <text class="search-icon">🔍</text>
            <input
              v-model="accountKeyword"
              class="search-input"
              placeholder="搜索账号编号 / 账号名称"
              :disabled="!!lockAccount"
              @focus="onAccountFocus"
              @input="onAccountInput"
            />
          </view>
          <view v-if="!lockAccount && showAccountOptions && accountKeyword.trim()" class="dropdown-list">
            <view
              v-for="item in filteredAccounts"
              :key="item.id"
              class="dropdown-item"
              @click="selectAccount(item)"
            >
              <text class="dropdown-main">{{ item.code }}</text>
              <text class="dropdown-sub">{{ item.name }}</text>
            </view>
            <view v-if="!filteredAccounts.length" class="dropdown-empty">未找到账号</view>
          </view>
          <text v-if="form.accountCode" class="picked-tip">已选择：{{ form.accountCode }} / {{ form.accountName }}</text>
        </view>

        <view class="form-row form-row-column">
          <text class="form-label required">用户</text>
          <view class="search-box" :class="{ locked: !!lockUser }">
            <text class="search-icon">🔍</text>
            <input
              v-model="userKeyword"
              class="search-input"
              placeholder="搜索用户编号 / 用户昵称 / 联系方式"
              :disabled="!!lockUser"
              @focus="onUserFocus"
              @input="onUserInput"
            />
          </view>
          <view v-if="!lockUser && showUserOptions && userKeyword.trim()" class="dropdown-list">
            <view
              v-for="item in filteredUsers"
              :key="item.id"
              class="dropdown-item"
              @click="selectUser(item)"
            >
              <text class="dropdown-main">{{ item.code }} · {{ item.name }}</text>
              <text class="dropdown-sub">{{ item.phone }}</text>
            </view>
            <view v-if="!filteredUsers.length" class="dropdown-empty">未找到用户</view>
          </view>
          <text v-if="form.userCode" class="picked-tip">已选择：{{ form.userCode }} / {{ form.userName }}</text>
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
import { fetchAccounts } from '@/api/account'
import { fetchUsers } from '@/api/user'
import type { AccountItem, UserItem } from '@/types'

interface BindFormValue {
  bindDate: string
  role: 'primary' | 'backup'
  accountId: string
  accountCode: string
  accountName: string
  userId: string
  userCode: string
  userName: string
}

interface SubmitResult {
  success?: boolean
  message?: string
  error?: string
}

const props = defineProps<{
  modelValue: boolean
  presetAccount?: { id: string; code: string; name: string } | null
  presetUser?: { id: string; code: string; name: string } | null
  lockAccount?: boolean
  lockUser?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', value: BindFormValue, done: (result?: SubmitResult) => void): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const lockAccount = computed(() => !!props.lockAccount)
const lockUser = computed(() => !!props.lockUser)

const accounts = ref<AccountItem[]>([])
const users = ref<UserItem[]>([])
const showAccountOptions = ref(false)
const showUserOptions = ref(false)
const accountKeyword = ref('')
const userKeyword = ref('')

const form = reactive<BindFormValue>({
  bindDate: dateText(new Date()),
  role: 'primary',
  accountId: '',
  accountCode: '',
  accountName: '',
  userId: '',
  userCode: '',
  userName: ''
})
const submitting = ref(false)

watch(
  () => props.modelValue,
  async (value) => {
    if (!value) return
    resetForm()
    await loadOptions()
    applyPresets()
  }
)

const filteredAccounts = computed(() => {
  const keyword = accountKeyword.value.trim()
  if (!keyword) return []
  return accounts.value
    .filter((item) => item.code.includes(keyword) || item.name.includes(keyword))
    .slice(0, 8)
})

const filteredUsers = computed(() => {
  const keyword = userKeyword.value.trim()
  if (!keyword) return []
  return users.value
    .filter((item) => item.code.includes(keyword) || item.name.includes(keyword) || item.phone.includes(keyword))
    .slice(0, 8)
})

async function loadOptions() {
  accounts.value = await fetchAccounts({ status: 'all' })
  users.value = await fetchUsers({ status: 'all' })
}

function resetForm() {
  form.bindDate = dateText(new Date())
  form.role = 'primary'
  form.accountId = ''
  form.accountCode = ''
  form.accountName = ''
  form.userId = ''
  form.userCode = ''
  form.userName = ''
  accountKeyword.value = ''
  userKeyword.value = ''
  showAccountOptions.value = false
  showUserOptions.value = false
}

function applyPresets() {
  if (props.presetAccount) {
    form.accountId = props.presetAccount.id
    form.accountCode = props.presetAccount.code
    form.accountName = props.presetAccount.name
    accountKeyword.value = `${props.presetAccount.code} ${props.presetAccount.name}`
  }

  if (props.presetUser) {
    form.userId = props.presetUser.id
    form.userCode = props.presetUser.code
    form.userName = props.presetUser.name
    userKeyword.value = `${props.presetUser.code} ${props.presetUser.name}`
  }
}

function onBindDateChange(event: any) {
  form.bindDate = event.detail.value
}

function toggleRole() {
  form.role = form.role === 'primary' ? 'backup' : 'primary'
}

function onAccountFocus() {
  if (lockAccount.value) return
  showAccountOptions.value = true
}

function onAccountInput() {
  if (lockAccount.value) return
  showAccountOptions.value = true
}

function onUserFocus() {
  if (lockUser.value) return
  showUserOptions.value = true
}

function onUserInput() {
  if (lockUser.value) return
  showUserOptions.value = true
}

function selectAccount(item: AccountItem) {
  form.accountId = item.id
  form.accountCode = item.code
  form.accountName = item.name
  accountKeyword.value = `${item.code} ${item.name}`
  showAccountOptions.value = false
}

function selectUser(item: UserItem) {
  form.userId = item.id
  form.userCode = item.code
  form.userName = item.name
  userKeyword.value = `${item.code} ${item.name}`
  showUserOptions.value = false
}

function submit() {
  if (submitting.value) return
  if (!form.accountId) {
    uni.showToast({ title: '请选择账号', icon: 'none' })
    return
  }

  if (!form.userId) {
    uni.showToast({ title: '请选择用户', icon: 'none' })
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

function dateText(date: Date) {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}
</script>

<style scoped lang="scss">
:deep(.relation-bind-popup) {
  z-index: 120 !important;
}

.bind-form-panel {
  background: #fff;
  border-radius: 36rpx 36rpx 0 0;
  max-height: 88vh;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
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
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-bottom: 14rpx;
}

.form-row-column {
  align-items: stretch;
}

.form-label {
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

.search-box {
  width: 100%;
  height: 72rpx;
  border: 1rpx solid #d3dbea;
  border-radius: 18rpx;
  padding: 0 16rpx;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 10rpx;
  box-sizing: border-box;
}

.search-box.locked {
  background: #f8fafc;
}

.search-icon {
  font-size: 24rpx;
  color: #94a3b8;
  line-height: 1;
}

.search-input {
  flex: 1;
  height: 100%;
  font-size: 28rpx;
  color: #0f172a;
}

.role-switch {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 4rpx;
  border: 1rpx solid #cfe0ff;
  border-radius: 999rpx;
  background: #f8fbff;
  width: fit-content;
}

.role-option {
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

.role-option.active {
  background: var(--primary);
  color: #ffffff;
}

.dropdown-list {
  border: 1rpx solid #d3dbea;
  border-radius: 16rpx;
  background: #fff;
  max-height: 320rpx;
  overflow: hidden;
}

.dropdown-item {
  padding: 14rpx 18rpx;
  border-bottom: 1rpx solid #edf2fb;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.dropdown-item:last-child {
  border-bottom: 0;
}

.dropdown-main {
  color: #0f172a;
  font-size: 26rpx;
  font-weight: 700;
}

.dropdown-sub {
  color: #64748b;
  font-size: 24rpx;
}

.dropdown-empty {
  padding: 18rpx;
  color: #94a3b8;
  font-size: 24rpx;
  text-align: center;
}

.picked-tip {
  color: #2563eb;
  font-size: 23rpx;
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
