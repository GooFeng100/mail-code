<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue"
import {
  Back,
  Calendar,
  CopyDocument,
  Delete,
  EditPen,
  Link,
  ShoppingCartFull,
  Tickets,
  User,
  View,
} from "@element-plus/icons-vue"
import { ElNotification } from "element-plus"
import RenewalDialog from "../components/RenewalDialog.vue"
import BindingDialog from "../components/BindingDialog.vue"
import DeleteConfirmDialog from "../components/DeleteConfirmDialog.vue"
import {
  createAdobeRenewal,
  createAssignment,
  deleteAdobeRenewal,
  getAdminConfig,
  getAdobeAccountDetail,
  listCustomers,
  updateAdobeAccount,
} from "../api/admin"
import { submitWithFeedback } from "../utils/databaseAction"
import { displayValue, formatDate } from "../utils/format"
import { addDaysUtc8, dateInputValueUtc8, remainingDaysFromDateUtc8 } from "../utils/utc8Date"

const props = defineProps({
  account: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(["back", "view-customer"])

const loading = ref(false)
const detailData = ref(null)
const plans = ref([])
const mailDomains = ref([])
const mailDomainConfigs = ref([])
const customerOptions = ref([])
const showEditAccountDialog = ref(false)
const showRenewalDialog = ref(false)
const showBindingDialog = ref(false)
const showDeleteRenewalDialog = ref(false)
const selectedRenewal = ref(null)
const editAccountSubmitting = ref(false)
const renewalSubmitting = ref(false)
const bindingSubmitting = ref(false)
const deleteRenewalSubmitting = ref(false)
const detailCopied = ref(false)
let detailCopyTimer = null
let editAccountFormReady = false

const editAccountForm = reactive({
  code: "",
  email: "",
  password: "",
  emailPassword: "",
  verifyEmailPrefix: "",
  verifyEmailDomain: "",
  plan: "",
  paidAt: "",
  baseExpireAt: "",
  status: "",
  enabled: true,
  remark: "",
})

const account = computed(() => detailData.value?.adobeAccount || props.account || {})
const currentCustomers = computed(() => detailData.value?.customers || [])
const renewalSourceRecords = computed(() => detailData.value?.renewalRecords || [])
const renewals = computed(() => buildRenewalRows())
const editAccountFormStatus = computed(() => formStatus(editAccountForm.baseExpireAt))

const deleteRenewalFields = computed(() => {
  const renewal = selectedRenewal.value
  if (!renewal) return []
  return [
    { label: "续费日期", value: formatDate(renewal.renewalDate) },
    { label: "续费套餐", value: renewal.planName },
    { label: "增加天数", value: renewal.planDays },
    { label: "续费后到期日", value: formatDate(renewal.afterExpireAt) },
  ]
})

function dateInputValue(value) {
  return dateInputValueUtc8(value)
}

function addDays(dateText, days) {
  return addDaysUtc8(dateText, days)
}

function planDays(planValue) {
  const plan = plans.value.find((item) => item.id === planValue || item.name === planValue)
  return Number(plan?.days || 0)
}

function planName(planValue) {
  const plan = plans.value.find((item) => item.id === planValue || item.name === planValue)
  return plan?.name || ""
}

function initialExpireAt(dateText, planValue) {
  return addDays(dateText, planDays(planValue)) || dateText || ""
}

function renewalExpireAt(currentExpireAt, renewalDate, days) {
  const renewalDateText = dateInputValue(renewalDate)
  const baseDate = renewalDateText && (!currentExpireAt || renewalDateText > currentExpireAt)
    ? renewalDateText
    : currentExpireAt || renewalDateText
  return addDays(baseDate, days)
}

function buildRenewalRows() {
  const currentAccount = account.value || {}
  const rows = []
  let currentExpireAt = dateInputValue(currentAccount.baseExpireAt)
  const initialPlanId = currentAccount.initialAccountPlanId || currentAccount.accountPlanId || currentAccount.initialAccountPlan || currentAccount.accountPlan

  rows.push({
    id: `initial-${currentAccount.id || ""}`,
    initial: true,
    renewalDate: currentAccount.paidAt,
    planId: initialPlanId,
    planName: planName(initialPlanId),
    planDays: planDays(initialPlanId),
    beforeExpireAt: null,
    afterExpireAt: currentExpireAt,
    remark: "首次购买",
  })

  renewalSourceRecords.value
    .filter((record) => !record.initial)
    .slice()
    .sort((left, right) => {
      const leftDate = dateInputValue(left.renewalDate)
      const rightDate = dateInputValue(right.renewalDate)
      if (leftDate !== rightDate) return leftDate.localeCompare(rightDate)
      return String(left.createdAt || "").localeCompare(String(right.createdAt || ""))
    })
    .forEach((record) => {
      const beforeExpireAt = currentExpireAt
      const days = planDays(record.planId)
      currentExpireAt = renewalExpireAt(currentExpireAt, record.renewalDate, days)
      rows.push({
        id: record.id,
        initial: false,
        renewalDate: record.renewalDate,
        planId: record.planId,
        planName: planName(record.planId),
        planDays: days,
        beforeExpireAt,
        afterExpireAt: currentExpireAt,
        remark: record.remark || "",
      })
    })

  return rows
}

function remainingDaysFromDate(dateText) {
  return remainingDaysFromDateUtc8(dateText)
}

function formStatus(dateText) {
  const days = remainingDaysFromDate(dateText)
  if (days === null) {
    return { text: "未设置", days: null, type: "info", className: "" }
  }
  if (days < 0) {
    return { text: "已到期", days: 0, type: "danger", className: "is-expired" }
  }
  if (days <= 30) {
    return { text: "正常", days, type: "warning", className: "is-warning" }
  }
  return { text: "正常", days, type: "success", className: "is-success" }
}

function syncEditAccountBaseExpireAt() {
  editAccountForm.baseExpireAt = initialExpireAt(editAccountForm.paidAt, editAccountForm.plan)
}

function statusText(item) {
  return Number(item?.remainingDays || 0) < 0 ? "已到期" : "正常"
}

function statusType(item) {
  const days = Number(item?.remainingDays || 0)
  if (days < 0) return "danger"
  if (days <= 30) return "warning"
  return "success"
}

function dayClass(days) {
  const value = Number(days || 0)
  if (value < 0) return "is-expired"
  if (value <= 30) return "is-warning"
  return "is-success"
}

function displayDays(days) {
  return Math.max(0, Number(days || 0))
}

function enabledText(value) {
  return value === false ? "禁用" : "启用"
}

function verificationEmailDomain() {
  return String(account.value.verificationEmail || "").split("@")[1] || ""
}

function verificationCodeUrl() {
  const domain = verificationEmailDomain()
  const config = mailDomainConfigs.value.find((item) => item.domain === domain)
  return config?.verificationCodeUrl || "mail.889100.xyz"
}

function detailCopyText() {
  return [
    `Adobe账户邮箱：${account.value.accountEmail || ""}`,
    `Adobe密码：${account.value.adobePassword || ""}`,
    `验证码接收网址：${verificationCodeUrl()}`,
  ].join("\n")
}

async function copyDetail() {
  await navigator.clipboard.writeText(detailCopyText())
  detailCopied.value = true
  window.clearTimeout(detailCopyTimer)
  detailCopyTimer = window.setTimeout(() => {
    detailCopied.value = false
  }, 2000)
}

async function copyAccountField(value) {
  const text = value || ""
  if (!text) return
  await navigator.clipboard.writeText(text)
  ElNotification({
    title: "已复制",
    message: "内容已复制到剪切板。",
    type: "success",
    position: "top-right",
  })
}

function accountPayload() {
  return {
    adobeCode: editAccountForm.code,
    accountEmail: editAccountForm.email,
    adobePassword: editAccountForm.password,
    accountEmailPassword: editAccountForm.emailPassword,
    verificationEmail: `${editAccountForm.verifyEmailPrefix}@${editAccountForm.verifyEmailDomain}`,
    accountPlan: editAccountForm.plan,
    paidAt: editAccountForm.paidAt,
    baseExpireAt: editAccountForm.baseExpireAt,
    enabled: editAccountForm.enabled,
    remark: editAccountForm.remark,
  }
}

async function loadConfig() {
  const data = await getAdminConfig()
  plans.value = data.plans || []
  mailDomainConfigs.value = data.mailDomainConfigs || []
  mailDomains.value = mailDomainConfigs.value.length
    ? mailDomainConfigs.value.map((item) => item.domain).filter(Boolean)
    : data.mailDomains || []
  const customers = await listCustomers({ page: 1, pageSize: 50 })
  customerOptions.value = customers.items || []
}

async function loadDetail() {
  if (!props.account?.id) return
  loading.value = true
  try {
    detailData.value = await getAdobeAccountDetail(props.account.id)
  } finally {
    loading.value = false
  }
}

function openEditAccountDialog() {
  const [verifyEmailPrefix = "", verifyEmailDomain = mailDomains.value[0] || "889100.xyz"] = String(account.value.verificationEmail || "").split("@")
  editAccountFormReady = false
  Object.assign(editAccountForm, {
    code: account.value.adobeCode,
    email: account.value.accountEmail,
    password: account.value.adobePassword || "",
    emailPassword: account.value.accountEmailPassword || "",
    verifyEmailPrefix,
    verifyEmailDomain,
    plan: account.value.accountPlanId || account.value.accountPlan,
    paidAt: dateInputValue(account.value.paidAt),
    baseExpireAt: dateInputValue(account.value.baseExpireAt),
    status: statusText(account.value),
    enabled: account.value.enabled,
    remark: account.value.remark || "",
  })
  showEditAccountDialog.value = true
  queueMicrotask(() => { editAccountFormReady = true })
}

function openRenewalDialog() {
  showRenewalDialog.value = true
}

function openBindingDialog() {
  showBindingDialog.value = true
}

function openDeleteRenewalDialog(row) {
  selectedRenewal.value = row
  showDeleteRenewalDialog.value = true
}

function handleSaveAccount() {
  submitWithFeedback({
    setLoading: (value) => { editAccountSubmitting.value = value },
    action: () => updateAdobeAccount(account.value.id, accountPayload()),
    successMessage: "Adobe账户编辑成功。",
    errorMessage: "Adobe账户编辑失败。",
    onSuccess: () => {
      showEditAccountDialog.value = false
      loadDetail()
    },
  })
}

function handleRenewalSave(payload) {
  submitWithFeedback({
    setLoading: (value) => { renewalSubmitting.value = value },
    action: () => createAdobeRenewal(account.value.id, payload),
    successMessage: "Adobe账户续费成功。",
    errorMessage: "Adobe账户续费失败。",
    onSuccess: () => {
      showRenewalDialog.value = false
      loadDetail()
    },
  })
}

function handleDeleteRenewal() {
  submitWithFeedback({
    setLoading: (value) => { deleteRenewalSubmitting.value = value },
    action: () => deleteAdobeRenewal(account.value.id, selectedRenewal.value.id),
    successMessage: "续费记录删除成功。",
    errorMessage: "续费记录删除失败。",
    onSuccess: () => {
      showDeleteRenewalDialog.value = false
      loadDetail()
    },
  })
}

function handleBindingConfirm(payload) {
  submitWithFeedback({
    setLoading: (value) => { bindingSubmitting.value = value },
    action: () => createAssignment({
      customerId: payload.customerId,
      adobeAccountId: account.value.id,
      assignmentRole: payload.assignmentRole,
      assignedAt: payload.assignedAt,
    }),
    successMessage: "绑定关系新增成功。",
    errorMessage: "绑定关系新增失败。",
    onSuccess: () => {
      showBindingDialog.value = false
      loadDetail()
    },
  })
}

onMounted(async () => {
  await loadConfig()
  await loadDetail()
})

watch(() => [editAccountForm.paidAt, editAccountForm.plan], () => {
  if (showEditAccountDialog.value && editAccountFormReady) {
    syncEditAccountBaseExpireAt()
  }
})

onBeforeUnmount(() => {
  window.clearTimeout(detailCopyTimer)
})
</script>

<template>
  <el-main v-loading="loading" class="main-panel admin-dashboard account-detail-page">
    <el-header class="admin-main-header" height="124px">
      <el-row class="admin-stat-row customer-stat-row">
        <el-col :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon"><el-icon><User /></el-icon></div>
            <div><span>绑定客户数</span><strong>{{ currentCustomers.length }}</strong></div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon success"><el-icon><Tickets /></el-icon></div>
            <div><span>续费次数</span><strong class="success-text">{{ renewals.length }}</strong></div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon warning"><el-icon><Calendar /></el-icon></div>
            <div><span>剩余天数</span><strong class="days-text" :class="dayClass(account.remainingDays)">{{ displayDays(account.remainingDays) }}天</strong></div>
          </el-card>
        </el-col>
      </el-row>
    </el-header>

    <section class="account-detail-scroll">
      <section class="detail-card account-profile-card">
        <div class="detail-card-head">
          <div class="account-table-title"><h1>Adobe账户详情</h1></div>
          <div class="detail-actions">
            <el-button
              :icon="CopyDocument"
              :class="{ 'is-copied': detailCopied }"
              round
              @click="copyDetail"
            >
              {{ detailCopied ? "已复制" : "详情复制" }}
            </el-button>
            <el-button :icon="EditPen" round @click="openEditAccountDialog">编辑账户</el-button>
            <el-button :icon="Back" round @click="emit('back')">返回账户列表</el-button>
          </div>
        </div>

        <div class="account-detail-grid">
          <div><span>账号编号</span><strong>{{ displayValue(account.adobeCode) }}</strong></div>
          <div><span>Adobe账户邮箱</span><strong class="detail-link is-copyable" @click="copyAccountField(account.accountEmail)">{{ displayValue(account.accountEmail) }}</strong></div>
          <div><span>Adobe密码</span><strong class="detail-link is-copyable" @click="copyAccountField(account.adobePassword)">{{ displayValue(account.adobePassword) }}</strong></div>
          <div><span>账户计划</span><strong>{{ displayValue(account.accountPlan) }}</strong></div>
          <div><span>验证码接收邮箱</span><strong>{{ displayValue(account.verificationEmail) }}</strong></div>
          <div><span>Adobe账户邮箱密码</span><strong>{{ displayValue(account.accountEmailPassword) }}</strong></div>
          <div><span>付费日期</span><strong>{{ formatDate(account.paidAt) }}</strong></div>
          <div><span>Adobe账户到期日</span><strong>{{ formatDate(account.accountExpireAt) }}</strong></div>
          <div><span>剩余天数</span><strong class="days-text" :class="dayClass(account.remainingDays)">{{ displayDays(account.remainingDays) }} 天</strong></div>
          <div><span>启用状态</span><strong>{{ enabledText(account.enabled) }}</strong></div>
          <div><span>状态</span><strong class="days-text" :class="dayClass(account.remainingDays)">{{ statusText(account) }}</strong></div>
          <div><span>备注</span><strong>{{ displayValue(account.remark) }}</strong></div>
        </div>
      </section>

      <section class="detail-card detail-table-card">
        <div class="detail-card-head compact">
          <h2>当前使用客户</h2>
          <el-button class="detail-primary-button" type="primary" round @click="openBindingDialog"><el-icon><Link /></el-icon><span>新增绑定</span></el-button>
        </div>
        <el-table class="account-table detail-table" :data="currentCustomers" stripe>
          <el-table-column label="客户编号" width="120">
            <template #default="{ row }">
              <button class="inline-nav-link" type="button" @click="emit('view-customer', row)">{{ row.customerCode }}</button>
            </template>
          </el-table-column>
          <el-table-column prop="customerNickname" label="客户昵称" min-width="160" />
          <el-table-column prop="customerContact" label="联系方式" min-width="180" />
          <el-table-column prop="purchasedPlan" label="购买计划" min-width="200" />
          <el-table-column label="售后到期日" width="140"><template #default="{ row }">{{ formatDate(row.afterSalesExpireAt) }}</template></el-table-column>
          <el-table-column label="剩余天数" width="120"><template #default="{ row }"><strong class="days-text" :class="dayClass(row.remainingDays)">{{ displayDays(row.remainingDays) }} 天</strong></template></el-table-column>
          <el-table-column label="续费状态" width="120"><template #default="{ row }"><el-tag :type="statusType(row)" effect="light" round>{{ statusText(row) }}</el-tag></template></el-table-column>
          <el-table-column label="操作" width="110"><template #default="{ row }"><el-button size="small" :icon="View" round @click="emit('view-customer', row)">查看</el-button></template></el-table-column>
        </el-table>
      </section>

      <section class="detail-card detail-table-card">
        <div class="detail-card-head compact">
          <h2>Adobe账户续费记录</h2>
          <el-button class="detail-primary-button" type="primary" round @click="openRenewalDialog"><el-icon><ShoppingCartFull /></el-icon><span>新增续费</span></el-button>
        </div>
        <el-table class="account-table detail-table" :data="renewals" stripe>
          <el-table-column label="续费日期" width="150"><template #default="{ row }">{{ formatDate(row.renewalDate) }}</template></el-table-column>
          <el-table-column prop="planName" label="续费套餐" min-width="220" />
          <el-table-column prop="planDays" label="增加天数" width="140" />
          <el-table-column label="续费前到期日" width="170"><template #default="{ row }">{{ formatDate(row.beforeExpireAt) }}</template></el-table-column>
          <el-table-column label="续费后到期日" width="170"><template #default="{ row }">{{ formatDate(row.afterExpireAt) }}</template></el-table-column>
          <el-table-column prop="remark" label="备注" min-width="160" />
          <el-table-column label="操作" width="140">
            <template #default="{ row }">
              <span v-if="row.initial">基准记录</span>
              <el-button v-else size="small" :icon="Delete" round type="danger" plain @click="openDeleteRenewalDialog(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </section>

    <el-dialog v-model="showEditAccountDialog" class="account-form-dialog" width="800px" align-center append-to-body :show-close="false" :close-on-click-modal="false" :close-on-press-escape="!editAccountSubmitting">
      <template #header><h2 class="account-form-title">编辑Adobe账户</h2></template>
      <el-form class="account-form-grid" :model="editAccountForm" label-position="top" :disabled="editAccountSubmitting">
        <el-form-item label="Adobe账户编号"><el-input v-model="editAccountForm.code" /></el-form-item>
        <el-form-item label="Adobe账户邮箱" required><el-input v-model="editAccountForm.email" /></el-form-item>
        <el-form-item label="Adobe密码"><el-input v-model="editAccountForm.password" /></el-form-item>
        <el-form-item label="Adobe邮箱密码"><el-input v-model="editAccountForm.emailPassword" /></el-form-item>
        <el-form-item label="验证码接收邮箱" required><div class="verification-email-control"><el-input v-model="editAccountForm.verifyEmailPrefix" /><el-select v-model="editAccountForm.verifyEmailDomain"><el-option v-for="domain in mailDomains" :key="domain" :label="domain" :value="domain" /></el-select></div></el-form-item>
        <el-form-item label="账户计划"><el-select v-model="editAccountForm.plan"><el-option v-for="plan in plans" :key="plan.id" :label="plan.name" :value="plan.id" /></el-select></el-form-item>
        <el-form-item label="付费日期"><el-date-picker v-model="editAccountForm.paidAt" type="date" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="初始到期日"><el-date-picker v-model="editAccountForm.baseExpireAt" type="date" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="状态">
          <div class="account-form-status">
            <el-tag :type="editAccountFormStatus.type" effect="light" round>{{ editAccountFormStatus.text }}</el-tag>
            <strong v-if="editAccountFormStatus.days !== null" class="days-text" :class="editAccountFormStatus.className">
              {{ editAccountFormStatus.days }} 天
            </strong>
          </div>
        </el-form-item>
        <el-form-item label="启用" class="account-form-switch"><el-switch v-model="editAccountForm.enabled" /></el-form-item>
        <el-form-item label="备注" class="account-form-remark"><el-input v-model="editAccountForm.remark" type="textarea" :rows="4" resize="vertical" /></el-form-item>
      </el-form>
      <template #footer><div class="account-form-footer"><el-button class="account-form-cancel" round :disabled="editAccountSubmitting" @click="showEditAccountDialog = false">取消</el-button><el-button class="account-form-submit" type="primary" round :loading="editAccountSubmitting" :disabled="editAccountSubmitting" @click="handleSaveAccount">{{ editAccountSubmitting ? "确认中" : "保存 Adobe账户" }}</el-button></div></template>
    </el-dialog>

    <RenewalDialog v-model="showRenewalDialog" subject-label="Adobe账户" :plans="plans" :previous-expire-at="account.accountExpireAt" :submitting="renewalSubmitting" @save="handleRenewalSave" />
    <BindingDialog v-model="showBindingDialog" mode="bind" :locked-account="account" :customer-options="customerOptions" :account-options="[account]" :submitting="bindingSubmitting" @confirm="handleBindingConfirm" />
    <DeleteConfirmDialog v-model="showDeleteRenewalDialog" title="确认删除续费记录" description="确认删除该续费记录？首条基准记录不可删除。" :fields="deleteRenewalFields" warning="该操作不可撤销。" confirm-text="确认删除续费" :submitting="deleteRenewalSubmitting" @confirm="handleDeleteRenewal" />
  </el-main>
</template>
